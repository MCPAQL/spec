# Architecture Documentation

Implementation architecture documentation has moved to the [mcpaql-adapter](https://github.com/MCPAQL/mcpaql-adapter) repository.

## Moved Documents

| Former Location | New Location |
|-----------------|-------------|
| `overview.md` | [mcpaql-adapter/docs/architecture/overview.md](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/architecture/overview.md) |
| `adapter-runtime.md` | [mcpaql-adapter/docs/architecture/runtime.md](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/architecture/runtime.md) |
| `plugin-interface.md` | Split: normative contracts in [plugin-contracts.md](../plugin-contracts.md), implementation in [mcpaql-adapter/docs/architecture/plugin-system.md](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/architecture/plugin-system.md) |
| `schema-driven-dispatch.md` | [mcpaql-adapter/docs/architecture/dispatch.md](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/architecture/dispatch.md) |

## Normative Protocol Documents

For normative protocol specifications that remain in this repository, see:

- [Plugin Interface Contracts](../plugin-contracts.md) - What each plugin type MUST provide
- [Core Specification](../versions/v1.0.0-draft.md) - Protocol wire format and semantics
- [Adapter Element Type](../adapter/element-type.md) - Declarative adapter schema format
- [Error Codes](../error-codes.md) - Structured error code system
