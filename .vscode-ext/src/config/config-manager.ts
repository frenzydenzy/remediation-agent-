/**
 * Configuration manager for the extension
 */

import * as vscode from 'vscode';
import { ExtensionConfig } from '../constants';

export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration('remediationAgent');
  }

  getConfig(): ExtensionConfig {
    return {
      enabled: this.config.get('enabled', true),
      github: {
        enabled: this.config.get('github.enabled', true),
        oauthClientId: this.config.get('github.oauthClientId', ''),
        authenticated: false,
        username: undefined,
      },
      gitlab: {
        enabled: this.config.get('gitlab.enabled', true),
        oauthClientId: this.config.get('gitlab.oauthClientId', ''),
        url: this.config.get('gitlab.url', 'https://gitlab.com'),
        authenticated: false,
        username: undefined,
      },
      preCommit: {
        enabled: this.config.get('preCommit.enabled', true),
        blockOnCritical: this.config.get('preCommit.blockOnCritical', true),
        blockOnHigh: this.config.get('preCommit.blockOnHigh', false),
        timeout: this.config.get('preCommit.timeout', 30000),
      },
      postCommit: {
        enabled: this.config.get('postCommit.enabled', true),
        showPanel: this.config.get('postCommit.showPanel', true),
        timeout: this.config.get('postCommit.timeout', 60000),
      },
      ui: {
        theme: this.config.get('ui.theme', 'auto') as any,
        notifications: this.config.get('ui.notifications', 'all') as any,
        inlineDiagnostics: this.config.get('ui.inlineDiagnostics', true),
      },
      cache: {
        enabled: this.config.get('cache.enabled', true),
        duration: this.config.get('cache.duration', 3600000),
      },
      debug: this.config.get('debug', false),
    };
  }

  getSetting<T>(key: string, defaultValue: T): T {
    return this.config.get(key, defaultValue);
  }

  setSetting(key: string, value: any): Thenable<void> {
    return this.config.update(key, value, vscode.ConfigurationTarget.Global);
  }
}
