/**
 * Pre-Commit Handler - Executes Phase 4.1-4.3 security analysis
 * Called when user attempts to commit staged changes
 * Can optionally block commit if CRITICAL issues found
 */
import { Logger } from '../utils/logger';
import { BackendCommunicator } from '../engine-integration/backend-communicator';
import { ConfigManager } from '../config/config-manager';
import { UIManager } from '../ui/ui-manager';
import { SecurityAnalysisResult } from '../constants';
export declare class PreCommitHandler {
    private logger;
    private backend;
    private configManager;
    private gitDir;
    private uiManager?;
    constructor(logger: Logger, backend: BackendCommunicator, configManager: ConfigManager, gitDir: string, uiManager?: UIManager | undefined);
    execute(): Promise<PreCommitResult>;
    /**
     * Get staged files from git
     */
    private getStagedFiles;
    /**
     * Format findings for display
     */
    formatFindings(findings: SecurityAnalysisResult): string;
}
export interface PreCommitResult {
    allowed: boolean;
    reason: string;
    blocking?: boolean;
    findings?: SecurityAnalysisResult;
}
//# sourceMappingURL=pre-commit-handler.d.ts.map