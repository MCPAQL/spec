# MCP-AQL Aggregations

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

> **Document Status:** This document is **informative**. For normative requirements, see [MCP-AQL Specification v1.0.0](../versions/v1.0.0-draft.md).

## Abstract

This document defines the preferred MCP-AQL shape for server-side aggregation on
collection-returning READ operations. Aggregations let adapters return counts,
groupings, and numeric summaries without forcing clients or LLMs to fetch every
record and compute the answer themselves.

## 1. Preferred Request Shape

Aggregation is expressed through an `aggregate` object in `params`:

```javascript
{
  operation: "search_widgets",
  params: {
    filter: {
      status: "active"
    },
    aggregate: {
      total: {
        count: true
      },
      by_status: {
        group_by: "status",
        count: true
      },
      average_size: {
        avg: "size_bytes"
      }
    }
  }
}
```

Each key under `aggregate` is a caller-chosen result label. The value describes
the computation to perform.

## 2. Supported Operations

The preferred aggregation vocabulary is:

| Key | Meaning |
|-----|---------|
| `count` | Count matching records |
| `group_by` | Group records by a field |
| `sum` | Sum a numeric field |
| `avg` | Average a numeric field |
| `min` | Minimum value for a field |
| `max` | Maximum value for a field |

Adapters MAY support a subset, but SHOULD expose the supported functions and
fields through introspection.

Within a single named expression, `group_by` MAY be combined with one or more
summary functions such as `count`, `sum`, `avg`, `min`, or `max`. Adapters
SHOULD document any unsupported combinations. A bare `group_by` without at
least one summary function is NOT RECOMMENDED because it leaves the result shape
underspecified.

## 3. Response Shape

When `aggregate` is present, the preferred summary-first response shape is:

```json
{
  "success": true,
  "data": {
    "aggregations": {
      "total": 25,
      "by_status": {
        "active": 18,
        "paused": 7
      },
      "average_size": 913.4
    }
  }
}
```

Adapters SHOULD omit raw `items` by default when an aggregation request is
summary-oriented. If an adapter supports returning both summaries and rows in
one call, it SHOULD use an explicit `include_items: true` flag.

```json
{
  "success": true,
  "data": {
    "aggregations": {
      "total": 25,
      "by_status": {
        "active": 18,
        "paused": 7
      }
    },
    "items": [
      {
        "widget_id": "w_001",
        "status": "active"
      }
    ]
  }
}
```

## 4. Composition Rules

- Aggregations are applied after `query` and `filter`.
- `sort` applies to the pre-aggregation record set. In summary-only mode,
  adapters MAY ignore it when ordering has no effect on the aggregate result.
- `fields` does not rename or project aggregate result keys. Clients SHOULD use
  the names defined inside `aggregate` to control which summary values appear in
  the response.
- Aggregations SHOULD respect the same access-control and visibility rules as
  ordinary reads.
- Adapters SHOULD reject unsupported aggregation functions or fields with a
  structured validation error.
- Multiple named aggregations MAY appear in the same request.

## 5. Introspection Guidance

Adapters SHOULD advertise aggregation support through operation detail metadata:

```json
{
  "aggregation_support": {
    "supported": true,
    "default_mode": "summary_only",
    "functions": ["count", "group_by", "sum", "avg", "min", "max"],
    "groupable_fields": ["status", "category"],
    "numeric_fields": ["size_bytes", "usage_count"]
  }
}
```

This keeps aggregation discoverable without requiring the client to guess which
fields or functions are valid.

## 6. Relationship to Other Docs

- [Collection Querying](./collection-querying.md) describes how `aggregate`
  composes with `query`, `filter`, `sort`, `fields`, and pagination.
- [Operations](../operations.md) defines the shared request and response
  conventions used by aggregation-capable READ operations.
