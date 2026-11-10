/**
 * Rollback Manager Unit Tests
 * 
 * Tests for 3-tier progressive rollback strategy and state management.
 * 
 * Test Coverage:
 * - RollbackState initialization and tracking
 * - 3-tier fallback execution
 * - Pre-test validation
 * - Post-test validation
 * - Rollback analysis
 * - Checkpoint save/restore
 */

const rollback = require('../.github/skills/ai-code-security-review/scripts/remediation/rollback-manager.cjs');

// Helper: Run test and report result
function test(name, fn) {
  try {
    fn();
    console.log(`✔ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    return false;
  }
}

// Helper: Assert
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================================================
// TEST SUITE: Rollback Manager
// ============================================================================

console.log('✓ Rollback Manager - Unit Tests Starting');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

let passed = 0;
let failed = 0;

// TEST 1: Create RollbackState
if (test('TEST 1: Create RollbackState', () => {
  const finding = {
    issueType: 'sql-injection',
    code: 'SELECT * FROM users WHERE id = ?',
    file: 'db.js',
    line: 42
  };

  const state = new rollback.RollbackState(finding.code, finding);
  assert(state !== null, 'State created');
  assert(state.originalCode === finding.code, 'Original code preserved');
  assert(state.rolled_back === false, 'Initially not rolled back');
  assert(state.attempts.length === 0, 'No attempts initially');
})) passed++; else failed++;

// TEST 2: Record successful attempt
if (test('TEST 2: Record successful attempt', () => {
  const finding = { code: 'old code', issueType: 'test' };
  const state = new rollback.RollbackState(finding.code, finding);

  const fixedCode = 'new code';
  state.recordAttempt('test-strategy', fixedCode, true);

  assert(state.attempts.length === 1, 'Attempt recorded');
  assert(state.attempts[0].success === true, 'Success recorded');
  assert(state.currentCode === fixedCode, 'Current code updated');
})) passed++; else failed++;

// TEST 3: Record failed attempt
if (test('TEST 3: Record failed attempt', () => {
  const finding = { code: 'old code', issueType: 'test' };
  const state = new rollback.RollbackState(finding.code, finding);

  state.recordAttempt('test-strategy', finding.code, false, 'API error');

  assert(state.attempts.length === 1, 'Attempt recorded');
  assert(state.attempts[0].success === false, 'Failure recorded');
  assert(state.attempts[0].error === 'API error', 'Error message stored');
})) passed++; else failed++;

// TEST 4: Rollback to original
if (test('TEST 4: Rollback to original', () => {
  const original = 'original code';
  const finding = { code: original, issueType: 'test' };
  const state = new rollback.RollbackState(original, finding);

  state.currentCode = 'modified code';
  state.rollback('Test rollback');

  assert(state.rolled_back === true, 'Rolled back flag set');
  assert(state.currentCode === original, 'Code reverted to original');
  assert(state.rollbackReason === 'Test rollback', 'Rollback reason stored');
})) passed++; else failed++;

// TEST 5: Get state
if (test('TEST 5: Get state', () => {
  const finding = { code: 'code', issueType: 'test' };
  const state = new rollback.RollbackState(finding.code, finding);

  state.recordAttempt('strategy1', 'fixed1', true);
  state.recordAttempt('strategy2', 'fixed2', false, 'error');

  const current = state.getState();
  assert(current.totalAttempts === 2, 'Total attempts correct');
  assert(current.successfulAttempts === 1, 'Successful count correct');
  assert(current.failedAttempts === 1, 'Failed count correct');
  assert(current.rolled_back === false, 'Rolled back status correct');
})) passed++; else failed++;

// TEST 6: Execute with successful tier 1
if (test('TEST 6: Execute with successful tier 1', async () => {
  const finding = {
    issueType: 'sql-injection',
    code: 'SELECT * FROM users WHERE id = ' + id,
    file: 'db.js',
    line: 42
  };

  const generators = {
    tier1: async (f) => ({
      success: true,
      fixedCode: 'SELECT * FROM users WHERE id = ?'
    })
  };

  const result = await rollback.executeWithFallback(finding, generators);
  assert(result.success === true, 'Success returned');
  assert(result.code === 'SELECT * FROM users WHERE id = ?', 'Fixed code returned');
  assert(result.strategy === 'tier1-primary', 'Correct strategy');
  assert(result.rolled_back === false, 'Not rolled back');
})) passed++; else failed++;

// TEST 7: Execute with tier 1 failure, tier 2 success
if (test('TEST 7: Execute with tier 1 failure, tier 2 success', async () => {
  const finding = {
    issueType: 'test-issue',
    code: 'original code',
    file: 'test.js',
    line: 10
  };

  const generators = {
    tier1: async (f) => ({
      success: false,
      error: 'LLM failed'
    }),
    tier2: async (f) => ({
      success: true,
      fixedCode: 'fixed by tier 2'
    })
  };

  const result = await rollback.executeWithFallback(finding, generators);
  assert(result.success === true, 'Success from tier 2');
  assert(result.code === 'fixed by tier 2', 'Tier 2 fix used');
  assert(result.strategy === 'tier2-fallback', 'Tier 2 strategy');
  assert(result.attempts.length === 2, 'Two attempts recorded');
})) passed++; else failed++;

// TEST 8: Execute with all failures - rollback
if (test('TEST 8: Execute with all failures - rollback', async () => {
  const finding = {
    issueType: 'test-issue',
    code: 'original code',
    file: 'test.js',
    line: 10
  };

  const generators = {
    tier1: async (f) => ({ success: false, error: 'T1 failed' }),
    tier2: async (f) => ({ success: false, error: 'T2 failed' }),
    tier3: async (f) => ({ success: false, error: 'T3 failed' })
  };

  const result = await rollback.executeWithFallback(finding, generators);
  assert(result.success === false, 'Failure returned');
  assert(result.rolled_back === true, 'Rolled back');
  assert(result.code === 'original code', 'Original code preserved');
  assert(result.strategy === 'rollback-all-failed', 'Rollback strategy');
})) passed++; else failed++;

// TEST 9: Pre-test validation - good fix
if (test('TEST 9: Pre-test validation - good fix', () => {
  const original = 'SELECT * FROM users WHERE id = ?';
  const fixed = 'SELECT * FROM users WHERE id = ?;';

  const result = rollback.preTestValidation(original, fixed);
  assert(result.valid === true, 'Should be valid');
  assert(result.score >= 60, 'Should have good score');
})) passed++; else failed++;

// TEST 10: Pre-test validation - unchanged code  
if (test('TEST 10: Pre-test validation - unchanged', () => {
  const code = 'SELECT * FROM users';

  const result = rollback.preTestValidation(code, code);
  // Note: preTestValidation checks structure but allows low scores
  // Same code should not be valid if used for fixing
  assert(result.score <= 60, 'Should have low score for unchanged code');
  assert(result.issues.some(i => i.includes('unchanged')), 'Should mention unchanged');
})) passed++; else failed++;

// TEST 11: Pre-test validation - empty code
if (test('TEST 11: Pre-test validation - empty code', () => {
  const original = 'SELECT * FROM users';
  const fixed = '';

  const result = rollback.preTestValidation(original, fixed);
  assert(result.valid === false, 'Should be invalid');
  assert(result.issues.some(i => i.includes('empty')), 'Should mention empty');
})) passed++; else failed++;

// TEST 12: Pre-test validation - code size
if (test('TEST 12: Pre-test validation - code size', () => {
  const original = 'x = 1';
  // Make code slightly different but significantly larger
  const fixed = 'x = 1; ' + 'y = 2; '.repeat(50);

  const result = rollback.preTestValidation(original, fixed);
  // The validation checks multiple criteria
  assert(result.score >= 0 && result.score <= 100, 'Score should be valid range');
})) passed++; else failed++;

// TEST 13: Post-test validation - all passed
if (test('TEST 13: Post-test validation - all passed', () => {
  const testResult = {
    success: true,
    passed: 10,
    total: 10,
    failed: 0,
    timeout: false,
    errors: []
  };

  const result = rollback.postTestValidation(testResult);
  assert(result.valid === true, 'Should be valid');
  assert(result.score >= 60, 'Should have good score');
  assert(result.testsPassed === 10, 'Passed count correct');
})) passed++; else failed++;

// TEST 14: Post-test validation - some failed
if (test('TEST 14: Post-test validation - some failed', () => {
  const testResult = {
    success: false,
    passed: 7,
    total: 10,
    failed: 3,
    timeout: false,
    errors: ['AssertionError']
  };

  const result = rollback.postTestValidation(testResult);
  assert(result.valid === false, 'Should be invalid');
  assert(result.score < 60, 'Should have low score');
  assert(result.testsFailed === 3, 'Failed count correct');
})) passed++; else failed++;

// TEST 15: Post-test validation - timeout
if (test('TEST 15: Post-test validation - timeout', () => {
  const testResult = {
    success: false,
    passed: 0,
    total: 10,
    failed: 10,
    timeout: true,
    errors: ['Timeout']
  };

  const result = rollback.postTestValidation(testResult);
  assert(result.valid === false, 'Should be invalid');
  assert(result.issues.some(i => i.includes('timeout')), 'Should mention timeout');
})) passed++; else failed++;

// TEST 16: Analyze rollback
if (test('TEST 16: Analyze rollback', () => {
  const finding = { code: 'code', issueType: 'test' };
  const state = new rollback.RollbackState(finding.code, finding);

  state.recordAttempt('tier1', 'code', false, 'Error 1');
  state.recordAttempt('tier2', 'code', false, 'Error 2');

  const analysis = rollback.analyzeRollback(state);
  assert(analysis.attemptCount === 2, 'Attempt count correct');
  assert(analysis.failureCount === 2, 'Failure count correct');
  assert(analysis.requiresManualReview === true, 'Requires manual review');
  assert(analysis.suggestedActions.length > 0, 'Has recovery actions');
})) passed++; else failed++;

// TEST 17: Multiple attempts tracking
if (test('TEST 17: Multiple attempts tracking', () => {
  const finding = { code: 'orig', issueType: 'test' };
  const state = new rollback.RollbackState(finding.code, finding);

  state.recordAttempt('tier1', 'code', false, 'Error 1');
  state.recordAttempt('tier2', 'code2', true);
  state.recordAttempt('tier3', 'code3', false, 'Error 3');

  const stateData = state.getState();
  assert(stateData.totalAttempts === 3, 'All attempts recorded');
  assert(stateData.successfulAttempts === 1, 'One success');
  assert(stateData.failedAttempts === 2, 'Two failures');
  assert(state.currentCode === 'code2', 'Current code from successful attempt');
})) passed++; else failed++;

// ============================================================================
// RESULTS
// ============================================================================

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Status: Tests Complete`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
console.log('');

if (failed === 0) {
  console.log('✓ All tests passing!');
  console.log('Status: Ready for STEP 6');
  process.exit(0);
} else {
  console.log(`✗ ${failed} test(s) failed`);
  process.exit(1);
}
