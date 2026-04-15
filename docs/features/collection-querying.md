# MCP-AQL Collection Querying

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

> **Document Status:** This document is **informative**. For normative requirements, see [MCP-AQL Specification v1.0.0](../versions/v1.0.0-draft.md).

## Abstract

This document defines the preferred request contract for collection-returning READ operations in MCP-AQL. It aligns `list_*`, `search_*`, and `query_*` operations around a consistent shape for free-text search, structured filtering, sorting, field selection, aggregation, and pagination.

The goal is not to force every adapter into the same backend implementation. The goal is to give clients, adapter authors, and future spec work a stable query-language surface to build on.

---

## 1. Operation Families

MCP-AQL commonly exposes three collection-oriented READ patterns:

| Pattern | Purpose | Typical Example |
|---------|---------|-----------------|
| `list_*` | Enumerate a collection without requiring text search | `list_elements` |
| `search_*` | Free-text retrieval over a collection | `search_elements` |
| `query_*` | Structured or adapter-defined query grammar | `query_elements` |

These patterns MAY coexist in the same adapter. When they do, they SHOULD share the same cross-cutting parameter shapes whenever possible.

---

## 2. Preferred Request Shape

The preferred collection-query shape is:

```javascript
{
  operation: "search_items",
  params: {
    query: "api reviewer",
    filter: {
      category: "persona",
      status: "active"
    },
    sort: {
      field: "updated_at",
      order: "desc"
    },
    fields: "minimal",
    first: 10,
    after: "cursor_abc123"
  }
}
```

### 2.1 Text Query

- `query` is the preferred parameter for free-text search input.
- `search_*` operations SHOULD use `query` as the canonical text-search parameter name.
- `list_*` operations SHOULD NOT require `query`.
- `query_*` operations MAY use `query` for a structured DSL or query object, but MUST document the grammar clearly in introspection and examples.

### 2.2 Structured Filters

- `filter` is the preferred parameter for structured filtering.
- The value SHOULD be an object whose keys are adapter-defined filter fields.
- Unsupported filter keys SHOULD produce a validation error rather than being silently ignored.

### 2.3 Sorting

- `sort` is the preferred parameter for sorting.
- The preferred shape is:

```javascript
{
  sort: {
    field: "created_at",
    order: "desc"
  }
}
```

- Adapters MAY accept shortcut forms such as `sort + order`, but SHOULD document them as compatibility behavior rather than the primary contract.

### 2.4 Field Selection

- `fields` is the preferred field-selection control.
- `fields` MAY be either:
  - A preset string such as `minimal`, `standard`, or `full`
  - An array of explicit field paths
- Computed fields SHOULD use the `_computed.` prefix when they are projected
  through `fields`, for example `_computed.age_days`.
- Separate `preset` parameters SHOULD be treated as compatibility aliases only.

### 2.5 Aggregations

- `aggregate` is the preferred summary-computation control for collection
  operations.
- The preferred shape is a map of named aggregation expressions:

```javascript
{
  aggregate: {
    total: { count: true },
    by_status: { group_by: "status", count: true }
  }
}
```

- When `aggregate` is present, adapters SHOULD return summary data by default
  unless `include_items: true` is explicitly requested.

### 2.6 Pagination

Cursor pagination is the preferred collection-pagination shape:

```javascript
{
  first: 25,
  after: "cursor_abc123"
}
```

Preferred cursor parameters:

| Parameter | Type | Meaning |
|-----------|------|---------|
| `first` | number | Number of items from the start |
| `after` | string | Cursor to continue after |
| `last` | number | Number of items from the end |
| `before` | string | Cursor to continue before |

For response envelopes and cursor metadata, see [Pagination](./pagination.md).

Adapters MAY expose offset- or page-based variants such as `limit`, `offset`, `page`, or `page_size` when the backend or existing ecosystem strongly favors them. When they do:

- The supported style MUST be documented in introspection
- Mixed pagination styles in a single request SHOULD be rejected
- Cursor pagination SHOULD remain the preferred shape for new MCP-AQL-native collection operations

---

## 3. Capability Matrix

The following matrix describes the preferred forward direction for collection-returning READ operations:

| Operation Family | `query` | `filter` | `sort` | `aggregate` | Pagination | `fields` |
|------------------|---------|----------|--------|-------------|------------|----------|
| `list_*` | Not required | SHOULD support | SHOULD support | MAY support | SHOULD support | SHOULD support |
| `search_*` | SHOULD support as the canonical text parameter | SHOULD support | SHOULD support | SHOULD support for summary-style searches | SHOULD support | SHOULD support |
| `query_*` | MUST document grammar | SHOULD document composition rules | SHOULD support when meaningful | SHOULD document support when meaningful | SHOULD support | SHOULD support |

This matrix is intentionally phrased in terms of interoperability rather than backend mechanics. An adapter MAY omit a capability, but it SHOULD make the omission explicit in introspection and operation descriptions.

---

## 4. Search Semantics

### 4.1 Multi-Word Queries

For plain-text `query` strings:

- Multi-word queries SHOULD behave consistently with single-word queries
- The default interpretation SHOULD be OR semantics unless the adapter documents otherwise
- OR semantics are preferred here because they return broader, more forgiving results for exploratory and LLM-generated queries
- Adapters MAY support quoted phrases for exact match

### 4.2 Structured Query Grammars

`query_*` operations sometimes expose a domain-specific query grammar instead of free-text search. Examples include:

- Metadata filters
- Expression trees
- SQL-like or GraphQL-like clauses
- Adapter-specific selector objects

When an adapter uses a structured grammar:

- The grammar MUST be summarized in the operation description
- The accepted input type MUST be reflected in introspection
- At least one example SHOULD show how the grammar composes with `fields`, sorting, and pagination

---

## 5. Validation Guidance

Adapters implementing collection queries SHOULD:

1. Reject unsupported filter keys with a structured validation error
2. Reject unsupported sort fields with a structured validation error
3. Reject mixed or contradictory pagination styles in the same request
4. Avoid silently ignoring collection-query controls that were advertised in introspection
5. Return enough metadata for clients to understand what was actually applied

If an adapter only partially implements the preferred query shape, it SHOULD make that limitation explicit rather than inferring behavior from omitted parameters.

---

## 6. Introspection Guidance

To keep collection querying discoverable for LLM clients, adapters SHOULD expose:

- Supported collection-query parameters in `OperationDetails.parameters`
- Whether the operation supports field selection
- Whether the operation supports aggregation and which functions are available
- Which computed fields are available, if any
- Which pagination style is supported
- Which filter keys and sort fields are accepted
- Examples combining multiple controls in one request

For `query_*` operations with richer grammars, the description SHOULD include a short grammar summary and at least one realistic example.

---

## 7. Relationship to Other Feature Docs

- [Field Selection](./field-selection.md) defines how `fields` works
- [Aggregations](./aggregations.md) defines the preferred `aggregate` request and response shape
- [Computed Fields](./computed-fields.md) defines the `_computed.` projection and metadata pattern
- [Pagination](./pagination.md) defines cursor pagination response semantics
- [Operations](../operations.md) defines general parameter conventions and operation schema guidance

Taken together, these documents provide the preferred MCP-AQL query-language surface for collection-returning READ operations.
