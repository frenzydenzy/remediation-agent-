# Findings Report Format

## Purpose

The findings report is a structured JSON contract between the Validation & Analysis agent (Process 2) and the Automated Remediation agent (Process 3). It contains all identified vulnerabilities, defects, and their recommended remediations.

## Schema

```json
{
  "schemaVersion": 1,
  "timestamp": "2025-11-05T16:51:55.826Z",
  "snapshotHead": "abc123def456...",
  "snapshotBase": "main",
  "snapshotMergeBase": "ghi789jkl012...",
  "repository": "/path/to/repo",
  "branch": "feature/user-search",
  
  "summary": {
    "totalFindings": 4,
    "criticalCount": 0,
    "highCount": 2,
    "mediumCount": 1,
    "lowCount": 1,
    "autofixableCount": 3
  },
  
  "findings": [
    {
      "id": "SEC-001",
      "file": "src/main/java/com/example/UserSearch.java",
      "line": 42,
      "category": "Security",
      "severity": "High",
      "title": "SQL Injection via string concatenation",
      "description": "User input is directly concatenated into SQL query without parameterization, allowing an attacker to alter query logic and extract unauthorized data.",
      
      "evidence": {
        "before": "String query = \"SELECT * FROM users WHERE name = '\" + username + \"'\";",
        "after": "String query = \"SELECT * FROM users WHERE name = '\" + username + \"'\";",
        "changed_line": 42,
        "context_start": 40,
        "context_end": 45
      },
      
      "vulnerability": {
        "type": "SQL Injection",
        "cwe": "CWE-89",
        "owasp": "A03:2021 – Injection"
      },
      
      "exploit_scenario": "An attacker provides a username like: alice' OR '1'='1' UNION SELECT password FROM admin",
      
      "potential_impact": "Confidentiality: HIGH (data exfiltration)",
      
      "affected_inputs": [
        {
          "source": "request.getParameter(\"username\")",
          "location": "line 38",
          "trust_boundary": "External user input (untrusted)"
        }
      ],
      
      "recommendation": "Use prepared statements with parameterized queries instead of string concatenation.",
      
      "fix_example": "String query = \"SELECT * FROM users WHERE name = ?\";\nPreparedStatement stmt = database.prepare(query);\nstmt.setString(1, username);\nResultSet rs = stmt.executeQuery();",
      
      "autoFixable": true,
      "fixTemplate": {
        "language": "java",
        "pattern": "database\\.(?:prepare|query)\\(.*?[+\\s].*?username.*?\\)",
        "replacement": "database.prepare(\"SELECT * FROM users WHERE name = ?\").query(username)"
      },
      
      "related_files": [
        "src/test/java/com/example/UserSearchTest.java",
        "src/main/java/com/example/DatabaseConfig.java"
      ],
      
      "confidence": "High",
      "confidence_reasoning": "Direct evidence of user input flowing to SQL statement construction without parameterization.",
      
      "assumptions": [
        "The input source (request parameter) is untrusted",
        "The database connection uses a standard JDBC driver"
      ],
      
      "validation_gaps": [
        "Runtime database behavior not assessed",
        "Input validation policies upstream not confirmed"
      ],
      
      "test_coverage": {
        "existing": "Test with username 'Alice' passes",
        "missing": "No tests with SQL metacharacters",
        "suggested_test": "assertThrows(SQLSyntaxErrorException.class, () -> searchUsers(\"Alice' OR '1'='1\"))"
      }
    }
  ],
  
  "analysis_metadata": {
    "reviewed_files": ["src/main/java/com/example/UserSearch.java"],
    "context_files": ["src/main/java/com/example/DatabaseConfig.java"],
    "tests_executed": false,
    "static_analysis_only": true
  }
}
```

## Field Requirements

### Root Level

| Field | Type | Required |
|-------|------|----------|
| `schemaVersion` | number | Yes |
| `timestamp` | ISO 8601 | Yes |
| `snapshotHead` | SHA-1 | Yes |
| `snapshotBase` | string | Yes |
| `snapshotMergeBase` | SHA-1 | Yes |
| `repository` | path | Yes |
| `branch` | string | Yes |
| `summary` | object | Yes |
| `findings` | array | Yes |

### Finding Object - Required Fields

- `id` - Unique finding ID (SEC-001, CORR-002, etc.)
- `file` - Repository-relative file path
- `line` - Changed line number (HEAD)
- `category` - Security, Correctness, Test Coverage, Code Quality, Regression, Performance
- `severity` - Critical, High, Medium, Low, Informational
- `title` - Concise finding title
- `description` - Detailed description
- `evidence` - Code evidence object
- `recommendation` - How to fix
- `autoFixable` - Boolean
- `confidence` - High, Medium, Low
- `assumptions` - Array of assumptions
- `validation_gaps` - Array of gaps

### If autoFixable=true

MUST include:
- `fixTemplate` object with `language`, `pattern` (regex), `replacement`
- `fix_example` - Concrete code example

### If autoFixable=false

MUST include:
- `reason_not_fixable` - Explanation why agent cannot fix it

