# Phase 7: VS Code IDE Extension with OAuth Integration

**Status:** Specification & Architecture  
**Target:** VS Code  
**Platforms:** GitHub + GitLab  
**Auth:** OAuth 2.0 Flow  
**Integration:** Pre-commit + Post-commit Hooks  
**Date:** November 12, 2026  

---

## 🎯 Executive Overview

Phase 7 extends the AI Remediation Agent from CLI/GitHub Actions into **VS Code as a seamless IDE extension** that:

- ✅ Automatically analyzes code on **every commit**
- ✅ Shows **security findings before commit** (pre-commit hook)
- ✅ Displays **full impact summary after commit** (post-commit hook)
- ✅ Stores credentials securely via **OAuth flow** (like Copilot)
- ✅ Supports **GitHub and GitLab** simultaneously
- ✅ **Zero repository changes** - all config in IDE
- ✅ **Reuses Phase 6 backend** entirely

---

## 🏗️ Architecture

### Three-Layer Design

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: IDE Extension (VS Code)                           │
│  ├─ Credential Manager (OAuth)                              │
│  ├─ Git Hook Integration                                    │
│  ├─ UI Components (Panels, Diagnostics)                     │
│  └─ Status Bar Integration                                  │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: Engine Integration Bridge                         │
│  ├─ Backend Communicator                                    │
│  ├─ Process Manager (Node.js child_process)                 │
│  ├─ Result Parser & Cache                                   │
│  └─ Error Handler                                           │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3: Phase 6 Backend (Unchanged)                       │
│  ├─ Phase 4.1-4.3: Security Analysis                       │
│  ├─ Phase 4.4-4.8: Report Generation                       │
│  └─ CLI Scripts (change-impact-agent.cjs)                   │
└─────────────────────────────────────────────────────────────┘
        ↓ Secure OAuth Tokens
┌──────────────────────────────┐
│  GitHub / GitLab APIs        │
│  • PR Metadata               │
│  • Commit Data               │
│  • Branch Information        │
└──────────────────────────────┘
```

---

## 📋 Component Specifications

### 1. Credential Management (OAuth Flow)

#### GitHub OAuth
```typescript
interface GitHubOAuthConfig {
  clientId: string;           // Provided by GitHub App
  clientSecret: string;       // Stored securely
  redirectUri: string;        // http://localhost:8000/callback
  scope: string[];           // ['repo', 'read:org']
  tokenEndpoint: string;     // https://github.com/login/oauth/access_token
}

interface GitHubToken {
  accessToken: string;
  tokenType: 'bearer';
  expiresIn?: number;
  refreshToken?: string;
  scope: string[];
  createdAt: number;
}
```

#### GitLab OAuth
```typescript
interface GitLabOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;       // http://localhost:8000/callback
  scope: string[];          // ['api', 'read_user', 'read_repository']
  tokenEndpoint: string;    // https://gitlab.com/oauth/token
  gitlabUrl?: string;       // For self-hosted GitLab
}

interface GitLabToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken?: string;
  scope: string[];
  createdAt: number;
}
```

#### Secure Storage
```typescript
// VS Code Secret Storage API
await context.secrets.store('github-token', tokenJson, {
  migrationNecessary: false
});

// Retrieve
const token = await context.secrets.get('github-token');

// Update
await context.secrets.update('github-token', newTokenJson);

// Delete
await context.secrets.delete('github-token');
```

---

### 2. Git Hook Integration

#### Pre-Commit Hook
```bash
.git/hooks/pre-commit
#!/bin/bash

# Triggered by: git add && git commit
# Runs: Phase 4.1-4.3 (Security analysis only)
# Purpose: Block commits with critical issues

STAGED_FILES=$(git diff --cached --name-only)
RESULT=$(node phase-4-security-check.cjs --files "$STAGED_FILES")

if grep -q "CRITICAL" "$RESULT"; then
  echo "❌ CRITICAL security issues found"
  exit 1  # Block commit
fi

exit 0  # Allow commit
```

#### Post-Commit Hook
```bash
.git/hooks/post-commit
#!/bin/bash

# Triggered by: git commit (successful)
# Runs: Phase 4.4-4.8 (Full analysis)
# Purpose: Generate report, show in IDE

COMMIT_SHA=$(git rev-parse HEAD)
node phase-4-full-analysis.cjs --commit "$COMMIT_SHA"

# Notify IDE to show summary panel
echo "analysis-complete:$COMMIT_SHA" > /tmp/ide-notification
```

---

### 3. Pre-Commit Flow

**User Action:** `git add .` + `git commit`

**IDE Execution:**
```
1. Detect staged files
2. Call Phase 4.1-4.3 (quick security check)
3. Parse results for CRITICAL/HIGH issues
4. Show Security Panel in IDE:
   ┌────────────────────────────────────┐
   │ 🔐 SECURITY ANALYSIS (Pre-commit)  │
   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
   │ 🔴 SQL Injection (src/auth.ts:42)  │
   │    └─ Use parameterized queries    │
   │                                    │
   │ 🟡 Missing Validation (api.ts:15) │
   │    └─ Add input sanitization      │
   │                                    │
   │ [Allow Commit] [Block] [Review]   │
   └────────────────────────────────────┘
5. If CRITICAL found:
   - Show dialog
   - Option to fix or override
   - Block commit if user confirms
6. If OK:
   - Allow git commit to proceed
```

---

### 4. Post-Commit Flow

**User Action:** `git commit` (successful)

**IDE Execution:**
```
1. Detect new commit
2. Get commit SHA and changed files
3. Call full Phase 4.4-4.8 pipeline
4. Generate reports (MD + JSON)
5. Show Summary Panel:
   ┌─────────────────────────────────────┐
   │ 📊 CHANGE IMPACT SUMMARY            │
   │ ─────────────────────────────────── │
   │ Impact Level: 🟠 MAJOR (85%)        │
   │ Files: +2 ~3 -1 | Lines: +150 -45  │
   │                                     │
   │ 🔌 API: 3 endpoints changed         │
   │ 🔐 Security: 2 sensitive files      │
   │ 💾 Data: 1 schema update            │
   │                                     │
   │ [View Full Report] [View Diagrams]  │
   └─────────────────────────────────────┘
6. Optional auto-actions:
   - Update PR description (if on GitHub)
   - Create GitLab discussion (if on GitLab)
   - Add to commit message as footer
```

---

### 5. UI Components

#### Component 1: Security Panel (Pre-commit)
```typescript
interface SecurityPanelData {
  phase: 'pre-commit';
  timestamp: number;
  stagedFiles: string[];
  findings: {
    critical: Finding[];
    high: Finding[];
    medium: Finding[];
  };
  blockCommit: boolean;
  allowOverride: boolean;
}

// Rendered as: VS Code Webview Panel
// Shows: Issues, severity, file/line, recommendations
// Actions: Allow, Block, Review in full report
```

#### Component 2: Summary Panel (Post-commit)
```typescript
interface SummaryPanelData {
  phase: 'post-commit';
  commitSha: string;
  timestamp: number;
  report: {
    overallLevel: 'critical' | 'major' | 'moderate' | 'minor';
    confidence: number;
    metrics: ImpactMetrics;
    impact: ImpactAnalysis;
    recommendations: string[];
  };
  diagrams: {
    technical: string;  // Mermaid
    business: string;   // Mermaid
  };
}

// Rendered as: VS Code Webview Panels + Mermaid.js
// Shows: Metrics, impact areas, diagrams
// Actions: View full report, export, comment
```

#### Component 3: Status Bar Item
```typescript
// VS Code Status Bar
"🔍 Analysis: Ready" | "⏳ Analyzing..." | "✅ Done" | "⚠️ Issues"

// Click to:
// - Open security panel
// - Open summary panel
// - Refresh analysis
// - Configure extension
```

#### Component 4: Inline Diagnostics
```typescript
// Show issues directly in editor
src/auth.ts:42
   SQL Injection
   └─ Use parameterized queries
   └─ [Quick Fix]

// Configurable severity levels
// Can be toggled on/off
```

---

### 6. Credential Manager Flow

#### First-Time Setup
```
User installs extension
        ↓
Extension shows: "Connect GitHub/GitLab?"
        ↓
User chooses platform
        ↓
Opens OAuth login (browser)
        ↓
GitHub/GitLab authorization page
        ↓
User approves scopes
        ↓
Token returned to extension
        ↓
Stored in VS Code Secret Storage
        ↓
"✅ Connected to GitHub & GitLab"
```

#### Token Refresh
```typescript
interface TokenRefreshStrategy {
  checkInterval: number;        // Every 1 hour
  refreshBeforeExpiry: number;  // 5 minutes before
  
  onTokenExpired: () => {
    // Show notification
    // Prompt user to re-authenticate
    // Or use refresh token (if available)
  };
}
```

---

## 📁 Directory Structure

```
.vscode-ext/                           [NEW - Phase 7]
├── src/
│   ├── extension.ts                   # Main entry point
│   ├── constants.ts                   # Configuration constants
│   │
│   ├── credentials/                   # OAuth & Token Management
│   │   ├── oauth-manager.ts          # GitHub + GitLab OAuth
│   │   ├── credential-store.ts       # VS Code Secret Storage
│   │   ├── token-validator.ts        # Token validation & refresh
│   │   └── types.ts                  # Interfaces
│   │
│   ├── hooks/                         # Git Hook Integration
│   │   ├── hook-manager.ts           # Setup/teardown hooks
│   │   ├── pre-commit-handler.ts     # Pre-commit execution
│   │   ├── post-commit-handler.ts    # Post-commit execution
│   │   └── git-utils.ts              # Git operations
│   │
│   ├── ui/                            # VS Code UI Components
│   │   ├── security-panel.ts         # Pre-commit panel
│   │   ├── summary-panel.ts          # Post-commit panel
│   │   ├── diagrams-viewer.ts        # Mermaid rendering
│   │   ├── status-bar.ts             # Status bar item
│   │   ├── diagnostics.ts            # Inline editor diagnostics
│   │   └── webviews/
│   │       ├── security-view.html
│   │       ├── summary-view.html
│   │       └── styles.css
│   │
│   ├── engine-integration/            # Bridge to Phase 6
│   │   ├── backend-communicator.ts   # Execute Phase 6 scripts
│   │   ├── process-manager.ts        # Child process management
│   │   ├── result-parser.ts          # Parse JSON outputs
│   │   ├── cache-manager.ts          # Cache analysis results
│   │   └── error-handler.ts          # Error recovery
│   │
│   ├── config/                        # Configuration
│   │   ├── config-manager.ts         # Load/save config
│   │   ├── settings.ts               # VS Code settings
│   │   └── defaults.ts               # Default values
│   │
│   └── utils/
│       ├── logger.ts                 # Logging with levels
│       ├── notification.ts           # User notifications
│       ├── github-api.ts             # GitHub API client
│       ├── gitlab-api.ts             # GitLab API client
│       └── file-utils.ts             # File operations
│
├── views/                             # Tree view providers
│   ├── analysis-history.ts           # Show past analyses
│   └── recommendations.ts            # Show recommendations
│
├── package.json                       # Extension manifest
├── tsconfig.json                      # TypeScript config
├── extension.config.json              # Extension configuration
├── README.md                          # User documentation
├── DEVELOPMENT.md                     # Dev guide
│
└── tests/                             # Unit tests
    ├── credentials.test.ts
    ├── hooks.test.ts
    ├── ui.test.ts
    └── integration.test.ts
```

---

## 🔄 Data Flow Diagram

```
VS Code Extension
        ↓
User makes changes
        ↓
git add .
        ↓
git commit (pre-commit hook triggered)
        ↓
Extension → Phase 4.1-4.3 (Security check)
        ↓
Show Security Panel
        ↓
User reviews/fixes
        ↓
Allow commit
        ↓
Commit created (post-commit hook triggered)
        ↓
Extension → Full Phase 4.4-4.8 pipeline
        ↓
Generate reports & diagrams
        ↓
Show Summary Panel
        ↓
Optional: Update PR on GitHub/GitLab
        ↓
git push
        ↓
Code review with analysis attached
```

---

## 🔐 OAuth Scope Requirements

### GitHub OAuth
```
{
  "scopes": [
    "repo",              # Access to public/private repos
    "read:org",          # Read organization data
    "read:user",         # Read user profile
    "workflow"           # Access to GitHub Actions
  ]
}
```

### GitLab OAuth
```
{
  "scopes": [
    "api",               # Full API access
    "read_user",         # Read user profile
    "read_repository",   # Read repository data
    "read_api"           # Full read access
  ]
}
```

---

## 📊 Configuration Schema

```json
{
  "remediationAgent": {
    "enabled": true,
    
    "github": {
      "enabled": true,
      "oauthClientId": "YOUR_GITHUB_CLIENT_ID",
      "authenticated": false,
      "username": null
    },
    
    "gitlab": {
      "enabled": true,
      "oauthClientId": "YOUR_GITLAB_CLIENT_ID",
      "gitlabUrl": "https://gitlab.com",
      "authenticated": false,
      "username": null
    },
    
    "preCommit": {
      "enabled": true,
      "blockOnCritical": true,
      "blockOnHigh": false,
      "showPanel": true,
      "timeout": 30000
    },
    
    "postCommit": {
      "enabled": true,
      "showPanel": true,
      "generateDiagrams": true,
      "updatePR": true,
      "timeout": 60000
    },
    
    "ui": {
      "theme": "auto",
      "notifications": "all",
      "inlineDiagnostics": true
    },
    
    "cache": {
      "enabled": true,
      "duration": 3600000
    }
  }
}
```

---

## 🚀 Development Roadmap

### Phase 7.1: Foundation (Week 1)
- [ ] Extension structure setup
- [ ] VS Code extension.ts entry point
- [ ] Configuration management
- [ ] Logging framework

### Phase 7.2: OAuth Integration (Week 2)
- [ ] GitHub OAuth flow
- [ ] GitLab OAuth flow
- [ ] Credential storage
- [ ] Token refresh mechanism

### Phase 7.3: Git Hooks (Week 2-3)
- [ ] Pre-commit hook setup
- [ ] Post-commit hook setup
- [ ] Hook file management
- [ ] Error recovery

### Phase 7.4: UI Components (Week 3-4)
- [ ] Security panel (pre-commit)
- [ ] Summary panel (post-commit)
- [ ] Diagrams viewer (Mermaid)
- [ ] Status bar integration
- [ ] Inline diagnostics

### Phase 7.5: Engine Bridge (Week 4)
- [ ] Backend communicator
- [ ] Process manager
- [ ] Result parser
- [ ] Caching system

### Phase 7.6: Testing & Polish (Week 5)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Error handling
- [ ] Performance optimization

### Phase 7.7: Documentation & Release (Week 6)
- [ ] User guide
- [ ] Developer documentation
- [ ] VS Code Marketplace submission
- [ ] Release notes

---

## 📦 Dependencies

### npm packages
```json
{
  "@vscode/vsce": "^2.x",           # Packaging tool
  "axios": "^1.x",                   # HTTP requests
  "dotenv": "^16.x",                 # Environment variables
  "simple-oauth2": "^4.x",           # OAuth 2.0 client
  "typescript": "^5.x",              # Language
  "@types/node": "^20.x",            # Node.js types
  "@types/vscode": "^1.x",           # VS Code API types
  "mermaid": "^10.x",                # Diagram rendering
  "date-fns": "^2.x"                 # Date utilities
}
```

---

## ✅ Success Criteria

- [ ] Extension installs from VS Code Marketplace
- [ ] OAuth login works for GitHub & GitLab
- [ ] Pre-commit security analysis runs automatically
- [ ] Post-commit full analysis runs automatically
- [ ] Security panel displays correctly
- [ ] Summary panel displays correctly
- [ ] Diagrams render inline
- [ ] Reports match Phase 6 output format
- [ ] Zero repository changes
- [ ] Tests pass (90%+ coverage)
- [ ] Documentation complete
- [ ] User can install and configure in <5 minutes

---

## 📝 Next Steps

1. ✅ Create extension structure
2. ✅ Implement OAuth managers (GitHub + GitLab)
3. ✅ Create UI components (panels, webviews)
4. ✅ Build hook integration system
5. ✅ Connect to Phase 6 backend
6. ✅ Add configuration UI
7. ✅ Write comprehensive tests
8. ✅ Document for users and developers

---

**Phase 7 Status:** Ready for Implementation ✓

This specification maintains full compatibility with Phase 6 while adding IDE-native user experience for developers.
