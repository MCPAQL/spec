# MCP-AQL JSON Schemas

This directory contains the formal JSON Schema definitions for the MCP-AQL protocol.

## Schemas

| Schema | Description |
|--------|-------------|
| [operation-input.schema.json](./operation-input.schema.json) | Standard operation request format |
| [operation-result.schema.json](./operation-result.schema.json) | Discriminated union response format |
| [introspection-response.schema.json](./introspection-response.schema.json) | Introspection query response format |
| [danger-level.schema.json](./danger-level.schema.json) | Operation danger classification |
| [batch-operation.schema.json](./batch-operation.schema.json) | Batch operation request/response format |
| [field-selection.schema.json](./field-selection.schema.json) | Field selection parameters and metadata |
| [adapter-schema.schema.json](./adapter-schema.schema.json) | Adapter definition file validation |

## Usage

All schemas use JSON Schema 2020-12 draft. When the MCPAQL website is deployed, they will be published at `https://mcpaql.org/schemas/`.

### Validating Requests

```javascript
import Ajv from "ajv/dist/2020";
import operationInput from "./operation-input.schema.json";

const ajv = new Ajv();
const validate = ajv.compile(operationInput);

const request = {
  operation: "list_items",
  params: { limit: 10 }
};

if (!validate(request)) {
  console.error(validate.errors);
}
```

### Validating Responses

```javascript
import operationResult from "./operation-result.schema.json";

const validate = ajv.compile(operationResult);

const response = {
  success: true,
  data: { items: [...] }
};

if (!validate(response)) {
  console.error(validate.errors);
}
```

## Schema Overview

### Operation Input

```
{
  operation: string,  // Required: snake_case operation name
  params?: object     // Optional: operation-specific parameters
}
```

### Operation Result (Discriminated Union)

```
// Success
{ success: true, data: any }

// Failure
{ success: false, error: { code: string, message: string, details?: object } }
```

#### Extension Fields

The operation result schema defines explicit extension fields for documented protocol features. These fields are optional and only included when their associated features are used.

**Success Response Extensions:**

| Field | Type | Purpose | Reference |
|-------|------|---------|-----------|
| `warnings` | array | Non-fatal warning conditions | [Warnings Specification](../docs/features/warnings.md) |
| `_meta` | object | Response metadata (request_id, duration_ms) | [Operations Specification](../docs/operations.md) Section 3.4 |
| `results` | array | Individual results for batch operations | [Operations Specification](../docs/operations.md) Section 7.2 |
| `summary` | object | Aggregate counts for batch operations | [Operations Specification](../docs/operations.md) Section 7.2 |

**Failure Response Extensions:**

| Field | Type | Purpose | Reference |
|-------|------|---------|-----------|
| `confirmation` | object | Confirmation token and prompt for gated operations | [Confirmation Tokens](../docs/security/confirmation-tokens.md) |
| `deprecated` | boolean | Indicates deprecated operation/response | [Breaking Changes](../docs/process/breaking-changes.md) |
| `deprecationMessage` | string | Human-readable deprecation notice | [Breaking Changes](../docs/process/breaking-changes.md) |
| `deprecatedSince` | string | Version when deprecated | [Breaking Changes](../docs/process/breaking-changes.md) |
| `removalVersion` | string | Version when removal planned | [Breaking Changes](../docs/process/breaking-changes.md) |

#### Metadata Field Convention

Fields prefixed with underscore (`_meta`, `_debug`) are reserved for protocol-level metadata that is not part of the operation's domain response. Implementations SHOULD use this convention for any additional metadata fields.

### Introspection Response

Responses to `introspect` operation queries:
- `operations` - List available operations
- `operation` - Get details for single operation
- `types` - List adapter-defined types
- `endpoints` - List CRUDE endpoints

### Danger Level

Five-level classification for operation safety:
- `safe` - Read-only, no side effects
- `reversible` - Modifying, can be undone
- `destructive` - Removes data, enhanced confirmation
- `dangerous` - Serious harm possible, explicit unlock
- `forbidden` - Never auto-execute

### Batch Operation

Request and response formats for batch operations:
- `operations` - Array of operation items to execute
- `results` - Individual results for each operation
- `summary` - Aggregate success/failure counts

### Field Selection

Field selection parameters for controlling response payloads:
- `fields` - Array of field paths or preset name
- `preset` - Predefined field sets (minimal, standard, full)
- Metadata for introspection of available fields

### Adapter Schema

Validation schema for adapter definition files:
- `target` - API connection configuration (URL, transport, protocol)
- `operations` - CRUDE operation mappings
- `auth` - Authentication configuration
- `trust` - Trust level metadata
- `rate_limits` - Rate limiting configuration

## Conformance

Implementations MUST:
- Accept operation inputs matching `operation-input.schema.json`
- Return responses matching `operation-result.schema.json`
- Return introspection responses matching `introspection-response.schema.json`

Implementations SHOULD:
- Classify operations using `danger-level.schema.json`
- Support batch operations matching `batch-operation.schema.json`
- Support field selection matching `field-selection.schema.json`

Adapter Definitions MUST:
- Validate against `adapter-schema.schema.json`

## Related Issues

- [#9](https://github.com/MCPAQL/spec/issues/9) - Create JSON Schema definitions
- [#54](https://github.com/MCPAQL/spec/issues/54) - Conformance requirements from DollhouseMCP
- [#57](https://github.com/MCPAQL/spec/issues/57) - Introspection MUST document params
- [#58](https://github.com/MCPAQL/spec/issues/58) - Standardize cross-cutting params
