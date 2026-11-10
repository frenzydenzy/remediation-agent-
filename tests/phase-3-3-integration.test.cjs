/**
 * Phase 3.3 Integration Tests
 * Tests integration of report formatter with enhanced analysis pipeline
 */

const assert = require('assert');
const { runEnhancedAnalysis } = require('../.github/skills/ai-code-security-review/scripts/analyzers/enhanced-analysis.cjs');
const {
  buildFindingReport,
  exportToJson,
  exportToMarkdown,
  exportToCsv,
} = require('../.github/skills/ai-code-security-review/scripts/formatters/findings-report-formatter.cjs');
const {
  generateWorkflowAnnotations,
  formatAsCheckRun,
  generatePullRequestComments,
} = require('../.github/skills/ai-code-security-review/scripts/formatters/github-integration.cjs');

// Mock snapshot with vulnerable Java code
const mockSnapshot = {
  files: [
    {
      path: 'src/AuthService.java',
      content: `
public class AuthService {
  public boolean authenticate(String user, String password) {
    String query = "SELECT * FROM users WHERE id = '" + user + "'";
    // SQL Injection vulnerability
    ResultSet rs = connection.executeQuery(query);
  }
  
  public void processData(String[] data) {
    // Null pointer risk
    String name = data[0].trim();
  }
}
      `,
    },
  ],
};

// Test 1: End-to-end pipeline from analysis to report
console.log('Test 1: End-to-end pipeline from analysis to report');
{
  const analysis = runEnhancedAnalysis(mockSnapshot);
  const report = buildFindingReport(analysis.findings);
  
  assert(report.summary.totalFindings > 0, 'Should have findings');
  assert(report.findings.length > 0, 'Should have structured findings');
  assert(report.findings[0].id, 'Each finding should have unique ID');
  assert(report.findings[0].recommendation, 'Each finding should have recommendation');
  console.log(`  ✓ Found ${report.summary.totalFindings} findings`);
  console.log('✓ Test 1 passed');
}

// Test 2: JSON export from report
console.log('Test 2: JSON export from report');
{
  const analysis = runEnhancedAnalysis(mockSnapshot);
  const report = buildFindingReport(analysis.findings);
  const json = exportToJson(report);
  const parsed = JSON.parse(json);
  
  assert.strictEqual(parsed.summary.totalFindings, report.summary.totalFindings, 'JSON should preserve total');
  assert.strictEqual(parsed.findings.length, report.findings.length, 'JSON should preserve findings');
  console.log('✓ Test 2 passed');
}

// Test 3: Markdown export from report
console.log('Test 3: Markdown export from report');
{
  const analysis = runEnhancedAnalysis(mockSnapshot);
  const report = buildFindingReport(analysis.findings);
  const markdown = exportToMarkdown(report);
  
  assert(markdown.includes('# Code Review Findings Report'), 'Should have title');
  assert(markdown.includes('## Summary'), 'Should have summary');
  assert(markdown.includes('## Findings'), 'Should have findings section');
  assert(markdown.length > 100, 'Should have substantial content');
  console.log('✓ Test 3 passed');
}

// Test 4: CSV export from report
console.log('Test 4: CSV export from report');
{
  const analysis = runEnhancedAnalysis(mockSnapshot);
  const report = buildFindingReport(analysis.findings);
  const csv = exportToCsv(report);
  const lines = csv.trim().split('\n');
  
  assert(lines.length > 1, 'CSV should have header and data rows');
  assert(lines[0].includes('Finding ID'), 'CSV should have proper headers');
  console.log('✓ Test 4 passed');
}

// Test 5: GitHub annotations from analysis findings
console.log('Test 5: GitHub annotations from analysis findings');
{
  const analysis = runEnhancedAnalysis(mockSnapshot);
  const report = buildFindingReport(analysis.findings);
  const annotations = generateWorkflowAnnotations(report.findings);
  
  assert(annotations.length > 0, 'Should have annotations');
  assert(annotations.every(a => a.file), 'All annotations should have file');
  assert(annotations.every(a => a.line), 'All annotations should have line');
  console.log('✓ Test 5 passed');
}

// Test 6: GitHub check run from report
console.log('Test 6: GitHub check run from report');
{
  const analysis = runEnhancedAnalysis(mockSnapshot);
  const report = buildFindingReport(analysis.findings);
  const checkRun = formatAsCheckRun(report);
  
  assert.strictEqual(checkRun.status, 'completed', 'Check run should be completed');
  assert(['success', 'failure', 'neutral'].includes(checkRun.conclusion), 'Should have valid conclusion');
  assert(checkRun.output.summary, 'Should have summary');
  console.log('✓ Test 6 passed');
}

// Test 7: Pull request comments from report
console.log('Test 7: Pull request comments from report');
{
  const analysis = runEnhancedAnalysis(mockSnapshot);
  const report = buildFindingReport(analysis.findings);
  const comments = generatePullRequestComments(report.findings, { groupByFile: true });
  
  assert(comments.length > 0, 'Should generate PR comments');
  assert(comments[0].body, 'Comments should have body');
  assert(comments[0].file, 'Comments should reference file');
  console.log('✓ Test 7 passed');
}

// Test 8: Multiple file handling
console.log('Test 8: Multiple file handling');
{
  const multiFileSnapshot = {
    files: [
      {
        path: 'src/Auth.java',
        content: 'String query = "SELECT * FROM users WHERE id = " + id;',
      },
      {
        path: 'src/Data.java',
        content: 'Object obj = null; obj.toString();',
      },
    ],
  };
  
  const analysis = runEnhancedAnalysis(multiFileSnapshot);
  const report = buildFindingReport(analysis.findings);
  
  assert(report.summary.totalFindings > 0, 'Should find issues in multiple files');
  const byFile = {};
  for (const finding of report.findings) {
    byFile[finding.file] = (byFile[finding.file] || 0) + 1;
  }
  assert(Object.keys(byFile).length > 1, 'Should have findings from multiple files');
  console.log('✓ Test 8 passed');
}

// Test 9: Severity distribution in report
console.log('Test 9: Severity distribution in report');
{
  const analysis = runEnhancedAnalysis(mockSnapshot);
  const report = buildFindingReport(analysis.findings);
  
  assert(report.summary.bySeverity, 'Should have severity breakdown');
  assert('CRITICAL' in report.summary.bySeverity, 'Should track CRITICAL');
  assert('HIGH' in report.summary.bySeverity, 'Should track HIGH');
  assert('MEDIUM' in report.summary.bySeverity, 'Should track MEDIUM');
  assert('LOW' in report.summary.bySeverity, 'Should track LOW');
  
  const total = Object.values(report.summary.bySeverity).reduce((a, b) => a + b, 0);
  assert.strictEqual(total, report.summary.totalFindings, 'Severity counts should sum to total');
  console.log('✓ Test 9 passed');
}

// Test 10: Finding ID uniqueness across exports
console.log('Test 10: Finding ID uniqueness across exports');
{
  const analysis = runEnhancedAnalysis(mockSnapshot);
  const report = buildFindingReport(analysis.findings);
  const ids = report.findings.map(f => f.id);
  const uniqueIds = new Set(ids);
  
  assert.strictEqual(ids.length, uniqueIds.size, 'All finding IDs should be unique');
  console.log('✓ Test 10 passed');
}

console.log('\n✅ All 10 Phase 3.3 integration tests passed!');
console.log('✓ Report formatter successfully integrated with enhanced analysis');
console.log('✓ All export formats working (JSON, Markdown, CSV)');
console.log('✓ GitHub integration complete (annotations, PR comments, check runs)');
