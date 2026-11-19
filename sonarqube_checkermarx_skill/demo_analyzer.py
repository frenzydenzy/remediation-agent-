#!/usr/bin/env python3
"""
Local Code Analyzer - Quick Demo
Shows vulnerabilities in sample code
"""

import tempfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent / 'scripts'))

from local_code_analyzer import LocalCodeAnalyzer


def main():
    print("\n" + "="*80)
    print("LOCAL CODE ANALYZER - VULNERABILITY DETECTION DEMO")
    print("="*80)
    
    # Create demo vulnerable code
    with tempfile.TemporaryDirectory() as tmpdir:
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
''')
        
        print("\nAnalyzing vulnerable Python code...")
        print(f"File: {vulnerable_py.name}")
        
        analyzer = LocalCodeAnalyzer(tmpdir)
        result = analyzer.analyze([str(vulnerable_py)])
        
        print("\n[COMPLETE] Analysis finished!")
        print(f"\nFiles Analyzed: {result['summary']['files_analyzed']}")
        print(f"Total Findings: {result['summary']['total_findings']}")
        
        print(f"\n[SUMMARY BY SEVERITY]")
        severity_order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        for severity in severity_order:
            if severity in result['summary']['by_severity']:
                count = result['summary']['by_severity'][severity]
                print(f"  {severity}: {count}")
        
        print(f"\n[SUMMARY BY TYPE]")
        for issue_type in sorted(result['summary']['by_type'].keys()):
            count = result['summary']['by_type'][issue_type]
            print(f"  {issue_type}: {count}")
        
        print(f"\n[TOP 20 VULNERABILITIES DETECTED]")
        for i, finding in enumerate(result['findings'][:20], 1):
            severity = finding.get('severity', 'UNKNOWN')
            print(f"\n{i}. [{severity}] {finding['type']}")
            print(f"   Line: {finding['line']}")
            print(f"   Message: {finding['message']}")
            if 'code' in finding and finding['code']:
                print(f"   Code: {finding['code']}")
        
        print("\n" + "="*80)
        print("DEMO COMPLETE - Ready for production!")
        print("="*80 + "\n")


if __name__ == '__main__':
    main()
