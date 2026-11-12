# Impact Metrics Methodology

## Overview

This document defines the metrics collected and calculated by the Change Impact Analysis Agent. All metrics emphasize:

- **Deterministic calculation** — reproducible from same repository revisions
- **Measurement transparency** — explicit status (measured, partially_measured, not_measured)
- **No fabrication** — unknown values remain unknown (not assumed to be zero)
- **Bounded analysis** — enforcement of file/context size limits
- **Evidence traceability** — all metrics linked to discoverable code/symbols

## Metric Categories

### 1. Code Metrics

Measures changes to source code artifacts.

#### 1.1 File Changes

| Metric | Definition | Calculation | Status |
|--------|-----------|-----------|--------|
| **filesAdded** | Number of new files in PR | Count committed files with status "added" | measured |
| **filesModified** | Number of changed files | Count committed files with status "modified" | measured |
| **filesDeleted** | Number of removed files | Count committed files with status "deleted" | measured |
| **filesRenamed** | Number of renamed files | Count committed files with status "renamed" | measured |
| **totalFilesChanged** | Sum of above four | filesAdded + filesModified + filesDeleted + filesRenamed | measured |

**Calculation**:
```javascript
const codeMetrics = {
  filesAdded: diffIndex.filter(f => f.status === 'added').length,
  filesModified: diffIndex.filter(f => f.status === 'modified').length,
  filesDeleted: diffIndex.filter(f => f.status === 'deleted').length,
  filesRenamed: diffIndex.filter(f => f.status === 'renamed').length
};
```

**Limitations**:
- Does not count moved files that aren't explicitly renamed
- Does not account for copy-without-modify operations

---

#### 1.2 Line Changes

| Metric | Definition | Calculation | Status |
|--------|-----------|-----------|--------|
| **linesAdded** | Number of lines added in PR | Sum of `+` lines across all file diffs | measured |
| **linesDeleted** | Number of lines deleted in PR | Sum of `-` lines across all file diffs | measured |
| **totalLinesChanged** | Sum of both | linesAdded + linesDeleted | measured |
| **netLineChange** | Net change (signed) | linesAdded - linesDeleted | measured |

**Calculation**:
```javascript
const lineCounts = diffStatistics.reduce((acc, file) => ({
  added: acc.added + file.additions,
  deleted: acc.deleted + file.deletions
}), { added: 0, deleted: 0 });

const codeMetrics = {
  linesAdded: lineCounts.added,
  linesDeleted: lineCounts.deleted,
  totalLinesChanged: lineCounts.added + lineCounts.deleted,
  netLineChange: lineCounts.added - lineCounts.deleted
};
```

**Limitations**:
- Includes comments and documentation lines
- Line-added/deleted counts may be inflated by reformatting
- Does not account for logical/semantic line changes
- Whitespace-only changes included in counts

---

#### 1.3 Symbol Changes

| Metric | Definition | Calculation | Status |
|--------|-----------|-----------|--------|
| **functionsChanged** | Number of functions/methods modified | Count distinct functions with line changes | partially_measured |
| **classesChanged** | Number of classes modified | Count distinct classes with line changes | partially_measured |
| **typesAdded** | Number of new types/interfaces | Language-aware symbol analysis | partially_measured |
| **exportedSymbolsChanged** | Exports/public symbols modified | Language-aware export analysis | partially_measured |

**Calculation** (JavaScript/TypeScript example):
```javascript
const symbolMetrics = {
  functionsChanged: extractFunctions(diffContent)
    .filter(f => isModified(f)).length,
  classesChanged: extractClasses(diffContent)
    .filter(c => isModified(c)).length,
  typesAdded: extractTypes(diffContent)
    .filter(t => t.isNew).length,
  exportedSymbolsChanged: extractExports(diffContent)
    .filter(e => isModified(e)).length
};
```

**Measurement Status**: `partially_measured`
- **Reason**: Language-specific parsing required; not all languages equally supported
- **Confidence**: High for JavaScript/TypeScript/Python; medium for Java/Go; low for others
- **Fallback**: Count from line ranges if symbol parsing unavailable

**Limitations**:
- Requires language-aware AST or regex parsing
- Comments and string literals may cause false positives
- Refactored code may be detected as modified even if semantics unchanged
- Extracted methods/classes may be missed

---

#### 1.4 Large File Detection

| Metric | Definition | Threshold |
|--------|-----------|-----------|
| **largeFilesAdded** | New files exceeding size threshold | > 10 KB per file |
| **largeFilesModified** | Existing files with substantial additions | > 5 KB of additions per file |
| **totalLargeFileImpact** | Total lines in large files | Sum of additions in large files |

**Calculation**:
```javascript
const largeFileThresholds = {
  newFile: 10 * 1024,      // 10 KB
  modification: 5 * 1024   // 5 KB additions
};

const largeFiles = diffStatistics
  .filter(file => {
    if (file.status === 'added') {
      return file.additions * avgBytesPerLine > largeFileThresholds.newFile;
    }
    if (file.status === 'modified') {
      return file.additions * avgBytesPerLine > largeFileThresholds.modification;
    }
    return false;
  })
  .map(f => ({ path: f.path, type: f.status, lines: f.additions }));
```

**Status**: `measured`

**Limitations**:
- Threshold tuning may vary by language (Python vs. Go)
- Does not distinguish code from auto-generated content
- Large data file changes treated same as code changes

---

### 2. Dependency Metrics

Measures impact on module and symbol dependencies.

#### 2.1 Directly Changed Modules

| Metric | Definition | Calculation | Status |
|--------|-----------|-----------|--------|
| **directlyChangedModules** | Source files/modules modified in PR | List of all files with "modified" or "added" status | measured |

**Calculation**:
```javascript
const directlyChangedModules = diffIndex
  .filter(f => ['added', 'modified'].includes(f.status))
  .map(f => f.path);
```

**Limitations**:
- Does not include deleted modules (already tracked separately)
- Does not distinguish production from test code

---

#### 2.2 Direct Dependents (Single Hop)

| Metric | Definition | Discovery Method | Status |
|--------|-----------|------------------|--------|
| **discoveredDirectDependents** | Modules that import/call changed modules | Symbol search, import tracing | partially_measured |

**Discovery Process**:

1. Extract public symbols from changed modules
   ```javascript
   const publicSymbols = extractExports(beforeContent);
   ```

2. Search for import statements
   ```javascript
   const importedBy = search(
     `import.*from.*${modulePath}`,
     { language: 'javascript', scope: 'repository' }
   );
   ```

3. Search for function calls
   ```javascript
   const calledBy = search(
     `${functionName}\\(`,
     { scope: 'repository' }
   );
   ```

4. Filter to committed repository files only
   ```javascript
   const directDependents = importedBy
     .concat(calledBy)
     .filter(ref => isInCommittedSet(ref));
   ```

**Status**: `partially_measured`

**Limitations**:
- Dynamic imports (`require(variable)`) not found
- Aliased imports may be missed
- String-based references not detected
- External consumers outside repository unknown
- Transitive chains not fully resolved
- Search results depend on code patterns and naming

---

#### 2.3 Transitive Dependents (Multi-Hop)

| Metric | Definition | Discovery Method | Status |
|--------|-----------|------------------|--------|
| **discoveredTransitiveDependents** | Modules that depend on direct dependents | Multi-hop import tracing | not_measured |

**Attempted Discovery**:

```javascript
const transitiveDependents = new Set();

for (const dependent of discoveredDirectDependents) {
  // Find what imports this dependent
  const secondHop = search(`import.*from.*${dependent}`);
  transitiveDependents.add(...secondHop);
  
  // Third hop, etc. (limited by complexity/performance)
}
```

**Status**: `not_measured`

**Reason**: Full transitive closure is:
- Computationally expensive (exponential growth)
- Prone to false positives from incomplete parsing
- Difficult to validate accuracy
- Less actionable than direct dependents

**Recommendation**: Stop at direct dependents; mark transitive analysis as not_measured with note that full closure is available upon request.

---

#### 2.4 Unknown Dependents

| Metric | Definition | Status |
|--------|-----------|--------|
| **potentialUnknownDependents** | Likely external consumers | inferred |
| **externalConsumers** | Confirmed external APIs/SDKs | measured |

**Indicators of Unknown Dependents**:
```javascript
const hasUnknownDependents = 
  isPublicApi(changedModule) ||
  isExportedLibrary(changedModule) ||
  isPluginInterface(changedModule) ||
  hasDocumentedClients(changedModule);
```

**Status**: `measured` (presence/absence), `not_measured` (count)

**Limitations**:
- External consumers fundamentally unmeasurable from repository alone
- Requires external tooling (API usage analytics, dependency trackers)
- Plugin/extension systems may have unmeasurable consumers

---

### 3. API Metrics

Measures changes to API contracts and public interfaces.

#### 3.1 Endpoint Changes (REST/HTTP APIs)

| Metric | Definition | Discovery Method | Status |
|--------|-----------|------------------|--------|
| **endpointsAdded** | New endpoints defined | Route/path pattern matching | partially_measured |
| **endpointsModified** | Existing endpoints changed | Endpoint signature/handler changes | partially_measured |
| **endpointsRemoved** | Endpoints deleted | Removed route definitions | partially_measured |

**Discovery** (Express/Fastify pattern):
```javascript
// Before
const beforeRoutes = extractRoutes(beforeContent);
// GET /api/users/:id, POST /api/users, etc.

// After
const afterRoutes = extractRoutes(afterContent);

// Compare
const added = afterRoutes.filter(r => !beforeRoutes.includes(r));
const removed = beforeRoutes.filter(r => !afterRoutes.includes(r));
const modified = beforeRoutes
  .filter(r => afterRoutes.includes(r))
  .filter(r => hasHandlerChanged(r));
```

**Status**: `partially_measured`

**Limitations**:
- Dynamic route generation not detected
- Mounted sub-routers may be missed
- API versioning (/v1/*, /v2/*) requires special handling
- Non-REST APIs (GraphQL, gRPC) require different parsing

---

#### 3.2 Contract Changes

| Metric | Definition | Discovery Method | Status |
|--------|-----------|------------------|--------|
| **requestSchemaChanged** | Input request format modified | Parameter/body schema comparison | partially_measured |
| **responseSchemaChanged** | Output response format modified | Return type/response schema comparison | partially_measured |
| **contractFieldsChanged** | Request/response fields added/removed/changed | Diff of schema definitions | partially_measured |

**Discovery**:
```javascript
// Extract request schema
const beforeRequest = extractRequestSchema(beforeContent);
// { userId: number, name: string }

const afterRequest = extractRequestSchema(afterContent);
// { userId: number, name: string, email: string }

// Compare
const fieldChanges = compareSchemas(beforeRequest, afterRequest);
// Added: email; Required changed: none
```

**Status**: `partially_measured`

**Limitations**:
- Implicit contracts (undocumented fields) not detected
- Dynamic field generation missed
- OpenAPI/Swagger specifications may not reflect actual code
- Type inference may be incomplete

---

#### 3.3 Breaking Changes

| Metric | Definition | Detection | Status |
|--------|-----------|-----------|--------|
| **potentialBreakingChanges** | Changes likely to break consumers | Required field removed, type changed, etc. | inferred |

**Breaking Change Indicators**:
```javascript
const breakingIndicators = [
  // Required field removed
  fieldRemoved && fieldWasRequired,
  
  // Required parameter removed
  parameterRemoved && parameterWasRequired,
  
  // Type changed (incompatible)
  typeChangedFrom('string').to('number'),
  typeChangedFrom('object').to('array'),
  
  // Enum value removed
  enumValueRemoved,
  
  // Status code changed
  statusCodeRemoved,
  
  // Authentication requirement added
  authenticationRequired && wasPublic
];
```

**Status**: `inferred`

**Limitations**:
- Cannot determine consumer compatibility
- Deprecation periods not visible in code
- Consumer workarounds not detectable
- Version-gating mechanisms invisible to static analysis

---

### 4. Data Metrics

Measures changes to data models and persistence layers.

#### 4.1 Database Schema Changes

| Metric | Definition | Discovery Method | Status |
|--------|-----------|------------------|--------|
| **tablesAdded** | New tables created | Migration/schema files | measured |
| **tablesModified** | Existing tables altered | Migration/schema files | measured |
| **tablesDeleted** | Tables dropped | Migration/schema files | measured |
| **columnsAdded** | New columns created | Column add statements | measured |
| **columnsModified** | Existing columns changed | Column alter statements | measured |
| **columnsRemoved** | Columns dropped | Column drop statements | measured |

**Discovery** (SQL migrations):
```javascript
const migrations = extractSqlMigrations(diffContent);

const schemaChanges = migrations.map(migration => ({
  type: migration.type,  // up, down
  tables: {
    added: migration.match(/CREATE TABLE (\w+)/g),
    modified: migration.match(/ALTER TABLE (\w+) (ADD|MODIFY|DROP)/g),
    deleted: migration.match(/DROP TABLE (\w+)/g)
  },
  columns: {
    added: migration.match(/ADD COLUMN (\w+)/g),
    modified: migration.match(/MODIFY COLUMN (\w+)/g),
    dropped: migration.match(/DROP COLUMN (\w+)/g)
  }
}));
```

**Status**: `measured`

**Limitations**:
- Requires explicit migration files
- ORM models without migrations not fully analyzed
- Rollback procedures not verified
- Data loss risk not calculated
- Downtime impact not estimated

---

#### 4.2 Constraints and Indexes

| Metric | Definition | Status |
|--------|-----------|--------|
| **constraintsAdded** | New primary keys, foreign keys, unique constraints | measured |
| **constraintsRemoved** | Constraints dropped | measured |
| **indexesAdded** | New database indexes | measured |
| **indexesModified** | Existing indexes changed | measured |

**Status**: `measured` (from migration files)

**Limitations**:
- Performance impact not analyzed
- Index utilization not simulated
- Query plan changes not estimated

---

#### 4.3 Data Model Changes (ORM/Schema)

| Metric | Definition | Discovery Method | Status |
|--------|-----------|------------------|--------|
| **modelsAdded** | New entity/model types | Class/type definitions | partially_measured |
| **modelsModified** | Model schema changes | Field additions/removals | partially_measured |
| **fieldsAdded** | Model fields added | Type annotation changes | partially_measured |
| **fieldTypesChanged** | Field types modified | Type annotation comparison | partially_measured |

**Status**: `partially_measured`

**Limitations**:
- Requires language-specific parsing
- Dynamic models not detected
- Serialization/deserialization logic not analyzed
- Validation rules not extracted

---

### 5. Risk Indicators

Measures presence of code in sensitive domains.

#### 5.1 Security-Sensitive Files

| Category | File Patterns | Risk Level |
|----------|--------------|-----------|
| Authentication | `auth/**`, `**/auth.ts`, `**/login/**` | High |
| Authorization | `permission/**`, `access/**`, `acl/**` | High |
| Cryptography | `crypto/**`, `**/encrypt.ts`, `**/hash.ts` | High |
| Secrets | `**/secret.ts`, `**/credentials/**`, `config/**` | Critical |
| Validation | `**/validate.ts`, `**/validator/**` | Medium |
| Database | `db/migrations/**`, `**/db.ts` | High |
| API Endpoints | `api/**`, `routes/**` | Medium |

**Detection**:
```javascript
const sensitiveFiles = changedFiles
  .filter(f => SECURITY_SENSITIVE_PATTERNS.some(p => f.matches(p)))
  .map(f => ({
    path: f.path,
    riskLevel: determineSensitivity(f.path),
    changes: f.additions + f.deletions
  }));
```

**Status**: `measured`

---

#### 5.2 Configuration and Infrastructure Changes

| Indicator | Detection |
|-----------|-----------|
| **configurationFiles** | `.env*`, `config/**`, `settings/**` |
| **infrastructureAsCode** | `terraform/**`, `cloudformation/**`, `docker/**` |
| **deploymentChanges** | `.github/workflows/**`, `Jenkinsfile`, `deployment/**` |
| **securityPolicies** | `SECURITY.md`, `.npmrc`, `.gitignore` |

**Status**: `measured` (presence)

**Limitations**:
- Deployment impact not assessed
- Secret presence not verified (secrets should not be in repository)
- Infrastructure cost impact not calculated

---

#### 5.3 Public Interface Changes

| Indicator | Detection | Status |
|-----------|-----------|--------|
| **publicApiChanged** | Changes to exported modules/types | measured |
| **packageJsonChanged** | Dependency updates | measured |
| **schemaFilesChanged** | GraphQL, OpenAPI, proto files | measured |

**Status**: `measured`

---

## Reporting Metric Status

All metrics must include explicit measurement status:

```json
{
  "metrics": {
    "code": {
      "filesAdded": 2,
      "filesModified": 4,
      "filesDeleted": 0,
      "linesAdded": 156,
      "linesDeleted": 28,
      "measurementStatus": "measured"
    },
    
    "dependencies": {
      "directlyChangedModules": ["src/models/customer.ts"],
      "discoveredDirectDependents": 3,
      "discoveredTransitiveDependents": 8,
      "potentialUnknownDependents": true,
      "measurementStatus": "partially_measured",
      "limitations": "External consumers not analyzed; dynamic requires not detected"
    },
    
    "api": {
      "endpointsModified": 1,
      "potentialBreakingChanges": 1,
      "measurementStatus": "partially_measured",
      "limitations": "Client-side consumers not verified"
    },
    
    "data": {
      "tablesAdded": 1,
      "columnsAdded": 2,
      "measurementStatus": "measured"
    }
  }
}
```

---

## Aggregation and Rollup

### Risk Score Calculation (Informational)

While deterministic, risk scores are supplementary to classification:

```javascript
const riskScore = (
  (filesChanged * 0.1) +
  (linesChanged / 100 * 0.15) +
  (securityFilesTouched * 2.0) +
  (apiChanges * 1.5) +
  (breakingChanges * 3.0) +
  (unknownDependents ? 0.5 : 0)
) / 100; // Normalize 0-10

const riskLevel = riskScore > 7 ? 'high' : riskScore > 4 ? 'medium' : 'low';
```

**Status**: `inferred`

**Use**: Supplementary to classification; never sole basis for decisions.

---

## Limitations and Assumptions

### Universal Limitations

1. **Repository-centric**: External consumers unmeasurable
2. **Static analysis**: Runtime behavior unknown
3. **Single-language**: Polyglot repositories partially supported
4. **Committed changes only**: Working-tree changes excluded
5. **Text-based parsing**: Requires accessible source code
6. **No external data**: Cannot use telemetry, logs, or runtime metrics

### Language-Specific Limitations

| Language | Status | Limitations |
|----------|--------|-----------|
| JavaScript/TypeScript | Good | Dynamic requires, spread operators, plugin systems |
| Python | Good | Dynamic imports, metaclasses, monkey-patching |
| Java | Fair | Reflection, classpath scanning, annotation processing |
| Go | Fair | Interface satisfaction, build tags, cgo |
| C/C++ | Poor | Include guards, preprocessor conditionals, linking |
| Ruby | Fair | Metaprogramming, dynamic class definition |
| PHP | Fair | Autoloading, dynamic namespaces |

---

## Validation Checklist

Before reporting metrics:

- [ ] All metrics have explicit `measurementStatus`
- [ ] No zero assumed for unmeasured values
- [ ] Limitations documented for each partial/unmeasured metric
- [ ] Thresholds and calculations documented
- [ ] Evidence linked to metric values
- [ ] Confidence levels justify measurement status
- [ ] Large files/diffs flagged
- [ ] External dependencies clearly marked unknown

---

## References

- [CLASSIFICATION-RULES.md](./CLASSIFICATION-RULES.md)
- [CHANGE-IMPACT-REPORT-SCHEMA.md](./CHANGE-IMPACT-REPORT-SCHEMA.md)
