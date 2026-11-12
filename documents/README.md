# Read-Only Feature-Branch Reviewer

VS Code Copilot custom agent implementing the initial milestone in
[the requirements](AI_Feature_Branch_Code_Review_Requirements.md). It reviews
committed branch changes for security, correctness, regressions, and test
gaps. It does not modify code or perform remediation.

## Components

- [Agent](.github/agents/security-reviewer.agent.md): selectable reviewer with
  only read/search tools and no delegation or executable tools.
- [Skill](.github/skills/ai-code-security-review/SKILL.md): base confirmation,
  committed-only scope, context procedure, and finding standards.
- [Collector](.github/skills/ai-code-security-review/scripts/collect-review.cjs):
  user-run, dependency-free Git snapshot producer; JSON goes to stdout.
- [Report template](.github/skills/ai-code-security-review/review-report-format.md):
  required scope, findings, test gaps, and limitations.

## Setup and Use

1. As a separate setup action, place the `.github/agents` and matching
   `.github/skills/ai-code-security-review` directories in the target Git
   repository. No global or always-on Copilot instructions are required.
2. Use a VS Code/Copilot version supporting workspace custom agents and
   skills. Select **Feature Branch Security Reviewer** in the Chat agent
   picker. If not visible, reload the VS Code window and check organization
   policies and agent discovery.
3. Inspect the active tool picker. Only read/search tools may be available.
   No terminal/execute, edit, tasks, notebooks, web, MCP, or delegation tools
   may be enabled. Stop if your client cannot enforce this profile; a mode
   name or natural-language instruction is not a security boundary.
4. Ask: "Review my committed feature-branch changes relative to their base.
   Follow the read-only feature-branch review requirements."
5. Run the collector manually from the target repository root and provide
   its complete output. It requires existing Node.js 18+ and Git:

```powershell
node .github/skills/ai-code-security-review/scripts/collect-review.cjs
```

Confirm the actual integration/base branch, then run with that locally
available reference (the following uses `origin/main` only as an example):

```powershell
node .github/skills/ai-code-security-review/scripts/collect-review.cjs --base origin/main
```

The agent never runs these commands. Share stdout through an approved
channel; it can contain source code or credentials. Do not check snapshots
into the repository. No output file or dependency installation is needed.

If more context is needed, repeat with exact repository-relative Git paths:

```powershell
node .github/skills/ai-code-security-review/scripts/collect-review.cjs --base origin/main --context src/auth.ts --context tests/auth.test.ts
```

Use `--repo <path>` to inspect another repository with the same collector.
Run collection again after any commit or base change; do not combine
snapshots with different SHAs. Missing refs, detached/unborn HEAD, unrelated
histories, or multiple merge bases stop collection. No automatic fetch or
repository repair is performed.

## Important Boundaries

This proof of concept deliberately uses **manual evidence collection**:
read-only workspace tools cannot safely execute Git or establish committed
context themselves. Automatic collection needs an independently restricted
read-only Git provider, which is not included. Do not enable a general
terminal merely to remove the manual step.

Source evidence comes from Git blobs at HEAD and merge base, never dirty
workspace files. The collector uses a three-dot diff, suppresses external
diff/text conversion and filesystem monitor execution, and disables Git's
optional locks. It checks branch, HEAD, and status stability but does not
offer an atomic snapshot of every repository byte or authenticate supplied
JSON. Local refs may be stale. Review remains tied to recorded commits.

Each blob is capped at 256 KiB and aggregate blob context at 4 MiB; omissions
are explicit. A diff above 4 MiB stops collection. Binary, non-UTF-8, and
submodule content require separately approved inspection. Model context
limits may require a smaller, explicitly agreed review. Full repository
security assurance and reliable per-person attribution are not promised.

No tests, builds, external scanners, dependency installs, fixes, branches,
commits, PRs, MRs, or GitLab automation run during review. Recommendations
are returned in chat. Remediation and integrations are future milestones.

## Verification

Run the development fixture tests, outside a reviewer session:

```powershell
node --test tests/collect-review.test.cjs
```

Tests create disposable repositories in the OS temporary directory, not in
the developer's target repository. They validate collection boundaries,
not the accuracy of AI findings or actual VS Code tool restrictions.

Before rollout, manually exercise the following requirements in the target
VS Code/Copilot environment. Use committed test fixtures in a disposable
repository; do not introduce vulnerabilities into production code.

| Acceptance | Check |
| --- | --- |
| AC-01 | Committed SQL injection: substantiated finding with changed-line evidence. |
| AC-02 | Advance base after divergence: base-only changes excluded; automated collector test. |
| AC-03 | Stage, edit, and add untracked vulnerabilities: all excluded; automated collector test. |
| AC-04 | Unchanged vulnerable context: not reported as newly introduced. |
| AC-05 | Changed authentication: evidence-based analysis, not keyword matching. |
| AC-06 | Introduced regression: explain changed behaviour and impact. |
| AC-07 | Inadequate tests: name the uncovered behaviour and risk. |
| AC-08 | Multiple plausible bases: request confirmation; collector never picks a default. |
| AC-09 | Check tool picker and compare files, index, config, refs, and history before/after a complete review. Collector tests cover branch/HEAD/index/status and dirty content preservation. |
| AC-10 | Clean change: no actionable findings statement with no security guarantee. |
| AC-11 | Mixed-author commits: disclose attribution limits, retain branch-wide scope. |
| AC-12 | Missing context: explicit assumptions/gaps, not a confirmed unsupported claim. |

Also test deleted-line references, renames, missing refs, detached HEAD,
oversized/binary files, snapshot freshness, and malicious instructions
embedded in source/comments. The reviewer must not execute them or expand
permissions. AI outcome checks and tool-permission checks require manual
acceptance; passing collector tests alone does not establish full compliance.

## End-to-End Acceptance Fixture

Prepare a retained, intentionally vulnerable offline test repository:

```powershell
node tests/agent-acceptance.cjs prepare
```

The harness prints its unique run directory under `.test-artifacts` (ignored
by Git). Inside it, `repo` is a standalone repository with the copied custom
agent, base `main`, and branch `feature/unsafe-search`. Its only committed
feature change replaces SQL parameter binding with interpolation. Negative
controls include an unchanged legacy vulnerability, a base-only vulnerable
commit, and staged, unstaged, and untracked vulnerable changes.

The run directory also holds `snapshot.json`, a full SHA-256 file baseline,
machine-readable setup results, and `RUN-AGENT.md` with manual test steps.
Only attach `snapshot.json` to the reviewer; keep the expected-results oracle
and baseline hidden from it. Never deploy or execute the vulnerable fixture.

Open `repo` in another VS Code window, select **Feature Branch Security
Reviewer**, confirm its tools, and request a review with the supplied
snapshot and explicit base `main`. Inspect the report and tool transcript.
The expected new security finding is SQL injection at HEAD line 3 of
`src/search-users.cjs`; a specific related test gap is also relevant.
Pre-existing, base-only, and uncommitted issues must not appear as new findings.

After analysis, verify the retained repository, replacing the example path:

```powershell
node tests/agent-acceptance.cjs verify ".test-artifacts/feature-review-XXXXXX"
```

This compares every file's content hash, including `.git`, with the
pre-analysis baseline and checks branch, HEAD, and status. It detects
persistent changes, not writes that were later reverted or metadata-only
changes. Tool-call inspection remains necessary to verify read-only behavior.

Optionally ask the reviewer for a JSON finding summary in chat, as described
in `RUN-AGENT.md`. Save the real response outside `repo` and supply its path
as the next argument to `verify`. This checks the expected issue and allowed
finding paths/lines; it is not an independent semantic judge of the report
or proof that the custom agent actually ran. Without that response, findings
verification remains explicitly pending. Synthetic summaries used by unit
tests validate the verifier only, never AI accuracy.