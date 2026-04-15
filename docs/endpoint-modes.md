# MCP-AQL Endpoint Modes Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

> **Document Status:** This document is **informative**. For normative requirements, see [MCP-AQL Specification v1.0.0](./versions/v1.0.0-draft.md).

## Abstract

MCP-AQL supports two operational modes for exposing endpoints to clients: Semantic Endpoints mode and Single mode. The standard CRUDE profile is one semantic-endpoint profile within Semantic Endpoints mode. This document specifies configuration, routing behavior, security implications, and trade-offs for each mode.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Mode Comparison](#2-mode-comparison)
3. [Configuration](#3-configuration)
4. [Semantic Endpoints Mode](#4-semantic-endpoints-mode)
5. [Single Mode](#5-single-mode)
6. [Security Considerations](#6-security-considerations)
7. [Tool Registration](#7-tool-registration)
8. [Conformance Requirements](#8-conformance-requirements)

---

## 1. Introduction

### 1.1 Purpose

Endpoint modes determine how MCP-AQL operations are exposed to clients. The choice affects:

- Token cost for tool registration
- Client routing complexity
- Permission granularity
- Error message specificity

### 1.2 Scope

This specification covers:
- How each mode exposes operations
- Routing behavior in each mode
- Security enforcement differences
- Implementation requirements

### 1.3 Terminology

| Term | Definition |
|------|------------|
| **Semantic Endpoints Mode** | Multiple exposed MCP tools whose names and purposes are semantically legible to clients |
| **Semantic Endpoint Profile** | A specific semantic set exposed in Semantic Endpoints mode (for example CRUDE) |
| **CRUDE Profile** | The standard five-endpoint semantic profile: Create, Read, Update, Delete, Execute |
| **Single Mode** | One unified MCP tool that routes internally |
| **Endpoint Family** | A named MCP tool or logical grouping that contains one or more operations |
| **Semantic Category** | One of the standardized effect categories: CREATE, READ, UPDATE, DELETE, EXECUTE |
| **Operation** | A named action exposed by the adapter |

---

## 2. Mode Comparison

### 2.1 Summary

| Aspect | Semantic Endpoints Mode | Single Mode |
|--------|-------------------------|-------------|
| **Exposed tools** | Multiple semantic endpoint tools | 1 unified tool |
| **Semantic categories** | Still standardized per operation | Routed internally |
| **Routing** | Client chooses endpoint family | Server routes internally |
| **Permission control** | Endpoint-level granularity | Operation-level only |
| **Token cost** | Low to medium | Lowest |
| **Best fit** | When endpoint semantics should remain visible to the client | Minimal tool surface |

### 2.2 Typical Shapes

Semantic Endpoints mode can expose different semantic profiles. The key requirement is that the endpoint names and descriptions communicate intent clearly enough that a client or LLM can infer where an operation belongs.

**Standard CRUDE profile**
```text
mcp_aql_create
mcp_aql_read
mcp_aql_update
mcp_aql_delete
mcp_aql_execute
```

**Extended CRUDE-style profile**
```text
mcp_aql_create
mcp_aql_read
mcp_aql_update
mcp_aql_delete
mcp_aql_execute
mcp_aql_authorize
```

**Alternative semantic profile**
```text
mcp_aql_discover
mcp_aql_query
mcp_aql_manage
mcp_aql_operate
```

**Single mode**
```text
mcp_aql
```

Profiles like `discover`, `query`, `manage`, and `operate` remain semantic because they tell the client what kind of intent belongs there. Profiles built purely from domain buckets without clear action semantics are much weaker for discoverability.

### 2.3 Token Efficiency

Endpoint consolidation provides significant token reduction compared to fully discrete tools:

| Configuration | Typical Token Cost | Reduction |
|---------------|-------------------|-----------|
| Discrete tools (e.g., 40+ tools) | ~30,000 tokens | baseline |
| Semantic endpoints mode (4-8 tools typical) | ~4,300-6,500 tokens | ~78-85% |
| Single mode (1 tool) | ~1,100 tokens | ~96% |

Note: Actual token costs vary based on operation count, endpoint descriptions, and whether schemas enumerate operations inline.

---

## 3. Configuration

### 3.1 Mode Selection

Implementations SHOULD provide runtime configuration for endpoint mode selection.

**Recommended Environment Variable:**
```text
MCP_AQL_ENDPOINT_MODE=semantic|single|all
```

**Optional Semantic Profile Selection:**
```text
MCP_AQL_ENDPOINT_PROFILE=crude|<adapter_profile_name>
```

**Values:**

| Value | Behavior |
|-------|----------|
| `semantic` | Register the active semantic-endpoint profile |
| `single` | Register 1 unified endpoint |
| `all` | Register the active semantic-endpoint profile plus the unified endpoint |

### 3.2 Default Mode

If no configuration is provided, implementations SHOULD default to the standard CRUDE profile, which provides a strong balance of token efficiency, discoverability, and permission granularity.

### 3.3 Runtime Configuration

Implementations MAY support additional configuration methods:
- Configuration files
- Programmatic API
- Environment-specific defaults

If an implementation supports multiple semantic endpoint profiles, it SHOULD document which profile is active and expose that via introspection.

---

## 4. Semantic Endpoints Mode

### 4.1 Standard CRUDE Profile

In the standard CRUDE profile, five MCP tools are registered:

| Tool Name | Semantic Category | Operations |
|-----------|-------------------|------------|
| `mcp_aql_create` | CREATE | Create, add, register |
| `mcp_aql_read` | READ | List, get, search, introspect |
| `mcp_aql_update` | UPDATE | Edit, modify, update |
| `mcp_aql_delete` | DELETE | Delete, remove, clear |
| `mcp_aql_execute` | EXECUTE | Run, start, stop, cancel |

### 4.2 Client Responsibility

In the CRUDE profile, clients MUST select the correct endpoint family for each operation. If a client sends an operation to the wrong tool, the adapter MUST reject the request.

**Example: Correct Usage**
```javascript
// Via mcp_aql_read endpoint
{
  operation: "list_items",
  params: { limit: 10 }
}
```

**Example: Incorrect Usage**
```javascript
// Via mcp_aql_create endpoint (WRONG - list_items is a READ operation)
{
  operation: "list_items",
  params: { limit: 10 }
}

// Response:
{
  success: false,
  error: "Operation 'list_items' must be called via mcp_aql_read, not mcp_aql_create"
}
```

### 4.3 Why Use CRUDE

The CRUDE profile is the recommended general-purpose grouping because it:

- Preserves standardized safety boundaries
- Produces predictable tool names across adapters
- Works well when the target system does not already imply a better domain partition

### 4.4 Alternative Semantic Endpoint Profiles

Implementations MAY define alternate semantic endpoint profiles when a different semantic split communicates intent more clearly to the client than CRUDE does.

Semantic endpoint families MAY mix multiple semantic categories, but each operation MUST still have exactly one standardized semantic category documented via introspection.

### 4.5 Client Responsibility

In Semantic Endpoints mode, clients MUST choose the correct exposed endpoint family for each operation. Adapters MUST reject operations sent to the wrong semantic endpoint family.

**Example: Correct Usage**
```javascript
// Via mcp_aql_query endpoint
{
  operation: "search_documents",
  params: { query: "pricing", limit: 10 }
}
```

**Example: Incorrect Usage**
```javascript
// Via mcp_aql_operate endpoint (WRONG - search_documents belongs to the query family)
{
  operation: "search_documents",
  params: { query: "pricing", limit: 10 }
}

// Response:
{
  success: false,
  error: "Operation 'search_documents' must be called via mcp_aql_query, not mcp_aql_operate"
}
```

### 4.6 Route Enforcement

Adapters in Semantic Endpoints mode MUST validate that operations are sent to their assigned endpoint family.

**Validation Logic:**
1. Extract operation name from request
2. Look up the documented endpoint family for that operation
3. Compare with the endpoint family that received the request
4. If mismatch, return an error specifying the correct endpoint family

### 4.7 Endpoint Descriptions

Each semantic endpoint family SHOULD include a description listing:

- The family purpose
- The semantic categories commonly found in that family
- Available operations (or a sample with introspection guidance)
- Quick-start examples

Endpoint family names SHOULD be action-oriented or otherwise intent-revealing. Names like `query`, `manage`, `operate`, `observe`, or `control` are usually better semantic signals than opaque domain buckets.

**Example Description Format:**
```text
Query-oriented operations for retrieval, filtering, aggregation, and field selection.

Primary semantic categories: READ

Supported operations: list_datasets, get_dataset, search_datasets

Quick start example:
{ operation: "search_datasets", params: { query: "pricing", limit: 10 } }

Discover required parameters:
{ operation: "introspect", params: { query: "operations", name: "search_datasets" } }
```

### 4.8 Example Alternative Semantic Endpoint Profiles

The following examples are illustrative only. They show valid semantic endpoint profiles besides the standard CRUDE profile.

**Extended CRUDE-style profile**

```text
mcp_aql_create     - Additive operations
mcp_aql_read       - Safe, read-only operations
mcp_aql_update     - Modifying operations
mcp_aql_delete     - Destructive operations
mcp_aql_execute    - Runtime lifecycle operations
mcp_aql_authorize  - Permission grants, approvals, policy assignment
```

This remains a semantic-endpoint profile because each endpoint communicates a specific kind of intent to the client.

**Database-oriented semantic endpoints**

```text
mcp_aql_inspect     - Schema discovery, capability checks, metadata inspection
mcp_aql_query       - Retrieval, filtering, joins, aggregations, exports
mcp_aql_mutate      - Inserts, updates, deletes, bulk edits
mcp_aql_administer  - Migrations, maintenance tasks, index rebuilds, long-running jobs
```

This is a valid semantic-endpoint profile when the target system is best understood through inspection, query, mutation, and administration semantics.

**Hardware / device semantic endpoints**

```text
mcp_aql_discover   - Device discovery, capabilities, configuration metadata
mcp_aql_observe    - Sensor reads, health checks, status polling, event history
mcp_aql_control    - Actuation, calibration, restart, firmware operations
mcp_aql_maintain   - Diagnostics, firmware staging, lifecycle maintenance tasks
```

This is a valid semantic-endpoint profile when the clearest semantic split is between discovering devices, observing live state, issuing control actions, and performing maintenance.

**Content / knowledge semantic endpoints**

```text
mcp_aql_curate    - Collection curation, taxonomy changes, metadata maintenance
mcp_aql_search    - Search, retrieval, ranking, summaries
mcp_aql_publish   - Imports, indexing jobs, publishing, review actions
```

This is a valid semantic-endpoint profile when the target API separates curation, retrieval, and publishing or processing semantics.

In all of these cases, the adapter still documents each operation's standardized semantic category through introspection, even when the semantic endpoints do not map one-to-one to CRUDE tools.

---

## 5. Single Mode

### 5.1 Endpoint Registration

In Single mode, one MCP tool is registered:

| Tool Name | Purpose |
|-----------|---------|
| `mcp_aql` | All operations through a unified entry point |

### 5.2 Server-Side Routing

The adapter routes operations internally based on each operation's semantic category and handler mapping.

```text
Client Request
     |
     v
mcp_aql endpoint
     |
     v
[Operation Router]
     |
     +---> Resolves endpoint family + semantic category
     |
     v
[Appropriate Handler]
     |
     v
Response
```

### 5.3 Routing Behavior

In Single mode:

1. All operations are accepted through `mcp_aql`
2. The adapter determines the correct handler based on operation metadata
3. The same semantic category rules apply as in semantic endpoints mode
4. Permission enforcement occurs server-side

### 5.4 Unified Endpoint Description

The unified endpoint SHOULD provide:

- Overview of available endpoint families or semantic categories
- Guidance to use introspection for discovery
- Quick-start examples

**Example Description:**
```text
Unified MCP-AQL endpoint for all operations.

Operations are automatically routed based on their documented semantic category and endpoint-family mapping.

Use introspection to discover available operations:
{ operation: "introspect", params: { query: "operations" } }
```

---

## 6. Security Considerations

### 6.1 Semantic Endpoints Mode Security

Semantic endpoint modes, including the CRUDE profile, provide:

- Endpoint-level permission blocking
- More specific mismatch errors
- MCP annotation hints that may vary by exposed family
- Clearer audit separation by exposed family

**Characteristics:**

- Client is responsible for endpoint-family selection
- Adapter enforces route validation
- Risk can be isolated into smaller families

### 6.2 Single Mode Security

Single mode provides:

- Smaller attack surface (one endpoint)
- Server-side routing that prevents endpoint bypass
- Simpler client integration

**Characteristics:**

- Cannot block operations by semantic endpoint family alone
- All routing decisions are server-side
- Audit logging relies more heavily on operation-level metadata

### 6.3 Security Trade-offs

| Security Aspect | Semantic Endpoint Modes | Single Mode |
|-----------------|---------------|-------------|
| Endpoint-level blocking | Yes | No |
| Client error prevention | Better | Worse |
| Attack surface | Larger | Smaller |
| Audit granularity | Endpoint family + operation | Operation only |
| Bypass resistance | Adapter-enforced | Adapter-enforced |

### 6.4 Common Security Enforcement

All modes MUST:

- Validate operation parameters
- Enforce the same permission model
- Apply safety tier classifications
- Support confirmation for destructive operations when implemented

---

## 7. Tool Registration

### 7.1 MCP Tool Annotations

Adapters SHOULD include MCP tool annotations to hint at operation safety.

**CRUDE Profile Example:**
```json
{
  "name": "mcp_aql_read",
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false
  }
}
```

**Alternative Semantic Endpoint Example:**
```json
{
  "name": "mcp_aql_control",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true
  }
}
```

Semantic endpoint families SHOULD set annotations conservatively based on the riskiest operation that family exposes.

**Single Mode Example:**
```json
{
  "name": "mcp_aql",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true
  }
}
```

Note: Single mode uses `destructiveHint: true` because it can route to destructive operations.

### 7.2 Input Schema

All modes use the same base input schema:

```json
{
  "type": "object",
  "properties": {
    "operation": {
      "type": "string",
      "description": "Operation name to execute"
    },
    "params": {
      "type": "object",
      "description": "Operation parameters"
    }
  },
  "required": ["operation"]
}
```

Adapters MAY extend this schema with additional common properties such as `resource_type`, `fields`, or `_meta`.

---

## 8. Conformance Requirements

### 8.1 MUST Requirements

Conforming implementations MUST:

1. Support at least one endpoint mode (`semantic` or `single`)
2. Enforce operation routing validation in semantic endpoints mode
3. Return proper error responses for unknown operations
4. Route operations to correct handlers in Single mode
5. Apply consistent permission enforcement regardless of mode

### 8.2 SHOULD Requirements

Conforming implementations SHOULD:

1. Support both a semantic endpoint mode and Single mode
2. Provide runtime configuration for mode selection
3. Include MCP tool annotations for permission hints
4. Provide helpful error messages that guide clients to correct usage
5. Document operation-to-endpoint-family mapping via introspection

### 9.3 MAY Requirements

Conforming implementations MAY:

1. Support `all` mode exposing both semantic-endpoint and single surfaces simultaneously
2. Implement per-endpoint access control
3. Provide mode-specific audit logging
4. Support dynamic mode switching without restart
5. Implement custom endpoint naming conventions

---

## References

- [MCP-AQL Specification v1.0.0-draft](versions/v1.0.0-draft.md)
- [CRUDE Pattern Specification](crude-pattern.md)
- [MCP Integration Specification](mcp-integration.md)
- [Gatekeeper Security Model](security/gatekeeper.md)
- [Introspection Specification](introspection.md)
