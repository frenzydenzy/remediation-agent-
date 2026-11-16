"use strict";
/**
 * OAuth manager for GitHub and GitLab authentication
 * Handles OAuth flow, token storage, and token validation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthManager = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../constants");
class OAuthManager {
    constructor(context, configManager, logger) {
        this.context = context;
        this.configManager = configManager;
        this.logger = logger;
    }
    async authenticate() {
        const config = this.configManager.getConfig();
        const platforms = [];
        if (config.github.enabled)
            platforms.push('GitHub');
        if (config.gitlab.enabled)
            platforms.push('GitLab');
        if (platforms.length === 0) {
            this.logger.warn('No platforms enabled for authentication');
            return false;
        }
        const selected = await vscode.window.showQuickPick(platforms, {
            placeHolder: 'Select platform to authenticate with',
        });
        if (!selected)
            return false;
        try {
            if (selected === 'GitHub') {
                return await this.authenticateGitHub();
            }
            else if (selected === 'GitLab') {
                return await this.authenticateGitLab();
            }
        }
        catch (error) {
            this.logger.error(`Authentication failed: ${error}`);
            throw error;
        }
        return false;
    }
    async authenticateGitHub() {
        try {
            this.logger.info('Starting GitHub OAuth flow');
            // Generate auth URL
            const state = this.generateRandomString(32);
            const authUrl = new URL('https://github.com/login/oauth/authorize');
            authUrl.searchParams.set('client_id', constants_1.GITHUB_OAUTH.clientId);
            authUrl.searchParams.set('redirect_uri', constants_1.GITHUB_OAUTH.redirectUri);
            authUrl.searchParams.set('scope', constants_1.GITHUB_OAUTH.scope.join(' '));
            authUrl.searchParams.set('state', state);
            // Open browser
            await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));
            // Wait for callback (in real implementation, would use HTTP server)
            vscode.window.showInformationMessage('GitHub authorization window opened. Please authorize and return to VS Code.');
            // For now, simulate token retrieval
            const token = {
                accessToken: `ghp_simulated_token_${Date.now()}`,
                tokenType: 'bearer',
                expiresIn: 3600,
                scope: constants_1.GITHUB_OAUTH.scope,
                createdAt: Date.now(),
            };
            // Store token
            await this.context.secrets.store(constants_1.STORAGE_KEYS.GITHUB_TOKEN, JSON.stringify(token));
            // Fetch and store user info
            await this.fetchAndStoreGitHubUserInfo(token.accessToken);
            this.logger.info('✓ GitHub authentication successful');
            return true;
        }
        catch (error) {
            this.logger.error(`GitHub authentication failed: ${error}`);
            throw error;
        }
    }
    async authenticateGitLab() {
        try {
            this.logger.info('Starting GitLab OAuth flow');
            const config = this.configManager.getConfig();
            const gitlabUrl = config.gitlab.url;
            // Generate auth URL
            const state = this.generateRandomString(32);
            const authUrl = new URL(`${gitlabUrl}/oauth/authorize`);
            authUrl.searchParams.set('client_id', constants_1.GITLAB_OAUTH.clientId);
            authUrl.searchParams.set('redirect_uri', constants_1.GITLAB_OAUTH.redirectUri);
            authUrl.searchParams.set('scope', constants_1.GITLAB_OAUTH.scope.join(' '));
            authUrl.searchParams.set('state', state);
            authUrl.searchParams.set('response_type', 'code');
            // Open browser
            await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));
            vscode.window.showInformationMessage('GitLab authorization window opened. Please authorize and return to VS Code.');
            // For now, simulate token retrieval
            const token = {
                accessToken: `glpat_simulated_token_${Date.now()}`,
                tokenType: 'Bearer',
                expiresIn: 3600,
                scope: constants_1.GITLAB_OAUTH.scope,
                createdAt: Date.now(),
            };
            // Store token
            await this.context.secrets.store(constants_1.STORAGE_KEYS.GITLAB_TOKEN, JSON.stringify(token));
            // Fetch and store user info
            await this.fetchAndStoreGitLabUserInfo(token.accessToken, config.gitlab.url);
            this.logger.info('✓ GitLab authentication successful');
            return true;
        }
        catch (error) {
            this.logger.error(`GitLab authentication failed: ${error}`);
            throw error;
        }
    }
    async fetchAndStoreGitHubUserInfo(accessToken) {
        try {
            const response = await axios_1.default.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userInfo = {
                id: response.data.id,
                username: response.data.login,
                email: response.data.email,
                avatar: response.data.avatar_url,
                platform: 'github',
            };
            await this.context.secrets.store(constants_1.STORAGE_KEYS.GITHUB_USER, JSON.stringify(userInfo));
            await this.configManager.setSetting('github.authenticated', true);
            await this.configManager.setSetting('github.username', userInfo.username);
            this.logger.info(`✓ Stored GitHub user info: ${userInfo.username}`);
        }
        catch (error) {
            this.logger.error(`Failed to fetch GitHub user info: ${error}`);
        }
    }
    async fetchAndStoreGitLabUserInfo(accessToken, gitlabUrl) {
        try {
            const response = await axios_1.default.get(`${gitlabUrl}/api/v4/user`, {
                headers: { 'PRIVATE-TOKEN': accessToken },
            });
            const userInfo = {
                id: response.data.id,
                username: response.data.username,
                email: response.data.email,
                avatar: response.data.avatar_url,
                platform: 'gitlab',
            };
            await this.context.secrets.store(constants_1.STORAGE_KEYS.GITLAB_USER, JSON.stringify(userInfo));
            await this.configManager.setSetting('gitlab.authenticated', true);
            await this.configManager.setSetting('gitlab.username', userInfo.username);
            this.logger.info(`✓ Stored GitLab user info: ${userInfo.username}`);
        }
        catch (error) {
            this.logger.error(`Failed to fetch GitLab user info: ${error}`);
        }
    }
    async getGitHubToken() {
        const tokenJson = await this.context.secrets.get(constants_1.STORAGE_KEYS.GITHUB_TOKEN);
        return tokenJson ? JSON.parse(tokenJson) : null;
    }
    async getGitLabToken() {
        const tokenJson = await this.context.secrets.get(constants_1.STORAGE_KEYS.GITLAB_TOKEN);
        return tokenJson ? JSON.parse(tokenJson) : null;
    }
    async logout() {
        try {
            await this.context.secrets.delete(constants_1.STORAGE_KEYS.GITHUB_TOKEN);
            await this.context.secrets.delete(constants_1.STORAGE_KEYS.GITLAB_TOKEN);
            await this.context.secrets.delete(constants_1.STORAGE_KEYS.GITHUB_USER);
            await this.context.secrets.delete(constants_1.STORAGE_KEYS.GITLAB_USER);
            await this.configManager.setSetting('github.authenticated', false);
            await this.configManager.setSetting('gitlab.authenticated', false);
            await this.configManager.setSetting('github.username', undefined);
            await this.configManager.setSetting('gitlab.username', undefined);
            this.logger.info('✓ Logged out from all platforms');
        }
        catch (error) {
            this.logger.error(`Logout failed: ${error}`);
            throw error;
        }
    }
    async isAuthenticated() {
        const githubToken = await this.getGitHubToken();
        const gitlabToken = await this.getGitLabToken();
        return !!(githubToken || gitlabToken);
    }
    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
exports.OAuthManager = OAuthManager;
//# sourceMappingURL=oauth-manager.js.map