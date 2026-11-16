/**
 * Storage Manager - Persists extension data to VS Code's global state
 * Handles saving and loading of analysis history and recommendations
 */
import * as vscode from 'vscode';
import { Logger } from './logger';
import { AnalysisSummary } from '../constants';
import { Recommendation } from '../views/recommendations';
export declare class StorageManager {
    private context;
    private logger;
    private readonly HISTORY_KEY;
    private readonly RECOMMENDATIONS_KEY;
    private readonly MAX_HISTORY;
    constructor(context: vscode.ExtensionContext, logger: Logger);
    /**
     * Save analysis to history
     */
    saveAnalysis(analysis: AnalysisSummary): Promise<void>;
    /**
     * Get analysis history
     */
    getHistory(): AnalysisSummary[];
    /**
     * Clear history
     */
    clearHistory(): Promise<void>;
    /**
     * Save recommendation
     */
    saveRecommendation(rec: Recommendation): Promise<void>;
    /**
     * Get all recommendations
     */
    getRecommendations(): Recommendation[];
    /**
     * Clear recommendations
     */
    clearRecommendations(): Promise<void>;
    /**
     * Get storage stats
     */
    getStats(): {
        historySize: number;
        recommendationsSize: number;
        maxHistorySize: number;
    };
    /**
     * Export all data for backup
     */
    exportData(): {
        history: AnalysisSummary[];
        recommendations: Recommendation[];
        exportedAt: string;
    };
    /**
     * Import data from backup
     */
    importData(data: {
        history: AnalysisSummary[];
        recommendations: Recommendation[];
    }): Promise<void>;
}
//# sourceMappingURL=storage-manager.d.ts.map