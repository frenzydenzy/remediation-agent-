/**
 * Core constants and type definitions for the Remediation Agent VS Code Extension
 */
export declare const EXTENSION_ID = "remediation-agent.ai-remediation-agent";
export declare const GITHUB_OAUTH: {
    clientId: string;
    scope: string[];
    redirectUri: string;
    tokenEndpoint: string;
};
export declare const GITLAB_OAUTH: {
    clientId: string;
    scope: string[];
    redirectUri: string;
    tokenEndpoint: string;
};
export declare const STORAGE_KEYS: {
    GITHUB_TOKEN: string;
    GITLAB_TOKEN: string;
    GITHUB_USER: string;
    GITLAB_USER: string;
    LAST_ANALYSIS: string;
    ANALYSIS_CACHE: string;
    HOOK_SETUP: string;
};
export declare const MESSAGE_TYPES: {
    SECURITY_CHECK: string;
    FULL_ANALYSIS: string;
    CACHE_HIT: string;
    CACHE_MISS: string;
    ERROR: string;
    SUCCESS: string;
};
export declare const SEVERITY: {
    readonly CRITICAL: "CRITICAL";
    readonly HIGH: "HIGH";
    readonly MEDIUM: "MEDIUM";
    readonly LOW: "LOW";
    readonly INFO: "INFO";
};
export declare const SEVERITY_ORDER: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INFO: number;
};
export declare const TIMEOUTS: {
    SECURITY_CHECK: number;
    FULL_ANALYSIS: number;
    OAUTH_REDIRECT: number;
    CACHE_DURATION: number;
    TOKEN_REFRESH: number;
};
export declare const PANEL_IDS: {
    SECURITY: string;
    SUMMARY: string;
    DIAGRAMS: string;
    HISTORY: string;
};
export declare const COMMANDS: {
    AUTHENTICATE: string;
    RUN_ANALYSIS: string;
    OPEN_SETTINGS: string;
    VIEW_SECURITY: string;
    VIEW_SUMMARY: string;
    CLEAR_CACHE: string;
    LOGOUT: string;
};
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
//# sourceMappingURL=constants.d.ts.map