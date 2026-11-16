# 🏗️ EXTENSION REPORT SHARING & BRANCH MANAGEMENT ARCHITECTURE
## How the Remediation Agent Generates Reports and Manages Git Branches

---

## 📊 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VS CODE IDE                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           GIT HOOKS (Pre-Commit / Post-Commit)               │  │
│  └────────────────────────────────────────────────────────────┬─┘  │
│                                                                │    │
│                          ▼                                    │    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  REMEDIATION AGENT EXTENSION                               │  │
│  │  ├─ PreCommitHandler (Security Analysis)                  │  │
│  │  ├─ PostCommitHandler (Impact Analysis)                   │  │
│  │  └─ BackendCommunicator (Phase 6 Scripts)                 │  │
│  └────────────────────────────────────────────────────────────┬─┘  │
│                                                                │    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  REPORT GENERATION & STORAGE                                │  │
│  │  ├─ In-Memory Analysis Results                             │  │
│  │  ├─ VS Code Global State (StorageManager)                  │  │
│  │  └─ UI Panels (Summary, Security, Diagnostics)             │  │
│  └────────────────────────────────────────────────────────────┬─┘  │
│                                                                │    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  UI COMPONENTS                                              │  │
│  │  ├─ SummaryPanel (Impact Summary, Metrics, Diagrams)       │  │
│  │  ├─ SecurityPanel (Security Recommendations)               │  │
│  │  ├─ Tree Views (Analysis History, Recommendations)          │  │
│  │  ├─ StatusBar (Real-time Status)                           │  │
│  │  └─ Inline Diagnostics (Code-level Issues)                 │  │
│  └────────────────────────────────────────────────────────────┬─┘  │
│                                                                │    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  OUTPUT CHANNELS                                            │  │
│  │  └─ Remediation Agent Log Output                           │  │
│  └────────────────────────────────────────────────────────────┬─┘  │
│                                                                │    │
└────────────────────────────────────────────────────────────────┼────┘
                                                                 │
                   ▼                                            │
         ┌──────────────────────────────────┐                  │
         │   BACKEND SERVICES               │                  │
         │ (.github/skills/ai-change...)    │◄─────────────────┘
         │                                  │
         │ ├─ Security Analysis             │
         │ ├─ Impact Analysis               │
         │ ├─ Code Review Engine            │
         │ └─ Report Generation             │
         └──────────────────────────────────┘
```

---

## 🎯 REPORT FLOW & STORAGE

### **Phase 1: Pre-Commit Analysis (Real-Time)**

```
User commits code
    │
    ▼
Git Pre-Commit Hook (Bash Script)
    │
    ▼
PreCommitHandler.execute()
    │
    ├─ Get staged files from git
    ├─ Call Backend: runSecurityCheck(files)
    │
    ▼
Security Analysis Results (In-Memory)
    │
    ├─ Critical/High/Medium/Low counts
    ├─ Issue details per file
    └─ Severity breakdown
    │
    ▼
UI Display (Immediate)
    │
    ├─ Show findings in WebView
    ├─ Display inline diagnostics
    └─ Block commit if config says so
```

### **Phase 2: Post-Commit Analysis (After Commit)**

```
Commit successful
    │
    ▼
Git Post-Commit Hook (Bash Script)
    │
    ▼
PostCommitHandler.execute()
    │
    ├─ Get commit info (SHA, message, author)
    ├─ Get changed files
    ├─ Call Backend: runFullAnalysis()
    │
    ▼
Full Analysis Results (Impact Summary)
    │
    ├─ Impact level (Low, Medium, High, Critical)
    ├─ Changed files metrics
    ├─ Dependency impact
    ├─ Diagram generation
    └─ Recommendations
    │
    ▼
STORAGE DECISION (3 Locations)
```

---

## 💾 WHERE REPORTS ARE STORED (3 Locations)

### **Location 1: VS Code Global State (Primary Storage)**

**File:** `.vscode-ext/src/utils/storage-manager.ts`

**Storage Key:** `remediation.analysis-history`

```javascript
// Structure
{
  'remediation.analysis-history': [
    {
      commitSha: "abc123def",
      timestamp: "2026-11-16T16:09:25",
      overallLevel: "MEDIUM",
      metrics: {
        filesChanged: 3,
        linesChanged: 145,
        confidence: 85,
        impactScore: 62
      },
      findings: [
        {
          file: "src/auth.ts",
          line: 42,
          severity: "HIGH",
          title: "SQL Injection Risk",
          category: "security"
        }
      ],
      recommendations: [...]
    }
  ]
}
```

**Max History:** 20 entries (newest first)  
**Persistence:** Across VS Code restarts ✅  
**Scope:** Global (all workspaces)  
**Cleared By:** `remediation.clearHistory` command

---

### **Location 2: UI Panels (Real-Time Display)**

**Components:**
1. **SummaryPanel** (`src/ui/summary-panel.ts`)
   - Shows impact summary
   - Displays metrics grid
   - Renders embedded diagrams
   - Shows findings table

2. **SecurityPanel** (`src/ui/security-panel.ts`)
   - Lists security recommendations
   - Severity badges
   - Actionable fixes

3. **Tree Views** (in `src/views/`)
   - Analysis History tree
   - Recommendations tree
   - Click to view details

4. **Inline Diagnostics** (`src/ui/diagnostics.ts`)
   - VS Code problem markers
   - Code-level highlighting
   - Quick fixes

---

### **Location 3: Output Channel (Logging)**

**Channel Name:** `Remediation Agent`

**Output:** 
```
[INFO] 🔐 Pre-commit handler starting
[INFO] Analyzing 3 staged files
[WARN] ⚠️ Security Issues Found:
  🔴 Critical: 0
  🟠 High: 2
  🟡 Medium: 1
[INFO] 📊 Post-commit handler starting
[INFO] Analysis complete
[INFO] Impact Level: MEDIUM
[INFO] Confidence: 85%
[INFO] Issues Found: 3
```

**Accessed By:** `Ctrl+Shift+U` → Select "Remediation Agent"

---

## 🌿 BRANCH MANAGEMENT WORKFLOW

### **Current Architecture: Single Branch (Current)**

```
Current Implementation (Phase 7.11):
┌─────────────────────────────────────────┐
│         Git Repository                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Main Branch                    │   │
│  │  ├─ User commits code           │   │
│  │  ├─ Pre-commit analysis runs    │   │
│  │  ├─ User either:                │   │
│  │  │  a) Commits with warnings    │   │
│  │  │  b) Blocks commit (if config)│   │
│  │  ├─ Post-commit analysis runs   │   │
│  │  └─ Reports shown in VS Code    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  NO AUTOMATIC BRANCH CREATION           │
│  NO AUTOMATIC FIXES/COMMITS             │
│                                         │
└─────────────────────────────────────────┘
```

**Current Behavior:**
- ✅ Analysis happens in-process
- ✅ Reports displayed in UI
- ✅ No remote commits
- ✅ No branch manipulation
- ⏳ Manual fixes by developer

---

## 📋 REPORT CONTENT & STRUCTURE

### **Pre-Commit Report (SecurityAnalysisResult)**

```typescript
{
  critical: number;      // Count of critical issues
  high: number;         // Count of high issues
  medium: number;       // Count of medium issues
  low: number;          // Count of low issues
  findings: [
    {
      file: string;
      line: number;
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      title: string;
      description: string;
      evidence: string;
      remediation: string;
      category: "security" | "performance" | "quality";
    }
  ];
}
```

### **Post-Commit Report (AnalysisSummary)**

```typescript
{
  commitSha: string;
  timestamp: Date;
  overallLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  metrics: {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
    linesChanged: number;
    confidence: number;      // 0-100%
    impactScore: number;     // 0-100
    affectedDependencies: number;
    potentialBugs: number;
  };
  findings: Finding[];
  recommendations: Recommendation[];
  diagram: {
    type: "impact-graph" | "dependency-tree";
    svgContent: string;
  };
}
```

---

## 🔄 USER WORKFLOW: How Reports Are Used

### **Step 1: Developer Commits Code**
```bash
git commit -m "Add auth feature"
```

### **Step 2: Pre-Commit Analysis Runs**
```
Hook: .git/hooks/pre-commit (Bash)
  │
  ├─ Executes: PreCommitHandler.execute()
  ├─ Analyzes: staged files
  ├─ Shows: VS Code WebView panel
  │
  └─ Decision:
     a) ✅ Commit allowed (no blocking issues)
     b) ❌ Commit blocked (critical/high if configured)
```

### **Step 3: Commit Succeeds (or user fixes + retries)**
```bash
# If allowed, code is committed to main branch
```

### **Step 4: Post-Commit Analysis Runs**
```
Hook: .git/hooks/post-commit (Bash)
  │
  ├─ Executes: PostCommitHandler.execute()
  ├─ Analyzes: full commit impact
  ├─ Generates: detailed report
  │
  └─ Displays:
     1. Summary Panel (metrics, diagrams)
     2. Inline Diagnostics (code markers)
     3. Tree Views (history, recommendations)
     4. Output Logs (detailed debug info)
```

### **Step 5: Developer Reviews Report**
```
VS Code UI Shows:
├─ 📊 Summary Panel
│  ├─ Impact Level Badge
│  ├─ Metrics Grid
│  ├─ Findings Table
│  └─ Embedded Diagrams
│
├─ 🔐 Security Panel
│  ├─ Issue List
│  ├─ Severity Badges
│  └─ Recommended Fixes
│
├─ 🌳 Tree Views
│  ├─ Analysis History (click to view past results)
│  └─ Recommendations (action items)
│
└─ 📍 Inline Diagnostics
   └─ Code-level red squiggles + quick fixes
```

### **Step 6: Developer Acts on Findings**
```
Option A: Ignore (if low severity)
Option B: Create new commit with fixes
Option C: Accept technical debt (document why)
```

---

## 🚀 FUTURE: Phase 7.12+ Branch Strategy

### **Planned Enhancement (Phase 7.12): Automatic Remediation Branch**

```
Future Implementation (Phase 7.12+):
┌──────────────────────────────────────────────────────────────┐
│         Git Repository                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Main Branch (User code)                                    │
│  │                                                          │
│  ├─ Commit A (with issues found)                            │
│  │   ├─ Analysis Report Generated                           │
│  │   └─ Findings stored in history                          │
│  │                                                          │
│  └─ Commit B (continues work)                               │
│                                                              │
│  remediation/* branches (Auto-created - Future)            │
│  │                                                          │
│  ├─ remediation/fix-security-issues                         │
│  │  ├─ Auto-generated fixes                                 │
│  │  ├─ Tests run automatically                              │
│  │  ├─ Report attached to PR                                │
│  │  └─ PR for review before merge                           │
│  │                                                          │
│  └─ remediation/performance-optimization                    │
│     ├─ Performance improvements                              │
│     ├─ Metrics compared                                      │
│     └─ PR for developer review                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**How It Would Work (Phase 7.12):**
1. Analysis finds issues
2. AI agent creates branch: `remediation/fix-<issue-type>`
3. Agent commits fixes to that branch
4. Creates Pull Request with full report
5. Developer reviews and merges
6. Main branch stays clean until review

**Note:** This is NOT implemented yet. Phase 7.11 is read-only (reports only).

---

## 📊 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│  User Action: git commit                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │ .git/hooks/pre-commit   │ (Bash script)
              └────────────┬────────────┘
                           │
                    ▼
           ┌──────────────────────────────┐
           │ PreCommitHandler.execute()   │ (TypeScript)
           │ - Get staged files           │
           │ - Call security check        │
           │ - Show findings              │
           │ - Block if configured        │
           └────────────┬─────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
    ✅ ALLOW      ⚠️ WARN         ❌ BLOCK
        │               │               │
        └───────────────┴───────────────┘
                        │
                        ▼ (if allowed, commit happens)
                ┌──────────────────────┐
                │ .git/hooks/post-      │ (Bash script)
                │ commit                │
                └────────────┬──────────┘
                             │
                      ▼
              ┌───────────────────────────────┐
              │ PostCommitHandler.execute()   │ (TypeScript)
              │ - Get commit info             │
              │ - Run full analysis           │
              │ - Generate impact report      │
              └────────────┬────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
        STORAGE                         DISPLAY
           │                               │
           ▼                               ▼
    ┌─────────────┐           ┌──────────────────────┐
    │ Global State│           │ UI Components        │
    │ (VS Code)   │           │ - Summary Panel      │
    │             │           │ - Security Panel     │
    │ History:20  │           │ - Tree Views         │
    │ Recs: many  │           │ - Inline Diagnostics│
    │             │           │ - Status Bar         │
    └─────────────┘           └──────────────────────┘
           │                               │
           └───────────────┬───────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ OUTPUT Channel   │
                    │ (for debugging)  │
                    └──────────────────┘
```

---

## 🔑 KEY POINTS ABOUT REPORT SHARING

### **Where Reports Live (Summary)**

| Location | Scope | Persistence | Access Method |
|----------|-------|-------------|----------------|
| **VS Code Global State** | All workspaces | Persists across restarts | StorageManager API |
| **UI Panels** | Current session | Visible on screen | Web Views |
| **Tree Views** | Current session | Selectable history | Explorer sidebar |
| **Inline Diagnostics** | Current file | While file open | VS Code Problems pane |
| **Status Bar** | Current session | Real-time updates | Bottom of VS Code |
| **Output Channel** | Current session | In output panel | Ctrl+Shift+U |

### **What About Remote Sharing?**

**Currently (Phase 7.11):**
- ❌ No automatic GitHub/GitLab sharing
- ❌ No PR creation
- ❌ No remote comments
- ❌ No webhook integration

**Phase 7.12+:**
- ⏳ Future: Could integrate with GitHub API
- ⏳ Future: Could comment on PRs
- ⏳ Future: Could share to Slack/Teams

---

## 💡 BRANCH STRATEGY: Current vs. Future

### **CURRENT (Phase 7.11): Analysis-Only**
```
Main branch
├─ User commits code
├─ Analysis runs (read-only)
├─ Report shown in UI
└─ Developer decides what to do
```

**Advantages:**
- Non-invasive
- Developer has control
- No automatic changes
- Safe for production

**Disadvantages:**
- Manual fixes required
- Reports not automated
- No branch tracking

---

### **FUTURE (Phase 7.12+): Automated Remediation Branch**
```
Main branch
├─ User commits code
└─ Agent creates: remediation/issue-type
   ├─ Auto-applies fixes
   ├─ Runs tests
   ├─ Creates PR with report
   └─ Waits for developer review
```

**Advantages:**
- Automatic fixes
- Full audit trail (in commit history)
- Easy to review changes
- Separate from main

**Disadvantages:**
- More complex
- Requires PR review workflow
- Potential for conflicts

---

## 📌 QUICK REFERENCE: Report Locations

**To view analysis reports right now (Phase 7.11):**

1. **Analysis History**
   - Sidebar → Remediation Agent → Analysis History
   - Shows last 20 commits analyzed

2. **Security Recommendations**
   - Sidebar → Remediation Agent → Recommendations
   - Shows all security suggestions

3. **Last Commit Summary**
   - Panels → Summary (appears after commit)
   - Full report with metrics

4. **Code-Level Issues**
   - Problems pane (Ctrl+Shift+M)
   - Inline red squiggles in editor

5. **Detailed Logs**
   - Output pane (Ctrl+Shift+U)
   - Select "Remediation Agent" channel

---

## 🎯 NEXT STEPS

**Phase 7.12 (After user testing):**
- Security audit of current implementation
- Plan automated remediation branch strategy
- Design PR creation workflow
- Implement remote report sharing (if needed)

**Phase 7.13:**
- Implement automated branch creation
- Add PR generation
- Add GitHub/GitLab integration

**Phase 8:**
- Marketplace publishing
- Configuration for report sharing
- Slack/Teams webhooks

---

**Summary:** Currently, the extension generates and stores reports in VS Code's local storage and displays them via UI panels. Future phases will add automated branch creation and remote sharing capabilities.
