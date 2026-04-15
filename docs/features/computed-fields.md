# MCP-AQL Computed Fields

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

> **Document Status:** This document is **informative**. For normative requirements, see [MCP-AQL Specification v1.0.0](../versions/v1.0.0-draft.md).

## Abstract

This document defines the preferred MCP-AQL shape for adapter-declared computed
fields. Computed fields let adapters expose derived values such as ages, counts,
or status booleans without forcing clients or LLMs to reconstruct them from raw
records.

## 1. Requesting Computed Fields

Computed fields use the `_computed.` prefix inside `fields`:

```javascript
{
  operation: "get_widget",
  params: {
    widget_id: "widget_123",
    fields: ["widget_name", "_computed.age_days", "_computed.child_count"]
  }
}
```

The `_computed.` prefix keeps derived values visibly distinct from persisted
fields while still composing with normal field selection.

## 2. Response Shape

Computed values are returned under the `_computed` object:

```json
{
  "success": true,
  "data": {
    "widget_name": "Atlas Widget",
    "_computed": {
      "age_days": 47,
      "child_count": 12
    }
  }
}
```

## 3. Filter and Sort Composition

Adapters MAY allow computed fields in other query-language controls when they
can evaluate them efficiently:

```javascript
{
  operation: "search_widgets",
  params: {
    filter: {
      "_computed.is_stale": true
    },
    sort: {
      "field": "_computed.age_days",
      "order": "desc"
    },
    fields: ["widget_name", "_computed.age_days"]
  }
}
```

If an adapter does not support computed-field filtering or sorting, it SHOULD
reject those requests clearly instead of silently ignoring them.

## 4. Introspection Guidance

Adapters SHOULD advertise computed fields in operation detail metadata:

```json
{
  "computed_fields": [
    {
      "name": "age_days",
      "type": "number",
      "description": "Days since creation",
      "filterable": true,
      "sortable": true
    },
    {
      "name": "child_count",
      "type": "number",
      "description": "Number of child widgets",
      "filterable": false,
      "sortable": true
    }
  ]
}
```

This gives clients a machine-readable list of the derived values they can ask
for, plus whether those values participate in filtering and sorting.

## 5. Common Patterns

| Pattern | Examples |
|---------|----------|
| Time-derived | `age_days`, `time_until_due` |
| Counts | `child_count`, `reference_count` |
| Status-derived | `is_stale`, `needs_attention` |
| Size-derived | `estimated_tokens`, `size_human` |

## 6. Relationship to Other Docs

- [Field Selection](./field-selection.md) defines the `_computed.` field path
  convention.
- [Collection Querying](./collection-querying.md) describes how computed fields
  interact with filters, sort clauses, and aggregation.
