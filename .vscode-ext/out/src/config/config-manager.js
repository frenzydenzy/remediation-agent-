"use strict";
/**
 * Configuration manager for the extension
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const vscode = __importStar(require("vscode"));
class ConfigManager {
    constructor() {
        this.config = vscode.workspace.getConfiguration('remediationAgent');
    }
    getConfig() {
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
                theme: this.config.get('ui.theme', 'auto'),
                notifications: this.config.get('ui.notifications', 'all'),
                inlineDiagnostics: this.config.get('ui.inlineDiagnostics', true),
            },
            cache: {
                enabled: this.config.get('cache.enabled', true),
                duration: this.config.get('cache.duration', 3600000),
            },
            debug: this.config.get('debug', false),
        };
    }
    getSetting(key, defaultValue) {
        return this.config.get(key, defaultValue);
    }
    setSetting(key, value) {
        return this.config.update(key, value, vscode.ConfigurationTarget.Global);
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config-manager.js.map