# ADR-001: CRUDE Pattern (Extending CRUD with Execute)

**Status:** Accepted
**Date:** 2026-01-16

## Context

Traditional CRUD (Create, Read, Update, Delete) operations are well-suited for managing resource definitions and state. However, MCP-AQL needs to support runtime execution operations that have fundamentally different characteristics:

| Characteristic | CRUD Operations | Execution Operations |
|----------------|-----------------|----------------------|
| Idempotency | Generally idempotent | Non-idempotent |
| Target | Element definitions | Runtime state |
| Lifecycle | Discrete operations | Stateful lifecycle |
| Side effects | Predictable | Unbounded |

Placing execution operations within existing CRUD endpoints creates semantic confusion. For example, placing `execute_agent` in the DELETE endpoint because it is "potentially destructive" obscures the operation's true intent.

## Decision

MCP-AQL extends traditional CRUD with an EXECUTE endpoint, creating the CRUDE pattern:

- **Create** - Non-destructive, additive operations
- **Read** - Safe, read-only operations
- **Update** - Modifying operations that change existing state
- **Delete** - Destructive operations that remove state
- **Execute** - Runtime lifecycle operations (non-idempotent)

Implementations MUST expose five distinct endpoints corresponding to these categories. Operations MUST be routed to the endpoint matching their semantic intent.

The EXECUTE endpoint is designated for operations that:
1. Manage runtime execution state rather than definitions
2. Are inherently non-idempotent
3. May have unbounded side effects
4. Follow a stateful lifecycle pattern

## Consequences

### Positive

- **Semantic clarity**: Operations are grouped by their actual behavior and intent
- **Clear execution boundary**: Runtime operations are explicitly separated from definition management
- **Permission modeling**: Security policies can treat execution operations distinctly
- **Future extensibility**: The pattern accommodates workflow, pipeline, and agent execution patterns

### Negative

- **Unfamiliar pattern**: CRUDE is not a widely-known acronym like CRUD
- **Additional endpoint**: Implementations must support five endpoints instead of four
- **Learning curve**: Developers must understand when to use Execute vs other endpoints

## References

- [Protocol Specification: Endpoints](../protocol/endpoints.md)
- ADR-004: Schema-Driven Operations
