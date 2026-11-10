/**
 * Phase 3.4: Remediation Agent Orchestrator
 * 
 * Main entry point for automated fix generation and validation.
 * 
 * Responsibilities:
 * 1. Parse findings from Phase 3.3 Report Formatter
 * 2. Route issues to appropriate fix generator (template or LLM)
 * 3. Coordinate validation (test execution)
 * 4. Implement error handling and rollback
 * 5. Report remediation status
 * 
 * Flow:
 * Finding -> Parse -> Route to Generator -> Apply Fix -> Validate -> Report Status
 * 
 * Supported issue types:
 * Security (7):     SQL Injection, Command Injection, Path Traversal, XSS, 
 *                   Hard-coded Credentials, Weak Crypto, Auth Bypass
 * Correctness (7):  Null Pointer, Type Casting, Resource Leak, Array Bounds,
 *                   Unchecked Exception, Logic Error, Race Condition
 * Architecture (3): Dead Code, Circular Dependency, Code Duplication
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);

// Issue type to generator mapping
const GENERATOR_ROUTES = {
  'sql-injection': 'template',
  'command-injection': 'template',
  'path-traversal': 'template',
  'xss-vulnerability': 'template',
  'hard-coded-credentials': 'template',
  'weak-cryptography': 'llm',
  'authentication-bypass': 'llm',
  'null-pointer-dereference': 'template',
  'type-casting-error': 'template',
  'resource-leak': 'template',
  'array-out-of-bounds': 'template',
  'unchecked-exception': 'template',
  'logic-error': 'llm',
  'race-condition': 'llm',
  'dead-code': 'template',
  'circular-dependency': 'llm',
  'code-duplication': 'llm'
};

// Severity levels
const SEVERITY_ORDER = {
  'CRITICAL': 0,
  'HIGH': 1,
  'MEDIUM': 2,
  'LOW': 3
};

/**
 * Main entry point: Remediate a set of findings
 * @param {Array<Object>} findings - Array of findings from Phase 3.3
 * @param {Object} options - Configuration options
 * @returns {Promise<RemediationResult>}
 */
exports.remediateFindings = async (findings, options = {}) => {
  const startTime = Date.now();
  const result = {
    timestamp: new Date().toISOString(),
    totalFindings: findings.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    results: [],
    errors: [],
    totalDuration: 0
  };

  if (!Array.isArray(findings) || findings.length === 0) {
    result.errors.push('No findings provided');
    return result;
  }

  // Sort by severity (process critical issues first)
  const sortedFindings = sortFindingsBySeverity(findings);

  for (const finding of sortedFindings) {
    try {
      result.processed++;
      
      // Validate and parse finding
      const parsedFinding = exports.parseFinding(finding);
      if (!parsedFinding.valid) {
        result.failed++;
        result.results.push({
          finding: finding,
          status: 'SKIPPED',
          reason: parsedFinding.error
        });
        continue;
      }

      // Route to appropriate generator
      const generatorType = exports.routeToGenerator(parsedFinding);

      // Execute remediation
      const fixResult = await exports.executeRemediation(parsedFinding, generatorType, options);
      
      if (fixResult.success) {
        result.succeeded++;
      } else {
        result.failed++;
      }

      result.results.push(fixResult);

    } catch (error) {
      result.failed++;
      result.errors.push(`Error processing finding: ${error.message}`);
      result.results.push({
        finding: finding,
        status: 'ERROR',
        error: error.message
      });
    }
  }

  result.totalDuration = Date.now() - startTime;
  return result;
};

/**
 * Parse and validate a finding
 * @param {Object} finding - Finding object from Phase 3.3
 * @returns {Object} - Parsed finding with validation status
 */
exports.parseFinding = (finding) => {
  const parsed = {
    valid: true,
    error: null,
    finding: finding
  };

  // Validate required fields
  if (!finding.file || typeof finding.file !== 'string') {
    parsed.valid = false;
    parsed.error = 'Missing or invalid file path';
    return parsed;
  }

  if (!finding.line || typeof finding.line !== 'number' || finding.line < 1) {
    parsed.valid = false;
    parsed.error = 'Missing or invalid line number';
    return parsed;
  }

  if (!finding.category || typeof finding.category !== 'string') {
    parsed.valid = false;
    parsed.error = 'Missing or invalid issue category';
    return parsed;
  }

  if (!finding.severity || !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(finding.severity)) {
    parsed.valid = false;
    parsed.error = 'Missing or invalid severity level';
    return parsed;
  }

  if (!finding.title || typeof finding.title !== 'string') {
    parsed.valid = false;
    parsed.error = 'Missing or invalid title';
    return parsed;
  }

  // Normalize category to lowercase with hyphens
  finding.category = finding.category.toLowerCase().replace(/_/g, '-');

  return parsed;
};

/**
 * Route finding to appropriate generator type
 * @param {Object} parsedFinding - Parsed finding
 * @returns {String} - Generator type: 'template', 'llm', or 'unknown'
 */
exports.routeToGenerator = (parsedFinding) => {
  const category = parsedFinding.finding.category;
  return GENERATOR_ROUTES[category] || 'unknown';
};

/**
 * Execute remediation for a single finding
 * @param {Object} parsedFinding - Parsed finding
 * @param {String} generatorType - Type of generator to use
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Result of remediation attempt
 */
exports.executeRemediation = async (parsedFinding, generatorType, options) => {
  const finding = parsedFinding.finding;
  const result = {
    finding: finding,
    status: 'UNKNOWN',
    generatorType: generatorType,
    strategy: null,
    success: false,
    fixApplied: false,
    reason: '',
    originalCode: null,
    fixedCode: null,
    testPassed: false,
    timestamp: new Date().toISOString()
  };

  // Validate generator type
  if (!['template', 'llm', 'unknown'].includes(generatorType)) {
    result.status = 'SKIPPED';
    result.reason = `Unknown generator type: ${generatorType}`;
    return result;
  }

  if (generatorType === 'unknown') {
    result.status = 'SKIPPED';
    result.reason = `No remediation available for: ${finding.category}`;
    return result;
  }

  // Read source file
  try {
    const fileExists = await fileExistsAsync(finding.file);
    if (!fileExists) {
      result.status = 'SKIPPED';
      result.reason = `File not found: ${finding.file}`;
      return result;
    }

    result.originalCode = await readFileAsync(finding.file);
  } catch (error) {
    result.status = 'ERROR';
    result.reason = `Failed to read file: ${error.message}`;
    return result;
  }

  // Placeholder for actual fix generation
  // In real implementation, this would call fix-templates.cjs or llm-fixer.cjs
  result.status = 'PENDING';
  result.strategy = generatorType;
  result.fixApplied = false;
  result.reason = 'Awaiting generator implementation';

  return result;
};

/**
 * Validate a fix by running tests
 * @param {String} file - File path that was fixed
 * @param {Object} finding - Finding object
 * @returns {Promise<Object>} - Validation result
 */
exports.validateFix = async (file, finding) => {
  const result = {
    file: file,
    finding: finding,
    testsPassed: false,
    testOutput: '',
    duration: 0,
    errors: []
  };

  // Placeholder for test execution
  // In real implementation, this would call fix-validator.cjs

  return result;
};

/**
 * Report remediation status
 * @param {Object} result - Remediation result
 * @returns {Object} - Formatted status report
 */
exports.reportStatus = (result) => {
  const report = {
    summary: {
      total: result.totalFindings,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      successRate: result.processed > 0 ? ((result.succeeded / result.processed) * 100).toFixed(1) : 0,
      duration: result.totalDuration
    },
    byStatus: {
      fixed: result.results.filter(r => r.status === 'FIXED').length,
      failed: result.results.filter(r => r.status === 'FAILED').length,
      skipped: result.results.filter(r => r.status === 'SKIPPED').length,
      errors: result.results.filter(r => r.status === 'ERROR').length
    },
    issues: {
      succeeded: result.results.filter(r => r.success).map(r => ({
        file: r.finding.file,
        line: r.finding.line,
        category: r.finding.category,
        strategy: r.strategy
      })),
      failed: result.results.filter(r => !r.success && r.status !== 'SKIPPED').map(r => ({
        file: r.finding.file,
        line: r.finding.line,
        category: r.finding.category,
        reason: r.reason || 'Fix validation failed'
      }))
    },
    errors: result.errors
  };

  return report;
};

/**
 * Sort findings by severity (highest first)
 * @param {Array<Object>} findings - Unsorted findings
 * @returns {Array<Object>} - Sorted findings
 */
function sortFindingsBySeverity(findings) {
  return findings.sort((a, b) => {
    // Sort by severity first
    const severityA = SEVERITY_ORDER[a.severity] !== undefined ? SEVERITY_ORDER[a.severity] : 999;
    const severityB = SEVERITY_ORDER[b.severity] !== undefined ? SEVERITY_ORDER[b.severity] : 999;
    
    if (severityA !== severityB) {
      return severityA - severityB;
    }

    // Then by file
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file);
    }

    // Then by line number
    return (a.line || 0) - (b.line || 0);
  });
}

/**
 * Helper: Check if file exists
 * @param {String} filePath - Path to check
 * @returns {Promise<Boolean>}
 */
async function fileExistsAsync(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Read file asynchronously
 * @param {String} filePath - Path to read
 * @returns {Promise<String>}
 */
async function readFileAsync(filePath) {
  return readFile(filePath, 'utf8');
}

/**
 * Helper: Write file asynchronously
 * @param {String} filePath - Path to write
 * @param {String} content - Content to write
 * @returns {Promise<void>}
 */
async function writeFileAsync(filePath, content) {
  return writeFile(filePath, content, 'utf8');
}

// Export helper functions for testing
exports.fileExistsAsync = fileExistsAsync;
exports.readFileAsync = readFileAsync;
exports.writeFileAsync = writeFileAsync;
exports.sortFindingsBySeverity = sortFindingsBySeverity;
exports.GENERATOR_ROUTES = GENERATOR_ROUTES;
exports.SEVERITY_ORDER = SEVERITY_ORDER;
