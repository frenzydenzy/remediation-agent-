/**
 * UI Manager - Centralized control of all UI components
 * Coordinates between handlers, tree views, panels, and diagnostics
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { SecurityPanel } from './security-panel';
import { SummaryPanel } from './summary-panel';
import { InlineDiagnostics } from './diagnostics';
import { AnalysisHistoryProvider } from '../views/analysis-history';
import { RecommendationsProvider, Recommendation } from '../views/recommendations';
import { SecurityFinding, AnalysisSummary, SecurityAnalysisResult } from '../constants';

/**
 * Centralized UI component manager
 * Provides single point of access for all UI operations
 */
export class UIManager {
  constructor(
    private securityPanel: SecurityPanel,
    private summaryPanel: SummaryPanel,
    private diagnostics: InlineDiagnostics,
    private historyProvider: AnalysisHistoryProvider,
    private recommendationsProvider: RecommendationsProvider,
    private logger: Logger
  ) {
    this.logger.info('UIManager initialized');
  }

  /**
   * Show security findings before commit (pre-commit flow)
   */
  async showSecurityFindings(result: SecurityAnalysisResult): Promise<boolean> {
    try {
      this.logger.info(`Showing ${result.findings.length} security findings`);

      // Show inline diagnostics in editor
      this.diagnostics.showFindings(result.findings);

      // Show security panel with Allow/Block options
      const extensionUri = vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.file('');
      const action = await this.securityPanel.show(result, extensionUri);

      this.logger.info(`Pre-commit security check: ${action}`);
      return action === 'allow';
    } catch (error) {
      this.logger.error(`Failed to show security findings: ${error}`);
      throw error;
    }
  }

  /**
   * Show post-commit analysis summary
   */
  async showAnalysisSummary(summary: AnalysisSummary): Promise<void> {
    try {
      this.logger.info(`Showing analysis summary for commit ${summary.commitSha}`);

      // Add to history tree view
      this.historyProvider.addAnalysis(summary);
      this.logger.info('Added analysis to history');

      // Update recommendations from analysis
      if (summary.recommendations && summary.recommendations.length > 0) {
        for (let i = 0; i < summary.recommendations.length; i++) {
          const recText = summary.recommendations[i];
          this.recommendationsProvider.addRecommendation({
            id: `rec-${summary.commitSha}-${i}`,
            title: recText,
            frequency: 1,
            severity: 'MEDIUM',
            issueCounts: summary.findings.filter(f => f.description?.includes(recText)).length,
            examples: [recText]
          });
        }
        this.logger.info(`Updated ${summary.recommendations.length} recommendations`);
      }

      // Show summary panel
      const extensionUri = vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.file('');
      await this.summaryPanel.show(summary, extensionUri);

      this.logger.info('Analysis summary displayed');
    } catch (error) {
      this.logger.error(`Failed to show analysis summary: ${error}`);
      throw error;
    }
  }

  /**
   * Clear all findings from editor
   */
  clearFindings(): void {
    try {
      this.diagnostics.clear();
      this.logger.info('Cleared all inline findings');
    } catch (error) {
      this.logger.error(`Failed to clear findings: ${error}`);
    }
  }

  /**
   * Refresh all tree views
   */
  refreshViews(): void {
    try {
      this.historyProvider.refresh();
      this.recommendationsProvider.refresh();
      this.logger.info('Refreshed all tree views');
    } catch (error) {
      this.logger.error(`Failed to refresh views: ${error}`);
    }
  }

  /**
   * Hide security panel
   */
  hideSecurityPanel(): void {
    try {
      this.securityPanel.dispose?.();
      this.logger.info('Hidden security panel');
    } catch (error) {
      this.logger.error(`Failed to hide security panel: ${error}`);
    }
  }

  /**
   * Hide summary panel
   */
  hideSummaryPanel(): void {
    try {
      this.summaryPanel.dispose?.();
      this.logger.info('Hidden summary panel');
    } catch (error) {
      this.logger.error(`Failed to hide summary panel: ${error}`);
    }
  }

  /**
   * Export all UI components (for testing)
   */
  getComponents() {
    return {
      securityPanel: this.securityPanel,
      summaryPanel: this.summaryPanel,
      diagnostics: this.diagnostics,
      historyProvider: this.historyProvider,
      recommendationsProvider: this.recommendationsProvider,
    };
  }

  /**
   * Get UI statistics
   */
  getStats() {
    return {
      historicalAnalyses: this.historyProvider.getHistoryCount?.() || 0,
      recommendations: this.recommendationsProvider.getRecommendationCount?.() || 0,
      activeDiagnostics: this.diagnostics.getDiagnosticsCount?.() || 0,
    };
  }

  dispose(): void {
    this.logger.info('Disposing UIManager');
    this.clearFindings();
    this.hideSecurityPanel();
    this.hideSummaryPanel();
  }
}
