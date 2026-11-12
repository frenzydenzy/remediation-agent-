#!/usr/bin/env node

/**
 * Phase 4.1: PR Scope Collector
 * 
 * Purpose: Validate repository, base/head references, and collect committed diff
 * 
 * Validates:
 *   - Repository exists and is a Git repository
 *   - Base/target reference is valid
 *   - Head/source reference is valid
 *   - Merge-base can be calculated
 *   - No uncommitted changes included
 * 
 * Collects:
 *   - File inventory with change status
 *   - Diff statistics (additions/deletions)
 *   - PR metadata
 * 
 * Fails-closed: Invalid or ambiguous refs stop analysis with clear error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// Configuration
// ============================================================================

const config = {
  maxDiffLines: 10000,
  maxContextSize: 4194304,  // 4 MB
  avgBytesPerLine: 100
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

function validateRepository(repoPath) {
  log(`Validating repository: ${repoPath}`, 'debug');
  
  if (!fs.existsSync(repoPath)) {
    error(`Repository path does not exist: ${repoPath}`, 'REPO_NOT_FOUND');
  }
  
  const gitDir = path.join(repoPath, '.git');
  if (!fs.existsSync(gitDir)) {
    error(`Not a Git repository: ${repoPath}`, 'NOT_A_GIT_REPO');
  }
  
  // Verify Git works in this directory
  const gitTest = git('git rev-parse --git-dir', { cwd: repoPath, failSilent: true });
  if (!gitTest) {
    error(`Git repository is corrupted or inaccessible: ${repoPath}`, 'GIT_REPO_INVALID');
  }
  
  log(`Repository validated`, 'debug');
}

function resolveReference(ref, repoPath) {
  log(`Resolving reference: ${ref}`, 'debug');
  
  if (!ref) {
    error(`Reference is empty or null`, 'INVALID_REFERENCE');
  }
  
  // Try to resolve to SHA
  const sha = git(`git rev-parse ${ref}`, {
    cwd: repoPath,
    failSilent: true,
    silent: true
  });
  
  if (!sha || sha.length < 40) {
    error(
      `Cannot resolve reference: ${ref}\n` +
      `Make sure the branch exists and is accessible.`,
      'INVALID_REFERENCE'
    );
  }
  
  log(`Reference resolved: ${ref} → ${sha.substring(0, 8)}`, 'debug');
  return sha;
}

function getMergeBase(baseSha, headSha, repoPath) {
  log(`Finding merge-base between ${baseSha.substring(0, 8)} and ${headSha.substring(0, 8)}`, 'debug');
  
  const mergeBase = git(`git merge-base ${baseSha} ${headSha}`, {
    cwd: repoPath,
    failSilent: true,
    silent: true
  });
  
  if (!mergeBase || mergeBase.length < 40) {
    error(`Cannot find merge-base. Commits may not be related.`, 'INVALID_MERGE_BASE');
  }
  
  log(`Merge-base: ${mergeBase.substring(0, 8)}`, 'debug');
  return mergeBase;
}

function validateNoUncommittedChanges(repoPath) {
  log(`Checking for uncommitted changes`, 'debug');
  
  const status = git(`git status --porcelain`, { cwd: repoPath, silent: true });
  
  if (status && status.length > 0) {
    const lines = status.split('\n').filter(l => l.trim());
    error(
      `Repository has uncommitted changes (${lines.length} files).\n` +
      `Analysis requires clean working tree.\n` +
      `Commit, stash, or discard changes before analyzing.`,
      'UNCOMMITTED_CHANGES'
    );
  }
  
  log(`No uncommitted changes`, 'debug');
}

function collectDiffStatistics(baseSha, headSha, repoPath) {
  log(`Collecting diff between ${baseSha.substring(0, 8)} and ${headSha.substring(0, 8)}`, 'debug');
  
  // Get diff name-status (for change types)
  const nameStatus = git(
    `git diff --name-status ${baseSha} ${headSha}`,
    { cwd: repoPath, silent: true }
  );
  
  // Get diff stat (for line counts)
  const diffStat = git(
    `git diff --numstat ${baseSha} ${headSha}`,
    { cwd: repoPath, silent: true }
  );
  
  if (!nameStatus || !diffStat) {
    error(`Cannot collect diff statistics`, 'DIFF_COLLECTION_FAILED');
  }
  
  // Parse name-status for file status
  const fileStatus = new Map();
  nameStatus.split('\n').filter(l => l.trim()).forEach(line => {
    const parts = line.split('\t');
    const status = parts[0];
    const path = parts[parts.length - 1];
    const prevPath = parts[parts.length - 2];
    
    fileStatus.set(path, {
      status: mapGitStatus(status),
      path,
      previousPath: status === 'R' ? prevPath : null
    });
  });
  
  // Parse numstat for line counts
  const diffStats = [];
  const lineDetails = new Map();
  
  diffStat.split('\n').filter(l => l.trim()).forEach(line => {
    const parts = line.split('\t');
    const additions = parseInt(parts[0], 10) || 0;
    const deletions = parseInt(parts[1], 10) || 0;
    const filePath = parts[2];
    
    lineDetails.set(filePath, { additions, deletions });
  });
  
  // Combine status and line info
  for (const [filePath, status] of fileStatus.entries()) {
    const lines = lineDetails.get(filePath) || { additions: 0, deletions: 0 };
    diffStats.push({
      path: filePath,
      status: status.status,
      previousPath: status.previousPath,
      additions: lines.additions,
      deletions: lines.deletions
    });
  }
  
  // Validate diff size
  const totalLines = diffStats.reduce((sum, f) => sum + f.additions + f.deletions, 0);
  if (totalLines > config.maxDiffLines) {
    error(
      `Diff too large: ${totalLines} lines (max ${config.maxDiffLines})`,
      'DIFF_TOO_LARGE'
    );
  }
  
  log(`Diff collected: ${diffStats.length} files, ${totalLines} total lines`, 'debug');
  
  return {
    files: diffStats,
    statistics: {
      totalFiles: diffStats.length,
      filesAdded: diffStats.filter(f => f.status === 'added').length,
      filesModified: diffStats.filter(f => f.status === 'modified').length,
      filesDeleted: diffStats.filter(f => f.status === 'deleted').length,
      filesRenamed: diffStats.filter(f => f.status === 'renamed').length,
      totalLinesAdded: diffStats.reduce((sum, f) => sum + f.additions, 0),
      totalLinesDeleted: diffStats.reduce((sum, f) => sum + f.deletions, 0),
      totalLinesChanged: totalLines
    }
  };
}

function mapGitStatus(status) {
  const statusMap = {
    'A': 'added',
    'M': 'modified',
    'D': 'deleted',
    'R': 'renamed',
    'C': 'copied',
    'T': 'type_changed',
    'U': 'unmerged',
    'X': 'unknown'
  };
  return statusMap[status] || status;
}

function getRepositoryName(repoPath) {
  return path.basename(path.resolve(repoPath));
}

function getRepositoryUrl(repoPath) {
  const remoteUrl = git(`git config --get remote.origin.url`, {
    cwd: repoPath,
    failSilent: true,
    silent: true
  });
  
  if (!remoteUrl) return null;
  
  // Normalize SSH to HTTPS for GitHub/GitLab
  if (remoteUrl.includes('@github.com:') || remoteUrl.includes('github.com/')) {
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    if (match) {
      return `https://github.com/${match[1]}/${match[2]}`;
    }
  }
  
  if (remoteUrl.includes('@gitlab.com:') || remoteUrl.includes('gitlab.com/')) {
    const match = remoteUrl.match(/gitlab\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    if (match) {
      return `https://gitlab.com/${match[1]}/${match[2]}`;
    }
  }
  
  return remoteUrl;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  log('═══════════════════════════════════════════════════════════════');
  log('Phase 4.1: PR Scope Collector');
  log('═══════════════════════════════════════════════════════════════');
  
  // Parse arguments
  const args = require('minimist')(process.argv.slice(2), {
    string: ['repo', 'base', 'head', 'output'],
    default: {
      repo: '.',
      base: 'origin/main',
      head: 'HEAD',
      output: 'reports/change-impact'
    }
  });
  
  const repoPath = path.resolve(args.repo);
  const baseRef = args.base;
  const headRef = args.head;
  const outputDir = path.resolve(args.output);
  
  log(`Repository: ${repoPath}`);
  log(`Base reference: ${baseRef}`);
  log(`Head reference: ${headRef}`);
  log(`Output: ${outputDir}`);
  log('');
  
  try {
    // Step 1: Validate repository
    log('Step 1: Validating repository...', 'info');
    validateRepository(repoPath);
    log('Repository valid', 'info');
    log('');
    
    // Step 2: Validate no uncommitted changes
    log('Step 2: Checking working tree...', 'info');
    validateNoUncommittedChanges(repoPath);
    log('Working tree clean', 'info');
    log('');
    
    // Step 3: Resolve references
    log('Step 3: Resolving references...', 'info');
    const baseSha = resolveReference(baseRef, repoPath);
    const headSha = resolveReference(headRef, repoPath);
    
    if (baseSha === headSha) {
      error(`Base and head are identical. No changes to analyze.`, 'IDENTICAL_REFS');
    }
    
    log('References resolved', 'info');
    log('');
    
    // Step 4: Get merge-base
    log('Step 4: Finding merge-base...', 'info');
    const mergeBaseSha = getMergeBase(baseSha, headSha, repoPath);
    log('Merge-base found', 'info');
    log('');
    
    // Step 5: Collect diff
    log('Step 5: Collecting changes...', 'info');
    const diffResult = collectDiffStatistics(baseSha, headSha, repoPath);
    log(`Changes collected: ${diffResult.statistics.totalFiles} files`, 'info');
    log(`  Added:    ${diffResult.statistics.filesAdded}`);
    log(`  Modified: ${diffResult.statistics.filesModified}`);
    log(`  Deleted:  ${diffResult.statistics.filesDeleted}`);
    log(`  Lines +   ${diffResult.statistics.totalLinesAdded}`);
    log(`  Lines -   ${diffResult.statistics.totalLinesDeleted}`);
    log('');
    
    // Step 6: Build output
    log('Step 6: Building output...', 'info');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const output = {
      schemaVersion: '1.0',
      collectedAt: new Date().toISOString(),
      phase: '4.1',
      repository: {
        path: repoPath,
        name: getRepositoryName(repoPath),
        url: getRepositoryUrl(repoPath)
      },
      references: {
        base: {
          input: baseRef,
          sha: baseSha
        },
        head: {
          input: headRef,
          sha: headSha
        },
        mergeBase: {
          sha: mergeBaseSha
        }
      },
      diff: {
        files: diffResult.files,
        statistics: diffResult.statistics
      },
      validation: {
        repositoryValid: true,
        workingTreeClean: true,
        referencesResolved: true,
        diffCollected: true
      }
    };
    
    // Write output
    const outputPath = path.join(outputDir, 'context-package.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    log(`Output written to: ${outputPath}`, 'info');
    log('');
    log('═══════════════════════════════════════════════════════════════');
    log('Phase 4.1 Complete', 'info');
    log('═══════════════════════════════════════════════════════════════');
    
    process.exit(0);
    
  } catch (err) {
    if (err.code && err.code.startsWith('PHASE_')) {
      error(err.message, err.code);
    }
    error(`Unexpected error: ${err.message}`, 'UNEXPECTED_ERROR');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateRepository,
  resolveReference,
  getMergeBase,
  collectDiffStatistics,
  validateNoUncommittedChanges
};
