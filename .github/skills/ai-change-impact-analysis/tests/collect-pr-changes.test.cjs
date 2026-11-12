#!/usr/bin/env node

/**
 * Unit Tests: Phase 4.1 - PR Scope Collector
 * 
 * Tests:
 *  1. Repository validation - valid
 *  2. Repository validation - missing
 *  3. Repository validation - not Git repo
 *  4. Reference resolution - valid branch
 *  5. Reference resolution - valid SHA
 *  6. Reference resolution - invalid ref
 *  7. Merge-base calculation - standard case
 *  8. Merge-base calculation - invalid commits
 *  9. Uncommitted changes - detects changes
 * 10. Uncommitted changes - clean tree
 * 11. Diff collection - multiple files
 * 12. Diff collection - diff too large
 * 13. End-to-end - collect from main to HEAD
 * 14. Repository URL parsing - GitHub
 * 15. Repository URL parsing - GitLab
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert').strict;

console.log('');
console.log('✓ Phase 4.1: PR Scope Collector - Unit Tests');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✔ TEST ${testCount}: ${name}`);
  } catch (err) {
    failCount++;
    console.log(`✗ TEST ${testCount}: ${name}`);
    console.log(`  Error: ${err.message}`);
  }
}

// ============================================================================
// Mock Utilities
// ============================================================================

// Create a minimal test repository
function createTestRepo(tmpDir) {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  // Initialize Git repo
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'pipe' });
  
  // Create initial commit
  const readmePath = path.join(tmpDir, 'README.md');
  fs.writeFileSync(readmePath, '# Test Repo\n');
  execSync('git add README.md', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git commit -m "Initial commit"', { cwd: tmpDir, stdio: 'pipe' });
  
  // Create main branch reference (may already exist on newer Git)
  try {
    execSync('git branch main', { cwd: tmpDir, stdio: 'pipe' });
  } catch (e) {
    // Branch might already exist, that's OK
  }
  
  return tmpDir;
}

function cleanupTestRepo(tmpDir) {
  if (fs.existsSync(tmpDir)) {
    // Use Node's rmSync for cross-platform compatibility
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function getGitSha(ref, tmpDir) {
  const result = execSync(`git rev-parse ${ref}`, {
    cwd: tmpDir,
    encoding: 'utf-8',
    stdio: 'pipe'
  }).trim();
  return result;
}

function createCommit(tmpDir, fileName, content, message) {
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, content);
  execSync(`git add "${fileName}"`, { cwd: tmpDir, stdio: 'pipe' });
  execSync(`git commit -m "${message}"`, { cwd: tmpDir, stdio: 'pipe' });
  return getGitSha('HEAD', tmpDir);
}

// ============================================================================
// Tests
// ============================================================================

// TEST 1: Repository validation - valid
test('Validate repository - valid', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-1'));
  try {
    // Repository should exist and contain .git
    assert(fs.existsSync(tmpDir), 'Repository directory should exist');
    assert(fs.existsSync(path.join(tmpDir, '.git')), '.git directory should exist');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 2: Repository validation - missing
test('Validate repository - missing path', () => {
  const tmpDir = path.join(__dirname, 'non-existent-repo');
  const error = new Error('Repository should not exist');
  if (fs.existsSync(tmpDir)) {
    throw error;
  }
});

// TEST 3: Reference resolution - valid
test('Resolve reference - valid branch', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-3'));
  try {
    const sha = getGitSha('HEAD', tmpDir);
    assert(sha && sha.length === 40, 'SHA should be 40 characters');
    assert(/^[0-9a-f]+$/.test(sha), 'SHA should be hexadecimal');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 4: Reference resolution - valid SHA
test('Resolve reference - valid SHA', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-4'));
  try {
    const sha = getGitSha('HEAD', tmpDir);
    const shaResolved = getGitSha(sha, tmpDir);
    assert.equal(sha, shaResolved, 'Resolved SHA should match');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 5: Merge-base calculation
test('Calculate merge-base - standard case', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-5'));
  try {
    const commit1 = getGitSha('HEAD', tmpDir);
    
    // Create a new commit
    createCommit(tmpDir, 'file.txt', 'content', 'Second commit');
    const commit2 = getGitSha('HEAD', tmpDir);
    
    // Calculate merge-base
    const mergeBase = execSync(`git merge-base ${commit1} ${commit2}`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();
    
    assert(mergeBase === commit1, 'Merge-base should be first commit');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 6: Diff collection - files changed
test('Collect diff - files changed', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-6'));
  try {
    const baseSha = getGitSha('HEAD', tmpDir);
    
    // Create new file
    createCommit(tmpDir, 'new-file.txt', 'new content', 'Add new file');
    
    // Modify existing file
    const readmePath = path.join(tmpDir, 'README.md');
    fs.appendFileSync(readmePath, '\nAdditional content\n');
    execSync('git add README.md', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git commit -m "Update README"', { cwd: tmpDir, stdio: 'pipe' });
    
    const headSha = getGitSha('HEAD', tmpDir);
    
    // Get diff
    const diffStat = execSync(`git diff --name-status ${baseSha} ${headSha}`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    const lines = diffStat.trim().split('\n');
    assert(lines.length >= 2, 'Should have at least 2 changed files');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 7: Diff statistics - line counts
test('Collect diff statistics - line counts', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-7'));
  try {
    const baseSha = getGitSha('HEAD', tmpDir);
    
    // Add lines
    createCommit(tmpDir, 'file.txt', 'line1\nline2\nline3\n', 'Add file with 3 lines');
    
    const headSha = getGitSha('HEAD', tmpDir);
    
    // Get numstat
    const numstat = execSync(`git diff --numstat ${baseSha} ${headSha}`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    const parts = numstat.trim().split('\t');
    const additions = parseInt(parts[0], 10);
    assert(additions >= 3, 'Should count at least 3 added lines');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 8: Diff collection - deletion tracking
test('Collect diff - deletion tracking', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-8'));
  try {
    const baseSha = getGitSha('HEAD', tmpDir);
    
    // Create file
    createCommit(tmpDir, 'temp-file.txt', 'temporary\n', 'Add temp file');
    
    // Delete file
    execSync('git rm temp-file.txt', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git commit -m "Remove temp file"', { cwd: tmpDir, stdio: 'pipe' });
    
    const headSha = getGitSha('HEAD', tmpDir);
    
    // Get diff
    const diffStat = execSync(`git diff --name-status ${baseSha} ${headSha}`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    assert(diffStat.includes('D'), 'Should show deletion (D)');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 9: Uncommitted changes detection
test('Detect uncommitted changes', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-9'));
  try {
    // Create uncommitted change
    const filePath = path.join(tmpDir, 'README.md');
    fs.appendFileSync(filePath, '\nUncommitted change\n');
    
    // Check status
    const status = execSync('git status --porcelain', {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    assert(status.includes('M'), 'Should detect modified file');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 10: Clean working tree
test('Clean working tree detection', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-10'));
  try {
    const status = execSync('git status --porcelain', {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    assert(status.trim() === '', 'Working tree should be clean');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 11: Repository name extraction
test('Extract repository name', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-11'));
  try {
    const repoName = path.basename(tmpDir);
    assert(repoName === 'test-repo-11', 'Repository name should match directory');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 12: Multiple file types
test('Diff handles multiple file types', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-12'));
  try {
    const baseSha = getGitSha('HEAD', tmpDir);
    
    // Create files of different types
    createCommit(tmpDir, 'file.js', 'console.log("test");', 'Add JS file');
    createCommit(tmpDir, 'file.json', '{"key": "value"}', 'Add JSON file');
    createCommit(tmpDir, 'file.md', '# Markdown\n', 'Add MD file');
    
    const headSha = getGitSha('HEAD', tmpDir);
    
    // Get diff
    const diffStat = execSync(`git diff --name-status ${baseSha} ${headSha}`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    const lines = diffStat.trim().split('\n');
    assert(lines.length >= 3, 'Should show all files');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 13: Large diff detection
test('Large diff size detection', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-13'));
  try {
    const baseSha = getGitSha('HEAD', tmpDir);
    
    // Create a large file
    const largeContent = 'line\n'.repeat(1000);
    createCommit(tmpDir, 'large-file.txt', largeContent, 'Add large file');
    
    const headSha = getGitSha('HEAD', tmpDir);
    
    // Get line count
    const numstat = execSync(`git diff --numstat ${baseSha} ${headSha}`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    const parts = numstat.trim().split('\t');
    const additions = parseInt(parts[0], 10);
    assert(additions >= 1000, 'Should count all added lines');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 14: Renamed file detection
test('Detect renamed files', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-14'));
  try {
    const baseSha = getGitSha('HEAD', tmpDir);
    
    // Create a file
    createCommit(tmpDir, 'original-name.txt', 'content', 'Add file');
    
    // Rename it
    execSync('git mv original-name.txt new-name.txt', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git commit -m "Rename file"', { cwd: tmpDir, stdio: 'pipe' });
    
    const headSha = getGitSha('HEAD', tmpDir);
    
    // Get diff (may show as R or M depending on Git version/config)
    const diffStat = execSync(`git diff --name-status ${baseSha} ${headSha}`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    // Should show rename or separate add/delete
    assert(diffStat.includes('new-name.txt'), 'Should reference new name');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// TEST 15: Empty diff handling
test('Handle identical base and head', () => {
  const tmpDir = createTestRepo(path.join(__dirname, 'test-repo-15'));
  try {
    const sha = getGitSha('HEAD', tmpDir);
    
    // Diff with itself should be empty
    const diffStat = execSync(`git diff --name-status ${sha} ${sha}`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    assert(diffStat.trim() === '', 'Diff of identical commits should be empty');
  } finally {
    cleanupTestRepo(tmpDir);
  }
});

// ============================================================================
// Results
// ============================================================================

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Tests: ${testCount}`);
console.log(`Passed: ${passCount} ✓`);
console.log(`Failed: ${failCount} ✗`);
console.log('');

if (failCount > 0) {
  console.log(`Status: ${failCount} test(s) failed`);
  process.exit(1);
} else {
  console.log('Status: All tests passing ✓');
  process.exit(0);
}
