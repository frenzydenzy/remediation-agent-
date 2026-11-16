/**
 * Analysis History Tree View Provider
 * Shows past analyses with metadata and click-to-view details
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AnalysisSummary } from '../constants';

export class AnalysisHistoryProvider implements vscode.TreeDataProvider<AnalysisHistoryItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AnalysisHistoryItem | undefined | null | void> =
    new vscode.EventEmitter();

  readonly onDidChangeTreeData: vscode.Event<AnalysisHistoryItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private history: AnalysisSummary[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.loadHistory();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }

  /**
   * Get root tree items
   */
  getTreeItem(element: AnalysisHistoryItem): vscode.TreeItem {
    if (element.type === 'header') {
      return {
        label: '📊 Analysis History',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      };
    }

    if (element.type === 'analysis') {
      const analysis = element.data as AnalysisSummary;
      const icon = this.getImpactIcon(analysis.overallLevel);
      const time = new Date(analysis.timestamp).toLocaleString();

      return {
        label: `${icon} ${analysis.overallLevel.toUpperCase()} - ${time}`,
        description: `Issues: ${analysis.findings.length} | Confidence: ${analysis.metrics.confidence}%`,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        contextValue: 'analysis',
      };
    }

    if (element.type === 'metric') {
      return {
        label: element.label,
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        contextValue: 'metric',
      };
    }

    return {
      label: 'Unknown',
      collapsibleState: vscode.TreeItemCollapsibleState.None,
    };
  }

  /**
   * Get children for tree item
   */
  getChildren(element?: AnalysisHistoryItem): Thenable<AnalysisHistoryItem[]> {
    if (!element) {
      // Root level
      const header: AnalysisHistoryItem = { type: 'header', label: 'History' };
      const items: AnalysisHistoryItem[] = [header];

      // Add recent analyses
      for (const analysis of this.history) {
        items.push({
          type: 'analysis',
          label: analysis.commitSha.substring(0, 7),
          data: analysis,
        });
      }

      return Promise.resolve(items);
    }

    if (element.type === 'analysis') {
      const analysis = element.data as AnalysisSummary;
      const metrics: AnalysisHistoryItem[] = [];

      if (analysis.metrics) {
        metrics.push({
          type: 'metric',
          label: `📁 Files: ${analysis.metrics.filesChanged}`,
        });
        metrics.push({
          type: 'metric',
          label: `➕ Lines: +${analysis.metrics.linesAdded}`,
        });
        metrics.push({
          type: 'metric',
          label: `➖ Lines: -${analysis.metrics.linesDeleted}`,
        });
        metrics.push({
          type: 'metric',
          label: `⚠️ Complexity: ${analysis.metrics.complexity}`,
        });
        metrics.push({
          type: 'metric',
          label: `🎯 Risk: ${analysis.metrics.risklevel}`,
        });
      }

      return Promise.resolve(metrics);
    }

    return Promise.resolve([]);
  }

  /**
   * Add analysis to history
   */
  addAnalysis(analysis: AnalysisSummary): void {
    this.history.unshift(analysis); // Add to beginning (most recent first)

    // Keep only last 20 analyses
    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20);
    }

    this.saveHistory();
    this._onDidChangeTreeData.fire();

    this.logger.info(`Added analysis to history (total: ${this.history.length})`);
  }

  /**
   * Get impact icon
   */
  private getImpactIcon(level: string): string {
    const icons: { [key: string]: string } = {
      critical: '🔴',
      major: '🟠',
      moderate: '🟡',
      minor: '🔵',
    };
    return icons[level.toLowerCase()] || '❓';
  }

  /**
   * Load history from storage
   */
  private loadHistory(): void {
    // TODO: Load from persistent storage (globalState)
    this.logger.info('Loaded analysis history');
  }

  /**
   * Save history to storage
   */
  private saveHistory(): void {
    // TODO: Save to persistent storage (globalState)
    this.logger.info('Saved analysis history');
  }

  /**
   * Clear all history
   */
  clearAll(): void {
    this.history = [];
    this.saveHistory();
    this._onDidChangeTreeData.fire();
    this.logger.info('Cleared all analysis history');
  }

  /**
   * Get history count
   */
  getHistoryCount(): number {
    return this.history.length;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

export interface AnalysisHistoryItem {
  type: 'header' | 'analysis' | 'metric';
  label: string;
  data?: any;
}
