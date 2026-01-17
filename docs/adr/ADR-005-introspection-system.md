# ADR-005: GraphQL-Style Introspection System

**Status:** Accepted
**Date:** 2026-01-16

## Context

MCP-AQL consolidates many operations into a small number of semantic endpoints, achieving significant token reduction (~96%) compared to discrete tool definitions. However, this consolidation means LLMs cannot rely on tool schemas alone to discover available operations.

With traditional MCP approaches using 40+ discrete tools, tool schemas can consume ~30,000 tokens of context. LLMs must parse all schemas upfront, leaving limited context for actual work.

An alternative is needed that allows:
1. On-demand discovery of operations
2. Minimal upfront token consumption
3. Detailed information when needed
4. Self-documenting API behavior

## Decision

MCP-AQL implements GraphQL-style introspection via the `introspect` operation on the READ endpoint.

Implementations MUST support the `introspect` operation with the following query types:

### Operations Query

```javascript
// List all available operations
{ operation: "introspect", params: { query: "operations" } }

// Get details for a specific operation
{ operation: "introspect", params: { query: "operations", name: "create_element" } }
```

### Types Query

```javascript
// List all types
{ operation: "introspect", params: { query: "types" } }

// Get details for a specific type
{ operation: "introspect", params: { query: "types", name: "ElementType" } }
```

Introspection responses MUST include:
- Operation names and descriptions
- Parameter definitions with types and requirements
- Return type information
- Usage examples (when available)

The introspection workflow enables progressive discovery:

```javascript
// Step 1: Quick discovery (~50 tokens)
{ operation: "introspect", params: { query: "operations" } }

// Step 2: Get details for relevant operation (~100 tokens)
{ operation: "introspect", params: { query: "operations", name: "create_element" } }

// Step 3: Use the operation with knowledge of parameters
{ operation: "create_element", element_type: "persona", params: { ... } }
```

## Consequences

### Positive

- **Token efficiency**: LLMs discover operations on-demand rather than parsing all upfront
- **Dynamic discovery**: Available operations can vary by context or permissions
- **Self-documenting**: API describes itself without external documentation
- **Familiar pattern**: GraphQL introspection is a known paradigm
- **Graceful degradation**: LLMs can work with partial knowledge

### Negative

- **Multi-step discovery**: LLMs may need multiple requests to understand the API
- **Runtime dependency**: Discovery requires API availability
- **Caching complexity**: Clients may need to cache introspection results
- **Incomplete discovery**: LLMs might miss operations they do not explicitly query

## References

- [Introspection Specification](../introspection.md)
- ADR-004: Schema-Driven Operation Definitions
- ADR-001: CRUDE Pattern
