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
export declare class RecommendationsProvider implements vscode.TreeDataProvider<RecommendationItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<RecommendationItem | undefined | null | void>;
    private recommendations;
    private logger;
    constructor(logger: Logger);
    /**
     * Cleanup resources
     */
    dispose(): void;
    /**
     * Get tree items
     */
    getTreeItem(element: RecommendationItem): vscode.TreeItem;
    /**
     * Get children for tree item
     */
    getChildren(element?: RecommendationItem): Thenable<RecommendationItem[]>;
    /**
     * Add or update recommendation
     */
    addRecommendation(rec: Recommendation): void;
    /**
     * Get severity icon
     */
    private getSeverityIcon;
    /**
     * Load recommendations from storage
     */
    private loadRecommendations;
    /**
     * Save recommendations to storage
     */
    private saveRecommendations;
    /**
     * Clear all recommendations
     */
    clearAll(): void;
    /**
     * Get recommendation count
     */
    getRecommendationCount(): number;
    refresh(): void;
}
export interface RecommendationItem {
    type: 'header' | 'recommendation' | 'example' | 'metric';
    label: string;
    data?: any;
}
//# sourceMappingURL=recommendations.d.ts.map