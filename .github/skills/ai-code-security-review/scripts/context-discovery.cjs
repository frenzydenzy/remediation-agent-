const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Constants for discovery limits
const MAX_DISCOVERED_FILES = 32;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_CONTEXT_BYTES = 4 * 1024 * 1024;

// Patterns for test file discovery
const TEST_FILE_PATTERNS = [
  /^(.*)Test\.java$/,      // UserServiceTest.java
  /^Test(.*)\.java$/,      // TestUserService.java
  /^(.*)Tests\.java$/,     // UserServiceTests.java
  /^(.*)TestCase\.java$/,  // UserServiceTestCase.java
];

// Standard library packages to exclude
const STDLIB_PREFIXES = ['java.', 'javax.', 'sun.', 'com.sun.', 'jdk.'];

/**
 * Parse Java imports from file content
 * @param {string} content - Java file content
 * @returns {Set<string>} Set of fully-qualified import names
 */
function parseJavaImports(content) {
  const imports = new Set();
  // Match two patterns:
  // 1. import [static] package.names.ClassName[.CONSTANT];
  // 2. import package.names.*;
  // The regex handles: valid class imports and wildcard imports
  const patterns = [
    // Pattern 1: Class import (static or regular)
    // For static imports, captures only up to the class name, not the constant
    /^\s*import\s+(?:static\s+)?([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)*\.[A-Z][A-Za-z0-9_]*(?:\.[A-Z][A-Za-z0-9_]*)?)\s*;/gm,
    // Pattern 2: Wildcard import  
    /^\s*import\s+([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)*)\.\*\s*;/gm
  ];
  
  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      let importName = match[1];
      
      // For static imports ending with .CONSTANT_NAME, remove the constant part
      // (CONSTANT_NAME is all uppercase or has underscores)
      if (importName.match(/\.[A-Z_][A-Z0-9_]*$/)) {
        // Only keep it if it looks like a class name (mixed case), remove if it looks like a constant (all caps)
        const lastPart = importName.substring(importName.lastIndexOf('.') + 1);
        if (lastPart === lastPart.toUpperCase() && lastPart.includes('_')) {
          // It's a constant like MAX_SIZE, remove it
          importName = importName.substring(0, importName.lastIndexOf('.'));
        }
      }
      
      // Exclude standard library imports
      if (!STDLIB_PREFIXES.some(prefix => importName.startsWith(prefix))) {
        imports.add(importName);
      }
    }
  }

  return imports;
}

/**
 * Resolve import package name to file path
 * @param {string} packageName - Fully-qualified package name (com.example.UserService)
 * @param {string} repo - Repository root path
 * @returns {string|null} Relative file path or null if not found
 */
function resolveImportPath(packageName, repo) {
  // Convert package name to file path
  // com.example.service.UserService -> com/example/service/UserService.java
  const parts = packageName.split('.');
  const fileName = parts[parts.length - 1];
  const packagePath = parts.slice(0, -1).join('/');

  // Try Maven/Gradle structure: src/main/java/package/File.java
  const mainJavaPath = path.join('src', 'main', 'java', packagePath, `${fileName}.java`);
  const srcMainPath = path.join('src', packagePath, `${fileName}.java`);
  const srcPath = path.join('src', packagePath, `${fileName}.java`);
  const rootPath = path.join(packagePath, `${fileName}.java`);

  // Check each candidate path in Git
  for (const candidate of [mainJavaPath, srcMainPath, srcPath, rootPath]) {
    try {
      const fullPath = path.join(repo, candidate);
      if (fs.existsSync(fullPath)) {
        return candidate.replace(/\\/g, '/'); // Normalize to forward slashes
      }
    } catch (e) {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Discover Maven/Gradle build configuration files
 * @param {string} repo - Repository root path
 * @returns {Array<{path: string, reason: string}>} Build configuration files
 */
function discoverMavenGradle(repo) {
  const buildFiles = [];
  const candidates = [
    { path: 'pom.xml', type: 'Maven configuration' },
    { path: 'build.gradle', type: 'Gradle build configuration' },
    { path: 'build.gradle.kts', type: 'Gradle build configuration (Kotlin)' },
    { path: 'settings.gradle', type: 'Gradle multi-project settings' },
    { path: 'settings.gradle.kts', type: 'Gradle multi-project settings (Kotlin)' },
  ];

  for (const { path: filePath, type } of candidates) {
    try {
      const fullPath = path.join(repo, filePath);
      if (fs.existsSync(fullPath)) {
        buildFiles.push({
          path: filePath.replace(/\\/g, '/'),
          reason: type,
        });
      }
    } catch (e) {
      // Continue
    }
  }

  // Check for wrapper files
  const wrapperDirs = ['.mvn', 'gradle'];
  for (const dir of wrapperDirs) {
    try {
      const fullPath = path.join(repo, dir);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        buildFiles.push({
          path: dir.replace(/\\/g, '/'),
          reason: `${dir} directory (build wrapper)`,
        });
      }
    } catch (e) {
      // Continue
    }
  }

  return buildFiles;
}

/**
 * Discover test files related to a source file
 * @param {string} sourcePath - Path to source file (e.g., src/main/java/com/example/User.java)
 * @param {string} repo - Repository root path
 * @returns {Array<{path: string, reason: string}>} Related test files
 */
function discoverTestFiles(sourcePath, repo) {
  const testFiles = [];

  // Extract base name from source file
  // src/main/java/com/example/User.java -> User
  const fileName = path.basename(sourcePath, '.java');

  // Test directories to search
  const testDirs = ['src/test/java', 'test', 'tests', 'src/test'];

  // Search test directories for matching test files
  for (const testDir of testDirs) {
    try {
      const fullTestDir = path.join(repo, testDir);
      if (!fs.existsSync(fullTestDir)) continue;

      const searchRecursive = (dir) => {
        try {
          const entries = fs.readdirSync(dir);
          for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              searchRecursive(fullPath);
            } else if (stat.isFile() && entry.endsWith('.java')) {
              // Check if file matches any test pattern
              for (const pattern of TEST_FILE_PATTERNS) {
                const match = entry.match(pattern);
                if (match && match[1] === fileName) {
                  const relativePath = path.relative(repo, fullPath).replace(/\\/g, '/');
                  testFiles.push({
                    path: relativePath,
                    reason: `Related test file (naming convention: ${entry})`,
                  });
                  break;
                }
              }
            }
          }
        } catch (e) {
          // Continue searching
        }
      };

      searchRecursive(fullTestDir);
    } catch (e) {
      // Continue with next test directory
    }
  }

  return testFiles;
}

/**
 * Enforce discovery limits on discovered context
 * @param {Array<{path: string, reason: string}>} discovered - Discovered files
 * @param {number} currentContextBytes - Current context size
 * @returns {{discovered: Array, omitted: Array, limitations: Array}}
 */
function enforceDiscoveryLimits(discovered, currentContextBytes = 0) {
  const included = [];
  const omitted = [];
  let totalBytes = currentContextBytes;
  let fileCount = 0;

  for (const item of discovered) {
    // Check file count limit
    if (fileCount >= MAX_DISCOVERED_FILES) {
      omitted.push({
        path: item.path,
        reason: `Exceeded MAX_DISCOVERED_FILES limit (${MAX_DISCOVERED_FILES})`,
      });
      continue;
    }

    // Check file size limit
    try {
      const filePath = path.join(process.cwd(), item.path);
      if (!fs.existsSync(filePath)) {
        omitted.push({
          path: item.path,
          reason: 'File not found',
        });
        continue;
      }

      const stat = fs.statSync(filePath);
      if (stat.size > MAX_FILE_BYTES) {
        omitted.push({
          path: item.path,
          reason: `File size ${stat.size} bytes exceeds MAX_FILE_BYTES (${MAX_FILE_BYTES})`,
        });
        continue;
      }

      // Check aggregate size limit
      if (totalBytes + stat.size > MAX_CONTEXT_BYTES) {
        omitted.push({
          path: item.path,
          reason: `Adding this file would exceed MAX_CONTEXT_BYTES (${MAX_CONTEXT_BYTES}). Total would be ${totalBytes + stat.size}`,
        });
        continue;
      }

      included.push(item);
      totalBytes += stat.size;
      fileCount++;
    } catch (e) {
      omitted.push({
        path: item.path,
        reason: `Error checking file: ${e.message}`,
      });
    }
  }

  const limitations = [];
  if (omitted.length > 0) {
    limitations.push(
      `${omitted.length} discovered files were omitted due to limits (max ${MAX_DISCOVERED_FILES} files, ${MAX_FILE_BYTES} bytes per file, ${MAX_CONTEXT_BYTES} bytes total).`
    );
  }

  return { discovered: included, omitted, limitations };
}

/**
 * Discover context from Java files
 * @param {{repo: string, files: Array, base: string}} options
 * @returns {{discovered: Array, omitted: Array, limitations: Array}}
 */
function discoverContext({ repo = process.cwd(), files = [], base = '' } = {}) {
  const discovered = new Map(); // Use map to deduplicate by path
  const reasons = new Map(); // Track reasons for each file

  function addDiscovery(filePath, reason) {
    if (!discovered.has(filePath)) {
      discovered.set(filePath, true);
      reasons.set(filePath, [reason]);
    } else {
      const currentReasons = reasons.get(filePath) || [];
      if (!currentReasons.includes(reason)) {
        currentReasons.push(reason);
        reasons.set(filePath, currentReasons);
      }
    }
  }

  // Process each changed Java file
  for (const file of files) {
    if (!file.path.endsWith('.java')) continue;

    try {
      // Get file content (try 'after' first, fall back to 'before')
      let content = null;
      if (file.after && file.after.content) {
        content = file.after.content;
      } else if (file.before && file.before.content) {
        content = file.before.content;
      }

      if (!content) continue;

      // Parse imports from this file
      const imports = parseJavaImports(content);
      for (const importName of imports) {
        const resolvedPath = resolveImportPath(importName, repo);
        if (resolvedPath && resolvedPath !== file.path) {
          addDiscovery(resolvedPath, `Imported by ${file.path}`);
        }
      }

      // Discover related test files
      const testFiles = discoverTestFiles(file.path, repo);
      for (const testFile of testFiles) {
        addDiscovery(testFile.path, testFile.reason);
      }
    } catch (e) {
      // Skip files with errors
    }
  }

  // Add Maven/Gradle build files to every Java project
  const buildFiles = discoverMavenGradle(repo);
  for (const buildFile of buildFiles) {
    addDiscovery(buildFile.path, buildFile.reason);
  }

  // Convert map to array with reasons
  const discoveredArray = Array.from(discovered.entries()).map(([path]) => ({
    path,
    reasons: reasons.get(path) || ['Auto-discovered context'],
  }));

  // Apply limits
  return enforceDiscoveryLimits(discoveredArray, 0);
}

// Export for use in other modules
module.exports = { discoverContext, parseJavaImports, resolveImportPath };

// CLI usage for testing
if (require.main === module) {
  try {
    const options = {};
    const args = process.argv.slice(2);
    
    for (let index = 0; index < args.length; index += 2) {
      const option = args[index];
      const value = args[index + 1];
      
      if (!['--repo', '--base'].includes(option) || !value) {
        throw new Error('Usage: node context-discovery.cjs [--repo <path>] [--base <ref>]');
      }
      
      options[option.slice(2)] = value;
    }

    const result = discoverContext(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Context discovery failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
