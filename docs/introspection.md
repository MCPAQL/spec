# MCP-AQL Introspection Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-05

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
- **Token efficiency** - Avoid parsing 50+ tool schemas (~29,600 tokens)
- **Dynamic capability detection** - Discover server-specific extensions

### 1.2 Design Principles

1. **Progressive disclosure** - Start with summaries, drill into details
2. **Consistency** - Same response structure for all queries
3. **Completeness** - Sufficient information to construct valid requests
4. **Efficiency** - Minimal response size while maintaining usefulness

---

## 2. Introspection Query Types

### 2.1 The `introspect` Operation

All introspection is performed through the `introspect` operation on the READ endpoint.

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
  name: string;        // Operation identifier (e.g., "create_element")
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
  type: string;        // Type name (e.g., "string", "ElementType")
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

**Response:**
```json
{
  "success": true,
  "data": {
    "operations": [
      {
        "name": "create_element",
        "endpoint": "CREATE",
        "description": "Create a new element of any type"
      },
      {
        "name": "list_elements",
        "endpoint": "READ",
        "description": "List elements with filtering and pagination"
      }
      // ... additional operations
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
    "name": "create_element"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operation": {
      "name": "create_element",
      "endpoint": "CREATE",
      "mcpTool": "mcp_aql_create",
      "description": "Create a new element of any type",
      "permissions": {
        "readOnly": false,
        "destructive": false
      },
      "parameters": [
        {
          "name": "element_name",
          "type": "string",
          "required": true,
          "description": "Element name"
        },
        {
          "name": "element_type",
          "type": "ElementType",
          "required": true,
          "description": "Element type"
        },
        {
          "name": "description",
          "type": "string",
          "required": true,
          "description": "Element description"
        },
        {
          "name": "instructions",
          "type": "string",
          "required": false,
          "description": "Behavioral instructions (REQUIRED for personas)"
        },
        {
          "name": "content",
          "type": "string",
          "required": false,
          "description": "Element content (REQUIRED for agents, skills, templates)"
        },
        {
          "name": "metadata",
          "type": "object",
          "required": false,
          "description": "Additional metadata"
        }
      ],
      "returns": {
        "name": "Element",
        "kind": "object",
        "description": "Newly created element"
      },
      "examples": [
        "{ operation: \"create_element\", element_type: \"persona\", params: { element_name: \"MyPersona\", description: \"A helpful assistant\", instructions: \"You are helpful.\" } }"
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

**Response:**
```json
{
  "success": true,
  "data": {
    "types": [
      {
        "name": "ElementType",
        "kind": "enum",
        "description": "Available element types"
      },
      {
        "name": "CRUDEndpoint",
        "kind": "enum",
        "description": "CRUDE endpoint identifiers"
      },
      {
        "name": "OperationInput",
        "kind": "object",
        "description": "Standard input structure for operations"
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
    "name": "ElementType"
  }
}
```

**Enum Type Response:**
```json
{
  "success": true,
  "data": {
    "type": {
      "name": "ElementType",
      "kind": "enum",
      "description": "Available element types",
      "values": ["persona", "skill", "template", "agent", "memory", "ensemble"]
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
    "name": "OperationInput"
  }
}
```

**Object Type Response:**
```json
{
  "success": true,
  "data": {
    "type": {
      "name": "OperationInput",
      "kind": "object",
      "description": "Standard input structure for all MCP-AQL operations",
      "fields": [
        {
          "name": "operation",
          "type": "string",
          "required": true,
          "description": "The operation to perform"
        },
        {
          "name": "element_type",
          "type": "ElementType",
          "required": false,
          "description": "Element type for element operations"
        },
        {
          "name": "params",
          "type": "object",
          "required": false,
          "description": "Operation-specific parameters"
        }
      ]
    }
  }
}
```

### 5.3 Core Type Definitions

Implementations MUST define these core types:

| Type Name | Kind | Description |
|-----------|------|-------------|
| `ElementType` | enum | Element types: persona, skill, template, agent, memory, ensemble |
| `CRUDEndpoint` | enum | Endpoints: CREATE, READ, UPDATE, DELETE, EXECUTE |
| `OperationInput` | object | Standard input structure |
| `OperationResult` | union | Success or failure result |
| `OperationSuccess` | object | Successful result with data |
| `OperationFailure` | object | Failed result with error |

---

## 6. Token Efficiency

### 6.1 Discovery Pattern

The introspection system enables a token-efficient discovery pattern:

```
Step 1: List operations (~50 tokens response)
   { operation: "introspect", params: { query: "operations" } }

Step 2: Get details for relevant operation (~100 tokens response)
   { operation: "introspect", params: { query: "operations", name: "create_element" } }

Step 3: Execute operation
   { operation: "create_element", ... }
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
4. Return TypeDetails for all core types
5. Include accurate parameter information with required flags
6. Use consistent type names across all responses

### 7.2 SHOULD Requirements

Conforming implementations SHOULD:

1. Include usage examples for all operations
2. Provide meaningful descriptions for all parameters
3. Document default values in parameter info
4. Return operations grouped by endpoint in list responses

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
- [Operations Reference](operations.md)
