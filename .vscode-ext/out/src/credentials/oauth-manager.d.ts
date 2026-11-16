/**
 * OAuth manager for GitHub and GitLab authentication
 * Handles OAuth flow, token storage, and token validation
 */
import * as vscode from 'vscode';
import { OAuthToken } from '../constants';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/config-manager';
export declare class OAuthManager {
    private context;
    private configManager;
    private logger;
    private oauthServer;
    constructor(context: vscode.ExtensionContext, configManager: ConfigManager, logger: Logger);
    authenticate(): Promise<boolean>;
    private authenticateGitHub;
    private authenticateGitLab;
    private fetchAndStoreGitHubUserInfo;
    private fetchAndStoreGitLabUserInfo;
    getGitHubToken(): Promise<OAuthToken | null>;
    getGitLabToken(): Promise<OAuthToken | null>;
    logout(): Promise<void>;
    isAuthenticated(): Promise<boolean>;
    private generateRandomString;
}
//# sourceMappingURL=oauth-manager.d.ts.map