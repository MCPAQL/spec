# MCP-AQL Protocol Overview

> **MCP-AQL** (Model Context Protocol - Agent Query Language) is a protocol that
> consolidates discrete MCP tools into 5 CRUDE endpoints (Create, Read, Update,
> Delete, Execute), providing significant token reduction while maintaining full
> functionality.

## Table of Contents

- [Protocol Summary](#protocol-summary)
- [The CRUDE Pattern](#the-crude-pattern)
- [Endpoint Modes](#endpoint-modes)
- [Token Efficiency](#token-efficiency)
- [Core Concepts](#core-concepts)
- [Request Flow](#request-flow)
- [Batch Operations](#batch-operations)

---

## Protocol Summary

MCP-AQL defines a schema-driven operation dispatch protocol that:

1. **Consolidates Operations** - Many discrete tools into 5 semantic endpoints
2. **Enables Discovery** - GraphQL-style introspection for runtime operation discovery
3. **Enforces Safety** - Endpoint classification validates operation/endpoint matching
4. **Supports Flexibility** - Implementations MAY offer CRUDE mode (5 endpoints) or Single mode (1 endpoint)

```
+-------------------+
|    MCP Client     |
+--------+----------+
         |
         v
+-------------------+
|  MCP-AQL Layer    |
|  +-------------+  |
|  |  Gatekeeper |  |  Route Validation
|  +------+------+  |
|         |         |
|  +------v------+  |
|  |   Router    |  |  Endpoint Mapping
|  +------+------+  |
|         |         |
|  +------v------+  |
|  |   Schema    |  |  Operation Definitions
|  +------+------+  |
|         |         |
|  +------v------+  |
|  | Dispatcher  |  |  Handler Resolution
|  +-------------+  |
+--------+----------+
         |
         v
+-------------------+
| Target Handlers   |
+-------------------+
```

---

## The CRUDE Pattern

MCP-AQL extends traditional CRUD with an **EXECUTE** endpoint, creating the CRUDE pattern:

| Endpoint | Safety | Description | Example Operations |
|----------|--------|-------------|-------------------|
| **CREATE** | Non-destructive | Additive operations that create new state | `create_entity`, `import_resource` |
| **READ** | Read-only | Safe operations that query state | `list_entities`, `get_entity`, `search`, `introspect` |
| **UPDATE** | Modifying | Operations that modify existing state | `edit_entity`, `update_resource` |
| **DELETE** | Destructive | Operations that remove state | `delete_entity`, `clear` |
| **EXECUTE** | Runtime | Lifecycle operations for executable elements | `execute`, `get_execution_state`, `complete_execution` |

### Permission Characteristics

Each endpoint MUST have defined permission characteristics:

| Endpoint | Read-Only | Destructive |
|----------|-----------|-------------|
| CREATE   | false     | false       |
| READ     | true      | false       |
| UPDATE   | false     | true        |
| DELETE   | false     | true        |
| EXECUTE  | false     | true        |

Implementations MUST classify operations according to these permission characteristics and MUST NOT allow an operation to be called through an endpoint that does not match its classification.

### Why CRUDE not CRUD?

The EXECUTE endpoint exists because certain operations:

- Are inherently **non-idempotent** (calling `execute` twice creates two separate executions)
- Manage **runtime state** rather than persistent definitions
- Require **lifecycle management** (start, update progress, complete, resume)

```
CRUD (Resource Definitions)          EXECUTE (Runtime Lifecycle)
+--------+                           +-------------------+
| Create |-------------------------->| execute           |
+--------+                           +--------+----------+
| Read   |                                    |
+--------+                           +--------v----------+
| Update |                           | get_execution_state|
+--------+                           +--------+----------+
| Delete |                                    |
+--------+                           +--------v----------+
                                     | update_execution   |
                                     +--------+----------+
                                              |
                              +---------------+---------------+
                              |                               |
                     +--------v----------+           +--------v----------+
                     | complete_execution|           | continue_execution|
                     +-------------------+           +-------------------+
```

---

## Endpoint Modes

MCP-AQL supports two operational modes. Implementations SHOULD support at least one mode and MAY support both:

### CRUDE Mode

Exposes 5 separate endpoints, each with semantic meaning:

```
mcp_aql_create  - CREATE operations
mcp_aql_read    - READ operations
mcp_aql_update  - UPDATE operations
mcp_aql_delete  - DELETE operations
mcp_aql_execute - EXECUTE operations
```

**Advantages:**
- Clear semantic grouping
- Endpoint-level permission control
- Clients MAY choose which endpoints to expose

### Single Mode

Exposes 1 unified endpoint that routes internally:

```
mcp_aql - All operations through single entry point
```

**Advantages:**
- Minimal token footprint
- Simpler client integration
- Server-side routing enforcement

Implementations using Single Mode MUST still enforce endpoint classification internally. An operation classified as DELETE MUST NOT succeed if the implementation would not allow DELETE operations.

---

## Token Efficiency

### Token Reduction

The primary motivation for MCP-AQL is reducing the token cost of tool registration. Empirical measurements demonstrate:

| Configuration | Approximate Token Cost | Reduction |
|--------------|------------------------|-----------|
| Discrete Tools (50+) | ~30,000 tokens | baseline |
| CRUDE Mode (5 endpoints) | ~4,500 tokens | ~85% |
| Single Mode (1 endpoint) | ~1,100 tokens | ~96% |

### Runtime Discovery

Instead of parsing many tool schemas at registration time, clients use introspection at runtime:

```javascript
// Query all available operations
{ operation: "introspect", params: { query: "operations" } }

// Get details for a specific operation
{ operation: "introspect", params: { query: "operations", name: "create_entity" } }

// Query available types
{ operation: "introspect", params: { query: "types", name: "EntityType" } }
```

Implementations MUST support the `introspect` operation on the READ endpoint.

---

## Core Concepts

### Schema-Driven Operations

Operations SHOULD be defined declaratively with:

- **name** - The operation identifier
- **endpoint** - The CRUDE endpoint classification
- **description** - Human-readable description
- **params** - Required and optional parameter definitions
- **handler** - Reference to the implementation handler

### Gatekeeper

The Gatekeeper component enforces that operations are only callable through their designated endpoints. Implementations MUST validate that:

1. The operation exists
2. The operation is allowed on the requested endpoint
3. Required parameters are present

### Introspection

MCP-AQL implementations MUST provide GraphQL-style introspection capabilities:

- List all available operations
- Get detailed information about specific operations
- Query available types and enumerations
- Discover parameter requirements

---

## Request Flow

### Standard Request

```
1. Client sends { operation, params } to endpoint
2. Gatekeeper validates operation is allowed on endpoint
3. Router resolves operation to handler
4. Schema validates required parameters
5. Dispatcher invokes handler with mapped parameters
6. Handler returns result
7. Response formatted as { success: true, data } or { success: false, error }
```

### Response Format

All MCP-AQL operations MUST return discriminated responses:

**Success:**
```javascript
{
  success: true,
  data: { /* operation result */ }
}
```

**Failure:**
```javascript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Required parameter 'entity_name' is missing"
  }
}
```

Implementations SHOULD include an error `code` for programmatic handling and MUST include a human-readable `message`.

---

## Batch Operations

MCP-AQL implementations MAY support batch operations for executing multiple operations in a single request.

### Batch Request Format

```javascript
{
  operations: [
    { operation: "create_entity", params: { name: "entity1" } },
    { operation: "create_entity", params: { name: "entity2" } },
    { operation: "activate_entity", params: { name: "entity1" } }
  ]
}
```

### Batch Response Format

```javascript
{
  success: true,
  results: [
    { index: 0, operation: "create_entity", result: { success: true, data: { /* ... */ } } },
    { index: 1, operation: "create_entity", result: { success: true, data: { /* ... */ } } },
    { index: 2, operation: "activate_entity", result: { success: true, data: { /* ... */ } } }
  ],
  summary: { total: 3, succeeded: 3, failed: 0 }
}
```

When batch operations are supported, implementations:
- MUST process operations in order
- MUST include results for all operations, including failures
- SHOULD continue processing after individual operation failures
- MAY provide a configuration option to stop on first failure

---

## Conformance

An MCP-AQL implementation is conformant if it:

1. Implements at least one endpoint mode (CRUDE or Single)
2. Enforces endpoint classification for all operations
3. Provides the `introspect` operation on the READ endpoint
4. Returns discriminated responses for all operations
5. Validates required parameters before dispatching

---

## Related Specifications

- [Operations Reference](./operations.md) - Complete operation reference
- [Introspection](./introspection.md) - Introspection system specification
- [MCP Integration](./mcp-integration.md) - MCP protocol integration specification
- [Response Format](./responses.md) - Response format specification
