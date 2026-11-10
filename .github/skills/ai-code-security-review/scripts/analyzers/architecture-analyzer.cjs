/**
 * Architecture Pattern Analyzer
 * Detects architectural issues like circular dependencies and layering violations
 */

/**
 * Extract imports from Java file
 * @param {string} content - File content
 * @returns {Array<string>} - Array of imported package names
 */
function extractImports(content) {
  const importPattern = /import\s+(?:static\s+)?([^;]+);/g;
  const imports = [];
  let match;

  while ((match = importPattern.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Extract package name from Java file
 * @param {string} content - File content
 * @returns {string|null} - Package name or null
 */
function extractPackage(content) {
  const packagePattern = /package\s+([^;]+);/;
  const match = content.match(packagePattern);
  return match ? match[1] : null;
}

/**
 * Extract class name from file path
 * @param {string} filePath - File path
 * @returns {string} - Class name
 */
function extractClassName(filePath) {
  return filePath.split('/').pop().replace('.java', '');
}

/**
 * Detect circular dependencies
 * @param {Array<Object>} files - Array of file objects { path, content }
 * @returns {Array<Object>} - Circular dependency findings
 */
function detectCircularDependencies(files) {
  const findings = [];
  const fileMap = new Map();

  // Build dependency map
  for (const file of files) {
    if (!file.path.endsWith('.java')) continue;

    const packageName = extractPackage(file.content);
    const imports = extractImports(file.content);

    fileMap.set(file.path, { packageName, imports });
  }

  // Detect cycles (simplified: 2-way dependencies)
  for (const [filePath, data] of fileMap) {
    for (const importedPackage of data.imports) {
      // Check if imported package references back to this file's package
      for (const [otherPath, otherData] of fileMap) {
        if (filePath === otherPath) continue;

        // Check if otherData imports from current packageName
        for (const otherImport of otherData.imports) {
          if (otherImport.startsWith(data.packageName)) {
            findings.push({
              file: filePath,
              line: 1,
              category: 'circularDependency',
              severity: 'HIGH',
              title: 'Circular Dependency Detected',
              message: `Circular dependency: ${data.packageName} <-> ${importedPackage}`,
              recommendation: 'Refactor to break the circular dependency; use dependency injection or facade pattern',
            });
            break;
          }
        }
      }
    }
  }

  return findings;
}

/**
 * Detect layering violations
 * Common layers: presentation -> service -> persistence
 * @param {Array<Object>} files - Array of file objects { path, content }
 * @returns {Array<Object>} - Layering violation findings
 */
function detectLayeringViolations(files) {
  const findings = [];

  // Define layer patterns
  const layers = {
    presentation: /\.controller\.|\.view\.|\.ui\./i,
    service: /\.service\.|\.business\./i,
    persistence: /\.repository\.|\.dao\.|\.entity\./i,
  };

  const layerOrder = { persistence: 0, service: 1, presentation: 2 };

  for (const file of files) {
    if (!file.path.endsWith('.java')) continue;

    // Determine file's layer
    let fileLayer = null;
    for (const [layer, pattern] of Object.entries(layers)) {
      if (pattern.test(file.path)) {
        fileLayer = layer;
        break;
      }
    }

    if (!fileLayer) continue;

    const imports = extractImports(file.content);

    // Check for violations
    for (const importedPackage of imports) {
      for (const [layer, pattern] of Object.entries(layers)) {
        if (pattern.test(importedPackage)) {
          // Check if this violates layering
          if (layerOrder[layer] > layerOrder[fileLayer]) {
            findings.push({
              file: file.path,
              line: 1,
              category: 'layeringViolation',
              severity: 'MEDIUM',
              title: 'Layering Violation Detected',
              message: `${fileLayer} layer importing from higher layer: ${layer}`,
              recommendation: 'Restructure dependencies to follow layer hierarchy',
            });
          }
        }
      }
    }
  }

  return findings;
}

/**
 * Detect forbidden imports
 * @param {Array<Object>} files - Array of file objects { path, content }
 * @param {Array<string>} forbiddenImports - Patterns of forbidden imports
 * @returns {Array<Object>} - Forbidden import findings
 */
function detectForbiddenImports(files, forbiddenImports = []) {
  const findings = [];

  // Default forbidden patterns
  const forbidden = forbiddenImports.length > 0
    ? forbiddenImports
    : [
        /java\.util\.concurrent\..*\$/, // Internal concurrent classes
        /sun\..*/, // Sun internal packages
        /com\.sun\..*/, // Sun internal packages
      ];

  for (const file of files) {
    if (!file.path.endsWith('.java')) continue;

    const imports = extractImports(file.content);

    for (const importedPackage of imports) {
      for (const forbiddenPattern of forbidden) {
        if (forbiddenPattern.test(importedPackage)) {
          findings.push({
            file: file.path,
            line: 1,
            category: 'forbiddenImport',
            severity: 'MEDIUM',
            title: 'Forbidden Import Detected',
            message: `Import of forbidden package: ${importedPackage}`,
            recommendation: 'Use public API instead of internal implementation packages',
          });
        }
      }
    }
  }

  return findings;
}

/**
 * Detect unused imports
 * @param {Array<Object>} files - Array of file objects { path, content }
 * @returns {Array<Object>} - Unused import findings
 */
function detectUnusedImports(files) {
  const findings = [];

  for (const file of files) {
    if (!file.path.endsWith('.java')) continue;

    const imports = extractImports(file.content);
    const content = file.content;

    for (const importedPackage of imports) {
      // Extract class name from import
      const className = importedPackage.split('.').pop();

      // Check if class name is used in the file (simple heuristic)
      const usagePattern = new RegExp(`\\b${className}\\b`, 'g');
      const matches = content.match(usagePattern) || [];

      // First match is the import statement itself
      if (matches.length <= 1) {
        findings.push({
          file: file.path,
          line: 1,
          category: 'unusedImport',
          severity: 'LOW',
          title: 'Unused Import',
          message: `Import of ${importedPackage} is not used`,
          recommendation: 'Remove unused import',
        });
      }
    }
  }

  return findings;
}

/**
 * Analyze architecture patterns
 * @param {Array<Object>} files - Array of file objects { path, content }
 * @returns {Object} - Architecture analysis results
 */
function analyzeArchitecture(files) {
  const findings = [];

  findings.push(...detectCircularDependencies(files));
  findings.push(...detectLayeringViolations(files));
  findings.push(...detectForbiddenImports(files));
  findings.push(...detectUnusedImports(files));

  return {
    findings,
    summary: {
      circularDependencies: findings.filter(f => f.category === 'circularDependency').length,
      layeringViolations: findings.filter(f => f.category === 'layeringViolation').length,
      forbiddenImports: findings.filter(f => f.category === 'forbiddenImport').length,
      unusedImports: findings.filter(f => f.category === 'unusedImport').length,
    },
  };
}

module.exports = {
  analyzeArchitecture,
  detectCircularDependencies,
  detectLayeringViolations,
  detectForbiddenImports,
  detectUnusedImports,
  extractImports,
  extractPackage,
  extractClassName,
};
