/**
 * Progressive Rollback Manager
 * 
 * Implements a 3-tier fallback strategy to handle fix generation failures.
 * Ensures robustness by never losing the original code and always attempting
 * to provide a fix before giving up.
 * 
 * 3-Tier Strategy:
 * Tier 1: Try full LLM fix
 * Tier 2: Try template-based simple fix
 * Tier 3: Try alternative template
 * Fallback: Return original code with error context
 * 
 * Key Principles:
 * - Never corrupt original code
 * - Always preserve error context
 * - Document rollback reason
 * - Enable retry logic downstream
 * - Track rollback metrics
 */

const fs = require('fs');
const path = require('path');

/**
 * Rollback state tracker
 * 
 * Maintains history of fix attempts for debugging and recovery
 */
class RollbackState {
  constructor(originalCode, finding) {
    this.originalCode = originalCode;
    this.finding = finding;
    this.attempts = [];
    this.currentCode = originalCode;
    this.rolled_back = false;
    this.rollbackReason = null;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Record a fix attempt
   */
  recordAttempt(strategy, fixedCode, success, error = null) {
    this.attempts.push({
      strategy,
      fixedCode,
      success,
      error,
      timestamp: new Date().toISOString(),
      codeChanged: fixedCode !== this.originalCode
    });
    
    if (success) {
      this.currentCode = fixedCode;
    }
  }

  /**
   * Rollback to original code
   */
  rollback(reason) {
    if (this.rolled_back) {
      return; // Already rolled back
    }

    this.currentCode = this.originalCode;
    this.rolled_back = true;
    this.rollbackReason = reason;
  }

  /**
   * Get rollback state
   */
  getState() {
    return {
      originalCode: this.originalCode,
      currentCode: this.currentCode,
      rolled_back: this.rolled_back,
      rollbackReason: this.rollbackReason,
      attempts: this.attempts,
      totalAttempts: this.attempts.length,
      successfulAttempts: this.attempts.filter(a => a.success).length,
      failedAttempts: this.attempts.filter(a => !a.success).length
    };
  }
}

/**
 * Execute fix with 3-tier progressive fallback
 * 
 * Tier 1: Try primary fix strategy (usually LLM)
 * Tier 2: Try secondary fix strategy (usually template)
 * Tier 3: Try tertiary fix strategy (alternative template)
 * Fallback: Return original code with error
 * 
 * @param {Object} finding - Security finding
 * @param {Object} fixGenerators - Object with tier1, tier2, tier3 generator functions
 * @returns {Promise<Object>} - Result with final code or original on rollback
 */
async function executeWithFallback(finding, fixGenerators) {
  if (!finding || !fixGenerators) {
    throw new Error('Missing finding or fixGenerators');
  }

  const state = new RollbackState(finding.code, finding);

  try {
    // Tier 1: Try primary fix strategy
    if (fixGenerators.tier1) {
      try {
        const result = await fixGenerators.tier1(finding);
        state.recordAttempt('tier1-primary', result.fixedCode, result.success, result.error);

        if (result.success && result.fixedCode !== finding.code) {
          return buildSuccessResult(finding, result, 'tier1-primary', state);
        }
      } catch (error) {
        state.recordAttempt('tier1-primary', finding.code, false, error.message);
      }
    }

    // Tier 2: Try secondary fix strategy (fallback)
    if (fixGenerators.tier2) {
      try {
        const result = await fixGenerators.tier2(finding);
        state.recordAttempt('tier2-fallback', result.fixedCode, result.success, result.error);

        if (result.success && result.fixedCode !== finding.code) {
          return buildSuccessResult(finding, result, 'tier2-fallback', state);
        }
      } catch (error) {
        state.recordAttempt('tier2-fallback', finding.code, false, error.message);
      }
    }

    // Tier 3: Try tertiary fix strategy (alternative)
    if (fixGenerators.tier3) {
      try {
        const result = await fixGenerators.tier3(finding);
        state.recordAttempt('tier3-alternative', result.fixedCode, result.success, result.error);

        if (result.success && result.fixedCode !== finding.code) {
          return buildSuccessResult(finding, result, 'tier3-alternative', state);
        }
      } catch (error) {
        state.recordAttempt('tier3-alternative', finding.code, false, error.message);
      }
    }

    // All tiers failed - rollback to original
    state.rollback('All fix strategies failed');
    return buildRollbackResult(finding, state);

  } catch (error) {
    state.rollback(`Unexpected error: ${error.message}`);
    return buildRollbackResult(finding, state);
  }
}

/**
 * Build success result
 * 
 * @private
 */
function buildSuccessResult(finding, result, strategy, state) {
  return {
    success: true,
    code: result.fixedCode,
    originalCode: state.originalCode,
    issueType: finding.issueType,
    file: finding.file,
    line: finding.line,
    strategy: strategy,
    rolled_back: false,
    attempts: state.attempts,
    confidence: result.confidence || 0.8,
    explanation: result.explanation || `Fix applied via ${strategy}`,
    effort: result.effort || 'MEDIUM',
    needsValidation: true
  };
}

/**
 * Build rollback result (all tiers failed)
 * 
 * @private
 */
function buildRollbackResult(finding, state) {
  return {
    success: false,
    code: state.originalCode,
    originalCode: state.originalCode,
    issueType: finding.issueType,
    file: finding.file,
    line: finding.line,
    strategy: 'rollback-all-failed',
    rolled_back: true,
    rollbackReason: state.rollbackReason,
    attempts: state.attempts,
    error: 'All fix strategies failed, reverting to original code',
    recommendation: 'Manual review required - automatic fixing unsuccessful',
    needsValidation: false
  };
}

/**
 * Validate fix before test execution
 * 
 * Pre-test checks to catch obvious issues early
 * 
 * @param {string} originalCode - Original vulnerable code
 * @param {string} fixedCode - Generated fixed code
 * @returns {Object} - Validation result
 */
function preTestValidation(originalCode, fixedCode) {
  const issues = [];
  let score = 100;

  // Check 1: Code changed
  if (originalCode === fixedCode) {
    issues.push('Code unchanged');
    score -= 40;
  }

  // Check 2: Non-empty
  if (!fixedCode || fixedCode.trim().length === 0) {
    issues.push('Generated code is empty');
    score -= 50;
  }

  // Check 3: Balanced braces
  const originalBraces = countCharacter(originalCode, '{') - countCharacter(originalCode, '}');
  const fixedBraces = countCharacter(fixedCode, '{') - countCharacter(fixedCode, '}');
  
  if (Math.abs(originalBraces - fixedBraces) > 2) {
    issues.push('Unbalanced braces detected');
    score -= 25;
  }

  // Check 4: Code size reasonable (not more than 3x)
  const sizeRatio = fixedCode.length / originalCode.length;
  if (sizeRatio > 3) {
    issues.push(`Code bloat: ${(sizeRatio * 100).toFixed(0)}% (max 300%)`);
    score -= 15;
  }

  // Check 5: Size not reduced drastically (not less than 30%)
  if (sizeRatio < 0.3) {
    issues.push('Code shrunk too much - logic may be lost');
    score -= 20;
  }

  // Check 6: No obvious undefined keywords
  const undefinedMatches = fixedCode.match(/\bundefined\b/g) || [];
  if (undefinedMatches.length > 2) {
    issues.push('Multiple undefined references');
    score -= 20;
  }

  return {
    valid: score >= 50,
    score: Math.max(0, score),
    issues
  };
}

/**
 * Helper: Count character occurrences
 * 
 * @private
 */
function countCharacter(str, char) {
  return (str.match(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

/**
 * Validate fix after test execution
 * 
 * Post-test checks based on actual test results
 * 
 * @param {Object} testResult - Result from test execution
 * @param {boolean} testResult.success - Whether tests passed
 * @param {number} testResult.passed - Number of tests passed
 * @param {number} testResult.failed - Number of tests failed
 * @returns {Object} - Validation result
 */
function postTestValidation(testResult) {
  if (!testResult) {
    return {
      valid: false,
      score: 0,
      issues: ['No test result provided']
    };
  }

  let score = 100;
  const issues = [];

  // Check 1: Tests passed
  if (!testResult.success) {
    issues.push(`Tests failed: ${testResult.failed} failures`);
    score -= 50;
  }

  // Check 2: All tests passed (not just some)
  if (testResult.passed < testResult.total) {
    issues.push(`Partial success: ${testResult.passed}/${testResult.total}`);
    score -= 30;
  }

  // Check 3: No timeout
  if (testResult.timeout) {
    issues.push('Test execution timeout');
    score -= 40;
  }

  // Check 4: No errors
  if (testResult.errors && testResult.errors.length > 0) {
    issues.push(`Test errors: ${testResult.errors.join(', ')}`);
    score -= 25;
  }

  return {
    valid: score >= 60,
    score: Math.max(0, score),
    issues,
    testsPassed: testResult.passed,
    testsFailed: testResult.failed
  };
}

/**
 * Analyze rollback to make recovery decisions
 * 
 * @param {Object} rollbackState - Rollback state from executeWithFallback
 * @returns {Object} - Recovery analysis
 */
function analyzeRollback(rollbackState) {
  const state = rollbackState.getState ? rollbackState.getState() : rollbackState;

  return {
    attemptCount: state.attempts.length,
    successCount: state.attempts.filter(a => a.success).length,
    failureCount: state.attempts.filter(a => !a.success).length,
    failureReasons: state.attempts
      .filter(a => !a.success && a.error)
      .map(a => `${a.strategy}: ${a.error}`),
    suggestedActions: generateRecoveryActions(state),
    canRetry: state.failureCount < 3 && state.successCount === 0,
    requiresManualReview: true
  };
}

/**
 * Generate recovery actions
 * 
 * @private
 */
function generateRecoveryActions(state) {
  const actions = [];

  if (state.attempts.length === 0) {
    actions.push('Check if fix generators are configured correctly');
  }

  const tier1Failures = state.attempts.filter(a => a.strategy === 'tier1-primary' && !a.success);
  if (tier1Failures.length > 0) {
    actions.push('Primary strategy failed - review LLM configuration');
  }

  const tier2Failures = state.attempts.filter(a => a.strategy === 'tier2-fallback' && !a.success);
  if (tier2Failures.length > 0) {
    actions.push('Fallback strategy failed - check template availability');
  }

  actions.push('Manual code review required for this issue');
  actions.push('Consider implementing custom fixer for this issue type');

  return actions;
}

/**
 * Create a recoverable checkpoint
 * 
 * Save state to allow recovery if process crashes
 * 
 * @param {Object} state - Current state
 * @param {string} outputFile - File to save checkpoint
 */
function saveCheckpoint(state, outputFile) {
  if (!outputFile) {
    return; // Checkpointing disabled
  }

  try {
    const checkpoint = {
      timestamp: new Date().toISOString(),
      state: state.getState ? state.getState() : state,
      version: '1.0'
    };

    fs.writeFileSync(outputFile, JSON.stringify(checkpoint, null, 2));
  } catch (error) {
    console.error(`Failed to save checkpoint: ${error.message}`);
  }
}

/**
 * Restore from checkpoint
 * 
 * @param {string} checkpointFile - File to restore from
 * @returns {Object|null} - Restored state or null
 */
function restoreCheckpoint(checkpointFile) {
  if (!checkpointFile || !fs.existsSync(checkpointFile)) {
    return null;
  }

  try {
    const data = fs.readFileSync(checkpointFile, 'utf-8');
    const checkpoint = JSON.parse(data);
    return checkpoint.state;
  } catch (error) {
    console.error(`Failed to restore checkpoint: ${error.message}`);
    return null;
  }
}

/**
 * Report rollback to external system (GitHub, logging, etc.)
 * 
 * @param {Object} rollbackInfo - Rollback information
 * @param {string} repository - Repository URL
 * @param {string} branch - Branch name
 */
async function reportRollback(rollbackInfo, repository = null, branch = null) {
  const report = {
    timestamp: new Date().toISOString(),
    type: 'rollback-event',
    repository,
    branch,
    issue: rollbackInfo.issueType,
    file: rollbackInfo.file,
    line: rollbackInfo.line,
    failureCount: rollbackInfo.attempts ? rollbackInfo.attempts.length : 0,
    rollbackReason: rollbackInfo.rollbackReason,
    recommendation: rollbackInfo.recommendation
  };

  // TODO: Send report to external system
  // Examples:
  // - GitHub Issue comment
  // - Logging service (CloudWatch, Datadog, etc.)
  // - Internal tracking system
  // - Slack notification

  return report;
}

// Export public API
module.exports = {
  RollbackState,
  executeWithFallback,
  preTestValidation,
  postTestValidation,
  analyzeRollback,
  saveCheckpoint,
  restoreCheckpoint,
  reportRollback
};
