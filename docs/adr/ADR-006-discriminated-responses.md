# ADR-006: Discriminated Response Format

**Status:** Accepted
**Date:** 2026-01-16

## Context

API responses need to clearly indicate success or failure in a way that is:
1. Unambiguous for programmatic handling
2. Easy for LLMs to parse and understand
3. Consistent across all operations
4. Informative when errors occur

Common approaches include:
- HTTP status codes (not applicable to MCP tool responses)
- Exception throwing (varies by implementation)
- Null/undefined returns (ambiguous)
- Boolean success flags (lacks error details)
- Discriminated unions (explicit success/failure with data)

LLMs particularly benefit from explicit, consistent response structures that do not require inference about success or failure states.

## Decision

MCP-AQL adopts a discriminated response format where all responses include an explicit `success` boolean discriminator.

Successful responses MUST have the following structure:

```javascript
{
  success: true,
  data: { /* operation-specific response data */ }
}
```

Failed responses MUST have the following structure:

```javascript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable error description"
  }
}
```

Additional fields MAY be included in error responses for debugging:

```javascript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Required parameter 'element_name' is missing",
    details: {
      parameter: "element_name",
      operation: "create_element"
    }
  }
}
```

Implementations MUST:
1. Always include the `success` boolean at the top level
2. Include `data` when `success` is true
3. Include `error` with at least `code` and `message` when `success` is false
4. Use consistent error codes across the implementation

## Consequences

### Positive

- **Unambiguous parsing**: The `success` field clearly indicates response state
- **LLM-friendly**: Explicit structure is easy for models to understand
- **Consistent handling**: All operations return the same response shape
- **Rich error information**: Structured errors enable better debugging
- **Type safety**: Discriminated unions enable compile-time type narrowing

### Negative

- **Response overhead**: Every response includes the discriminator
- **Verbosity**: Simple operations have wrapper structure
- **Migration effort**: Existing implementations must adapt response format

## References

- [Protocol Specification: Response Format](../protocol/responses.md)
- ADR-004: Schema-Driven Operation Definitions
