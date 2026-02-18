# Structured Error Codes Specification

**Version:** 1.0.0-draft
**Status:** Draft (MVP)
**Last Updated:** 2026-01-28

## Abstract

This document defines the structured error code system for MCP-AQL protocol responses. Structured error codes enable machine-readable error handling, consistent error categorization, and reliable error mapping across adapter implementations.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Error Response Structure](#2-error-response-structure)
3. [Error Code Format](#3-error-code-format)
4. [MVP Error Codes](#4-mvp-error-codes)
5. [Phase 1: Robustness Error Codes](#5-phase-1-robustness-error-codes)
6. [HTTP Status Mapping](#6-http-status-mapping)
7. [Implementation Requirements](#7-implementation-requirements)
8. [Future Extensions](#8-future-extensions)

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
- 6 essential error codes (MVP)
- 7 Phase 1 robustness error codes
- Basic error response structure
- HTTP status code mapping
- Generator error code category reference

**Deferred to future specifications:**
- Full error code taxonomy
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
| `TOKEN_` | Confirmation token errors | 400, 403 |
| `SCHEMA_` | Schema validation errors (generators) | N/A |
| `INTERNAL_` | Server errors | 500+ |

> **Note on `SCHEMA_` category:** Unlike other error categories which occur at runtime, `SCHEMA_` errors are produced by adapter generators during schema validation. These errors do not map to HTTP status codes because they occur during code generation, not API requests. See [Adapter Generator Specification](./adapter/generator.md) Section 2.2 for the complete list of schema validation error codes.

---

## 4. MVP Error Codes

### 4.1 Error Code Registry

The MVP includes 6 essential error codes:

| Code | Category | Description |
|------|----------|-------------|
| `VALIDATION_MISSING_PARAM` | Validation | Required parameter not provided |
| `VALIDATION_INVALID_TYPE` | Validation | Parameter has wrong type |
| `VALIDATION_UNKNOWN_PARAM` | Validation | Request contains parameter not defined in operation schema |
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

**Reference:** This specification (MVP error code)

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

**Reference:** This specification (MVP error code)

### 4.5 VALIDATION_UNKNOWN_PARAM

**When used:** A request contains one or more parameters not defined in the operation schema at the `params` level.

> **Note:** This code applies to unknown parameters in the `params` object. For unknown fields within the nested `input` object (used in UPDATE operations per Section 4.5 of the normative spec), use `VALIDATION_UNKNOWN_FIELD` instead. The distinction enables precise error handling: `VALIDATION_UNKNOWN_PARAM` indicates a top-level parameter error, while `VALIDATION_UNKNOWN_FIELD` indicates an error within the update payload.

**Message format:** `Unknown parameter(s) for operation '{operation}': {param_list}`

When multiple unknown parameters are detected, adapters SHOULD either:
- List all unknown parameters in a comma-separated format: `Unknown parameter(s) for operation 'create_user': force_create, admin_override`
- Report the first unknown parameter with a count: `Unknown parameter 'force_create' for operation 'create_user' (and 1 other)`

**Details:**
```typescript
{
  /** The operation being called */
  operation: string;
  /** List of unknown parameter names */
  unknown_params: string[];
  /** List of valid parameter names for this operation */
  valid_params: string[];
}
```

**Example (multiple unknown parameters):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_UNKNOWN_PARAM",
    "message": "Unknown parameter(s) for operation 'create_user': force_create, admin_override",
    "details": {
      "operation": "create_user",
      "unknown_params": ["force_create", "admin_override"],
      "valid_params": ["user_name", "password", "email"]
    }
  }
}
```

**HTTP Status Mapping:** This error SHOULD map to HTTP 400 (Bad Request) or 422 (Unprocessable Entity).

**Reference:** [MCP-AQL Specification Section 4.6](./versions/v1.0.0-draft.md#46-unknown-parameter-handling)

### 4.6 NOT_FOUND_OPERATION

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

**Reference:** This specification (MVP error code)

### 4.7 NOT_FOUND_RESOURCE

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

**Reference:** This specification (MVP error code); [RFC 9110 Section 15.5.5](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.5) (HTTP 404)

### 4.8 PERMISSION_DENIED

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

**Reference:** This specification (MVP error code); [RFC 9110 Section 15.5.2](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.2) (HTTP 401), [Section 15.5.4](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.4) (HTTP 403)

### 4.9 INTERNAL_ERROR

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

**Reference:** This specification (MVP error code); [RFC 9110 Section 15.6](https://www.rfc-editor.org/rfc/rfc9110#section-15.6) (HTTP 5xx)

---

## 5. Phase 1: Robustness Error Codes

Phase 1 of MCP-AQL adds robustness features including trust levels, dangerous operation classification, rate limiting, and confirmation tokens. These features introduce 11 additional error codes.

### 5.1 Phase 1 Error Code Registry

| Code | Category | Description |
|------|----------|-------------|
| `PERMISSION_TRUST_LEVEL_INSUFFICIENT` | Permission | Adapter trust level too low for operation |
| `PERMISSION_DANGER_LEVEL_DENIED` | Permission | Operation danger level exceeds trust allowance |
| `CONFIRMATION_REQUIRED` | Permission | Dangerous operation requires user confirmation |
| `RATE_LIMIT_EXCEEDED` | Rate Limit | Target API rate limit reached |
| `RATE_LIMIT_QUOTA_PAUSE` | Rate Limit | User quota pause threshold reached |
| `RATE_LIMIT_QUOTA_EXHAUSTED` | Rate Limit | User quota hard stop reached |
| `RATE_LIMIT_QUOTA_WARNING` | Rate Limit | Approaching quota limit (warning) |
| `TOKEN_INVALID` | Token | Confirmation token not found or malformed |
| `TOKEN_EXPIRED` | Token | Confirmation token has expired |
| `TOKEN_ALREADY_USED` | Token | Confirmation token has already been redeemed |
| `TOKEN_SCOPE_MISMATCH` | Token | Token issued for different operation or parameters |

> **Note on `CONFIRMATION_REQUIRED` categorization:** This code is categorized under "Permission" rather than having its own category because it functions as part of the permission gating flow. The operation is denied pending user confirmation—conceptually similar to other permission denials, but with a recovery path (providing a confirmation token). Clients can treat it as a permission error that includes instructions for resolution.

### 5.2 PERMISSION_TRUST_LEVEL_INSUFFICIENT

**When used:** An operation is denied because the adapter's trust level is below the minimum required for the operation's danger level.

**Message format:** `Operation '{operation}' requires trust level '{required_trust}', adapter has '{actual_trust}'`

**Details:**
```typescript
{
  /** The operation that was attempted */
  operation: string;
  /** Trust level required for this operation */
  required_trust: 'untested' | 'generated' | 'validated' | 'community_reviewed' | 'certified';
  /** Adapter's current trust level */
  actual_trust: string;
  /** The danger level of the operation */
  danger_level?: number;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_TRUST_LEVEL_INSUFFICIENT",
    "message": "Operation 'delete_user' requires trust level 'community_reviewed', adapter has 'validated'",
    "details": {
      "operation": "delete_user",
      "required_trust": "community_reviewed",
      "actual_trust": "validated",
      "danger_level": 2
    }
  }
}
```

**Reference:** [Trust Levels Specification](./adapter/trust-levels.md)

### 5.3 PERMISSION_DANGER_LEVEL_DENIED

**When used:** An operation is denied because its danger level is too high for the adapter's trust level.

**Message format:** `Operation '{operation}' (danger: {danger_level}) denied for adapter trust level '{adapter_trust}'`

**Details:**
```typescript
{
  /** The operation that was attempted */
  operation: string;
  /** The danger level of the operation */
  danger_level: 'safe' | 'reversible' | 'destructive' | 'dangerous' | 'forbidden';
  /** Adapter's current trust level */
  adapter_trust: string;
  /** Minimum trust level required */
  minimum_trust_required: string;
  /** Reasons why this operation is dangerous */
  reasons?: string[];
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DANGER_LEVEL_DENIED",
    "message": "Operation 'bulk_delete' (danger: dangerous) denied for adapter trust level 'validated'",
    "details": {
      "operation": "bulk_delete",
      "danger_level": "dangerous",
      "adapter_trust": "validated",
      "minimum_trust_required": "community_reviewed",
      "reasons": [
        "Affects multiple resources",
        "Cannot be undone"
      ]
    }
  }
}
```

**Reference:** [Dangerous Operation Classification](./adapter/danger-levels.md)

### 5.4 CONFIRMATION_REQUIRED

**When used:** A dangerous operation requires explicit user confirmation before execution.

> **Design note:** This code is categorized under "Permission" in the registry table because it functions as a conditional permission denial—the operation is blocked until the user provides explicit confirmation. Unlike a hard permission denial (`PERMISSION_DENIED`), this error includes a `confirmation_token` that enables the client to retry the operation once user consent is obtained. This pattern aligns with the gatekeeper security model where dangerous operations require explicit user approval.

**Message format:** `This operation requires confirmation`

**Details:**
```typescript
{
  /** The operation that requires confirmation */
  operation: string;
  /** The danger level of the operation */
  danger_level: string;
  /** Human-readable reasons for the confirmation requirement */
  reasons?: string[];
  /** Custom confirmation message to display */
  confirmation_message?: string;
  /** Token to include in retry request */
  confirmation_token: string;
  /** When the confirmation token expires */
  expires_at: string;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "CONFIRMATION_REQUIRED",
    "message": "This operation requires confirmation",
    "details": {
      "operation": "delete_repo",
      "danger_level": "destructive",
      "reasons": [
        "Permanently removes repository and all contents",
        "Cannot be recovered after grace period"
      ],
      "confirmation_message": "Delete repository 'acme/widgets'? This cannot be undone.",
      "confirmation_token": "conf_abc123xyz",
      "expires_at": "2026-01-28T12:05:00Z"
    }
  }
}
```

**Reference:** [Dangerous Operation Classification](./adapter/danger-levels.md)

### 5.5 RATE_LIMIT_EXCEEDED

**When used:** The target API rate limit has been reached and requests are blocked until reset.

**Message format:** `API rate limit exceeded`

**Details:**
```typescript
{
  /** The rate limit that was exceeded */
  limit: number;
  /** Remaining requests (usually 0) */
  remaining: number;
  /** Time window of the limit */
  window: 'second' | 'minute' | 'hour' | 'day';
  /** When the rate limit resets */
  resets_at: string;
  /** Seconds until retry is allowed */
  retry_after_seconds: number;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "details": {
      "limit": 5000,
      "remaining": 0,
      "window": "hour",
      "resets_at": "2026-01-28T13:00:00Z",
      "retry_after_seconds": 1847
    }
  }
}
```

**Reference:** [Rate Limiting Specification](./adapter/rate-limiting.md)

### 5.6 RATE_LIMIT_QUOTA_PAUSE

**When used:** A user-configured quota pause threshold has been reached. The user can confirm to continue.

**Message format:** `Quota pause threshold reached`

**Details:**
```typescript
{
  /** The metric that triggered the pause */
  metric: string;
  /** Current usage */
  current: number;
  /** The pause threshold */
  pause_threshold: number;
  /** The hard stop threshold (if configured) */
  hard_stop_threshold?: number;
  /** Token to continue past the pause */
  confirmation_token: string;
  /** When the confirmation token expires */
  expires_at: string;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_QUOTA_PAUSE",
    "message": "Quota pause threshold reached",
    "details": {
      "metric": "requests_per_hour",
      "current": 4850,
      "pause_threshold": 4800,
      "hard_stop_threshold": 5000,
      "confirmation_token": "quota_continue_abc123",
      "expires_at": "2026-01-28T12:05:00Z"
    }
  }
}
```

**Reference:** [Rate Limiting Specification](./adapter/rate-limiting.md)

### 5.7 RATE_LIMIT_QUOTA_EXHAUSTED

**When used:** A user-configured quota hard stop threshold has been reached. All requests are blocked until reset.

**Message format:** `Quota exhausted`

**Details:**
```typescript
{
  /** The metric that triggered the hard stop */
  metric: string;
  /** Current usage */
  current: number;
  /** The hard stop threshold */
  hard_stop_threshold: number;
  /** When the quota resets */
  resets_at: string;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_QUOTA_EXHAUSTED",
    "message": "Quota exhausted",
    "details": {
      "metric": "requests_per_hour",
      "current": 5000,
      "hard_stop_threshold": 5000,
      "resets_at": "2026-01-28T13:00:00Z"
    }
  }
}
```

**Reference:** [Rate Limiting Specification](./adapter/rate-limiting.md)

### 5.8 RATE_LIMIT_QUOTA_WARNING

**When used:** Included in the `warnings` array of successful responses when approaching a quota limit.

> **⚠️ IMPORTANT: This is a WARNING code, not an error code.**
>
> Unlike all other codes in this section, `RATE_LIMIT_QUOTA_WARNING` appears in the `warnings` array of **successful** responses (`success: true`), not in the `error` object. The operation completes normally; this code signals an informational warning about approaching limits.
>
> See [Warnings Specification](./features/warnings.md) for details on warning handling.

**Message format:** `Approaching quota limit`

**Details:**
```typescript
{
  /** The metric approaching the limit */
  metric: string;
  /** Current usage */
  current: number;
  /** The warning threshold */
  warn_threshold: number;
  /** The pause threshold (next level) */
  pause_threshold?: number;
}
```

**Example (in successful response):**
```json
{
  "success": true,
  "data": { "...": "..." },
  "warnings": [
    {
      "code": "RATE_LIMIT_QUOTA_WARNING",
      "message": "Approaching quota limit",
      "details": {
        "metric": "requests_per_hour",
        "current": 4100,
        "warn_threshold": 4000,
        "pause_threshold": 4800
      }
    }
  ]
}
```

**Reference:** [Rate Limiting Specification](./adapter/rate-limiting.md)

### 5.9 TOKEN_INVALID

**When used:** A confirmation token was provided but could not be found in the token store or is malformed.

**Message format:** `Invalid confirmation token`

**Details:**
```typescript
{
  /** The token that was provided */
  token: string;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "Invalid confirmation token",
    "details": {
      "token": "conf_nonexistent123"
    }
  }
}
```

**Reference:** [Confirmation Token Specification](./security/confirmation-tokens.md)

### 5.10 TOKEN_EXPIRED

**When used:** A confirmation token was provided but has passed its expiration time.

**Message format:** `Confirmation token has expired`

**Details:**
```typescript
{
  /** The token that expired */
  token: string;
  /** When the token expired */
  expired_at: string;
  /** Current server time */
  current_time: string;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Confirmation token has expired",
    "details": {
      "token": "conf_abc123xyz",
      "expired_at": "2026-01-28T12:05:00Z",
      "current_time": "2026-01-28T12:07:30Z"
    }
  }
}
```

**Reference:** [Confirmation Token Specification](./security/confirmation-tokens.md)

### 5.11 TOKEN_ALREADY_USED

**When used:** A confirmation token was provided but has already been redeemed for a previous operation.

**Message format:** `Confirmation token has already been used`

**Details:**
```typescript
{
  /** The token that was already used */
  token: string;
  /** When the token was consumed */
  consumed_at?: string;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_ALREADY_USED",
    "message": "Confirmation token has already been used",
    "details": {
      "token": "conf_abc123xyz",
      "consumed_at": "2026-01-28T12:04:15Z"
    }
  }
}
```

**Reference:** [Confirmation Token Specification](./security/confirmation-tokens.md)

### 5.12 TOKEN_SCOPE_MISMATCH

**When used:** A confirmation token was provided but was issued for a different operation or with different parameters.

**Message format:** `Confirmation token scope mismatch`

**Details:**
```typescript
{
  /** The token that was provided */
  token: string;
  /** Operation the token was issued for */
  token_operation: string;
  /** Operation the client is attempting */
  requested_operation: string;
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_SCOPE_MISMATCH",
    "message": "Confirmation token scope mismatch",
    "details": {
      "token": "conf_abc123xyz",
      "token_operation": "delete_repo",
      "requested_operation": "force_push"
    }
  }
}
```

**Reference:** [Confirmation Token Specification](./security/confirmation-tokens.md)

---

## 6. HTTP Status Mapping

### 6.1 Default Mapping

The runtime maps HTTP status codes to MCP-AQL error codes:

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_INVALID_TYPE` | Bad request (default for validation errors) |
| 400 | `VALIDATION_MISSING_PARAM` | Bad request (missing required parameter) |
| 400 | `VALIDATION_UNKNOWN_PARAM` | Bad request (unknown parameter) |
| 401 | `PERMISSION_DENIED` | Authentication required |
| 403 | `PERMISSION_DENIED` | Forbidden |
| 404 | `NOT_FOUND_RESOURCE` | Not found |
| 422 | `VALIDATION_INVALID_TYPE` | Unprocessable entity |
| 500 | `INTERNAL_ERROR` | Internal server error |
| 502 | `INTERNAL_ERROR` | Bad gateway |
| 503 | `INTERNAL_ERROR` | Service unavailable |
| 504 | `INTERNAL_ERROR` | Gateway timeout |

### 6.2 Mapping Algorithm

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

## 7. Implementation Requirements

### 7.1 Error Generation

Implementations MUST:

1. Return structured errors for all failure cases
2. Include `code` and `message` fields
3. Use codes from the MVP registry
4. Provide human-readable messages

Implementations SHOULD:

1. Include `details` with contextual information
2. Preserve upstream error messages
3. Log full error context for debugging

### 7.2 Error Handling

Client implementations SHOULD:

1. Check `success` field first
2. Parse the `error` object to extract `code` and `message`
3. Use `code` field for programmatic error handling and recovery decisions
4. Display `message` field to users

### 7.3 Message Localization

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

## 8. Future Extensions

### 8.1 Additional Error Codes

Future specifications may add:

**Conflict Handling:**
- `CONFLICT_ALREADY_EXISTS` - Resource already exists
- `CONFLICT_VERSION_MISMATCH` - Optimistic locking failure (see [Request Concurrency](./versions/v1.0.0-draft.md#93-request-concurrency))

**Enhanced Validation:**
- `VALIDATION_INVALID_ENUM` - Value not in allowed enum
- `VALIDATION_OUT_OF_RANGE` - Value outside allowed range
- `VALIDATION_PATTERN_MISMATCH` - String doesn't match pattern

### 8.2 Error Code Extension Mechanism

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

### 8.3 Per-Adapter Error Overrides

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

### 8.4 Error Aggregation

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
- [Dangerous Operation Classification](./adapter/danger-levels.md)
- [Trust Levels Specification](./adapter/trust-levels.md)
- [Rate Limiting Specification](./adapter/rate-limiting.md)
- [Universal Adapter Runtime](https://github.com/MCPAQL/mcpaql-adapter/blob/develop/docs/architecture/runtime.md) (in mcpaql-adapter repo)
- [DollhouseMCP Implementation](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/298)
- GitHub Issue: [#35](https://github.com/MCPAQL/spec/issues/35)
