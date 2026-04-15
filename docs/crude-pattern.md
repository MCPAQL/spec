# MCP-AQL CRUDE Pattern Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

> **Document Status:** This document is **informative**. For normative requirements, see [MCP-AQL Specification v1.0.0](./versions/v1.0.0-draft.md).

## Abstract

This document specifies the CRUDE (Create, Read, Update, Delete, Execute) endpoint pattern, which extends traditional CRUD semantics with an Execute endpoint for runtime lifecycle operations. CRUDE is the standard semantic-endpoint profile in MCP-AQL, not the only allowed endpoint-family design.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Endpoint Definitions](#2-endpoint-definitions)
3. [Permission Model](#3-permission-model)
4. [Endpoint Modes](#4-endpoint-modes)
5. [Operation Routing](#5-operation-routing)
6. [Classification Guidelines](#6-classification-guidelines)
7. [Conformance Requirements](#7-conformance-requirements)

---

## 1. Introduction

### 1.1 Purpose

The CRUDE pattern provides a standard semantic grouping of operations by their effect on system state. This grouping enables:

- Permission-based access control at the endpoint level
- Clear separation of read-only, additive, modifying, and destructive operations
- Explicit handling of runtime execution lifecycle operations

### 1.2 Rationale for EXECUTE

Traditional CRUD patterns assume operations are primarily concerned with data persistence. However, many services provide executable functionality (jobs, workflows, tasks, processes) that require:

- **Non-idempotent operations** - Calling `execute_job` twice creates two separate executions
- **Lifecycle management** - Start, monitor, update progress, complete
- **Runtime state** - Distinct from stored data

The EXECUTE endpoint addresses these requirements explicitly.

### 1.3 Adapter Responsibility

Each adapter implementing MCP-AQL:
- Defines its own operations
- Classifies each operation into the appropriate CRUDE endpoint
- Documents its operation-to-endpoint mapping via introspection when exposing the CRUDE profile

Adapters MAY instead expose alternate semantic endpoint families when that better matches the target API. See [Endpoint Modes](endpoint-modes.md) and the normative specification for the generalized semantic-endpoint model.

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

**Example Operations:**
| Operation | Description |
|-----------|-------------|
| `create_user` | Create a new user account |
| `upload_file` | Upload a new file |
| `add_comment` | Add a comment to a resource |
| `register_webhook` | Register a new webhook |

### 2.2 READ Endpoint

**Identifier:** `READ`
**MCP Tool Name:** `mcp_aql_read`

Operations that query state without modification.

**Characteristics:**
- Read-only
- No side effects on stored state
- Safe to call repeatedly (idempotent)

**Example Operations:**
| Operation | Description |
|-----------|-------------|
| `list_users` | List users with filtering |
| `get_document` | Retrieve a document by ID |
| `search` | Search across resources |
| `introspect` | Discover available operations |
| `get_status` | Get current system status |
| `get_execution_status` | Query execution progress |
| `export_data` | Export data to portable format |

> **Note:** Operations that query execution state are READ operations, not EXECUTE. See [Section 6.1](#61-classification-principle) for classification guidelines.

### 2.3 UPDATE Endpoint

**Identifier:** `UPDATE`
**MCP Tool Name:** `mcp_aql_update`

Operations that modify existing state.

**Characteristics:**
- Modifying
- Requires existing state to modify
- May be destructive to prior values

**Example Operations:**
| Operation | Description |
|-----------|-------------|
| `update_user` | Modify user properties |
| `rename_file` | Rename an existing file |
| `set_config` | Update configuration |
| `move_resource` | Move resource to new location |

### 2.4 DELETE Endpoint

**Identifier:** `DELETE`
**MCP Tool Name:** `mcp_aql_delete`

Operations that remove state permanently.

**Characteristics:**
- Destructive
- Irreversible without backup
- MAY require confirmation

**Example Operations:**
| Operation | Description |
|-----------|-------------|
| `delete_user` | Permanently delete a user |
| `remove_file` | Remove a file |
| `purge_cache` | Clear cached data |
| `unregister_webhook` | Remove a webhook |

### 2.5 EXECUTE Endpoint

**Identifier:** `EXECUTE`
**MCP Tool Name:** `mcp_aql_execute`

Operations that manage the runtime execution lifecycle.

**Characteristics:**
- Stateful (maintains execution context)
- Non-idempotent (each call may create new state)
- Potentially destructive (may modify external state)
- Lifecycle-oriented

**Example Operations:**
| Operation | Description |
|-----------|-------------|
| `execute_job` | Start a background job |
| `cancel_task` | Cancel a running task |
| `resume_workflow` | Resume a paused workflow |
| `trigger_build` | Trigger a build process |

> **Note:** Operations that only query execution state (like `get_execution_status`) belong to READ, not EXECUTE. See [Section 6.1](#61-classification-principle) for classification guidelines.

For operations that manage long-running processes, see [Execution Lifecycle](versions/v1.0.0-draft.md#84-execution-lifecycle) in the normative specification.

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

### 3.3 MCP Tool Annotations

When registering MCP tools, adapters SHOULD include permission hints:

```json
{
  "name": "mcp_aql_read",
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false
  }
}
```

### 3.4 Confirmation Requirements

Implementations MAY require explicit confirmation for:
- All DELETE operations
- EXECUTE operations with external side effects
- UPDATE operations that modify critical data

---

## 4. Endpoint Modes

### 4.1 CRUDE Profile Within Semantic Endpoint Mode

Within semantic endpoint mode, the standard CRUDE profile exposes five separate MCP tools, one per endpoint:

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
- Platform permission hints

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
MCP_AQL_ENDPOINT_MODE=crude|single
```

---

## 5. Operation Routing

### 5.1 Routing Rules

Each operation MUST be routed to exactly one endpoint. Implementations MUST reject operations sent to incorrect endpoints in CRUDE mode.

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
  "error": "Operation 'create_user' must be called via mcp_aql_create, not mcp_aql_read"
}
```

### 5.3 Single Mode Routing

In Single mode, the implementation:
1. Accepts all operations through `mcp_aql`
2. Internally routes to the correct handler based on operation
3. Enforces the same semantic rules as CRUDE mode

### 5.4 Server-Side Authority

> "LLM instructions are suggestions. Adapter policies are enforcement."

The adapter is authoritative for operation routing. Clients cannot bypass routing rules by sending operations to different endpoints.

---

## 6. Classification Guidelines

### 6.1 Classification Principle

Operations are classified by their **effect on state**, not by their **subject matter**.

An operation that queries the status of an EXECUTE operation (like `get_execution_status`) is still a READ operation because it only reads data.

**Examples:**
- `get_execution_status` → READ (queries state, no side effects)
- `get_task_log` → READ (retrieves execution output, no side effects)
- `execute_job` → EXECUTE (creates new execution, non-idempotent)
- `cancel_task` → EXECUTE (modifies execution state)
- `pause_execution` → EXECUTE (modifies execution state)

### 6.2 How to Classify Operations

When building an adapter, classify each operation by asking:

1. **Does it only read data?** → READ
2. **Does it add new data without modifying existing?** → CREATE
3. **Does it modify existing data?** → UPDATE
4. **Does it remove data permanently?** → DELETE
5. **Does it manage runtime execution?** → EXECUTE

### 6.3 Decision Tree

```
                    Does it modify state?
                          /     \
                        No       Yes
                        |         |
                      READ    Is it additive only?
                               /     \
                             Yes      No
                             |         |
                          CREATE   Does it remove data?
                                     /     \
                                   Yes      No
                                   |         |
                                DELETE   Is it runtime/lifecycle?
                                            /     \
                                          Yes      No
                                          |         |
                                       EXECUTE   UPDATE
```

> **Important:** Classification is by **effect**, not subject. See [Section 6.1](#61-classification-principle) for the guiding principle.


### 6.4 Edge Cases

**Upsert Operations:**
- If creates when not exists, updates when exists: Prefer CREATE
- Document behavior in operation description

**Soft Delete:**
- If marks as deleted but doesn't remove: Could be UPDATE
- If removes from normal queries: Prefer DELETE
- Document behavior clearly

**Triggering Actions:**
- If triggers external action (email, webhook): EXECUTE
- If just saves data that will trigger later: CREATE

**Import Operations:**
- If imports without overwriting: CREATE
- If may overwrite existing: Discuss in operation description

### 6.5 Canonical Verbs

Each endpoint has canonical verbs that adapters SHOULD use for standard operations:

| Endpoint | Canonical Verb | Example Operation |
|----------|----------------|-------------------|
| CREATE | `create` | `create_user` |
| READ | `get` (single), `list` (multiple) | `get_document`, `list_users` |
| UPDATE | `update` | `update_profile` |
| DELETE | `delete` | `delete_account` |
| EXECUTE | `execute` (initiate), `cancel` (terminate) | `execute_workflow`, `cancel_task` |

Non-canonical verbs (e.g., `upload`, `search`, `remove`) MAY be used when domain semantics require it. See [Section 8.5](versions/v1.0.0-draft.md#85-operation-naming-grammar) of the normative specification for the full naming grammar.

### 6.6 Documentation Requirement

Adapters MUST document their operation classification via introspection. Each operation's endpoint MUST be discoverable.

---

## 7. Conformance Requirements

### 7.1 MUST Requirements

Implementations exposing the CRUDE profile MUST:

1. Implement all five CRUDE endpoints, or offer a single unified endpoint that preserves the same CRUDE semantic classification internally
2. Route operations to their correct endpoints according to classification
3. Return errors for operations sent to incorrect endpoints in CRUDE mode
4. Apply permission flags accurately for each endpoint
5. Implement the `introspect` operation as a READ-category operation

### 7.2 SHOULD Requirements

Implementations exposing the CRUDE profile SHOULD:

1. Support both CRUDE and Single endpoint modes
2. Provide configuration for mode selection
3. Implement confirmation for destructive operations
4. Log EXECUTE operations for audit purposes
5. Include MCP tool annotations for permissions

### 7.3 MAY Requirements

Conforming implementations MAY:

1. Add additional operations to any endpoint
2. Implement additional permission levels
3. Provide endpoint-level access control lists
4. Support operation-level confirmation requirements
5. Implement rate limiting per endpoint

---

## References

- [MCP-AQL Specification v1.0.0-draft](versions/v1.0.0-draft.md)
- [Introspection Specification](introspection.md)
