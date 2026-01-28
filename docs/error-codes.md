# Structured Error Codes Specification

**Version:** 1.0.0-draft
**Status:** Draft (MVP)
**Last Updated:** 2026-01-26

## Abstract

This document defines the structured error code system for MCP-AQL protocol responses. Structured error codes enable machine-readable error handling, consistent error categorization, and reliable error mapping across adapter implementations.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Error Response Structure](#2-error-response-structure)
3. [Error Code Format](#3-error-code-format)
4. [MVP Error Codes](#4-mvp-error-codes)
5. [HTTP Status Mapping](#5-http-status-mapping)
6. [Implementation Requirements](#6-implementation-requirements)
7. [Future Extensions](#7-future-extensions)

---

## 1. Overview

### 1.1 Purpose

Structured error codes address several challenges with string-based error messages:

- **Machine-readable** - Programs can take action based on error type
- **Consistent categorization** - Monitoring systems can categorize and alert
- **Adapter mapping** - Errors map reliably to target protocol codes
- **Localization** - Clients can provide localized error messages

### 1.2 Design Principles

1. **Category-based** - Codes follow `CATEGORY_SPECIFIC` naming pattern
2. **Self-documenting** - Code names describe the error condition
3. **Deterministic** - Each error code maps to a specific recovery strategy
4. **Extensible** - New codes can be added without breaking existing clients

### 1.3 MVP Scope

This specification covers the Minimum Viable Product error codes:

**Included:**
- 6 essential error codes
- Basic error response structure
- HTTP status code mapping

**Deferred to future specifications:**
- Full error code taxonomy
- Rate limit error codes (#60)
- Conflict error codes
- Detailed error context schemas
- Per-adapter error overrides
- Error code extension mechanism

### 1.4 Error Format

This specification defines the canonical error response format for MCP-AQL:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_MISSING_PARAM",
    "message": "Missing required parameter 'owner'"
  }
}
```

Implementations MUST use structured error objects with `code` and `message` fields. The optional `details` field MAY provide additional context.

---

## 2. Error Response Structure

### 2.1 Structured Error Format

```typescript
interface ErrorResponse {
  success: false;
  error: ErrorDetail;
}

interface ErrorDetail {
  /**
   * Machine-readable error code
   * Format: CATEGORY_SPECIFIC_ERROR
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Optional contextual details
   */
  details?: Record<string, unknown>;
}
```

### 2.2 Example Responses

**Minimal error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_MISSING_PARAM",
    "message": "Missing required parameter 'owner'"
  }
}
```

**Error with details:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND_RESOURCE",
    "message": "Repository 'octocat/nonexistent' not found",
    "details": {
      "resource_type": "repository",
      "resource_id": "octocat/nonexistent"
    }
  }
}
```

---

## 3. Error Code Format

### 3.1 Naming Convention

Error codes follow the pattern:

```
CATEGORY_SPECIFIC_CONDITION
```

**Rules:**
- All uppercase with underscores
- Category prefix identifies error class
- Specific suffix describes the condition
- 2-4 word components typical

**Examples:**
- `VALIDATION_MISSING_PARAM`
- `NOT_FOUND_OPERATION`
- `PERMISSION_DENIED`
- `INTERNAL_ERROR`

### 3.2 Category Prefixes

| Category | Description | HTTP Range |
|----------|-------------|------------|
| `VALIDATION_` | Input validation errors | 400, 422 |
| `NOT_FOUND_` | Resource not found | 404 |
| `PERMISSION_` | Authentication/authorization | 401, 403 |
| `CONFLICT_` | Resource conflicts | 409 |
| `RATE_LIMIT_` | Rate limiting | 429 |
| `INTERNAL_` | Server errors | 500+ |

---

## 4. MVP Error Codes

### 4.1 Error Code Registry

The MVP includes 6 essential error codes:

| Code | Category | Description |
|------|----------|-------------|
| `VALIDATION_MISSING_PARAM` | Validation | Required parameter not provided |
| `VALIDATION_INVALID_TYPE` | Validation | Parameter has wrong type |
| `NOT_FOUND_OPERATION` | Not Found | Requested operation does not exist |
| `NOT_FOUND_RESOURCE` | Not Found | Target resource not found (HTTP 404) |
| `PERMISSION_DENIED` | Permission | Access denied (HTTP 401/403) |
| `INTERNAL_ERROR` | Internal | Server error or unexpected failure |

### 4.2 Message Template Conventions

All error codes define a **message format** template that implementations SHOULD follow for consistency. Templates use the following conventions:

- Variable placeholders use `{variable_name}` syntax matching keys in the `details` object
- Dynamic values MUST be wrapped in single quotes within the message (e.g., `'{param_name}'`)
- The message prefix MUST match the error category (e.g., `VALIDATION_` codes start with the validation context, `NOT_FOUND_` codes reference what was not found)
- Implementations MAY substitute the target API's error message when it provides more specific context, but SHOULD prefer the template format for consistency

### 4.3 VALIDATION_MISSING_PARAM

**When used:** A required parameter was not provided in the request.

**Message format:** `Missing required parameter '{param_name}'`

**Details:**
```typescript
{
  /** Name of the missing parameter */
  param_name: string;
  /** Operation that requires this parameter */
  operation?: string;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_MISSING_PARAM",
    "message": "Missing required parameter 'owner'",
    "details": {
      "param_name": "owner",
      "operation": "get_repo"
    }
  }
}
```

### 4.4 VALIDATION_INVALID_TYPE

**When used:** A parameter was provided with an incorrect type.

**Message format:** `Parameter '{param_name}' expected '{expected_type}', got '{actual_type}'`

**Details:**
```typescript
{
  /** Name of the invalid parameter */
  param_name: string;
  /** Expected type (string, integer, etc.) */
  expected_type: string;
  /** Type that was received */
  actual_type: string;
  /** The invalid value (if safe to include) */
  value?: unknown;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_INVALID_TYPE",
    "message": "Parameter 'per_page' expected 'integer', got 'string'",
    "details": {
      "param_name": "per_page",
      "expected_type": "integer",
      "actual_type": "string",
      "value": "fifty"
    }
  }
}
```

### 4.5 NOT_FOUND_OPERATION

**When used:** The requested operation does not exist in the adapter schema.

> **Design note:** This code uses the `NOT_FOUND_` category rather than `VALIDATION_` because the error signals a fundamentally different recovery strategy. A `VALIDATION_` error tells the client to fix its input and retry the same operation. A `NOT_FOUND_OPERATION` error tells the client that the operation itself does not exist and it should discover valid operations via introspection. This distinction is especially important for LLM clients, which use the error category to determine whether to adjust parameters or switch to a different operation entirely.

**Message format:** `Unknown operation: '{operation_name}'`

**Details:**
```typescript
{
  /** The operation name that was requested */
  operation: string;
  /** Valid operation names the client can use instead */
  available?: string[];
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND_OPERATION",
    "message": "Unknown operation: 'get_users'",
    "details": {
      "operation": "get_users"
    }
  }
}
```

### 4.6 NOT_FOUND_RESOURCE

**When used:** The target API returned HTTP 404 - the requested resource does not exist.

**Message format:** `Resource '{resource_type}' not found: '{resource_id}'`

**Details:**
```typescript
{
  /** Type of resource (e.g., "repository", "user", "issue") */
  resource_type?: string;
  /** Identifier that was not found */
  resource_id?: string;
  /** HTTP status code from the target API */
  http_status?: number;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND_RESOURCE",
    "message": "Repository 'octocat/nonexistent' not found",
    "details": {
      "resource_type": "repository",
      "resource_id": "octocat/nonexistent",
      "http_status": 404
    }
  }
}
```

### 4.7 PERMISSION_DENIED

**When used:** The target API returned HTTP 401 (unauthorized) or 403 (forbidden).

**Message format:** `Permission denied: '{reason}'`

**Details:**
```typescript
{
  /** Human-readable explanation of why permission was denied */
  reason?: string;
  /** HTTP status code from the target API (401 or 403) */
  http_status?: number;
  /** OAuth scope required for this operation, if known */
  required_scope?: string;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Permission denied: requires 'repo' scope",
    "details": {
      "http_status": 403,
      "required_scope": "repo"
    }
  }
}
```

### 4.8 INTERNAL_ERROR

**When used:** Server error from target API (HTTP 500+) or unexpected error in the runtime.

**Message format:** `Internal error: '{description}'`

**Details:**
```typescript
{
  /** HTTP status code from the target API */
  http_status?: number;
  /** Error message returned by the target API */
  upstream_error?: string;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal error: GitHub API unavailable",
    "details": {
      "http_status": 503,
      "upstream_error": "Service temporarily unavailable"
    }
  }
}
```

---

## 5. HTTP Status Mapping

### 5.1 Default Mapping

The runtime maps HTTP status codes to MCP-AQL error codes:

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_INVALID_TYPE` | Bad request |
| 401 | `PERMISSION_DENIED` | Authentication required |
| 403 | `PERMISSION_DENIED` | Forbidden |
| 404 | `NOT_FOUND_RESOURCE` | Not found |
| 422 | `VALIDATION_INVALID_TYPE` | Unprocessable entity |
| 500 | `INTERNAL_ERROR` | Internal server error |
| 502 | `INTERNAL_ERROR` | Bad gateway |
| 503 | `INTERNAL_ERROR` | Service unavailable |
| 504 | `INTERNAL_ERROR` | Gateway timeout |

### 5.2 Mapping Algorithm

```typescript
function mapHttpStatusToErrorCode(status: number): string {
  if (status === 400 || status === 422) {
    return 'VALIDATION_INVALID_TYPE';
  }
  if (status === 401 || status === 403) {
    return 'PERMISSION_DENIED';
  }
  if (status === 404) {
    return 'NOT_FOUND_RESOURCE';
  }
  if (status >= 500) {
    return 'INTERNAL_ERROR';
  }
  // Default for other 4xx errors
  return 'VALIDATION_INVALID_TYPE';
}
```

> **Note:** HTTP status codes alone cannot distinguish between `VALIDATION_MISSING_PARAM` and `VALIDATION_INVALID_TYPE` (both typically return 400 or 422). Adapters SHOULD examine the target API's response body to determine the specific validation error and set the appropriate code. The mapping algorithm above provides a default when response body inspection is not feasible.

---

## 6. Implementation Requirements

### 6.1 Error Generation

Implementations MUST:

1. Return structured errors for all failure cases
2. Include `code` and `message` fields
3. Use codes from the MVP registry
4. Provide human-readable messages

Implementations SHOULD:

1. Include `details` with contextual information
2. Preserve upstream error messages
3. Log full error context for debugging

### 6.2 Error Handling

Client implementations SHOULD:

1. Check `success` field first
2. Parse the `error` object to extract `code` and `message`
3. Use `code` field for programmatic error handling and recovery decisions
4. Display `message` field to users

### 6.3 Message Localization

The `code` field enables localization:

```typescript
const ERROR_MESSAGES = {
  en: {
    VALIDATION_MISSING_PARAM: "Missing required parameter: '{param_name}'",
    NOT_FOUND_RESOURCE: 'Resource not found',
  },
  es: {
    VALIDATION_MISSING_PARAM: "Falta el parámetro requerido: '{param_name}'",
    NOT_FOUND_RESOURCE: 'Recurso no encontrado',
  }
};

function localizeError(error: ErrorDetail, locale: string): string {
  const template = ERROR_MESSAGES[locale]?.[error.code];
  if (template && error.details) {
    return interpolate(template, error.details);
  }
  return error.message;
}
```

---

## 7. Future Extensions

### 7.1 Additional Error Codes

Future specifications will add:

**Rate Limiting (#60):**
- `RATE_LIMIT_EXCEEDED` - API rate limit reached
- `RATE_LIMIT_QUOTA_EXHAUSTED` - Quota exhausted

**Conflict Handling:**
- `CONFLICT_ALREADY_EXISTS` - Resource already exists
- `CONFLICT_VERSION_MISMATCH` - Optimistic locking failure

**Enhanced Validation:**
- `VALIDATION_INVALID_ENUM` - Value not in allowed enum
- `VALIDATION_OUT_OF_RANGE` - Value outside allowed range
- `VALIDATION_PATTERN_MISMATCH` - String doesn't match pattern

**Trust Levels (#59):**
- `PERMISSION_TRUST_LEVEL_INSUFFICIENT` - Operation requires higher trust

### 7.2 Error Code Extension Mechanism

Future versions will define how adapters can register custom error codes:

```yaml
# In adapter schema
error_codes:
  GITHUB_ABUSE_DETECTED:
    category: RATE_LIMIT
    message_template: "Abuse detection triggered: {reason}"
    maps_from_http: [403]
    condition: "response.body.message contains 'abuse'"
```

### 7.3 Per-Adapter Error Overrides

Future versions will allow adapters to customize HTTP error mapping:

```yaml
# In adapter schema
error_mapping:
  404:
    code: NOT_FOUND_REPOSITORY
    message_template: "Repository '{owner}/{repo}' not found"
  403:
    condition: "response.body.message contains 'rate limit'"
    code: RATE_LIMIT_EXCEEDED
```

### 7.4 Error Aggregation

For batch operations, errors may be aggregated:

```json
{
  "success": false,
  "error": {
    "code": "BATCH_PARTIAL_FAILURE",
    "message": "3 of 5 operations failed",
    "details": {
      "total": 5,
      "succeeded": 2,
      "failed": 3,
      "errors": [
        { "index": 1, "code": "NOT_FOUND_RESOURCE", "message": "..." },
        { "index": 3, "code": "PERMISSION_DENIED", "message": "..." },
        { "index": 4, "code": "VALIDATION_MISSING_PARAM", "message": "..." }
      ]
    }
  }
}
```

---

## References

- [MCP-AQL Specification](./versions/v1.0.0-draft.md)
- [Universal Adapter Runtime](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/architecture/runtime.md) (in mcpaql-adapter repo)
- [DollhouseMCP Implementation](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/298)
- GitHub Issue: [#35](https://github.com/MCPAQL/spec/issues/35)
