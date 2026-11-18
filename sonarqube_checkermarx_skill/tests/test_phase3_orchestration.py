"""
Phase 3 Test Suite

Comprehensive tests for scanner orchestration components.
Tests configuration validation, error handling, and integration.
"""

import sys
import json
import tempfile
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from scanner_config_validator import ScannerConfigValidator
from sonarqube_runner import SonarQubeRunner
from checkmarx_runner import CheckmarxRunner
from scanner_result_collector import ScannerResultCollector
from scanner_orchestrator import ScannerOrchestrator


class TestScannerConfigValidator:
    """Test configuration validation."""

    def test_valid_sonarqube_config(self):
        """Test valid SonarQube configuration."""
        config = {
            "project_key": "my-project",
            "sonar_host_url": "http://localhost:9000",
            "sonar_login": "squ_token123",
        }
        is_valid, errors = ScannerConfigValidator.validate_sonarqube_config(config)
        assert is_valid, f"Valid config failed: {errors}"
        print("âœ… test_valid_sonarqube_config PASSED")

    def test_missing_sonarqube_project_key(self):
        """Test missing project key."""
        config = {
            "sonar_host_url": "http://localhost:9000",
            "sonar_login": "squ_token123",
        }
        is_valid, errors = ScannerConfigValidator.validate_sonarqube_config(config)
        assert not is_valid, "Should fail without project_key"
        assert any("project_key" in e for e in errors)
        print("âœ… test_missing_sonarqube_project_key PASSED")

    def test_invalid_sonarqube_url(self):
        """Test invalid URL format."""
        config = {
            "project_key": "my-project",
            "sonar_host_url": "not-a-url",
            "sonar_login": "squ_token123",
        }
        is_valid, errors = ScannerConfigValidator.validate_sonarqube_config(config)
        assert not is_valid, "Should fail with invalid URL"
        assert any("http" in e for e in errors)
        print("âœ… test_invalid_sonarqube_url PASSED")

    def test_valid_checkmarx_config(self):
        """Test valid Checkmarx configuration."""
        config = {
            "project_name": "my-app",
            "tenant": "my-tenant.checkmarx.net",
            "scan_types": "sast,sca",
        }
        is_valid, errors = ScannerConfigValidator.validate_checkmarx_config(config)
        assert is_valid, f"Valid config failed: {errors}"
        print("âœ… test_valid_checkmarx_config PASSED")

    def test_invalid_checkmarx_scan_types(self):
        """Test invalid scan types."""
        config = {
            "project_name": "my-app",
            "tenant": "my-tenant.checkmarx.net",
            "scan_types": "sast,invalid-type",
        }
        is_valid, errors = ScannerConfigValidator.validate_checkmarx_config(config)
        assert not is_valid, "Should fail with invalid scan types"
        assert any("Invalid scan_types" in e for e in errors)
        print("âœ… test_invalid_checkmarx_scan_types PASSED")

    def test_validate_all_config_mixed(self):
        """Test validation of full scanner config."""
        config = {
            "sonarqube": {
                "enabled": True,
                "project_key": "my-project",
                "sonar_host_url": "http://localhost:9000",
                "sonar_login": "squ_token123",
            },
            "checkmarx": {
                "enabled": False,
            },
        }
        result = ScannerConfigValidator.validate_all_config(config)
        assert result["valid"], f"Config should be valid: {result}"
        assert result["sonarqube"]["valid"]
        assert result["sonarqube"]["enabled"]
        print("âœ… test_validate_all_config_mixed PASSED")


class TestScannerResultCollector:
    """Test report collection."""

    def test_collect_missing_report(self):
        """Test handling of missing report."""
        with tempfile.TemporaryDirectory() as tmpdir:
            collector = ScannerResultCollector(tmpdir)
            orchestration_result = {
                "sonarqube": {
                    "status": "COMPLETED",
                    "report_path": "nonexistent.sarif",
                }
            }
            result = collector.collect_all(orchestration_result)
            assert result["sonarqube"]["status"] == "MISSING"
            print("âœ… test_collect_missing_report PASSED")

    def test_collect_valid_json_report(self):
        """Test collection of valid JSON report."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a test report
            report_path = Path(tmpdir) / "sonar-report.json"
            test_data = {"version": "1.0", "issues": []}
            with open(report_path, "w") as f:
                json.dump(test_data, f)

            collector = ScannerResultCollector(tmpdir)
            orchestration_result = {
                "sonarqube": {
                    "status": "COMPLETED",
                    "report_path": str(report_path),
                }
            }
            result = collector.collect_all(orchestration_result)
            assert result["sonarqube"]["status"] == "COLLECTED"
            assert result["sonarqube"]["content"] == test_data
            print("âœ… test_collect_valid_json_report PASSED")

    def test_find_reports_in_directory(self):
        """Test finding reports in directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create test reports
            (Path(tmpdir) / "sonar-report.sarif").touch()
            (Path(tmpdir) / "cx-report.sarif").touch()
            (Path(tmpdir) / "other-file.txt").touch()

            collector = ScannerResultCollector(tmpdir)
            reports = collector.find_reports_in_directory(tmpdir)

            assert len(reports["sonarqube"]) > 0
            assert len(reports["checkmarx"]) > 0
            print("âœ… test_find_reports_in_directory PASSED")


class TestScannerOrchestrator:
    """Test orchestrator."""

    def test_orchestrator_no_scanners_enabled(self):
        """Test orchestrator with no scanners enabled."""
        config = {
            "sonarqube": {"enabled": False},
            "checkmarx": {"enabled": False},
        }
        orchestrator = ScannerOrchestrator(".")
        result = orchestrator.run(config)

        assert result["status"] == "NO_SCANNERS_RUN"
        assert "timestamp" in result
        assert "validation" in result
        print("âœ… test_orchestrator_no_scanners_enabled PASSED")

    def test_orchestrator_invalid_config(self):
        """Test orchestrator with invalid configuration."""
        config = {
            "sonarqube": {
                "enabled": True,
                # Missing required fields
            },
            "checkmarx": {"enabled": False},
        }
        orchestrator = ScannerOrchestrator(".")
        result = orchestrator.run(config)

        assert result["status"] == "FAILED"
        assert "validation" in result
        print("âœ… test_orchestrator_invalid_config PASSED")

    def test_orchestrator_get_summary(self):
        """Test orchestrator summary generation."""
        config = {
            "sonarqube": {"enabled": False},
            "checkmarx": {"enabled": False},
        }
        orchestrator = ScannerOrchestrator(".")
        orchestrator.run(config)
        summary = orchestrator.get_results_summary()

        assert "NO_SCANNERS_RUN" in summary
        assert "Scanner Results:" in summary
        print("âœ… test_orchestrator_get_summary PASSED")

    def test_orchestrator_save_results(self):
        """Test saving results to file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = {
                "sonarqube": {"enabled": False},
                "checkmarx": {"enabled": False},
            }
            orchestrator = ScannerOrchestrator(tmpdir)
            orchestrator.run(config)

            output_file = Path(tmpdir) / "test-results.json"
            saved_path = orchestrator.save_results_to_file(str(output_file))

            assert Path(saved_path).exists()
            with open(saved_path) as f:
                data = json.load(f)
            assert "status" in data
            print("âœ… test_orchestrator_save_results PASSED")


def run_all_tests():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("RUNNING PHASE 3 TEST SUITE")
    print("=" * 70 + "\n")

    test_suites = [
        TestScannerConfigValidator(),
        TestScannerResultCollector(),
        TestScannerOrchestrator(),
    ]

    total_tests = 0
    passed_tests = 0

    for test_suite in test_suites:
        suite_name = test_suite.__class__.__name__
        print(f"\nTEST SUITE: {suite_name}")
        print("-" * 70)

        # Get all test methods
        test_methods = [
            method
            for method in dir(test_suite)
            if method.startswith("test_") and callable(getattr(test_suite, method))
        ]

        for test_method_name in test_methods:
            total_tests += 1
            try:
                test_method = getattr(test_suite, test_method_name)
                test_method()
                passed_tests += 1
            except AssertionError as e:
                print(f"FAILED {test_method_name}: {e}")
            except Exception as e:
                print(f"ERROR {test_method_name}: {e}")

    print("\n" + "=" * 70)
    print(f"TEST RESULTS: {passed_tests}/{total_tests} passed")
    print("=" * 70 + "\n")

    return passed_tests == total_tests


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

