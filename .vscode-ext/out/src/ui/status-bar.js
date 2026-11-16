"use strict";
/**
 * Status bar manager for displaying extension status
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
exports.StatusBarManager = void 0;
const vscode = __importStar(require("vscode"));
class StatusBarManager {
    constructor(logger) {
        this.logger = logger;
        this.state = 'ready';
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.update();
    }
    show() {
        this.statusBarItem.show();
    }
    hide() {
        this.statusBarItem.hide();
    }
    setReady() {
        this.state = 'ready';
        this.update();
    }
    setAnalyzing() {
        this.state = 'analyzing';
        this.update();
    }
    setError() {
        this.state = 'error';
        this.update();
    }
    setAuthenticated() {
        this.state = 'authenticated';
        this.update();
    }
    setUnauthenticated() {
        this.state = 'unauthenticated';
        this.update();
    }
    setModified() {
        this.state = 'modified';
        this.update();
    }
    update() {
        switch (this.state) {
            case 'ready':
                this.statusBarItem.text = '🔍 Remediation Agent: Ready';
                this.statusBarItem.tooltip = 'Click to run analysis';
                this.statusBarItem.command = 'remediationAgent.runAnalysis';
                break;
            case 'analyzing':
                this.statusBarItem.text = '⏳ Remediation Agent: Analyzing...';
                this.statusBarItem.tooltip = 'Analysis in progress';
                break;
            case 'error':
                this.statusBarItem.text = '❌ Remediation Agent: Error';
                this.statusBarItem.tooltip = 'Click to view error details';
                this.statusBarItem.command = 'remediationAgent.viewSecurityPanel';
                break;
            case 'authenticated':
                this.statusBarItem.text = '✅ Remediation Agent: Connected';
                this.statusBarItem.tooltip = 'Authenticated with GitHub/GitLab';
                break;
            case 'unauthenticated':
                this.statusBarItem.text = '🔐 Remediation Agent: Not Connected';
                this.statusBarItem.tooltip = 'Click to authenticate';
                this.statusBarItem.command = 'remediationAgent.authenticate';
                break;
            case 'modified':
                this.statusBarItem.text = '✏️ Remediation Agent: Modified';
                this.statusBarItem.tooltip = 'Files have been modified';
                break;
        }
    }
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.StatusBarManager = StatusBarManager;
//# sourceMappingURL=status-bar.js.map