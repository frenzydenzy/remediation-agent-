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
    runSecurityCheck(stagedFiles: string[]): Promise<EngineResponse>;
    runFullAnalysis(): Promise<EngineResponse>;
    private executeBackend;
    isBackendAvailable(): boolean;
}
//# sourceMappingURL=backend-communicator.d.ts.map