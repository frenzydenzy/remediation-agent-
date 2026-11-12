# Phase 3.4 Implementation Flow - Step by Step

## 🎯 Complete Implementation Flow (Week 1 - Core Architecture)

### STEP 1: Create Directory Structure & Remediation Agent Orchestrator
**Time: 2 hours | Tests: 5**

**1a. Create directory structure:**
```
.github/skills/ai-code-security-review/scripts/remediation/
├── remediation-agent.cjs
├── fix-templates.cjs
├── llm-fixer.cjs
├── fix-validator.cjs
├── rollback-manager.cjs
├── templates/
│   ├── sql-injection.js
│   ├── null-pointer.js
│   ├── command-injection.js
│   ├── hard-coded-credentials.js
│   └── resource-leak.js
└── utils/
    ├── test-detector.cjs
    ├── code-transformer.cjs
    └── github-reporter.cjs
```

**1b. Create remediation-agent.cjs:**
- Main orchestrator that receives findings from Phase 3.3
- Parse finding (file, line, type, severity, description)
- Route issue to appropriate fix generator
- Coordinate validation (test execution)
- Handle errors and status reporting
- Export main function: `remediateFindings(findings, options)`

**1c. Core functions in remediation-agent.cjs:**
```javascript
exports.remediateFindings = async (findings, options) → Promise<RemediationResult>
exports.parseFinding = (finding) → ParsedFinding
exports.routeToGenerator = (finding) → GeneratorType
exports.executeRemediation = (finding) → Promise<FixResult>
exports.reportStatus = (result) → void
exports.validateFix = (file, finding) → Promise<ValidationResult>
```

**1d. Create unit tests (5 tests):**
- Test 1: Parse finding correctly
- Test 2: Route SQL Injection to template
- Test 3: Route complex issue to LLM
- Test 4: Error handling on missing file
- Test 5: Status reporting

**Output:** 
- remediation-agent.cjs (~250 LOC)
- remediation-agent.test.cjs (~150 LOC, 5 tests)

---

### STEP 2: Create Test Framework Detection Module
**Time: 2 hours | Tests: 5**

**2a. Create fix-validator.cjs:**
- Detect test framework (Jest, Mocha, JUnit, Maven)
- Execute tests with appropriate runner
- Parse test results
- Return pass/fail status

**2b. Create utils/test-detector.cjs:**
- Scan package.json for test scripts
- Detect Maven pom.xml
- Detect Jest/Mocha configuration
- Detect Java test classes

**2c. Core functions:**
```javascript
exports.detectTestFramework = (projectPath) → FrameworkInfo
exports.runTests = (projectPath, framework) → Promise<TestResults>
exports.parseTestResults = (output, framework) → ParsedResults
exports.validateFix = (file, framework) → Promise<Boolean>
```

**2d. Create unit tests (5 tests):**
- Test 1: Detect Jest in JavaScript project
- Test 2: Detect JUnit in Java project
- Test 3: Execute Jest tests
- Test 4: Execute Maven tests
- Test 5: Parse test output correctly

**Output:**
- fix-validator.cjs (~200 LOC)
- utils/test-detector.cjs (~150 LOC)
- fix-validator.test.cjs (~150 LOC, 5 tests)

---

### STEP 3: Create Template System (MVP - 5 Templates)
**Time: 2 hours | Tests: 5**

**3a. Create fix-templates.cjs:**
- Define 5 tier-1 templates
- Load template file based on issue type
- Apply template transformation
- Return fixed code

**3b. Create 5 template files:**

1. **templates/sql-injection.js**
   - Pattern: Detect string concatenation in SQL
   - Fix: Convert to parameterized query
   - Example: `"SELECT * FROM users WHERE id = " + id` → `SELECT * FROM users WHERE id = ?` (with params)

2. **templates/null-pointer.js**
   - Pattern: Detect null/undefined access
   - Fix: Add null check before use
   - Example: `user.getName()` → `if (user != null) { user.getName() }`

3. **templates/command-injection.js**
   - Pattern: Detect command construction from untrusted input
   - Fix: Use array-based command execution (no shell)
   - Example: `exec(cmd + userInput)` → `execFile(cmd, [userInput])`

4. **templates/hard-coded-credentials.js**
   - Pattern: Detect hardcoded passwords/API keys
   - Fix: Move to environment variables
   - Example: `password = "secret123"` → `password = process.env.DB_PASSWORD`

5. **templates/resource-leak.js**
   - Pattern: Detect unclosed file/connection
   - Fix: Add try-finally or try-with-resources
   - Example: `stream = open()` → `try (stream = open()) { ... }`

**3c. Core functions:**
```javascript
exports.generateFix = (finding, code) → FixedCode
exports.loadTemplate = (issueType) → Template
exports.applyTemplate = (template, code, context) → FixedCode
exports.validateFixQuality = (original, fixed) → Boolean
```

**3d. Create unit tests (5 tests):**
- Test 1: SQL Injection template generates correct parameterized query
- Test 2: Null pointer template adds null check
- Test 3: Command Injection template uses safe execution
- Test 4: Hard-coded credentials template uses env vars
- Test 5: Resource leak template adds proper cleanup

**Output:**
- fix-templates.cjs (~300 LOC)
- templates/sql-injection.js (~80 LOC)
- templates/null-pointer.js (~80 LOC)
- templates/command-injection.js (~80 LOC)
- templates/hard-coded-credentials.js (~60 LOC)
- templates/resource-leak.js (~80 LOC)
- fix-templates.test.cjs (~150 LOC, 5 tests)

---

### STEP 4: Create LLM Integration Module
**Time: 2 hours | Tests: 5**

**4a. Create llm-fixer.cjs:**
- Call Claude API for complex issues
- Pass code context to LLM
- Parse LLM response
- Fallback to template on failure

**4b. Core functions:**
```javascript
exports.generateFixWithLLM = (finding, code) → Promise<FixedCode>
exports.createPrompt = (finding, code) → String
exports.callClaudeAPI = (prompt) → Promise<String>
exports.parseResponse = (response) → FixedCode
exports.fallbackToTemplate = (finding, code) → FixedCode
```

**4c. Environment setup:**
- Read CLAUDE_API_KEY from environment
- Configure API client with timeout
- Error handling for rate limits, API errors

**4d. Create unit tests (5 tests):**
- Test 1: Create appropriate prompt context
- Test 2: Call Claude API successfully
- Test 3: Parse LLM response correctly
- Test 4: Fallback to template on API error
- Test 5: Handle rate limiting gracefully

**Output:**
- llm-fixer.cjs (~250 LOC)
- llm-fixer.test.cjs (~150 LOC, 5 tests)

---

### STEP 5: Create Progressive Rollback Manager
**Time: 1-2 hours | Tests: 5**

**5a. Create rollback-manager.cjs:**
- Implement 3-tier rollback strategy
- Preserve original code
- Attempt progressively simpler fixes
- Report which strategy succeeded

**5b. Rollback strategy:**
```
Tier 1: Full LLM fix
  ├─ Run tests → PASS: Success ✓
  └─ FAIL → Tier 2

Tier 2: Template-based simple fix
  ├─ Run tests → PASS: Success ✓
  └─ FAIL → Tier 3

Tier 3: Alternative template (if available)
  ├─ Run tests → PASS: Success ✓
  └─ FAIL → Report as unable to fix
```

**5c. Core functions:**
```javascript
exports.executeWithRollback = (finding, code) → Promise<RollbackResult>
exports.attemptTier1 = (finding, code) → Promise<FixResult>
exports.attemptTier2 = (finding, code) → Promise<FixResult>
exports.attemptTier3 = (finding, code) → Promise<FixResult>
exports.preserveOriginal = (code) → String
exports.reportRollbackStrategy = (result) → String
```

**5d. Create unit tests (5 tests):**
- Test 1: Successful Tier 1 (LLM)
- Test 2: Tier 1 fails, Tier 2 succeeds
- Test 3: Tier 1 & 2 fail, Tier 3 succeeds
- Test 4: All tiers fail, report as unable
- Test 5: Original code preserved throughout

**Output:**
- rollback-manager.cjs (~250 LOC)
- rollback-manager.test.cjs (~150 LOC, 5 tests)

---

### STEP 6: Create Integration Tests & Validation
**Time: 1-2 hours | Tests: 10**

**6a. Create phase-3-4-integration.test.cjs:**
- End-to-end pipeline tests
- Multiple issues in same file
- Test framework detection validation
- GitHub workflow simulation

**6b. Integration test cases:**
- Test 1: Full pipeline: finding → fix → validation → success
- Test 2: Parse multiple findings
- Test 3: Route different issue types
- Test 4: Test framework auto-detection
- Test 5: Test execution and result parsing
- Test 6: Rollback on test failure
- Test 7: LLM fallback on template failure
- Test 8: Preserve original code
- Test 9: GitHub status reporting
- Test 10: Multi-file remediation

**6c. Output validation:**
- Fixed code is valid syntax
- Tests pass after fix
- Original functionality preserved
- No regressions introduced

**Output:**
- phase-3-4-integration.test.cjs (~200 LOC, 10 tests)

---

## 📊 Summary of Week 1 Deliverables

### Files Created (10 total)
1. remediation-agent.cjs (~250 LOC)
2. fix-validator.cjs (~200 LOC)
3. utils/test-detector.cjs (~150 LOC)
4. fix-templates.cjs (~300 LOC)
5. templates/sql-injection.js (~80 LOC)
6. templates/null-pointer.js (~80 LOC)
7. templates/command-injection.js (~80 LOC)
8. templates/hard-coded-credentials.js (~60 LOC)
9. templates/resource-leak.js (~80 LOC)
10. llm-fixer.cjs (~250 LOC)
11. rollback-manager.cjs (~250 LOC)

### Test Files Created (5 total)
1. remediation-agent.test.cjs (~150 LOC, 5 tests)
2. fix-validator.test.cjs (~150 LOC, 5 tests)
3. fix-templates.test.cjs (~150 LOC, 5 tests)
4. llm-fixer.test.cjs (~150 LOC, 5 tests)
5. rollback-manager.test.cjs (~150 LOC, 5 tests)
6. phase-3-4-integration.test.cjs (~200 LOC, 10 tests)

### Metrics
- **Total Production LOC:** ~2,200 LOC
- **Total Test LOC:** ~1,000 LOC
- **Total Tests:** 35 unit tests + 10 integration tests = 45 tests
- **All Tests Passing:** 100% pass rate target
- **Directory Structure:** Complete with utils and templates
- **Git Commits:** 1-2 commits for week 1

---

## 🔄 Week 2 & 3 Continuation (Preview)

### Week 2: Expand Templates & Languages (6-8 hours)
- Expand templates from 5 to 10+ total
- Add JavaScript/TypeScript support
- Create GitHub integration module
- Add 15+ additional tests

### Week 3: Production Finish (4-6 hours)
- Complete all 17 templates
- Performance optimization
- Production error handling
- Documentation and deployment
- Add 30+ final tests

---

## ✅ How I'll Work

**For each step:**

1. **Create files** with complete, production-ready code
2. **Implement core functions** with full error handling
3. **Write tests** before/alongside code (test-driven)
4. **Run tests** - all must pass (100%)
5. **Validate output** - check code quality
6. **Commit to git** - with descriptive messages
7. **Document** - update checklist and progress

**Quality gates:**
- ✓ No syntax errors
- ✓ All tests passing
- ✓ Error handling comprehensive
- ✓ Code follows existing patterns
- ✓ Documentation accurate
- ✓ Git history clean

**Communication:**
- Report progress after each step
- Show code snippets for key functions
- Share test results and metrics
- Ask if clarification needed
- Get approval before proceeding to next step

---

## 🚀 Let's Begin!

**Starting with STEP 1: Remediation Agent Orchestrator**

I will:
1. Create `.github/skills/ai-code-security-review/scripts/remediation/` directory
2. Implement `remediation-agent.cjs` with full orchestration flow
3. Create `remediation-agent.test.cjs` with 5 comprehensive tests
4. Run tests - validate all passing
5. Commit to git
6. Report completion with metrics

**Estimated time:** ~2 hours
**Expected output:** ~400 LOC (code + tests)

Shall I begin STEP 1 now?

