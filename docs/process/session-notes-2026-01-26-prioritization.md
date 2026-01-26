# Session Notes: MCP-AQL Spec Prioritization & Planning

**Date:** 2026-01-26 (Friday afternoon)
**Focus:** Issue prioritization, adapter architecture, naming conventions

---

## Session Summary

This session established the execution order for MCP-AQL spec development, consolidated duplicate issues, created new adapter-related issues, and defined the element naming convention that will be adopted across both MCP-AQL and DollhouseMCP.

---

## Actions Completed This Session

### Issues Closed (Duplicates)

Closed 10 older issues that were superseded by more detailed versions:

| Closed | Replaced By | Topic |
|--------|-------------|-------|
| #11 | #42 | Computed fields |
| #12 | #43 | Streaming responses |
| #13 | #44 | Relationship/graph queries |
| #14 | #35 | Structured error codes |
| #15 | #37 | Cursor-based pagination |
| #16 | #48 | Schema versioning |
| #17 | #36 | Server-side aggregations |
| #18 | #38 | Dry-run mode |
| #19 | #41 | Request IDs/tracing |
| #20 | #39 | Conditional requests/ETags |

**Note:** Before closing #19, added W3C Baggage support documentation to #41.

### Issues Created

| Issue | Title | Purpose |
|-------|-------|---------|
| #61 | Adapter Element Type specification | Defines adapter schema.md format |
| #62 | Plugin Interface specification | Defines transport, protocol, auth, serialization plugins |
| #63 | Universal Adapter Runtime specification | Defines how runtime interprets schemas |

### Issues Updated

| Issue | Update |
|-------|--------|
| #41 | Added W3C Baggage support section |
| #61 | Added `{name}-adapter.md` naming convention |

### Documents Created

| File | Purpose |
|------|---------|
| `docs/handoff/dollhouse-element-naming-convention-handoff.md` | Handoff for DollhouseMCP to adopt naming convention |
| `docs/process/session-notes-2026-01-26-prioritization.md` | This file |

---

## Current Issue Inventory

**Total Open Issues:** 29

### Tier 1: Foundation (8 issues)

These establish core protocol requirements and must be completed first.

| Priority | Issue | Title | Status | Dependencies |
|----------|-------|-------|--------|--------------|
| 1.1 | #54 | Conformance requirements from DollhouseMCP learnings | Ready | — |
| 1.2 | #57 | Introspection MUST document all handler parameters | Ready | #54 |
| 1.3 | #58 | Standardize cross-cutting parameter documentation | Ready | #57 |
| 1.4 | #35 | Structured error codes | Ready | #54 |
| 1.5 | #9 | JSON Schema definitions | Partial | #35, #58 |
| 1.6 | #55 | Conformance test requirements | Ready | #54, #57, #58 |
| 1.7 | #56 | LLM-based semantic evaluation | Ready | #55 |
| 1.8 | #10 | Conformance test suite | Not started | #55, #56 |

### Tier 2: Adapter Infrastructure (6 issues)

These define the adapter ecosystem - critical for MCP-AQL's value proposition.

| Priority | Issue | Title | Status | Dependencies |
|----------|-------|-------|--------|--------------|
| 2.1 | #61 | Adapter Element Type specification | Ready | Tier 1 |
| 2.2 | #62 | Plugin Interface specification | Ready | #61 |
| 2.3 | #63 | Universal Adapter Runtime specification | Ready | #61, #62 |
| 2.4 | #59 | Trust Levels for Adapters | Ready | #61 |
| 2.5 | #60 | Rate Limiting and Quota Management | Ready | #61 |
| 2.6 | #21 | Adapter generator specification | Ready | #61, #63 |

### Tier 3: Core Protocol Features (5 issues)

Essential protocol capabilities for v1.0.

| Priority | Issue | Title | Status | Dependencies |
|----------|-------|-------|--------|--------------|
| 3.1 | #48 | Schema versioning and evolution | Ready | Tier 1 |
| 3.2 | #49 | Dangerous operation classification | Ready | #59 |
| 3.3 | #37 | Cursor-based pagination | Ready | Tier 1 |
| 3.4 | #46 | Partial success for batch operations | Ready | #35 |
| 3.5 | #41 | Request IDs and distributed tracing | Ready | — |

### Tier 4: Enhanced Capabilities (8 issues)

Future enhancements for v1.1+.

| Issue | Title |
|-------|-------|
| #36 | Server-side aggregations |
| #38 | Dry-run mode |
| #39 | Conditional requests with ETags |
| #40 | Notifications/telemetry |
| #42 | Computed fields |
| #43 | Streaming responses |
| #44 | Relationship/graph queries |

### Tier 5: Documentation (3 issues)

| Issue | Title |
|-------|-------|
| #34 | Implementation guide for other domains |
| #45 | ADR - GraphQL adoption |
| #47 | GraphQL specification documentation |

---

## Execution Plan: MVP-First Approach

The execution plan follows an MVP-first strategy: build the thinnest vertical slice to get working adapters, then layer on robustness, quality, and ecosystem features.

### Philosophy

```
MVP Core     → Working adapters (can execute operations)
Robustness   → Safe for production (trust, rate limits, danger classification)
Quality      → Verified implementations (conformance, testing)
Ecosystem    → Complete v1.0 (generator, versioning, tracing)
```

---

### Phase 0: MVP Core (4 issues, simplified scope)

**Goal:** Minimum viable adapter system - can load a schema and execute operations.

```
#61 (MVP) → #62 (MVP) → #63 (MVP) → #35 (MVP)
  Schema      Plugins     Runtime     Errors
```

| Order | Issue | MVP Scope | Deferred |
|-------|-------|-----------|----------|
| **0.1** | #61 | Basic schema: name, type, version, target, operations | trust, rate_limits, danger_level |
| **0.2** | #62 | HTTP + REST + JSON + Bearer/API key only | WebSocket, OAuth, pagination plugins |
| **0.3** | #63 | Load schema, dispatch ops, basic request/response | Trust gating, rate limiting, hot reload |
| **0.4** | #35 | 6 essential error codes | Full taxonomy, HTTP mapping table |

**MVP Deliverables:**
- Basic adapter schema specification
- Core plugin definitions (http/rest/json/bearer)
- Basic runtime execution model
- Essential error codes

**After Phase 0, you can:**
- Write a `github-api-adapter.md` schema
- Load it in the runtime
- Execute basic CRUD operations
- Get structured error responses

---

### Phase 1: Robustness (4 issues)

**Goal:** Make adapters safe for production use.

```
#59 → #49 → #60 → #37
Trust   Danger  Rates  Pagination
```

| Order | Issue | Adds |
|-------|-------|------|
| **1.1** | #59 | Trust levels (safety for generated/untested adapters) |
| **1.2** | #49 | Dangerous operation classification + trust gating |
| **1.3** | #60 | Rate limiting (prevent runaway costs) |
| **1.4** | #37 | Pagination plugins (handle large result sets) |

**Robustness Deliverables:**
- Trust level enum and promotion rules
- Danger level classification
- Trust-to-danger gating matrix
- Rate limit enforcement spec
- Pagination plugin interface

**After Phase 1:**
- Untrusted adapters can't execute dangerous operations
- Rate limits prevent cost overruns
- Large result sets paginate correctly

---

### Phase 2: Quality (8 issues)

**Goal:** Enable verified, tested implementations.

```
#54 → #57 → #58 → #9 → #55 → #56 → #10
Conformance → Introspection → Schemas → Testing
```

| Order | Issue | Adds |
|-------|-------|------|
| **2.1** | #54 | Conformance requirements from real-world learnings |
| **2.2** | #57 | Introspection parameter completeness |
| **2.3** | #58 | Cross-cutting parameter standardization |
| **2.4** | #9 | Complete JSON Schema definitions |
| **2.5** | #55 | Conformance test requirements |
| **2.6** | #56 | LLM-based semantic evaluation |
| **2.7** | #10 | Conformance test suite implementation |

**Quality Deliverables:**
- Conformance requirements document
- Complete introspection specification
- Full JSON Schema set (including adapter schema)
- Test framework and suite

**After Phase 2:**
- Implementations can be verified against spec
- Introspection is guaranteed complete
- Automated conformance testing available

---

### Phase 3: Ecosystem (4 issues)

**Goal:** Complete v1.0 with generator and advanced features.

```
#21 → #48 → #46 → #41
Generator  Versioning  Batch  Tracing
```

| Order | Issue | Adds |
|-------|-------|------|
| **3.1** | #21 | Adapter generator specification |
| **3.2** | #48 | Schema versioning and evolution |
| **3.3** | #46 | Partial success for batch operations |
| **3.4** | #41 | Request IDs and distributed tracing (with baggage) |

**Ecosystem Deliverables:**
- Generator output specification
- Version negotiation spec
- Batch operation semantics
- Tracing and observability spec

**After Phase 3:**
- Can auto-generate adapters from OpenAPI specs
- Graceful API evolution with versioning
- Production-ready observability

---

### Phase 4: Advanced Features (v1.1+)

**Goal:** Enhanced capabilities for future releases.

| Issue | Feature |
|-------|---------|
| #36 | Server-side aggregations |
| #38 | Dry-run mode |
| #39 | Conditional requests with ETags |
| #40 | Notifications/telemetry |
| #42 | Computed fields |
| #43 | Streaming responses |
| #44 | Relationship/graph queries |

---

### Phase 5: Documentation

| Issue | Document |
|-------|----------|
| #34 | Implementation guide for other domains |
| #45 | ADR - GraphQL adoption |
| #47 | GraphQL specification documentation |

---

## Visual: MVP-First Execution

```
PHASE 0: MVP CORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ #61 Schema │ #62 Plugins │ #63 Runtime │ #35 Errors │
│   (MVP)    │    (MVP)    │    (MVP)    │   (MVP)    │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    ↓
        ✅ Working adapters possible
                    ↓
PHASE 1: ROBUSTNESS
───────────────────────────────────────────────────────
│ #59 Trust │ #49 Danger │ #60 Rates │ #37 Pagination │
───────────────────────────────────────────────────────
                    ↓
        ✅ Safe for production use
                    ↓
PHASE 2: QUALITY
───────────────────────────────────────────────────────
│ #54 │ #57 │ #58 │ #9 │ #55 │ #56 │ #10 │
│ Conformance │ Introspection │ Schemas │ Testing │
───────────────────────────────────────────────────────
                    ↓
        ✅ Verified implementations
                    ↓
PHASE 3: ECOSYSTEM
───────────────────────────────────────────────────────
│ #21 Generator │ #48 Versioning │ #46 Batch │ #41 Tracing │
───────────────────────────────────────────────────────
                    ↓
        ✅ Complete v1.0 release
                    ↓
PHASE 4: ADVANCED (v1.1+)
───────────────────────────────────────────────────────
│ #36 │ #38 │ #39 │ #40 │ #42 │ #43 │ #44 │
───────────────────────────────────────────────────────
```

---

## Dependency Graph (MVP-First)

```
PHASE 0: MVP CORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    #61 Adapter Schema (MVP)
              │
              │  Defines basic schema format
              ▼
    #62 Plugin Interface (MVP)
              │
              │  HTTP + REST + JSON + Bearer
              ▼
    #63 Universal Runtime (MVP)
              │
              │  Load, dispatch, execute
              ▼
    #35 Error Codes (MVP)
              │
              │  6 essential codes
              ▼
    ════════════════════════════
    ✅ WORKING ADAPTERS
    ════════════════════════════


PHASE 1: ROBUSTNESS
───────────────────────────────────────────────────────────────────

    #59 Trust Levels ──────────────┐
              │                    │
              ▼                    │
    #49 Dangerous Operations ◄─────┘
              │
              │  Trust gates danger
              ▼
    #60 Rate Limiting
              │
              ▼
    #37 Pagination Plugins
              │
              ▼
    ════════════════════════════
    ✅ PRODUCTION SAFE
    ════════════════════════════


PHASE 2: QUALITY
───────────────────────────────────────────────────────────────────

    #54 Conformance Requirements
              │
              ├──────────────────────┐
              ▼                      ▼
    #57 Introspection         #35 Error Codes
    Completeness              (Full Taxonomy)
              │                      │
              ▼                      │
    #58 Cross-cutting               │
    Parameters                      │
              │                      │
              └──────────┬───────────┘
                         │
                         ▼
              #9 JSON Schemas (Complete)
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
      #55              #56              #10
   Test Reqs       Semantic          Test Suite
                     Eval
                         │
                         ▼
    ════════════════════════════
    ✅ VERIFIED IMPLEMENTATIONS
    ════════════════════════════


PHASE 3: ECOSYSTEM
───────────────────────────────────────────────────────────────────

    #21 Adapter Generator
              │
              ▼
    #48 Schema Versioning
              │
              ▼
    #46 Batch Partial Success
              │
              ▼
    #41 Request IDs + Tracing
              │
              ▼
    ════════════════════════════
    ✅ COMPLETE v1.0
    ════════════════════════════
```

---

## Key Decisions Made

### 1. Element Naming Convention

**Decision:** `{name}-{type}.md` pattern (e.g., `github-api-adapter.md`)

**Rationale:**
- Avoids double-dot extension security concerns
- Self-describing filenames
- Glob-friendly (`*-adapter.md`)
- Shareable without directory context

**Applies to:** All element types (adapters, personas, skills, templates, agents, memories, ensembles)

### 2. Metadata is Source of Truth

**Decision:** YAML front matter `name` and `type` fields are authoritative; filename is for convenience.

**On divergence:** Use metadata values, emit warning.

### 3. Schema-Driven Adapters

**Decision:** Adapters are Markdown files with YAML front matter interpreted by a universal runtime—no per-adapter code generation.

**Benefits:**
- Hot-reloadable
- Introspection guaranteed complete
- Single codebase for all adapters

### 4. Plugin Architecture (V1)

**Decision:** Built-in plugins only for V1; no user-extensible plugins yet.

**Plugin categories:**
- Transport (http, websocket, serial, native)
- Protocol (rest, graphql, grpc)
- Auth (bearer, api_key, oauth, mtls)
- Serialization (json, xml, protobuf)
- Pagination (cursor, offset, page, link_header)

### 5. Type Field Required in Metadata

**Decision:** All elements MUST include `type` field in YAML front matter.

**Rationale:** Belt-and-suspenders identification; enables validation and tooling.

---

## Information to Add to Issues

### Issue #9 (JSON Schemas)

Add to scope:
- `adapter-schema.schema.json` - validates adapter YAML front matter
- Must include validation for:
  - `name` and `type` fields (required)
  - `target` block structure
  - `operations` mapping structure
  - `trust` block (#59)
  - `rate_limits` block (#60)

### Issue #35 (Error Codes)

Add section:
- HTTP-to-MCPAQL error code mapping table
- Default mappings for universal runtime
- Schema mechanism for per-adapter overrides

### Issue #21 (Adapter Generator)

Clarify:
- Generator outputs `{name}-adapter.md` files (not code)
- Generator sets `trust.level: generated`
- Generator extracts rate limits from API specs when available

### Issue #37 (Pagination)

Add:
- Pagination plugin architecture reference (#62)
- Supported styles: cursor, offset, page, link_header
- How pagination style is declared in adapter schema

### Issue #49 (Dangerous Operations)

Add:
- Relationship to trust levels (#59)
- Lower trust levels may be blocked from dangerous operations
- `danger_level` field in operation definitions

---

## MVP Scope Definitions

These define the reduced scope for Phase 0 MVP issues.

### #61 MVP: Basic Adapter Schema

**In scope:**
```yaml
---
name: string (required)
type: "adapter" (required)
version: string (required)
description: string (required)

target:
  base_url: string (required)
  transport: "http" (only option for MVP)
  protocol: "rest" (only option for MVP)
  serialization: "json" (only option for MVP)

auth:
  type: "bearer" | "api_key" | "none"
  token_env: string (for bearer)
  header_name: string (for api_key)
  key_env: string (for api_key)

operations:
  create: array of OperationDefinition
  read: array of OperationDefinition
  update: array of OperationDefinition
  delete: array of OperationDefinition
  execute: array of OperationDefinition

OperationDefinition:
  name: string (required)
  maps_to: string (required, e.g., "GET /repos/{owner}/{repo}")
  description: string
  params: map of { type, required, description, default, enum }
---
```

**Deferred to Phase 1+:**
- `trust` block
- `rate_limits` block
- `danger_level` in operations
- `pagination` in operations
- `supports_fields` in operations
- `requires_confirmation` in operations

### #62 MVP: Core Plugins Only

**In scope:**
| Category | MVP Plugins |
|----------|-------------|
| Transport | `http` only |
| Protocol | `rest` only |
| Serialization | `json` only |
| Auth | `bearer`, `api_key`, `none` |

**Deferred to Phase 1+:**
- Transport: websocket, serial, native
- Protocol: graphql, grpc, custom
- Serialization: xml, protobuf, msgpack
- Auth: oauth, mtls
- Pagination plugins (all)

### #63 MVP: Basic Runtime

**In scope:**
1. Load adapter schema file from disk
2. Parse YAML front matter
3. Validate required fields present
4. On operation request:
   - Find operation by name
   - Validate required params provided
   - Build HTTP request from `maps_to` template
   - Add auth header based on `auth` config
   - Send request via HTTP
   - Parse JSON response
   - Return as MCP-AQL discriminated result
5. On HTTP error: map to basic error response

**Deferred to Phase 1+:**
- Hot reload on file change
- Trust level checking
- Rate limit enforcement
- Pagination handling
- Introspection generation
- Caching
- Request validation beyond required params

### #35 MVP: Essential Error Codes

**In scope (6 codes):**
| Code | When Used |
|------|-----------|
| `VALIDATION_MISSING_PARAM` | Required parameter not provided |
| `VALIDATION_INVALID_TYPE` | Parameter wrong type |
| `NOT_FOUND_OPERATION` | Requested operation doesn't exist in schema |
| `NOT_FOUND_RESOURCE` | HTTP 404 from target API |
| `PERMISSION_DENIED` | HTTP 401/403 from target API |
| `INTERNAL_ERROR` | HTTP 500+ or unexpected error |

**Deferred to Phase 1+:**
- Full error code taxonomy
- HTTP-to-MCPAQL mapping table
- Per-adapter error overrides
- Rate limit error codes
- Conflict error codes
- Detailed error contexts

---

## Open Questions

### For Spec

1. Should adapter schemas support inheritance/composition?
2. How do we version the adapter schema format itself?
3. Should there be a "sandbox" mode for untrusted adapters?

### For DollhouseMCP Integration

1. Migration timeline for existing elements to new naming convention?
2. How does portfolio sync handle renamed files?
3. Should adapter type be in core or as extension?

---

## Next Steps

### Immediate (This Week)

1. [ ] Review this MVP-first plan
2. [ ] Hand off naming convention document to DollhouseMCP agent
3. [ ] Begin Phase 0: MVP Core

### Phase 0: MVP Core (Priority)

1. [ ] #61 - Define basic adapter schema (MVP scope only)
2. [ ] #62 - Define core plugins (HTTP/REST/JSON/Bearer only)
3. [ ] #63 - Define basic runtime behavior (load, dispatch, execute)
4. [ ] #35 - Define 6 essential error codes
5. [ ] Create example adapter: `github-api-adapter.md`
6. [ ] Validate: Can we write a working adapter with just these specs?

### Phase 1: Robustness (After MVP)

1. [ ] #59 - Trust levels
2. [ ] #49 - Dangerous operation classification
3. [ ] #60 - Rate limiting
4. [ ] #37 - Pagination plugins

### Phase 2: Quality (After Robustness)

1. [ ] #54, #57, #58 - Conformance and introspection
2. [ ] #9 - Complete JSON schemas
3. [ ] #55, #56, #10 - Testing framework

### Phase 3: Ecosystem (For v1.0)

1. [ ] #21 - Adapter generator
2. [ ] #48, #46, #41 - Versioning, batch, tracing

---

## References

### Session Artifacts

- Issue #61 comment: https://github.com/MCPAQL/spec/issues/61#issuecomment-3801608677
- Issue #41 comment: https://github.com/MCPAQL/spec/issues/41#issuecomment-3800926100
- Handoff document: `docs/handoff/dollhouse-element-naming-convention-handoff.md`

### External Research

- [Harvard Data Management - File Naming](https://datamanagement.hms.harvard.edu/plan-design/file-naming-conventions)
- [Helm Chart Conventions](https://gist.github.com/jjmartres/26eb0cd5f9a928089b4b9d0f87473dda)
- [Google Style Guide - Filenames](https://developers.google.com/style/filenames)
- [W3C Baggage Specification](https://www.w3.org/TR/baggage/)

### Related DollhouseMCP Issues

- DollhouseMCP/mcp-server-v2-refactor#347 - Field selection introspection
- DollhouseMCP/mcp-server-v2-refactor#349 - LLM discoverability tests
- DollhouseMCP/mcp-server-v2-refactor#1589-1592 - Parameter/introspection fixes

---

*Session notes created: 2026-01-26*
*Next review: Before starting Phase 1 work*
