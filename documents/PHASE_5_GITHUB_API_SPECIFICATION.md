# Phase 5: GitHub API Integration - Specification

**Status:** PLANNING  
**Estimated Duration:** 2-3 weeks  
**Estimated LOC:** 600-800  
**Estimated Tests:** 25-35  
**Date Created:** November 2024

---

## Executive Summary

Phase 5 automates the PR creation and merge workflow that was handled manually in Phase 4. This phase integrates with GitHub API to:
- Automatically create pull requests from remediation branches
- Validate branch protection rules before merge
- Implement conditional auto-merge on CI/CD success
- Send notifications to team (Slack/Email)
- Track remediation metrics and analytics

---

## Objectives

### Primary Objectives
1. **Eliminate Manual PR Creation** - Auto-create PRs using GitHub API
2. **Automate Merge Process** - Merge when conditions are satisfied
3. **Team Awareness** - Notify team via Slack/Email
4. **Metrics Tracking** - Track success rates and time-to-merge
5. **Audit Trail** - Complete logging of all API operations

### Secondary Objectives
1. **Branch Protection Validation** - Check merge requirements before merge
2. **CI/CD Integration** - Wait for all checks to pass
3. **Approval Workflow** - Support required approvals
4. **Conflict Detection** - Detect and report merge conflicts
5. **Rollback Capability** - Revert merged PRs if needed

---

## Architecture Overview

### Components to Build

#### 1. GitHub API Client (600-700 LOC)
**Purpose:** Wrapper around GitHub API for operations

**Functions:**
- `createPullRequest(owner, repo, options)` - Create PR
- `getPullRequest(owner, repo, prNumber)` - Get PR details
- `mergePullRequest(owner, repo, prNumber, options)` - Merge PR
- `getPullRequestStatus(owner, repo, prNumber)` - Get merge status
- `getBranchProtectionRules(owner, repo, branch)` - Get protection rules
- `getWorkflowRuns(owner, repo, prNumber)` - Get CI/CD runs
- `addPullRequestComment(owner, repo, prNumber, body)` - Add comment
- `getRepositorySettings(owner, repo)` - Get repo config
- `validateMergeability(owner, repo, prNumber)` - Check if mergeable
- `postStatusCheck(owner, repo, sha, status)` - Post status

**Dependencies:**
- `@octokit/rest` (or octokit.js)
- GitHub Personal Access Token or App Token
- Error handling for API rate limits

**Testing:**
- Mock GitHub API responses
- Test authentication failures
- Test rate limiting
- Test error scenarios
- Test permission denied cases

---

#### 2. PR Manager (400-500 LOC)
**Purpose:** High-level PR lifecycle management

**Functions:**
- `createRemediationPR(remediation, config)` - Create PR from remediation
- `updatePRDescription(owner, repo, prNumber, description)` - Update PR
- `addFindingsComment(owner, repo, prNumber, findings)` - Add findings comment
- `checkMergeReadiness(owner, repo, prNumber)` - Check if ready to merge
- `mergePRIfReady(owner, repo, prNumber, options)` - Conditional merge
- `closeStaleRemediationPRs(owner, repo, maxAge)` - Clean up old PRs
- `trackPRMetrics(owner, repo, prNumber)` - Collect metrics
- `retryFailedMerges(owner, repo, status)` - Retry failed merges

**Data Structures:**
```javascript
{
  owner: "org",
  repo: "repo-name",
  prNumber: 42,
  status: "ready|waiting|merged|failed",
  findings: [{ id, severity, file, line }],
  testResults: { passed, failed, rate },
  branchName: "remediation/...",
  mergeStrategy: "merge|squash|rebase",
  autoMerge: true|false,
  createdAt: "2024-01-15T14:30:45Z",
  mergedAt: "2024-01-15T15:30:45Z"
}
```

**Testing:**
- Mock PR lifecycle scenarios
- Test merge ready conditions
- Test conflict detection
- Test stale PR cleanup
- Test retry logic

---

#### 3. Branch Protection Validator (300-400 LOC)
**Purpose:** Validate branch protection rules before merge

**Functions:**
- `validateBranchProtection(owner, repo, branch)` - Check all rules
- `checkRequiredStatusChecks(owner, repo, branch)` - Validate CI/CD
- `checkRequiredReviews(owner, repo, prNumber)` - Check approvals
- `checkCodeOwners(owner, repo, files)` - Validate code owners
- `checkBranchStatus(owner, repo, branch)` - Check branch health
- `reportBlockingIssues(owner, repo, prNumber)` - List blockers

**Validation Checks:**
- Required status checks passing
- Required number of approvals
- Dismiss stale reviews (if enabled)
- Code owners approval
- Branch up-to-date with base
- No conflicts
- No blocked by admin

**Testing:**
- Mock various protection configurations
- Test passing/failing checks
- Test approval scenarios
- Test conflict detection
- Test dismissal logic

---

#### 4. Notification Service (300-400 LOC)
**Purpose:** Send notifications via Slack/Email

**Functions:**
- `sendSlackMessage(webhook, message)` - Send to Slack
- `sendEmailNotification(config, recipients, message)` - Send email
- `notifyPRCreated(prDetails)` - Notify PR created
- `notifyMergeComplete(prDetails)` - Notify successful merge
- `notifyMergeFailed(prDetails, error)` - Notify failure
- `notifyTeamDaily(metrics)` - Send daily summary
- `formatNotificationMessage(type, data)` - Format message

**Notification Types:**
- PR Created (with findings summary)
- PR Ready to Merge
- PR Merged (with metrics)
- Merge Failed (with error details)
- Daily Summary (stats)
- Manual Action Required
- Approval Requested

**Testing:**
- Mock Slack/Email services
- Test message formatting
- Test delivery failures
- Test retry logic
- Test rate limiting

---

#### 5. Analytics & Metrics Tracker (300-400 LOC)
**Purpose:** Track remediation metrics and insights

**Functions:**
- `trackPRCreated(prDetails)` - Record PR creation
- `trackPRMerged(prDetails)` - Record merge
- `trackMergeFailed(prDetails, reason)` - Record failure
- `calculateMetrics(timeRange)` - Calculate stats
- `generateReport(timeRange)` - Generate summary report
- `getSuccessRate(timeRange)` - Calculate success %
- `getAverageTimeToMerge()` - Calculate avg time
- `getSeverityBreakdown()` - Breakdown by severity
- `getTopIssueTypes()` - Most common issues
- `getTeamPerformance()` - Per-team metrics

**Metrics to Track:**
- Total PRs created
- Total PRs merged
- Total merge failures
- Success rate %
- Average time-to-merge
- Average findings per PR
- Findings by severity
- Issues by type
- Team performance
- Repository statistics

**Data Storage:**
- Store in file (JSON) for MVP
- Consider database for scale
- Implement retention policy

**Testing:**
- Mock PR events
- Test metric calculations
- Test report generation
- Test time-based aggregations
- Test edge cases

---

#### 6. CI/CD Integration Module (200-300 LOC)
**Purpose:** Integrate with CI/CD systems

**Functions:**
- `waitForChecks(owner, repo, sha, timeout)` - Wait for CI/CD
- `getCheckRunStatus(owner, repo, sha)` - Get check status
- `pollCheckCompletion(owner, repo, sha)` - Poll until complete
- `validateAllChecksPassed(owner, repo, sha)` - Validate all pass
- `getCheckDetails(owner, repo, checkId)` - Get details
- `postCheckComment(owner, repo, prNumber, status)` - Post status

**Check Status Mapping:**
- `pending` → Still running
- `in_progress` → Running
- `completed` → Done (check status)
- `success` → All passed
- `failure` → Some failed
- `neutral` → Skipped/Optional

**Testing:**
- Mock check runs
- Test timeout scenarios
- Test partial failure
- Test polling logic
- Test status parsing

---

#### 7. Error Handling & Retry Logic (200-300 LOC)
**Purpose:** Robust error handling and retries

**Functions:**
- `retryOperation(fn, options)` - Generic retry
- `handleAPIError(error)` - Handle GitHub API errors
- `handleNetworkError(error)` - Handle network failures
- `handleAuthError(error)` - Handle auth failures
- `logError(error, context)` - Error logging
- `reportCriticalError(error)` - Alert on critical errors

**Retry Strategies:**
- Exponential backoff
- Jitter to prevent thundering herd
- Max retries (default 3)
- Specific error handling (404 vs 429 vs 500)
- Circuit breaker for repeated failures

**Testing:**
- Mock various error scenarios
- Test retry logic
- Test circuit breaker
- Test backoff calculation
- Test logging

---

### Data Flow Diagram

```
Remediation Branch Created
         ↓
[Phase 4: Git Operations]
  - Files fixed
  - Comments added
  - Tests passing
         ↓
    Branch: remediation/YYYY-MM-DD_HH-MM-SS_*
         ↓
[Phase 5: GitHub API Integration]
         ↓
    [PR Manager]
         ↓
[GitHub API Client] → Create PR
         ↓
    PR Created: #123
         ↓
[Branch Protection Validator]
         ↓
Check branch protection rules
    - Required checks
    - Required approvals
    - Code owners
         ↓
[CI/CD Integration]
         ↓
Wait for check runs to complete
    - GitHub Actions
    - Other CI systems
         ↓
[Check Results]
    ✓ All passed → Ready to merge
    ✗ Some failed → Failed notification
         ↓
[Notification Service]
         ↓
Send Slack/Email:
  - Findings summary
  - Test results
  - Ready to merge status
         ↓
[PR Manager: Merge]
         ↓
[GitHub API Client] → Merge PR
         ↓
PR Merged to main
         ↓
[Analytics Tracker]
         ↓
Record metrics:
  - Time-to-merge
  - Success rate
  - Findings fixed
         ↓
[Notification Service]
         ↓
Send summary: PR merged & metrics
```

---

## Implementation Plan

### Step 1: GitHub API Client (Days 1-2)
- Set up Octokit client
- Implement core API functions
- Add error handling
- Write 10+ tests
- Deliverable: `github-api-client.cjs`

### Step 2: Branch Protection Validator (Day 2-3)
- Implement validation logic
- Check all protection rules
- Write 8-10 tests
- Deliverable: `branch-protection-validator.cjs`

### Step 3: PR Manager (Days 3-4)
- Implement PR lifecycle
- Add merge logic
- Write 10+ tests
- Deliverable: `pr-manager.cjs`

### Step 4: CI/CD Integration (Day 4)
- Implement check polling
- Add timeout handling
- Write 5-8 tests
- Deliverable: `ci-cd-integration.cjs`

### Step 5: Notification Service (Day 5)
- Implement Slack/Email
- Format messages
- Write 8-10 tests
- Deliverable: `notification-service.cjs`

### Step 6: Analytics & Metrics (Day 5-6)
- Implement tracking
- Calculate metrics
- Write 10+ tests
- Deliverable: `analytics-tracker.cjs`

### Step 7: Integration Tests (Day 6-7)
- Write end-to-end tests
- Test full workflow
- Test error scenarios
- Deliverable: `github-api-integration.test.cjs`

### Step 8: Documentation (Day 7)
- API reference
- Configuration guide
- Deployment guide
- Troubleshooting

---

## Configuration Requirements

### GitHub API Token
```javascript
{
  token: "ghp_XXXXXXXXXXXX",  // Personal Access Token or App Token
  type: "pat|app",            // Token type
  owner: "your-org",          // GitHub org/user
  repo: "your-repo"           // Repository name
}
```

**Required Permissions:**
- `repo` - Full control of repositories
- `workflow` - Manage GitHub Actions
- `write:checks` - Write check runs
- `read:pull-requests` - Read PRs
- `write:pull-requests` - Write PRs

### Slack Webhook (Optional)
```javascript
{
  webhook: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  channel: "#security-remediation",
  username: "Remediation Bot"
}
```

### Email Config (Optional)
```javascript
{
  smtp: {
    host: "smtp.gmail.com",
    port: 587,
    auth: { user, pass }
  },
  from: "remediation@company.com",
  to: ["security-team@company.com"]
}
```

### Branch Protection Rules
```javascript
{
  requiredStatusChecks: true,
  requiredCheckNames: ["build", "test", "security-scan"],
  requiredApprovals: 1,
  dismissStaleReviews: true,
  requireCodeOwners: true,
  allowForcePush: false,
  allowDeletion: false
}
```

---

## Testing Strategy

### Unit Tests (20-25)
- GitHub API Client: 10 tests (mock API)
- PR Manager: 8 tests (mock lifecycle)
- Branch Protection: 5 tests (mock rules)
- CI/CD Integration: 5 tests (mock checks)
- Notification Service: 5 tests (mock delivery)
- Analytics: 5 tests (mock data)

### Integration Tests (8-10)
- Full PR creation workflow
- Full merge workflow
- Error scenarios
- Retry scenarios
- Notification delivery
- Metrics tracking

### Performance Tests
- API response times
- Webhook delivery time
- Metrics calculation time
- Memory usage under load

### Security Tests
- Token handling
- Error message sanitization
- Sensitive data in logs
- API rate limiting

---

## Error Handling Strategy

### GitHub API Errors
- `401 Unauthorized` → Invalid token
- `403 Forbidden` → Insufficient permissions
- `404 Not Found` → PR/Branch doesn't exist
- `409 Conflict` → Merge conflict
- `422 Unprocessable` → Merge blocked
- `429 Too Many Requests` → Rate limited
- `500+ Server Error` → GitHub issue

### Network Errors
- Timeout → Retry with backoff
- Connection refused → Retry later
- DNS failure → Retry later

### Application Errors
- Invalid configuration → Fail fast
- Missing token → Fail fast
- Invalid PR data → Log and skip
- Notification failure → Log and continue

---

## Deployment Checklist

### Prerequisites
- [ ] GitHub Personal Access Token or App
- [ ] GitHub repository configured
- [ ] Branch protection rules set up
- [ ] CI/CD pipeline configured (GitHub Actions/Jenkins/etc)
- [ ] Slack workspace (optional)
- [ ] Email server configured (optional)

### Deployment Steps
- [ ] Copy modules to `.github/skills/remediation/github-api/`
- [ ] Copy tests to `tests/`
- [ ] Create configuration file
- [ ] Set environment variables
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Test with real repository (dev branch)
- [ ] Test error scenarios
- [ ] Enable in production

### Post-Deployment
- [ ] Monitor for errors
- [ ] Check notification delivery
- [ ] Verify metrics collection
- [ ] Review PR creation time
- [ ] Check merge success rate

---

## Success Metrics

### Implementation
- [ ] All 25-35 tests passing (100%)
- [ ] Full workflow end-to-end validated
- [ ] All error scenarios handled
- [ ] Documentation complete

### Operational
- [ ] PR creation time < 30 seconds
- [ ] Merge approval time < 5 minutes
- [ ] 99%+ uptime (API reliability)
- [ ] Zero unhandled errors
- [ ] Team notified on all events

### Business
- [ ] 100% auto-merge success rate on passing tests
- [ ] Reduce manual effort by 95%+
- [ ] Complete audit trail maintained
- [ ] Metrics dashboard available

---

## Known Considerations

### Limitations
1. **GitHub API Rate Limits** - 5,000 requests/hour per token
   - Mitigation: Batch operations, cache results
2. **Merge Conflicts** - Cannot auto-resolve
   - Mitigation: Detect early, notify for manual resolution
3. **Required Approvals** - Cannot auto-approve
   - Mitigation: Support configured approval teams
4. **Stale Branches** - Base branch may advance
   - Mitigation: Auto-rebase before merge
5. **CI/CD Delays** - Checks may take time
   - Mitigation: Configurable timeout, polling

### Future Enhancements
1. **Database Integration** - Replace file-based metrics
2. **Web Dashboard** - Visual metrics/analytics
3. **Auto-Approve** - Trusted team/CODEOWNERS bypass
4. **Advanced Routing** - Route to different teams
5. **Multiple Repos** - Handle org-wide PRs
6. **Custom Rules** - User-defined merge conditions
7. **JIRA Integration** - Link to ticket tracking
8. **Slack Threads** - Better notifications

---

## Risk Assessment

### High Risk
- **API Token Exposure** → Mitigation: Use environment variables, rotate regularly
- **Mass PR Creation** → Mitigation: Rate limiting, operator approval
- **Unintended Merges** → Mitigation: Comprehensive validation, test thoroughly

### Medium Risk
- **CI/CD Failures** → Mitigation: Manual override capability
- **Notification Failures** → Mitigation: Fallback to logs
- **Database Failures** → Mitigation: File-based fallback

### Low Risk
- **Performance Issues** → Mitigation: Async operations, caching
- **API Changes** → Mitigation: Version pinning, deprecation monitoring
- **Team Communication** → Mitigation: Clear documentation

---

## Timeline & Milestones

| Milestone | Days | Status |
|-----------|------|--------|
| Phase 5 Planning | 1 | ✅ Complete |
| API Client Implementation | 2 | ⏳ Pending |
| Protection Validator | 1 | ⏳ Pending |
| PR Manager | 2 | ⏳ Pending |
| CI/CD Integration | 1 | ⏳ Pending |
| Notifications | 1 | ⏳ Pending |
| Analytics | 1 | ⏳ Pending |
| Integration Tests | 1 | ⏳ Pending |
| Documentation | 1 | ⏳ Pending |
| QA & Polish | 1 | ⏳ Pending |
| **TOTAL** | **12-14 days** | ⏳ Pending |

---

## Next Actions

1. **Confirm Requirements**
   - [ ] Review this specification
   - [ ] Confirm GitHub token availability
   - [ ] Confirm Slack/Email preferences
   - [ ] Set branch protection rules

2. **Prepare Environment**
   - [ ] Create `.github/skills/remediation/github-api/` directory
   - [ ] Set up test repository (if needed)
   - [ ] Configure GitHub token as environment variable
   - [ ] Test API token with sample call

3. **Begin Implementation**
   - [ ] Start Phase 5 Step 1: GitHub API Client
   - [ ] Write first 10 unit tests
   - [ ] Implement core API functions
   - [ ] Test with real GitHub API

---

## Questions for User

Before starting implementation, please clarify:

1. **GitHub Token Setup**
   - Do you have a Personal Access Token or GitHub App?
   - Which GitHub org/repo should be used for testing?

2. **Notifications**
   - Do you want Slack notifications? If yes, which channel?
   - Do you want Email notifications? If yes, which addresses?

3. **Auto-Merge Strategy**
   - Merge vs Squash vs Rebase?
   - Should remediations always auto-merge when tests pass?
   - Any required approvals before merge?

4. **Metrics & Reporting**
   - Where should metrics be stored? (File, Database, Cloud?)
   - Who should receive daily summaries?
   - What metrics are most important to track?

5. **Error Handling**
   - Should failures block or log-and-continue?
   - Who should be notified on critical errors?
   - Should there be manual approval step?

---

## References

- [GitHub REST API Docs](https://docs.github.com/en/rest)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [Octokit.js Documentation](https://octokit.github.io/rest.js/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

---

**Phase 5 Specification Complete**  
**Ready for Implementation**  
**Status:** ✅ PLANNING COMPLETE
