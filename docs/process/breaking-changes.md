# MCP-AQL Breaking Change Policy

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-14

## Abstract

This document defines how breaking changes are handled in the MCP-AQL specification, including change classification, deprecation procedures, migration requirements, and communication standards.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Change Classification](#2-change-classification)
3. [Deprecation Policy](#3-deprecation-policy)
4. [Migration Guides](#4-migration-guides)
5. [Communication](#5-communication)

---

## 1. Introduction

### 1.1 What is a Breaking Change?

A breaking change is any modification to the MCP-AQL specification that could cause existing conforming implementations to:

- Fail to compile or build
- Produce errors at runtime
- Behave differently than documented
- Become non-conformant with the specification

### 1.2 Why This Policy Exists

MCP-AQL serves as a foundation for interoperability between AI models and MCP servers. Stability is critical because:

- **Adapter Authors** depend on stable interfaces to build reliable implementations
- **AI Models** rely on consistent behavior for effective operation discovery
- **End Users** expect existing integrations to continue working after updates

This policy ensures that necessary evolution of the specification happens in a predictable, well-communicated manner that minimizes disruption to the ecosystem.

### 1.3 Scope

This policy applies to:

- The core MCP-AQL specification
- Required operations (currently only `introspect`)
- CRUDE endpoint definitions
- Protocol types and response structures
- Introspection response formats

---

## 2. Change Classification

### 2.1 Breaking Changes (Major Version Bump)

Breaking changes require a major version increment (e.g., 1.x.x to 2.0.0) and trigger the full deprecation and migration process.

**Examples of Breaking Changes:**

| Change Type | Example |
|-------------|---------|
| Removing required operations | Removing the `introspect` operation |
| Incompatible request structure changes | Changing `operation` field to `op` |
| Incompatible response structure changes | Restructuring the success/error envelope |
| Removing CRUDE endpoints | Eliminating the EXECUTE endpoint |
| Changing introspection response format | Altering the structure of OperationDetails |
| Removing required fields from protocol types | Removing `endpoint` from OperationInfo |
| Changing field types incompatibly | Changing `required` from boolean to string |
| Changing endpoint routing rules | Requiring different operation-to-endpoint mappings |

### 2.2 Non-Breaking Changes (Minor Version Bump)

Non-breaking changes add new capabilities without affecting existing implementations. These require a minor version increment (e.g., 1.0.x to 1.1.0).

**Examples of Non-Breaking Changes:**

| Change Type | Example |
|-------------|---------|
| Adding new optional operations | New `validate` operation on READ endpoint |
| Adding new optional parameters | Adding `timeout` parameter to existing operations |
| Adding new fields to responses (additive) | Adding `deprecated` flag to OperationInfo |
| New optional features | Field selection support |
| Deprecating features (without removal) | Marking an operation as deprecated |
| Adding new optional protocol types | New TypeInfo subtypes |
| Extending enum values | Adding new endpoint mode options |

### 2.3 Patch Changes (Patch Version Bump)

Patch changes do not affect implementation behavior. These require a patch version increment (e.g., 1.0.0 to 1.0.1).

**Examples of Patch Changes:**

| Change Type | Example |
|-------------|---------|
| Clarifications that don't change behavior | Explaining existing edge case handling |
| Typo fixes | Correcting spelling in specification text |
| Example corrections | Fixing incorrect JSON in examples |
| Documentation improvements | Adding diagrams or additional context |
| Formatting changes | Restructuring sections for clarity |
| Non-normative additions | Adding implementation notes |

### 2.4 Classification Decision Tree

```
Is existing conforming code affected?
    |
    No --> Is new functionality added?
    |          |
    |         Yes --> MINOR version bump
    |          |
    |         No --> PATCH version bump
    |
   Yes --> MAJOR version bump (Breaking Change)
```

---

## 3. Deprecation Policy

### 3.1 Deprecation Period

All breaking changes MUST go through a deprecation period before removal:

- **Minimum Duration:** 1 minor version OR 3 months, whichever is longer
- **Maximum Duration:** Until the next major version release

For example, if a feature is deprecated in version 1.2.0, it:
- MUST remain available through at least version 1.3.0
- MUST remain available for at least 3 months after 1.2.0 release
- MAY be removed in version 2.0.0

### 3.2 Deprecation Communication

When a feature is deprecated, the following communication is required:

**In Specification Documents:**

```markdown
> **DEPRECATED:** This feature is deprecated as of version X.Y.Z and will be
> removed in version A.0.0. Use [alternative] instead.
```

**In Introspection Responses:**

Implementations SHOULD include deprecation information in introspection:

```json
{
  "operation": {
    "name": "legacy_operation",
    "endpoint": "READ",
    "deprecated": true,
    "deprecationMessage": "Use 'new_operation' instead. Will be removed in v2.0.0.",
    "deprecatedSince": "1.2.0",
    "removalVersion": "2.0.0"
  }
}
```

### 3.3 Deprecation Warning Fields

When implementing deprecation warnings in introspection, include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deprecated` | boolean | Yes | Whether the item is deprecated |
| `deprecationMessage` | string | Yes | Human-readable explanation and alternative |
| `deprecatedSince` | string | No | Version when deprecation began |
| `removalVersion` | string | No | Version when item will be removed |

### 3.4 Deprecation Stages

1. **Announced:** Feature marked deprecated in specification and changelog
2. **Warning:** Implementations begin returning deprecation warnings
3. **Final Notice:** Last minor version before removal
4. **Removed:** Feature removed in new major version

---

## 4. Migration Guides

### 4.1 Requirement

Every breaking change MUST include a migration guide that enables implementers to update their code.

### 4.2 Migration Guide Structure

Migration guides MUST follow this structure:

```markdown
# Migration Guide: [Brief Description]

**From:** Version X.Y.Z
**To:** Version A.B.C
**Breaking Change:** [Category from Section 2.1]

## Summary

[One paragraph explaining what changed and why]

## What's Changing

[Detailed explanation of the change]

### Before (Version X.Y.Z)

[Code example showing old behavior]

### After (Version A.B.C)

[Code example showing new behavior]

## Migration Steps

1. [Step-by-step instructions]
2. [Include code transformations where applicable]
3. [Note any automated migration tools if available]

## Timeline

- **Deprecated:** Version X.Y.Z (YYYY-MM-DD)
- **Removal:** Version A.0.0 (estimated YYYY-MM-DD)

## Questions

For questions about this migration, [contact information or issue tracker link].
```

### 4.3 Migration Guide Location

Migration guides MUST be:

- Published in `docs/migrations/` directory
- Named with format: `vX-to-vY-[brief-description].md`
- Linked from the changelog entry
- Referenced in deprecation warnings

### 4.4 Example Migration Guide

```markdown
# Migration Guide: Introspection Response Restructure

**From:** Version 1.x
**To:** Version 2.0.0
**Breaking Change:** Changing introspection response format

## Summary

Version 2.0.0 restructures the introspection response to provide better
type safety and support for new features. The `data` wrapper now includes
explicit type discriminators.

## What's Changing

### Before (Version 1.x)

{
  "success": true,
  "data": {
    "operations": [...]
  }
}

### After (Version 2.0.0)

{
  "success": true,
  "data": {
    "type": "operation_list",
    "items": [...]
  }
}

## Migration Steps

1. Update response parsing to handle the new `type` field
2. Change array access from `data.operations` to `data.items`
3. Add type checking based on `data.type` value

## Timeline

- **Deprecated:** Version 1.3.0 (2026-04-01)
- **Removal:** Version 2.0.0 (estimated 2026-07-01)
```

---

## 5. Communication

### 5.1 Changelog Format

Breaking changes MUST be prominently documented in the changelog using this format:

```markdown
## [2.0.0] - YYYY-MM-DD

### BREAKING CHANGES

- **[Category]:** Brief description of breaking change
  - Migration guide: [link to migration guide]
  - Deprecation notice: Deprecated in v1.X.0

### Removed

- [List of removed features that were previously deprecated]

### Changed

- [List of changed behaviors]
```

### 5.2 Announcement Requirements

**For Major Versions (Breaking Changes):**

- Changelog entry with full details
- Migration guide(s) published
- Announcement in repository README or main documentation
- Minimum 30 days notice before release
- Release notes highlighting all breaking changes

**For Minor Versions:**

- Changelog entry listing new features and deprecations
- Documentation updates for new features
- Deprecation warnings added to relevant sections

**For Patch Versions:**

- Changelog entry listing fixes and clarifications

### 5.3 Changelog Entry Examples

**Breaking Change Entry:**

```markdown
## [2.0.0] - 2026-07-01

### BREAKING CHANGES

- **Introspection Response:** The operation list response structure has changed.
  The `operations` array is now `items` within a typed wrapper.
  - Migration guide: [v1-to-v2-introspection-response.md](migrations/v1-to-v2-introspection-response.md)
  - Deprecation notice: Deprecated in v1.3.0 (2026-04-01)

- **Required Fields:** The `mcpTool` field in OperationDetails is now required
  rather than optional.
  - Migration guide: [v1-to-v2-required-fields.md](migrations/v1-to-v2-required-fields.md)
  - Deprecation notice: Deprecated in v1.4.0 (2026-05-01)
```

**Deprecation Entry:**

```markdown
## [1.3.0] - 2026-04-01

### Deprecated

- **Introspection Response Structure:** The current `data.operations` array
  format is deprecated. Version 2.0.0 will use a typed wrapper structure.
  See [v1-to-v2-introspection-response.md](migrations/v1-to-v2-introspection-response.md)
  for migration guidance.
```

### 5.4 Pre-Release Versions

Pre-release versions (alpha, beta, release candidates) MAY contain breaking changes without following the full deprecation process. However:

- Breaking changes between pre-releases SHOULD still be documented
- Migration guidance SHOULD still be provided
- Users of pre-release versions accept the risk of breaking changes

---

## References

- [MCP-AQL Specification v1.0.0-draft](../versions/v1.0.0-draft.md)
- [CRUDE Pattern Specification](../crude-pattern.md)
- [Introspection Specification](../introspection.md)
