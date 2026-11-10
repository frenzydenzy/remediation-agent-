# Phase 3.2: Enhanced Validation & Analysis with Context

## Overview

Build upon the integrated context discovery to add context-aware security and correctness analysis patterns.

## Implementation Plan

### 1. Security Pattern Analysis

**Patterns to Detect:**

#### A. Dependency Vulnerabilities
- Detect outdated dependency versions
- Check for known vulnerable packages
- Analyze Maven/Gradle configurations
- Cross-reference with vulnerability databases (future enhancement)

**Example:**
```
❌ FINDING: Outdated Dependency
   File: pom.xml
   Line: 45
   Issue: junit version 4.13.0 has known vulnerabilities
   Remediation: Update to 4.13.2 or junit-jupiter 5.9.0+
```

#### B. Insecure Import Patterns
- Detect unused imports
- Detect circular dependencies
- Flag insecure cryptography imports
- Detect logging library misuse

**Example:**
```
⚠️  WARNING: Insecure Cryptography
    File: UserService.java
    Line: 12
    Issue: Using java.security.MessageDigest directly
    Recommendation: Use Apache Commons Codec or similar
```

#### C. Missing Security Measures
- SQL injection risks (string concatenation in queries)
- Command injection risks (Runtime.exec with user input)
- XXE (XML External Entity) vulnerabilities
- CSRF token validation missing

**Example:**
```
🔴 CRITICAL: SQL Injection Risk
    File: UserDao.java
    Line: 42
    Issue: Concatenating user input into SQL query
    Remediation: Use PreparedStatement with parameterized queries
```

### 2. Correctness & Regression Analysis

**Patterns to Detect:**

#### A. Null Pointer Risks
- Unresolved imports might indicate missing nullability checks
- Return types without null-safety annotations
- Stream operations without proper error handling

**Example:**
```
🟡 MEDIUM: Potential Null Pointer
    File: UserService.java
    Line: 28
    Issue: userRepository.findById() might return empty Optional
    Recommendation: Use .orElseThrow() or handle empty case
```

#### B. API Misuse
- Wrong method signatures based on imports
- Calling deprecated methods
- Using methods removed in newer versions

**Example:**
```
🟠 HIGH: Deprecated API Usage
    File: DataParser.java
    Line: 15
    Issue: Using ArrayList.removeAll() in loop (quadratic complexity)
    Recommendation: Use Iterator or removeIf()
```

#### C. Resource Leaks
- File streams not closed
- Database connections not returned to pool
- Missing try-with-resources

**Example:**
```
🔴 CRITICAL: Resource Leak
    File: ConfigReader.java
    Line: 33
    Issue: FileInputStream opened but never closed
    Remediation: Use try-with-resources: try (FileInputStream fis = ...)
```

### 3. Test Coverage Analysis

**Analysis:**

- Identify source files without corresponding test files
- Analyze test method count vs public method count
- Detect suspicious test patterns (mocks without verification)
- Identify untested error paths

**Example:**
```
🟡 MEDIUM: Low Test Coverage
    File: UserValidator.java
    Issue: Found UserTest.java but only 2 test methods for 5 public methods
    Missing: testNullValidation, testEmptyEmail, testInvalidPhone
    Coverage: 40% (minimum threshold: 80%)
```

### 4. Architecture Violation Detection

**Patterns:**

- Circular imports/dependencies
- Layering violations (UI calling DAO directly)
- Forbidden package dependencies
- Coupling violations

**Example:**
```
🟠 HIGH: Layering Violation
    File: UserController.java
    Issue: Direct import of com.example.repository.UserRepository
    Problem: UI layer should not directly import persistence layer
    Recommendation: Use Service layer (com.example.service.UserService)
```

## Implementation Architecture

```
┌─────────────────────────────────────────┐
│  collect-review.cjs                     │
│  (with integrated context discovery)    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  enhanced-analysis.cjs (NEW)            │
│  ┌──────────────────────────────────┐   │
│  │ Pattern Analyzers:               │   │
│  │  • SecurityAnalyzer              │   │
│  │  • CorrectnessAnalyzer           │   │
│  │  • TestCoverageAnalyzer          │   │
│  │  • ArchitectureAnalyzer          │   │
│  └──────────────────────────────────┘   │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  findings-report.json                   │
│  (Structured analysis output)           │
└─────────────────────────────────────────┘
```

## File Structure

```
.github/skills/ai-code-security-review/scripts/
├── context-discovery.cjs ............. (existing)
├── collect-review.cjs ................ (enhanced in 3.1)
├── enhanced-analysis.cjs ............. (NEW in 3.2)
├── analyzers/
│   ├── security-analyzer.cjs ......... (NEW)
│   ├── correctness-analyzer.cjs ...... (NEW)
│   ├── test-coverage-analyzer.cjs .... (NEW)
│   └── architecture-analyzer.cjs ..... (NEW)
└── findings-report.cjs ............... (NEW - formatter)

tests/
├── enhanced-analysis.test.cjs ........ (NEW)
└── security-analyzer.test.cjs ........ (NEW)
```

## Severity Levels

```
🔴 CRITICAL (Exploitable/Blocking)
   - SQL injection vulnerabilities
   - Command injection risks
   - XXE vulnerabilities
   - Hard-coded credentials
   - Unauthenticated critical operations

🟠 HIGH (Likely issue/Breaking)
   - Deprecated API usage
   - Resource leaks
   - Null pointer exceptions
   - Circular dependencies
   - Insecure cryptography

🟡 MEDIUM (Should fix/Warning)
   - Unused imports
   - Low test coverage
   - Performance issues
   - Inconsistent error handling
   - Potential null dereference

⚪ LOW (Nice to have)
   - Code style issues
   - Documentation gaps
   - Performance improvements
   - Test optimization
```

## Integration Points

1. **Input:** Snapshot from collect-review with:
   - `patch`: The unified diff
   - `files`: Changed files with before/after content
   - `discoveredContext`: Related files discovered
   - `requestedContext`: Manually requested context

2. **Output:** Findings report with:
   - `findings`: Array of discovered issues
   - `analysis`: Summary of analysis performed
   - `recommendations`: Priority-ordered fixes

## Success Criteria

- ✓ All pattern analyzers implemented
- ✓ Unit tests for each analyzer (8+ tests each)
- ✓ Integration tests for combined analysis
- ✓ End-to-end test with real code
- ✓ CLI interface for running analysis
- ✓ JSON output format
- ✓ 0 false positives on safe code
- ✓ Detects 100% of test patterns

## Timeline

- Analyzer implementation: 3-4 hours
- Unit tests: 2-3 hours  
- Integration & end-to-end: 2 hours
- **Total: 7-9 hours**

## Next Steps

1. Implement SecurityAnalyzer module
2. Implement CorrectnessAnalyzer module
3. Implement TestCoverageAnalyzer module
4. Implement ArchitectureAnalyzer module
5. Create findings report formatter
6. Write comprehensive tests
7. End-to-end validation

---

**Status:** Ready to implement Phase 3.2  
**Priority:** High - Core functionality for review pipeline  
**Blockers:** None
