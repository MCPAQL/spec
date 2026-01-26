# Plugin Interface Specification

**Version:** 1.0.0-draft
**Status:** Draft (MVP)
**Last Updated:** 2026-01-26

## Abstract

This document defines the plugin interface specification for the MCP-AQL universal adapter runtime. Plugins provide modular, composable functionality for transport, protocol, authentication, and serialization, enabling adapters to communicate with diverse APIs through a unified interface.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Plugin Categories](#2-plugin-categories)
3. [Base Plugin Interface](#3-base-plugin-interface)
4. [Transport Plugins](#4-transport-plugins)
5. [Protocol Plugins](#5-protocol-plugins)
6. [Serialization Plugins](#6-serialization-plugins)
7. [Authentication Plugins](#7-authentication-plugins)
8. [Plugin Composition](#8-plugin-composition)
9. [Error Handling](#9-error-handling)
10. [Future Extensions](#10-future-extensions)

---

## 1. Overview

### 1.1 Purpose

Plugins enable the universal adapter runtime to support different communication patterns without adapter-specific code. Each adapter schema references plugins declaratively:

```yaml
target:
  transport: http        # Transport plugin
  protocol: rest         # Protocol plugin
  serialization: json    # Serialization plugin

auth:
  type: bearer           # Auth plugin
```

The runtime loads and composes these plugins to handle API communication.

### 1.2 Design Principles

1. **Declarative composition** - Adapters reference plugins by name, runtime composes them
2. **Single responsibility** - Each plugin handles one concern
3. **Testable in isolation** - Plugins can be unit tested independently
4. **Built-in only (MVP)** - No user-extensible plugins in V1
5. **Future extensibility** - Interfaces designed for later extension

### 1.3 MVP Scope

This specification covers the Minimum Viable Product plugins:

**Included:**

| Category | Plugins |
|----------|---------|
| Transport | `http` |
| Protocol | `rest` |
| Serialization | `json` |
| Auth | `none`, `api_key`, `bearer` |

**Deferred to future specifications:**

| Category | Deferred Plugins |
|----------|-----------------|
| Transport | `websocket`, `serial`, `native-*` |
| Protocol | `graphql`, `grpc`, `jsonrpc`, `custom` |
| Serialization | `xml`, `protobuf`, `msgpack`, `form`, `multipart` |
| Auth | `basic`, `oauth`, `mtls`, `aws-sig4` |
| Pagination | All pagination plugins (see #37) |

---

## 2. Plugin Categories

### 2.1 Category Summary

| Category | Responsibility | MVP Plugin |
|----------|---------------|------------|
| Transport | Communication channel | `http` |
| Protocol | Request/response structure | `rest` |
| Serialization | Data encoding/decoding | `json` |
| Auth | Credential attachment | `none`, `api_key`, `bearer` |

### 2.2 Plugin Resolution

Plugins are resolved by name at runtime:

1. Check built-in plugins (shipped with runtime)
2. Return plugin instance
3. Fail with `PLUGIN_NOT_FOUND` error if unknown

```typescript
// Pseudocode
function resolvePlugin(category: string, name: string): Plugin {
  const plugin = BUILTIN_PLUGINS[category][name];
  if (!plugin) {
    throw new PluginNotFoundError(category, name);
  }
  return plugin;
}
```

---

## 3. Base Plugin Interface

### 3.1 Common Interface

All plugins implement a common base interface:

```typescript
interface Plugin {
  /**
   * Unique identifier for this plugin
   */
  readonly name: string;

  /**
   * Plugin category
   */
  readonly category: PluginCategory;

  /**
   * Human-readable description
   */
  readonly description: string;

  /**
   * Semantic version of the plugin
   */
  readonly version: string;
}

type PluginCategory = 'transport' | 'protocol' | 'serialization' | 'auth';
```

### 3.2 Plugin Lifecycle

Plugins are stateless singletons. The runtime:

1. Resolves plugins by name at adapter load time
2. Validates plugin compatibility
3. Composes plugins into a request pipeline
4. Invokes pipeline for each operation

Plugins MUST NOT maintain request-specific state between calls.

---

## 4. Transport Plugins

### 4.1 Purpose

Transport plugins handle the underlying communication channel between the runtime and target API.

### 4.2 Interface

```typescript
interface TransportPlugin extends Plugin {
  readonly category: 'transport';

  /**
   * Send a request and receive a response
   *
   * @param request - The prepared request
   * @param options - Transport-specific options
   * @returns The raw response
   */
  send(request: TransportRequest, options: TransportOptions): Promise<TransportResponse>;
}

interface TransportRequest {
  /**
   * Full URL including query parameters
   */
  url: string;

  /**
   * HTTP method (for HTTP-based transports)
   */
  method: string;

  /**
   * Request headers
   */
  headers: Record<string, string>;

  /**
   * Serialized request body (may be undefined)
   */
  body?: string | Buffer;
}

interface TransportOptions {
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Number of retry attempts
   */
  retries?: number;

  /**
   * Base delay between retries in milliseconds
   */
  retryDelay?: number;
}

interface TransportResponse {
  /**
   * HTTP status code
   */
  status: number;

  /**
   * Status text (e.g., "OK", "Not Found")
   */
  statusText: string;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Raw response body
   */
  body: string | Buffer;
}
```

### 4.3 HTTP Transport Plugin

**Name:** `http`
**Description:** HTTP/HTTPS transport using standard fetch or HTTP client

**Behavior:**

1. Constructs HTTP request from `TransportRequest`
2. Sends request using HTTPS (HTTP only for localhost)
3. Handles connection errors with appropriate error codes
4. Returns raw response without interpretation

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | number | 30000 | Request timeout (ms) |
| `retries` | number | 0 | Retry attempts on network failure |
| `retryDelay` | number | 1000 | Base retry delay (ms) |

**Error Handling:**

| Condition | Error Code |
|-----------|------------|
| DNS resolution failure | `TRANSPORT_DNS_ERROR` |
| Connection refused | `TRANSPORT_CONNECTION_REFUSED` |
| Connection timeout | `TRANSPORT_TIMEOUT` |
| TLS/SSL error | `TRANSPORT_TLS_ERROR` |
| Network error | `TRANSPORT_NETWORK_ERROR` |

---

## 5. Protocol Plugins

### 5.1 Purpose

Protocol plugins translate MCP-AQL operation definitions into protocol-specific requests and parse responses into a standard format.

### 5.2 Interface

```typescript
interface ProtocolPlugin extends Plugin {
  readonly category: 'protocol';

  /**
   * Build a transport request from an operation definition
   *
   * @param operation - The operation to execute
   * @param params - Resolved parameter values
   * @param config - Target configuration from adapter
   * @returns A request ready for the transport plugin
   */
  buildRequest(
    operation: OperationDefinition,
    params: Record<string, unknown>,
    config: TargetConfig
  ): TransportRequest;

  /**
   * Parse a transport response into standard format
   *
   * @param response - Raw response from transport
   * @param operation - The operation that was executed
   * @returns Parsed response data
   */
  parseResponse(
    response: TransportResponse,
    operation: OperationDefinition
  ): ParsedResponse;
}

interface OperationDefinition {
  name: string;
  maps_to: string;          // e.g., "GET /repos/{owner}/{repo}"
  params?: Record<string, ParamDefinition>;
}

interface TargetConfig {
  base_url: string;
  transport: string;
  protocol: string;
  serialization: string;
}

interface ParsedResponse {
  /**
   * Whether the request was successful (2xx status)
   */
  ok: boolean;

  /**
   * HTTP status code
   */
  status: number;

  /**
   * Deserialized response data
   */
  data: unknown;

  /**
   * Error information (if not ok)
   */
  error?: {
    message: string;
    code?: string;
  };
}
```

### 5.3 REST Protocol Plugin

**Name:** `rest`
**Description:** RESTful API conventions over HTTP

**Request Building:**

1. Parse `maps_to` format: `METHOD /path/with/{placeholders}`
2. Extract HTTP method (GET, POST, PUT, PATCH, DELETE)
3. Substitute path placeholders with parameter values
4. Build query string for GET requests with remaining params
5. Build request body for non-GET requests with remaining params
6. Set appropriate Content-Type header

**Path Parameter Substitution:**

```
maps_to: "GET /repos/{owner}/{repo}/issues/{issue_number}"
params: { owner: "octocat", repo: "Hello-World", issue_number: 42 }
result: "GET /repos/octocat/Hello-World/issues/42"
```

**Query vs Body Parameters:**

| Method | Path Params | Other Params |
|--------|-------------|--------------|
| GET | In URL path | Query string |
| DELETE | In URL path | Query string |
| POST | In URL path | Request body |
| PUT | In URL path | Request body |
| PATCH | In URL path | Request body |

**Response Parsing:**

| Status Range | Result |
|--------------|--------|
| 2xx | `ok: true`, data from body |
| 4xx | `ok: false`, error from body or status |
| 5xx | `ok: false`, error from body or status |

---

## 6. Serialization Plugins

### 6.1 Purpose

Serialization plugins handle encoding request bodies and decoding response bodies.

### 6.2 Interface

```typescript
interface SerializationPlugin extends Plugin {
  readonly category: 'serialization';

  /**
   * Content-Type header value for this format
   */
  readonly contentType: string;

  /**
   * Serialize data to string/buffer
   *
   * @param data - Data to serialize
   * @returns Serialized string or buffer
   */
  serialize(data: unknown): string | Buffer;

  /**
   * Deserialize string/buffer to data
   *
   * @param raw - Raw response body
   * @returns Deserialized data
   */
  deserialize(raw: string | Buffer): unknown;
}
```

### 6.3 JSON Serialization Plugin

**Name:** `json`
**Description:** JSON encoding/decoding
**Content-Type:** `application/json`

**Serialize:**
- Calls `JSON.stringify(data)`
- Handles circular references with error

**Deserialize:**
- Calls `JSON.parse(raw)`
- Returns `null` for empty responses
- Throws on malformed JSON

**Error Handling:**

| Condition | Error Code |
|-----------|------------|
| Circular reference | `SERIALIZATION_CIRCULAR_REF` |
| Invalid JSON in response | `SERIALIZATION_PARSE_ERROR` |

---

## 7. Authentication Plugins

### 7.1 Purpose

Authentication plugins attach credentials to outgoing requests.

### 7.2 Interface

```typescript
interface AuthPlugin extends Plugin {
  readonly category: 'auth';

  /**
   * Attach authentication to a request
   *
   * @param request - Request to modify
   * @param config - Auth configuration from adapter
   * @param context - Runtime context for credential resolution
   * @returns Modified request with auth attached
   */
  authenticate(
    request: TransportRequest,
    config: AuthConfig,
    context: AuthContext
  ): TransportRequest;
}

interface AuthConfig {
  type: string;
  // Type-specific fields
  token_env?: string;      // For bearer
  header_name?: string;    // For api_key
  key_env?: string;        // For api_key
}

interface AuthContext {
  /**
   * Resolve an environment variable
   */
  getEnv(name: string): string | undefined;
}
```

### 7.3 None Auth Plugin

**Name:** `none`
**Description:** No authentication

**Behavior:** Returns request unchanged.

```typescript
authenticate(request, config, context) {
  return request;
}
```

### 7.4 API Key Auth Plugin

**Name:** `api_key`
**Description:** API key in HTTP header

**Configuration:**

```yaml
auth:
  type: api_key
  header_name: X-API-Key
  key_env: MY_API_KEY
```

**Behavior:**

1. Read key from `context.getEnv(config.key_env)`
2. Add header `config.header_name: {key}`
3. Fail if key not found in environment

**Error Handling:**

| Condition | Error Code |
|-----------|------------|
| Missing key_env in config | `AUTH_CONFIG_INVALID` |
| Missing header_name in config | `AUTH_CONFIG_INVALID` |
| Environment variable not set | `AUTH_CREDENTIAL_MISSING` |

### 7.5 Bearer Auth Plugin

**Name:** `bearer`
**Description:** Bearer token in Authorization header

**Configuration:**

```yaml
auth:
  type: bearer
  token_env: GITHUB_TOKEN
```

**Behavior:**

1. Read token from `context.getEnv(config.token_env)`
2. Add header `Authorization: Bearer {token}`
3. Fail if token not found in environment

**Error Handling:**

| Condition | Error Code |
|-----------|------------|
| Missing token_env in config | `AUTH_CONFIG_INVALID` |
| Environment variable not set | `AUTH_CREDENTIAL_MISSING` |

---

## 8. Plugin Composition

### 8.1 Request Pipeline

Plugins compose into a request pipeline:

```
┌──────────────────────────────────────────────────────────────┐
│                    OPERATION REQUEST                          │
│  { operation: "get_repo", params: { owner, repo } }          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    PROTOCOL PLUGIN                            │
│  rest.buildRequest()                                          │
│  Maps operation to HTTP request structure                     │
│  Output: { url, method, headers, body? }                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                 SERIALIZATION PLUGIN                          │
│  json.serialize()                                             │
│  Serializes body if present, sets Content-Type               │
│  Output: { url, method, headers, body: string }              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     AUTH PLUGIN                               │
│  bearer.authenticate()                                        │
│  Attaches Authorization header                                │
│  Output: { url, method, headers + auth, body }               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   TRANSPORT PLUGIN                            │
│  http.send()                                                  │
│  Sends HTTP request, receives response                        │
│  Output: { status, statusText, headers, body }               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                 SERIALIZATION PLUGIN                          │
│  json.deserialize()                                           │
│  Parses response body                                         │
│  Output: parsed data object                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    PROTOCOL PLUGIN                            │
│  rest.parseResponse()                                         │
│  Interprets status, extracts data or error                   │
│  Output: { ok, status, data, error? }                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   MCP-AQL RESPONSE                            │
│  { success: true, data: {...} }                              │
│  OR { success: false, error: "..." }                         │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 Pipeline Execution

```typescript
// Pseudocode
async function executePipeline(
  operation: OperationDefinition,
  params: Record<string, unknown>,
  adapter: AdapterSchema
): Promise<OperationResult> {
  const protocol = resolvePlugin('protocol', adapter.target.protocol);
  const serialization = resolvePlugin('serialization', adapter.target.serialization);
  const auth = resolvePlugin('auth', adapter.auth.type);
  const transport = resolvePlugin('transport', adapter.target.transport);

  // Build request
  let request = protocol.buildRequest(operation, params, adapter.target);

  // Serialize body if present
  if (request.body !== undefined) {
    request.body = serialization.serialize(request.body);
    request.headers['Content-Type'] = serialization.contentType;
  }

  // Attach authentication
  request = auth.authenticate(request, adapter.auth, authContext);

  // Send request
  const response = await transport.send(request, {});

  // Deserialize response
  const body = serialization.deserialize(response.body);

  // Parse into standard format
  const parsed = protocol.parseResponse({ ...response, body }, operation);

  // Convert to MCP-AQL result
  if (parsed.ok) {
    return { success: true, data: parsed.data };
  } else {
    return { success: false, error: parsed.error.message };
  }
}
```

---

## 9. Error Handling

### 9.1 Error Code Convention

Plugin errors use a namespaced code format:

```
{CATEGORY}_{ERROR_TYPE}
```

Examples:
- `TRANSPORT_TIMEOUT`
- `AUTH_CREDENTIAL_MISSING`
- `SERIALIZATION_PARSE_ERROR`
- `PROTOCOL_INVALID_MAPPING`

### 9.2 Error Propagation

Errors thrown by plugins MUST include:

```typescript
interface PluginError extends Error {
  code: string;           // Error code
  plugin: string;         // Plugin name
  category: string;       // Plugin category
  cause?: Error;          // Underlying error
}
```

### 9.3 MVP Error Codes

| Code | Category | Description |
|------|----------|-------------|
| `PLUGIN_NOT_FOUND` | Runtime | Requested plugin does not exist |
| `TRANSPORT_DNS_ERROR` | Transport | DNS resolution failed |
| `TRANSPORT_CONNECTION_REFUSED` | Transport | Connection refused |
| `TRANSPORT_TIMEOUT` | Transport | Request timed out |
| `TRANSPORT_TLS_ERROR` | Transport | TLS/SSL error |
| `TRANSPORT_NETWORK_ERROR` | Transport | General network error |
| `PROTOCOL_INVALID_MAPPING` | Protocol | Invalid maps_to format |
| `PROTOCOL_MISSING_PARAM` | Protocol | Path parameter missing |
| `SERIALIZATION_CIRCULAR_REF` | Serialization | Circular reference in data |
| `SERIALIZATION_PARSE_ERROR` | Serialization | Failed to parse response |
| `AUTH_CONFIG_INVALID` | Auth | Invalid auth configuration |
| `AUTH_CREDENTIAL_MISSING` | Auth | Credential not found |

---

## 10. Future Extensions

### 10.1 Additional Transport Plugins

**WebSocket (`websocket`):**
- Persistent bidirectional connections
- Message framing and delivery
- Reconnection handling

**Serial (`serial`):**
- Serial port communication
- Baud rate and flow control
- Platform-specific drivers

**Native (`native-*`):**
- Platform-specific native APIs
- macOS, Windows, Linux variants
- Direct system calls without HTTP

### 10.2 Additional Protocol Plugins

**GraphQL (`graphql`):**
- Query/mutation construction
- Variable substitution
- Error extraction from extensions

**gRPC (`grpc`):**
- Protocol buffer serialization
- HTTP/2 framing
- Streaming support

**JSON-RPC (`jsonrpc`):**
- Request ID management
- Batch requests
- Error code mapping

### 10.3 Additional Auth Plugins

**OAuth 2.0 (`oauth`):**
- Multiple flow types (authorization code, client credentials)
- Token refresh handling
- Scope management

**Mutual TLS (`mtls`):**
- Client certificate management
- Certificate chain validation
- Key storage integration

**AWS Signature V4 (`aws-sig4`):**
- Request signing
- Region and service scoping
- Credential resolution

### 10.4 Pagination Plugins

See #37 for cursor-based pagination specification.

| Plugin | Style | Description |
|--------|-------|-------------|
| `cursor` | Opaque cursor | Next cursor in response |
| `offset` | Limit/offset | Numeric offset pagination |
| `page` | Page number | Page-based pagination |
| `link_header` | RFC 5988 | Link header parsing |

### 10.5 User-Extensible Plugins

Future versions may support:
- Plugin directory for user-installed plugins
- Plugin manifest format
- Security sandboxing
- Plugin versioning and updates

---

## References

- [Adapter Element Type Specification](../adapter/element-type.md)
- [Universal Adapter Runtime](https://github.com/MCPAQL/spec/issues/63) (to be created)
- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- GitHub Issue: [#62](https://github.com/MCPAQL/spec/issues/62)
