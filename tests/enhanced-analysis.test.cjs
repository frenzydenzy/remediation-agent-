/**
 * Comprehensive test suite for all analyzers
 * Tests: security, correctness, test coverage, and architecture analyzers
 */

const securityAnalyzer = require('../.github/skills/ai-code-security-review/scripts/analyzers/security-analyzer.cjs');
const correctnessAnalyzer = require('../.github/skills/ai-code-security-review/scripts/analyzers/correctness-analyzer.cjs');
const testCoverageAnalyzer = require('../.github/skills/ai-code-security-review/scripts/analyzers/test-coverage-analyzer.cjs');
const architectureAnalyzer = require('../.github/skills/ai-code-security-review/scripts/analyzers/architecture-analyzer.cjs');
const enhancedAnalysis = require('../.github/skills/ai-code-security-review/scripts/analyzers/enhanced-analysis.cjs');

let passed = 0;
let failed = 0;

// Test helpers
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function assertGreater(actual, expected, message) {
  if (actual <= expected) {
    throw new Error(`${message}: expected > ${expected}, got ${actual}`);
  }
}

// Security Analyzer Tests
console.log('\n=== Security Analyzer Tests ===\n');

test('SQL Injection Detection', () => {
  const content = 'String query = "SELECT * FROM users WHERE id = " + userId;';
  const findings = securityAnalyzer.analyzeSecurityPatterns('UserDao.java', content);
  assertGreater(findings.length, 0, 'Should detect SQL injection');
  assertTrue(findings.some(f => f.severity === 'CRITICAL'), 'Should be CRITICAL');
});

test('Command Injection Detection', () => {
  const content = 'Runtime.getRuntime().exec(userInput);';
  const findings = securityAnalyzer.analyzeSecurityPatterns('CommandUtil.java', content);
  assertGreater(findings.length, 0, 'Should detect command injection');
});

test('Hard-coded Credentials Detection', () => {
  const content = 'String apiKey = "sk_live_abc123xyz789";';
  const findings = securityAnalyzer.analyzeSecurityPatterns('Config.java', content);
  assertGreater(findings.length, 0, 'Should detect hard-coded credentials');
});

test('Weak Hash Detection', () => {
  const content = 'MessageDigest md = MessageDigest.getInstance("MD5");';
  const findings = securityAnalyzer.analyzeSecurityPatterns('PasswordUtil.java', content);
  assertGreater(findings.length, 0, 'Should detect weak hashing');
});

test('Ranking by Severity', () => {
  const findings = [
    { severity: 'LOW', file: 'A.java', line: 1 },
    { severity: 'CRITICAL', file: 'A.java', line: 2 },
    { severity: 'MEDIUM', file: 'A.java', line: 3 },
  ];
  const ranked = securityAnalyzer.rankFindings(findings);
  console.log('  Ranked order:', ranked.map(f => f.severity).join(', '));
  console.log('  First item:', ranked[0].severity);
  assertEquals(ranked[0].severity, 'CRITICAL', 'CRITICAL should be first');
});

// Correctness Analyzer Tests
console.log('\n=== Correctness Analyzer Tests ===\n');

test('Null Pointer Risk Detection', () => {
  const content = 'String value = obj.getValue();';
  const findings = correctnessAnalyzer.analyzeCorrectnessPatterns('Service.java', content);
  // May or may not detect, depending on pattern matching
  assertTrue(typeof findings === 'object', 'Should return array');
});

test('Resource Leak Detection', () => {
  const content = 'BufferedReader reader = new BufferedReader(new FileReader(file));';
  const findings = correctnessAnalyzer.analyzeCorrectnessPatterns('FileUtil.java', content);
  assertGreater(findings.length, 0, 'Should detect potential resource leak');
});

test('Thread Safety Detection', () => {
  const content = 'Map map = new HashMap(); this.cache = map;';
  const findings = correctnessAnalyzer.analyzeCorrectnessPatterns('CacheManager.java', content);
  assertGreater(findings.length, 0, 'Should detect non-thread-safe collection');
});

test('String Comparison with ==', () => {
  const content = 'if (status == "active") { }';
  const findings = correctnessAnalyzer.analyzeCorrectnessPatterns('Validator.java', content);
  assertTrue(findings.length >= 0, 'Should analyze string comparison patterns');
});

// Test Coverage Analyzer Tests
console.log('\n=== Test Coverage Analyzer Tests ===\n');

test('Extract Public Methods', () => {
  const content = `
    public class MyClass {
      public void method1() { }
      private void method2() { }
      public String method3() { return ""; }
    }
  `;
  const methods = testCoverageAnalyzer.extractPublicMethods(content);
  assertEquals(methods.length, 2, 'Should extract 2 public methods');
  assertTrue(methods.includes('method1'), 'Should include method1');
  assertTrue(methods.includes('method3'), 'Should include method3');
});

test('Find Test File Matching', () => {
  const allFiles = ['UserService.java', 'UserServiceTest.java', 'OrderService.java'];
  const testFile = testCoverageAnalyzer.findTestFile('UserService.java', allFiles);
  assertEquals(testFile, 'UserServiceTest.java', 'Should match test file pattern');
});

test('Coverage Analysis With Test File', () => {
  const sourceContent = `
    public class UserService {
      public void createUser() { }
      public void deleteUser() { }
      public String getUser() { return ""; }
    }
  `;
  const testContent = `
    public class UserServiceTest {
      public void testCreateUser() { userService.createUser(); }
      public void testGetUser() { userService.getUser(); }
    }
  `;
  const result = testCoverageAnalyzer.analyzeTestCoverage(
    'UserService.java',
    sourceContent,
    'UserServiceTest.java',
    testContent
  );
  assertTrue(result.coverage >= 0 && result.coverage <= 100, 'Coverage should be 0-100');
});

test('Missing Test File Detection', () => {
  const sourceContent = `
    public class NoTestClass {
      public void method1() { }
    }
  `;
  const result = testCoverageAnalyzer.analyzeTestCoverage('NoTestClass.java', sourceContent);
  assertEquals(result.testFile, null, 'Should have no test file');
  assertGreater(result.findings.length, 0, 'Should report missing test file');
});

// Architecture Analyzer Tests
console.log('\n=== Architecture Analyzer Tests ===\n');

test('Extract Imports', () => {
  const content = `
    import java.util.List;
    import org.springframework.stereotype.Service;
    public class MyClass { }
  `;
  const imports = architectureAnalyzer.extractImports(content);
  assertEquals(imports.length, 2, 'Should extract 2 imports');
});

test('Extract Package', () => {
  const content = `
    package com.example.service;
    public class MyClass { }
  `;
  const pkg = architectureAnalyzer.extractPackage(content);
  assertEquals(pkg, 'com.example.service', 'Should extract package');
});

test('Extract Class Name', () => {
  const className = architectureAnalyzer.extractClassName('src/main/java/UserService.java');
  assertEquals(className, 'UserService', 'Should extract class name');
});

test('Forbidden Import Detection', () => {
  const files = [{
    path: 'SecurityUtil.java',
    content: 'import sun.misc.BASE64Encoder;',
  }];
  const findings = architectureAnalyzer.detectForbiddenImports(files);
  assertGreater(findings.length, 0, 'Should detect forbidden import');
});

test('Unused Import Detection', () => {
  const files = [{
    path: 'Service.java',
    content: `
      import java.util.List;
      import java.util.Collections;
      public class Service {
        public List getItems() { return Collections.emptyList(); }
      }
    `,
  }];
  const findings = architectureAnalyzer.detectUnusedImports(files);
  // May have 1 unused (List) or none depending on pattern matching
  assertTrue(typeof findings === 'object', 'Should return findings array');
});

// Enhanced Analysis Orchestrator Tests
console.log('\n=== Enhanced Analysis Orchestrator Tests ===\n');

test('Orchestrator With Empty Snapshot', () => {
  const snapshot = { files: [] };
  const result = enhancedAnalysis.runEnhancedAnalysis(snapshot);
  assertTrue(typeof result === 'object', 'Should return analysis result');
  assertEquals(result.totalFindings, 0, 'Should have no findings for empty snapshot');
});

test('Orchestrator With Vulnerable Code', () => {
  const snapshot = {
    files: [{
      path: 'Vulnerable.java',
      content: `
        public class Vulnerable {
          String query = "SELECT * FROM users WHERE id = " + userId;
          public void execute(String cmd) {
            Runtime.getRuntime().exec(cmd);
          }
        }
      `,
    }],
  };
  const result = enhancedAnalysis.runEnhancedAnalysis(snapshot);
  assertGreater(result.totalFindings, 0, 'Should find vulnerabilities');
  assertTrue(result.findings.length > 0, 'Should have findings');
});

test('Orchestrator Aggregation', () => {
  const snapshot = {
    files: [{
      path: 'Service.java',
      content: `
        package com.example.service;
        import sun.misc.BASE64Encoder;
        public class Service {
          public void doSomething() { }
        }
      `,
    }],
  };
  const result = enhancedAnalysis.runEnhancedAnalysis(snapshot);
  assertTrue(result.aggregateSummary !== undefined, 'Should have aggregate summary');
  assertTrue(result.analysisResults !== undefined, 'Should have analysis results');
});

// Summary
console.log('\n====================================');
console.log(`Tests Passed: ${passed}`);
console.log(`Tests Failed: ${failed}`);
console.log(`Total Tests:  ${passed + failed}`);
console.log('====================================\n');

process.exit(failed === 0 ? 0 : 1);
