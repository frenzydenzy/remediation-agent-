/**
 * Backend communicator for executing Phase 6 scripts
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/config-manager';
import { EngineResponse, SecurityAnalysisResult, AnalysisSummary } from '../constants';

export class BackendCommunicator {
  private backendPath: string;

  constructor(private logger: Logger, private configManager: ConfigManager) {
    // Phase 6 backend is at the parent directory
    this.backendPath = path.resolve(__dirname, '../../../.github/skills/ai-change-impact-analysis');
  }

  async runSecurityCheck(stagedFiles: string[]): Promise<EngineResponse> {
    try {
      this.logger.info(`Running security check on ${stagedFiles.length} files`);

      const config = this.configManager.getConfig();
      const timeout = config.preCommit.timeout;

      // Call Phase 4.1-4.3 (security analysis only)
      const result = await this.executeBackend('security-check', { stagedFiles }, timeout);

      return {
        success: true,
        data: result as SecurityAnalysisResult,
        duration: 0,
      };
    } catch (error) {
      this.logger.error(`Security check failed: ${error}`);
      return {
        success: false,
        error: String(error),
        duration: 0,
      };
    }
  }

  async runFullAnalysis(): Promise<EngineResponse> {
    try {
      this.logger.info('Running full impact analysis');

      const config = this.configManager.getConfig();
      const timeout = config.postCommit.timeout;

      // Call full Phase 4.4-4.8 pipeline
      const result = await this.executeBackend('full-analysis', {}, timeout);

      return {
        success: true,
        data: result as AnalysisSummary,
        duration: 0,
      };
    } catch (error) {
      this.logger.error(`Full analysis failed: ${error}`);
      return {
        success: false,
        error: String(error),
        duration: 0,
      };
    }
  }

  private async executeBackend(command: string, params: any, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // Build command arguments
        const args = [
          path.join(this.backendPath, 'scripts', 'change-impact-agent.cjs'),
          `--command=${command}`,
          `--params=${JSON.stringify(params)}`,
        ];

        // Start Node process
        const process = spawn('node', args, {
          cwd: this.backendPath,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        // Collect output
        if (process.stdout) {
          process.stdout.on('data', (data) => {
            stdout += data.toString();
          });
        }

        if (process.stderr) {
          process.stderr.on('data', (data) => {
            stderr += data.toString();
            this.logger.error(`Backend stderr: ${data}`);
          });
        }

        // Setup timeout
        const timeoutHandle = setTimeout(() => {
          process.kill();
          reject(new Error(`Backend command timed out after ${timeout}ms`));
        }, timeout);

        // Handle process completion
        process.on('close', (code) => {
          clearTimeout(timeoutHandle);

          if (code === 0) {
            try {
              // Parse JSON output
              const result = JSON.parse(stdout);
              this.logger.debug(`Backend result: ${JSON.stringify(result)}`);
              resolve(result);
            } catch (parseError) {
              reject(new Error(`Failed to parse backend output: ${parseError}`));
            }
          } else {
            reject(new Error(`Backend process exited with code ${code}: ${stderr}`));
          }
        });

        // Handle errors
        process.on('error', (error) => {
          clearTimeout(timeoutHandle);
          reject(new Error(`Failed to execute backend: ${error.message}`));
        });
      } catch (error) {
        reject(new Error(`Failed to spawn backend process: ${error}`));
      }
    });
  }

  isBackendAvailable(): boolean {
    // Check if Phase 6 backend scripts exist
    const backendScript = path.join(
      this.backendPath,
      'scripts',
      'change-impact-agent.cjs'
    );

    try {
      const fs = require('fs');
      return fs.existsSync(backendScript);
    } catch {
      return false;
    }
  }
}
