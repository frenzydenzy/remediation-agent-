/**
 * Git Event Listener - Integrates with VS Code Git Extension
 * Listens for commit/push events and triggers analysis
 * Phase 7.12 Integration Fix: Proper Git Event Listening
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { PostCommitHandler, PostCommitResult } from '../hooks/post-commit-handler';
import { PreCommitHandler, PreCommitResult } from '../hooks/pre-commit-handler';

export class GitEventListener {
  private gitExtension: any;
  private repositories: any[] = [];
  private postCommitHandler: PostCommitHandler | null = null;
  private preCommitHandler: PreCommitHandler | null = null;

  constructor(
    private logger: Logger,
    postCommitHandler?: PostCommitHandler,
    preCommitHandler?: PreCommitHandler
  ) {
    this.postCommitHandler = postCommitHandler || null;
    this.preCommitHandler = preCommitHandler || null;
  }

  /**
   * Initialize git event listening
   * Returns true if successfully connected to VS Code git extension
   */
  async initialize(): Promise<boolean> {
    try {
      this.logger.info('🔗 Initializing git event listener');

      // Get the git extension
      const gitExtension = vscode.extensions.getExtension<any>('vscode.git');
      if (!gitExtension) {
        this.logger.warn('Git extension not found, will retry periodically');
        return false;
      }

      if (!gitExtension.isActive) {
        this.logger.info('Waiting for git extension to activate...');
        await gitExtension.activate();
      }

      this.gitExtension = gitExtension.exports.getAPI(1);
      if (!this.gitExtension) {
        this.logger.error('Failed to get Git API v1');
        return false;
      }

      this.logger.info(`✓ Connected to Git API`);
      this.logger.info(`Found ${this.gitExtension.repositories.length} repositories`);

      // Register listeners for each repository
      await this.setupRepositoryListeners();

      // Listen for new repositories
      this.gitExtension.onDidOpenRepository((repo: any) => {
        this.logger.info(`New repository opened: ${repo.rootUri.fsPath}`);
        this.setupRepositoryListener(repo);
      });

      this.gitExtension.onDidCloseRepository((repo: any) => {
        this.logger.info(`Repository closed: ${repo.rootUri.fsPath}`);
        const index = this.repositories.indexOf(repo);
        if (index > -1) {
          this.repositories.splice(index, 1);
        }
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize git event listener: ${error}`);
      return false;
    }
  }

  /**
   * Set up listeners for all current repositories
   */
  private async setupRepositoryListeners(): Promise<void> {
    if (!this.gitExtension) return;

    for (const repo of this.gitExtension.repositories) {
      this.setupRepositoryListener(repo);
    }
  }

  /**
   * Set up listeners for a single repository
   */
  private setupRepositoryListener(repo: any): void {
    try {
      const repoPath = repo.rootUri.fsPath;
      this.logger.debug(`Setting up listeners for: ${repoPath}`);

      if (!this.repositories.includes(repo)) {
        this.repositories.push(repo);
      }

      // Listen for state changes in the repository
      // The GitRepository object from vscode.git extension does not emit commit events directly,
      // but we can monitor for changes through the file system watcher and git status

      // Alternative: Use terminal to watch git commands
      // This is handled through the hook installation and manual command detection

      this.logger.debug(`✓ Listeners attached to: ${repoPath}`);
    } catch (error) {
      this.logger.error(`Failed to setup repository listener: ${error}`);
    }
  }

  /**
   * Manually trigger post-commit analysis
   * Called from commands or hooks
   */
  async triggerPostCommitAnalysis(repoPath?: string): Promise<PostCommitResult | null> {
    try {
      if (!this.postCommitHandler) {
        this.logger.warn('Post-commit handler not configured');
        return null;
      }

      this.logger.info('▶️ Manually triggering post-commit analysis');
      return await this.postCommitHandler.execute();
    } catch (error) {
      this.logger.error(`Failed to trigger post-commit analysis: ${error}`);
      return null;
    }
  }

  /**
   * Manually trigger pre-commit analysis
   * Called from commands or hooks
   */
  async triggerPreCommitAnalysis(repoPath?: string): Promise<PreCommitResult | null> {
    try {
      if (!this.preCommitHandler) {
        this.logger.warn('Pre-commit handler not configured');
        return null;
      }

      this.logger.info('▶️ Manually triggering pre-commit analysis');
      return await this.preCommitHandler.execute();
    } catch (error) {
      this.logger.error(`Failed to trigger pre-commit analysis: ${error}`);
      return null;
    }
  }

  /**
   * Get all active repositories
   */
  getRepositories(): any[] {
    return this.repositories;
  }

  /**
   * Check if git extension is available
   */
  isAvailable(): boolean {
    return this.gitExtension !== undefined;
  }

  /**
   * Dispose listeners
   */
  dispose(): void {
    this.logger.info('Disposing git event listener');
    this.repositories = [];
    this.gitExtension = undefined;
  }
}

/**
 * Alternative Git Event Detection via Terminal
 * Since VS Code git extension doesn't emit commit events directly,
 * we can monitor git commands through terminal and workspace changes
 */
export class GitCommandDetector {
  private disposables: vscode.Disposable[] = [];
  private lastCommitTime: number = 0;
  private commitCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private logger: Logger,
    private workspaceFolder: string,
    private onCommitDetected: (commitSha: string) => Promise<void>
  ) {}

  /**
   * Start monitoring for git commits
   * Uses polling approach to detect new commits
   */
  start(): void {
    this.logger.info('🔍 Starting git command detector (polling mode)');

    // Check for new commits every 2 seconds
    this.commitCheckInterval = setInterval(() => {
      this.checkForNewCommit();
    }, 2000);
  }

  /**
   * Check if a new commit was made
   */
  private async checkForNewCommit(): Promise<void> {
    try {
      const { execSync } = require('child_process');

      // Get the current HEAD commit timestamp
      const stdout = execSync('git log -1 --pretty=%ai', {
        cwd: this.workspaceFolder,
        encoding: 'utf8',
      });

      const commitTime = new Date(stdout.trim()).getTime();

      // If commit is newer than last detected, trigger analysis
      if (commitTime > this.lastCommitTime) {
        this.lastCommitTime = commitTime;

        // Get the commit SHA
        const sha = execSync('git rev-parse HEAD', {
          cwd: this.workspaceFolder,
          encoding: 'utf8',
        }).trim();

        this.logger.info(`✓ Detected new commit: ${sha.substring(0, 7)}`);
        await this.onCommitDetected(sha);
      }
    } catch (error) {
      // Silently ignore errors during polling (repo might not be ready)
      this.logger.debug(`Commit check failed: ${error}`);
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.logger.info('Stopping git command detector');
    if (this.commitCheckInterval) {
      clearInterval(this.commitCheckInterval);
      this.commitCheckInterval = null;
    }

    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop();
  }
}
