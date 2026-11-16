/**
 * Recommendations Tree View Provider
 * Shows aggregated recommendations from all past analyses
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

export interface Recommendation {
  id: string;
  title: string;
  frequency: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  issueCounts: number;
  examples: string[];
}

export class RecommendationsProvider implements vscode.TreeDataProvider<RecommendationItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<RecommendationItem | undefined | null | void> =
    new vscode.EventEmitter();

  readonly onDidChangeTreeData: vscode.Event<RecommendationItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private recommendations: Recommendation[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.loadRecommendations();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }

  /**
   * Get tree items
   */
  getTreeItem(element: RecommendationItem): vscode.TreeItem {
    if (element.type === 'header') {
      return {
        label: '💡 Recommendations',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      };
    }

    if (element.type === 'recommendation') {
      const rec = element.data as Recommendation;
      const icon = this.getSeverityIcon(rec.severity);
      const frequency = `${rec.frequency}x`;

      return {
        label: `${icon} ${rec.title}`,
        description: `${frequency} | Issues: ${rec.issueCounts}`,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        contextValue: 'recommendation',
      };
    }

    if (element.type === 'example') {
      return {
        label: `📝 ${element.label}`,
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        contextValue: 'example',
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
  getChildren(element?: RecommendationItem): Thenable<RecommendationItem[]> {
    if (!element) {
      // Root level
      const header: RecommendationItem = { type: 'header', label: 'Recommendations' };
      const items: RecommendationItem[] = [header];

      // Add recommendations sorted by frequency
      const sorted = [...this.recommendations].sort((a, b) => b.frequency - a.frequency);

      for (const rec of sorted) {
        items.push({
          type: 'recommendation',
          label: rec.title,
          data: rec,
        });
      }

      return Promise.resolve(items);
    }

    if (element.type === 'recommendation') {
      const rec = element.data as Recommendation;
      const children: RecommendationItem[] = [];

      // Add frequency metric
      children.push({
        type: 'metric',
        label: `📊 Frequency: ${rec.frequency} occurrences`,
      });

      // Add issue count
      children.push({
        type: 'metric',
        label: `⚠️ Affected Issues: ${rec.issueCounts}`,
      });

      // Add examples
      if (rec.examples && rec.examples.length > 0) {
        for (const example of rec.examples.slice(0, 3)) {
          children.push({
            type: 'example',
            label: example,
          });
        }
      }

      return Promise.resolve(children);
    }

    return Promise.resolve([]);
  }

  /**
   * Add or update recommendation
   */
  addRecommendation(rec: Recommendation): void {
    const existing = this.recommendations.find((r) => r.id === rec.id);

    if (existing) {
      existing.frequency = rec.frequency;
      existing.issueCounts = rec.issueCounts;
      existing.examples = rec.examples;
    } else {
      this.recommendations.push(rec);
    }

    this.saveRecommendations();
    this._onDidChangeTreeData.fire();

    this.logger.info(`Updated recommendation: ${rec.title}`);
  }

  /**
   * Get severity icon
   */
  private getSeverityIcon(severity: string): string {
    const icons: { [key: string]: string } = {
      CRITICAL: '🔴',
      HIGH: '🟠',
      MEDIUM: '🟡',
      LOW: '🔵',
    };
    return icons[severity] || '❓';
  }

  /**
   * Load recommendations from storage
   */
  private loadRecommendations(): void {
    // TODO: Load from persistent storage
    this.logger.info('Loaded recommendations');
  }

  /**
   * Save recommendations to storage
   */
  private saveRecommendations(): void {
    // TODO: Save to persistent storage
    this.logger.info('Saved recommendations');
  }

  /**
   * Clear all recommendations
   */
  clearAll(): void {
    this.recommendations = [];
    this.saveRecommendations();
    this._onDidChangeTreeData.fire();
    this.logger.info('Cleared all recommendations');
  }

  /**
   * Get recommendation count
   */
  getRecommendationCount(): number {
    return this.recommendations.length;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

export interface RecommendationItem {
  type: 'header' | 'recommendation' | 'example' | 'metric';
  label: string;
  data?: any;
}
