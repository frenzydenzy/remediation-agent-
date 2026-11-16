/**
 * Backend communicator for executing Phase 6 scripts
 */
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/config-manager';
import { EngineResponse } from '../constants';
export declare class BackendCommunicator {
    private logger;
    private configManager;
    private backendPath;
    constructor(logger: Logger, configManager: ConfigManager);
    /**
     * FIX 1: Resolve Node.js executable path
     * Prevents "spawn node ENOENT" error when running in VS Code context
     */
    private getNodeExecutable;
    runSecurityCheck(stagedFiles: string[]): Promise<EngineResponse>;
    runFullAnalysis(): Promise<EngineResponse>;
    private executeBackend;
    isBackendAvailable(): boolean;
}
//# sourceMappingURL=backend-communicator.d.ts.map