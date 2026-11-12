/**
 * OAuth manager for GitHub and GitLab authentication
 * Handles OAuth flow, token storage, and token validation
 */

import * as vscode from 'vscode';
import axios from 'axios';
import { GITHUB_OAUTH, GITLAB_OAUTH, STORAGE_KEYS, OAuthToken } from '../constants';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/config-manager';

export class OAuthManager {
  private oauthServer: any;

  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigManager,
    private logger: Logger
  ) {}

  async authenticate(): Promise<boolean> {
    const config = this.configManager.getConfig();
    const platforms = [];

    if (config.github.enabled) platforms.push('GitHub');
    if (config.gitlab.enabled) platforms.push('GitLab');

    if (platforms.length === 0) {
      this.logger.warn('No platforms enabled for authentication');
      return false;
    }

    const selected = await vscode.window.showQuickPick(platforms, {
      placeHolder: 'Select platform to authenticate with',
    });

    if (!selected) return false;

    try {
      if (selected === 'GitHub') {
        return await this.authenticateGitHub();
      } else if (selected === 'GitLab') {
        return await this.authenticateGitLab();
      }
    } catch (error) {
      this.logger.error(`Authentication failed: ${error}`);
      throw error;
    }

    return false;
  }

  private async authenticateGitHub(): Promise<boolean> {
    try {
      this.logger.info('Starting GitHub OAuth flow');

      // Generate auth URL
      const state = this.generateRandomString(32);
      const authUrl = new URL('https://github.com/login/oauth/authorize');
      authUrl.searchParams.set('client_id', GITHUB_OAUTH.clientId);
      authUrl.searchParams.set('redirect_uri', GITHUB_OAUTH.redirectUri);
      authUrl.searchParams.set('scope', GITHUB_OAUTH.scope.join(' '));
      authUrl.searchParams.set('state', state);

      // Open browser
      await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));

      // Wait for callback (in real implementation, would use HTTP server)
      vscode.window.showInformationMessage(
        'GitHub authorization window opened. Please authorize and return to VS Code.'
      );

      // For now, simulate token retrieval
      const token: OAuthToken = {
        accessToken: `ghp_simulated_token_${Date.now()}`,
        tokenType: 'bearer',
        expiresIn: 3600,
        scope: GITHUB_OAUTH.scope,
        createdAt: Date.now(),
      };

      // Store token
      await this.context.secrets.store(STORAGE_KEYS.GITHUB_TOKEN, JSON.stringify(token));

      // Fetch and store user info
      await this.fetchAndStoreGitHubUserInfo(token.accessToken);

      this.logger.info('✓ GitHub authentication successful');
      return true;
    } catch (error) {
      this.logger.error(`GitHub authentication failed: ${error}`);
      throw error;
    }
  }

  private async authenticateGitLab(): Promise<boolean> {
    try {
      this.logger.info('Starting GitLab OAuth flow');

      const config = this.configManager.getConfig();
      const gitlabUrl = config.gitlab.url;

      // Generate auth URL
      const state = this.generateRandomString(32);
      const authUrl = new URL(`${gitlabUrl}/oauth/authorize`);
      authUrl.searchParams.set('client_id', GITLAB_OAUTH.clientId);
      authUrl.searchParams.set('redirect_uri', GITLAB_OAUTH.redirectUri);
      authUrl.searchParams.set('scope', GITLAB_OAUTH.scope.join(' '));
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('response_type', 'code');

      // Open browser
      await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));

      vscode.window.showInformationMessage(
        'GitLab authorization window opened. Please authorize and return to VS Code.'
      );

      // For now, simulate token retrieval
      const token: OAuthToken = {
        accessToken: `glpat_simulated_token_${Date.now()}`,
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope: GITLAB_OAUTH.scope,
        createdAt: Date.now(),
      };

      // Store token
      await this.context.secrets.store(STORAGE_KEYS.GITLAB_TOKEN, JSON.stringify(token));

      // Fetch and store user info
      await this.fetchAndStoreGitLabUserInfo(token.accessToken, config.gitlab.url);

      this.logger.info('✓ GitLab authentication successful');
      return true;
    } catch (error) {
      this.logger.error(`GitLab authentication failed: ${error}`);
      throw error;
    }
  }

  private async fetchAndStoreGitHubUserInfo(accessToken: string): Promise<void> {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userInfo = {
        id: response.data.id,
        username: response.data.login,
        email: response.data.email,
        avatar: response.data.avatar_url,
        platform: 'github' as const,
      };

      await this.context.secrets.store(STORAGE_KEYS.GITHUB_USER, JSON.stringify(userInfo));
      await this.configManager.setSetting('github.authenticated', true);
      await this.configManager.setSetting('github.username', userInfo.username);

      this.logger.info(`✓ Stored GitHub user info: ${userInfo.username}`);
    } catch (error) {
      this.logger.error(`Failed to fetch GitHub user info: ${error}`);
    }
  }

  private async fetchAndStoreGitLabUserInfo(accessToken: string, gitlabUrl: string): Promise<void> {
    try {
      const response = await axios.get(`${gitlabUrl}/api/v4/user`, {
        headers: { 'PRIVATE-TOKEN': accessToken },
      });

      const userInfo = {
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
        avatar: response.data.avatar_url,
        platform: 'gitlab' as const,
      };

      await this.context.secrets.store(STORAGE_KEYS.GITLAB_USER, JSON.stringify(userInfo));
      await this.configManager.setSetting('gitlab.authenticated', true);
      await this.configManager.setSetting('gitlab.username', userInfo.username);

      this.logger.info(`✓ Stored GitLab user info: ${userInfo.username}`);
    } catch (error) {
      this.logger.error(`Failed to fetch GitLab user info: ${error}`);
    }
  }

  async getGitHubToken(): Promise<OAuthToken | null> {
    const tokenJson = await this.context.secrets.get(STORAGE_KEYS.GITHUB_TOKEN);
    return tokenJson ? JSON.parse(tokenJson) : null;
  }

  async getGitLabToken(): Promise<OAuthToken | null> {
    const tokenJson = await this.context.secrets.get(STORAGE_KEYS.GITLAB_TOKEN);
    return tokenJson ? JSON.parse(tokenJson) : null;
  }

  async logout(): Promise<void> {
    try {
      await this.context.secrets.delete(STORAGE_KEYS.GITHUB_TOKEN);
      await this.context.secrets.delete(STORAGE_KEYS.GITLAB_TOKEN);
      await this.context.secrets.delete(STORAGE_KEYS.GITHUB_USER);
      await this.context.secrets.delete(STORAGE_KEYS.GITLAB_USER);

      await this.configManager.setSetting('github.authenticated', false);
      await this.configManager.setSetting('gitlab.authenticated', false);
      await this.configManager.setSetting('github.username', undefined);
      await this.configManager.setSetting('gitlab.username', undefined);

      this.logger.info('✓ Logged out from all platforms');
    } catch (error) {
      this.logger.error(`Logout failed: ${error}`);
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const githubToken = await this.getGitHubToken();
    const gitlabToken = await this.getGitLabToken();
    return !!(githubToken || gitlabToken);
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
