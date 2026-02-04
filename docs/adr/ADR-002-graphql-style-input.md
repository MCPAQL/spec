# ADR-002: GraphQL-Style Input Objects for Updates

**Status:** Accepted
**Date:** 2026-01-16

## Context

Update operations require a mechanism to specify which fields should be modified. Several approaches exist:

1. **Flat parameters**: All updateable fields at the same level as identifiers
2. **Patch operations**: JSON Patch-style `{ op, path, value }` arrays
3. **Field-specific operations**: Separate operations like `set_description`, `set_metadata`
4. **Full replacement**: Send complete resource data, overwriting everything
5. **Nested input objects**: GraphQL-style separation of identifiers from updateable fields

Flat parameters create ambiguity about which fields are identifiers versus updateable values:

```javascript
{
  operation: "edit_element",
  params: {
    element_name: "MyPersona",  // Identifier
    element_type: "persona",     // Identifier
    description: "new desc",     // Updateable?
    triggers: ["new"]            // Updateable?
  }
}
```

## Decision

MCP-AQL adopts GraphQL-aligned nested `input` objects for update operations.

Update operations MUST use a nested `input` object to contain all updateable fields:

```javascript
{
  operation: "edit_element",
  element_type: "persona",
  params: {
    element_name: "MyPersona",
    input: {
      description: "new desc",
      metadata: {
        triggers: ["new", "triggers"]
      }
    }
  }
}
```

Implementations MUST:
1. Clearly separate identifier parameters from updateable fields
2. Deep-merge `input` contents with existing resource state
3. Only modify fields explicitly present in `input`
4. Preserve fields not mentioned in `input`

## Consequences

### Positive

- **Clear separation**: Identifiers and updateable fields are unambiguous
- **Deep merging**: Nested structures merge cleanly without explicit field selection
- **Partial updates**: Only specified fields change; others remain untouched
- **Familiar pattern**: Aligns with GraphQL mutation conventions
- **Extensibility**: New updateable fields can be added without breaking changes

### Negative

- **Increased nesting**: Requests are more deeply nested
- **Learning curve**: Users unfamiliar with GraphQL may find pattern unusual
- **Payload size**: Slight increase in request size due to `input` wrapper

## Specification Impact

This ADR is codified in the normative specification:

- **Section 4.5** of [MCP-AQL Specification v1.0.0-draft](../versions/v1.0.0-draft.md#45-update-input-pattern) defines the `input` object structure, deep-merge semantics, field removal via `null`, and validation rules.
- **Section 4** of [Operations Reference](../operations.md) references the UPDATE input pattern for parameter conventions.

Implementations MUST follow the normative specification. This ADR provides design rationale only.

## References

- [MCP-AQL Specification v1.0.0-draft — Section 4.5](../versions/v1.0.0-draft.md#45-update-input-pattern)
- [Operations Reference](../operations.md)
- ADR-003: snake_case Parameter Convention
