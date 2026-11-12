# Phase 5: Multi-Platform Git API Integration (GitHub + GitLab)

**Status:** PLANNING - UPDATED FOR MULTI-PLATFORM  
**Estimated Duration:** 14-16 days  
**Estimated LOC:** 800-1,000  
**Estimated Tests:** 35-45  
**Date Updated:** November 12, 2024

---

## Executive Summary

Phase 5 now delivers a **multi-platform Git integration layer** supporting both **GitHub** and **GitLab**. This phase automates PR/MR creation and merge workflows across both platforms with a unified, platform-agnostic architecture.

**Key Change:** Instead of GitHub-only implementation, the system now supports:
- ✅ GitHub (REST API v3)
- ✅ GitLab (REST API v4)
- ✅ Extensible for future platforms (Gitea, Forgejo, etc.)

---

## Architecture Overview: Multi-Platform Design

### Platform Abstraction Layer

```
Remediation Module
       ↓
[Platform Abstraction Layer]
       ↓
   ┌───┴───┐
   ↓       ↓
GitHub    GitLab
API       API
```

**Key Principle:** All operations use a common interface, with platform-specific adapters handling API differences.

---

## 9 Modules to Implement

### 1. Git Platform Abstraction (300-400 LOC) - NEW
**Purpose:** Define common interface for all Git platforms

**Functions:**
- `getPlatformAdapter(config)` - Get GitHub or GitLab adapter
- `detectPlatform(repoUrl)` - Auto-detect from URL
- `validateConfig(config)` - Validate platform config

**Key Design:**
```javascript
class GitPlatformAdapter {
  async createPullRequest(options) { }
  async getPullRequest(id) { }
  async mergePullRequest(id, options) { }
  async getBranchProtectionRules(branch) { }
  async getCheckRuns(sha) { }
}
```

**Testing:** 10 tests

---

### 2. GitHub API Adapter (500-600 LOC)
**Implements common interface for GitHub**

**Features:**
- Octokit API client
- GitHub Actions integration
- GitHub branch protection rules
- GitHub review requests
- GitHub CODEOWNERS support

**Testing:** 12 tests with mocked Octokit

---

### 3. GitLab API Adapter (500-600 LOC)
**Implements common interface for GitLab**

**Features:**
- GitLab REST API v4
- GitLab CI/CD pipelines
- GitLab branch protection rules
- GitLab approvers & code owners
- Support for self-hosted instances

**Testing:** 12 tests with mocked GitLab API

---

### 4. Branch Protection Validator (Multi-Platform) (300-400 LOC)
**Platform-agnostic validation using adapters**

**Functions:**
- `validateBranchProtection(adapter, branch)` - Check rules
- `checkRequiredStatusChecks(adapter, branch)` - Validate CI/CD
- `checkRequiredReviews(adapter, mrId)` - Check approvals
- `checkCodeOwners(adapter, files)` - Validate code owners

**Key Feature:** Works identically for both platforms via adapter

**Testing:** 8-10 tests (GitHub + GitLab scenarios)

---

### 5. PR/MR Manager (Multi-Platform) (400-500 LOC)
**Unified PR/MR lifecycle management**

**Functions:**
- `createRemediationPR(adapter, remediation)` - Create PR/MR
- `updatePRDescription(adapter, id, description)` - Update
- `checkMergeReadiness(adapter, id)` - Check if ready
- `mergePRIfReady(adapter, id, options)` - Conditional merge

**Key Feature:** Uses unified terminology internally (PR), translates to MR for GitLab

**Testing:** 12 tests (GitHub PRs + GitLab MRs)

---

### 6. CI/CD Integration (Multi-Platform) (300-400 LOC)
**Unified CI/CD status checking**

**Features:**
- GitHub: GitHub Actions, status checks
- GitLab: GitLab CI/CD pipelines
- Unified status mapping (pending → success → failure)
- Timeout and polling logic

**Testing:** 10 tests (GitHub Actions + GitLab pipelines)

---

### 7. Notification Service (Multi-Platform) (400-500 LOC)
**Platform-aware notifications**

**Features:**
- Slack notifications (GitHub + GitLab)
- Email notifications (GitHub + GitLab)
- Platform name in messages
- Platform-specific links and terminology
- Different icons/emojis per platform

**Example:**
```
🔗 GitHub PR Created #42
   vs
🔗 GitLab MR Created !42
```

**Testing:** 12 tests (Slack + Email for both platforms)

---

### 8. Analytics & Metrics Tracker (400-500 LOC)
**Multi-platform metrics**

**Features:**
- Track by platform (GitHub vs GitLab)
- Cross-platform summary metrics
- Per-platform performance comparison
- Unified metrics schema

**Example Metrics:**
```javascript
{
  platform: "github|gitlab",
  totalCreated: 42,
  totalMerged: 40,
  avgTimeToMerge: 245 // seconds
}
```

**Testing:** 12 tests (GitHub metrics + GitLab metrics)

---

### 9. Error Handling & Retry Logic (250-350 LOC)
**Platform-aware error handling**

**Features:**
- GitHub error mapping (401, 403, 404, 409, 422, 429)
- GitLab error mapping (401, 403, 404, 400, 409, 429)
- Unified error schema
- Automatic retry logic with exponential backoff

**Example:**
```javascript
// Platform translates to unified error
{
  code: "MERGE_CONFLICT",
  platform: "github|gitlab",
  recoverable: false
}
```

**Testing:** 10 tests (GitHub errors + GitLab errors)

---

## Configuration Schema

### Multi-Platform Config Example

```javascript
{
  // Default platform
  platform: "github|gitlab",
  
  // GitHub credentials
  github: {
    token: "ghp_XXXXXXXXXXXX",
    owner: "your-org",
    repo: "your-repo"
  },
  
  // GitLab credentials
  gitlab: {
    token: "glpat-XXXXXXXXXXXX",
    baseUrl: "https://gitlab.com",
    projectId: 12345
  },
  
  // Notifications
  notifications: {
    slack: { webhook: "https://hooks.slack.com/..." },
    email: { enabled: true, recipients: ["team@company.com"] }
  },
  
  // Merge strategies
  mergeStrategies: {
    github: "merge|squash|rebase",
    gitlab: "merge_commit|squash|ff"
  }
}
```

---

## Implementation Timeline

| Step | Component | Days | Deliverable |
|------|-----------|------|-------------|
| 1 | Platform Abstraction | 2 | git-platform-abstraction.cjs |
| 2 | GitHub Adapter | 2 | github-api-adapter.cjs |
| 3 | GitLab Adapter | 2 | gitlab-api-adapter.cjs |
| 4 | Branch Protection | 1 | branch-protection-validator.cjs |
| 5 | PR/MR Manager | 1 | pr-mr-manager.cjs |
| 6 | CI/CD Integration | 1 | ci-cd-integration.cjs |
| 7 | Notifications | 1 | notification-service.cjs |
| 8 | Analytics | 1 | analytics-tracker.cjs |
| 9 | Error Handling | 1 | error-handler.cjs |
| 10 | Integration Tests | 2 | multi-platform-integration.test.cjs |
| 11 | Documentation | 1 | API guide + Config guide |
| 12 | QA & Polish | 1 | Final validation |
| **TOTAL** | **9 Modules** | **14-16** | **Ready for Production** |

---

## Testing Strategy

### Unit Tests (30-35 tests)
- Platform Abstraction: 10 tests
- GitHub Adapter: 12 tests
- GitLab Adapter: 12 tests
- Branch Protection: 8-10 tests
- PR/MR Manager: 12 tests
- CI/CD Integration: 10 tests
- Notification Service: 12 tests
- Analytics: 12 tests
- Error Handling: 10 tests

### Integration Tests (15-20 tests)
- Full GitHub workflow (PR creation to merge)
- Full GitLab workflow (MR creation to merge)
- Mixed GitHub + GitLab scenarios
- Error scenarios for both platforms
- Notification delivery (both platforms)
- Metrics tracking (both platforms)
- Platform switching scenarios

### Coverage Target
- 35-45 total tests
- 100% pass rate required
- All error scenarios tested
- Both platforms validated independently

---

## Migration Path

### For GitHub-Only Users
✅ No changes needed  
✅ System works transparently  
✅ Can add GitLab repos anytime  

### For GitLab-Only Users
✅ Can use system immediately  
✅ Same features as GitHub users  
✅ Can add GitHub repos anytime  

### For Multi-Platform Organizations
✅ Configure both adapters  
✅ Support multiple repositories  
✅ Unified metrics dashboard  
✅ Cross-platform notifications  

---

## Success Metrics

### Code Quality
- ✅ 35-45 tests passing (100%)
- ✅ Both platforms tested independently
- ✅ Zero unhandled exceptions
- ✅ Comprehensive error handling

### Performance
- ✅ PR/MR creation < 30 seconds
- ✅ Merge approval < 5 minutes
- ✅ 99%+ uptime (both platforms)
- ✅ Metrics calculation < 100ms

### Business
- ✅ 100% auto-merge success rate
- ✅ 95%+ manual effort reduction
- ✅ Complete audit trail
- ✅ Unified metrics dashboard

---

## Questions for Confirmation

### 1. GitLab Setup
- Do you have GitLab cloud or self-hosted?
- Which GitLab URLs/projects to test with?
- Personal access token ready?

### 2. Multi-Platform Strategy
- Load both adapters by default?
- Auto-detect or explicit configuration?
- Support multiple repos simultaneously?

### 3. Merge Strategies
- GitHub preference: merge/squash/rebase?
- GitLab preference: merge_commit/squash/ff?
- Same strategy for both platforms?

### 4. Notifications
- Show platform name in messages?
- Separate channels per platform?
- Unified reports or per-platform?

### 5. Timeline Priority
- Start both platforms simultaneously?
- GitHub first, then GitLab?
- Prototype first?

---

## Deliverables Summary

| Category | Quantity | Status |
|----------|----------|--------|
| Production Modules | 9 | 📋 Specified |
| Unit Tests | 30-35 | 📋 Specified |
| Integration Tests | 15-20 | 📋 Specified |
| API Documentation | 1 | 📋 Specified |
| Configuration Guide | 1 | 📋 Specified |
| Deployment Guide | 1 | 📋 Specified |
| Total LOC | 800-1,000 | 📋 Estimated |

---

## Project Impact

### Before Phase 5
- Manual PR creation and merge
- GitHub-only support
- Single platform dependency

### After Phase 5
- Automatic PR/MR creation
- GitHub + GitLab support
- Multi-platform flexibility
- Unified workflow
- Cross-platform metrics

---

## Next Steps

1. ✅ Confirm GitLab integration
2. ✅ Answer clarification questions
3. ✅ Prepare GitHub + GitLab tokens
4. ✅ Ready to begin Phase 5 Step 1

---

**Phase 5 Specification - Updated for Multi-Platform (GitHub + GitLab)**  
**Status:** ✅ READY FOR IMPLEMENTATION  
**Awaiting Your Confirmation**
