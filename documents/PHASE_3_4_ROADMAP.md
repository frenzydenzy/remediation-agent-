# Phase 3.4 Implementation Roadmap - Visual Guide

## 🎯 Overall Timeline

```
WEEK 1: Core Architecture & MVP (8-10 hours)
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Remediation Agent       [████  ] 2h               │
│ Step 2: Test Framework Detection [████  ] 2h               │
│ Step 3: Template System (MVP)    [████  ] 2h               │
│ Step 4: LLM Integration          [████  ] 2h               │
│ Step 5: Progressive Rollback     [██    ] 1-2h             │
│ Step 6: Integration Testing      [██    ] 1-2h             │
└─────────────────────────────────────────────────────────────┘
Total: ~30 test cases | ~2500 LOC | 5 core modules

WEEK 2: Expand Templates & Languages (6-8 hours)
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Additional Templates     [████  ] 3-4h              │
│ Step 8: Multi-Language Support   [███   ] 2-3h              │
│ Step 9: GitHub Integration       [███   ] 1-2h              │
└─────────────────────────────────────────────────────────────┘
Total: ~15 test cases | ~1500 LOC | 10+ templates

WEEK 3: Polish & Production (4-6 hours)
┌─────────────────────────────────────────────────────────────┐
│ Step 10: Complete All Templates  [██    ] 2h                │
│ Step 11: Performance & Error     [██    ] 1-2h              │
│ Step 12: Documentation           [██    ] 1-2h              │
└─────────────────────────────────────────────────────────────┘
Total: ~30 test cases | ~1000 LOC | Documentation
```

---

## 🔄 Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 3.3: REPORT FORMATTER (Input)                              │
│                                                                  │
│ Findings JSON:                                                   │
│ {                                                                │
│   "file": "src/User.java",                                      │
│   "line": 42,                                                   │
│   "category": "sql-injection",                                  │
│   "severity": "CRITICAL",                                       │
│   "title": "SQL injection in user query"                        │
│ }                                                                │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 3.4: REMEDIATION AGENT (Process)                           │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 1. Remediation Agent (orchestrator)                        │  │
│ │    - Parse finding                                         │  │
│ │    - Route to fix generator                               │  │
│ │    - Coordinate validation                                │  │
│ │    - Report status                                        │  │
│ └────────────────────────────────────────────────────────────┘  │
│                         │                                        │
│              ┌──────────┼──────────┐                            │
│              ▼          ▼          ▼                            │
│ ┌──────────────────┐ ┌───────────────────┐ ┌────────────────┐  │
│ │ Fix Templates    │ │ LLM Fixer         │ │ Test Validator │  │
│ │ (MVP + Expand)   │ │ (Claude API)      │ │ (Auto-detect)  │  │
│ │                  │ │                   │ │                │  │
│ │ 5→17 templates   │ │ Complex cases     │ │ Jest/JUnit     │  │
│ │ - SQL Injection  │ │ - Context-aware   │ │ - Mocha        │  │
│ │ - Null Pointer   │ │ - Code quality    │ │ - Maven        │  │
│ │ - Credentials    │ │ - Fallback logic  │ │ - npm test     │  │
│ │ - Resource Leak  │ │                   │ │                │  │
│ │ - Command Inj.   │ │                   │ │                │  │
│ └──────────────────┘ └───────────────────┘ └────────────────┘  │
│              │          │          │              │            │
│              └──────────┼──────────┴──────────────┘            │
│                         │                                      │
│                         ▼                                      │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Rollback Manager                                           │  │
│ │ Strategy: Progressive (Full → Simple → Skip)             │  │
│ │ - Try full fix → Run tests                               │  │
│ │ - If fails: Try simpler template                         │  │
│ │ - If fails: Try LLM alternative                          │  │
│ │ - If fails: Skip (report as unable to fix)               │  │
│ └────────────────────────────────────────────────────────────┘  │
│                         │                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ GITHUB INTEGRATION (Output)                                      │
│                                                                  │
│ 1. Create fix branch                                             │
│ 2. Commit individual fixes (one per issue)                       │
│ 3. Create PR with:                                              │
│    - Title: [REMEDIATION] Fix X security/correctness issues     │
│    - Description: Summary of fixes applied                      │
│    - Comment: Per-issue status (✓ Fixed / ✗ Unable to fix)     │
│ 4. Ready for developer review & merge                           │
│                                                                  │
│ PR Comment Example:                                              │
│ ─────────────────────────────────────────────────────────────── │
│ ✓ Fixed SQL injection at src/User.java:42                      │
│   - Applied parameterized query template                        │
│   - All tests passing                                           │
│                                                                  │
│ ✓ Fixed Null pointer at src/Service.java:89                    │
│   - Added null check                                            │
│   - All tests passing                                           │
│                                                                  │
│ ✗ Unable to fix XSS at src/View.java:15                         │
│   - Attempted 3 strategies (template, simple, LLM)             │
│   - Manual review required                                      │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Module Interaction Map

```
                    ┌─────────────────────┐
                    │ Remediation Agent   │ (orchestrator)
                    │ - Flow control      │
                    │ - Error handling    │
                    │ - Status tracking   │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
    ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
    │ Fix-         │    │ LLM-         │    │ Fix-         │
    │ Templates    │    │ Fixer        │    │ Validator    │
    │             │    │              │    │              │
    │ 5→17 fixes   │    │ Claude API   │    │ Test runner  │
    │ (fast)      │    │ (intelligent)│    │ (validation) │
    └─────────────┘    └──────────────┘    └──────────────┘
         ▲                    ▲                    │
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Rollback Manager    │ (recovery)
                    │ - Progressive retry │
                    │ - State management  │
                    │ - Original preserve │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ GitHub Reporter     │ (output)
                    │ - Commit fixes      │
                    │ - Create PR         │
                    │ - Add comments      │
                    └─────────────────────┘
```

---

## 📦 File Dependencies

```
fix-templates.cjs
├── Provides: fix generation for common patterns
├── Used by: remediation-agent.cjs
└── Tests: 15 unit tests (fix-templates.test.cjs)

llm-fixer.cjs
├── Provides: LLM-based fix generation
├── Used by: remediation-agent.cjs (as fallback)
├── Dependencies: Claude API, fix-templates.cjs
└── Tests: 15 unit tests (llm-fixer.test.cjs)

fix-validator.cjs
├── Provides: Test execution & result parsing
├── Used by: remediation-agent.cjs (validation phase)
├── Dependencies: test-detector.cjs
└── Tests: 10 unit tests (fix-validator.test.cjs)

rollback-manager.cjs
├── Provides: Progressive rollback logic
├── Used by: remediation-agent.cjs (failure recovery)
├── Dependencies: fix-templates.cjs, llm-fixer.cjs
└── Tests: 10 unit tests (rollback-manager.test.cjs)

remediation-agent.cjs
├── Provides: Main orchestration
├── Uses: all above modules
├── Dependencies: Phase 3.3 report formatter
└── Tests: 15 unit tests (remediation-agent.test.cjs)
```

---

## 🧪 Test Distribution

```
UNIT TESTS (65 total)
┌────────────────────────────────────┐
│ Remediation Agent:           15   │  Core orchestration logic
│ Fix Templates (MVP):         15   │  Template-based fixes
│ LLM Fixer:                   15   │  Claude API integration
│ Fix Validator:               10   │  Test execution
│ Rollback Manager:            10   │  Recovery strategies
└────────────────────────────────────┘

INTEGRATION TESTS (10 total)
┌────────────────────────────────────┐
│ End-to-End Pipeline:         10   │  Full flow validation
└────────────────────────────────────┘

TOTAL: 75 tests (100% pass rate target)
```

---

## 📊 Progress Tracking

### Week 1 Deliverables
```
Day 1-2:
  ✓ Remediation Agent Orchestrator (2h + 5 tests)
  ✓ Test Framework Detection (2h + 5 tests)

Day 3-4:
  ✓ Template System MVP (2h + 5 tests)
  ✓ LLM Integration (2h + 5 tests)

Day 5:
  ✓ Progressive Rollback (1-2h + 5 tests)
  ✓ Integration Testing (1-2h + 10 tests)

Status: ~30 tests, ~2500 LOC, all core components
```

### Week 2 Deliverables
```
Day 1-2:
  ✓ Additional Templates (3-4h)
  ✓ Multi-Language Support (2-3h)

Day 3:
  ✓ GitHub Integration (1-2h)

Status: ~15 tests, ~1500 LOC, 10+ templates
```

### Week 3 Deliverables
```
Day 1:
  ✓ Complete All Templates (2h)

Day 2:
  ✓ Performance & Error Handling (1-2h)

Day 3:
  ✓ Documentation (1-2h)

Status: ~30 tests, ~1000 LOC, production-ready
```

---

## 🎯 Success Criteria

✅ **Functional Requirements:**
- Generate fixes for 5+ tier-1 templates by end of Week 1
- Expand to 10+ templates by end of Week 2
- Support all 17 issue types by end of Week 3
- Validate fixes with test execution
- Progressive rollback on test failure
- GitHub integration (commits + PRs)

✅ **Non-Functional Requirements:**
- 75+ tests, all passing (100% pass rate)
- < 1500 LOC per module (maintainability)
- < 100ms fix generation (performance)
- 95%+ fix success rate (reliability)
- Complete documentation
- Production-ready error handling

✅ **Quality Requirements:**
- No pre-existing bugs introduced
- Comprehensive error handling
- Logging for debugging
- Code follows existing patterns
- Tests validate all code paths

---

## 📋 Pre-Implementation Checklist

Before we begin, confirm:

- [x] Requirements clarified (Claude API, hybrid templates+LLM, all 17 types)
- [x] Language support defined (Java + JavaScript/TypeScript)
- [x] Test framework detection approach approved
- [x] Rollback strategy confirmed (progressive)
- [x] GitHub workflow planned (one commit per issue)
- [x] Tier-1 templates identified (5 types)
- [x] Timeline established (20+ hours, 3 weeks)

✅ **Ready to Begin Phase 3.4 Implementation**

---

**Next Step:** Begin Phase 3.4a (Week 1, Core Architecture)

1. Create `.github/skills/ai-code-security-review/scripts/remediation/` directory
2. Implement `remediation-agent.cjs` orchestrator
3. Create 5 unit tests for orchestration

Estimated time: 2 hours

Shall I proceed?

