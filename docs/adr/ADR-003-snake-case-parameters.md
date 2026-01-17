# ADR-003: snake_case Parameter Convention

**Status:** Accepted
**Date:** 2026-01-16

## Context

MCP-AQL is designed for consumption by Large Language Models (LLMs) as well as traditional software clients. LLMs exhibit inconsistent behavior when generating identifiers in different naming conventions.

Empirical observation shows LLMs may generate any of the following for the same conceptual parameter:

```javascript
{ elementType: "persona" }      // camelCase
{ element_type: "persona" }     // snake_case
{ ElementType: "persona" }      // PascalCase
{ elementtype: "persona" }      // lowercase
```

This inconsistency leads to parameter resolution failures and degraded LLM performance. Additionally, snake_case aligns with:
- Python naming conventions (dominant in AI/ML ecosystems)
- JSON conventions in many REST APIs
- Clear word boundary visibility without case sensitivity

## Decision

MCP-AQL standardizes on snake_case for all public-facing parameter names.

Parameter names MUST use snake_case format:
- `element_name` instead of `elementName`
- `element_type` instead of `elementType`
- `page_size` instead of `pageSize`

Implementations SHOULD accept both snake_case and camelCase variants for backward compatibility and developer convenience, normalizing internally to snake_case.

Example of both formats being accepted:

```javascript
// Preferred (snake_case)
{ operation: "list_elements", element_type: "persona" }

// Also accepted (camelCase)
{ operation: "list_elements", elementType: "persona" }
```

Internal implementation code MAY use any naming convention appropriate to the implementation language.

## Consequences

### Positive

- **LLM reliability**: snake_case is generated more consistently by LLMs across models
- **Ecosystem alignment**: Matches Python/JSON conventions common in AI APIs
- **Readability**: Clear word boundaries without case sensitivity ambiguity
- **Backward compatibility**: Accepting both formats eases migration

### Negative

- **JavaScript convention mismatch**: JavaScript typically uses camelCase
- **Dual format support**: Implementations must handle both formats
- **Documentation burden**: Examples should show preferred snake_case format

## References

- [Protocol Specification: Request Format](../protocol/requests.md)
- ADR-002: GraphQL-Style Input Objects for Updates
