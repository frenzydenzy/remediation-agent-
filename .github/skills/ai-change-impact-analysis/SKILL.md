# AI Change Impact Analysis Skill

## Overview

The **Change Impact Analysis Skill** provides automated analysis of Pull Request (PR) changes, classification of their significance, calculation of impact metrics, and generation of impact documentation and dependency diagrams.

This skill complements the existing security review and remediation agents by explaining and documenting the broader consequences of proposed code changes.

## Scope

- ✅ Analyze committed PR changes (no uncommitted working-tree changes)
- ✅ Classify changes as Minor, Moderate, Major, or Critical
- ✅ Calculate evidence-based metrics (files, lines, symbols, dependencies)
- ✅ Generate technical dependency flow diagrams
- ✅ Generate business functionality impact flows
- ✅ Produce Markdown and JSON reports
- ✅ Distinguish confirmed facts, inferred impacts, risks, and unknowns
- ❌ Do not modify source code or Git state
- ❌ Do not replace human review or governance
- ❌ Do not invent unsupported metrics or runtime claims

## Components

### Phase 4.1: PR Scope Collector
- **File**: `scripts/collect-pr-changes.cjs`
- **Purpose**: Validate repository, base/head references, and collect committed diff
- **Validates**: Merge-base information, file status inventory, diff statistics
- **Fails-closed**: Ambiguous or invalid refs stop analysis

### Phase 4.2: Snapshot Builder & Context Discovery
- **File**: `scripts/build-snapshots.cjs`
- **Purpose**: Collect before/after content and relevant repository context
- **Discovers**: Imports, callers, tests, schemas, API definitions, configuration
- **Enforces**: File size and aggregate context limits

### Phase 4.3: Classification Engine
- **File**: `scripts/classify-changes.cjs`
- **Purpose**: Classify changes with evidence and confidence
- **Levels**: Minor, Moderate, Major, Critical
- **Evidence-backed**: Reasoning, supporting evidence, limitations

### Phase 4.4: Impact Analysis
- **File**: `scripts/analyze-dependencies.cjs`
- **Purpose**: Functional, technical, API, data, security, operational impact analysis
- **Labels**: Confirmed, inferred, risk, unknown
- **Boundary**: Clearly mark unavailable dependencies

### Phase 4.5: Metrics Calculator
- **File**: `scripts/calculate-impact-metrics.cjs`
- **Purpose**: Deterministic code and dependency metrics
- **Status**: Measured, partially measured, not measured
- **Prevents**: Converting unknown values to zero

### Phase 4.6: Impact Flow Generator
- **File**: `scripts/generate-impact-flow.cjs`
- **Purpose**: Technical and business dependency Mermaid diagrams
- **Evidence**: Only from discovered relationships and code analysis
- **Graph**: Bounded and readable; separate detailed subgraphs for large repos

### Phase 4.7: Report Formatter
- **File**: `scripts/generate-impact-report.cjs`
- **Purpose**: Generate Markdown and JSON reports
- **Validation**: JSON schema validation before writing
- **Consistency**: Both reports must contain matching data

### Phase 4.8: PR Workflow Integration
- **Purpose**: Local CLI invocation and optional GitHub Actions support
- **Permissions**: Least-privilege read-only access
- **Safety**: No source modification, PR approval, merge, or push operations

## Input Schema

```javascript
{
  // Repository and PR identification
  "repository": {
    "path": "/path/to/repo",          // Absolute repository path
    "name": "repo-name",              // Repository name
    "remote": "origin"                // Git remote name
  },
  
  // Base/target branch (confirmed target for PR)
  "base": {
    "reference": "origin/main",       // Branch name or SHA
    "sha": null                       // SHA (auto-detected if null)
  },
  
  // Head/source branch (PR source)
  "head": {
    "reference": "feature-branch",    // Branch name or SHA
    "sha": null                       // SHA (auto-detected if null)
  },
  
  // Comparison mode
  "mode": "original",                 // "original", "remediation", "consolidated"
  
  // Output directory
  "outputDir": "reports/change-impact/PR-123",
  
  // Optional: PR provider metadata
  "pr": {
    "id": 123,
    "provider": "github",
    "title": "Add customer validation",
    "description": "..."
  },
  
  // Optional: Analysis configuration
  "config": {
    "languageSupport": ["javascript", "python", "java"],
    "deepAnalysisThreshold": "major",  // Analyze deep for major/critical
    "maxContextSize": 4194304,         // 4 MB aggregate context
    "excludePatterns": ["node_modules/**", ".git/**"]
  }
}
```

## Output Schema

```json
{
  "schemaVersion": "1.0",
  "reportType": "pr-change-impact",
  "generatedAt": "2025-12-12T14:00:00Z",
  
  "repository": {
    "name": "repo-name",
    "url": "https://github.com/owner/repo",
    "prId": 123,
    "sourceBranch": "feature-branch",
    "targetBranch": "main",
    "baseSha": "abc123...",
    "headSha": "def456...",
    "mergeBaseSha": "abc123..."
  },
  
  "summary": "Added customer validation logic with database schema changes. Impact is MAJOR due to API contract change and new database migration.",
  
  "classification": {
    "level": "major",
    "confidence": "high",
    "reasoning": [
      "Public API request/response contract modified (GET /api/customers/:id now returns 'validationStatus')",
      "Database migration added (new 'validation_rules' table)",
      "Three discovered internal dependents reference the affected endpoint"
    ],
    "evidence": [
      "src/api/customer.ts (lines 45-67)",
      "src/models/customer.ts (schema change)",
      "db/migrations/20251212_add_validation.sql"
    ]
  },
  
  "changes": [
    {
      "path": "src/api/customer.ts",
      "status": "modified",
      "additions": 45,
      "deletions": 12,
      "beforeSummary": "Customer endpoint returned basic customer data",
      "afterSummary": "Customer endpoint now includes validation status and rules",
      "changeReason": "Add real-time validation checking",
      "evidence": ["GET endpoint response schema change"]
    }
  ],
  
  "impact": {
    "functional": [
      "Customers can now check validation status in real-time",
      "Validation rules are configurable per customer"
    ],
    "technical": [
      "Confirmed: AuthService dependency for new validation checks",
      "Inferred: Internal customer service consumers may need updates",
      "Risk: Backward compatibility with mobile app versions"
    ],
    "api": [
      "GET /api/customers/:id response contract changed",
      "Three discovered consumers may need updating"
    ],
    "data": [
      "New table: validation_rules (confirmed by migration)",
      "New columns: customers.validation_status, customers.validation_date"
    ],
    "security": [
      "Validation rules accessible to authenticated users",
      "No detected permission changes"
    ],
    "operational": [
      "Database migration required before deployment",
      "New configuration: VALIDATION_RULES_CACHE_TTL"
    ],
    "testing": [
      "8 tests added for validation logic",
      "Existing customer API tests may need updates"
    ]
  },
  
  "metrics": {
    "code": {
      "filesAdded": 2,
      "filesModified": 4,
      "filesDeleted": 0,
      "filesRenamed": 0,
      "linesAdded": 156,
      "linesDeleted": 28,
      "functionsChanged": 3,
      "classesChanged": 2
    },
    "dependencies": {
      "directlyChangedModules": ["src/models/customer.ts", "src/api/customer.ts"],
      "discoveredDirectDependents": 3,
      "discoveredTransitiveDependents": 8
    },
    "api": {
      "endpointsAdded": 0,
      "endpointsModified": 1,
      "endpointsRemoved": 0,
      "potentialBreakingChanges": 1
    },
    "data": {
      "tablesAdded": 1,
      "tablesModified": 1,
      "columnsAdded": 2,
      "migrationsAdded": 1
    }
  },
  
  "diagrams": {
    "technicalDependencyFlow": "graph...",  // Mermaid format
    "businessFunctionalityFlow": "graph..."  // Mermaid format
  },
  
  "risks": [
    {
      "risk": "Backward compatibility break",
      "severity": "high",
      "description": "Mobile app v1.0 may not handle new 'validationStatus' field",
      "evidence": "GET /api/customers/:id response schema changed",
      "recommendation": "Check mobile app parsing; consider feature flag for gradual rollout"
    },
    {
      "risk": "Database migration must complete successfully",
      "severity": "high",
      "description": "Customer data may be inaccessible during migration",
      "evidence": "New mandatory columns require migration",
      "recommendation": "Plan deployment window; test migration on staging"
    }
  ],
  
  "recommendations": [
    "Update mobile app consumers to handle new 'validationStatus' field",
    "Plan database migration carefully; consider zero-downtime approach",
    "Add monitoring for new validation_rules table performance",
    "Document new validation configuration options"
  ],
  
  "limitations": [
    "External API consumers outside this repository are not represented",
    "Validation performance impact cannot be determined from static analysis",
    "Client-side consumers (external mobile apps) are not analyzed"
  ],
  
  "evidence": [
    {
      "type": "file_diff",
      "source": "src/api/customer.ts",
      "lines": "45-67",
      "snippet": "..."
    }
  ]
}
```

## CLI Usage

### Phase 4.1: Collect PR Changes

```bash
node .github/skills/ai-change-impact-analysis/scripts/collect-pr-changes.cjs \
  --repo . \
  --base origin/main \
  --head HEAD \
  --output reports/change-impact/PR-123
```

**Output**: `context-package.json` containing:
- PR metadata
- Diff inventory and statistics
- Changed file list with statuses
- Merge-base information

### Phase 4.2-4.7: Generate Impact Report

```bash
node .github/skills/ai-change-impact-analysis/scripts/generate-impact-report.cjs \
  --input reports/change-impact/PR-123/context-package.json \
  --output reports/change-impact/PR-123
```

**Output**:
- `change-impact-report.md` - Human-readable report
- `change-impact-report.json` - Structured data
- `technical-impact.mmd` - Mermaid diagram
- `business-impact.mmd` - Mermaid diagram

## Configuration

Create `.github/skills/ai-change-impact-analysis/config.json`:

```json
{
  "classificationRules": {
    "minorPatterns": ["*.md", "*.txt", "comments", "formatting"],
    "majorPatterns": ["API/**", "auth/**", "db/migrations/**"],
    "criticalPatterns": ["authorization", "permission", "destructive"]
  },
  
  "supportedLanguages": ["javascript", "typescript", "python", "java", "go"],
  
  "limits": {
    "maxContextSizeBytes": 4194304,
    "maxFileSizeBytes": 1048576,
    "maxDiffLines": 10000
  },
  
  "analysisThresholds": {
    "deepAnalysisLevel": "major",
    "diagramMaxNodes": 50,
    "diagramMaxEdges": 100
  },
  
  "permissions": {
    "canModifySource": false,
    "canModifyBranches": false,
    "canModifyPR": false,
    "canMergePR": false
  }
}
```

## Safety Guarantees

✅ **Read-only operation**: No source code modifications  
✅ **Committed changes only**: Working-tree changes excluded  
✅ **Verified scope**: Base/head must be valid and verified  
✅ **Evidence-based**: All claims traceable to code or symbols  
✅ **No fabrication**: Unknown metrics marked as such  
✅ **Credential safety**: No secrets in reports or logs  
✅ **Fail-closed**: Invalid scope stops analysis with clear error  

## Testing

Run unit tests:

```bash
npm run test:change-impact
```

Test fixtures cover:
- Documentation-only changes
- Isolated internal function changes
- Public API contract modifications
- Database schema changes
- Authentication/authorization changes
- Multi-file changes with dependencies
- Missing or invalid base/head references
- Uncommitted changes
- Large files and oversized diffs

## Integration Points

- **Original Feature PR**: Compare target baseline → PR head
- **Remediation PR**: Compare feature branch → remediation PR head
- **Consolidated Report**: Compare original baseline → final PR head (with attribution)
- **GitHub Actions**: Optional workflow integration with read-only token

## References

- [CHANGE-IMPACT-REPORT-SCHEMA.md](./references/CHANGE-IMPACT-REPORT-SCHEMA.md)
- [CLASSIFICATION-RULES.md](./references/CLASSIFICATION-RULES.md)
- [IMPACT-METRICS.md](./references/IMPACT-METRICS.md)
