# DollhouseMCP Element Naming Convention Handoff

## Context

This document summarizes decisions made in the MCPAQL/spec repository regarding element file naming conventions. These decisions should be adopted in DollhouseMCP to maintain consistency, especially since MCP-AQL adapters will be integrated as a DollhouseMCP element type.

**Source:** MCPAQL/spec session on 2026-01-26
**Related Spec Issues:**
- MCPAQL/spec#61 - Adapter Element Type specification
- MCPAQL/spec#62 - Plugin Interface specification
- MCPAQL/spec#63 - Universal Adapter Runtime specification

---

## The Problem

Currently, DollhouseMCP element files are named by their element name only (e.g., `creative-writer.md`). This creates several issues:

1. **Ambiguity when sharing** - Is `creative-writer.md` a persona, skill, template, agent, or something else?
2. **Search difficulty** - Cannot glob for all files of a specific type
3. **Scalability concerns** - As element types grow (potentially to dozens or hundreds), disambiguation becomes critical
4. **Directory dependence** - File only makes sense within its directory context

Additionally, element type is not consistently specified in YAML front matter metadata, requiring directory inspection to determine type.

---

## The Solution

### 1. File Naming Convention

Adopt the pattern: **`{name}-{type}.md`**

| Element Type | Current Pattern | New Pattern |
|--------------|-----------------|-------------|
| Persona | `creative-writer.md` | `creative-writer-persona.md` |
| Skill | `code-review.md` | `code-review-skill.md` |
| Template | `meeting-notes.md` | `meeting-notes-template.md` |
| Agent | `task-runner.md` | `task-runner-agent.md` |
| Memory | `project-notes.yaml` | `project-notes-memory.yaml` |
| Ensemble | `full-stack-dev.md` | `full-stack-dev-ensemble.md` |
| **Adapter** (new) | n/a | `github-api-adapter.md` |

### 2. Explicit Type in Metadata

All elements MUST include a `type` field in YAML front matter:

```yaml
---
name: creative-writer
type: persona              # REQUIRED - explicit type identification
version: "1.0.0"
description: "A creative writing assistant"
# ...
---
```

### 3. Source of Truth

- **Metadata is authoritative** - The `name` and `type` fields in YAML front matter are the source of truth
- **Filename is for convenience** - Aids human identification and tooling (glob, search)
- **On divergence** - Use metadata values, emit warning

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Self-describing** | `creative-writer-persona.md` tells you everything without opening |
| **Shareable** | File is meaningful even outside directory context |
| **Searchable** | `find . -name "*-persona.md"` finds all personas |
| **Glob-friendly** | `*-adapter.md`, `*-skill.md`, etc. |
| **Scalable** | Works whether you have 6 element types or 600 |
| **Unambiguous** | `creative-writer-adapter.md` vs `creative-writer-persona.md` |

---

## Why Not Double-Dot Extension?

We considered `{name}.{type}.md` (e.g., `creative-writer.persona.md`) but rejected it because:

1. **Security concern** - Double extensions are used in masquerading attacks (`file.txt.exe`)
2. **User confusion** - Less sophisticated users may be suspicious of double extensions
3. **Dash is natural** - `name-type.md` reads naturally and is unambiguous

---

## Related Files Convention

For elements with associated files (tests, examples, etc.), use the same name prefix:

```
personas/
├── creative-writer-persona.md           # The element
├── creative-writer-persona-tests.yaml   # Tests for this element
└── creative-writer-persona-examples.md  # Usage examples

adapters/
├── github-api-adapter.md
├── github-api-adapter-tests.yaml
├── github-api-adapter-openapi.yaml      # Source spec
└── github-api-adapter-examples.md
```

---

## Implementation Tasks for DollhouseMCP

### Issues to Create

1. **Adopt `{name}-{type}.md` naming convention for all elements**
   - Update documentation
   - Update element creation tools/wizards
   - Update validation to warn on non-conforming names

2. **Require `type` field in all element YAML front matter**
   - Update `IElementMetadata` interface to make `type` required
   - Update element parsers to validate `type` presence
   - Update element serialization to always include `type`

3. **Add divergence detection and warning**
   - On element load, compare filename to metadata
   - Emit warning if `{name}-{type}.md` doesn't match metadata
   - Optional strict mode to reject mismatched files

4. **Migration tooling**
   - Provide command to rename existing elements to new convention
   - `dollhouse migrate-names` or similar
   - Should be non-destructive (preview mode)

5. **Add adapter element type**
   - New element type for MCP-AQL adapters
   - Follows same patterns as other elements
   - Integrates with portfolio system

### Validation Rules

```typescript
// Pseudocode for validation
function validateElementNaming(filePath: string, metadata: IElementMetadata): Warning[] {
  const warnings: Warning[] = [];
  const filename = path.basename(filePath);
  const expectedFilename = `${metadata.name}-${metadata.type}.md`;

  if (filename !== expectedFilename) {
    warnings.push({
      level: 'warning',
      message: `Filename "${filename}" doesn't match expected "${expectedFilename}" based on metadata`,
      suggestion: `Consider renaming to "${expectedFilename}"`
    });
  }

  if (!metadata.type) {
    warnings.push({
      level: 'error',
      message: 'Element metadata missing required "type" field',
      suggestion: 'Add type: <element-type> to YAML front matter'
    });
  }

  return warnings;
}
```

---

## Glob Patterns Reference

```bash
# Find all elements of a specific type
*-persona.md
*-skill.md
*-template.md
*-agent.md
*-memory.yaml
*-ensemble.md
*-adapter.md

# Find element and related files
creative-writer-persona*
github-api-adapter*

# Find all test files
*-tests.yaml

# Find all elements (any type)
*-persona.md *-skill.md *-template.md *-agent.md *-ensemble.md *-adapter.md
```

---

## Timeline Recommendation

1. **Phase 1: Documentation & Tooling** - Update docs, add migration tool
2. **Phase 2: New Elements** - All new elements use new convention
3. **Phase 3: Warnings** - Emit warnings for old-style names
4. **Phase 4: Migration** - Migrate existing portfolio elements
5. **Phase 5: Enforcement** - Strict mode available (optional)

---

## Questions for DollhouseMCP Team

1. Should migration be automatic or user-initiated?
2. What's the deprecation timeline for old naming convention?
3. Should we support both conventions indefinitely with preference for new?
4. How should collection/portfolio sync handle renamed files?

---

## References

- MCPAQL/spec#61 - Adapter Element Type specification (includes naming convention)
- [Harvard Data Management - File Naming](https://datamanagement.hms.harvard.edu/plan-design/file-naming-conventions)
- [Helm Chart Conventions](https://gist.github.com/jjmartres/26eb0cd5f9a928089b4b9d0f87473dda) - Kubernetes naming patterns
- [Google Style Guide - Filenames](https://developers.google.com/style/filenames)
