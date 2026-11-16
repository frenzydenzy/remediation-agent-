/**
 * Post-Commit Handler - Executes full Phase 4.4-4.8 analysis pipeline
 * Called after successful commit to generate reports and diagrams
 * Displays summary panel in VS Code
 */
import { Logger } from '../utils/logger';
import { BackendCommunicator } from '../engine-integration/backend-communicator';
import { ConfigManager } from '../config/config-manager';
import { UIManager } from '../ui/ui-manager';
import { AnalysisSummary } from '../constants';
export declare class PostCommitHandler {
    private logger;
    private backend;
    private configManager;
    private gitDir;
    private uiManager?;
    constructor(logger: Logger, backend: BackendCommunicator, configManager: ConfigManager, gitDir: string, uiManager?: UIManager | undefined);
    execute(): Promise<PostCommitResult>;
    /**
     * Get information about the current commit
     */
    private getCommitInfo;
    /**
     * Get list of files changed in commit
     */
    private getChangedFiles;
    /**
     * Format summary for display
     */
    formatSummary(analysis: AnalysisSummary, commitInfo: CommitInfo): string;
}
export interface PostCommitResult {
    success: boolean;
    reason: string;
    analysis?: AnalysisSummary;
    commitInfo?: CommitInfo;
    changedFiles?: string[];
    duration?: number;
}
export interface CommitInfo {
    sha: string;
    message: string;
    author: string;
    timestamp: string;
}
//# sourceMappingURL=post-commit-handler.d.ts.map