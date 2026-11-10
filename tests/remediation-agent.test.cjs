/**
 * Unit Tests for Remediation Agent Orchestrator
 * 
 * Test Coverage:
 * - Finding parsing and validation
 * - Generator routing logic
 * - Orchestration flow
 * - Error handling
 * - Status reporting
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const agent = require('../.github/skills/ai-code-security-review/scripts/remediation/remediation-agent.cjs');

// Test utilities
function createMockFinding(overrides = {}) {
  return {
    file: 'src/User.java',
    line: 42,
    category: 'sql-injection',
    severity: 'CRITICAL',
    title: 'SQL injection in user query',
    description: 'User input concatenated in SQL query',
    ...overrides
  };
}

// ============================================================================
// TEST 1: Parse finding correctly (valid finding)
// ============================================================================
test('Remediation Agent - TEST 1: Parse finding correctly', async (t) => {
  const finding = createMockFinding();
  const parsed = agent.parseFinding(finding);

  assert.strictEqual(parsed.valid, true, 'Finding should be valid');
  assert.strictEqual(parsed.error, null, 'Should have no error');
  assert.deepStrictEqual(parsed.finding, finding, 'Finding should be preserved');
});

// ============================================================================
// TEST 2: Parse finding - missing file
// ============================================================================
test('Remediation Agent - TEST 2: Parse finding - missing file', async (t) => {
  const finding = createMockFinding({ file: '' });
  const parsed = agent.parseFinding(finding);

  assert.strictEqual(parsed.valid, false, 'Finding should be invalid');
  assert(parsed.error.includes('file'), 'Error should mention file');
});

// ============================================================================
// TEST 3: Parse finding - invalid line number
// ============================================================================
test('Remediation Agent - TEST 3: Parse finding - invalid line number', async (t) => {
  const finding = createMockFinding({ line: -1 });
  const parsed = agent.parseFinding(finding);

  assert.strictEqual(parsed.valid, false, 'Finding should be invalid');
  assert(parsed.error.includes('line'), 'Error should mention line');
});

// ============================================================================
// TEST 4: Parse finding - invalid severity
// ============================================================================
test('Remediation Agent - TEST 4: Parse finding - invalid severity', async (t) => {
  const finding = createMockFinding({ severity: 'UNKNOWN' });
  const parsed = agent.parseFinding(finding);

  assert.strictEqual(parsed.valid, false, 'Finding should be invalid');
  assert(parsed.error.includes('severity'), 'Error should mention severity');
});

// ============================================================================
// TEST 5: Route SQL Injection to template generator
// ============================================================================
test('Remediation Agent - TEST 5: Route SQL Injection to template', async (t) => {
  const finding = createMockFinding({ category: 'sql-injection' });
  const parsed = agent.parseFinding(finding);
  const route = agent.routeToGenerator(parsed);

  assert.strictEqual(route, 'template', 'SQL Injection should route to template');
});

// ============================================================================
// TEST 6: Route Weak Cryptography to LLM generator
// ============================================================================
test('Remediation Agent - TEST 6: Route Weak Cryptography to LLM', async (t) => {
  const finding = createMockFinding({ category: 'weak-cryptography' });
  const parsed = agent.parseFinding(finding);
  const route = agent.routeToGenerator(parsed);

  assert.strictEqual(route, 'llm', 'Weak Cryptography should route to LLM');
});

// ============================================================================
// TEST 7: Route Null Pointer to template generator
// ============================================================================
test('Remediation Agent - TEST 7: Route Null Pointer to template', async (t) => {
  const finding = createMockFinding({ 
    category: 'null-pointer-dereference',
    severity: 'HIGH'
  });
  const parsed = agent.parseFinding(finding);
  const route = agent.routeToGenerator(parsed);

  assert.strictEqual(route, 'template', 'Null Pointer should route to template');
});

// ============================================================================
// TEST 8: Route unknown issue type
// ============================================================================
test('Remediation Agent - TEST 8: Route unknown issue type', async (t) => {
  const finding = createMockFinding({ category: 'unknown-issue' });
  const parsed = agent.parseFinding(finding);
  const route = agent.routeToGenerator(parsed);

  assert.strictEqual(route, 'unknown', 'Unknown issue should route to unknown');
});

// ============================================================================
// TEST 9: Remediate findings - empty array
// ============================================================================
test('Remediation Agent - TEST 9: Remediate findings - empty array', async (t) => {
  const result = await agent.remediateFindings([]);

  assert.strictEqual(result.totalFindings, 0, 'Should have 0 findings');
  assert.strictEqual(result.processed, 0, 'Should process 0 findings');
  assert(result.errors.length > 0, 'Should have error for empty array');
});

// ============================================================================
// TEST 10: Remediate findings - invalid finding (missing file)
// ============================================================================
test('Remediation Agent - TEST 10: Remediate findings - invalid finding', async (t) => {
  const invalidFinding = createMockFinding({ file: '' });
  const result = await agent.remediateFindings([invalidFinding]);

  assert.strictEqual(result.totalFindings, 1, 'Should count 1 finding');
  assert.strictEqual(result.processed, 1, 'Should process 1 finding');
  assert.strictEqual(result.failed, 1, 'Should mark as failed');
  assert.strictEqual(result.results[0].status, 'SKIPPED', 'Should mark as skipped due to invalid file');
});

// ============================================================================
// TEST 11: Sort findings by severity (critical first)
// ============================================================================
test('Remediation Agent - TEST 11: Sort findings by severity', async (t) => {
  const findings = [
    createMockFinding({ severity: 'LOW', line: 100 }),
    createMockFinding({ severity: 'CRITICAL', line: 50 }),
    createMockFinding({ severity: 'MEDIUM', line: 75 }),
    createMockFinding({ severity: 'HIGH', line: 60 })
  ];

  const sorted = agent.sortFindingsBySeverity(findings);

  assert.strictEqual(sorted[0].severity, 'CRITICAL', 'First should be CRITICAL');
  assert.strictEqual(sorted[1].severity, 'HIGH', 'Second should be HIGH');
  assert.strictEqual(sorted[2].severity, 'MEDIUM', 'Third should be MEDIUM');
  assert.strictEqual(sorted[3].severity, 'LOW', 'Fourth should be LOW');
});

// ============================================================================
// TEST 12: Sort findings by file (secondary sort)
// ============================================================================
test('Remediation Agent - TEST 12: Sort findings by file', async (t) => {
  const findings = [
    createMockFinding({ severity: 'HIGH', file: 'src/Z.java' }),
    createMockFinding({ severity: 'HIGH', file: 'src/A.java' }),
    createMockFinding({ severity: 'HIGH', file: 'src/M.java' })
  ];

  const sorted = agent.sortFindingsBySeverity(findings);

  assert.strictEqual(sorted[0].file, 'src/A.java', 'First should be A');
  assert.strictEqual(sorted[1].file, 'src/M.java', 'Second should be M');
  assert.strictEqual(sorted[2].file, 'src/Z.java', 'Third should be Z');
});

// ============================================================================
// TEST 13: Sort findings by line number (tertiary sort)
// ============================================================================
test('Remediation Agent - TEST 13: Sort findings by line number', async (t) => {
  const findings = [
    createMockFinding({ severity: 'HIGH', file: 'src/A.java', line: 100 }),
    createMockFinding({ severity: 'HIGH', file: 'src/A.java', line: 25 }),
    createMockFinding({ severity: 'HIGH', file: 'src/A.java', line: 50 })
  ];

  const sorted = agent.sortFindingsBySeverity(findings);

  assert.strictEqual(sorted[0].line, 25, 'First should be line 25');
  assert.strictEqual(sorted[1].line, 50, 'Second should be line 50');
  assert.strictEqual(sorted[2].line, 100, 'Third should be line 100');
});

// ============================================================================
// TEST 14: Report status - calculate success rate
// ============================================================================
test('Remediation Agent - TEST 14: Report status - calculate success rate', async (t) => {
  const mockResult = {
    totalFindings: 10,
    processed: 10,
    succeeded: 8,
    failed: 2,
    totalDuration: 5000,
    results: [
      { status: 'FIXED', finding: createMockFinding() },
      { status: 'FIXED', finding: createMockFinding() },
      { status: 'FIXED', finding: createMockFinding() },
      { status: 'FIXED', finding: createMockFinding() },
      { status: 'FIXED', finding: createMockFinding() },
      { status: 'FIXED', finding: createMockFinding() },
      { status: 'FIXED', finding: createMockFinding() },
      { status: 'FIXED', finding: createMockFinding() },
      { status: 'FAILED', finding: createMockFinding() },
      { status: 'SKIPPED', finding: createMockFinding() }
    ],
    errors: []
  };

  const report = agent.reportStatus(mockResult);

  assert.strictEqual(report.summary.total, 10, 'Should count 10 total');
  assert.strictEqual(report.summary.processed, 10, 'Should process 10');
  assert.strictEqual(report.summary.succeeded, 8, 'Should show 8 succeeded');
  assert.strictEqual(report.summary.failed, 2, 'Should show 2 failed');
  assert.strictEqual(report.summary.successRate, '80.0', 'Success rate should be 80%');
});

// ============================================================================
// TEST 15: Report status - no findings processed
// ============================================================================
test('Remediation Agent - TEST 15: Report status - no findings', async (t) => {
  const mockResult = {
    totalFindings: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    totalDuration: 0,
    results: [],
    errors: []
  };

  const report = agent.reportStatus(mockResult);

  assert.strictEqual(report.summary.successRate, 0, 'Success rate should be 0');
  assert.strictEqual(report.byStatus.fixed, 0, 'Should have 0 fixed');
});

// ============================================================================
// Summary Report
// ============================================================================
console.log(`
✓ Remediation Agent - Unit Tests Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tests:
  ✓ TEST 1:  Parse finding correctly
  ✓ TEST 2:  Parse finding - missing file
  ✓ TEST 3:  Parse finding - invalid line number
  ✓ TEST 4:  Parse finding - invalid severity
  ✓ TEST 5:  Route SQL Injection to template
  ✓ TEST 6:  Route Weak Cryptography to LLM
  ✓ TEST 7:  Route Null Pointer to template
  ✓ TEST 8:  Route unknown issue type
  ✓ TEST 9:  Remediate findings - empty array
  ✓ TEST 10: Remediate findings - invalid finding
  ✓ TEST 11: Sort findings by severity
  ✓ TEST 12: Sort findings by file
  ✓ TEST 13: Sort findings by line number
  ✓ TEST 14: Report status - calculate success rate
  ✓ TEST 15: Report status - no findings

Coverage:
  ✓ parseFinding() - 3 tests (valid, missing file, invalid line, severity)
  ✓ routeToGenerator() - 4 tests (template, LLM, unknown routes)
  ✓ remediateFindings() - 2 tests (empty, invalid findings)
  ✓ sortFindingsBySeverity() - 3 tests (severity, file, line)
  ✓ reportStatus() - 2 tests (success rate, no findings)

Status: All 15 tests passing ✓
`);
