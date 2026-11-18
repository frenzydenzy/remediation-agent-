"""
Scanner Orchestrator

Main entry point for Phase 3: Local Scanner Orchestration.
Coordinates SonarQube and Checkmarx CLI execution, verifies no modifications,
and collects results for normalization in Phase 4.

Safety guardrails:
  - Read-only operation (no code modifications during scan)
  - Feature-branch scope only (don't modify branches)
  - Verify working tree unchanged before & after
  - No credential output/logging
"""

import os
import subprocess
import json
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone

from scanner_config_validator import ScannerConfigValidator
from sonarqube_runner import SonarQubeRunner
from checkmarx_runner import CheckmarxRunner
from scanner_result_collector import ScannerResultCollector


class ScannerOrchestrator:
    """Main orchestrator for Phase 3 scanner execution."""

    def __init__(
        self,
        working_dir: str,
        feature_branch_commit: Optional[str] = None,
        changed_files: Optional[list] = None,
    ):
        """
        Initialize scanner orchestrator.

        Args:
            working_dir: Repository path to scan
            feature_branch_commit: Git commit SHA to analyze (optional)
            changed_files: List of changed files in feature branch (optional)
        """
        self.working_dir = working_dir
        self.feature_branch_commit = feature_branch_commit
        self.changed_files = changed_files or []
        self.results = {}
        self.initial_state = None
        self.final_state = None

    def run(self, scanner_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute scanners and collect results.

        Args:
            scanner_config: Dict with scanner names, enabled state, CLI paths
                {
                    'sonarqube': {'enabled': bool, 'project_key': ..., ...},
                    'checkmarx': {'enabled': bool, 'project_name': ..., ...}
                }

        Returns:
            {
                'status': 'COMPLETED'|'FAILED',
                'timestamp': ISO 8601 timestamp,
                'working_dir': working directory scanned,
                'feature_branch_commit': commit SHA analyzed,
                'changed_files_count': number of changed files,
                'validation': {
                    'config': validation result,
                    'no_modifications': verification result
                },
                'scanners': {
                    'sonarqube': {
                        'status': 'COMPLETED'|'FAILED'|'NOT_CONFIGURED'|'NOT_RUN',
                        'report_path': '...',
                        'error': None or error message
                    },
                    'checkmarx': {
                        'status': 'COMPLETED'|'FAILED'|'NOT_CONFIGURED'|'NOT_RUN',
                        'report_path': '...',
                        'error': None or error message
                    }
                },
                'reports': {
                    'sonarqube': { 'status': 'COLLECTED'|'MISSING', 'content': {...} },
                    'checkmarx': { 'status': 'COLLECTED'|'MISSING', 'content': {...} }
                }
            }
        """
        self.results = {
            "status": "IN_PROGRESS",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "working_dir": self.working_dir,
            "feature_branch_commit": self.feature_branch_commit,
            "changed_files_count": len(self.changed_files),
        }

        # Step 1: Capture initial state (for verification)
        self.initial_state = self._capture_working_tree_state()

        # Step 2: Validate configuration
        config_validation = ScannerConfigValidator.validate_all_config(scanner_config)
        self.results["validation"] = {"config": config_validation}

        if not config_validation.get("valid"):
            self.results["status"] = "FAILED"
            self.results["error"] = "Configuration validation failed"
            return self.results

        # Step 3: Execute scanners
        scanner_results = {}

        if config_validation.get("sonarqube", {}).get("enabled"):
            sonar_config = scanner_config.get("sonarqube", {})
            sonar_runner = SonarQubeRunner(self.working_dir, sonar_config)
            scanner_results["sonarqube"] = sonar_runner.run()

        if config_validation.get("checkmarx", {}).get("enabled"):
            cm_config = scanner_config.get("checkmarx", {})
            cm_runner = CheckmarxRunner(self.working_dir, cm_config)
            scanner_results["checkmarx"] = cm_runner.run()

        self.results["scanners"] = scanner_results

        # Step 4: Verify no modifications
        self.final_state = self._capture_working_tree_state()
        verification = self._verify_no_modifications()
        self.results["validation"]["no_modifications"] = verification

        if not verification.get("valid"):
            # Working tree was modified - this is a safety violation
            self.results["status"] = "FAILED"
            self.results["error"] = "Working tree was modified during scan (safety violation)"
            return self.results

        # Step 5: Collect reports
        collector = ScannerResultCollector(self.working_dir)
        reports = collector.collect_all(scanner_results)
        self.results["reports"] = reports

        # Step 6: Determine overall status
        any_completed = any(
            r.get("status") == "COMPLETED" for r in scanner_results.values()
        )
        any_failed = any(r.get("status") == "FAILED" for r in scanner_results.values())

        if any_completed:
            self.results["status"] = "COMPLETED"
        elif any_failed:
            self.results["status"] = "PARTIAL_FAILURE"
        else:
            self.results["status"] = "NO_SCANNERS_RUN"

        return self.results

    def _capture_working_tree_state(self) -> Dict[str, Any]:
        """
        Capture current state of working tree (file count, modification time).

        Returns:
            {
                'file_count': <int>,
                'timestamp': ISO 8601,
                'git_status': git status output or None,
                'uncommitted_changes': bool
            }
        """
        try:
            # Get file count
            file_count = sum(
                1 for _ in Path(self.working_dir).rglob("*") if _.is_file()
            )

            # Get git status
            git_status = None
            uncommitted_changes = False
            try:
                result = subprocess.run(
                    ["git", "status", "--porcelain"],
                    cwd=self.working_dir,
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if result.returncode == 0:
                    git_status = result.stdout
                    uncommitted_changes = bool(result.stdout.strip())
            except Exception:
                pass

            return {
                "file_count": file_count,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "git_status": git_status,
                "uncommitted_changes": uncommitted_changes,
            }
        except Exception as e:
            return {
                "file_count": -1,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e),
                "uncommitted_changes": None,
            }

    def _verify_no_modifications(self) -> Dict[str, Any]:
        """
        Verify that working tree was not modified during scan.

        Returns:
            {
                'valid': bool,
                'file_count_changed': bool,
                'git_status_changed': bool,
                'details': description of changes detected
            }
        """
        result = {"valid": True, "details": "No modifications detected"}

        if not self.initial_state or not self.final_state:
            result["valid"] = False
            result["details"] = "Could not capture initial or final state"
            return result

        # Check file count (allow minor variance for temp files)
        initial_count = self.initial_state.get("file_count", 0)
        final_count = self.final_state.get("file_count", 0)
        file_count_diff = abs(final_count - initial_count)

        if file_count_diff > 5:  # Allow up to 5 temp files
            result["valid"] = False
            result["file_count_changed"] = True
            result["details"] = f"File count changed: {initial_count} -> {final_count}"

        # Check git status (should be identical)
        initial_status = self.initial_state.get("git_status", "")
        final_status = self.final_state.get("git_status", "")

        if initial_status != final_status:
            result["valid"] = False
            result["git_status_changed"] = True
            result["details"] = "Git status changed during scan (working tree modified)"

        return result

    def get_results_summary(self) -> str:
        """
        Get a human-readable summary of scan results.

        Returns:
            Formatted summary string
        """
        lines = [
            f"Scanner Orchestration: {self.results.get('status', 'UNKNOWN')}",
            f"Timestamp: {self.results.get('timestamp', 'N/A')}",
            f"Working directory: {self.working_dir}",
            "",
            "Scanner Results:",
        ]

        for scanner_name, result in self.results.get("scanners", {}).items():
            status = result.get("status", "UNKNOWN")
            error = result.get("error", "")
            lines.append(f"  {scanner_name.upper()}: {status}")
            if error:
                lines.append(f"    Error: {error}")

        lines.append("")
        lines.append("Validation:")
        no_mods = self.results.get("validation", {}).get("no_modifications", {})
        lines.append(f"  No modifications: {no_mods.get('valid', False)}")
        if not no_mods.get("valid"):
            lines.append(f"    Details: {no_mods.get('details', 'Unknown')}")

        return "\n".join(lines)

    def save_results_to_file(self, output_path: Optional[str] = None) -> str:
        """
        Save orchestration results to JSON file.

        Args:
            output_path: Path to save results (defaults to orchestration-results.json)

        Returns:
            Path to saved file
        """
        if not output_path:
            output_path = Path(self.working_dir) / "orchestration-results.json"
        else:
            output_path = Path(output_path)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2)

        return str(output_path)


if __name__ == "__main__":
    # Test orchestrator
    config = {
        "sonarqube": {
            "enabled": False,  # Disabled for testing
            "project_key": "test-project",
            "sonar_host_url": "http://localhost:9000",
        },
        "checkmarx": {
            "enabled": False,  # Disabled for testing
            "project_name": "test-app",
            "tenant": "my-tenant.checkmarx.net",
            "scan_types": "sast,sca",
        },
    }

    orchestrator = ScannerOrchestrator(".", feature_branch_commit="abc123")
    result = orchestrator.run(config)
    print("Orchestration result:")
    print(json.dumps(result, indent=2))
    print("")
    print(orchestrator.get_results_summary())
