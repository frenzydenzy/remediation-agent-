const { execFileSync } = require('node:child_process');
const { TextDecoder } = require('node:util');
const { discoverContext } = require('./context-discovery.cjs');
const { runEnhancedAnalysis } = require('./analyzers/enhanced-analysis.cjs');

const MAX_FILE_BYTES = 256 * 1024;
const MAX_CONTEXT_BYTES = 4 * 1024 * 1024;

function collectReview({ repo = process.cwd(), base, context = [], discover = true, analyze = true } = {}) {
  function git(...args) {
    return execFileSync('git', [
      '--no-optional-locks', '--no-pager', '-c', 'core.fsmonitor=false',
      '-c', 'core.untrackedCache=false', ...args,
    ], {
      cwd: repo, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1' },
      maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    });
  }
  const text = (...args) => git(...args).toString('utf8').trim();
  const root = text('rev-parse', '--show-toplevel');
  const head = text('rev-parse', '--verify', 'HEAD^{commit}');
  let branch;
  try { branch = text('symbolic-ref', '--quiet', '--short', 'HEAD'); }
  catch { throw new Error('Detached HEAD: ask the developer to identify the intended branch before review.'); }
  const statusBefore = git('status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=all');
  const snapshot = {
    schemaVersion: 1, repository: root, branch, head,
    mode: 'read-only committed feature-branch review',
    localStatus: statusBefore.toString('utf8').split('\0').filter(Boolean),
    localChangesExcluded: true,
    refs: text('for-each-ref', '--format=%(refname:short) %(objectname) upstream=%(upstream:short)', 'refs/heads', 'refs/remotes'),
  };
  function verifyUnchanged() {
    if (text('rev-parse', '--verify', 'HEAD^{commit}') !== head ||
        text('symbolic-ref', '--quiet', '--short', 'HEAD') !== branch ||
        !git('status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=all').equals(statusBefore)) {
      throw new Error('Repository state changed during collection. Discard this snapshot and retry.');
    }
  }
  if (!base) {
    verifyUnchanged();
    return { ...snapshot, state: 'base-confirmation-required', instruction: 'Select the actual integration/base branch; an upstream may be the feature branch itself. Rerun with --base <ref>.' };
  }
  if (base.startsWith('-')) throw new Error('Base reference must not begin with a dash.');
  const baseSha = text('rev-parse', '--verify', '--end-of-options', `${base}^{commit}`);
  const mergeBases = text('merge-base', '--all', baseSha, head).split(/\r?\n/).filter(Boolean);
  if (mergeBases.length !== 1) throw new Error('A unique merge base is required. Ask the developer for guidance.');
  const mergeBase = mergeBases[0];
  const diffArgs = ['--no-ext-diff', '--no-textconv', '--ignore-submodules=none', '--find-renames'];
  const comparisonRange = `${baseSha}...${head}`;
  const entries = git('diff', ...diffArgs, '--name-status', '-z', comparisonRange, '--').toString('utf8').split('\0');
  const changes = [];
  for (let index = 0; index < entries.length && entries[index];) {
    const status = entries[index++];
    const oldPath = entries[index++];
    const path = /^[RC]/.test(status) ? entries[index++] : oldPath;
    changes.push({ status, path, oldPath });
  }
  const patch = git('diff', ...diffArgs, '--unified=5', comparisonRange, '--').toString('utf8');
  if (Buffer.byteLength(patch) > MAX_CONTEXT_BYTES) throw new Error('Diff exceeds 4 MiB. Agree on a smaller review scope; do not silently truncate.');
  let contextBytes = 0;
  function blobAt(commit, path) {
    let object;
    try { object = text('rev-parse', '--verify', '--end-of-options', `${commit}:${path}`); }
    catch { return { omitted: 'Path absent at this commit.' }; }
    if (text('cat-file', '-t', object) !== 'blob') return { omitted: 'Not a regular blob (for example a submodule).' };
    const size = Number(text('cat-file', '-s', object));
    if (size > MAX_FILE_BYTES || contextBytes + size > MAX_CONTEXT_BYTES) return { omitted: 'Context size limit reached.', bytes: size };
    const buffer = git('cat-file', 'blob', object);
    if (buffer.includes(0)) return { omitted: 'Binary content.', bytes: size };
    let content;
    try { content = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
    catch { return { omitted: 'Non-UTF-8 content.', bytes: size }; }
    contextBytes += size;
    return { object, content };
  }
  const files = changes.map(change => ({
    ...change,
    before: blobAt(mergeBase, change.oldPath),
    after: blobAt(head, change.path),
  }));
  const requestedContext = [...new Set(context)].map(path => {
    if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').includes('..') || /^[A-Za-z]:/.test(path)) {
      throw new Error('Context paths must be repository-relative Git paths using forward slashes.');
    }
    return { path, before: blobAt(mergeBase, path), after: blobAt(head, path) };
  });
  verifyUnchanged();
  
  // Discover related Java files if auto-discovery is enabled
  let discoveredContext = [];
  let discoveryLimitations = [];
  if (discover) {
    try {
      const discovery = discoverContext({
        repo,
        files: files.filter(f => f.path.endsWith('.java')),
        base: baseSha
      });
      discoveredContext = discovery.discovered || [];
      discoveryLimitations = discovery.limitations || [];
    } catch (e) {
      // If discovery fails, include error in limitations but don't fail the review
      discoveryLimitations.push(`Context discovery failed: ${e.message}`);
    }
  }
  
  const allLimitations = [
    'Branch scope is not proof of individual authorship; commit author metadata is not verified identity.',
    'Local refs only: no fetch was performed and remote freshness is unknown.',
    'Omitted blobs and requested context must be reported as validation gaps.',
    'The snapshot can contain source code or secrets. Share only through approved channels; redact secrets in reports.',
    ...discoveryLimitations,
  ];
  
  // Run enhanced analysis if enabled
  let enhancedAnalysisResults = {};
  let analysisLimitations = [];
  if (analyze) {
    try {
      // Prepare files for analysis (include discovered context files)
      const filesToAnalyze = files
        .filter(f => f.after && !f.after.omitted)
        .map(f => ({ path: f.path, content: f.after.content }));
      
      const snapshot = {
        files: filesToAnalyze,
      };
      
      enhancedAnalysisResults = runEnhancedAnalysis(snapshot);
    } catch (e) {
      // If analysis fails, include error in limitations but don't fail the review
      analysisLimitations.push(`Enhanced analysis failed: ${e.message}`);
    }
  }
  
  return {
    ...snapshot, state: 'ready', base, baseSha, mergeBase,
    comparison: `git diff ${baseSha}...${head}`,
    patch, files, requestedContext, discoveredContext,
    commits: text('log', '--no-show-signature', '--format=%H %an <%ae>', `${mergeBase}..${head}`, '--'),
    limitations: [...allLimitations, ...analysisLimitations],
    enhancedAnalysis: enhancedAnalysisResults,
  };
}

if (require.main === module) {
  try {
    const options = { context: [], discover: true, analyze: true };
    const args = process.argv.slice(2);
    for (let index = 0; index < args.length; index++) {
      const option = args[index];
      if (option === '--no-discover') {
        options.discover = false;
      } else if (option === '--no-analyze') {
        options.analyze = false;
      } else if (['--repo', '--base', '--context'].includes(option)) {
        const value = args[++index];
        if (!value) throw new Error('Usage: node collect-review.cjs [--repo <path>] [--base <ref>] [--context <path>] [--no-discover] [--no-analyze]');
        if (option === '--context') options.context.push(value);
        else options[option.slice(2)] = value;
      } else {
        throw new Error('Usage: node collect-review.cjs [--repo <path>] [--base <ref>] [--context <path>] [--no-discover] [--no-analyze]');
      }
    }
    process.stdout.write(`${JSON.stringify(collectReview(options), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Review collection stopped: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { collectReview };