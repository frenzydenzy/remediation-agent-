"use strict";
/**
 * Inline Diagnostics - Shows issues inline in VS Code editor
 * Creates diagnostic collection and maps findings to editor lines
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
exports.InlineDiagnostics = void 0;
const vscode = __importStar(require("vscode"));
class InlineDiagnostics {
    constructor(context, logger) {
        this.logger = logger;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('remediation-agent');
        context.subscriptions.push(this.diagnosticCollection);
    }
    /**
     * Show findings as inline diagnostics
     */
    showFindings(findings) {
        try {
            this.logger.info(`Showing inline diagnostics for ${findings.length} findings`);
            // Group findings by file
            const byFile = this.groupByFile(findings);
            // Clear previous diagnostics
            this.diagnosticCollection.clear();
            // Add diagnostics for each file
            for (const [filePath, fileFindings] of byFile) {
                const diagnostics = fileFindings.map((finding) => this.createDiagnostic(finding));
                this.diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
            }
        }
        catch (error) {
            this.logger.error(`Failed to show inline diagnostics: ${error}`);
        }
    }
    /**
     * Clear all diagnostics
     */
    clear() {
        this.diagnosticCollection.clear();
        this.logger.info('Cleared inline diagnostics');
    }
    /**
     * Create VS Code diagnostic from finding
     */
    createDiagnostic(finding) {
        const range = new vscode.Range(new vscode.Position(Math.max(0, finding.line - 1), 0), new vscode.Position(Math.max(0, finding.line - 1), 1000));
        const severity = this.mapSeverity(finding.severity);
        const message = this.formatMessage(finding);
        const diagnostic = new vscode.Diagnostic(range, message, severity);
        diagnostic.code = finding.category;
        diagnostic.source = 'Remediation Agent';
        return diagnostic;
    }
    /**
     * Map finding severity to VS Code severity
     */
    mapSeverity(severity) {
        switch (severity) {
            case 'CRITICAL':
            case 'HIGH':
                return vscode.DiagnosticSeverity.Error;
            case 'MEDIUM':
                return vscode.DiagnosticSeverity.Warning;
            case 'LOW':
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    }
    /**
     * Format diagnostic message
     */
    formatMessage(finding) {
        let message = `${finding.title}`;
        if (finding.description) {
            message += ` - ${finding.description}`;
        }
        if (finding.recommendation) {
            message += ` (Fix: ${finding.recommendation})`;
        }
        return message;
    }
    /**
     * Group findings by file
     */
    groupByFile(findings) {
        const grouped = new Map();
        for (const finding of findings) {
            if (!grouped.has(finding.file)) {
                grouped.set(finding.file, []);
            }
            grouped.get(finding.file).push(finding);
        }
        return grouped;
    }
    /**
     * Get diagnostics count
     */
    getDiagnosticsCount() {
        let count = 0;
        this.diagnosticCollection.forEach(() => count++);
        return count;
    }
    dispose() {
        this.diagnosticCollection.dispose();
    }
}
exports.InlineDiagnostics = InlineDiagnostics;
//# sourceMappingURL=diagnostics.js.map