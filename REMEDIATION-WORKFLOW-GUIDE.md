# Automated Remediation Workflow - Integration Guide

## Overview

The automated remediation workflow automatically detects code commits, analyzes them for vulnerabilities, creates remediation branches with fixes, and requests user approval before merging.

**Complete Workflow:**
```
Feature Branch Commit
        ↓
   [Commit Detected]
        ↓
  [Run Analysis] ← Local Code Analyzer
        ↓
   [Findings Found?]
     ├─ No → Clean! ✓
     └─ Yes ↓
  [Create Remediation Branch]
        ↓
  [Apply Automatic Fixes]
        ↓
  [Request User Approval]
        ↓
        ├─ Approve → [Auto-Merge] → Remediation merged back ✓
        ├─ Reject  → [Delete Branch] → Manual review later
        └─ Manual  → [Keep Branch] → User reviews manually
```

---

## Components

### 1. Commit Detector (`commit_detector.py`)
Monitors Git repository and captures commit information.

**Key Methods:**
- `get_head_commit()` - Get current HEAD commit info
- `get_changed_files()` - List files modified in a commit
- `get_file_stats()` - Get additions/deletions per file
- `filter_code_files()` - Filter to only code files

**Usage:**
```python
from commit_detector import CommitDetector

detector = CommitDetector('/path/to/repo')
commit = detector.get_head_commit()

print(f"SHA: {commit.sha}")
print(f"Author: {commit.author}")
print(f"Changed Files: {commit.changed_files}")

# Filter to code files
code_files = detector.filter_code_files(commit.changed_files)
```

### 2. Local Code Analyzer (`local_code_analyzer.py`)
Detects vulnerabilities in code.

**Detections:**
- **CRITICAL:** SQL Injection, Hardcoded Secrets, Command Injection, Input Validation
- **HIGH:** Weak Crypto, Path Traversal, XSS
- **MEDIUM/LOW:** Code Duplication, Complexity, Dead Code

**Usage:**
```python
from local_code_analyzer import LocalCodeAnalyzer

analyzer = LocalCodeAnalyzer('/path/to/repo')
findings = analyzer.analyze(only_files=['vulnerable_code.py'])

for finding in findings:
    print(f"{finding.severity}: {finding.title} at {finding.file}:{finding.line}")
```

### 3. Remediation Branch Manager (`remediation_branch_manager.py`)
Creates and manages isolated fix branches.

**Key Methods:**
- `create_branch()` - Create new remediation branch from commit
- `apply_fixes()` - Apply changes to branch
- `approve_remediation()` - Mark as approved
- `merge_remediation()` - Merge back to source branch
- `reject_remediation()` - Reject and delete branch

**Usage:**
```python
from remediation_branch_manager import RemediationBranchManager

manager = RemediationBranchManager('/path/to/repo')

# Create branch
branch = manager.create_branch(
    source_branch='feature/my-feature',
    source_commit='abc123def456',
    findings_count=5
)

# Apply fixes
fixes = {'app/vulnerable.py': 'fixed code here...'}
manager.apply_fixes(branch.name, fixes)

# Approve and merge
manager.approve_remediation(branch.name)
manager.merge_remediation(branch.name)
```

### 4. Remediation Orchestrator (`remediation_orchestrator.py`)
Main workflow coordinator - ties everything together.

**Key Methods:**
- `analyze_commit()` - Analyze a commit for vulnerabilities
- `create_remediation_plan()` - Create branch and generate fixes
- `apply_remediation()` - Apply fixes to branch
- `request_approval()` - Ask user for approval
- `process_approval()` - Handle user's decision
- `run_complete_workflow()` - Execute full workflow

**Usage:**
```python
from remediation_orchestrator import RemediationOrchestrator

orchestrator = RemediationOrchestrator('/path/to/repo')

# Run complete workflow for HEAD commit
success = orchestrator.run_complete_workflow('HEAD')
```

### 5. Git Post-Commit Hook (`remediation_post_commit_hook.py`)
Automatically triggers analysis when code is committed.

**Installation (Windows):**
```batch
copy sonarqube_checkermarx_skill\scripts\remediation_post_commit_hook.py .git\hooks\post-commit.py

REM Create wrapper batch file:
REM .git\hooks\post-commit (no extension)
```

**Hook Contents:**
```batch
@echo off
python "%~dp0post-commit.py"
```

---

## Usage Scenarios

### Scenario 1: Manual Full Workflow
Analyze a specific commit and get user approval:

```bash
cd /path/to/repo
python sonarqube_checkermarx_skill/scripts/remediation_orchestrator.py
```

Output:
```
================================================================================
                    AUTOMATED REMEDIATION WORKFLOW
================================================================================

================================================================================
ANALYZING COMMIT: abc123de
================================================================================

Author:    John Developer
Branch:    feature/my-feature
Message:   Add new user authentication
Files:     8

Code Files for Analysis: 6
  - app/auth.py
  - app/models/user.py
  ... and 4 more

Running analysis...

================================================================================
ANALYSIS RESULTS
================================================================================
Total Findings: 5
  CRITICAL: 2
  HIGH:     2
  MEDIUM:   1

Top Findings:
  [CRITICAL] SQL Injection in user query (app/auth.py:42)
  [CRITICAL] Hardcoded API key (app/config.py:15)
  ... and 3 more

================================================================================
CREATING REMEDIATION BRANCH
================================================================================

Branch Created: remediation/feature/my-feature/20261119-141234-abc123de
Source:         feature/my-feature
Findings:       5

Processing: app/auth.py
  Findings: 2
  Status: FIXED

Processing: app/config.py
  Findings: 1
  Status: FIXED

================================================================================
APPLYING FIXES
================================================================================

Applied fixes to 2 file(s)

================================================================================
REQUESTING APPROVAL
================================================================================

Remediation Summary:
  Branch:    remediation/feature/my-feature/20261119-141234-abc123de
  Findings:  2 CRITICAL, 2 HIGH
  Fixes:     2 files

Options:
  [a] Approve - Merge remediation to feature branch
  [r] Reject  - Delete remediation branch
  [m] Manual  - Review manually (keep branch for later)

Choice [a/r/m]: a

================================================================================
PROCESSING APPROVAL: APPROVE
================================================================================

Merging remediation to feature/my-feature...
Successfully merged remediation branch!
```

### Scenario 2: Auto-Approve for Testing
Automatically approve fixes (useful in CI/CD):

```bash
python sonarqube_checkermarx_skill/scripts/remediation_orchestrator.py --auto-approve
```

### Scenario 3: Analyze Specific Commit
```bash
python sonarqube_checkermarx_skill/scripts/remediation_orchestrator.py --commit abc123def456
```

### Scenario 4: Git Hook Automatic Detection
When you commit code:
```bash
git add app/vulnerable.py
git commit -m "Add authentication module"

[Remediation Hook] Analyzing commit...
[Remediation Hook] Found 3 issues
[Remediation Hook] Run 'remediation_orchestrator.py' to review and approve fixes
```

### Scenario 5: Manual Review Later
Keep remediation branch for manual review:

```
Choice [a/r/m]: m

Keeping remediation branch for manual review.
You can review and merge later using:
  git checkout remediation/feature/my-feature/20261119-141234-abc123de
```

Then manually review and merge:
```bash
# Review the branch
git checkout remediation/feature/my-feature/20261119-141234-abc123de
git diff feature/my-feature

# If satisfied, merge it
git checkout feature/my-feature
git merge remediation/feature/my-feature/20261119-141234-abc123de
```

---

## Workflow Details

### Approval Options

**[A] Approve**
- Automatically merges remediation branch to feature branch
- Marks all fixes as applied
- Deletes the remediation branch after merge
- Feature branch now contains the fixes
- Developer can push feature branch to remote

**[R] Reject**
- Deletes remediation branch entirely
- Keeps original code unchanged
- No automatic fixes applied
- Developer must fix issues manually or re-run workflow

**[M] Manual**
- Keeps remediation branch available
- Developer can review fixes in the branch
- Developer can manually adjust fixes if needed
- Developer can merge when ready using git merge

### Remediation Branch Naming
```
remediation/{source-branch}/{date}-{time}-{short-sha}

Example:
  remediation/feature/auth/20261119-141234-abc123de
  │           │             │       │  │
  │           │             │       │  └─ Commit SHA (first 8 chars)
  │           │             │       └─── Time (HHMMSS)
  │           │             └────────── Date (YYYYMMDD)
  │           └────────────────────── Original branch name
  └────────────────────────────────── Prefix: "remediation"
```

This naming scheme makes it easy to:
- Identify what code the branch fixes
- Find related remediation branches
- Track when analysis was done
- Know which commit was analyzed

### Metadata Tracking
All remediation branches are tracked in `.remediation/branches.json`:

```json
{
  "remediation/feature/auth/20261119-141234-abc123de": {
    "name": "remediation/feature/auth/20261119-141234-abc123de",
    "source_branch": "feature/auth",
    "source_commit": "abc123de...",
    "created_at": "2026-11-19T14:12:34.123456",
    "fixes_applied": 2,
    "findings_total": 5,
    "approval_status": "pending",
    "approval_at": null,
    "merged_at": null
  }
}
```

---

## End-to-End Demo

Run the complete demonstration:

```bash
python sonarqube_checkermarx_skill/scripts/e2e_remediation_demo.py
```

This creates a temporary test repository and demonstrates:
1. Repository initialization
2. Vulnerable code commit
3. Automatic analysis
4. Remediation branch creation
5. Fix application
6. Auto-approval and merge

Output:
```
================================================================================
END-TO-END REMEDIATION WORKFLOW DEMO
================================================================================

Step 1: Creating test repository...
  Repository: C:\Users\...\AppData\Local\Temp\remediation_test_xyz

Step 2: Creating commit with vulnerable code...
  Commit created with 7 vulnerabilities

Step 3: Initializing remediation orchestrator...
  Detector ready

Step 4: Analyzing commit...
  Found 7 findings

Step 5: Creating remediation branch...
  Branch: remediation/master/20261119-141234-abc123de
  Files to fix: 1

Step 6: Applying automatic fixes...
  Fixes applied

Step 7: Auto-approving remediation (demo mode)...
  Remediation successfully merged!

Step 8: Verifying remediation...
  Current branch: master

  Recent commits:
    abc456 Merge remediation branch...
    def789 Fix vulnerabilities detected by analysis
    ghi012 Add vulnerable code (intentional for testing)
    jkl345 Initial commit

================================================================================
DEMO SUMMARY
================================================================================
✓ Commit detection: SUCCESS
✓ Vulnerability analysis: SUCCESS (7 found)
✓ Remediation branch creation: SUCCESS
✓ Fix application: SUCCESS (1 files fixed)
✓ Approval workflow: SUCCESS
✓ Auto-merge: SUCCESS

Workflow Status: COMPLETE
```

---

## Configuration & Customization

### Filter Code File Types
Modify `detector.filter_code_files()` to include/exclude file types:

```python
# In commit_detector.py
code_extensions = {
    '.py', '.js', '.ts', '.java', '.cpp',  # Add more extensions
    # ...
}

exclude_patterns = {
    'node_modules', 'dist', 'build',  # Add patterns to skip
    # ...
}
```

### Customize Fix Application
Modify `_apply_fixes_to_file()` in remediation_orchestrator.py:

```python
# Add organization-specific fixes
if finding.category == "SQL_INJECTION":
    # Apply your standard remediation
    fixed_lines[line_idx] = apply_parameterized_query_fix(line)
```

### Auto-Approve Policy
In production, you can auto-approve specific finding levels:

```python
# In remediation_orchestrator.py
if analysis_result.critical_count == 0 and analysis_result.high_count <= 2:
    approval = "approve"  # Auto-approve low-risk fixes
else:
    approval = request_approval(...)  # Ask user for high-risk
```

---

## State & Metadata

### Analysis State
Tracked in `.remediation/analysis_state.json`:

```json
{
  "abc123de...": {
    "analyzed_at": "2026-11-19T14:12:34.123456",
    "findings": 5,
    "remediation_branch": "remediation/feature/auth/20261119-141234-abc123de",
    "merged": true,
    "approval": "approve"
  }
}
```

### Remediation Branches
Tracked in `.remediation/branches.json` (see above)

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Code Analysis & Remediation

on:
  push:
    branches: [ develop, feature/** ]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Run remediation workflow
        run: |
          cd sonarqube_checkermarx_skill/scripts
          python remediation_orchestrator.py --auto-approve
      
      - name: Commit changes
        run: |
          git config user.name "Remediation Bot"
          git config user.email "bot@example.com"
          git push
```

---

## Troubleshooting

### "No git repository found"
Ensure you're running from within a Git repository directory.

### "Commit not found"
Verify the commit SHA exists: `git log --oneline | head`

### "Failed to create remediation branch"
Ensure clean working directory: `git status`

### "Merge conflict"
Automatically resolved if fixes don't conflict. If conflict occurs, the branch is kept for manual resolution.

### "No changes detected"
If analyzer finds issues but all files are auto-fixed, the commit still goes through successfully.

---

## Next Steps

1. **Review Results:** Always review the findings reported
2. **Approve Fixes:** Use interactive approval to control merges
3. **Push Feature Branch:** Push to remote after remediation merged
4. **Create Pull Request:** Create PR from feature to main/develop
5. **Continue Development:** Feature branch is now cleaner

---

## Summary

The automated remediation workflow provides:
- ✅ Automatic commit detection
- ✅ Instant vulnerability analysis
- ✅ Isolated fix branches (no base code changes)
- ✅ Optional automatic fix application
- ✅ User approval before merge
- ✅ Full audit trail and metadata
- ✅ CI/CD ready
- ✅ Zero external dependencies

**Perfect for:** Catching issues early, maintaining code quality, and reducing manual code review workload.
