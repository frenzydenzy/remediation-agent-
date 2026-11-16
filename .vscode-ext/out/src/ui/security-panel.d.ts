/**
 * Security Panel - Displays pre-commit security findings
 * Allows user to review issues and optionally block commit
 */
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { SecurityAnalysisResult } from '../constants';
export declare class SecurityPanel {
    private panel;
    private logger;
    constructor(logger: Logger);
    /**
     * Show security findings panel
     */
    show(findings: SecurityAnalysisResult, extensionUri: vscode.Uri): Promise<SecurityPanelAction>;
    /**
     * Generate HTML content for webview
     */
    private getWebviewContent;
    /**
     * Render findings HTML
     */
    private renderFindings;
    /**
     * Group findings by severity
     */
    private groupBySeverity;
    /**
     * Generate nonce for CSP
     */
    private getNonce;
    dispose(): void;
}
export type SecurityPanelAction = 'allow' | 'block' | 'review';
//# sourceMappingURL=security-panel.d.ts.map