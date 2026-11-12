#!/usr/bin/env node

/**
 * Phase 4.7: Report Formatter Tests
 * 
 * Validates:
 *   - Markdown report generation
 *   - JSON report generation and schema compliance
 *   - Report quality and completeness
 */

const assert = require('assert');
const { generateMarkdownReport, generateJsonReport, severityBadge } = require('../scripts/format-report.cjs');

console.log('\n✓ Report Formatter - Unit Tests Starting');
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
const mockAllData = {
  context: {
    repoPath: '/test/repo',
    baseBranch: 'main',
    headRef: 'feature/new-auth',
    diff: {
      files: [
        { path: 'src/auth.ts', status: 'modified' },
        { path: 'src/api.ts', status: 'added' }
      ]
    }
  },
  classification: {
    overallLevel: 'major',
    confidence: 85,
    summary: { critical: 1, major: 2, moderate: 1, minor: 1 }
  },
  impact: {
    security: ['Auth system modified'],
    api: ['New endpoints added'],
    data: ['User schema updated'],
    testing: ['Test coverage increased']
  },
  metrics: {
    code: {
      filesAdded: 2,
      filesModified: 3,
      filesDeleted: 1,
      filesRenamed: 0,
      linesAdded: 150,
      linesDeleted: 45,
      totalFilesChanged: 6,
      measurementStatus: 'measured'
    },
    dependencies: {
      directlyChangedModules: ['auth', 'api'],
      discoveredDirectDependents: 0,
      measurementStatus: 'partially_measured',
      limitations: 'External consumers not analyzed'
    },
    api: {
      endpointsAdded: 3,
      endpointsModified: 2,
      endpointsRemoved: 0,
      potentialBreakingChanges: 1,
      measurementStatus: 'partially_measured'
    }
  },
  risks: ['Security review recommended', 'Backward compatibility check needed'],
  recommendations: ['Add integration tests', 'Review auth changes', 'Update API docs'],
  diagrams: {
    technicalDependencyFlow: {
      format: 'mermaid',
      description: 'Technical flow',
      content: 'graph TD\n  A --> B'
    },
    businessFunctionalityFlow: {
      format: 'mermaid',
      description: 'Business flow',
      content: 'graph TD\n  C --> D'
    }
  }
};

// Tests: Markdown Report
test('TEST 1: Generate Markdown report', () => {
  const report = generateMarkdownReport(mockAllData);
  assert(typeof report === 'string', 'Report should be a string');
  assert(report.length > 0, 'Report should not be empty');
});

test('TEST 2: Markdown report contains title', () => {
  const report = generateMarkdownReport(mockAllData);
  assert(report.includes('# Change Impact Analysis Report'), 'Report should have title');
});

test('TEST 3: Markdown report contains executive summary', () => {
  const report = generateMarkdownReport(mockAllData);
  assert(report.includes('Executive Summary'), 'Report should have executive summary');
  assert(report.includes('MAJOR'), 'Summary should include impact level');
});

test('TEST 4: Markdown report contains change summary', () => {
  const report = generateMarkdownReport(mockAllData);
  assert(report.includes('Change Summary'), 'Report should have change summary');
  assert(report.includes('Added: 2') || report.includes('Added:') , 'Summary should include file counts');
});

test('TEST 5: Markdown report contains classification results', () => {
  const report = generateMarkdownReport(mockAllData);
  assert(report.includes('Classification'), 'Report should include classification');
  assert(report.includes('Critical') || report.includes('critical'), 'Should show critical count');
});

test('TEST 6: Markdown report contains impact analysis', () => {
  const report = generateMarkdownReport(mockAllData);
  assert(report.includes('Impact Analysis'), 'Report should have impact analysis section');
  assert(report.includes('Security') || report.includes('🔐'), 'Should include security impact');
});

test('TEST 7: Markdown report contains risk assessment', () => {
  const report = generateMarkdownReport(mockAllData);
  assert(report.includes('Risk Assessment'), 'Report should have risk assessment');
});

test('TEST 8: Markdown report contains metrics', () => {
  const report = generateMarkdownReport(mockAllData);
  assert(report.includes('Metrics'), 'Report should have metrics section');
  assert(report.includes('Code Metrics') || report.includes('Files Changed'), 'Should have code metrics');
});

test('TEST 9: Markdown report contains diagrams', () => {
  const report = generateMarkdownReport(mockAllData);
  assert(report.includes('Impact Flows'), 'Report should have flows section');
  assert(report.includes('mermaid'), 'Report should include Mermaid diagrams');
});

test('TEST 10: Markdown report contains recommendations', () => {
  const report = generateMarkdownReport(mockAllData);
  assert(report.includes('Recommendations'), 'Report should have recommendations');
  assert(report.includes('Add integration tests'), 'Should include specific recommendations');
});

// Tests: JSON Report
test('TEST 11: Generate JSON report', () => {
  const report = generateJsonReport(mockAllData);
  assert(typeof report === 'object', 'Report should be an object');
  assert(report !== null, 'Report should not be null');
});

test('TEST 12: JSON report has schema version', () => {
  const report = generateJsonReport(mockAllData);
  assert(report.schemaVersion !== undefined, 'Report should have schemaVersion');
  assert(report.schemaVersion === '1.0', 'Schema version should be 1.0');
});

test('TEST 13: JSON report has metadata', () => {
  const report = generateJsonReport(mockAllData);
  assert(report.metadata !== undefined, 'Report should have metadata');
  assert(report.metadata.generatedAt !== undefined, 'Metadata should have timestamp');
});

test('TEST 14: JSON report has summary section', () => {
  const report = generateJsonReport(mockAllData);
  assert(report.summary !== undefined, 'Report should have summary');
  assert.strictEqual(report.summary.overallLevel, 'major', 'Summary should include impact level');
  assert.strictEqual(report.summary.confidence, 85, 'Summary should include confidence');
});

test('TEST 15: JSON report has all required sections', () => {
  const report = generateJsonReport(mockAllData);
  const requiredSections = ['classification', 'impact', 'metrics', 'risks', 'recommendations'];
  requiredSections.forEach(section => {
    assert(report[section] !== undefined, `Report should have ${section} section`);
  });
});

test('TEST 16: JSON report has validation metadata', () => {
  const report = generateJsonReport(mockAllData);
  assert(report.validation !== undefined, 'Report should have validation section');
  assert(report.validation.schemaCompliant !== undefined, 'Should indicate schema compliance');
  assert(report.validation.completeness !== undefined, 'Should have completeness data');
});

test('TEST 17: JSON report includes diagrams', () => {
  const report = generateJsonReport(mockAllData);
  assert(report.diagrams !== undefined, 'Report should include diagrams');
  assert(report.diagrams.technical !== undefined, 'Should have technical diagram');
  assert(report.diagrams.business !== undefined, 'Should have business diagram');
});

test('TEST 18: Severity badge function returns correct badges', () => {
  assert(severityBadge('critical').includes('CRITICAL'), 'Should return critical badge');
  assert(severityBadge('major').includes('MAJOR'), 'Should return major badge');
  assert(severityBadge('moderate').includes('MODERATE'), 'Should return moderate badge');
  assert(severityBadge('minor').includes('MINOR'), 'Should return minor badge');
});

test('TEST 19: Report handles missing optional data', () => {
  const minimalData = {
    classification: { overallLevel: 'minor', confidence: 50, summary: {} },
    impact: {},
    metrics: {}
  };
  const report = generateJsonReport(minimalData);
  assert(report.summary !== undefined, 'Should handle minimal data');
});

test('TEST 20: Report structure is JSON serializable', () => {
  const report = generateJsonReport(mockAllData);
  try {
    const json = JSON.stringify(report);
    assert(json.length > 0, 'Report should be JSON serializable');
    const parsed = JSON.parse(json);
    assert(parsed.schemaVersion === '1.0', 'Roundtrip JSON should preserve data');
  } catch (err) {
    throw new Error(`JSON serialization failed: ${err.message}`);
  }
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
  console.log('Status: Ready for Phase 4.8');
  process.exit(0);
} else {
  console.log(`✗ ${failed} test(s) failed`);
  process.exit(1);
}
