# Phase 7.11 Testing - Quick Reference Card

## Installation (5 min)
```powershell
cd ".vscode-ext"
code --install-extension ai-remediation-agent-0.1.0.vsix
```

## 8-Part Testing Sequence (60-90 min total)

### 1️⃣ UI Verification (15 min)
- [ ] Tree views: 📊 Analysis History + 💡 Recommendations visible
- [ ] Status bar: Shows extension status
- [ ] Commands: Ctrl+Shift+P → search "Remediation"

### 2️⃣ Pre-Commit Testing (25 min)
```bash
# Make changes and stage them
echo "test" > file.js
git add file.js
git commit -m "test"
```
- [ ] Hook triggers → analysis runs
- [ ] If issues found: 🔐 Security panel appears
- [ ] Can Allow/Block commit
- [ ] Inline diagnostics show in editor

### 3️⃣ Post-Commit Testing (25 min)
```bash
# After successful commit
echo "feature" >> src/file.js
git add src/file.js
git commit -m "feature"
```
- [ ] 📊 Summary panel appears automatically
- [ ] Shows impact level, confidence, metrics
- [ ] History tree updated
- [ ] Recommendations aggregated

### 4️⃣ Commands Testing (15 min)
1. **Run Full Analysis** - Ctrl+Shift+P → "Run Full Analysis"
2. **Refresh History** - Ctrl+Shift+P → "remediation.refreshHistory"
3. **Clear History** - Ctrl+Shift+P → "remediation.clearHistory"
4. **Clear Recommendations** - Ctrl+Shift+P → "remediation.clearRecommendations"

### 5️⃣ Data Persistence (10 min)
- [ ] Make analysis → Close/reopen VS Code → History persists
- [ ] Verify same data reappears
- [ ] Test clear operation persists across sessions

### 6️⃣ Error Handling (5 min)
- [ ] Open non-Git folder → graceful error
- [ ] Check Output panel: "Remediation Agent" channel
- [ ] No unhandled exceptions

### 7️⃣ UI/UX Check (5 min)
- [ ] Panels render quickly and clearly
- [ ] Buttons responsive
- [ ] Notifications appear and clear properly
- [ ] No layout glitches

## Expected Behaviors

| Workflow | Trigger | Expected Result |
|----------|---------|-----------------|
| Pre-Commit | `git commit` | Security findings panel appears (if issues found) |
| Post-Commit | Successful commit | Summary panel auto-opens, history updates |
| Tree Refresh | Command palette | Tree views update within 1 second |
| Clear History | Confirmation dialog | History removed, persists on reload |
| Full Analysis | Command palette | Status bar shows "Analyzing...", summary displays |
| Error Scenario | No git repo | Graceful error, extension still works |

## Critical Checkpoints

✅ **Must-Have Working:**
1. Extension activates without errors
2. Tree views appear in Explorer
3. Pre-commit hook triggers and shows findings
4. Post-commit analysis displays summary
5. History persists across sessions
6. No unhandled exceptions in Output

⚠️ **Issues to Document:**
- [ ] Any error messages
- [ ] Panels not rendering
- [ ] Commands not working
- [ ] Data not persisting
- [ ] Performance issues

## Key Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Command Palette | Ctrl+Shift+P |
| Open Explorer | Ctrl+Shift+E |
| Open Output | Ctrl+Shift+U |
| Open Terminal | Ctrl+` |
| Reload VS Code | Ctrl+Shift+P → "Reload Window" |

## Success Indicators ✅

After testing, you should see:
1. ✅ Extension activates: "✓ Git hooks installed" in Output
2. ✅ Tree views populate with analyses
3. ✅ Pre-commit findings block or allow commits
4. ✅ Post-commit summary shows impact metrics
5. ✅ Data persists across VS Code reloads
6. ✅ No console errors in Output panel

---

**Estimated Testing Time:** 60-90 minutes
**Repository Required:** Any Git repo for testing workflows
**Full Guide:** See PHASE-7-11-TESTING-GUIDE.md
