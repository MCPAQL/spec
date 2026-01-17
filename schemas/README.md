# MCP-AQL JSON Schemas

This directory contains the formal JSON Schema definitions for the MCP-AQL protocol.

## Schemas

| Schema | Description |
|--------|-------------|
| [operation-input.schema.json](./operation-input.schema.json) | Standard operation request format |
| [operation-result.schema.json](./operation-result.schema.json) | Discriminated union response format |
| [introspection-response.schema.json](./introspection-response.schema.json) | Introspection query response format |
| [danger-level.schema.json](./danger-level.schema.json) | Operation danger classification |

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

## Conformance

Implementations MUST:
- Accept operation inputs matching `operation-input.schema.json`
- Return responses matching `operation-result.schema.json`
- Return introspection responses matching `introspection-response.schema.json`

Implementations SHOULD:
- Classify operations using `danger-level.schema.json`
