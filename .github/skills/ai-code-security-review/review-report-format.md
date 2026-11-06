# Feature Branch Code Review

## Review Scope

- Repository:
- Feature branch:
- Selected base branch and selection evidence:
- Head SHA:
- Base SHA:
- Merge-base SHA:
- Comparison: `git diff <base>...HEAD` pinned to the recorded SHAs
- Review mode: Read-only; committed changes only
- Local staged/unstaged/untracked changes: Excluded
- Attribution: Branch-wide changes; individual ownership not verified
- Evidence source and freshness limitations:

## Summary

| Severity | Count |
| --- | --- |
| Critical | |
| High | |
| Medium | |
| Low | |
| Informational | |

## Changed Files and Lines

List every changed path, status, changed line ranges, and whether reviewed,
partially reviewed, or omitted. Label deletion ranges as merge-base lines.
List context-only paths separately and state why each was needed.

## Findings

Repeat in severity order; omit the example when no findings exist.

### [SEVERITY] Short Specific Title

- ID:
- Category: Security / Correctness / Regression / Test adequacy
- Confidence: High / Medium / Low
- File and line: Exact committed path, line, and HEAD or merge-base identity
- Change attribution: Specific hunk and how it introduces or worsens the issue
- Evidence: Relevant code and supporting context; redact any secrets
- Description and failure/exploit conditions:
- Potential impact and severity rationale:
- Recommended secure remediation:
- Suggested regression/security test:
- Unverified assumptions:

## Missing or Inadequate Tests

Identify specific uncovered changed behaviour and its risk, reference related
findings, and distinguish confirmed gaps from unavailable test context.

## Assumptions

State base-selection, framework, deployment, trust-boundary, and authorship
assumptions relevant to the conclusions. Do not silently assume them.

## Validation Gaps and Limitations

List omitted files/context, unverified runtime conditions, local-ref freshness,
and user-supplied evidence limitations. State tests/builds/scans were not run
unless actual observed results were supplied; identify their source and SHA.

## Final Assessment

- Findings requiring developer attention:
- No actionable findings statement, when applicable, with no security guarantee:
- Reviewer used no write or execute tools:
- Collector state-stability checks: As reported by supplied evidence, not independently verified
- No fixes, branch changes, commits, PRs, or MRs performed: