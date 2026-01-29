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
{ success: false, error: string, errorCode?: string }
```

### Introspection Response

Responses to `introspect` operation queries:
- `operations` - List available operations
- `operation` - Get details for single operation
- `types` - List adapter-defined types
- `endpoints` - List CRUDE endpoints

### Danger Level

Five-level classification for operation safety:
- `safe` - Read-only, no side effects
- `low` - Additive, easily reversible
- `moderate` - Modifying, potentially reversible
- `high` - Destructive, difficult to reverse
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
