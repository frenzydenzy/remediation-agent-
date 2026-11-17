"use strict";
/**
 * Backend communicator for executing Phase 6 scripts
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
exports.BackendCommunicator = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
class BackendCommunicator {
    constructor(logger, configManager) {
        this.logger = logger;
        this.configManager = configManager;
        // Phase 6 backend is at the project root
        // __dirname is at: .vscode-ext/out/src/engine-integration/
        // We need: ../.github/skills/ai-change-impact-analysis
        // Path from __dirname: ../../../.github/skills/ai-change-impact-analysis
        this.backendPath = path.resolve(__dirname, '../../../../.github/skills/ai-change-impact-analysis');
        this.logger.debug(`Backend path: ${this.backendPath}`);
    }
    /**
     * FIX 1: Resolve Node.js executable path
     * Prevents "spawn node ENOENT" error when running in VS Code context
     */
    getNodeExecutable() {
        try {
            if (process.platform === 'win32') {
                // Windows: use where.exe to find node
                return (0, child_process_1.execSync)('where.exe node', { encoding: 'utf8' }).trim();
            }
            else {
                // Unix/Linux/Mac: use which
                return (0, child_process_1.execSync)('which node', { encoding: 'utf8' }).trim();
            }
        }
        catch (error) {
            // Fallback: assume node is in PATH
            this.logger.warn('Could not resolve absolute node path, falling back to PATH');
            return 'node';
        }
    }
    async runSecurityCheck(stagedFiles) {
        try {
            this.logger.info(`Running security check on ${stagedFiles.length} files`);
            const config = this.configManager.getConfig();
            const timeout = config.preCommit.timeout;
            // Call Phase 4.1-4.3 (security analysis only)
            const result = await this.executeBackend('security-check', { stagedFiles }, timeout);
            return {
                success: true,
                data: result,
                duration: 0,
            };
        }
        catch (error) {
            this.logger.error(`Security check failed: ${error}`);
            return {
                success: false,
                error: String(error),
                duration: 0,
            };
        }
    }
    async runFullAnalysis() {
        try {
            this.logger.info('Running full impact analysis');
            const config = this.configManager.getConfig();
            const timeout = config.postCommit.timeout;
            // Call full Phase 4.4-4.8 pipeline
            const result = await this.executeBackend('full-analysis', {}, timeout);
            return {
                success: true,
                data: result,
                duration: 0,
            };
        }
        catch (error) {
            this.logger.error(`Full analysis failed: ${error}`);
            return {
                success: false,
                error: String(error),
                duration: 0,
            };
        }
    }
    async executeBackend(command, params, timeout) {
        return new Promise((resolve, reject) => {
            try {
                // Build command arguments
                const args = [
                    path.join(this.backendPath, 'scripts', 'change-impact-agent.cjs'),
                    `--command=${command}`,
                    `--params=${JSON.stringify(params)}`,
                ];
                // FIX 1: Use resolved Node path instead of relying on PATH
                const nodePath = this.getNodeExecutable();
                this.logger.debug(`Spawning node at: ${nodePath}`);
                // Start Node process
                const process = (0, child_process_1.spawn)(nodePath, args, {
                    cwd: this.backendPath,
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
                let stdout = '';
                let stderr = '';
                // Collect output
                if (process.stdout) {
                    process.stdout.on('data', (data) => {
                        stdout += data.toString();
                    });
                }
                if (process.stderr) {
                    process.stderr.on('data', (data) => {
                        stderr += data.toString();
                        this.logger.error(`Backend stderr: ${data}`);
                    });
                }
                // Setup timeout
                const timeoutHandle = setTimeout(() => {
                    process.kill();
                    reject(new Error(`Backend command timed out after ${timeout}ms`));
                }, timeout);
                // Handle process completion
                process.on('close', (code) => {
                    clearTimeout(timeoutHandle);
                    if (code === 0) {
                        try {
                            // Parse JSON output
                            const result = JSON.parse(stdout);
                            this.logger.debug(`Backend result: ${JSON.stringify(result)}`);
                            resolve(result);
                        }
                        catch (parseError) {
                            reject(new Error(`Failed to parse backend output: ${parseError}`));
                        }
                    }
                    else {
                        reject(new Error(`Backend process exited with code ${code}: ${stderr}`));
                    }
                });
                // Handle errors
                process.on('error', (error) => {
                    clearTimeout(timeoutHandle);
                    reject(new Error(`Failed to execute backend: ${error.message}`));
                });
            }
            catch (error) {
                reject(new Error(`Failed to spawn backend process: ${error}`));
            }
        });
    }
    isBackendAvailable() {
        // Check if Phase 6 backend scripts exist
        const backendScript = path.join(this.backendPath, 'scripts', 'change-impact-agent.cjs');
        try {
            const fs = require('fs');
            return fs.existsSync(backendScript);
        }
        catch {
            return false;
        }
    }
}
exports.BackendCommunicator = BackendCommunicator;
//# sourceMappingURL=backend-communicator.js.map