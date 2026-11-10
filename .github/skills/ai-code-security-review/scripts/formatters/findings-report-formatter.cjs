/**
 * Findings Report Formatter
 * Converts enhanced analysis output into structured, standardized reports
 * Supports multiple export formats (JSON, Markdown, CSV)
 * Provides finding-to-fix mapping with recommendations
 */

const fs = require('fs');
const path = require('path');

/**
 * Build a standardized finding report with remediation recommendations
 * @param {Array} findings - Array of findings from enhanced analysis
 * @param {Object} options - Formatter options (includeSnippets, includeRecommendations, etc.)
 * @returns {Object} - Standardized report structure
 */
function buildFindingReport(findings = [], options = {}) {
  const {
    includeSnippets = true,
    includeRecommendations = true,
    includeEffortEstimates = false,
    projectRoot = process.cwd(),
  } = options;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFindings: findings.length,
      bySeverity: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      },
      byCategory: {},
    },
    findings: [],
  };

  // Process each finding
  for (const finding of findings) {
    // Update severity counts
    if (report.summary.bySeverity[finding.severity] !== undefined) {
      report.summary.bySeverity[finding.severity]++;
    }

    // Update category counts
    const category = finding.category || 'UNKNOWN';
    report.summary.byCategory[category] = (report.summary.byCategory[category] || 0) + 1;

    // Build standardized finding entry
    const findingEntry = {
      id: generateFindingId(finding),
      severity: finding.severity,
      category: finding.category,
      title: finding.title,
      description: finding.description || '',
      file: finding.file,
      line: finding.line,
      column: finding.column || undefined,
      snippet: includeSnippets ? {
        original: finding.originalCode || '',
        context: finding.contextCode || '',
      } : undefined,
      recommendation: includeRecommendations ? {
        title: getRemediationTitle(finding),
        description: getRemediationDescription(finding),
        correctedCode: finding.correctedCode || '',
        priority: calculateFixPriority(finding),
        estimatedEffort: includeEffortEstimates ? estimateEffort(finding) : undefined,
      } : undefined,
      metadata: {
        detectedBy: finding.detectedBy || 'enhanced-analysis',
        confidence: finding.confidence || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };

    // Remove undefined fields
    Object.keys(findingEntry).forEach(key => {
      if (findingEntry[key] === undefined) {
        delete findingEntry[key];
      }
    });

    report.findings.push(findingEntry);
  }

  // Sort findings by severity and line number
  report.findings.sort((a, b) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const aSeverity = severityOrder[a.severity] !== undefined ? severityOrder[a.severity] : 999;
    const bSeverity = severityOrder[b.severity] !== undefined ? severityOrder[b.severity] : 999;

    if (aSeverity !== bSeverity) return aSeverity - bSeverity;
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line - b.line;
  });

  return report;
}

/**
 * Generate unique finding ID
 * @param {Object} finding - The finding object
 * @returns {string} - Unique ID
 */
function generateFindingId(finding) {
  const components = [
    finding.file,
    finding.line,
    finding.category,
    finding.title,
  ].join(':');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `FIND-${Math.abs(hash).toString(16).toUpperCase().slice(-8)}`;
}

/**
 * Get remediation title based on finding category and severity
 * @param {Object} finding - The finding object
 * @returns {string} - Remediation title
 */
function getRemediationTitle(finding) {
  const categoryTitles = {
    SECURITY: 'Security Fix Required',
    CORRECTNESS: 'Code Correctness Issue',
    TEST_COVERAGE: 'Test Coverage Missing',
    ARCHITECTURE: 'Architecture Violation',
  };

  return categoryTitles[finding.category] || 'Code Issue Detected';
}

/**
 * Get detailed remediation description
 * @param {Object} finding - The finding object
 * @returns {string} - Detailed description
 */
function getRemediationDescription(finding) {
  const descriptions = {
    'SQL Injection': 'Use parameterized queries or prepared statements to prevent SQL injection attacks. Never concatenate user input directly into SQL strings.',
    'Command Injection': 'Use safe APIs that don\'t invoke a shell. Avoid string concatenation with user input in system commands.',
    'Hard-coded Credentials': 'Move credentials to environment variables or secure configuration files. Never commit sensitive data to version control.',
    'Weak Hash Algorithm': 'Use strong cryptographic algorithms (SHA-256 or better, or bcrypt for passwords). MD5 and SHA-1 are deprecated.',
    'ECB Cipher Mode': 'Use authenticated encryption modes (GCM, CBC with HMAC) instead of ECB mode which leaks patterns.',
    'XXE Vulnerability': 'Disable XML external entity (XXE) processing in XML parsers. Use secure parser configurations.',
    'Missing Input Validation': 'Validate all user inputs against expected formats, lengths, and ranges before processing.',
    'Null Pointer Risk': 'Check for null values before dereferencing objects. Use Optional or null-safe operators.',
    'Resource Leak': 'Ensure resources (streams, connections, files) are closed in finally blocks or try-with-resources.',
    'Unchecked Cast': 'Verify object types before casting. Use instanceof checks or safe casting patterns.',
    'Thread Safety Issue': 'Use synchronized blocks, locks, or thread-safe collections for shared mutable state.',
    'String Comparison': 'Use .equals() instead of == for string comparison to check content, not reference.',
    'Exception Swallowing': 'Never catch and ignore exceptions silently. Log, handle, or re-throw appropriately.',
    'Circular Dependency': 'Restructure code to eliminate circular imports. Use dependency injection to break cycles.',
    'Layering Violation': 'Respect architectural layers. Don\'t call persistence layer directly from presentation layer.',
    'Forbidden Import': 'Remove imports of forbidden classes or modules. Use approved alternatives.',
    'Unused Import': 'Remove unused import statements to reduce dependencies and improve code clarity.',
  };

  return descriptions[finding.title] || finding.description || 'Review and fix this code issue.';
}

/**
 * Calculate fix priority based on severity and category
 * @param {Object} finding - The finding object
 * @returns {string} - Priority level (CRITICAL, HIGH, MEDIUM, LOW)
 */
function calculateFixPriority(finding) {
  // Severity determines priority
  const severityToPriority = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
  };

  return severityToPriority[finding.severity] || 'MEDIUM';
}

/**
 * Estimate effort to fix the issue
 * @param {Object} finding - The finding object
 * @returns {string} - Effort estimate (MINIMAL, SMALL, MEDIUM, LARGE)
 */
function estimateEffort(finding) {
  // Map categories to effort estimates
  const categoryEffort = {
    TEST_COVERAGE: 'MEDIUM', // Writing tests takes time
    ARCHITECTURE: 'LARGE', // Refactoring architecture is complex
    SECURITY: 'SMALL', // Most security fixes are straightforward
    CORRECTNESS: 'SMALL', // Correctness fixes are usually simple
  };

  // Security/correctness issues with examples of effort:
  // - Hard-coded credentials: MINIMAL (move to env var)
  // - SQL injection: SMALL (parameterize query)
  // - Null pointer: MINIMAL (add null check)
  // - Resource leak: SMALL (add finally/try-with-resources)
  // - Missing test coverage: MEDIUM (write tests)
  // - Circular dependency: LARGE (restructure code)

  if (finding.category === 'SECURITY') {
    if (finding.title.includes('Hard-coded') || finding.title.includes('String Comparison')) {
      return 'MINIMAL';
    }
    return 'SMALL';
  }

  if (finding.category === 'CORRECTNESS') {
    if (finding.title.includes('Null') || finding.title.includes('Cast')) {
      return 'MINIMAL';
    }
    return 'SMALL';
  }

  return categoryEffort[finding.category] || 'MEDIUM';
}

/**
 * Export report to JSON format
 * @param {Object} report - The standardized report
 * @param {string} outputPath - Output file path (optional)
 * @returns {string|Object} - JSON string or object
 */
function exportToJson(report, outputPath = null) {
  const json = JSON.stringify(report, null, 2);

  if (outputPath) {
    fs.writeFileSync(outputPath, json, 'utf8');
  }

  return json;
}

/**
 * Export report to Markdown format
 * @param {Object} report - The standardized report
 * @param {string} outputPath - Output file path (optional)
 * @returns {string} - Markdown formatted report
 */
function exportToMarkdown(report, outputPath = null) {
  let markdown = '# Code Review Findings Report\n\n';
  markdown += `**Generated:** ${report.timestamp}\n\n`;

  // Summary section
  markdown += '## Summary\n\n';
  markdown += `- **Total Findings:** ${report.summary.totalFindings}\n`;
  markdown += `- **Critical:** ${report.summary.bySeverity.CRITICAL}\n`;
  markdown += `- **High:** ${report.summary.bySeverity.HIGH}\n`;
  markdown += `- **Medium:** ${report.summary.bySeverity.MEDIUM}\n`;
  markdown += `- **Low:** ${report.summary.bySeverity.LOW}\n\n`;

  // Category breakdown
  if (Object.keys(report.summary.byCategory).length > 0) {
    markdown += '### By Category\n\n';
    for (const [category, count] of Object.entries(report.summary.byCategory)) {
      markdown += `- **${category}:** ${count}\n`;
    }
    markdown += '\n';
  }

  // Detailed findings
  markdown += '## Findings\n\n';

  for (const finding of report.findings) {
    const severityEmoji = {
      CRITICAL: '🔴',
      HIGH: '🟠',
      MEDIUM: '🟡',
      LOW: '⚪',
    }[finding.severity] || '⚫';

    markdown += `### ${severityEmoji} ${finding.title}\n\n`;
    markdown += `**ID:** ${finding.id}  \n`;
    markdown += `**Severity:** ${finding.severity}  \n`;
    markdown += `**Category:** ${finding.category}  \n`;
    markdown += `**Location:** ${finding.file}:${finding.line}\n\n`;

    if (finding.description) {
      markdown += `**Description:**\n${finding.description}\n\n`;
    }

    if (finding.snippet && finding.snippet.original) {
      markdown += '**Original Code:**\n```java\n';
      markdown += finding.snippet.original + '\n';
      markdown += '```\n\n';
    }

    if (finding.recommendation) {
      markdown += '**Recommendation:**\n';
      markdown += `${finding.recommendation.description}\n\n`;

      if (finding.recommendation.correctedCode) {
        markdown += '**Corrected Code:**\n```java\n';
        markdown += finding.recommendation.correctedCode + '\n';
        markdown += '```\n\n';
      }

      markdown += `**Priority:** ${finding.recommendation.priority}\n\n`;
    }

    markdown += '---\n\n';
  }

  if (outputPath) {
    fs.writeFileSync(outputPath, markdown, 'utf8');
  }

  return markdown;
}

/**
 * Export report to CSV format
 * @param {Object} report - The standardized report
 * @param {string} outputPath - Output file path (optional)
 * @returns {string} - CSV formatted report
 */
function exportToCsv(report, outputPath = null) {
  // CSV headers
  const headers = [
    'Finding ID',
    'Severity',
    'Category',
    'Title',
    'File',
    'Line',
    'Description',
    'Recommendation',
    'Priority',
    'Effort',
  ];

  let csv = headers.map(h => `"${h}"`).join(',') + '\n';

  // CSV rows
  for (const finding of report.findings) {
    const row = [
      finding.id,
      finding.severity,
      finding.category,
      finding.title,
      finding.file,
      finding.line,
      (finding.description || '').replace(/"/g, '""'), // Escape quotes
      (finding.recommendation?.description || '').replace(/"/g, '""'),
      finding.recommendation?.priority || '',
      finding.recommendation?.estimatedEffort || '',
    ];

    csv += row.map(val => `"${val}"`).join(',') + '\n';
  }

  if (outputPath) {
    fs.writeFileSync(outputPath, csv, 'utf8');
  }

  return csv;
}

/**
 * Format report for GitHub workflow annotations
 * @param {Object} report - The standardized report
 * @returns {Array} - Array of annotation commands for GitHub
 */
function formatGitHubAnnotations(report) {
  const annotations = [];
  const severityToLevel = {
    CRITICAL: 'error',
    HIGH: 'error',
    MEDIUM: 'warning',
    LOW: 'notice',
  };

  for (const finding of report.findings) {
    const level = severityToLevel[finding.severity] || 'notice';
    const message = `[${finding.category}] ${finding.title}: ${finding.description}`;

    annotations.push({
      level,
      file: finding.file,
      line: finding.line,
      title: finding.title,
      message,
    });
  }

  return annotations;
}

module.exports = {
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
};
