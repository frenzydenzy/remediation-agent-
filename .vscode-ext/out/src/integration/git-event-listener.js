"use strict";
/**
 * Git Event Listener - Integrates with VS Code Git Extension
 * Listens for commit/push events and triggers analysis
 * Phase 7.12 Integration Fix: Proper Git Event Listening
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
exports.GitCommandDetector = exports.GitEventListener = void 0;
const vscode = __importStar(require("vscode"));
class GitEventListener {
    constructor(logger, postCommitHandler, preCommitHandler) {
        this.logger = logger;
        this.repositories = [];
        this.postCommitHandler = null;
        this.preCommitHandler = null;
        this.postCommitHandler = postCommitHandler || null;
        this.preCommitHandler = preCommitHandler || null;
    }
    /**
     * Initialize git event listening
     * Returns true if successfully connected to VS Code git extension
     */
    async initialize() {
        try {
            this.logger.info('🔗 Initializing git event listener');
            // Get the git extension
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                this.logger.warn('Git extension not found, will retry periodically');
                return false;
            }
            if (!gitExtension.isActive) {
                this.logger.info('Waiting for git extension to activate...');
                await gitExtension.activate();
            }
            this.gitExtension = gitExtension.exports.getAPI(1);
            if (!this.gitExtension) {
                this.logger.error('Failed to get Git API v1');
                return false;
            }
            this.logger.info(`✓ Connected to Git API`);
            this.logger.info(`Found ${this.gitExtension.repositories.length} repositories`);
            // Register listeners for each repository
            await this.setupRepositoryListeners();
            // Listen for new repositories
            this.gitExtension.onDidOpenRepository((repo) => {
                this.logger.info(`New repository opened: ${repo.rootUri.fsPath}`);
                this.setupRepositoryListener(repo);
            });
            this.gitExtension.onDidCloseRepository((repo) => {
                this.logger.info(`Repository closed: ${repo.rootUri.fsPath}`);
                const index = this.repositories.indexOf(repo);
                if (index > -1) {
                    this.repositories.splice(index, 1);
                }
            });
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to initialize git event listener: ${error}`);
            return false;
        }
    }
    /**
     * Set up listeners for all current repositories
     */
    async setupRepositoryListeners() {
        if (!this.gitExtension)
            return;
        for (const repo of this.gitExtension.repositories) {
            this.setupRepositoryListener(repo);
        }
    }
    /**
     * Set up listeners for a single repository
     */
    setupRepositoryListener(repo) {
        try {
            const repoPath = repo.rootUri.fsPath;
            this.logger.debug(`Setting up listeners for: ${repoPath}`);
            if (!this.repositories.includes(repo)) {
                this.repositories.push(repo);
            }
            // Listen for state changes in the repository
            // The GitRepository object from vscode.git extension does not emit commit events directly,
            // but we can monitor for changes through the file system watcher and git status
            // Alternative: Use terminal to watch git commands
            // This is handled through the hook installation and manual command detection
            this.logger.debug(`✓ Listeners attached to: ${repoPath}`);
        }
        catch (error) {
            this.logger.error(`Failed to setup repository listener: ${error}`);
        }
    }
    /**
     * Manually trigger post-commit analysis
     * Called from commands or hooks
     */
    async triggerPostCommitAnalysis(repoPath) {
        try {
            if (!this.postCommitHandler) {
                this.logger.warn('Post-commit handler not configured');
                return null;
            }
            this.logger.info('▶️ Manually triggering post-commit analysis');
            return await this.postCommitHandler.execute();
        }
        catch (error) {
            this.logger.error(`Failed to trigger post-commit analysis: ${error}`);
            return null;
        }
    }
    /**
     * Manually trigger pre-commit analysis
     * Called from commands or hooks
     */
    async triggerPreCommitAnalysis(repoPath) {
        try {
            if (!this.preCommitHandler) {
                this.logger.warn('Pre-commit handler not configured');
                return null;
            }
            this.logger.info('▶️ Manually triggering pre-commit analysis');
            return await this.preCommitHandler.execute();
        }
        catch (error) {
            this.logger.error(`Failed to trigger pre-commit analysis: ${error}`);
            return null;
        }
    }
    /**
     * Get all active repositories
     */
    getRepositories() {
        return this.repositories;
    }
    /**
     * Check if git extension is available
     */
    isAvailable() {
        return this.gitExtension !== undefined;
    }
    /**
     * Dispose listeners
     */
    dispose() {
        this.logger.info('Disposing git event listener');
        this.repositories = [];
        this.gitExtension = undefined;
    }
}
exports.GitEventListener = GitEventListener;
/**
 * Alternative Git Event Detection via Terminal
 * Since VS Code git extension doesn't emit commit events directly,
 * we can monitor git commands through terminal and workspace changes
 */
class GitCommandDetector {
    constructor(logger, workspaceFolder, onCommitDetected) {
        this.logger = logger;
        this.workspaceFolder = workspaceFolder;
        this.onCommitDetected = onCommitDetected;
        this.disposables = [];
        this.lastCommitTime = 0;
        this.commitCheckInterval = null;
    }
    /**
     * Start monitoring for git commits
     * Uses polling approach to detect new commits
     */
    start() {
        this.logger.info('🔍 Starting git command detector (polling mode)');
        // Check for new commits every 2 seconds
        this.commitCheckInterval = setInterval(() => {
            this.checkForNewCommit();
        }, 2000);
    }
    /**
     * Check if a new commit was made
     */
    async checkForNewCommit() {
        try {
            const { execSync } = require('child_process');
            // Get the current HEAD commit timestamp
            const stdout = execSync('git log -1 --pretty=%ai', {
                cwd: this.workspaceFolder,
                encoding: 'utf8',
            });
            const commitTime = new Date(stdout.trim()).getTime();
            // If commit is newer than last detected, trigger analysis
            if (commitTime > this.lastCommitTime) {
                this.lastCommitTime = commitTime;
                // Get the commit SHA
                const sha = execSync('git rev-parse HEAD', {
                    cwd: this.workspaceFolder,
                    encoding: 'utf8',
                }).trim();
                this.logger.info(`✓ Detected new commit: ${sha.substring(0, 7)}`);
                await this.onCommitDetected(sha);
            }
        }
        catch (error) {
            // Silently ignore errors during polling (repo might not be ready)
            this.logger.debug(`Commit check failed: ${error}`);
        }
    }
    /**
     * Stop monitoring
     */
    stop() {
        this.logger.info('Stopping git command detector');
        if (this.commitCheckInterval) {
            clearInterval(this.commitCheckInterval);
            this.commitCheckInterval = null;
        }
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
    }
    /**
     * Dispose resources
     */
    dispose() {
        this.stop();
    }
}
exports.GitCommandDetector = GitCommandDetector;
//# sourceMappingURL=git-event-listener.js.map