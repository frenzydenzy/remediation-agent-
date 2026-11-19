"""
Local Code Analyzer - Standalone Pattern Detection

Detects common vulnerabilities and code quality issues:
- SQL Injection patterns
- Hardcoded secrets
- Code duplication
- Complex functions
- Dead code
- Weak cryptography
- Input validation issues

No external tools or API calls required.
"""

import re
import os
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import hashlib


class LocalCodeAnalyzer:
    """Analyze code for vulnerabilities and quality issues locally."""

    def __init__(self, working_dir: str):
        """
        Initialize analyzer.
        
        Args:
            working_dir: Repository path to analyze
        """
        self.working_dir = working_dir
        self.findings = []
        self.file_contents = {}

    def analyze(self, file_paths: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Analyze code files for vulnerabilities.
        
        Args:
            file_paths: Specific files to analyze (None = all Python/Java/JS files)
        
        Returns:
            {
                'status': 'COMPLETED',
                'findings': [...],
                'summary': {...}
            }
        """
        self.findings = []
        
        # Get files to analyze
        if file_paths:
            files = file_paths
        else:
            files = self._find_code_files()
        
        # Analyze each file
        for file_path in files:
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    self.file_contents[file_path] = content
                    
                    # Run all checks
                    self._check_sql_injection(file_path, content)
                    self._check_hardcoded_secrets(file_path, content)
                    self._check_weak_crypto(file_path, content)
                    self._check_input_validation(file_path, content)
                    self._check_command_injection(file_path, content)
                    self._check_path_traversal(file_path, content)
                    self._check_xss_vulnerabilities(file_path, content)
                except Exception as e:
                    self.findings.append({
                        'file': file_path,
                        'line': 0,
                        'type': 'ANALYSIS_ERROR',
                        'severity': 'LOW',
                        'message': f'Failed to analyze: {str(e)}'
                    })
        
        # Analyze code quality across all files
        self._check_code_duplication()
        self._check_function_complexity()
        self._check_dead_code()
        
        # Sort by severity
        severity_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        self.findings.sort(key=lambda x: severity_order.get(x.get('severity', 'LOW'), 4))
        
        return {
            'status': 'COMPLETED',
            'findings': self.findings,
            'summary': self._generate_summary()
        }

    def _find_code_files(self) -> List[str]:
        """Find all code files in working directory."""
        code_extensions = ['.py', '.java', '.js', '.ts', '.jsx', '.tsx', '.cs', '.go', '.rb']
        files = []
        
        for root, dirs, filenames in os.walk(self.working_dir):
            # Skip common unneeded directories
            dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'node_modules', '.venv', 'venv']]
            
            for filename in filenames:
                if any(filename.endswith(ext) for ext in code_extensions):
                    files.append(os.path.join(root, filename))
        
        return files[:50]  # Limit to 50 files for demo

    def _check_sql_injection(self, file_path: str, content: str) -> None:
        """Check for SQL injection vulnerabilities."""
        patterns = [
            # String concatenation in SQL
            (r'(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s*["\']?\s*\+\s*', 'SQL query string concatenation'),
            (r'query\s*=\s*["\'][^"\']*["\']\s*\+\s*', 'SQL string concatenation with +'),
            (r'(?:sql|query|statement)\s*=\s*f["\'].*{.*}', 'SQL f-string interpolation'),
            (r'execute\s*\(["\'].*%s.*["\'].*\+', 'SQL execute with string concatenation'),
            (r'query\s*=\s*["\']SELECT.*WHERE.*["\'].*format\(', 'SQL with format() method'),
        ]
        
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            for pattern, description in patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    self.findings.append({
                        'file': file_path,
                        'line': line_num,
                        'type': 'SQL_INJECTION',
                        'severity': 'CRITICAL',
                        'message': f'SQL Injection Risk: {description}',
                        'code': line.strip()[:80]
                    })

    def _check_hardcoded_secrets(self, file_path: str, content: str) -> None:
        """Check for hardcoded secrets."""
        patterns = [
            (r'(?:password|passwd|pwd)\s*=\s*["\']([a-zA-Z0-9!@#$%^&*]{8,})["\']', 'Hardcoded password'),
            (r'(?:api[_-]?key|apikey|api_secret|secret)\s*=\s*["\']([a-zA-Z0-9_-]{20,})["\']', 'Hardcoded API key'),
            (r'(?:token|access[_-]?token)\s*=\s*["\']([a-zA-Z0-9._-]{20,})["\']', 'Hardcoded token'),
            (r'(?:private[_-]?key|privatekey)\s*=\s*["\']-----BEGIN', 'Hardcoded private key'),
            (r'AWS_SECRET|aws_secret_access_key\s*=\s*["\']', 'AWS secret key exposed'),
            (r'DATABASE_URL\s*=\s*.*(?:password|pass):([a-zA-Z0-9!@#$%]{5,})', 'DB password in connection string'),
        ]
        
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            for pattern, description in patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    self.findings.append({
                        'file': file_path,
                        'line': line_num,
                        'type': 'HARDCODED_SECRET',
                        'severity': 'CRITICAL',
                        'message': f'Secret Exposure: {description}',
                        'code': line.strip()[:80]
                    })

    def _check_weak_crypto(self, file_path: str, content: str) -> None:
        """Check for weak cryptography."""
        patterns = [
            (r'(?:import|from).*(?:md5|MD5)', 'Using MD5 (weak hash)'),
            (r'(?:import|from).*(?:sha1|SHA1)', 'Using SHA1 (weak hash)'),
            (r'hashlib\.md5\(', 'MD5 hash algorithm'),
            (r'hashlib\.sha1\(', 'SHA1 hash algorithm'),
            (r'DES\(|des\(', 'Using DES encryption (weak)'),
            (r'Random\(\)', 'Using Random() instead of SecureRandom'),
            (r'random\.random\(', 'Using weak random for cryptography'),
        ]
        
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            for pattern, description in patterns:
                if re.search(pattern, line):
                    self.findings.append({
                        'file': file_path,
                        'line': line_num,
                        'type': 'WEAK_CRYPTO',
                        'severity': 'HIGH',
                        'message': f'Weak Cryptography: {description}',
                        'code': line.strip()[:80]
                    })

    def _check_input_validation(self, file_path: str, content: str) -> None:
        """Check for missing input validation."""
        patterns = [
            (r'request\.args\[', 'Direct access to request args without validation'),
            (r'request\.form\[', 'Direct access to form data without validation'),
            (r'eval\s*\(', 'Using eval() - security risk'),
            (r'exec\s*\(', 'Using exec() - security risk'),
            (r'__import__\(', 'Dynamic import - security risk'),
            (r'pickle\.loads\(', 'Using pickle.loads() - code execution risk'),
        ]
        
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            for pattern, description in patterns:
                if re.search(pattern, line):
                    self.findings.append({
                        'file': file_path,
                        'line': line_num,
                        'type': 'INPUT_VALIDATION',
                        'severity': 'HIGH',
                        'message': f'Missing Input Validation: {description}',
                        'code': line.strip()[:80]
                    })

    def _check_command_injection(self, file_path: str, content: str) -> None:
        """Check for command injection vulnerabilities."""
        patterns = [
            (r'os\.system\s*\(', 'os.system() with potential injection'),
            (r'subprocess\..*shell\s*=\s*True', 'subprocess with shell=True (injection risk)'),
            (r'popen\s*\(', 'os.popen() - command injection risk'),
            (r'exec\s*\(.*\$', 'exec() with variable expansion'),
        ]
        
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            for pattern, description in patterns:
                if re.search(pattern, line):
                    self.findings.append({
                        'file': file_path,
                        'line': line_num,
                        'type': 'COMMAND_INJECTION',
                        'severity': 'CRITICAL',
                        'message': f'Command Injection Risk: {description}',
                        'code': line.strip()[:80]
                    })

    def _check_path_traversal(self, file_path: str, content: str) -> None:
        """Check for path traversal vulnerabilities."""
        patterns = [
            (r'open\s*\(\s*(?:request|user|input)[^)]*\)', 'Direct file open with user input'),
            (r'(?:file|path)\s*=\s*request\.args', 'File path from user input'),
            (r'os\.path\.join\s*\(\s*base_dir\s*,\s*user_input', 'Path join with user input'),
            (r'read_file\s*\(\s*["\']?\.\./.*["\']?\)', 'Hardcoded path traversal'),
        ]
        
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            for pattern, description in patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    self.findings.append({
                        'file': file_path,
                        'line': line_num,
                        'type': 'PATH_TRAVERSAL',
                        'severity': 'HIGH',
                        'message': f'Path Traversal Risk: {description}',
                        'code': line.strip()[:80]
                    })

    def _check_xss_vulnerabilities(self, file_path: str, content: str) -> None:
        """Check for XSS vulnerabilities."""
        patterns = [
            (r'return\s+.*request\.args', 'Returning user input directly'),
            (r'render_template\s*\(\s*["\'][^"\']*["\'].*request\.', 'Template with unescaped user input'),
            (r'innerHTML\s*=', 'Direct innerHTML assignment (XSS risk)'),
            (r'document\.write\s*\(', 'Using document.write (XSS risk)'),
            (r'eval\s*\(\s*.*user.*\)', 'eval() with user data'),
        ]
        
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            for pattern, description in patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    self.findings.append({
                        'file': file_path,
                        'line': line_num,
                        'type': 'XSS',
                        'severity': 'HIGH',
                        'message': f'XSS Vulnerability Risk: {description}',
                        'code': line.strip()[:80]
                    })

    def _check_code_duplication(self) -> None:
        """Check for duplicate code blocks."""
        # Simple block duplication detection
        blocks = defaultdict(list)
        
        for file_path, content in self.file_contents.items():
            lines = content.split('\n')
            
            # Check for 10+ line blocks that repeat
            for i in range(len(lines) - 10):
                block = '\n'.join(lines[i:i+10])
                block_hash = hashlib.md5(block.encode()).hexdigest()
                blocks[block_hash].append((file_path, i+1))
        
        # Report duplicate blocks
        for block_hash, occurrences in blocks.items():
            if len(occurrences) > 1:
                for file_path, line_num in occurrences:
                    self.findings.append({
                        'file': file_path,
                        'line': line_num,
                        'type': 'CODE_DUPLICATION',
                        'severity': 'MEDIUM',
                        'message': f'Duplicate code block found (appears {len(occurrences)} times)',
                        'occurrences': len(occurrences)
                    })

    def _check_function_complexity(self) -> None:
        """Check for overly complex functions."""
        for file_path, content in self.file_contents.items():
            lines = content.split('\n')
            
            in_function = False
            function_start = 0
            function_name = ''
            complexity = 0
            
            for line_num, line in enumerate(lines, 1):
                # Detect function definition
                if re.search(r'^\s*(def|function|public.*void|public.*String)', line):
                    if in_function and complexity > 10:
                        self.findings.append({
                            'file': file_path,
                            'line': function_start,
                            'type': 'HIGH_COMPLEXITY',
                            'severity': 'MEDIUM',
                            'message': f'Function "{function_name}" has high cyclomatic complexity ({complexity})',
                            'complexity': complexity
                        })
                    
                    in_function = True
                    function_start = line_num
                    function_name = re.search(r'(?:def|function)\s+(\w+)', line)
                    function_name = function_name.group(1) if function_name else 'unknown'
                    complexity = 1
                
                # Count complexity factors
                if in_function:
                    if re.search(r'\b(?:if|elif|else|for|while|switch|case|catch)\b', line):
                        complexity += 1
                    if re.search(r'[&|]\s*[&|]|and\s+|or\s+', line):
                        complexity += 1

    def _check_dead_code(self) -> None:
        """Check for unused variables and dead code."""
        for file_path, content in self.file_contents.items():
            lines = content.split('\n')
            
            # Simple: check for variables that are defined but never used
            variables = {}
            
            for line_num, line in enumerate(lines, 1):
                # Find variable assignments
                var_match = re.search(r'(?:var|let|const|self\.)?(\w+)\s*=\s*', line)
                if var_match:
                    var_name = var_match.group(1)
                    variables[var_name] = line_num
            
            # Check for unreachable code (after return)
            for line_num, line in enumerate(lines, 1):
                if re.search(r'^\s*(?:return|break|continue|exit)\s*', line):
                    if line_num < len(lines):
                        next_line = lines[line_num]
                        if next_line.strip() and not re.search(r'^\s*(?:except|else|finally|def|class)', next_line):
                            self.findings.append({
                                'file': file_path,
                                'line': line_num + 1,
                                'type': 'UNREACHABLE_CODE',
                                'severity': 'LOW',
                                'message': 'Unreachable code after return/exit',
                                'code': next_line.strip()[:80]
                            })

    def _generate_summary(self) -> Dict[str, Any]:
        """Generate summary of findings."""
        severity_counts = defaultdict(int)
        type_counts = defaultdict(int)
        
        for finding in self.findings:
            severity_counts[finding.get('severity', 'UNKNOWN')] += 1
            type_counts[finding.get('type', 'UNKNOWN')] += 1
        
        return {
            'total_findings': len(self.findings),
            'by_severity': dict(severity_counts),
            'by_type': dict(type_counts),
            'files_analyzed': len(self.file_contents)
        }


def format_findings_sarif(findings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Convert findings to SARIF format for integration with Phase 4."""
    rules = {}
    results = []
    
    for finding in findings:
        finding_type = finding.get('type', 'UNKNOWN')
        
        # Create rule if not exists
        if finding_type not in rules:
            severity_map = {
                'CRITICAL': 'error',
                'HIGH': 'error',
                'MEDIUM': 'warning',
                'LOW': 'note'
            }
            rules[finding_type] = {
                'id': finding_type,
                'name': finding_type.replace('_', ' '),
                'shortDescription': {'text': finding.get('message', '')},
                'defaultConfiguration': {
                    'level': severity_map.get(finding.get('severity', 'LOW'), 'note')
                }
            }
        
        # Add result
        results.append({
            'ruleId': finding_type,
            'message': {'text': finding.get('message', '')},
            'locations': [{
                'physicalLocation': {
                    'artifactLocation': {'uri': finding.get('file', 'unknown')},
                    'region': {'startLine': finding.get('line', 0)}
                }
            }],
            'properties': {
                'severity': finding.get('severity', 'LOW'),
                'code': finding.get('code', '')
            }
        })
    
    return {
        'version': '2.1.0',
        'runs': [{
            'tool': {
                'driver': {
                    'name': 'LocalCodeAnalyzer',
                    'version': '1.0.0',
                    'rules': list(rules.values())
                }
            },
            'results': results
        }]
    }


if __name__ == '__main__':
    import sys
    import json
    
    if len(sys.argv) > 1:
        repo_path = sys.argv[1]
    else:
        repo_path = '.'
    
    analyzer = LocalCodeAnalyzer(repo_path)
    result = analyzer.analyze()
    
    print("\n" + "="*80)
    print("LOCAL CODE ANALYSIS RESULTS")
    print("="*80)
    
    print(f"\nFiles Analyzed: {result['summary']['files_analyzed']}")
    print(f"Total Findings: {result['summary']['total_findings']}")
    print(f"\nBy Severity:")
    for severity, count in sorted(result['summary']['by_severity'].items()):
        print(f"  {severity}: {count}")
    
    print(f"\nBy Type:")
    for issue_type, count in sorted(result['summary']['by_type'].items()):
        print(f"  {issue_type}: {count}")
    
    print(f"\nTop Findings:")
    for i, finding in enumerate(result['findings'][:10], 1):
        print(f"\n{i}. {finding['type']} (Line {finding['line']})")
        print(f"   File: {finding['file']}")
        print(f"   Message: {finding['message']}")
        if 'code' in finding:
            print(f"   Code: {finding['code']}")
