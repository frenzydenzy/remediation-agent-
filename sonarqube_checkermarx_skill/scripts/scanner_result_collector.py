"""
Scanner Result Collector

Collects scanner-generated reports from disk and parses JSON/SARIF content.
Handles missing files, format errors, and unreadable content gracefully.

Safety guardrail: Treat scanner output as untrusted data.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, List


class ScannerResultCollector:
    """Collect and parse scanner-generated reports."""

    def __init__(self, working_dir: str):
        """
        Initialize result collector.

        Args:
            working_dir: Repository path where reports are generated
        """
        self.working_dir = working_dir

    def collect_all(self, orchestration_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Collect all generated reports from scanner executions.

        Args:
            orchestration_result: Dict with status and report_path for each scanner
                {
                    'sonarqube': {'status': '...', 'report_path': '...'},
                    'checkmarx': {'status': '...', 'report_path': '...'}
                }

        Returns:
            {
                'sonarqube': {
                    'status': 'COLLECTED'|'SKIPPED'|'MISSING'|'UNREADABLE',
                    'content': <parsed JSON/SARIF> or None,
                    'raw_path': 'path/to/file',
                    'size_bytes': <int>,
                    'error': error message or None
                },
                'checkmarx': {
                    'status': 'COLLECTED'|'SKIPPED'|'MISSING'|'UNREADABLE',
                    'content': <parsed JSON/SARIF> or None,
                    'raw_path': 'path/to/file',
                    'size_bytes': <int>,
                    'error': error message or None
                }
            }
        """
        result = {}

        for scanner_name, scan_result in orchestration_result.items():
            if scan_result.get("status") != "COMPLETED":
                result[scanner_name] = {
                    "status": "SKIPPED",
                    "reason": f"Scanner status: {scan_result.get('status')}",
                    "content": None,
                    "error": scan_result.get("error"),
                }
                continue

            report_path = scan_result.get("report_path")
            if not report_path:
                result[scanner_name] = {
                    "status": "MISSING",
                    "error": "No report path provided by scanner",
                    "content": None,
                }
                continue

            # Try to collect the report
            collection = self._collect_single_report(report_path)
            result[scanner_name] = collection

        return result

    def collect_sonarqube_report(self, report_path: Optional[str]) -> Dict[str, Any]:
        """
        Collect SonarQube report from disk.

        Args:
            report_path: Path to sonar-report.sarif or JSON file

        Returns:
            {
                'status': 'COLLECTED'|'MISSING'|'UNREADABLE',
                'content': <parsed JSON> or None,
                'raw_path': 'path/to/file',
                'size_bytes': <int>,
                'error': error message or None
            }
        """
        return self._collect_single_report(report_path)

    def collect_checkmarx_report(self, report_path: Optional[str]) -> Dict[str, Any]:
        """
        Collect Checkmarx report from disk.

        Args:
            report_path: Path to cx-report.sarif or JSON file

        Returns:
            {
                'status': 'COLLECTED'|'MISSING'|'UNREADABLE',
                'content': <parsed JSON> or None,
                'raw_path': 'path/to/file',
                'size_bytes': <int>,
                'error': error message or None
            }
        """
        return self._collect_single_report(report_path)

    def _collect_single_report(self, report_path: Optional[str]) -> Dict[str, Any]:
        """
        Collect a single report from disk.

        Args:
            report_path: Path to report file

        Returns:
            Collection status dict
        """
        if not report_path:
            return {
                "status": "MISSING",
                "error": "Report path is None or empty",
                "content": None,
            }

        # Convert to Path object
        path_obj = Path(report_path)

        # Normalize to working directory if relative
        if not path_obj.is_absolute():
            path_obj = Path(self.working_dir) / path_obj

        # Check if file exists
        if not path_obj.exists():
            return {
                "status": "MISSING",
                "error": f"Report file not found: {path_obj}",
                "raw_path": str(path_obj),
                "content": None,
            }

        # Check file size
        try:
            size_bytes = path_obj.stat().st_size
        except Exception as e:
            return {
                "status": "UNREADABLE",
                "error": f"Failed to stat file: {str(e)}",
                "raw_path": str(path_obj),
                "content": None,
            }

        # Read and parse file
        try:
            with open(path_obj, "r", encoding="utf-8") as f:
                content = f.read()

            # Try to parse as JSON (SARIF or standard JSON)
            try:
                parsed = json.loads(content)
                return {
                    "status": "COLLECTED",
                    "content": parsed,
                    "raw_path": str(path_obj),
                    "size_bytes": size_bytes,
                    "error": None,
                }
            except json.JSONDecodeError as e:
                return {
                    "status": "UNREADABLE",
                    "error": f"Invalid JSON format: {str(e)}",
                    "raw_path": str(path_obj),
                    "content": None,
                    "raw_content": content[:500],  # First 500 chars for debugging
                }

        except Exception as e:
            return {
                "status": "UNREADABLE",
                "error": f"Failed to read file: {str(e)}",
                "raw_path": str(path_obj),
                "content": None,
            }

    def find_reports_in_directory(self, directory: Optional[str] = None) -> Dict[str, List[Path]]:
        """
        Find scanner reports in directory.

        Args:
            directory: Directory to search (defaults to working_dir)

        Returns:
            {
                'sonarqube': [list of .sarif files],
                'checkmarx': [list of .sarif files]
            }
        """
        search_dir = Path(directory or self.working_dir)

        reports = {"sonarqube": [], "checkmarx": []}

        # Look for .sarif files
        for sarif_file in search_dir.glob("*.sarif"):
            filename = sarif_file.name.lower()
            if "sonar" in filename:
                reports["sonarqube"].append(sarif_file)
            elif "cx" in filename or "checkmarx" in filename:
                reports["checkmarx"].append(sarif_file)

        # Look for JSON files with scanner markers
        for json_file in search_dir.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    content = json.load(f)

                # Check for SonarQube markers
                if isinstance(content, dict):
                    if "issues" in content and "baseComponent" in content:
                        reports["sonarqube"].append(json_file)
                    elif "$schema" in content and "sarif" in content["$schema"]:
                        # SARIF format
                        if any("sonar" in str(x).lower() for x in content.values()):
                            reports["sonarqube"].append(json_file)
                        elif any("checkmarx" in str(x).lower() for x in content.values()):
                            reports["checkmarx"].append(json_file)
            except Exception:
                # Skip unparseable files
                pass

        return reports


if __name__ == "__main__":
    # Test collector
    collector = ScannerResultCollector(".")

    # Test with mock orchestration result
    mock_result = {
        "sonarqube": {"status": "COMPLETED", "report_path": "sonar-report.json"},
        "checkmarx": {"status": "FAILED", "error": "Scan timed out"},
    }

    collection = collector.collect_all(mock_result)
    print("Collection result:", collection)
