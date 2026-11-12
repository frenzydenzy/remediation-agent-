/**
 * Main extension entry point for AI Remediation Agent
 * Initializes all components, registers commands, and sets up event listeners
 */

import * as vscode from 'vscode';
import { EXTENSION_ID, COMMANDS } from './constants';
import { Logger } from './utils/logger';
import { OAuthManager } from './credentials/oauth-manager';
import { HookManager } from './hooks/hook-manager';
import { StatusBarManager } from './ui/status-bar';
import { ConfigManager } from './config/config-manager';
import { BackendCommunicator } from './engine-integration/backend-communicator';

let logger: Logger;
let oauthManager: OAuthManager;
let hookManager: HookManager;
let statusBar: StatusBarManager;
let configManager: ConfigManager;
let backend: BackendCommunicator;

export async function activate(context: vscode.ExtensionContext) {
  try {
    // Initialize core services
    logger = new Logger('RemediationAgent');
    logger.info('🚀 Activating AI Remediation Agent Extension');

    configManager = new ConfigManager();
    const config = configManager.getConfig();

    if (!config.enabled) {
      logger.info('Extension is disabled in settings');
      return;
    }

    // Initialize OAuth manager
    oauthManager = new OAuthManager(context, configManager, logger);

    // Initialize hook manager
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      logger.warn('No workspace folder found');
      return;
    }

    hookManager = new HookManager(workspace.uri.fsPath, logger);

    // Initialize backend communicator
    backend = new BackendCommunicator(logger, configManager);

    // Initialize status bar
    statusBar = new StatusBarManager(logger);
    statusBar.show();

    // Register commands
    registerCommands(context, oauthManager, backend, hookManager, logger);

    // Set up event listeners
    setupEventListeners(context, hookManager, backend, logger);

    // Install hooks if not already installed
    if (!context.globalState.get('hooks-installed')) {
      await hookManager.setupHooks();
      await context.globalState.update('hooks-installed', true);
      logger.info('✓ Git hooks installed');
    }

    // Set extension state
    await vscode.commands.executeCommand('setContext', 'remediationAgent.installed', true);

    logger.info('✓ AI Remediation Agent Extension activated');
    vscode.window.showInformationMessage('✓ AI Remediation Agent is ready');
  } catch (error) {
    logger?.error(`Failed to activate extension: ${error}`);
    vscode.window.showErrorMessage(`Extension activation failed: ${error}`);
  }
}

function registerCommands(
  context: vscode.ExtensionContext,
  oauth: OAuthManager,
  backend: BackendCommunicator,
  hooks: HookManager,
  log: Logger
) {
  // Authenticate command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.AUTHENTICATE, async () => {
      try {
        log.info('User initiated authentication');
        const result = await oauth.authenticate();
        if (result) {
          vscode.window.showInformationMessage('✓ Successfully authenticated');
          statusBar.setAuthenticated();
        }
      } catch (error) {
        log.error(`Authentication failed: ${error}`);
        vscode.window.showErrorMessage(`Authentication failed: ${error}`);
      }
    })
  );

  // Run analysis command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.RUN_ANALYSIS, async () => {
      try {
        log.info('User initiated full analysis');
        statusBar.setAnalyzing();
        const result = await backend.runFullAnalysis();
        if (result.success) {
          vscode.window.showInformationMessage('✓ Analysis complete');
          statusBar.setReady();
        } else {
          vscode.window.showErrorMessage(`Analysis failed: ${result.error}`);
          statusBar.setError();
        }
      } catch (error) {
        log.error(`Analysis failed: ${error}`);
        vscode.window.showErrorMessage(`Analysis failed: ${error}`);
        statusBar.setError();
      }
    })
  );

  // Open settings command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.OPEN_SETTINGS, async () => {
      await vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'remediationAgent'
      );
    })
  );

  // Clear cache command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.CLEAR_CACHE, async () => {
      try {
        log.info('User initiated cache clear');
        await context.globalState.update('analysis-cache', {});
        vscode.window.showInformationMessage('✓ Analysis cache cleared');
      } catch (error) {
        log.error(`Cache clear failed: ${error}`);
        vscode.window.showErrorMessage(`Cache clear failed: ${error}`);
      }
    })
  );

  // Logout command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.LOGOUT, async () => {
      try {
        log.info('User initiated logout');
        await oauth.logout();
        vscode.window.showInformationMessage('✓ Successfully logged out');
        statusBar.setUnauthenticated();
      } catch (error) {
        log.error(`Logout failed: ${error}`);
        vscode.window.showErrorMessage(`Logout failed: ${error}`);
      }
    })
  );
}

function setupEventListeners(
  context: vscode.ExtensionContext,
  hooks: HookManager,
  backend: BackendCommunicator,
  log: Logger
) {
  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('remediationAgent')) {
        log.info('Configuration changed');
        // Reload configuration
        const config = new ConfigManager().getConfig();
        // Re-setup hooks if needed
        if (config.preCommit.enabled || config.postCommit.enabled) {
          await hooks.setupHooks();
        }
      }
    })
  );

  // Listen for file changes to update status
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      statusBar.setModified();
    })
  );

  // Listen for focus changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      statusBar.update();
    })
  );
}

export function deactivate() {
  logger?.info('🛑 Deactivating AI Remediation Agent Extension');
  statusBar?.dispose();
  // Cleanup resources
}
