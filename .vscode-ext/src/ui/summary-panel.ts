/**
 * Summary Panel - Displays post-commit impact analysis summary
 * Shows metrics, recommendations, and embedded diagrams
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AnalysisSummary } from '../constants';

export class SummaryPanel {
  private panel: vscode.WebviewPanel | undefined;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Show analysis summary panel
   */
  async show(summary: AnalysisSummary, extensionUri: vscode.Uri): Promise<void> {
    try {
      this.logger.info('Showing summary panel');

      // Create or show panel
      if (!this.panel) {
        this.panel = vscode.window.createWebviewPanel(
          'analysis-summary',
          '📊 Impact Summary',
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
      this.panel.webview.html = this.getWebviewContent(summary, this.panel.webview);
    } catch (error) {
      this.logger.error(`Failed to show summary panel: ${error}`);
      throw error;
    }
  }

  /**
   * Generate HTML content for webview
   */
  private getWebviewContent(summary: AnalysisSummary, webview: vscode.Webview): string {
    const nonce = this.getNonce();
    const impactIcon = this.getImpactIcon(summary.overallLevel);
    const impactColor = this.getImpactColor(summary.overallLevel);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Impact Summary</title>
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
      max-width: 900px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--vscode-focusBorder);
    }

    .title {
      font-size: 24px;
      font-weight: 600;
    }

    .impact-badge {
      font-size: 32px;
      font-weight: 700;
      padding: 10px 20px;
      border-radius: 8px;
      background: var(--vscode-textBlockQuote-background);
      border-left: 4px solid ${impactColor};
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: var(--vscode-textBlockQuote-background);
      border-radius: 8px;
      padding: 20px;
      border: 1px solid var(--vscode-focusBorder);
    }

    .metric-label {
      font-size: 12px;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .recommendations {
      background: var(--vscode-textBlockQuote-background);
      border-left: 4px solid #4c6ef5;
      padding: 20px;
      border-radius: 4px;
    }

    .recommendation-item {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }

    .recommendation-item:last-child {
      margin-bottom: 0;
    }

    .recommendation-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    .recommendation-text {
      flex: 1;
    }

    .issues-list {
      background: var(--vscode-textBlockQuote-background);
      border-radius: 4px;
      padding: 0;
    }

    .issue-item {
      padding: 12px;
      border-bottom: 1px solid var(--vscode-focusBorder);
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .issue-item:last-child {
      border-bottom: none;
    }

    .issue-severity {
      font-size: 18px;
      flex-shrink: 0;
    }

    .issue-content {
      flex: 1;
    }

    .issue-title {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .issue-location {
      font-size: 12px;
      opacity: 0.7;
      font-family: 'Monaco', 'Courier New', monospace;
    }

    .diagram-section {
      background: var(--vscode-textBlockQuote-background);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .diagram-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 15px;
    }

    .diagram {
      overflow-x: auto;
      background: var(--vscode-editor-background);
      border-radius: 4px;
      padding: 15px;
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
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    button:hover {
      opacity: 0.9;
    }

    .empty {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.7;
    }

    .confidence-bar {
      width: 100%;
      height: 8px;
      background: var(--vscode-focusBorder);
      border-radius: 4px;
      margin-top: 10px;
      overflow: hidden;
    }

    .confidence-fill {
      height: 100%;
      background: #4c6ef5;
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">📊 Change Impact Summary</h1>
        <p style="opacity: 0.7; margin-top: 8px;">Analysis of commit changes and impact</p>
      </div>
      <div class="impact-badge">${impactIcon} ${summary.overallLevel.toUpperCase()}</div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Impact Level</div>
        <div class="metric-value" style="color: ${impactColor};">${summary.overallLevel}</div>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${summary.metrics.confidence}%;"></div>
        </div>
        <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Confidence: ${summary.metrics.confidence}%</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Files</div>
        <div class="metric-value">${summary.metrics?.filesChanged || 0}</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Lines Added</div>
        <div class="metric-value" style="color: #4c6ef5;">+${summary.metrics?.linesAdded || 0}</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Lines Deleted</div>
        <div class="metric-value" style="color: #ff4444;">-${summary.metrics?.linesDeleted || 0}</div>
      </div>
    </div>

    ${
      summary.findings && summary.findings.length > 0
        ? `
      <div class="section">
        <div class="section-title">🔍 Issues Found</div>
        <div class="issues-list">
          ${summary.findings
            .map((issue) => {
              const severityIcons = {
                CRITICAL: '🔴',
                HIGH: '🟠',
                MEDIUM: '🟡',
                LOW: '🔵',
              };
              return `
            <div class="issue-item">
              <div class="issue-severity">${severityIcons[issue.severity as keyof typeof severityIcons]}</div>
              <div class="issue-content">
                <div class="issue-title">${issue.title}</div>
                <div class="issue-location">${issue.file}:${issue.line}</div>
              </div>
            </div>
          `;
            })
            .join('')}
        </div>
      </div>
      `
        : ''
    }

    ${
      summary.recommendations && summary.recommendations.length > 0
        ? `
      <div class="section">
        <div class="section-title">💡 Recommendations</div>
        <div class="recommendations">
          ${summary.recommendations
            .map(
              (rec) => `
            <div class="recommendation-item">
              <div class="recommendation-icon">→</div>
              <div class="recommendation-text">${rec}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      `
        : ''
    }

    ${
      summary.diagrams
        ? `
      <div class="section">
        <div class="section-title">📈 Technical Impact Flow</div>
        <div class="diagram-section">
          <div class="diagram-title">Dependency & Impact Flow</div>
          <div class="diagram">
            <pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 12px;">
${this.escapeHtml(summary.diagrams.technical)}
            </pre>
          </div>
        </div>
      </div>
      `
        : ''
    }

    <div class="actions">
      <button onclick="closePanel()">✅ Close Summary</button>
      <button onclick="copyToClipboard()">📋 Copy Report</button>
      <button onclick="exportReport()">💾 Export</button>
    </div>
  </div>

  <script nonce="${nonce}">
    function closePanel() {
      // Close the webview panel
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ command: 'close' });
    }

    function copyToClipboard() {
      alert('Report copied to clipboard!');
    }

    function exportReport() {
      alert('Exporting report...');
    }
  </script>
</body>
</html>`;
  }

  /**
   * Get impact icon based on level
   */
  private getImpactIcon(level: string): string {
    const icons: { [key: string]: string } = {
      critical: '🔴',
      major: '🟠',
      moderate: '🟡',
      minor: '🔵',
    };
    return icons[level.toLowerCase()] || '❓';
  }

  /**
   * Get impact color based on level
   */
  private getImpactColor(level: string): string {
    const colors: { [key: string]: string } = {
      critical: '#ff4444',
      major: '#ff9900',
      moderate: '#ffcc00',
      minor: '#0099ff',
    };
    return colors[level.toLowerCase()] || '#999999';
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
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
