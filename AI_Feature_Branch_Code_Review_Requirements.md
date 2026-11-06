# AI-Powered Feature-Branch Code Review Agent

## Requirements Specification

**Document status:** Initial requirements baseline\
**Purpose:** Define the functional, safety, and integration requirements
for a Git-aware AI agent that reviews only changes introduced by a
developer's feature branch.

------------------------------------------------------------------------

## 1. Project Overview

The project aims to build an AI-powered code review agent that analyses
developer changes early in the software development lifecycle, before
running external static-analysis or security-testing tools such as
SonarQube or Checkmarx.

The agent must identify the changes introduced by the current feature
branch, review those changes for security risks and software defects,
and produce a prioritized report. The initial implementation is strictly
read-only: it must not modify source code or the Git working tree.

The longer-term vision may include an optional remediation workflow that
applies approved fixes in a separate branch and creates a Pull Request
or Merge Request. That capability is outside the scope of the initial
read-only milestone.

## 2. Problem Statement

Developers can introduce security vulnerabilities, bugs, regressions,
and inadequate test coverage while implementing new features. Finding
these issues late in the development process can increase remediation
effort and delay delivery.

A proactive AI reviewer should inspect the developer's own
feature-branch changes as early as possible. It must avoid reporting
unrelated pre-existing issues or interfering with code changes made by
other developers.

## 3. Goals

1.  Identify the current feature branch and its correct base branch.
2.  Isolate committed changes introduced by the feature branch.
3.  Review only those changes and the surrounding context needed to
    understand them.
4.  Identify security risks, bugs, regressions, and missing or
    inadequate tests introduced by the changes.
5.  Produce actionable findings with severity and precise file and line
    references.
6.  Operate in read-only mode during the initial milestone.
7.  State assumptions, limitations, and validation gaps clearly.

## 4. Non-Goals for the Initial Milestone

The initial read-only reviewer will not:

-   Run SonarQube, Checkmarx, or other external testing products as a
    prerequisite for analysis.
-   Modify source files or apply fixes.
-   Create branches, commits, Pull Requests, or Merge Requests.
-   Install dependencies or change project configuration.
-   Review the entire repository as though all existing issues were
    introduced by the feature branch.
-   Claim that the application is completely secure based only on an AI
    review.

Integration with GitLab automation and automated remediation can be
considered in later milestones.

## 5. Users and Primary Use Case

**Primary user:** A developer working on an individual feature branch.

**Primary use case:**

1.  The developer checks out their feature branch.
2.  The developer explicitly asks the AI reviewer to review the current
    feature-branch changes.
3.  The agent identifies the current branch and its base branch.
4.  The agent calculates the committed feature-branch diff.
5.  The agent analyses the changed code and necessary surrounding
    context.
6.  The agent returns a prioritized review report without changing the
    working tree.

Example invocation:

> Review the committed changes introduced by my current feature branch
> relative to its base branch. Use the read-only feature-branch review
> requirements. Do not modify files or run commands that alter the
> working tree.

## 6. Functional Requirements

### FR-01: Identify the Current Branch

The agent must identify the current Git branch before starting a review.

-   It must report the branch name in the final report.
-   It must not assume that the branch is a feature branch solely from
    its name.
-   If the repository is in a detached-HEAD state or the branch cannot
    be identified, it must explain the issue and request guidance where
    necessary.

### FR-02: Identify the Base Branch

The agent must identify the appropriate base branch for comparison.

-   It may use repository tracking configuration, project conventions,
    or developer-provided context.
-   It must not silently guess when multiple plausible base branches
    exist.
-   If the base branch is ambiguous, it must ask the developer before
    proceeding.
-   It must verify that the selected base reference is available locally
    or explain what is missing.

### FR-03: Isolate Feature-Branch Changes

The agent must use a three-dot Git diff to identify changes introduced
by the feature branch from the merge base.

``` bash
git diff <base>...HEAD
```

The three-dot comparison is important because it compares the feature
branch with the merge base of the two references. It therefore excludes
changes made only on the base branch after the feature branch diverged.

The review scope must include committed changes introduced by the
feature branch, not unrelated changes on the base branch.

### FR-04: Exclude Uncommitted Changes

The initial review must exclude:

-   Unstaged working-tree changes.
-   Staged but uncommitted changes.
-   Untracked files.

The agent must not use a plain working-tree diff as a substitute for the
committed branch comparison.

If the developer asks to review uncommitted changes, that should be
treated as a separate review mode with separately defined scope and
authorization.

### FR-05: Inspect Relevant Context

The agent may read surrounding code, related definitions, callers,
configuration, or tests when needed to understand a changed line.

However:

-   Unchanged code is context, not automatically part of the review
    scope.
-   The agent must distinguish a newly introduced issue from a
    pre-existing issue.
-   It must not recommend unrelated refactoring as a finding.
-   It must not modify any contextual code.

### FR-06: Security Analysis

The agent must inspect changed code for relevant security weaknesses,
including but not limited to:

-   Injection vulnerabilities, including SQL and command injection.
-   Cross-site scripting (XSS).
-   Authentication and authorization weaknesses.
-   Improper input validation and output encoding.
-   Hardcoded secrets and credentials.
-   Sensitive information exposure.
-   Insecure cryptographic practices.
-   Insecure deserialization.
-   Path traversal and unsafe file handling.
-   Server-side request forgery (SSRF).
-   Insecure API usage and unsafe trust boundaries.
-   Other applicable OWASP and language-specific security risks.

The agent must consider the application's language, framework,
architecture, and data flow. It must not report a vulnerability solely
because a keyword or suspicious API appears in the diff.

### FR-07: Bug and Regression Analysis

The agent must inspect changed code for:

-   Incorrect or incomplete business logic.
-   Null or missing-value handling errors.
-   Incorrect exception handling.
-   Resource leaks.
-   Concurrency or race-condition risks.
-   Backward-compatibility and API contract regressions.
-   Incorrect state or data handling.
-   Potential performance problems with a clear impact.
-   Other defects reasonably attributable to the changes.

### FR-08: Test Coverage Analysis

The agent must identify when a change appears to lack tests for
important new or modified behaviour.

It should consider:

-   Whether relevant tests were added or updated.
-   Whether important success and failure paths are covered.
-   Whether security-sensitive behaviour has suitable tests.
-   Whether edge cases are missing.

A missing test should be reported only when the agent can explain the
behaviour or risk that is not adequately covered. It should not assume
that every code change requires a new test file.

### FR-09: Attribute Findings to the Diff

Every finding must be attributable to a changed line or a specific
change in the feature-branch diff.

-   Report the changed file and relevant line reference.
-   Prefer a line within the changed lines.
-   If the root cause spans multiple changed lines, explain that
    relationship.
-   Do not report pre-existing issues as newly introduced.
-   If a change makes an existing issue materially worse, explain how
    the new change increases the risk.
-   Do not invent line numbers or claim a finding is in the diff when it
    is not.

### FR-10: Prioritize Findings

Findings must be ordered by severity.

Use these severity levels:

  -----------------------------------------------------------------------
  Severity                            Meaning
  ----------------------------------- -----------------------------------
  Critical                            A severe, exploitable issue with
                                      potentially major impact, such as a
                                      clear path to compromise or highly
                                      sensitive data exposure.

  High                                A significant security weakness or
                                      defect with substantial potential
                                      impact.

  Medium                              A meaningful issue with a more
                                      limited impact, constraints on
                                      exploitability, or a narrower
                                      failure scenario.

  Low                                 A minor issue or lower-impact risk
                                      that is still actionable.

  Informational                       A useful observation that is not a
                                      confirmed defect or vulnerability.
  -----------------------------------------------------------------------

Severity must be justified by the likely impact and context. The agent
should distinguish confirmed findings from uncertain observations and
state confidence where useful.

### FR-11: Produce a Review Report

The final report must include:

1.  Review summary.
2.  Current branch.
3.  Selected base branch.
4.  Comparison method and review scope.
5.  Changed files reviewed.
6.  Findings ordered by severity.
7.  File and line references for each finding.
8.  Explanation and potential impact.
9.  Recommended remediation.
10. Missing or inadequate tests.
11. Assumptions.
12. Validation gaps and limitations.

If no actionable findings are identified, the agent must say so while
making clear that this is not a guarantee that the code is secure.

## 7. Read-Only and Safety Requirements

### NFR-01: No Source Modification

The agent must not edit, create, delete, rename, format, or otherwise
modify project files during the review.

### NFR-02: No Remediation During Review

The agent must not apply fixes, refactor code, or make changes on behalf
of the developer during the initial review.

### NFR-03: No Working-Tree-Altering Commands

The agent must not run commands that alter the working tree, index,
repository configuration, or Git history.

Examples of prohibited operations include:

-   `git checkout` or `git switch` when changing branches.
-   `git reset`.
-   `git clean`.
-   `git stash`.
-   `git add`.
-   `git commit`.
-   `git merge` or `git rebase`.
-   Package installation or dependency updates.
-   Formatters or code generators that write files.

Read-only Git inspection commands may be used when permitted by the
environment.

### NFR-04: Tool-Level Enforcement

Instructions alone are not a sufficient security boundary.

For the initial proof of concept:

-   Prefer GitHub Copilot Ask mode or an equivalent read-only
    interaction mode.
-   Enable only read-only tools needed for inspection.
-   Disable file-editing tools.
-   Disable terminal or command execution if it cannot be safely
    restricted.
-   If commands are required, allow only explicitly approved read-only
    commands.
-   Do not provide write-capable credentials or unnecessary repository
    permissions to the reviewer.

The exact controls depend on the Copilot product, IDE, organization
policy, and available tool configuration. The implementation must verify
the actual permissions rather than assume that a mode label guarantees
read-only behaviour.

### NFR-05: Protect Other Developers' Work

The agent must not interfere with other developers' changes.

-   Review only the selected feature branch's committed changes relative
    to its base.
-   Do not include changes made only on the base branch after
    divergence.
-   Do not include uncommitted local changes in this review mode.
-   Do not modify any developer's files.
-   If multiple developers contribute to the same feature branch,
    recognize that the branch diff may include all commits introduced on
    that branch. A branch-level diff cannot reliably attribute every
    change to one individual without additional author or commit-range
    rules.

### NFR-06: Honest and Evidence-Based Reporting

The agent must:

-   Explain assumptions and uncertainty.
-   Avoid speculative findings presented as confirmed defects.
-   Provide evidence from the reviewed code.
-   State when it could not validate a concern.
-   Never claim that tests, builds, or external scans passed unless they
    were actually run and their results were observed.

## 8. Recommended Technical Approach

### 8.1 Change Detection

Use Git as the source of truth for the review scope.

Typical inspection sequence:

``` bash
git status --short --branch
git branch --show-current
git branch --list
git diff --name-status <base>...HEAD
git diff --unified=5 <base>...HEAD
```

The agent should use the appropriate read-only commands available in its
environment. It should not change branches to perform the review.

The `git status` output can help identify local changes, but those
changes must be excluded from the committed feature-branch review.

### 8.2 Analysis Process

1.  Establish the repository and current branch.
2.  Establish and confirm the base branch.
3.  Calculate the merge base and inspect the three-dot diff.
4.  List changed files and changed lines.
5.  Read relevant surrounding code.
6.  Trace relevant data flow or call relationships where needed.
7.  Evaluate security, correctness, regression, and test risks.
8.  Attribute each finding to the feature-branch changes.
9.  Prioritize findings and prepare the report.

### 8.3 Copilot Customization

A possible repository structure is:

``` text
.github/
├── agents/
│   └── security-reviewer.agent.md
├── skills/
│   └── ai-code-security-review/
│       ├── SKILL.md
│       ├── change-detection.md
│       ├── security-guidelines.md
│       ├── code-quality-guidelines.md
│       └── review-report-format.md
└── copilot-instructions.md
```

The agent definition should establish the reviewer role and read-only
constraints. The skill should provide the detailed review procedure and
finding standards. Repository instructions may provide project-specific
conventions.

These files guide the agent but do not replace tool-level permission
enforcement.

## 9. Acceptance Criteria

The initial milestone is acceptable when the following tests pass.

  -----------------------------------------------------------------------
  ID                      Test scenario           Expected result
  ----------------------- ----------------------- -----------------------
  AC-01                   A feature branch        The agent identifies
                          contains a committed    and reports it with a
                          SQL injection           changed-line reference.
                          vulnerability.          

  AC-02                   The base branch         Changes made only on
                          receives a commit after the base branch are
                          the feature branch      excluded from the
                          diverges.               review.

  AC-03                   The developer has an    The uncommitted change
                          uncommitted vulnerable  is excluded from this
                          change.                 review mode.

  AC-04                   An unchanged file       The agent does not
                          contains a pre-existing report it as introduced
                          vulnerability.          by the feature branch.

  AC-05                   A changed               The agent analyses the
                          authentication function changed behaviour and
                          has a security          reports a substantiated
                          weakness.               finding.

  AC-06                   The feature branch      The agent identifies
                          introduces a            the regression and
                          regression.             explains its impact.

  AC-07                   A changed behaviour has The agent reports the
                          inadequate test         specific coverage gap
                          coverage.               and risk.

  AC-08                   The repository has      The agent asks the
                          multiple plausible base developer to confirm
                          branches.               the base branch.

  AC-09                   The agent completes a   No project files,
                          review.                 index, branch, or Git
                                                  history have been
                                                  modified.

  AC-10                   The agent finds no      It reports no
                          actionable issues.      actionable findings
                                                  within the reviewed
                                                  scope, without claiming
                                                  the code is completely
                                                  secure.

  AC-11                   Multiple developers     The agent does not
                          contributed to the same claim that all branch
                          feature branch.         changes belong to one
                                                  individual; it explains
                                                  the attribution
                                                  limitation.

  AC-12                   A finding cannot be     The agent states the
                          validated with          assumption or
                          available context.      validation gap rather
                                                  than presenting it as
                                                  confirmed.
  -----------------------------------------------------------------------

## 10. Sample Review Report Format

``` markdown
# Feature Branch Code Review

## Review Scope
- Repository:
- Feature branch:
- Base branch:
- Comparison: git diff <base>...HEAD
- Review mode: Read-only
- Committed changes reviewed:

## Summary
- Critical:
- High:
- Medium:
- Low:
- Informational:

## Findings

### [HIGH] SQL Injection Risk

- File: src/repositories/user_repository.py
- Line: 42
- Category: Security
- Confidence: High

**Description:**
User input is incorporated into a SQL query without
safe parameterization.

**Impact:**
An attacker may manipulate the query and access
or modify unauthorized data.

**Recommendation:**
Use parameterized queries.

## Missing Tests
- Describe the behaviour that lacks adequate coverage.
- Explain the associated risk.

## Assumptions
- List assumptions made during analysis.

## Validation Gaps
- List anything that could not be verified.

## Final Assessment
- Findings requiring developer attention:
- Review limitations:
- No files modified: Yes
```

## 11. Future Milestones

The following capabilities are potential future extensions and are not
part of the initial read-only acceptance criteria.

### Milestone 2: Automated Remediation

-   Let the developer explicitly authorize remediation.
-   Create an isolated remediation branch.
-   Apply minimal fixes only for approved findings.
-   Run relevant tests and validation.
-   Generate a remediation summary.

### Milestone 3: GitLab / Airbus SCM Integration

-   Trigger reviews through a developer action, GitLab webhook, or CI
    pipeline.
-   Identify the correct merge-request source and target branches.
-   Retrieve the relevant diff securely.
-   Publish findings as a review report or merge-request comments.
-   Preserve developer and repository permissions.

### Milestone 4: External Security Validation

-   Run SonarQube and Checkmarx after the initial AI review, according
    to the team's pipeline.
-   Compare AI findings with external scanner findings.
-   Track false positives, missed findings, and remediation
    effectiveness.
-   Use the results to improve review instructions and evaluation tests.

## 12. Key Design Principles

1.  **Diff first:** The Git diff defines what was introduced; the
    repository provides context.
2.  **Read-only first:** Analysis must not change the developer's
    working environment.
3.  **No pre-existing issue attribution:** Findings must be attributable
    to the feature-branch changes.
4.  **Human accountability:** Developers review and decide what to fix
    or merge.
5.  **Evidence over speculation:** Every finding needs a clear
    explanation and code reference.
6.  **Tool-enforced safety:** Permissions must enforce read-only
    behaviour; prompts alone are insufficient.
7.  **Incremental integration:** Prove the local Copilot review workflow
    before building GitLab automation or remediation.

------------------------------------------------------------------------

**Initial milestone definition of done:** A developer can explicitly
invoke the AI reviewer on a feature branch; the reviewer identifies the
correct base branch, analyses only committed changes introduced by that
branch using a three-dot diff, reports actionable security and quality
findings with file and line references, and leaves the working tree and
repository unchanged.
