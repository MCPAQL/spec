# Schema Test Fixtures

Test fixtures validate JSON Schema `$defs` sub-schemas that cannot be tested
through inline `examples` alone (e.g., discriminated unions with cross-variant
constraints).

## Fixture Format

Each fixture file is a JSON object with the following structure:

```json
{
  "schema": "../../schemas/foo.schema.json",
  "ref": "#/$defs/TypeDetails",
  "tests": [
    { "description": "valid example", "data": { ... }, "valid": true },
    { "description": "REJECT: invalid case", "data": { ... }, "valid": false }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `schema` | Yes | Relative path from the fixture file to the schema file |
| `ref` | No | JSON Pointer to a `$defs` sub-schema (e.g., `#/$defs/TypeDetails`). If omitted, validates against the root schema |
| `tests` | Yes | Array of test cases |
| `tests[].description` | Yes | Human-readable test description |
| `tests[].data` | Yes | The instance to validate |
| `tests[].valid` | Yes | Whether `data` is expected to pass (`true`) or fail (`false`) validation |

This format mirrors the [JSON Schema Test Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite)
convention, making it familiar to schema authors.

## Running Fixtures

```bash
# Run inline examples + fixtures
npm test

# Fixtures only
npm run validate:fixtures

# Inline examples only
npm run validate:examples
```

## Adding a New Fixture

1. Create a `.json` file in this directory (e.g., `operationdetails-fixtures.json`)
2. Set `schema` to the relative path to the target schema file
3. Set `ref` if validating a `$defs` sub-schema
4. Add test cases with both valid and invalid examples
5. Run `npm test` to verify

The validation script automatically discovers all `.json` files in this
directory when run with `--fixtures`.
