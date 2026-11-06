---
name: automated-remediation
description: "Applies validated security and correctness findings to a dedicated remediation branch. Executes fixes, validates with tests, and prepares for developer review."
---

# Automated Remediation Skill

## Overview

This skill implements Process 3 (Automated Fixation) from the three-process architecture. It takes a validated findings report and safely applies fixes in an isolated remediation branch.

## Workflow Summary

```
findings-report.json (from Process 2)
         ↓
    [Validate Branch Advance]
         ↓
    [Create remediation/<timestamp> branch]
         ↓
    [For each finding with autoFixable=true]
         ↓
    [Apply fix + add inline comment]
         ↓
    [Commit this specific fix]
         ↓
    [Run tests]
         ↓
    [Test fails? → Rollback this fix, continue]
         ↓
    [Test passes? → Keep fix, process next]
         ↓
    [Generate remediation report]
         ↓
    [Document manual push instructions]
         ↓
    remediation-report.json (ready for manual PR)
```

## Key Safety Guarantees

✓ **Original feature branch is NEVER checked out or modified**
✓ **Base branch is NEVER touched**
✓ **Remediation branch is completely isolated** (new branch from current feature HEAD)
✓ **Branch advance is DETECTED** (stops if original branch moved)
✓ **Each fix is TESTED** (rollback on failure)
✓ **No automatic push** (manual verification required)
✓ **Full traceability** (inline comments link to finding IDs)

## Prerequisites

Before running remediation:

### 1. Findings Report Available

```
findings-report.json
├── schemaVersion: 1
├── snapshotHead: "abc123..."  (must match current feature branch HEAD)
├── findings: [
│   ├── { id: "SEC-001", autoFixable: true, ... }
│   ├── { id: "CORR-002", autoFixable: false, ... }
│   └── ...
│ ]
└── ...
```

**Validate:**
```bash
jq .schemaVersion findings-report.json  # Should be 1
jq .snapshotHead findings-report.json   # Should match current HEAD
```

### 2. Repository State

```bash
# Working tree must be clean
git status --porcelain
# (output should be empty)

# On the feature branch
git rev-parse --abbrev-ref HEAD
# (should be feature/user-search or similar)

# Git credentials configured
git config user.name
git config user.email
```

### 3. Environment

- Node.js 18+
- Git command line
- Project dependencies installed
- Test runner available (Maven for Java)

## Running Remediation

### Step 1: Prepare the Session

```bash
# Navigate to repository root
cd /path/to/repo

# Verify we're on the feature branch
git branch --show-current

# Verify working tree is clean
git status
# (all committed, nothing staged/unstaged)

# Copy findings report into repo root
cp /path/to/findings-report.json ./

# Verify findings are valid
node .github/skills/automated-remediation/scripts/validate-findings.cjs
# Output: ✓ Findings report valid; X findings detected, Y auto-fixable
```

### Step 2: Run Remediation Agent

```bash
# Option A: Run interactively (recommended first time)
node .github/skills/automated-remediation/scripts/remediation-agent.cjs --interactive

# Option B: Run with defaults
node .github/skills/automated-remediation/scripts/remediation-agent.cjs

# Option C: Skip tests (advanced)
TEST_EXECUTION=false node .github/skills/automated-remediation/scripts/remediation-agent.cjs
```

### Step 3: Review Output

```bash
# Check the remediation branch was created
git branch | grep remediation

# Review remediation report
cat remediation-report.json

# Review commits
git log --oneline origin/main..

# Review specific changes
git diff origin/main..
```

## Agent Behavior

### Processing Each Finding

For `findings[i]` with `autoFixable: true`:

1. **Read the file**
   ```
   file = findings[i].file
   content = read(file)
   ```

2. **Apply fix using fixTemplate**
   ```
   pattern = findings[i].fixTemplate.pattern  (regex)
   replacement = findings[i].fixTemplate.replacement
   fixed = content.replace(pattern, replacement)
   ```

3. **Add inline comment**
   ```
   // FIX [SEC-001]: SQL Injection via string concatenation
   // Recommendation: Use prepared statements with parameterized queries
   <fixed code>
   ```

4. **Commit this fix**
   ```
   git add file
   git commit -m "[SEC-001] SQL Injection via string concatenation"
   ```

5. **Run tests**
   ```
   mvn test  (for Java/Maven projects)
   ```

6. **On test failure: Rollback**
   ```
   git reset --hard HEAD~1
   Record [SEC-001] as ROLLED_BACK
   Continue with next finding
   ```

7. **On test success: Continue**
   ```
   Record [SEC-001] as SUCCESS
   Process next finding
   ```

### Handling auto FixableFindings

For `findings[i]` with `autoFixable: false`:

```
→ Skip (do not attempt fix)
→ Record in unresolvedFindings
→ Include manual remediation guidance in report
→ Report as "REQUIRES_MANUAL_FIX"
```

### Test Execution

**Auto-detected test commands:**

```javascript
// Java/Maven
"mvn test"
"mvn clean test"

// Java/Gradle
"gradle test"
"./gradlew test"

// Node.js
"npm test"
"yarn test"

// Python
"pytest"
"python -m pytest"
```

**Override:**
```bash
export TEST_COMMAND="mvn clean verify"
node .github/skills/automated-remediation/scripts/remediation-agent.cjs
```

## Outputs

### remediation-report.json

```json
{
  "schemaVersion": 1,
  "timestamp": "2025-11-05T17:00:00Z",
  "originalBranch": "feature/user-search",
  "originalHeadSha": "abc123...",
  "remediationBranch": "remediation/20251105-170000",
  "remediationHeadSha": "xyz789...",
  
  "appliedFixes": [
    {
      "findingId": "SEC-001",
      "file": "src/main/java/com/example/UserSearch.java",
      "line": 42,
      "title": "SQL Injection via string concatenation",
      "status": "SUCCESS",
      "testResult": "PASS",
      "commitSha": "abc111..."
    },
    {
      "findingId": "CORR-002",
      "file": "src/main/java/com/example/UserSearch.java",
      "line": 45,
      "title": "Null pointer dereference on empty result set",
      "status": "SUCCESS",
      "testResult": "PASS",
      "commitSha": "abc222..."
    }
  ],
  
  "failedFixes": [
    {
      "findingId": "CONFIG-004",
      "reason": "Tests failed after applying fix; rolled back",
      "testFailureMessage": "FileNotFoundError: /etc/secrets.conf not found"
    }
  ],
  
  "unresolvedFindings": [
    {
      "findingId": "TEST-003",
      "reason": "autoFixable: false (manual test creation required)",
      "manualRemediationGuidance": "Add test cases for SQL injection payloads and empty result sets"
    }
  ],
  
  "testSummary": {
    "executed": true,
    "totalTests": 45,
    "passed": 45,
    "failed": 0,
    "command": "mvn test",
    "duration_ms": 3250
  },
  
  "prTemplate": {
    "title": "Automated Remediation: Security & Correctness Fixes",
    "description": "# Automated Remediation Report\n\n...",
    "labels": ["automated", "security", "bugfix"]
  },
  
  "nextSteps": [
    "1. Review remediation changes",
    "2. Run tests locally: mvn test",
    "3. Push remediation branch: git push origin remediation/20251105-170000",
    "4. Create PR to feature/user-search with the provided template",
    "5. Merge after approval"
  ]
}
```

### remediation-log.txt

Complete log of all operations:

```
[17:00:01] Remediation started
[17:00:02] Validating findings report...
[17:00:03] ✓ Findings report valid
[17:00:04] Checking branch advance...
[17:00:05] Current HEAD: abc123... (matches snapshot)
[17:00:06] Creating remediation branch: remediation/20251105-170000
[17:00:07] Switched to new branch 'remediation/20251105-170000'
[17:00:08]
[17:00:09] Processing [SEC-001] SQL Injection via string concatenation
[17:00:10] → Applying fix using fixTemplate pattern...
[17:00:11] → Adding inline comment [SEC-001]
[17:00:12] → Committing: [SEC-001] SQL Injection via string concatenation
[17:00:13] → Running tests: mvn test
[17:00:15] ✓ Tests passed (45/45)
[17:00:16]
[17:00:17] Processing [CORR-002] Null pointer dereference...
... (continues for each fix)
```

## Error Handling

### Branch Advance Detected

```
ERROR: Original branch HEAD changed during remediation

Expected HEAD: abc123def456
Current HEAD: ghi789jkl012

This could mean:
  - Someone pushed new commits to your feature branch
  - You accidentally created new commits elsewhere

Action Required:
  1. Delete the remediation branch: git branch -D remediation/20251105-170000
  2. Regenerate findings report from current HEAD
  3. Restart remediation
```

### Test Failure - Specific Fix Rolled Back

```
✗ Tests failed after applying [CONFIG-004]

TestFailureOutput:
  FileNotFoundError: /etc/secrets.conf not found
  
Rolling back specific fix [CONFIG-004]...
✓ Rolled back successfully

This fix requires manual implementation or environment setup.
It will be listed as ROLLED_BACK in the final report.

Continuing with next fix...
```

### Git Credentials Not Configured

```
⚠ Warning: Git credentials not configured

Current config:
  user.name: (not set)
  user.email: (not set)

To push the remediation branch, you need:
  git config user.name "Your Name"
  git config user.email "your.email@example.com"

After setup, you can push with:
  git push origin remediation/20251105-170000
```

## Manual PR Creation

After remediation completes, create the PR manually:

```bash
# 1. Push the remediation branch
git push origin remediation/20251105-170000

# 2. Create PR using GitHub CLI (if available)
gh pr create \
  --base feature/user-search \
  --head remediation/20251105-170000 \
  --title "Automated Remediation: Security & Correctness Fixes" \
  --body @remediation-report.json

# Or create via GitHub web interface:
# - Navigate to repository
# - Click "Compare & Pull Request"
# - Select base: feature/user-search
# - Select head: remediation/20251105-170000
# - Use PR template from remediation-report.json
```

## Validation Checklist

Before merging remediation PR:

- [ ] **All fixes reviewed** - Each commit explains the change
- [ ] **Tests pass** - Both pre-existing and new tests pass
- [ ] **No unrelated changes** - Only the remediation is included
- [ ] **Comments clear** - Inline comments link to finding IDs
- [ ] **Rollback notes understood** - Understand which fixes were rolled back and why
- [ ] **Unresolved findings addressed** - Plan for manual fixes captured
- [ ] **Merge conflict free** - No conflicts with current feature branch

## Troubleshooting

### Remediation branch not created

```bash
# Check if already exists
git branch | grep remediation

# Check Git permissions
git branch -a

# Manually create and try again
git checkout -b remediation/20251105-manual
```

### Fix pattern didn't match

```bash
# Check the actual file content
cat src/file.java | grep -n "pattern"

# Verify fixTemplate pattern is correct
jq '.findings[0].fixTemplate.pattern' findings-report.json

# Try manual fix or regenerate findings with better pattern
```

### Tests won't run

```bash
# Check if test command is detected
export TEST_COMMAND="mvn test"
echo $TEST_COMMAND

# Verify project structure
ls pom.xml
mvn test  # Try manually

# If fails, skip tests and document
TEST_EXECUTION=false node remediation-agent.cjs
```

## Support & Diagnostics

Enable verbose logging:

```bash
export DEBUG=true
node .github/skills/automated-remediation/scripts/remediation-agent.cjs
```

This will output:
- All Git commands executed
- File content before/after fixes
- Full test output
- Rollback details

Capture diagnostic data:

```bash
# Save everything for support
mkdir -p diagnostics
cp remediation-report.json diagnostics/
cp remediation-log.txt diagnostics/
git log --oneline remediation/20251105-170000 > diagnostics/commits.log
git diff origin/main > diagnostics/changes.patch
zip -r diagnostics.zip diagnostics/
```

