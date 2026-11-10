/**
 * Phase 3.4: Test Framework Detector & Executor
 * 
 * Responsibilities:
 * 1. Detect test framework (Jest, Mocha, JUnit, Maven)
 * 2. Execute tests with appropriate runner
 * 3. Parse test results
 * 4. Validate if fixes pass tests
 * 
 * Supported Frameworks:
 * - Node.js: Jest, Mocha, Vitest, npm test
 * - Java: JUnit 4/5, Maven Surefire
 * 
 * Detection Strategy:
 * 1. Look for package.json → npm/Jest/Mocha
 * 2. Look for pom.xml → Maven/JUnit
 * 3. Look for test files → infer framework
 * 4. Run framework-specific test command
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);

/**
 * Detect test framework in project
 * @param {String} projectPath - Root directory of project
 * @returns {Promise<Object>} - Framework info or null if not detected
 */
exports.detectTestFramework = async (projectPath) => {
  const result = {
    detected: false,
    framework: null,
    language: null,
    testCommand: null,
    configFile: null,
    confidence: 0
  };

  if (!projectPath || typeof projectPath !== 'string') {
    return result;
  }

  try {
    // Check for Node.js projects (package.json)
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const content = await readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);
      
      // Check test scripts
      if (packageJson.scripts && packageJson.scripts.test) {
        const testScript = packageJson.scripts.test;
        
        if (testScript.includes('jest')) {
          return {
            detected: true,
            framework: 'jest',
            language: 'javascript',
            testCommand: 'npm test',
            configFile: 'jest.config.js',
            confidence: 95
          };
        }
        
        if (testScript.includes('mocha')) {
          return {
            detected: true,
            framework: 'mocha',
            language: 'javascript',
            testCommand: 'npm test',
            configFile: '.mocharc.json',
            confidence: 90
          };
        }
      }
      
      // Check dependencies
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      if (allDeps['jest']) {
        return {
          detected: true,
          framework: 'jest',
          language: 'javascript',
          testCommand: 'npm test',
          configFile: 'jest.config.js',
          confidence: 85
        };
      }
      
      if (allDeps['mocha']) {
        return {
          detected: true,
          framework: 'mocha',
          language: 'javascript',
          testCommand: 'npm test',
          configFile: '.mocharc.json',
          confidence: 80
        };
      }
      
      // Default for Node projects with package.json
      return {
        detected: true,
        framework: 'npm',
        language: 'javascript',
        testCommand: 'npm test',
        configFile: 'package.json',
        confidence: 60
      };
    } catch (e) {
      // package.json doesn't exist or is invalid, continue
    }

    // Check for Java projects (pom.xml)
    const pomXmlPath = path.join(projectPath, 'pom.xml');
    try {
      const content = await readFile(pomXmlPath, 'utf8');
      
      if (content.includes('<maven.surefire')) {
        return {
          detected: true,
          framework: 'maven-surefire',
          language: 'java',
          testCommand: 'mvn test',
          configFile: 'pom.xml',
          confidence: 95
        };
      }
      
      // Default for Maven projects
      return {
        detected: true,
        framework: 'maven',
        language: 'java',
        testCommand: 'mvn test',
        configFile: 'pom.xml',
        confidence: 85
      };
    } catch (e) {
      // pom.xml doesn't exist or is invalid, continue
    }

    // Check for Java test files
    const testDirsJava = [
      path.join(projectPath, 'src/test/java'),
      path.join(projectPath, 'test')
    ];
    
    for (const testDir of testDirsJava) {
      try {
        const stats = await stat(testDir);
        if (stats.isDirectory()) {
          return {
            detected: true,
            framework: 'junit',
            language: 'java',
            testCommand: 'mvn test',
            configFile: 'pom.xml',
            confidence: 70
          };
        }
      } catch (e) {
        // Directory doesn't exist, continue
      }
    }

  } catch (error) {
    // Error during detection, return empty result
    return result;
  }

  return result;
};

/**
 * Run tests for a project
 * @param {String} projectPath - Root directory of project
 * @param {Object} framework - Framework info from detectTestFramework
 * @returns {Promise<Object>} - Test execution result
 */
exports.runTests = async (projectPath, framework) => {
  const result = {
    success: false,
    framework: framework.framework,
    language: framework.language,
    command: framework.testCommand,
    exitCode: null,
    stdout: '',
    stderr: '',
    duration: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  if (!framework || !framework.testCommand) {
    result.errors.push('No test framework detected');
    return result;
  }

  const startTime = Date.now();

  try {
    // Execute test command with timeout (30 seconds)
    const output = execSync(framework.testCommand, {
      cwd: projectPath,
      timeout: 30000,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    result.stdout = output;
    result.success = true;
    result.exitCode = 0;

  } catch (error) {
    result.stdout = error.stdout || '';
    result.stderr = error.stderr || '';
    result.exitCode = error.status || 1;
    result.success = false;
    
    // Some frameworks exit with non-zero when tests fail but command succeeds
    if (error.status && error.status <= 1) {
      // Parse output to determine if this is a test failure vs command error
      const output = (error.stdout || '') + (error.stderr || '');
      if (output.length > 0) {
        result.success = parseTestOutput(result, framework.framework);
      }
    }
  }

  result.duration = Date.now() - startTime;
  return result;
};

/**
 * Parse test output to extract pass/fail counts
 * @param {Object} result - Test execution result
 * @param {String} framework - Framework name
 * @returns {Boolean} - Whether tests passed
 */
function parseTestOutput(result, framework) {
  const output = result.stdout + result.stderr;
  
  // Jest patterns
  if (framework === 'jest') {
    const passed = (output.match(/(\d+) passed/g) || []).pop();
    const failed = (output.match(/(\d+) failed/g) || []).pop();
    
    if (passed) {
      result.passed = parseInt(passed.match(/\d+/)[0]);
    }
    if (failed) {
      result.failed = parseInt(failed.match(/\d+/)[0]);
      return false;
    }
    return !failed;
  }
  
  // Mocha patterns
  if (framework === 'mocha') {
    const passed = (output.match(/(\d+) passing/g) || []).pop();
    const failed = (output.match(/(\d+) failing/g) || []).pop();
    
    if (passed) {
      result.passed = parseInt(passed.match(/\d+/)[0]);
    }
    if (failed) {
      result.failed = parseInt(failed.match(/\d+/)[0]);
      return false;
    }
    return !failed;
  }
  
  // Maven patterns
  if (framework === 'maven' || framework === 'maven-surefire') {
    const passed = (output.match(/Tests run: (\d+)/g) || []).pop();
    if (passed) {
      result.passed = parseInt(passed.match(/\d+/)[0]);
    }
    
    const failures = (output.match(/Failures: (\d+)/g) || []).pop();
    const errors = (output.match(/Errors: (\d+)/g) || []).pop();
    
    if (failures) {
      result.failed += parseInt(failures.match(/\d+/)[0]);
    }
    if (errors) {
      result.failed += parseInt(errors.match(/\d+/)[0]);
    }
    
    return result.failed === 0;
  }
  
  // Generic: assume no failures mentioned = success
  return !output.includes('fail') && !output.includes('error');
}

/**
 * Validate if a fix passes tests
 * @param {String} projectPath - Root directory of project
 * @returns {Promise<Boolean>} - Whether all tests pass
 */
exports.validateFix = async (projectPath) => {
  if (!projectPath) {
    return false;
  }

  try {
    // Detect framework
    const framework = await exports.detectTestFramework(projectPath);
    
    if (!framework.detected) {
      // No tests found = validation passes by default
      return true;
    }

    // Run tests
    const result = await exports.runTests(projectPath, framework);
    
    return result.success && result.exitCode === 0;
  } catch (error) {
    // On error, consider validation failed
    return false;
  }
};

/**
 * Helper: Check if file exists
 * @param {String} filePath - Path to check
 * @returns {Promise<Boolean>}
 */
async function fileExistsAsync(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

// Export helper functions for testing
exports.fileExistsAsync = fileExistsAsync;
exports.parseTestOutput = parseTestOutput;
