/**
 * Token Validator Tests - Phase 5.1 Step 2
 * 10 tests for token validation, expiration, and sanitization
 */

const TokenValidator = require('./token-validator.cjs');

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
    console.log('\n✓ Token Validator - Unit Tests Starting');
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
      console.log(`Status: Ready for Repository Config Manager\n`);
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

  assertContains(haystack, needle, message) {
    if (!haystack.includes(needle)) {
      throw new Error(message || `Expected to contain "${needle}"`);
    }
  }
}

// Create test runner
const runner = new TestRunner();

// ==================== TESTS ====================

// TEST 1: Validate GitHub token format
runner.test('Validate GitHub token format', async () => {
  const tv = new TokenValidator();
  const result = tv.validateFormat('ghp_1234567890123456789012345678901234', 'github');
  
  runner.assert(result.valid === true, 'Valid GitHub token should pass');
});

// TEST 2: Validate GitLab token format
runner.test('Validate GitLab token format', async () => {
  const tv = new TokenValidator();
  const result = tv.validateFormat('glpat-1234567890123456789012', 'gitlab');
  
  runner.assert(result.valid === true, 'Valid GitLab token should pass');
});

// TEST 3: Reject invalid token format
runner.test('Reject invalid token format', async () => {
  const tv = new TokenValidator();
  const result = tv.validateFormat('invalid_token', 'github');
  
  runner.assert(result.valid === false, 'Invalid token should fail');
  runner.assertContains(result.error, 'does not match', 'Should have format error');
});

// TEST 4: Detect expired token
runner.test('Detect expired token', async () => {
  const tv = new TokenValidator();
  const pastDate = new Date(Date.now() - 86400000); // 1 day ago
  const metadata = { expiresAt: pastDate.toISOString() };
  
  const isExpired = tv.isExpired(metadata);
  runner.assert(isExpired === true, 'Past date should be expired');
});

// TEST 5: Detect non-expired token
runner.test('Detect non-expired token', async () => {
  const tv = new TokenValidator();
  const futureDate = new Date(Date.now() + 86400000); // 1 day from now
  const metadata = { expiresAt: futureDate.toISOString() };
  
  const isExpired = tv.isExpired(metadata);
  runner.assert(isExpired === false, 'Future date should not be expired');
});

// TEST 6: Detect token expiring soon
runner.test('Detect token expiring soon', async () => {
  const tv = new TokenValidator();
  const soonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
  const metadata = { expiresAt: soonDate.toISOString() };
  
  const expiringSoon = tv.isExpiringSoon(metadata, 7); // 7 day threshold
  runner.assert(expiringSoon === true, 'Token expiring in 3 days should be soon (7 day threshold)');
});

// TEST 7: Sanitize GitHub token
runner.test('Sanitize GitHub token', async () => {
  const tv = new TokenValidator();
  const text = 'Authorization: ghp_1234567890123456789012345678901234';
  const sanitized = tv.sanitizeOutput(text);
  
  runner.assert(!sanitized.includes('ghp_1234'), 'Token should be masked');
  runner.assertContains(sanitized, 'ghp_***', 'Should contain mask');
});

// TEST 8: Sanitize GitLab token
runner.test('Sanitize GitLab token', async () => {
  const tv = new TokenValidator();
  const text = 'Authorization: glpat-1234567890123456789012';
  const sanitized = tv.sanitizeOutput(text);
  
  runner.assert(!sanitized.includes('glpat-1234'), 'Token should be masked');
  runner.assertContains(sanitized, 'glpat-***', 'Should contain mask');
});

// TEST 9: Comprehensive token validation
runner.test('Comprehensive token validation', async () => {
  const tv = new TokenValidator();
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const metadata = { expiresAt: futureDate };
  
  const result = tv.validateToken('ghp_1234567890123456789012345678901234', 'github', metadata);
  
  runner.assert(result.valid === true, 'Token should be valid');
  runner.assertEqual(result.issues.length, 0, 'Should have no issues');
});

// TEST 10: Get supported platforms
runner.test('Get supported platforms', async () => {
  const tv = new TokenValidator();
  const platforms = tv.getSupportedPlatforms();
  
  runner.assert(platforms.includes('github'), 'Should support github');
  runner.assert(platforms.includes('gitlab'), 'Should support gitlab');
  runner.assertEqual(platforms.length, 2, 'Should have 2 platforms');
});

// Run all tests
runner.run().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
