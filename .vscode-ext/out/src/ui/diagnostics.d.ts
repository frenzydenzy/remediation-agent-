/**
 * Inline Diagnostics - Shows issues inline in VS Code editor
 * Creates diagnostic collection and maps findings to editor lines
 */
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { SecurityFinding } from '../constants';
export declare class InlineDiagnostics {
    private diagnosticCollection;
    private logger;
    constructor(context: vscode.ExtensionContext, logger: Logger);
    /**
     * Show findings as inline diagnostics
     */
    showFindings(findings: SecurityFinding[]): void;
    /**
     * Clear all diagnostics
     */
    clear(): void;
    /**
     * Create VS Code diagnostic from finding
     */
    private createDiagnostic;
    /**
     * Map finding severity to VS Code severity
     */
    private mapSeverity;
    /**
     * Format diagnostic message
     */
    private formatMessage;
    /**
     * Group findings by file
     */
    private groupByFile;
    /**
     * Get diagnostics count
     */
    getDiagnosticsCount(): number;
    dispose(): void;
}
//# sourceMappingURL=diagnostics.d.ts.map