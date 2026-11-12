#!/usr/bin/env node

/**
 * Phase 4.4-4.5: Dependency Analysis & Metrics Calculator
 * 
 * Purpose: Analyze impact and calculate deterministic metrics
 * 
 * Responsibilities:
 *   - Functional impact analysis
 *   - Technical impact analysis
 *   - API impact analysis
 *   - Data impact analysis
 *   - Dependency discovery
 *   - Metrics calculation with measurement status
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// Utilities
// ============================================================================

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗',
    debug: '→'
  }[level] || '•';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function error(message, code = 'UNKNOWN_ERROR') {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

// ============================================================================
// Analysis Functions
// ============================================================================

function analyzeImpact(classification, snapshots = {}, symbolIndex = {}) {
  log('Analyzing impact...', 'debug');
  
  const impact = {
    functional: [],
    technical: [],
    api: [],
    data: [],
    security: [],
    operational: [],
    testing: []
  };
  
  // Handle empty classification
  if (!classification || !classification.fileClassifications) {
    return impact;
  }
  
  // Analyze each file
  for (const [filePath, fileClassification] of Object.entries(classification.fileClassifications)) {
    const snapshot = snapshots[filePath] || {};
    
    // Functional impact
    if (fileClassification.level === 'major' || fileClassification.level === 'critical') {
      impact.functional.push(
        `[${fileClassification.level}] ${filePath} - Business logic changed`
      );
    }
    
    // API impact
    if (/api|route|endpoint/i.test(filePath)) {
      impact.api.push(
        `API/endpoint affected: ${filePath}`
      );
    }
    
    // Data impact
    if (/model|schema|migration/i.test(filePath)) {
      impact.data.push(
        `Data model affected: ${filePath}`
      );
    }
    
    // Security impact
    if (/auth|security|permission|token|crypto/i.test(filePath)) {
      impact.security.push(
        `[CRITICAL] Security-sensitive: ${filePath}`
      );
    }
    
    // Technical impact
    if (snapshot && snapshot.symbols && snapshot.symbols.after && snapshot.symbols.after.exports) {
      const exportsCount = snapshot.symbols.after.exports.length;
      if (exportsCount > 0) {
        impact.technical.push(
          `${exportsCount} public symbols exported from ${filePath}`
        );
      }
    }
    
    // Testing impact
    if (/test|spec/i.test(filePath)) {
      impact.testing.push(
        `Test coverage affected: ${filePath}`
      );
    }
  }
  
  return impact;
}

function calculateMetrics(contextPackage, snapshots, classification) {
  log('Calculating metrics...', 'debug');
  
  const diffStats = contextPackage.diff.statistics;
  
  // Code metrics
  const codeMetrics = {
    filesAdded: diffStats.filesAdded,
    filesModified: diffStats.filesModified,
    filesDeleted: diffStats.filesDeleted,
    filesRenamed: diffStats.filesRenamed || 0,
    linesAdded: diffStats.totalLinesAdded,
    linesDeleted: diffStats.totalLinesDeleted,
    totalFilesChanged: diffStats.totalFiles,
    measurementStatus: 'measured'
  };
  
  // Dependency metrics
  const dependencyMetrics = {
    directlyChangedModules: contextPackage.diff.files
      .filter(f => f.status !== 'deleted')
      .map(f => f.path),
    discoveredDirectDependents: 0,
    discoveredTransitiveDependents: 0,
    potentialUnknownDependents: contextPackage.diff.files.some(f => /api|public|export/i.test(f.path)),
    measurementStatus: 'partially_measured',
    limitations: 'External consumers not analyzed; dynamic requires not detected'
  };
  
  // API metrics
  const apiMetrics = {
    endpointsAdded: contextPackage.diff.files.filter(f => f.status === 'added' && /api|route/.test(f.path)).length,
    endpointsModified: contextPackage.diff.files.filter(f => f.status === 'modified' && /api|route/.test(f.path)).length,
    endpointsRemoved: contextPackage.diff.files.filter(f => f.status === 'deleted' && /api|route/.test(f.path)).length,
    potentialBreakingChanges: classification.summary.critical + classification.summary.major,
    measurementStatus: 'partially_measured'
  };
  
  // Data metrics
  const dataMetrics = {
    tablesAdded: contextPackage.diff.files.filter(f => f.status === 'added' && /migration|schema/.test(f.path)).length,
    tablesModified: contextPackage.diff.files.filter(f => f.status === 'modified' && /migration|schema/.test(f.path)).length,
    tablesDeleted: contextPackage.diff.files.filter(f => f.status === 'deleted' && /migration|schema/.test(f.path)).length,
    migrationsAdded: contextPackage.diff.files.filter(f => /migration/.test(f.path)).length,
    measurementStatus: 'measured'
  };
  
  // Risk indicators
  const riskIndicators = {
    securitySensitiveFilesTouched: contextPackage.diff.files
      .filter(f => /auth|security|permission|token|crypto/i.test(f.path))
      .map(f => f.path),
    configurationChanges: contextPackage.diff.files
      .filter(f => /config|\.env|settings/.test(f.path))
      .map(f => f.path),
    infrastructureChanges: contextPackage.diff.files
      .filter(f => /docker|terraform|cloudformation|deploy/.test(f.path))
      .map(f => f.path),
    publicInterfaceChanges: contextPackage.diff.files
      .filter(f => /api|export|public|interface/i.test(f.path))
      .map(f => f.path),
    backwardCompatibilityRisks: classification.summary.critical > 0 ? 
      ['Critical changes may break consumer expectations'] : []
  };
  
  return {
    code: codeMetrics,
    dependencies: dependencyMetrics,
    api: apiMetrics,
    data: dataMetrics,
    riskIndicators
  };
}

function findDependents(repoPath, changedFiles) {
  log('Searching for dependents...', 'debug');
  
  const dependents = new Set();
  
  for (const filePath of changedFiles) {
    try {
      // Simple grep search for imports of this file
      const fileName = path.basename(filePath, path.extname(filePath));
      const searchPattern = `import.*${fileName}|require.*${fileName}|from.*${fileName}`;
      
      const result = execSync(
        `grep -r "${searchPattern}" --include="*.js" --include="*.ts" --include="*.py" ${repoPath}`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      const lines = result.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        const match = line.match(/^([^:]+):/);
        if (match) {
          const file = match[1].replace(repoPath, '').replace(/^\//, '');
          if (file !== filePath) {
            dependents.add(file);
          }
        }
      });
    } catch (err) {
      // No matches found, continue
    }
  }
  
  return Array.from(dependents);
}

// ============================================================================
// Main
// ============================================================================

function main() {
  log('═══════════════════════════════════════════════════════════════');
  log('Phase 4.4-4.5: Analysis & Metrics');
  log('═══════════════════════════════════════════════════════════════');
  
  // Parse arguments
  const args = require('minimist')(process.argv.slice(2), {
    string: ['input', 'output', 'repo'],
    default: {
      input: 'reports/change-impact/classification.json',
      output: 'reports/change-impact',
      repo: '.'
    }
  });
  
  const inputPath = path.resolve(args.input);
  const outputDir = path.resolve(args.output);
  const repoPath = path.resolve(args.repo);
  
  log(`Input: ${inputPath}`);
  log(`Output: ${outputDir}`);
  log(`Repository: ${repoPath}`);
  log('');
  
  try {
    // Step 1: Load classification
    log('Step 1: Loading classification results...', 'info');
    
    if (!fs.existsSync(inputPath)) {
      error(`Classification not found: ${inputPath}`, 'CLASSIFICATION_NOT_FOUND');
    }
    
    const classificationPackage = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    log(`Loaded classification: ${classificationPackage.classification.summary.critical} critical, ${classificationPackage.classification.summary.major} major`, 'info');
    log('');
    
    // Step 2: Load snapshots for context
    log('Step 2: Loading snapshots...', 'info');
    
    const snapshotsPath = path.join(outputDir, 'snapshots.json');
    const snapshotsPackage = fs.existsSync(snapshotsPath)
      ? JSON.parse(fs.readFileSync(snapshotsPath, 'utf-8'))
      : { snapshots: {}, symbolIndex: {} };
    
    log(`Loaded ${Object.keys(snapshotsPackage.snapshots || {}).length} file snapshots`, 'info');
    log('');
    
    // Step 3: Analyze impact
    log('Step 3: Analyzing impact...', 'info');
    
    const impact = analyzeImpact(
      classificationPackage.classification,
      snapshotsPackage.snapshots,
      snapshotsPackage.symbolIndex
    );
    
    log(`Impact analysis complete:`, 'info');
    log(`  Functional: ${impact.functional.length}`, 'info');
    log(`  Technical: ${impact.technical.length}`, 'info');
    log(`  API: ${impact.api.length}`, 'info');
    log(`  Data: ${impact.data.length}`, 'info');
    log(`  Security: ${impact.security.length}`, 'info');
    log('');
    
    // Step 4: Calculate metrics
    log('Step 4: Calculating metrics...', 'info');
    
    const metrics = calculateMetrics(
      classificationPackage.context,
      snapshotsPackage.snapshots,
      classificationPackage.classification
    );
    
    log(`Metrics calculated:`, 'info');
    log(`  Files: +${metrics.code.filesAdded} ~${metrics.code.filesModified} -${metrics.code.filesDeleted}`, 'info');
    log(`  Lines: +${metrics.code.linesAdded} -${metrics.code.linesDeleted}`, 'info');
    log(`  Risk indicators: ${metrics.riskIndicators.securitySensitiveFilesTouched.length} security files`, 'info');
    log('');
    
    // Step 5: Generate output
    log('Step 5: Generating output...', 'info');
    
    const output = {
      schemaVersion: '1.0',
      collectedAt: new Date().toISOString(),
      phase: '4.4-4.5',
      
      context: classificationPackage.context,
      classification: classificationPackage.classification,
      
      impact,
      metrics,
      
      risks: classificationPackage.riskAssessment,
      recommendations: classificationPackage.recommendations,
      
      analysis: {
        totalFiles: metrics.code.totalFilesChanged,
        overallImpactLevel: classificationPackage.classification.overallLevel,
        confidence: classificationPackage.classification.confidence,
        completeness: {
          code: 'complete',
          dependencies: 'partial (search-based)',
          api: 'partial',
          data: 'complete',
          risks: 'partial'
        }
      }
    };
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write output
    const outputPath = path.join(outputDir, 'analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    log(`Output written to: ${outputPath}`, 'info');
    log('');
    log('═══════════════════════════════════════════════════════════════');
    log('Phase 4.4-4.5 Complete', 'info');
    log('═══════════════════════════════════════════════════════════════');
    
    process.exit(0);
    
  } catch (err) {
    error(`Unexpected error: ${err.message}`, 'UNEXPECTED_ERROR');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeImpact,
  calculateMetrics,
  findDependents
};
