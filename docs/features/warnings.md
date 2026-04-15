# Warnings Array Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-04-15

## Abstract

This document specifies the warnings array extension to MCP-AQL's discriminated response format. Warnings provide a mechanism to communicate non-fatal conditions to clients within successful responses, enabling proactive notification without blocking operation execution.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Response Format Extension](#2-response-format-extension)
3. [Warning Object Schema](#3-warning-object-schema)
   - [3.2 Severity Levels](#32-severity-levels)
4. [Standard Warning Codes](#4-standard-warning-codes)
5. [Client Requirements](#5-client-requirements)
6. [Implementation Requirements](#6-implementation-requirements)
   - [6.5 Warning Deduplication](#65-warning-deduplication)

---

## 1. Overview

### 1.1 Purpose

Warnings address scenarios where:

- An operation succeeds but a condition warrants attention
- Resource limits are approaching but not exceeded
- Deprecated features are used
- Data quality issues exist but don't prevent operation
- Performance degradation may occur

Without warnings, these conditions would either:
1. **Block the operation** (too severe for the condition)
2. **Go unnoticed** (hidden from the client entirely)

### 1.2 Design Principles

1. **Non-blocking** - Warnings never prevent successful operation completion
2. **Structured** - Same format as error objects for consistency
3. **Actionable** - Each warning suggests or enables a response
4. **Combinable** - Multiple warnings can be returned in a single response
5. **Optional** - Clients MAY ignore warnings without breaking functionality

### 1.3 Relationship to Errors

| Aspect | Error | Warning |
|--------|-------|---------|
| Response success | `false` | `true` |
| Operation completed | No | Yes |
| Client action | Required | Optional |
| Blocks execution | Yes | No |
| Schema structure | `error` object | `warnings` array |

---

## 2. Response Format Extension

### 2.1 Extended Success Response

The discriminated response format (see [ADR-006](../adr/ADR-006-discriminated-responses.md)) is extended to include an optional `warnings` array:

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  warnings?: Warning[];
}

interface ErrorResponse {
  success: false;
  error: ErrorDetail;
  // Note: warnings are NOT included in error responses
}
```

### 2.2 Response Examples

**Success without warnings:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u123",
      "name": "Alice"
    }
  }
}
```

**Success with warnings:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u123",
      "name": "Alice"
    }
  },
  "warnings": [
    {
      "code": "RATE_LIMIT_QUOTA_WARNING",
      "message": "Approaching quota limit",
      "details": {
        "metric": "requests_per_hour",
        "current": 4100,
        "warn_threshold": 4000
      }
    }
  ]
}
```

**Success with multiple warnings:**
```json
{
  "success": true,
  "data": {
    "results": [ /* ... */ ]
  },
  "warnings": [
    {
      "code": "RATE_LIMIT_QUOTA_WARNING",
      "message": "Approaching quota limit",
      "details": {
        "metric": "requests_per_hour",
        "current": 4100,
        "warn_threshold": 4000
      }
    },
    {
      "code": "DEPRECATION_WARNING",
      "message": "Operation 'list_users_v1' is deprecated",
      "details": {
        "deprecated_operation": "list_users_v1",
        "replacement": "list_users",
        "removal_date": "2027-01-01"
      }
    }
  ]
}
```

### 2.3 Warnings in Error Responses

Warnings SHOULD NOT be included in error responses (`success: false`). The rationale:

1. **Clarity** - Error responses focus on the failure condition
2. **Simplicity** - Clients handle one concern at a time
3. **Semantics** - If the operation failed, pre-operation warnings are moot

If a warning condition would have applied, it will appear when the operation is retried successfully.

---

## 3. Warning Object Schema

### 3.1 Schema Definition

```typescript
interface Warning {
  /**
   * Machine-readable warning code
   * Format: CATEGORY_SPECIFIC_WARNING
   * Uses same format as error codes for consistency
   */
  code: string;

  /**
   * Human-readable warning message
   * Should be suitable for display to end users
   */
  message: string;

  /**
   * Optional structured details about the warning
   * Content varies by warning code
   */
  details?: Record<string, unknown>;

  /**
   * Optional severity level for client prioritization
   * Helps clients decide display ordering and filtering
   */
  severity?: 'low' | 'medium' | 'high';
}
```

### 3.2 Severity Levels

The optional `severity` field helps clients prioritize warnings when multiple are present:

| Level | Description | Example Use Cases |
|-------|-------------|-------------------|
| `high` | Requires immediate attention; may affect operations soon | Quota nearly exhausted, imminent deprecation removal |
| `medium` | Should be addressed but not urgent | Approaching limits, scheduled deprecation |
| `low` | Informational; can be safely deferred or filtered | Performance hints, soft deprecation notices |

**Numeric severity mapping:**

For sorting, filtering, and programmatic comparison, implementations SHOULD use this numeric mapping:

| Severity | Numeric Value | Sort Order |
|----------|--------------|------------|
| `high` | 0 | First (most urgent) |
| `medium` | 1 | Second |
| `low` | 2 | Third (least urgent) |

This mapping ensures:
- Lower numeric values indicate higher urgency (consistent with syslog and common logging frameworks)
- Implementations can store severity in databases as integers
- Threshold-based filtering is consistent (e.g., "show severity ≤ 1" means high and medium)
- Cross-implementation interoperability when comparing severity levels

**Severity guidelines for implementations:**

- Implementations MAY omit `severity` (clients should assume `medium` as default)
- Implementations SHOULD use `high` sparingly to avoid alert fatigue
- Implementations SHOULD NOT change a warning's severity between requests for the same condition

**Client handling:**

```typescript
function sortWarningsBySeverity(warnings: Warning[]): Warning[] {
  const order = { high: 0, medium: 1, low: 2 };
  return [...warnings].sort((a, b) => {
    const severityA = a.severity ?? 'medium';
    const severityB = b.severity ?? 'medium';
    return order[severityA] - order[severityB];
  });
}

function filterByMinimumSeverity(
  warnings: Warning[],
  minimum: 'low' | 'medium' | 'high'
): Warning[] {
  const threshold = { low: 2, medium: 1, high: 0 };
  const minLevel = threshold[minimum];
  return warnings.filter(w => {
    const level = threshold[w.severity ?? 'medium'];
    return level <= minLevel;
  });
}
```

### 3.3 Code Format

Warning codes follow the same naming convention as error codes:

```
CATEGORY_SPECIFIC_WARNING
```

**Rules:**
- All uppercase with underscores
- Category prefix identifies warning class
- Specific suffix describes the condition
- Codes may overlap with error codes when the condition can be either (e.g., rate limits)

### 3.4 Warning Categories

| Category | Description | Example |
|----------|-------------|---------|
| `RATE_LIMIT_` | Approaching rate/quota limits | `RATE_LIMIT_QUOTA_WARNING` |
| `DEPRECATION_` | Deprecated feature usage | `DEPRECATION_WARNING` |
| `VALIDATION_` | Data quality issues | `VALIDATION_TRUNCATED_WARNING` |
| `PERFORMANCE_` | Performance concerns | `PERFORMANCE_SLOW_QUERY_WARNING` |

---

## 4. Standard Warning Codes

### 4.1 Rate Limit Warnings

#### RATE_LIMIT_QUOTA_WARNING

**When used:** Usage is approaching a configured quota threshold.

**Message format:** `Approaching quota limit`

**Severity recommendations:**

| Condition | Severity | Rationale |
|-----------|----------|-----------|
| >90% of quota consumed | `high` | Imminent limit, requires immediate attention |
| At warn_threshold (default 80%) | `medium` | Standard warning, action advisable |

**Details:**
```typescript
{
  /** The metric approaching the limit */
  metric: string;
  /** Current usage count */
  current: number;
  /** The warning threshold */
  warn_threshold: number;
  /** The next threshold (pause or hard stop) */
  pause_threshold?: number;
  hard_stop_threshold?: number;
}
```

**Example:**
```json
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
```

**Reference:** [Rate Limiting Specification](../adapter/rate-limiting.md)

### 4.2 Deprecation Warnings

#### DEPRECATION_WARNING

**When used:** A deprecated operation, parameter, or feature was used.

**Message format:** `{feature} is deprecated`

**Severity recommendations:**

| Condition | Severity | Rationale |
|-----------|----------|-----------|
| Within 30 days of removal_date | `high` | Urgent migration required |
| More than 30 days from removal_date | `medium` | Migration advisable |
| No removal_date set (soft deprecation) | `low` | Informational, no urgency |

**Details:**
```typescript
{
  /** What is deprecated (operation, parameter, etc.) */
  type: 'operation' | 'parameter' | 'feature';
  /** Name of the deprecated item */
  deprecated_item: string;
  /** Replacement to use instead */
  replacement?: string;
  /** When the deprecated item will be removed */
  removal_date?: string;
  /** Link to migration documentation */
  migration_guide?: string;
}
```

**Example:**
```json
{
  "code": "DEPRECATION_WARNING",
  "message": "Operation 'list_users_v1' is deprecated",
  "details": {
    "type": "operation",
    "deprecated_item": "list_users_v1",
    "replacement": "list_users",
    "removal_date": "2027-01-01"
  }
}
```

### 4.3 Validation Warnings

#### VALIDATION_TRUNCATED_WARNING

**When used:** Response data was truncated due to size limits.

**Message format:** `Response truncated to {limit} items`

**Severity recommendations:**

| Condition | Severity | Rationale |
|-----------|----------|-----------|
| Significant data loss (>50% truncated) | `medium` | User may miss important data |
| Minor truncation (≤50% truncated) | `low` | Informational, pagination available |

**Details:**
```typescript
{
  /** What was truncated */
  field: string;
  /** Original count before truncation */
  original_count: number;
  /** Count after truncation */
  truncated_count: number;
  /** The limit that was applied */
  limit: number;
}
```

**Example:**
```json
{
  "code": "VALIDATION_TRUNCATED_WARNING",
  "message": "Response truncated to 100 items",
  "details": {
    "field": "results",
    "original_count": 1523,
    "truncated_count": 100,
    "limit": 100
  }
}
```

### 4.4 Performance Warnings

#### PERFORMANCE_SLOW_QUERY_WARNING

**When used:** An operation took longer than expected to complete.

**Message format:** `Operation took {duration}ms (threshold: {threshold}ms)`

**Severity recommendations:**

| Condition | Severity | Rationale |
|-----------|----------|-----------|
| >10x threshold exceeded | `high` | Severe degradation, may indicate systemic issue |
| 2-10x threshold exceeded | `medium` | Notable slowdown, optimization recommended |
| Just above threshold (<2x) | `low` | Minor performance concern |

**Details:**
```typescript
{
  /** Operation that was slow */
  operation: string;
  /** Actual duration in milliseconds */
  duration_ms: number;
  /** Threshold that was exceeded */
  threshold_ms: number;
  /** Suggestions for improvement */
  suggestions?: string[];
}
```

**Example:**
```json
{
  "code": "PERFORMANCE_SLOW_QUERY_WARNING",
  "message": "Operation took 5230ms (threshold: 1000ms)",
  "details": {
    "operation": "search_all",
    "duration_ms": 5230,
    "threshold_ms": 1000,
    "suggestions": [
      "Consider adding filters to narrow results",
      "Use pagination for large result sets"
    ]
  }
}
```

---

## 5. Client Requirements

### 5.1 Processing Warnings

Clients MUST:

1. **Accept warnings gracefully** - Responses with warnings are valid successful responses
2. **Not fail on unknown codes** - New warning codes may be added

Clients SHOULD:

1. **Log warnings** - Record warnings for monitoring and debugging
2. **Display warnings to users** - Make warnings visible when appropriate
3. **Surface quota warnings** - Rate limit warnings warrant user attention

Clients MAY:

1. **Take automated action** - Adjust behavior based on warning codes
2. **Filter warnings** - Suppress warnings that aren't relevant
3. **Aggregate warnings** - Combine similar warnings for display

### 5.2 Client Handling Algorithm

```typescript
function handleResponse<T>(response: SuccessResponse<T> | ErrorResponse): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  // Process warnings if present
  if (response.warnings && response.warnings.length > 0) {
    for (const warning of response.warnings) {
      // Log all warnings
      logger.warn(`[${warning.code}] ${warning.message}`, warning.details);

      // Take action on specific warnings
      if (warning.code === 'RATE_LIMIT_QUOTA_WARNING') {
        displayQuotaWarning(warning);
      }
    }
  }

  return response.data;
}
```

### 5.3 Display Guidelines

When displaying warnings to users:

| Warning Category | Display Recommendation |
|-----------------|------------------------|
| `RATE_LIMIT_` | Prominent, real-time indicator |
| `DEPRECATION_` | One-time notification per session |
| `VALIDATION_` | Inline with affected data |
| `PERFORMANCE_` | Status bar or background notification |

---

## 6. Implementation Requirements

### 6.1 MUST Requirements

Implementations supporting warnings MUST:

1. Include `warnings` only in successful responses (`success: true`)
2. Use array format even for single warnings
3. Include `code` and `message` in all warning objects
4. Use consistent warning codes within the adapter

### 6.2 SHOULD Requirements

Implementations supporting warnings SHOULD:

1. Include `details` with contextual information
2. Use standard warning codes when applicable
3. Limit warnings to actionable conditions
4. Aggregate similar warnings rather than repeating

### 6.3 MAY Requirements

Implementations supporting warnings MAY:

1. Allow clients to suppress specific warning codes
2. Provide warning history via introspection
3. Configure warning thresholds
4. Include warnings in audit logs

### 6.4 Warning Limits

To prevent response bloat:

- Implementations SHOULD limit warnings to 10 per response
- If more warnings apply, implementations SHOULD include the most important
- Implementations MAY include a meta-warning about suppressed warnings

### 6.5 Warning Deduplication

Duplicate warnings (same `code` and semantically equivalent `details`) can occur when multiple subsystems generate the same warning or when batch operations trigger repeated conditions.

#### Server-Side Deduplication

Implementations SHOULD deduplicate warnings before including them in responses:

1. **Exact duplicates** - Warnings with identical `code` and `details` SHOULD be collapsed to a single instance
2. **Semantic duplicates** - Warnings with the same `code` but minor variations in `details` (e.g., same metric at same threshold) MAY be collapsed
3. **Counting** - When deduplicating, implementations MAY add an `occurrence_count` field to indicate how many times the warning occurred

**Example with occurrence count:**
```json
{
  "code": "VALIDATION_TRUNCATED_WARNING",
  "message": "Response truncated to 100 items",
  "details": {
    "field": "results",
    "truncated_count": 100,
    "occurrence_count": 3
  }
}
```

#### Client-Side Deduplication

Clients MAY implement additional deduplication when:

1. **Session-level deduplication** - Suppress warnings already shown in the current session (a session is the lifetime of a single MCP connection; see [Section 2.3](../versions/v1.0.0-draft.md#23-session-lifecycle))
2. **Time-based deduplication** - Suppress warnings seen within a configurable window (e.g., 5 minutes)
3. **Code-based filtering** - Allow users to dismiss specific warning codes

**Client deduplication example:**
```typescript
class WarningDeduplicator {
  private seen = new Map<string, number>(); // code -> timestamp
  private deduplicationWindowMs = 5 * 60 * 1000; // 5 minutes

  shouldShow(warning: Warning): boolean {
    const key = `${warning.code}:${JSON.stringify(warning.details)}`;
    const lastSeen = this.seen.get(key);
    const now = Date.now();

    if (lastSeen && now - lastSeen < this.deduplicationWindowMs) {
      return false; // Suppress duplicate
    }

    this.seen.set(key, now);
    return true;
  }
}
```

#### Deduplication Recommendations

| Context | Recommendation |
|---------|----------------|
| Single request | Server SHOULD deduplicate identical warnings |
| Batch operations | Server SHOULD collapse per-item warnings into summary |
| Client session | Client MAY deduplicate across requests |
| Long-running clients | Client SHOULD use time-based expiration |

---

## References

- [ADR-006: Discriminated Response Format](../adr/ADR-006-discriminated-responses.md)
- [Error Codes Specification](../error-codes.md)
- [Rate Limiting Specification](../adapter/rate-limiting.md)
- GitHub Issue: [#80](https://github.com/MCPAQL/spec/issues/80)
