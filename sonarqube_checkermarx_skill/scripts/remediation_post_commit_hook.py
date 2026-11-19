#!/usr/bin/env python3
"""
Git Post-Commit Hook - Automatically triggers analysis after commits.

This script should be installed as .git/hooks/post-commit to automatically
run the remediation workflow whenever code is committed.

To install:
  copy remediation_post_commit_hook.py .git/hooks/post-commit
  
On Windows, rename to: post-commit (no .py extension) if using python launcher,
or wrap in a .bat file that calls python.
"""

import os
import sys
import subprocess
from pathlib import Path

# Get repository root
repo_root = subprocess.run(
    ["git", "rev-parse", "--show-toplevel"],
    capture_output=True,
    text=True
).stdout.strip()

if not repo_root:
    sys.exit(0)  # Not in a git repo, exit gracefully

# Add skill scripts to path
skill_scripts = Path(repo_root) / "sonarqube_checkermarx_skill" / "scripts"
if skill_scripts not in sys.path:
    sys.path.insert(0, str(skill_scripts))

try:
    from remediation_orchestrator import RemediationOrchestrator
    
    # Run analysis on the current commit
    orchestrator = RemediationOrchestrator(repo_root)
    
    # Note: We don't auto-approve in hook - user should decide
    # This just detects and creates the remediation branch
    print(f"[Remediation Hook] Analyzing commit...")
    
    result = orchestrator.analyze_commit("HEAD")
    
    if len(result.findings) > 0:
        print(f"[Remediation Hook] Found {len(result.findings)} issues")
        print(f"[Remediation Hook] Run 'remediation_orchestrator.py' to review and approve fixes")
    else:
        print(f"[Remediation Hook] No issues found")

except Exception as e:
    # Don't fail the commit if analysis fails
    print(f"[Remediation Hook] Warning: Analysis failed: {e}")
    sys.exit(0)

sys.exit(0)
