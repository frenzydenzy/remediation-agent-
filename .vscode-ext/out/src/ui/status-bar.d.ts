/**
 * Status bar manager for displaying extension status
 */
import { Logger } from '../utils/logger';
export declare class StatusBarManager {
    private logger;
    private statusBarItem;
    private state;
    constructor(logger: Logger);
    show(): void;
    hide(): void;
    setReady(): void;
    setAnalyzing(): void;
    setError(): void;
    setAuthenticated(): void;
    setUnauthenticated(): void;
    setModified(): void;
    update(): void;
    dispose(): void;
}
//# sourceMappingURL=status-bar.d.ts.map