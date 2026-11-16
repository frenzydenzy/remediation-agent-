"use strict";
/**
 * Analysis History Tree View Provider
 * Shows past analyses with metadata and click-to-view details
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
exports.AnalysisHistoryProvider = void 0;
const vscode = __importStar(require("vscode"));
class AnalysisHistoryProvider {
    constructor(logger) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.history = [];
        this.logger = logger;
        this.loadHistory();
    }
    /**
     * Cleanup resources
     */
    dispose() {
        this._onDidChangeTreeData.dispose();
    }
    /**
     * Get root tree items
     */
    getTreeItem(element) {
        if (element.type === 'header') {
            return {
                label: '📊 Analysis History',
                collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            };
        }
        if (element.type === 'analysis') {
            const analysis = element.data;
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
    getChildren(element) {
        if (!element) {
            // Root level
            const header = { type: 'header', label: 'History' };
            const items = [header];
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
            const analysis = element.data;
            const metrics = [];
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
    addAnalysis(analysis) {
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
    getImpactIcon(level) {
        const icons = {
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
    loadHistory() {
        // TODO: Load from persistent storage (globalState)
        this.logger.info('Loaded analysis history');
    }
    /**
     * Save history to storage
     */
    saveHistory() {
        // TODO: Save to persistent storage (globalState)
        this.logger.info('Saved analysis history');
    }
    /**
     * Clear all history
     */
    clearAll() {
        this.history = [];
        this.saveHistory();
        this._onDidChangeTreeData.fire();
        this.logger.info('Cleared all analysis history');
    }
    /**
     * Get history count
     */
    getHistoryCount() {
        return this.history.length;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}
exports.AnalysisHistoryProvider = AnalysisHistoryProvider;
//# sourceMappingURL=analysis-history.js.map