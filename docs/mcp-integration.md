# MCP Integration Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

## Abstract

This document specifies how MCP-AQL adapters integrate with the Model Context Protocol (MCP). It defines tool registration requirements, input schema composition, error mapping between protocols, progress notification handling, and multi-adapter deployment patterns.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Tool Registration](#2-tool-registration)
3. [Input Schema Composition](#3-input-schema-composition)
4. [Error Mapping](#4-error-mapping)
5. [Progress Notifications](#5-progress-notifications)
6. [Multi-Adapter Deployment](#6-multi-adapter-deployment)
7. [Conformance Requirements](#7-conformance-requirements)

---

## 1. Introduction

### 1.1 Purpose

MCP-AQL is a protocol layer that sits atop the Model Context Protocol. This specification defines the integration semantics between the two protocols, ensuring that:

- Clients can discover MCP-AQL operations through standard MCP tool registration
- Error handling is consistent across both protocol layers
- Multiple MCP-AQL adapters can coexist in a single MCP session

### 1.2 The Bootstrap Problem

MCP-AQL uses introspection for operation discovery, but an agent can only know that `introspect` exists if the MCP tool description explicitly advertises it. This creates a bootstrap dependency that this specification resolves through normative tool description requirements.

### 1.3 Scope

This specification covers:
- MCP tool description templates
- Input schema composition rules
- Error code mapping between MCP-AQL and MCP
- Progress notification integration for EXECUTE operations
- Multi-adapter deployment patterns

### 1.4 Relationship to MCP

MCP-AQL adapters are MCP servers that expose operations through grouped semantic endpoint families or a single unified endpoint. The standard CRUDE profile is one grouped endpoint-family pattern, but adapters MAY define alternate grouped families that better match the target domain. All MCP transport and lifecycle requirements apply. This specification defines additional requirements specific to MCP-AQL tool registration and error handling.

---

## 2. Tool Registration

### 2.1 Tool Description Requirements

MCP-AQL adapters MUST include the `introspect` operation in their tool descriptions. This solves the bootstrap problem by ensuring agents know how to discover available operations.

#### 2.1.1 Grouped Mode Tool Descriptions

In Grouped mode, each exposed endpoint family registers as a separate MCP tool. Tool descriptions MUST follow one of the grouped-mode patterns below.

**Standard CRUDE Profile:**

When the adapter exposes the standard CRUDE profile, tool descriptions SHOULD follow these templates:

**CREATE Endpoint:**
```
[Semantic category description].

Supported operations: [operation_list]

[Element types if applicable]

These operations add new data without removing or overwriting existing content.

Quick start examples:
{ operation: "[example_op]", params: { [example_params] } }

Discover required parameters:
{ operation: "introspect", params: { query: "operations", name: "[operation_name]" } }
```

**READ Endpoint:**
```
Safe, read-only operations.

Supported operations: [operation_list]

[Element types if applicable]

These queries only read data and never modify server state.

Quick start examples:
{ operation: "list_elements", element_type: "[type]" }
{ operation: "get_active_elements", element_type: "[type]" }
{ operation: "search_elements", params: { query: "[search_term]" } }

Discover all operations and parameters:
{ operation: "introspect", params: { query: "operations" } }
```

**UPDATE Endpoint:**
```
Modifying operations that overwrite data.

Supported operations: [operation_list]

[Element types if applicable]

These operations modify existing data, potentially overwriting previous values.

Quick start example:
{ operation: "[example_op]", params: { [example_params] } }

Discover required parameters:
{ operation: "introspect", params: { query: "operations", name: "[operation_name]" } }
```

**DELETE Endpoint:**
```
Destructive operations that remove data.

Supported operations: [operation_list]

[Element types if applicable]

These operations remove data. Use with caution.

Quick start examples:
{ operation: "[example_op]", params: { [example_params] } }

Discover required parameters:
{ operation: "introspect", params: { query: "operations", name: "[operation_name]" } }
```

**EXECUTE Endpoint:**
```
Execution lifecycle operations for [executable element types].

Supported operations: [operation_list]

These operations manage runtime execution state. Unlike CRUD operations (which manage definitions), Execute operations handle the execution lifecycle:
- [operation]: [description]

IMPORTANT: Execute operations are potentially destructive and non-idempotent.

Quick start examples:
{ operation: "[example_op]", params: { [example_params] } }

Discover required parameters:
{ operation: "introspect", params: { query: "operations", name: "[operation_name]" } }
```

**Adapter-Defined Grouped Profiles:**

When the adapter exposes custom grouped endpoint families, each tool description SHOULD follow this template:

```
[Endpoint family purpose].

Primary semantic categories: [category_list]

Supported operations: [operation_list]

[Domain notes if applicable]

Quick start example:
{ operation: "[example_op]", params: { [example_params] } }

Discover all operations and parameters:
{ operation: "introspect", params: { query: "operations" } }
```

Adapters SHOULD describe both the family purpose and the kinds of operations it contains so agents can choose between families before calling introspection details.

#### 2.1.2 Single Mode Tool Description

In Single mode, a single MCP tool is registered with this template:

```
MCP-AQL [domain] adapter. All operations through unified entry point.

Operations are automatically routed based on their documented semantic category and endpoint-family mapping.

Supported operation categories:
- Create: [brief list]
- Read: [brief list]
- Update: [brief list]
- Delete: [brief list]
- Execute: [brief list]

Quick start:
{ operation: "introspect", params: { query: "operations" } }

Use introspection to discover all available operations and their parameters.
```

### 2.2 Tool Naming

#### 2.2.1 Standard Tool Names

Implementations SHOULD use these standard tool names:

**Standard CRUDE Profile:**
| Tool Name | Purpose |
|-----------|---------|
| `mcp_aql_create` | CREATE operations |
| `mcp_aql_read` | READ operations |
| `mcp_aql_update` | UPDATE operations |
| `mcp_aql_delete` | DELETE operations |
| `mcp_aql_execute` | EXECUTE operations |

**Adapter-Defined Grouped Mode:**

Adapters MAY use domain-shaped tool names such as `mcp_aql_catalog`, `mcp_aql_data`, or `mcp_aql_jobs`. These names SHOULD remain stable within an adapter and MUST be discoverable via introspection.

**Single Mode:**
| Tool Name | Purpose |
|-----------|---------|
| `mcp_aql` | All operations |

#### 2.2.2 Custom Tool Name Prefixes

When multiple MCP-AQL adapters are deployed in a single session, tool names MUST be disambiguated. See [Section 6](#6-multi-adapter-deployment) for details.

### 2.3 MCP Tool Annotations

Adapters SHOULD include MCP tool annotations to provide permission hints:

**Standard CRUDE Profile Annotations:**
```json
{
  "name": "mcp_aql_read",
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false
  }
}

{
  "name": "mcp_aql_create",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": false
  }
}

{
  "name": "mcp_aql_update",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true
  }
}

{
  "name": "mcp_aql_delete",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true
  }
}

{
  "name": "mcp_aql_execute",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true
  }
}
```

**Adapter-Defined Grouped Mode Annotations:**
```json
{
  "name": "mcp_aql_jobs",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true
  }
}
```

Grouped endpoint families SHOULD set annotations conservatively based on the riskiest operation the family exposes.

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

> **Note:** Single mode uses `destructiveHint: true` because the unified endpoint can route to destructive operations. Clients cannot determine safety from the endpoint alone.

---

## 3. Input Schema Composition

### 3.1 Standard Input Schema

All MCP-AQL tools MUST use this base input schema:

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
      "description": "Operation parameters",
      "additionalProperties": true
    }
  },
  "required": ["operation"]
}
```

### 3.2 Extended Input Schema

Adapters MAY extend the base schema with additional top-level properties for common cross-cutting concerns:

```json
{
  "type": "object",
  "properties": {
    "operation": {
      "type": "string",
      "description": "Operation name to execute"
    },
    "element_type": {
      "type": "string",
      "description": "Target element type (optional)"
    },
    "params": {
      "type": "object",
      "description": "Operation parameters",
      "additionalProperties": true
    }
  },
  "required": ["operation"]
}
```

### 3.3 Dynamic Operation Enumeration

Adapters MAY use dynamic `enum` generation for the `operation` property to provide client-side validation and autocompletion:

```json
{
  "type": "object",
  "properties": {
    "operation": {
      "type": "string",
      "description": "Operation name to execute",
      "enum": ["list_elements", "get_element", "search_elements", "introspect"]
    },
    "params": {
      "type": "object",
      "description": "Operation parameters"
    }
  },
  "required": ["operation"]
}
```

> **Note:** Dynamic enumeration increases tool registration token cost. Implementations SHOULD consider the trade-off between discoverability and token efficiency. For large operation sets, prefer introspection over enumeration.

### 3.4 Grouped Mode Schema Composition

In Grouped mode, each exposed endpoint family MAY have a schema that enumerates only operations valid for that family:

```json
{
  "name": "mcp_aql_data",
  "inputSchema": {
    "type": "object",
    "properties": {
      "operation": {
        "type": "string",
        "description": "Data-family operation to execute",
        "enum": ["list_elements", "get_element", "search_elements", "introspect"]
      },
      "params": {
        "type": "object"
      }
    },
    "required": ["operation"]
  }
}
```

This approach:
- Prevents clients from sending operations to wrong endpoints
- Provides endpoint-specific autocompletion
- Increases token cost proportionally to operation count

---

## 4. Error Mapping

### 4.1 MCP-AQL to MCP Error Mapping

MCP-AQL errors are returned as `CallToolResult` content, not as MCP JSON-RPC errors. The `isError` flag on `CallToolResult` indicates whether the client should treat the response as an error condition.

#### 4.1.1 Mapping Table

| MCP-AQL Response | MCP `isError` | Rationale |
|------------------|---------------|-----------|
| `success: true` | `false` | Normal success |
| `success: false`, recoverable error | `false` | Domain-level error; agent should interpret and recover |
| `success: false`, unrecoverable error | `true` | Protocol failure; agent cannot recover without intervention |

#### 4.1.2 Recoverable vs Unrecoverable Errors

**Recoverable errors** (`isError: false`):
- `NOT_FOUND_RESOURCE` - Resource doesn't exist; agent can try different resource
- `NOT_FOUND_OPERATION` - Operation doesn't exist; agent can use introspect
- `VALIDATION_MISSING_PARAM` - Missing parameter; agent can add parameter
- `VALIDATION_INVALID_TYPE` - Wrong type; agent can fix type
- `PERMISSION_DENIED` - Access denied; agent can inform user or try alternative
- `RATE_LIMIT_EXCEEDED` - Rate limited; agent can wait and retry
- `CONFIRMATION_REQUIRED` - Needs confirmation; agent can request user confirmation

**Unrecoverable errors** (`isError: true`):
- Schema validation failures before dispatch
- Unknown operations with no recovery path
- Internal server errors
- Transport failures

#### 4.1.3 Implementation Guidance

```typescript
function toCallToolResult(response: OperationResult): CallToolResult {
  const content = [{
    type: "text",
    text: JSON.stringify(response)
  }];

  if (response.success) {
    return { content, isError: false };
  }

  // Determine if error is recoverable
  const recoverableErrors = [
    "NOT_FOUND_RESOURCE",
    "NOT_FOUND_OPERATION",
    "VALIDATION_MISSING_PARAM",
    "VALIDATION_INVALID_TYPE",
    "VALIDATION_INVALID_VALUE",
    "PERMISSION_DENIED",
    "RATE_LIMIT_EXCEEDED",
    "RATE_LIMIT_QUOTA_PAUSE",
    "CONFIRMATION_REQUIRED"
  ];

  const isRecoverable = recoverableErrors.includes(response.error.code);

  return {
    content,
    isError: !isRecoverable
  };
}
```

### 4.2 MCP JSON-RPC Error Codes

MCP JSON-RPC errors (-32600 to -32603) are reserved for transport and protocol-level failures. MCP-AQL adapters MUST NOT use these codes for domain-level errors.

| JSON-RPC Code | Description | When Used |
|---------------|-------------|-----------|
| -32600 | Invalid Request | Malformed JSON-RPC request |
| -32601 | Method not found | Unknown MCP method |
| -32602 | Invalid params | Invalid MCP method parameters |
| -32603 | Internal error | MCP server internal error |

Domain-level errors (validation, not found, permission) MUST be returned as `CallToolResult` with `success: false`, not as JSON-RPC errors.

### 4.3 HTTP Status to MCP-AQL Error Mapping

When adapters wrap HTTP APIs, HTTP status codes SHOULD be mapped to MCP-AQL error codes:

| HTTP Status | MCP-AQL Error Code | Notes |
|-------------|-------------------|-------|
| 400 | `VALIDATION_INVALID_TYPE` | Bad request |
| 401 | `PERMISSION_DENIED` | Authentication required |
| 403 | `PERMISSION_DENIED` | Forbidden |
| 404 | `NOT_FOUND_RESOURCE` | Not found |
| 409 | `CONFLICT_ALREADY_EXISTS` | Conflict |
| 422 | `VALIDATION_INVALID_TYPE` | Unprocessable entity |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limited |
| 500+ | `INTERNAL_ERROR` | Server errors |

See [Structured Error Codes Specification](./error-codes.md) for the complete error code taxonomy.

---

## 5. Progress Notifications

### 5.1 MCP Progress Protocol

MCP supports progress notifications for long-running operations via the `notifications/progress` method. MCP-AQL EXECUTE operations SHOULD emit progress notifications when:

- The operation will take significant time (> 1 second)
- The operation has measurable progress stages
- The client provided a progress token

### 5.2 Progress Token Handling

Clients MAY include a `_meta.progressToken` in requests to receive progress updates:

```json
{
  "operation": "execute_agent",
  "params": {
    "element_name": "MyAgent",
    "parameters": { "goal": "Review code" }
  },
  "_meta": {
    "progressToken": "progress_abc123"
  }
}
```

Adapters receiving a progress token SHOULD emit progress notifications during EXECUTE operations.

### 5.3 Progress Notification Format

Progress notifications MUST follow the MCP progress notification format:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "progress_abc123",
    "progress": 50,
    "total": 100,
    "message": "Processing step 5 of 10"
  }
}
```

### 5.4 EXECUTE Operation Progress Mapping

For EXECUTE operations with defined state machines, map states to progress:

| EXECUTE State | Progress Range | Description |
|---------------|----------------|-------------|
| Initializing | 0-10% | Setting up execution context |
| Running | 10-90% | Main execution phase |
| Completing | 90-100% | Finalizing and cleaning up |

**Example mapping:**
```typescript
function mapExecutionStateToProgress(state: ExecutionState): number {
  switch (state.status) {
    case "pending": return 0;
    case "initializing": return 5;
    case "running":
      // Calculate progress within running phase
      const runningProgress = state.stepsCompleted / state.totalSteps;
      return 10 + (runningProgress * 80);
    case "completing": return 95;
    case "completed": return 100;
    default: return 0;
  }
}
```

### 5.5 Progress for Non-EXECUTE Operations

READ, CREATE, UPDATE, and DELETE operations MAY emit progress notifications for long-running operations such as:

- Bulk imports (CREATE)
- Large search queries (READ)
- Batch updates (UPDATE)
- Bulk deletions (DELETE)

---

## 6. Multi-Adapter Deployment

### 6.1 The Collision Problem

When multiple MCP-AQL adapters are deployed in a single MCP session, tool names may collide. Two adapters both registering `mcp_aql_read` or `mcp_aql_catalog` creates ambiguity.

### 6.2 Tool Name Prefixing

Implementations SHOULD support a tool name prefix for disambiguation:

**Environment Variable:**
```
MCP_AQL_TOOL_PREFIX=github_
```

**Result:**
```
github_mcp_aql_create
github_mcp_aql_read
github_mcp_aql_catalog
github_mcp_aql_update
github_mcp_aql_delete
github_mcp_aql_execute
```

### 6.3 Configuration Methods

Adapters SHOULD support prefix configuration via:

1. Environment variable: `MCP_AQL_TOOL_PREFIX`
2. Configuration file
3. Programmatic API

**Priority order:** Environment variable > Configuration file > Default (no prefix)

### 6.4 Prefix Format Requirements

Tool name prefixes:
- MUST contain only lowercase letters, numbers, and underscores
- MUST end with an underscore
- SHOULD be short (< 20 characters)
- SHOULD be descriptive of the adapter's domain

**Examples:**
- `github_` for GitHub API adapter
- `jira_` for Jira adapter
- `slack_` for Slack adapter
- `db_` for database adapter

### 6.5 Client-Side Disambiguation

When multiple MCP-AQL adapters are present, clients SHOULD:

1. Group tools by prefix to identify adapter boundaries
2. Use introspection on each adapter to discover operations
3. Present operations with adapter context to users

**Example client logic:**
```typescript
function groupAdapterTools(tools: Tool[]): Map<string, Tool[]> {
  const groups = new Map<string, Tool[]>();

  for (const tool of tools) {
    // Extract prefix from tool name
    const match = tool.name.match(/^(.+_)?mcp_aql(?:_([a-z0-9_]+))?$/);
    const prefix = match && match[1] ? match[1] : "";

    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix)!.push(tool);
  }

  return groups;
}
```

### 6.6 Introspection Disambiguation

Each adapter's introspection returns only its own operations. Clients discover the full operation space by querying each adapter:

```javascript
// Query GitHub adapter
{ operation: "introspect", params: { query: "operations" } }
// Returns: list_repos, get_repo, create_issue, etc.

// Query Jira adapter
{ operation: "introspect", params: { query: "operations" } }
// Returns: list_projects, get_issue, create_ticket, etc.
```

---

## 7. Conformance Requirements

### 7.1 MUST Requirements

Conforming implementations MUST:

1. Include `introspect` operation reference in tool descriptions
2. Use the standard input schema structure (`operation`, `params`)
3. Return domain errors as `CallToolResult` content, not JSON-RPC errors
4. Map `success: false` responses to `CallToolResult` with appropriate `isError` flag
5. Use unique tool names when multiple adapters are deployed

### 7.2 SHOULD Requirements

Conforming implementations SHOULD:

1. Use the standard tool names (`mcp_aql_create`, etc.) when exposing the CRUDE profile
2. Include MCP tool annotations for permission hints
3. Support the `MCP_AQL_TOOL_PREFIX` environment variable
4. Emit progress notifications for long-running EXECUTE operations
5. Map HTTP errors to MCP-AQL error codes consistently

### 7.3 MAY Requirements

Conforming implementations MAY:

1. Use dynamic `enum` generation for operation names
2. Extend the input schema with additional top-level properties
3. Emit progress notifications for non-EXECUTE operations
4. Support additional prefix configuration methods

---

## References

- [MCP-AQL Specification v1.0.0-draft](versions/v1.0.0-draft.md)
- [Endpoint Modes Specification](endpoint-modes.md)
- [Operations Specification](operations.md)
- [Structured Error Codes Specification](error-codes.md)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
