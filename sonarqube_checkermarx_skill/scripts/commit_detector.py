#!/usr/bin/env python3
"""
Git Commit Detector - Monitors for new commits and captures changed files.

This module detects when a user commits code and identifies which files were modified,
allowing the analysis pipeline to run targeted scans on the changed code.
"""

import subprocess
import json
from pathlib import Path
from typing import Optional, Dict, List
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class CommitInfo:
    """Information about a detected commit."""
    sha: str
    author: str
    timestamp: str
    message: str
    branch: str
    changed_files: List[str]
    file_stats: Dict[str, Dict[str, int]]  # {file: {additions, deletions}}


class CommitDetector:
    """Detects and captures Git commit information."""

    def __init__(self, repo_path: Path = None):
        """
        Initialize the commit detector.
        
        Args:
            repo_path: Path to the Git repository. Defaults to current directory.
        """
        self.repo_path = Path(repo_path or ".")
        if not (self.repo_path / ".git").exists():
            raise ValueError(f"No git repository found at {self.repo_path}")
    
    def get_current_branch(self) -> str:
        """Get the current active branch name."""
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    
    def get_head_commit(self) -> Optional[CommitInfo]:
        """
        Get information about the current HEAD commit.
        
        Returns:
            CommitInfo object with commit details, or None if no commits exist.
        """
        result = subprocess.run(
            ["git", "log", "-1", "--format=%H%n%an%n%aI%n%s"],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0 or not result.stdout.strip():
            return None
        
        lines = result.stdout.strip().split("\n")
        if len(lines) < 4:
            return None
        
        sha = lines[0]
        author = lines[1]
        timestamp = lines[2]
        message = lines[3]
        branch = self.get_current_branch()
        
        # Get changed files
        changed_files = self.get_changed_files(sha)
        file_stats = self.get_file_stats(sha)
        
        return CommitInfo(
            sha=sha,
            author=author,
            timestamp=timestamp,
            message=message,
            branch=branch,
            changed_files=changed_files,
            file_stats=file_stats
        )
    
    def get_changed_files(self, commit_sha: str = "HEAD") -> List[str]:
        """
        Get list of files changed in a commit.
        
        Args:
            commit_sha: Commit SHA or reference (default: HEAD)
        
        Returns:
            List of changed file paths.
        """
        result = subprocess.run(
            ["git", "diff-tree", "--no-commit-id", "--name-only", "-r", commit_sha],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return []
        
        return [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]
    
    def get_file_stats(self, commit_sha: str = "HEAD") -> Dict[str, Dict[str, int]]:
        """
        Get addition/deletion statistics for files in a commit.
        
        Args:
            commit_sha: Commit SHA or reference (default: HEAD)
        
        Returns:
            Dictionary mapping file paths to {additions, deletions} counts.
        """
        result = subprocess.run(
            ["git", "diff-tree", "--numstat", "--no-commit-id", "-r", commit_sha],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        stats = {}
        if result.returncode == 0:
            for line in result.stdout.strip().split("\n"):
                if not line.strip():
                    continue
                parts = line.split("\t")
                if len(parts) >= 3:
                    additions = int(parts[0]) if parts[0] != "-" else 0
                    deletions = int(parts[1]) if parts[1] != "-" else 0
                    filepath = parts[2]
                    stats[filepath] = {
                        "additions": additions,
                        "deletions": deletions
                    }
        
        return stats
    
    def get_commit_diff(self, commit_sha: str = "HEAD") -> str:
        """
        Get the full diff for a commit.
        
        Args:
            commit_sha: Commit SHA or reference (default: HEAD)
        
        Returns:
            Unified diff output as string.
        """
        result = subprocess.run(
            ["git", "show", commit_sha],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        return result.stdout if result.returncode == 0 else ""
    
    def get_commits_between(self, base: str, head: str) -> List[CommitInfo]:
        """
        Get all commits between two references.
        
        Args:
            base: Base commit/branch reference
            head: Head commit/branch reference
        
        Returns:
            List of CommitInfo objects in chronological order.
        """
        result = subprocess.run(
            ["git", "log", f"{base}..{head}", "--format=%H%n%an%n%aI%n%s%n---"],
            cwd=self.repo_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0 or not result.stdout.strip():
            return []
        
        commits = []
        sections = result.stdout.strip().split("---\n")
        
        for section in sections:
            lines = [l.strip() for l in section.strip().split("\n") if l.strip()]
            if len(lines) < 4:
                continue
            
            sha = lines[0]
            author = lines[1]
            timestamp = lines[2]
            message = lines[3]
            
            changed_files = self.get_changed_files(sha)
            file_stats = self.get_file_stats(sha)
            
            commits.append(CommitInfo(
                sha=sha,
                author=author,
                timestamp=timestamp,
                message=message,
                branch=self.get_current_branch(),
                changed_files=changed_files,
                file_stats=file_stats
            ))
        
        return commits
    
    def filter_code_files(self, files: List[str], include_patterns: List[str] = None) -> List[str]:
        """
        Filter code files from a list, excluding common non-code files.
        
        Args:
            files: List of file paths to filter
            include_patterns: Optional list of glob patterns to include
        
        Returns:
            Filtered list of code files.
        """
        # Default code extensions to analyze
        code_extensions = {
            '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.cpp', '.c', '.h',
            '.cs', '.go', '.rb', '.php', '.sql', '.sh', '.bash', '.yaml', '.yml',
            '.json', '.xml', '.html', '.css', '.scss'
        }
        
        exclude_patterns = {
            '.test.', '.spec.', '.min.', 'node_modules', 'dist', 'build',
            '__pycache__', '.git', '.vscode', '.idea', 'coverage'
        }
        
        filtered = []
        for f in files:
            # Skip if matches exclude pattern
            if any(exc in f for exc in exclude_patterns):
                continue
            
            # Check if file has code extension
            if any(f.endswith(ext) for ext in code_extensions):
                filtered.append(f)
        
        return filtered
    
    def to_dict(self) -> Dict:
        """Export commit detector state to dictionary."""
        return {
            "repo_path": str(self.repo_path.resolve()),
            "current_branch": self.get_current_branch()
        }


def main():
    """Demo the commit detector."""
    import sys
    
    try:
        detector = CommitDetector()
        
        # Get current HEAD commit
        commit = detector.get_head_commit()
        
        if commit:
            print(f"\n{'='*80}")
            print(f"CURRENT COMMIT")
            print(f"{'='*80}")
            print(f"SHA:          {commit.sha[:12]}")
            print(f"Author:       {commit.author}")
            print(f"Timestamp:    {commit.timestamp}")
            print(f"Branch:       {commit.branch}")
            print(f"Message:      {commit.message}")
            print(f"\nChanged Files ({len(commit.changed_files)}):")
            
            code_files = detector.filter_code_files(commit.changed_files)
            print(f"Code Files ({len(code_files)}):")
            for f in code_files:
                stats = commit.file_stats.get(f, {})
                adds = stats.get("additions", 0)
                dels = stats.get("deletions", 0)
                print(f"  {f} (+{adds},-{dels})")
            
            if len(code_files) < len(commit.changed_files):
                print(f"\nOther Files ({len(commit.changed_files) - len(code_files)}):")
                for f in commit.changed_files:
                    if f not in code_files:
                        print(f"  {f} (skipped)")
        else:
            print("No commits found.")
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
