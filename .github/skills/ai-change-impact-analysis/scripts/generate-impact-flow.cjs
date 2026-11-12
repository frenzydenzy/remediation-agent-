#!/usr/bin/env node

/**
 * Phase 4.6: Impact Flow Generator
 * 
 * Purpose: Generate Mermaid diagrams showing technical and business flows
 * 
 * Produces:
 *   - Technical dependency flow (changed components and relationships)
 *   - Business functionality flow (affected workflows)
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

// ============================================================================
// Diagram Generation
// ============================================================================

function generateTechnicalFlow(changedFiles, metrics) {
  log('Generating technical dependency flow...', 'debug');
  
  const lines = [
    'graph TD',
    '    classDef changed fill:#ff6b6b,stroke:#c92a2a,color:#fff',
    '    classDef dependent fill:#4c6ef5,stroke:#1c7ed6,color:#fff',
    '    classDef external fill:#adb5bd,stroke:#495057,color:#fff',
    ''
  ];
  
  // Add changed files
  const fileNodes = [];
  changedFiles.forEach((file, idx) => {
    const nodeId = `F${idx}`;
    const label = path.basename(file);
    fileNodes.push({ id: nodeId, file, label });
    lines.push(`    ${nodeId}["${label}"]:::changed`);
  });
  
  // Add relationships (simplified for demo)
  if (fileNodes.length > 1) {
    for (let i = 0; i < fileNodes.length - 1; i++) {
      lines.push(`    ${fileNodes[i].id} --> ${fileNodes[i + 1].id}`);
    }
  }
  
  // Add dependents if any
  if (metrics.dependencies && metrics.dependencies.discoveredDirectDependents > 0) {
    const depNodeId = 'DEP1';
    lines.push(`    ${depNodeId}["Discovered Dependents"]:::dependent`);
    if (fileNodes.length > 0) {
      lines.push(`    ${fileNodes[0].id} --> ${depNodeId}`);
    }
  }
  
  // Add legend
  lines.push('');
  lines.push('    subgraph Legend');
  lines.push('        L1["🔴 Directly Changed"]:::changed');
    lines.push('        L2["🔵 Discovered Dependents"]:::dependent');
    lines.push('        L3["⚫ External/Unknown"]:::external');
    lines.push('    end');
  
  return lines.join('\n');
}

function generateBusinessFlow(impact, classification) {
  log('Generating business functionality flow...', 'debug');
  
  const lines = [
    'graph TD',
    '    classDef critical fill:#fa5252,stroke:#c92a2a,color:#fff',
    '    classDef major fill:#ff8787,stroke:#e03131,color:#fff',
    '    classDef moderate fill:#ffa94d,stroke:#f76707,color:#fff',
    '    classDef minor fill:#b3e5fc,stroke:#0277bd,color:#fff',
    ''
  ];
  
  // Determine impact by level
  let impactCount = 0;
  
  // Critical impacts
  if (impact.security && impact.security.length > 0) {
    lines.push(`    SEC["🔐 Security Impacted<br/>${impact.security.length} items"]:::critical`);
    impactCount++;
  }
  
  // API impacts
  if (impact.api && impact.api.length > 0) {
    lines.push(`    API["🔌 API Changed<br/>${impact.api.length} items"]:::major`);
    impactCount++;
  }
  
  // Data impacts
  if (impact.data && impact.data.length > 0) {
    lines.push(`    DATA["💾 Data Model Changed<br/>${impact.data.length} items"]:::major`);
    impactCount++;
  }
  
  // Functional impacts
  if (impact.functional && impact.functional.length > 0) {
    lines.push(`    FUNC["⚙️  Functionality Changed<br/>${impact.functional.length} items"]:::moderate`);
    impactCount++;
  }
  
  // Testing impacts
  if (impact.testing && impact.testing.length > 0) {
    lines.push(`    TEST["🧪 Test Coverage Changed<br/>${impact.testing.length} items"]:::minor`);
    impactCount++;
  }
  
  // Add flow
  if (impactCount > 0) {
    lines.push('');
    lines.push('    START["PR Changes"]');
    if (impact.security && impact.security.length > 0) {
      lines.push('    START --> SEC');
    }
    if (impact.api && impact.api.length > 0) {
      lines.push('    START --> API');
    }
    if (impact.data && impact.data.length > 0) {
      lines.push('    START --> DATA');
    }
    if (impact.functional && impact.functional.length > 0) {
      lines.push('    START --> FUNC');
    }
    if (impact.testing && impact.testing.length > 0) {
      lines.push('    START --> TEST');
    }
    
    lines.push('');
    lines.push(`    END["Review Recommendation: ${classification.overallLevel.toUpperCase()}"]`);
    lines.push('');
    
    // Connect to end
    if (impact.security && impact.security.length > 0) {
      lines.push('    SEC --> END');
    } else if (impact.api && impact.api.length > 0) {
      lines.push('    API --> END');
    } else if (impact.data && impact.data.length > 0) {
      lines.push('    DATA --> END');
    } else if (impact.functional && impact.functional.length > 0) {
      lines.push('    FUNC --> END');
    } else if (impact.testing && impact.testing.length > 0) {
      lines.push('    TEST --> END');
    }
  }
  
  // Add legend
  lines.push('');
  lines.push('    subgraph Legend');
  lines.push('        LC["🔴 Critical Impact"]:::critical');
    lines.push('        LM["🟠 Major Impact"]:::major');
    lines.push('        LT["🟡 Moderate Impact"]:::moderate');
    lines.push('        LN["🟢 Minor Impact"]:::minor');
    lines.push('    end');
  
  return lines.join('\n');
}

// ============================================================================
// Main
// ============================================================================

function main() {
  log('═══════════════════════════════════════════════════════════════');
  log('Phase 4.6: Impact Flow Generator');
  log('═══════════════════════════════════════════════════════════════');
  
  // Parse arguments
  const args = require('minimist')(process.argv.slice(2), {
    string: ['input', 'output'],
    default: {
      input: 'reports/change-impact/analysis.json',
      output: 'reports/change-impact'
    }
  });
  
  const inputPath = path.resolve(args.input);
  const outputDir = path.resolve(args.output);
  
  log(`Input: ${inputPath}`);
  log(`Output: ${outputDir}`);
  log('');
  
  try {
    // Step 1: Load analysis
    log('Step 1: Loading analysis results...', 'info');
    
    if (!fs.existsSync(inputPath)) {
      error(`Analysis not found: ${inputPath}`, 'ANALYSIS_NOT_FOUND');
    }
    
    const analysisPackage = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    log(`Loaded analysis: ${analysisPackage.analysis.totalFiles} files changed`, 'info');
    log('');
    
    // Step 2: Generate flows
    log('Step 2: Generating Mermaid diagrams...', 'info');
    
    const changedFiles = analysisPackage.context.diff.files
      .filter(f => f.status !== 'deleted')
      .map(f => f.path);
    
    const technicalFlow = generateTechnicalFlow(changedFiles, analysisPackage.metrics);
    const businessFlow = generateBusinessFlow(analysisPackage.impact, analysisPackage.classification);
    
    log('Diagrams generated', 'info');
    log('');
    
    // Step 3: Generate output
    log('Step 3: Generating output...', 'info');
    
    const output = {
      schemaVersion: '1.0',
      collectedAt: new Date().toISOString(),
      phase: '4.6',
      
      context: analysisPackage.context,
      classification: analysisPackage.classification,
      
      diagrams: {
        technicalDependencyFlow: {
          format: 'mermaid',
          description: 'Technical dependency flow showing changed components and their relationships',
          content: technicalFlow
        },
        businessFunctionalityFlow: {
          format: 'mermaid',
          description: 'Business functionality flow showing impact on workflows and features',
          content: businessFlow
        }
      },
      
      metrics: analysisPackage.metrics,
      impact: analysisPackage.impact,
      risks: analysisPackage.risks
    };
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write JSON output
    const jsonPath = path.join(outputDir, 'impact-flow.json');
    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
    log(`JSON output written to: ${jsonPath}`, 'info');
    
    // Write Mermaid diagrams as separate files
    const techDiagramPath = path.join(outputDir, 'technical-impact.mmd');
    fs.writeFileSync(techDiagramPath, technicalFlow);
    log(`Technical diagram written to: ${techDiagramPath}`, 'info');
    
    const busDiagramPath = path.join(outputDir, 'business-impact.mmd');
    fs.writeFileSync(busDiagramPath, businessFlow);
    log(`Business diagram written to: ${busDiagramPath}`, 'info');
    
    log('');
    log('═══════════════════════════════════════════════════════════════');
    log('Phase 4.6 Complete', 'info');
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
  generateTechnicalFlow,
  generateBusinessFlow
};
