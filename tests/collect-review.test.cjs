const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, readFileSync, rmSync, renameSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { collectReview } = require('../.github/skills/ai-code-security-review/scripts/collect-review.cjs');
const { prepareScenario, verifyScenario } = require('./agent-acceptance.cjs');

function fixture(run) {
  const repo = mkdtempSync(join(tmpdir(), 'feature-review-'));
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (path, content) => writeFileSync(join(repo, path), content);
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Fixture Developer');
    git('config', 'user.email', 'fixture@example.invalid');
    git('config', 'core.autocrlf', 'false');
    write('app.txt', 'safe baseline\n');
    write('context.txt', 'original context\n');
    git('add', '.');
    git('commit', '-m', 'baseline');
    git('checkout', '-b', 'feature');
    run({ repo, git, write });
  } finally { rmSync(repo, { recursive: true, force: true }); }
}

test('requires explicit base confirmation and does not assume upstream is base', () => fixture(({ repo }) => {
  const result = collectReview({ repo });
  assert.equal(result.state, 'base-confirmation-required');
  assert.equal(result.branch, 'feature');
  assert.equal(result.patch, undefined);
}));

test('uses merge-base scope and excludes base-only and uncommitted changes', () => fixture(({ repo, git, write }) => {
  write('app.txt', 'committed feature\n');
  git('add', '.'); git('commit', '-m', 'feature');
  git('checkout', 'main');
  write('base-only.txt', 'base-only secret\n');
  git('add', '.'); git('commit', '-m', 'base advances');
  git('checkout', 'feature');
  write('app.txt', 'uncommitted staged\n'); git('add', 'app.txt');
  write('app.txt', 'uncommitted unstaged\n');
  write('untracked.txt', 'untracked vulnerable code\n');
  write('context.txt', 'dirty context\n');
  const before = git('status', '--porcelain=v1');
  const indexBefore = readFileSync(join(repo, '.git', 'index'));
  const headBefore = git('rev-parse', 'HEAD');
  const result = collectReview({ repo, base: 'main', context: ['context.txt'] });
  assert.deepEqual(result.files.map(file => file.path), ['app.txt']);
  assert.match(result.patch, /committed feature/);
  assert.doesNotMatch(JSON.stringify(result.files), /uncommitted|untracked vulnerable|base-only secret/);
  assert.equal(result.requestedContext[0].after.content, 'original context\n');
  assert.equal(git('status', '--porcelain=v1'), before);
  assert.equal(git('rev-parse', 'HEAD'), headBefore);
  assert.equal(git('branch', '--show-current'), 'feature');
  assert.deepEqual(readFileSync(join(repo, '.git', 'index')), indexBefore);
  assert.equal(readFileSync(join(repo, 'app.txt'), 'utf8'), 'uncommitted unstaged\n');
}));

test('handles renamed and deleted files with before and after evidence', () => fixture(({ repo, git }) => {
  renameSync(join(repo, 'app.txt'), join(repo, 'renamed file.txt'));
  rmSync(join(repo, 'context.txt'));
  git('add', '-A'); git('commit', '-m', 'rename and delete');
  const result = collectReview({ repo, base: 'main' });
  const renamed = result.files.find(file => file.path === 'renamed file.txt');
  assert.match(renamed.status, /^R/);
  assert.equal(renamed.oldPath, 'app.txt');
  assert.equal(renamed.after.content, 'safe baseline\n');
  assert.match(result.files.find(file => file.status === 'D').after.omitted, /absent/);
}));

test('fails closed for missing base or detached HEAD', () => fixture(({ repo, git }) => {
  assert.throws(() => collectReview({ repo, base: 'missing-ref' }));
  git('checkout', '--detach');
  assert.throws(() => collectReview({ repo, base: 'main' }));
}));

test('empty committed diff remains empty despite working-tree changes', () => fixture(({ repo, write }) => {
  write('app.txt', 'dirty only\n');
  const result = collectReview({ repo, base: 'main' });
  assert.equal(result.patch, '');
  assert.deepEqual(result.files, []);
}));

test('marks binary and oversized blobs as gaps without reading working-tree content', () => fixture(({ repo, git, write }) => {
  write('binary.bin', Buffer.from([0, 1, 2]));
  write('large.txt', 'content\n'.repeat(40000));
  git('add', '.'); git('commit', '-m', 'unsupported context');
  const result = collectReview({ repo, base: 'main' });
  assert.match(result.files.find(file => file.path === 'binary.bin').after.omitted, /Binary/);
  assert.match(result.files.find(file => file.path === 'large.txt').after.omitted, /size limit/);
}));

test('acceptance verifier checks synthetic finding scope and detects repository modification', () => {
  const artifacts = mkdtempSync(join(tmpdir(), 'review-acceptance-'));
  try {
    const scenario = prepareScenario({ artifacts });
    const snapshot = JSON.parse(readFileSync(join(scenario.run, 'snapshot.json'), 'utf8'));
    const summaryPath = join(scenario.run, 'synthetic-summary.json');
    const summary = {
      head: snapshot.head,
      findings: [{ file: 'src/search-users.cjs', line: 3, category: 'Security', severity: 'High', title: 'SQL injection' }],
    };
    writeFileSync(summaryPath, JSON.stringify(summary));
    assert.match(verifyScenario(scenario.run, summaryPath).findingsRelevance, /^PASS/);
    summary.findings.push({ file: 'src/legacy-search.cjs', line: 2, category: 'Security', severity: 'High', title: 'Pre-existing SQL injection' });
    writeFileSync(summaryPath, JSON.stringify(summary));
    assert.throws(() => verifyScenario(scenario.run, summaryPath), /outside the committed change/);
    summary.findings.pop();
    summary.findings[0].line = 1;
    writeFileSync(summaryPath, JSON.stringify(summary));
    assert.throws(() => verifyScenario(scenario.run, summaryPath), /changed HEAD line/);
    writeFileSync(join(scenario.repository, 'src', 'search-users.cjs'), 'unexpected source modification\n');
    assert.throws(() => verifyScenario(scenario.run), /Repository files changed/);
  } finally { rmSync(artifacts, { recursive: true, force: true }); }
});
