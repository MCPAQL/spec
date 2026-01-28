# Cursor-Based Pagination Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-28

## Abstract

This document defines cursor-based pagination semantics for MCP-AQL operations that return collections. Cursor pagination enables efficient iteration through large datasets while minimizing token usage in LLM context windows.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Pagination Parameters](#2-pagination-parameters)
3. [PageInfo Response](#3-pageinfo-response)
4. [Connection-Style Response](#4-connection-style-response)
5. [Applicable Operations](#5-applicable-operations)
6. [Implementation Requirements](#6-implementation-requirements)
7. [Future Extensions](#7-future-extensions)

---

## 1. Overview

### 1.1 Purpose

Operations returning complete result sets create several problems:

- **Token bloat** - Large collections consume LLM context windows
- **Memory pressure** - Servers and clients may struggle with large datasets
- **Inefficient re-fetching** - No way to resume interrupted queries
- **Poor user experience** - Long wait times for initial results

Cursor-based pagination addresses these by:

- **Bounded responses** - Control result set size per request
- **Stable iteration** - Cursors maintain position across requests
- **Efficient forward/backward** - Navigate in either direction
- **Resumable queries** - Continue from any cursor position

### 1.2 Design Principles

1. **Opaque cursors** - Cursor format is implementation-defined
2. **Stable ordering** - Results maintain consistent order across pages
3. **Bidirectional** - Support both forward and backward navigation
4. **Optional totals** - Total count is optional (expensive for some backends)

### 1.3 Alignment with Standards

This specification aligns with:

- **GraphQL Relay Cursor Connections** - Primary inspiration for the connection model
- **OData pagination** - Parameter naming conventions
- **JSON:API pagination** - Link-based navigation patterns

---

## 2. Pagination Parameters

### 2.1 Parameter Schema

Operations supporting pagination accept these parameters:

```typescript
interface PaginationParams {
  /**
   * Number of items to return from the start
   * Mutually exclusive with 'last'
   */
  first?: number;

  /**
   * Cursor to start after (forward pagination)
   * Used with 'first'
   */
  after?: string;

  /**
   * Number of items to return from the end
   * Mutually exclusive with 'first'
   */
  last?: number;

  /**
   * Cursor to start before (backward pagination)
   * Used with 'last'
   */
  before?: string;
}
```

### 2.2 Parameter Combinations

| Parameters | Behavior |
|------------|----------|
| `first` | First N items from start |
| `first` + `after` | First N items after cursor |
| `last` | Last N items from end |
| `last` + `before` | Last N items before cursor |
| None | Default page size from start |

### 2.3 Invalid Combinations

The following combinations MUST return a validation error:

- `first` + `last` (ambiguous direction)
- `after` without `first` (missing page size)
- `before` without `last` (missing page size)
- `first` + `before` (mismatched direction)
- `last` + `after` (mismatched direction)

**Error response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_INVALID_PAGINATION",
    "message": "Cannot use 'first' and 'last' together",
    "details": {
      "provided": ["first", "last"],
      "hint": "Use 'first' for forward pagination or 'last' for backward pagination"
    }
  }
}
```

### 2.4 Example Requests

**First page:**
```javascript
{
  operation: "list_elements",
  element_type: "persona",
  params: {
    first: 10
  }
}
```

**Next page:**
```javascript
{
  operation: "list_elements",
  element_type: "persona",
  params: {
    first: 10,
    after: "cursor_xyz789"
  }
}
```

**Previous page:**
```javascript
{
  operation: "list_elements",
  element_type: "persona",
  params: {
    last: 10,
    before: "cursor_abc123"
  }
}
```

---

## 3. PageInfo Response

### 3.1 PageInfo Schema

All paginated responses MUST include a `pageInfo` object:

```typescript
interface PageInfo {
  /**
   * Whether more items exist after the last item
   * Required
   */
  hasNextPage: boolean;

  /**
   * Whether more items exist before the first item
   * Required
   */
  hasPreviousPage: boolean;

  /**
   * Cursor of the first item in the result set
   * Required when items are returned
   */
  startCursor?: string;

  /**
   * Cursor of the last item in the result set
   * Required when items are returned
   */
  endCursor?: string;

  /**
   * Total count of items matching the query
   * Optional - may be omitted if expensive to compute
   */
  totalCount?: number;
}
```

### 3.2 PageInfo Requirements

| Field | Required | Notes |
|-------|----------|-------|
| `hasNextPage` | Yes | Always include, even if false |
| `hasPreviousPage` | Yes | Always include, even if false |
| `startCursor` | Conditional | Required when `items.length > 0` |
| `endCursor` | Conditional | Required when `items.length > 0` |
| `totalCount` | No | Include when available without performance impact |

### 3.3 Example PageInfo

**First page of results:**
```json
{
  "pageInfo": {
    "hasNextPage": true,
    "hasPreviousPage": false,
    "startCursor": "cursor_001",
    "endCursor": "cursor_010",
    "totalCount": 150
  }
}
```

**Last page of results:**
```json
{
  "pageInfo": {
    "hasNextPage": false,
    "hasPreviousPage": true,
    "startCursor": "cursor_141",
    "endCursor": "cursor_150"
  }
}
```

**Empty results:**
```json
{
  "pageInfo": {
    "hasNextPage": false,
    "hasPreviousPage": false,
    "totalCount": 0
  }
}
```

---

## 4. Connection-Style Response

### 4.1 Response Structure

Paginated operations SHOULD return a connection-style response:

```typescript
interface Connection<T> {
  /**
   * The items in this page
   */
  items: T[];

  /**
   * Pagination metadata
   */
  pageInfo: PageInfo;

  /**
   * Optional edges with per-item cursors
   */
  edges?: Edge<T>[];
}

interface Edge<T> {
  /**
   * The item
   */
  node: T;

  /**
   * Cursor for this specific item
   */
  cursor: string;
}
```

### 4.2 Simple Response Format

For most use cases, the simple format is sufficient:

```json
{
  "success": true,
  "data": {
    "items": [
      { "name": "alice", "status": "active" },
      { "name": "bob", "status": "active" },
      { "name": "charlie", "status": "inactive" }
    ],
    "pageInfo": {
      "hasNextPage": true,
      "hasPreviousPage": false,
      "startCursor": "cursor_001",
      "endCursor": "cursor_003",
      "totalCount": 25
    }
  }
}
```

### 4.3 Edge Response Format

When per-item cursors are needed (e.g., for deletion during iteration):

```json
{
  "success": true,
  "data": {
    "edges": [
      {
        "node": { "name": "alice", "status": "active" },
        "cursor": "cursor_001"
      },
      {
        "node": { "name": "bob", "status": "active" },
        "cursor": "cursor_002"
      },
      {
        "node": { "name": "charlie", "status": "inactive" },
        "cursor": "cursor_003"
      }
    ],
    "pageInfo": {
      "hasNextPage": true,
      "hasPreviousPage": false,
      "startCursor": "cursor_001",
      "endCursor": "cursor_003"
    }
  }
}
```

### 4.4 Choosing Response Format

| Use Case | Recommended Format |
|----------|-------------------|
| Simple listing | `items` array |
| Modify during iteration | `edges` with cursors |
| LLM context (minimize tokens) | `items` array |
| Resume from specific item | `edges` with cursors |

---

## 5. Applicable Operations

### 5.1 Operations Supporting Pagination

The following operation types SHOULD support pagination:

| Operation | Required | Notes |
|-----------|----------|-------|
| `list_elements` | Yes | Core element listing |
| `search_elements` | Yes | Search results |
| `query_elements` | Yes | Complex queries |
| `list_*` | Yes | Any list operation |
| `search_*` | Yes | Any search operation |

### 5.2 Default Behavior

When pagination parameters are omitted:

| Aspect | Default |
|--------|---------|
| Page size | Implementation-defined (RECOMMENDED: 20) |
| Direction | Forward (from start) |
| Cursor | None (first page) |

### 5.3 Maximum Page Size

Implementations SHOULD enforce a maximum page size:

- **RECOMMENDED maximum:** 100 items
- **Hard limit:** 1000 items

Requests exceeding the maximum SHOULD be clamped to the maximum (not rejected).

### 5.4 Introspection of Pagination Support

Operations indicate pagination support in introspection:

```json
{
  "name": "list_elements",
  "supports_pagination": true,
  "pagination": {
    "default_page_size": 20,
    "max_page_size": 100,
    "supports_total_count": true
  }
}
```

---

## 6. Implementation Requirements

### 6.1 MUST Requirements

Implementations supporting pagination MUST:

1. Accept `first`, `after`, `last`, `before` parameters
2. Return `pageInfo` with `hasNextPage` and `hasPreviousPage`
3. Return `startCursor` and `endCursor` when items are present
4. Reject invalid parameter combinations with error code
5. Maintain stable ordering within a pagination session

### 6.2 SHOULD Requirements

Implementations supporting pagination SHOULD:

1. Return `totalCount` when available without performance impact
2. Enforce maximum page size limits
3. Support both forward and backward pagination
4. Use opaque, URL-safe cursor format
5. Include pagination support in introspection

### 6.3 MAY Requirements

Implementations supporting pagination MAY:

1. Include `edges` with per-item cursors
2. Support cursor expiration/TTL
3. Implement cursor resumption across sessions
4. Support sorting parameters alongside pagination

### 6.4 Cursor Format

Cursors MUST be:

- **Opaque** - Clients treat as black box
- **URL-safe** - Base64url encoding recommended
- **Stable** - Same cursor returns same position

Cursors SHOULD be:

- **Tamper-resistant** - Include validation/signature
- **Compact** - Minimize size for LLM context
- **Self-contained** - No server-side session state required

**Example cursor encoding:**
```typescript
// Encoding
const cursor = btoa(JSON.stringify({
  id: "item_123",
  sort_key: "2026-01-28T12:00:00Z"
}));

// Result: "eyJpZCI6Iml0ZW1fMTIzIiwic29ydF9rZXkiOiIyMDI2LTAxLTI4VDEyOjAwOjAwWiJ9"
```

---

## 7. Future Extensions

### 7.1 Sorting with Pagination

Combine sorting and pagination:

```javascript
{
  operation: "list_elements",
  element_type: "persona",
  params: {
    first: 10,
    sort_by: "created_at",
    sort_order: "desc"
  }
}
```

### 7.2 Filtered Pagination

Pagination with filters:

```javascript
{
  operation: "list_elements",
  element_type: "persona",
  params: {
    first: 10,
    filter: {
      status: "active",
      tags: { contains: "admin" }
    }
  }
}
```

### 7.3 Offset-Based Pagination

For backends requiring offset:

```javascript
{
  operation: "list_elements",
  element_type: "persona",
  params: {
    offset: 20,
    limit: 10
  }
}
```

### 7.4 Streaming Pagination

For real-time data:

```javascript
{
  operation: "list_elements",
  element_type: "persona",
  params: {
    first: 10,
    stream: true,
    poll_interval_ms: 5000
  }
}
```

### 7.5 Pagination Presets

Named pagination configurations:

```yaml
# In adapter schema
pagination_presets:
  compact:
    page_size: 5
    include_total: false
  detailed:
    page_size: 20
    include_total: true
    include_edges: true
```

---

## References

- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- [GraphQL Relay Cursor Connections](https://relay.dev/graphql/connections.htm)
- [Field Selection Specification](./field-selection.md)
- [Operations Reference](../operations.md)
- GitHub Issue: [#37](https://github.com/MCPAQL/spec/issues/37)
- DollhouseMCP Implementation: [#299](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/299)
