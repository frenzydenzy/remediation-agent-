/**
 * Inline Diagnostics - Shows issues inline in VS Code editor
 * Creates diagnostic collection and maps findings to editor lines
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { SecurityFinding, SEVERITY, SEVERITY_ORDER } from '../constants';

export class InlineDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private logger: Logger;

  constructor(context: vscode.ExtensionContext, logger: Logger) {
    this.logger = logger;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('remediation-agent');
    context.subscriptions.push(this.diagnosticCollection);
  }

  /**
   * Show findings as inline diagnostics
   */
  showFindings(findings: SecurityFinding[]): void {
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
    } catch (error) {
      this.logger.error(`Failed to show inline diagnostics: ${error}`);
    }
  }

  /**
   * Clear all diagnostics
   */
  clear(): void {
    this.diagnosticCollection.clear();
    this.logger.info('Cleared inline diagnostics');
  }

  /**
   * Create VS Code diagnostic from finding
   */
  private createDiagnostic(finding: SecurityFinding): vscode.Diagnostic {
    const range = new vscode.Range(
      new vscode.Position(Math.max(0, finding.line - 1), 0),
      new vscode.Position(Math.max(0, finding.line - 1), 1000)
    );

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
  private mapSeverity(severity: string): vscode.DiagnosticSeverity {
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
  private formatMessage(finding: SecurityFinding): string {
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
  private groupByFile(findings: SecurityFinding[]): Map<string, SecurityFinding[]> {
    const grouped = new Map<string, SecurityFinding[]>();

    for (const finding of findings) {
      if (!grouped.has(finding.file)) {
        grouped.set(finding.file, []);
      }
      grouped.get(finding.file)!.push(finding);
    }

    return grouped;
  }

  /**
   * Get diagnostics count
   */
  getDiagnosticsCount(): number {
    let count = 0;
    this.diagnosticCollection.forEach(() => count++);
    return count;
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
