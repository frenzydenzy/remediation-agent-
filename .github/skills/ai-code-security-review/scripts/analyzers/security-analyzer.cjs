/**
 * Security Pattern Analyzer
 * Detects security vulnerabilities and insecure patterns in changed code
 */

const SECURITY_PATTERNS = {
  // SQL Injection patterns
  sqlInjection: [
    {
      name: 'SQL Concatenation Risk',
      pattern: /query\s*[=:]\s*['""].*\+\s*\w+|sql\s*[=:]\s*['""].*\+\s*\w+|"\s*\+\s*\w+\s*\+\s*".*SELECT|"\s*\+\s*\w+\s*\+\s*".*UPDATE/gi,
      severity: 'CRITICAL',
      message: 'Potential SQL injection: string concatenation in query construction',
      recommendation: 'Use PreparedStatement with parameterized queries',
    },
  ],

  // Command Injection patterns
  commandInjection: [
    {
      name: 'Runtime.exec with potentially unsanitized input',
      pattern: /Runtime\.getRuntime\(\)\.exec\s*\(\s*[a-zA-Z_]\w*\s*\)|Runtime\.exec\s*\(\s*[a-zA-Z_]\w*\s*\)/g,
      severity: 'CRITICAL',
      message: 'Potential command injection: Runtime.exec with variable argument',
      recommendation: 'Use ProcessBuilder with array arguments, validate and sanitize input',
    },
  ],

  // Hard-coded Credentials
  hardCodedCredentials: [
    {
      name: 'Hard-coded Password or API Key',
      pattern: /password\s*[=:]\s*['""][\w!@#$%^&*]{4,}|apiKey\s*[=:]\s*['""][\w-]{10,}|secret\s*[=:]\s*['""][\w!@#$%^&*]{4,}/gi,
      severity: 'CRITICAL',
      message: 'Hard-coded credentials or API keys detected in source code',
      recommendation: 'Use environment variables, secrets management service, or configuration files',
    },
  ],

  // Weak Hash Algorithm
  weakHashing: [
    {
      name: 'Weak Hash Algorithm (MD5 or SHA-1)',
      pattern: /MessageDigest\.getInstance\s*\(\s*['""]MD5|MessageDigest\.getInstance\s*\(\s*['""]SHA-1|MessageDigest\.getInstance\s*\(\s*['""]SHA["']\s*\)/g,
      severity: 'HIGH',
      message: 'Weak cryptographic hash algorithm detected (MD5 or SHA-1)',
      recommendation: 'Use SHA-256 or SHA-512 for security-critical hashing',
    },
  ],

  // ECB Mode (Block Cipher)
  ecbMode: [
    {
      name: 'Insecure ECB Cipher Mode',
      pattern: /Cipher\.getInstance\s*\(\s*['""].*\/ECB\/|MODE_ECB|ECB/g,
      severity: 'HIGH',
      message: 'ECB (Electronic Code Book) cipher mode is cryptographically weak',
      recommendation: 'Use CBC, GCM, or authenticated encryption mode instead',
    },
  ],

  // XXE Vulnerability
  xxeVulnerability: [
    {
      name: 'XXE Vulnerability: Unsafe XML Parser',
      pattern: /DocumentBuilderFactory\.newInstance|SAXParserFactory\.newInstance|XMLInputFactory\.newInstance|new.*XMLParser/g,
      severity: 'HIGH',
      message: 'XML parser created without XXE protection',
      recommendation: 'Disable external entities and DTD processing in XML parser configuration',
    },
  ],

  // Missing Input Validation
  missingValidation: [
    {
      name: 'Method accepts String parameter without validation',
      pattern: /public\s+\w+\s+\w+\s*\([^)]*\bString\b[^)]*\)\s*\{/g,
      severity: 'MEDIUM',
      message: 'Method parameter is not validated for null, empty, or malicious input',
      recommendation: 'Add input validation checks (null checks, length, format)',
    },
  ],
};

/**
 * Analyze file for security patterns
 * @param {string} filePath - File path being analyzed
 * @param {string} content - File content to analyze
 * @param {string} language - Programming language (default: java)
 * @returns {Array<Object>} - Array of findings
 */
function analyzeSecurityPatterns(filePath, content, language = 'java') {
  const findings = [];

  // Only analyze code files
  if (!filePath.match(/\.(java|py|js|ts|cs|rb|go)$/i)) {
    return findings;
  }

  // For now, focus on Java
  if (!filePath.endsWith('.java')) {
    return findings;
  }

  // Analyze each pattern category
  for (const [category, patterns] of Object.entries(SECURITY_PATTERNS)) {
    for (const patternDef of patterns) {
      try {
        const regex = new RegExp(patternDef.pattern.source, 'gmi');
        let match;

        while ((match = regex.exec(content)) !== null) {
          // Calculate line number
          const precedingText = content.substring(0, match.index);
          const lineNumber = precedingText.split('\n').length;

          findings.push({
            file: filePath,
            line: lineNumber,
            category: category,
            severity: patternDef.severity,
            title: patternDef.name,
            message: patternDef.message,
            recommendation: patternDef.recommendation,
            evidence: match[0].substring(0, 120),
          });
        }
      } catch (e) {
        // Skip patterns that fail to compile
        continue;
      }
    }
  }

  return findings;
}

/**
 * Rank findings by severity
 * @param {Array} findings - Array of finding objects
 * @returns {Array} - Sorted findings (CRITICAL first)
 */
function rankFindings(findings) {
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  return findings.sort((a, b) => {
    const aSeverity = severityOrder[a.severity] !== undefined ? severityOrder[a.severity] : 999;
    const bSeverity = severityOrder[b.severity] !== undefined ? severityOrder[b.severity] : 999;

    if (aSeverity !== bSeverity) {
      return aSeverity - bSeverity;
    }

    // Secondary sort by file and line
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file);
    }

    return a.line - b.line;
  });
}

module.exports = {
  analyzeSecurityPatterns,
  rankFindings,
  SECURITY_PATTERNS,
};
