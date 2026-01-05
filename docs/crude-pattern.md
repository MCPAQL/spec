# MCP-AQL CRUDE Pattern Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-05

## Abstract

This document specifies the CRUDE (Create, Read, Update, Delete, Execute) endpoint pattern, which extends traditional CRUD semantics with an Execute endpoint for runtime lifecycle operations.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Endpoint Definitions](#2-endpoint-definitions)
3. [Permission Model](#3-permission-model)
4. [Endpoint Modes](#4-endpoint-modes)
5. [Operation Routing](#5-operation-routing)
6. [Conformance Requirements](#6-conformance-requirements)

---

## 1. Introduction

### 1.1 Purpose

The CRUDE pattern provides semantic grouping of operations by their effect on system state. This grouping enables:

- Permission-based access control at the endpoint level
- Clear separation of read-only, additive, modifying, and destructive operations
- Explicit handling of runtime execution lifecycle operations

### 1.2 Rationale for EXECUTE

Traditional CRUD patterns assume operations are primarily concerned with data persistence. However, MCP servers often provide executable elements (agents, workflows, pipelines) that require:

- **Non-idempotent operations** - Calling `execute_agent` twice creates two separate executions
- **Lifecycle management** - Start, monitor, update progress, complete
- **Runtime state** - Distinct from element definitions

The EXECUTE endpoint addresses these requirements explicitly.

---

## 2. Endpoint Definitions

### 2.1 CREATE Endpoint

**Identifier:** `CREATE`
**MCP Tool Name:** `mcp_aql_create`

Operations that add new state without removing or modifying existing state.

**Characteristics:**
- Non-destructive
- Additive only
- May fail if duplicate state would be created

**Core Operations:**
| Operation | Description |
|-----------|-------------|
| `create_element` | Create a new element |
| `import_element` | Import an element from external data |
| `activate_element` | Activate an element for use |
| `addEntry` | Add an entry to a memory element |

### 2.2 READ Endpoint

**Identifier:** `READ`
**MCP Tool Name:** `mcp_aql_read`

Operations that query state without modification.

**Characteristics:**
- Read-only
- No side effects on stored state
- Safe to call repeatedly (idempotent)

**Core Operations:**
| Operation | Description |
|-----------|-------------|
| `list_elements` | List elements with optional filtering |
| `get_element` | Retrieve a specific element by name |
| `search` | Search across elements |
| `introspect` | Discover available operations and types |
| `render` | Render a template with variables |
| `export_element` | Export an element to portable format |
| `get_active_elements` | List currently active elements |

### 2.3 UPDATE Endpoint

**Identifier:** `UPDATE`
**MCP Tool Name:** `mcp_aql_update`

Operations that modify existing state.

**Characteristics:**
- Modifying
- Requires existing state to modify
- May be destructive to prior values

**Core Operations:**
| Operation | Description |
|-----------|-------------|
| `edit_element` | Modify an existing element |
| `deactivate_element` | Deactivate an active element |

### 2.4 DELETE Endpoint

**Identifier:** `DELETE`
**MCP Tool Name:** `mcp_aql_delete`

Operations that remove state permanently.

**Characteristics:**
- Destructive
- Irreversible without backup
- MAY require confirmation

**Core Operations:**
| Operation | Description |
|-----------|-------------|
| `delete_element` | Permanently delete an element |
| `clear` | Clear all entries from a memory element |

### 2.5 EXECUTE Endpoint

**Identifier:** `EXECUTE`
**MCP Tool Name:** `mcp_aql_execute`

Operations that manage the runtime execution lifecycle of executable elements.

**Characteristics:**
- Stateful (maintains execution context)
- Non-idempotent (each call may create new state)
- Potentially destructive (agent actions may modify external state)
- Lifecycle-oriented

**Core Operations:**
| Operation | Description |
|-----------|-------------|
| `execute_agent` | Start execution of an agent |
| `get_execution_state` | Query current execution progress |
| `update_execution_state` | Record step completion or progress |
| `complete_execution` | Signal execution completion |
| `continue_execution` | Resume from saved state |

---

## 3. Permission Model

### 3.1 Endpoint Permissions

Each endpoint has defined permission characteristics:

```
Endpoint    Read-Only    Destructive
--------    ---------    -----------
CREATE      false        false
READ        true         false
UPDATE      false        true
DELETE      false        true
EXECUTE     false        true
```

### 3.2 Permission Flags

**readOnly:**
- `true`: Operation does not modify any state
- `false`: Operation may modify state

**destructive:**
- `true`: Operation may remove or irreversibly modify state
- `false`: Operation only adds or queries state

### 3.3 Confirmation Requirements

Implementations MAY require explicit confirmation for:
- All DELETE operations
- EXECUTE operations with external side effects
- UPDATE operations that modify critical configuration

---

## 4. Endpoint Modes

### 4.1 CRUDE Mode

Exposes five separate MCP tools, one per endpoint:

```
mcp_aql_create   - CREATE operations
mcp_aql_read     - READ operations
mcp_aql_update   - UPDATE operations
mcp_aql_delete   - DELETE operations
mcp_aql_execute  - EXECUTE operations
```

**Advantages:**
- Endpoint-level permission control
- Client can selectively expose endpoints
- Clear semantic separation

**Typical Token Cost:** ~4,300 tokens for tool registration

### 4.2 Single Mode

Exposes one unified MCP tool that routes internally:

```
mcp_aql - All operations through single entry point
```

**Advantages:**
- Minimal token footprint
- Simpler client integration
- Server-side routing enforcement

**Typical Token Cost:** ~1,100 tokens for tool registration

### 4.3 Mode Selection

Implementations MUST support at least one mode. Implementations SHOULD support both modes with runtime configuration.

The recommended environment variable for mode selection:
```
MCP_INTERFACE_MODE=crude|single
```

---

## 5. Operation Routing

### 5.1 Routing Rules

Each operation MUST be routed to exactly one endpoint. Implementations MUST reject operations sent to incorrect endpoints.

**Example Routing Table:**
```
Operation          Endpoint
---------          --------
create_element     CREATE
list_elements      READ
edit_element       UPDATE
delete_element     DELETE
execute_agent      EXECUTE
```

### 5.2 Route Validation

When an operation is received:

1. Extract the `operation` field from the request
2. Look up the correct endpoint for that operation
3. If in CRUDE mode, verify the operation was sent to the correct endpoint
4. If endpoint mismatch, return an error with the correct endpoint

**Error Response for Route Mismatch:**
```json
{
  "success": false,
  "error": "Operation 'create_element' must be called via mcp_aql_create, not mcp_aql_read"
}
```

### 5.3 Single Mode Routing

In Single mode, the implementation:
1. Accepts all operations through `mcp_aql`
2. Internally routes to the correct handler based on operation
3. Enforces the same semantic rules as CRUDE mode

---

## 6. Conformance Requirements

### 6.1 MUST Requirements

Conforming implementations MUST:

1. Implement all five CRUDE endpoints or the single unified endpoint
2. Route operations to their correct endpoints according to the routing table
3. Return errors for operations sent to incorrect endpoints (CRUDE mode)
4. Apply permission flags accurately for each endpoint
5. Support the core operations listed for each endpoint

### 6.2 SHOULD Requirements

Conforming implementations SHOULD:

1. Support both CRUDE and Single endpoint modes
2. Provide configuration for mode selection
3. Implement confirmation for destructive operations
4. Log all EXECUTE operations for audit purposes

### 6.3 MAY Requirements

Conforming implementations MAY:

1. Add additional operations to any endpoint
2. Implement additional permission levels
3. Provide endpoint-level access control lists
4. Support operation-level confirmation requirements

---

## References

- [MCP-AQL Specification v1.0.0-draft](versions/v1.0.0-draft.md)
- [Operations Reference](operations.md)
- [Introspection Specification](introspection.md)
