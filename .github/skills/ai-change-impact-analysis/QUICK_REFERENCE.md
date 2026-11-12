# AI Change Impact Analysis Agent - Quick Reference Guide

## 🚀 Quick Start

### Prerequisites
```bash
# Node.js 14+ required
node --version

# Install dependencies
npm install minimist
```

### Running the Complete Pipeline

```bash
# Analyze changes from main to HEAD
node .github/skills/ai-change-impact-analysis/scripts/change-impact-agent.cjs

# Analyze with custom parameters
node .github/skills/ai-change-impact-analysis/scripts/change-impact-agent.cjs \
  --repo C:\path\to\repo \
  --base main \
  --head feature/branch \
  --output ./custom-reports

# Show help
node .github/skills/ai-change-impact-analysis/scripts/change-impact-agent.cjs --help
```

---

## 📊 Output Files

After successful execution, find these reports in your output directory:

### Human-Readable Report
- **File:** `change-impact-report.md`
- **Format:** Markdown
- **Contents:**
  - Executive Summary
  - File Changes
  - Classification Results
  - Impact Analysis
  - Risk Assessment
  - Metrics
  - Diagrams (embedded Mermaid)
  - Recommendations

### Machine-Readable Report
- **File:** `change-impact-report.json`
- **Format:** JSON (Schema v1.0)
- **Contents:**
  - Full metadata and timestamps
  - All analysis data
  - Validation status
  - Diagram references

### Diagrams
- **File:** `technical-impact.mmd`
  - Technical dependency flows
  - Component relationships
  - Mermaid syntax

- **File:** `business-impact.mmd`
  - Business functionality flows
  - Impact categories
  - Severity levels

### Intermediate Files (for debugging)
- `context.json` - PR scope and diff data (Phase 4.1)
- `snapshots.json` - File content and symbols (Phase 4.2)
- `classification.json` - Impact classification (Phase 4.3)
- `analysis.json` - Detailed impact analysis (Phase 4.4-4.5)
- `impact-flow.json` - Flow diagrams (Phase 4.6)

---

## 📈 Understanding the Reports

### Impact Levels

| Level | Emoji | Meaning | Example |
|-------|-------|---------|---------|
| CRITICAL | 🔴 | Breaking changes, severe impact | Removing public API |
| MAJOR | 🟠 | Significant changes, requires review | Modifying core functionality |
| MODERATE | 🟡 | Medium impact, may need testing | Adding new feature |
| MINOR | 🟢 | Small impact, low risk | Documentation updates |
| LOW | ⚪ | Negligible impact | Comment changes |

### Measurement Status

- **measured** - Accurate data available
- **partially_measured** - Partial data (see limitations)
- **not_measured** - Data unavailable (marked explicitly)

### Confidence Levels

- **90-100%** - High confidence (clear patterns match)
- **70-90%** - Medium confidence (multiple signals)
- **<70%** - Low confidence (limited or conflicting signals)

---

## 🔍 Sample Reports

### Executive Summary Example
```
Overall Impact Level: 🟠 MAJOR
Confidence: 85%
Total Files Changed: 6
Lines Added: 150 | Lines Deleted: 45

Critical Issues: 1
Major Issues: 3
Moderate Issues: 2
Minor Issues: 1
```

### Impact Categories Example
```
🔐 Security Impact: 1 item
  - Critical security changes detected

🔌 API Impact: 2 items
  - API endpoints modified

💾 Data Model Impact: 1 item
  - Database schema updated

🧪 Testing Impact: 2 items
  - Test coverage increased
```

### Metrics Example
```
Code Metrics (measured):
  - Files: +2 ~3 -1
  - Lines: +150 -45
  
API Metrics (partially_measured):
  - Endpoints: +3 ~2 -0
  - Breaking Changes: 1
  
Dependency Metrics (partially_measured):
  - Direct Dependents: 0 discovered
  - Limitation: External consumers not analyzed
```

---

## 🧪 Testing

### Run Individual Tests
```bash
# Phase 4.1: PR Collector
node .github/skills/ai-change-impact-analysis/tests/phase-4.1.test.cjs

# Phase 4.4-4.5: Analysis & Metrics
node .github/skills/ai-change-impact-analysis/tests/phase-4.4-4.5.test.cjs

# Phase 4.6: Impact Flow
node .github/skills/ai-change-impact-analysis/tests/phase-4.6.test.cjs

# Phase 4.7: Report Formatter
node .github/skills/ai-change-impact-analysis/tests/phase-4.7.test.cjs

# Phase 4.8: Workflow Integration
node .github/skills/ai-change-impact-analysis/tests/phase-4.8.test.cjs
```

### Test Coverage
- 60 tests across 4 implementation phases
- All tests passing (100% ✓)
- Unit and integration tests
- Error handling validation

---

## 🔧 CLI Options

```
change-impact-agent [OPTIONS]

OPTIONS:
  --repo, -r          Repository path (default: .)
  --base              Base branch for comparison (default: main)
  --head              Head reference to analyze (default: HEAD)
  --output, -o        Output directory (default: reports/change-impact)
  --skip              Skip phases (comma-separated)
  --help, -h          Show help message

EXAMPLES:
  # Analyze changes against master branch
  change-impact-agent --base master --head origin/feature

  # Use custom output location
  change-impact-agent --output ./my-reports

  # Skip report formatting for speed
  command --skip "Phase 4.7"

  # Combine options
  command --repo /path/to/repo --base main --output ./analysis
```

---

## 🔗 GitHub Actions Integration

### Automatic Detection
- Detects GitHub Actions environment via `GITHUB_ACTIONS` environment variable
- Sets output variables for downstream steps
- Appends summary to job summary (visible in PR review)

### Output Variables
```yaml
IMPACT_LEVEL      # critical | major | moderate | minor
CONFIDENCE        # 0-100 (percentage)
FILES_CHANGED     # Number of files modified
REPORT_PATH       # Path to JSON report
```

### Example Workflow Step
```yaml
- name: Analyze PR Impact
  run: |
    node .github/skills/ai-change-impact-analysis/scripts/change-impact-agent.cjs \
      --repo . \
      --base ${{ github.base_ref }} \
      --head ${{ github.head_ref }}
  
  # Access outputs in subsequent steps
  # ${{ env.GITHUB_OUTPUT }} will contain: IMPACT_LEVEL=major
```

### Using Outputs in GitHub Actions
```yaml
- name: Check Impact
  run: |
    IMPACT=${{ env.IMPACT_LEVEL }}
    if [[ "$IMPACT" == "critical" ]]; then
      echo "⚠️ Critical changes detected - manual review required"
      exit 1
    fi
```

---

## 🛠️ Troubleshooting

### Problem: "Not a Git repository"
**Solution:** Ensure you're running from a Git repository root
```bash
cd /path/to/git/repo
node .github/skills/ai-change-impact-analysis/scripts/change-impact-agent.cjs
```

### Problem: "Base branch not found"
**Solution:** Verify branch exists and is available locally
```bash
git branch -a  # List all branches
git fetch     # Update remote tracking
```

### Problem: "Cannot find module 'minimist'"
**Solution:** Install the required dependency
```bash
npm install minimist
```

### Problem: Permission denied on scripts
**Solution (Windows):** Run from PowerShell as Administrator
```powershell
cd C:\path\to\repo
node .github\skills\ai-change-impact-analysis\scripts\change-impact-agent.cjs
```

### Problem: No output files generated
**Solution:** Check for errors in Phase 4.1 - PR Collector
- Verify repository is valid Git repo
- Check branch names are correct
- Verify working directory has no uncommitted changes

### Problem: Reports missing data
**Solution:** Check intermediate files for phase failures
1. Check if `context.json` exists (Phase 4.1)
2. Check if `snapshots.json` exists (Phase 4.2)
3. Check if `classification.json` exists (Phase 4.3)
4. Review error messages for specific phase failure

---

## 📚 For More Information

### Documentation Files
- `.github/skills/ai-change-impact-analysis/SKILL.md` - Complete skill overview
- `.github/skills/ai-change-impact-analysis/QUICKSTART.md` - Detailed setup guide
- `.github/skills/ai-change-impact-analysis/references/CHANGE-IMPACT-REPORT-SCHEMA.md` - Report schema
- `.github/skills/ai-change-impact-analysis/references/CLASSIFICATION-RULES.md` - Classification rules
- `.github/skills/ai-change-impact-analysis/references/IMPACT-METRICS.md` - Metrics methodology

### Implementation Files
- Phase 4.1: `collect-pr-changes.cjs`
- Phase 4.2: `build-snapshots.cjs`
- Phase 4.3: `classify-changes.cjs`
- Phase 4.4-4.5: `analyze-impact.cjs`
- Phase 4.6: `generate-impact-flow.cjs`
- Phase 4.7: `format-report.cjs`
- Phase 4.8: `change-impact-agent.cjs` (orchestrator)

---

## ⚡ Performance Tips

### For Large Repositories
```bash
# Skip intermediate formats if you only need JSON
node .github/skills/ai-change-impact-analysis/scripts/format-report.cjs \
  --input reports/change-impact/impact-flow.json \
  --output reports/change-impact
# This produces JSON but skips Markdown (faster)
```

### For Testing
```bash
# Run analysis on specific branch
node .github/skills/ai-change-impact-analysis/scripts/change-impact-agent.cjs \
  --base main \
  --head develop \
  --skip "Phase 4.6,Phase 4.7"  # Skip diagrams for speed
```

### For CI/CD
```bash
# Fail fast on critical issues
set IMPACT_LEVEL from output
if IMPACT_LEVEL == "critical":
  exit 1
```

---

## 🎯 Best Practices

1. **Run Before Merge**
   - Execute analysis on feature branch before PR merge
   - Use output to inform review requirements

2. **Integrate with CI/CD**
   - Add as GitHub Action on pull requests
   - Fail builds for critical impact
   - Generate reports as artifacts

3. **Review Output**
   - Read Markdown report for human context
   - Validate JSON report matches expectations
   - Check diagrams for unexpected relationships

4. **Update Thresholds**
   - Consider custom impact thresholds for your team
   - Adjust confidence levels based on project maturity
   - Document team-specific impact rules

5. **Iterate**
   - Use reports to improve code review process
   - Track impact trends over time
   - Validate assumptions with actual metrics

---

## ✅ Validation Checklist

- [ ] Node.js 14+ installed
- [ ] `minimist` dependency installed
- [ ] Running from Git repository root
- [ ] Correct base/head branches specified
- [ ] Sufficient disk space for reports
- [ ] Output directory writable
- [ ] Git credentials configured (for Phase 5)

---

## 🚀 Next Steps

1. **Run your first analysis:**
   ```bash
   node .github/skills/ai-change-impact-analysis/scripts/change-impact-agent.cjs
   ```

2. **Review the reports:**
   - Open `change-impact-report.md` in your editor
   - View diagrams in Markdown viewer
   - Check `change-impact-report.json` in IDE

3. **Integrate with your workflow:**
   - Add to GitHub Actions CI/CD
   - Configure for your team's needs
   - Set impact thresholds for reviews

4. **Monitor and improve:**
   - Track impact analysis accuracy
   - Refine classification rules
   - Enhance team collaboration

---

**Status:** Production Ready ✓  
**Version:** 1.0  
**Last Updated:** 2026-11-12
