# MCP-AQL Relationship Queries

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

> **Document Status:** This document is **informative**. For normative requirements, see [MCP-AQL Specification v1.0.0](../versions/v1.0.0-draft.md).

## Abstract

This document defines the preferred MCP-AQL shape for relationship traversal and
graph-oriented READ operations. Relationship queries give clients a standard way
to move through adapter-defined connections without manually fetching each node
one hop at a time.

## 1. Preferred Operation Shape

The preferred operation name is `query_relationships`:

```javascript
{
  operation: "query_relationships",
  params: {
    root: {
      element_type: "agent",
      element_name: "code_reviewer"
    },
    direction: "outgoing",
    relationship: "uses",
    depth: 2,
    fields: ["root", "relationships", "graph.nodes", "graph.edges"]
  }
}
```

## 2. Core Parameters

| Parameter | Meaning |
|-----------|---------|
| `root` | Starting resource for the traversal |
| `direction` | `incoming`, `outgoing`, or `both` |
| `relationship` | Relationship type to match |
| `depth` | Maximum traversal depth |
| `fields` | Optional field selection for the graph response |
| `first` / `after` | Optional pagination controls when traversals are large |

Adapters MAY add domain-specific root identifiers or filter controls, but SHOULD
keep the traversal vocabulary stable.

## 3. Response Shape

```json
{
  "success": true,
  "data": {
    "root": {
      "element_type": "agent",
      "element_name": "code_reviewer"
    },
    "relationships": [
      {
        "type": "uses",
        "direction": "outgoing",
        "target": {
          "element_type": "skill",
          "element_name": "typescript_analysis"
        },
        "depth": 1
      }
    ],
    "graph": {
      "nodes": [
        {
          "id": "agent:code_reviewer",
          "element_type": "agent",
          "element_name": "code_reviewer"
        },
        {
          "id": "skill:typescript_analysis",
          "element_type": "skill",
          "element_name": "typescript_analysis"
        }
      ],
      "edges": [
        {
          "source": "agent:code_reviewer",
          "target": "skill:typescript_analysis",
          "type": "uses"
        }
      ]
    }
  }
}
```

## 4. Standard Relationship Vocabulary

The preferred portable relationship types are:

- `uses`
- `extends`
- `references`
- `triggers`
- `composes`

Adapters MAY define additional relationship types. When they do, they SHOULD
document them in introspection and keep custom semantics explicit.

## 5. Depth and Cycle Handling

- Adapters SHOULD document a maximum supported traversal depth.
- Adapters SHOULD avoid infinite traversal by deduplicating visited nodes.
- When cycles are present, adapters SHOULD still emit the edge but MUST prevent
  unbounded expansion.

## 6. Introspection Guidance

Adapters SHOULD advertise relationship-query support through operation detail
metadata:

```json
{
  "relationship_capabilities": {
    "supported": true,
    "directions": ["incoming", "outgoing", "both"],
    "relationship_types": ["uses", "extends", "references", "triggers", "composes"],
    "max_depth": 3
  }
}
```

## 7. Relationship to Other Docs

- [Collection Querying](./collection-querying.md) defines how `fields` and
  pagination compose with collection-style responses.
- [Operations](../operations.md) documents the common request and response
  conventions used by `query_relationships`.
