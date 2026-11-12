#!/usr/bin/env node

/**
 * Phase 4.6: Impact Flow Generator Tests
 * 
 * Validates:
 *   - Mermaid diagram generation
 *   - Technical flow accuracy
 *   - Business flow accuracy
 */

const assert = require('assert');
const { generateTechnicalFlow, generateBusinessFlow } = require('../scripts/generate-impact-flow.cjs');

console.log('\n✓ Impact Flow Generator - Unit Tests Starting');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✔ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✖ ${name}: ${err.message}`);
    failed++;
  }
}

// Mock data
const mockChangedFiles = [
  'src/auth.ts',
  'src/api/users.ts',
  'src/models/user.ts'
];

const mockMetrics = {
  dependencies: {
    discoveredDirectDependents: 2,
    discoveredTransitiveDependents: 5
  },
  code: {
    totalFilesChanged: 6
  }
};

const mockImpact = {
  security: ['Critical security changes detected'],
  api: ['API endpoints modified'],
  data: ['Database schema updated'],
  functional: ['Business logic changed'],
  testing: ['Test coverage modified']
};

const mockClassification = {
  overallLevel: 'major',
  confidence: 85
};

// Tests: Technical Flow
test('TEST 1: Generate technical dependency flow', () => {
  const flow = generateTechnicalFlow(mockChangedFiles, mockMetrics);
  assert(typeof flow === 'string', 'Flow should be a string');
  assert(flow.length > 0, 'Flow should not be empty');
});

test('TEST 2: Technical flow contains Mermaid syntax', () => {
  const flow = generateTechnicalFlow(mockChangedFiles, mockMetrics);
  assert(flow.includes('graph TD'), 'Flow should contain Mermaid graph declaration');
  assert(flow.includes('classDef'), 'Flow should contain class definitions');
});

test('TEST 3: Technical flow contains changed file nodes', () => {
  const flow = generateTechnicalFlow(mockChangedFiles, mockMetrics);
  assert(flow.includes('auth.ts') || flow.includes('F0'), 'Flow should reference changed files');
});

test('TEST 4: Technical flow includes legend', () => {
  const flow = generateTechnicalFlow(mockChangedFiles, mockMetrics);
  assert(flow.includes('Legend'), 'Flow should include legend');
  assert(flow.includes('Directly Changed'), 'Legend should identify changed items');
});

test('TEST 5: Technical flow handles empty files', () => {
  const flow = generateTechnicalFlow([], mockMetrics);
  assert(typeof flow === 'string', 'Flow should be generated even with no files');
  assert(flow.includes('graph TD'), 'Flow should still be valid Mermaid');
});

test('TEST 6: Technical flow includes dependency nodes when detected', () => {
  const flow = generateTechnicalFlow(mockChangedFiles, { dependencies: { discoveredDirectDependents: 1 } });
  assert(flow.includes('Dependent') || flow.includes('DEP'), 'Flow should show dependents when detected');
});

// Tests: Business Flow
test('TEST 7: Generate business functionality flow', () => {
  const flow = generateBusinessFlow(mockImpact, mockClassification);
  assert(typeof flow === 'string', 'Flow should be a string');
  assert(flow.length > 0, 'Flow should not be empty');
});

test('TEST 8: Business flow contains Mermaid syntax', () => {
  const flow = generateBusinessFlow(mockImpact, mockClassification);
  assert(flow.includes('graph TD'), 'Flow should contain Mermaid graph declaration');
  assert(flow.includes('classDef'), 'Flow should contain class definitions');
});

test('TEST 9: Business flow includes security impact', () => {
  const flow = generateBusinessFlow(mockImpact, mockClassification);
  assert(flow.includes('Security') || flow.includes('SEC'), 'Flow should highlight security impacts');
});

test('TEST 10: Business flow includes API impact', () => {
  const flow = generateBusinessFlow(mockImpact, mockClassification);
  assert(flow.includes('API') || flow.includes('api'), 'Flow should highlight API impacts');
});

test('TEST 11: Business flow includes data impact', () => {
  const flow = generateBusinessFlow(mockImpact, mockClassification);
  assert(flow.includes('Data') || flow.includes('DATA'), 'Flow should highlight data impacts');
});

test('TEST 12: Business flow includes recommendation', () => {
  const flow = generateBusinessFlow(mockImpact, mockClassification);
  assert(flow.includes('MAJOR') || flow.includes('Review'), 'Flow should include recommendation');
});

test('TEST 13: Business flow handles empty impact', () => {
  const flow = generateBusinessFlow({}, mockClassification);
  assert(typeof flow === 'string', 'Flow should be generated even with no impact');
  assert(flow.includes('graph TD'), 'Flow should still be valid Mermaid');
});

test('TEST 14: Business flow legend includes all severity levels', () => {
  const flow = generateBusinessFlow(mockImpact, mockClassification);
  assert(flow.includes('Legend'), 'Flow should include legend');
  assert(flow.includes('Critical') || flow.includes('🔴'), 'Legend should identify critical level');
});

test('TEST 15: Business flow distinguishes impact severity', () => {
  const flow = generateBusinessFlow(mockImpact, mockClassification);
  // Should contain class assignments
  assert(flow.includes('critical') || flow.includes('major') || flow.includes('moderate'), 'Flow should assign severity classes');
});

// Summary
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Status: Tests Complete`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
console.log('');

if (failed === 0) {
  console.log('✓ All tests passing!');
  console.log('Status: Ready for Phase 4.7');
  process.exit(0);
} else {
  console.log(`✗ ${failed} test(s) failed`);
  process.exit(1);
}
