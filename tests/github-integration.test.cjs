/**
 * GitHub Integration Tests
 * Tests workflow annotations, PR comments, and check run formatting
 */

const assert = require('assert');
const {
  generateWorkflowAnnotations,
  formatAsGitHubCommands,
  generatePullRequestComments,
  buildFindingComment,
  buildGroupedFileComment,
  formatAsCheckRun,
  formatAsPlainText,
} = require('../.github/skills/ai-code-security-review/scripts/formatters/github-integration.cjs');

// Sample findings for testing
const sampleFindings = [
  {
    id: 'FIND-12345678',
    severity: 'CRITICAL',
    category: 'SECURITY',
    title: 'SQL Injection',
    description: 'User input concatenated into SQL',
    file: 'src/AuthService.java',
    line: 42,
    originalCode: 'String query = "SELECT * FROM users WHERE id = " + userId;',
    recommendation: {
      description: 'Use parameterized queries',
      correctedCode: 'PreparedStatement ps = con.prepareStatement("SELECT * FROM users WHERE id = ?");',
    },
  },
  {
    id: 'FIND-87654321',
    severity: 'HIGH',
    category: 'CORRECTNESS',
    title: 'Null Pointer Risk',
    description: 'Dereferencing potentially null object',
    file: 'src/UserManager.java',
    line: 85,
    originalCode: 'String name = user.getName();',
    recommendation: {
      description: 'Add null check before dereferencing',
      correctedCode: 'String name = user != null ? user.getName() : "unknown";',
    },
  },
];

// Sample report for testing
const sampleReport = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFindings: 2,
    bySeverity: { CRITICAL: 1, HIGH: 1, MEDIUM: 0, LOW: 0 },
    byCategory: { SECURITY: 1, CORRECTNESS: 1 },
  },
  findings: sampleFindings,
};

// Test 1: Generate workflow annotations
console.log('Test 1: Generate workflow annotations');
{
  const annotations = generateWorkflowAnnotations(sampleFindings);
  
  assert.strictEqual(annotations.length, 2, 'Should have 2 annotations');
  assert.strictEqual(annotations[0].level, 'error', 'CRITICAL should be error level');
  assert.strictEqual(annotations[1].level, 'error', 'HIGH should be error level');
  assert.strictEqual(annotations[0].file, 'src/AuthService.java', 'Should preserve file path');
  assert.strictEqual(annotations[0].line, 42, 'Should preserve line number');
  assert(annotations[0].message.includes('SQL Injection'), 'Should include title in message');
  console.log('✓ Test 1 passed');
}

// Test 2: Format as GitHub commands
console.log('Test 2: Format as GitHub commands');
{
  const annotations = generateWorkflowAnnotations(sampleFindings);
  const commands = formatAsGitHubCommands(annotations);
  
  assert.strictEqual(commands.length, 2, 'Should have 2 commands');
  assert(commands[0].startsWith('::error'), 'CRITICAL should use ::error command');
  assert(commands[0].includes('file='), 'Should include file property');
  assert(commands[0].includes('line='), 'Should include line property');
  assert(commands[0].includes('title='), 'Should include title property');
  console.log('✓ Test 2 passed');
}

// Test 3: Generate pull request comments (individual)
console.log('Test 3: Generate pull request comments (individual)');
{
  const comments = generatePullRequestComments(sampleFindings, { groupByFile: false });
  
  assert.strictEqual(comments.length, 2, 'Should have 2 comments');
  assert(comments[0].body.includes('SQL Injection'), 'Comment should include finding title');
  assert(comments[0].body.includes('CRITICAL'), 'Comment should include severity');
  assert(comments[0].body.includes('SECURITY'), 'Comment should include category');
  assert(comments[0].file, 'Comment should have file path');
  assert(comments[0].line, 'Comment should have line number');
  console.log('✓ Test 3 passed');
}

// Test 4: Generate pull request comments (grouped by file)
console.log('Test 4: Generate pull request comments (grouped by file)');
{
  const multipleInFile = [
    { ...sampleFindings[0] },
    { ...sampleFindings[0], line: 50, title: 'Another SQL Issue' },
  ];
  
  const comments = generatePullRequestComments(multipleInFile, { groupByFile: true });
  
  assert.strictEqual(comments.length, 1, 'Should group into 1 comment');
  assert.strictEqual(comments[0].findings, 2, 'Should show 2 findings grouped');
  assert(comments[0].body.includes('2** issue'), 'Should list all findings');
  console.log('✓ Test 4 passed');
}

// Test 5: Build finding comment with recommendation
console.log('Test 5: Build finding comment with recommendation');
{
  const comment = buildFindingComment(sampleFindings[0], true, true);
  
  assert(comment.body.includes('SQL Injection'), 'Should include title');
  assert(comment.body.includes('CRITICAL'), 'Should include severity');
  assert(comment.body.includes('SECURITY'), 'Should include category');
  assert(comment.body.includes('Current code:'), 'Should include original code section');
  assert(comment.body.includes('Suggested fix:'), 'Should include fix section');
  assert(comment.body.includes('PreparedStatement'), 'Should include corrected code');
  console.log('✓ Test 5 passed');
}

// Test 6: Build finding comment without snippets
console.log('Test 6: Build finding comment without snippets');
{
  const comment = buildFindingComment(sampleFindings[0], false, true);
  
  assert(!comment.body.includes('Current code:'), 'Should not include code snippet');
  assert(comment.body.includes('Fix:'), 'Should still include recommendation');
  console.log('✓ Test 6 passed');
}

// Test 7: Build grouped file comment
console.log('Test 7: Build grouped file comment');
{
  const findings = [sampleFindings[0], { ...sampleFindings[1], file: 'src/AuthService.java' }];
  const comment = buildGroupedFileComment('src/AuthService.java', findings, true, true);
  
  assert(comment.includes('Code Review Findings'), 'Should include header');
  assert(comment.includes('2** issue'), 'Should list count');
  assert(comment.includes('SQL Injection'), 'Should include first finding');
  assert(comment.includes('Null Pointer'), 'Should include second finding');
  console.log('✓ Test 7 passed');
}

// Test 8: Format as check run
console.log('Test 8: Format as check run');
{
  const checkRun = formatAsCheckRun(sampleReport);
  
  assert.strictEqual(checkRun.name, 'Code Review', 'Should have name');
  assert.strictEqual(checkRun.status, 'completed', 'Should be completed');
  assert.strictEqual(checkRun.conclusion, 'failure', 'CRITICAL findings should fail check');
  assert(checkRun.output.summary.includes('Total findings: 2'), 'Should include summary');
  assert(checkRun.output.annotations.length > 0, 'Should have annotations');
  console.log('✓ Test 8 passed');
}

// Test 9: Check run conclusion based on severity
console.log('Test 9: Check run conclusion based on severity');
{
  const mediumOnly = {
    ...sampleReport,
    summary: { ...sampleReport.summary, bySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 0 } },
  };
  
  const checkRun = formatAsCheckRun(mediumOnly);
  assert.strictEqual(checkRun.conclusion, 'neutral', 'MEDIUM findings should be neutral');
  
  const successReport = {
    ...sampleReport,
    summary: { ...sampleReport.summary, bySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } },
  };
  
  const successCheckRun = formatAsCheckRun(successReport);
  assert.strictEqual(successCheckRun.conclusion, 'success', 'No findings should succeed');
  console.log('✓ Test 9 passed');
}

// Test 10: Format as plain text
console.log('Test 10: Format as plain text');
{
  const text = formatAsPlainText(sampleReport);
  
  assert(text.includes('CODE REVIEW FINDINGS'), 'Should have title');
  assert(text.includes('SUMMARY'), 'Should have summary section');
  assert(text.includes('Total: 2 findings'), 'Should list total');
  assert(text.includes('CRITICAL FINDINGS'), 'Should have critical section');
  assert(text.includes('HIGH FINDINGS'), 'Should have high section');
  assert(text.includes('SQL Injection'), 'Should include findings');
  console.log('✓ Test 10 passed');
}

// Test 11: Severity mapping in GitHub commands
console.log('Test 11: Severity mapping in GitHub commands');
{
  const findings = [
    { severity: 'CRITICAL', category: 'SECURITY', title: 'Critical', file: 'a.java', line: 1 },
    { severity: 'HIGH', category: 'SECURITY', title: 'High', file: 'b.java', line: 2 },
    { severity: 'MEDIUM', category: 'SECURITY', title: 'Medium', file: 'c.java', line: 3 },
    { severity: 'LOW', category: 'SECURITY', title: 'Low', file: 'd.java', line: 4 },
  ];
  
  const annotations = generateWorkflowAnnotations(findings);
  assert.strictEqual(annotations[0].level, 'error', 'CRITICAL → error');
  assert.strictEqual(annotations[1].level, 'error', 'HIGH → error');
  assert.strictEqual(annotations[2].level, 'warning', 'MEDIUM → warning');
  assert.strictEqual(annotations[3].level, 'notice', 'LOW → notice');
  console.log('✓ Test 11 passed');
}

// Test 12: Empty findings list
console.log('Test 12: Empty findings list');
{
  const annotations = generateWorkflowAnnotations([]);
  const comments = generatePullRequestComments([]);
  
  assert.strictEqual(annotations.length, 0, 'Empty findings should have no annotations');
  assert.strictEqual(comments.length, 0, 'Empty findings should have no comments');
  console.log('✓ Test 12 passed');
}

// Test 13: Check run annotation limit (50)
console.log('Test 13: Check run annotation limit (50)');
{
  const manyFindings = [];
  for (let i = 0; i < 60; i++) {
    manyFindings.push({
      severity: 'LOW',
      category: 'SECURITY',
      title: `Finding ${i}`,
      file: `file${i}.java`,
      line: i,
    });
  }
  
  const report = { ...sampleReport, summary: { ...sampleReport.summary, totalFindings: 60 }, findings: manyFindings };
  const checkRun = formatAsCheckRun(report);
  
  assert(checkRun.output.annotations.length <= 50, 'Should limit annotations to 50');
  console.log('✓ Test 13 passed');
}

// Test 14: PR comment with optional sections
console.log('Test 14: PR comment with optional sections');
{
  const findingNoRec = {
    severity: 'LOW',
    category: 'SECURITY',
    title: 'Test',
    file: 'a.java',
    line: 1,
    description: 'Test description',
    originalCode: 'old code',
  };
  
  const comment = buildFindingComment(findingNoRec, true, true);
  assert(comment.body.includes('Current code:'), 'Should include snippet if provided');
  assert(!comment.body.includes('Fix:'), 'Should not include fix if not provided');
  console.log('✓ Test 14 passed');
}

// Test 15: Message truncation for long descriptions
console.log('Test 15: Message truncation for long descriptions');
{
  const longDesc = 'This is a very long description '.repeat(10); // Create long string
  const findings = [{
    ...sampleFindings[0],
    description: longDesc,
  }];
  
  const annotations = generateWorkflowAnnotations(findings, { maxLineLength: 100 });
  
  assert(annotations[0].message.length < longDesc.length, 'Message should be truncated');
  assert(annotations[0].message.includes('...'), 'Should indicate truncation');
  console.log('✓ Test 15 passed');
}

console.log('\n✅ All 15 GitHub integration tests passed!');
