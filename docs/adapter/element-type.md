# Adapter Element Type Specification

**Version:** 1.0.0-draft
**Status:** Draft (MVP)
**Last Updated:** 2026-01-26

## Abstract

This document defines the Adapter Element Type, a declarative schema format for describing how MCP-AQL CRUDE operations map to target API calls. Adapters are Markdown files with YAML front matter that a universal runtime interprets at call time.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Schema Structure](#2-schema-structure)
3. [Canonical Format Rationale](#3-canonical-format-rationale)
4. [Required Fields](#4-required-fields)
5. [Target Configuration](#5-target-configuration)
6. [Authentication](#6-authentication)
7. [Operations](#7-operations)
8. [Parameter Types](#8-parameter-types)
9. [Example Adapter](#9-example-adapter)
10. [Future Extensions](#10-future-extensions)

---

## 1. Overview

### 1.1 Purpose

Adapters enable LLMs to interact with any HTTP API using the MCP-AQL CRUDE interface. Rather than generating code for each API, adapters use a declarative schema that the runtime interprets dynamically.

### 1.2 Design Principles

1. **Schema IS the adapter** - No separate code, no compilation
2. **Declarative over imperative** - Runtime interprets, does not execute custom code
3. **Introspection for free** - Generated directly from schema
4. **Hot reloadable** - Change schema, behavior changes immediately
5. **Human-readable** - Markdown body provides documentation

### 1.3 File Format

Adapters follow the established element pattern:
- **Filename:** `{name}-adapter.md` (e.g., `github-api-adapter.md`)
- **YAML front matter** containing all configuration and operation mappings
- **Markdown body** for human-readable documentation

### 1.4 MVP Scope

This specification covers the Minimum Viable Product (MVP) for adapters:

**Included:**
- HTTP transport only
- REST protocol only
- JSON serialization only
- Bearer token, API key, and no-auth authentication
- Basic operation definitions with parameters

**Deferred to future specifications:**
- Trust levels (see #59)
- Rate limiting (see #60)
- Danger level classification (see #49)
- Pagination plugins (see #37)
- Field selection support
- Response transformation
- Alternative transports (WebSocket, serial, native)
- Alternative protocols (GraphQL, gRPC)
- Alternative serialization (XML, Protobuf)
- Advanced authentication (OAuth, mTLS)

---

## 2. Schema Structure

### 2.1 Complete Structure

```yaml
---
# Required fields
name: string                    # Unique identifier
type: "adapter"                 # MUST be "adapter"
version: string                 # Semver version
description: string             # Human-readable description

# Target configuration
target:
  base_url: string              # API base URL
  transport: "http"             # MVP: only "http"
  protocol: "rest"              # MVP: only "rest"
  serialization: "json"         # MVP: only "json"

# Authentication (optional)
auth:
  type: "bearer" | "api_key" | "none"
  token_env: string             # For bearer: env var containing token
  header_name: string           # For api_key: header name
  key_env: string               # For api_key: env var containing key

# Operation mappings
operations:
  create: OperationDefinition[]
  read: OperationDefinition[]
  update: OperationDefinition[]
  delete: OperationDefinition[]
  execute: OperationDefinition[]

# Optional metadata
author: string
tags: string[]
triggers: string[]
created: string                 # ISO 8601 timestamp
modified: string                # ISO 8601 timestamp
---

# Markdown documentation body
```

---

## 3. Canonical Format Rationale

### 3.1 Why Markdown + YAML Front Matter

The Markdown + YAML front matter format is the SHOULD (recommended) interchange format for adapter schemas. This choice is deliberate:

1. **Human-readable for security auditing** - Adapter schemas define what API calls an LLM can make. Plain text makes it straightforward for security reviewers to inspect exactly which endpoints are exposed, what parameters are accepted, and what authentication is used.

2. **LLM-readable for automated review** - Language models can directly read and reason about adapter schemas without specialized parsers, enabling automated security review and schema validation workflows.

3. **Grep-friendly for searching operations** - Teams can use standard text search tools to find operations across adapter collections (e.g., `grep -r "maps_to.*DELETE" adapters/`).

4. **Discourages obfuscation** - A text-based format makes it difficult to hide malicious configurations. Binary or compiled adapter formats would make security review harder.

5. **Version control friendly** - Diffs are meaningful, merge conflicts are resolvable, and change history is transparent.

### 3.2 Alternative Representations

Adapter schemas MAY be stored in alternative representations (JSON, database records, programmatic builders) for implementation convenience. However:

- Alternative representations SHOULD be translatable to the canonical Markdown + YAML format for review purposes
- Tooling SHOULD support exporting to canonical format
- The canonical format is the normative reference when discrepancies exist between representations

---

## 4. Required Fields

### 4.1 name

**Type:** string
**Required:** Yes

A unique identifier for the adapter. MUST be lowercase with hyphens for word separation.

```yaml
name: github-api
```

**Constraints:**
- MUST match pattern `^[a-z][a-z0-9-]*[a-z0-9]$`
- MUST be 2-64 characters
- SHOULD be descriptive of the target API

### 4.2 type

**Type:** string (literal)
**Required:** Yes

MUST be the literal string `"adapter"`. This enables tooling to identify element types without path inspection.

```yaml
type: adapter
```

### 4.3 version

**Type:** string (semver)
**Required:** Yes

Semantic version of the adapter schema.

```yaml
version: "1.0.0"
```

**Constraints:**
- MUST follow [Semantic Versioning 2.0.0](https://semver.org/)
- SHOULD be quoted to prevent YAML number parsing issues

### 4.4 description

**Type:** string
**Required:** Yes

Human-readable description of the adapter's purpose.

```yaml
description: "Adapter for GitHub REST API v3, enabling repository and issue management"
```

**Constraints:**
- SHOULD be 10-200 characters
- SHOULD describe the target API and main capabilities

---

## 5. Target Configuration

### 5.1 target Block

The `target` block defines how to connect to the API.

```yaml
target:
  base_url: "https://api.github.com"
  transport: http
  protocol: rest
  serialization: json
```

### 5.2 base_url

**Type:** string (URL)
**Required:** Yes

The base URL for all API requests. Operation `maps_to` paths are appended to this URL.

```yaml
base_url: "https://api.github.com"
```

**Constraints:**
- MUST be a valid HTTPS URL (HTTP allowed only for localhost/development)
- MUST NOT include trailing slash
- MAY include path prefix (e.g., `https://api.example.com/v1`)

### 5.3 transport

**Type:** string (enum)
**Required:** Yes

The transport layer for API communication.

**MVP Values:**
- `http` - HTTP/HTTPS transport

**Future Values (deferred):**
- `websocket` - WebSocket transport
- `serial` - Serial port transport
- `native` - Native library bindings

```yaml
transport: http
```

### 5.4 protocol

**Type:** string (enum)
**Required:** Yes

The API protocol used by the target.

**MVP Values:**
- `rest` - RESTful API

**Future Values (deferred):**
- `graphql` - GraphQL API
- `grpc` - gRPC API
- `custom` - Custom protocol with plugin

```yaml
protocol: rest
```

### 5.5 serialization

**Type:** string (enum)
**Required:** Yes

The serialization format for request/response bodies.

**MVP Values:**
- `json` - JSON serialization

**Future Values (deferred):**
- `xml` - XML serialization
- `protobuf` - Protocol Buffers
- `msgpack` - MessagePack

```yaml
serialization: json
```

---

## 6. Authentication

### 6.1 auth Block

The `auth` block configures API authentication. If omitted, the adapter uses no authentication.

### 6.2 type: none

No authentication required.

```yaml
auth:
  type: none
```

### 6.3 type: bearer

Bearer token authentication sent in the `Authorization` header.

```yaml
auth:
  type: bearer
  token_env: GITHUB_TOKEN
```

**Fields:**
- `token_env` (required): Environment variable name containing the bearer token

**Runtime behavior:**
```
Authorization: Bearer ${GITHUB_TOKEN}
```

### 6.4 type: api_key

API key authentication sent in a custom header.

```yaml
auth:
  type: api_key
  header_name: X-API-Key
  key_env: OPENAI_API_KEY
```

**Fields:**
- `header_name` (required): HTTP header name for the API key
- `key_env` (required): Environment variable name containing the key

**Runtime behavior:**
```
X-API-Key: ${OPENAI_API_KEY}
```

### 6.5 Security Considerations

- Adapter schemas MUST NOT contain actual credentials
- Credentials MUST be loaded from environment variables at runtime
- Runtime implementations SHOULD warn if credentials are embedded in schemas

---

## 7. Operations

### 7.1 operations Block

The `operations` block maps MCP-AQL CRUDE operations to target API calls.

```yaml
operations:
  create:
    - name: create_repo
      maps_to: "POST /user/repos"
      description: "Create a new repository"
      params:
        name: { type: string, required: true }
        private: { type: boolean, default: false }

  read:
    - name: list_repos
      maps_to: "GET /users/{username}/repos"
      description: "List repositories for a user"
      params:
        username: { type: string, required: true }
```

### 7.2 OperationDefinition

Each operation in a CRUDE category is an OperationDefinition object:

```yaml
name: string                    # Operation name (required)
maps_to: string                 # HTTP method and path (required)
description: string             # Human-readable description
params: ParamDefinition{}       # Parameter definitions
```

### 7.3 name

**Type:** string
**Required:** Yes

The operation identifier used in MCP-AQL requests.

```yaml
name: get_repo
```

**Constraints:**
- MUST be unique across all CRUDE categories
- MUST match pattern `^[a-z][a-z0-9_]*$`
- SHOULD use snake_case

### 7.4 maps_to

**Type:** string
**Required:** Yes

The HTTP method and path template for the target API.

```yaml
maps_to: "GET /repos/{owner}/{repo}"
```

**Format:** `METHOD /path/with/{placeholders}`

**Supported methods:** GET, POST, PUT, PATCH, DELETE

**Path placeholders:**
- Wrapped in curly braces: `{param_name}`
- MUST correspond to a parameter definition
- Replaced at runtime with parameter values

### 7.5 description

**Type:** string
**Required:** No (recommended)

Human-readable description of what the operation does.

```yaml
description: "Get detailed information about a specific repository"
```

### 7.6 params

**Type:** object mapping param names to ParamDefinition
**Required:** No

Parameter definitions for the operation.

```yaml
params:
  owner:
    type: string
    required: true
    description: "Repository owner username"
  repo:
    type: string
    required: true
    description: "Repository name"
  include_stats:
    type: boolean
    default: false
    description: "Include repository statistics"
```

---

## 8. Parameter Types

### 8.1 ParamDefinition

```yaml
type: string                    # Data type (required)
required: boolean               # Is parameter required (default: false)
description: string             # Human-readable description
default: any                    # Default value if not provided
enum: any[]                     # Allowed values
```

### 8.2 type Field

**Supported types:**

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text value | `"hello"` |
| `integer` | Whole number | `42` |
| `number` | Decimal number | `3.14` |
| `boolean` | True/false | `true` |
| `array` | List of values | `[1, 2, 3]` |
| `object` | Key-value map | `{"key": "value"}` |

### 8.3 required Field

**Type:** boolean
**Default:** false

When true, the runtime MUST reject requests missing this parameter.

```yaml
name: { type: string, required: true }
```

### 8.4 description Field

**Type:** string

Human-readable description shown in introspection.

```yaml
owner:
  type: string
  required: true
  description: "The account owner of the repository"
```

### 8.5 default Field

**Type:** any (matching the param type)

Default value used when parameter is not provided.

```yaml
per_page:
  type: integer
  default: 30
  description: "Results per page (max 100)"
```

### 8.6 enum Field

**Type:** array

Restricts parameter to specific values.

```yaml
state:
  type: string
  enum: [open, closed, all]
  default: open
  description: "Filter by issue state"
```

---

## 9. Example Adapter

See the [GitHub API Adapter](https://github.com/MCPAQL/examples/blob/develop/adapters/github-api-adapter.md) in the examples repository for a complete example.

### 9.1 Minimal Example

```yaml
---
name: minimal-api
type: adapter
version: "1.0.0"
description: "Minimal example adapter"

target:
  base_url: "https://api.example.com"
  transport: http
  protocol: rest
  serialization: json

operations:
  read:
    - name: get_status
      maps_to: "GET /status"
      description: "Get API status"
---

# Minimal API Adapter

This adapter demonstrates the minimum required fields.
```

---

## 10. Future Extensions

The following features are deferred from the MVP and will be specified in future issues:

### 10.1 Trust Levels (#59)

```yaml
trust:
  level: generated | community | verified | official
  verified_by: string
  verified_at: string
```

### 10.2 Rate Limiting (#60)

```yaml
rate_limits:
  requests_per_minute: 60
  requests_per_hour: 1000
  concurrent_requests: 5
```

### 10.3 Danger Levels (#49)

```yaml
operations:
  delete:
    - name: delete_repo
      maps_to: "DELETE /repos/{owner}/{repo}"
      danger_level: high
      requires_confirmation: true
```

### 10.4 Pagination (#37)

```yaml
operations:
  read:
    - name: list_repos
      maps_to: "GET /users/{username}/repos"
      pagination:
        style: cursor | offset | page | link_header
        param_name: page
        per_page_param: per_page
```

### 10.5 Field Selection

```yaml
operations:
  read:
    - name: get_repo
      maps_to: "GET /repos/{owner}/{repo}"
      supports_fields: true
      default_fields: [id, name, full_name, description]
```

---

## References

- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- [Plugin Interface Contracts](../plugin-contracts.md)
- [Trust Levels Specification](./trust-levels.md)
- [Dangerous Operation Classification](./danger-levels.md)
- [Rate Limiting Specification](./rate-limiting.md)
- [Adapter Development Guide](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/guides/development.md) (in mcpaql-adapter repo)
- [Universal Adapter Runtime](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/architecture/runtime.md) (in mcpaql-adapter repo)
- GitHub Issue: [#61](https://github.com/MCPAQL/spec/issues/61)
