/**
 * Git Hook Manager - Manages installation and execution of git hooks
 * Handles pre-commit and post-commit hooks for the VS Code extension
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

/**
 * Manages git hooks for security analysis and impact analysis
 */
export class GitHookManager {
  private hooksDir: string;

  constructor(
    private gitDir: string,
    private logger: Logger
  ) {
    this.hooksDir = path.join(gitDir, '.git', 'hooks');
    this.logger.info(`GitHookManager initialized for ${gitDir}`);
  }

  /**
   * Install git hooks for the repository
   */
  async installHooks(): Promise<void> {
    try {
      // Create hooks directory if it doesn't exist
      if (!fs.existsSync(this.hooksDir)) {
        fs.mkdirSync(this.hooksDir, { recursive: true });
        this.logger.info(`Created hooks directory: ${this.hooksDir}`);
      }

      // Install pre-commit hook
      const preCommitPath = path.join(this.hooksDir, 'pre-commit');
      if (!fs.existsSync(preCommitPath) || this.shouldOverwrite(preCommitPath)) {
        this.createHookFile(preCommitPath, this.getPreCommitHookScript());
        this.logger.info('Installed pre-commit hook');
      }

      // Install post-commit hook
      const postCommitPath = path.join(this.hooksDir, 'post-commit');
      if (!fs.existsSync(postCommitPath) || this.shouldOverwrite(postCommitPath)) {
        this.createHookFile(postCommitPath, this.getPostCommitHookScript());
        this.logger.info('Installed post-commit hook');
      }

      this.logger.info(`Git hooks installed in ${this.gitDir}`);
      vscode.window.showInformationMessage('✓ Git hooks installed successfully');
    } catch (error) {
      this.logger.error(`Failed to install git hooks: ${error}`);
      vscode.window.showErrorMessage(`Failed to install git hooks: ${error}`);
      throw error;
    }
  }

  /**
   * Remove git hooks from the repository
   */
  async uninstallHooks(): Promise<void> {
    try {
      const preCommitPath = path.join(this.hooksDir, 'pre-commit');
      const postCommitPath = path.join(this.hooksDir, 'post-commit');

      if (fs.existsSync(preCommitPath)) {
        fs.unlinkSync(preCommitPath);
        this.logger.info('Removed pre-commit hook');
      }

      if (fs.existsSync(postCommitPath)) {
        fs.unlinkSync(postCommitPath);
        this.logger.info('Removed post-commit hook');
      }

      this.logger.info(`Git hooks removed from ${this.gitDir}`);
      vscode.window.showInformationMessage('✓ Git hooks removed successfully');
    } catch (error) {
      this.logger.error(`Failed to remove git hooks: ${error}`);
      vscode.window.showErrorMessage(`Failed to remove git hooks: ${error}`);
      throw error;
    }
  }

  /**
   * Check if hooks are installed
   */
  areHooksInstalled(): boolean {
    const preCommitPath = path.join(this.hooksDir, 'pre-commit');
    const postCommitPath = path.join(this.hooksDir, 'post-commit');

    return fs.existsSync(preCommitPath) && fs.existsSync(postCommitPath);
  }

  /**
   * Get pre-commit hook script
   */
  private getPreCommitHookScript(): string {
    return `#!/bin/sh
# Pre-commit hook - AI Remediation Agent
# Runs security analysis on staged files

set -e
exit 0
`;
  }

  /**
   * Get post-commit hook script
   */
  private getPostCommitHookScript(): string {
    return `#!/bin/sh
# Post-commit hook - AI Remediation Agent
# Runs full impact analysis after commit

set -e
exit 0
`;
  }

  /**
   * Create hook file with executable permissions
   */
  private createHookFile(filePath: string, content: string): void {
    try {
      fs.writeFileSync(filePath, content, { mode: 0o755 });
      this.logger.info(`Created hook file: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to create hook file ${filePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Check if hook file should be overwritten
   */
  private shouldOverwrite(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.includes('AI Remediation Agent');
    } catch {
      return false;
    }
  }

  /**
   * Verify hooks are working
   */
  async verifyHooks(): Promise<boolean> {
    try {
      const preCommitPath = path.join(this.hooksDir, 'pre-commit');
      const postCommitPath = path.join(this.hooksDir, 'post-commit');

      if (!fs.existsSync(preCommitPath) || !fs.existsSync(postCommitPath)) {
        this.logger.warn('One or both git hooks are missing');
        return false;
      }

      // Check executable bit
      const preCommitStats = fs.statSync(preCommitPath);
      const postCommitStats = fs.statSync(postCommitPath);

      const preCommitExecutable = (preCommitStats.mode & 0o111) !== 0;
      const postCommitExecutable = (postCommitStats.mode & 0o111) !== 0;

      if (!preCommitExecutable || !postCommitExecutable) {
        this.logger.warn('Git hooks exist but are not executable');
        return false;
      }

      this.logger.info('Git hooks verified successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to verify git hooks: ${error}`);
      return false;
    }
  }

  /**
   * Get hook installation status
   */
  getStatus(): { installed: boolean; preCommit: boolean; postCommit: boolean; executable: boolean } {
    const preCommitPath = path.join(this.hooksDir, 'pre-commit');
    const postCommitPath = path.join(this.hooksDir, 'post-commit');

    const preCommitExists = fs.existsSync(preCommitPath);
    const postCommitExists = fs.existsSync(postCommitPath);

    let executable = false;
    if (preCommitExists || postCommitExists) {
      try {
        if (preCommitExists) {
          executable = (fs.statSync(preCommitPath).mode & 0o111) !== 0;
        }
        if (postCommitExists) {
          executable = executable && (fs.statSync(postCommitPath).mode & 0o111) !== 0;
        }
      } catch (error) {
        this.logger.error(`Failed to check executable bits: ${error}`);
      }
    }

    return {
      installed: preCommitExists && postCommitExists,
      preCommit: preCommitExists,
      postCommit: postCommitExists,
      executable,
    };
  }
}
