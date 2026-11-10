/**
 * Findings Report Formatter Tests
 * Tests JSON, Markdown, and CSV export functionality
 * Tests remediation recommendation generation
 */

const assert = require('assert');
const {
  buildFindingReport,
  generateFindingId,
  getRemediationTitle,
  getRemediationDescription,
  calculateFixPriority,
  estimateEffort,
  exportToJson,
  exportToMarkdown,
  exportToCsv,
  formatGitHubAnnotations,
} = require('../.github/skills/ai-code-security-review/scripts/formatters/findings-report-formatter.cjs');

// Sample findings for testing
const sampleFindings = [
  {
    severity: 'CRITICAL',
    category: 'SECURITY',
    title: 'SQL Injection',
    description: 'User input concatenated into SQL string',
    file: 'src/AuthService.java',
    line: 42,
    column: 15,
    originalCode: 'String query = "SELECT * FROM users WHERE id = " + userId;',
    correctedCode: 'String query = "SELECT * FROM users WHERE id = ?"; // Use prepared statement',
    detectedBy: 'security-analyzer',
    confidence: 'high',
  },
  {
    severity: 'HIGH',
    category: 'CORRECTNESS',
    title: 'Null Pointer Risk',
    description: 'Dereferencing potentially null object',
    file: 'src/UserManager.java',
    line: 85,
    column: 20,
    originalCode: 'String name = user.getName();',
    correctedCode: 'String name = user != null ? user.getName() : "unknown";',
    detectedBy: 'correctness-analyzer',
    confidence: 'medium',
  },
  {
    severity: 'MEDIUM',
    category: 'ARCHITECTURE',
    title: 'Unused Import',
    description: 'Import statement not used in file',
    file: 'src/Utils.java',
    line: 5,
    originalCode: 'import java.util.unused.Class;',
    correctedCode: '',
    detectedBy: 'architecture-analyzer',
    confidence: 'high',
  },
];

// Test 1: buildFindingReport creates standardized report
console.log('Test 1: buildFindingReport creates standardized report');
{
  const report = buildFindingReport(sampleFindings);
  
  assert.strictEqual(report.summary.totalFindings, 3, 'Should have 3 findings');
  assert.strictEqual(report.summary.bySeverity.CRITICAL, 1, 'Should have 1 critical');
  assert.strictEqual(report.summary.bySeverity.HIGH, 1, 'Should have 1 high');
  assert.strictEqual(report.summary.bySeverity.MEDIUM, 1, 'Should have 1 medium');
  assert(report.timestamp, 'Should have timestamp');
  assert.strictEqual(report.findings.length, 3, 'Should have 3 findings');
  console.log('✓ Test 1 passed');
}

// Test 2: generateFindingId creates unique IDs
console.log('Test 2: generateFindingId creates unique IDs');
{
  const id1 = generateFindingId(sampleFindings[0]);
  const id2 = generateFindingId(sampleFindings[1]);
  
  assert(id1.startsWith('FIND-'), 'ID should start with FIND-');
  assert.notStrictEqual(id1, id2, 'Different findings should have different IDs');
  assert.strictEqual(id1.length, 13, 'ID should be 13 characters (FIND-12345678)');
  console.log('✓ Test 2 passed');
}

// Test 3: Remediation title generation
console.log('Test 3: Remediation title generation');
{
  const title1 = getRemediationTitle(sampleFindings[0]);
  const title2 = getRemediationTitle(sampleFindings[1]);
  
  assert.strictEqual(title1, 'Security Fix Required', 'Should match category');
  assert.strictEqual(title2, 'Code Correctness Issue', 'Should match category');
  console.log('✓ Test 3 passed');
}

// Test 4: Remediation description generation
console.log('Test 4: Remediation description generation');
{
  const desc1 = getRemediationDescription(sampleFindings[0]);
  const desc2 = getRemediationDescription(sampleFindings[1]);
  
  assert(desc1.includes('parameterized'), 'Should mention parameterized queries');
  assert(desc1.includes('prepared statements'), 'Should mention prepared statements');
  assert(desc2.includes('null'), 'Should mention null checks');
  console.log('✓ Test 4 passed');
}

// Test 5: Fix priority calculation
console.log('Test 5: Fix priority calculation');
{
  const priority1 = calculateFixPriority(sampleFindings[0]);
  const priority2 = calculateFixPriority(sampleFindings[1]);
  const priority3 = calculateFixPriority(sampleFindings[2]);
  
  assert.strictEqual(priority1, 'CRITICAL', 'CRITICAL severity → CRITICAL priority');
  assert.strictEqual(priority2, 'HIGH', 'HIGH severity → HIGH priority');
  assert.strictEqual(priority3, 'MEDIUM', 'MEDIUM severity → MEDIUM priority');
  console.log('✓ Test 5 passed');
}

// Test 6: Effort estimation
console.log('Test 6: Effort estimation');
{
  const effort1 = estimateEffort(sampleFindings[0]); // Security: SQL Injection
  const effort2 = estimateEffort(sampleFindings[1]); // Correctness: Null pointer
  const effort3 = estimateEffort(sampleFindings[2]); // Architecture: Unused import
  
  assert.strictEqual(effort1, 'SMALL', 'Security issues usually SMALL');
  assert.strictEqual(effort2, 'MINIMAL', 'Null pointer checks are MINIMAL');
  assert.strictEqual(effort3, 'LARGE', 'Architecture issues are LARGE');
  console.log('✓ Test 6 passed');
}

// Test 7: Export to JSON format
console.log('Test 7: Export to JSON format');
{
  const report = buildFindingReport(sampleFindings);
  const json = exportToJson(report);
  const parsed = JSON.parse(json);
  
  assert.strictEqual(parsed.summary.totalFindings, 3, 'JSON should preserve summary');
  assert.strictEqual(parsed.findings.length, 3, 'JSON should have all findings');
  assert(parsed.findings[0].id, 'JSON should include finding ID');
  assert(parsed.findings[0].recommendation, 'JSON should include recommendation');
  console.log('✓ Test 7 passed');
}

// Test 8: Export to Markdown format
console.log('Test 8: Export to Markdown format');
{
  const report = buildFindingReport(sampleFindings);
  const markdown = exportToMarkdown(report);
  
  assert(markdown.includes('# Code Review Findings Report'), 'Should have title');
  assert(markdown.includes('## Summary'), 'Should have summary');
  assert(markdown.includes('## Findings'), 'Should have findings section');
  assert(markdown.includes('SQL Injection'), 'Should include finding title');
  assert(markdown.includes('🔴'), 'Should have severity emoji for CRITICAL');
  assert(markdown.includes('🟠'), 'Should have severity emoji for HIGH');
  assert(markdown.includes('🟡'), 'Should have severity emoji for MEDIUM');
  console.log('✓ Test 8 passed');
}

// Test 9: Export to CSV format
console.log('Test 9: Export to CSV format');
{
  const report = buildFindingReport(sampleFindings);
  const csv = exportToCsv(report);
  const lines = csv.trim().split('\n');
  
  assert.strictEqual(lines[0].split(',').length, 10, 'CSV should have 10 columns');
  assert(csv.includes('SQL Injection'), 'CSV should include findings');
  assert(csv.includes('CRITICAL'), 'CSV should include severities');
  assert(csv.includes('SECURITY'), 'CSV should include categories');
  console.log('✓ Test 9 passed');
}

// Test 10: GitHub annotations formatting
console.log('Test 10: GitHub annotations formatting');
{
  const report = buildFindingReport(sampleFindings);
  const annotations = formatGitHubAnnotations(report);
  
  assert.strictEqual(annotations.length, 3, 'Should have 3 annotations');
  
  // Check severity to level mapping for each annotation
  const levelBySeverity = {};
  for (const annotation of annotations) {
    const finding = report.findings.find(f => f.file === annotation.file && f.line === annotation.line);
    if (finding) {
      levelBySeverity[finding.severity] = annotation.level;
    }
  }
  
  assert.strictEqual(levelBySeverity.CRITICAL, 'error', 'CRITICAL should map to error');
  assert.strictEqual(levelBySeverity.HIGH, 'error', 'HIGH should map to error');
  assert.strictEqual(levelBySeverity.MEDIUM, 'warning', 'MEDIUM should map to warning');
  console.log('✓ Test 10 passed');
}

// Test 11: Findings sorted by severity
console.log('Test 11: Findings sorted by severity');
{
  const unsorted = [
    { ...sampleFindings[2], severity: 'MEDIUM' },
    { ...sampleFindings[0], severity: 'CRITICAL' },
    { ...sampleFindings[1], severity: 'HIGH' },
  ];
  
  const report = buildFindingReport(unsorted);
  console.log('  Sorted findings severities:', report.findings.map(f => `${f.severity}(${f.file}:${f.line})`).join(', '));
  assert.strictEqual(report.findings[0].severity, 'CRITICAL', 'CRITICAL should be first');
  assert.strictEqual(report.findings[1].severity, 'HIGH', 'HIGH should be second');
  assert.strictEqual(report.findings[2].severity, 'MEDIUM', 'MEDIUM should be third');
  console.log('✓ Test 11 passed');
}

// Test 12: Empty findings list
console.log('Test 12: Empty findings list');
{
  const report = buildFindingReport([]);
  
  assert.strictEqual(report.summary.totalFindings, 0, 'Empty findings should have 0 total');
  assert.strictEqual(report.findings.length, 0, 'Should have no findings');
  assert.strictEqual(report.summary.bySeverity.CRITICAL, 0, 'No critical findings');
  console.log('✓ Test 12 passed');
}

// Test 13: Category breakdown in summary
console.log('Test 13: Category breakdown in summary');
{
  const report = buildFindingReport(sampleFindings);
  
  assert.strictEqual(report.summary.byCategory.SECURITY, 1, 'Should count SECURITY');
  assert.strictEqual(report.summary.byCategory.CORRECTNESS, 1, 'Should count CORRECTNESS');
  assert.strictEqual(report.summary.byCategory.ARCHITECTURE, 1, 'Should count ARCHITECTURE');
  console.log('✓ Test 13 passed');
}

// Test 14: Report options: no snippets
console.log('Test 14: Report options: no snippets');
{
  const report = buildFindingReport(sampleFindings, { includeSnippets: false });
  const finding = report.findings[0];
  
  assert(!finding.snippet || Object.keys(finding.snippet).every(k => !finding.snippet[k]), 'Should not include snippets');
  console.log('✓ Test 14 passed');
}

// Test 15: Report options: no recommendations
console.log('Test 15: Report options: no recommendations');
{
  const report = buildFindingReport(sampleFindings, { includeRecommendations: false });
  const finding = report.findings[0];
  
  assert(!finding.recommendation, 'Should not include recommendations');
  console.log('✓ Test 15 passed');
}

console.log('\n✅ All 15 report formatter tests passed!');
