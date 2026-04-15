# Field Selection Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

## Abstract

This document specifies the optional field selection feature that enables clients to request only specific fields in responses, reducing payload size and token consumption.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Request Format](#2-request-format)
3. [Presets](#3-presets)
4. [Response Format](#4-response-format)
5. [Implementation Requirements](#5-implementation-requirements)

---

## 1. Introduction

### 1.1 Purpose

Field selection allows clients to specify which fields to include in responses, providing:

- **Token efficiency** - Smaller payloads consume fewer tokens
- **Bandwidth savings** - Reduced data transfer
- **Client control** - Fetch only what's needed
- **Consistent interface** - Same pattern across operations

### 1.2 Status

Field selection is an **optional** feature. Adapters MAY implement it for Level 2 conformance.

### 1.3 Token Impact

| Scenario | Without Selection | With Selection | Savings |
|----------|-------------------|----------------|---------|
| List 10 items (full) | ~2,500 tokens | ~800 tokens | ~68% |
| Get single item (full) | ~350 tokens | ~120 tokens | ~65% |
| Search results (20 items) | ~4,000 tokens | ~1,200 tokens | ~70% |

---

## 2. Request Format

### 2.1 Fields Parameter

The `fields` parameter is the preferred field-selection control. It accepts either a preset name or an array of field names:

```javascript
{
  operation: "list_users",
  params: {
    fields: "minimal"
  }
}
```

```javascript
{
  operation: "list_users",
  params: {
    fields: ["id", "name", "email"]
  }
}
```

### 2.2 Preset Compatibility Alias

Adapters MAY also accept a `preset` parameter as a compatibility alias. New request shapes SHOULD prefer `fields: "minimal"` rather than introducing a separate control:

```javascript
{
  operation: "list_users",
  params: {
    preset: "minimal"
  }
}
```

### 2.3 Combined Usage

When both are specified, the explicit field list extends the preset:

```javascript
{
  operation: "list_users",
  params: {
    preset: "minimal",
    fields: ["created_at"]  // Adds to minimal preset
  }
}
```

### 2.4 Nested Fields

Dot notation accesses nested properties:

```javascript
{
  operation: "get_user",
  params: {
    fields: ["id", "name", "settings.theme", "settings.language"]
  }
}
```

---

## 3. Presets

### 3.1 Standard Presets

Adapters implementing field selection SHOULD support these presets:

#### 3.1.1 Minimal

Essential identification fields only.

**Use case:** Quick listings, autocomplete, selection UI.

#### 3.1.2 Standard

Common fields for typical use.

**Use case:** Default listing view, basic info display.

#### 3.1.3 Full

All available fields.

**Use case:** Detailed view, export, debugging.

### 3.2 Default Behavior

When neither `fields` nor `preset` is specified:
- Single item operations: Return `full`
- Collection operations: Return `standard`
- Search operations: Return `minimal`

### 3.3 Custom Presets

Adapters MAY define additional presets specific to their domain:

```javascript
// Example custom presets for a user adapter
"contact": ["id", "name", "email", "phone"]
"profile": ["id", "name", "bio", "avatar_url"]
```

Custom presets SHOULD be discoverable via introspection.

---

## 4. Response Format

### 4.1 Filtered Response

Only requested fields appear in response:

**Request:**
```javascript
{
  operation: "get_user",
  params: {
    user_id: "123",
    fields: ["id", "name"]
  }
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    id: "123",
    name: "Alice"
  }
}
```

### 4.2 Collection Response

For collections, selection applies to each item:

**Request:**
```javascript
{
  operation: "list_users",
  params: {
    fields: "minimal"
  }
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    items: [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" }
    ],
    pagination: { ... }  // Pagination not affected by selection
  }
}
```

### 4.3 Missing Fields

If a requested field doesn't exist on an item:

- **Omit the field** - Don't include in response
- **No error** - Silently skip
- **Consistent behavior** - Same across all items

---

## 5. Implementation Requirements

### 5.1 MUST Requirements

Adapters implementing field selection MUST:

1. Support the `fields` parameter on READ operations
2. Treat preset names (`minimal`, `standard`, `full`) supplied through `fields` as first-class field-selection values
3. Handle nested field access via dot notation
4. Preserve structure for nested fields

### 5.2 SHOULD Requirements

Adapters implementing field selection SHOULD:

1. Implement `minimal`, `standard`, and `full` presets
2. Document available fields per resource type
3. Support field selection on search results
4. Validate field names against known fields
5. Accept `preset` as a compatibility alias only when needed for older clients

> **Collection Querying Note:** Field selection is one part of the broader collection-query contract. See [Collection Querying](./collection-querying.md) for guidance on composing `fields` with `query`, `filter`, `sort`, and pagination.

### 5.3 Introspection

Field selection options SHOULD be discoverable:

```javascript
{
  operation: "introspect",
  params: { query: "types", name: "FieldSelection" }
}

// Response:
{
  success: true,
  data: {
    type: {
      name: "FieldSelection",
      kind: "object",
      description: "Field selection configuration",
      fields: [
        { name: "presets", type: "array", description: "Available presets" },
        { name: "fields", type: "object", description: "Available fields by type" }
      ]
    }
  }
}
```

---

## References

- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- [Operations Guide](../operations.md)
- [Introspection Specification](../introspection.md)
