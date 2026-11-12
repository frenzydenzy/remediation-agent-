# 🚀 NEXT STEPS: Phase 3 Preparation

## Current Status
✅ **Phase 2 COMPLETE**
- Java-aware context discovery module fully implemented
- 21/21 tests passing (100%)
- All code committed locally
- Ready for Phase 3 integration

---

## What You Need to Know

### Phase 2 Deliverables Location
```
📍 Core Module:
   .github/skills/ai-code-security-review/scripts/context-discovery.cjs

📍 Tests:
   tests/context-discovery.test.cjs (17 unit tests)
   tests/context-discovery.integration.test.cjs (4 integration tests)

📍 Test Data:
   .test-artifacts/sample-java-project/ (Maven/Gradle sample)

📍 Documentation:
   PHASE_2_FINAL_REPORT.md (start here!)
   PHASE_2_STATUS_UPDATE.md (API reference)
   PHASE_2_COMPLETION_REPORT.md (detailed breakdown)
```

### How to Run Tests
```bash
# Run unit tests
cd "c:\Users\harbansal\Documents\Projects\remedition skill"
node tests/context-discovery.test.cjs

# Run integration tests
node tests/context-discovery.integration.test.cjs

# Expected: All tests passing ✅
```

### Module API
```javascript
const { discoverContext, parseJavaImports, resolveImportPath } = 
  require('./.github/skills/ai-code-security-review/scripts/context-discovery.cjs');

// Main function to use in Phase 3:
const context = discoverContext({
  repo: '/path/to/repository',
  files: [ /* changed files with imports */ ],
  base: 'main'
});

// Returns:
// {
//   discovered: [{ path, reason }, ...],
//   omitted: [{ path, reason }, ...],
//   limitations: ['...', ...]
// }
```

---

## Phase 3 Implementation Roadmap

### 3.1 Integration with collect-review.cjs (2-3 hours)

**Goal:** Add discovered context to the review snapshot

**Files to Modify:**
- `.github/skills/ai-code-security-review/scripts/collect-review.cjs`

**Steps:**
1. Import `discoverContext` from context-discovery.cjs
2. After parsing changed files, call `discoverContext({ repo, files, base })`
3. Add result to snapshot JSON:
   ```json
   {
     "changedFiles": [...],
     "requestedContext": [...],
     "discoveredContext": {...},
     "discoveryLimitations": [...]
   }
   ```
4. Update integration tests to verify new fields

**Acceptance Criteria:**
- [ ] Integration test passes
- [ ] Discovered context appears in review snapshot
- [ ] Limitations are documented
- [ ] No regressions in existing tests

### 3.2 Enhanced Validation & Analysis (4 hours)

**Goal:** Use context to improve security and correctness analysis

**New Patterns to Detect:**
1. Security issues:
   - Dependency vulnerabilities
   - Insecure import patterns
   - Missing security headers
   - Cryptography misuse

2. Correctness issues:
   - Null pointer risks (unresolved imports)
   - API misuse (wrong method signatures)
   - Type incompatibilities
   - Resource leaks (missing closes)

3. Architecture issues:
   - Circular dependencies
   - Coupling violations
   - Layering violations
   - Unused dependencies

**Implementation:**
- Add context-aware checks to review agent
- Reference discovered imports in analysis
- Consider dependency chains in findings
- Report architecture violations

### 3.3 Test Coverage Analysis (2-3 hours)

**Goal:** Identify missing or inadequate test coverage

**Analysis:**
1. For each changed Java file, look for test files
2. Parse test file to find test methods
3. Compare test coverage to code coverage threshold
4. Report missing test scenarios

**Examples:**
```
❌ UserService.java (3 public methods)
   - TestUserService.java found
   - Tests found: 2 (missing testDeleteUser)
   - Coverage: 66% (threshold: 80%)
```

### 3.4 Findings Report Generation (1-2 hours)

**Goal:** Generate structured findings with context

**Report Format:**
```json
{
  "findings": [
    {
      "id": "FIND-001",
      "severity": "HIGH",
      "category": "security",
      "title": "Unsafe SQL construction",
      "file": "src/main/java/com/example/UserDao.java",
      "line": 42,
      "context": {
        "imports": ["java.sql.Statement"],
        "relatedFiles": ["UserDaoTest.java"],
        "testCoverage": "partial"
      },
      "recommendation": "Use PreparedStatement with parameterized queries"
    }
  ]
}
```

---

## Quick Start for Phase 3

### Step 1: Read Documentation (15 minutes)
```
1. PHASE_2_FINAL_REPORT.md - Executive summary
2. PHASE_2_STATUS_UPDATE.md - API details
3. This file - Integration guide
```

### Step 2: Understand Current Code (30 minutes)
```
1. Look at context-discovery.cjs exports
2. Review discoverContext function signature
3. Examine test cases for usage patterns
```

### Step 3: Plan Integration (30 minutes)
```
1. Sketch how to import module in collect-review.cjs
2. Plan snapshot JSON structure changes
3. Identify regression test needs
```

### Step 4: Start Implementation (2-3 hours)
```
1. Modify collect-review.cjs to import module
2. Add discoverContext call after file parsing
3. Write integration test
4. Run existing tests to check for regressions
```

---

## Testing Strategy for Phase 3

### Unit Tests Needed
```javascript
// Integration test in collect-review test file
test('should include discovered context in snapshot', () => {
  const snapshot = collectReview({...});
  assert(snapshot.discoveredContext !== undefined);
  assert(Array.isArray(snapshot.discoveredContext));
  assert(snapshot.discoveryLimitations !== undefined);
});
```

### Integration Tests Needed
```javascript
// End-to-end test with real Java project
test('end-to-end: collect review with context discovery', () => {
  const result = collectReview({
    repo: '.test-artifacts/sample-java-project',
    base: 'main',
    head: 'feature/enhancement'
  });
  
  // Verify discovered context is present
  assert(result.discoveredContext.length > 0);
  assert(result.discoveryLimitations.length >= 0);
});
```

---

## Success Criteria for Phase 3

By end of Phase 3, you should have:

- ✓ Context discovery integrated into collect-review.cjs
- ✓ Discovered context appears in review snapshot
- ✓ Enhanced security analysis using context
- ✓ Test coverage gap detection working
- ✓ Findings report includes context information
- ✓ All existing tests still passing
- ✓ End-to-end workflow tested

---

## Common Issues & Solutions

### Issue: "Cannot find module context-discovery.cjs"
**Solution:** 
```javascript
const { discoverContext } = require('./context-discovery.cjs');
// Path must be relative from calling file location
```

### Issue: "discoveredContext is empty"
**Solution:**
- Check that files array contains valid Java files
- Verify imports are not excluded by STDLIB_PREFIXES
- Check that import resolution paths exist in repo

### Issue: "Too many files discovered"
**Solution:**
- Discovery limit is 32 files (MAX_DISCOVERED_FILES)
- Check omitted array for files that exceeded limits
- Filter less important imports if needed

### Issue: "Tests failing after integration"
**Solution:**
- Run full test suite before and after changes
- Check for regressions in existing functionality
- Verify new fields in snapshot JSON don't break parsers

---

## Resources

### Key Files
- Core module: `.github/skills/ai-code-security-review/scripts/context-discovery.cjs`
- Unit tests: `tests/context-discovery.test.cjs`
- Integration tests: `tests/context-discovery.integration.test.cjs`

### Documentation
- API Reference: `PHASE_2_STATUS_UPDATE.md`
- Technical Details: `PHASE_2_FINAL_REPORT.md`
- Implementation Plan: `PHASE_2_IMPLEMENTATION_PLAN.md`

### Repository
- Remote: `https://github.com/frenzydenzy/remediation-agent-.git`
- Local: `c:\Users\harbansal\Documents\Projects\remedition skill`

---

## Timeline Estimate

| Phase | Time | Complexity |
|-------|------|-----------|
| 3.1 Integration | 2-3 hrs | Medium |
| 3.2 Enhanced Analysis | 4 hrs | High |
| 3.3 Test Analysis | 2-3 hrs | Medium |
| 3.4 Report Generation | 1-2 hrs | Low |
| 3.5 Testing & Polish | 2 hrs | Low |
| **Total** | **11-15 hrs** | **Medium-High** |

---

## Questions or Issues?

Before starting Phase 3, review:
1. ✓ Do you understand how to run the tests?
2. ✓ Do you see how to use discoverContext in code?
3. ✓ Do you understand the discovery limits?
4. ✓ Do you know where to add the integration?

If any answer is "No", re-read the relevant documentation file.

---

**Good luck! Phase 3 is ready to begin.** 🚀
