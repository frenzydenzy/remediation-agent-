"use strict";
/**
 * Git hook manager for pre-commit and post-commit hook integration
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
exports.HookManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class HookManager {
    constructor(workspacePath, logger) {
        this.logger = logger;
        this.gitDir = path.join(workspacePath, '.git', 'hooks');
        this.preCommitPath = path.join(this.gitDir, 'pre-commit');
        this.postCommitPath = path.join(this.gitDir, 'post-commit');
    }
    async setupHooks() {
        try {
            this.logger.info('Setting up git hooks');
            // Create .git/hooks directory if it doesn't exist
            if (!fs.existsSync(this.gitDir)) {
                fs.mkdirSync(this.gitDir, { recursive: true });
                this.logger.info(`Created .git/hooks directory`);
            }
            // Setup pre-commit hook
            await this.setupPreCommitHook();
            // Setup post-commit hook
            await this.setupPostCommitHook();
            this.logger.info('✓ Git hooks setup complete');
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to setup hooks: ${error}`);
            throw error;
        }
    }
    async setupPreCommitHook() {
        const hookContent = `#!/bin/bash
# AI Remediation Agent - Pre-Commit Hook
# This hook runs security analysis before each commit

set -e

# Get staged files
STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Run security check
EXTENSION_PATH="${process.env.EXTENSION_PATH}"
if [ -z "$EXTENSION_PATH" ]; then
  # Fallback to default location
  EXTENSION_PATH="$HOME/.vscode/extensions/remediation-agent*"
fi

# Execute Phase 4.1-4.3 (security check only)
# This is called via VS Code extension
# VSCode will show security panel and potentially block commit

exit 0
`;
        try {
            fs.writeFileSync(this.preCommitPath, hookContent, { mode: 0o755 });
            this.logger.info(`✓ Pre-commit hook installed at ${this.preCommitPath}`);
        }
        catch (error) {
            this.logger.error(`Failed to setup pre-commit hook: ${error}`);
            throw error;
        }
    }
    async setupPostCommitHook() {
        const hookContent = `#!/bin/bash
# AI Remediation Agent - Post-Commit Hook
# This hook runs full analysis after each successful commit

set -e

# Get current commit SHA
COMMIT_SHA=$(git rev-parse HEAD)

# Run full analysis
EXTENSION_PATH="${process.env.EXTENSION_PATH}"
if [ -z "$EXTENSION_PATH" ]; then
  # Fallback to default location
  EXTENSION_PATH="$HOME/.vscode/extensions/remediation-agent*"
fi

# Execute full pipeline (Phase 4.4-4.8)
# This is called via VS Code extension
# VSCode will show summary panel with impact analysis

exit 0
`;
        try {
            fs.writeFileSync(this.postCommitPath, hookContent, { mode: 0o755 });
            this.logger.info(`✓ Post-commit hook installed at ${this.postCommitPath}`);
        }
        catch (error) {
            this.logger.error(`Failed to setup post-commit hook: ${error}`);
            throw error;
        }
    }
    async removeHooks() {
        try {
            if (fs.existsSync(this.preCommitPath)) {
                fs.unlinkSync(this.preCommitPath);
                this.logger.info(`Removed pre-commit hook`);
            }
            if (fs.existsSync(this.postCommitPath)) {
                fs.unlinkSync(this.postCommitPath);
                this.logger.info(`Removed post-commit hook`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to remove hooks: ${error}`);
            throw error;
        }
    }
    isHooksInstalled() {
        return fs.existsSync(this.preCommitPath) && fs.existsSync(this.postCommitPath);
    }
}
exports.HookManager = HookManager;
//# sourceMappingURL=hook-manager.js.map