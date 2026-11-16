"use strict";
/**
 * Recommendations Tree View Provider
 * Shows aggregated recommendations from all past analyses
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
exports.RecommendationsProvider = void 0;
const vscode = __importStar(require("vscode"));
class RecommendationsProvider {
    constructor(logger) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.recommendations = [];
        this.logger = logger;
        this.loadRecommendations();
    }
    /**
     * Cleanup resources
     */
    dispose() {
        this._onDidChangeTreeData.dispose();
    }
    /**
     * Get tree items
     */
    getTreeItem(element) {
        if (element.type === 'header') {
            return {
                label: '💡 Recommendations',
                collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            };
        }
        if (element.type === 'recommendation') {
            const rec = element.data;
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
    getChildren(element) {
        if (!element) {
            // Root level
            const header = { type: 'header', label: 'Recommendations' };
            const items = [header];
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
            const rec = element.data;
            const children = [];
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
    addRecommendation(rec) {
        const existing = this.recommendations.find((r) => r.id === rec.id);
        if (existing) {
            existing.frequency = rec.frequency;
            existing.issueCounts = rec.issueCounts;
            existing.examples = rec.examples;
        }
        else {
            this.recommendations.push(rec);
        }
        this.saveRecommendations();
        this._onDidChangeTreeData.fire();
        this.logger.info(`Updated recommendation: ${rec.title}`);
    }
    /**
     * Get severity icon
     */
    getSeverityIcon(severity) {
        const icons = {
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
    loadRecommendations() {
        // TODO: Load from persistent storage
        this.logger.info('Loaded recommendations');
    }
    /**
     * Save recommendations to storage
     */
    saveRecommendations() {
        // TODO: Save to persistent storage
        this.logger.info('Saved recommendations');
    }
    /**
     * Clear all recommendations
     */
    clearAll() {
        this.recommendations = [];
        this.saveRecommendations();
        this._onDidChangeTreeData.fire();
        this.logger.info('Cleared all recommendations');
    }
    /**
     * Get recommendation count
     */
    getRecommendationCount() {
        return this.recommendations.length;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}
exports.RecommendationsProvider = RecommendationsProvider;
//# sourceMappingURL=recommendations.js.map