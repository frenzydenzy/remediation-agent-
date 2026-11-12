#!/usr/bin/env node

/**
 * Phase 4.2: Snapshot Builder & Context Discovery
 * 
 * Purpose: Collect before/after file content and discover repository context
 * 
 * Responsibilities:
 *   - Load context package from Phase 4.1
 *   - Retrieve before/after content for changed files
 *   - Extract language-aware symbols (imports, exports, classes, functions)
 *   - Discover dependencies and usage patterns
 *   - Build symbol index for analysis
 * 
 * Constraints:
 *   - Max file size: 1 MB per file
 *   - Max aggregate context: 4 MB
 *   - Language-aware parsing for JavaScript/TypeScript/Python
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// Configuration
// ============================================================================

const config = {
  maxFileSize: 1048576,         // 1 MB per file
  maxAggregateSize: 4194304,    // 4 MB total
  supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'go'],
  importPatterns: {
    javascript: /(?:import|require)\s*(?:{[^}]*}|['\"][^'"]*['\"])/g,
    typescript: /(?:import|require)\s*(?:{[^}]*}|['\"][^'"]*['\"])/g,
    python: /(?:from|import)\s+[\w.]+/g,
    java: /import\s+[\w.]+/g,
    go: /import\s+[(\s]*"[^"]*"[)\s]*/g
  },
  exportPatterns: {
    javascript: /export\s+(?:(?:default|const|function|class)\s+)?(\w+)/g,
    typescript: /export\s+(?:(?:default|const|function|class|interface|type)\s+)?(\w+)/g,
    python: /^def\s+(\w+)/gm,
    java: /(?:public|protected)\s+(?:static\s+)?(?:class|interface|enum)\s+(\w+)/g,
    go: /^func\s+\(?[\w*\s]*\)?\s*(\w+)/gm
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

function git(command, options = {}) {
  try {
    const result = execSync(command, {
      cwd: options.cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', options.silent ? 'pipe' : 'inherit']
    });
    return result.trim();
  } catch (err) {
    if (options.failSilent) return null;
    error(`Git command failed: ${command}\n${err.message}`, 'GIT_COMMAND_FAILED');
  }
}

function getFileContent(repoPath, ref, filePath) {
  log(`Retrieving ${filePath} from ${ref}`, 'debug');
  
  try {
    const content = git(`git show ${ref}:${filePath}`, {
      cwd: repoPath,
      silent: true
    });
    return content || null;
  } catch (err) {
    log(`Could not retrieve ${filePath} from ${ref}`, 'warn');
    return null;
  }
}

function getFileSize(content) {
  return Buffer.byteLength(content || '', 'utf-8');
}

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const extMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rb': 'ruby',
    '.php': 'php',
    '.cs': 'csharp'
  };
  
  return extMap[ext] || null;
}

function extractImports(content, language) {
  if (!content || !config.importPatterns[language]) {
    return [];
  }
  
  const pattern = config.importPatterns[language];
  const matches = content.match(pattern) || [];
  
  return matches.map(m => ({
    raw: m,
    type: 'import',
    language
  }));
}

function extractExports(content, language) {
  if (!content || !config.exportPatterns[language]) {
    return [];
  }
  
  const pattern = config.exportPatterns[language];
  const matches = content.match(pattern) || [];
  
  return matches.map((m, idx) => ({
    name: m.split(/[\s(]+/)[1] || `export_${idx}`,
    raw: m,
    type: 'export',
    language
  })).filter(e => e.name);
}

function extractSymbols(content, language) {
  if (!content || !language) {
    return { imports: [], exports: [], classes: [], functions: [] };
  }
  
  return {
    imports: extractImports(content, language),
    exports: extractExports(content, language),
    classes: extractClasses(content, language),
    functions: extractFunctions(content, language)
  };
}

function extractClasses(content, language) {
  const classPatterns = {
    javascript: /(?:class|(?:const|let|var)\s+\w+\s*=\s*class)\s+(\w+)/g,
    typescript: /(?:class|interface|type|(?:const|let|var)\s+\w+\s*=\s*class)\s+(\w+)/g,
    python: /^class\s+(\w+)/gm,
    java: /(?:class|interface|enum)\s+(\w+)/g,
    go: /^type\s+(\w+)\s+(?:struct|interface)/gm
  };
  
  const pattern = classPatterns[language];
  if (!pattern) return [];
  
  const matches = content.match(pattern) || [];
  return matches.map((m, idx) => ({
    name: m.match(/\w+$/)[0],
    raw: m,
    type: 'class',
    language
  })).filter(c => c.name);
}

function extractFunctions(content, language) {
  const funcPatterns = {
    javascript: /(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:function|\()/g,
    typescript: /(?:(?:export\s+)?(?:function|async\s+function)|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:function|async\s*\(|\()/g,
    python: /^(?:async\s+)?def\s+(\w+)\s*\(/gm,
    java: /(?:public|private|protected|static)\s+.*?\s+(\w+)\s*\(/g,
    go: /^func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(/gm
  };
  
  const pattern = funcPatterns[language];
  if (!pattern) return [];
  
  const matches = content.match(pattern) || [];
  return matches.map((m, idx) => ({
    name: m.match(/\w+(?=\s*(?:\(|=))/)[0] || `func_${idx}`,
    raw: m,
    type: 'function',
    language
  })).filter(f => f.name);
}

function buildSymbolIndex(snapshots) {
  log('Building symbol index', 'debug');
  
  const index = {
    byFile: {},
    bySymbol: {},
    imports: [],
    exports: [],
    classes: [],
    functions: []
  };
  
  for (const [filePath, snapshot] of Object.entries(snapshots)) {
    const symbols = snapshot.symbols || { imports: [], exports: [], classes: [], functions: [] };
    
    index.byFile[filePath] = symbols;
    
    // Index by symbol name
    const allSymbols = [
      ...symbols.imports,
      ...symbols.exports,
      ...symbols.classes,
      ...symbols.functions
    ];
    
    for (const symbol of allSymbols) {
      const key = symbol.name || symbol.raw;
      if (!index.bySymbol[key]) {
        index.bySymbol[key] = [];
      }
      index.bySymbol[key].push({ file: filePath, symbol });
    }
    
    // Aggregate
    index.imports.push(...symbols.imports);
    index.exports.push(...symbols.exports);
    index.classes.push(...symbols.classes);
    index.functions.push(...symbols.functions);
  }
  
  log(`Symbol index built: ${Object.keys(index.bySymbol).length} unique symbols`, 'debug');
  return index;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  log('═══════════════════════════════════════════════════════════════');
  log('Phase 4.2: Snapshot Builder & Context Discovery');
  log('═══════════════════════════════════════════════════════════════');
  
  // Parse arguments
  const args = require('minimist')(process.argv.slice(2), {
    string: ['input', 'output', 'repo'],
    default: {
      input: 'reports/change-impact/context-package.json',
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
    // Step 1: Load context package
    log('Step 1: Loading context package from Phase 4.1...', 'info');
    
    if (!fs.existsSync(inputPath)) {
      error(`Context package not found: ${inputPath}`, 'CONTEXT_NOT_FOUND');
    }
    
    const contextPackage = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    log(`Loaded context: ${contextPackage.diff.files.length} files`, 'info');
    log('');
    
    // Step 2: Collect snapshots
    log('Step 2: Collecting file snapshots...', 'info');
    
    const baseSha = contextPackage.references.base.sha;
    const headSha = contextPackage.references.head.sha;
    const snapshots = {};
    let aggregateSize = 0;
    
    for (const file of contextPackage.diff.files) {
      const filePath = file.path;
      log(`Snapshot: ${filePath} (${file.status})`, 'debug');
      
      // Skip deleted files for content retrieval
      const beforeSha = file.status === 'added' ? null : baseSha;
      const afterSha = file.status === 'deleted' ? null : headSha;
      
      const beforeContent = beforeSha ? getFileContent(repoPath, beforeSha, filePath) : null;
      const afterContent = afterSha ? getFileContent(repoPath, afterSha, filePath) : null;
      
      // Check file sizes
      const beforeSize = getFileSize(beforeContent);
      const afterSize = getFileSize(afterContent);
      
      if (beforeSize > config.maxFileSize || afterSize > config.maxFileSize) {
        log(`${filePath} exceeds size limit, marking as oversized`, 'warn');
        snapshots[filePath] = {
          status: file.status,
          beforeSize,
          afterSize,
          oversized: true,
          beforeSummary: `File too large (${beforeSize} bytes)`,
          afterSummary: `File too large (${afterSize} bytes)`
        };
        continue;
      }
      
      aggregateSize += beforeSize + afterSize;
      if (aggregateSize > config.maxAggregateSize) {
        log(`Aggregate context limit exceeded, stopping collection`, 'warn');
        break;
      }
      
      // Detect language
      const language = detectLanguage(filePath);
      
      // Extract symbols
      const beforeSymbols = language ? extractSymbols(beforeContent, language) : null;
      const afterSymbols = language ? extractSymbols(afterContent, language) : null;
      
      // Create summary
      const beforeLines = (beforeContent || '').split('\n').length;
      const afterLines = (afterContent || '').split('\n').length;
      
      snapshots[filePath] = {
        status: file.status,
        language,
        beforeSize,
        afterSize,
        beforeLines,
        afterLines,
        before: beforeContent ? beforeContent.substring(0, 500) : null,
        after: afterContent ? afterContent.substring(0, 500) : null,
        symbols: language ? { before: beforeSymbols, after: afterSymbols } : null
      };
    }
    
    log(`Snapshots collected: ${Object.keys(snapshots).length} files, ${(aggregateSize / 1024).toFixed(2)} KB`, 'info');
    log('');
    
    // Step 3: Build symbol index
    log('Step 3: Building symbol index...', 'info');
    
    const symbolIndex = buildSymbolIndex(snapshots);
    log(`Index complete: ${Object.keys(symbolIndex.bySymbol).length} unique symbols`, 'info');
    log('');
    
    // Step 4: Generate output
    log('Step 4: Generating output...', 'info');
    
    const output = {
      schemaVersion: '1.0',
      collectedAt: new Date().toISOString(),
      phase: '4.2',
      
      context: {
        repository: contextPackage.repository,
        references: contextPackage.references,
        diffStatistics: contextPackage.diff.statistics
      },
      
      snapshots,
      
      symbolIndex: {
        totalSymbols: Object.keys(symbolIndex.bySymbol).length,
        totalImports: symbolIndex.imports.length,
        totalExports: symbolIndex.exports.length,
        totalClasses: symbolIndex.classes.length,
        totalFunctions: symbolIndex.functions.length,
        index: symbolIndex.bySymbol
      },
      
      metrics: {
        aggregateContextSize: aggregateSize,
        maxAggregateSize: config.maxAggregateSize,
        filesWithSymbols: Object.values(snapshots)
          .filter(s => s.symbols).length,
        oversizedFiles: Object.values(snapshots)
          .filter(s => s.oversized).length
      }
    };
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write output
    const outputPath = path.join(outputDir, 'snapshots.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    log(`Output written to: ${outputPath}`, 'info');
    log('');
    log('═══════════════════════════════════════════════════════════════');
    log('Phase 4.2 Complete', 'info');
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
  extractSymbols,
  extractImports,
  extractExports,
  buildSymbolIndex,
  detectLanguage,
  getFileContent,
  getFileSize
};
