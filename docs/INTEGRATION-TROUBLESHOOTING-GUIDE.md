# 🐛 REMEDIATION AGENT - INTEGRATION TROUBLESHOOTING GUIDE

**Date:** 2026-11-16  
**Issue:** Agent failed on cricket-scoreboard project  
**Errors Found:** 3 critical integration issues  
**Status:** Diagnosing and fixing

---

## 📋 Issue Summary

### Error 1: `spawn node ENOENT` ❌
**Severity:** 🔴 CRITICAL  
**Impact:** Extension cannot execute analysis  
**Root Cause:** Node.js path not found when spawning child process

**What This Means:**
- The backend communicator tries to spawn a Node process
- System cannot find `node` executable in PATH
- Happens when extension runs in different environment than development

**Where It Occurs:**
- File: `.vscode-ext/src/engine-integration/backend-communicator.ts`
- Method: `executeBackend()` or similar
- Line: Likely around process spawning code

---

### Error 2: Git Credential Manager Failure ❌
**Severity:** 🟡 HIGH  
**Impact:** Push fails, commit orphaned  
**Status Message:** "Git exited at credential-manager step"

**What This Means:**
- `git push origin main` requires authentication
- Git Credential Manager doesn't have cached credentials
- Extension attempted push without proper credential handling

**Where It Occurs:**
- Likely in post-commit hook
- File: `.vscode-ext/src/hooks/post-commit-handler.ts`

---

### Error 3: No Active Hooks ⚠️
**Severity:** 🟡 HIGH  
**Impact:** Agent cannot trigger analysis  
**Message:** "No active hooks in this repository"

**What This Means:**
- Git hooks weren't installed in cricket-scoreboard repo
- Pre-commit/post-commit hooks missing
- Extension couldn't auto-inject analysis trigger

**Where It Occurs:**
- File: `.vscode-ext/src/git/git-hook-manager.ts`
- Method: Hook installation logic

---

## 🔧 Troubleshooting Steps

### STEP 1: Verify Node.js Installation

#### Check System Node
```powershell
# Verify node is installed
node --version

# Check where Node is located
where.exe node

# Verify npm works
npm --version

# Check Node in PATH
$env:PATH -split ';' | Select-String 'node'
```

#### Expected Output
```
v18.17.0 (or similar)
C:\Program Files\nodejs\node.exe
8.19.2
(should show nodejs path in PATH)
```

#### If Node Not Found
```powershell
# Option 1: Reinstall Node.js from https://nodejs.org
# Option 2: Add to PATH manually
$nodeDir = "C:\Program Files\nodejs"
$env:PATH = "$env:PATH;$nodeDir"
```

---

### STEP 2: Verify Git Credential Manager

#### Check Git Config
```powershell
# See current credential helper
git config --global credential.helper

# Should output: manager-core (Windows) or similar
```

#### If Empty or Missing
```powershell
# Configure credential manager (Windows)
git config --global credential.helper manager-core

# Or for older Git:
git config --global credential.helper wincred
```

#### Test Credentials
```powershell
# Try to access GitHub
git ls-remote https://github.com/YOUR_USERNAME/cricket-scoreboard.git

# Should prompt you once, then work (credentials cached)
```

#### If Credential Manager Fails
```powershell
# Option 1: Use GitHub CLI
gh auth login

# Option 2: Use SSH instead of HTTPS
git remote set-url origin git@github.com:YOUR_USERNAME/cricket-scoreboard.git

# Option 3: Use Personal Access Token (create at github.com/settings/tokens)
# Then: git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/cricket-scoreboard.git
```

---

### STEP 3: Check Hook Installation

#### Verify Hooks Exist in Cricket-Scoreboard
```powershell
# Navigate to the project
cd path\to\cricket-scoreboard

# Check if .git exists
Test-Path .git

# List hook files
Get-ChildItem .git\hooks -Force

# Check specific hooks
Get-Content .git\hooks\pre-commit
Get-Content .git\hooks\post-commit
```

#### If Hooks Missing
```powershell
# Option 1: Reinstall extension and reactivate project
# Option 2: Manually install hooks (copy from remediation-agent project)

# From remediation-agent root:
Copy-Item ".git\hooks\pre-commit" "path\to\cricket-scoreboard\.git\hooks\"
Copy-Item ".git\hooks\post-commit" "path\to\cricket-scoreboard\.git\hooks\"

# Make executable on Unix-like systems (if applicable):
# chmod +x .git/hooks/pre-commit
# chmod +x .git/hooks/post-commit
```

---

## 🔍 ROOT CAUSE ANALYSIS

### Why `spawn node ENOENT` Occurs

**The Problem:**
```typescript
// In backend-communicator.ts
const child = spawn('node', ['analysis-script.js']);
// Error: spawn node ENOENT
```

**Why It Fails:**
1. Extension runs in VS Code's internal process context
2. VS Code's PATH might be different than system PATH
3. Node.js not in VS Code's PATH
4. Environment variables not inherited correctly

**Solution Options:**

#### Option A: Use Absolute Path (BEST)
```typescript
// Instead of: spawn('node', ...)
// Use: spawn('C:\\Program Files\\nodejs\\node.exe', ...)

const nodePath = require('child_process').execSync('where.exe node').toString().trim();
const child = spawn(nodePath, ['analysis-script.js']);
```

#### Option B: Use `node_modules\.bin\node`
```typescript
const nodePath = path.join(__dirname, '../../node_modules/.bin/node');
const child = spawn(nodePath, ['analysis-script.js']);
```

#### Option C: Use Shell Wrapper
```typescript
const child = spawn('powershell', ['-Command', 'node', 'analysis-script.js']);
```

#### Option D: Use `npx`
```typescript
// npx handles Node path resolution automatically
const child = spawn('npx', ['node', 'analysis-script.js']);
```

---

### Why Git Credential Manager Fails

**The Problem:**
```bash
# Post-commit hook tries to push
git push origin main
# Error: Git exited with credential-manager failure
```

**Why It Fails:**
1. Extension runs in non-interactive context
2. Credential manager prompt can't display
3. SSH keys not configured
4. GitHub personal access token expired

**Solution Options:**

#### Option A: Don't Push in Hook (RECOMMENDED)
```typescript
// Remove git push from post-commit hook
// Let user push manually or via CI/CD pipeline
// Analysis works without pushing
```

#### Option B: Use SSH Keys
```bash
# Generate SSH key (one-time)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Add to SSH agent
ssh-add ~/.ssh/id_ed25519

# Update remote to use SSH
git remote set-url origin git@github.com:username/cricket-scoreboard.git
```

#### Option C: Use GitHub Personal Access Token
```bash
# Create token at github.com/settings/tokens
# Store securely in GitHub Secrets or VS Code secret storage

# Use in extension:
const token = await vscode.SecretStorage.get('github_token');
const child = spawn('git', ['push', 'origin', 'main', '-u'], {
  env: { ...process.env, GITHUB_TOKEN: token }
});
```

---

### Why Hooks Don't Install

**The Problem:**
```
"No active hooks in this repository"
```

**Why It Fails:**
1. Extension didn't activate for this repository
2. User hasn't run hook installation command
3. `tsc` compilation hasn't run
4. Hooks file format incorrect

**Solution Options:**

#### Option A: Manually Trigger Hook Installation
```powershell
# In VS Code, open cricket-scoreboard workspace
# Open command palette (Ctrl+Shift+P)
# Run: "AI Remediation: Install Git Hooks"
# Wait for completion
```

#### Option B: Check Extension Status
```powershell
# In VS Code, open Developer Tools (Ctrl+Shift+I)
# Check console for errors
# Look for activation logs
```

#### Option C: Reinstall Extension
```powershell
# Uninstall: code --uninstall-extension ai-remediation-agent
# Reinstall: code --install-extension ai-remediation-agent-0.1.0.vsix
# Reload VS Code (Ctrl+R in extension host)
```

---

## ✅ STEP-BY-STEP FIX PLAN

### Phase 1: Environment Verification (5 minutes)

```powershell
# 1. Verify Node.js
Write-Host "1. Checking Node.js..."
node --version
where.exe node

# 2. Verify Git
Write-Host "2. Checking Git..."
git --version
git config --global credential.helper

# 3. Verify Cricket-Scoreboard repo
Write-Host "3. Checking repository..."
cd path\to\cricket-scoreboard
Test-Path .git
Get-ChildItem .git\hooks -Force
```

### Phase 2: Credential Setup (10 minutes)

```powershell
# Configure Git credentials
git config --global credential.helper manager-core

# Test GitHub access
git ls-remote https://github.com/username/cricket-scoreboard.git

# Or use SSH (recommended)
# 1. Generate key: ssh-keygen -t ed25519
# 2. Add to GitHub: https://github.com/settings/keys
# 3. Test: ssh -T git@github.com
```

### Phase 3: Hook Installation (5 minutes)

```powershell
# Navigate to cricket-scoreboard
cd path\to\cricket-scoreboard

# Option A: Use extension command
# - Open in VS Code
# - Cmd+Shift+P → "Install Git Hooks"

# Option B: Manual installation
# - Copy hooks from remediation-agent
# - Paste into cricket-scoreboard/.git/hooks/

# Verify installation
Get-Content .git\hooks\pre-commit
Get-Content .git\hooks\post-commit
```

### Phase 4: Backend Communicator Fix (15 minutes)

**Fix the `spawn node ENOENT` error:**

```typescript
// File: .vscode-ext/src/engine-integration/backend-communicator.ts

// BEFORE (fails):
const child = spawn('node', ['analysis.js']);

// AFTER (works):
import { execSync } from 'child_process';
import path from 'path';

// Get absolute Node path
const getNodePath = (): string => {
  try {
    // Try system node first
    return execSync('where.exe node').toString().trim();
  } catch {
    // Fallback to expected location
    return 'C:\\Program Files\\nodejs\\node.exe';
  }
};

const nodePath = getNodePath();
const child = spawn(nodePath, ['analysis.js']);
```

---

## 🔄 Code Changes Required

### File 1: `backend-communicator.ts`

**Location:** `.vscode-ext/src/engine-integration/backend-communicator.ts`

**Change:**
```typescript
// Add at top of file
import { execSync } from 'child_process';

// Add helper function
private getNodeExecutable(): string {
  try {
    // Windows
    if (process.platform === 'win32') {
      return execSync('where.exe node').toString().trim();
    }
    // Unix/Linux/Mac
    return execSync('which node').toString().trim();
  } catch (error) {
    // Fallback: assume node is in PATH
    return 'node';
  }
}

// In executeBackend method, change:
// From: const child = spawn('node', args);
// To:   const child = spawn(this.getNodeExecutable(), args);
```

---

### File 2: `post-commit-handler.ts`

**Location:** `.vscode-ext/src/hooks/post-commit-handler.ts`

**Change:**
```typescript
// REMOVE automatic git push
// Comment out or delete the git push logic

// BEFORE:
// await this.executeCommand('git push origin main');

// AFTER:
// Don't push automatically - let user push manually
// or handle via CI/CD pipeline

console.log('Analysis complete. Run "git push" manually to publish.');
```

---

### File 3: `git-hook-manager.ts`

**Location:** `.vscode-ext/src/git/git-hook-manager.ts`

**Add logging for debugging:**
```typescript
// Add before hook installation
console.log(`Installing hooks to: ${this.gitDir}/hooks`);
console.log(`Hook manager: Verifying .git directory exists`);

// Add after installation
console.log(`Hooks installed successfully`);
console.log(`Pre-commit hook: ${path.join(this.gitDir, 'hooks/pre-commit')}`);
console.log(`Post-commit hook: ${path.join(this.gitDir, 'hooks/post-commit')}`);
```

---

## 🧪 TESTING THE FIXES

### Test 1: Node Path Resolution
```powershell
# Create test file
$testScript = @'
console.log('Node.js is working!');
'@

# Save as test.js
$testScript | Out-File test.js

# Test with absolute path
& "C:\Program Files\nodejs\node.exe" test.js

# Should output: Node.js is working!
```

### Test 2: Git Credentials
```powershell
# Test push with credentials
git push origin main

# Should succeed if credentials are configured
```

### Test 3: Hook Execution
```powershell
# Create test file
echo "test content" | Out-File -FilePath "test-cricket.txt" -Encoding utf8

# Add to git
git add test-cricket.txt

# Commit (should trigger pre-commit hook)
git commit -m "Test hook execution"

# Check if hook ran (look for analysis output)
```

---

## 📊 DIAGNOSIS TEMPLATE

**When running remediation agent on cricket-scoreboard, fill this out:**

```
NODE PATH DIAGNOSIS:
- Node installed? [ ] Yes [ ] No
- Node version: ___________
- Node path: ___________
- Node in PATH? [ ] Yes [ ] No
- Node accessible from VS Code? [ ] Yes [ ] No

GIT CREDENTIALS DIAGNOSIS:
- Credential helper configured? [ ] Yes [ ] No
- Credential helper type: ___________
- SSH keys configured? [ ] Yes [ ] No
- GitHub access working? [ ] Yes [ ] No
- Push requires password? [ ] Yes [ ] No

HOOK DIAGNOSIS:
- Hooks directory exists? [ ] Yes [ ] No
- Pre-commit hook exists? [ ] Yes [ ] No
- Post-commit hook exists? [ ] Yes [ ] No
- Hooks executable? [ ] Yes [ ] No
- Hooks auto-installed? [ ] Yes [ ] No

REMEDIATION AGENT DIAGNOSIS:
- Extension activated? [ ] Yes [ ] No
- Backend service running? [ ] Yes [ ] No
- Node path resolved correctly? [ ] Yes [ ] No
- Error occurs at which stage? ___________
```

---

## 🚀 QUICK FIX CHECKLIST

**Run these commands in PowerShell to fix all issues:**

```powershell
# 1. Verify Node.js and Git
Write-Host "✓ Checking environment..."
node --version
git --version

# 2. Configure Git credentials
git config --global credential.helper manager-core

# 3. Navigate to cricket-scoreboard
cd path\to\cricket-scoreboard

# 4. Install hooks manually (if needed)
Write-Host "✓ Installing hooks..."
# (Copy from remediation-agent if needed)

# 5. Test by making a commit
Write-Host "✓ Testing extension..."
echo "test" | Out-File test-file.txt
git add test-file.txt
git commit -m "Test remediation agent"

# 6. Check for analysis output
# Should see analysis results in VS Code
```

---

## 📞 SUPPORT MATRIX

| Issue | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| `spawn node ENOENT` | Node not in PATH | Use absolute path: `C:\Program Files\nodejs\node.exe` |
| Git credential failure | Credentials not cached | Run: `git ls-remote https://github.com/username/repo.git` |
| No hooks installed | Extension not activated | Open project in VS Code, run: "Install Git Hooks" |
| Uncommitted changes | Hook error stopped commit | Run: `git add .` then `git commit --no-verify` |

---

## 🎯 NEXT STEPS

**Immediate Actions:**

1. ✅ Run environment verification commands above
2. ✅ Configure Git credentials
3. ✅ Manually install hooks if needed
4. ✅ Test with simple commit
5. ✅ Report which step fails

**Then I Will:**
- Create the code fixes for backend-communicator.ts
- Update post-commit-handler.ts to remove auto-push
- Add debugging to git-hook-manager.ts
- Test on cricket-scoreboard project
- Commit fixes to main remediation-agent project

---

**Status:** 🔴 ISSUES IDENTIFIED, AWAITING YOUR ENVIRONMENT VERIFICATION  
**Next:** Please run the diagnostic steps above and report which issues you find

