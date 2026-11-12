# Classification Rules

## Overview

This document defines the transparent, evidence-based rules used to classify PR changes into impact levels: **Minor**, **Moderate**, **Major**, or **Critical**.

The classification system emphasizes:
- **Evidence-backed decisions** — all classifications grounded in specific code/file/symbol changes
- **Clear reasoning** — transparent criteria applied consistently
- **Conservative confidence** — uncertainty explicitly labeled and documented
- **Fail-safe degradation** — unknown/ambiguous changes default to higher classifications

## Classification Levels

### MINOR

**Definition**: Isolated, low-risk changes with no meaningful impact on the contract, behavior, or system capability.

**Characteristics**:
- No functional behavior change visible to callers
- No API/contract modification
- No data model change
- No dependency addition or removal
- No test modification (unless comment-only)

**Signals**:
- Changes only to documentation, comments, or docstrings
- Formatting, whitespace, or linting fixes
- Local variable renames that don't affect module exports
- Test comment updates
- Dependency version bumps that are backward-compatible (patch-level for semver)
- Configuration file formatting changes

**Examples**:
- Add JSDoc comment to internal method
- Fix typo in README.md
- Reformat JavaScript code (prettier, eslint --fix)
- Rename local loop variable from `i` to `idx`
- Update test timeout values without changing test logic
- Add console.log in development-only code
- Update .gitignore, .editorconfig
- Add GitHub Actions workflow for non-production processes

**Minimum Evidence Required**:
- File path(s) with change status
- Change summary explaining the modification

**Confidence**: High (very low risk of impact)

---

### MODERATE

**Definition**: Localized, contained changes with behavior or implementation modifications that don't affect external contracts or create broader dependencies.

**Characteristics**:
- Isolated function/method behavior change
- New or modified local helper/utility function
- Test addition for existing code
- Internal validation rule addition
- Single-location logic modification
- No public API change
- No schema/model change
- No new external dependency
- No cross-module behavior change

**Signals**:
- Added new private method or internal function
- Modified single method logic (not called by changed files)
- New internal validation rule or guard
- Database query optimization (same result, better performance)
- New test cases added
- Import added for internal-only dependency
- Configuration parameter addition with safe default
- Single-file performance optimization
- New private class or internal type definition

**Examples**:
- Add new validation rule to user input handler
- Optimize database query in single repository method
- Add helper function used in single module
- Add new boolean flag with `false` default
- Improve error message specificity
- Add timeout to internal polling function
- New internal service class
- Add new private enum value

**Minimum Evidence Required**:
- File paths affected (usually 1-3 files)
- Functions/methods changed with line ranges
- Summary of behavior change
- Evidence that change is localized

**Confidence**: Medium-High (low-to-moderate risk, well-contained)

---

### MAJOR

**Definition**: Significant functional, architectural, or interface changes that affect consumers, dependencies, or system architecture.

**Characteristics**:
- Public API contract modification (request/response format, parameter semantics)
- Architectural or pattern change
- Authentication/authorization mechanism modification (not addition; already authenticated)
- Database schema change (tables, columns, constraints)
- New public interface, endpoint, or exported symbol
- Public class or module replacement/refactoring
- Removal of existing public functionality
- New transitive dependency (added to package.json, pom.xml)
- Configuration change affecting runtime behavior
- Error handling strategy change
- Test coverage modification (tests removed or requirements changed)

**Signals**:
- Modified API endpoint request/response schema
- Added table to database schema
- Changed function signature of public method
- Added new public method or endpoint
- Removed existing public method or endpoint
- Changed return type of exported function
- Added required parameter to public method (breaking)
- Changed data model fields
- New authentication/session handling logic
- Modified access control rules (for existing roles)
- Migration file added to database
- New configuration environment variable required
- Dependency version bump with breaking changes
- Changed error types or error handling flow

**Examples**:
- GET /api/customers/:id response now includes new `validationStatus` field
- Added new table `validation_rules` with database migration
- Modified User model to add `lastValidatedAt` column
- Changed login endpoint to require new `mfa_token` parameter
- Removed deprecated authentication method
- Added new public API endpoint
- Changed admin dashboard to show new permission level
- Public utility function signature changed
- Database connection pooling strategy changed

**Minimum Evidence Required**:
- Changed file paths (usually 3+ files, including API/model/migration files)
- Specific API changes or database schema changes
- List of discovered direct dependents (APIs, modules)
- Change reasoning
- Impact on external consumers (APIs, front-end, mobile apps)

**Confidence**: Medium (moderate risk; requires consumer review and coordination)

---

### CRITICAL

**Definition**: Changes with severe, system-wide, or irreversible consequences for security, data integrity, availability, or backward compatibility.

**Characteristics**:
- Authorization/permission bypass or weakening (actual security issue)
- Destructive database migration or data loss risk
- Widespread breaking API changes affecting multiple consumers
- Security credential/secret exposure or handling changes
- Complete feature removal without deprecation period
- Systemic architectural overhaul
- Changes to cryptographic or security-sensitive algorithms
- Changes affecting data retention, compliance, or privacy
- Major version bump forced by this change
- Potential for widespread customer impact

**Signals**:
- Code removing authorization checks
- Password/token handling logic changes
- Encryption algorithm changes
- Data migration without rollback plan
- Removing columns/tables without deprecation
- Changing security validation rules (loosening)
- Changes to OAuth/SAML/LDAP/SSO implementation
- API breaking changes affecting 10+ known consumers
- Database schema change requiring data transformation
- Changes to audit logging or compliance tracking
- New dependency with known security vulnerabilities
- Removal of API versioning or deprecation support

**Examples**:
- Removing authorization check from admin endpoint
- Changing password hashing algorithm without migration
- Dropping table without deprecation period
- Removing entire feature area (authentication, billing, etc.)
- Modifying OAuth token validation logic
- Removing API v1 entirely (customers still on v1)
- Disabling HTTPS requirement
- Removing rate limiting
- Changing data encryption keys without re-encryption plan

**Minimum Evidence Required**:
- Clear explanation of security/integrity/availability impact
- Identified affected consumers and systems
- Risk assessment with severity justification
- Recommended mitigation or rollback plan
- Affected file paths and specific code changes

**Confidence**: Medium-High (risks are serious; requires special handling)

---

## Classification Logic

### Decision Flow

```
Is this change documentation-only?
└─ YES → MINOR
└─ NO  → Next question

Is this change localized to single function/method, no external dependencies, no contracts modified?
└─ YES → MODERATE
└─ NO  → Next question

Does this change modify:
  - Public API contract (endpoints, method signatures, response format)
  - Database schema (tables, columns, constraints)
  - Architecture or public interfaces
  - Authentication mechanism (new role, permission, session type)
  - Configuration affecting runtime behavior
  - Dependencies or transitive modules
└─ YES → MAJOR
└─ NO  → Next question

Does this change:
  - Introduce authorization bypass or security weakness
  - Risk data loss or integrity (destructive migration, removal)
  - Force major version bump
  - Break 10+ known external consumers
  - Weaken security validation
  - Expose secrets or credentials
  - Affect compliance/privacy
└─ YES → CRITICAL
└─ UNCLEAR/AMBIGUOUS → Escalate to MAJOR or CRITICAL (fail-safe)
```

### Escalation Rules

When evidence is ambiguous, uncertain, or insufficient:

1. **Escalate if any CRITICAL signals present** → Classify as CRITICAL
2. **Escalate if evidence conflicts** → Classify one level higher
3. **Escalate if external consumers unknown** → Classify as MAJOR minimum
4. **Escalate if transitive dependencies unknown** → Classify as MAJOR minimum
5. **Escalate if security impact unclear** → Classify as CRITICAL (security-first)

### Confidence Levels

**High Confidence**:
- Multiple direct evidence items
- Changes are straightforward (code clearly shows impact)
- No ambiguity in scope or consequences
- Internal changes only or well-documented public changes
- Example: Adding JSDoc → MINOR (High)

**Medium Confidence**:
- Some direct evidence, some inferred impact
- Change affects multiple modules but impact is localized
- External consumers likely but not all identified
- Example: Modifying API endpoint → MAJOR (Medium)

**Low Confidence**:
- Limited evidence; impact unclear or partially measured
- Change touches sensitive areas but exact consequences unknown
- External consumer landscape unmapped
- Example: Modifying OAuth token validation → CRITICAL (Low)

---

## Measurement and Reporting

### Evidence Matrix

For each classification, collect and report:

| Item | MINOR | MODERATE | MAJOR | CRITICAL |
|------|-------|----------|-------|----------|
| Files changed | 1-2 | 2-5 | 3+ | Variable |
| Reasoning items | 1 | 1-2 | 2-3 | 3+ |
| Evidence items | 1+ | 2+ | 2+ | 3+ |
| Dependencies discovered | N/A | 0 | 1+ | Variable |
| External impact assessed | No | No | Yes | Yes |
| Risk identified | No | No | Possible | Yes |
| Limitations noted | No | No | Yes | Yes |

### Reporting Template

```json
{
  "classification": {
    "level": "major",
    "confidence": "medium",
    "reasoning": [
      "Public API endpoint GET /api/customers/:id response contract modified",
      "New database table validation_rules added with required migration",
      "Three discovered internal consumers reference modified endpoint"
    ],
    "evidence": [
      "src/api/customer.ts (lines 45-67) - Response schema change",
      "src/models/customer.ts (lines 12-18) - Database model modification",
      "db/migrations/20251212_add_validation.sql - Migration file",
      "src/services/account.ts (line 89) - Discovered consumer of GET endpoint",
      "src/services/profile.ts (line 156) - Discovered consumer of GET endpoint"
    ],
    "limitations": [
      "External mobile app consumers not analyzed (outside repository)",
      "Runtime performance impact cannot be determined from static analysis",
      "Backward compatibility with specific client versions not verified"
    ]
  }
}
```

---

## Configurable Patterns

Implementations may define file/pattern matching for faster classification:

### Pattern Examples

```javascript
{
  "patterns": {
    "minorPatterns": [
      "^.*\\.md$",                    // Markdown files
      "^.*\\.txt$",                   // Text files
      "^\\.(gitignore|editorconfig)$",// Config files
      "^.*\\/\\..*$",                 // Dotfiles
      "src/components/.*\\.test\\..*$" // Test files
    ],
    
    "majorPatterns": [
      "^src\\/api\\/.*\\.ts$",        // API layer
      "^src\\/auth\\/.*\\.ts$",       // Auth layer
      "^db\\/migrations\\/.*\\.sql$", // Database migrations
      "^src\\/models\\/.*\\.ts$"      // Data models
    ],
    
    "criticalPatterns": [
      "^src\\/auth\\/.*\\.ts$",
      "^src\\/security\\/.*\\.ts$",
      "^src\\/crypto\\/.*\\.ts$",
      "^db\\/migrations\\/.*destructive.*$"
    ]
  }
}
```

**Note**: Pattern matching is a heuristic only; always apply judgment to specific changes.

---

## Common Pitfalls

### ❌ Under-Classifying

- **Pitfall**: Assuming test-only changes are MINOR
  - **Reality**: Test coverage removal or major test changes → MAJOR
  
- **Pitfall**: Assuming "internal" changes can't be MAJOR
  - **Reality**: Public APIs call internal modules; internal changes may affect external contracts

- **Pitfall**: Assuming dependency bumps are always safe
  - **Reality**: Transitive dependency changes may introduce security issues → MAJOR/CRITICAL

### ❌ Over-Classifying

- **Pitfall**: Classifying all API changes as CRITICAL
  - **Reality**: API version-gated changes or backward-compatible additions → MAJOR

- **Pitfall**: Classifying all database changes as CRITICAL
  - **Reality**: Adding optional columns with safe defaults → MAJOR, not CRITICAL

### ✅ Correct Classification

- **Be evidence-driven**: Point to specific code and files
- **Label uncertainty**: Mark inferred impacts vs. confirmed facts
- **Document limitations**: Explain what you couldn't analyze
- **Escalate conservatively**: When in doubt, escalate one level
- **Think about consumers**: Always ask "Who depends on this?"

---

## Integration with Impact Analysis

Classification output feeds into:

1. **Risk Assessment** — CRITICAL classifications trigger risk documentation
2. **Testing Strategy** — MAJOR/CRITICAL require expanded test coverage
3. **Deployment Strategy** — CRITICAL changes need special deployment planning
4. **Team Notification** — CRITICAL changes notify security/architecture teams
5. **Rollback Planning** — CRITICAL changes require documented rollback procedure

---

## Example Classifications

### Example 1: Documentation Update

```
Files: README.md, CONTRIBUTING.md
Status: modified

Classification: MINOR
Reasoning:
  - No code behavior change
  - No public interface modification
Evidence:
  - README.md: Added example usage section
  - CONTRIBUTING.md: Updated development setup instructions
Confidence: High
```

### Example 2: New Validation Rule

```
Files: src/validators/customer.ts, src/validators/customer.test.ts
Status: modified, modified

Classification: MODERATE
Reasoning:
  - New validation rule added to existing validator
  - Localized to single module
  - No existing tests removed
  - Public method signature unchanged
Evidence:
  - src/validators/customer.ts (lines 45-67): New isValidAge() function
  - src/validators/customer.test.ts (lines 120-145): Tests added
Confidence: Medium (depends on whether this validator is called by public APIs)
```

### Example 3: API Contract Change

```
Files: src/api/user.ts, src/models/user.ts, db/migrations/20251212_user_fields.sql
Status: modified, modified, added

Classification: MAJOR
Reasoning:
  - GET /api/users/:id response format changed
  - New required database column added
  - Three discovered API consumers
Evidence:
  - src/api/user.ts (lines 23-38): Response object includes new lastLogin field
  - src/models/user.ts (lines 12-18): User schema modified
  - db/migrations/20251212_user_fields.sql: New lastLogin column added
  - src/services/auth.ts (line 89): Discovered consumer
  - src/services/admin.ts (line 156): Discovered consumer
Confidence: Medium (external consumers unknown)
Limitations:
  - External API consumers not analyzed
  - Mobile app compatibility not verified
```

### Example 4: Security-Relevant Change

```
Files: src/auth/jwt.ts, src/auth/session.ts
Status: modified, modified

Classification: CRITICAL
Reasoning:
  - JWT signature validation logic modified
  - Session token handling changed
  - Potential security impact on authentication
Evidence:
  - src/auth/jwt.ts (lines 45-67): Signature validation algorithm changed
  - src/auth/session.ts (lines 12-30): Session store invalidation logic
Confidence: Low (security impact not fully clear from static analysis)
Limitations:
  - Runtime security validation not possible
  - Cryptographic impact requires expert review
Recommendation: Security review required before merge
```

---

## Validation Checklist

Before reporting classification, verify:

- [ ] Classification level supported by evidence
- [ ] Confidence level justified by evidence strength
- [ ] Reasoning items are specific and concrete
- [ ] Evidence references actual file paths and line ranges
- [ ] Limitations documented explicitly
- [ ] No assumptions about runtime behavior
- [ ] No guesses about external consumers
- [ ] Escalation rules applied correctly
- [ ] Report includes actionable next steps

---

## References

- [CHANGE-IMPACT-REPORT-SCHEMA.md](./CHANGE-IMPACT-REPORT-SCHEMA.md)
- [IMPACT-METRICS.md](./IMPACT-METRICS.md)
