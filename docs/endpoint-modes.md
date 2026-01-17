# MCP-AQL Endpoint Modes Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-16

## Abstract

MCP-AQL supports two operational modes for exposing endpoints to clients: CRUDE mode (5 semantic endpoints) and Single mode (1 unified endpoint). This document specifies configuration, routing behavior, security implications, and trade-offs for each mode.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Mode Comparison](#2-mode-comparison)
3. [Configuration](#3-configuration)
4. [CRUDE Mode](#4-crude-mode)
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
| **CRUDE Mode** | Five separate MCP tools, one per semantic endpoint |
| **Single Mode** | One unified MCP tool that routes internally |
| **Endpoint** | An MCP tool registered with the client |
| **Operation** | A named action within an endpoint |

---

## 2. Mode Comparison

### 2.1 Summary

| Aspect | CRUDE Mode (5 Endpoints) | Single Mode (1 Endpoint) |
|--------|--------------------------|--------------------------|
| **Endpoints** | 5 semantic endpoints | 1 unified endpoint |
| **Typical Token Cost** | ~4,300 tokens | ~1,100 tokens |
| **Routing** | Client chooses endpoint | Server routes internally |
| **Permission Control** | Endpoint-level granularity | Operation-level only |
| **Client Complexity** | Client MUST select correct endpoint | Simple single entry point |
| **Error Messages** | Semantic endpoint mismatch errors | Generic routing errors |

### 2.2 Visual Comparison

```
CRUDE Mode                          Single Mode
============                        ===========

Client                              Client
  |                                   |
  +---> mcp_aql_create                +---> mcp_aql
  |                                         |
  +---> mcp_aql_read                        v
  |                                   [Internal Router]
  +---> mcp_aql_update                      |
  |                                   +-----+-----+-----+-----+
  +---> mcp_aql_delete                |     |     |     |     |
  |                                   C     R     U     D     E
  +---> mcp_aql_execute
```

### 2.3 Token Efficiency

Endpoint consolidation provides significant token reduction compared to discrete tools:

| Configuration | Typical Token Cost | Reduction |
|---------------|-------------------|-----------|
| Discrete tools (e.g., 40+ tools) | ~30,000 tokens | baseline |
| CRUDE mode (5 endpoints) | ~4,300 tokens | ~85% |
| Single mode (1 endpoint) | ~1,100 tokens | ~96% |

Note: Actual token costs vary based on operation count and description length.

---

## 3. Configuration

### 3.1 Mode Selection

Implementations SHOULD provide runtime configuration for endpoint mode selection.

**Recommended Environment Variable:**
```
MCP_AQL_ENDPOINT_MODE=crude|single|all
```

**Values:**
| Value | Behavior |
|-------|----------|
| `crude` | Register 5 semantic endpoints |
| `single` | Register 1 unified endpoint |
| `all` | Register all 6 endpoints |

### 3.2 Default Mode

If no configuration is provided, implementations SHOULD default to CRUDE mode, which provides the best balance of token efficiency and permission granularity.

### 3.3 Runtime Configuration

Implementations MAY support additional configuration methods:
- Configuration files
- Programmatic API
- Environment-specific defaults

---

## 4. CRUDE Mode

### 4.1 Endpoint Registration

In CRUDE mode, five MCP tools are registered:

| Tool Name | Semantic Category | Operations |
|-----------|-------------------|------------|
| `mcp_aql_create` | Additive, non-destructive | Create, add, register |
| `mcp_aql_read` | Safe, read-only | List, get, search, introspect |
| `mcp_aql_update` | Modifying | Edit, modify, update |
| `mcp_aql_delete` | Destructive | Delete, remove, clear |
| `mcp_aql_execute` | Runtime lifecycle | Run, start, stop, cancel |

### 4.2 Client Responsibility

In CRUDE mode, clients MUST select the correct endpoint for each operation. If a client sends an operation to the wrong endpoint, the adapter MUST reject the request.

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

### 4.3 Route Enforcement

Adapters MUST validate that operations are sent to their assigned endpoint.

**Validation Logic:**
1. Extract operation name from request
2. Look up the correct endpoint for that operation
3. Compare with the endpoint that received the request
4. If mismatch, return an error specifying the correct endpoint

### 4.4 Endpoint Descriptions

Each endpoint SHOULD include a description listing:
- The semantic category
- Available operations (or a sample with introspection guidance)
- Quick-start examples

**Example Description Format:**
```
Additive, non-destructive operations.

Supported operations: create_item, add_entry, register_callback

These operations add new data without removing or overwriting existing content.

Quick start example:
{ operation: "create_item", params: { name: "example" } }

Use introspection to discover all available operations:
{ operation: "introspect", params: { query: "operations" } }
```

---

## 5. Single Mode

### 5.1 Endpoint Registration

In Single mode, one MCP tool is registered:

| Tool Name | Purpose |
|-----------|---------|
| `mcp_aql` | All operations through unified entry point |

### 5.2 Server-Side Routing

The adapter routes operations internally based on their classification:

```
Client Request
     |
     v
mcp_aql endpoint
     |
     v
[Operation Router]
     |
     +---> Determines correct CRUDE category
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
2. The adapter determines the correct handler based on operation classification
3. The same semantic rules apply as CRUDE mode
4. Permission enforcement occurs server-side

### 5.4 Unknown Operations

If an operation is not recognized:

```javascript
{
  success: false,
  error: "Unknown operation: 'invalid_op'. Use introspect to discover available operations."
}
```

### 5.5 Endpoint Description

The unified endpoint SHOULD provide:
- Overview of available operation categories
- Guidance to use introspection for discovery
- Quick-start examples

**Example Description:**
```
Unified MCP-AQL endpoint for all operations.

Operations are automatically routed based on their semantic category (Create, Read, Update, Delete, Execute).

Use introspection to discover available operations:
{ operation: "introspect", params: { query: "operations" } }
```

---

## 6. Security Considerations

### 6.1 CRUDE Mode Security

**Advantages:**
- Endpoint-level permission blocking (e.g., disable `mcp_aql_delete` entirely)
- Semantic errors help clients self-correct
- Platform-level permission hints via MCP annotations
- Clear audit separation by operation category

**Characteristics:**
- Client is responsible for endpoint selection
- Adapter enforces route validation
- Dangerous operations isolated to DELETE/EXECUTE endpoints

### 6.2 Single Mode Security

**Advantages:**
- Smaller attack surface (one endpoint)
- Server-side routing prevents endpoint bypass
- Simpler client implementation reduces error risk

**Characteristics:**
- Cannot block operations by endpoint
- All routing decisions made server-side
- Audit logging requires operation-level granularity

### 6.3 Security Trade-offs

| Security Aspect | CRUDE Mode | Single Mode |
|-----------------|------------|-------------|
| Endpoint-level blocking | Yes | No |
| Client error prevention | Better (semantic errors) | Worse (generic errors) |
| Attack surface | Larger (5 endpoints) | Smaller (1 endpoint) |
| Audit granularity | Endpoint + Operation | Operation only |
| Bypass resistance | Client-dependent | Server-enforced |

### 6.4 Common Security Enforcement

Both modes MUST:
- Validate operation parameters
- Enforce the same permission model
- Apply safety tier classifications
- Support confirmation for destructive operations (if implemented)

---

## 7. Tool Registration

### 7.1 MCP Tool Annotations

Adapters SHOULD include MCP tool annotations to hint at operation safety:

**CRUDE Mode Annotations:**
```json
{
  "name": "mcp_aql_read",
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false
  }
}

{
  "name": "mcp_aql_delete",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true
  }
}
```

**Single Mode Annotations:**
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

Both modes use the same input schema:

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

Adapters MAY extend this schema with additional common properties (e.g., `resource_type`, `fields`).

---

## 8. Conformance Requirements

### 8.1 MUST Requirements

Conforming implementations MUST:

1. Support at least one endpoint mode (CRUDE or Single)
2. Enforce operation routing validation in CRUDE mode
3. Return proper error responses for unknown operations
4. Route operations to correct handlers in Single mode
5. Apply consistent permission enforcement regardless of mode

### 8.2 SHOULD Requirements

Conforming implementations SHOULD:

1. Support both CRUDE and Single endpoint modes
2. Provide runtime configuration for mode selection
3. Include MCP tool annotations for permission hints
4. Provide helpful error messages that guide clients to correct usage
5. Document available operations via introspection

### 8.3 MAY Requirements

Conforming implementations MAY:

1. Support "all" mode exposing all 6 endpoints simultaneously
2. Implement per-endpoint access control
3. Provide mode-specific audit logging
4. Support dynamic mode switching without restart
5. Implement custom endpoint naming conventions

---

## References

- [MCP-AQL Specification v1.0.0-draft](versions/v1.0.0-draft.md)
- [CRUDE Pattern Specification](crude-pattern.md)
- [Gatekeeper Security Model](security/gatekeeper.md)
- [Introspection Specification](introspection.md)
