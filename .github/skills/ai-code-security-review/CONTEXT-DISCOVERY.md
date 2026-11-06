---
name: Context Discovery for Automated Review
description: "Discovers and collects context files for code review: Java imports, Maven/Gradle configs, related tests, and utilities referenced by changed code."
---

# Java-Aware Context Discovery

This skill enhances the basic collector to automatically discover related context files that are critical for accurate code review.

## Capabilities

### 1. Java Import Discovery

Statically parses Java source files to identify all local imports:

```java
import com.example.service.UserService;      // Included
import java.sql.PreparedStatement;            // Excluded (standard library)
import javax.persistence.Entity;              // Excluded (vendor library)
```

**Algorithm:**
- Regex pattern: `/^\s*import\s+(?:static\s+)?([\w.]+)\s*;/gm`
- Extract fully-qualified class/package names
- Attempt to resolve to repository files
- Include only local project imports

### 2. Maven & Gradle Dependency Discovery

Auto-detects project dependency and build files:

- `pom.xml` (Maven)
- `build.gradle` / `build.gradle.kts` (Gradle)
- `settings.gradle`
- `.mvn/` directory
- `gradle/` directory

These provide context about:
- Dependencies and versions
- Build plugins
- Test configuration
- Compiler settings

### 3. Related Test Discovery

Identifies test files matching the changed source:

**Patterns:**
- `src/test/java/com/example/UserServiceTest.java` (Maven convention)
- `src/test/java/UserServiceTest.java` (simple convention)
- `test/UserService*.java` (alternative)

**Matching logic:**
1. Extract base filename from changed file (e.g., `UserService.java` → `UserService`)
2. Search test directories for files named:
   - `{Name}Test.java`
   - `Test{Name}.java`
   - `{Name}Tests.java`
3. Include matching files

### 4. Related Utilities & Shared Code

Identifies files imported by changed files and files that import the changed files.

### 5. Configuration Files

Includes relevant configuration:
- `application.properties` / `application.yml`
- `.env` / `.env.example`
- `config/` directories

---

## Usage

### Automatic Discovery

The collector automatically discovers context when processing Java files:

```powershell
node .github/skills/ai-code-security-review/scripts/collect-review.cjs `
  --repo /path/to/repo `
  --base main
```

**Output includes:**
- Changed files (from three-dot diff)
- Automatically discovered context (imports, configs, tests)
- Explicit context (from `--context` flags)
- Discovery limitations and gaps

### Manual Context Specification

Override automatic discovery or add additional context:

```powershell
node .github/skills/ai-code-security-review/scripts/collect-review.cjs `
  --repo /path/to/repo `
  --base main `
  --context src/config/SecurityConfig.java `
  --context tests/integration/DatabaseTest.java
```

---

## Discovery Limitations

1. **Static Analysis Only**
   - Cannot resolve dynamic imports via reflection
   - ClassLoader.forName("...") patterns not detected
   - Dependency injection frameworks may obscure relationships

2. **Package-Level Imports**
   - `import com.example.*;` includes all matching packages
   - May include more files than strictly necessary

3. **Transitive Dependencies**
   - Does not follow multi-level imports
   - First-level imports only

4. **Build-Time Generated Code**
   - Annotations (@Entity, @Autowired) not parsed
   - Generated sources not discovered

5. **External Libraries**
   - Vendor/framework dependencies excluded
   - Only local project code included

---

## Configuration

The collector enforces these limits:

```javascript
MAX_DISCOVERED_FILES = 32;          // Maximum auto-discovered context files
MAX_FILE_BYTES = 256 * 1024;        // Each file max 256 KiB
MAX_CONTEXT_BYTES = 4 * 1024 * 1024; // Total context max 4 MiB
MAX_PATCH_BYTES = 4 * 1024 * 1024;  // Diff patch max 4 MiB
```

If limits are exceeded, the collector reports:
- Which files were omitted
- Why (size, count, or format)
- Recommendations for reducing scope

---

## Output Format

The collector returns enhanced `context-package.json`:

```json
{
  "schemaVersion": 1,
  "state": "ready",
  "files": [
    { "path": "src/UserSearch.java", "status": "M", "before": {...}, "after": {...} }
  ],
  "requestedContext": [
    { "path": "src/SecurityConfig.java", "reason": "Explicitly requested", "before": {...}, "after": {...} }
  ],
  "discoveredContext": [
    {
      "path": "src/main/java/com/example/service/UserService.java",
      "reasons": ["Imported by changed file src/UserSearch.java"],
      "before": {...},
      "after": {...}
    },
    {
      "path": "pom.xml",
      "reasons": ["Maven project configuration for Java code"],
      "before": {...},
      "after": {...}
    },
    {
      "path": "src/test/java/com/example/UserSearchTest.java",
      "reasons": ["Related test file (naming convention match)"],
      "before": {...},
      "after": {...}
    }
  ],
  "discoveryLimitations": [
    "Static import and naming-convention discovery is heuristic; possible callers and dynamic imports may be missed.",
    "Only the first 32 of 45 discovered paths were included due to MAX_DISCOVERED_FILES limit."
  ],
  "localChangesExcluded": true,
  "limitations": [...]
}
```

---

## Reviewer Responsibilities

When using discovered context:

1. **Understand Why Each File Was Included**
   - Review the `reasons` array
   - Validate the discovery heuristic was correct

2. **Distinguish Discovered vs. Requested Context**
   - Discovered: auto-included based on import/naming/configuration
   - Requested: explicitly specified via `--context`
   - This distinction may matter for interpreting findings

3. **Document Assumptions**
   - Assumed imports are correct
   - Assumed test files are relevant
   - State if discovery logic seems wrong

4. **Report Missing Context**
   - If an important file was missed, note it as a validation gap
   - Do not assume it was reviewed if omitted

---

## Implementation Details

### Java Import Pattern

```regex
/^\s*import\s+(?:static\s+)?([\w.]+)\s*;/gm
```

Captures:
- Leading whitespace (ignored)
- `import` keyword
- Optional `static` keyword
- Fully-qualified name (package.Class or package.*)
- Trailing semicolon

**Examples:**
- `import java.sql.Connection;` → `java.sql.Connection` (excluded as stdlib)
- `import com.example.UserService;` → `com.example.UserService` (included)
- `import static com.example.Constants.MAX_SIZE;` → `com.example.Constants` (included)

### Import Resolution

For each discovered import:

1. **Normalize the path**
   - `com.example.service.UserService` → `src/main/java/com/example/service/UserService.java`
   - Try `src/main/java`, `src`, and root
   - Support both Maven and Gradle conventions

2. **Validate existence**
   - Check if file exists in Git
   - Check if it's a regular blob (not submodule/symlink)

3. **Include if found**
   - Add to `discoveredContext` with reason
   - Note import source

### Test Discovery

For each changed source file:

1. **Extract base name**
   - `src/main/java/com/example/UserSearch.java` → `UserSearch`

2. **Generate patterns**
   - `**/UserSearchTest.java`
   - `**/TestUserSearch.java`
   - `**/UserSearchTests.java`

3. **Search in test directories**
   - `src/test/java/**`
   - `test/**`
   - Any directory containing `test` or `spec` in the path

4. **Include matches**
   - Add to `discoveredContext` with reason

---

## Testing

### Unit Tests

```powershell
node --test tests/context-discovery.test.cjs
```

Tests cover:
- Java import parsing accuracy
- Maven/Gradle file detection
- Test file naming convention matching
- Path resolution correctness
- Discovery limit enforcement
- Omission reporting

### Acceptance Testing

Use the `.test-artifacts` fixture:

```powershell
node tests/agent-acceptance.cjs prepare-java
```

This prepares a Java project with:
- Changed UserSearch.java
- Imported UserService.java
- Related UserSearchTest.java
- pom.xml with dependencies
- Pre-existing vulnerabilities in unrelated files

---

## Performance Considerations

- **Startup:** Single pass through changed files
- **Import resolution:** Linear search through tracked files
- **Overall:** < 100ms for typical projects (< 500 files)

For very large monorepos:
1. Limit discovery to relevant module paths
2. Use explicit `--context` for complex relationships
3. Consider splitting large Java projects

---

## Future Enhancements

- [ ] Gradle dependency resolution (build.gradle.kts parsing)
- [ ] Spring Framework @Autowired relationship discovery
- [ ] AspectJ weaving-related file detection
- [ ] Kotlin source support
- [ ] Multi-module Maven project handling

