/**
 * Git hook manager for pre-commit and post-commit hook integration
 */
import { Logger } from '../utils/logger';
export declare class HookManager {
    private logger;
    private gitDir;
    private preCommitPath;
    private postCommitPath;
    constructor(workspacePath: string, logger: Logger);
    setupHooks(): Promise<boolean>;
    private setupPreCommitHook;
    private setupPostCommitHook;
    removeHooks(): Promise<void>;
    isHooksInstalled(): boolean;
}
//# sourceMappingURL=hook-manager.d.ts.map