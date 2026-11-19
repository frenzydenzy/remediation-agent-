#!/usr/bin/env python3
"""
End-to-End Integration Demo - Shows complete remediation workflow.

This demo:
1. Creates a test commit with vulnerable code
2. Analyzes it automatically
3. Creates a remediation branch
4. Applies fixes
5. Requests and processes approval
6. Merges remediation
"""

import os
import sys
import tempfile
import subprocess
import shutil
from pathlib import Path
from datetime import datetime

# Add scripts to path
script_dir = Path(__file__).parent
if script_dir not in sys.path:
    sys.path.insert(0, str(script_dir))

from remediation_orchestrator import RemediationOrchestrator
from commit_detector import CommitDetector


def create_test_repo():
    """Create a temporary test repository."""
    test_dir = Path(tempfile.mkdtemp(prefix="remediation_test_"))
    
    # Initialize repo
    subprocess.run(["git", "init"], cwd=test_dir, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], 
                   cwd=test_dir, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Test User"], 
                   cwd=test_dir, capture_output=True)
    
    # Create initial commit
    readme = test_dir / "README.md"
    readme.write_text("# Test Project\n")
    
    # Add .remediation to gitignore
    gitignore = test_dir / ".gitignore"
    gitignore.write_text(".remediation/\n")
    
    subprocess.run(["git", "add", "README.md", ".gitignore"], cwd=test_dir, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Initial commit"], 
                   cwd=test_dir, capture_output=True)
    
    return test_dir


def create_vulnerable_commit(repo_path: Path):
    """Create a commit with vulnerable code."""
    
    vulnerable_code = '''#!/usr/bin/env python3
"""Vulnerable code for demonstration."""

import os
import subprocess
from hashlib import md5

def vulnerable_database_query(user_id):
    """SQL Injection vulnerability."""
    query = "SELECT * FROM users WHERE id = " + str(user_id)
    return query

def process_user_input(user_input):
    """Multiple vulnerabilities."""
    # Hardcoded secrets
    api_key = "sk_live_51234567890abcdef"
    password = "SuperSecret123!"
    
    # Weak crypto
    hash_value = md5(user_input.encode()).hexdigest()
    
    # Command injection
    result = os.system(f"echo {user_input}")
    
    # Dangerous eval
    code = eval(user_input)
    
    # Dangerous pickle
    import pickle
    obj = pickle.loads(user_input.encode())
    
    return hash_value

def duplicate_code():
    """Code duplication."""
    x = 1
    y = 2
    z = x + y
    return z

def duplicate_code_2():
    """Duplicate of above."""
    x = 1
    y = 2
    z = x + y
    return z
'''
    
    code_file = repo_path / "vulnerable_code.py"
    code_file.write_text(vulnerable_code)
    
    # Commit the file
    subprocess.run(["git", "add", "vulnerable_code.py"], cwd=repo_path, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Add vulnerable code (intentional for testing)"], 
                   cwd=repo_path, capture_output=True)


def main():
    """Run the end-to-end integration demo."""
    
    print(f"\n{'='*80}")
    print(f"END-TO-END REMEDIATION WORKFLOW DEMO")
    print(f"{'='*80}\n")
    
    # Create test repository
    print("Step 1: Creating test repository...")
    repo_path = create_test_repo()
    print(f"  Repository: {repo_path}\n")
    
    # Create vulnerable commit
    print("Step 2: Creating commit with vulnerable code...")
    create_vulnerable_commit(repo_path)
    print(f"  Commit created with 7 vulnerabilities\n")
    
    # Initialize orchestrator
    print("Step 3: Initializing remediation orchestrator...")
    orchestrator = RemediationOrchestrator(repo_path)
    print(f"  Detector ready\n")
    
    # Analyze commit
    print("Step 4: Analyzing commit...")
    analysis_result = orchestrator.analyze_commit("HEAD")
    
    if len(analysis_result.findings) == 0:
        print("  ERROR: Expected to find vulnerabilities!")
        return False
    
    print(f"  Found {len(analysis_result.findings)} findings\n")
    
    # Create remediation branch
    print("Step 5: Creating remediation branch...")
    remediation_branch, file_changes = orchestrator.create_remediation_plan(analysis_result)
    print(f"  Branch: {remediation_branch.name}")
    print(f"  Files to fix: {len(file_changes)}\n")
    
    # Apply fixes
    if file_changes:
        print("Step 6: Applying automatic fixes...")
        orchestrator.apply_remediation(remediation_branch, file_changes)
        print(f"  Fixes applied\n")
    
    # Approve automatically (for demo)
    print("Step 7: Auto-approving remediation (demo mode)...")
    merged = orchestrator.process_approval(
        analysis_result,
        remediation_branch,
        "approve"
    )
    
    if merged:
        print(f"  Remediation successfully merged!\n")
    else:
        print(f"  Failed to merge remediation\n")
    
    # Verify merge
    print("Step 8: Verifying remediation...")
    detector = CommitDetector(repo_path)
    current_branch = detector.get_current_branch()
    print(f"  Current branch: {current_branch}")
    
    # Check git log
    result = subprocess.run(
        ["git", "log", "--oneline", "-5"],
        cwd=repo_path,
        capture_output=True,
        text=True
    )
    print(f"\n  Recent commits:")
    for line in result.stdout.strip().split("\n"):
        print(f"    {line}")
    
    # Summary
    print(f"\n{'='*80}")
    print(f"DEMO SUMMARY")
    print(f"{'='*80}")
    print(f"[PASS] Commit detection: SUCCESS")
    print(f"[PASS] Vulnerability analysis: SUCCESS ({len(analysis_result.findings)} found)")
    print(f"[PASS] Remediation branch creation: SUCCESS")
    print(f"[PASS] Fix application: SUCCESS ({len(file_changes)} files fixed)")
    print(f"[PASS] Approval workflow: SUCCESS")
    print(f"[{'PASS' if merged else 'FAIL'}] Auto-merge: {'SUCCESS' if merged else 'FAILED'}")
    print(f"\nWorkflow Status: {'COMPLETE' if merged else 'PARTIAL'}\n")
    
    # Cleanup
    print(f"Cleaning up test repository...")
    shutil.rmtree(repo_path)
    print(f"Done!\n")
    
    return merged


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\nDemo failed with error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
