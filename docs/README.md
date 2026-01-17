# MCP-AQL Specification Documentation

This directory contains the complete specification and implementation guidance for MCP-AQL (Model Context Protocol - Advanced Agent API Adapter Query Language).

## Document Organization

### Core Specification

| Document | Description | Status |
|----------|-------------|--------|
| [v1.0.0-draft](versions/v1.0.0-draft.md) | Current specification version | Draft |
| [CRUDE Pattern](crude-pattern.md) | Endpoint semantics and routing | Draft |
| [Endpoint Modes](endpoint-modes.md) | CRUDE vs Single mode configuration | Draft |
| [Introspection](introspection.md) | Runtime discovery system | Draft |
| [Operations](operations.md) | Operation design guide | Draft |

### Architecture

| Document | Description | Status |
|----------|-------------|--------|
| [Overview](architecture/overview.md) | How adapters work | Draft |
| [Schema-Driven Dispatch](architecture/schema-driven-dispatch.md) | Declarative operation definitions | Draft |

### Features

| Document | Description | Impl Status |
|----------|-------------|-------------|
| [Field Selection](features/field-selection.md) | GraphQL-style response filtering | Implemented |

### Security

| Document | Description | Impl Status |
|----------|-------------|-------------|
| [Gatekeeper](security/gatekeeper.md) | Multi-layer access control | Implemented |

### Adapter Development

| Document | Description | Status |
|----------|-------------|--------|
| [Development Guide](adapter/development-guide.md) | How to build MCP-AQL adapters | Draft |

### Process

| Document | Description |
|----------|-------------|
| [RFC Process](process/rfc-process.md) | How to propose specification changes |
| [Breaking Changes](process/breaking-changes.md) | Policy for handling breaking changes |
| [Versioning](process/versioning.md) | Version numbering and release process |

### Roadmap

Future features are tracked as GitHub issues with the `planned` label. Key upcoming features:

- Computed fields (#11)
- Streaming responses (#12)
- Relationship queries (#13)
- Structured error codes (#14)
- Cursor pagination (#15)
- Schema versioning (#16)

## Reading Order

For newcomers to MCP-AQL:

1. **[v1.0.0-draft](versions/v1.0.0-draft.md)** - Start with the main specification
2. **[CRUDE Pattern](crude-pattern.md)** - Understand the endpoint semantics
3. **[Operations](operations.md)** - Learn operation design patterns
4. **[Introspection](introspection.md)** - Learn the discovery system

For adapter developers:

1. **[Architecture Overview](architecture/overview.md)** - Understand adapter structure
2. **[Development Guide](adapter/development-guide.md)** - Implementation walkthrough
3. **[Schema-Driven Dispatch](architecture/schema-driven-dispatch.md)** - Declarative patterns
4. **[Gatekeeper](security/gatekeeper.md)** - Security implementation

## Reference Implementation

[DollhouseMCP](https://github.com/DollhouseMCP/mcp-server) serves as the reference implementation for MCP-AQL, demonstrating all implemented features in a production environment.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to the specification.

## License

- **Specification text**: CC BY 4.0
- **Code/schemas/tests**: AGPL-3.0

See [LICENSING.md](../LICENSING.md) for details.
