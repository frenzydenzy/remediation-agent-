/**
 * Storage Manager - Persists extension data to VS Code's global state
 * Handles saving and loading of analysis history and recommendations
 */

import * as vscode from 'vscode';
import { Logger } from './logger';
import { AnalysisSummary } from '../constants';
import { Recommendation } from '../views/recommendations';

export class StorageManager {
  private readonly HISTORY_KEY = 'remediation.analysis-history';
  private readonly RECOMMENDATIONS_KEY = 'remediation.recommendations';
  private readonly MAX_HISTORY = 20;

  constructor(
    private context: vscode.ExtensionContext,
    private logger: Logger
  ) {
    this.logger.info('StorageManager initialized');
  }

  /**
   * Save analysis to history
   */
  async saveAnalysis(analysis: AnalysisSummary): Promise<void> {
    try {
      const history = this.getHistory();

      // Add to beginning (newest first)
      history.unshift(analysis);

      // Keep only last 20
      if (history.length > this.MAX_HISTORY) {
        history.splice(this.MAX_HISTORY);
      }

      await this.context.globalState.update(this.HISTORY_KEY, history);

      this.logger.info(`Saved analysis to history (total: ${history.length})`);
    } catch (error) {
      this.logger.error(`Failed to save analysis: ${error}`);
    }
  }

  /**
   * Get analysis history
   */
  getHistory(): AnalysisSummary[] {
    try {
      const history = this.context.globalState.get<AnalysisSummary[]>(
        this.HISTORY_KEY,
        []
      );
      return history || [];
    } catch (error) {
      this.logger.error(`Failed to get history: ${error}`);
      return [];
    }
  }

  /**
   * Clear history
   */
  async clearHistory(): Promise<void> {
    try {
      await this.context.globalState.update(this.HISTORY_KEY, []);
      this.logger.info('Cleared analysis history');
    } catch (error) {
      this.logger.error(`Failed to clear history: ${error}`);
    }
  }

  /**
   * Save recommendation
   */
  async saveRecommendation(rec: Recommendation): Promise<void> {
    try {
      const recommendations = this.getRecommendations();
      const existing = recommendations.findIndex((r) => r.id === rec.id);

      if (existing >= 0) {
        // Update existing
        recommendations[existing] = rec;
      } else {
        // Add new
        recommendations.push(rec);
      }

      await this.context.globalState.update(
        this.RECOMMENDATIONS_KEY,
        recommendations
      );

      this.logger.info(`Saved recommendation: ${rec.title}`);
    } catch (error) {
      this.logger.error(`Failed to save recommendation: ${error}`);
    }
  }

  /**
   * Get all recommendations
   */
  getRecommendations(): Recommendation[] {
    try {
      const recommendations = this.context.globalState.get<Recommendation[]>(
        this.RECOMMENDATIONS_KEY,
        []
      );
      return recommendations || [];
    } catch (error) {
      this.logger.error(`Failed to get recommendations: ${error}`);
      return [];
    }
  }

  /**
   * Clear recommendations
   */
  async clearRecommendations(): Promise<void> {
    try {
      await this.context.globalState.update(this.RECOMMENDATIONS_KEY, []);
      this.logger.info('Cleared recommendations');
    } catch (error) {
      this.logger.error(`Failed to clear recommendations: ${error}`);
    }
  }

  /**
   * Get storage stats
   */
  getStats() {
    return {
      historySize: this.getHistory().length,
      recommendationsSize: this.getRecommendations().length,
      maxHistorySize: this.MAX_HISTORY,
    };
  }

  /**
   * Export all data for backup
   */
  exportData() {
    return {
      history: this.getHistory(),
      recommendations: this.getRecommendations(),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import data from backup
   */
  async importData(data: { history: AnalysisSummary[]; recommendations: Recommendation[] }): Promise<void> {
    try {
      if (data.history && Array.isArray(data.history)) {
        await this.context.globalState.update(this.HISTORY_KEY, data.history);
        this.logger.info(`Imported ${data.history.length} analyses`);
      }

      if (data.recommendations && Array.isArray(data.recommendations)) {
        await this.context.globalState.update(this.RECOMMENDATIONS_KEY, data.recommendations);
        this.logger.info(`Imported ${data.recommendations.length} recommendations`);
      }
    } catch (error) {
      this.logger.error(`Failed to import data: ${error}`);
    }
  }
}
