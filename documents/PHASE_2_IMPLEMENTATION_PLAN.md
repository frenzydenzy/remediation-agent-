# Phase 2 Implementation Plan: Context Acquisition Enhancement

## Overview

Implement Java-aware context discovery to automatically identify and include related context files (Java imports, Maven/Gradle configs, test files) for more accurate code review.

## Confirmed Approach

✅ **Implementation**: Create new `context-discovery.cjs` module (keep existing `collect-review.cjs` unchanged)  
✅ **Java Parser**: Regex-based static analysis  
✅ **Build Detection**: Full Maven/Gradle detection  
✅ **Test Discovery**: All naming patterns  
✅ **Limits**: Enforce all limits (32 files, 256 KiB, 4 MiB)  
✅ **Output**: Detailed reasons for each discovered file  

---

## Deliverables

### 1. `context-discovery.cjs` Module

**Location:** `.github/skills/ai-code-security-review/scripts/context-discovery.cjs`

**Exports:**
- `discoverContext({ repo, base, files, context })` - Main discovery function
- Returns enhanced context with:
  - `discoveredContext` - Array of auto-discovered files with reasons
  - `discoveryLimitations` - Warnings about discovery limits/heuristics
  - `localChangesExcluded` - Always true

**Functions:**
1. `parseJavaImports(content)` - Extract imports from Java file
2. `resolveImportPath(packageName, repo)` - Find .java file for import
3. `discoverMavenGradle(repo)` - Find build configs
4. `discoverTestFiles(sourcePath, repo)` - Find related test files
5. `discoverImportedBy(sourcePath, repo)` - Find files importing this file
6. `enforceDiscoveryLimits(discovered)` - Apply limits, report omissions

### 2. Unit Tests

**Location:** `tests/context-discovery.test.cjs`

**Test Cases:**
- Java import parsing (various import formats)
- Maven/Gradle detection (various directory structures)
- Test file discovery (naming conventions)
- Size limit enforcement
- File count limit enforcement
- Aggregate size limit enforcement

### 3. Integration Tests

**Location:** `tests/context-discovery-integration.cjs`

**Test Cases:**
- Real Java project context discovery
- End-to-end discovery with all patterns

---

## Implementation Steps

### Step 1: Create context-discovery.cjs Module

**Functions:**

1. **parseJavaImports(content)**
   - Input: Java file content (string)
   - Regex: `/^\s*import\s+(?:static\s+)?([\w.]+)\s*;/gm`
   - Returns: Set of fully-qualified import names
   - Excludes: java.*, javax.*, sun.*, com.sun.*

2. **resolveImportPath(packageName, repo)**
   - Input: Package name (e.g., "com.example.service.UserService"), repo path
   - Logic:
     - Try Maven structure: `src/main/java/{package}.java`
     - Try Gradle structure: `src/main/java/{package}.java`
     - Try flat structure: `src/{package}.java`
     - Check Git for existence
   - Returns: Relative path or null

3. **discoverMavenGradle(repo)**
   - Search for:
     - `pom.xml` (Maven root)
     - `build.gradle`, `build.gradle.kts` (Gradle)
     - `settings.gradle` (Gradle multi-project)
     - `.mvn/` directory (Maven wrapper)
     - `gradle/` directory (Gradle wrapper)
   - Returns: Array of found build files

4. **discoverTestFiles(sourcePath, repo)**
   - Input: Changed source file path (e.g., "src/main/java/com/example/User.java")
   - Logic:
     - Extract base name: "User"
     - Search patterns in test directories:
       - `{Name}Test.java`
       - `Test{Name}.java`
       - `{Name}Tests.java`
       - `{Name}TestCase.java`
     - Check: `src/test/java/`, `test/`, `tests/`
   - Returns: Array of matching test files

5. **discoverImportedBy(sourcePath, repo)**
   - Input: File path (e.g., "src/main/java/com/example/User.java")
   - Logic:
     - Find all Java files in repo
     - Check each for imports matching this file
     - Limit to direct imports only (single level)
   - Returns: Array of files importing this file

6. **enforceDiscoveryLimits(discovered)**
   - Constants:
     - MAX_DISCOVERED_FILES = 32
     - MAX_FILE_BYTES = 256 * 1024
     - MAX_CONTEXT_BYTES = 4 * 1024 * 1024
   - Logic:
     - Check each file size (per MAX_FILE_BYTES)
     - Check aggregate (per MAX_CONTEXT_BYTES)
     - Limit count (per MAX_DISCOVERED_FILES)
     - Record omissions with reasons
   - Returns: Limited array + array of omitted with reasons

### Step 2: Integrate with collect-review.cjs

**Integration Points:**

Modify `collect-review.cjs` to:
1. Import `discoverContext` from `context-discovery.cjs`
2. After collecting `requestedContext`, call:
   ```javascript
   const discovered = discoverContext({
     repo, base, files: changes, context
   });
   ```
3. Add to output:
   ```javascript
   discoveredContext: discovered.discovered,
   discoveryLimitations: discovered.limitations,
   ```

### Step 3: Write Unit Tests

**test/context-discovery.test.cjs:**

```javascript
// Test parseJavaImports
// Test resolveImportPath
// Test discoverMavenGradle
// Test discoverTestFiles
// Test enforceDiscoveryLimits
```

### Step 4: Write Integration Tests

**tests/context-discovery-integration.test.cjs:**

```javascript
// Test on sample Java project
// Verify imports discovered
// Verify test files found
// Verify build configs included
```

---

## Testing Strategy

### Unit Tests (Run first)
- Parse Java imports from various formats
- Resolve import paths (Maven/Gradle structures)
- Detect build configurations
- Find related test files
- Enforce size limits

### Integration Tests (Run on sample project)
- Use `.test-artifacts/sample-java-project/`
- Run full discovery pipeline
- Verify all categories discovered
- Check output format matches schema

### Acceptance Criteria

✅ Java import parsing regex works correctly  
✅ Maven/Gradle configs auto-detected  
✅ Test files discovered using all patterns  
✅ Size limits enforced with clear reporting  
✅ Output includes discoveredContext array  
✅ Each file has "reasons" array explaining why included  
✅ discoveryLimitations reported when limits hit  
✅ Unit tests pass (100% coverage)  
✅ Integration tests pass on sample project  
✅ No false positives (stdlib/vendor imports excluded)  

---

## Success Criteria (Phase 2 Complete)

✅ `context-discovery.cjs` implemented and tested  
✅ All Java import patterns recognized  
✅ Maven/Gradle detection working  
✅ Test file discovery functional  
✅ Discovery limits enforced  
✅ Enhanced context-package.json output  
✅ Unit tests: 100% pass  
✅ Integration tests: 100% pass  
✅ Documentation complete  
✅ Ready for Phase 3  

---

## Timeline

- **Code Implementation:** 4-6 hours
- **Unit Testing:** 2-3 hours
- **Integration Testing:** 2-3 hours
- **Validation & Docs:** 1-2 hours
- **Total:** 9-14 hours (1-2 days)

---

## Risk Mitigation

**Risk:** Large Java projects may hit discovery limits  
**Mitigation:** Report omissions clearly; allow manual --context override

**Risk:** Import resolution may fail for unusual project structures  
**Mitigation:** Document supported Maven/Gradle conventions; report failures

**Risk:** Test discovery patterns may not cover all naming conventions  
**Mitigation:** Support custom patterns via --test-pattern flag (future)

---

## Next Phase (Phase 3)

After Phase 2 is complete:
- Enhanced Validation & Analysis
- Findings report generation
- Severity classification

