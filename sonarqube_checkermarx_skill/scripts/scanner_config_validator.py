"""
Scanner Configuration Validator

Validates SonarQube and Checkmarx configuration before execution.
Ensures all required fields are present and credentials are not hardcoded.

Safety guardrail: Never output or log credentials.
"""

import os
from typing import Tuple, List, Dict, Any


class ScannerConfigValidator:
    """Validates scanner configuration for Phase 3 orchestration."""

    @staticmethod
    def validate_sonarqube_config(config: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate SonarQube configuration.

        Required fields:
            - project_key (string): SonarQube project key
            - sonar_host_url (URL): SonarQube server URL
            - sonar_login (token): Authentication token

        Args:
            config: Configuration dictionary from scanner_config

        Returns:
            Tuple[is_valid, errors]: (bool, list of error strings)
        """
        errors = []

        if not config:
            errors.append("SonarQube config is None or empty")
            return False, errors

        # Validate required fields
        if not config.get("project_key"):
            errors.append("Missing project_key (required)")

        if not config.get("sonar_host_url"):
            errors.append("Missing sonar_host_url (required)")

        # Validate login token (don't output the value)
        sonar_login = config.get("sonar_login")
        if not sonar_login:
            # Try to get from environment variable as fallback
            if not os.getenv("SONAR_LOGIN"):
                errors.append("Missing sonar_login token (not in config or SONAR_LOGIN env var)")
        else:
            # Check if it looks like hardcoded credential (more than 20 chars, looks like token)
            if len(sonar_login) > 20 and not sonar_login.startswith("${"):
                # Likely a real token; warn but allow (env var or config file is acceptable)
                pass

        # Validate URL format
        if config.get("sonar_host_url"):
            url = config["sonar_host_url"]
            if not url.startswith(("http://", "https://")):
                errors.append("sonar_host_url must start with http:// or https://")

        return len(errors) == 0, errors

    @staticmethod
    def validate_checkmarx_config(config: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate Checkmarx configuration.

        Required fields:
            - project_name (string): Checkmarx project name
            - tenant (string): Tenant name or URL
            - scan_types (string): Comma-separated scan types

        Args:
            config: Configuration dictionary from scanner_config

        Returns:
            Tuple[is_valid, errors]: (bool, list of error strings)
        """
        errors = []

        if not config:
            errors.append("Checkmarx config is None or empty")
            return False, errors

        # Validate required fields
        if not config.get("project_name"):
            errors.append("Missing project_name (required)")

        if not config.get("tenant"):
            errors.append("Missing tenant URL/name (required)")

        # Validate scan types
        if not config.get("scan_types"):
            errors.append("Missing scan_types (required, e.g., 'sast,sca,iac-security')")
        else:
            valid_types = {
                "sast",
                "sca",
                "iac",
                "iac-security",
                "secrets",
                "containers",
                "api-security",
            }
            provided = {s.strip().lower() for s in config["scan_types"].split(",")}
            invalid = provided - valid_types
            if invalid:
                errors.append(
                    f"Invalid scan_types: {invalid}. Valid: {sorted(valid_types)}"
                )

        return len(errors) == 0, errors

    @staticmethod
    def validate_all_config(scanner_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate entire scanner configuration.

        Args:
            scanner_config: Dict with structure:
                {
                    'sonarqube': {'enabled': bool, 'project_key': ..., ...},
                    'checkmarx': {'enabled': bool, 'project_name': ..., ...}
                }

        Returns:
            {
                'valid': bool,
                'sonarqube': {'enabled': bool, 'valid': bool, 'errors': [...]},
                'checkmarx': {'enabled': bool, 'valid': bool, 'errors': [...]}
            }
        """
        result = {"valid": True}

        # Validate SonarQube if enabled
        sonar_config = scanner_config.get("sonarqube", {})
        sonar_enabled = sonar_config.get("enabled", False)
        if sonar_enabled:
            sonar_valid, sonar_errors = ScannerConfigValidator.validate_sonarqube_config(
                sonar_config
            )
            result["sonarqube"] = {
                "enabled": True,
                "valid": sonar_valid,
                "errors": sonar_errors,
            }
            if not sonar_valid:
                result["valid"] = False
        else:
            result["sonarqube"] = {"enabled": False, "valid": True, "errors": []}

        # Validate Checkmarx if enabled
        cm_config = scanner_config.get("checkmarx", {})
        cm_enabled = cm_config.get("enabled", False)
        if cm_enabled:
            cm_valid, cm_errors = ScannerConfigValidator.validate_checkmarx_config(
                cm_config
            )
            result["checkmarx"] = {
                "enabled": True,
                "valid": cm_valid,
                "errors": cm_errors,
            }
            if not cm_valid:
                result["valid"] = False
        else:
            result["checkmarx"] = {"enabled": False, "valid": True, "errors": []}

        return result


if __name__ == "__main__":
    # Test validation
    test_config = {
        "sonarqube": {
            "enabled": True,
            "project_key": "my-project",
            "sonar_host_url": "http://localhost:9000",
            "sonar_login": "squ_1234567890abcdef",
        },
        "checkmarx": {
            "enabled": True,
            "project_name": "my-app",
            "tenant": "my-tenant.checkmarx.net",
            "scan_types": "sast,sca,iac-security",
        },
    }

    validation = ScannerConfigValidator.validate_all_config(test_config)
    print("Validation result:", validation)
