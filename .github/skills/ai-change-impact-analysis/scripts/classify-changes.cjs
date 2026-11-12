#!/usr/bin/env node

/**
 * Phase 4.3: Classification Engine
 * 
 * Purpose: Classify changes into impact levels using evidence-based rules
 * 
 * Classification Levels:
 *   - MINOR: Isolated changes (comments, formatting)
 *   - MODERATE: Localized behavior changes
 *   - MAJOR: Significant functional/API changes
 *   - CRITICAL: Severe security/data/compatibility impact
 * 
 * Approach:
 *   - Apply pattern matching and heuristics
 *   - Collect evidence for classification
 *   - Assign confidence level (high/medium/low)
 *   - Document reasoning
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const classificationRules = {
  patterns: {
    // MINOR patterns
    minor: [
      { pattern: /\.md$/i, reason: 'Markdown documentation only' },
      { pattern: /\.txt$/i, reason: 'Text file only' },
      { pattern: /^\./, reason: 'Configuration/dotfile only' },
      { pattern: /package-lock\.json|yarn\.lock/i, reason: 'Lock file only' },
      { pattern: /\.test\.|\.spec\./i, reason: 'Test file only' }
    ],
    
    // MAJOR patterns (API, database, auth)
    major: [
      { pattern: /^src\/api\//i, reason: 'API layer changed' },
      { pattern: /^src\/routes\//i, reason: 'Route definitions changed' },
      { pattern: /^db\/migrations\//i, reason: 'Database migration added' },
      { pattern: /^src\/models\//i, reason: 'Data model changed' },
      { pattern: /^src\/schema\//i, reason: 'Schema definitions changed' }
    ],
    
    // CRITICAL patterns (auth, security, destructive)
    critical: [
      { pattern: /^src\/auth\//i, reason: 'Authentication/authorization changed' },
      { pattern: /^src\/security\//i, reason: 'Security logic changed' },
      { pattern: /crypto|encrypt|password|token|session/i, reason: 'Security-sensitive code' },
      { pattern: /DROP TABLE|DELETE FROM|TRUNCATE/i, reason: 'Destructive database operation' }
    ]
  },
  
  filePatterns: {
    api: /^src\/(api|routes|controllers)\//i,
    database: /^(db|database|migrations)\//i,
    auth: /^src\/(auth|security|permissions)\//i,
    config: /^(config|\.env|settings)\//i,
    test: /\.(test|spec)\./i,
    docs: /\.(md|txt|rst)$/i
  }
};

const impactSignals = {
  minor: {
    'Comments only': [/^\s*\/\//, /^\s*\/\*/],
    'Whitespace changes': [/^\s*$/, /^\s+$/],
    'Documentation': [/\.md$/, /\.txt$/]
  },
  
  moderate: {
    'New internal function': [/^(function|const|let|var)\s+\w+/],
    'Validation rule': [/validate|check|verify|is\w+/],
    'Helper utility': [/util|helper|common|shared/]
  },
  
  major: {
    'API endpoint': [/\/(api|v\d+)\//i, /router\.|route\./],
    'Public export': [/export\s+(default|const|function|class)/],
    'Database schema': [/ALTER TABLE|CREATE TABLE|DROP/i],
    'Model change': [/class.*Model|schema.*=/i]
  },
  
  critical: {
    'Auth bypass': [/bypass|skip|disable.*auth|remove.*check/i],
    'Security flaw': [/vulnerability|cve|security.*issue/i],
    'Data destruction': [/DROP TABLE|DELETE FROM|TRUNCATE/i],
    'Breaking change': [/incompatible|break|major.*version/i]
  }
};

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
// Classification Logic
// ============================================================================

function classifyFile(filePath, snapshot) {
  const evidence = [];
  const signals = {};
  let level = 'minor';
  let confidence = 'high';
  
  log(`Classifying: ${filePath}`, 'debug');
  
  // Check CRITICAL patterns
  for (const rule of classificationRules.patterns.critical) {
    if (rule.pattern.test(filePath)) {
      level = 'critical';
      confidence = 'high';
      evidence.push(`${rule.reason}: ${filePath}`);
      signals.critical = signals.critical || [];
      signals.critical.push(rule.reason);
    }
  }
  
  // If not critical, check MAJOR
  if (level === 'minor') {
    for (const rule of classificationRules.patterns.major) {
      if (rule.pattern.test(filePath)) {
        level = 'major';
        confidence = 'high';
        evidence.push(`${rule.reason}: ${filePath}`);
        signals.major = signals.major || [];
        signals.major.push(rule.reason);
      }
    }
  }
  
  // Check MINOR patterns
  if (level === 'minor') {
    for (const rule of classificationRules.patterns.minor) {
      if (rule.pattern.test(filePath)) {
        level = 'minor';
        confidence = 'high';
        evidence.push(`${rule.reason}: ${filePath}`);
        signals.minor = signals.minor || [];
        signals.minor.push(rule.reason);
      }
    }
  }
  
  // Analyze content for signal matching
  const content = snapshot.after || snapshot.before || '';
  
  // Check content-based signals
  for (const [checkLevel, levelSignals] of Object.entries(impactSignals)) {
    for (const [signal, patterns] of Object.entries(levelSignals)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          if (checkLevel === 'critical') {
            level = 'critical';
          } else if (checkLevel === 'major' && level !== 'critical') {
            level = 'major';
          } else if (checkLevel === 'moderate' && level === 'minor') {
            level = 'moderate';
          }
          
          signals[checkLevel] = signals[checkLevel] || [];
          signals[checkLevel].push(signal);
          evidence.push(`${signal}: ${pattern.source.substring(0, 50)}`);
          break;
        }
      }
    }
  }
  
  return {
    level,
    confidence,
    evidence,
    signals,
    reasoning: generateReasoning(level, evidence, snapshot)
  };
}

function generateReasoning(level, evidence, snapshot) {
  const levelDescriptions = {
    minor: 'Isolated, low-risk changes with no behavioral impact',
    moderate: 'Localized behavior changes with limited scope',
    major: 'Significant changes affecting system contracts or architecture',
    critical: 'Severe impact on security, data integrity, or compatibility'
  };
  
  return [
    `Classification: ${level.toUpperCase()}`,
    `Description: ${levelDescriptions[level]}`,
    `Evidence: ${evidence.join('; ')}`,
    `File status: ${snapshot.status || 'unknown'}`,
    `Language: ${snapshot.language || 'unknown'}`
  ];
}

function classifyChanges(snapshots) {
  log('Classifying all changes...', 'info');
  
  const classifications = {};
  const summary = {
    minor: 0,
    moderate: 0,
    major: 0,
    critical: 0
  };
  
  for (const [filePath, snapshot] of Object.entries(snapshots)) {
    const classification = classifyFile(filePath, snapshot);
    classifications[filePath] = classification;
    summary[classification.level]++;
  }
  
  log(`Classification complete: ${summary.critical} critical, ${summary.major} major, ${summary.moderate} moderate, ${summary.minor} minor`, 'info');
  
  return {
    classifications,
    summary,
    overallLevel: determineOverallLevel(summary)
  };
}

function determineOverallLevel(summary) {
  if (summary.critical > 0) return 'critical';
  if (summary.major > 0) return 'major';
  if (summary.moderate > 0) return 'moderate';
  return 'minor';
}

// ============================================================================
// Main
// ============================================================================

function main() {
  log('═══════════════════════════════════════════════════════════════');
  log('Phase 4.3: Classification Engine');
  log('═══════════════════════════════════════════════════════════════');
  
  // Parse arguments
  const args = require('minimist')(process.argv.slice(2), {
    string: ['input', 'output'],
    default: {
      input: 'reports/change-impact/snapshots.json',
      output: 'reports/change-impact'
    }
  });
  
  const inputPath = path.resolve(args.input);
  const outputDir = path.resolve(args.output);
  
  log(`Input: ${inputPath}`);
  log(`Output: ${outputDir}`);
  log('');
  
  try {
    // Step 1: Load snapshots
    log('Step 1: Loading snapshots...', 'info');
    
    if (!fs.existsSync(inputPath)) {
      error(`Snapshots not found: ${inputPath}`, 'SNAPSHOTS_NOT_FOUND');
    }
    
    const snapshotsPackage = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    const snapshots = snapshotsPackage.snapshots;
    
    log(`Loaded ${Object.keys(snapshots).length} file snapshots`, 'info');
    log('');
    
    // Step 2: Classify changes
    log('Step 2: Classifying changes...', 'info');
    
    const result = classifyChanges(snapshots);
    
    log(`Classification summary:`, 'info');
    log(`  Critical: ${result.summary.critical}`, 'info');
    log(`  Major:    ${result.summary.major}`, 'info');
    log(`  Moderate: ${result.summary.moderate}`, 'info');
    log(`  Minor:    ${result.summary.minor}`, 'info');
    log(`  Overall:  ${result.overallLevel.toUpperCase()}`, 'info');
    log('');
    
    // Step 3: Generate output
    log('Step 3: Generating output...', 'info');
    
    const output = {
      schemaVersion: '1.0',
      collectedAt: new Date().toISOString(),
      phase: '4.3',
      
      context: snapshotsPackage.context,
      
      classification: {
        overallLevel: result.overallLevel,
        summary: result.summary,
        confidence: determineConfidence(result.summary),
        fileClassifications: result.classifications
      },
      
      riskAssessment: generateRiskAssessment(result.classifications),
      
      recommendations: generateRecommendations(result.overallLevel, result.classifications)
    };
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write output
    const outputPath = path.join(outputDir, 'classification.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    log(`Output written to: ${outputPath}`, 'info');
    log('');
    log('═══════════════════════════════════════════════════════════════');
    log('Phase 4.3 Complete', 'info');
    log('═══════════════════════════════════════════════════════════════');
    
    process.exit(0);
    
  } catch (err) {
    error(`Unexpected error: ${err.message}`, 'UNEXPECTED_ERROR');
  }
}

function determineConfidence(summary) {
  const total = summary.critical + summary.major + summary.moderate + summary.minor;
  
  if (total === 0) return 'high';
  
  // High confidence if mostly one level
  const max = Math.max(...Object.values(summary));
  const ratio = max / total;
  
  if (ratio > 0.8) return 'high';
  if (ratio > 0.6) return 'medium';
  return 'low';
}

function generateRiskAssessment(classifications) {
  const risks = [];
  
  for (const [filePath, classification] of Object.entries(classifications)) {
    if (classification.level === 'critical' || classification.level === 'major') {
      risks.push({
        file: filePath,
        level: classification.level,
        signals: classification.signals,
        evidence: classification.evidence
      });
    }
  }
  
  return {
    criticalFiles: risks.filter(r => r.level === 'critical'),
    majorFiles: risks.filter(r => r.level === 'major'),
    totalRisks: risks.length
  };
}

function generateRecommendations(overallLevel, classifications) {
  const recommendations = [];
  
  if (overallLevel === 'critical') {
    recommendations.push('CRITICAL: Comprehensive review required before merge');
    recommendations.push('Security team should review all changes');
    recommendations.push('Plan rollback procedure');
    recommendations.push('Coordinate with ops team for deployment');
  } else if (overallLevel === 'major') {
    recommendations.push('Thorough testing required for affected modules');
    recommendations.push('Update documentation for API/schema changes');
    recommendations.push('Notify affected consumers of changes');
    recommendations.push('Consider feature flagging for gradual rollout');
  } else if (overallLevel === 'moderate') {
    recommendations.push('Standard review process sufficient');
    recommendations.push('Ensure test coverage for modified behavior');
    recommendations.push('Update relevant documentation');
  }
  
  return recommendations;
}

if (require.main === module) {
  main();
}

module.exports = {
  classifyFile,
  classifyChanges,
  determineOverallLevel,
  generateReasoning
};
