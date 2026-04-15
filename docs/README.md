# MCP-AQL Specification Documentation

This directory contains the MCP-AQL specification set:

- **Normative source:** [versions/v1.0.0-draft.md](versions/v1.0.0-draft.md)
- **Informative support documents:** all other files under `docs/`

In case of conflict, the versioned normative document takes precedence.

Implementation architecture documentation is maintained in the [mcpaql-adapter](https://github.com/MCPAQL/mcpaql-adapter) repository. Example adapters are in the [examples](https://github.com/MCPAQL/examples) repository.

## Document Organization

### Core Specification

| Document | Description | Status |
|----------|-------------|--------|
| [v1.0.0-draft](versions/v1.0.0-draft.md) | Current specification version | Draft |
| [CRUDE Pattern](crude-pattern.md) | Standard semantic-endpoint profile and routing | Draft |
| [Endpoint Modes](endpoint-modes.md) | Semantic endpoints and Single mode configuration | Draft |
| [Introspection](introspection.md) | Runtime discovery system | Draft |
| [Operations](operations.md) | Operation design guide | Draft |
| [Error Codes](error-codes.md) | Structured error code system | Draft (MVP) |
| [Conformance Testing](conformance-testing.md) | Test requirements and evaluation methodology | Draft |

### Plugin & Adapter Contracts

| Document | Description | Status |
|----------|-------------|--------|
| [Plugin Interface Contracts](plugin-contracts.md) | What each plugin type MUST provide | Draft (MVP) |
| [Element Type Specification](adapter/element-type.md) | Declarative adapter schema format | Draft (MVP) |
| [MCP Server Discovery Bundle](adapter/discovery-bundle.md) | Raw capture + normalized bundle contract for generator pipelines | Draft |

### Features

| Document | Description | Impl Status |
|----------|-------------|-------------|
| [Field Selection](features/field-selection.md) | GraphQL-style response filtering | Implemented |
| [Collection Querying](features/collection-querying.md) | Preferred query contract for list/search/query operations | Draft |
| [Pagination](features/pagination.md) | Cursor-based pagination semantics and response shape | Draft |

### Security

| Document | Description | Impl Status |
|----------|-------------|-------------|
| [Gatekeeper](security/gatekeeper.md) | Multi-layer access control | Implemented |

### Process

| Document | Description |
|----------|-------------|
| [RFC Process](process/rfc-process.md) | How to propose specification changes |
| [Breaking Changes](process/breaking-changes.md) | Policy for handling breaking changes |
| [Versioning](process/versioning.md) | Version numbering and release process |
| [Preliminary Launch Checklist](process/preliminary-public-launch-checklist.md) | Coordinated draft-launch criteria |

### Guides

| Document | Description |
|----------|-------------|
| [Protocol Comparison](guides/protocol-comparison.md) | MCP-AQL vs other protocols |

### Roadmap

Future features are tracked as GitHub issues. Key upcoming features:

**Phase 0 - MVP Core:**
- Adapter Element Type (#61)
- Plugin Interface (#62)
- Universal Adapter Runtime (#63)
- Structured error codes (#35)

**Phase 1 - Robustness:**
- Trust levels (#59)
- Dangerous operation classification (#49)
- Rate limiting (#60)
- Cursor-based pagination (#37)

**Phase 2+ - Advanced:**
- Computed fields (#42)
- Streaming responses (#43)
- Relationship queries (#44)
- Schema versioning (#48)

## Reading Order

For newcomers to MCP-AQL:

1. **[v1.0.0-draft](versions/v1.0.0-draft.md)** - Start with the main specification
2. **[CRUDE Pattern](crude-pattern.md)** - Understand the standard semantic-endpoint profile
3. **[Operations](operations.md)** - Learn operation design patterns
4. **[Introspection](introspection.md)** - Learn the discovery system
5. **[Conformance Testing](conformance-testing.md)** - Understand conformance requirements

For adapter developers:

1. **[Element Type Specification](adapter/element-type.md)** - Declarative schema format
2. **[Plugin Interface Contracts](plugin-contracts.md)** - Plugin system contracts
3. **[Architecture Overview](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/architecture/overview.md)** - Understand adapter structure (in mcpaql-adapter repo)
4. **[Development Guide](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/guides/development.md)** - Implementation walkthrough (in mcpaql-adapter repo)
5. **[Gatekeeper](security/gatekeeper.md)** - Security implementation

## Cross-Repository Content

MCP-AQL follows a four-level protocol model:

| Level | What | Normative? | Repository |
|-------|------|-----------|------------|
| 1. Wire format | Request/response JSON, error codes, introspection | MUST | **this repo** |
| 2. Schema semantics | Operation declarations, params, auth, target | MUST/SHOULD | **this repo** |
| 3. Canonical format | Markdown + YAML front matter interchange format | SHOULD | **this repo** |
| 4. Implementation guidance | Runtime architecture, plugin pipeline, dispatch | Non-normative | [mcpaql-adapter](https://github.com/MCPAQL/mcpaql-adapter) |

Example adapters: [examples](https://github.com/MCPAQL/examples)

## Reference Profile

[DollhouseMCP](https://github.com/DollhouseMCP/mcp-server) is treated as a practical reference profile for MCP-AQL. It validates feasibility at scale, but protocol authority remains with the normative specification in this repository.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to the specification.

## License

- **Specification text**: CC BY 4.0
- **Code/schemas/tests**: AGPL-3.0

See [LICENSING.md](../LICENSING.md) for details.
