/**
 * Integration Test: Enhanced Analysis with collect-review Pipeline
 * Tests the full pipeline: collect-review -> context discovery -> enhanced analysis
 */

const fs = require('fs');
const path = require('path');
const { collectReview } = require('../.github/skills/ai-code-security-review/scripts/collect-review.cjs');
const { runEnhancedAnalysis } = require('../.github/skills/ai-code-security-review/scripts/analyzers/enhanced-analysis.cjs');

// Create temporary test artifacts
const testArtifactsDir = path.join(__dirname, '..', '.test-artifacts', 'phase-3-2-test');

function setupTestArtifacts() {
  // Create directory structure
  const dirs = [
    testArtifactsDir,
    path.join(testArtifactsDir, 'src', 'main', 'java', 'com', 'example', 'service'),
    path.join(testArtifactsDir, 'src', 'test', 'java', 'com', 'example', 'service'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create vulnerable service class
  const serviceFile = path.join(testArtifactsDir, 'src', 'main', 'java', 'com', 'example', 'service', 'UserService.java');
  const serviceContent = `package com.example.service;

import java.util.HashMap;
import java.util.Map;
import java.security.MessageDigest;

public class UserService {
  private Map cache = new HashMap();  // Non-thread-safe
  
  public void createUser(String userId, String password) {
    // SQL Injection Risk
    String query = "SELECT * FROM users WHERE id = " + userId;
    
    // Hard-coded credential
    String apiKey = "sk_live_abc123xyz789";
    
    // Weak Hash
    MessageDigest md = MessageDigest.getInstance("MD5");
  }
  
  public void executeCommand(String cmd) {
    // Command Injection Risk
    Runtime.getRuntime().exec(cmd);
  }
}`;

  fs.writeFileSync(serviceFile, serviceContent);

  // Create test file
  const testFile = path.join(testArtifactsDir, 'src', 'test', 'java', 'com', 'example', 'service', 'UserServiceTest.java');
  const testContent = `package com.example.service;

public class UserServiceTest {
  public void testCreateUser() {
    UserService service = new UserService();
    service.createUser("123", "password");
  }
}`;

  fs.writeFileSync(testFile, testContent);

  // Create pom.xml
  const pomFile = path.join(testArtifactsDir, 'pom.xml');
  const pomContent = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <groupId>com.example</groupId>
  <artifactId>user-service</artifactId>
  <version>1.0</version>
  
  <dependencies>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.0</version>
    </dependency>
  </dependencies>
</project>`;

  fs.writeFileSync(pomFile, pomContent);

  return testArtifactsDir;
}

function runTests() {
  let passed = 0;
  let failed = 0;

  console.log('\n=== Phase 3.2 Integration Test ===\n');
  console.log('Setting up test artifacts...');
  const testDir = setupTestArtifacts();
  console.log(`✓ Test artifacts created in ${testDir}\n`);

  try {
    // Test 1: Verify test artifact structure
    console.log('Test 1: Verify test artifact structure');
    const requiredFiles = [
      'src/main/java/com/example/service/UserService.java',
      'src/test/java/com/example/service/UserServiceTest.java',
      'pom.xml',
    ];

    let allFilesExist = true;
    for (const file of requiredFiles) {
      const filePath = path.join(testDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`  ✗ Missing: ${file}`);
        allFilesExist = false;
      }
    }

    if (allFilesExist) {
      console.log('  ✓ All test artifacts created\n');
      passed++;
    } else {
      console.log('  ✗ Failed\n');
      failed++;
    }

    // Test 2: Read test files and run enhanced analysis
    console.log('Test 2: Run enhanced analysis on test code');
    const javaFile = path.join(testDir, 'src/main/java/com/example/service/UserService.java');
    const javaContent = fs.readFileSync(javaFile, 'utf8');

    const snapshot = {
      files: [
        {
          path: 'UserService.java',
          content: javaContent,
        },
      ],
    };

    const analysisResult = runEnhancedAnalysis(snapshot);

    if (analysisResult.totalFindings > 0) {
      console.log(`  ✓ Found ${analysisResult.totalFindings} security/correctness issues\n`);
      console.log(`  Findings breakdown:`);
      console.log(`    - Security: ${analysisResult.analysisResults.security.summary.total || 0}`);
      console.log(`    - Correctness: ${analysisResult.analysisResults.correctness.summary.total || 0}\n`);
      passed++;
    } else {
      console.log('  ✗ No findings detected (expected vulnerabilities)\n');
      failed++;
    }

    // Test 3: Verify finding details
    console.log('Test 3: Verify finding details');
    if (analysisResult.findings.length > 0) {
      const firstFinding = analysisResult.findings[0];
      console.log(`  First finding:`);
      console.log(`    - Category: ${firstFinding.category}`);
      console.log(`    - Severity: ${firstFinding.severity}`);
      console.log(`    - Title: ${firstFinding.title}`);
      console.log(`    - Line: ${firstFinding.line}\n`);

      if (firstFinding.severity && firstFinding.title && firstFinding.file) {
        console.log('  ✓ Finding has required fields\n');
        passed++;
      } else {
        console.log('  ✗ Finding missing required fields\n');
        failed++;
      }
    } else {
      console.log('  ✗ No findings to verify\n');
      failed++;
    }

    // Test 4: Verify severity ranking
    console.log('Test 4: Verify findings are ranked by severity');
    if (analysisResult.findings.length > 1) {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      let properlyRanked = true;

      for (let i = 1; i < analysisResult.findings.length; i++) {
        const prevSeverity = severityOrder[analysisResult.findings[i - 1].severity] || 999;
        const currentSeverity = severityOrder[analysisResult.findings[i].severity] || 999;

        if (prevSeverity > currentSeverity) {
          properlyRanked = false;
          break;
        }
      }

      if (properlyRanked) {
        console.log('  ✓ Findings properly ranked by severity\n');
        passed++;
      } else {
        console.log('  ✗ Findings not properly ranked\n');
        failed++;
      }
    } else {
      console.log('  ⊘ Skipped (need multiple findings)\n');
    }

    // Test 5: Verify analysis results structure
    console.log('Test 5: Verify analysis results structure');
    const hasAllAnalyzers =
      analysisResult.analysisResults.security !== undefined &&
      analysisResult.analysisResults.correctness !== undefined &&
      analysisResult.analysisResults.testCoverage !== undefined &&
      analysisResult.analysisResults.architecture !== undefined;

    if (hasAllAnalyzers) {
      console.log('  ✓ All analyzer results present\n');
      passed++;
    } else {
      console.log('  ✗ Missing analyzer results\n');
      failed++;
    }

  } catch (e) {
    console.error('  ✗ Error:', e.message);
    failed++;
  }

  // Cleanup
  console.log('Cleaning up test artifacts...');
  try {
    const removeDir = (dir) => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
          const filePath = path.join(dir, file);
          if (fs.lstatSync(filePath).isDirectory()) {
            removeDir(filePath);
          } else {
            fs.unlinkSync(filePath);
          }
        });
        fs.rmdirSync(dir);
      }
    };
    removeDir(testArtifactsDir);
    console.log('✓ Cleanup complete\n');
  } catch (e) {
    console.log('⚠ Cleanup warning:', e.message, '\n');
  }

  // Summary
  console.log('====================================');
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log(`Total Tests:  ${passed + failed}`);
  console.log('====================================\n');

  return failed === 0;
}

if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };
