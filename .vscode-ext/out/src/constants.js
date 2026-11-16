"use strict";
/**
 * Core constants and type definitions for the Remediation Agent VS Code Extension
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMANDS = exports.PANEL_IDS = exports.TIMEOUTS = exports.SEVERITY_ORDER = exports.SEVERITY = exports.MESSAGE_TYPES = exports.STORAGE_KEYS = exports.GITLAB_OAUTH = exports.GITHUB_OAUTH = exports.EXTENSION_ID = void 0;
exports.EXTENSION_ID = 'remediation-agent.ai-remediation-agent';
// OAuth Configuration
exports.GITHUB_OAUTH = {
    clientId: 'Ov23liIDhA8l5z3k8H7v', // GitHub OAuth App ID
    scope: ['repo', 'read:org', 'read:user', 'workflow'],
    redirectUri: 'http://localhost:8000/callback',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
};
exports.GITLAB_OAUTH = {
    clientId: '4c3b6e5f8a2d1f9e7b4c', // GitLab OAuth App ID
    scope: ['api', 'read_user', 'read_repository', 'read_api'],
    redirectUri: 'http://localhost:8000/callback',
    tokenEndpoint: 'https://gitlab.com/oauth/token',
};
// Storage Keys
exports.STORAGE_KEYS = {
    GITHUB_TOKEN: 'github-oauth-token',
    GITLAB_TOKEN: 'gitlab-oauth-token',
    GITHUB_USER: 'github-user-info',
    GITLAB_USER: 'gitlab-user-info',
    LAST_ANALYSIS: 'last-analysis-result',
    ANALYSIS_CACHE: 'analysis-cache',
    HOOK_SETUP: 'hooks-installed',
};
// Message Types
exports.MESSAGE_TYPES = {
    SECURITY_CHECK: 'security-check',
    FULL_ANALYSIS: 'full-analysis',
    CACHE_HIT: 'cache-hit',
    CACHE_MISS: 'cache-miss',
    ERROR: 'error',
    SUCCESS: 'success',
};
// Severity Levels
exports.SEVERITY = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
    INFO: 'INFO',
};
exports.SEVERITY_ORDER = {
    [exports.SEVERITY.CRITICAL]: 0,
    [exports.SEVERITY.HIGH]: 1,
    [exports.SEVERITY.MEDIUM]: 2,
    [exports.SEVERITY.LOW]: 3,
    [exports.SEVERITY.INFO]: 4,
};
// Timeout Defaults
exports.TIMEOUTS = {
    SECURITY_CHECK: 30000, // 30 seconds
    FULL_ANALYSIS: 60000, // 60 seconds
    OAUTH_REDIRECT: 120000, // 2 minutes
    CACHE_DURATION: 3600000, // 1 hour
    TOKEN_REFRESH: 300000, // 5 minutes before expiry
};
// Panel IDs
exports.PANEL_IDS = {
    SECURITY: 'security-findings',
    SUMMARY: 'analysis-summary',
    DIAGRAMS: 'impact-diagrams',
    HISTORY: 'analysis-history',
};
// Command IDs
exports.COMMANDS = {
    AUTHENTICATE: 'remediationAgent.authenticate',
    RUN_ANALYSIS: 'remediationAgent.runAnalysis',
    OPEN_SETTINGS: 'remediationAgent.openSettings',
    VIEW_SECURITY: 'remediationAgent.viewSecurityPanel',
    VIEW_SUMMARY: 'remediationAgent.viewSummaryPanel',
    CLEAR_CACHE: 'remediationAgent.clearCache',
    LOGOUT: 'remediationAgent.logout',
};
//# sourceMappingURL=constants.js.map