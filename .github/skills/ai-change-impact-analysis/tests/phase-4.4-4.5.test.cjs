#!/usr/bin/env node

/**
 * Phase 4.4-4.5: Analysis & Metrics Tests
 * 
 * Validates:
 *   - Impact analysis across all categories
 *   - Metrics calculation with measurement status
 *   - Risk indicator detection
 */

const assert = require('assert');
const { analyzeImpact, calculateMetrics } = require('../scripts/analyze-impact.cjs');

console.log('\n✓ Analysis & Metrics - Unit Tests Starting');
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
const mockClassification = {
  overallLevel: 'major',
  confidence: 85,
  summary: { critical: 1, major: 3, moderate: 2, minor: 1 },
  fileClassifications: {
    'src/auth.ts': { level: 'critical', patterns: ['auth'] },
    'src/api/users.ts': { level: 'major', patterns: ['api'] },
    'src/models/user.ts': { level: 'moderate', patterns: ['model'] },
    'tests/auth.test.ts': { level: 'minor', patterns: ['test'] }
  }
};

const mockSnapshots = {
  'src/auth.ts': {
    symbols: {
      before: { exports: ['authenticate', 'authorize'] },
      after: { exports: ['authenticate', 'authorize', 'tokenize'] }
    }
  },
  'src/api/users.ts': {
    symbols: {
      before: { exports: ['getUserById', 'listUsers'] },
      after: { exports: ['getUserById', 'listUsers', 'updateUser'] }
    }
  }
};

const mockContextPackage = {
  diff: {
    statistics: {
      filesAdded: 2,
      filesModified: 3,
      filesDeleted: 1,
      totalFiles: 6,
      totalLinesAdded: 150,
      totalLinesDeleted: 45
    },
    files: [
      { path: 'src/auth.ts', status: 'modified' },
      { path: 'src/api/users.ts', status: 'modified' },
      { path: 'src/models/user.ts', status: 'added' },
      { path: 'src/security/tokens.ts', status: 'added' },
      { path: 'tests/auth.test.ts', status: 'added' },
      { path: 'old-auth.ts', status: 'deleted' }
    ]
  }
};

// Tests: Impact Analysis
test('TEST 1: Analyze functional impact', () => {
  const impact = analyzeImpact(mockClassification, mockSnapshots);
  assert(impact.functional !== undefined, 'Impact should have functional category');
  assert(Array.isArray(impact.functional), 'Functional impact should be an array');
});

test('TEST 2: Analyze security impact', () => {
  const impact = analyzeImpact(mockClassification, mockSnapshots);
  assert(impact.security !== undefined, 'Impact should have security category');
  assert(impact.security.length > 0, 'Security-sensitive files should be detected');
});

test('TEST 3: Analyze API impact', () => {
  const impact = analyzeImpact(mockClassification, mockSnapshots);
  assert(impact.api !== undefined, 'Impact should have api category');
  assert(Array.isArray(impact.api), 'API impact should be an array');
});

test('TEST 4: Analyze data model impact', () => {
  const impact = analyzeImpact(mockClassification, mockSnapshots);
  assert(impact.data !== undefined, 'Impact should have data category');
  assert(Array.isArray(impact.data), 'Data impact should be an array');
});

test('TEST 5: Analyze testing impact', () => {
  const impact = analyzeImpact(mockClassification, mockSnapshots);
  assert(impact.testing !== undefined, 'Impact should have testing category');
  assert(Array.isArray(impact.testing), 'Testing impact should be an array');
});

// Tests: Metrics Calculation
test('TEST 6: Calculate code metrics', () => {
  const metrics = calculateMetrics(mockContextPackage, mockSnapshots, mockClassification);
  assert(metrics.code !== undefined, 'Should have code metrics');
  assert.strictEqual(metrics.code.filesAdded, 2, 'Files added should match');
  assert.strictEqual(metrics.code.filesModified, 3, 'Files modified should match');
  assert.strictEqual(metrics.code.linesAdded, 150, 'Lines added should match');
  assert.strictEqual(metrics.code.measurementStatus, 'measured', 'Code metrics should be measured');
});

test('TEST 7: Calculate dependency metrics', () => {
  const metrics = calculateMetrics(mockContextPackage, mockSnapshots, mockClassification);
  assert(metrics.dependencies !== undefined, 'Should have dependency metrics');
  assert(Array.isArray(metrics.dependencies.directlyChangedModules), 'Changed modules should be array');
  assert.strictEqual(metrics.dependencies.measurementStatus, 'partially_measured', 'Dependency metrics partially measured');
});

test('TEST 8: Calculate API metrics', () => {
  const metrics = calculateMetrics(mockContextPackage, mockSnapshots, mockClassification);
  assert(metrics.api !== undefined, 'Should have API metrics');
  assert(metrics.api.endpointsAdded >= 0, 'Endpoints added should be non-negative');
  assert.strictEqual(metrics.api.measurementStatus, 'partially_measured', 'API metrics partially measured');
});

test('TEST 9: Calculate data metrics', () => {
  const metrics = calculateMetrics(mockContextPackage, mockSnapshots, mockClassification);
  assert(metrics.data !== undefined, 'Should have data metrics');
  assert(metrics.data.tablesAdded >= 0, 'Tables added should be non-negative');
  assert.strictEqual(metrics.data.measurementStatus, 'measured', 'Data metrics should be measured');
});

test('TEST 10: Detect risk indicators - security files', () => {
  const metrics = calculateMetrics(mockContextPackage, mockSnapshots, mockClassification);
  assert(metrics.riskIndicators !== undefined, 'Should have risk indicators');
  assert(Array.isArray(metrics.riskIndicators.securitySensitiveFilesTouched), 'Security files should be tracked');
  assert(metrics.riskIndicators.securitySensitiveFilesTouched.length > 0, 'Security files should be detected');
});

test('TEST 11: Detect risk indicators - config changes', () => {
  const metrics = calculateMetrics(mockContextPackage, mockSnapshots, mockClassification);
  assert(Array.isArray(metrics.riskIndicators.configurationChanges), 'Config changes should be tracked');
});

test('TEST 12: Detect risk indicators - public interface changes', () => {
  const metrics = calculateMetrics(mockContextPackage, mockSnapshots, mockClassification);
  assert(Array.isArray(metrics.riskIndicators.publicInterfaceChanges), 'Public changes should be tracked');
  assert(metrics.riskIndicators.publicInterfaceChanges.length > 0, 'Public API changes should be detected');
});

test('TEST 13: Detect backward compatibility risks', () => {
  const metrics = calculateMetrics(mockContextPackage, mockSnapshots, mockClassification);
  assert(Array.isArray(metrics.riskIndicators.backwardCompatibilityRisks), 'Compatibility risks should be tracked');
  assert(metrics.riskIndicators.backwardCompatibilityRisks.length > 0, 'Compatibility risks should be detected for critical changes');
});

test('TEST 14: Measurement status for all metrics', () => {
  const metrics = calculateMetrics(mockContextPackage, mockSnapshots, mockClassification);
  const validStatuses = ['measured', 'partially_measured', 'not_measured'];
  
  assert(validStatuses.includes(metrics.code.measurementStatus), 'Code metrics should have valid status');
  assert(validStatuses.includes(metrics.dependencies.measurementStatus), 'Dependency metrics should have valid status');
  assert(validStatuses.includes(metrics.api.measurementStatus), 'API metrics should have valid status');
  assert(validStatuses.includes(metrics.data.measurementStatus), 'Data metrics should have valid status');
});

test('TEST 15: Empty changes should produce zero metrics', () => {
  const emptyContext = {
    diff: {
      statistics: {
        filesAdded: 0,
        filesModified: 0,
        filesDeleted: 0,
        totalFiles: 0,
        totalLinesAdded: 0,
        totalLinesDeleted: 0
      },
      files: []
    }
  };
  
  const metrics = calculateMetrics(emptyContext, {}, { summary: { critical: 0, major: 0 } });
  assert.strictEqual(metrics.code.filesAdded, 0, 'Empty changes should have zero files added');
  assert.strictEqual(metrics.code.linesAdded, 0, 'Empty changes should have zero lines added');
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
  console.log('Status: Ready for Phase 4.6');
  process.exit(0);
} else {
  console.log(`✗ ${failed} test(s) failed`);
  process.exit(1);
}
