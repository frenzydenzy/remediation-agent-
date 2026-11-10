/**
 * Unit tests for security-analyzer.cjs
 * Tests pattern detection and ranking
 */

const { analyzeSecurityPatterns, rankFindings } = require('../.github/skills/ai-code-security-review/scripts/analyzers/security-analyzer.cjs');

// Test data
const testFiles = {
  sqlInjection: {
    name: 'VulnerableSQLQuery.java',
    content: `
      public class VulnerableSQLQuery {
        public ResultSet getUserData(String userId) {
          String query = "SELECT * FROM users WHERE id = " + userId;
          Statement stmt = connection.createStatement();
          return stmt.executeQuery(query);
        }
      }
    `,
    expectedPattern: 'sqlInjection',
  },
  commandInjection: {
    name: 'VulnerableCommandExec.java',
    content: `
      public class VulnerableCommandExec {
        public void executeCommand(String cmd) {
          Runtime.getRuntime().exec(cmd);
        }
      }
    `,
    expectedPattern: 'commandInjection',
  },
  hardCodedCredentials: {
    name: 'VulnerableCredentials.java',
    content: `
      public class VulnerableCredentials {
        private String apiKey = "sk_live_abc123xyz789";
        private String password = "MySecurePass123!";
      }
    `,
    expectedPattern: 'hardCodedCredentials',
  },
  weakHash: {
    name: 'WeakHashAlgorithm.java',
    content: `
      public class WeakHashAlgorithm {
        public String hashPassword(String password) {
          MessageDigest md = MessageDigest.getInstance("MD5");
          return md.digest(password.getBytes()).toString();
        }
      }
    `,
    expectedPattern: 'weakHashing',
  },
  ecbMode: {
    name: 'InsecureECBMode.java',
    content: `
      public class InsecureECBMode {
        public byte[] encrypt(byte[] data) {
          Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
          return cipher.doFinal(data);
        }
      }
    `,
    expectedPattern: 'ecbMode',
  },
  xxeVulnerability: {
    name: 'XXEParser.java',
    content: `
      public class XXEParser {
        public void parseXML(String xmlContent) {
          DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
          DocumentBuilder builder = factory.newDocumentBuilder();
          Document doc = builder.parse(new ByteArrayInputStream(xmlContent.getBytes()));
        }
      }
    `,
    expectedPattern: 'xxeVulnerability',
  },
};

// Run tests
function runTests() {
  let passed = 0;
  let failed = 0;

  console.log('Running security analyzer tests...\n');

  // Test 1: SQL Injection Detection
  try {
    const sqlResults = analyzeSecurityPatterns(testFiles.sqlInjection.name, testFiles.sqlInjection.content);
    if (sqlResults.length > 0 && sqlResults[0].category === 'sqlInjection') {
      console.log('✓ Test 1: SQL Injection Detection - PASSED');
      passed++;
    } else {
      console.log('✗ Test 1: SQL Injection Detection - FAILED');
      failed++;
    }
  } catch (e) {
    console.log(`✗ Test 1: SQL Injection Detection - ERROR: ${e.message}`);
    failed++;
  }

  // Test 2: Command Injection Detection
  try {
    const cmdResults = analyzeSecurityPatterns(testFiles.commandInjection.name, testFiles.commandInjection.content);
    if (cmdResults.length > 0 && cmdResults[0].category === 'commandInjection') {
      console.log('✓ Test 2: Command Injection Detection - PASSED');
      passed++;
    } else {
      console.log('✗ Test 2: Command Injection Detection - FAILED');
      failed++;
    }
  } catch (e) {
    console.log(`✗ Test 2: Command Injection Detection - ERROR: ${e.message}`);
    failed++;
  }

  // Test 3: Hard-coded Credentials Detection
  try {
    const credResults = analyzeSecurityPatterns(testFiles.hardCodedCredentials.name, testFiles.hardCodedCredentials.content);
    if (credResults.length > 0 && credResults[0].category === 'hardCodedCredentials') {
      console.log('✓ Test 3: Hard-coded Credentials Detection - PASSED');
      passed++;
    } else {
      console.log('✗ Test 3: Hard-coded Credentials Detection - FAILED');
      failed++;
    }
  } catch (e) {
    console.log(`✗ Test 3: Hard-coded Credentials Detection - ERROR: ${e.message}`);
    failed++;
  }

  // Test 4: Weak Hash Algorithm Detection
  try {
    const hashResults = analyzeSecurityPatterns(testFiles.weakHash.name, testFiles.weakHash.content);
    if (hashResults.length > 0 && hashResults[0].category === 'weakHashing') {
      console.log('✓ Test 4: Weak Hash Algorithm Detection - PASSED');
      passed++;
    } else {
      console.log('✗ Test 4: Weak Hash Algorithm Detection - FAILED');
      failed++;
    }
  } catch (e) {
    console.log(`✗ Test 4: Weak Hash Algorithm Detection - ERROR: ${e.message}`);
    failed++;
  }

  // Test 5: ECB Mode Detection
  try {
    const ecbResults = analyzeSecurityPatterns(testFiles.ecbMode.name, testFiles.ecbMode.content);
    if (ecbResults.length > 0 && ecbResults[0].category === 'ecbMode') {
      console.log('✓ Test 5: ECB Mode Detection - PASSED');
      passed++;
    } else {
      console.log('✗ Test 5: ECB Mode Detection - FAILED');
      failed++;
    }
  } catch (e) {
    console.log(`✗ Test 5: ECB Mode Detection - ERROR: ${e.message}`);
    failed++;
  }

  // Test 6: XXE Vulnerability Detection
  try {
    const xxeResults = analyzeSecurityPatterns(testFiles.xxeVulnerability.name, testFiles.xxeVulnerability.content);
    if (xxeResults.length > 0 && xxeResults[0].category === 'xxeVulnerability') {
      console.log('✓ Test 6: XXE Vulnerability Detection - PASSED');
      passed++;
    } else {
      console.log('✗ Test 6: XXE Vulnerability Detection - FAILED');
      failed++;
    }
  } catch (e) {
    console.log(`✗ Test 6: XXE Vulnerability Detection - ERROR: ${e.message}`);
    failed++;
  }

  // Test 7: Ranking by Severity
  try {
    const allResults = [
      ...analyzeSecurityPatterns(testFiles.sqlInjection.name, testFiles.sqlInjection.content),
      ...analyzeSecurityPatterns(testFiles.xxeVulnerability.name, testFiles.xxeVulnerability.content),
    ];

    if (allResults.length > 0) {
      const ranked = rankFindings(allResults);
      if (ranked[0].severity === 'CRITICAL' || ranked[0].severity === 'HIGH') {
        console.log('✓ Test 7: Severity Ranking - PASSED');
        passed++;
      } else {
        console.log('✗ Test 7: Severity Ranking - FAILED');
        failed++;
      }
    }
  } catch (e) {
    console.log(`✗ Test 7: Severity Ranking - ERROR: ${e.message}`);
    failed++;
  }

  // Test 8: Non-Java File Ignored
  try {
    const pythonResults = analyzeSecurityPatterns('vulnerable.py', 'password = "admin123"');
    if (pythonResults.length === 0) {
      console.log('✓ Test 8: Non-Java File Ignored - PASSED');
      passed++;
    } else {
      console.log('✗ Test 8: Non-Java File Ignored - FAILED');
      failed++;
    }
  } catch (e) {
    console.log(`✗ Test 8: Non-Java File Ignored - ERROR: ${e.message}`);
    failed++;
  }

  console.log(`\n====================================`);
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log(`Total Tests:  ${passed + failed}`);
  console.log(`====================================\n`);

  return failed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };
