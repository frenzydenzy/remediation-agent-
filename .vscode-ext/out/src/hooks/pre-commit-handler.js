"use strict";
/**
 * Pre-Commit Handler - Executes Phase 4.1-4.3 security analysis
 * Called when user attempts to commit staged changes
 * Can optionally block commit if CRITICAL issues found
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreCommitHandler = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class PreCommitHandler {
    constructor(logger, backend, configManager, gitDir, uiManager) {
        this.logger = logger;
        this.backend = backend;
        this.configManager = configManager;
        this.gitDir = gitDir;
        this.uiManager = uiManager;
    }
    async execute() {
        try {
            this.logger.info('🔐 Pre-commit handler starting');
            const config = this.configManager.getConfig();
            if (!config.preCommit.enabled) {
                this.logger.info('Pre-commit analysis disabled');
                return { allowed: true, reason: 'Disabled in settings' };
            }
            // 1. Get staged files from git
            const stagedFiles = await this.getStagedFiles();
            if (stagedFiles.length === 0) {
                this.logger.info('No staged files to check');
                return { allowed: true, reason: 'No files staged' };
            }
            this.logger.info(`Analyzing ${stagedFiles.length} staged files`);
            // 2. Run security check on staged files
            const result = await this.backend.runSecurityCheck(stagedFiles);
            if (!result.success) {
                this.logger.error(`Security check failed: ${result.error}`);
                return {
                    allowed: false,
                    reason: `Security check failed: ${result.error}`,
                    blocking: true,
                };
            }
            const analysisResult = result.data;
            // 3. Check for blocking issues
            if (config.preCommit.blockOnCritical && analysisResult.critical > 0) {
                const message = `🔴 CRITICAL Issues Found: ${analysisResult.critical}\n\nBlocking commit to prevent security issues.`;
                this.logger.warn(message);
                return {
                    allowed: false,
                    reason: message,
                    blocking: true,
                    findings: analysisResult,
                };
            }
            if (config.preCommit.blockOnHigh && analysisResult.high > 0) {
                const message = `🟠 HIGH Priority Issues Found: ${analysisResult.high}\n\nBlocking commit to prevent security issues.`;
                this.logger.warn(message);
                return {
                    allowed: false,
                    reason: message,
                    blocking: true,
                    findings: analysisResult,
                };
            }
            // 4. If issues but not blocking, show warning
            if (analysisResult.critical > 0 || analysisResult.high > 0 || analysisResult.medium > 0) {
                const warning = `⚠️ Security Issues Found:\n` +
                    `🔴 Critical: ${analysisResult.critical}\n` +
                    `🟠 High: ${analysisResult.high}\n` +
                    `🟡 Medium: ${analysisResult.medium}`;
                this.logger.warn(warning);
                // Show findings in UI
                if (this.uiManager) {
                    try {
                        const approved = await this.uiManager.showSecurityFindings(analysisResult);
                        if (!approved) {
                            return {
                                allowed: false,
                                reason: 'User blocked commit due to security findings',
                                blocking: true,
                                findings: analysisResult,
                            };
                        }
                    }
                    catch (uiError) {
                        this.logger.error(`Failed to show UI findings: ${uiError}`);
                    }
                }
                return {
                    allowed: true,
                    reason: warning,
                    blocking: false,
                    findings: analysisResult,
                };
            }
            // 5. No issues found
            this.logger.info('✅ Security check passed - no issues found');
            return {
                allowed: true,
                reason: 'Security check passed',
                blocking: false,
                findings: analysisResult,
            };
        }
        catch (error) {
            this.logger.error(`Pre-commit handler error: ${error}`);
            return {
                allowed: true, // Fail open - don't block on error
                reason: `Handler error (non-blocking): ${error}`,
                blocking: false,
            };
        }
    }
    /**
     * Get staged files from git
     */
    async getStagedFiles() {
        try {
            const { stdout } = await execAsync('git diff --cached --name-only', {
                cwd: this.gitDir,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            });
            const files = stdout
                .split('\n')
                .map((f) => f.trim())
                .filter((f) => f.length > 0);
            this.logger.info(`Found ${files.length} staged files`);
            return files;
        }
        catch (error) {
            this.logger.error(`Failed to get staged files: ${error}`);
            throw error;
        }
    }
    /**
     * Format findings for display
     */
    formatFindings(findings) {
        let output = '📋 Security Analysis Results:\n\n';
        if (findings.critical > 0) {
            output += `🔴 CRITICAL: ${findings.critical}\n`;
        }
        if (findings.high > 0) {
            output += `🟠 HIGH: ${findings.high}\n`;
        }
        if (findings.medium > 0) {
            output += `🟡 MEDIUM: ${findings.medium}\n`;
        }
        if (findings.low > 0) {
            output += `🔵 LOW: ${findings.low}\n`;
        }
        return output;
    }
}
exports.PreCommitHandler = PreCommitHandler;
//# sourceMappingURL=pre-commit-handler.js.map