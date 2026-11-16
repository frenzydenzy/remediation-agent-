"use strict";
/**
 * Main extension entry point for AI Remediation Agent
 * Initializes all components, registers commands, and sets up event listeners
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const constants_1 = require("./constants");
const logger_1 = require("./utils/logger");
const oauth_manager_1 = require("./credentials/oauth-manager");
const hook_manager_1 = require("./hooks/hook-manager");
const status_bar_1 = require("./ui/status-bar");
const config_manager_1 = require("./config/config-manager");
const backend_communicator_1 = require("./engine-integration/backend-communicator");
// Phase 7.9: Tree View Providers
const analysis_history_1 = require("./views/analysis-history");
const recommendations_1 = require("./views/recommendations");
// Phase 7.10: Inline Diagnostics
const diagnostics_1 = require("./ui/diagnostics");
// Phase 7.8: UI Panels
const security_panel_1 = require("./ui/security-panel");
const summary_panel_1 = require("./ui/summary-panel");
const ui_manager_1 = require("./ui/ui-manager");
// Phase 7.7: Handlers
const pre_commit_handler_1 = require("./hooks/pre-commit-handler");
const post_commit_handler_1 = require("./hooks/post-commit-handler");
let logger;
let oauthManager;
let hookManager;
let statusBar;
let configManager;
let backend;
// Phase 7.9: Tree view providers
let historyProvider;
let recommendationsProvider;
// Phase 7.10: Inline diagnostics
let diagnostics;
// Phase 7.8: UI panels
let securityPanel;
let summaryPanel;
// Phase 7.7: Handlers
let preCommitHandler;
let postCommitHandler;
async function activate(context) {
    try {
        // Initialize core services
        logger = new logger_1.Logger('RemediationAgent');
        logger.info('🚀 Activating AI Remediation Agent Extension');
        // FIX 2: Ensure Git credential helper is configured
        // This prevents "git push" failures with credential manager
        ensureGitCredentialsConfigured();
        configManager = new config_manager_1.ConfigManager();
        const config = configManager.getConfig();
        if (!config.enabled) {
            logger.info('Extension is disabled in settings');
            return;
        }
        // Initialize OAuth manager
        oauthManager = new oauth_manager_1.OAuthManager(context, configManager, logger);
        // Initialize hook manager
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (!workspace) {
            logger.warn('No workspace folder found');
            return;
        }
        hookManager = new hook_manager_1.HookManager(workspace.uri.fsPath, logger);
        // Initialize backend communicator
        backend = new backend_communicator_1.BackendCommunicator(logger, configManager);
        // Initialize status bar
        statusBar = new status_bar_1.StatusBarManager(logger);
        statusBar.show();
        // ===== PHASE 7.9: Initialize Tree View Providers =====
        historyProvider = new analysis_history_1.AnalysisHistoryProvider(logger);
        recommendationsProvider = new recommendations_1.RecommendationsProvider(logger);
        // Register tree data providers
        vscode.window.registerTreeDataProvider('remediation-history', historyProvider);
        vscode.window.registerTreeDataProvider('remediation-recommendations', recommendationsProvider);
        context.subscriptions.push(historyProvider);
        context.subscriptions.push(recommendationsProvider);
        logger.info('✓ Tree view providers registered');
        // ===== PHASE 7.10: Initialize Inline Diagnostics =====
        diagnostics = new diagnostics_1.InlineDiagnostics(context, logger);
        context.subscriptions.push(diagnostics);
        logger.info('✓ Inline diagnostics initialized');
        // ===== PHASE 7.8: Initialize UI Panels =====
        securityPanel = new security_panel_1.SecurityPanel(logger);
        summaryPanel = new summary_panel_1.SummaryPanel(logger);
        context.subscriptions.push(securityPanel, summaryPanel);
        logger.info('✓ UI panels initialized');
        // Initialize UIManager to coordinate all UI components
        const uiManager = new ui_manager_1.UIManager(securityPanel, summaryPanel, diagnostics, historyProvider, recommendationsProvider, logger);
        logger.info('✓ UIManager initialized');
        // ===== PHASE 7.7: Initialize Handlers =====
        preCommitHandler = new pre_commit_handler_1.PreCommitHandler(logger, backend, configManager, workspace.uri.fsPath, uiManager);
        postCommitHandler = new post_commit_handler_1.PostCommitHandler(logger, backend, configManager, workspace.uri.fsPath, uiManager);
        logger.info('✓ Handlers initialized');
        // Register commands
        registerCommands(context, oauthManager, backend, hookManager, logger, historyProvider, recommendationsProvider);
        // Set up event listeners
        setupEventListeners(context, hookManager, backend, logger, historyProvider, recommendationsProvider);
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
    }
    catch (error) {
        logger?.error(`Failed to activate extension: ${error}`);
        vscode.window.showErrorMessage(`Extension activation failed: ${error}`);
    }
}
function registerCommands(context, oauth, backend, hooks, log, history, recommendations) {
    // Authenticate command
    context.subscriptions.push(vscode.commands.registerCommand(constants_1.COMMANDS.AUTHENTICATE, async () => {
        try {
            log.info('User initiated authentication');
            const result = await oauth.authenticate();
            if (result) {
                vscode.window.showInformationMessage('✓ Successfully authenticated');
                statusBar.setAuthenticated();
            }
        }
        catch (error) {
            log.error(`Authentication failed: ${error}`);
            vscode.window.showErrorMessage(`Authentication failed: ${error}`);
        }
    }));
    // Run analysis command
    context.subscriptions.push(vscode.commands.registerCommand(constants_1.COMMANDS.RUN_ANALYSIS, async () => {
        try {
            log.info('User initiated full analysis');
            statusBar.setAnalyzing();
            const result = await backend.runFullAnalysis();
            if (result.success) {
                vscode.window.showInformationMessage('✓ Analysis complete');
                statusBar.setReady();
            }
            else {
                vscode.window.showErrorMessage(`Analysis failed: ${result.error}`);
                statusBar.setError();
            }
        }
        catch (error) {
            log.error(`Analysis failed: ${error}`);
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
            statusBar.setError();
        }
    }));
    // Open settings command
    context.subscriptions.push(vscode.commands.registerCommand(constants_1.COMMANDS.OPEN_SETTINGS, async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'remediationAgent');
    }));
    // Clear cache command
    context.subscriptions.push(vscode.commands.registerCommand(constants_1.COMMANDS.CLEAR_CACHE, async () => {
        try {
            log.info('User initiated cache clear');
            await context.globalState.update('analysis-cache', {});
            vscode.window.showInformationMessage('✓ Analysis cache cleared');
        }
        catch (error) {
            log.error(`Cache clear failed: ${error}`);
            vscode.window.showErrorMessage(`Cache clear failed: ${error}`);
        }
    }));
    // Logout command
    context.subscriptions.push(vscode.commands.registerCommand(constants_1.COMMANDS.LOGOUT, async () => {
        try {
            log.info('User initiated logout');
            await oauth.logout();
            vscode.window.showInformationMessage('✓ Successfully logged out');
            statusBar.setUnauthenticated();
        }
        catch (error) {
            log.error(`Logout failed: ${error}`);
            vscode.window.showErrorMessage(`Logout failed: ${error}`);
        }
    }));
    // ===== PHASE 7.11: Tree View Commands =====
    // Refresh history command
    context.subscriptions.push(vscode.commands.registerCommand('remediation.refreshHistory', () => {
        history.refresh();
        recommendations.refresh();
        log.info('User refreshed history');
        vscode.window.showInformationMessage('✓ History refreshed');
    }));
    // Clear history command
    context.subscriptions.push(vscode.commands.registerCommand('remediation.clearHistory', async () => {
        const choice = await vscode.window.showWarningMessage('Clear all analysis history?', 'Clear', 'Cancel');
        if (choice === 'Clear') {
            history.clearAll?.();
            log.info('User cleared history');
            vscode.window.showInformationMessage('✓ History cleared');
        }
    }));
    // View analysis details command
    context.subscriptions.push(vscode.commands.registerCommand('remediation.viewAnalysis', async (item) => {
        if (item?.data) {
            const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri || context.extensionUri;
            summaryPanel.show(item.data, workspaceUri);
            logger.info('User viewing analysis details');
        }
    }));
    // Clear recommendations command
    context.subscriptions.push(vscode.commands.registerCommand('remediation.clearRecommendations', async () => {
        const choice = await vscode.window.showWarningMessage('Clear all recommendations?', 'Clear', 'Cancel');
        if (choice === 'Clear') {
            recommendations.clearAll?.();
            log.info('User cleared recommendations');
            vscode.window.showInformationMessage('✓ Recommendations cleared');
        }
    }));
}
function setupEventListeners(context, hooks, backend, log, history, recommendations) {
    // Listen for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (event.affectsConfiguration('remediationAgent')) {
            log.info('Configuration changed');
            // Reload configuration
            const config = new config_manager_1.ConfigManager().getConfig();
            // Re-setup hooks if needed
            if (config.preCommit.enabled || config.postCommit.enabled) {
                await hooks.setupHooks();
            }
        }
    }));
    // Listen for file changes to update status
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
        statusBar.setModified();
    }));
    // Listen for focus changes
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        statusBar.update();
    }));
}
function deactivate() {
    logger?.info('🛑 Deactivating AI Remediation Agent Extension');
    statusBar?.dispose();
    // Cleanup resources
}
/**
 * FIX 2: Ensure Git credential helper is configured
 * Prevents "Git Credential Manager" failures during git push
 */
function ensureGitCredentialsConfigured() {
    try {
        const { execSync } = require('child_process');
        // Check if credential helper is already configured
        try {
            const currentHelper = execSync('git config --global credential.helper', {
                encoding: 'utf8',
            }).trim();
            if (currentHelper) {
                logger?.debug(`Git credential helper already configured: ${currentHelper}`);
                return;
            }
        }
        catch {
            // Not configured, proceed to configure
        }
        // Configure credential helper based on platform
        const platform = process.platform;
        let credentialHelper = 'manager-core'; // Default for Windows/modern Git
        if (platform === 'darwin') {
            credentialHelper = 'osxkeychain'; // macOS
        }
        else if (platform === 'linux') {
            credentialHelper = 'cache'; // Linux
        }
        execSync(`git config --global credential.helper ${credentialHelper}`, {
            stdio: 'pipe',
        });
        logger?.info(`✓ Git credential helper configured: ${credentialHelper}`);
    }
    catch (error) {
        logger?.warn(`Failed to configure Git credential helper: ${error}`);
        // Non-fatal: Continue operation even if configuration fails
    }
}
//# sourceMappingURL=extension.js.map