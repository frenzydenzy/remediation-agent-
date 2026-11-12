#!/usr/bin/env node

/**
 * Phase 4.8: Workflow Integration
 * 
 * Purpose: CLI entry point and GitHub Actions workflow support
 * 
 * Features:
 *   - Full pipeline orchestration
 *   - Argument parsing and validation
 *   - GitHub Actions integration
 *   - Error handling and reporting
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

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function isGitHubActions() {
  return process.env.GITHUB_ACTIONS === 'true';
}

// ============================================================================
// Phase Execution
// ============================================================================

function executePhase(phaseName, scriptPath, args = {}) {
  log(`Executing ${phaseName}...`, 'debug');
  
  const argArray = [];
  for (const [key, value] of Object.entries(args)) {
    argArray.push(`--${key}`);
    argArray.push(value.toString());
  }
  
  try {
    const command = `node ${scriptPath} ${argArray.join(' ')}`;
    log(`Command: ${command}`, 'debug');
    
    execSync(command, {
      stdio: 'inherit',
      cwd: path.dirname(scriptPath)
    });
    
    log(`${phaseName} completed`, 'info');
    return true;
  } catch (err) {
    log(`${phaseName} failed: ${err.message}`, 'error');
    return false;
  }
}

function runPipeline(repoPath, baseBranch, headRef, outputDir, skipPhases = []) {
  log('═══════════════════════════════════════════════════════════════');
  log('Change Impact Analysis Pipeline');
  log('═══════════════════════════════════════════════════════════════');
  log(`Repository: ${repoPath}`);
  log(`Base Branch: ${baseBranch}`);
  log(`Head Ref: ${headRef}`);
  log(`Output: ${outputDir}`);
  log('');
  
  ensureDir(outputDir);
  
  const skillDir = path.resolve(__dirname, '..');
  const phases = [
    {
      name: 'Phase 4.1: Collect PR Changes',
      script: path.join(skillDir, 'scripts', 'collect-pr-changes.cjs'),
      args: { repo: repoPath, base: baseBranch, head: headRef, output: outputDir }
    },
    {
      name: 'Phase 4.2: Build Snapshots',
      script: path.join(skillDir, 'scripts', 'build-snapshots.cjs'),
      args: { input: path.join(outputDir, 'context.json'), output: outputDir, repo: repoPath }
    },
    {
      name: 'Phase 4.3: Classify Changes',
      script: path.join(skillDir, 'scripts', 'classify-changes.cjs'),
      args: { input: path.join(outputDir, 'snapshots.json'), output: outputDir }
    },
    {
      name: 'Phase 4.4-4.5: Analyze & Calculate Metrics',
      script: path.join(skillDir, 'scripts', 'analyze-impact.cjs'),
      args: { input: path.join(outputDir, 'classification.json'), output: outputDir, repo: repoPath }
    },
    {
      name: 'Phase 4.6: Generate Impact Flow',
      script: path.join(skillDir, 'scripts', 'generate-impact-flow.cjs'),
      args: { input: path.join(outputDir, 'analysis.json'), output: outputDir }
    },
    {
      name: 'Phase 4.7: Format Report',
      script: path.join(skillDir, 'scripts', 'format-report.cjs'),
      args: { input: path.join(outputDir, 'impact-flow.json'), output: outputDir }
    }
  ];
  
  const results = [];
  for (const phase of phases) {
    if (skipPhases.includes(phase.name)) {
      log(`Skipping ${phase.name}`, 'warn');
      continue;
    }
    
    if (!fs.existsSync(phase.script)) {
      log(`Script not found: ${phase.script}`, 'warn');
      continue;
    }
    
    const success = executePhase(phase.name, phase.script, phase.args);
    results.push({ phase: phase.name, success });
    
    if (!success) {
      log(`Pipeline stopped due to ${phase.name} failure`, 'error');
      return results;
    }
  }
  
  log('');
  log('═══════════════════════════════════════════════════════════════');
  log('Pipeline Complete', 'info');
  log('═══════════════════════════════════════════════════════════════');
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log(`Phases Executed: ${results.length}`);
  log(`Passed: ${passed}`);
  log(`Failed: ${failed}`);
  log('');
  
  // Output files
  const reportMd = path.join(outputDir, 'change-impact-report.md');
  const reportJson = path.join(outputDir, 'change-impact-report.json');
  
  if (fs.existsSync(reportMd)) {
    log(`Report (Markdown): ${reportMd}`, 'info');
  }
  if (fs.existsSync(reportJson)) {
    log(`Report (JSON): ${reportJson}`, 'info');
  }
  
  return results;
}

function setGitHubOutput(key, value) {
  if (isGitHubActions()) {
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      fs.appendFileSync(outputFile, `${key}=${value}\n`);
      log(`GitHub output: ${key}=${value}`, 'debug');
    }
  }
}

function setGitHubSummary(title, summary) {
  if (isGitHubActions()) {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) {
      const content = `## ${title}\n\n${summary}\n`;
      fs.appendFileSync(summaryFile, content);
      log(`GitHub summary updated: ${title}`, 'debug');
    }
  }
}

// ============================================================================
// CLI
// ============================================================================

function printUsage() {
  console.log(`
Usage: change-impact-agent [OPTIONS]

OPTIONS:
  --repo, -r          Repository path (default: .)
  --base              Base branch (default: main)
  --head              Head reference (default: HEAD)
  --output, -o        Output directory (default: reports/change-impact)
  --skip              Skip phases (comma-separated)
  --help, -h          Show this help message

EXAMPLES:
  # Analyze changes from main to HEAD
  change-impact-agent --repo . --base main --head HEAD

  # Generate reports to custom location
  change-impact-agent --output ./analysis-reports

  # Skip format-report phase
  change-impact-agent --skip "Phase 4.7: Format Report"

GitHub Actions Integration:
  Automatically detects GitHub Actions environment and:
  - Sets output variables (IMPACT_LEVEL, REPORT_PATH)
  - Updates job summary with findings
  - Exits with appropriate status codes
`);
}

function main() {
  const args = require('minimist')(process.argv.slice(2), {
    alias: {
      r: 'repo',
      o: 'output',
      h: 'help'
    },
    string: ['repo', 'base', 'head', 'output', 'skip'],
    boolean: ['help'],
    default: {
      repo: '.',
      base: 'main',
      head: 'HEAD',
      output: 'reports/change-impact'
    }
  });
  
  if (args.help) {
    printUsage();
    process.exit(0);
  }
  
  const repoPath = path.resolve(args.repo);
  const baseBranch = args.base;
  const headRef = args.head;
  const outputDir = path.resolve(args.output);
  const skipPhases = args.skip ? args.skip.split(',').map(s => s.trim()) : [];
  
  // Validate repo
  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    error(`Not a Git repository: ${repoPath}`, 'NOT_A_GIT_REPO');
  }
  
  try {
    const results = runPipeline(repoPath, baseBranch, headRef, outputDir, skipPhases);
    
    // GitHub Actions integration
    if (isGitHubActions()) {
      const reportJson = path.join(outputDir, 'change-impact-report.json');
      if (fs.existsSync(reportJson)) {
        const report = JSON.parse(fs.readFileSync(reportJson, 'utf-8'));
        
        setGitHubOutput('IMPACT_LEVEL', report.summary.overallLevel);
        setGitHubOutput('CONFIDENCE', report.summary.confidence.toString());
        setGitHubOutput('FILES_CHANGED', report.summary.totalFilesChanged.toString());
        setGitHubOutput('REPORT_PATH', reportJson);
        
        setGitHubSummary('Change Impact Analysis', `
**Overall Impact:** ${report.summary.overallLevel.toUpperCase()}
**Confidence:** ${report.summary.confidence}%
**Files Changed:** ${report.summary.totalFilesChanged}
**Lines Added:** ${report.summary.totalLinesAdded}
**Lines Deleted:** ${report.summary.totalLinesDeleted}

[View Full Report](file://${reportJson})
        `);
      }
    }
    
    // Exit with appropriate code
    const failed = results.filter(r => !r.success).length;
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (err) {
    error(`Pipeline error: ${err.message}`, 'PIPELINE_ERROR');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runPipeline,
  executePhase,
  setGitHubOutput,
  setGitHubSummary,
  isGitHubActions
};
