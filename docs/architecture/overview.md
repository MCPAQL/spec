# MCP-AQL Architecture Overview

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-14

## Abstract

This document describes the architecture of MCP-AQL adapters, explaining how they transform existing APIs and services into MCP-AQL compliant endpoints. It covers the core components, request flow, and design principles that guide adapter implementation.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Components](#2-architecture-components)
3. [Request Flow](#3-request-flow)
4. [Adapter Patterns](#4-adapter-patterns)
5. [Design Principles](#5-design-principles)

---

## 1. Introduction

### 1.1 Purpose

MCP-AQL adapters serve as a translation layer between the MCP-AQL protocol and domain-specific backends. They enable any service to expose its functionality through the unified CRUDE interface while maintaining semantic consistency and token efficiency.

### 1.2 What MCP-AQL Provides

MCP-AQL is a **protocol layer** that defines:
- The CRUDE endpoint pattern (5 semantic endpoints)
- Request/response formats
- Introspection mechanism
- Operation routing rules

### 1.3 What Adapters Provide

Each adapter defines its own:
- **Operations** - The actions available (create_user, run_report, etc.)
- **Parameters** - What each operation accepts
- **Types** - Domain-specific data structures
- **Classification** - Which operations go to which CRUDE endpoint

### 1.4 Adapter Role

```
┌─────────────────────────────────────────────────────────────────┐
│                     LLM / MCP Client                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │ MCP Protocol
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP-AQL Adapter                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ CRUDE Endpoints: CREATE | READ | UPDATE | DELETE | EXECUTE │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Op Router    │→ │ Dispatcher   │→ │ Introspection       │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Domain API
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Domain Backend                               │
│          (Database, API, File System, etc.)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Components

### 2.1 Operation Router

Maps incoming operations to their designated CRUDE endpoint and handler.

**Responsibilities:**
- Validate operation exists
- Verify endpoint routing (in CRUDE mode)
- Look up handler reference
- Return routing metadata

**Implementation Pattern:**
```typescript
interface OperationRoute {
  operation: string;
  endpoint: CRUDEndpoint;
  handler: string;       // Handler reference
  description: string;
}

// Each adapter defines its own routes
const OPERATION_ROUTES: Record<string, OperationRoute> = {
  create_user: {
    endpoint: 'CREATE',
    handler: 'Users.create',
    description: 'Create a new user account'
  },
  list_users: {
    endpoint: 'READ',
    handler: 'Users.list',
    description: 'List users with filtering'
  },
  // ... adapter-specific operations
};
```

### 2.2 Introspection Resolver

Provides runtime discovery of operations and types.

**Responsibilities:**
- Generate operation listings
- Provide operation details on request
- Return type definitions
- Cache responses for efficiency

**Query Types:**
- `operations` - List all available operations
- `types` - List all available types
- Operation/type details by name

See [Introspection Specification](../introspection.md) for detailed specification.

### 2.3 Response Formatter

Ensures consistent response structure.

**Responsibilities:**
- Wrap results in discriminated union
- Format error responses
- Add metadata when appropriate

### 2.4 Security Layer (Optional)

Enforces access control and security policies.

**Responsibilities:**
- Validate operation permissions
- Apply endpoint-level restrictions
- Manage confirmation requirements
- Log security events

See [Security Model](../security/gatekeeper.md) for detailed specification.

---

## 3. Request Flow

### 3.1 Standard Request Processing

```
1. RECEIVE     Client sends request to CRUDE endpoint
                │
2. PARSE       Extract operation and params
                │
3. ROUTE       Look up operation in routes
                │
4. VALIDATE    Check endpoint match (CRUDE mode)
                │
5. DISPATCH    Invoke handler with params
                │
6. FORMAT      Wrap in OperationResult
                │
7. RETURN      Send response to client
```

### 3.2 Introspection Request Flow

```
1. RECEIVE     { operation: "introspect", params: { query: "operations" } }
                │
2. ROUTE       Route to IntrospectionResolver
                │
3. RESOLVE     Determine query type
                │
4. GENERATE    Build response from routes
                │
5. RETURN      Return operation listing
```

### 3.3 Error Flow

```
1. RECEIVE     Request with unknown operation
                │
2. ROUTE       Operation not found
                │
3. FORMAT      Create error response
                │
4. RETURN      { success: false, error: "Unknown operation: xyz" }
```

---

## 4. Adapter Patterns

### 4.1 CRUD Adapter

For systems managing discrete resources (documents, records, entities).

**Characteristics:**
- Clear resource types
- Standard CRUD operations
- May not need EXECUTE endpoint

**Example Operations:**
- `create_user`, `get_user`, `update_user`, `delete_user`
- `create_document`, `list_documents`, `search_documents`

### 4.2 API Gateway Adapter

For wrapping external REST/GraphQL APIs.

**Characteristics:**
- Maps CRUDE to HTTP methods
- Operation discovery from OpenAPI/GraphQL schema
- Pass-through parameters

**Mapping Pattern:**
```
CREATE → POST
READ   → GET
UPDATE → PUT/PATCH
DELETE → DELETE
```

### 4.3 Workflow Adapter

For systems with executable processes.

**Characteristics:**
- Heavy use of EXECUTE endpoint
- Lifecycle operations (start, stop, status)
- Long-running operations

**Example Operations:**
- `run_job`, `cancel_job`, `get_job_status`
- `start_pipeline`, `pause_pipeline`, `resume_pipeline`

### 4.4 Database Adapter

For direct database access.

**Characteristics:**
- Tables/collections as resource types
- SQL/NoSQL query translation
- Transaction support

**Example Operations:**
- `query`, `insert`, `update`, `delete`
- May use generic operations with type parameter

### 4.5 Composite Adapter

Aggregates multiple backends.

**Characteristics:**
- Unified interface over heterogeneous sources
- Operation routing by type or prefix
- Cross-backend search

---

## 5. Design Principles

### 5.1 Server-Side Authority

> "LLM instructions are suggestions. Adapter policies are enforcement."

The adapter is the authoritative source for:
- Operation routing
- Security enforcement
- Parameter validation
- Response formatting

Clients cannot bypass server-side policies through endpoint selection.

### 5.2 Token Efficiency

Minimize context consumed by tool definitions:
- Consolidate operations into semantic endpoints
- Provide introspection for on-demand discovery
- Support field selection for payload reduction (optional)
- Enable single-endpoint mode for maximum savings

### 5.3 Semantic Clarity

Operations are grouped by their effect on state:
- CREATE: Adds without removing
- READ: Queries without modifying
- UPDATE: Modifies existing
- DELETE: Removes permanently
- EXECUTE: Runtime lifecycle

### 5.4 Self-Description

Adapters describe themselves via introspection:
- All operations discoverable
- All parameters documented
- All types defined
- No external documentation required

### 5.5 Fail-Safe Defaults

- Unknown operations return clear errors
- Missing parameters identified specifically
- Route mismatches explain correct endpoint
- Security defaults to restrictive

---

## References

- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- [CRUDE Pattern Specification](../crude-pattern.md)
- [Introspection Specification](../introspection.md)
- [Operations Guide](../operations.md)
