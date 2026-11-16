# Phase 7.11 Manual Testing Guide
## AI Code Remediation Agent VS Code Extension

**Status:** Ready for Installation & Testing
**Package:** `ai-remediation-agent-0.1.0.vsix` (36.85 MB)
**Testing Duration:** 60-90 minutes

---

## Part 1: Extension Installation (5 minutes)

### Step 1.1: Install the Extension

**Option A: Command Line Installation (Recommended)**
```powershell
cd "C:\Users\harbansal\Documents\Projects\remedition skill\.vscode-ext"
code --install-extension ai-remediation-agent-0.1.0.vsix
```

**Option B: Manual Installation via VS Code UI**
1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Click the `...` (More Actions) menu at the top of the Extensions panel
4. Select "Install from VSIX..."
5. Navigate to `.vscode-ext/ai-remediation-agent-0.1.0.vsix`
6. Click "Install"
7. Click "Reload" when prompted

### Step 1.2: Verify Installation
- [ ] Extension appears in Extensions list as "AI Code Remediation Agent"
- [ ] No error messages in Output panel
- [ ] Status bar shows no error indicators
- [ ] Extension activation message appears in Output → "Remediation Agent" channel

**Expected Output:**
```
🚀 Activating AI Remediation Agent Extension
✓ Tree view providers registered
✓ Inline diagnostics initialized
✓ UI panels initialized
✓ Handlers initialized
✓ Git hooks installed
```

---

## Part 2: UI Component Verification (15 minutes)

### Step 2.1: Verify Tree Views Appear
1. Look at the VS Code Explorer sidebar (Ctrl+Shift+E)
2. You should see two new tree views below the file explorer:
   - [ ] **📊 Analysis History** - Shows past security analyses
   - [ ] **💡 Recommendations** - Shows aggregated recommendations

**If NOT visible:**
- Press `Ctrl+Shift+P` → type "Focus on Explorer"
- Check if tree views appear after folder is open
- Verify workspace folder is open (File → Open Folder)

### Step 2.2: Verify Status Bar
1. Look at the bottom status bar of VS Code
2. You should see:
   - [ ] "Remediation Agent" indicator
   - [ ] Current status (Ready/Analyzing/Error)
   - [ ] No error symbols

### Step 2.3: Verify Commands Are Registered
1. Press `Ctrl+Shift+P` (Command Palette)
2. Type "Remediation" and verify these commands appear:
   - [ ] `Remediation Agent: Authenticate with GitHub/GitLab`
   - [ ] `Remediation Agent: Run Full Analysis`
   - [ ] `Remediation Agent: Open Settings`
   - [ ] `remediation.refreshHistory`
   - [ ] `remediation.clearHistory`
   - [ ] `remediation.viewAnalysis`
   - [ ] `remediation.clearRecommendations`

---

## Part 3: Pre-Commit Workflow Testing (25 minutes)

### Prerequisites
- [ ] Have a Git repository open in VS Code
- [ ] Have some modified files with staged changes
- [ ] Git hooks should be installed (done automatically on extension activation)

### Step 3.1: Set Up Test Environment
```bash
# In VS Code terminal or external terminal:
cd "C:\your\test\repository"

# Create a test file or modify an existing one
echo "test content" > test-file.js

# Stage the file
git add test-file.js
```

### Step 3.2: Trigger Pre-Commit Analysis
```bash
# Attempt to commit
git commit -m "Test commit for pre-commit analysis"
```

**What should happen:**
1. The Git hook runs
2. Pre-commit handler executes
3. One of these should occur:

**Case A: No security issues found**
- [ ] Commit succeeds
- [ ] Status bar shows "Ready"
- [ ] No panel appears

**Case B: Security issues found (non-blocking)**
- [ ] 🔐 **Security Findings Panel** appears
- [ ] Shows list of findings with:
  - [ ] File names and line numbers
  - [ ] Severity badges (🔴 Critical, 🟠 High, 🟡 Medium, 🔵 Low)
  - [ ] Issue descriptions
  - [ ] **Allow Button** - Allows commit to proceed
  - [ ] **Block Button** - Blocks commit
  - [ ] **Review Button** - Opens detailed review

**Case C: Critical/High issues found (blocking)**
- [ ] Commit is blocked
- [ ] Error message shows severity level
- [ ] Findings panel may display (depending on config)

### Step 3.3: Test Panel Interactions
1. **If findings panel appeared:**
   - [ ] Click "Allow" button
     - Commit should proceed
     - Panel should close
   - OR click "Block" button
     - Commit should be cancelled
     - Error message appears

2. **Inline Diagnostics:**
   - [ ] Look at the editor for the modified file
   - [ ] Red/yellow/orange squiggly lines should appear under problematic code
   - [ ] Hover over lines to see issue details
   - [ ] Problems panel (Ctrl+Shift+M) should show findings

### Step 3.4: Verify Status Updates
- [ ] Status bar changes during analysis ("Analyzing...")
- [ ] Status bar shows result ("Ready" or "Error")
- [ ] No console errors in Output panel

---

## Part 4: Post-Commit Workflow Testing (25 minutes)

### Prerequisites
- [ ] Successfully committed changes (from Part 3)
- [ ] Backend analysis service is accessible (if not available, this may fail gracefully)

### Step 4.1: Commit Changes
```bash
# Make another set of changes
echo "new feature" >> src/feature.js

# Stage and commit
git add src/feature.js
git commit -m "Add new feature"
```

### Step 4.2: Verify Analysis Summary Panel
After commit succeeds, watch for:
- [ ] 📊 **Impact Summary Panel** opens automatically
- [ ] Panel shows:
  - [ ] **Impact Level** (Critical/Major/Moderate/Minor) with color indicator
  - [ ] **Confidence Score** (percentage 0-100%)
  - [ ] **Files Changed** count
  - [ ] **Lines Added/Deleted** metrics
  - [ ] **Risk Level** (low/medium/high/critical)
  - [ ] **Findings Summary** - count of issues by severity
  - [ ] **Recommendations** - suggested fixes

### Step 4.3: Verify History Tree Update
1. Look at the Explorer sidebar
2. Expand **📊 Analysis History** tree view
3. Verify:
   - [ ] New analysis appears at the top
   - [ ] Shows timestamp
   - [ ] Shows impact level with icon
   - [ ] Shows confidence percentage
   - [ ] Expands to show details when clicked

### Step 4.4: Verify Recommendations Tree Update
1. Look at the Explorer sidebar
2. Expand **💡 Recommendations** tree view
3. Verify:
   - [ ] Recommendations aggregated from analysis
   - [ ] Shows frequency count
   - [ ] Shows severity badges
   - [ ] Shows affected issue count
   - [ ] Shows example issues when expanded

### Step 4.5: Test Recommendations Panel
1. Click on a recommendation in the Recommendations tree
2. Verify:
   - [ ] Details panel appears (or in existing summary panel)
   - [ ] Shows full recommendation text
   - [ ] Shows affected files/examples

---

## Part 5: Command Testing (15 minutes)

### Step 5.1: Test "Run Full Analysis" Command
1. Press `Ctrl+Shift+P`
2. Type "Run Full Analysis" and select it
3. Verify:
   - [ ] Status bar shows "Analyzing..."
   - [ ] Analysis completes
   - [ ] Summary panel appears (if analysis runs successfully)
   - [ ] No errors in Output panel

### Step 5.2: Test "Refresh History" Command
1. Press `Ctrl+Shift+P`
2. Type "remediation.refreshHistory" and select it
3. Verify:
   - [ ] Analysis History tree refreshes
   - [ ] Recommendations tree refreshes
   - [ ] Toast notification appears: "✓ History refreshed"

### Step 5.3: Test "Clear History" Command
1. Press `Ctrl+Shift+P`
2. Type "remediation.clearHistory" and select it
3. Verify:
   - [ ] Warning dialog appears: "Clear all analysis history?"
   - [ ] "Clear" and "Cancel" buttons present
4. Click "Clear":
   - [ ] Analysis History tree becomes empty
   - [ ] Toast notification: "✓ History cleared"
5. Repeat and click "Cancel":
   - [ ] Dialog closes
   - [ ] History remains unchanged

### Step 5.4: Test "Clear Recommendations" Command
1. Press `Ctrl+Shift+P`
2. Type "remediation.clearRecommendations" and select it
3. Verify:
   - [ ] Warning dialog appears: "Clear all recommendations?"
4. Click "Clear":
   - [ ] Recommendations tree becomes empty
   - [ ] Toast notification appears

### Step 5.5: Test "Authenticate" Command (Optional)
1. Press `Ctrl+Shift+P`
2. Type "Remediation Agent: Authenticate" and select it
3. Verify:
   - [ ] OAuth flow initiates (if configured)
   - [ ] Authentication dialog appears (GitHub or GitLab)
   - [ ] Status bar updates after authentication

### Step 5.6: Test "Open Settings" Command
1. Press `Ctrl+Shift+P`
2. Type "Open Settings" and select it
3. Verify:
   - [ ] Settings panel opens
   - [ ] Shows "remediationAgent" settings section
   - [ ] Can modify settings (preCommit.enabled, blockOnCritical, etc.)

---

## Part 6: Data Persistence Testing (10 minutes)

### Step 6.1: Verify History Persists
1. Perform a pre-commit analysis (Part 3)
2. Perform a post-commit analysis (Part 4)
3. Close VS Code completely
4. Reopen VS Code with same repository
5. Check Explorer → Analysis History:
   - [ ] Previous analyses still appear
   - [ ] Timestamps are correct
   - [ ] All details preserved

### Step 6.2: Verify Recommendations Persist
1. After post-commit analysis, check Recommendations tree
2. Note the recommendations shown
3. Close and reopen VS Code
4. Check Recommendations tree again:
   - [ ] Same recommendations still present
   - [ ] Frequency counts maintained
   - [ ] No data loss

### Step 6.3: Test Clear/Persist Flow
1. Clear history using "Clear History" command
2. Close VS Code
3. Reopen VS Code:
   - [ ] History remains cleared
   - [ ] No previous analyses appear
4. Perform new analysis
5. Close and reopen:
   - [ ] New analysis persists

---

## Part 7: Error Handling Testing (5 minutes)

### Step 7.1: Test with No Git Repository
1. Open a folder without `.git` directory
2. Verify:
   - [ ] No error messages
   - [ ] Extension still loads
   - [ ] Tree views show "No analyses yet"
   - [ ] Commands fail gracefully with message "Not a Git repository"

### Step 7.2: Test with Backend Unavailable (Optional)
1. If backend service is running, stop it
2. Try to run analysis
3. Verify:
   - [ ] Graceful error message appears
   - [ ] Status bar shows error state
   - [ ] No unhandled exceptions in console
   - [ ] User can still interact with other features

### Step 7.3: Check Output Panel for Errors
1. Press `Ctrl+Shift+U` to open Output panel
2. Select "Remediation Agent" channel
3. Verify:
   - [ ] No error messages (only info/warn if expected)
   - [ ] All operations logged properly
   - [ ] Timestamps make sense

---

## Part 8: UI/UX Verification (5 minutes)

### Step 8.1: Visual Rendering
- [ ] All panels render without display artifacts
- [ ] Text is readable and properly formatted
- [ ] Colors and icons display correctly
- [ ] Buttons are clickable and responsive
- [ ] No layout shifts or glitches

### Step 8.2: Responsiveness
- [ ] Panels appear quickly (< 1 second)
- [ ] Buttons respond immediately
- [ ] Tree views expand/collapse smoothly
- [ ] No UI freezing during operations

### Step 8.3: Notifications
- [ ] Toast messages appear top-right
- [ ] Messages clear after ~5 seconds
- [ ] Error messages are prominent and clear
- [ ] Success messages are helpful

---

## Summary Checklist

### Installation ✓
- [ ] Extension installed without errors
- [ ] All components initialized
- [ ] Status bar shows ready state

### UI Components ✓
- [ ] Tree views visible and functional
- [ ] Status bar displays correctly
- [ ] Commands registered
- [ ] Panels render properly

### Pre-Commit ✓
- [ ] Hook triggers on commit
- [ ] Findings display when issues found
- [ ] Allow/Block buttons work
- [ ] Inline diagnostics appear
- [ ] User can review before committing

### Post-Commit ✓
- [ ] Hook triggers after successful commit
- [ ] Summary panel displays automatically
- [ ] History tree updates
- [ ] Recommendations aggregated
- [ ] Metrics calculated and shown

### Data Persistence ✓
- [ ] History persists across sessions
- [ ] Recommendations persist across sessions
- [ ] Clear operations work correctly

### Error Handling ✓
- [ ] No unhandled exceptions
- [ ] Graceful degradation when services unavailable
- [ ] User-friendly error messages

---

## Troubleshooting Guide

### Issue: Extension doesn't activate
**Solution:**
1. Check Output → "Remediation Agent" channel for errors
2. Verify you have a workspace folder open (File → Open Folder)
3. Uninstall and reinstall extension
4. Check if git is available: run `git --version` in terminal

### Issue: Tree views don't appear
**Solution:**
1. Open Explorer (Ctrl+Shift+E)
2. Scroll down in Explorer panel
3. Tree views should appear below file explorer
4. If still not visible, run "Focus on Explorer" command

### Issue: Git hooks not triggering
**Solution:**
1. Check Output → "Remediation Agent" for hook installation logs
2. Verify hooks exist: `ls .git/hooks/`
3. Check hook file permissions: `chmod +x .git/hooks/pre-commit`
4. Reinstall extension (hooks installed on activation)

### Issue: Analysis always shows "No issues found"
**Solution:**
1. Verify backend service is running
2. Check that staged files are being analyzed
3. Review backend logs if available
4. Try manual "Run Full Analysis" command

### Issue: Panels don't close
**Solution:**
1. Click X button on panel tab
2. Run "View → Close All Editors"
3. Reload VS Code (Ctrl+Shift+P → "Developer: Reload Window")

### Issue: Performance is slow
**Solution:**
1. Check if analyzing large number of files
2. Check Output for error logs
3. Try smaller repository for testing
4. Close other VS Code extensions temporarily

---

## Next Steps After Testing

Once testing is complete, document:
1. ✅ Features that work as expected
2. ⚠️ Any issues or unexpected behavior
3. 📋 Steps to reproduce any issues found
4. 💡 Suggestions for improvement

Then proceed to:
- **Phase 7.12:** Security Review & Hardening
- **Phase 7.13:** Performance Optimization
- **Phase 8:** Release & Publishing

---

**Good luck with testing! 🚀**

For any questions or issues during testing, refer to the Output panel logs.
