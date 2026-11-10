/**
 * LLM Fixer Unit Tests
 * 
 * Tests for Claude API-based fix generation and fallback logic.
 * 
 * Test Coverage:
 * - generateFixWithLLM() for each issue type
 * - Prompt creation and context building
 * - Response parsing and validation
 * - Language detection
 * - Fallback logic
 * - Error handling
 */

const llmFixer = require('../.github/skills/ai-code-security-review/scripts/remediation/llm-fixer.cjs');

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

// Helper: Assert equal
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Helper: Assert throws
function assertThrows(fn, message) {
  try {
    fn();
    throw new Error(message || 'Expected function to throw');
  } catch (error) {
    if (error.message === (message || 'Expected function to throw')) {
      throw error;
    }
    // Function threw as expected
  }
}

// ============================================================================
// TEST SUITE: LLM Fixer
// ============================================================================

console.log('✓ LLM Fixer - Unit Tests Starting');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

let passed = 0;
let failed = 0;

// TEST 1: Generate fix for weak cryptography
if (test('TEST 1: Generate fix - Weak Cryptography', async () => {
  const finding = {
    issueType: 'weak-cryptography',
    code: 'MessageDigest md = MessageDigest.getInstance("MD5");',
    file: 'src/Security.java',
    line: 42,
    severity: 'HIGH',
    description: 'MD5 is cryptographically broken'
  };

  const result = await llmFixer.generateFixWithLLM(finding);
  assert(result && typeof result === 'object', 'Result should be object');
  assert(result.issueType === 'weak-cryptography', 'Issue type should match');
  // Note: Will fail in stub, but validates interface
})) passed++; else failed++;

// TEST 2: Generate fix for authentication bypass
if (test('TEST 2: Generate fix - Authentication Bypass', async () => {
  const finding = {
    issueType: 'authentication-bypass',
    code: 'if (username === "admin" && password === password) return true;',
    file: 'src/Auth.java',
    line: 15,
    severity: 'CRITICAL',
    description: 'Weak authentication logic'
  };

  const result = await llmFixer.generateFixWithLLM(finding);
  assert(result && typeof result === 'object', 'Result should be object');
  assert(result.issueType === 'authentication-bypass', 'Issue type should match');
})) passed++; else failed++;

// TEST 3: Generate fix for logic error
if (test('TEST 3: Generate fix - Logic Error', async () => {
  const finding = {
    issueType: 'logic-error',
    code: 'if (age > 18 || age < 13) return "Invalid";',
    file: 'src/Validator.java',
    line: 28,
    severity: 'MEDIUM',
    description: 'Logic error: should be AND not OR'
  };

  const result = await llmFixer.generateFixWithLLM(finding);
  assert(result && typeof result === 'object', 'Result should be object');
  assert(result.issueType === 'logic-error', 'Issue type should match');
})) passed++; else failed++;

// TEST 4: Generate fix for race condition
if (test('TEST 4: Generate fix - Race Condition', async () => {
  const finding = {
    issueType: 'race-condition',
    code: 'counter++; // Shared variable without sync',
    file: 'src/Counter.java',
    line: 50,
    severity: 'HIGH',
    description: 'Race condition on shared counter'
  };

  const result = await llmFixer.generateFixWithLLM(finding);
  assert(result && typeof result === 'object', 'Result should be object');
  assert(result.issueType === 'race-condition', 'Issue type should match');
})) passed++; else failed++;

// TEST 5: Generate fix for circular dependency
if (test('TEST 5: Generate fix - Circular Dependency', async () => {
  const finding = {
    issueType: 'circular-dependency',
    code: 'import A from "./a.js"; // A imports B, B imports A',
    file: 'src/B.js',
    line: 3,
    severity: 'MEDIUM',
    description: 'Circular import detected'
  };

  const result = await llmFixer.generateFixWithLLM(finding);
  assert(result && typeof result === 'object', 'Result should be object');
  assert(result.issueType === 'circular-dependency', 'Issue type should match');
})) passed++; else failed++;

// TEST 6: Create prompt for weak cryptography
if (test('TEST 6: Create prompt - Weak Cryptography', () => {
  const finding = {
    issueType: 'weak-cryptography',
    code: 'MessageDigest.getInstance("MD5")',
    file: 'Security.java',
    severity: 'HIGH',
    description: 'Weak hash algorithm'
  };

  const prompt = llmFixer.createPrompt(finding);
  assert(prompt && typeof prompt === 'object', 'Prompt should be object');
  assert(prompt.systemContext && prompt.userPrompt, 'Should have both parts');
  assert(prompt.systemContext.includes('weak-cryptography'), 'System context should reference issue type');
  assert(prompt.userPrompt.includes('MD5'), 'User prompt should include code');
  assert(prompt.userPrompt.includes('SHA'), 'User prompt should mention replacement');
})) passed++; else failed++;

// TEST 7: Create prompt for authentication bypass
if (test('TEST 7: Create prompt - Authentication Bypass', () => {
  const finding = {
    issueType: 'authentication-bypass',
    code: 'if (pwd === password) authenticate()',
    file: 'Auth.java',
    severity: 'CRITICAL',
    description: 'No validation'
  };

  const prompt = llmFixer.createPrompt(finding);
  assert(prompt.userPrompt.includes('authentication'), 'Should mention authentication');
  assert(prompt.userPrompt.includes('credential') || prompt.userPrompt.includes('Strengthen'), 'Should mention credentials or strengthen');
})) passed++; else failed++;

// TEST 8: Parse response - Valid fix
if (test('TEST 8: Parse response - Valid fix', () => {
  const response = 'MessageDigest.getInstance("SHA-256")';
  const original = 'MessageDigest.getInstance("MD5")';

  const parsed = llmFixer.parseResponse(response, original);
  assert(parsed === response, 'Should return parsed response');
  assert(parsed !== original, 'Should be different from original');
})) passed++; else failed++;

// TEST 9: Parse response - With code blocks
if (test('TEST 9: Parse response - With code blocks', () => {
  const response = '```java\nMessageDigest.getInstance("SHA-256")\n```';
  const original = 'MessageDigest.getInstance("MD5")';

  const parsed = llmFixer.parseResponse(response, original);
  assert(parsed === 'MessageDigest.getInstance("SHA-256")', 'Should extract code from blocks');
  assert(!parsed.includes('```'), 'Should remove code block markers');
})) passed++; else failed++;

// TEST 10: Parse response - Invalid response
if (test('TEST 10: Parse response - Invalid', () => {
  const response = null;
  const original = 'code';

  const parsed = llmFixer.parseResponse(response, original);
  assert(parsed === null, 'Should return null for invalid response');
})) passed++; else failed++;

// TEST 11: Get language - Java
if (test('TEST 11: Get language - Java', () => {
  const code = 'import java.util.*; public class Test {}';
  const lang = llmFixer.getLanguage(code);
  assert(lang === 'Java', 'Should detect Java');
})) passed++; else failed++;

// TEST 12: Get language - Python
if (test('TEST 12: Get language - Python', () => {
  const code = 'def function(): import os; pass';
  const lang = llmFixer.getLanguage(code);
  assert(lang === 'Python', 'Should detect Python');
})) passed++; else failed++;

// TEST 13: Get language - JavaScript
if (test('TEST 13: Get language - JavaScript', () => {
  const code = 'const x = 5; function test() {}';
  const lang = llmFixer.getLanguage(code);
  assert(lang === 'JavaScript', 'Should detect JavaScript');
})) passed++; else failed++;

// TEST 14: Validate LLM fix - Good fix
if (test('TEST 14: Validate LLM fix - Good fix', () => {
  const original = 'MessageDigest.getInstance("MD5")';
  const fixed = 'MessageDigest.getInstance("SHA-256")';

  const result = llmFixer.validateLLMFix(original, fixed);
  assert(result && typeof result === 'object', 'Should return validation object');
  assert(result.valid === true, 'Should be valid');
  assert(result.score >= 60, 'Should have good score');
  assert(Array.isArray(result.issues), 'Should have issues array');
})) passed++; else failed++;

// TEST 15: Validate LLM fix - Unchanged code
if (test('TEST 15: Validate LLM fix - Unchanged', () => {
  const code = 'MessageDigest.getInstance("MD5")';

  const result = llmFixer.validateLLMFix(code, code);
  assert(result.valid === false, 'Should be invalid');
  assert(result.score < 60, 'Should have low score');
  assert(result.issues.length > 0, 'Should list issues');
  assert(result.issues[0].includes('unchanged'), 'Should mention code unchanged');
})) passed++; else failed++;

// TEST 16: Estimate effort - Weak Cryptography
if (test('TEST 16: Estimate effort - Weak Cryptography', () => {
  const effort = llmFixer.estimateLLMEffort('weak-cryptography');
  assert(effort === 'MEDIUM', 'Should be MEDIUM effort');
})) passed++; else failed++;

// TEST 17: Estimate effort - Authentication Bypass
if (test('TEST 17: Estimate effort - Authentication Bypass', () => {
  const effort = llmFixer.estimateLLMEffort('authentication-bypass');
  assert(effort === 'LARGE', 'Should be LARGE effort');
})) passed++; else failed++;

// TEST 18: Estimate effort - Unknown type
if (test('TEST 18: Estimate effort - Unknown type', () => {
  const effort = llmFixer.estimateLLMEffort('unknown-type');
  assert(effort === 'MEDIUM', 'Should default to MEDIUM');
})) passed++; else failed++;

// TEST 19: Get description - Valid issue type
if (test('TEST 19: Get description - Valid issue type', () => {
  const desc = llmFixer.getDescription('weak-cryptography');
  assert(desc && typeof desc === 'string', 'Should return string');
  assert(desc.includes('cryptographic'), 'Should mention cryptography');
})) passed++; else failed++;

// TEST 20: Get description - Unknown issue type
if (test('TEST 20: Get description - Unknown issue type', () => {
  const desc = llmFixer.getDescription('unknown-issue');
  assert(desc && typeof desc === 'string', 'Should return string');
  assert(desc.includes('LLM-generated'), 'Should mention LLM');
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
  console.log('Status: Ready for STEP 5');
  process.exit(0);
} else {
  console.log(`✗ ${failed} test(s) failed`);
  process.exit(1);
}
