/**
 * GitHub Integration Module
 * Handles GitHub workflow annotations and pull request comments
 * Decoupled from GitHub-specific implementation for future extensibility
 */

/**
 * Format findings as GitHub workflow annotations
 * Annotations appear in workflow logs and can be surfaced to PR
 * @param {Array} findings - Array of finding objects
 * @param {Object} options - Formatting options
 * @returns {Array} - Array of annotation commands
 */
function generateWorkflowAnnotations(findings = [], options = {}) {
  const {
    includeCroppedSnippet = true,
    maxLineLength = 100,
  } = options;

  const annotations = [];
  const severityToLevel = {
    CRITICAL: 'error',
    HIGH: 'error',
    MEDIUM: 'warning',
    LOW: 'notice',
  };

  for (const finding of findings) {
    const level = severityToLevel[finding.severity] || 'notice';

    // Build message with finding details
    let message = `[${finding.category}] ${finding.title}`;
    
    if (finding.description) {
      // Crop long descriptions
      const desc = finding.description.length > maxLineLength
        ? finding.description.substring(0, maxLineLength) + '...'
        : finding.description;
      message += `\n${desc}`;
    }

    // Add code snippet if available
    if (includeCroppedSnippet && finding.originalCode) {
      const snippet = finding.originalCode.split('\n')[0]; // First line only
      const croppedSnippet = snippet.length > maxLineLength
        ? snippet.substring(0, maxLineLength) + '...'
        : snippet;
      message += `\nCode: ${croppedSnippet}`;
    }

    // Add finding ID for correlation
    message += `\nFinding ID: ${finding.id || 'unknown'}`;

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

/**
 * Format annotations as GitHub CLI commands for workflow
 * Usage: Inside GitHub Actions, pipe these commands to stdout
 * @param {Array} annotations - Array of annotation objects
 * @returns {Array} - Array of GitHub command strings
 */
function formatAsGitHubCommands(annotations = []) {
  const commands = [];

  for (const annotation of annotations) {
    // Format: ::notice file=<name>,line=<line>::<message>
    const props = [];
    if (annotation.file) props.push(`file=${annotation.file}`);
    if (annotation.line) props.push(`line=${annotation.line}`);
    if (annotation.title) props.push(`title=${annotation.title}`);

    const propString = props.length > 0 ? ` ${props.join(',')}` : '';
    const cmd = `::${annotation.level}${propString}::${annotation.message}`;
    commands.push(cmd);
  }

  return commands;
}

/**
 * Generate GitHub PR comment threads
 * Each finding gets mapped to a specific code location
 * @param {Array} findings - Array of finding objects
 * @param {Object} options - Comment formatting options
 * @returns {Array} - Array of comment thread objects
 */
function generatePullRequestComments(findings = [], options = {}) {
  const {
    includeFullSnippet = true,
    includeRecommendation = true,
    groupByFile = true,
  } = options;

  if (!groupByFile) {
    // Return one comment per finding
    return findings.map(f => buildFindingComment(f, includeFullSnippet, includeRecommendation));
  }

  // Group by file
  const fileGroups = {};
  for (const finding of findings) {
    const file = finding.file || 'unknown';
    if (!fileGroups[file]) {
      fileGroups[file] = [];
    }
    fileGroups[file].push(finding);
  }

  // Create one comment per file
  const comments = [];
  for (const [file, fileFindings] of Object.entries(fileGroups)) {
    comments.push({
      type: 'review',
      file,
      line: fileFindings[0].line, // Anchor to first finding
      findings: fileFindings.length,
      body: buildGroupedFileComment(file, fileFindings, includeFullSnippet, includeRecommendation),
    });
  }

  return comments;
}

/**
 * Build a single finding comment
 * @param {Object} finding - The finding object
 * @param {boolean} includeSnippet - Include code snippet
 * @param {boolean} includeRec - Include recommendation
 * @returns {Object} - Comment object with body
 */
function buildFindingComment(finding, includeSnippet = true, includeRec = true) {
  let body = `### ${finding.title}\n\n`;
  body += `**Severity:** ${finding.severity} | **Category:** ${finding.category}\n\n`;

  if (finding.description) {
    body += `${finding.description}\n\n`;
  }

  if (includeSnippet && finding.originalCode) {
    body += '**Current code:**\n```java\n';
    body += finding.originalCode + '\n';
    body += '```\n\n';
  }

  if (includeRec && finding.recommendation) {
    body += `**Fix:** ${finding.recommendation.description}\n\n`;

    if (finding.recommendation.correctedCode) {
      body += '**Suggested fix:**\n```java\n';
      body += finding.recommendation.correctedCode + '\n';
      body += '```\n';
    }
  }

  return {
    file: finding.file,
    line: finding.line,
    body,
  };
}

/**
 * Build a grouped comment for multiple findings in same file
 * @param {string} file - File path
 * @param {Array} findings - Findings for this file
 * @param {boolean} includeSnippet - Include code snippets
 * @param {boolean} includeRec - Include recommendations
 * @returns {string} - Markdown comment body
 */
function buildGroupedFileComment(file, findings, includeSnippet = true, includeRec = true) {
  let body = `# Code Review Findings in \`${file}\`\n\n`;
  body += `Found **${findings.length}** issue(s):\n\n`;

  for (const finding of findings) {
    body += `## [${finding.severity}] ${finding.title} (Line ${finding.line})\n\n`;

    if (finding.description) {
      body += `${finding.description}\n\n`;
    }

    if (includeSnippet && finding.originalCode) {
      body += '**Current code:**\n```java\n';
      body += finding.originalCode + '\n';
      body += '```\n\n';
    }

    if (includeRec && finding.recommendation) {
      body += `**Fix:** ${finding.recommendation.description}\n\n`;

      if (finding.recommendation.correctedCode) {
        body += '**Suggested fix:**\n```java\n';
        body += finding.recommendation.correctedCode + '\n';
        body += '```\n\n';
      }
    }

    body += '---\n\n';
  }

  return body;
}

/**
 * Format findings as GitHub check run output
 * Check runs appear as CI status checks on the PR
 * @param {Object} report - The findings report object
 * @param {Object} options - Check run options
 * @returns {Object} - Check run payload
 */
function formatAsCheckRun(report, options = {}) {
  const {
    name = 'Code Review',
    headSha = process.env.GITHUB_SHA || 'unknown',
    detailsUrl = null,
  } = options;

  // Determine conclusion based on critical/high findings
  let conclusion = 'success';
  if (report.summary.bySeverity.CRITICAL > 0) {
    conclusion = 'failure';
  } else if (report.summary.bySeverity.HIGH > 0) {
    conclusion = 'failure';
  } else if (report.summary.bySeverity.MEDIUM > 0) {
    conclusion = 'neutral';
  }

  // Build annotation array
  const annotations = [];
  for (const finding of report.findings) {
    const severityToLevel = {
      CRITICAL: 'failure',
      HIGH: 'failure',
      MEDIUM: 'warning',
      LOW: 'notice',
    };

    annotations.push({
      path: finding.file,
      start_line: finding.line,
      end_line: finding.line,
      annotation_level: severityToLevel[finding.severity] || 'notice',
      title: finding.title,
      message: finding.description,
      raw_details: finding.recommendation?.description || '',
    });
  }

  const summary = [
    `Total findings: ${report.summary.totalFindings}`,
    `Critical: ${report.summary.bySeverity.CRITICAL}`,
    `High: ${report.summary.bySeverity.HIGH}`,
    `Medium: ${report.summary.bySeverity.MEDIUM}`,
    `Low: ${report.summary.bySeverity.LOW}`,
  ].join(' | ');

  return {
    name,
    head_sha: headSha,
    status: 'completed',
    conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title: 'Code Review Findings',
      summary: summary,
      annotations: annotations.slice(0, 50), // GitHub limit is 50 annotations per check run
    },
    details_url: detailsUrl,
  };
}

/**
 * Format as plain text for GitHub issue/comment
 * Used when rich formatting isn't needed
 * @param {Object} report - The findings report object
 * @returns {string} - Plain text report
 */
function formatAsPlainText(report) {
  let text = 'CODE REVIEW FINDINGS\n';
  text += '='.repeat(50) + '\n\n';

  // Summary
  text += 'SUMMARY\n';
  text += `-`.repeat(50) + '\n';
  text += `Total: ${report.summary.totalFindings} findings\n`;
  text += `Critical: ${report.summary.bySeverity.CRITICAL}\n`;
  text += `High: ${report.summary.bySeverity.HIGH}\n`;
  text += `Medium: ${report.summary.bySeverity.MEDIUM}\n`;
  text += `Low: ${report.summary.bySeverity.LOW}\n\n`;

  // Findings by severity
  const bySeverity = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: [],
  };

  for (const finding of report.findings) {
    if (bySeverity[finding.severity]) {
      bySeverity[finding.severity].push(finding);
    }
  }

  for (const [severity, findings] of Object.entries(bySeverity)) {
    if (findings.length === 0) continue;

    text += `${severity} FINDINGS (${findings.length})\n`;
    text += `-`.repeat(50) + '\n';

    for (const finding of findings) {
      text += `[${finding.file}:${finding.line}] ${finding.title}\n`;
      if (finding.description) {
        text += `  ${finding.description}\n`;
      }
      text += '\n';
    }
  }

  return text;
}

module.exports = {
  generateWorkflowAnnotations,
  formatAsGitHubCommands,
  generatePullRequestComments,
  buildFindingComment,
  buildGroupedFileComment,
  formatAsCheckRun,
  formatAsPlainText,
};
