/**
 * Summary Panel - Displays post-commit impact analysis summary
 * Shows metrics, recommendations, and embedded diagrams
 */
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AnalysisSummary } from '../constants';
export declare class SummaryPanel {
    private panel;
    private logger;
    constructor(logger: Logger);
    /**
     * Show analysis summary panel
     */
    show(summary: AnalysisSummary, extensionUri: vscode.Uri): Promise<void>;
    /**
     * Generate HTML content for webview
     */
    private getWebviewContent;
    /**
     * Get impact icon based on level
     */
    private getImpactIcon;
    /**
     * Get impact color based on level
     */
    private getImpactColor;
    /**
     * Escape HTML special characters
     */
    private escapeHtml;
    /**
     * Generate nonce for CSP
     */
    private getNonce;
    dispose(): void;
}
//# sourceMappingURL=summary-panel.d.ts.map