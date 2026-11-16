"use strict";
/**
 * Storage Manager - Persists extension data to VS Code's global state
 * Handles saving and loading of analysis history and recommendations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageManager = void 0;
class StorageManager {
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
        this.HISTORY_KEY = 'remediation.analysis-history';
        this.RECOMMENDATIONS_KEY = 'remediation.recommendations';
        this.MAX_HISTORY = 20;
        this.logger.info('StorageManager initialized');
    }
    /**
     * Save analysis to history
     */
    async saveAnalysis(analysis) {
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
        }
        catch (error) {
            this.logger.error(`Failed to save analysis: ${error}`);
        }
    }
    /**
     * Get analysis history
     */
    getHistory() {
        try {
            const history = this.context.globalState.get(this.HISTORY_KEY, []);
            return history || [];
        }
        catch (error) {
            this.logger.error(`Failed to get history: ${error}`);
            return [];
        }
    }
    /**
     * Clear history
     */
    async clearHistory() {
        try {
            await this.context.globalState.update(this.HISTORY_KEY, []);
            this.logger.info('Cleared analysis history');
        }
        catch (error) {
            this.logger.error(`Failed to clear history: ${error}`);
        }
    }
    /**
     * Save recommendation
     */
    async saveRecommendation(rec) {
        try {
            const recommendations = this.getRecommendations();
            const existing = recommendations.findIndex((r) => r.id === rec.id);
            if (existing >= 0) {
                // Update existing
                recommendations[existing] = rec;
            }
            else {
                // Add new
                recommendations.push(rec);
            }
            await this.context.globalState.update(this.RECOMMENDATIONS_KEY, recommendations);
            this.logger.info(`Saved recommendation: ${rec.title}`);
        }
        catch (error) {
            this.logger.error(`Failed to save recommendation: ${error}`);
        }
    }
    /**
     * Get all recommendations
     */
    getRecommendations() {
        try {
            const recommendations = this.context.globalState.get(this.RECOMMENDATIONS_KEY, []);
            return recommendations || [];
        }
        catch (error) {
            this.logger.error(`Failed to get recommendations: ${error}`);
            return [];
        }
    }
    /**
     * Clear recommendations
     */
    async clearRecommendations() {
        try {
            await this.context.globalState.update(this.RECOMMENDATIONS_KEY, []);
            this.logger.info('Cleared recommendations');
        }
        catch (error) {
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
    async importData(data) {
        try {
            if (data.history && Array.isArray(data.history)) {
                await this.context.globalState.update(this.HISTORY_KEY, data.history);
                this.logger.info(`Imported ${data.history.length} analyses`);
            }
            if (data.recommendations && Array.isArray(data.recommendations)) {
                await this.context.globalState.update(this.RECOMMENDATIONS_KEY, data.recommendations);
                this.logger.info(`Imported ${data.recommendations.length} recommendations`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to import data: ${error}`);
        }
    }
}
exports.StorageManager = StorageManager;
//# sourceMappingURL=storage-manager.js.map