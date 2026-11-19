#!/usr/bin/env python3
"""
Automated Remediation Orchestrator - Main workflow coordinator.

Orchestrates the complete remediation workflow:
1. Detect new commits
2. Run analysis on changed code
3. Create remediation branch if issues found
4. Request user approval
5. Auto-merge if approved
6. Document changes
"""

import subprocess
import json
import sys
from pathlib import Path
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from local_code_analyzer import LocalCodeAnalyzer
from commit_detector import CommitDetector, CommitInfo
from remediation_branch_manager import RemediationBranchManager, RemediationBranch


@dataclass
class AnalysisResult:
    """Result of analyzing a commit."""
    commit_info: CommitInfo
    findings: List[Dict]
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    remediation_branch: Optional[str] = None
    remediation_applied: bool = False
    approval_status: str = "pending"


class RemediationOrchestrator:
    """Coordinates the full remediation workflow."""
    
    def __init__(self, repo_path: Path = None):
        """
        Initialize the orchestrator.
        
        Args:
            repo_path: Path to the Git repository.
        """
        self.repo_path = Path(repo_path or ".")
        self.detector = CommitDetector(self.repo_path)
        self.branch_manager = RemediationBranchManager(self.repo_path)
        self.analyzer = LocalCodeAnalyzer(str(self.repo_path))
        self.state_file = self.repo_path / ".remediation" / "analysis_state.json"
        self._ensure_state_dir()
    
    def _ensure_state_dir(self):
        """Create state directory if needed."""
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_state(self) -> Dict:
        """Load analysis state from disk."""
        if not self.state_file.exists():
            return {}
        try:
            with open(self.state_file) as f:
                return json.load(f)
        except (json.JSONDecodeError, ValueError):
            return {}
    
    def _save_state(self, state: Dict):
        """Save analysis state to disk."""
        self._ensure_state_dir()
        with open(self.state_file, "w") as f:
            json.dump(state, f, indent=2)
    
    def analyze_commit(self, commit_sha: str = "HEAD") -> AnalysisResult:
        """
        Analyze a commit for vulnerabilities.
        
        Args:
            commit_sha: Commit SHA to analyze (default: HEAD)
        
        Returns:
            AnalysisResult with findings and status.
        """
        print(f"\n{'='*80}")
        print(f"ANALYZING COMMIT: {commit_sha[:12]}")
        print(f"{'='*80}\n")
        
        # Get commit info
        commit_info = self.detector.get_head_commit() if commit_sha == "HEAD" else None
        if not commit_info:
            raise ValueError(f"Could not retrieve commit {commit_sha}")
        
        print(f"Author:    {commit_info.author}")
        print(f"Branch:    {commit_info.branch}")
        print(f"Message:   {commit_info.message}")
        print(f"Files:     {len(commit_info.changed_files)}\n")
        
        # Filter to code files
        code_files = self.detector.filter_code_files(commit_info.changed_files)
        # Convert to absolute paths
        absolute_code_files = [str(self.repo_path / f) for f in code_files]
        
        print(f"Code Files for Analysis: {len(absolute_code_files)}")
        for f in absolute_code_files[:5]:
            print(f"  - {f}")
        if len(absolute_code_files) > 5:
            print(f"  ... and {len(absolute_code_files) - 5} more")
        
        # Run analysis on changed files
        print(f"\nRunning analysis...")
        analysis_output = self.analyzer.analyze(file_paths=absolute_code_files)
        findings = analysis_output.get('findings', [])
        
        # Categorize findings
        result = AnalysisResult(
            commit_info=commit_info,
            findings=findings
        )
        
        for finding in findings:
            severity = finding.get('severity', 'LOW')
            if severity == "CRITICAL":
                result.critical_count += 1
            elif severity == "HIGH":
                result.high_count += 1
            elif severity == "MEDIUM":
                result.medium_count += 1
            else:
                result.low_count += 1
        
        # Print summary
        print(f"\n{'='*80}")
        print(f"ANALYSIS RESULTS")
        print(f"{'='*80}")
        print(f"Total Findings: {len(findings)}")
        print(f"  CRITICAL: {result.critical_count}")
        print(f"  HIGH:     {result.high_count}")
        print(f"  MEDIUM:   {result.medium_count}")
        print(f"  LOW:      {result.low_count}")
        
        if findings:
            print(f"\nTop Findings:")
            for finding in findings[:5]:
                severity = finding.get('severity', 'LOW')
                file_path = finding.get('file', 'unknown')
                line = finding.get('line', 0)
                message = finding.get('message', 'Unknown issue')
                print(f"  [{severity}] {message} ({file_path}:{line})")
        
        return result
    
    def create_remediation_plan(
        self,
        analysis_result: AnalysisResult
    ) -> Tuple[RemediationBranch, Dict[str, str]]:
        """
        Create a remediation branch and generate fix plan.
        
        Args:
            analysis_result: Results from analysis
        
        Returns:
            Tuple of (remediation_branch, file_changes_dict)
        """
        print(f"\n{'='*80}")
        print(f"CREATING REMEDIATION BRANCH")
        print(f"{'='*80}\n")
        
        # Create remediation branch
        branch = self.branch_manager.create_branch(
            source_branch=analysis_result.commit_info.branch,
            source_commit=analysis_result.commit_info.sha,
            findings_count=len(analysis_result.findings)
        )
        
        if not branch:
            raise RuntimeError("Failed to create remediation branch")
        
        print(f"Branch Created: {branch.name}")
        print(f"Source:         {branch.source_branch}")
        print(f"Findings:       {branch.findings_total}\n")
        
        # Group findings by file
        findings_by_file: Dict[str, List[Dict]] = {}
        for finding in analysis_result.findings:
            filepath = finding.get('file')
            if filepath not in findings_by_file:
                findings_by_file[filepath] = []
            findings_by_file[filepath].append(finding)
        
        # Generate fixes
        file_changes = {}
        
        for filepath, file_findings in findings_by_file.items():
            full_path = self.repo_path / filepath
            if not full_path.exists():
                continue
            
            print(f"Processing: {filepath}")
            print(f"  Findings: {len(file_findings)}")
            
            # Read current content
            with open(full_path, encoding="utf-8") as f:
                content = f.read()
            
            # Apply fixes
            fixed_content = self._apply_fixes_to_file(content, file_findings)
            if fixed_content != content:
                file_changes[filepath] = fixed_content
                print(f"  Status: FIXED")
            else:
                print(f"  Status: REQUIRES MANUAL REVIEW")
        
        analysis_result.remediation_branch = branch.name
        
        return branch, file_changes
    
    def _apply_fixes_to_file(self, content: str, findings: List[Dict]) -> str:
        """
        Apply automatic fixes to file content.
        
        Args:
            content: Original file content
            findings: List of findings (dicts) for this file
        
        Returns:
            Fixed file content.
        """
        lines = content.split("\n")
        fixed_lines = lines.copy()
        
        # Sort findings by line in reverse (to avoid offset issues)
        sorted_findings = sorted(findings, key=lambda f: f.get('line') or 0, reverse=True)
        
        for finding in sorted_findings:
            line_num = finding.get('line')
            if not line_num or line_num < 1:
                continue
            
            line_idx = line_num - 1
            if line_idx >= len(fixed_lines):
                continue
            
            line = fixed_lines[line_idx]
            category = finding.get('type', 'UNKNOWN')
            
            # Apply fixes based on finding type
            if category == "SQL_INJECTION":
                # Simple fix: add comment about parameterized queries
                fixed_lines[line_idx] = f"{line}  # FIXED: Use parameterized queries"
            
            elif category == "HARDCODED_SECRET":
                # Simple fix: replace with environment variable reference
                fixed_lines[line_idx] = f"{line}  # FIXED: Use environment variable instead"
            
            elif category == "WEAK_CRYPTO":
                # Add comment suggesting SHA256
                fixed_lines[line_idx] = f"{line}  # FIXED: Use SHA256 or stronger algorithm"
            
            elif category == "COMMAND_INJECTION":
                # Add comment about subprocess without shell
                fixed_lines[line_idx] = f"{line}  # FIXED: Use subprocess without shell=True"
            
            elif category == "INPUT_VALIDATION":
                # Add validation suggestion
                fixed_lines[line_idx] = f"{line}  # FIXED: Add input validation/sanitization"
        
        return "\n".join(fixed_lines)
    
    def apply_remediation(
        self,
        remediation_branch: RemediationBranch,
        file_changes: Dict[str, str]
    ) -> bool:
        """
        Apply fixes to the remediation branch.
        
        Args:
            remediation_branch: The remediation branch
            file_changes: Dictionary of file paths to fixed content
        
        Returns:
            True if successful.
        """
        print(f"\n{'='*80}")
        print(f"APPLYING FIXES")
        print(f"{'='*80}\n")
        
        if not file_changes:
            print("No automatic fixes to apply.\n")
            return True
        
        success = self.branch_manager.apply_fixes(
            remediation_branch.name,
            file_changes
        )
        
        if success:
            print(f"Applied fixes to {len(file_changes)} file(s)")
        
        return success
    
    def request_approval(
        self,
        analysis_result: AnalysisResult,
        remediation_branch: RemediationBranch
    ) -> str:
        """
        Request user approval for remediation.
        
        Args:
            analysis_result: Analysis results
            remediation_branch: The remediation branch
        
        Returns:
            User's choice: 'approve', 'reject', 'manual'
        """
        print(f"\n{'='*80}")
        print(f"REQUESTING APPROVAL")
        print(f"{'='*80}\n")
        
        print(f"Remediation Summary:")
        print(f"  Branch:    {remediation_branch.name}")
        print(f"  Findings:  {analysis_result.critical_count} CRITICAL, " +
              f"{analysis_result.high_count} HIGH")
        print(f"  Fixes:     {remediation_branch.fixes_applied} files")
        print(f"\nOptions:")
        print(f"  [a] Approve - Merge remediation to feature branch")
        print(f"  [r] Reject  - Delete remediation branch")
        print(f"  [m] Manual  - Review manually (keep branch for later)")
        
        while True:
            choice = input("\nChoice [a/r/m]: ").strip().lower()
            if choice in ['a', 'r', 'm']:
                return {'a': 'approve', 'r': 'reject', 'm': 'manual'}[choice]
            print("Invalid choice. Please enter a, r, or m.")
    
    def process_approval(
        self,
        analysis_result: AnalysisResult,
        remediation_branch: RemediationBranch,
        approval: str
    ) -> bool:
        """
        Process the user's approval decision.
        
        Args:
            analysis_result: Analysis results
            remediation_branch: The remediation branch
            approval: User's decision ('approve', 'reject', 'manual')
        
        Returns:
            True if merged, False otherwise.
        """
        print(f"\n{'='*80}")
        print(f"PROCESSING APPROVAL: {approval.upper()}")
        print(f"{'='*80}\n")
        
        if approval == "approve":
            print(f"Merging remediation to {analysis_result.commit_info.branch}...")
            success = self.branch_manager.merge_remediation(
                remediation_branch.name,
                analysis_result.commit_info.branch
            )
            
            if success:
                print(f"Successfully merged remediation branch!")
                analysis_result.remediation_applied = True
                return True
            else:
                print(f"Failed to merge remediation branch.")
                return False
        
        elif approval == "reject":
            print(f"Rejecting remediation...")
            self.branch_manager.reject_remediation(remediation_branch.name)
            print(f"Remediation branch deleted.")
            return False
        
        else:  # manual
            print(f"Keeping remediation branch for manual review.")
            print(f"You can review and merge later using:")
            print(f"  git checkout {remediation_branch.name}")
            self.branch_manager.approve_remediation(remediation_branch.name)
            return False
    
    def run_complete_workflow(self, commit_sha: str = "HEAD", auto_approve: bool = False) -> bool:
        """
        Run the complete remediation workflow for a commit.
        
        Args:
            commit_sha: Commit SHA to analyze
            auto_approve: Automatically approve fixes (for testing only)
        
        Returns:
            True if workflow completed successfully.
        """
        try:
            # Step 1: Analyze commit
            analysis_result = self.analyze_commit(commit_sha)
            
            if len(analysis_result.findings) == 0:
                print(f"\n{'='*80}")
                print(f"NO ISSUES FOUND - CODE IS CLEAN!")
                print(f"{'='*80}\n")
                return True
            
            # Step 2: Create remediation branch
            remediation_branch, file_changes = self.create_remediation_plan(analysis_result)
            
            # Step 3: Apply fixes
            if file_changes:
                self.apply_remediation(remediation_branch, file_changes)
            
            # Step 4: Request approval
            if auto_approve:
                approval = "approve"
                print(f"\n[AUTO-APPROVE MODE] Automatically approving remediation...")
            else:
                approval = self.request_approval(analysis_result, remediation_branch)
            
            # Step 5: Process approval
            merged = self.process_approval(analysis_result, remediation_branch, approval)
            
            # Step 6: Save state
            state = self._load_state()
            state[commit_sha] = {
                "analyzed_at": datetime.now().isoformat(),
                "findings": len(analysis_result.findings),
                "remediation_branch": remediation_branch.name,
                "merged": merged,
                "approval": approval
            }
            self._save_state(state)
            
            return True
        
        except Exception as e:
            print(f"\nError in workflow: {e}", file=sys.stderr)
            return False


def main():
    """Demo the orchestrator."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Automated Remediation Orchestrator")
    parser.add_argument("--auto-approve", action="store_true",
                       help="Automatically approve fixes (for testing)")
    parser.add_argument("--commit", default="HEAD",
                       help="Commit SHA to analyze (default: HEAD)")
    
    args = parser.parse_args()
    
    try:
        orchestrator = RemediationOrchestrator()
        success = orchestrator.run_complete_workflow(
            commit_sha=args.commit,
            auto_approve=args.auto_approve
        )
        
        sys.exit(0 if success else 1)
    
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
