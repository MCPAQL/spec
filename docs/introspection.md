# MCP-AQL Introspection Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-14

## Abstract

This document specifies the MCP-AQL introspection system, which provides GraphQL-style discovery capabilities for operations, parameters, types, and examples at runtime.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Introspection Query Types](#2-introspection-query-types)
3. [Response Structures](#3-response-structures)
4. [Operation Discovery](#4-operation-discovery)
5. [Type Discovery](#5-type-discovery)
6. [Token Efficiency](#6-token-efficiency)
7. [Conformance Requirements](#7-conformance-requirements)

---

## 1. Introduction

### 1.1 Purpose

The introspection system enables AI models to discover available operations at runtime rather than parsing large tool schemas upfront. This provides:

- **On-demand discovery** - Query only what's needed
- **Self-documenting API** - API describes itself without external documentation
- **Token efficiency** - Avoid parsing many tool schemas
- **Dynamic capability detection** - Discover adapter-specific operations

### 1.2 Design Principles

1. **Progressive disclosure** - Start with summaries, drill into details
2. **Consistency** - Same response structure for all queries
3. **Completeness** - Sufficient information to construct valid requests
4. **Efficiency** - Minimal response size while maintaining usefulness

### 1.3 Adapter-Defined Content

The introspection system returns information about the adapter's operations and types. Different adapters will expose different operations - MCP-AQL defines the introspection mechanism, not the operations themselves.

---

## 2. Introspection Query Types

### 2.1 The `introspect` Operation

All introspection is performed through the `introspect` operation on the READ endpoint. This is the only operation that MCP-AQL requires all adapters to implement.

**Request Format:**
```json
{
  "operation": "introspect",
  "params": {
    "query": "<query_type>",
    "name": "<optional_specific_name>"
  }
}
```

### 2.2 Query Types

| Query | Description | Name Parameter |
|-------|-------------|----------------|
| `operations` | List or describe operations | Optional: specific operation name |
| `types` | List or describe types | Optional: specific type name |

### 2.3 Query Behavior

**Without `name` parameter:** Returns a list of all items of that type with summary information.

**With `name` parameter:** Returns detailed information for the specific item.

---

## 3. Response Structures

### 3.1 Standard Response Wrapper

All introspection responses follow the standard MCP-AQL response format:

```json
{
  "success": true,
  "data": {
    // Introspection-specific payload
  }
}
```

### 3.2 OperationInfo (List Item)

Summary information for an operation in list responses:

```typescript
interface OperationInfo {
  name: string;        // Operation identifier (e.g., "create_user")
  endpoint: string;    // CRUDE endpoint (e.g., "CREATE")
  description: string; // Brief description
}
```

### 3.3 OperationDetails (Detail Response)

Complete information for a specific operation:

```typescript
interface OperationDetails {
  name: string;                    // Operation identifier
  endpoint: string;                // CRUDE endpoint
  mcpTool: string;                 // MCP tool name (e.g., "mcp_aql_create")
  description: string;             // Detailed description
  permissions: {
    readOnly: boolean;             // Whether operation modifies state
    destructive: boolean;          // Whether operation removes state
  };
  parameters: ParameterInfo[];     // Parameter definitions
  returns: TypeInfo;               // Return type information
  examples: string[];              // Example invocations
}
```

### 3.4 ParameterInfo

Parameter definition:

```typescript
interface ParameterInfo {
  name: string;        // Parameter name (snake_case)
  type: string;        // Type name (e.g., "string", "number", adapter-defined types)
  required: boolean;   // Whether parameter is required
  description: string; // Parameter description
  default?: unknown;   // Default value if any
}
```

### 3.5 TypeInfo (List Item)

Summary information for a type:

```typescript
interface TypeInfo {
  name: string;         // Type identifier
  kind: TypeKind;       // "enum" | "object" | "scalar" | "union"
  description?: string; // Brief description
}
```

### 3.6 TypeDetails (Detail Response)

Complete information for a specific type:

```typescript
interface TypeDetails extends TypeInfo {
  values?: string[];         // For enum types: allowed values
  fields?: ParameterInfo[];  // For object types: field definitions
  members?: string[];        // For union types: member type names
}
```

---

## 4. Operation Discovery

### 4.1 Listing All Operations

**Request:**
```json
{
  "operation": "introspect",
  "params": { "query": "operations" }
}
```

**Response (example from a user management adapter):**
```json
{
  "success": true,
  "data": {
    "operations": [
      {
        "name": "create_user",
        "endpoint": "CREATE",
        "description": "Create a new user account"
      },
      {
        "name": "list_users",
        "endpoint": "READ",
        "description": "List users with filtering and pagination"
      },
      {
        "name": "update_user",
        "endpoint": "UPDATE",
        "description": "Update user properties"
      },
      {
        "name": "delete_user",
        "endpoint": "DELETE",
        "description": "Permanently delete a user"
      },
      {
        "name": "introspect",
        "endpoint": "READ",
        "description": "Discover available operations and types"
      }
    ]
  }
}
```

### 4.2 Getting Operation Details

**Request:**
```json
{
  "operation": "introspect",
  "params": {
    "query": "operations",
    "name": "create_user"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operation": {
      "name": "create_user",
      "endpoint": "CREATE",
      "mcpTool": "mcp_aql_create",
      "description": "Create a new user account",
      "permissions": {
        "readOnly": false,
        "destructive": false
      },
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
          "type": "UserRole",
          "required": false,
          "default": "user",
          "description": "User's role in the system"
        }
      ],
      "returns": {
        "name": "User",
        "kind": "object",
        "description": "Newly created user"
      },
      "examples": [
        "{ operation: \"create_user\", params: { email: \"alice@example.com\", name: \"Alice\" } }"
      ]
    }
  }
}
```

### 4.3 Unknown Operation

**Request:**
```json
{
  "operation": "introspect",
  "params": {
    "query": "operations",
    "name": "nonexistent_operation"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operation": null
  }
}
```

---

## 5. Type Discovery

### 5.1 Listing All Types

**Request:**
```json
{
  "operation": "introspect",
  "params": { "query": "types" }
}
```

**Response (example from a user management adapter):**
```json
{
  "success": true,
  "data": {
    "types": [
      {
        "name": "UserRole",
        "kind": "enum",
        "description": "User role levels"
      },
      {
        "name": "User",
        "kind": "object",
        "description": "User account object"
      },
      {
        "name": "CRUDEndpoint",
        "kind": "enum",
        "description": "CRUDE endpoint identifiers"
      },
      {
        "name": "OperationResult",
        "kind": "union",
        "description": "Success or failure result"
      }
    ]
  }
}
```

### 5.2 Getting Type Details

**Enum Type Request:**
```json
{
  "operation": "introspect",
  "params": {
    "query": "types",
    "name": "UserRole"
  }
}
```

**Enum Type Response:**
```json
{
  "success": true,
  "data": {
    "type": {
      "name": "UserRole",
      "kind": "enum",
      "description": "User role levels",
      "values": ["admin", "user", "guest"]
    }
  }
}
```

**Object Type Request:**
```json
{
  "operation": "introspect",
  "params": {
    "query": "types",
    "name": "User"
  }
}
```

**Object Type Response:**
```json
{
  "success": true,
  "data": {
    "type": {
      "name": "User",
      "kind": "object",
      "description": "User account object",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "description": "Unique user identifier"
        },
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
          "description": "Display name"
        },
        {
          "name": "role",
          "type": "UserRole",
          "required": true,
          "description": "User's role"
        }
      ]
    }
  }
}
```

### 5.3 Protocol Types

MCP-AQL defines these protocol-level types that adapters SHOULD include:

| Type Name | Kind | Description |
|-----------|------|-------------|
| `CRUDEndpoint` | enum | Endpoints: CREATE, READ, UPDATE, DELETE, EXECUTE |
| `OperationInput` | object | Standard input structure |
| `OperationResult` | union | Success or failure result |
| `OperationSuccess` | object | Successful result with data |
| `OperationFailure` | object | Failed result with error |

Adapters define their own domain-specific types in addition to these.

---

## 6. Token Efficiency

### 6.1 Discovery Pattern

The introspection system enables a token-efficient discovery pattern:

```
Step 1: List operations (~50 tokens response)
   { operation: "introspect", params: { query: "operations" } }

Step 2: Get details for relevant operation (~100 tokens response)
   { operation: "introspect", params: { query: "operations", name: "create_user" } }

Step 3: Execute operation
   { operation: "create_user", params: { ... } }
```

### 6.2 Comparison with Discrete Tools

| Approach | Upfront Cost | Per-Operation Cost | Total (10 ops) |
|----------|--------------|-------------------|----------------|
| Discrete tools | ~29,600 tokens | 0 | ~29,600 |
| MCP-AQL + introspect | ~1,100 tokens | ~150 tokens | ~2,600 |

### 6.3 Caching Recommendations

Implementations SHOULD:
- Cache introspection responses during a session
- Return consistent results for the same query within a session
- Invalidate cache only when server configuration changes

---

## 7. Conformance Requirements

### 7.1 MUST Requirements

Conforming implementations MUST:

1. Implement the `introspect` operation on the READ endpoint
2. Support both `operations` and `types` query types
3. Return OperationInfo for all supported operations
4. Include accurate parameter information with required flags
5. Use consistent type names across all responses

### 7.2 SHOULD Requirements

Conforming implementations SHOULD:

1. Include usage examples for all operations
2. Provide meaningful descriptions for all parameters
3. Document default values in parameter info
4. Return operations grouped by endpoint in list responses
5. Include the protocol types (CRUDEndpoint, OperationResult, etc.)

### 7.3 MAY Requirements

Conforming implementations MAY:

1. Define additional custom types
2. Include additional metadata in responses
3. Support additional query types
4. Provide filtering/pagination for large operation lists

---

## References

- [MCP-AQL Specification v1.0.0-draft](versions/v1.0.0-draft.md)
- [CRUDE Pattern Specification](crude-pattern.md)
- [Operations Guide](operations.md)
