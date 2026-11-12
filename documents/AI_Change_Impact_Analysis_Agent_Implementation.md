# Implementation Specification: AI Change Impact Analysis Agent

**Project:** AI Code Review & Remediation\
**Proposed component:** Change Impact Analysis Agent\
**Document type:** Implementation and integration guide\
**Status:** Proposed specification\
**Version:** 1.0\
**Date:** 12 November 2026

------------------------------------------------------------------------

## 1. Purpose

This document defines how to add a fourth, independent agent to the
existing AI Code Review and Remediation project.

The new **AI Change Impact Analysis Agent** reviews a Pull Request (PR)
and explains the broader consequences of the proposed changes. It
compares the proposed implementation with the confirmed target-branch
baseline, classifies the significance of the changes, identifies
potentially affected components, calculates evidence-based metrics,
generates impact diagrams, and produces a structured report.

The agent complements the existing workflow:

1.  **Context Acquisition Agent** -- collects the repository context
    required for an accurate review.
2.  **Validation & Security Review Agent** -- analyzes the developer's
    committed feature-branch changes and reports issues.
3.  **Remediation Agent** -- applies approved fixes on a separate
    remediation branch and prepares a remediation PR.
4.  **Change Impact Analysis Agent (new)** -- explains and documents the
    impact of the changes proposed by a PR.

The new agent must remain independent of the security reviewer and
remediation agent. It must not modify source code, branches, commits,
PRs, or merge state.

## 2. Goals and expected outcomes

### 2.1 Goals

The agent must:

-   Identify the exact PR and its source and target branches.
-   Compare the PR's proposed changes against the correct target-branch
    baseline.
-   Explain the implementation before and after the change.
-   Classify the change as Minor, Moderate, Major, or Critical.
-   Provide evidence and reasoning for the classification.
-   Identify directly changed and potentially affected files, functions,
    classes, modules, APIs, data structures, and services.
-   Calculate reproducible code and dependency metrics.
-   Explain functional, technical, data, security, compatibility, and
    operational impact where repository evidence supports the analysis.
-   Generate technical dependency and business functionality impact
    flows.
-   Produce Markdown and JSON reports.
-   Clearly distinguish confirmed facts, inferred impacts, risks, and
    unknowns.

### 2.2 Non-goals

The agent is not responsible for:

-   Performing the original security review.
-   Fixing findings or changing source code.
-   Running production deployments.
-   Merging PRs or approving PRs.
-   Claiming runtime or business improvements without measured evidence.
-   Treating every dependency relationship as proof of a runtime impact.
-   Replacing human review or project-specific release governance.

## 3. Position in the existing workflow

The agent runs when a PR is available for assessment. It can assess both
the developer's original feature PR and the AI-generated remediation PR.

``` mermaid
flowchart TD
    A["Developer commits to feature branch"] --> B["1. Context Acquisition"]
    B --> C["2. Validation and Security Review"]
    C --> D{"Issues identified?"}
    D -->|Yes| E["3. Remediation Agent"]
    E --> F["Create separate remediation branch"]
    F --> G["Apply approved fixes and validate"]
    G --> H["Create remediation PR"]
    D -->|No| I["Developer feature PR"]
    H --> J["PR Change Impact Analysis"]
    I --> J
    J --> K["Collect PR diff and repository context"]
    K --> L["Before vs After Analysis"]
    L --> M["Change Classification"]
    M --> N["Impact and Dependency Analysis"]
    N --> O["Metrics and Impact Diagrams"]
    O --> P["Markdown and JSON Reports"]
    P --> Q["Developer / Reviewer Assessment"]
    Q --> R["Normal PR approval and merge process"]
```

### 3.1 PR comparison baselines

The comparison baseline must be the PR's actual target branch, not an
assumed default branch.

  -----------------------------------------------------------------------
  PR type                             Comparison
  ----------------------------------- -----------------------------------
  Original feature PR                 Confirmed target/base branch →
                                      feature PR head

  Remediation PR                      Original feature branch (the
                                      remediation PR target) →
                                      remediation PR head

  Consolidated final view, if         Original confirmed base branch →
  requested                           remediation PR head
  -----------------------------------------------------------------------

For the remediation PR, the report should identify which changes were
already present in the original feature branch and which changes were
introduced by remediation. A consolidated report may additionally
describe the final proposed result against the original base.

Use committed PR changes only. Do not include uncommitted working-tree
changes in the PR assessment. If the base reference, merge base, or PR
metadata cannot be verified, fail closed and report that analysis is
incomplete.

## 4. Functional requirements

### FR-01: PR identification and scope

Collect and record:

-   Repository identity and commit SHA.
-   PR number or identifier, when available.
-   Source branch and source head SHA.
-   Target branch and target base SHA.
-   Merge-base SHA, where applicable.
-   Changed file list and change status: added, modified, deleted,
    renamed, copied, or type-changed.
-   Diff statistics and collection timestamp.

The collector must use the PR provider's verified base/head metadata
where available. It must not infer the target branch from a branch
naming convention.

### FR-02: Before-and-after comparison

For each relevant change, capture:

-   Previous implementation from the target baseline.
-   Proposed implementation from the PR head.
-   Changed functions, classes, methods, interfaces, schemas,
    configuration, and dependencies where detectable.
-   Behavior that appears to have been added, modified, or removed.
-   Evidence references: file path, symbol, and line range or diff hunk.

The report must not claim to understand behavior that cannot be
established from the available source and context.

### FR-03: Change classification

Use four classification levels:

  -----------------------------------------------------------------------
  Level                   Definition              Illustrative examples
  ----------------------- ----------------------- -----------------------
  Minor                   Isolated, low-risk      Comments, formatting,
                          change with no          local variable rename
                          meaningful contract or  
                          behavior impact         

  Moderate                Localized behavior or   New validation rule,
                          implementation change   isolated function
                                                  change

  Major                   Significant functional, Authentication
                          architectural, data,    redesign, public API
                          API, or cross-module    contract change
                          change                  

  Critical                Change with potentially Destructive migration,
                          severe security, data   authorization bypass
                          integrity,              risk, incompatible
                          availability, or broad  system-wide contract
                          compatibility           change
                          consequences            
  -----------------------------------------------------------------------

Classification must not be based only on changed line count. Consider:

-   Business logic and behavior.
-   Public API and event contract changes.
-   Database schema and migration changes.
-   Authentication and authorization changes.
-   Cross-module and service dependencies.
-   External package and runtime changes.
-   Backward compatibility.
-   Data deletion, transformation, or integrity risks.
-   Infrastructure, deployment, and configuration changes.
-   Scope and confidence of available evidence.

Every classification must include a concise rationale and supporting
evidence. Include a confidence label (High, Medium, Low) and explain
missing context that affects confidence. A Critical label should
indicate a potential consequence, not assert that the consequence has
occurred.

### FR-04: Deep impact analysis

Run deeper analysis for Major and Critical changes. For Minor and
Moderate changes, produce a concise summary and basic metrics. The
execution policy should be configurable.

Analyze these dimensions where applicable:

1.  **Functional impact:** changed workflows, business rules, behavior
    added or removed.
2.  **Technical impact:** changed modules, functions, classes,
    interfaces, dependencies, and services.
3.  **API impact:** endpoints, request/response contracts, events,
    compatibility, and consumers.
4.  **Data impact:** tables, columns, types, constraints, migrations,
    transformations, and backfills.
5.  **Security impact:** authentication, authorization, secrets
    handling, trust boundaries, and permissions.
6.  **Operational impact:** configuration, environment variables,
    deployment, infrastructure, monitoring, and rollback considerations.
7.  **Testing impact:** existing tests affected, missing coverage
    signals, and recommended regression areas.

The agent must distinguish: - **Confirmed:** directly evidenced by the
PR or repository. - **Inferred:** plausible impact based on discovered
references or dependency relationships. - **Potential risk:** a
consequence that should be checked. - **Unknown:** cannot be verified
from available context.

### FR-05: Impact metrics

Calculate deterministic metrics from collected repository evidence. At
minimum:

**Code metrics** - Files added, modified, deleted, and renamed. - Lines
added and deleted. - Functions, methods, and classes changed, where
language parsing supports this. - New and removed files.

**Dependency metrics** - Directly changed modules. - Discovered direct
dependents. - Discovered transitive dependents, only where the
dependency graph supports this. - Number of components with confirmed
versus inferred relationships.

**API metrics** - Endpoints added, modified, or removed, where API
definitions or framework routes can be parsed. - Contract fields added,
modified, or removed, where schemas are available. - Potential breaking
changes with evidence.

**Data metrics** - Tables and models changed. - Columns and constraints
added, changed, or removed. - Migration files added or modified.

**Risk indicators** - Security-sensitive files or symbols touched. -
Configuration and infrastructure files changed. - Public interfaces or
contracts changed. - Test files changed and relevant tests discovered.

Do not manufacture unavailable metrics. Use `null` or an explicit
`not_measured` status with an explanation when a metric cannot be
computed.

Do not infer runtime performance, latency, cost, throughput, or business
KPI improvements from source code alone. Those require benchmark, test,
telemetry, or business-system evidence. If such evidence is connected
later, report the measurement source, environment, time window, and
before/after methodology.

### FR-06: Impact flow generation

Generate two complementary diagrams:

**A. Technical dependency flow**

Shows changed components and their discovered relationships to modules,
functions, APIs, services, tables, or downstream consumers.

**B. Business functionality flow**

Explains the business workflow that may be affected, using repository
evidence and clearly labeled inferences.

Diagram nodes should distinguish: - Directly modified components. -
Confirmed dependent components. - Potentially affected components. -
Unknown or unverified relationships.

Every diagram must have a text explanation and a legend. Avoid
presenting a speculative dependency as a confirmed runtime path.

Use Mermaid as the initial diagram format because it is text-based,
versionable, and suitable for Markdown reports. Keep graph generation
separate from the LLM narrative so that graph edges are grounded in
collected evidence.

### FR-07: Report generation

Generate two primary outputs:

-   `change-impact-report.md` -- readable report for developers,
    reviewers, and managers.
-   `change-impact-report.json` -- structured report for automation,
    dashboards, and future integrations.

Optional future formats: HTML, PDF, SARIF, GitHub PR summary, and PR
check annotations. These should not block the initial implementation.

### FR-08: PR integration

Initial integration should support running the agent against a local PR
checkout using explicit base and head references. Add provider
integration after the core analyzer and report schema are stable.

When integrated with GitHub: - Read PR metadata and diff using a
least-privilege token. - Publish a report as a workflow artifact or PR
summary only when explicitly configured. - Do not approve, merge, push
commits, or change branch protection. - Keep credentials outside source
files and logs.

## 5. Proposed architecture

``` mermaid
flowchart TD
    A["PR Metadata / Explicit Base and Head"] --> B["PR Change Collector"]
    B --> C["Diff and File Inventory"]
    B --> D["Repository Context Discovery"]
    C --> E["Before / After Snapshot Builder"]
    D --> F["Dependency and Symbol Index"]
    E --> G["Change Classification Engine"]
    F --> H["Impact Analysis Engine"]
    G --> I{"Major or Critical?"}
    I -->|No| J["Standard Impact Summary"]
    I -->|Yes| H
    H --> K["Functional / Technical / Data / API Analysis"]
    K --> L["Evidence-backed Metrics"]
    K --> M["Technical and Business Impact Graphs"]
    J --> N["Report Formatter"]
    L --> N
    M --> N
    N --> O["Markdown Report"]
    N --> P["JSON Report"]
    O --> Q["Human Review"]
    P --> Q
```

### 5.1 Component responsibilities

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  PR Change Collector                 Validate repository, PR base/head,
                                      merge base, and committed diff

  Snapshot Builder                    Collect before and after versions
                                      of changed files and relevant
                                      context

  Context Discovery                   Find related code, symbols, API
                                      definitions, schemas, tests, and
                                      configuration

  Classification Engine               Classify change significance with
                                      evidence and confidence

  Dependency Analyzer                 Build supported relationships from
                                      imports, calls, route mappings,
                                      schemas, and project metadata

  Impact Analyzer                     Explain functional, technical,
                                      data, API, security, and
                                      operational consequences

  Metrics Calculator                  Produce deterministic metrics from
                                      collected evidence

  Impact Graph Builder                Create technical and business
                                      Mermaid diagrams from evidence

  Report Formatter                    Validate the report model and write
                                      Markdown and JSON outputs
  -----------------------------------------------------------------------

Keep deterministic collection, metric calculation, and graph
construction separate from LLM-generated explanations. The LLM should
reason over bounded, traceable evidence rather than invent repository
facts.

## 6. Suggested project structure

Integrate this as a new skill and agent alongside the existing review
and remediation components. Preserve existing paths and naming
conventions where they already exist.

``` text
.github/
  agents/
    security-reviewer.agent.md
    remediation-agent.agent.md
    change-impact-agent.agent.md

  skills/
    ai-code-security-review/
      SKILL.md
      scripts/
        collect-review.cjs

    ai-code-remediation/
      SKILL.md
      ...

    ai-change-impact-analysis/
      SKILL.md
      references/
        CHANGE-IMPACT-REPORT-SCHEMA.md
        CLASSIFICATION-RULES.md
        IMPACT-METRICS.md
      scripts/
        collect-pr-changes.cjs
        build-snapshots.cjs
        discover-context.cjs
        classify-changes.cjs
        analyze-dependencies.cjs
        calculate-impact-metrics.cjs
        generate-impact-flow.cjs
        generate-impact-report.cjs
      tests/
        ...

reports/
  change-impact/
    <pr-id>/
      change-impact-report.md
      change-impact-report.json
      diagrams/
        technical-impact.mmd
        business-impact.mmd
```

The exact remediation skill path should be aligned with the current
repository. Do not rename or move the existing security-review collector
as part of this feature.

## 7. Agent definition guidance

Create `.github/agents/change-impact-agent.agent.md` using the IDE's
supported agent frontmatter format. The following is a starting
template; verify tool names and frontmatter compatibility with the
installed IDE before use.

``` yaml
---
name: Change Impact Analysis Agent
description: Analyzes pull request changes, classifies their significance, calculates evidence-based impact metrics, and generates impact documentation and diagrams.
tools:
  - read
  - search
  - edit
user-invocable: true
disable-model-invocation: false
---

# Change Impact Analysis Agent

Analyze only the explicitly identified PR source and target revisions.

## Required behavior
1. Verify repository, target/base reference, source/head reference, and comparison scope.
2. Collect committed PR changes and relevant repository context.
3. Compare before and after implementations.
4. Classify changes as Minor, Moderate, Major, or Critical.
5. Provide evidence-backed impact analysis and metrics.
6. Generate technical and business impact flows.
7. Produce Markdown and JSON reports.
8. Clearly label facts, inferences, risks, unknowns, and confidence.

## Safety boundaries
- Never modify application source code.
- Never modify branches, commits, PR state, or merge state.
- Never approve or merge a PR.
- Do not execute deployments or production operations.
- Do not invent metrics or unsupported dependency relationships.
- Do not include uncommitted working-tree changes in the PR assessment.
- If the base/head scope cannot be verified, stop and report the limitation.
- Write reports only to the configured report output directory.
- Do not expose credentials, secrets, or sensitive values in reports.
```

**Tool permission note:** If the IDE supports a dedicated report-writing
tool or a restricted filesystem permission, use that instead of broad
`edit` access. The agent needs to write report artifacts but should not
have permission to edit application source. If permissions cannot be
separated, keep report generation in a deterministic script and have the
agent provide structured input to it.

## 8. Report schema

The JSON report should have a stable, versioned schema. A suggested
initial shape:

``` json
{
  "schemaVersion": "1.0",
  "reportType": "pr-change-impact",
  "repository": {
    "name": null,
    "prId": null,
    "sourceBranch": null,
    "targetBranch": null,
    "baseSha": null,
    "headSha": null,
    "mergeBaseSha": null
  },
  "classification": {
    "level": "major",
    "confidence": "medium",
    "reasoning": [],
    "evidence": []
  },
  "summary": "",
  "changes": [
    {
      "path": "",
      "status": "modified",
      "beforeSummary": "",
      "afterSummary": "",
      "changeReason": "",
      "evidence": []
    }
  ],
  "impact": {
    "functional": [],
    "technical": [],
    "api": [],
    "data": [],
    "security": [],
    "operational": [],
    "testing": []
  },
  "metrics": {
    "filesAdded": 0,
    "filesModified": 0,
    "filesDeleted": 0,
    "filesRenamed": 0,
    "linesAdded": 0,
    "linesDeleted": 0,
    "functionsChanged": null,
    "modulesAffected": null,
    "apiEndpointsAdded": null,
    "apiEndpointsModified": null,
    "apiEndpointsRemoved": null,
    "tablesChanged": null
  },
  "diagrams": {
    "technicalDependencyFlow": "",
    "businessFunctionalityFlow": ""
  },
  "risks": [],
  "recommendations": [],
  "limitations": [],
  "evidence": [],
  "generatedAt": ""
}
```

The example is illustrative. Define a JSON Schema and validate every
generated JSON report before writing it. Use consistent enumerations and
distinguish unavailable values from measured zero values.

## 9. Classification and escalation logic

Start with transparent, configurable rules. Use AI reasoning to
interpret evidence and explain the outcome, not as the sole source of
classification.

Suggested initial signals:

  -----------------------------------------------------------------------
  Signal                              Suggested significance
  ----------------------------------- -----------------------------------
  Comments, formatting, isolated      Usually Minor
  rename                              

  Localized internal logic change     Usually Moderate

  Public API request/response         Major candidate
  contract change                     

  Database migration or schema change Major candidate

  Authentication/authorization        Major or Critical candidate
  redesign                            

  Destructive data migration or broad Critical candidate
  permission weakening                

  Shared library or widely used       Major candidate
  interface change                    

  Deployment or infrastructure        Major candidate
  topology change                     
  -----------------------------------------------------------------------

The final classification must consider context and combinations of
signals. A single signal should not automatically force a level unless
the project config explicitly defines it as a hard rule.

Example output:

``` text
Classification: MAJOR
Confidence: HIGH

Reasoning:
- A public API response contract was modified.
- Three discovered consumers reference the affected endpoint.
- A database model change accompanies the API modification.

Evidence:
- src/api/customer.py
- src/models/customer.py
- tests/api/test_customer.py

Limitations:
- External consumers are not represented in this repository.
```

## 10. Impact metrics methodology

Metrics must be reproducible and traceable.

  -----------------------------------------------------------------------
  Metric                  Calculation/source      Limitation
  ----------------------- ----------------------- -----------------------
  Files changed           Diff file status count  Directly measurable

  Lines added/deleted     Diff statistics         Does not indicate
                                                  complexity

  Functions changed       Language-aware symbol   Parser coverage varies
                          comparison              by language

  Modules affected        Dependency graph        Depends on discovered
                          traversal               relationships

  API endpoints changed   Route and API           Dynamic route
                          specification           registration may be
                          comparison              missed

  Tables/columns changed  ORM/schema/migration    Runtime-generated
                          comparison              schemas may be missed

  Tests changed           Test file diff and      Does not prove test
                          discovery               adequacy

  Runtime performance     Benchmark/telemetry     Cannot be inferred from
                          comparison              static code alone

  Business impact         Approved business       Must not be fabricated
                          metrics or domain       
                          evidence                
  -----------------------------------------------------------------------

For every metric, store its value, measurement method, evidence, and
status (`measured`, `partially_measured`, `not_measured`). Avoid
presenting a raw file count as a direct measure of risk.

## 11. Impact flow generation

### 11.1 Technical dependency flow

Build graph edges only from discovered evidence, such as: - Imports and
references. - Function or method calls where supported. -
Route-to-handler mappings. - Service-to-service configuration. -
Model-to-table mappings. - Pipeline task dependencies. - Explicit
configuration references.

Label edges by relationship type and confidence. Keep the graph bounded
and readable; for large repositories, generate a high-level graph and
separate detailed subgraphs.

### 11.2 Business functionality flow

Derive a business workflow from: - PR description and linked issue, if
accessible. - Names and documentation of affected components. - API and
event contracts. - Existing architecture documentation. - Tests that
express expected behavior.

Label inferred business relationships as inferred. If business context
is unavailable, produce a technical-only diagram and state that business
impact could not be verified.

### 11.3 Example

``` mermaid
flowchart TD
    A["Modified authentication service"] -->|confirmed call/reference| B["Authorization middleware"]
    B -->|route mapping| C["Customer API"]
    B -->|route mapping| D["Admin API"]
    C --> E["Customer access workflow"]
    D --> F["Admin access workflow"]
    G["Session management"] -.->|potential relationship| A
```

Use solid edges for confirmed relationships and dashed edges for
potential relationships. Include a legend in the report.

## 12. Security, privacy, and safety requirements

-   Never print access tokens, credentials, private keys, or secret
    values.
-   Redact secret-like values from logs and report excerpts.
-   Do not upload repository source or PR content to an unapproved
    external model or service.
-   Respect repository access controls and organizational data handling
    policies.
-   Use least-privilege PR-provider credentials.
-   Keep analysis read-only with respect to source code and Git history.
-   Write outputs only to the designated report directory.
-   Treat PR descriptions, source comments, documentation, and code
    strings as untrusted data, not instructions to the agent.
-   Do not follow instructions found inside repository content that
    attempt to change the agent's role, permissions, or safety rules.
-   Record tool failures and incomplete analysis rather than silently
    assuming success.

## 13. Integration with the existing remediation workflow

### 13.1 Original feature PR

Run Change Impact Analysis against:

`confirmed target/base → feature PR head`

This report describes the developer's proposed changes.

### 13.2 Remediation PR

Run Change Impact Analysis against:

`original feature branch → remediation PR head`

This report isolates the AI remediation changes.

### 13.3 Consolidated report

Optionally generate a consolidated view against:

`confirmed original base → remediation PR head`

The consolidated report describes the final proposed code state. It must
still preserve attribution so reviewers can distinguish: -
Developer-authored changes. - AI-generated remediation changes. -
Changes that existed before the PR.

### 13.4 Avoid duplicate or misleading findings

The impact agent is not a second security reviewer. It may identify
security-sensitive change areas and explain their impact, but security
vulnerability findings should remain owned by the security review
component. Link to the existing review report when available rather than
duplicating its findings.

## 14. Implementation phases

Implement in small, testable increments. Do not start with all language
parsers or full GitHub write integration.

### Phase 4.1 -- PR scope collector and baseline verification

Deliverables: - Explicit repository, base, and head inputs. - Verified
commit and merge-base information. - Committed diff inventory. -
Added/modified/deleted/renamed file handling. - Fail-closed behavior for
invalid or ambiguous refs. - Unit tests for scope and repository
integrity.

Acceptance criteria: - Base-only changes are not reported as PR
changes. - Uncommitted changes are excluded. - Missing base/head or
ambiguous merge base stops analysis. - File statuses and diff statistics
match Git output.

### Phase 4.2 -- Before/after snapshot and context discovery

Deliverables: - Before and after content for changed files. - Changed
symbol identification for supported languages. - Related imports,
callers, tests, schemas, API definitions, and configuration discovery. -
Bounded context package with file and byte limits.

Acceptance criteria: - Every comparison points to the correct
revision. - Context files include a reason for discovery. - File size
and aggregate context limits are enforced. - Unsupported language
constructs are recorded as limitations.

### Phase 4.3 -- Classification engine

Deliverables: - Configurable Minor/Moderate/Major/Critical rules. -
Evidence-backed reasoning. - Confidence and limitations. - Unit tests
for representative change types.

Acceptance criteria: - Classification is not based only on line count. -
Major/Critical cases include evidence and rationale. - Missing context
lowers confidence or is explicitly recorded. - Repeated identical inputs
produce stable deterministic signals.

### Phase 4.4 -- Impact analysis

Deliverables: - Functional, technical, API, data, security, operational,
and testing impact sections. - Confirmed/inferred/risk/unknown labels. -
Dependency and symbol relationship analysis.

Acceptance criteria: - Each material impact claim references evidence. -
Inferred relationships are not described as confirmed. - External or
unavailable dependencies are listed as limitations.

### Phase 4.5 -- Metrics engine

Deliverables: - Deterministic code metrics. - Supported dependency, API,
data, and testing metrics. - Measurement status and evidence for each
metric.

Acceptance criteria: - Metrics can be reproduced from the same
repository revisions. - Unknown values are not converted to zero. -
Runtime and business metrics are omitted unless actual measurements are
supplied.

### Phase 4.6 -- Impact flow generator

Deliverables: - Technical dependency Mermaid diagram. - Business
functionality Mermaid diagram when evidence supports it. - Relationship
confidence and legend. - Graph size limits and readable output.

Acceptance criteria: - Diagram nodes correspond to collected evidence. -
Potential edges are visually distinct. - The agent does not invent
service or business relationships.

### Phase 4.7 -- Report formatter

Deliverables: - Versioned JSON schema. - Markdown report. - JSON
report. - Report validation and deterministic output tests.

Acceptance criteria: - Both reports contain matching classification,
metrics, and impact summaries. - JSON validates against the schema. -
Evidence and limitations are included. - Reports are generated even when
some analysis dimensions are unavailable, provided the PR scope itself
is valid.

### Phase 4.8 -- PR workflow integration

Deliverables: - Local CLI invocation. - Optional GitHub Actions
workflow. - Optional PR summary or artifact publishing. -
Least-privilege credential documentation.

Acceptance criteria: - Read-only PR analysis works without a write
token. - Publishing is opt-in. - No PR approval, merge, push, or source
modification occurs. - Failures are visible in workflow output.

## 15. Suggested command-line interface

Keep the CLI explicit and predictable. A proposed interface:

``` bash
node .github/skills/ai-change-impact-analysis/scripts/collect-pr-changes.cjs \
  --repo . \
  --base origin/main \
  --head HEAD \
  --output reports/change-impact/PR-123
```

Then run the analysis stages:

``` bash
node .github/skills/ai-change-impact-analysis/scripts/generate-impact-report.cjs \
  --input reports/change-impact/PR-123/context-package.json \
  --output reports/change-impact/PR-123
```

The actual command names and input contract should be finalized during
implementation. The collector should not silently fetch, switch
branches, reset the index, or alter the working tree. Any required fetch
should be a separate, explicit setup step.

## 16. Testing strategy

Build fixtures that cover at least:

1.  Documentation-only change.
2.  Isolated internal function change.
3.  Public API contract modification.
4.  Database schema and migration change.
5.  Authentication/authorization change.
6.  Shared module change with multiple dependents.
7.  Added, deleted, and renamed files.
8.  Configuration and infrastructure changes.
9.  PR with no changes.
10. Missing base or invalid head.
11. Detached HEAD or ambiguous merge base.
12. Uncommitted working-tree changes.
13. Binary or oversized files.
14. Incomplete dependency context.
15. Prompt-injection-like instructions inside source comments or PR
    descriptions.
16. Secret-like values in source and logs.

For each fixture, verify: - Correct diff scope. - Correct before/after
content. - Classification rationale and confidence. - Metric values and
measurement status. - Evidence references. - Diagram node and edge
provenance. - Report schema validity. - No source, branch, commit, or PR
mutation.

## 17. Definition of Done

The new agent is ready for initial adoption when:

-   It is independently invocable.
-   It verifies PR base/head and committed change scope.
-   It produces before-and-after explanations.
-   It classifies changes using the four agreed levels.
-   Major/Critical changes receive deeper impact analysis.
-   Metrics are deterministic and evidence-backed.
-   It generates technical impact flow and business flow when evidence
    supports it.
-   Markdown and JSON reports validate and agree.
-   It distinguishes developer changes from remediation changes.
-   It does not modify application code or Git/PR state.
-   Tests cover scope, classification, metrics, graph provenance,
    reporting, and safety boundaries.
-   Documentation explains setup, inputs, outputs, limitations, and
    permissions.

## 18. Recommended initial implementation scope

To keep the first implementation manageable, start with:

1.  PR/base/head scope collection using Git.
2.  Before/after file comparison.
3.  Four-level classification with transparent rules.
4.  File, line, and changed-symbol metrics for the first supported
    languages.
5.  Evidence-backed impact summary.
6.  Technical dependency flow for relationships the collector can
    reliably discover.
7.  Markdown and JSON reports.
8.  Read-only local execution.

Add business workflow inference, broad language support, GitHub
publishing, runtime telemetry, and advanced dependency resolution only
after the initial acceptance tests pass.

## 19. Decisions and configurable settings

The following defaults are recommended for the first version:

  -----------------------------------------------------------------------
  Setting                             Recommended default
  ----------------------------------- -----------------------------------
  Execution                           Every PR; deeper analysis for
                                      Major/Critical

  Classification                      Minor, Moderate, Major, Critical

  Primary formats                     Markdown + JSON

  Diagrams                            Technical dependency + business
                                      functionality where supported

  PR publishing                       Disabled by default

  Source modification                 Prohibited

  Branch/commit/merge operations      Prohibited

  Comparison baseline                 Explicit PR target/base

  Metrics                             Static, deterministic metrics first

  Runtime performance claims          Only with benchmark/telemetry
                                      evidence

  Human approval                      Required through the normal PR
                                      process
  -----------------------------------------------------------------------

These defaults can be changed through a project configuration file after
the first working implementation.

------------------------------------------------------------------------

## 20. Implementation handoff checklist

Before coding:

-   [ ] Review the existing repository structure and preserve current
    agent/skill paths.
-   [ ] Confirm the current remediation skill directory and agent
    frontmatter conventions.
-   [ ] Confirm the IDE's supported tools and report-writing
    permissions.
-   [ ] Agree the CLI input/output contract.
-   [ ] Add a versioned report schema.
-   [ ] Define the first supported language(s) for symbol and dependency
    discovery.

During implementation:

-   [ ] Build and test the read-only PR collector first.
-   [ ] Add before/after snapshots and bounded context collection.
-   [ ] Implement classification and evidence tracking.
-   [ ] Add impact analysis and deterministic metrics.
-   [ ] Generate Mermaid diagrams from discovered relationships.
-   [ ] Generate and validate Markdown and JSON reports.
-   [ ] Add original feature PR and remediation PR test scenarios.

Before integration:

-   [ ] Verify no source or Git state is modified.
-   [ ] Verify uncommitted changes are excluded.
-   [ ] Verify all material claims have evidence or are labeled as
    inferred.
-   [ ] Verify no fabricated runtime/business metrics.
-   [ ] Verify secrets are redacted.
-   [ ] Run the complete test suite and document known limitations.

**Recommended implementation principle:** Build a reliable, read-only
evidence collection and reporting pipeline first. Add AI reasoning on
top of that verified evidence. This keeps the new agent auditable, safer
to integrate, and consistent with the existing remediation project's
scope-control principles.
