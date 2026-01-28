# Plugin Interface Contracts

**Version:** 1.0.0-draft
**Status:** Draft (MVP)
**Last Updated:** 2026-01-27

## Abstract

This document defines the normative plugin interface contracts for the MCP-AQL adapter system. Plugins provide modular, composable functionality for transport, protocol, authentication, and serialization. This specification defines **what** each plugin type MUST provide; implementation details of specific plugins and the composition pipeline are documented in the [mcpaql-adapter](https://github.com/MCPAQL/mcpaql-adapter) repository.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Plugin Categories](#2-plugin-categories)
3. [Base Plugin Interface](#3-base-plugin-interface)
4. [Transport Plugin Interface](#4-transport-plugin-interface)
5. [Protocol Plugin Interface](#5-protocol-plugin-interface)
6. [Serialization Plugin Interface](#6-serialization-plugin-interface)
7. [Authentication Plugin Interface](#7-authentication-plugin-interface)
8. [Error Code Contracts](#8-error-code-contracts)

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

### 1.4 Requirement Levels

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

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

Plugins are resolved by name at runtime. Implementations:

1. MUST check built-in plugins (shipped with runtime)
2. MUST return a plugin instance for known names
3. MUST fail with `PLUGIN_NOT_FOUND` error if the plugin name is unknown

---

## 3. Base Plugin Interface

### 3.1 Common Interface

All plugins MUST implement a common base interface:

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

## 4. Transport Plugin Interface

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

---

## 5. Protocol Plugin Interface

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

---

## 6. Serialization Plugin Interface

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

---

## 7. Authentication Plugin Interface

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

---

## 8. Error Code Contracts

### 8.1 Error Code Convention

Plugin errors MUST use a namespaced code format:

```
{CATEGORY}_{ERROR_TYPE}
```

Examples:
- `TRANSPORT_TIMEOUT`
- `AUTH_CREDENTIAL_MISSING`
- `SERIALIZATION_PARSE_ERROR`
- `PROTOCOL_INVALID_MAPPING`

### 8.2 Error Propagation

Errors thrown by plugins MUST include:

```typescript
interface PluginError extends Error {
  code: string;           // Error code
  plugin: string;         // Plugin name
  category: string;       // Plugin category
  cause?: Error;          // Underlying error
}
```

### 8.3 MVP Error Codes

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

## References

- [Adapter Element Type Specification](adapter/element-type.md)
- [Error Codes Specification](error-codes.md)
- [MCP-AQL Specification](versions/v1.0.0-draft.md)
- [Plugin System Implementation](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/architecture/plugin-system.md) (implementation details)
- GitHub Issue: [#62](https://github.com/MCPAQL/spec/issues/62)
