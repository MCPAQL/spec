# Universal Adapter Runtime Specification

**Version:** 1.0.0-draft
**Status:** Draft (MVP)
**Last Updated:** 2026-01-26

## Abstract

This document defines the Universal Adapter Runtime specification - the execution engine that interprets adapter schema files and translates MCP-AQL CRUDE operations to target API calls. The runtime enables schema-driven adapters without per-adapter code generation.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Schema Loading](#3-schema-loading)
4. [Schema Validation](#4-schema-validation)
5. [Operation Dispatch](#5-operation-dispatch)
6. [Request Building](#6-request-building)
7. [Response Handling](#7-response-handling)
8. [Error Mapping](#8-error-mapping)
9. [Introspection](#9-introspection)
10. [Future Extensions](#10-future-extensions)
11. [Security Considerations](#11-security-considerations)

---

## 1. Overview

### 1.1 Purpose

The Universal Adapter Runtime interprets adapter schema files (`.md` files with YAML front matter) and executes MCP-AQL operations against target APIs. This eliminates the need for per-adapter code generation.

### 1.2 Design Principles

1. **Interpreting, not executing** - Schema is data, not executable code
2. **Fail-fast validation** - Invalid schemas fail at load time
3. **Consistent behavior** - Same schema produces same behavior across implementations
4. **Observable** - Support for logging, metrics, and tracing
5. **Secure by default** - Validate inputs, sanitize outputs, never embed credentials

### 1.3 MVP Scope

This specification covers the Minimum Viable Product runtime:

**Included:**
- Load adapter schema from disk
- Parse YAML front matter
- Validate required fields
- Dispatch operations to correct handler
- Build HTTP requests from operation mappings
- Attach authentication headers
- Send requests and parse JSON responses
- Map errors to MCP-AQL format

**Deferred to future specifications:**
- Hot reload on file change
- Trust level enforcement (#59)
- Rate limit tracking (#60)
- Pagination handling (#37)
- Full introspection generation (#57)
- Response caching
- Advanced validation (types, enums, ranges)
- Multi-adapter management

---

## 2. Architecture

### 2.1 Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  Universal Adapter Runtime                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                            │
│  │  Schema Loader  │  Load and parse adapter .md files          │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ Schema Validator│  Validate against adapter schema spec      │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ Operation Index │  Index operations for fast lookup          │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │   Dispatcher    │────▶│ Plugin Pipeline │                    │
│  └─────────────────┘     │ (Protocol/Auth/ │                    │
│                          │  Serial/Trans)  │                    │
│                          └─────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Request Flow

```
MCP-AQL Request
       │
       ▼
┌──────────────────┐
│ 1. Find Operation│  Look up operation by name in index
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. Validate Params│  Check required params, apply defaults
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. Build Request │  Construct HTTP request from mapping
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. Apply Auth    │  Attach authentication headers
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. Send Request  │  Execute HTTP request via transport
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 6. Parse Response│  Deserialize JSON, check status
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 7. Map Result    │  Convert to MCP-AQL response format
└────────┬─────────┘
         │
         ▼
MCP-AQL Response
```

---

## 3. Schema Loading

### 3.1 File Discovery

The runtime loads adapter schemas from the filesystem.

**File Pattern:**
- Adapter files MUST match pattern `*-adapter.md`
- Files MUST contain YAML front matter delimited by `---`

**Loading Behavior:**

```typescript
// Pseudocode
function loadAdapter(filePath: string): AdapterSchema {
  const content = readFile(filePath);
  const { frontMatter, body } = parseFrontMatter(content);
  const schema = parseYaml(frontMatter);
  return { ...schema, documentation: body };
}
```

### 3.2 Front Matter Parsing

The runtime extracts YAML front matter from Markdown files:

```markdown
---
name: github-api
type: adapter
version: "1.0.0"
# ... rest of schema
---

# Documentation body (optional)
```

**Parsing Rules:**

1. Front matter MUST start with `---` on line 1
2. Front matter MUST end with `---` on its own line
3. Content between delimiters is parsed as YAML
4. Content after closing `---` is treated as documentation

### 3.3 Operation Indexing

After loading, the runtime builds an operation index for fast lookup:

```typescript
interface OperationIndex {
  // Maps operation name to definition and CRUDE category
  [operationName: string]: {
    definition: OperationDefinition;
    endpoint: 'create' | 'read' | 'update' | 'delete' | 'execute';
  };
}
```

**Index Construction:**

```typescript
function buildOperationIndex(schema: AdapterSchema): OperationIndex {
  const index: OperationIndex = {};

  for (const endpoint of ['create', 'read', 'update', 'delete', 'execute']) {
    const operations = schema.operations[endpoint] || [];
    for (const op of operations) {
      if (index[op.name]) {
        throw new Error(`Duplicate operation name: ${op.name}`);
      }
      index[op.name] = { definition: op, endpoint };
    }
  }

  return index;
}
```

---

## 4. Schema Validation

### 4.1 Required Field Validation

The runtime MUST validate these required fields at load time:

| Field | Validation |
|-------|------------|
| `name` | MUST be non-empty string and valid identifier |
| `type` | MUST equal `"adapter"` |
| `version` | MUST be valid semver string |
| `description` | MUST be non-empty string |
| `target.base_url` | MUST be valid URL |
| `target.transport` | MUST be known transport plugin name |
| `target.protocol` | MUST be known protocol plugin name |
| `target.serialization` | MUST be known serialization plugin name |

### 4.2 Operation Validation

The runtime MUST validate each operation definition:

| Field | Validation |
|-------|------------|
| `name` | MUST be non-empty string, MUST be unique across all endpoints |
| `maps_to` | MUST be valid `METHOD /path` format |
| `params.*` | MUST be valid parameter definitions |

### 4.3 Parameter Validation

The runtime MUST validate each parameter definition:

| Field | Validation |
|-------|------------|
| `type` | MUST be one of: `string`, `integer`, `number`, `boolean`, `array`, `object` |
| `required` | MUST be boolean (default: false) |
| `default` | MUST match declared type (if present) |
| `enum` | MUST be array of valid values (if present) |

### 4.4 Validation Errors

Validation errors MUST be clear and actionable:

```typescript
interface ValidationError {
  path: string;      // JSON path to invalid field (e.g., "operations.read[0].params.owner")
  message: string;   // Human-readable error description
  expected?: string; // What was expected
  received?: string; // What was received
}
```

**Example error:**

```json
{
  "path": "operations.read[0].name",
  "message": "Operation name is required",
  "expected": "non-empty string",
  "received": "undefined"
}
```

---

## 5. Operation Dispatch

### 5.1 Request Structure

MCP-AQL requests arrive in this format:

```typescript
interface OperationRequest {
  operation: string;
  params?: Record<string, unknown>;
}
```

### 5.2 Dispatch Algorithm

```typescript
async function dispatch(
  request: OperationRequest,
  adapter: LoadedAdapter
): Promise<OperationResult> {
  // 1. Find operation
  const entry = adapter.operationIndex[request.operation];
  if (!entry) {
    return {
      success: false,
      error: `Unknown operation: ${request.operation}`
    };
  }

  // 2. Validate params
  const validationResult = validateParams(request.params || {}, entry.definition);
  if (!validationResult.valid) {
    return {
      success: false,
      error: validationResult.error
    };
  }

  // 3. Apply defaults
  const params = applyDefaults(request.params || {}, entry.definition);

  // 4. Execute via plugin pipeline
  try {
    const response = await executePipeline(entry.definition, params, adapter);
    return response;
  } catch (error) {
    return mapError(error, adapter);
  }
}
```

### 5.3 Endpoint Validation (CRUDE Mode)

When operating in CRUDE mode (separate endpoints), the runtime MUST validate that operations are called via the correct endpoint:

```typescript
function validateEndpoint(operation: string, calledEndpoint: string, index: OperationIndex): void {
  const entry = index[operation];
  if (!entry) return; // Will fail at dispatch

  if (entry.endpoint.toLowerCase() !== calledEndpoint.toLowerCase()) {
    throw new Error(
      `Operation '${operation}' must be called via mcp_aql_${entry.endpoint}, not mcp_aql_${calledEndpoint}`
    );
  }
}
```

---

## 6. Request Building

### 6.1 Parameter Resolution

Parameters are resolved from the request in this order:

1. `params.<name>` (explicit params object)
2. Top-level `<name>` (for convenience)

### 6.2 Path Parameter Substitution

Path parameters (in curly braces) are substituted from resolved params:

```
maps_to: "GET /repos/{owner}/{repo}"
params: { owner: "octocat", repo: "Hello-World" }
result: "GET /repos/octocat/Hello-World"
```

**Algorithm:**

```typescript
function substitutePath(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`Missing required path parameter: ${name}`);
    }
    return encodeURIComponent(String(value));
  });
}
```

#### 6.2.1 Encoding Considerations

The runtime MUST apply `encodeURIComponent()` to all path parameter values. This handles:

| Input | Encoded Output | Notes |
|-------|----------------|-------|
| `hello world` | `hello%20world` | Spaces encoded |
| `user@example.com` | `user%40example.com` | Special characters encoded |
| `path/to/file` | `path%2Fto%2Ffile` | Slashes encoded (prevents path traversal) |
| `名前` | `%E5%90%8D%E5%89%8D` | Unicode encoded as UTF-8 |

**Already-encoded values:**

The runtime MUST NOT double-encode values. If a value is already percent-encoded, implementations SHOULD detect and preserve it:

```typescript
function safeEncode(value: string): string {
  // Check if value appears to be already encoded
  try {
    const decoded = decodeURIComponent(value);
    // If decoding succeeds and differs from input, it was encoded
    if (decoded !== value) {
      return value; // Already encoded, preserve as-is
    }
  } catch {
    // decodeURIComponent throws on invalid sequences
    // Value is not properly encoded, so encode it
  }
  return encodeURIComponent(value);
}
```

**Array parameters:**

Array values in path parameters MUST be converted to comma-separated strings before encoding:

```typescript
// Input: { ids: [1, 2, 3] }
// Template: "/items/{ids}"
// Result: "/items/1%2C2%2C3"

function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(String).join(',');
  }
  return String(value);
}
```

**Edge cases:**

| Scenario | Behavior |
|----------|----------|
| Empty string | MUST encode as empty (valid path segment) |
| `null` value | MUST throw error (missing parameter) |
| `undefined` value | MUST throw error (missing parameter) |
| Object value | MUST throw error (invalid type for path parameter) |
| Very long values | SHOULD warn if encoded length exceeds 2048 characters |

### 6.3 HTTP Method Extraction

The HTTP method is extracted from the `maps_to` prefix:

```typescript
function parseMapping(mapsTo: string): { method: string; path: string } {
  const [method, ...pathParts] = mapsTo.split(' ');
  return {
    method: method.toUpperCase(),
    path: pathParts.join(' ')
  };
}
```

**Supported Methods:** GET, POST, PUT, PATCH, DELETE

### 6.4 Query vs Body Parameters

After path substitution, remaining parameters are placed according to HTTP method:

| Method | Path Params | Remaining Params |
|--------|-------------|------------------|
| GET | In URL path | Query string |
| DELETE | In URL path | Query string |
| POST | In URL path | JSON request body |
| PUT | In URL path | JSON request body |
| PATCH | In URL path | JSON request body |

### 6.5 URL Construction

```typescript
function buildUrl(adapter: AdapterSchema, path: string, queryParams: Record<string, unknown>): string {
  const url = new URL(path, adapter.target.base_url);

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  }

  return url.toString();
}
```

---

## 7. Response Handling

### 7.1 Success Response

For successful API responses (2xx status codes):

```typescript
interface SuccessResult {
  success: true;
  data: unknown; // Deserialized response body
}
```

### 7.2 Error Response

For failed API responses (4xx, 5xx status codes):

```typescript
interface ErrorResult {
  success: false;
  error: string; // Human-readable error message
}
```

### 7.3 Response Parsing

> **Note:** The `TransportResponse` interface is defined in the [Plugin Interface Specification](./plugin-interface.md).

```typescript
function parseResponse(httpResponse: TransportResponse): OperationResult {
  let body: unknown;

  try {
    body = JSON.parse(httpResponse.body);
  } catch (parseError) {
    // Handle malformed JSON responses (e.g., HTML error pages, truncated responses)
    return handleMalformedResponse(httpResponse, parseError);
  }

  if (httpResponse.status >= 200 && httpResponse.status < 300) {
    return { success: true, data: body };
  }

  // Extract error message from response
  const message = extractErrorMessage(body, httpResponse);
  return { success: false, error: message };
}

function extractErrorMessage(body: unknown, response: TransportResponse): string {
  // Try common error response formats
  if (typeof body === 'object' && body !== null) {
    if ('message' in body) return String(body.message);
    if ('error' in body) {
      if (typeof body.error === 'string') return body.error;
      if (typeof body.error === 'object' && 'message' in body.error) {
        return String(body.error.message);
      }
    }
    if ('errors' in body && Array.isArray(body.errors)) {
      return body.errors.map(e => e.message || String(e)).join('; ');
    }
  }

  // Fallback to status text
  return `${response.status} ${response.statusText}`;
}

function handleMalformedResponse(
  response: TransportResponse,
  parseError: Error
): OperationResult {
  // Check Content-Type to provide better error messages
  const contentType = response.headers['content-type'] || '';

  if (contentType.includes('text/html')) {
    // Likely an error page (nginx 502, Apache error, etc.)
    return {
      success: false,
      error: {
        code: 'SERIALIZATION_PARSE_ERROR',
        message: `Server returned HTML instead of JSON (HTTP ${response.status})`,
        details: {
          content_type: contentType,
          body_preview: response.body.substring(0, 200)
        }
      }
    };
  }

  // Generic JSON parse failure
  return {
    success: false,
    error: {
      code: 'SERIALIZATION_PARSE_ERROR',
      message: `Failed to parse response as JSON: ${parseError.message}`,
      details: {
        content_type: contentType,
        body_preview: response.body.substring(0, 200)
      }
    }
  };
}
```

**Malformed response scenarios:**

| Scenario | Detection | Handling |
|----------|-----------|----------|
| HTML error page | `Content-Type: text/html` | Return `SERIALIZATION_PARSE_ERROR` with body preview |
| Truncated JSON | `JSON.parse` throws | Return parse error with truncated body preview |
| Empty response | Empty body string | Return success with `null` data (if 2xx status) |
| Binary data | Non-text Content-Type | Return error indicating unexpected content type |
| BOM prefix | UTF-8 BOM (`\uFEFF`) | Strip BOM before parsing |

---

## 8. Error Mapping

### 8.1 Default HTTP Error Mapping

The runtime provides default mapping from HTTP status codes to MCP-AQL error responses:

| HTTP Status | Error Pattern |
|-------------|--------------|
| 400 | Validation error - invalid input |
| 401 | Authentication required |
| 403 | Permission denied |
| 404 | Resource not found |
| 409 | Conflict |
| 422 | Validation error - unprocessable |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 502 | Bad gateway |
| 503 | Service unavailable |
| 504 | Gateway timeout |

### 8.2 Error Message Construction

```typescript
function mapHttpError(status: number, body: unknown): string {
  const bodyMessage = extractErrorMessage(body, { status, statusText: '' });

  switch (status) {
    case 400:
      return `Invalid request: ${bodyMessage}`;
    case 401:
      return `Authentication required: ${bodyMessage}`;
    case 403:
      return `Permission denied: ${bodyMessage}`;
    case 404:
      return `Not found: ${bodyMessage}`;
    case 409:
      return `Conflict: ${bodyMessage}`;
    case 422:
      return `Validation failed: ${bodyMessage}`;
    case 429:
      return `Rate limit exceeded: ${bodyMessage}`;
    case 500:
      return `Server error: ${bodyMessage}`;
    case 502:
      return `Bad gateway: ${bodyMessage}`;
    case 503:
      return `Service unavailable: ${bodyMessage}`;
    case 504:
      return `Gateway timeout: ${bodyMessage}`;
    default:
      return `HTTP ${status}: ${bodyMessage}`;
  }
}
```

### 8.3 Transport Errors

Non-HTTP errors are mapped as follows:

| Error Type | Message Pattern |
|------------|-----------------|
| DNS failure | "Could not resolve host: {host}" |
| Connection refused | "Connection refused: {host}:{port}" |
| Timeout | "Request timed out after {ms}ms" |
| TLS error | "TLS error: {details}" |
| Network error | "Network error: {details}" |

---

## 9. Introspection

### 9.1 Built-in Introspect Operation

The runtime provides a built-in `introspect` operation that returns schema information:

```typescript
function handleIntrospect(params: { query: string; name?: string }, adapter: LoadedAdapter): OperationResult {
  if (params.query === 'operations') {
    return introspectOperations(params.name, adapter);
  }
  if (params.query === 'types') {
    return introspectTypes(params.name, adapter);
  }
  return { success: false, error: `Unknown introspection query: ${params.query}` };
}
```

### 9.2 Operations Introspection

**List all operations:**

```json
{
  "operation": "introspect",
  "params": { "query": "operations" }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "operations": [
      { "name": "get_repo", "endpoint": "read", "description": "Get repository details" },
      { "name": "create_repo", "endpoint": "create", "description": "Create a repository" }
    ]
  }
}
```

**Get operation details:**

```json
{
  "operation": "introspect",
  "params": { "query": "operations", "name": "get_repo" }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "operation": {
      "name": "get_repo",
      "endpoint": "read",
      "description": "Get repository details",
      "params": [
        { "name": "owner", "type": "string", "required": true, "description": "Repository owner" },
        { "name": "repo", "type": "string", "required": true, "description": "Repository name" }
      ]
    }
  }
}
```

### 9.3 Introspection Completeness

The runtime MUST guarantee that introspection output matches schema content:

- Every operation in the schema appears in introspection
- Every parameter in the schema appears in operation details
- Parameter metadata (type, required, default, enum) is accurate

---

## 10. Future Extensions

### 10.1 Hot Reload

Future versions will support automatic schema reload on file change:

- Watch adapter files for modifications
- Reload and revalidate on change
- Atomic swap of operation index
- No service interruption during reload

### 10.2 Trust Level Enforcement (#59)

Enforce operation restrictions based on adapter trust level:

```yaml
trust:
  level: generated  # generated | community | verified | official
```

| Trust Level | Allowed Operations |
|-------------|-------------------|
| generated | READ only |
| community | READ, CREATE |
| verified | READ, CREATE, UPDATE, EXECUTE |
| official | All operations |

### 10.3 Rate Limit Tracking (#60)

Track and enforce rate limits:

```yaml
rate_limits:
  quotas:
    limits:
      - metric: calls_per_hour
        warn: 4000
        hard_stop: 5000
```

- Track requests per time window
- Log warnings at threshold
- Return error when limit exceeded

### 10.4 Pagination Handling (#37)

Automatic pagination via plugins:

```yaml
operations:
  read:
    - name: list_repos
      pagination:
        style: link_header
```

### 10.5 Response Caching

Cache responses for idempotent operations:

- GET requests may be cached
- Cache TTL from response headers
- Cache invalidation on mutation operations

### 10.6 Multi-Adapter Management

Load and manage multiple adapters:

- Adapter directory scanning
- Namespace operations by adapter name
- Cross-adapter operation routing

---

## 11. Security Considerations

This section documents security-relevant behaviors and requirements for runtime implementations.

### 11.1 Path Parameter Injection Prevention

The `encodeURIComponent()` call in path parameter substitution (Section 6.2) prevents path traversal attacks:

```typescript
// Malicious input attempt:
params: { filename: "../../../etc/passwd" }

// After encoding:
path: "/files/..%2F..%2F..%2Fetc%2Fpasswd"  // Slashes are encoded, path traversal blocked
```

Implementations MUST:
- Always encode path parameters before substitution
- Never allow raw user input in URL paths
- Reject parameters containing null bytes (`\0`)

### 11.2 Credential Handling

Authentication credentials MUST be handled securely:

| Requirement | Description |
|-------------|-------------|
| Never log credentials | Auth headers MUST be redacted in logs and error messages |
| Memory handling | Credentials SHOULD be cleared from memory after use |
| No credential embedding | Adapters MUST NOT contain hardcoded credentials |
| Secure transport | Credentials MUST only be sent over HTTPS (except localhost) |

**Error message sanitization:**

```typescript
// BAD: Exposes credential in error
throw new Error(`Auth failed with token: ${token}`);

// GOOD: Redacts credential
throw new Error(`Auth failed with token: ${token.substring(0, 4)}...`);
```

### 11.3 Error Message Sanitization

Error messages returned to clients MUST NOT expose:

- Internal file paths or system information
- Database connection strings or queries
- Stack traces (in production)
- Raw credentials or tokens
- Internal IP addresses or hostnames

**Sanitization example:**

```typescript
function sanitizeError(error: Error, isDevelopment: boolean): string {
  if (isDevelopment) {
    return error.message; // Full details in development
  }

  // Production: generic message with error code only
  return `Operation failed: ${error.code || 'INTERNAL_ERROR'}`;
}
```

### 11.4 Input Validation

All inputs MUST be validated before processing:

| Input Type | Validation |
|------------|------------|
| Operation name | MUST match `/^[a-z][a-z0-9_]*$/` pattern |
| Parameter values | MUST match declared type and constraints |
| URL components | MUST be properly encoded |
| Header values | MUST NOT contain newlines (HTTP header injection) |

### 11.5 Response Size Limits

Implementations SHOULD enforce response size limits to prevent denial-of-service:

```typescript
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10 MB default

if (response.body.length > MAX_RESPONSE_SIZE) {
  throw new Error('Response exceeds maximum size limit');
}
```

---

## References

- [Adapter Element Type Specification](../adapter/element-type.md)
- [Plugin Interface Specification](./plugin-interface.md)
- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- [Structured Error Codes](https://github.com/MCPAQL/spec/issues/35) (to be created)
- GitHub Issue: [#63](https://github.com/MCPAQL/spec/issues/63)
