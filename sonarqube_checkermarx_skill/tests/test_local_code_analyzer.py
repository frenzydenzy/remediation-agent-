"""
Test suite for Local Code Analyzer
Demonstrates detection of various vulnerabilities and code quality issues
"""

import unittest
import sys
import os
from pathlib import Path
import tempfile
import json

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / 'scripts'
sys.path.insert(0, str(scripts_dir))

from local_code_analyzer import LocalCodeAnalyzer, format_findings_sarif


class TestSQLInjectionDetection(unittest.TestCase):
    """Test SQL injection detection."""
    
    def test_sql_string_concatenation(self):
        """Detect SQL queries with string concatenation."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'vulnerable.py'
            test_file.write_text('''
def get_user(user_id):
    query = "SELECT * FROM users WHERE id = " + str(user_id)
    return execute_query(query)
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            # Should find SQL injection
            sql_findings = [f for f in result['findings'] if f['type'] == 'SQL_INJECTION']
            self.assertGreater(len(sql_findings), 0, "Should detect SQL concatenation")
            print("[PASS] SQL Injection Detection: PASSED")

    def test_sql_format_injection(self):
        """Detect SQL queries using format()."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'vulnerable.py'
            test_file.write_text('''
def search_products(search_term):
    query = "SELECT * FROM products WHERE name LIKE '%{}%'".format(search_term)
    return db.execute(query)
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            sql_findings = [f for f in result['findings'] if f['type'] == 'SQL_INJECTION']
            self.assertGreater(len(sql_findings), 0, "Should detect SQL format injection")
            print("✅ SQL Format Injection Detection: PASSED")


class TestSecretDetection(unittest.TestCase):
    """Test hardcoded secrets detection."""
    
    def test_hardcoded_password(self):
        """Detect hardcoded passwords."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'config.py'
            test_file.write_text('''
DATABASE_CONFIG = {
    "host": "localhost",
    "password": "SuperSecretPass123!",
    "user": "admin"
}
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            secret_findings = [f for f in result['findings'] if f['type'] == 'HARDCODED_SECRET']
            self.assertGreater(len(secret_findings), 0, "Should detect hardcoded password")
            print("✅ Hardcoded Password Detection: PASSED")

    def test_hardcoded_api_key(self):
        """Detect hardcoded API keys."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'api.py'
            test_file.write_text('''
API_KEY = "[REDACTED_API_KEY_EXAMPLE_51234567890]"
SECRET_KEY = "[REDACTED_SECRET_KEY_EXAMPLE]"
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            secret_findings = [f for f in result['findings'] if f['type'] == 'HARDCODED_SECRET']
            self.assertGreater(len(secret_findings), 0, "Should detect hardcoded API key")
            print("✅ Hardcoded API Key Detection: PASSED")


class TestWeakCryptoDetection(unittest.TestCase):
    """Test weak cryptography detection."""
    
    def test_md5_usage(self):
        """Detect usage of MD5 (weak hash)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'crypto.py'
            test_file.write_text('''
import hashlib
def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            crypto_findings = [f for f in result['findings'] if f['type'] == 'WEAK_CRYPTO']
            self.assertGreater(len(crypto_findings), 0, "Should detect MD5 usage")
            print("✅ MD5 Weak Hash Detection: PASSED")

    def test_sha1_usage(self):
        """Detect usage of SHA1 (weak hash)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'crypto.py'
            test_file.write_text('''
import hashlib
def compute_checksum(data):
    return hashlib.sha1(data).hexdigest()
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            crypto_findings = [f for f in result['findings'] if f['type'] == 'WEAK_CRYPTO']
            self.assertGreater(len(crypto_findings), 0, "Should detect SHA1 usage")
            print("✅ SHA1 Weak Hash Detection: PASSED")


class TestInputValidationDetection(unittest.TestCase):
    """Test input validation issues detection."""
    
    def test_eval_usage(self):
        """Detect eval() usage."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'unsafe.py'
            test_file.write_text('''
def execute_expression(expr):
    result = eval(expr)
    return result
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            validation_findings = [f for f in result['findings'] if f['type'] == 'INPUT_VALIDATION']
            self.assertGreater(len(validation_findings), 0, "Should detect eval() usage")
            print("✅ Eval() Usage Detection: PASSED")

    def test_pickle_loads_usage(self):
        """Detect pickle.loads() usage."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'unsafe.py'
            test_file.write_text('''
import pickle
def deserialize_data(data):
    return pickle.loads(data)
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            validation_findings = [f for f in result['findings'] if f['type'] == 'INPUT_VALIDATION']
            self.assertGreater(len(validation_findings), 0, "Should detect pickle.loads() usage")
            print("✅ Pickle Loads Detection: PASSED")


class TestCommandInjectionDetection(unittest.TestCase):
    """Test command injection detection."""
    
    def test_os_system_usage(self):
        """Detect os.system() usage."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'cmd_unsafe.py'
            test_file.write_text('''
import os
def process_file(filename):
    os.system("convert " + filename + " output.pdf")
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            cmd_findings = [f for f in result['findings'] if f['type'] == 'COMMAND_INJECTION']
            self.assertGreater(len(cmd_findings), 0, "Should detect os.system() usage")
            print("✅ OS System Injection Detection: PASSED")

    def test_subprocess_shell_true(self):
        """Detect subprocess with shell=True."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'cmd_unsafe.py'
            test_file.write_text('''
import subprocess
def run_command(cmd):
    subprocess.run(cmd, shell=True)
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            cmd_findings = [f for f in result['findings'] if f['type'] == 'COMMAND_INJECTION']
            self.assertGreater(len(cmd_findings), 0, "Should detect subprocess shell=True")
            print("✅ Subprocess Shell=True Injection Detection: PASSED")


class TestPathTraversalDetection(unittest.TestCase):
    """Test path traversal detection."""
    
    def test_direct_file_open(self):
        """Detect direct file operations with user input."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'path_unsafe.py'
            test_file.write_text('''
def read_user_file(user_input):
    with open(user_input) as f:
        return f.read()
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            path_findings = [f for f in result['findings'] if f['type'] == 'PATH_TRAVERSAL']
            self.assertGreater(len(path_findings), 0, "Should detect direct file open")
            print("✅ Path Traversal Detection: PASSED")


class TestXSSDetection(unittest.TestCase):
    """Test XSS vulnerability detection."""
    
    def test_innerHTML_usage(self):
        """Detect innerHTML usage (XSS risk)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'xss.js'
            test_file.write_text('''
function displayUserComment(comment) {
    document.getElementById('comments').innerHTML = comment;
}
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            xss_findings = [f for f in result['findings'] if f['type'] == 'XSS']
            self.assertGreater(len(xss_findings), 0, "Should detect innerHTML usage")
            print("✅ XSS innerHTML Detection: PASSED")


class TestCodeQualityDetection(unittest.TestCase):
    """Test code quality issues detection."""
    
    def test_code_duplication(self):
        """Detect duplicate code blocks."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'duplicate.py'
            test_file.write_text('''
def process_user_data():
    data = fetch_data()
    cleaned = sanitize_input(data)
    validated = validate_format(cleaned)
    transformed = apply_rules(validated)
    result = save_to_db(transformed)
    return result

def process_admin_data():
    data = fetch_data()
    cleaned = sanitize_input(data)
    validated = validate_format(cleaned)
    transformed = apply_rules(validated)
    result = save_to_db(transformed)
    return result
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            dup_findings = [f for f in result['findings'] if f['type'] == 'CODE_DUPLICATION']
            self.assertGreater(len(dup_findings), 0, "Should detect code duplication")
            print("✅ Code Duplication Detection: PASSED")


class TestAnalyzerIntegration(unittest.TestCase):
    """Test analyzer integration."""
    
    def test_sarif_output(self):
        """Test SARIF format output."""
        findings = [
            {
                'file': 'test.py',
                'line': 42,
                'type': 'SQL_INJECTION',
                'severity': 'CRITICAL',
                'message': 'SQL injection risk',
                'code': 'query = "SELECT * FROM users WHERE id = " + str(user_id)'
            }
        ]
        
        sarif = format_findings_sarif(findings)
        self.assertEqual(sarif['version'], '2.1.0')
        self.assertEqual(len(sarif['runs'][0]['results']), 1)
        print("✅ SARIF Output Format: PASSED")

    def test_summary_generation(self):
        """Test summary generation."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / 'test.py'
            test_file.write_text('''
import hashlib
password = "secret123"
query = "SELECT * FROM users WHERE id = " + str(user_id)
result = eval(user_input)
''')
            
            analyzer = LocalCodeAnalyzer(tmpdir)
            result = analyzer.analyze([str(test_file)])
            
            summary = result['summary']
            self.assertGreater(summary['total_findings'], 0)
            self.assertIn('by_severity', summary)
            self.assertIn('by_type', summary)
            print("✅ Summary Generation: PASSED")


def run_demo():
    """Run demonstration of LocalCodeAnalyzer."""
    print("\n" + "="*80)
    print("LOCAL CODE ANALYZER - DEMONSTRATION")
    print("="*80)
    
    # Create demo vulnerable code
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create vulnerable Python file
        vulnerable_py = Path(tmpdir) / 'vulnerable.py'
        vulnerable_py.write_text('''
import hashlib
import subprocess
import pickle

# SQL Injection vulnerability
def get_user(user_id):
    query = "SELECT * FROM users WHERE id = " + str(user_id)
    return db.execute(query)

# Hardcoded secret
API_KEY = "[REDACTED_API_KEY_EXAMPLE]"
PASSWORD = "AdminPassword123!"

# Weak cryptography
def hash_password(pwd):
    return hashlib.md5(pwd.encode()).hexdigest()

# Command injection
def convert_file(filename):
    subprocess.run("ffmpeg -i " + filename, shell=True)

# Input validation - eval()
def execute_user_code(code):
    result = eval(code)
    return result

# Deserialization - pickle
def load_session(data):
    return pickle.loads(data)

# Code duplication
def process_order():
    data = get_data()
    cleaned = clean(data)
    validated = validate(cleaned)
    saved = save(validated)
    return saved

def process_payment():
    data = get_data()
    cleaned = clean(data)
    validated = validate(cleaned)
    saved = save(validated)
    return saved

# High complexity
def complex_calculation(a, b, c, d):
    if a > 0:
        if b > 0:
            if c > 0:
                if d > 0:
                    return a + b + c + d
                else:
                    return a + b + c
            else:
                return a + b
        else:
            return a
    else:
        return 0
''')
        
        print("\nAnalyzing vulnerable Python code...")
        analyzer = LocalCodeAnalyzer(tmpdir)
        result = analyzer.analyze([str(vulnerable_py)])
        
        print(f"\nAnalysis Complete!")
        print(f"Files Analyzed: {result['summary']['files_analyzed']}")
        print(f"Total Findings: {result['summary']['total_findings']}")
        
        print(f"\nFindings by Severity:")
        for severity, count in sorted(result['summary']['by_severity'].items(), 
                                     key=lambda x: {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}.get(x[0], 4)):
            print(f"  {severity}: {count}")
        
        print(f"\nFindings by Type:")
        for issue_type, count in sorted(result['summary']['by_type'].items()):
            print(f"  {issue_type}: {count}")
        
        print(f"\nTop 15 Findings:")
        for i, finding in enumerate(result['findings'][:15], 1):
            severity = finding.get('severity', 'UNKNOWN')
            emoji = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '⚪'}.get(severity, '⚪')
            print(f"\n{i}. {emoji} [{severity}] {finding['type']}")
            print(f"   Line: {finding['line']}")
            print(f"   Message: {finding['message']}")
            if 'code' in finding and finding['code']:
                print(f"   Code: {finding['code']}")


if __name__ == '__main__':
    # Run tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestSQLInjectionDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestSecretDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestWeakCryptoDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestInputValidationDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestCommandInjectionDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestPathTraversalDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestXSSDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestCodeQualityDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestAnalyzerIntegration))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Run demo
    print("\n")
    run_demo()
    
    # Print test summary
    print("\n" + "="*80)
    print("TEST RESULTS SUMMARY")
    print("="*80)
    print(f"Tests Run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    if result.wasSuccessful():
        print("\n✅ ALL TESTS PASSED!")
    else:
        print("\n❌ SOME TESTS FAILED")

