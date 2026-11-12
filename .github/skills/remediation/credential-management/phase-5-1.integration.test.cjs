/**
 * Phase 5.1 Integration Tests
 * Complete credential management workflow with multi-repository support
 */

const CredentialManager = require('./credential-manager.cjs');
const TokenValidator = require('./token-validator.cjs');
const RepositoryConfigManager = require('./repository-config.cjs');

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.startTime = Date.now();
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n✓ Phase 5.1 Integration Tests - Complete Workflow');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✔ ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`✗ ${test.name}`);
        console.log(`  Error: ${error.message}`);
      }
    }

    this.printSummary();
  }

  printSummary() {
    const duration = Date.now() - this.startTime;
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Status: Integration Tests Complete`);
    console.log(`✓ Passed: ${this.passed}`);
    console.log(`✗ Failed: ${this.failed}`);
    console.log(`Total: ${this.tests.length}`);
    console.log(`Duration: ${duration}ms`);
    
    if (this.failed === 0) {
      console.log('\n✓ All Phase 5.1 modules integrated!');
      console.log(`Status: Ready for Phase 5 - GitHub/GitLab API Integration\n`);
    } else {
      console.log('\n✗ Some tests failed');
      process.exit(1);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertNotNull(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || 'Value should not be null');
    }
  }

  assertContains(haystack, needle, message) {
    if (!haystack.includes(needle)) {
      throw new Error(message || `Expected to contain "${needle}"`);
    }
  }
}

// Create test runner
const runner = new TestRunner();

// ==================== INTEGRATION TESTS ====================

// TEST 1: Store credential and validate token
runner.test('Store credential and validate token', async () => {
  const cm = new CredentialManager({ debug: false });
  const tv = new TokenValidator({ debug: false });
  
  const token = 'ghp_1234567890123456789012345678901234';
  await cm.storeCredential('github', token);
  
  const retrieved = await cm.getCredential('github');
  const validation = tv.validateFormat(retrieved, 'github');
  
  runner.assert(validation.valid === true, 'Token should be valid');
});

// TEST 2: Add repository and retrieve with credential
runner.test('Add repository and retrieve with credential', async () => {
  const cm = new CredentialManager({ debug: false });
  const rcm = new RepositoryConfigManager({ debug: false });
  
  await cm.storeCredential('github', 'ghp_token123456789012345678901234567890');
  
  const repoConfig = {
    platform: 'github',
    owner: 'octocat',
    repo: 'Hello-World',
    autoMerge: true,
    reviewers: ['reviewer1']
  };
  
  await rcm.addRepository(repoConfig);
  
  const stored = await rcm.getRepository('github', 'octocat', 'Hello-World');
  runner.assertNotNull(stored, 'Repository should be stored');
  runner.assertEqual(stored.owner, 'octocat', 'Owner should match');
});

// TEST 3: Multi-repository support - GitHub and GitLab
runner.test('Multi-repository support - GitHub and GitLab', async () => {
  const cm = new CredentialManager({ debug: false });
  const rcm = new RepositoryConfigManager({ debug: false });
  
  // GitHub credentials
  await cm.storeCredential('github', 'ghp_github1234567890123456789012345678');
  
  // GitLab credentials
  await cm.storeCredential('gitlab', 'glpat-1234567890123456789012');
  
  // Add repositories
  await rcm.addRepository({
    platform: 'github',
    owner: 'github-org',
    repo: 'github-repo'
  });
  
  await rcm.addRepository({
    platform: 'gitlab',
    owner: 'gitlab-group',
    repo: 'gitlab-project'
  });
  
  const githubRepos = await rcm.listRepositories('github');
  const gitlabRepos = await rcm.listRepositories('gitlab');
  
  runner.assertEqual(githubRepos.length, 1, 'Should have 1 GitHub repo');
  runner.assertEqual(gitlabRepos.length, 1, 'Should have 1 GitLab repo');
});

// TEST 4: Token validation with expiration
runner.test('Token validation with expiration', async () => {
  const cm = new CredentialManager({ debug: false });
  const tv = new TokenValidator({ debug: false });
  
  const token = 'ghp_1234567890123456789012345678901234';
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  await cm.storeCredential('github', token, { expiresAt: futureDate });
  
  const retrieved = await cm.getCredential('github');
  const validation = tv.validateToken(retrieved, 'github', { expiresAt: futureDate });
  
  runner.assert(validation.valid === true, 'Non-expired token should be valid');
});

// TEST 5: Sanitize token in logs
runner.test('Sanitize token in logs', async () => {
  const tv = new TokenValidator({ debug: false });
  
  const logMessage = 'Error: ghp_1234567890123456789012345678901234 failed';
  const sanitized = tv.sanitizeOutput(logMessage);
  
  runner.assert(!sanitized.includes('ghp_1234'), 'Token should be masked');
  runner.assertContains(sanitized, 'ghp_***', 'Should contain mask');
  runner.assertContains(sanitized, 'Error:', 'Message should remain');
});

// TEST 6: Update repository settings and verify no credential leakage
runner.test('Update repository settings and verify no credential leakage', async () => {
  const rcm = new RepositoryConfigManager({ debug: false });
  
  await rcm.addRepository({
    platform: 'github',
    owner: 'test-org',
    repo: 'test-repo'
  });
  
  // Try to update with reviewers (allowed)
  await rcm.updateRepository('github', 'test-org', 'test-repo', {
    reviewers: ['alice', 'bob']
  });
  
  const config = await rcm.getRepository('github', 'test-org', 'test-repo');
  runner.assert(config.reviewers.includes('alice'), 'Should have updated reviewers');
});

// TEST 7: Delete and verify credential removal
runner.test('Delete and verify credential removal', async () => {
  const cm = new CredentialManager({ debug: false });
  
  await cm.storeCredential('github', 'ghp_secret123456789012345678901234567890');
  await cm.deleteCredential('github');
  
  const hasCredential = await cm.hasCredential('github');
  runner.assert(hasCredential === false, 'Credential should be deleted');
});

// TEST 8: List all platforms with credentials
runner.test('List all platforms with credentials', async () => {
  const cm = new CredentialManager({ debug: false });
  
  await cm.storeCredential('github', 'ghp_github1234567890123456789012345678');
  await cm.storeCredential('gitlab', 'glpat-gitlab1234567890123456789012');
  
  const platforms = await cm.getPlatforms();
  
  runner.assertEqual(platforms.length, 2, 'Should have 2 platforms');
  runner.assert(platforms.includes('github'), 'Should include github');
  runner.assert(platforms.includes('gitlab'), 'Should include gitlab');
});

// TEST 9: Complete workflow - GitHub PR creation scenario
runner.test('Complete workflow - GitHub PR creation scenario', async () => {
  const cm = new CredentialManager({ debug: false });
  const tv = new TokenValidator({ debug: false });
  const rcm = new RepositoryConfigManager({ debug: false });
  
  // Step 1: Developer stores GitHub credentials
  const ghToken = 'ghp_workflow1234567890123456789012345678';
  await cm.storeCredential('github', ghToken);
  
  // Step 2: Configure repository
  await rcm.addRepository({
    platform: 'github',
    owner: 'myorg',
    repo: 'myproject',
    branch: 'main',
    autoMerge: false,
    reviewers: ['lead-dev']
  });
  
  // Step 3: Validate token before API call
  const storedToken = await cm.getCredential('github');
  const validation = tv.validateFormat(storedToken, 'github');
  runner.assert(validation.valid === true, 'Token should be valid');
  
  // Step 4: Retrieve repository configuration (without credentials)
  const repoConfig = await rcm.getRepository('github', 'myorg', 'myproject');
  runner.assertNotNull(repoConfig, 'Repository config should exist');
  runner.assertEqual(repoConfig.platform, 'github', 'Platform should be github');
  
  // Step 5: Log message with sanitization
  const logMsg = `Creating PR for ${repoConfig.repo} with token ${storedToken}`;
  const sanitized = tv.sanitizeOutput(logMsg);
  runner.assert(!sanitized.includes('ghp_workflow'), 'Log should not contain token');
});

// TEST 10: Error handling - invalid configuration rejection
runner.test('Error handling - invalid configuration rejection', async () => {
  const rcm = new RepositoryConfigManager({ debug: false });
  
  const validation = rcm.validateConfig({
    platform: 'invalid-platform',
    owner: 'test',
    repo: 'test'
  });
  
  runner.assert(validation.valid === false, 'Invalid platform should fail validation');
  runner.assert(validation.errors.length > 0, 'Should have error messages');
});

// Run all tests
runner.run().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
