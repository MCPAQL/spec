# MCP-AQL Specification

**Model Context Protocol - Advanced Agent API Adapter Query Language**

> MCP-AQL is both a protocol specification and a concrete implementation toolkit, including an interrogator (introspection), compiler (schema-driven dispatch), and adapter generator.

[![Spec Version](https://img.shields.io/badge/spec-v1.0.0--draft-blue)](docs/versions/v1.0.0-draft.md)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

## Overview

MCP-AQL is a protocol specification that consolidates multiple MCP (Model Context Protocol) tools into semantic endpoints, providing approximately **96% token reduction** while maintaining full functionality. It enables structured communication between AI models and context-providing services through a unified query language.

## Preliminary Draft Positioning

The current publication target is a **preliminary public draft** of MCP-AQL.

This draft is intended to:

- Demonstrate protocol viability and real-world utility
- Show how semantic endpoint consolidation reduces token bloat
- Validate flexibility for modular integrations (security, execution, code/compute workflows)

This draft is not yet a final certification baseline. Some conformance automation and ecosystem hardening work is still in progress.

## The CRUDE Pattern

MCP-AQL extends traditional CRUD with an **Execute** endpoint, creating the CRUDE pattern:

| Endpoint | Safety | Description |
|----------|--------|-------------|
| **Create** | Non-destructive | Additive operations that create new state |
| **Read** | Read-only | Safe operations that query state |
| **Update** | Modifying | Operations that modify existing state |
| **Delete** | Destructive | Operations that remove state |
| **Execute** | Stateful | Runtime lifecycle operations (non-idempotent) |

## Token Efficiency

MCP-AQL dramatically reduces token consumption for LLM interactions.

**Per-tool overhead:** A typical MCP tool definition consumes ~500-700 tokens in context.

| Configuration | Tool Count | Token Cost | Reduction |
|--------------|------------|------------|-----------|
| Discrete Tools | ~30 tools | ~18,000 | Baseline |
| Discrete Tools | ~50 tools | ~30,000 | Baseline |
| **CRUDE Mode** | 5 endpoints | ~4,000 | ~80-85% |
| **Single Mode** | 1 endpoint | ~1,000 | **~95%+** |

The savings scale with adapter complexity - the more operations your adapter supports, the greater the benefit of consolidation.

## Key Features

- **Unified Query Syntax** - Consistent grammar for operations across all endpoints
- **GraphQL-Style Introspection** - On-demand operation discovery at runtime
- **Schema-Driven Dispatch** - Declarative operation definitions with automatic validation
- **Flexible Parameter Resolution** - Multiple sources checked for each parameter
- **Batch Operations** - Execute multiple operations in a single request
- **Field Selection** - Control response payload size for additional token savings

## Quick Start

### Discover Available Operations

```javascript
{
  operation: "introspect",
  params: { query: "operations" }
}
```

### Get Operation Details

```javascript
{
  operation: "introspect",
  params: { query: "operations", name: "create_user" }
}
```

### Execute an Operation

```javascript
// Operations are adapter-specific - this example from a user management adapter
{
  operation: "create_user",
  params: {
    email: "alice@example.com",
    name: "Alice",
    role: "admin"
  }
}
```

## Specification Documents

| Document | Description |
|----------|-------------|
| [Specification v1.0.0-draft](docs/versions/v1.0.0-draft.md) | Current working draft |
| [CRUDE Pattern](docs/crude-pattern.md) | Detailed endpoint semantics |
| [Introspection](docs/introspection.md) | Discovery system specification |
| [Operations Guide](docs/operations.md) | Operation design patterns |
| [MCP Server Discovery Bundle](docs/adapter/discovery-bundle.md) | Interrogation bundle contract for MCP-to-MCP-AQL generation |
| [Documentation Index](docs/README.md) | Full documentation structure |
| [Changelog](CHANGELOG.md) | Version history |

## Reference Profile

[DollhouseMCP](https://github.com/DollhouseMCP/mcp-server) serves as a **practical reference profile** for MCP-AQL.

It demonstrates the protocol in a large, production-oriented server, including security-loop integrations (Gatekeeper and Danger Zone). It is not the canonical definition of the protocol itself; normative behavior is defined by this repository's specification documents.

## Conformance

Implementations claiming MCP-AQL conformance MUST:

1. Implement the `introspect` operation for runtime discovery
2. Use the CRUDE endpoint pattern (or single endpoint mode)
3. Return discriminated union responses (`{ success, data }` or `{ success, error }`)
4. Document supported operations via introspection

Implementations SHOULD also pass the conformance test suite in [tests/](tests/).

> **Status Note:** Schema/example validation is implemented in this repository. The full cross-implementation conformance runner described in `docs/conformance-testing.md` is still being finalized.

## Contributing

We welcome contributions to the specification. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This repository uses split licensing:

- **Specification text (docs)**: Creative Commons Attribution 4.0 International (CC BY 4.0). See `LICENSE-DOCS`.
  - Applies to: `spec/docs/`, `spec/README.md`, and other narrative documentation content.
- **Code and other software artifacts**: GNU Affero General Public License v3.0 (AGPL-3.0). See `LICENSE`.
  - Applies to: `spec/schemas/`, `spec/tests/`, and any code/scripts included in this repository.

For the authoritative path-based scope rules, see `spec/LICENSING.md`.

Commercial licenses are available. See `COMMERCIAL-LICENSE.md` or contact [licensing@mcpaql.org](mailto:licensing@mcpaql.org).

## Acknowledgments

MCP-AQL builds upon the [Model Context Protocol](https://modelcontextprotocol.io) specification by Anthropic.
