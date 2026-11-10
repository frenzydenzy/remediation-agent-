/**
 * Enhanced Analysis Orchestrator
 * Coordinates execution of all analyzers (security, correctness, coverage, architecture)
 * and aggregates findings
 */

const securityAnalyzer = require('./security-analyzer.cjs');
const correctnessAnalyzer = require('./correctness-analyzer.cjs');
const testCoverageAnalyzer = require('./test-coverage-analyzer.cjs');
const architectureAnalyzer = require('./architecture-analyzer.cjs');

/**
 * Run enhanced analysis on snapshot
 * @param {Object} snapshot - Review snapshot with patch, files, discoveredContext
 * @returns {Object} - Aggregated analysis results
 */
function runEnhancedAnalysis(snapshot) {
  const findings = [];
  const analysisResults = {
    security: { findings: [], summary: {} },
    correctness: { findings: [], summary: {} },
    testCoverage: { results: [], findings: [], summary: {} },
    architecture: { findings: [], summary: {} },
  };

  // Prepare file objects for analyzers
  const files = (snapshot.files || []).map(f => ({
    path: f.path,
    content: f.content,
  }));

  // 1. Run Security Analysis
  try {
    for (const file of files) {
      const securityFindings = securityAnalyzer.analyzeSecurityPatterns(file.path, file.content);
      analysisResults.security.findings.push(...securityFindings);
    }

    if (analysisResults.security.findings.length > 0) {
      analysisResults.security.findings = securityAnalyzer.rankFindings(analysisResults.security.findings);
      analysisResults.security.summary = {
        total: analysisResults.security.findings.length,
        critical: analysisResults.security.findings.filter(f => f.severity === 'CRITICAL').length,
        high: analysisResults.security.findings.filter(f => f.severity === 'HIGH').length,
        medium: analysisResults.security.findings.filter(f => f.severity === 'MEDIUM').length,
        low: analysisResults.security.findings.filter(f => f.severity === 'LOW').length,
      };
    }
  } catch (e) {
    console.error('Error in security analysis:', e.message);
  }

  // 2. Run Correctness Analysis
  try {
    for (const file of files) {
      const correctnessFindings = correctnessAnalyzer.analyzeCorrectnessPatterns(file.path, file.content);
      analysisResults.correctness.findings.push(...correctnessFindings);
    }

    if (analysisResults.correctness.findings.length > 0) {
      analysisResults.correctness.summary = {
        total: analysisResults.correctness.findings.length,
        high: analysisResults.correctness.findings.filter(f => f.severity === 'HIGH').length,
        medium: analysisResults.correctness.findings.filter(f => f.severity === 'MEDIUM').length,
        low: analysisResults.correctness.findings.filter(f => f.severity === 'LOW').length,
      };
    }
  } catch (e) {
    console.error('Error in correctness analysis:', e.message);
  }

  // 3. Run Test Coverage Analysis
  try {
    const coverageResult = testCoverageAnalyzer.analyzeAllTestCoverage(files);
    analysisResults.testCoverage = {
      results: coverageResult.results,
      findings: coverageResult.findings,
      summary: {
        aggregateCoverage: coverageResult.aggregateCoverage,
        totalMethods: coverageResult.totalMethods,
        totalTestedMethods: coverageResult.totalTestedMethods,
        untertestedClasses: coverageResult.results.filter(r => r.coverage < 100).length,
      },
    };
  } catch (e) {
    console.error('Error in test coverage analysis:', e.message);
  }

  // 4. Run Architecture Analysis
  try {
    const archResult = architectureAnalyzer.analyzeArchitecture(files);
    analysisResults.architecture = {
      findings: archResult.findings,
      summary: archResult.summary,
    };
  } catch (e) {
    console.error('Error in architecture analysis:', e.message);
  }

  // 5. Aggregate all findings
  findings.push(...analysisResults.security.findings);
  findings.push(...analysisResults.correctness.findings);
  findings.push(...analysisResults.testCoverage.findings);
  findings.push(...analysisResults.architecture.findings);

  // Sort by severity and line number
  findings.sort((a, b) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const aSeverity = severityOrder[a.severity] || 999;
    const bSeverity = severityOrder[b.severity] || 999;

    if (aSeverity !== bSeverity) return aSeverity - bSeverity;
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line - b.line;
  });

  return {
    totalFindings: findings.length,
    findings,
    analysisResults,
    aggregateSummary: {
      security: analysisResults.security.summary,
      correctness: analysisResults.correctness.summary,
      testCoverage: analysisResults.testCoverage.summary,
      architecture: analysisResults.architecture.summary,
    },
  };
}

module.exports = {
  runEnhancedAnalysis,
};
