/**
 * Security Panel - Displays pre-commit security findings
 * Allows user to review issues and optionally block commit
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { SecurityAnalysisResult, SecurityFinding, SEVERITY, SEVERITY_ORDER } from '../constants';

export class SecurityPanel {
  private panel: vscode.WebviewPanel | undefined;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Show security findings panel
   */
  async show(findings: SecurityAnalysisResult, extensionUri: vscode.Uri): Promise<SecurityPanelAction> {
    try {
      this.logger.info(`Showing security panel with ${findings.findings.length} findings`);

      // Create or show panel
      if (!this.panel) {
        this.panel = vscode.window.createWebviewPanel(
          'security-findings',
          '🔐 Security Analysis',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            localResourceRoots: [extensionUri],
          }
        );

        this.panel.onDidDispose(() => {
          this.panel = undefined;
        });
      } else {
        this.panel.reveal(vscode.ViewColumn.One);
      }

      // Set HTML content
      this.panel.webview.html = this.getWebviewContent(findings, this.panel.webview);

      // Handle messages from webview
      return new Promise((resolve) => {
        const disposable = this.panel!.webview.onDidReceiveMessage((message) => {
          this.logger.info(`Received action: ${message.command}`);
          disposable.dispose();

          if (message.command === 'allow') {
            resolve('allow');
          } else if (message.command === 'block') {
            resolve('block');
          } else if (message.command === 'review') {
            resolve('review');
          } else {
            resolve('allow');
          }
        });
      });
    } catch (error) {
      this.logger.error(`Failed to show security panel: ${error}`);
      throw error;
    }
  }

  /**
   * Generate HTML content for webview
   */
  private getWebviewContent(findings: SecurityAnalysisResult, webview: vscode.Webview): string {
    // Sort findings by severity
    const sortedFindings = [...findings.findings].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    );

    // Group by severity
    const bySeverity = this.groupBySeverity(sortedFindings);

    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Analysis</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      border-bottom: 2px solid var(--vscode-focusBorder);
      padding-bottom: 20px;
    }

    .title {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }

    .summary-item {
      background: var(--vscode-textBlockQuote-background);
      border-left: 4px solid;
      padding: 15px;
      border-radius: 4px;
    }

    .critical { border-left-color: #ff4444; }
    .high { border-left-color: #ff9900; }
    .medium { border-left-color: #ffcc00; }
    .low { border-left-color: #0099ff; }

    .summary-label {
      font-size: 12px;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 8px;
    }

    .summary-value {
      font-size: 28px;
      font-weight: 700;
    }

    .findings {
      margin-bottom: 30px;
    }

    .severity-group {
      margin-bottom: 25px;
    }

    .severity-heading {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .severity-heading.critical { color: #ff4444; }
    .severity-heading.high { color: #ff9900; }
    .severity-heading.medium { color: #ffcc00; }
    .severity-heading.low { color: #0099ff; }

    .finding {
      background: var(--vscode-textBlockQuote-background);
      border-left: 4px solid;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .finding:hover {
      opacity: 0.8;
      transform: translateX(4px);
    }

    .finding.critical { border-left-color: #ff4444; }
    .finding.high { border-left-color: #ff9900; }
    .finding.medium { border-left-color: #ffcc00; }
    .finding.low { border-left-color: #0099ff; }

    .finding-title {
      font-weight: 600;
      margin-bottom: 6px;
    }

    .finding-location {
      font-size: 12px;
      opacity: 0.7;
      margin-bottom: 8px;
      font-family: 'Monaco', 'Courier New', monospace;
    }

    .finding-description {
      font-size: 13px;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      gap: 12px;
      padding-top: 20px;
      border-top: 2px solid var(--vscode-focusBorder);
    }

    button {
      flex: 1;
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-allow {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-allow:hover {
      opacity: 0.9;
    }

    .btn-block {
      background: #ff4444;
      color: white;
    }

    .btn-block:hover {
      opacity: 0.9;
    }

    .btn-review {
      background: var(--vscode-textBlockQuote-background);
      color: var(--vscode-editor-foreground);
      border: 1px solid var(--vscode-focusBorder);
    }

    .btn-review:hover {
      opacity: 0.8;
    }

    .empty {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.7;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">🔐 Security Analysis</h1>
    </div>

    <div class="summary">
      <div class="summary-item critical">
        <div class="summary-label">Critical</div>
        <div class="summary-value">${findings.critical}</div>
      </div>
      <div class="summary-item high">
        <div class="summary-label">High</div>
        <div class="summary-value">${findings.high}</div>
      </div>
      <div class="summary-item medium">
        <div class="summary-label">Medium</div>
        <div class="summary-value">${findings.medium}</div>
      </div>
      <div class="summary-item low">
        <div class="summary-label">Low</div>
        <div class="summary-value">${findings.low}</div>
      </div>
    </div>

    ${this.renderFindings(bySeverity)}

    <div class="actions">
      <button class="btn-allow" onclick="sendMessage('allow')">✅ Allow Commit</button>
      <button class="btn-block" onclick="sendMessage('block')">⏹️ Block Commit</button>
      <button class="btn-review" onclick="sendMessage('review')">📖 Review Full Report</button>
    </div>
  </div>

  <script nonce="${nonce}">
    function sendMessage(command) {
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ command });
    }
  </script>
</body>
</html>`;
  }

  /**
   * Render findings HTML
   */
  private renderFindings(bySeverity: Map<string, SecurityFinding[]>): string {
    if (bySeverity.size === 0) {
      return `
        <div class="empty">
          <div class="empty-icon">✅</div>
          <h2>No Security Issues Found</h2>
          <p>Your code looks great!</p>
        </div>
      `;
    }

    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    let html = '<div class="findings">';

    for (const severity of severityOrder) {
      const items = bySeverity.get(severity);
      if (!items || items.length === 0) continue;

      const severityLower = severity.toLowerCase();
      const icons = {
        CRITICAL: '🔴',
        HIGH: '🟠',
        MEDIUM: '🟡',
        LOW: '🔵',
      };

      html += `
        <div class="severity-group">
          <div class="severity-heading ${severityLower}">
            ${icons[severity as keyof typeof icons]} ${severity} (${items.length})
          </div>
      `;

      for (const finding of items) {
        html += `
          <div class="finding ${severityLower}">
            <div class="finding-title">${finding.title}</div>
            <div class="finding-location">${finding.file}:${finding.line}</div>
            <div class="finding-description">${finding.description || ''}</div>
            ${finding.recommendation ? `<div class="finding-description">💡 ${finding.recommendation}</div>` : ''}
          </div>
        `;
      }

      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Group findings by severity
   */
  private groupBySeverity(findings: SecurityFinding[]): Map<string, SecurityFinding[]> {
    const grouped = new Map<string, SecurityFinding[]>();

    for (const finding of findings) {
      if (!grouped.has(finding.severity)) {
        grouped.set(finding.severity, []);
      }
      grouped.get(finding.severity)!.push(finding);
    }

    return grouped;
  }

  /**
   * Generate nonce for CSP
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  dispose(): void {
    if (this.panel) {
      this.panel.dispose();
    }
  }
}

export type SecurityPanelAction = 'allow' | 'block' | 'review';
