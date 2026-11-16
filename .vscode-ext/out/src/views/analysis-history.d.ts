/**
 * Analysis History Tree View Provider
 * Shows past analyses with metadata and click-to-view details
 */
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AnalysisSummary } from '../constants';
export declare class AnalysisHistoryProvider implements vscode.TreeDataProvider<AnalysisHistoryItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<AnalysisHistoryItem | undefined | null | void>;
    private history;
    private logger;
    constructor(logger: Logger);
    /**
     * Cleanup resources
     */
    dispose(): void;
    /**
     * Get root tree items
     */
    getTreeItem(element: AnalysisHistoryItem): vscode.TreeItem;
    /**
     * Get children for tree item
     */
    getChildren(element?: AnalysisHistoryItem): Thenable<AnalysisHistoryItem[]>;
    /**
     * Add analysis to history
     */
    addAnalysis(analysis: AnalysisSummary): void;
    /**
     * Get impact icon
     */
    private getImpactIcon;
    /**
     * Load history from storage
     */
    private loadHistory;
    /**
     * Save history to storage
     */
    private saveHistory;
    /**
     * Clear all history
     */
    clearAll(): void;
    /**
     * Get history count
     */
    getHistoryCount(): number;
    refresh(): void;
}
export interface AnalysisHistoryItem {
    type: 'header' | 'analysis' | 'metric';
    label: string;
    data?: any;
}
//# sourceMappingURL=analysis-history.d.ts.map