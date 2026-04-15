# MCP-AQL Endpoint Modes Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

> **Document Status:** This document is **informative**. For normative requirements, see [MCP-AQL Specification v1.0.0](./versions/v1.0.0-draft.md).

## Abstract

MCP-AQL supports three operational modes for exposing endpoints to clients: the standard CRUDE grouped profile, adapter-defined Grouped mode, and Single mode. This document specifies configuration, routing behavior, security implications, and trade-offs for each mode.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Mode Comparison](#2-mode-comparison)
3. [Configuration](#3-configuration)
4. [Standard CRUDE Profile](#4-standard-crude-profile)
5. [Grouped Mode](#5-grouped-mode)
6. [Single Mode](#6-single-mode)
7. [Security Considerations](#7-security-considerations)
8. [Tool Registration](#8-tool-registration)
9. [Conformance Requirements](#9-conformance-requirements)

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
| **CRUDE Profile** | The standard five-family grouped profile: Create, Read, Update, Delete, Execute |
| **Grouped Mode** | Multiple exposed endpoint families, either the CRUDE profile or adapter-defined semantic families |
| **Single Mode** | One unified MCP tool that routes internally |
| **Endpoint Family** | A named MCP tool or logical grouping that contains one or more operations |
| **Semantic Category** | One of the standardized effect categories: CREATE, READ, UPDATE, DELETE, EXECUTE |
| **Operation** | A named action exposed by the adapter |

---

## 2. Mode Comparison

### 2.1 Summary

| Aspect | CRUDE Profile | Adapter-Defined Grouped Mode | Single Mode |
|--------|---------------|------------------------------|-------------|
| **Exposed tools** | 5 grouped tools | Adapter-defined grouped tools | 1 unified tool |
| **Semantic categories** | Explicitly aligned to CRUDE tools | Still standardized per operation | Routed internally |
| **Routing** | Client chooses CRUDE tool | Client chooses endpoint family | Server routes internally |
| **Permission control** | Strong endpoint-level granularity | Endpoint-level granularity by family | Operation-level only |
| **Token cost** | Low | Low to medium | Lowest |
| **Best fit** | General-purpose profile | Domain-shaped adapters | Minimal tool surface |

### 2.2 Typical Shapes

```text
CRUDE Profile                     Adapter-Defined Grouped Mode          Single Mode
================                  ============================          ===========

mcp_aql_create                    mcp_aql_catalog                       mcp_aql
mcp_aql_read                      mcp_aql_data                            |
mcp_aql_update                    mcp_aql_jobs                            v
mcp_aql_delete                                                           [Internal Router]
mcp_aql_execute
```

### 2.3 Token Efficiency

Endpoint consolidation provides significant token reduction compared to fully discrete tools:

| Configuration | Typical Token Cost | Reduction |
|---------------|-------------------|-----------|
| Discrete tools (e.g., 40+ tools) | ~30,000 tokens | baseline |
| Grouped mode (5-8 tools typical) | ~4,300-6,500 tokens | ~78-85% |
| Single mode (1 tool) | ~1,100 tokens | ~96% |

Note: Actual token costs vary based on operation count, endpoint descriptions, and whether schemas enumerate operations inline.

---

## 3. Configuration

### 3.1 Mode Selection

Implementations SHOULD provide runtime configuration for endpoint mode selection.

**Recommended Environment Variable:**
```text
MCP_AQL_ENDPOINT_MODE=crude|grouped|single|all
```

**Optional Grouped Profile Selection:**
```text
MCP_AQL_ENDPOINT_PROFILE=crude|<adapter_profile_name>
```

**Values:**

| Value | Behavior |
|-------|----------|
| `crude` | Register the standard 5-family CRUDE grouped profile |
| `grouped` | Register the adapter's documented grouped endpoint families |
| `single` | Register 1 unified endpoint |
| `all` | Register the active grouped profile plus the unified endpoint |

### 3.2 Default Mode

If no configuration is provided, implementations SHOULD default to the standard CRUDE profile, which provides a strong balance of token efficiency, discoverability, and permission granularity.

### 3.3 Runtime Configuration

Implementations MAY support additional configuration methods:
- Configuration files
- Programmatic API
- Environment-specific defaults

If an implementation supports multiple grouped profiles, it SHOULD document which profile is active and expose that via introspection.

---

## 4. Standard CRUDE Profile

### 4.1 Endpoint Registration

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

---

## 5. Grouped Mode

### 5.1 Endpoint Registration

In adapter-defined Grouped mode, implementations expose a small number of semantic endpoint families that fit the target API or domain model.

**Example grouped families:**

| Tool Name | Typical Contents |
|-----------|------------------|
| `mcp_aql_catalog` | Resource discovery, listing, creation |
| `mcp_aql_data` | Querying, fetching, field selection, exports |
| `mcp_aql_jobs` | Long-running tasks and execution lifecycle |

Grouped endpoint families MAY mix multiple semantic categories, but each operation MUST still have exactly one standardized semantic category documented via introspection.

### 5.2 Client Responsibility

In Grouped mode, clients MUST choose the correct exposed endpoint family for each operation. Adapters MUST reject operations sent to the wrong grouped endpoint family.

**Example: Correct Usage**
```javascript
// Via mcp_aql_data endpoint
{
  operation: "search_documents",
  params: { query: "pricing", limit: 10 }
}
```

**Example: Incorrect Usage**
```javascript
// Via mcp_aql_jobs endpoint (WRONG - search_documents belongs to the data family)
{
  operation: "search_documents",
  params: { query: "pricing", limit: 10 }
}

// Response:
{
  success: false,
  error: "Operation 'search_documents' must be called via mcp_aql_data, not mcp_aql_jobs"
}
```

### 5.3 Route Enforcement

Adapters in Grouped mode MUST validate that operations are sent to their assigned endpoint family.

**Validation Logic:**
1. Extract operation name from request
2. Look up the documented endpoint family for that operation
3. Compare with the endpoint family that received the request
4. If mismatch, return an error specifying the correct endpoint family

### 5.4 Endpoint Descriptions

Each grouped endpoint family SHOULD include a description listing:

- The family purpose
- The semantic categories commonly found in that family
- Available operations (or a sample with introspection guidance)
- Quick-start examples

**Example Description Format:**
```text
Catalog-oriented operations for resources and definitions.

Primary semantic categories: CREATE, READ, UPDATE

Supported operations: create_dataset, list_datasets, update_dataset

Quick start example:
{ operation: "list_datasets", params: { limit: 10 } }

Discover required parameters:
{ operation: "introspect", params: { query: "operations", name: "list_datasets" } }
```

### 5.5 Example Alternative Family Sets

The following examples are illustrative only. They show valid grouped endpoint-family shapes that are more domain-specific than the standard CRUDE profile.

**Database-oriented adapter**

```text
mcp_aql_tables   - Table discovery, schema inspection, lightweight metadata updates
mcp_aql_queries  - Querying, filtering, aggregations, exports
mcp_aql_admin    - Migrations, maintenance tasks, index rebuilds, long-running jobs
```

This shape can make sense when the target system is already organized around schema exploration, query execution, and administrative workflows.

**Hardware / device adapter**

```text
mcp_aql_inventory   - Device discovery, capabilities, configuration metadata
mcp_aql_telemetry   - Sensor reads, health checks, status polling, event history
mcp_aql_control     - Actuation, calibration, restart, firmware operations
```

This shape can make sense when the clearest semantic split is between discovering devices, observing live state, and issuing control actions.

**Content / knowledge adapter**

```text
mcp_aql_library   - Collections, documents, taxonomy, metadata maintenance
mcp_aql_search    - Search, retrieval, ranking, summaries
mcp_aql_workflows - Imports, indexing jobs, publishing, review actions
```

This shape can make sense when the target API separates content management, retrieval, and asynchronous processing.

In all of these cases, the adapter still documents each operation's standardized semantic category through introspection, even when the exposed endpoint families do not map one-to-one to CRUDE tools.

---

## 6. Single Mode

### 6.1 Endpoint Registration

In Single mode, one MCP tool is registered:

| Tool Name | Purpose |
|-----------|---------|
| `mcp_aql` | All operations through a unified entry point |

### 6.2 Server-Side Routing

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

### 6.3 Routing Behavior

In Single mode:

1. All operations are accepted through `mcp_aql`
2. The adapter determines the correct handler based on operation metadata
3. The same semantic category rules apply as in grouped modes
4. Permission enforcement occurs server-side

### 6.4 Unified Endpoint Description

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

## 7. Security Considerations

### 7.1 Grouped Mode Security

Grouped modes, including the CRUDE profile, provide:

- Endpoint-level permission blocking
- More specific mismatch errors
- MCP annotation hints that may vary by exposed family
- Clearer audit separation by exposed family

**Characteristics:**

- Client is responsible for endpoint-family selection
- Adapter enforces route validation
- Risk can be isolated into smaller families

### 7.2 Single Mode Security

Single mode provides:

- Smaller attack surface (one endpoint)
- Server-side routing that prevents endpoint bypass
- Simpler client integration

**Characteristics:**

- Cannot block operations by endpoint family alone
- All routing decisions are server-side
- Audit logging relies more heavily on operation-level metadata

### 7.3 Security Trade-offs

| Security Aspect | Grouped Modes | Single Mode |
|-----------------|---------------|-------------|
| Endpoint-level blocking | Yes | No |
| Client error prevention | Better | Worse |
| Attack surface | Larger | Smaller |
| Audit granularity | Endpoint family + operation | Operation only |
| Bypass resistance | Adapter-enforced | Adapter-enforced |

### 7.4 Common Security Enforcement

All modes MUST:

- Validate operation parameters
- Enforce the same permission model
- Apply safety tier classifications
- Support confirmation for destructive operations when implemented

---

## 8. Tool Registration

### 8.1 MCP Tool Annotations

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

**Adapter-Defined Grouped Example:**
```json
{
  "name": "mcp_aql_jobs",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true
  }
}
```

Grouped endpoint families SHOULD set annotations conservatively based on the riskiest operation that family exposes.

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

### 8.2 Input Schema

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

## 9. Conformance Requirements

### 9.1 MUST Requirements

Conforming implementations MUST:

1. Support at least one endpoint mode (`crude`, adapter-defined `grouped`, or `single`)
2. Enforce operation routing validation in grouped modes
3. Return proper error responses for unknown operations
4. Route operations to correct handlers in Single mode
5. Apply consistent permission enforcement regardless of mode

### 9.2 SHOULD Requirements

Conforming implementations SHOULD:

1. Support both a grouped endpoint mode and Single mode
2. Provide runtime configuration for mode selection
3. Include MCP tool annotations for permission hints
4. Provide helpful error messages that guide clients to correct usage
5. Document operation-to-endpoint-family mapping via introspection

### 9.3 MAY Requirements

Conforming implementations MAY:

1. Support `all` mode exposing both grouped and single surfaces simultaneously
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
