# Phase 7.11 Integration Guide - Wiring Components Together

**Objective:** Connect tree views, diagnostics, handlers, and panels into cohesive extension  
**Estimated Time:** 4-6 hours  
**Complexity:** Medium

## Overview

This guide provides step-by-step instructions for Phase 7.11 integration work. It connects:
- Tree view providers (analysis history, recommendations)
- Inline diagnostics (editor squiggles)
- Pre-commit and post-commit handlers
- Security and summary panels
- Persistence layer

## Step 1: Update extension.ts - Imports and Initialization

**File:** `.vscode-ext/src/extension.ts`

Add these imports at the top:

```typescript
// Views (Phase 7.9)
import { AnalysisHistoryProvider } from './views/analysis-history';
import { RecommendationsProvider } from './views/recommendations';

// UI (Phase 7.8-7.10)
import { SecurityPanel } from './ui/security-panel';
import { SummaryPanel } from './ui/summary-panel';
import { InlineDiagnostics } from './ui/diagnostics';

// Handlers (Phase 7.7)
import { PreCommitHandler } from './hooks/pre-commit-handler';
import { PostCommitHandler } from './hooks/post-commit-handler';
```

In `activate()` function, after logger initialization, add:

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // ... existing code ...
  const logger = new Logger(context);

  // ===== PHASE 7.9: Initialize Providers =====
  const historyProvider = new AnalysisHistoryProvider(logger);
  const recommendationsProvider = new RecommendationsProvider(logger);

  // Register tree data providers
  vscode.window.registerTreeDataProvider('remediation-history', historyProvider);
  vscode.window.registerTreeDataProvider('remediation-recommendations', recommendationsProvider);

  context.subscriptions.push(historyProvider);
  context.subscriptions.push(recommendationsProvider);

  logger.info('Tree view providers registered');

  // ===== PHASE 7.10: Initialize Diagnostics =====
  const diagnostics = new InlineDiagnostics(context, logger);
  context.subscriptions.push(diagnostics);
  logger.info('Inline diagnostics initialized');

  // ===== PHASE 7.8: Initialize Panels =====
  const securityPanel = new SecurityPanel(context, logger);
  const summaryPanel = new SummaryPanel(context, logger);
  context.subscriptions.push(securityPanel, summaryPanel);
  logger.info('Panels initialized');

  // ===== Store references for handlers =====
  const uiComponents = {
    securityPanel,
    summaryPanel,
    diagnostics,
    historyProvider,
    recommendationsProvider,
  };

  // Continue with existing extension code...
}
```

## Step 2: Update package.json - Add View Contributions

**File:** `.vscode-ext/package.json`

Add to `contributes` section:

```json
{
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "remediation-history",
          "name": "Analysis History",
          "icon": "$(history)",
          "when": "workbenchState == 'workspace'"
        },
        {
          "id": "remediation-recommendations",
          "name": "Security Recommendations",
          "icon": "$(lightbulb)",
          "when": "workbenchState == 'workspace'"
        }
      ]
    },
    "commands": [
      {
        "command": "remediation.refreshHistory",
        "title": "Refresh History",
        "category": "Remediation Agent",
        "icon": "$(refresh)"
      },
      {
        "command": "remediation.clearHistory",
        "title": "Clear History",
        "category": "Remediation Agent"
      },
      {
        "command": "remediation.viewAnalysis",
        "title": "View Analysis Details",
        "category": "Remediation Agent"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "remediation.refreshHistory",
          "when": "view == remediation-history",
          "group": "navigation"
        },
        {
          "command": "remediation.clearHistory",
          "when": "view == remediation-history"
        }
      ],
      "view/item/context": [
        {
          "command": "remediation.viewAnalysis",
          "when": "viewItem == analysis"
        }
      ]
    }
  }
}
```

## Step 3: Create UIManager for Centralized Access

**File:** `.vscode-ext/src/ui/ui-manager.ts` (NEW)

```typescript
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { SecurityPanel } from './security-panel';
import { SummaryPanel } from './summary-panel';
import { InlineDiagnostics } from './diagnostics';
import { AnalysisHistoryProvider } from '../views/analysis-history';
import { RecommendationsProvider } from '../views/recommendations';
import { SecurityFinding, AnalysisSummary } from '../constants';

/**
 * Centralized UI component manager
 * Provides single point of access for all UI operations
 */
export class UIManager {
  constructor(
    private securityPanel: SecurityPanel,
    private summaryPanel: SummaryPanel,
    private diagnostics: InlineDiagnostics,
    private historyProvider: AnalysisHistoryProvider,
    private recommendationsProvider: RecommendationsProvider,
    private logger: Logger
  ) {}

  /**
   * Show security findings before commit
   */
  async showSecurityFindings(findings: SecurityFinding[], gitDir: string): Promise<boolean> {
    try {
      // Show inline diagnostics
      this.diagnostics.showFindings(findings);

      // Show security panel
      const approved = await this.securityPanel.show(findings, gitDir);

      return approved;
    } catch (error) {
      this.logger.error(`Failed to show security findings: ${error}`);
      throw error;
    }
  }

  /**
   * Show post-commit analysis
   */
  async showAnalysisSummary(summary: AnalysisSummary, gitDir: string): Promise<void> {
    try {
      // Add to history
      this.historyProvider.addAnalysis(summary);

      // Update recommendations
      if (summary.recommendations) {
        for (const rec of summary.recommendations) {
          this.recommendationsProvider.addRecommendation(rec);
        }
      }

      // Show summary panel
      await this.summaryPanel.show(summary, gitDir);
    } catch (error) {
      this.logger.error(`Failed to show analysis summary: ${error}`);
      throw error;
    }
  }

  /**
   * Clear all findings from editor
   */
  clearFindings(): void {
    this.diagnostics.clear();
    this.logger.info('Cleared all findings from editor');
  }

  /**
   * Refresh tree views
   */
  refreshViews(): void {
    this.historyProvider.refresh();
    this.recommendationsProvider.refresh();
    this.logger.info('Refreshed tree views');
  }

  /**
   * Export all UI components (for testing)
   */
  getComponents() {
    return {
      securityPanel: this.securityPanel,
      summaryPanel: this.summaryPanel,
      diagnostics: this.diagnostics,
      historyProvider: this.historyProvider,
      recommendationsProvider: this.recommendationsProvider,
    };
  }

  dispose(): void {
    this.logger.info('Disposing UIManager');
  }
}
```

## Step 4: Wire Handlers to UI Manager

**File:** `.vscode-ext/src/hooks/pre-commit-handler.ts`

Modify to accept and use UIManager:

```typescript
import { UIManager } from '../ui/ui-manager';

export class PreCommitHandler {
  constructor(
    private communicator: BackendCommunicator,
    private config: ConfigManager,
    private logger: Logger,
    private uiManager: UIManager  // NEW
  ) {}

  async execute(gitDir: string): Promise<PreCommitResult> {
    try {
      // ... existing execution logic ...
      const result = await this.communicator.runSecurityCheck(
        stagedFiles,
        this.config.getLanguageFilter()
      );

      // NEW: Show findings in UI
      if (result.findings && result.findings.length > 0) {
        const approved = await this.uiManager.showSecurityFindings(
          result.findings,
          gitDir
        );

        return {
          allowed: approved,
          reason: approved ? 'User approved' : 'User blocked commit',
          blocking: !approved,
          findings: result.findings,
        };
      }

      return {
        allowed: true,
        reason: 'No security issues found',
        blocking: false,
        findings: [],
      };
    } catch (error) {
      this.logger.error(`Pre-commit handler failed: ${error}`);
      throw error;
    }
  }
}
```

**File:** `.vscode-ext/src/hooks/post-commit-handler.ts`

Modify to accept and use UIManager:

```typescript
import { UIManager } from '../ui/ui-manager';

export class PostCommitHandler {
  constructor(
    private communicator: BackendCommunicator,
    private config: ConfigManager,
    private logger: Logger,
    private uiManager: UIManager  // NEW
  ) {}

  async execute(gitDir: string): Promise<PostCommitResult> {
    try {
      // ... existing execution logic ...
      const summary = await this.communicator.runFullAnalysis(
        changedFiles,
        this.config.getLanguageFilter()
      );

      // NEW: Show summary in UI
      await this.uiManager.showAnalysisSummary(summary, gitDir);

      return {
        success: true,
        summary,
        commitInfo,
        changedFiles,
      };
    } catch (error) {
      this.logger.error(`Post-commit handler failed: ${error}`);
      throw error;
    }
  }
}
```

## Step 5: Create Git Hook Wiring

**File:** `.vscode-ext/src/git/git-hook-manager.ts` (NEW)

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { PreCommitHandler } from '../hooks/pre-commit-handler';
import { PostCommitHandler } from '../hooks/post-commit-handler';

/**
 * Manages installation and execution of git hooks
 */
export class GitHookManager {
  constructor(
    private preCommitHandler: PreCommitHandler,
    private postCommitHandler: PostCommitHandler,
    private logger: Logger
  ) {}

  /**
   * Install git hooks for the repository
   */
  async installHooks(gitDir: string): Promise<void> {
    try {
      const hooksDir = path.join(gitDir, '.git', 'hooks');

      // Create hooks directory if it doesn't exist
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }

      // Install pre-commit hook
      const preCommitPath = path.join(hooksDir, 'pre-commit');
      this.createHookFile(
        preCommitPath,
        this.getPreCommitHookScript()
      );

      // Install post-commit hook
      const postCommitPath = path.join(hooksDir, 'post-commit');
      this.createHookFile(
        postCommitPath,
        this.getPostCommitHookScript()
      );

      this.logger.info(`Installed git hooks in ${gitDir}`);
    } catch (error) {
      this.logger.error(`Failed to install git hooks: ${error}`);
      throw error;
    }
  }

  /**
   * Remove git hooks from the repository
   */
  async uninstallHooks(gitDir: string): Promise<void> {
    try {
      const hooksDir = path.join(gitDir, '.git', 'hooks');
      const preCommitPath = path.join(hooksDir, 'pre-commit');
      const postCommitPath = path.join(hooksDir, 'post-commit');

      if (fs.existsSync(preCommitPath)) {
        fs.unlinkSync(preCommitPath);
      }

      if (fs.existsSync(postCommitPath)) {
        fs.unlinkSync(postCommitPath);
      }

      this.logger.info(`Removed git hooks from ${gitDir}`);
    } catch (error) {
      this.logger.error(`Failed to remove git hooks: ${error}`);
      throw error;
    }
  }

  /**
   * Get pre-commit hook script
   */
  private getPreCommitHookScript(): string {
    return `#!/bin/sh
# Pre-commit hook for Remediation Agent
# Runs security analysis on staged files

node "${__dirname}/../hooks/pre-commit-hook.js"
exit $?
`;
  }

  /**
   * Get post-commit hook script
   */
  private getPostCommitHookScript(): string {
    return `#!/bin/sh
# Post-commit hook for Remediation Agent
# Runs full impact analysis after commit

node "${__dirname}/../hooks/post-commit-hook.js"
exit 0
`;
  }

  /**
   * Create hook file with executable permissions
   */
  private createHookFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, { mode: 0o755 });
  }
}
```

## Step 6: Register Command Handlers in extension.ts

**File:** `.vscode-ext/src/extension.ts`

Add to `activate()` function:

```typescript
// Register commands
vscode.commands.registerCommand('remediation.refreshHistory', () => {
  historyProvider.refresh();
  recommendationsProvider.refresh();
  logger.info('User refreshed history');
});

vscode.commands.registerCommand('remediation.clearHistory', () => {
  const confirm = vscode.window.showWarningMessage(
    'Clear all analysis history?',
    'Clear',
    'Cancel'
  );

  confirm.then((choice) => {
    if (choice === 'Clear') {
      historyProvider.clearAll?.();
      logger.info('User cleared history');
    }
  });
});

vscode.commands.registerCommand('remediation.viewAnalysis', (item) => {
  if (item?.data) {
    summaryPanel.show(item.data, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
  }
});

logger.info('Commands registered');
```

## Step 7: Persistence Layer Implementation

**File:** `.vscode-ext/src/utils/storage-manager.ts` (NEW)

```typescript
import * as vscode from 'vscode';
import { Logger } from './logger';
import { AnalysisSummary } from '../constants';
import { Recommendation } from '../views/recommendations';

export class StorageManager {
  private readonly HISTORY_KEY = 'remediation.analysis-history';
  private readonly RECOMMENDATIONS_KEY = 'remediation.recommendations';

  constructor(
    private context: vscode.ExtensionContext,
    private logger: Logger
  ) {}

  /**
   * Save analysis to history
   */
  async saveAnalysis(analysis: AnalysisSummary): Promise<void> {
    try {
      const history = this.getHistory();
      history.unshift(analysis);

      // Keep last 20
      if (history.length > 20) {
        history.splice(20);
      }

      await this.context.globalState.update(
        this.HISTORY_KEY,
        history
      );

      this.logger.info(`Saved analysis to history (total: ${history.length})`);
    } catch (error) {
      this.logger.error(`Failed to save analysis: ${error}`);
    }
  }

  /**
   * Get analysis history
   */
  getHistory(): AnalysisSummary[] {
    const history = this.context.globalState.get<AnalysisSummary[]>(
      this.HISTORY_KEY,
      []
    );
    return history;
  }

  /**
   * Clear history
   */
  async clearHistory(): Promise<void> {
    await this.context.globalState.update(this.HISTORY_KEY, []);
    this.logger.info('Cleared analysis history');
  }

  /**
   * Save recommendation
   */
  async saveRecommendation(rec: Recommendation): Promise<void> {
    try {
      const recommendations = this.getRecommendations();
      const existing = recommendations.findIndex((r) => r.id === rec.id);

      if (existing >= 0) {
        recommendations[existing] = rec;
      } else {
        recommendations.push(rec);
      }

      await this.context.globalState.update(
        this.RECOMMENDATIONS_KEY,
        recommendations
      );

      this.logger.info(`Saved recommendation: ${rec.title}`);
    } catch (error) {
      this.logger.error(`Failed to save recommendation: ${error}`);
    }
  }

  /**
   * Get all recommendations
   */
  getRecommendations(): Recommendation[] {
    return this.context.globalState.get<Recommendation[]>(
      this.RECOMMENDATIONS_KEY,
      []
    );
  }

  /**
   * Clear recommendations
   */
  async clearRecommendations(): Promise<void> {
    await this.context.globalState.update(this.RECOMMENDATIONS_KEY, []);
    this.logger.info('Cleared recommendations');
  }
}
```

## Step 8: Testing Checklist

Before proceeding to Phase 7.12:

- [ ] Tree views appear in explorer sidebar
- [ ] Providers load without errors
- [ ] Pre-commit handler shows security findings
- [ ] Post-commit handler shows summary panel
- [ ] Inline diagnostics display in editor
- [ ] History tree expands and shows metrics
- [ ] Recommendations tree populated after analyses
- [ ] Refresh command works
- [ ] Clear command works
- [ ] Data persists after VS Code restart
- [ ] No console errors in Developer Tools

## Remaining Phases

### Phase 7.12: Marketplace Preparation
- Package extension for VS Code Marketplace
- Create README with installation and usage guide
- Generate marketplace documentation
- Submit to marketplace

### Phase 7.13: Documentation
- Write user guide
- Create troubleshooting guide
- Document API for developers
- Create architecture guide

---

**Ready for implementation. Start with Step 1 and proceed sequentially.**
