# Phase 5.1: Credential Management & Multi-Repository Support

**Status:** 🚀 NEW PHASE - FOUNDATION FOR PHASE 5  
**Timeline:** 3-4 days (Days -4 to -1 before Phase 5 modules)  
**LOC:** 300-400  
**Tests:** 12-15  
**Platform:** Cross-platform (Windows, macOS, Linux)  

---

## Executive Summary

**Phase 5.1** establishes secure credential management and multi-repository support as the **foundation** for Phase 5. This ensures developers authenticate once per Git platform and can operate across multiple authorized repositories without exposing tokens.

**Key Requirement:** Credentials stored securely in OS credential manager, never in logs/commits/configs.

---

## Requirements Implementation

| # | Requirement | Implementation |
|---|-------------|-----------------|
| 1 | One-time auth per platform | Credential store per platform (GitHub/GitLab) |
| 2 | Secure credential storage | OS Credential Manager integration |
| 3 | Auto credential retrieval | Automatic lookup from secure store |
| 4 | Repo config separate from creds | Credentials in vault, repos in config |
| 5 | Multi-repo same account | Repository identifiers only in config |
| 6 | Separate GitHub/GitLab creds | Platform-specific credential namespaces |
| 7 | Token validation | Pre-operation permission & expiration checks |
| 8 | Re-authentication on failure | Automatic prompt & retry mechanism |
| 9 | No credentials in logs | Sanitization filter for all output |
| 10 | Explicit revocation | Credential deletion & replacement CLI |

---

## 3 Modules for Phase 5.1

### 1. Credential Manager (150-200 LOC, 8 tests)

**Purpose:** Secure credential storage & retrieval

**Functions:**
- `storeCredential(platform, token, metadata)` - Store with encryption
- `getCredential(platform)` - Retrieve from OS vault
- `hasCredential(platform)` - Check if stored
- `deleteCredential(platform)` - Revoke access
- `updateCredential(platform, newToken)` - Replace token
- `getPlatforms()` - List stored platform creds

**Storage Backends:**
```javascript
// Windows: Credential Manager
credentialManager.getCredential("GitHub") 
  → HKEY_CURRENT_USER\Software\Microsoft\Credentials\...

// macOS: Keychain
credentialManager.getCredential("GitHub")
  → /Library/Keychains/login.keychain-db

// Linux: Secret Service (gnome-keyring)
credentialManager.getCredential("GitHub")
  → dbus org.freedesktop.Secret
```

**Testing:** 8 tests
- Store credential (Windows/macOS/Linux)
- Retrieve credential
- Delete credential
- Update credential
- Handle missing credentials
- Handle platform errors

---

### 2. Repository Config Manager (100-150 LOC, 5 tests)

**Purpose:** Manage multi-repository configurations without credentials

**Functions:**
- `addRepository(repoId, settings)` - Register repo
- `getRepository(repoId)` - Get repo config
- `listRepositories(platform)` - List all repos
- `removeRepository(repoId)` - Unregister repo
- `validateRepository(repoId)` - Verify access

**Config Schema:**
```javascript
{
  repositories: [
    {
      id: "github-my-org-my-repo",
      platform: "github",
      owner: "my-org",
      repo: "my-repo",
      branch: "main",
      autoMerge: true,
      reviewers: ["alice", "bob"]
    },
    {
      id: "gitlab-internal-project",
      platform: "gitlab",
      projectId: 12345,
      branch: "main",
      autoMerge: false,
      approvers: ["charlie"]
    }
  ]
}
```

**Note:** NO credentials in config file!

**Testing:** 5 tests
- Add repository
- List repositories
- Remove repository
- Validate repository
- Handle missing repository

---

### 3. Token Validator & Sanitizer (50-100 LOC, 2-3 tests)

**Purpose:** Validate tokens before use & sanitize logs

**Functions:**
- `validateToken(platform, token)` - Check validity & permissions
- `checkExpiration(platform, token)` - Verify not expired
- `sanitizeOutput(text)` - Remove tokens from logs
- `sanitizeError(error)` - Remove tokens from error messages

**Validation Checks:**
```javascript
async validateToken(platform, token) {
  // 1. Token format validation
  // 2. API connectivity check
  // 3. Permission verification
  // 4. Rate limit check
  // 5. Expiration date check
  
  return {
    valid: true,
    permissions: ["repo", "workflow"],
    expiresAt: "2025-12-31",
    rateLimitRemaining: 4999
  };
}
```

**Testing:** 2-3 tests
- Valid token accepted
- Expired token rejected
- Invalid format rejected
- Log sanitization

---

## Credential Storage Implementation Details

### Windows: Windows Credential Manager

```cjs
// Use windows-credential-manager npm package
const credentialManager = require('windows-credential-manager');

// Store
credentialManager.setCredential({
  target: 'GitHubToken',
  username: 'oauth2',
  password: 'ghp_xxxxxxxxxxxxxxxxxxxx',
  type: 'generic'
});

// Retrieve
const cred = credentialManager.getCredential('GitHubToken');
// Returns: { username: 'oauth2', password: 'ghp_xxxx' }

// Delete
credentialManager.deleteCredential('GitHubToken');
```

### macOS: Keychain (via security CLI)

```bash
# Store
security add-generic-password -a oauth2 -s GitHubToken -w ghp_xxxx

# Retrieve
security find-generic-password -s GitHubToken -w

# Delete
security delete-generic-password -s GitHubToken
```

**Node.js Wrapper:**
```cjs
const { execSync } = require('child_process');

function storeInKeychain(service, password) {
  execSync(`security add-generic-password -a oauth2 -s ${service} -w ${password}`);
}

function getFromKeychain(service) {
  return execSync(`security find-generic-password -s ${service} -w`).toString().trim();
}
```

### Linux: Secret Service (D-Bus)

```cjs
// Use libsecret via node-secret npm package
const secret = require('secret');

// Store
await secret.storePassword('github-token', 'ghp_xxxxxxxxxxxxxxxxxxxx', {
  service: 'remediation-agent'
});

// Retrieve
const token = await secret.getPassword('github-token');

// Delete
await secret.deletePassword('github-token');
```

---

## Authentication Flow

### Initial Setup (First Time)

```
User runs: npm run setup

  ↓
  
Prompt: "Enter GitHub token (will be stored securely)"
Input: ghp_xxxxxxxxxxxxxxxxxxxx

  ↓

Validate token:
  ✓ Format check
  ✓ API connectivity
  ✓ Permissions check
  ✓ Expiration check

  ↓

Store in OS Credential Manager:
  - Windows: Credential Manager
  - macOS: Keychain
  - Linux: Secret Service

  ↓

Success: "GitHub credentials stored securely"
```

### Multi-Repository Setup

```
npm run add-repo

  ↓

Prompt: 
  Platform: "github|gitlab"
  Owner/ProjectId: "my-org" / "12345"
  Repo: "my-repo"
  Branch: "main"

  ↓

Retrieve credential from vault:
  Windows: Credential Manager → ghp_xxxx
  macOS: Keychain → ghp_xxxx
  Linux: Secret Service → ghp_xxxx

  ↓

Validate token has access:
  GitHub API: GET /repos/{owner}/{repo}
  GitLab API: GET /projects/{id}

  ↓

Store repo config (NO credentials):
  {
    id: "github-my-org-my-repo",
    platform: "github",
    owner: "my-org",
    repo: "my-repo",
    ...
  }

  ↓

Success: Repository registered
```

### Operation Time (Phase 5 modules)

```
Phase 5 module needs to create PR:

  ↓

Call: credentialManager.getCredential("github")

  ↓

Retrieve from OS vault (transparent to user):
  Windows: Credential Manager → ghp_xxxx
  macOS: Keychain → ghp_xxxx
  Linux: Secret Service → ghp_xxxx

  ↓

Validate token:
  ✓ Not expired
  ✓ Still valid
  ✓ Still has permissions

  ↓

Use token for API call:
  POST /repos/{owner}/{repo}/pulls

  ↓

Success: PR created
(Token never logged, never exposed)
```

---

## Configuration File Example

**File:** `.remediation-agent-config.json`

```javascript
{
  // NO CREDENTIALS HERE!
  // Credentials stored in OS Credential Manager
  
  "repositories": [
    {
      "id": "github-acme-api",
      "platform": "github",
      "owner": "acme-corp",
      "repo": "api-service",
      "branch": "main",
      "autoMerge": true,
      "autoMergeConditions": {
        "requireAllChecksPass": true,
        "requireCodeOwnerReview": true,
        "dismissStaleReviews": true
      },
      "notifications": {
        "slack": "#security-fixes",
        "email": ["security@acme.com"]
      }
    },
    {
      "id": "gitlab-internal-web",
      "platform": "gitlab",
      "baseUrl": "https://gitlab.internal.acme.com",
      "projectId": 567,
      "branch": "main",
      "autoMerge": false,
      "autoMergeConditions": {
        "requireAllChecksPass": true,
        "requireMaintainerApproval": true
      }
    }
  ],
  
  "credentialPlatforms": [
    "github",      // Credentials stored in vault
    "gitlab"       // Credentials stored in vault
  ],
  
  "logSanitization": {
    "enabled": true,
    "masks": ["ghp_", "glpat-", "gho_"]
  }
}
```

---

## CLI Commands for Phase 5.1

```bash
# Setup GitHub credentials
npm run credential:add -- --platform github

# Setup GitLab credentials
npm run credential:add -- --platform gitlab --url https://gitlab.internal.com

# List stored credentials
npm run credential:list

# Validate credential
npm run credential:validate -- --platform github

# Update credential
npm run credential:update -- --platform github

# Remove credential
npm run credential:remove -- --platform github

# Add repository
npm run repo:add -- --platform github --owner acme-corp --repo api-service

# List repositories
npm run repo:list

# Validate repository access
npm run repo:validate -- --repo-id github-acme-api

# Remove repository
npm run repo:remove -- --repo-id github-acme-api
```

---

## Testing Strategy for Phase 5.1

### Unit Tests (12-15 tests)

**Credential Manager (8 tests):**
- ✓ Store credential securely
- ✓ Retrieve credential from vault
- ✓ Check credential exists
- ✓ Delete credential
- ✓ Update credential
- ✓ Handle missing credential
- ✓ Handle platform-specific errors
- ✓ Encrypt/decrypt credentials

**Repository Config (5 tests):**
- ✓ Add repository config
- ✓ Retrieve repository config
- ✓ List repositories by platform
- ✓ Remove repository
- ✓ Validate repository access

**Token Validator (2-3 tests):**
- ✓ Validate valid token
- ✓ Reject expired token
- ✓ Sanitize logs of tokens

### Integration Tests (Not in Phase 5.1)
- Will be tested in Phase 5 when adapters use credentials

---

## Security Considerations

### ✅ What We Do

1. **Encrypt at Rest**
   - OS Credential Manager handles encryption
   - No plaintext tokens stored anywhere

2. **Secure Transport**
   - Token only in memory
   - Never written to disk except via OS vault

3. **Access Control**
   - Only authenticated user can retrieve
   - OS credentials tied to user session

4. **Sanitization**
   - All logs filtered for tokens
   - Error messages cleaned
   - Commits never contain tokens

5. **Audit Trail**
   - Log when credentials accessed (without token)
   - Log when credentials changed
   - Log when re-authentication attempted

### ❌ What We Don't Do

- Store tokens in plain config files
- Log tokens (ever)
- Transmit tokens over unencrypted channels
- Store tokens in Git history
- Display tokens in UI/console

---

## Error Handling

### Credential Not Found
```
Error: Credential not found for platform 'github'
Action: Prompt user to authenticate
Command: npm run credential:add -- --platform github
```

### Credential Expired
```
Error: GitHub token expired on 2024-11-15
Action: Prompt user to update credential
Command: npm run credential:update -- --platform github
```

### Insufficient Permissions
```
Error: GitHub token missing required 'workflow' scope
Action: Prompt user to regenerate token with correct permissions
```

### API Rate Limited
```
Error: GitHub API rate limit exceeded
Action: Wait before retrying (exponential backoff)
Credential still valid, retry later
```

---

## Success Criteria for Phase 5.1

### Security
- ✅ No tokens in logs/commits/config files
- ✅ OS Credential Manager used on all platforms
- ✅ Automatic credential retrieval works
- ✅ Token validation before every API call

### Usability
- ✅ One-time setup per platform
- ✅ Multi-repository support (same account)
- ✅ Transparent credential retrieval
- ✅ Clear error messages for re-auth

### Reliability
- ✅ 12-15 unit tests passing (100%)
- ✅ Fallback for missing credentials
- ✅ Automatic retry with exponential backoff
- ✅ Audit logging (without tokens)

---

## Timeline for Phase 5.1

| Day | Task | LOC | Tests | Output |
|-----|------|-----|-------|--------|
| -4 to -3 | Credential Manager | 150-200 | 8 | credential-manager.cjs |
| -3 to -2 | Repository Config | 100-150 | 5 | repository-config.cjs |
| -2 to -1 | Token Validator | 50-100 | 2-3 | token-validator.cjs |
| -1 | Integration & Testing | - | 12-15 | phase-5-1.test.cjs |

**Timeline:** 3-4 days before Phase 5 modules begin

---

## Integration with Phase 5 Modules

Once Phase 5.1 is complete, all Phase 5 modules use credentials automatically:

```cjs
// In GitHub Adapter (Phase 5, Module 2)
async createPullRequest(options) {
  // Get credential automatically
  const token = await credentialManager.getCredential('github');
  
  // Validate before use
  await tokenValidator.validateToken('github', token);
  
  // Use token (no logging of token)
  const octokit = new Octokit({ auth: token });
  return octokit.rest.pulls.create({...});
}
```

---

## Phase 5 Module Updates

When Phase 5 modules are implemented, they will:

1. **Always use credentialManager.getCredential()**
   - Never accept tokens as parameters
   - Never store tokens in memory beyond API call

2. **Validate credentials before operations**
   - Check token validity
   - Check permissions
   - Check rate limits

3. **Handle re-authentication automatically**
   - Catch 401/403 errors
   - Prompt user via CLI
   - Retry operation

4. **Sanitize all output**
   - Filter logs
   - Filter error messages
   - Filter reports

---

## Summary

**Phase 5.1: Credential Management** provides the secure foundation for Phase 5 by:

✅ Storing credentials in OS Credential Manager (never in files/logs/commits)  
✅ Supporting multi-repository configuration without exposing tokens  
✅ Automatically retrieving and validating credentials  
✅ Handling credential expiration and re-authentication  
✅ Sanitizing all output to prevent token leaks  

**Timeline:** 3-4 days (Days -4 to -1)  
**LOC:** 300-400  
**Tests:** 12-15  
**Next:** Phase 5 modules (Days 1-16)  

---

**Phase 5.1 Credential Management & Multi-Repository Support - READY FOR IMPLEMENTATION**
