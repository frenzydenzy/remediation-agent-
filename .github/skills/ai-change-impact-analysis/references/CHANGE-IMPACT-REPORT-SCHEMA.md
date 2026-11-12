# Change Impact Report Schema

## Version: 1.0

This document defines the JSON schema for Change Impact Analysis reports. This schema is used for both data exchange and validation.

## Root Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Change Impact Analysis Report",
  "type": "object",
  "required": [
    "schemaVersion",
    "reportType",
    "generatedAt",
    "repository",
    "summary",
    "classification",
    "changes",
    "impact",
    "metrics"
  ],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "enum": ["1.0"],
      "description": "Schema version for backward compatibility"
    },
    
    "reportType": {
      "type": "string",
      "enum": ["pr-change-impact", "branch-impact", "deployment-impact"],
      "description": "Type of impact analysis report"
    },
    
    "generatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of report generation"
    },
    
    "repository": { "$ref": "#/definitions/Repository" },
    "summary": { "type": "string" },
    "classification": { "$ref": "#/definitions/Classification" },
    "changes": { "$ref": "#/definitions/Changes" },
    "impact": { "$ref": "#/definitions/Impact" },
    "metrics": { "$ref": "#/definitions/Metrics" },
    "diagrams": { "$ref": "#/definitions/Diagrams" },
    "risks": { "$ref": "#/definitions/Risks" },
    "recommendations": { "$ref": "#/definitions/Recommendations" },
    "limitations": { "$ref": "#/definitions/Limitations" },
    "evidence": { "$ref": "#/definitions/Evidence" }
  },
  
  "definitions": {
    "Repository": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": { "type": "string" },
        "url": { "type": "string", "format": "uri" },
        "prId": { "type": ["integer", "null"] },
        "provider": { "type": ["string", "null"], "enum": ["github", "gitlab", "bitbucket", null] },
        "sourceBranch": { "type": "string" },
        "targetBranch": { "type": "string" },
        "baseSha": { "type": "string", "pattern": "^[0-9a-f]{40}$" },
        "headSha": { "type": "string", "pattern": "^[0-9a-f]{40}$" },
        "mergeBaseSha": { "type": "string", "pattern": "^[0-9a-f]{40}$" }
      }
    },
    
    "Classification": {
      "type": "object",
      "required": ["level", "confidence", "reasoning", "evidence"],
      "properties": {
        "level": {
          "type": "string",
          "enum": ["minor", "moderate", "major", "critical"],
          "description": "Impact classification level"
        },
        "confidence": {
          "type": "string",
          "enum": ["high", "medium", "low"],
          "description": "Confidence in the classification"
        },
        "reasoning": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Evidence-backed reasoning for classification"
        },
        "evidence": {
          "type": "array",
          "items": { "type": "string" },
          "description": "File paths, line numbers, or identifiers supporting the classification"
        },
        "limitations": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Known limitations in analysis that affect confidence"
        }
      }
    },
    
    "Changes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["path", "status", "beforeSummary", "afterSummary"],
        "properties": {
          "path": { "type": "string", "description": "Repository-relative file path" },
          "status": {
            "type": "string",
            "enum": ["added", "modified", "deleted", "renamed"],
            "description": "Change type"
          },
          "previousPath": { "type": ["string", "null"], "description": "Previous path if renamed" },
          "additions": { "type": "integer", "minimum": 0 },
          "deletions": { "type": "integer", "minimum": 0 },
          "beforeSummary": { "type": "string", "description": "Summary of before implementation" },
          "afterSummary": { "type": "string", "description": "Summary of after implementation" },
          "changeReason": { "type": ["string", "null"], "description": "Why this file was changed" },
          "impactLevel": {
            "type": "string",
            "enum": ["minor", "moderate", "major", "critical"],
            "description": "Impact of this specific change"
          },
          "evidence": { "type": "array", "items": { "type": "string" } },
          "dependents": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    
    "Impact": {
      "type": "object",
      "properties": {
        "functional": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Functional behavior changes"
        },
        "technical": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Technical implementation changes with certainty labels"
        },
        "api": {
          "type": "array",
          "items": { "type": "string" },
          "description": "API contract changes and affected consumers"
        },
        "data": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Data model changes"
        },
        "security": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Security-relevant changes"
        },
        "operational": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Operational concerns (deployments, configs, migrations)"
        },
        "testing": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Test coverage and testing implications"
        },
        "performance": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Performance considerations"
        }
      }
    },
    
    "Metrics": {
      "type": "object",
      "properties": {
        "code": { "$ref": "#/definitions/CodeMetrics" },
        "dependencies": { "$ref": "#/definitions/DependencyMetrics" },
        "api": { "$ref": "#/definitions/ApiMetrics" },
        "data": { "$ref": "#/definitions/DataMetrics" },
        "riskIndicators": { "$ref": "#/definitions/RiskIndicators" }
      }
    },
    
    "CodeMetrics": {
      "type": "object",
      "properties": {
        "filesAdded": { "type": "integer", "minimum": 0 },
        "filesModified": { "type": "integer", "minimum": 0 },
        "filesDeleted": { "type": "integer", "minimum": 0 },
        "filesRenamed": { "type": "integer", "minimum": 0 },
        "linesAdded": { "type": "integer", "minimum": 0 },
        "linesDeleted": { "type": "integer", "minimum": 0 },
        "functionsChanged": { "type": "integer", "minimum": 0 },
        "classesChanged": { "type": "integer", "minimum": 0 },
        "commentChanges": { "type": ["integer", "null"], "minimum": 0 },
        "largeFiles": { "type": "array", "items": { "type": "string" } },
        "measurementStatus": {
          "type": "string",
          "enum": ["measured", "partially_measured", "not_measured"],
          "description": "Measurement completeness for code metrics"
        }
      }
    },
    
    "DependencyMetrics": {
      "type": "object",
      "properties": {
        "directlyChangedModules": { "type": "array", "items": { "type": "string" } },
        "discoveredDirectDependents": { "type": "integer", "minimum": 0 },
        "discoveredTransitiveDependents": { "type": "integer", "minimum": 0 },
        "potentialUnknownDependents": { "type": "boolean" },
        "externalConsumers": { "type": "boolean" },
        "measurementStatus": {
          "type": "string",
          "enum": ["measured", "partially_measured", "not_measured"],
          "description": "Measurement completeness for dependency metrics"
        }
      }
    },
    
    "ApiMetrics": {
      "type": "object",
      "properties": {
        "endpointsAdded": { "type": "integer", "minimum": 0 },
        "endpointsModified": { "type": "integer", "minimum": 0 },
        "endpointsRemoved": { "type": "integer", "minimum": 0 },
        "potentialBreakingChanges": { "type": "integer", "minimum": 0 },
        "contractFieldsChanged": { "type": "array", "items": { "type": "string" } },
        "discoveredConsumers": { "type": "array", "items": { "type": "string" } },
        "measurementStatus": {
          "type": "string",
          "enum": ["measured", "partially_measured", "not_measured"]
        }
      }
    },
    
    "DataMetrics": {
      "type": "object",
      "properties": {
        "tablesAdded": { "type": "integer", "minimum": 0 },
        "tablesModified": { "type": "integer", "minimum": 0 },
        "tablesDeleted": { "type": "integer", "minimum": 0 },
        "columnsAdded": { "type": "integer", "minimum": 0 },
        "columnsModified": { "type": "integer", "minimum": 0 },
        "columnsRemoved": { "type": "integer", "minimum": 0 },
        "constraintsChanged": { "type": "integer", "minimum": 0 },
        "migrationsAdded": { "type": "integer", "minimum": 0 },
        "measurementStatus": {
          "type": "string",
          "enum": ["measured", "partially_measured", "not_measured"]
        }
      }
    },
    
    "RiskIndicators": {
      "type": "object",
      "properties": {
        "securitySensitiveFilesTouched": { "type": "array", "items": { "type": "string" } },
        "configurationChanges": { "type": "array", "items": { "type": "string" } },
        "infrastructureChanges": { "type": "array", "items": { "type": "string" } },
        "publicInterfaceChanges": { "type": "array", "items": { "type": "string" } },
        "backwardCompatibilityRisks": { "type": "array", "items": { "type": "string" } }
      }
    },
    
    "Diagrams": {
      "type": "object",
      "properties": {
        "technicalDependencyFlow": {
          "type": "string",
          "description": "Mermaid diagram of changed components and dependencies"
        },
        "businessFunctionalityFlow": {
          "type": "string",
          "description": "Mermaid diagram of business workflow changes"
        },
        "dataflowDiagram": {
          "type": ["string", "null"],
          "description": "Optional Mermaid diagram of data flows"
        }
      }
    },
    
    "Risks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["risk", "severity", "description"],
        "properties": {
          "risk": { "type": "string", "description": "Risk title" },
          "severity": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"],
            "description": "Risk severity"
          },
          "category": {
            "type": "string",
            "enum": ["security", "performance", "compatibility", "reliability", "operational", "unknown"],
            "description": "Risk category"
          },
          "description": { "type": "string" },
          "evidence": { "type": "array", "items": { "type": "string" } },
          "probability": {
            "type": "string",
            "enum": ["certain", "likely", "possible", "unlikely"],
            "description": "Probability of risk occurring"
          },
          "mitigation": { "type": "string" },
          "recommendation": { "type": "string" }
        }
      }
    },
    
    "Recommendations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["recommendation"],
        "properties": {
          "recommendation": { "type": "string" },
          "category": {
            "type": "string",
            "enum": ["review", "testing", "documentation", "deployment", "monitoring", "rollback"],
            "description": "Recommendation category"
          },
          "priority": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"],
            "description": "Priority of action"
          },
          "effort": {
            "type": "string",
            "enum": ["trivial", "small", "medium", "large"],
            "description": "Estimated effort to address"
          }
        }
      }
    },
    
    "Limitations": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Known analysis gaps and unavailable information"
    },
    
    "Evidence": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "source"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["file_diff", "import", "call", "schema", "config", "test", "documentation"],
            "description": "Type of evidence"
          },
          "source": { "type": "string", "description": "File or location" },
          "lines": { "type": "string", "description": "Line range (e.g., '45-67')" },
          "snippet": { "type": "string", "description": "Code excerpt" },
          "confidence": {
            "type": "string",
            "enum": ["high", "medium", "low"],
            "description": "Confidence in this evidence"
          }
        }
      }
    }
  }
}
```

## Validation Rules

1. **schemaVersion** must match report generator version
2. **baseSha** and **headSha** must be valid 40-character hex SHA-1 hashes
3. **Classification level** must be supported by evidence in reasoning array
4. **Changes** array must not be empty
5. **Impact** section must have at least one impact category populated
6. **Metrics** must include measurement status for each category
7. **Risks** and **Recommendations** must not contain duplicates
8. **Evidence** items must reference actual file paths in the changed set
9. **generatedAt** must be recent (within 1 hour recommended)
10. **Limitations** must document known analysis gaps

## Backward Compatibility

- Version 1.0 is the current release
- Future versions will maintain `schemaVersion` field for identification
- New optional fields will be added without breaking existing parsers
- Enum values will not change; new values will be added for new behaviors

## Field Definitions

### Classification Level

| Level | Threshold | Examples |
|-------|-----------|----------|
| **minor** | No contract/behavior impact | Comments, formatting, local variable renames |
| **moderate** | Localized behavior change | Single function behavior change, isolated validation rule |
| **major** | Significant functional/architectural change | API contract change, auth redesign, public interface change |
| **critical** | Severe security/data/availability/compatibility consequences | Destructive migration, authorization bypass risk, widespread breaking change |

### Measurement Status

- **measured**: Metric calculated with high confidence from available data
- **partially_measured**: Metric partially available (e.g., internal dependencies found, external unknown)
- **not_measured**: Metric unavailable or uncalculated (must be documented in limitations)

### Confidence Levels

- **high**: Evidence is strong and unambiguous; expected to be accurate
- **medium**: Evidence is available but interpretation has some uncertainty
- **low**: Limited evidence; interpretation has significant uncertainty or gaps

### Impact Severity

- **critical**: Must address before deployment
- **high**: Strongly recommended to address before deployment
- **medium**: Recommended to address; may be acceptable with mitigations
- **low**: Informational; addressed through normal processes

## Example Report

See `../../examples/change-impact-report-example.json` for a complete example.
