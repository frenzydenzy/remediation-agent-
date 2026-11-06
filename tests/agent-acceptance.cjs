const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, lstatSync, readlinkSync } = require('node:fs');
const { join, resolve, relative } = require('node:path');
const { collectReview } = require('../.github/skills/ai-code-security-review/scripts/collect-review.cjs');

const project = resolve(__dirname, '..');

function inventory(directory, root = directory, result = {}) {
  for (const entry of readdirSync(directory).sort()) {
    const path = join(directory, entry);
    const key = relative(root, path).replaceAll('\\', '/');
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) result[key] = `symlink:${readlinkSync(path)}`;
    else if (stat.isDirectory()) inventory(path, root, result);
    else result[key] = createHash('sha256').update(readFileSync(path)).digest('hex');
  }
  return result;
}

function gitAt(repo, ...args) {
  return execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', ...args], {
    cwd: repo, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function prepareScenario({ artifacts = join(project, '.test-artifacts') } = {}) {
  mkdirSync(artifacts, { recursive: true });
  const run = mkdtempSync(join(artifacts, 'feature-review-'));
  const repo = join(run, 'repo');
  mkdirSync(join(repo, 'src'), { recursive: true });
  mkdirSync(join(repo, 'tests'));
  cpSync(join(project, '.github', 'agents'), join(repo, '.github', 'agents'), { recursive: true });
  cpSync(join(project, '.github', 'skills', 'ai-code-security-review'), join(repo, '.github', 'skills', 'ai-code-security-review'), { recursive: true });
  const git = (...args) => gitAt(repo, ...args);
  const write = (path, content) => writeFileSync(join(repo, path), content);
  git('init', '-b', 'main');
  git('config', 'user.name', 'Acceptance Test Developer');
  git('config', 'user.email', 'acceptance@example.invalid');
  git('config', 'core.autocrlf', 'false');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', join(run, 'disabled-hooks'));
  const safeSource = [
    'function searchUsers(database, request) {',
    '  const name = request.query.name;',
    "  return database.prepare('SELECT id, name FROM users WHERE name = ?').all(name);",
    '}',
    '',
    'module.exports = { searchUsers };',
    '',
  ].join('\n');
  const vulnerableSource = safeSource.replace(
    "database.prepare('SELECT id, name FROM users WHERE name = ?').all(name)",
    'database.prepare(`SELECT id, name FROM users WHERE name = \'${name}\'`).all()',
  );
  write('src/search-users.cjs', safeSource);
  write('src/legacy-search.cjs', [
    'function legacySearch(database, input) {',
    "  return database.prepare('SELECT * FROM archived_users WHERE id = ' + input).all();",
    '}',
    'module.exports = { legacySearch };',
    '',
  ].join('\n'));
  write('src/local-only.cjs', 'module.exports = { staged: null, unstaged: null };\n');
  write('tests/search-users.test.cjs', [
    "const assert = require('node:assert/strict');",
    "const { searchUsers } = require('../src/search-users.cjs');",
    "const database = { prepare: () => ({ all: () => [{ id: 1, name: 'Alice' }] }) };",
    "assert.deepEqual(searchUsers(database, { query: { name: 'Alice' } }), [{ id: 1, name: 'Alice' }]);",
    '',
  ].join('\n'));
  git('add', '.');
  git('commit', '-m', 'Safe search baseline and pre-existing legacy negative control');
  git('checkout', '-b', 'feature/unsafe-search');
  write('src/search-users.cjs', vulnerableSource);
  git('add', 'src/search-users.cjs');
  git('commit', '-m', 'Intentionally replace bound parameter for local acceptance test');
  git('checkout', 'main');
  write('src/base-only.cjs', "module.exports = input => eval(input);\n");
  git('add', 'src/base-only.cjs');
  git('commit', '-m', 'Base-only negative control after branch divergence');
  git('checkout', 'feature/unsafe-search');
  write('src/local-only.cjs', 'module.exports = { staged: input => eval(input), unstaged: null };\n');
  git('add', 'src/local-only.cjs');
  write('src/local-only.cjs', 'module.exports = { staged: input => eval(input), unstaged: input => eval(input) };\n');
  write('src/untracked.cjs', 'module.exports = input => eval(input);\n');
  const before = inventory(repo);
  const snapshot = collectReview({ repo, base: 'main', context: ['src/legacy-search.cjs', 'tests/search-users.test.cjs'] });
  assert.equal(snapshot.state, 'ready');
  assert.equal(snapshot.branch, 'feature/unsafe-search');
  assert.equal(snapshot.base, 'main');
  assert.deepEqual(snapshot.files.map(file => file.path), ['src/search-users.cjs']);
  assert.equal(snapshot.files[0].before.content, safeSource);
  assert.equal(snapshot.files[0].after.content, vulnerableSource);
  assert.match(snapshot.patch, /\+.*\$\{name\}/);
  assert.doesNotMatch(snapshot.patch, /base-only|local-only|untracked|archived_users/);
  assert.equal(snapshot.requestedContext.length, 2);
  assert.deepEqual(inventory(repo), before, 'Collector changed repository bytes.');
  const baseline = { repo, head: snapshot.head, branch: snapshot.branch, status: git('status', '--porcelain=v1'), files: before };
  writeJson(join(run, 'baseline.json'), baseline);
  writeJson(join(run, 'snapshot.json'), snapshot);
  writeJson(join(run, 'results.json'), {
    repository: repo, branch: snapshot.branch, base: snapshot.base, head: snapshot.head,
    changedFiles: snapshot.files.map(file => file.path),
    collectorScopeAssertions: 'PASS', collectorRepositoryIntegrity: 'PASS',
    actualCustomAgentInvocation: 'PENDING: select the custom agent in VS Code',
    actualAgentFindings: 'NOT VERIFIED', actualAgentRepositoryIntegrity: 'NOT VERIFIED',
  });
  writeFileSync(join(run, 'RUN-AGENT.md'), [
    '# Manual Custom Agent Acceptance Run', '',
    'Open the repo subdirectory in a separate VS Code window.',
    'Select Feature Branch Security Reviewer. Verify only read/search tools are enabled.',
    'Attach snapshot.json from this parent directory; do not copy it into the repository.',
    'Prompt: Review this complete committed snapshot against the explicitly selected base main.',
    'Follow your skill and report template. Read source evidence only from the snapshot.',
    'Do not modify files or execute any tools other than read/search.', '',
    'After the normal report, ask for a JSON summary in chat with this schema:',
    '{ "head": "<snapshot head>", "findings": [{ "file": "src/search-users.cjs", "line": 3, "category": "Security", "severity": "High", "title": "SQL injection" }] }',
    'The example is the expected oracle for the human tester, not content to attach to the reviewer.',
    'Do not show results.json, baseline.json, or this oracle to the reviewer.',
    'A related specific test-gap finding is allowed at the same change; unrelated findings are not.',
    'Save the actual agent JSON response as agent-findings.json next to this file, not inside repo.',
    'The verifier checks matching paths/lines and expected finding presence, not semantic quality.',
    'Retain the chat transcript and inspect its actual tool calls for a full acceptance record.', '',
    'From the original project root, run:',
    `node tests/agent-acceptance.cjs verify "${run}"`,
    'Add the full agent-findings.json path as the next argument to validate the actual response.',
    '',
    'These intentionally vulnerable files are offline fixtures only. Do not deploy or execute them.',
    '',
  ].join('\n'));
  return { run, ...JSON.parse(readFileSync(join(run, 'results.json'), 'utf8')) };
}

function verifyScenario(run, reportPath) {
  const baseline = JSON.parse(readFileSync(join(run, 'baseline.json'), 'utf8'));
  const snapshot = JSON.parse(readFileSync(join(run, 'snapshot.json'), 'utf8'));
  assert.deepEqual(inventory(baseline.repo), baseline.files, 'Repository files changed since the pre-analysis baseline.');
  assert.equal(gitAt(baseline.repo, 'rev-parse', 'HEAD'), baseline.head);
  assert.equal(gitAt(baseline.repo, 'branch', '--show-current'), baseline.branch);
  assert.equal(gitAt(baseline.repo, 'status', '--porcelain=v1'), baseline.status);
  const result = {
    repositoryIntegrity: 'PASS: SHA-256 contents of all files, including .git, match the pre-analysis baseline',
    findingsRelevance: 'PENDING: no actual agent response supplied',
    actualCustomAgentInvocation: 'Not established by this verifier; inspect the chat transcript and tool calls',
  };
  if (reportPath) {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    assert.equal(report.head, snapshot.head);
    assert.ok(Array.isArray(report.findings), 'Expected findings array.');
    assert.ok(report.findings.some(finding => finding.category === 'Security' && /sql.*injection|parameter/i.test(finding.title) && finding.severity === 'High'), 'Expected high-severity SQL injection finding.');
    for (const finding of report.findings) {
      assert.equal(finding.file, 'src/search-users.cjs', 'Finding points outside the committed change.');
      assert.equal(finding.line, 3, 'Finding is not attributed to the changed HEAD line.');
    }
    result.findingsRelevance = 'PASS: actual supplied summary identifies SQL injection and no out-of-scope findings';
  }
  return result;
}

if (require.main === module) {
  try {
    const [mode, run, reportPath] = process.argv.slice(2);
    if (mode === 'prepare' && !run) console.log(JSON.stringify(prepareScenario(), null, 2));
    else if (mode === 'verify' && run) console.log(JSON.stringify(verifyScenario(resolve(run), reportPath && resolve(reportPath)), null, 2));
    else throw new Error('Usage: node tests/agent-acceptance.cjs prepare | verify <run-directory> [agent-findings.json]');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { prepareScenario, verifyScenario };