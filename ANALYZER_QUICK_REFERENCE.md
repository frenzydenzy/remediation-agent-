# Phase 3.2: Analyzer Quick Reference

## Using Enhanced Analysis

### In Code
```javascript
const { runEnhancedAnalysis } = require('./analyzers/enhanced-analysis.cjs');

const snapshot = {
  files: [
    { path: 'UserService.java', content: '...' },
    { path: 'UserServiceTest.java', content: '...' }
  ]
};

const result = runEnhancedAnalysis(snapshot);
// result.totalFindings: number
// result.findings: array of all findings
// result.analysisResults.security.findings: security-specific findings
// result.analysisResults.correctness.findings: correctness-specific findings
// result.analysisResults.testCoverage: coverage analysis
// result.analysisResults.architecture.findings: architecture-specific findings
```

### With collect-review
```bash
# Enhanced analysis enabled by default
node collect-review.cjs --repo . --base main

# Disable analysis if needed
node collect-review.cjs --repo . --base main --no-analyze
```

## Analyzer Modules

### 1. Security Analyzer
**File**: `.github/skills/ai-code-security-review/scripts/analyzers/security-analyzer.cjs`

**Exports**:
- `analyzeSecurityPatterns(filePath, content, language)` - Returns array of security findings
- `rankFindings(findings)` - Sorts findings by severity
- `SECURITY_PATTERNS` - Pattern definitions

**Patterns Detected**:
| Category | Pattern | Severity | Example |
|----------|---------|----------|---------|
| SQL Injection | String concatenation in queries | CRITICAL | `"SELECT * FROM users WHERE id = " + userId` |
| Command Injection | Runtime.exec with variables | CRITICAL | `Runtime.getRuntime().exec(cmd)` |
| Hard-coded Credentials | Passwords/keys in code | CRITICAL | `password = "myPass123"` |
| Weak Hashing | MD5, SHA-1 algorithms | HIGH | `MessageDigest.getInstance("MD5")` |
| ECB Cipher Mode | Weak encryption mode | HIGH | `Cipher.getInstance("AES/ECB/PKCS5")` |
| XXE Vulnerability | Unsafe XML parsing | HIGH | `DocumentBuilderFactory.newInstance()` |
| Missing Validation | Unvalidated parameters | MEDIUM | `public void process(String input) { }` |

### 2. Correctness Analyzer
**File**: `.github/skills/ai-code-security-review/scripts/analyzers/correctness-analyzer.cjs`

**Exports**:
- `analyzeCorrectnessPatterns(filePath, content, language)` - Returns array of correctness findings
- `CORRECTNESS_PATTERNS` - Pattern definitions

**Patterns Detected**:
| Category | Pattern | Severity | Example |
|----------|---------|----------|---------|
| Null Pointer Risk | Dereference without null check | HIGH | `obj.method()` without check |
| Resource Leak | Unclosed resources | HIGH | `new FileReader(file)` without try-with-resources |
| Unchecked Cast | Cast without instanceof | MEDIUM | `(String) obj` without instanceof |
| Thread Safety | Non-thread-safe collections | MEDIUM | `Map map = new HashMap(); shared = map;` |
| Missing Break | Fall-through in switch | MEDIUM | `case X: code; case Y: code;` |
| String Comparison | Using == instead of equals | MEDIUM | `if (str == "value")` |
| Exception Swallowing | Empty catch block | MEDIUM | `catch (Exception e) { }` |
| Unused Variables | Assigned but never used | LOW | `String unused = getValue();` |

### 3. Test Coverage Analyzer
**File**: `.github/skills/ai-code-security-review/scripts/analyzers/test-coverage-analyzer.cjs`

**Exports**:
- `analyzeTestCoverage(sourceFile, sourceContent, testFile, testContent)` - Returns coverage result
- `analyzeAllTestCoverage(files)` - Returns aggregated coverage
- `findTestFile(sourceFile, allFiles)` - Matches test to source file
- `extractPublicMethods(content)` - Extracts public method names

**Output Structure**:
```javascript
{
  sourceFile: 'UserService.java',
  testFile: 'UserServiceTest.java',
  publicMethods: ['createUser', 'deleteUser', 'getUser'],
  testedMethods: ['createUser', 'getUser'],
  coverage: 66.7,  // percentage
  findings: [
    {
      title: 'Public Method Appears Untested: deleteUser',
      severity: 'LOW'
    }
  ]
}
```

**Test File Matching**:
- `MyClass.java` → `MyClassTest.java`
- `MyClass.java` → `MyClassUnitTest.java`
- `MyClass.java` → `TestMyClass.java`
- `src/main/java/MyClass.java` → `src/test/java/MyClassTest.java`

### 4. Architecture Analyzer
**File**: `.github/skills/ai-code-security-review/scripts/analyzers/architecture-analyzer.cjs`

**Exports**:
- `analyzeArchitecture(files)` - Returns architecture analysis
- `detectCircularDependencies(files)` - Detects bidirectional imports
- `detectLayeringViolations(files)` - Detects cross-layer imports
- `detectForbiddenImports(files, patterns)` - Detects blacklisted imports
- `detectUnusedImports(files)` - Detects unused imports
- `extractImports(content)` - Extracts package imports
- `extractPackage(content)` - Extracts package declaration

**Patterns Detected**:
| Category | Pattern | Severity | Example |
|----------|---------|----------|---------|
| Circular Dependencies | Bidirectional imports | HIGH | A imports B, B imports A |
| Layering Violations | Wrong layer imports | MEDIUM | Service layer imports presentation |
| Forbidden Imports | Internal/non-API packages | MEDIUM | `import sun.misc.*` |
| Unused Imports | Imported but not used | LOW | `import java.util.List;` (unused) |

**Layer Model**:
```
presentation (highest, should not import from others except service)
    ↓
service (middle, should not import from presentation)
    ↓
persistence (lowest, should not import from others)
```

### 5. Enhanced Analysis Orchestrator
**File**: `.github/skills/ai-code-security-review/scripts/analyzers/enhanced-analysis.cjs`

**Exports**:
- `runEnhancedAnalysis(snapshot)` - Main entry point

**Input**:
```javascript
{
  files: [
    { path: 'src/main/java/...', content: '...' },
    ...
  ]
}
```

**Output**:
```javascript
{
  totalFindings: 42,
  findings: [
    {
      file: 'UserService.java',
      line: 25,
      category: 'sqlInjection',
      severity: 'CRITICAL',
      title: 'SQL Concatenation Risk',
      message: '...',
      recommendation: '...',
      evidence: '...'
    },
    ...
  ],
  analysisResults: {
    security: { findings: [...], summary: {...} },
    correctness: { findings: [...], summary: {...} },
    testCoverage: { results: [...], findings: [...], summary: {...} },
    architecture: { findings: [...], summary: {...} }
  },
  aggregateSummary: {
    security: { total: 6, critical: 2, high: 2, medium: 1, low: 1 },
    correctness: { total: 7, high: 3, medium: 3, low: 1 },
    testCoverage: { aggregateCoverage: 71.4, untertestedClasses: 2 },
    architecture: { circularDependencies: 0, layeringViolations: 1, forbiddenImports: 0, unusedImports: 5 }
  }
}
```

## Test Files

### Unit Tests
```bash
# Security analyzer
node tests/security-analyzer.test.cjs

# All analyzers
node tests/enhanced-analysis.test.cjs

# Integration with collect-review
node tests/collect-review.integration.test.cjs

# End-to-end integration
node tests/enhanced-analysis.integration.test.cjs
```

### Sample Test Code
The integration test creates temporary Java files to validate analysis:
- `VulnerableService.java` - Contains SQL injection, command injection, weak hashing
- `VulnerableService.java` - Contains resource leaks, null pointer risks, thread safety issues

All tests verify:
- [x] Pattern detection working correctly
- [x] Findings include required fields (file, line, severity, title)
- [x] Severity ranking correct (CRITICAL > HIGH > MEDIUM > LOW)
- [x] Error handling graceful (failures don't break pipeline)

## Configuration

### Disabling Analysis
```bash
# Command line
node collect-review.cjs --repo . --base main --no-analyze

# In code
const result = collectReview({ repo: '.', base: 'main', analyze: false });
```

### Customizing Patterns
Edit pattern definitions in analyzer files:
```javascript
const SECURITY_PATTERNS = {
  // Add custom patterns here
  customPattern: [{
    name: 'Custom Issue',
    pattern: /your_regex_here/gi,
    severity: 'HIGH',
    message: 'Issue description',
    recommendation: 'How to fix'
  }]
};
```

## Performance Notes

- Analysis adds ~100-200ms per review (file count dependent)
- Failures in one analyzer don't affect others
- Pattern matching uses regex (no AST parsing)
- Coverage analysis uses simple method name matching
- All analysis runs on changed files only

## Known Limitations

- Pattern-based detection may have false positives/negatives
- No cross-module dependency analysis (only within-file imports)
- No framework-specific patterns (Spring, Hibernate, etc.)
- Coverage analysis heuristic-based
- Only supports Java files currently
- Doesn't analyze discovered context files yet

## Contributing

To add new patterns:

1. Edit the PATTERNS object in the relevant analyzer
2. Add test cases in the test file
3. Run tests: `npm test` or `node tests/*.test.cjs`
4. Update this documentation

To add support for new languages:

1. Duplicate analyzer and modify file extension checks
2. Adapt patterns for new language syntax
3. Add language-specific test cases
4. Integrate with orchestrator module

## Debugging

Enable verbose output:
```javascript
// In enhanced-analysis.cjs, add logging
console.log(`Analyzing ${file.path}...`);
```

Check for:
- File extension filtering (`.java` only for now)
- Pattern regex validity (test with node REPL)
- Object property spelling in findings output
- Severity value existence in ranking lookup

## References

- Phase 3.1: Context discovery integration
- Phase 3.2: Enhanced analysis implementation
- Phase 3.3: Findings report formatter (next)
- Phase 4: Automated remediation (future)

