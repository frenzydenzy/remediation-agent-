/**
 * Post-Commit Handler - Executes full Phase 4.4-4.8 analysis pipeline
 * Called after successful commit to generate reports and diagrams
 * Displays summary panel in VS Code
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { BackendCommunicator } from '../engine-integration/backend-communicator';
import { ConfigManager } from '../config/config-manager';
import { UIManager } from '../ui/ui-manager';
import { AnalysisSummary } from '../constants';

const execAsync = promisify(exec);

export class PostCommitHandler {
  constructor(
    private logger: Logger,
    private backend: BackendCommunicator,
    private configManager: ConfigManager,
    private gitDir: string,
    private uiManager?: UIManager
  ) {}

  async execute(): Promise<PostCommitResult> {
    try {
      this.logger.info('📊 Post-commit handler starting');

      const config = this.configManager.getConfig();

      if (!config.postCommit.enabled) {
        this.logger.info('Post-commit analysis disabled');
        return { success: true, reason: 'Disabled in settings' };
      }

      // 1. Get current commit information
      const commitInfo = await this.getCommitInfo();

      if (!commitInfo) {
        this.logger.error('Failed to get commit information');
        return { success: false, reason: 'Failed to get commit info' };
      }

      this.logger.info(`Analyzing commit: ${commitInfo.sha.substring(0, 7)}`);
      this.logger.info(`Message: ${commitInfo.message}`);

      // 2. Get changed files in this commit
      const changedFiles = await this.getChangedFiles(commitInfo.sha);

      this.logger.info(`Files changed: ${changedFiles.length}`);

      // 3. Run full analysis pipeline (Phase 4.4-4.8)
      const result = await this.backend.runFullAnalysis();

      if (!result.success) {
        this.logger.error(`Full analysis failed: ${result.error}`);
        return { success: false, reason: `Analysis failed: ${result.error}` };
      }

      const analysisResult = result.data as AnalysisSummary;

      this.logger.info(`✅ Analysis complete`);
      this.logger.info(`Impact Level: ${analysisResult.overallLevel}`);
      this.logger.info(`Confidence: ${analysisResult.metrics.confidence}%`);
      this.logger.info(`Issues Found: ${analysisResult.findings.length}`);

      // FIX 3: Don't push automatically - let user push manually
      // This prevents git credential failures and allows user control
      this.logger.info('📌 Analysis results ready. Push changes manually: git push origin main');

      // Show analysis summary in UI
      if (this.uiManager) {
        try {
          await this.uiManager.showAnalysisSummary(analysisResult);
        } catch (uiError) {
          this.logger.error(`Failed to show analysis summary: ${uiError}`);
        }
      }

      return {
        success: true,
        reason: 'Analysis complete',
        analysis: analysisResult,
        commitInfo,
        changedFiles,
        duration: result.duration,
      };
    } catch (error) {
      this.logger.error(`Post-commit handler error: ${error}`);
      return { success: false, reason: `Handler error: ${error}` };
    }
  }

  /**
   * Get information about the current commit
   */
  private async getCommitInfo(): Promise<CommitInfo | null> {
    try {
      // Get commit SHA
      const { stdout: sha } = await execAsync('git rev-parse HEAD', {
        cwd: this.gitDir,
      });

      // Get commit message
      const { stdout: message } = await execAsync('git log -1 --pretty=%B', {
        cwd: this.gitDir,
      });

      // Get author
      const { stdout: author } = await execAsync('git log -1 --pretty=%an', {
        cwd: this.gitDir,
      });

      // Get timestamp
      const { stdout: timestamp } = await execAsync('git log -1 --pretty=%ai', {
        cwd: this.gitDir,
      });

      return {
        sha: sha.trim(),
        message: message.trim(),
        author: author.trim(),
        timestamp: timestamp.trim(),
      };
    } catch (error) {
      this.logger.error(`Failed to get commit info: ${error}`);
      return null;
    }
  }

  /**
   * Get list of files changed in commit
   */
  private async getChangedFiles(commitSha: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`git show --name-only --pretty= ${commitSha}`, {
        cwd: this.gitDir,
        maxBuffer: 10 * 1024 * 1024,
      });

      const files = stdout
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      return files;
    } catch (error) {
      this.logger.error(`Failed to get changed files: ${error}`);
      return [];
    }
  }

  /**
   * Format summary for display
   */
  formatSummary(analysis: AnalysisSummary, commitInfo: CommitInfo): string {
    let output = '📊 Change Impact Summary\n';
    output += '═══════════════════════════════════\n\n';

    output += `Commit: ${commitInfo.sha.substring(0, 7)}\n`;
    output += `Author: ${commitInfo.author}\n`;
    output += `Message: ${commitInfo.message.split('\n')[0]}\n\n`;

    output += `Impact Level: ${analysis.overallLevel.toUpperCase()}\n`;
    output += `Confidence: ${analysis.metrics.confidence}%\n`;
    output += `Issues: ${analysis.findings.length}\n\n`;

    output += 'Metrics:\n';
    if (analysis.metrics) {
      output += `  Files: ${analysis.metrics.filesChanged}\n`;
      output += `  Lines +: ${analysis.metrics.linesAdded}\n`;
      output += `  Lines -: ${analysis.metrics.linesDeleted}\n`;
      output += `  Complexity: ${analysis.metrics.complexity}\n`;
      output += `  Risk: ${analysis.metrics.risklevel}\n`;
    }

    if (analysis.recommendations && analysis.recommendations.length > 0) {
      output += '\nRecommendations:\n';
      analysis.recommendations.forEach((rec) => {
        output += `  • ${rec}\n`;
      });
    }

    return output;
  }
}

export interface PostCommitResult {
  success: boolean;
  reason: string;
  analysis?: AnalysisSummary;
  commitInfo?: CommitInfo;
  changedFiles?: string[];
  duration?: number;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
}
