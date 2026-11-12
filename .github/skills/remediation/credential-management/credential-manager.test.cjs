/**
 * Credential Manager Tests - Phase 5.1 Step 1
 * 8 tests for credential storage, retrieval, update, and deletion
 */

const CredentialManager = require('./credential-manager.cjs');

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
    console.log('\n✓ Credential Manager - Unit Tests Starting');
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
      console.log(`Status: Ready for Token Validator\n`);
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

  assertNull(value, message) {
    if (value !== null && value !== undefined) {
      throw new Error(message || 'Value should be null');
    }
  }
}

// Create test runner
const runner = new TestRunner();

// ==================== TESTS ====================

// TEST 1: Store credential correctly
runner.test('Store credential correctly', async () => {
  const cm = new CredentialManager({ debug: false });
  const result = await cm.storeCredential('github', 'ghp_test123456');
  
  runner.assert(result === true, 'Should return true on success');
});

// TEST 2: Retrieve stored credential
runner.test('Retrieve stored credential', async () => {
  const cm = new CredentialManager({ debug: false });
  const token = 'ghp_retrieved123456';
  
  await cm.storeCredential('github', token);
  const retrieved = await cm.getCredential('github');
  
  runner.assertEqual(retrieved, token, 'Retrieved token should match stored token');
});

// TEST 3: Check credential exists
runner.test('Check credential exists', async () => {
  const cm = new CredentialManager({ debug: false });
  
  await cm.storeCredential('gitlab', 'glpat_test789');
  const exists = await cm.hasCredential('gitlab');
  
  runner.assert(exists === true, 'Credential should exist');
});

// TEST 4: Check credential does not exist
runner.test('Check credential does not exist', async () => {
  const cm = new CredentialManager({ debug: false });
  const exists = await cm.hasCredential('nonexistent');
  
  runner.assert(exists === false, 'Non-existent credential should not exist');
});

// TEST 5: Delete credential
runner.test('Delete credential', async () => {
  const cm = new CredentialManager({ debug: false });
  
  await cm.storeCredential('github', 'ghp_delete123');
  await cm.deleteCredential('github');
  const exists = await cm.hasCredential('github');
  
  runner.assert(exists === false, 'Credential should be deleted');
});

// TEST 6: Update credential
runner.test('Update credential', async () => {
  const cm = new CredentialManager({ debug: false });
  const oldToken = 'ghp_old123';
  const newToken = 'ghp_new456';
  
  await cm.storeCredential('github', oldToken);
  await cm.updateCredential('github', newToken);
  const retrieved = await cm.getCredential('github');
  
  runner.assertEqual(retrieved, newToken, 'Updated token should be new token');
  runner.assertNotNull(retrieved, 'Retrieved token should not be null');
});

// TEST 7: Handle missing platform parameter
runner.test('Handle missing platform parameter', async () => {
  const cm = new CredentialManager({ debug: false });
  
  try {
    await cm.storeCredential('', 'token');
    runner.assert(false, 'Should throw error for empty platform');
  } catch (error) {
    runner.assert(error.message.includes('Platform'), 'Should have platform error message');
  }
});

// TEST 8: Get platforms list
runner.test('Get platforms list', async () => {
  const cm = new CredentialManager({ debug: false });
  
  await cm.storeCredential('github', 'ghp_list123');
  await cm.storeCredential('gitlab', 'glpat_list789');
  const platforms = await cm.getPlatforms();
  
  runner.assert(platforms.includes('github'), 'Platforms should include github');
  runner.assert(platforms.includes('gitlab'), 'Platforms should include gitlab');
  runner.assertEqual(platforms.length, 2, 'Should have 2 platforms');
});

// Run all tests
runner.run().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
