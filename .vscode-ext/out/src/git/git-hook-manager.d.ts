/**
 * Git Hook Manager - Manages installation and execution of git hooks
 * Handles pre-commit and post-commit hooks for the VS Code extension
 */
import { Logger } from '../utils/logger';
/**
 * Manages git hooks for security analysis and impact analysis
 */
export declare class GitHookManager {
    private gitDir;
    private logger;
    private hooksDir;
    constructor(gitDir: string, logger: Logger);
    /**
     * Install git hooks for the repository
     */
    installHooks(): Promise<void>;
    /**
     * Remove git hooks from the repository
     */
    uninstallHooks(): Promise<void>;
    /**
     * Check if hooks are installed
     */
    areHooksInstalled(): boolean;
    /**
     * Get pre-commit hook script
     */
    private getPreCommitHookScript;
    /**
     * Get post-commit hook script
     */
    private getPostCommitHookScript;
    /**
     * Create hook file with executable permissions
     */
    private createHookFile;
    /**
     * Check if hook file should be overwritten
     */
    private shouldOverwrite;
    /**
     * Verify hooks are working
     */
    verifyHooks(): Promise<boolean>;
    /**
     * Get hook installation status
     */
    getStatus(): {
        installed: boolean;
        preCommit: boolean;
        postCommit: boolean;
        executable: boolean;
    };
}
//# sourceMappingURL=git-hook-manager.d.ts.map