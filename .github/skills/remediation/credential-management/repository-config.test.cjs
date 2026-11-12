/**
 * Repository Config Manager Tests - Phase 5.1 Step 3
 * 8 tests for configuration management
 */

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
    console.log('\n✓ Repository Config Manager - Unit Tests Starting');
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
    console.log(`Status: Tests Complete`);
    console.log(`✓ Passed: ${this.passed}`);
    console.log(`✗ Failed: ${this.failed}`);
    console.log(`Total: ${this.tests.length}`);
    console.log(`Duration: ${duration}ms`);
    
    if (this.failed === 0) {
      console.log('\n✓ All tests passing!');
      console.log(`Status: Phase 5.1 Ready for Integration Tests\n`);
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
}

// Create test runner
const runner = new TestRunner();

// ==================== TESTS ====================

// TEST 1: Add repository configuration
runner.test('Add repository configuration', async () => {
  const rcm = new RepositoryConfigManager({ debug: false });
  
  const result = await rcm.addRepository({
    platform: 'github',
    owner: 'octocat',
    repo: 'Hello-World'
  });
  
  runner.assert(result === true, 'Should return true on success');
});

// TEST 2: Retrieve repository configuration
runner.test('Retrieve repository configuration', async () => {
  const rcm = new RepositoryConfigManager({ debug: false });
  
  await rcm.addRepository({
    platform: 'github',
    owner: 'octocat',
    repo: 'Hello-World'
  });
  
  const config = await rcm.getRepository('github', 'octocat', 'Hello-World');
  
  runner.assertNotNull(config, 'Should return configuration');
  runner.assertEqual(config.platform, 'github', 'Platform should match');
  runner.assertEqual(config.owner, 'octocat', 'Owner should match');
});

// TEST 3: Update repository configuration
runner.test('Update repository configuration', async () => {
  const rcm = new RepositoryConfigManager({ debug: false });
  
  await rcm.addRepository({
    platform: 'github',
    owner: 'octocat',
    repo: 'Hello-World'
  });
  
  await rcm.updateRepository('github', 'octocat', 'Hello-World', {
    branch: 'develop',
    autoMerge: true
  });
  
  const config = await rcm.getRepository('github', 'octocat', 'Hello-World');
  runner.assertEqual(config.branch, 'develop', 'Branch should be updated');
  runner.assert(config.autoMerge === true, 'AutoMerge should be updated');
});

// TEST 4: Remove repository configuration
runner.test('Remove repository configuration', async () => {
  const rcm = new RepositoryConfigManager({ debug: false });
  
  await rcm.addRepository({
    platform: 'github',
    owner: 'octocat',
    repo: 'Hello-World'
  });
  
  const removed = await rcm.removeRepository('github', 'octocat', 'Hello-World');
  runner.assert(removed === true, 'Should return true on success');
  
  const config = await rcm.getRepository('github', 'octocat', 'Hello-World');
  runner.assert(config === null, 'Should return null after removal');
});

// TEST 5: Check repository exists
runner.test('Check repository exists', async () => {
  const rcm = new RepositoryConfigManager({ debug: false });
  
  await rcm.addRepository({
    platform: 'gitlab',
    owner: 'group',
    repo: 'project'
  });
  
  const exists = await rcm.hasRepository('gitlab', 'group', 'project');
  runner.assert(exists === true, 'Should return true for existing repository');
});

// TEST 6: List repositories by platform
runner.test('List repositories by platform', async () => {
  const rcm = new RepositoryConfigManager({ debug: false });
  
  await rcm.addRepository({
    platform: 'github',
    owner: 'owner1',
    repo: 'repo1'
  });
  
  await rcm.addRepository({
    platform: 'gitlab',
    owner: 'owner2',
    repo: 'repo2'
  });
  
  const gitlabRepos = await rcm.listRepositories('gitlab');
  runner.assertEqual(gitlabRepos.length, 1, 'Should have 1 GitLab repo');
  runner.assertEqual(gitlabRepos[0].platform, 'gitlab', 'Platform should be gitlab');
});

// TEST 7: Reject credentials in configuration
runner.test('Reject credentials in configuration', async () => {
  const rcm = new RepositoryConfigManager({ debug: false });
  
  try {
    await rcm.addRepository({
      platform: 'github',
      owner: 'octocat',
      repo: 'Hello-World',
      token: 'ghp_secret123'
    });
    runner.assert(false, 'Should throw error when token is in config');
  } catch (error) {
    runner.assert(error.message.includes('Credentials'), 'Should mention credentials');
  }
});

// TEST 8: Validate configuration
runner.test('Validate configuration', async () => {
  const rcm = new RepositoryConfigManager({ debug: false });
  
  const validResult = rcm.validateConfig({
    platform: 'github',
    owner: 'octocat',
    repo: 'Hello-World'
  });
  
  runner.assert(validResult.valid === true, 'Valid config should pass');
  
  const invalidResult = rcm.validateConfig({
    platform: 'invalid',
    owner: 'octocat',
    repo: 'Hello-World'
  });
  
  runner.assert(invalidResult.valid === false, 'Invalid platform should fail');
});

// Run all tests
runner.run().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
