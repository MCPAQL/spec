# Cross-Domain Implementation Guide

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

> **Document Status:** This document is **informative**. For normative protocol requirements, see [MCP-AQL Specification v1.0.0](../versions/v1.0.0-draft.md).

## Abstract

This guide shows how to adapt MCP-AQL to domains beyond AI element management.
It focuses on the practical translation step: taking an existing API or system,
mapping its resources and operations into MCP-AQL, and preserving the
discoverability and token-efficiency benefits that make the protocol useful for
AI clients.

## 1. Start with Domain Mapping

Before you name any operations, identify three core pieces:

| Question | What you are mapping | Example |
|----------|----------------------|---------|
| What are the primary resources? | MCP-AQL resource or type names | `database`, `table`, `file`, `route`, `device` |
| How are they identified? | Stable lookup parameters | `database_name`, `table_name`, `file_path`, `route_id`, `device_id` |
| Which actions matter most? | MCP-AQL operations | `list_tables`, `get_file`, `update_route`, `execute_firmware_upgrade` |

The best first pass is usually:

1. list the nouns in your domain
2. list the real tasks users perform
3. group those tasks into CRUDE semantics

## 2. Choose Stable Resource Identifiers

MCP-AQL works best when identifiers are:

- stable across sessions
- explicit in parameter names
- specific enough to avoid ambiguity

Good examples:

- `database_name`
- `table_name`
- `file_path`
- `route_id`
- `device_id`

Avoid vague identifiers like `name` or `id` when the operation could target
more than one resource type.

## 3. Design Operations Around CRUDE

CRUDE (Create, Read, Update, Delete, Execute) maps each operation to its effect
on system state. See the [CRUDE Pattern](../crude-pattern.md) for full
classification rules.

Map each real action to the endpoint that best reflects its effect:

| Endpoint | Use for | Example |
|----------|---------|---------|
| `CREATE` | Additive changes | `create_route`, `create_table_snapshot` |
| `READ` | Safe lookups and queries | `list_tables`, `search_files`, `query_relationships` |
| `UPDATE` | Mutations to existing state | `update_device_config`, `update_route` |
| `DELETE` | Removals | `delete_route`, `delete_file_alias` |
| `EXECUTE` | Runtime or non-idempotent actions | `execute_backup`, `execute_firmware_upgrade` |

If an action starts a process or can be retried/cancelled later, it usually
belongs in `EXECUTE`, not `UPDATE`.

## 4. Build Introspection First

> **Note:** The `introspect` operation (READ endpoint) is the only operation
> MCP-AQL requires all adapters to implement. Everything else is
> adapter-defined.

An adapter is much easier for AI clients to use when the `introspect`
experience is accurate before the business logic is complete.

For each operation, make sure introspection can answer:

- what the operation is called
- which endpoint it belongs to
- which parameters are accepted
- which parameters are required
- what type comes back
- which optional query features it supports

For collection-oriented READ operations, document query-language controls such
as:

- `query`
- `filter`
- `sort`
- `fields`
- `aggregate`
- pagination parameters

## 5. Use Predictable Response Shapes

Every operation should still return MCP-AQL’s discriminated response pattern:

```json
{
  "success": true,
  "data": {
    "items": []
  }
}
```

Single-resource lookups keep the same envelope but return one object:

```json
{
  "success": true,
  "data": {
    "device": {
      "device_id": "dev_001",
      "status": "online"
    }
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_MISSING_PARAM",
    "message": "Missing required parameter 'table_name'."
  }
}
```

That consistency matters more than the domain itself. It lets a client move
from one adapter to another without re-learning the envelope. See
[Error Codes](../error-codes.md) for the standard validation and execution
error catalog.

## 6. Domain Examples

### 6.1 Database Management

**Resources**
- `database`
- `table`
- `query_job`

**Representative operations**
- `list_databases`
- `list_tables`
- `get_table_schema`
- `query_rows`
- `execute_query_job`

**Identifier pattern**
- `database_name`
- `table_name`
- `query_job_id`

**Useful query controls**
- `fields` for projections
- `filter` for row predicates
- `aggregate` for counts and grouped summaries

### 6.2 File System Management

**Resources**
- `file`
- `directory`
- `permission_entry`

**Representative operations**
- `list_directory`
- `get_file`
- `search_files`
- `update_file_metadata`
- `delete_file`

**Identifier pattern**
- `file_path`
- `directory_path`

**Useful query controls**
- `query` for name/content search
- `fields` for light listings
- computed fields such as `_computed.size_human` (see
  [Field Selection](../features/field-selection.md) for computed field
  semantics)

### 6.3 API Gateway Administration

**Resources**
- `route`
- `service`
- `consumer`
- `plugin`

**Representative operations**
- `list_routes`
- `get_route`
- `create_route`
- `update_route`
- `delete_route`
- `query_relationships`

**Identifier pattern**
- `route_id`
- `service_id`
- `consumer_id`

**Useful query controls**
- relationship queries for route-to-service and plugin-to-route traversal
- `aggregate` for route counts by status or environment

### 6.4 IoT Device Control

**Resources**
- `device`
- `group`
- `firmware_job`
- `telemetry_event`

**Representative operations**
- `list_devices`
- `get_device`
- `update_device_config`
- `execute_firmware_upgrade`
- `list_telemetry_events`

**Identifier pattern**
- `device_id`
- `group_id`
- `firmware_job_id`

**Useful query controls**
- `filter` on status, site, or firmware version
- computed fields like `_computed.is_stale`

Long-running jobs such as `execute_firmware_upgrade` SHOULD expose lifecycle
state through introspection so clients can discover supported statuses and
follow-up actions.

## 7. Conformance Checklist

Use this as a pre-release checklist for a new domain adapter:

- Every operation has a stable snake_case name.
- Every operation is placed on the correct CRUDE endpoint.
- `introspect` documents every accepted parameter.
- Required parameters fail with structured validation errors.
- Collection READ operations document their supported query controls.
- READ responses use `fields` and pagination consistently where supported. See
  [Collection Querying](../features/collection-querying.md) and
  [Pagination](../features/pagination.md).
- Errors avoid leaking implementation details.
- At least one round-trip create/read or update/read example is tested.
- Any domain-specific constraints are documented in introspection.

## 8. Implementation Templates

### 8.1 Operation Template

```json
{
  "name": "list_tables",
  "description": "List tables within a database",
  "endpoint": "READ",
  "params": {
    "database_name": {
      "type": "string",
      "required": true,
      "description": "Database to inspect"
    },
    "query": {
      "type": "string",
      "required": false,
      "description": "Optional free-text table search"
    },
    "fields": {
      "type": "array",
      "required": false,
      "description": "Optional field projection"
    }
  },
  "returns": {
    "name": "TableList",
    "kind": "object"
  }
}
```

### 8.2 Introspection Detail Template

```json
{
  "name": "list_tables",
  "semantic_category": "READ",
  "endpoint": "read",
  "mcpTool": "mcp_aql_read",
  "description": "List tables within a database.",
  "permissions": {
    "readOnly": true,
    "destructive": false
  },
  "parameters": [
    {
      "name": "database_name",
      "type": "string",
      "required": true,
      "description": "Database to inspect."
    },
    {
      "name": "fields",
      "type": "array",
      "required": false,
      "description": "Optional field projection."
    }
  ],
  "returns": {
    "name": "TableList",
    "kind": "object"
  }
}
```

### 8.3 Collection Query Template

```json
{
  "operation": "search_routes",
  "params": {
    "query": "payments",
    "filter": {
      "status": "active"
    },
    "sort": {
      "field": "updated_at",
      "order": "desc"
    },
    "fields": ["route_id", "path", "_computed.health_score"],
    "first": 25
  }
}
```

## 9. Common Pitfalls

- Mirroring backend naming exactly instead of exposing a stable MCP-AQL surface.
- Using overly generic identifiers like `id` when `route_id` or `device_id` is
  clearer.
- Treating long-running actions as `UPDATE` when they should be `EXECUTE`.
- Forgetting to document compatibility pagination shapes (such as `limit` /
  `offset`) or alias parameters that an adapter accepts alongside the preferred
  MCP-AQL names.
- Adding query features in implementation without exposing them in introspection.

## References

- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- [Operations Guide](../operations.md)
- [Introspection Specification](../introspection.md)
- [Collection Querying](../features/collection-querying.md)
- [Conformance Testing](../conformance-testing.md)
