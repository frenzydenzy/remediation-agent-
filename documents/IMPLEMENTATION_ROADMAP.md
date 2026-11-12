# Implementation Roadmap: AI-Powered Feature Branch Code Review & Remediation

## Project Overview

Build a three-process AI-powered code review and remediation system that:
1. **Process 1: Context Acquisition** - Collects committed changes and related context
2. **Process 2: Validation & Analysis** - Identifies security, correctness, and test gaps
3. **Process 3: Automated Fixation** - Applies fixes in an isolated remediation branch

---

## Implementation Decisions (User-Confirmed)

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| **Automation Scope** | Fixes in separate branch; original & base untouched | Isolation & reproducibility |
| **Context Discovery** | Manual-only via `--context` flag | Full developer control |
| **Language Priority** | Java | Initial focus; can extend to Python/JS later |
| **Java Context Discovery** | Auto-parse imports | Static analysis for Maven/Gradle |
| **Remediation Naming** | Fixed timestamp-based | Predictable, non-colliding branch names |
| **Branch Base** | Current feature HEAD | Always work with latest code |
| **Branch Advance Detection** | Stop and report | Require fresh snapshot if branch changes |
| **Fix Rollback** | Specific fix only on failure | Preserve successful fixes, revert only broken ones |
| **Test Execution** | Yes, post-remediation | Validate fixes don't break tests |
| **Git Push** | Document and manual | Human controls publication |
| **Inline Comments** | Yes, with finding IDs | Full traceability of fixes |
| **Findings Source** | Both JSON file and chat API | Flexible input methods |
| **Reports** | Chat + PR comments | Developer visibility without repo clutter |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Developer Feature Branch (feature/user-search)             │
│  - Committed changes                                        │
│  - Current HEAD: DEF456...                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  PROCESS 1: CONTEXT         │
        │  ACQUISITION                │
        ├─────────────────────────────┤
        │ • Git change detection      │
        │ • Base confirmation         │
        │ • Merge-base calculation    │
        │ • Committed diff isolation  │
        │ • Manual context inclusion  │
        │ • Java import discovery     │
        │ • Build manifest inclusion  │
        └──────────────┬──────────────┘
                       │
           ┌───────────▼────────────┐
           │ context-package.json   │
           │ (Immutable snapshot)   │
           └───────────┬────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  PROCESS 2: VALIDATION &    │
        │  ANALYSIS                   │
        ├─────────────────────────────┤
        │ • Context validation        │
        │ • Read-only security review │
        │ • Correctness analysis      │
        │ • Test gap identification   │
        │ • Severity classification   │
        │ • Evidence collection       │
        └──────────────┬──────────────┘
                       │
           ┌───────────▼────────────┐
           │ findings-report.json   │
           │ (With remediation tips)│
           └───────────┬────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  PROCESS 3: AUTOMATED       │
        │  FIXATION                   │
        ├─────────────────────────────┤
        │ • Branch advance detection  │
        │ • Create remediation branch │
        │ • Apply validated fixes     │
        │ • Add inline comments       │
        │ • Execute tests & rollback  │
        │ • Commit changes            │
        │ • Document remediation      │
        └──────────────┬──────────────┘
                       │
           ┌───────────▼────────────┐
           │ remediation/<timestamp> │
           │ Ready for manual PR     │
           └────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  Developer Review & Merge   │
        │  (Human approval required)  │
        └─────────────────────────────┘
```

---

## Detailed Implementation Plan

### Phase 1: Core Infrastructure (Complete)
- ✅ Git-based change detection
- ✅ Read-only security reviewer agent
- ✅ Collector snapshot format
- ✅ Acceptance test framework

### Phase 2: Context Acquisition Enhancement (IN PROGRESS)
- [ ] Java import parsing (regex-based static analysis)
- [ ] Maven/Gradle metadata detection
- [ ] Dependency resolution for Java projects
- [ ] Manual context inclusion via `--context` flag
- [ ] Context validation and size limits
- [ ] Generate `context-package.json`

**Deliverables:**
- `context-discovery.cjs` - Java-aware context collector
- `context-package.json` - Structured context output

---

### Phase 3: Enhanced Validation & Analysis
- [ ] Severity classification per jj.txt guidance
- [ ] Security-specific analysis patterns
- [ ] Correctness & regression detection
- [ ] Test coverage gap identification
- [ ] Generate `findings-report.json`

**Deliverables:**
- `findings-report.json` schema
- Enhanced agent instructions for security review

---

### Phase 4: Automated Remediation Agent (Core)
- [ ] Create remediation agent definition (`.github/agents/remediation-fixer.agent.md`)
- [ ] Implement branch isolation:
  - Detect original branch advancement
  - Create `remediation/<timestamp>` branch from current feature HEAD
  - Ensure original & base branches untouched
- [ ] Fix application workflow:
  - Parse findings report
  - Apply each actionable fix
  - Add inline comment: `// FIX [FINDING-ID]: <description>`
  - Commit per fix (or batch commit with detailed message)
- [ ] Test execution & rollback:
  - Detect project test commands (Maven/Gradle/pytest/Jest patterns)
  - Execute tests
  - On failure: rollback specific fix, document, continue
  - On success: keep fix and proceed
- [ ] Generate remediation report with:
  - Finding ID → Fix applied mapping
  - Files modified
  - Test results (pass/fail)
  - Unresolved findings

**Deliverables:**
- `.github/agents/remediation-fixer.agent.md` - Agent definition
- `.github/skills/automated-remediation/` - Remediation skills & helpers
- `remediation-report.json` - Structured output

---

### Phase 5: Git Integration & Publishing (Manual)
- [ ] Prepare remediation branch for manual PR:
  - Generate PR description with findings → fixes mapping
  - Include test results
  - List unresolved findings
  - Provide diff summary
- [ ] Document push requirements:
  - Credential configuration
  - Branch protection rules compatibility
  - Manual push command for developer

**Deliverables:**
- PR template and documentation
- Manual push guide

---

### Phase 6: Testing & Acceptance
- [ ] Unit tests for Java import discovery
- [ ] Integration tests for context acquisition
- [ ] End-to-end acceptance tests:
  - Vulnerable Java code → findings → remediation
  - Test failure handling & rollback
  - Branch advance detection
- [ ] Acceptance fixture (intentionally vulnerable Java code)

**Deliverables:**
- Test suites passing
- Acceptance fixture in `.test-artifacts`
- Manual acceptance checklist

---

## Data Contracts Between Processes

### Context Package (Process 1 → Process 2)
```json
{
  "schemaVersion": 1,
  "state": "ready",
  "repository": "/path/to/repo",
  "branch": "feature/user-search",
  "head": "abc123...",
  "base": "main",
  "baseSha": "def456...",
  "mergeBase": "ghi789...",
  "comparison": "git diff def456...abc123",
  "patch": "unified diff text",
  "files": [
    {
      "path": "src/UserSearch.java",
      "status": "M",
      "before": { "content": "..." },
      "after": { "content": "..." }
    }
  ],
  "requestedContext": [
    {
      "path": "src/database/Database.java",
      "reason": "Imported by changed file",
      "before": { "content": "..." },
      "after": { "content": "..." }
    }
  ],
  "discoveredContext": [
    {
      "path": "pom.xml",
      "reasons": ["Maven configuration for Java project"]
    }
  ],
  "localChangesExcluded": true,
  "limitations": [...]
}
```

### Findings Report (Process 2 → Process 3)
```json
{
  "schemaVersion": 1,
  "snapshotHead": "abc123...",
  "findingsCount": 2,
  "findings": [
    {
      "id": "SEC-001",
      "file": "src/UserSearch.java",
      "line": 42,
      "category": "Security",
      "severity": "High",
      "title": "SQL Injection via concatenation",
      "evidence": "String query = \"SELECT * FROM users WHERE id = \" + userId;",
      "recommendation": "Use PreparedStatement with parameterized queries",
      "autoFixable": true,
      "fixTemplate": "database.prepare(\"SELECT * FROM users WHERE id = ?\").query(userId)"
    }
  ]
}
```

### Remediation Report (Process 3 → Developer)
```json
{
  "schemaVersion": 1,
  "originalBranch": "feature/user-search",
  "originalHeadSha": "abc123...",
  "remediationBranch": "remediation/20251105-165155",
  "remediationHeadSha": "xyz789...",
  "appliedFixes": [
    {
      "findingId": "SEC-001",
      "file": "src/UserSearch.java",
      "fixApplied": "Replaced string concatenation with PreparedStatement",
      "status": "SUCCESS",
      "testResult": "PASS"
    }
  ],
  "failedFixes": [],
  "unresolvedFindings": [],
  "testSummary": {
    "totalTests": 45,
    "passed": 45,
    "failed": 0
  },
  "pushReady": true,
  "prDescription": "..."
}
```

---

## File Structure

```
.github/
├── agents/
│   ├── security-reviewer.agent.md          (existing, read-only)
│   └── remediation-fixer.agent.md          (NEW)
└── skills/
    ├── ai-code-security-review/            (existing)
    │   ├── SKILL.md
    │   ├── review-report-format.md
    │   └── scripts/
    │       ├── collect-review.cjs           (enhanced with context discovery)
    │       └── context-discovery.cjs        (NEW)
    └── automated-remediation/               (NEW)
        ├── SKILL.md
        ├── fix-templates.json
        ├── java-fixes.cjs
        ├── rollback-handler.cjs
        └── pr-generator.cjs

tests/
├── collect-review.test.cjs                 (existing)
├── agent-acceptance.cjs                    (existing)
├── context-discovery.test.cjs              (NEW)
├── java-fix-templates.test.cjs             (NEW)
└── remediation-acceptance.cjs              (NEW)

docs/
├── IMPLEMENTATION_ROADMAP.md               (this file)
├── PROCESS-1-CONTEXT.md                    (NEW)
├── PROCESS-2-ANALYSIS.md                   (NEW)
└── PROCESS-3-REMEDIATION.md                (NEW)
```

---

## Success Criteria

### Phase Completion Checklist

**Phase 2 (Context Acquisition):**
- [ ] Java import parser identifies all local imports
- [ ] Maven pom.xml auto-included in context
- [ ] Manual `--context` flag works correctly
- [ ] Context size limits enforced
- [ ] Tests pass: 90%+ accuracy on standard Java projects

**Phase 3 (Analysis):**
- [ ] SQL injection findings detected
- [ ] Null pointer dereference identified
- [ ] Test gaps documented
- [ ] Severity correctly assigned
- [ ] Pre-existing issues excluded from new findings

**Phase 4 (Remediation):**
- [ ] Branch advance detection works
- [ ] `remediation/<timestamp>` branch created safely
- [ ] Fixes applied with inline comments
- [ ] Tests executed and results captured
- [ ] Specific fix rollback on failure
- [ ] Original feature branch remains untouched

**Phase 5 (Publishing):**
- [ ] PR description generated automatically
- [ ] Manual push command documented
- [ ] No automatic push (manual only)
- [ ] Credentials documentation provided

**Phase 6 (Testing):**
- [ ] All automated tests pass
- [ ] Acceptance fixture demonstrates full workflow
- [ ] Manual acceptance checklist completed

---

## Timeline Estimate

| Phase | Effort | Duration | Status |
|-------|--------|----------|--------|
| 1 | Complete | ✅ Done | Complete |
| 2 | 8-12 hours | 1-2 days | Starting |
| 3 | 10-15 hours | 2-3 days | Pending |
| 4 | 15-20 hours | 3-4 days | Pending |
| 5 | 5-8 hours | 1-2 days | Pending |
| 6 | 8-10 hours | 2-3 days | Pending |
| **Total** | **46-65 hours** | **10-15 days** | **In Progress** |

---

## Known Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Java import resolution complex | Delays, false context | Start with heuristics; validate against real projects |
| Test failures hard to debug | Lost dev time | Capture full test output; detailed rollback logs |
| Branch conflicts on remediation | Blocker | Detect and report; don't force push |
| Large fix lists overwhelming | Dev confusion | Prioritize by severity; group related fixes |
| Git credentials not configured | Push fails | Document pre-req setup; provide error messages |

---

## Next Steps

1. **Start Phase 2:** Implement Java import discovery
2. **Validate:** Test against real Java projects in `.test-artifacts`
3. **Document:** Create `PROCESS-1-CONTEXT.md` with examples
4. **Iterate:** Refine based on acceptance criteria
5. **Move to Phase 3:** Begin validation & analysis enhancements

