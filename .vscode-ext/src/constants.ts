/**
 * Core constants and type definitions for the Remediation Agent VS Code Extension
 */

export const EXTENSION_ID = 'remediation-agent.ai-remediation-agent';

// OAuth Configuration
export const GITHUB_OAUTH = {
  clientId: 'Ov23liIDhA8l5z3k8H7v',  // GitHub OAuth App ID
  scope: ['repo', 'read:org', 'read:user', 'workflow'],
  redirectUri: 'http://localhost:8000/callback',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};

export const GITLAB_OAUTH = {
  clientId: '4c3b6e5f8a2d1f9e7b4c',  // GitLab OAuth App ID
  scope: ['api', 'read_user', 'read_repository', 'read_api'],
  redirectUri: 'http://localhost:8000/callback',
  tokenEndpoint: 'https://gitlab.com/oauth/token',
};

// Storage Keys
export const STORAGE_KEYS = {
  GITHUB_TOKEN: 'github-oauth-token',
  GITLAB_TOKEN: 'gitlab-oauth-token',
  GITHUB_USER: 'github-user-info',
  GITLAB_USER: 'gitlab-user-info',
  LAST_ANALYSIS: 'last-analysis-result',
  ANALYSIS_CACHE: 'analysis-cache',
  HOOK_SETUP: 'hooks-installed',
};

// Message Types
export const MESSAGE_TYPES = {
  SECURITY_CHECK: 'security-check',
  FULL_ANALYSIS: 'full-analysis',
  CACHE_HIT: 'cache-hit',
  CACHE_MISS: 'cache-miss',
  ERROR: 'error',
  SUCCESS: 'success',
};

// Severity Levels
export const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
} as const;

export const SEVERITY_ORDER = {
  [SEVERITY.CRITICAL]: 0,
  [SEVERITY.HIGH]: 1,
  [SEVERITY.MEDIUM]: 2,
  [SEVERITY.LOW]: 3,
  [SEVERITY.INFO]: 4,
};

// Timeout Defaults
export const TIMEOUTS = {
  SECURITY_CHECK: 30000,    // 30 seconds
  FULL_ANALYSIS: 60000,     // 60 seconds
  OAUTH_REDIRECT: 120000,   // 2 minutes
  CACHE_DURATION: 3600000,  // 1 hour
  TOKEN_REFRESH: 300000,    // 5 minutes before expiry
};

// Panel IDs
export const PANEL_IDS = {
  SECURITY: 'security-findings',
  SUMMARY: 'analysis-summary',
  DIAGRAMS: 'impact-diagrams',
  HISTORY: 'analysis-history',
};

// Command IDs
export const COMMANDS = {
  AUTHENTICATE: 'remediationAgent.authenticate',
  RUN_ANALYSIS: 'remediationAgent.runAnalysis',
  OPEN_SETTINGS: 'remediationAgent.openSettings',
  VIEW_SECURITY: 'remediationAgent.viewSecurityPanel',
  VIEW_SUMMARY: 'remediationAgent.viewSummaryPanel',
  CLEAR_CACHE: 'remediationAgent.clearCache',
  LOGOUT: 'remediationAgent.logout',
};

// Type Definitions

export interface OAuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  refreshToken?: string;
  scope: string[];
  createdAt: number;
}

export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  platform: 'github' | 'gitlab';
}

export interface SecurityFinding {
  file: string;
  line: number;
  category: string;
  severity: keyof typeof SEVERITY;
  title: string;
  description?: string;
  recommendation?: string;
}

export interface SecurityAnalysisResult {
  timestamp: number;
  stagedFiles: string[];
  findings: SecurityFinding[];
  critical: number;
  high: number;
  medium: number;
  low: number;
  canBlockCommit: boolean;
}

export interface ImpactMetrics {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  complexity: 'low' | 'medium' | 'high' | 'critical';
  risklevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export interface AnalysisSummary {
  commitSha: string;
  timestamp: number;
  metrics: ImpactMetrics;
  overallLevel: 'critical' | 'major' | 'moderate' | 'minor';
  findings: SecurityFinding[];
  recommendations: string[];
  diagrams?: {
    technical: string;
    business: string;
  };
}

export interface AnalysisCache {
  key: string;
  commitSha: string;
  result: SecurityAnalysisResult | AnalysisSummary;
  timestamp: number;
  expiresAt: number;
}

export interface ExtensionConfig {
  enabled: boolean;
  github: {
    enabled: boolean;
    oauthClientId: string;
    authenticated: boolean;
    username?: string;
  };
  gitlab: {
    enabled: boolean;
    oauthClientId: string;
    url: string;
    authenticated: boolean;
    username?: string;
  };
  preCommit: {
    enabled: boolean;
    blockOnCritical: boolean;
    blockOnHigh: boolean;
    timeout: number;
  };
  postCommit: {
    enabled: boolean;
    showPanel: boolean;
    timeout: number;
  };
  ui: {
    theme: 'auto' | 'light' | 'dark';
    notifications: 'all' | 'important' | 'none';
    inlineDiagnostics: boolean;
  };
  cache: {
    enabled: boolean;
    duration: number;
  };
  debug: boolean;
}

export interface HookConfig {
  gitDir: string;
  preCommitPath: string;
  postCommitPath: string;
  installed: boolean;
}

export interface EngineResponse {
  success: boolean;
  data?: SecurityAnalysisResult | AnalysisSummary;
  error?: string;
  duration: number;
  cacheHit?: boolean;
}
