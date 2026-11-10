/**
 * Phase 3.4: Test Framework Detection Utility
 * 
 * Lightweight utility for detecting test frameworks in projects.
 * Used by fix-validator.cjs for framework identification.
 * 
 * Detection Sources (in order of reliability):
 * 1. package.json scripts → npm/Jest/Mocha
 * 2. package.json dependencies → Jest/Mocha package
 * 3. pom.xml → Maven/JUnit
 * 4. Test directory presence → Framework inference
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse package.json and extract framework info
 * @param {String} packageJsonPath - Path to package.json
 * @returns {Object|null} - Framework info or null
 */
exports.parsePackageJson = (packageJsonPath) => {
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(content);
    
    // Check test script first (highest confidence)
    if (packageJson.scripts && packageJson.scripts.test) {
      const script = packageJson.scripts.test;
      
      if (script.includes('jest')) {
        return {
          framework: 'jest',
          language: 'javascript',
          source: 'script',
          confidence: 95
        };
      }
      
      if (script.includes('mocha')) {
        return {
          framework: 'mocha',
          language: 'javascript',
          source: 'script',
          confidence: 90
        };
      }
    }
    
    // Check dependencies (medium confidence)
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    if (allDeps['jest']) {
      return {
        framework: 'jest',
        language: 'javascript',
        source: 'dependency',
        confidence: 85
      };
    }
    
    if (allDeps['mocha']) {
      return {
        framework: 'mocha',
        language: 'javascript',
        source: 'dependency',
        confidence: 80
      };
    }
    
    // Fallback for any Node.js project
    return {
      framework: 'npm',
      language: 'javascript',
      source: 'fallback',
      confidence: 50
    };
  } catch (error) {
    return null;
  }
};

/**
 * Parse pom.xml and extract Maven info
 * @param {String} pomXmlPath - Path to pom.xml
 * @returns {Object|null} - Framework info or null
 */
exports.parsePomXml = (pomXmlPath) => {
  try {
    const content = fs.readFileSync(pomXmlPath, 'utf8');
    
    // Check for Maven Surefire (higher confidence)
    if (content.includes('maven-surefire') || content.includes('maven.surefire')) {
      return {
        framework: 'maven-surefire',
        language: 'java',
        source: 'pom',
        confidence: 95
      };
    }
    
    // Default Maven project
    return {
      framework: 'maven',
      language: 'java',
      source: 'pom',
      confidence: 85
    };
  } catch (error) {
    return null;
  }
};

/**
 * Detect framework by checking file existence
 * @param {String} projectPath - Root directory of project
 * @returns {Object} - Detected framework or null
 */
exports.detectByFiles = (projectPath) => {
  // Check for package.json (Node.js)
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const info = exports.parsePackageJson(packageJsonPath);
    if (info) {
      return info;
    }
  }
  
  // Check for pom.xml (Java/Maven)
  const pomXmlPath = path.join(projectPath, 'pom.xml');
  if (fs.existsSync(pomXmlPath)) {
    const info = exports.parsePomXml(pomXmlPath);
    if (info) {
      return info;
    }
  }
  
  // Check for Java test directories
  const javaTestDirs = [
    path.join(projectPath, 'src/test/java'),
    path.join(projectPath, 'test')
  ];
  
  for (const testDir of javaTestDirs) {
    if (fs.existsSync(testDir) && fs.statSync(testDir).isDirectory()) {
      return {
        framework: 'junit',
        language: 'java',
        source: 'directory',
        confidence: 70
      };
    }
  }
  
  // Check for test directories (Node.js)
  const nodeTestDirs = [
    path.join(projectPath, '__tests__'),
    path.join(projectPath, 'test'),
    path.join(projectPath, 'tests')
  ];
  
  for (const testDir of nodeTestDirs) {
    if (fs.existsSync(testDir) && fs.statSync(testDir).isDirectory()) {
      return {
        framework: 'npm',
        language: 'javascript',
        source: 'directory',
        confidence: 50
      };
    }
  }
  
  return null;
};

/**
 * Get test command for detected framework
 * @param {String} framework - Framework name
 * @returns {String} - Test command to run
 */
exports.getTestCommand = (framework) => {
  const commands = {
    'jest': 'npm test',
    'mocha': 'npm test',
    'npm': 'npm test',
    'maven': 'mvn test',
    'maven-surefire': 'mvn test',
    'junit': 'mvn test'
  };
  
  return commands[framework] || null;
};

/**
 * Get test configuration file for framework
 * @param {String} framework - Framework name
 * @returns {String} - Config file name
 */
exports.getConfigFile = (framework) => {
  const configs = {
    'jest': 'jest.config.js',
    'mocha': '.mocharc.json',
    'npm': 'package.json',
    'maven': 'pom.xml',
    'maven-surefire': 'pom.xml',
    'junit': 'pom.xml'
  };
  
  return configs[framework] || null;
};

/**
 * Validate framework detection confidence
 * @param {Object} info - Framework info object
 * @returns {Boolean} - Whether confidence is high enough
 */
exports.isConfident = (info) => {
  if (!info) {
    return false;
  }
  
  // Require at least 70% confidence
  return info.confidence >= 70;
};

/**
 * Format framework info for display
 * @param {Object} info - Framework info object
 * @returns {String} - Formatted string
 */
exports.formatInfo = (info) => {
  if (!info) {
    return 'No test framework detected';
  }
  
  return `${info.framework} (${info.language}, ${info.confidence}% confidence)`;
};
