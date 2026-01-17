# ADR-004: Schema-Driven Operation Definitions

**Status:** Accepted
**Date:** 2026-01-16

## Context

As the number of operations grows, maintaining consistency across routing, validation, introspection, and documentation becomes challenging. Imperative approaches (switch statements, manual dispatch) require updates in multiple locations when adding or modifying operations.

Adding a new operation traditionally required:
1. Adding endpoint routing logic
2. Adding dispatch/handler mapping
3. Adding parameter definitions for validation
4. Adding introspection metadata
5. Adding documentation examples

This distributed approach leads to:
- Inconsistencies between validation and documentation
- Forgotten updates in some locations
- Difficulty maintaining operation metadata
- Duplicated information across files

## Decision

MCP-AQL adopts a schema-driven approach where operations are defined declaratively in a single schema definition.

Each operation definition MUST include:
- **endpoint**: The CRUDE endpoint category (CREATE, READ, UPDATE, DELETE, EXECUTE)
- **description**: Human-readable description of the operation
- **params**: Parameter definitions with types and requirements

Each operation definition SHOULD include:
- **returns**: Return type specification
- **examples**: Usage examples for documentation and introspection

Example schema structure:

```javascript
{
  browse_collection: {
    endpoint: "READ",
    description: "Browse the community collection",
    params: {
      section: {
        type: "string",
        description: "Collection section to browse"
      },
      type: {
        type: "string",
        description: "Element type filter"
      }
    },
    returns: {
      name: "CollectionBrowseResult",
      kind: "object"
    },
    examples: [
      '{ operation: "browse_collection", params: { section: "personas" } }'
    ]
  }
}
```

Implementations MUST derive the following from the operation schema:
1. Endpoint routing decisions
2. Parameter validation rules
3. Introspection responses
4. Type checking

## Consequences

### Positive

- **Single source of truth**: One location defines all operation metadata
- **Auto-generated introspection**: Schema powers runtime discovery
- **Reduced boilerplate**: No manual dispatch code for new operations
- **Consistency**: Validation, routing, and documentation stay synchronized
- **Type safety**: Schema definitions enable compile-time checking

### Negative

- **Schema complexity**: Large schemas can be difficult to navigate
- **Runtime overhead**: Schema lookup adds minor processing cost
- **Learning curve**: Contributors must understand schema format
- **Flexibility limits**: Edge cases may require schema extensions

## References

- [Operations Reference](../operations.md)
- ADR-005: Introspection System
- ADR-001: CRUDE Pattern
