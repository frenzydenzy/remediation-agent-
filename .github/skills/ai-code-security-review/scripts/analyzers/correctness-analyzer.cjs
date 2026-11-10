/**
 * Correctness Pattern Analyzer
 * Detects correctness issues and common programming errors in changed code
 */

const CORRECTNESS_PATTERNS = {
  // Null Pointer Dereference Risks
  nullPointerRisks: [
    {
      name: 'Potential Null Pointer Access',
      pattern: /\w+\s*\.\s*\w+\s*\(|(\w+)\.get\(\s*\)(?!\s*[?])|\.length\s*[,;)](?!\s*[?])/g,
      severity: 'HIGH',
      message: 'Variable may be null before method call or property access',
      recommendation: 'Add null checks or use Optional; enable @NonNull annotations',
    },
  ],

  // Resource Leak Risks
  resourceLeaks: [
    {
      name: 'Potential Resource Leak',
      pattern: /new\s+(BufferedReader|FileReader|FileInputStream|Connection|Statement)\s*\(|getConnection\s*\(\)|createStatement\s*\(\)(?!\s*try)/gi,
      severity: 'HIGH',
      message: 'Resource created without try-with-resources or explicit close',
      recommendation: 'Use try-with-resources or try-finally block with explicit close()',
    },
  ],

  // Unchecked Cast Risks
  uncheckedCasts: [
    {
      name: 'Unchecked Type Cast',
      pattern: /\(\s*\w+\s*\)\s*\w+(?!\s*instanceof)/g,
      severity: 'MEDIUM',
      message: 'Type cast without preceding instanceof check',
      recommendation: 'Add instanceof check before cast or use Optional',
    },
  ],

  // Thread Safety Issues
  threadSafetyIssues: [
    {
      name: 'Non-threadsafe Collection',
      pattern: /new\s+(HashMap|ArrayList|HashSet|TreeMap)\s*\(|this\.(\w+)\s*=\s*new\s+(HashMap|ArrayList)/gi,
      severity: 'MEDIUM',
      message: 'Mutable collection stored without synchronization; unsafe for multi-threaded access',
      recommendation: 'Use Collections.synchronizedMap/List, ConcurrentHashMap, or thread-safe collections',
    },
  ],

  // Unused Variables
  unusedVariables: [
    {
      name: 'Unused Variable Assignment',
      pattern: /\w+\s+\w+\s*=\s*[^;]+;(?!\s*[^}]*\1)/g,
      severity: 'LOW',
      message: 'Variable assigned but never used',
      recommendation: 'Remove unused variable or use it in the code',
    },
  ],

  // Missing Break in Switch
  missingBreak: [
    {
      name: 'Switch Case without Break',
      pattern: /case\s+[\w.]+\s*:(?!\s*break\s*;|return\s+[^;]+;|throw\s+new)/i,
      severity: 'MEDIUM',
      message: 'Switch case falls through to next case (potential logic error)',
      recommendation: 'Add break statement or explicit fall-through comment',
    },
  ],

  // Comparison with ==
  unsafeEquality: [
    {
      name: 'String Comparison with ==',
      pattern: /['"]\w+['"]\s*==\s*\w+|\w+\s*==\s*['"]\w+['"]|String.*==|==\s*\w+\s*instanceof/g,
      severity: 'MEDIUM',
      message: 'Using == for string comparison; should use .equals()',
      recommendation: 'Use .equals() or .equalsIgnoreCase() for string comparison',
    },
  ],

  // Exception Swallowing
  exceptionSwallowing: [
    {
      name: 'Empty or Meaningless Catch Block',
      pattern: /catch\s*\(\s*\w+\s+\w+\s*\)\s*\{\s*\}|catch\s*\(\s*\w+\s+\w+\s*\)\s*\{\s*\/\/\s*(ignore|skip|do nothing)/gi,
      severity: 'MEDIUM',
      message: 'Catch block is empty or has no meaningful error handling',
      recommendation: 'Log the exception or handle it appropriately; document if intentional',
    },
  ],
};

/**
 * Analyze file for correctness patterns
 * @param {string} filePath - File path being analyzed
 * @param {string} content - File content to analyze
 * @param {string} language - Programming language (default: java)
 * @returns {Array<Object>} - Array of findings
 */
function analyzeCorrectnessPatterns(filePath, content, language = 'java') {
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
  for (const [category, patterns] of Object.entries(CORRECTNESS_PATTERNS)) {
    for (const patternDef of patterns) {
      try {
        const regex = new RegExp(patternDef.pattern.source, 'gmi');
        let match;

        while ((match = regex.exec(content)) !== null) {
          // Skip false positives in comments
          const precedingText = content.substring(0, match.index);
          const lineStart = precedingText.lastIndexOf('\n') + 1;
          const lineContent = content.substring(lineStart, match.index + match[0].length);

          // Skip if in comment
          if (lineContent.includes('//') && lineContent.indexOf('//') < lineContent.indexOf(match[0])) {
            continue;
          }

          // Calculate line number
          const lineNumber = precedingText.split('\n').length;

          findings.push({
            file: filePath,
            line: lineNumber,
            category: category,
            severity: patternDef.severity,
            title: patternDef.name,
            message: patternDef.message,
            recommendation: patternDef.recommendation,
            evidence: match[0].substring(0, 100),
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

module.exports = {
  analyzeCorrectnessPatterns,
  CORRECTNESS_PATTERNS,
};
