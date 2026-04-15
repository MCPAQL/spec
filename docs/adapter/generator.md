# Adapter Generator Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

## Abstract

This document specifies the requirements and behavior of MCP-AQL adapter generators. An adapter generator takes a schema definition as input and produces compliant adapter code with required licensing artifacts and provenance information.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Schema Input Format](#2-schema-input-format)
3. [Generated Output Structure](#3-generated-output-structure)
4. [Licensing Artifacts](#4-licensing-artifacts)
5. [Provenance Information](#5-provenance-information)
6. [Language Templates](#6-language-templates)
7. [Command-Line Interface](#7-command-line-interface)
8. [Conformance Requirements](#8-conformance-requirements)

---

## 1. Overview

### 1.1 Purpose

Adapter generators automate the creation of MCP-AQL adapters from schema definitions. This ensures:

- **Consistency** - All generated adapters follow the same patterns
- **Compliance** - Licensing and attribution requirements are met
- **Traceability** - Provenance information enables debugging and auditing
- **Productivity** - Developers focus on business logic, not boilerplate

### 1.2 Generator Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Schema-to-Code** | Generates adapter source code from schema | Development workflow |
| **Schema-to-Runtime** | Generates runtime configuration | Dynamic adapter loading |
| **Code-to-Schema** | Extracts schema from existing adapter | Migration, documentation |

This specification primarily covers Schema-to-Code generators.

### 1.3 Scope

**In scope:**
- Schema input format and validation
- Generated code structure and artifacts
- Licensing and provenance requirements
- Language-specific template guidance

**Out of scope:**
- Runtime behavior (see [MCP-AQL Specification](../versions/v1.0.0-draft.md))
- Adapter testing (see [Conformance Testing](../conformance-testing.md))
- Deployment and distribution

---

## 2. Schema Input Format

### 2.1 Schema Structure

Generators MUST accept schemas in the following format:

```typescript
interface AdapterSchema {
  /**
   * Schema format version
   */
  schema_version: '1.0';

  /**
   * Adapter metadata
   */
  adapter: {
    /** Unique adapter identifier */
    name: string;
    /** Human-readable display name */
    display_name: string;
    /** Adapter version (semver) */
    version: string;
    /** Brief description */
    description: string;
    /** Target API being adapted */
    target_api: {
      name: string;
      base_url: string;
      version?: string;
    };
  };

  /**
   * Authentication configuration
   */
  auth?: {
    type: 'api_key' | 'oauth2' | 'bearer' | 'basic' | 'none';
    config?: Record<string, unknown>;
  };

  /**
   * Operation definitions by endpoint
   */
  endpoints: {
    create?: OperationDefinition[];
    read?: OperationDefinition[];
    update?: OperationDefinition[];
    delete?: OperationDefinition[];
    execute?: OperationDefinition[];
  };

  /**
   * Custom type definitions
   */
  types?: TypeDefinition[];
}

interface OperationDefinition {
  /** Operation name (snake_case) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Input parameters */
  params: ParameterDefinition[];
  /** Output schema */
  returns: TypeReference;
  /** Danger level for security classification */
  danger_level?: 'safe' | 'reversible' | 'destructive' | 'dangerous' | 'forbidden';
  /** HTTP method and path for target API */
  http?: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
  };
}

interface ParameterDefinition {
  name: string;
  type: TypeReference;
  required: boolean;
  description?: string;
  default?: unknown;
}

type TypeReference =
  | 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array'
  | { array: TypeReference }
  | { object: Record<string, TypeReference> }
  | { ref: string };

interface TypeDefinition {
  name: string;
  fields: ParameterDefinition[];
}
```

### 2.2 Schema Validation

Generators MUST validate input schemas:

1. **Required fields** - All required fields MUST be present
2. **Type correctness** - Field values MUST match expected types
3. **Reference resolution** - Type references MUST resolve
4. **Name uniqueness** - Operation and type names MUST be unique
5. **Naming conventions** - Names MUST follow snake_case convention

**Validation error codes:**

| Validation | Error Code | Example Message |
|------------|------------|-----------------|
| Missing required field | `SCHEMA_MISSING_FIELD` | "Required field 'adapter.name' is missing" |
| Type mismatch | `SCHEMA_INVALID_TYPE` | "Field 'params[0].required' expected boolean, got string" |
| Unresolved reference | `SCHEMA_UNRESOLVED_REF` | "Type reference 'Repository' not found in types" |
| Duplicate name | `SCHEMA_DUPLICATE_NAME` | "Operation 'get_user' defined multiple times in read endpoint" |
| Invalid naming | `SCHEMA_INVALID_NAME` | "Parameter name 'userName' must be snake_case (try 'user_name')" |

**Example validation error response:**

```json
{
  "success": false,
  "error": {
    "code": "SCHEMA_INVALID_TYPE",
    "message": "Field 'endpoints.read[0].params[0].required' expected boolean, got string",
    "details": {
      "field_path": "endpoints.read[0].params[0].required",
      "expected_type": "boolean",
      "actual_type": "string",
      "actual_value": "true",
      "suggestion": "Use `required: true` instead of `required: \"true\"`"
    }
  }
}
```

Validation errors MUST include:
- Field path (e.g., `endpoints.read[0].params[2].name`)
- Expected value/type
- Actual value/type
- Suggested fix when possible

### 2.3 Schema Examples

**Minimal schema:**
```yaml
schema_version: '1.0'
adapter:
  name: example_api
  display_name: Example API
  version: 1.0.0
  description: Example adapter for demonstration
  target_api:
    name: Example Service
    base_url: https://api.example.com/v1
endpoints:
  read:
    - name: get_item
      description: Retrieve an item by ID
      params:
        - name: id
          type: string
          required: true
      returns: object
      http:
        method: GET
        path: /items/{id}
```

**Schema with authentication and types:**
```yaml
schema_version: '1.0'
adapter:
  name: github_api
  display_name: GitHub API
  version: 1.0.0
  description: MCP-AQL adapter for GitHub REST API
  target_api:
    name: GitHub REST API
    base_url: https://api.github.com
    version: '2022-11-28'
auth:
  type: bearer
  config:
    header_name: Authorization
    prefix: 'Bearer '
types:
  - name: Repository
    fields:
      - name: id
        type: integer
        required: true
      - name: name
        type: string
        required: true
      - name: full_name
        type: string
        required: true
      - name: private
        type: boolean
        required: true
endpoints:
  read:
    - name: get_repo
      description: Get a repository by owner and name
      params:
        - name: owner
          type: string
          required: true
        - name: repo
          type: string
          required: true
      returns:
        ref: Repository
      http:
        method: GET
        path: /repos/{owner}/{repo}
  delete:
    - name: delete_repo
      description: Delete a repository
      params:
        - name: owner
          type: string
          required: true
        - name: repo
          type: string
          required: true
      returns: object
      danger_level: destructive
      http:
        method: DELETE
        path: /repos/{owner}/{repo}
```

### 2.4 Schema Version Evolution

**Version format rationale:**

The `schema_version` field uses a simplified `major.minor` format (e.g., `'1.0'`) rather than full semver:

- **Schema version** (`schema_version: '1.0'`): Defines the input format the generator expects
- **Adapter version** (`adapter.version: '1.0.0'`): Follows semver for the generated adapter's release lifecycle

This distinction separates concerns: schema format stability vs. adapter functionality evolution.

**Evolution strategy:**

| Change Type | Version Increment | Example |
|-------------|-------------------|---------|
| Breaking schema changes | Major (`1.0` → `2.0`) | Removing required fields, restructuring `endpoints` |
| New optional features | Minor (`1.0` → `1.1`) | Adding `auth.config.scopes` field |
| Clarifications, fixes | No change | Documentation updates, validation improvements |

**Backward compatibility requirements:**

Generators SHOULD support multiple schema versions:

1. **Current version** - Full support (REQUIRED)
2. **Previous major version** - Conversion/migration support (RECOMMENDED)
3. **Older versions** - Reject with clear upgrade guidance (OPTIONAL)

**Version handling in generators:**

```javascript
function validateSchemaVersion(schema) {
  const supportedVersions = ['1.0', '1.1'];
  const deprecatedVersions = ['0.9'];

  if (supportedVersions.includes(schema.schema_version)) {
    return { valid: true };
  }

  if (deprecatedVersions.includes(schema.schema_version)) {
    return {
      valid: false,
      code: 'SCHEMA_VERSION_DEPRECATED',
      message: `Schema version '${schema.schema_version}' is deprecated`,
      migration_guide: 'https://mcpaql.org/docs/schema-migration'
    };
  }

  return {
    valid: false,
    code: 'SCHEMA_VERSION_UNSUPPORTED',
    message: `Unknown schema version '${schema.schema_version}'`,
    supported_versions: supportedVersions
  };
}
```

**Migration guidance:**

When schema versions change, the MCP-AQL project SHOULD provide:

1. **Migration guide** documenting required schema changes
2. **Automated migration tool** (when feasible)
3. **Deprecation period** of at least 6 months for major versions

---

## 3. Generated Output Structure

### 3.1 Directory Layout

Generators MUST produce the following directory structure.

> **Note:** `{ext}` in the structure below represents language-specific file extensions:
> - TypeScript: `.ts`
> - JavaScript: `.js`
> - Python: `.py`
> - Go: `.go`
> - Rust: `.rs`
> - Java: `.java`

```
generated-adapter/
├── LICENSE                    # AGPL-3.0 license text
├── NOTICE.md                  # Attribution notice
├── COMMERCIAL-LICENSE.md      # Commercial licensing info
├── MCPAQL-PROVENANCE.json     # Generation metadata
├── README.md                  # Generated documentation
├── src/                       # Source code (language-specific)
│   ├── index.{ext}            # Main entry point
│   ├── operations/            # Operation implementations
│   │   ├── create.{ext}
│   │   ├── read.{ext}
│   │   ├── update.{ext}
│   │   ├── delete.{ext}
│   │   └── execute.{ext}
│   ├── types/                 # Type definitions
│   └── utils/                 # Helper utilities
├── schema/                    # Source schema (for reference)
│   └── adapter.yaml
└── tests/                     # Generated test stubs
    └── conformance/           # Conformance test cases
```

### 3.2 Generated Code Requirements

Generated code MUST:

1. **Implement CRUDE endpoints** - All five endpoints with operation dispatch
2. **Include introspection** - Support for `introspect` operation
3. **Handle errors correctly** - Use structured error codes
4. **Validate inputs** - Parameter validation before API calls
5. **Transform responses** - Map target API responses to MCP-AQL format

Generated code SHOULD:

1. Include inline documentation/comments
2. Provide type definitions/interfaces
3. Include example usage in README
4. Generate test stubs for each operation

### 3.3 README Generation

Generated README.md MUST include:

```markdown
# {Adapter Display Name}

> Generated by MCP-AQL Adapter Generator v{version}

## Overview

{Description from schema}

## Installation

{Language-specific installation instructions}

## Usage

{Basic usage example}

## Operations

### Create Operations
{List with descriptions}

### Read Operations
{List with descriptions}

### Update Operations
{List with descriptions}

### Delete Operations
{List with descriptions}

### Execute Operations
{List with descriptions}

## Provenance

This adapter was generated from schema `{schema_fingerprint}`.
See MCPAQL-PROVENANCE.json for full generation metadata.

## License

This adapter is dual-licensed:
- AGPL-3.0 for open source use (see LICENSE)
- Commercial license available (see COMMERCIAL-LICENSE.md)
```

---

## 4. Licensing Artifacts

### 4.1 Required Files

Generators MUST include the following licensing files:

| File | Content | Notes |
|------|---------|-------|
| `LICENSE` | AGPL-3.0 full text | Standard AGPL-3.0 license |
| `NOTICE.md` | Attribution notice | Credits MCP-AQL project |
| `COMMERCIAL-LICENSE.md` | Commercial options | Contact information |

### 4.2 LICENSE File

The LICENSE file MUST contain the complete AGPL-3.0 license text, unmodified.

### 4.3 NOTICE.md Template

```markdown
# Attribution Notice

This software was generated using the MCP-AQL Adapter Generator.

## MCP-AQL Project

- Website: https://mcpaql.org
- Specification: https://github.com/MCPAQL/spec
- Generator: https://github.com/MCPAQL/adapter-generator

## License

This adapter is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
A commercial license is available for organizations that cannot comply with AGPL terms.

## Third-Party Components

{List any third-party libraries used in generated code}

## Generation Information

- Generator Version: {generator_version}
- Generated: {timestamp}
- Schema: {schema_fingerprint}
```

### 4.4 COMMERCIAL-LICENSE.md Template

```markdown
# Commercial Licensing

This MCP-AQL adapter is dual-licensed:

## Open Source License (AGPL-3.0)

The default license for this adapter is the GNU Affero General Public License v3.0.
This license requires that:

- Source code modifications are shared under the same license
- Network use (e.g., SaaS) triggers distribution requirements
- Attribution is maintained

See the LICENSE file for full terms.

## Commercial License

Organizations that cannot comply with AGPL-3.0 requirements may obtain a commercial license.

### Commercial License Benefits

- No copyleft obligations
- No source code disclosure requirements
- Priority support available
- Custom terms available

### Contact

For commercial licensing inquiries:

- Email: licensing@mcpaql.org
- Website: https://mcpaql.org/licensing

## Contributor License Agreement

Contributors to this adapter may be asked to sign a CLA to enable dual licensing.
```

---

## 5. Provenance Information

### 5.1 MCPAQL-PROVENANCE.json

Generators MUST create a provenance file with the following structure:

```typescript
interface ProvenanceInfo {
  /**
   * MCP-AQL specification version the generator targets
   */
  mcpaql_spec_version: string;

  /**
   * Generator identification
   */
  generator: {
    /** Generator name (e.g., "mcpaql-adapter-generator") */
    name: string;
    /** Generator version (semver) */
    version: string;
    /** Git commit hash of generator (if available) */
    commit?: string;
    /** Generator repository URL */
    repository?: string;
  };

  /**
   * Source schema information
   */
  schema: {
    /** SHA-256 hash of the input schema */
    fingerprint: string;
    /** Original schema filename */
    filename: string;
    /** Schema version from adapter.version */
    version: string;
  };

  /**
   * Generation metadata
   */
  generation: {
    /** ISO 8601 timestamp of generation */
    timestamp: string;
    /** Target language/platform */
    target: string;
    /** Generator options used */
    options?: Record<string, unknown>;
  };

  /**
   * Verification information
   */
  verification?: {
    /** SHA-256 hash of generated code (excluding provenance file) */
    code_hash: string;
    /** Conformance test results if run during generation */
    conformance_result?: 'passed' | 'failed' | 'skipped';
  };
}
```

### 5.2 Example Provenance File

```json
{
  "mcpaql_spec_version": "1.0.0",
  "generator": {
    "name": "mcpaql-adapter-generator",
    "version": "1.2.3",
    "commit": "abc123def456",
    "repository": "https://github.com/MCPAQL/adapter-generator"
  },
  "schema": {
    "fingerprint": "sha256:a1b2c3d4e5f6...",
    "filename": "github-api.yaml",
    "version": "1.0.0"
  },
  "generation": {
    "timestamp": "2026-01-29T10:30:00Z",
    "target": "typescript",
    "options": {
      "strict_mode": true,
      "include_tests": true
    }
  },
  "verification": {
    "code_hash": "sha256:f6e5d4c3b2a1...",
    "conformance_result": "passed"
  }
}
```

### 5.3 Fingerprint Calculation

Schema fingerprints MUST be calculated as follows:

1. Normalize the schema (remove comments, normalize whitespace)
2. Serialize to canonical JSON (sorted keys, no extra whitespace)
3. Calculate SHA-256 hash
4. Format as `sha256:{hex_digest}`

```typescript
function calculateFingerprint(schema: AdapterSchema): string {
  // Recursively sort object keys for canonical JSON
  function sortKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map(sortKeys);
    }
    if (obj !== null && typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(obj).sort()) {
        sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
      }
      return sorted;
    }
    return obj;
  }

  const normalized = JSON.stringify(sortKeys(schema));
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  return `sha256:${hash}`;
}
```

---

## 6. Language Templates

### 6.1 Supported Languages

Generators SHOULD support multiple target languages:

| Language | Status | Template ID |
|----------|--------|-------------|
| TypeScript | Required | `typescript` |
| JavaScript | Required | `javascript` |
| Python | Recommended | `python` |
| Go | Optional | `go` |
| Rust | Optional | `rust` |
| Java | Optional | `java` |

### 6.2 Template Structure

Each language template MUST provide:

1. **Entry point** - Main adapter class/module
2. **Endpoint handlers** - CRUDE endpoint implementations
3. **Type definitions** - Schema types in target language
4. **Error handling** - Structured error code support
5. **HTTP client** - Target API communication

### 6.3 TypeScript Template Example

**Entry point (index.ts):**
```typescript
import { createEndpoints } from './operations';
import { AdapterConfig } from './types';
import { schema } from '../schema/adapter';

export class Adapter {
  private config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  async handleRequest(endpoint: string, request: unknown) {
    const endpoints = createEndpoints(this.config);
    const handler = endpoints[endpoint];

    if (!handler) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND_OPERATION',
          message: `Unknown endpoint: '${endpoint}'`
        }
      };
    }

    return handler(request);
  }

  getSchema() {
    return schema;
  }
}

export { schema };
```

### 6.4 Template Customization

Generators MAY support template customization:

| Option | Description | Default |
|--------|-------------|---------|
| `strict_mode` | Enable strict type checking | `true` |
| `include_tests` | Generate test stubs | `true` |
| `inline_docs` | Include JSDoc/docstrings | `true` |
| `error_handling` | Error handling style | `structured` |
| `http_client` | HTTP client library | Language default |

---

## 7. Command-Line Interface

### 7.1 CLI Invocation

Generators MUST provide a command-line interface with the following signature:

```bash
mcpaql-generate --schema <path> --target <language> [options]
```

### 7.2 Required Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--schema`, `-s` | Path to the input schema file (YAML or JSON) | `--schema adapter.yaml` |
| `--target`, `-t` | Target language/platform | `--target typescript` |

### 7.3 Optional Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--output`, `-o` | Output directory for generated code | `./generated` |
| `--config`, `-c` | Path to generator configuration file | None |
| `--output-format` | Output format (`human` or `json`) | `human` |
| `--strict` | Enable strict validation mode (fail on warnings, enforce all optional constraints) | `false` |
| `--dry-run` | Validate schema without generating output | `false` |
| `--verbose`, `-v` | Enable verbose output | `false` |
| `--quiet`, `-q` | Suppress non-error output | `false` |
| `--version` | Print generator version and exit | - |
| `--help`, `-h` | Print help message and exit | - |

**Notes:**
- `--verbose` and `--quiet` are mutually exclusive. If both are specified, generators MUST exit with code 3 (Configuration error).
- When both `--config` and individual CLI arguments are provided, CLI arguments MUST take precedence over configuration file settings.

### 7.4 Exit Codes

Generators MUST use consistent exit codes:

| Code | Meaning | Description |
|------|---------|-------------|
| `0` | Success | Generation completed successfully |
| `1` | Internal error | Unexpected error (assertion failures, uncaught exceptions) |
| `2` | Schema validation error | Input schema is invalid |
| `3` | Configuration error | Invalid generator configuration |
| `4` | I/O error | File read/write failure |
| `5` | Template error | Language template processing failed |

### 7.5 Output Format

Generators SHOULD support structured output for integration with other tools:

```bash
# Human-readable output (default)
mcpaql-generate --schema adapter.yaml --target typescript

# JSON output for programmatic consumption
mcpaql-generate --schema adapter.yaml --target typescript --output-format json
```

**JSON success output:**
```json
{
  "success": true,
  "output_directory": "./generated",
  "files_generated": [
    "src/index.ts",
    "src/operations/read.ts",
    "LICENSE",
    "NOTICE.md"
  ],
  "provenance": {
    "schema_fingerprint": "sha256:abc123...",
    "generator_version": "1.2.3"
  },
  "warnings": []
}
```

**JSON error output:**
```json
{
  "success": false,
  "error": {
    "code": 2,
    "type": "SCHEMA_VALIDATION_ERROR",
    "message": "Schema validation failed",
    "details": [
      {
        "path": "endpoints.read[0].params[2].name",
        "code": "SCHEMA_INVALID_NAME",
        "message": "Parameter name 'userName' must be snake_case",
        "suggestion": "Use 'user_name' instead"
      }
    ]
  }
}
```

### 7.6 Example Usage

**Basic generation:**
```bash
mcpaql-generate --schema github-api.yaml --target typescript --output ./adapters/github
```

**With configuration and verbose output:**
```bash
mcpaql-generate \
  --schema adapter.yaml \
  --target typescript \
  --output ./generated \
  --config generator.config.json \
  --verbose
```

**Validation only (dry run):**
```bash
mcpaql-generate --schema adapter.yaml --target typescript --dry-run
```

---

## 8. Conformance Requirements

### 8.1 Generator Conformance

A conformant generator MUST:

1. Accept valid schemas without error
2. Reject invalid schemas with descriptive errors
3. Produce all required output files
4. Include valid licensing artifacts
5. Generate correct provenance information
6. Produce code that passes basic syntax checks

### 8.2 Generated Adapter Conformance

Generated adapters MUST:

1. Implement all five CRUDE endpoints
2. Support the `introspect` operation
3. Return discriminated responses (`success: true/false`)
4. Use structured error codes from the specification
5. Handle missing/invalid parameters correctly

### 8.3 Conformance Testing

Generators SHOULD include conformance test generation:

```bash
# Run conformance tests on generated adapter
mcpaql-conformance test ./generated-adapter
```

See [Conformance Testing Specification](../conformance-testing.md) for test requirements.

---

## References

- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- [CRUDE Pattern](../crude-pattern.md)
- [Error Codes Specification](../error-codes.md)
- [Conformance Testing Specification](../conformance-testing.md)
- [Trust Levels Specification](./trust-levels.md)
- [Dangerous Operation Classification](./danger-levels.md)
- GitHub Issue: [#21](https://github.com/MCPAQL/spec/issues/21)
