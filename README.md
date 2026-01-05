# MCP-AQL Specification

**Model Context Protocol - Advanced Agent API Adapter Query Language**

> MCP-AQL is both a protocol specification and a concrete implementation toolkit, including an interrogator (introspection), compiler (schema-driven dispatch), and adapter generator.

[![Spec Version](https://img.shields.io/badge/spec-v1.0.0--draft-blue)](docs/versions/v1.0.0-draft.md)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

## Overview

MCP-AQL is a protocol specification that consolidates multiple MCP (Model Context Protocol) tools into semantic endpoints, providing approximately **96% token reduction** while maintaining full functionality. It enables structured communication between AI models and context-providing services through a unified query language.

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

MCP-AQL dramatically reduces token consumption for LLM interactions:

| Configuration | Endpoints | Token Cost | Reduction |
|--------------|-----------|------------|-----------|
| Discrete Tools | 50+ individual tools | ~29,600 | Baseline |
| CRUDE Mode | 5 semantic endpoints | ~4,300 | ~85% |
| Single Mode | 1 unified endpoint | ~1,100 | **~96%** |

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
  params: { query: "operations", name: "create_element" }
}
```

### Execute an Operation

```javascript
{
  operation: "create_element",
  element_type: "persona",
  params: {
    element_name: "MyPersona",
    description: "A helpful assistant",
    instructions: "You are helpful and thorough."
  }
}
```

## Specification Documents

| Document | Description |
|----------|-------------|
| [Specification v1.0.0-draft](docs/versions/v1.0.0-draft.md) | Current working draft |
| [CRUDE Pattern](docs/crude-pattern.md) | Detailed endpoint semantics |
| [Introspection](docs/introspection.md) | Discovery system specification |
| [Operations](docs/operations.md) | Complete operation reference |
| [Schema Definitions](schemas/) | Formal JSON Schema definitions |
| [Changelog](CHANGELOG.md) | Version history |

## Reference Implementation

[DollhouseMCP](https://github.com/DollhouseMCP/mcp-server) serves as the reference implementation of MCP-AQL for AI element management (personas, skills, templates, agents, memories, ensembles).

## Conformance

Implementations claiming MCP-AQL conformance MUST:

1. Support all operations defined in the core specification
2. Implement the CRUDE endpoint pattern with correct operation routing
3. Provide introspection via the `introspect` operation
4. Pass the conformance test suite in [tests/](tests/)
5. Document any extensions or deviations

## Contributing

We welcome contributions to the specification. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This specification is dual-licensed:

- **Open Source**: [GNU Affero General Public License v3.0](LICENSE)
- **Commercial**: Contact [licensing@mcpaql.org](mailto:licensing@mcpaql.org) for commercial licensing without AGPL obligations

## Acknowledgments

MCP-AQL builds upon the [Model Context Protocol](https://modelcontextprotocol.io) specification by Anthropic.
