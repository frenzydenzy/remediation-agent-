# AI Change Impact Analysis Agent - Quick Start Guide

## Overview

The **AI Change Impact Analysis Agent** analyzes pull request changes to understand their significance, classify their impact level, calculate metrics, and generate comprehensive reports.

This guide shows how to use the agent to analyze changes in your repository.

---

## Installation & Setup

### Prerequisites
- Node.js 14+ 
- Git repository with committed changes
- Access to repository source code

### Setup
```bash
# No additional installation required
# Agent is self-contained in .github/skills/ai-change-impact-analysis/
```

---

## Basic Usage

### Phase 4.1: Collect PR Changes

Collect and validate PR scope:

```bash
node .github/skills/ai-change-impact-analysis/scripts/collect-pr-changes.cjs \
  --repo . \
  --base origin/master \
  --head HEAD \
  --output reports/change-impact/PR-123
```

**Output**: `reports/change-impact/PR-123/context-package.json`

```json
{
  "schemaVersion": "1.0",
  "collectedAt": "2025-12-12T14:00:00Z",
  "repository": {
    "name": "my-repo",
    "url": "https://github.com/org/my-repo"
  },
  "references": {
    "base": { "input": "origin/master", "sha": "abc123..." },
    "head": { "input": "HEAD", "sha": "def456..." }
  },
  "diff": {
    "files": [
      {
        "path": "src/api/user.ts",
        "status": "modified",
        "additions": 45,
        "deletions": 12
      }
    ],
    "statistics": {
      "totalFiles": 5,
      "filesAdded": 2,
      "filesModified": 3,
      "filesDeleted": 0,
      "totalLinesAdded": 156,
      "totalLinesDeleted": 28
    }
  }
}
```

---

## Understanding the Analysis

### Classification Levels

The agent classifies changes into one of four levels:

| Level | Definition | Examples |
|-------|-----------|----------|
| **MINOR** | Isolated, low-risk changes | Comments, formatting, docs |
| **MODERATE** | Localized behavior changes | New internal functions, validation rules |
| **MAJOR** | Significant functional/API changes | Endpoint changes, schema changes |
| **CRITICAL** | Severe security/data/compatibility impact | Auth bypass, data loss, widespread breaks |

### Metrics Collected

The agent collects deterministic metrics:

**Code Metrics**:
- Files added/modified/deleted/renamed
- Lines added/deleted
- Functions/classes changed
- Large files detected

**Dependency Metrics**:
- Directly changed modules
- Discovered direct dependents (single hop)
- Indicators of transitive/external consumers

**API Metrics**:
- Endpoints added/modified/removed
- Contract field changes
- Potential breaking changes

**Data Metrics**:
- Tables/columns added/modified/deleted
- Constraints/indexes changed
- Migrations detected

**Risk Indicators**:
- Security-sensitive files touched
- Configuration changes
- Infrastructure changes
- Public interface modifications

### Measurement Status

Each metric includes a measurement status:
- **measured** — High confidence, calculated from available data
- **partially_measured** — Partially available, some unknowns
- **not_measured** — Cannot be calculated, documented limitation

---

## Example Scenarios

### Scenario 1: Analyzing a Feature Branch

```bash
# Compare feature branch to main/master
node .github/skills/ai-change-impact-analysis/scripts/collect-pr-changes.cjs \
  --repo . \
  --base origin/master \
  --head feature/customer-validation \
  --output reports/change-impact/PR-42
```

**Expected output**:
- Repository validation ✓
- Reference resolution ✓
- Merge-base calculation ✓
- Diff collection with file status
- Statistics: files changed, lines added/deleted

### Scenario 2: Analyzing a Remediation PR

```bash
# Compare original feature to remediation fix
node .github/skills/ai-change-impact-analysis/scripts/collect-pr-changes.cjs \
  --repo . \
  --base feature/original \
  --head feature/remediation \
  --output reports/change-impact/REMEDIATION-42
```

**Expected output**:
- Shows only the remediation changes
- Can be compared to original PR impact

### Scenario 3: Consolidated Analysis

```bash
# Compare baseline to final remediation
node .github/skills/ai-change-impact-analysis/scripts/collect-pr-changes.cjs \
  --repo . \
  --base origin/master \
  --head feature/remediation \
  --output reports/change-impact/CONSOLIDATED-42
```

**Expected output**:
- Shows combined impact of feature + remediation
- Can attribute changes to respective phases

---

## Understanding the Output

### Context Package Structure

```json
{
  "schemaVersion": "1.0",
  "collectedAt": "ISO8601 timestamp",
  "phase": "4.1",
  
  "repository": {
    "path": "/path/to/repo",
    "name": "repo-name",
    "url": "https://github.com/owner/repo"
  },
  
  "references": {
    "base": {
      "input": "origin/master",
      "sha": "40-character SHA"
    },
    "head": {
      "input": "HEAD",
      "sha": "40-character SHA"
    },
    "mergeBase": {
      "sha": "40-character SHA"
    }
  },
  
  "diff": {
    "files": [
      {
        "path": "relative/file/path",
        "status": "added|modified|deleted|renamed",
        "previousPath": null,
        "additions": 45,
        "deletions": 12
      }
    ],
    "statistics": {
      "totalFiles": 5,
      "filesAdded": 2,
      "filesModified": 3,
      "filesDeleted": 0,
      "filesRenamed": 0,
      "totalLinesAdded": 156,
      "totalLinesDeleted": 28,
      "totalLinesChanged": 184
    }
  },
  
  "validation": {
    "repositoryValid": true,
    "workingTreeClean": true,
    "referencesResolved": true,
    "diffCollected": true
  }
}
```

---

## Common Errors

### Error: "Cannot resolve reference"
```
ERROR: Cannot resolve reference: feature/my-branch
```
**Cause**: Branch doesn't exist or isn't accessible  
**Solution**: 
- Verify branch name: `git branch -a`
- Fetch latest: `git fetch origin`
- Use full reference: `origin/feature/my-branch`

### Error: "Repository has uncommitted changes"
```
ERROR: Repository has uncommitted changes (48 files).
```
**Cause**: Working tree has uncommitted modifications  
**Solution**:
- Commit changes: `git commit -am "message"`
- Stash changes: `git stash`
- Or create a fresh clone for analysis

### Error: "Not a Git repository"
```
ERROR: Not a Git repository: /path/to/repo
```
**Cause**: Path doesn't contain a `.git` directory  
**Solution**:
- Verify path: `ls -la /path/to/repo/.git`
- Initialize repo: `git init`

---

## Integration with Remediation Workflow

### Original PR Analysis
```bash
# Analyze the original feature PR
node .github/skills/ai-change-impact-analysis/scripts/collect-pr-changes.cjs \
  --repo . \
  --base origin/master \
  --head origin/feature/customer-validation \
  --output reports/change-impact/FEATURE-123
```

### Remediation PR Analysis
```bash
# Analyze the security fix
node .github/skills/ai-change-impact-analysis/scripts/collect-pr-changes.cjs \
  --repo . \
  --base origin/feature/customer-validation \
  --head origin/feature/customer-validation-fixed \
  --output reports/change-impact/REMEDIATION-123
```

### Combined Impact
```bash
# See total impact: feature + fix
node .github/skills/ai-change-impact-analysis/scripts/collect-pr-changes.cjs \
  --repo . \
  --base origin/master \
  --head origin/feature/customer-validation-fixed \
  --output reports/change-impact/COMBINED-123
```

---

## Testing the Implementation

### Run Unit Tests
```bash
# Test Phase 4.1 collector
node .github/skills/ai-change-impact-analysis/tests/phase-4.1.test.cjs
```

**Expected output**:
```
✓ Phase 4.1: PR Scope Collector - Unit Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✔ TEST 1: Phase 4.1 script exists
✔ TEST 2: Script is valid Node.js file
...
Status: All tests passing ✓
```

---

## Reference Documentation

For more detailed information, see:

- **[CHANGE-IMPACT-REPORT-SCHEMA.md](.github/skills/ai-change-impact-analysis/references/CHANGE-IMPACT-REPORT-SCHEMA.md)**  
  Complete JSON schema for impact reports

- **[CLASSIFICATION-RULES.md](.github/skills/ai-change-impact-analysis/references/CLASSIFICATION-RULES.md)**  
  Evidence-based classification methodology and examples

- **[IMPACT-METRICS.md](.github/skills/ai-change-impact-analysis/references/IMPACT-METRICS.md)**  
  Metrics calculation methods and limitations

- **[SKILL.md](.github/skills/ai-change-impact-analysis/SKILL.md)**  
  Complete skill overview with all phases

---

## Next Steps

### Phase 4.2: Snapshot Builder & Context Discovery
```bash
# Build before/after snapshots and discover context
node .github/skills/ai-change-impact-analysis/scripts/build-snapshots.cjs \
  --input reports/change-impact/PR-123/context-package.json \
  --output reports/change-impact/PR-123
```

### Phase 4.3: Classification Engine
```bash
# Classify changes and generate confidence assessments
node .github/skills/ai-change-impact-analysis/scripts/classify-changes.cjs \
  --input reports/change-impact/PR-123/snapshots.json \
  --output reports/change-impact/PR-123
```

### Phase 4.7: Report Formatter
```bash
# Generate final markdown and JSON reports
node .github/skills/ai-change-impact-analysis/scripts/generate-impact-report.cjs \
  --input reports/change-impact/PR-123/analysis.json \
  --output reports/change-impact/PR-123
```

---

## Safety Guarantees

✅ **The agent will**:
- Only analyze committed changes
- Verify repository integrity
- Detect uncommitted changes and stop
- Provide clear error messages
- Output only to designated directories

❌ **The agent will NOT**:
- Modify source code
- Create branches or commits
- Modify PR status or merge state
- Execute deployments or CI/CD
- Include secrets or credentials in reports

---

## Support & Troubleshooting

For questions or issues:

1. Check the error message - most include solutions
2. Review reference documentation
3. Verify repository state: `git status`
4. Run unit tests to confirm setup: `npm run test:change-impact`
5. Check Git configuration: `git config --list`

---

## Architecture Overview

```
Phase 4.1: Collect PR Changes
  ↓
Phase 4.2: Build Snapshots & Discover Context
  ↓
Phase 4.3: Classify Changes
  ↓
Phase 4.4: Analyze Dependencies
  ↓
Phase 4.5: Calculate Metrics
  ↓
Phase 4.6: Generate Impact Flow
  ↓
Phase 4.7: Format Reports
  ↓
Phase 4.8: Integrate with Workflow (GitHub Actions, CLI)
```

Each phase builds on the previous, producing a `context-package.json` that carries forward the analysis.

---

**Last Updated**: December 12, 2025  
**Phase**: 6 Foundation (Phase 4.1 Complete)  
**Status**: ✅ Ready for use
