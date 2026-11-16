"use strict";
/**
 * UI Manager - Centralized control of all UI components
 * Coordinates between handlers, tree views, panels, and diagnostics
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Centralized UI component manager
 * Provides single point of access for all UI operations
 */
class UIManager {
    constructor(securityPanel, summaryPanel, diagnostics, historyProvider, recommendationsProvider, logger) {
        this.securityPanel = securityPanel;
        this.summaryPanel = summaryPanel;
        this.diagnostics = diagnostics;
        this.historyProvider = historyProvider;
        this.recommendationsProvider = recommendationsProvider;
        this.logger = logger;
        this.logger.info('UIManager initialized');
    }
    /**
     * Show security findings before commit (pre-commit flow)
     */
    async showSecurityFindings(result) {
        try {
            this.logger.info(`Showing ${result.findings.length} security findings`);
            // Show inline diagnostics in editor
            this.diagnostics.showFindings(result.findings);
            // Show security panel with Allow/Block options
            const extensionUri = vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.file('');
            const action = await this.securityPanel.show(result, extensionUri);
            this.logger.info(`Pre-commit security check: ${action}`);
            return action === 'allow';
        }
        catch (error) {
            this.logger.error(`Failed to show security findings: ${error}`);
            throw error;
        }
    }
    /**
     * Show post-commit analysis summary
     */
    async showAnalysisSummary(summary) {
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
        }
        catch (error) {
            this.logger.error(`Failed to show analysis summary: ${error}`);
            throw error;
        }
    }
    /**
     * Clear all findings from editor
     */
    clearFindings() {
        try {
            this.diagnostics.clear();
            this.logger.info('Cleared all inline findings');
        }
        catch (error) {
            this.logger.error(`Failed to clear findings: ${error}`);
        }
    }
    /**
     * Refresh all tree views
     */
    refreshViews() {
        try {
            this.historyProvider.refresh();
            this.recommendationsProvider.refresh();
            this.logger.info('Refreshed all tree views');
        }
        catch (error) {
            this.logger.error(`Failed to refresh views: ${error}`);
        }
    }
    /**
     * Hide security panel
     */
    hideSecurityPanel() {
        try {
            this.securityPanel.dispose?.();
            this.logger.info('Hidden security panel');
        }
        catch (error) {
            this.logger.error(`Failed to hide security panel: ${error}`);
        }
    }
    /**
     * Hide summary panel
     */
    hideSummaryPanel() {
        try {
            this.summaryPanel.dispose?.();
            this.logger.info('Hidden summary panel');
        }
        catch (error) {
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
    dispose() {
        this.logger.info('Disposing UIManager');
        this.clearFindings();
        this.hideSecurityPanel();
        this.hideSummaryPanel();
    }
}
exports.UIManager = UIManager;
//# sourceMappingURL=ui-manager.js.map