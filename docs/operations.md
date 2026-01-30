# MCP-AQL Operations Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-16

## Abstract

This document specifies how operations are defined, documented, and invoked in MCP-AQL adapters. It covers the operation input format, response format, parameter conventions, operation schemas, batch operations, and error handling patterns.

---

## Table of Contents

1. [Conformance Requirements](#1-conformance-requirements)
2. [Operation Input Format](#2-operation-input-format)
3. [Response Format](#3-response-format)
4. [Parameter Conventions](#4-parameter-conventions)
5. [Operation Schema Definition](#5-operation-schema-definition)
6. [CRUDE Endpoint Assignment](#6-crude-endpoint-assignment)
7. [Batch Operations](#7-batch-operations)
8. [Error Handling](#8-error-handling)
9. [The introspect Operation](#9-the-introspect-operation)

---

## 1. Conformance Requirements

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

An MCP-AQL adapter is conformant if it implements:

1. The operation input format as specified in Section 2
2. The discriminated response format as specified in Section 3
3. The `introspect` operation as specified in Section 9
4. Correct endpoint routing based on operation semantics (Section 6)

---

## 2. Operation Input Format

### 2.1 Standard Input Structure

All operations MUST follow a consistent input structure:

```json
{
  "operation": "<operation_name>",
  "params": {
    // Operation-specific parameters
  }
}
```

### 2.2 Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operation` | string | REQUIRED | The operation to perform |
| `params` | object | OPTIONAL | Operation-specific parameters |

The `operation` field MUST be a non-empty string matching a defined operation name.

### 2.3 Parameter Resolution

Adapters MAY support parameter resolution from multiple locations. The RECOMMENDED resolution order is:

1. `params.<parameter_name>` (preferred)
2. Top-level `<parameter_name>` (convenience)

When the same parameter appears at multiple levels, the value in `params` takes precedence.

**Example - Equivalent Requests:**
```javascript
// Parameters in params object (RECOMMENDED)
{
  operation: "get_item",
  params: { item_id: "123" }
}

// Parameters at top level (also valid)
{
  operation: "get_item",
  item_id: "123"
}
```

### 2.4 Case Sensitivity

Operation names MUST be case-sensitive. Adapters SHOULD use lowercase operation names with underscores (snake_case).

---

## 3. Response Format

### 3.1 Discriminated Union Result

All operations MUST return a discriminated union response. The `success` field serves as the discriminator.

```typescript
type OperationResult = OperationSuccess | OperationFailure;

interface OperationSuccess {
  success: true;
  data: unknown;   // Operation-specific payload
  error?: never;   // MUST NOT be present
}

interface OperationFailure {
  success: false;
  error: ErrorDetail;  // Structured error information
  data?: never;        // MUST NOT be present
}

interface ErrorDetail {
  code: string;     // Machine-readable error code (e.g., "NOT_FOUND_RESOURCE")
  message: string;  // Human-readable error message
  details?: Record<string, unknown>;  // Optional contextual information
}
```

> **Note:** See [Structured Error Codes Specification](./error-codes.md) for the complete error code taxonomy.

### 3.2 Success Response

A successful operation MUST return:

- `success`: The boolean value `true`
- `data`: The operation result (type varies by operation)

```json
{
  "success": true,
  "data": {
    "id": "item_123",
    "name": "Example Item",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### 3.3 Failure Response

A failed operation MUST return:

- `success`: The boolean value `false`
- `error`: A structured error object with `code` and `message`

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND_RESOURCE",
    "message": "Item with ID 'item_999' not found",
    "details": {
      "resource_type": "item",
      "resource_id": "item_999"
    }
  }
}
```

### 3.4 Response Metadata

Implementations MAY include metadata in responses:

```json
{
  "success": true,
  "data": { ... },
  "_meta": {
    "requestId": "req_abc123",
    "duration_ms": 42
  }
}
```

Metadata fields MUST be prefixed with underscore (`_`) to distinguish them from the operation payload.

---

## 4. Parameter Conventions

### 4.1 Naming Convention

MCP-AQL RECOMMENDS **snake_case** for all parameter names:

```javascript
// RECOMMENDED
{ item_id: "123", created_after: "2024-01-01" }

// NOT RECOMMENDED
{ itemId: "123", createdAfter: "2024-01-01" }
```

For backward compatibility, adapters MAY support both snake_case and camelCase variants of parameters, with snake_case taking precedence.

### 4.2 Common Parameter Patterns

Adapters SHOULD use consistent patterns for common functionality:

**Pagination (offset-based):**
```javascript
{
  page: 1,           // Page number (1-indexed)
  page_size: 25      // Items per page
}
```

**Pagination (cursor-based):**
```javascript
{
  cursor: "abc123",  // Opaque cursor from previous response
  limit: 25          // Maximum items to return
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

### 4.3 Required vs Optional Parameters

Each parameter MUST be documented as either required or optional. The operation schema (Section 5) specifies this via the `required` attribute.

### 4.4 Cross-Cutting Parameters

Cross-cutting parameters are parameters that apply across multiple operations. To ensure consistent discoverability, implementations SHOULD define these parameters once and reference them consistently.

#### 4.4.1 Standard Cross-Cutting Parameters

| Parameter | Type | Operations | Description |
|-----------|------|------------|-------------|
| `fields` | `string \| string[]` | All READ operations returning data | Field selection: preset name or array of field paths |
| `limit` | `number` | List/search operations | Maximum results to return |
| `offset` | `number` | List/search operations | Number of results to skip |
| `page` | `number` | List/search operations | Page number (1-indexed) |
| `page_size` | `number` | List/search operations | Items per page |
| `sort` | `string` | List/search operations | Sort field name |
| `order` | `string` | List/search operations | Sort order: "asc" or "desc" |
| `dry_run` | `boolean` | All mutating operations | Preview without executing |

#### 4.4.2 Shared Parameter Definitions

Implementations SHOULD use a shared definition mechanism to ensure consistency:

```yaml
shared_parameters:
  fields:
    name: "fields"
    type: "string | string[]"
    required: false
    description: "Field selection: preset ('minimal', 'standard', 'full') or array of field names"

  pagination:
    - name: "limit"
      type: "number"
      required: false
      description: "Maximum results to return"
      default: 25
    - name: "offset"
      type: "number"
      required: false
      description: "Number of results to skip"
      default: 0

  sorting:
    - name: "sort"
      type: "string"
      required: false
      description: "Field to sort by"
    - name: "order"
      type: "string"
      required: false
      enum: ["asc", "desc"]
      description: "Sort order"
      default: "asc"
```

#### 4.4.3 Cross-Cutting Parameter Consistency (SHOULD)

When a parameter applies to multiple operations:

1. The parameter name SHOULD be identical across operations
2. The parameter type SHOULD be identical across operations
3. The parameter description SHOULD be semantically equivalent
4. Default values SHOULD be consistent where applicable

#### 4.4.4 Introspection Integration

When introspection is queried, shared parameters SHOULD be expanded inline with their full definitions. This ensures LLMs see consistent documentation regardless of which operation they query.

**Example - Operations referencing shared parameters:**
```yaml
operations:
  list_items:
    params:
      - $ref: "#/shared_parameters/fields"
      - $ref: "#/shared_parameters/pagination"
      - name: "category"
        type: "string"
        required: false
        description: "Filter by category"

  search_items:
    params:
      - $ref: "#/shared_parameters/fields"
      - $ref: "#/shared_parameters/pagination"
      - $ref: "#/shared_parameters/sorting"
      - name: "query"
        type: "string"
        required: true
        description: "Search query"
```

---

## 5. Operation Schema Definition

### 5.1 Schema Structure

Each operation MUST be defined by a schema that specifies its behavior, parameters, and routing. Conformant adapters MUST validate requests against operation schemas before execution.

**Schema Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `endpoint` | string | REQUIRED | CRUDE endpoint: CREATE, READ, UPDATE, DELETE, or EXECUTE |
| `description` | string | REQUIRED | Human-readable description |
| `params` | object | OPTIONAL | Parameter definitions |
| `handler` | string | OPTIONAL | Internal handler reference |
| `dangerous` | boolean | OPTIONAL | If true, operation has significant side effects |

### 5.2 Parameter Schema

Each parameter in the `params` object MUST include:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | REQUIRED | Data type: "string", "number", "boolean", "object", "array" |
| `required` | boolean | OPTIONAL | Whether parameter is required (default: false) |
| `description` | string | OPTIONAL | Human-readable description |
| `default` | any | OPTIONAL | Default value if not provided |

Additional properties MAY be included:

| Property | Type | Description |
|----------|------|-------------|
| `mapTo` | string | Internal parameter name mapping |
| `sources` | array | Ordered list of resolution paths |
| `enum` | array | Allowed values for string parameters |
| `minimum` | number | Minimum value for numeric parameters |
| `maximum` | number | Maximum value for numeric parameters |
| `pattern` | string | Regex pattern for string validation |

### 5.3 Example Schema Definition

```javascript
// Schema for a create operation
{
  create_item: {
    endpoint: "CREATE",
    description: "Create a new item in the system",
    params: {
      name: {
        type: "string",
        required: true,
        description: "Item name"
      },
      category: {
        type: "string",
        required: true,
        description: "Item category",
        enum: ["product", "service", "subscription"]
      },
      price: {
        type: "number",
        required: false,
        minimum: 0,
        description: "Item price in cents"
      },
      metadata: {
        type: "object",
        required: false,
        description: "Additional item metadata"
      }
    }
  }
}
```

### 5.4 Parameter Validation

Before executing an operation, adapters MUST:

1. Verify all required parameters are present
2. Validate parameter types match the schema
3. Apply any constraints (enum, minimum, maximum, pattern)
4. Apply default values for missing optional parameters

Validation failures MUST return an error response (not throw exceptions).

---

## 6. CRUDE Endpoint Assignment

### 6.1 Endpoint Semantics

Operations MUST be assigned to endpoints based on their semantics:

| Endpoint | Semantics | Characteristics |
|----------|-----------|-----------------|
| **CREATE** | Additive, non-destructive | Creates new resources; idempotent if duplicate detection enabled |
| **READ** | Safe, read-only | No side effects; cacheable; always safe to retry |
| **UPDATE** | Modifying | Changes existing resources; may be partially idempotent |
| **DELETE** | Destructive | Removes resources; potentially irreversible |
| **EXECUTE** | Lifecycle, non-idempotent | Triggers actions; manages runtime state |

### 6.2 Common Verbs by Endpoint

| Endpoint | Common Verbs |
|----------|--------------|
| CREATE | create, add, upload, register, import, insert |
| READ | get, list, search, find, export, count, introspect |
| UPDATE | update, edit, set, rename, move, patch, merge |
| DELETE | delete, remove, purge, unregister, clear, drop |
| EXECUTE | run, start, stop, cancel, resume, trigger, invoke |

### 6.3 Endpoint Routing Enforcement

Adapters SHOULD validate that operations are invoked via their designated endpoint. An operation assigned to CREATE SHOULD NOT execute when called via the DELETE endpoint.

When an operation is routed to the wrong endpoint, adapters SHOULD return an error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ENDPOINT_MISMATCH",
    "message": "Operation 'create_item' must use CREATE endpoint, not DELETE",
    "details": {
      "operation": "create_item",
      "expected_endpoint": "CREATE",
      "actual_endpoint": "DELETE"
    }
  }
}
```

### 6.4 Dangerous Operation Classification

Operations with significant consequences SHOULD be marked with `dangerous: true` in their schema. This enables clients to:

- Display confirmation prompts
- Log operations with enhanced audit trails
- Apply additional authorization checks

Examples of dangerous operations:
- Bulk deletions
- Data truncation
- Irreversible state changes
- Operations affecting production data

---

## 7. Batch Operations

### 7.1 Batch Request Format

Adapters MAY support batch operations. When supported, the format MUST be:

```json
{
  "operations": [
    { "operation": "create_item", "params": { "name": "Item A", "category": "product" } },
    { "operation": "create_item", "params": { "name": "Item B", "category": "service" } },
    { "operation": "create_item", "params": { "name": "Item C", "category": "product" } }
  ]
}
```

### 7.2 Batch Response Format

Batch responses MUST include individual results for each operation:

```json
{
  "success": true,
  "data": null,
  "results": [
    { "index": 0, "operation": "create_item", "result": { "success": true, "data": { "id": "item_1" } } },
    { "index": 1, "operation": "create_item", "result": { "success": true, "data": { "id": "item_2" } } },
    { "index": 2, "operation": "create_item", "result": { "success": false, "error": { "code": "CONFLICT_ALREADY_EXISTS", "message": "Item with name 'Item C' already exists" } } }
  ],
  "summary": {
    "total": 3,
    "succeeded": 2,
    "failed": 1
  }
}
```

### 7.3 Batch Execution Semantics

Conformant batch implementations MUST follow these semantics:

1. Operations execute in array order
2. Failure of one operation MUST NOT prevent subsequent operations from executing
3. Each operation result is independent
4. The overall `success` is `true` if the batch completed processing (even with individual failures)
5. The overall `success` is `false` only for batch-level errors (malformed request, authentication failure)

### 7.4 Cross-Endpoint Batching

When using CRUDE mode (separate endpoints), batch operations SHOULD be constrained to a single endpoint:

- All CREATE operations together in one batch to the CREATE endpoint
- All READ operations together in one batch to the READ endpoint

Mixing operations across endpoints in a single batch is NOT RECOMMENDED. Implementations MAY reject mixed batches or MAY process them with explicit endpoint routing per operation.

---

## 8. Error Handling

### 8.1 Error Categories

Adapters MUST categorize errors using structured error codes. The table below shows error categories and their corresponding codes:

| Category | Error Code | Example Message |
|----------|------------|-----------------|
| Missing Parameter | `VALIDATION_MISSING_PARAM` | "Missing required parameter 'name'" |
| Invalid Type | `VALIDATION_INVALID_TYPE` | "Parameter 'price' expected 'number', got 'string'" |
| Resource Not Found | `NOT_FOUND_RESOURCE` | "Item 'item_999' not found" |
| Unknown Operation | `NOT_FOUND_OPERATION` | "Unknown operation: 'create_widget'" |
| Permission Denied | `PERMISSION_DENIED` | "Permission denied: requires 'admin' scope" |
| Rate Limited | `RATE_LIMIT_EXCEEDED` | "API rate limit exceeded" |
| Internal Error | `INTERNAL_ERROR` | "Internal error: database connection failed" |

See [Structured Error Codes Specification](./error-codes.md) for detailed error code definitions and usage.

### 8.2 Error Response Structure

All error responses MUST use structured error objects:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND_RESOURCE",
    "message": "Item 'item_999' not found",
    "details": {
      "resource_type": "item",
      "resource_id": "item_999"
    }
  }
}
```

The `error` object:
- MUST include `code` - A machine-readable error code from the [error code taxonomy](./error-codes.md)
- MUST include `message` - A human-readable error message
- MAY include `details` - Additional contextual information for debugging

See [Structured Error Codes Specification](./error-codes.md) for the complete error code registry and usage guidelines.

### 8.3 Standard Error Codes

Adapters MUST use standardized error codes for programmatic handling. Common codes include:

| Code | Description |
|------|-------------|
| `VALIDATION_MISSING_PARAM` | Required parameter not provided |
| `VALIDATION_INVALID_TYPE` | Parameter type mismatch |
| `NOT_FOUND_OPERATION` | Operation name not recognized |
| `NOT_FOUND_RESOURCE` | Resource not found |
| `PERMISSION_DENIED` | Operation not permitted |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

See [Structured Error Codes Specification](./error-codes.md) for the complete error code registry including Phase 1 robustness codes.

### 8.4 Error Message Guidelines

Error messages SHOULD be:

1. **Actionable**: Tell the user what to do to fix the problem
2. **Specific**: Include relevant identifiers and values
3. **Safe**: Never expose sensitive information (passwords, tokens, internal paths)

---

## 9. The introspect Operation

### 9.1 Required Implementation

Every MCP-AQL adapter MUST implement the `introspect` operation on the READ endpoint. This operation enables runtime discovery of available operations and types.

### 9.2 Operation Schema

```javascript
{
  introspect: {
    endpoint: "READ",
    description: "Discover available operations and types",
    params: {
      query: {
        type: "string",
        required: true,
        enum: ["operations", "types"],
        description: "What to introspect"
      },
      name: {
        type: "string",
        required: false,
        description: "Specific operation or type name for detailed info"
      }
    }
  }
}
```

### 9.3 Query Types

**List all operations:**
```json
{ "operation": "introspect", "params": { "query": "operations" } }
```

**Get operation details:**
```json
{ "operation": "introspect", "params": { "query": "operations", "name": "create_item" } }
```

**List all types:**
```json
{ "operation": "introspect", "params": { "query": "types" } }
```

**Get type details:**
```json
{ "operation": "introspect", "params": { "query": "types", "name": "ItemCategory" } }
```

### 9.4 Operations Response

When `query` is "operations" without a `name`:

```json
{
  "success": true,
  "data": {
    "operations": [
      {
        "name": "create_item",
        "endpoint": "CREATE",
        "description": "Create a new item"
      },
      {
        "name": "list_items",
        "endpoint": "READ",
        "description": "List all items"
      },
      {
        "name": "update_item",
        "endpoint": "UPDATE",
        "description": "Update item properties"
      },
      {
        "name": "delete_item",
        "endpoint": "DELETE",
        "description": "Delete an item"
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

### 9.5 Operation Details Response

When `query` is "operations" with a `name`:

```json
{
  "success": true,
  "data": {
    "name": "create_item",
    "endpoint": "CREATE",
    "description": "Create a new item",
    "parameters": [
      {
        "name": "name",
        "type": "string",
        "required": true,
        "description": "Item name"
      },
      {
        "name": "category",
        "type": "string",
        "required": true,
        "description": "Item category",
        "enum": ["product", "service", "subscription"]
      },
      {
        "name": "price",
        "type": "number",
        "required": false,
        "minimum": 0,
        "description": "Item price in cents"
      }
    ],
    "examples": [
      {
        "description": "Create a basic item",
        "request": {
          "operation": "create_item",
          "params": {
            "name": "Widget",
            "category": "product"
          }
        }
      }
    ]
  }
}
```

### 9.6 Types Response

When `query` is "types":

```json
{
  "success": true,
  "data": {
    "types": [
      {
        "name": "ItemCategory",
        "kind": "enum",
        "values": ["product", "service", "subscription"]
      },
      {
        "name": "Item",
        "kind": "object",
        "fields": [
          { "name": "id", "type": "string" },
          { "name": "name", "type": "string" },
          { "name": "category", "type": "ItemCategory" },
          { "name": "price", "type": "number" }
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
