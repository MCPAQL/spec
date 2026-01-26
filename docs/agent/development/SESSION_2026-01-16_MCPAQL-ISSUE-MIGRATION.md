# Session Notes: MCP-AQL Issue Migration & PR #296 Completion

**Date:** Friday, January 16, 2026
**Focus:** Issue migration to MCPAQL organization, PR #296 fixes, dangerous operations specification

## Session Summary

This session completed the migration of MCP-AQL protocol issues from DollhouseMCP to the new MCPAQL organization repositories, fixed PR #296, and established cross-referencing patterns for managing issues across repositories.

## Work Completed

### 1. PR #296 - Protocol Comparison Documentation

**Fixed Issues (per claudebot review):**
- Standardized AQL definition to "Advanced Agent API Adapter Query Language"
- Fixed tool count discrepancy (standardized to "40+")
- Fixed token count references (standardized to "~30,000")
- Bumped version to 1.3.0

**Additional Fix:**
- Increased performance test threshold in `MemoryManager.triggers.performance.test.ts` from 350ms to 700ms (Windows Node 20.x was hitting 584ms)

**Status:** Merged to develop branch

### 2. MCPAQL Organization Issue Migration

Created **14 spec issues** in MCPAQL/spec:
| Spec # | Feature | DollhouseMCP # |
|--------|---------|----------------|
| #35 | Structured Error Codes | #298 |
| #36 | Server-side Aggregations | #309 |
| #37 | Cursor-based Pagination | #299 |
| #38 | Dry-run Mode | #310 |
| #39 | ETag Versioning | #300 |
| #40 | Notifications | #311 |
| #41 | Request IDs / Tracing | #301 |
| #42 | Computed Fields | #312 |
| #43 | Streaming Responses | #302 |
| #44 | Relationship Queries | #303 |
| #45 | ADR: GraphQL Format | #150 |
| #46 | Partial Success in Batch | #304 |
| #47 | GraphQL Specification Docs | #157 |
| #48 | Schema Versioning | #305 |
| #49 | Dangerous Operation Classification | #318 (new) |

Created **5 adapter-generator issues** in MCPAQL/adapter-generator:
| AG # | Feature | DollhouseMCP # |
|------|---------|----------------|
| #8 | Epic: Adapter Generator | #152 |
| #9 | Schema Generator (GraphQL) | #153 |
| #10 | Adapter Compiler | #154 |
| #11 | Policy Engine Integration | #155 |
| #12 | Adapter Registry | #156 |

### 3. Cross-Referencing System

- Added comments to all 19 DollhouseMCP issues linking to their MCPAQL counterparts
- Created `MCPAQL/spec/docs/ISSUE_MAPPING.md` tracking all cross-references
- Established bidirectional linking pattern for future issues

### 4. Dangerous Operations Specification

Created new issues for dangerous operation classification:
- **MCPAQL/spec#49** - Protocol specification for danger levels and hook-based blocking
- **DollhouseMCP#318** - Gatekeeper implementation

Key concepts:
- 5-level danger classification (Safe → Forbidden)
- Hook-based programmatic blocking (like Claude Code's dangerous git operations)
- Policy-driven automatic lockdown without manual confirmation

### 5. Implementation Guide Issue

Created **MCPAQL/spec#34** for adding documentation on adapting MCP-AQL to other domains.

## Files Changed in This Session

### DollhouseMCP Repository

- `docs/architecture/mcp-aql/PROTOCOL_COMPARISON.md` - Fixed per review feedback
- `tests/unit/MemoryManager.triggers.performance.test.ts` - Increased threshold

### MCPAQL/spec Repository

- `docs/ISSUE_MAPPING.md` - Created and updated with all mappings

## Documentation to Migrate to MCPAQL/spec

The following DollhouseMCP documentation should be adapted for the MCPAQL spec:

### High Priority (Core Spec Content)

| Source File | Target Location | Notes |
|-------------|-----------------|-------|
| `docs/architecture/mcp-aql/PROTOCOL_COMPARISON.md` | `spec/docs/guides/protocol-comparison.md` | Excellent reference, needs DollhouseMCP-specific parts removed |
| `docs/architecture/mcp-aql/INTROSPECTION.md` | `spec/docs/introspection.md` | Core protocol feature |
| `docs/architecture/mcp-aql/ENDPOINT_MODES.md` | `spec/docs/endpoint-modes.md` | CRUDE vs Single mode |
| `docs/architecture/mcp-aql/OPERATIONS.md` | `spec/docs/operations.md` | Operation patterns |
| `docs/architecture/mcp-aql/DESIGN_DECISIONS.md` | `spec/docs/adr/` | Architecture decisions |

### Implementation Patterns (Reference Only)

| Source File | Purpose |
|-------------|---------|
| `src/handlers/mcp-aql/MCPAQLHandler.ts` | Main handler pattern |
| `src/handlers/mcp-aql/IntrospectionResolver.ts` | Introspection implementation |
| `src/handlers/mcp-aql/OperationRouter.ts` | Routing table pattern |
| `src/handlers/mcp-aql/OperationSchema.ts` | Schema-driven dispatch |
| `src/handlers/mcp-aql/Gatekeeper*.ts` | Policy engine pattern |
| `src/handlers/mcp-aql/UnifiedEndpoint.ts` | Single endpoint mode |
| `src/server/tools/MCPAQLTools.ts` | Tool registration with annotations |

### Session Notes to Reference

| File | Contains |
|------|----------|
| `SESSION_2026-01-04_MCP-AQL-PROTOCOL-DESIGN.md` | Protocol design principles, feature tiers |
| `SESSION_2026-01-04_MCP-AQL-ECOSYSTEM-ISSUES.md` | Gap analysis, initial issue creation |

## Next Session Recommendations

### 1. Spec Documentation Migration

- Copy and adapt the core documentation files to MCPAQL/spec
- Remove DollhouseMCP-specific references
- Add conformance requirements and test cases

### 2. Schema Definition

- Create formal JSON Schema or TypeScript definitions for:
  - Operation request/response formats
  - Introspection response structure
  - Error response format
  - Danger level enum

### 3. Conformance Test Suite

- Define required tests for MCP-AQL conformance
- Port relevant tests from DollhouseMCP as examples

### 4. Adapter Generator Scaffolding

- Set up MCPAQL/adapter-generator project structure
- Define adapter template format
- Create first example adapter

## Claude Code Bug Filed

**Issue:** [anthropics/claude-code#16295](https://github.com/anthropics/claude-code/issues/16295)
- `/mcp` command displays tool annotations shifted by one position
- Server sends correct annotations, but display shows off-by-one error

## Open Questions

1. Should we close the DollhouseMCP MCP-AQL issues after spec issues are fully fleshed out, or keep them open as "implementation tracking"?
2. What's the release timeline for MCPAQL spec v1.0.0?
3. Should the adapter-generator be a CLI tool, library, or both?

---

## Next Session: Order of Operations

### Phase 1: Start in MCPAQL/spec

**Working directory:** `/Users/mick/Developer/Organizations/MCPAQL/spec`

```
1. Review current spec repo structure
2. Create proper directory structure for docs:
   spec/
   ├── docs/
   │   ├── versions/         (spec versions - already exists)
   │   ├── guides/           (developer guides)
   │   ├── adr/              (architecture decisions)
   │   └── reference/        (schemas, formats)
   └── schemas/              (formal JSON/TypeScript schemas)
```

### Phase 2: Copy & Adapt Core Documents

**Source:** DollhouseMCP `docs/architecture/mcp-aql/`
**Target:** MCPAQL/spec `docs/`

| Order | Source | Target | Adaptation Needed |
|-------|--------|--------|-------------------|
| 1 | `OVERVIEW.md` | `docs/overview.md` | Minimal - already generic |
| 2 | `INTROSPECTION.md` | `docs/introspection.md` | Remove DollhouseMCP examples, add conformance requirements |
| 3 | `ENDPOINT_MODES.md` | `docs/endpoint-modes.md` | Generalize, add "MUST/SHOULD" requirements |
| 4 | `OPERATIONS.md` | `docs/operations.md` | Abstract patterns, remove element-specific examples |
| 5 | `PROTOCOL_COMPARISON.md` | `docs/guides/protocol-comparison.md` | Already mostly generic |
| 6 | `DESIGN_DECISIONS.md` | `docs/adr/` | Split into individual ADR files |

### Phase 3: Create Formal Schemas

**Working directory:** MCPAQL/spec `schemas/`

| Order | Schema | Purpose |
|-------|--------|---------|
| 1 | `operation-request.schema.json` | Standard request format |
| 2 | `operation-response.schema.json` | Success/error discriminated union |
| 3 | `introspection-response.schema.json` | Introspection output format |
| 4 | `danger-level.schema.json` | Danger classification enum |

### Phase 4: Update Main Spec Document

**File:** `docs/versions/v1.0.0-draft.md`

- Reference the new docs
- Add conformance requirements
- Link to schemas

### Summary

**Start in:** `MCPAQL/spec` (not DollhouseMCP)

**Why:** The DollhouseMCP docs are source material - they don't need modification. The work is creating the spec versions in the MCPAQL repo.

**Session flow:**
1. Set up MCPAQL/spec directory structure
2. Copy docs one at a time, adapting each
3. Extract schemas from implementation patterns
4. Update the main spec version document

---

*Session duration: ~2 hours*
*Next session: MCPAQL spec documentation and schema definition*
