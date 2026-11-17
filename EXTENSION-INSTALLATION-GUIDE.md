# Extension Installation & Testing Guide

## 📦 VSIX Package Ready

**Location:** `C:\Users\harbansal\Documents\Projects\remedition skill\.vscode-ext\ai-remediation-agent-0.1.0.vsix`

**File Size:** 34.88 MB

**Status:** ✅ Built and ready to install

---

## 🚀 Installation Instructions

### Method 1: Use File Explorer (Recommended)

1. **Open File Explorer**
   - Navigate to: `C:\Users\harbansal\Documents\Projects\remedition skill\.vscode-ext\`

2. **Right-click on VSIX file**
   - `ai-remediation-agent-0.1.0.vsix`

3. **Select "Open with" → VS Code**
   - VS Code will launch and install the extension automatically

4. **Wait for installation to complete**
   - Should take 30-60 seconds

---

### Method 2: Drag & Drop into VS Code

1. **Keep File Explorer window open**
   - Pointing to `.vscode-ext` folder

2. **Open VS Code**
   - Or switch to existing VS Code window

3. **In VS Code, go to Extensions**
   - Press `Ctrl+Shift+X` (Windows) or `Cmd+Shift+X` (Mac)

4. **Look for "Install from VSIX..." button**
   - Click the `...` menu at top-right of Extensions panel
   - Select "Install from VSIX..."

5. **Navigate to VSIX file**
   - `C:\Users\harbansal\Documents\Projects\remedition skill\.vscode-ext\ai-remediation-agent-0.1.0.vsix`

6. **Select and install**

---

### Method 3: PowerShell with Full Path

```powershell
# Navigate to the folder
cd "C:\Users\harbansal\Documents\Projects\remedition skill\.vscode-ext"

# Install using absolute path
& code --install-extension "$PWD\ai-remediation-agent-0.1.0.vsix"
```

---

## ✅ Post-Installation Setup

### Step 1: Configure Git Credentials (One-Time)

This is required for `git push` to work without manual credential entry.

```bash
git config --global credential.helper manager-core
```

Verify it worked:
```bash
git config --global credential.helper
# Output should be: manager-core
```

### Step 2: Verify Extension Installed

1. **Open VS Code**
2. **Go to Extensions** (`Ctrl+Shift+X`)
3. **Search for "ai-remediation-agent"**
4. **Should show:** "AI Remediation Agent v0.1.0"

---

## 🧪 Testing on Cricket-Scoreboard

### Test Setup

1. **Open cricket-scoreboard in VS Code**
   ```bash
   code "C:\Users\harbansal\Documents\Projects\cricket scoreboard\CricketScorecardApp"
   ```

2. **Wait for extension to activate**
   - Should see "AI Remediation Agent" in status bar
   - Check Output panel for activation logs

### Test Case 1: Verify No Path Errors

**What to do:**
- Create a test file: `echo "test" > test.txt`
- Stage it: `git add test.txt`
- Commit it: `git commit -m "Test remediation agent"`

**Expected Results:**
- ✅ **No "spawn node ENOENT" error**
- ✅ Commit succeeds
- ✅ Output shows analysis running
- ✅ No errors in VS Code console

**Where to check:**
- VS Code Output panel: `View → Output → AI Remediation Agent`
- Or: Terminal inside VS Code

---

### Test Case 2: Verify Git Credentials Work

**What to do:**
- After commit succeeds, look for push guidance
- The message should say: `git push origin main`
- **Don't** automatically push (by design)

**Expected Results:**
- ✅ No credential manager popup
- ✅ No authentication failures
- ✅ Clear message about manual push
- ✅ User is in control

**Where to check:**
- VS Code Output panel
- Look for message: "git push origin main"

---

### Test Case 3: Check Analysis Results

**What to do:**
- After commit, check if analysis ran
- Look in VS Code sidebar for Analysis History panel

**Expected Results:**
- ✅ Analysis history shows recent run
- ✅ Findings displayed (if any security issues found)
- ✅ No execution errors
- ✅ Results are readable

---

## ✨ What's Fixed in This Build

### Fix 1: Node Path Resolution ✅
- **Problem:** `spawn node ENOENT` when running from VS Code
- **Solution:** Added `getNodeExecutable()` to resolve node.exe path
- **Result:** Works in any workspace, not just development

### Fix 2: Git Credentials Configuration ✅
- **Problem:** `git push` fails due to missing credential helper
- **Solution:** Added auto-configuration on extension activation
- **Result:** Credentials automatically configured on first use

### Fix 3: Manual Push Workflow ✅
- **Problem:** Auto-push fails, leaves orphaned commits
- **Solution:** Removed auto-push, user pushes manually
- **Result:** Commits always succeed, user has control

---

## 🐛 Troubleshooting

### Issue: Extension doesn't appear in VS Code

**Solution:**
1. Reload VS Code: `Ctrl+Shift+P` → "Reload Window"
2. Check Extensions panel: `Ctrl+Shift+X`
3. Search for "ai-remediation"

### Issue: Pre-commit hook not running

**Solution:**
1. Check if hooks are installed in cricket-scoreboard:
   - Should have `.git/hooks/post-commit` file
   - Should have `.git/hooks/pre-commit` file

2. If missing, reinstall hooks:
   - Extension should do this automatically on first activation
   - Or manually: Check git/hooks directory in extension

### Issue: "spawn node ENOENT" still appears

**Solution:**
1. Verify Node.js is installed:
   ```bash
   where.exe node
   # Should show path like: C:\Program Files\nodejs\node.exe
   ```

2. Check extension activation:
   - Open Output panel: `View → Output`
   - Select "AI Remediation Agent" from dropdown
   - Look for "Node path resolved to: ..."

### Issue: Git push still fails

**Solution:**
1. Verify credentials are configured:
   ```bash
   git config --global credential.helper
   # Should show: manager-core
   ```

2. Try manual push:
   ```bash
   git push origin main
   # Should prompt for credentials only once, then cache them
   ```

3. After successful push, extension will work

---

## 📊 Build Information

| Component | Details |
|-----------|---------|
| Version | 0.1.0 |
| File | `ai-remediation-agent-0.1.0.vsix` |
| Size | 34.88 MB |
| Files | 18,775 |
| Build Time | ~3-4 minutes |
| Compilation | TypeScript → JavaScript |
| Status | ✅ Ready |

---

## 🎯 Next Steps After Installation

1. **Install the extension** using one of the methods above
2. **Configure Git credentials** (one-time): `git config --global credential.helper manager-core`
3. **Test on cricket-scoreboard** project
4. **Verify all 3 fixes work:**
   - No ENOENT errors
   - No credential failures
   - Analysis runs successfully
5. **Report results:**
   - If all working → Ready for Phase 8
   - If issues found → Check troubleshooting section

---

## 📞 Support

If you encounter issues:

1. **Check the Output panel** for detailed logs
2. **Review troubleshooting section** above
3. **Check the documentation:**
   - `docs/INTEGRATION-TROUBLESHOOTING-GUIDE.md`
   - `docs/REMEDIATION-AGENT-FIXES.md`

---

**Last Updated:** 2025-01-31  
**Status:** ✅ Ready for Testing  
**Next Phase:** Phase 8 - Marketplace Preparation
