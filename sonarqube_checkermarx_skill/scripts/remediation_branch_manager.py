#!/usr/bin/env python3
"""
Remediation Branch Manager - Creates and manages fix branches for analysis findings.

Creates isolated remediation branches where fixes can be applied without touching
the original feature branch or base branch. Tracks the relationship between
analysis branches and their remediation counterparts.
"""

import subprocess
import json
from pathlib import Path
from typing import Optional, Dict, List
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class RemediationBranch:
    """Information about a remediation branch."""
    name: str
    source_branch: str
    source_commit: str
    created_at: str
    fixes_applied: int = 0
    findings_total: int = 0
    approval_status: str = "pending"  # pending, approved, rejected, merged
    approval_at: Optional[str] = None
    merged_at: Optional[str] = None


class RemediationBranchManager:
    """Manages creation and lifecycle of remediation branches."""
    
    def __init__(self, repo_path: Path = None):
        """
        Initialize the branch manager.
        
        Args:
            repo_path: Path to the Git repository.
        """
        self.repo_path = Path(repo_path or ".")
        self.metadata_file = self.repo_path / ".remediation" / "branches.json"
        self._ensure_metadata_dir()
    
    def _ensure_metadata_dir(self):
        """Create metadata directory if it doesn't exist."""
        self.metadata_file.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_metadata(self) -> Dict[str, RemediationBranch]:
        """Load remediation branch metadata from disk."""
        if not self.metadata_file.exists():
            return {}
        
        try:
            with open(self.metadata_file) as f:
                data = json.load(f)
                return {
                    name: RemediationBranch(**branch_data)
                    for name, branch_data in data.items()
                }
        except (json.JSONDecodeError, ValueError):
            return {}
    
    def _save_metadata(self, metadata: Dict[str, RemediationBranch]):
        """Save remediation branch metadata to disk."""
        self._ensure_metadata_dir()
        with open(self.metadata_file, "w") as f:
            data = {name: asdict(branch) for name, branch in metadata.items()}
            json.dump(data, f, indent=2)
    
    def create_branch(
        self,
        source_branch: str,
        source_commit: str,
        findings_count: int = 0
    ) -> Optional[RemediationBranch]:
        """
        Create a new remediation branch from a feature branch.
        
        Args:
            source_branch: The feature branch being analyzed
            source_commit: The commit SHA being analyzed
            findings_count: Number of findings detected
        
        Returns:
            RemediationBranch object if successful, None otherwise.
        """
        # Create branch name: remediation/{source_branch}/{timestamp}/{short_sha}
        short_sha = source_commit[:8]
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        branch_name = f"remediation/{source_branch}/{timestamp}-{short_sha}"
        
        # Verify source branch exists
        result = subprocess.run(
            ["git", "rev-parse", "--verify", f"refs/heads/{source_branch}"],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Error: Source branch '{source_branch}' not found")
            return None
        
        # Create the branch from the commit
        result = subprocess.run(
            ["git", "checkout", "-b", branch_name, source_commit],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Error creating branch: {result.stderr}")
            return None
        
        # Create metadata entry
        remediation = RemediationBranch(
            name=branch_name,
            source_branch=source_branch,
            source_commit=source_commit,
            created_at=datetime.now().isoformat(),
            findings_total=findings_count
        )
        
        # Save to metadata
        metadata = self._load_metadata()
        metadata[branch_name] = remediation
        self._save_metadata(metadata)
        
        return remediation
    
    def apply_fixes(
        self,
        remediation_branch: str,
        file_changes: Dict[str, str]
    ) -> bool:
        """
        Apply fixes to the remediation branch.
        
        Args:
            remediation_branch: Name of the remediation branch
            file_changes: Dictionary mapping file paths to new content
        
        Returns:
            True if successful, False otherwise.
        """
        # Switch to remediation branch
        result = subprocess.run(
            ["git", "checkout", remediation_branch],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Error switching to branch: {result.stderr}")
            return False
        
        # Apply changes
        for filepath, content in file_changes.items():
            file_path = self.repo_path / filepath
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
        
        # Stage all changes
        result = subprocess.run(
            ["git", "add", "-A"],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Error staging changes: {result.stderr}")
            return False
        
        # Commit changes
        result = subprocess.run(
            ["git", "commit", "-m", "Fix vulnerabilities detected by analysis"],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Error committing changes: {result.stderr}")
            return False
        
        # Update metadata
        metadata = self._load_metadata()
        if remediation_branch in metadata:
            # Count files changed
            metadata[remediation_branch].fixes_applied = len(file_changes)
        self._save_metadata(metadata)
        
        return True
    
    def approve_remediation(self, remediation_branch: str) -> bool:
        """
        Mark a remediation branch as approved.
        
        Args:
            remediation_branch: Name of the remediation branch
        
        Returns:
            True if successful, False otherwise.
        """
        metadata = self._load_metadata()
        
        if remediation_branch not in metadata:
            print(f"Error: Remediation branch '{remediation_branch}' not found in metadata")
            return False
        
        metadata[remediation_branch].approval_status = "approved"
        metadata[remediation_branch].approval_at = datetime.now().isoformat()
        self._save_metadata(metadata)
        
        return True
    
    def reject_remediation(self, remediation_branch: str) -> bool:
        """
        Mark a remediation branch as rejected.
        
        Args:
            remediation_branch: Name of the remediation branch
        
        Returns:
            True if successful, False otherwise.
        """
        metadata = self._load_metadata()
        
        if remediation_branch not in metadata:
            print(f"Error: Remediation branch '{remediation_branch}' not found in metadata")
            return False
        
        metadata[remediation_branch].approval_status = "rejected"
        metadata[remediation_branch].approval_at = datetime.now().isoformat()
        self._save_metadata(metadata)
        
        # Delete the branch
        subprocess.run(
            ["git", "branch", "-D", remediation_branch],
            cwd=self.repo_path,
            capture_output=True
        )
        
        return True
    
    def merge_remediation(
        self,
        remediation_branch: str,
        target_branch: str = None
    ) -> bool:
        """
        Merge remediation branch back to its source branch.
        
        Args:
            remediation_branch: Name of the remediation branch
            target_branch: Target branch to merge into (default: source_branch)
        
        Returns:
            True if successful, False otherwise.
        """
        metadata = self._load_metadata()
        
        if remediation_branch not in metadata:
            print(f"Error: Remediation branch '{remediation_branch}' not found in metadata")
            return False
        
        entry = metadata[remediation_branch]
        target = target_branch or entry.source_branch
        
        # Switch to target branch
        result = subprocess.run(
            ["git", "checkout", target],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Error switching to target branch: {result.stderr}")
            return False
        
        # Merge remediation branch
        result = subprocess.run(
            ["git", "merge", "--no-ff", remediation_branch, 
             "-m", f"Merge remediation branch {remediation_branch}"],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Error merging branch: {result.stderr}")
            # Abort merge
            subprocess.run(
                ["git", "merge", "--abort"],
                cwd=self.repo_path,
                capture_output=True
            )
            return False
        
        # Update metadata
        entry.approval_status = "merged"
        entry.merged_at = datetime.now().isoformat()
        self._save_metadata(metadata)
        
        # Clean up: delete remediation branch
        subprocess.run(
            ["git", "branch", "-d", remediation_branch],
            cwd=self.repo_path,
            capture_output=True
        )
        
        return True
    
    def get_remediation(self, remediation_branch: str) -> Optional[RemediationBranch]:
        """
        Get metadata for a specific remediation branch.
        
        Args:
            remediation_branch: Name of the remediation branch
        
        Returns:
            RemediationBranch object or None if not found.
        """
        metadata = self._load_metadata()
        return metadata.get(remediation_branch)
    
    def list_all_remediations(self) -> Dict[str, RemediationBranch]:
        """Get all tracked remediation branches."""
        return self._load_metadata()
    
    def list_pending_approvals(self) -> Dict[str, RemediationBranch]:
        """Get all remediation branches awaiting approval."""
        metadata = self._load_metadata()
        return {
            name: branch
            for name, branch in metadata.items()
            if branch.approval_status == "pending"
        }


def main():
    """Demo the remediation branch manager."""
    import sys
    
    try:
        manager = RemediationBranchManager()
        
        # List all remediations
        all_remediations = manager.list_all_remediations()
        
        print(f"\n{'='*80}")
        print(f"REMEDIATION BRANCHES")
        print(f"{'='*80}")
        
        if not all_remediations:
            print("No remediation branches found.")
        else:
            for branch_name, branch in all_remediations.items():
                print(f"\nBranch:    {branch_name}")
                print(f"  Source:   {branch.source_branch} ({branch.source_commit[:12]})")
                print(f"  Created:  {branch.created_at}")
                print(f"  Status:   {branch.approval_status}")
                print(f"  Findings: {branch.findings_total}")
                print(f"  Fixes:    {branch.fixes_applied}")
        
        # List pending approvals
        pending = manager.list_pending_approvals()
        
        print(f"\n{'='*80}")
        print(f"PENDING APPROVALS ({len(pending)})")
        print(f"{'='*80}")
        
        for branch_name, branch in pending.items():
            print(f"  {branch_name}")
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
