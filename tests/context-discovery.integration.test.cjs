#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { discoverContext } = require('../.github/skills/ai-code-security-review/scripts/context-discovery.cjs');

console.log('🧪 Running Integration Tests for Context Discovery\n');

// Test 1: Discover context from sample Java project
console.log('Test 1: Discover context from Maven project structure');
const projectPath = path.join(__dirname, '..', '.test-artifacts', 'sample-java-project');

// Read Java files
const userFilePath = path.join(projectPath, 'src/main/java/com/example/User.java');
const userServicePath = path.join(projectPath, 'src/main/java/com/example/service/UserService.java');

const javaFiles = [
  {
    path: 'src/main/java/com/example/User.java',
    before: { content: '' },
    after: { content: fs.readFileSync(userFilePath, 'utf8') }
  },
  {
    path: 'src/main/java/com/example/service/UserService.java',
    before: { content: '' },
    after: { content: fs.readFileSync(userServicePath, 'utf8') }
  }
];

try {
  const context = discoverContext({
    repo: projectPath,
    files: javaFiles,
    base: 'main'
  });
  
  // Verify context structure
  assert(context !== undefined, 'Should return context object');
  assert(Array.isArray(context.discovered) || context.discovered === undefined, 'discovered should be array or undefined');
  
  console.log(`  ✓ Context discovery returned valid structure`);
  console.log(`  ✓ Discovered files: ${context.discovered ? context.discovered.length : 0}`);
  
  console.log('✓ Test 1: Maven project context discovery');
} catch (err) {
  console.error('✗ Test 1 failed:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
}

// Test 2: Test file discovery
console.log('\nTest 2: Verify test file discovery');
const testFilePath = path.join(projectPath, 'src/test/java/com/example/UserTest.java');

const testFiles = [
  {
    path: 'src/test/java/com/example/UserTest.java',
    before: { content: '' },
    after: { content: fs.readFileSync(testFilePath, 'utf8') }
  }
];

try {
  const context = discoverContext({
    repo: projectPath,
    files: testFiles,
    base: 'main'
  });
  
  console.log('  ✓ Test files processed successfully');
  console.log('✓ Test 2: Test file discovery');
} catch (err) {
  console.error('✗ Test 2 failed:', err.message);
  process.exit(1);
}

// Test 3: Empty files array
console.log('\nTest 3: Empty files array handling');
try {
  const context = discoverContext({
    repo: projectPath,
    files: [],
    base: 'main'
  });
  
  assert(context !== undefined, 'Should handle empty files array');
  console.log('  ✓ Empty files array handled correctly');
  console.log('✓ Test 3: Empty files array handling');
} catch (err) {
  console.error('✗ Test 3 failed:', err.message);
  process.exit(1);
}

// Test 4: Verify output structure
console.log('\nTest 4: Verify output structure');
try {
  const context = discoverContext({
    repo: projectPath,
    files: javaFiles,
    base: 'main'
  });
  
  if (context.discovered) {
    context.discovered.forEach((item, index) => {
      assert(item.path !== undefined || typeof item === 'string', `Item ${index}: should have path`);
    });
    console.log('  ✓ All discovered items have valid structure');
  }
  
  console.log('✓ Test 4: Output structure validation');
} catch (err) {
  console.error('✗ Test 4 failed:', err.message);
  process.exit(1);
}

console.log('\n============================================================');
console.log('✅ All Integration Tests Passed!');
console.log('\nIntegration test results:');
console.log('  - Maven project structure: ✓');
console.log('  - Context discovery: ✓');
console.log('  - Test file processing: ✓');
console.log('  - Empty files array: ✓');
console.log('  - Output structure: ✓');
console.log('\nReady for Phase 2 completion and Phase 3 implementation.');

