/**
 * Phase 3.4: Template-Based Fix Generation System
 * 
 * Provides pattern-based fix templates for common vulnerability types.
 * Each template includes:
 * - Pattern detection (what to look for)
 * - Fix strategy (how to fix it)
 * - Code transformation (apply the fix)
 * 
 * MVP Templates (5 priority types):
 * 1. SQL Injection - Parameterized queries
 * 2. Null Pointer Dereference - Null checks
 * 3. Command Injection - Safe command execution
 * 4. Hard-coded Credentials - Environment variables
 * 5. Resource Leak - Try-finally/try-with-resources
 */

const fs = require('fs');
const path = require('path');

/**
 * Load fix template for issue type
 * @param {String} issueType - Issue category (e.g., 'sql-injection')
 * @returns {Object} - Template object or null
 */
exports.loadTemplate = (issueType) => {
  const templates = {
    'sql-injection': {
      name: 'SQL Injection Fix',
      description: 'Convert string concatenation to parameterized queries',
      language: ['java', 'javascript', 'python'],
      pattern: /SELECT|INSERT|UPDATE|DELETE.*[\+\s]+.*\w+/i,
      strategy: 'parameterized-query',
      difficulty: 'medium',
      applier: applySqlInjectionFix
    },
    'null-pointer-dereference': {
      name: 'Null Pointer Check',
      description: 'Add null/undefined checks before object access',
      language: ['java', 'javascript', 'python'],
      pattern: /\.\w+\(|\[\w+\]|\.\w+/,
      strategy: 'null-check',
      difficulty: 'low',
      applier: applyNullPointerFix
    },
    'command-injection': {
      name: 'Command Injection Fix',
      description: 'Use safe command execution (array-based, no shell)',
      language: ['java', 'javascript'],
      pattern: /exec\(|Runtime\.getRuntime|spawn|shell/i,
      strategy: 'safe-exec',
      difficulty: 'medium',
      applier: applyCommandInjectionFix
    },
    'hard-coded-credentials': {
      name: 'Credentials to Environment',
      description: 'Move hardcoded credentials to environment variables',
      language: ['java', 'javascript', 'python'],
      pattern: /password|secret|api.?key|token|credential/i,
      strategy: 'env-variable',
      difficulty: 'low',
      applier: applyCredentialsFix
    },
    'resource-leak': {
      name: 'Resource Cleanup',
      description: 'Add proper resource cleanup (try-finally or try-with)',
      language: ['java', 'javascript'],
      pattern: /new.*Stream|new.*Reader|new.*Connection|open\(/i,
      strategy: 'resource-cleanup',
      difficulty: 'medium',
      applier: applyResourceLeakFix
    }
  };

  return templates[issueType] || null;
};

/**
 * Apply fix template to code
 * @param {String} issueType - Issue category
 * @param {String} code - Original source code
 * @param {Object} finding - Finding details (line, description, etc.)
 * @returns {Object} - { success, fixedCode, strategy, details }
 */
exports.applyTemplate = (issueType, code, finding = {}) => {
  const result = {
    success: false,
    issueType: issueType,
    fixedCode: null,
    strategy: null,
    details: '',
    appliedAtLine: finding.line || 0,
    codeModifications: 0
  };

  const template = exports.loadTemplate(issueType);
  if (!template) {
    result.details = `No template found for issue type: ${issueType}`;
    return result;
  }

  try {
    const fixedCode = template.applier(code, finding);
    if (fixedCode && fixedCode !== code) {
      result.success = true;
      result.fixedCode = fixedCode;
      result.strategy = template.strategy;
      result.details = `Applied ${template.name}`;
      result.codeModifications = 1;
    } else {
      result.details = 'Template could not be applied to this code pattern';
    }
  } catch (error) {
    result.details = `Error applying template: ${error.message}`;
  }

  return result;
};

/**
 * Validate fix quality (basic checks)
 * @param {String} original - Original code
 * @param {String} fixed - Fixed code
 * @returns {Object} - Validation result
 */
exports.validateFixQuality = (original, fixed) => {
  const result = {
    valid: false,
    issues: [],
    score: 0
  };

  if (!fixed || fixed.length === 0) {
    result.issues.push('Fixed code is empty');
    return result;
  }

  // Check 1: Fix changed the code
  if (fixed === original) {
    result.issues.push('No changes were made');
    return result;
  }

  // Check 2: Preserve basic structure (simple heuristic)
  const originalBraces = (original.match(/[{}]/g) || []).length;
  const fixedBraces = (fixed.match(/[{}]/g) || []).length;
  if (Math.abs(originalBraces - fixedBraces) > 10) {
    result.issues.push('Significant structural changes detected');
  }

  // Check 3: No obvious syntax errors
  if (fixed.includes('undefined') && !original.includes('undefined')) {
    result.issues.push('Potential undefined reference introduced');
  }

  // Check 4: Reasonable code length increase (< 50%)
  const lengthRatio = fixed.length / original.length;
  if (lengthRatio > 1.5) {
    result.issues.push('Code size increased significantly (> 50%)');
  }

  // Score calculation
  result.score = 100 - (result.issues.length * 20);
  result.valid = result.score >= 60 && result.issues.length === 0;

  return result;
};

/**
 * Get recommended effort level for template
 * @param {String} issueType - Issue category
 * @returns {String} - 'MINIMAL', 'SMALL', 'MEDIUM', 'LARGE'
 */
exports.getEffortEstimate = (issueType) => {
  const efforts = {
    'sql-injection': 'SMALL',
    'null-pointer-dereference': 'MINIMAL',
    'command-injection': 'SMALL',
    'hard-coded-credentials': 'MINIMAL',
    'resource-leak': 'SMALL'
  };

  return efforts[issueType] || 'MEDIUM';
};

/**
 * Get description for template
 * @param {String} issueType - Issue category
 * @returns {String} - Human-readable description
 */
exports.getDescription = (issueType) => {
  const descriptions = {
    'sql-injection': `
Convert SQL string concatenation to parameterized queries to prevent injection attacks.

Example:
  Before: "SELECT * FROM users WHERE id = " + id
  After:  "SELECT * FROM users WHERE id = ?" with parameter binding

Security Impact: Eliminates SQL injection vulnerability
Difficulty: Medium - Requires identifying all SQL queries
    `,
    'null-pointer-dereference': `
Add null/undefined checks before accessing object properties or methods.

Example:
  Before: user.getName()
  After:  if (user != null) { user.getName() }

Correctness Impact: Prevents null pointer exceptions
Difficulty: Low - Add simple null checks
    `,
    'command-injection': `
Replace shell-based command execution with safe array-based execution.

Example:
  Before: Runtime.getRuntime().exec(cmd + userInput)
  After:  ProcessBuilder pb = new ProcessBuilder("cmd", userInput)

Security Impact: Eliminates command injection vulnerability
Difficulty: Medium - Refactor command construction
    `,
    'hard-coded-credentials': `
Move hardcoded credentials to environment variables or secure vaults.

Example:
  Before: password = "secret123"
  After:  password = System.getenv("DB_PASSWORD")

Security Impact: Prevents credential exposure in source code
Difficulty: Low - Use environment variables
    `,
    'resource-leak': `
Add proper resource cleanup using try-finally or try-with-resources.

Example:
  Before: FileReader fr = new FileReader(file); fr.read()
  After:  try (FileReader fr = new FileReader(file)) { fr.read() }

Correctness Impact: Ensures resources are always closed
Difficulty: Medium - Wrap resource operations
    `
  };

  return descriptions[issueType] || 'No description available';
};

// ============================================================================
// TEMPLATE APPLIER FUNCTIONS
// ============================================================================

/**
 * Apply SQL Injection fix
 * @param {String} code - Source code
 * @param {Object} finding - Finding details
 * @returns {String} - Fixed code
 */
function applySqlInjectionFix(code, finding) {
  // Simple pattern: Find string concatenation in SQL queries
  // Look for: "SELECT ... " + variable
  
  // Pattern: string literal followed by + operator and variable
  const pattern = /("SELECT[^"]*?"\s*\+\s*\w+)/gi;
  
  let fixed = code;
  let matches = code.match(pattern);
  
  if (matches) {
    for (const match of matches) {
      // Extract the SQL part and variable
      const parts = match.split('+');
      const sqlPart = parts[0].trim();
      const varPart = parts[1].trim();
      
      // Replace with parameterized version
      const parameterized = sqlPart.replace(/([^"]*)"/, (m, sql) => {
        return sql + '?"\nwith bound parameter: ' + varPart;
      });
      
      fixed = fixed.replace(match, parameterized);
    }
  }
  
  return fixed;
}

/**
 * Apply Null Pointer fix
 * @param {String} code - Source code
 * @param {Object} finding - Finding details
 * @returns {String} - Fixed code
 */
function applyNullPointerFix(code, finding) {
  // Find object method calls or property access without null checks
  // Simple pattern: object.method() or object.property
  
  const lines = code.split('\n');
  let fixed = lines.map((line, index) => {
    // If this is near the finding line, add null check
    if (finding.line && Math.abs(index + 1 - finding.line) <= 2) {
      // Pattern: variable followed by . and identifier
      const hasObjectAccess = /^\s*\w+\.\w+/.test(line);
      
      if (hasObjectAccess) {
        const indentation = line.match(/^\s*/)[0];
        const varName = line.match(/^\s*(\w+)\./)?.[1];
        
        if (varName) {
          // Add null check before the line
          return `${indentation}if (${varName} != null) {\n${line}\n${indentation}}`;
        }
      }
    }
    return line;
  });
  
  return fixed.join('\n');
}

/**
 * Apply Command Injection fix
 * @param {String} code - Source code
 * @param {Object} finding - Finding details
 * @returns {String} - Fixed code
 */
function applyCommandInjectionFix(code, finding) {
  // Replace Runtime.exec(string) with ProcessBuilder array-based
  let fixed = code;
  
  // Pattern: Runtime.getRuntime().exec(string)
  fixed = fixed.replace(
    /Runtime\.getRuntime\(\)\.exec\(\s*([^)]+)\s*\)/g,
    (match, arg) => {
      // Extract command and arguments
      const cmd = arg.split('+').map(s => s.trim()).join(', ');
      return `new ProcessBuilder(${cmd}).start()`;
    }
  );
  
  // Pattern: spawn or shell functions
  fixed = fixed.replace(
    /exec\(\s*["'](.+)["']\s*\+\s*(\w+)\s*\)/g,
    (match, cmd, arg) => {
      return `execFile('${cmd}', ['${arg}'])`;
    }
  );
  
  return fixed;
}

/**
 * Apply Hard-coded Credentials fix
 * @param {String} code - Source code
 * @param {Object} finding - Finding details
 * @returns {String} - Fixed code
 */
function applyCredentialsFix(code, finding) {
  let fixed = code;
  
  // Pattern: password = "value" or similar
  fixed = fixed.replace(
    /(\w*password\w*)\s*=\s*["']([^"']+)["']/gi,
    (match, varName, value) => {
      const envVar = varName.toUpperCase();
      return `${varName} = System.getenv("${envVar}") // or process.env.${envVar}`;
    }
  );
  
  // Pattern: api_key = "value"
  fixed = fixed.replace(
    /(api.?key)\s*=\s*["']([^"']+)["']/gi,
    (match, varName, value) => {
      const envVar = varName.toUpperCase().replace(/[-]/g, '_');
      return `${varName} = System.getenv("${envVar}") // or process.env.${envVar}`;
    }
  );
  
  // Pattern: secret = "value"
  fixed = fixed.replace(
    /(secret)\s*=\s*["']([^"']+)["']/gi,
    (match, varName, value) => {
      return `${varName} = System.getenv("SECRET") // or process.env.SECRET`;
    }
  );
  
  return fixed;
}

/**
 * Apply Resource Leak fix
 * @param {String} code - Source code
 * @param {Object} finding - Finding details
 * @returns {String} - Fixed code
 */
function applyResourceLeakFix(code, finding) {
  let fixed = code;
  
  // Pattern: new FileReader/Stream without try-with
  fixed = fixed.replace(
    /(\w+)\s*=\s*new\s+(FileReader|FileInputStream|FileWriter|FileOutputStream)\s*\([^)]+\);/g,
    (match, varName, type) => {
      return `try (${type} ${varName} = new ${type}(...)) {`;
    }
  );
  
  // Pattern: open() calls
  fixed = fixed.replace(
    /(\w+)\s*=\s*(\w+)\.open\s*\([^)]*\);/g,
    (match, varName, obj) => {
      return `try (${varName} = ${obj}.open(...)) {`;
    }
  );
  
  // Add closing brace if not present
  if (fixed.includes('try (') && !fixed.includes('}')) {
    fixed += '\n}';
  }
  
  return fixed;
}

// Export applier functions for testing
exports.applySqlInjectionFix = applySqlInjectionFix;
exports.applyNullPointerFix = applyNullPointerFix;
exports.applyCommandInjectionFix = applyCommandInjectionFix;
exports.applyCredentialsFix = applyCredentialsFix;
exports.applyResourceLeakFix = applyResourceLeakFix;
