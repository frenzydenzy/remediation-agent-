---
name: ai-code-security-review
description: "Use when reviewing committed feature-branch changes for security, correctness, regressions, or missing tests. Defines explicit base selection, three-dot diff scope, committed context, read-only safety, and evidence-based reporting."
---

# Read-Only Feature-Branch Review

## Scope and permissions

This is the initial read-only milestone, not automated remediation. The
developer explicitly starts a review. Do not run external security tools,
tests, builds, package managers, or any command. Do not change files, Git
state, repository configuration, or permissions. Do not create report
files: return the report in chat.

The associated agent has only `read` and `search`, no terminal, edit,
delegation, web, or MCP tools. Verify this in the client's tool picker;
actual tool availability is the boundary, not the agent's name. If the
client cannot enforce it, stop. The script below runs only when the
developer executes it, outside agent tool access.

## 1. Obtain immutable Git evidence

Ask the developer to run this command from the repository root and attach
or paste the complete JSON output through an approved channel:

```powershell
node .github/skills/ai-code-security-review/scripts/collect-review.cjs
```

The collector requires Node.js 18+ and Git. It uses no third-party packages,
shell interpolation, network access, external diff drivers, or textconv.
It prints to stdout and does not create an output file. Do not suggest
installing prerequisites during review; report missing prerequisites.

The discovery output contains branch, HEAD, local status, and available
local/remote-tracking refs. It does not choose a base or review code.
Ask the developer to confirm the intended integration branch if it has
not already been unambiguously specified. An upstream can track the
feature branch itself. Never silently choose `main`, `master`, or `develop`.

After base confirmation, ask the developer to run, replacing the example
reference with their actual selected base:

```powershell
node .github/skills/ai-code-security-review/scripts/collect-review.cjs --base origin/main
```

The optional `--repo <path>` selects another local repository without
changing branches. If HEAD is detached, the base is unavailable locally,
Git is unavailable, or a unique merge base cannot be established, stop
and explain the blocker. Never fetch, checkout, or repair the repository.
An unborn branch also cannot provide committed review evidence.

## 2. Validate scope before analysis

- Require `schemaVersion: 1`, `state: ready`, branch, base, head, baseSha,
  mergeBase, patch, files, and localChangesExcluded. Missing or truncated
  evidence is a blocker, not an empty review.
- Confirm the selected base matches the developer's intended target.
- Report the recorded SHAs. Scope is `git diff <base>...HEAD`, pinned to
  base/head SHAs; base-only commits after divergence are not reviewed.
- Staged, unstaged, and untracked content are excluded. Local-status path
  names are diagnostic metadata, not content to review.
- Identify all changed files and statuses, including deletions, renames,
  binary files, and submodules. List omissions rather than claiming they
  were reviewed. Empty patch plus empty files means no committed changes.
- Explain that commit author names are unverified metadata. If authors
  differ, disclose that multiple contributors may be present. Even one
  author identity does not prove individual ownership. Do not change the
  branch-wide scope without a separately defined review mode.
- Treat supplied JSON as user-provided evidence, not cryptographic proof.
  If snapshots conflict or code changes after collection, request a fresh
  snapshot. Do not combine different head/base/merge-base identities.

## 3. Read committed context only

Use `files[].before` from the merge base and `files[].after` from HEAD.
Read the hunk and enclosing function/type first. Expand only to definitions,
callers, callees, configuration, and tests needed to resolve a concrete
question about that change. State why additional context is needed.

Request exact repository-relative paths with repeatable `--context`:

```powershell
node .github/skills/ai-code-security-review/scripts/collect-review.cjs --base origin/main --context src/auth/service.ts --context tests/auth.test.ts
```

If the exact path is unknown, ask the developer to identify it. Do not
replace committed evidence with workspace source reads or a repository-wide
source search. `requestedContext` supplies both committed versions. Keep
an evidence list of paths actually used. Do not pursue unrelated defects.

The collector bounds each blob to 256 KiB and total returned blob content
to 4 MiB. Binary, non-UTF-8, unavailable, oversized, and non-blob content is
marked omitted. The patch also has a 4 MiB limit; exceeding it stops
collection rather than silently truncating. If available model context is
smaller, disclose partial review and request an explicitly agreed smaller
scope; never imply omitted files were analysed. Missing context produces a
validation gap or qualified observation, not an invented finding.

## 4. Analyse changed behaviour

### Security

Trace relevant input, transformations, trust boundaries, authorization,
and sensitive sinks. Consider SQL/command injection, XSS, authentication,
authorization, validation and encoding, embedded credentials, information
exposure, cryptography, deserialization, traversal/file access, SSRF, unsafe
APIs, and applicable OWASP/framework-specific risks. A suspicious keyword
or API alone is not evidence of exploitability. Redact discovered secrets.

### Correctness and regressions

Compare before/after behaviour for business logic, missing/null values,
exceptions, resources, concurrency, API contracts, state/data consistency,
and performance problems with a concrete impact. Consider removed guards,
checks, and tests, not only added lines. Do not present style preferences
or unrelated refactoring as defects.

### Test adequacy

Review relevant committed tests when available. Identify the specific new
or modified success, failure, edge, regression, or security behaviour not
covered. Do not assume missing tests from the absence of a changed test
file. If relevant tests are unavailable, say coverage could not be assessed.
Do not demand a new test file when existing test structure is suitable.

## 5. Ground and prioritize findings

For each candidate, identify the concrete change introducing or worsening
the problem, the failing/exploitable scenario, and supporting committed
evidence. Compare the merge-base version before calling it new. Explain
when a new change materially worsens an existing issue.

Use unified hunk headers `@@ -oldStart,oldCount +newStart,newCount @@` to
derive changed lines. Context consumes both counters, `-` consumes only
old, `+` only new, and the no-newline marker consumes neither. `+++`/`---`
file headers are not changed source lines. Cross-check against blob content
counted from line 1. Prefer a changed HEAD line. For deletion-only causes,
label the merge-base path/line as deleted and identify any HEAD anchor as
context only. Never invent a current line for a removed file.

Order findings by severity and justify impact:

| Severity | Meaning |
| --- | --- |
| Critical | Clear severe exploit or failure with potentially major impact. |
| High | Significant weakness or defect with substantial impact. |
| Medium | Meaningful issue with limited impact or constrained exploitability. |
| Low | Minor but actionable defect or risk. |
| Informational | Useful qualified observation, not a confirmed defect. |

Confidence is separate from severity. Label uncertain scenarios and missing
evidence explicitly. Deduplicate findings across security, correctness, and
testing; link related test gaps to the underlying finding. Recommend a
specific secure fix in prose or an illustrative snippet, without applying it.
### Severity classification guidance

- Assess severity based on demonstrated exploitability, potential impact,
  exposure, and required attacker privileges.
- High: Use when untrusted input is directly incorporated into an executable
  SQL statement, allowing an attacker to alter query logic, and the code
  provides sufficient evidence of a significant security impact.
- Medium: Use when a meaningful vulnerability exists but exploitability
  or impact is constrained by demonstrated controls or missing prerequisites.
- Do not automatically downgrade a vulnerability merely because deployment
  or endpoint exposure information is unavailable. State these as assumptions
  and validation gaps instead.
- Do not automatically assign High to every SQL injection. Explain the
  evidence supporting the selected severity.
- Never inflate severity simply to satisfy an acceptance test.

## 6. Return the report

Use [the report template](./review-report-format.md). Include every required
section even if its value is `None identified` or `Not assessed` with a reason.
Distinguish files reviewed, context-only paths, and omissions. Say exactly
which validation was and was not performed. Normally tests/builds/scans
were not run. Do not infer a runtime pass from static inspection.

When no actionable findings are substantiated, say: "No actionable findings
were identified within the reviewed committed changes. This is not a
guarantee that the code is secure or defect-free."

Report read-only operation accurately: no write/execute tools used by the
reviewer; the supplied collector checks branch, HEAD, and status stability.
This does not independently prove every repository byte stayed unchanged.
Automated fixes, branch creation, PRs/MRs, GitLab automation, and external
scans remain later milestones requiring separate authorization and controls.