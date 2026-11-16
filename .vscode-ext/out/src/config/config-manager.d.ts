/**
 * Configuration manager for the extension
 */
import { ExtensionConfig } from '../constants';
export declare class ConfigManager {
    private config;
    constructor();
    getConfig(): ExtensionConfig;
    getSetting<T>(key: string, defaultValue: T): T;
    setSetting(key: string, value: any): Thenable<void>;
}
//# sourceMappingURL=config-manager.d.ts.map