/**
 * Git Event Listener - Integrates with VS Code Git Extension
 * Listens for commit/push events and triggers analysis
 * Phase 7.12 Integration Fix: Proper Git Event Listening
 */
import { Logger } from '../utils/logger';
import { PostCommitHandler, PostCommitResult } from '../hooks/post-commit-handler';
import { PreCommitHandler, PreCommitResult } from '../hooks/pre-commit-handler';
export declare class GitEventListener {
    private logger;
    private gitExtension;
    private repositories;
    private postCommitHandler;
    private preCommitHandler;
    constructor(logger: Logger, postCommitHandler?: PostCommitHandler, preCommitHandler?: PreCommitHandler);
    /**
     * Initialize git event listening
     * Returns true if successfully connected to VS Code git extension
     */
    initialize(): Promise<boolean>;
    /**
     * Set up listeners for all current repositories
     */
    private setupRepositoryListeners;
    /**
     * Set up listeners for a single repository
     */
    private setupRepositoryListener;
    /**
     * Manually trigger post-commit analysis
     * Called from commands or hooks
     */
    triggerPostCommitAnalysis(repoPath?: string): Promise<PostCommitResult | null>;
    /**
     * Manually trigger pre-commit analysis
     * Called from commands or hooks
     */
    triggerPreCommitAnalysis(repoPath?: string): Promise<PreCommitResult | null>;
    /**
     * Get all active repositories
     */
    getRepositories(): any[];
    /**
     * Check if git extension is available
     */
    isAvailable(): boolean;
    /**
     * Dispose listeners
     */
    dispose(): void;
}
/**
 * Alternative Git Event Detection via Terminal
 * Since VS Code git extension doesn't emit commit events directly,
 * we can monitor git commands through terminal and workspace changes
 */
export declare class GitCommandDetector {
    private logger;
    private workspaceFolder;
    private onCommitDetected;
    private disposables;
    private lastCommitTime;
    private commitCheckInterval;
    constructor(logger: Logger, workspaceFolder: string, onCommitDetected: (commitSha: string) => Promise<void>);
    /**
     * Start monitoring for git commits
     * Uses polling approach to detect new commits
     */
    start(): void;
    /**
     * Check if a new commit was made
     */
    private checkForNewCommit;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Dispose resources
     */
    dispose(): void;
}
//# sourceMappingURL=git-event-listener.d.ts.map