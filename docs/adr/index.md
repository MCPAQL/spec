# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting significant design decisions in the MCP-AQL protocol specification.

## ADR Index

| ADR | Title | Status | Summary |
|-----|-------|--------|---------|
| [ADR-001](ADR-001-crude-pattern.md) | CRUDE Pattern | Accepted | Extends CRUD with Execute endpoint for runtime operations |
| [ADR-002](ADR-002-graphql-style-input.md) | GraphQL-Style Input Objects | Accepted | Nested `input` objects for update operations |
| [ADR-003](ADR-003-snake-case-parameters.md) | snake_case Parameters | Accepted | Standardizes on snake_case for LLM compatibility |
| [ADR-004](ADR-004-schema-driven-operations.md) | Schema-Driven Operations | Accepted | Declarative operation definitions as single source of truth |
| [ADR-005](ADR-005-introspection-system.md) | Introspection System | Accepted | GraphQL-style runtime discovery via `introspect` operation |
| [ADR-006](ADR-006-discriminated-responses.md) | Discriminated Responses | Accepted | `{ success, data }` or `{ success, error }` response format |

## ADR Format

Each ADR follows this structure:

```markdown
# ADR-NNN: Title

**Status:** Accepted | Proposed | Deprecated | Superseded
**Date:** YYYY-MM-DD

## Context
[Why this decision was needed]

## Decision
[What was decided, with RFC 2119 language where appropriate]

## Consequences
[Positive and negative outcomes]

## References
[Related ADRs or spec sections]
```

## Status Definitions

- **Proposed**: Under discussion, not yet accepted
- **Accepted**: Approved and in effect
- **Deprecated**: No longer recommended but still supported
- **Superseded**: Replaced by a newer ADR (link to replacement)

## Contributing

When proposing a new ADR:

1. Use the next available number (ADR-007, etc.)
2. Follow the naming convention: `ADR-NNN-short-title.md`
3. Use RFC 2119 keywords (MUST, SHOULD, MAY) for normative statements
4. Focus on protocol-level decisions, not implementation details
5. Update this index when adding new ADRs
