/**
 * Test Coverage Analyzer
 * Analyzes test coverage and identifies missing test cases
 */

const fs = require('fs');
const path = require('path');

/**
 * Match source file to its test file
 * Supports common naming conventions:
 * - MyClass.java -> MyClassTest.java
 * - MyClass.java -> MyClassUnitTest.java
 * - MyClass.java -> TestMyClass.java
 * - src/main/java/MyClass.java -> src/test/java/MyClassTest.java
 *
 * @param {string} sourceFile - Path to source file
 * @param {Array<string>} allFiles - Array of all files in the repository
 * @returns {string|null} - Path to matching test file or null
 */
function findTestFile(sourceFile, allFiles) {
  // Extract base name without extension
  const baseName = path.basename(sourceFile, '.java');

  // Common test file patterns
  const patterns = [
    `${baseName}Test.java`,
    `${baseName}UnitTest.java`,
    `${baseName}IntegrationTest.java`,
    `Test${baseName}.java`,
  ];

  // Search for matching test file
  for (const pattern of patterns) {
    const match = allFiles.find(f => f.endsWith(pattern));
    if (match) return match;
  }

  // Try path-based matching (src/main -> src/test)
  const testPath = sourceFile.replace(/src[\\/]main[\\/]java/, 'src/test/java').replace(/src[\\/]main[\\/]java/, 'src/test/java');
  if (testPath !== sourceFile && allFiles.includes(testPath)) {
    return testPath;
  }

  return null;
}

/**
 * Extract public method names from Java class
 * @param {string} content - File content
 * @returns {Array<string>} - Array of public method names
 */
function extractPublicMethods(content) {
  const methodPattern = /public\s+(?:\w+\s+)*\w+\s+(\w+)\s*\([^)]*\)\s*\{/g;
  const methods = [];
  let match;

  while ((match = methodPattern.exec(content)) !== null) {
    methods.push(match[1]);
  }

  return methods;
}

/**
 * Analyze test coverage for a source file
 * @param {string} sourceFile - Path to source file
 * @param {string} sourceContent - Content of source file
 * @param {string} testFile - Path to test file (optional)
 * @param {string} testContent - Content of test file (optional)
 * @returns {Object} - Coverage analysis result
 */
function analyzeTestCoverage(sourceFile, sourceContent, testFile = null, testContent = '') {
  if (!sourceFile.endsWith('.java')) {
    return null;
  }

  const publicMethods = extractPublicMethods(sourceContent);
  const findings = [];

  if (!testFile) {
    // No test file found
    if (publicMethods.length > 0) {
      findings.push({
        file: sourceFile,
        line: 1,
        category: 'missingTestFile',
        severity: 'MEDIUM',
        title: 'No Test File Found',
        message: `No corresponding test file found for ${path.basename(sourceFile)}`,
        recommendation: 'Create unit tests for this class',
      });
    }

    return {
      sourceFile,
      testFile: null,
      publicMethods,
      testedMethods: [],
      coverage: 0,
      findings,
    };
  }

  // Extract method calls from test file
  const testedMethods = [];
  for (const method of publicMethods) {
    // Look for method being called in test
    const testPattern = new RegExp(`\\b${method}\\s*\\(`, 'g');
    if (testPattern.test(testContent)) {
      testedMethods.push(method);
    }
  }

  const coverage = publicMethods.length > 0 ? (testedMethods.length / publicMethods.length) * 100 : 100;

  // Flag untested public methods
  if (testedMethods.length < publicMethods.length) {
    const untertestedMethods = publicMethods.filter(m => !testedMethods.includes(m));
    for (const method of untertestedMethods) {
      findings.push({
        file: sourceFile,
        line: 1,
        category: 'untertestedMethod',
        severity: 'LOW',
        title: `Public Method Appears Untested: ${method}`,
        message: `Public method "${method}" is not called in test file`,
        recommendation: 'Add test case for this method',
      });
    }
  }

  return {
    sourceFile,
    testFile,
    publicMethods,
    testedMethods,
    coverage: Math.round(coverage * 10) / 10,
    findings,
  };
}

/**
 * Analyze test coverage for multiple files
 * @param {Array<Object>} files - Array of file objects with { path, content }
 * @returns {Object} - Aggregated coverage analysis
 */
function analyzeAllTestCoverage(files) {
  const sourceFiles = files.filter(f => f.path.endsWith('.java') && f.path.includes('src/main'));
  const allPaths = files.map(f => f.path);

  const coverageResults = [];
  const findings = [];

  for (const sourceFile of sourceFiles) {
    const testFile = findTestFile(sourceFile.path, allPaths);
    const testContent = testFile ? (files.find(f => f.path === testFile)?.content || '') : '';

    const result = analyzeTestCoverage(sourceFile.path, sourceFile.content, testFile, testContent);
    if (result) {
      coverageResults.push(result);
      findings.push(...result.findings);
    }
  }

  // Calculate aggregate coverage
  let totalMethods = 0;
  let totalTestedMethods = 0;

  for (const result of coverageResults) {
    totalMethods += result.publicMethods.length;
    totalTestedMethods += result.testedMethods.length;
  }

  const aggregateCoverage = totalMethods > 0 ? Math.round((totalTestedMethods / totalMethods) * 100 * 10) / 10 : 100;

  return {
    aggregateCoverage,
    totalMethods,
    totalTestedMethods,
    results: coverageResults,
    findings,
  };
}

module.exports = {
  analyzeTestCoverage,
  analyzeAllTestCoverage,
  findTestFile,
  extractPublicMethods,
};
