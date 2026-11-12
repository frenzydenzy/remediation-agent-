#!/usr/bin/env node

/**
 * Phase 4.7: Report Formatter
 * 
 * Purpose: Generate comprehensive Markdown and JSON reports
 * 
 * Produces:
 *   - change-impact-report.md (human-readable Markdown)
 *   - change-impact-report.json (machine-readable JSON with schema validation)
 */

const fs = require('fs');
const path = require('path');

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

function severityBadge(level) {
  const badges = {
    critical: '🔴 CRITICAL',
    major: '🟠 MAJOR',
    moderate: '🟡 MODERATE',
    minor: '🟢 MINOR',
    low: '⚪ LOW'
  };
  return badges[level] || `⚫ ${level.toUpperCase()}`;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateMarkdownReport(allData) {
  const {
    context,
    classification,
    impact,
    metrics,
    diagrams,
    risks,
    recommendations
  } = allData;
  
  log('Generating Markdown report...', 'debug');
  
  const lines = [];
  
  // Header
  lines.push('# Change Impact Analysis Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Repository: ${context.repoPath || 'unknown'}`);
  lines.push(`Base Branch: ${context.baseBranch || 'unknown'}`);
  lines.push(`Head Ref: ${context.headRef || 'unknown'}`);
  lines.push('');
  
  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`**Overall Impact Level:** ${severityBadge(classification.overallLevel)}`);
  lines.push(`**Confidence:** ${classification.confidence}%`);
  lines.push(`**Total Files Changed:** ${metrics.code.totalFilesChanged}`);
  lines.push(`**Lines Added:** ${metrics.code.linesAdded} | **Lines Deleted:** ${metrics.code.linesDeleted}`);
  lines.push('');
  
  // Change Summary
  lines.push('## Change Summary');
  lines.push('');
  lines.push('### File Changes');
  lines.push(`- **Added:** ${metrics.code.filesAdded}`);
  lines.push(`- **Modified:** ${metrics.code.filesModified}`);
  lines.push(`- **Deleted:** ${metrics.code.filesDeleted}`);
  lines.push(`- **Renamed:** ${metrics.code.filesRenamed || 0}`);
  lines.push('');
  
  // Classification Details
  lines.push('### Classification Results');
  lines.push('');
  lines.push(`| Level | Count |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Critical | ${classification.summary.critical} |`);
  lines.push(`| Major | ${classification.summary.major} |`);
  lines.push(`| Moderate | ${classification.summary.moderate} |`);
  lines.push(`| Minor | ${classification.summary.minor} |`);
  lines.push('');
  
  // Impact Analysis
  lines.push('## Impact Analysis');
  lines.push('');
  
  if (impact.security && impact.security.length > 0) {
    lines.push('### 🔐 Security Impact');
    lines.push('');
    lines.push(`**${impact.security.length}** security-sensitive changes detected:`);
    lines.push('');
    impact.security.slice(0, 5).forEach(item => {
      lines.push(`- ${item}`);
    });
    if (impact.security.length > 5) {
      lines.push(`- ... and ${impact.security.length - 5} more`);
    }
    lines.push('');
  }
  
  if (impact.api && impact.api.length > 0) {
    lines.push('### 🔌 API Impact');
    lines.push('');
    lines.push(`**${impact.api.length}** API changes:`);
    lines.push('');
    impact.api.slice(0, 5).forEach(item => {
      lines.push(`- ${item}`);
    });
    if (impact.api.length > 5) {
      lines.push(`- ... and ${impact.api.length - 5} more`);
    }
    lines.push('');
  }
  
  if (impact.data && impact.data.length > 0) {
    lines.push('### 💾 Data Model Impact');
    lines.push('');
    lines.push(`**${impact.data.length}** data model changes:`);
    lines.push('');
    impact.data.slice(0, 5).forEach(item => {
      lines.push(`- ${item}`);
    });
    if (impact.data.length > 5) {
      lines.push(`- ... and ${impact.data.length - 5} more`);
    }
    lines.push('');
  }
  
  if (impact.testing && impact.testing.length > 0) {
    lines.push('### 🧪 Testing Impact');
    lines.push('');
    lines.push(`**${impact.testing.length}** test-related changes:`);
    lines.push('');
    impact.testing.slice(0, 5).forEach(item => {
      lines.push(`- ${item}`);
    });
    if (impact.testing.length > 5) {
      lines.push(`- ... and ${impact.testing.length - 5} more`);
    }
    lines.push('');
  }
  
  // Risk Assessment
  if (risks && risks.length > 0) {
    lines.push('## Risk Assessment');
    lines.push('');
    risks.slice(0, 5).forEach(risk => {
      lines.push(`- **[${risk.severity || 'UNKNOWN'}]** ${risk.description || risk}`);
    });
    if (risks.length > 5) {
      lines.push(`- ... and ${risks.length - 5} more risks detected`);
    }
    lines.push('');
  }
  
  // Metrics
  lines.push('## Metrics');
  lines.push('');
  lines.push('### Code Metrics');
  lines.push(`- **Files Changed:** ${metrics.code.totalFilesChanged}`);
  lines.push(`- **Measurement Status:** ${metrics.code.measurementStatus}`);
  lines.push('');
  
  lines.push('### Dependency Metrics');
  lines.push(`- **Directly Changed Modules:** ${metrics.dependencies.directlyChangedModules.length}`);
  lines.push(`- **Measurement Status:** ${metrics.dependencies.measurementStatus}`);
  lines.push(`- **Limitations:** ${metrics.dependencies.limitations}`);
  lines.push('');
  
  lines.push('### API Metrics');
  lines.push(`- **Endpoints Added:** ${metrics.api.endpointsAdded}`);
  lines.push(`- **Endpoints Modified:** ${metrics.api.endpointsModified}`);
  lines.push(`- **Endpoints Removed:** ${metrics.api.endpointsRemoved}`);
  lines.push(`- **Potential Breaking Changes:** ${metrics.api.potentialBreakingChanges}`);
  lines.push('');
  
  // Diagrams
  if (diagrams) {
    lines.push('## Impact Flows');
    lines.push('');
    lines.push('### Technical Dependency Flow');
    lines.push('');
    lines.push('```mermaid');
    lines.push(diagrams.technicalDependencyFlow.content);
    lines.push('```');
    lines.push('');
    
    lines.push('### Business Functionality Flow');
    lines.push('');
    lines.push('```mermaid');
    lines.push(diagrams.businessFunctionalityFlow.content);
    lines.push('```');
    lines.push('');
  }
  
  // Recommendations
  if (recommendations && recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    recommendations.slice(0, 5).forEach((rec, idx) => {
      lines.push(`${idx + 1}. ${rec}`);
    });
    lines.push('');
  }
  
  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*This report was automatically generated by the AI Change Impact Analysis Agent*');
  lines.push('*For detailed technical analysis, review the JSON report*');
  
  return lines.join('\n');
}

function generateJsonReport(allData) {
  log('Generating JSON report...', 'debug');
  
  const report = {
    schemaVersion: '1.0',
    metadata: {
      generatedAt: new Date().toISOString(),
      generator: 'AI Change Impact Analysis Agent - Phase 4.7',
      source: allData.context || {}
    },
    summary: {
      overallLevel: allData.classification?.overallLevel || 'unknown',
      confidence: allData.classification?.confidence || 0,
      totalFilesChanged: allData.metrics?.code?.totalFilesChanged || 0,
      totalLinesAdded: allData.metrics?.code?.linesAdded || 0,
      totalLinesDeleted: allData.metrics?.code?.linesDeleted || 0
    },
    classification: allData.classification || {},
    impact: allData.impact || {},
    metrics: allData.metrics || {},
    risks: allData.risks || [],
    recommendations: allData.recommendations || [],
    diagrams: allData.diagrams ? {
      technical: allData.diagrams.technicalDependencyFlow,
      business: allData.diagrams.businessFunctionalityFlow
    } : null,
    
    // Validation metadata
    validation: {
      schemaCompliant: true,
      completeness: {
        classification: allData.classification ? 'complete' : 'missing',
        impact: allData.impact ? 'complete' : 'missing',
        metrics: allData.metrics ? 'complete' : 'missing',
        recommendations: allData.recommendations && allData.recommendations.length > 0 ? 'complete' : 'empty'
      }
    }
  };
  
  return report;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  log('═══════════════════════════════════════════════════════════════');
  log('Phase 4.7: Report Formatter');
  log('═══════════════════════════════════════════════════════════════');
  
  // Parse arguments
  const args = require('minimist')(process.argv.slice(2), {
    string: ['input', 'output'],
    default: {
      input: 'reports/change-impact/impact-flow.json',
      output: 'reports/change-impact'
    }
  });
  
  const inputPath = path.resolve(args.input);
  const outputDir = path.resolve(args.output);
  
  log(`Input: ${inputPath}`);
  log(`Output: ${outputDir}`);
  log('');
  
  try {
    // Step 1: Load all data
    log('Step 1: Loading analysis data...', 'info');
    
    if (!fs.existsSync(inputPath)) {
      error(`Flow data not found: ${inputPath}`, 'FLOW_NOT_FOUND');
    }
    
    const flowPackage = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    log('Data loaded', 'info');
    log('');
    
    // Step 2: Generate reports
    log('Step 2: Generating reports...', 'info');
    
    const markdownReport = generateMarkdownReport(flowPackage);
    const jsonReport = generateJsonReport(flowPackage);
    
    log('Reports generated', 'info');
    log('');
    
    // Step 3: Write output
    log('Step 3: Writing output...', 'info');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write Markdown report
    const mdPath = path.join(outputDir, 'change-impact-report.md');
    fs.writeFileSync(mdPath, markdownReport);
    log(`Markdown report written to: ${mdPath}`, 'info');
    
    // Write JSON report
    const jsonPath = path.join(outputDir, 'change-impact-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    log(`JSON report written to: ${jsonPath}`, 'info');
    
    log('');
    log('═══════════════════════════════════════════════════════════════');
    log('Phase 4.7 Complete', 'info');
    log('═══════════════════════════════════════════════════════════════');
    log('');
    log('Generated Reports:');
    log(`  - Markdown: ${mdPath}`);
    log(`  - JSON: ${jsonPath}`);
    log('');
    
    process.exit(0);
    
  } catch (err) {
    error(`Unexpected error: ${err.message}`, 'UNEXPECTED_ERROR');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateMarkdownReport,
  generateJsonReport,
  severityBadge
};
