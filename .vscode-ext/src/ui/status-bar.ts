/**
 * Status bar manager for displaying extension status
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private state: 'ready' | 'analyzing' | 'error' | 'authenticated' | 'unauthenticated' | 'modified' = 'ready';

  constructor(private logger: Logger) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.update();
  }

  show(): void {
    this.statusBarItem.show();
  }

  hide(): void {
    this.statusBarItem.hide();
  }

  setReady(): void {
    this.state = 'ready';
    this.update();
  }

  setAnalyzing(): void {
    this.state = 'analyzing';
    this.update();
  }

  setError(): void {
    this.state = 'error';
    this.update();
  }

  setAuthenticated(): void {
    this.state = 'authenticated';
    this.update();
  }

  setUnauthenticated(): void {
    this.state = 'unauthenticated';
    this.update();
  }

  setModified(): void {
    this.state = 'modified';
    this.update();
  }

  update(): void {
    switch (this.state) {
      case 'ready':
        this.statusBarItem.text = '🔍 Remediation Agent: Ready';
        this.statusBarItem.tooltip = 'Click to run analysis';
        this.statusBarItem.command = 'remediationAgent.runAnalysis';
        break;
      case 'analyzing':
        this.statusBarItem.text = '⏳ Remediation Agent: Analyzing...';
        this.statusBarItem.tooltip = 'Analysis in progress';
        break;
      case 'error':
        this.statusBarItem.text = '❌ Remediation Agent: Error';
        this.statusBarItem.tooltip = 'Click to view error details';
        this.statusBarItem.command = 'remediationAgent.viewSecurityPanel';
        break;
      case 'authenticated':
        this.statusBarItem.text = '✅ Remediation Agent: Connected';
        this.statusBarItem.tooltip = 'Authenticated with GitHub/GitLab';
        break;
      case 'unauthenticated':
        this.statusBarItem.text = '🔐 Remediation Agent: Not Connected';
        this.statusBarItem.tooltip = 'Click to authenticate';
        this.statusBarItem.command = 'remediationAgent.authenticate';
        break;
      case 'modified':
        this.statusBarItem.text = '✏️ Remediation Agent: Modified';
        this.statusBarItem.tooltip = 'Files have been modified';
        break;
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
