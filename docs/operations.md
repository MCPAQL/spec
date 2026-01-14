# MCP-AQL Operations Guide

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-14

## Abstract

This document provides guidance for defining and documenting operations in MCP-AQL adapters. It covers request/response formats, parameter conventions, batch operations, and error handling patterns.

---

## Table of Contents

1. [Operation Input Format](#1-operation-input-format)
2. [Response Format](#2-response-format)
3. [Parameter Conventions](#3-parameter-conventions)
4. [Operation Documentation](#4-operation-documentation)
5. [Batch Operations](#5-batch-operations)
6. [Error Handling](#6-error-handling)
7. [The introspect Operation](#7-the-introspect-operation)

---

## 1. Operation Input Format

### 1.1 Standard Input Structure

All operations follow a consistent input structure:

```json
{
  "operation": "<operation_name>",
  "params": {
    // Operation-specific parameters
  }
}
```

### 1.2 Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operation` | string | Yes | The operation to perform |
| `params` | object | No | Operation-specific parameters |

### 1.3 Parameter Resolution

Parameters may be specified at multiple levels. Resolution order (first match wins):

1. `params.<parameter_name>`
2. Top-level `<parameter_name>`

**Example - Equivalent Requests:**
```javascript
// Parameters in params object (preferred)
{
  operation: "get_user",
  params: { user_id: "123" }
}

// Parameters at top level (also valid)
{
  operation: "get_user",
  user_id: "123"
}
```

---

## 2. Response Format

### 2.1 Discriminated Union Result

All operations return a discriminated union:

```typescript
type OperationResult = OperationSuccess | OperationFailure;

interface OperationSuccess {
  success: true;
  data: unknown;  // Operation-specific payload
}

interface OperationFailure {
  success: false;
  error: string;  // Human-readable error message
}
```

### 2.2 Success Response Example

```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "Alice",
    "email": "alice@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### 2.3 Failure Response Example

```json
{
  "success": false,
  "error": "User with ID 'user_999' not found"
}
```

### 2.4 Response Metadata

Implementations MAY include metadata in responses:

```json
{
  "success": true,
  "data": { ... },
  "_meta": {
    "requestId": "req_abc123",
    "duration": 42
  }
}
```

Metadata fields MUST be prefixed with `_` to distinguish from data.

---

## 3. Parameter Conventions

### 3.1 Naming Convention

MCP-AQL recommends **snake_case** for all parameter names:

```javascript
// Recommended
{ user_id: "123", created_after: "2024-01-01" }

// Not recommended
{ userId: "123", createdAfter: "2024-01-01" }
```

### 3.2 Common Parameter Patterns

Adapters SHOULD use consistent patterns for common functionality:

**Pagination:**
```javascript
{
  page: 1,           // Page number (1-indexed)
  page_size: 25,     // Items per page
  // OR cursor-based:
  cursor: "abc123",  // Opaque cursor
  limit: 25          // Items to return
}
```

**Filtering:**
```javascript
{
  filter: {
    status: "active",
    created_after: "2024-01-01"
  }
}
```

**Sorting:**
```javascript
{
  sort: {
    field: "created_at",
    order: "desc"  // "asc" or "desc"
  }
}
```

**Field Selection:**
```javascript
{
  fields: ["id", "name", "email"]  // Only return these fields
}
```

### 3.3 Required vs Optional

Document required parameters clearly in introspection:

```json
{
  "name": "user_id",
  "type": "string",
  "required": true,
  "description": "The unique identifier of the user"
}
```

---

## 4. Operation Documentation

### 4.1 Documenting via Introspection

Every operation MUST be discoverable via introspection. The response should include:

```json
{
  "name": "create_user",
  "endpoint": "CREATE",
  "description": "Create a new user account",
  "parameters": [
    {
      "name": "email",
      "type": "string",
      "required": true,
      "description": "User's email address"
    },
    {
      "name": "name",
      "type": "string",
      "required": true,
      "description": "User's display name"
    },
    {
      "name": "role",
      "type": "string",
      "required": false,
      "default": "user",
      "description": "User's role (admin, user, guest)"
    }
  ],
  "returns": {
    "type": "User",
    "description": "The created user object"
  },
  "examples": [
    {
      "description": "Create a basic user",
      "request": {
        "operation": "create_user",
        "params": {
          "email": "alice@example.com",
          "name": "Alice"
        }
      }
    }
  ]
}
```

### 4.2 Operation Naming

**Recommended patterns:**

| Pattern | Examples | Use For |
|---------|----------|---------|
| `<verb>_<noun>` | `create_user`, `delete_file` | Standard CRUD |
| `<verb>_<noun>_<qualifier>` | `list_users_by_role` | Filtered queries |
| `<verb>` | `search`, `export` | Generic operations |

**Naming guidelines:**
- Use snake_case
- Be specific but concise
- Use consistent verbs across adapter

### 4.3 Common Verbs by Endpoint

| Endpoint | Common Verbs |
|----------|--------------|
| CREATE | create, add, upload, register, import |
| READ | get, list, search, find, export, count |
| UPDATE | update, set, rename, move, edit |
| DELETE | delete, remove, purge, unregister, clear |
| EXECUTE | run, start, stop, cancel, resume, trigger |

---

## 5. Batch Operations

### 5.1 Batch Request Format

Adapters MAY support batch operations:

```json
{
  "operations": [
    { "operation": "create_user", "params": { "email": "a@example.com", "name": "A" } },
    { "operation": "create_user", "params": { "email": "b@example.com", "name": "B" } },
    { "operation": "create_user", "params": { "email": "c@example.com", "name": "C" } }
  ]
}
```

### 5.2 Batch Response Format

```json
{
  "success": true,
  "results": [
    { "index": 0, "operation": "create_user", "result": { "success": true, "data": { ... } } },
    { "index": 1, "operation": "create_user", "result": { "success": true, "data": { ... } } },
    { "index": 2, "operation": "create_user", "result": { "success": false, "error": "Email already exists" } }
  ],
  "summary": {
    "total": 3,
    "succeeded": 2,
    "failed": 1
  }
}
```

### 5.3 Batch Execution Semantics

- Operations execute in order
- Failure of one operation does NOT stop subsequent operations
- Each operation result is independent
- Overall `success` is `true` if batch completed (even with individual failures)

### 5.4 Cross-Endpoint Batching

In CRUDE mode, batch operations should be sent to the appropriate endpoint based on the operations included:
- All CREATE operations → `mcp_aql_create`
- Mixed operations → Use single mode or separate calls

---

## 6. Error Handling

### 6.1 Error Categories

| Category | Description | Example |
|----------|-------------|---------|
| Missing Parameter | Required parameter not provided | "Missing required parameter 'email'" |
| Invalid Type | Parameter has wrong type | "Parameter 'page' must be a number" |
| Not Found | Referenced resource doesn't exist | "User 'user_999' not found" |
| Route Mismatch | Operation sent to wrong endpoint | "Operation 'create_user' must use CREATE endpoint" |
| Validation | Business rule violation | "Email format is invalid" |
| Conflict | Resource already exists | "User with email already exists" |
| Unauthorized | Permission denied | "Operation not permitted" |

### 6.2 Error Response Structure

**Basic format:**
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

**Extended format (optional):**
```json
{
  "success": false,
  "error": "Human-readable error message",
  "errorCode": "NOT_FOUND",
  "details": {
    "resource": "user",
    "id": "user_999"
  }
}
```

### 6.3 Standard Error Codes

Adapters MAY use standard error codes:

| Code | Description |
|------|-------------|
| `MISSING_PARAMETER` | Required parameter not provided |
| `INVALID_TYPE` | Parameter type mismatch |
| `NOT_FOUND` | Resource not found |
| `ENDPOINT_MISMATCH` | Operation routed to wrong endpoint |
| `VALIDATION_ERROR` | Business rule violation |
| `ALREADY_EXISTS` | Resource with identifier exists |
| `UNAUTHORIZED` | Operation not permitted |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

## 7. The introspect Operation

### 7.1 Required Implementation

Every MCP-AQL adapter MUST implement the `introspect` operation on the READ endpoint.

### 7.2 Query Types

**List all operations:**
```json
{ "operation": "introspect", "params": { "query": "operations" } }
```

**Get operation details:**
```json
{ "operation": "introspect", "params": { "query": "operations", "name": "create_user" } }
```

**List all types:**
```json
{ "operation": "introspect", "params": { "query": "types" } }
```

**Get type details:**
```json
{ "operation": "introspect", "params": { "query": "types", "name": "UserRole" } }
```

### 7.3 Operations Response

```json
{
  "success": true,
  "data": {
    "operations": [
      {
        "name": "create_user",
        "endpoint": "CREATE",
        "description": "Create a new user"
      },
      {
        "name": "list_users",
        "endpoint": "READ",
        "description": "List all users"
      },
      {
        "name": "update_user",
        "endpoint": "UPDATE",
        "description": "Update user properties"
      },
      {
        "name": "delete_user",
        "endpoint": "DELETE",
        "description": "Delete a user"
      },
      {
        "name": "introspect",
        "endpoint": "READ",
        "description": "Discover available operations"
      }
    ]
  }
}
```

### 7.4 Types Response

```json
{
  "success": true,
  "data": {
    "types": [
      {
        "name": "UserRole",
        "kind": "enum",
        "values": ["admin", "user", "guest"]
      },
      {
        "name": "User",
        "kind": "object",
        "fields": [
          { "name": "id", "type": "string" },
          { "name": "email", "type": "string" },
          { "name": "role", "type": "UserRole" }
        ]
      }
    ]
  }
}
```

---

## References

- [MCP-AQL Specification v1.0.0-draft](versions/v1.0.0-draft.md)
- [CRUDE Pattern Specification](crude-pattern.md)
- [Introspection Specification](introspection.md)
