# Rate Limiting and Quota Management Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-28

## Abstract

This document defines the rate limiting and quota management system for MCP-AQL adapters. Rate limits enable systems to respect API constraints, prevent runaway costs, and provide graceful degradation under load.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Rate Limits Schema](#2-rate-limits-schema)
3. [Quota Management](#3-quota-management)
4. [Enforcement Behavior](#4-enforcement-behavior)
5. [Error Codes](#5-error-codes)
6. [Introspection](#6-introspection)
7. [Implementation Requirements](#7-implementation-requirements)
8. [Future Extensions](#8-future-extensions)

---

## 1. Overview

### 1.1 Purpose

When adapters wrap external APIs:

- **APIs have rate limits** that must be respected to avoid blocking
- **Users want budgets** to control costs and usage
- **Systems need protection** against runaway API calls (especially in autonomous agent loops)
- **Graceful degradation** is preferable to hard failures

Rate limiting in MCP-AQL provides:

- **API limit awareness** - Extract and respect target API constraints
- **User-configurable quotas** - Budget controls at multiple thresholds
- **Progressive enforcement** - Warn, pause, and hard stop behaviors
- **Cost tracking** - Monitor usage for paid APIs

### 1.2 Design Principles

1. **Respect upstream limits** - Never exceed API provider constraints
2. **User control** - Configurable quotas override defaults
3. **Progressive response** - Warn before blocking
4. **Transparent status** - Quota state always queryable

### 1.3 Scope

**Included:**
- Rate limit schema for adapters
- Quota configuration
- Enforcement behaviors
- Error codes for rate limiting
- Introspection of quota status

**Deferred:**
- Cross-adapter quota aggregation
- Token-based rate limiting for LLM APIs
- Distributed rate limiting coordination

---

## 2. Rate Limits Schema

### 2.1 Schema Structure

The `rate_limits` block in adapter front matter:

```yaml
rate_limits:
  # API-defined limits (from target API documentation or headers)
  api_limits:
    - scope: global
      limit: 5000
      window: hour
    - scope: endpoint
      endpoint: "POST /search"
      limit: 30
      window: minute

  # User-configurable quotas
  quotas:
    enabled: true
    limits:
      - metric: requests_per_hour
        warn: 4000
        pause: 4800
        hard_stop: 5000
      - metric: cost_per_day
        warn: 5.00
        pause: 10.00
        hard_stop: 50.00
        currency: USD

  # Cost estimation for paid APIs
  cost:
    model: per_call
    currency: USD
    pricing:
      - endpoint: "*"
        cost_per_call: 0.001
      - endpoint: "POST /premium/*"
        cost_per_call: 0.01
```

### 2.2 api_limits Block

Declares rate limits imposed by the target API.

```typescript
interface ApiLimit {
  /**
   * Scope of the limit
   * - global: Applies to all operations
   * - endpoint: Applies to specific endpoint
   * - category: Applies to CRUDE category
   */
  scope: 'global' | 'endpoint' | 'category';

  /**
   * Endpoint pattern (when scope is 'endpoint')
   * Supports wildcards: "GET /users/*"
   */
  endpoint?: string;

  /**
   * CRUDE category (when scope is 'category')
   */
  category?: 'create' | 'read' | 'update' | 'delete' | 'execute';

  /**
   * Maximum number of requests in the window
   */
  limit: number;

  /**
   * Time window for the limit
   */
  window: 'second' | 'minute' | 'hour' | 'day';

  /**
   * Header name containing remaining requests (for runtime tracking)
   */
  remaining_header?: string;

  /**
   * Header name containing reset timestamp
   */
  reset_header?: string;
}
```

### 2.3 Common API Limit Patterns

```yaml
# GitHub API pattern
api_limits:
  - scope: global
    limit: 5000
    window: hour
    remaining_header: "X-RateLimit-Remaining"
    reset_header: "X-RateLimit-Reset"

# OpenAI pattern (tokens per minute)
api_limits:
  - scope: global
    limit: 90000
    window: minute
    metric: tokens_per_minute

# Stripe pattern (different limits by CRUDE category)
api_limits:
  - scope: category
    category: read
    limit: 100
    window: second
  - scope: category
    category: create
    limit: 25
    window: second
```

---

## 3. Quota Management

### 3.1 Quotas Block

User-configurable limits that can be stricter than API limits.

```typescript
interface QuotaConfig {
  /**
   * Whether quota enforcement is enabled
   */
  enabled: boolean;

  /**
   * Individual quota limits
   */
  limits: QuotaLimit[];

  /**
   * How to persist quota tracking
   */
  persistence?: 'memory' | 'file' | 'database';

  /**
   * When to reset counters
   */
  reset_schedule?: string;  // Cron expression
}

interface QuotaLimit {
  /**
   * What is being measured
   */
  metric: QuotaMetric;

  /**
   * Threshold for warning notification
   */
  warn: number;

  /**
   * Threshold for pause (require confirmation to continue)
   */
  pause: number;

  /**
   * Threshold for hard stop (block all requests)
   */
  hard_stop?: number;

  /**
   * Currency for cost metrics
   */
  currency?: string;
}

type QuotaMetric =
  | 'requests_per_minute'
  | 'requests_per_hour'
  | 'requests_per_day'
  | 'tokens_per_minute'
  | 'tokens_per_hour'
  | 'tokens_per_day'
  | 'cost_per_hour'
  | 'cost_per_day'
  | 'cost_per_month';
```

### 3.2 Threshold Behaviors

| Threshold | Behavior | User Experience |
|-----------|----------|-----------------|
| `warn` | Log warning, continue | Notification displayed |
| `pause` | Require confirmation | "Continue?" prompt |
| `hard_stop` | Block all requests | Error response |

### 3.3 Example Quota Configurations

**Conservative (cost-conscious):**
```yaml
quotas:
  enabled: true
  limits:
    - metric: cost_per_day
      warn: 1.00
      pause: 5.00
      hard_stop: 10.00
      currency: USD
```

**Development (permissive):**
```yaml
quotas:
  enabled: true
  limits:
    - metric: requests_per_hour
      warn: 1000
      pause: 5000
      # No hard_stop - never fully block
```

**Production (strict):**
```yaml
quotas:
  enabled: true
  limits:
    - metric: requests_per_minute
      warn: 50
      pause: 80
      hard_stop: 100
    - metric: cost_per_day
      warn: 100.00
      pause: 200.00
      hard_stop: 500.00
      currency: USD
```

---

## 4. Enforcement Behavior

### 4.1 Enforcement Flow

```
Request → Check API Limits → Check Quotas → Execute or Block
              │                    │
              ▼                    ▼
         API blocked?        Quota exceeded?
              │                    │
              ▼                    ▼
         Wait/Retry         Warn/Pause/Stop
```

### 4.2 API Limit Enforcement

When API rate limit is reached:

1. **Check remaining** - Read from response headers if available
2. **Predict limit** - Track request counts if no headers
3. **Pre-flight block** - Block request before sending if limit would be exceeded
4. **Retry-After** - Respect `Retry-After` header from API responses

**Pre-flight block response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit would be exceeded",
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

### 4.3 Quota Enforcement

**Warning (warn threshold):**
```json
{
  "success": true,
  "data": { ... },
  "warnings": [
    {
      "code": "QUOTA_WARNING",
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

**Pause (pause threshold):**
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

**Hard stop (hard_stop threshold):**
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

### 4.4 Continuing After Pause

To continue after pause threshold:

```javascript
{
  operation: "get_user",
  params: {
    user_id: "alice",
    _quota_continue: "quota_continue_abc123"
  }
}
```

---

## 5. Error Codes

### 5.1 Rate Limit Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `RATE_LIMIT_EXCEEDED` | Target API rate limit reached | Wait for reset |
| `RATE_LIMIT_QUOTA_PAUSE` | User quota pause threshold | Confirm to continue |
| `RATE_LIMIT_QUOTA_EXHAUSTED` | User quota hard stop | Wait for reset |
| `RATE_LIMIT_QUOTA_WARNING` | Approaching limit (in warnings) | Consider slowing |

### 5.2 Error Response Schema

```typescript
interface RateLimitError {
  code: string;
  message: string;
  details: {
    /** What metric triggered the limit */
    metric?: string;
    /** Current usage count/amount */
    current?: number;
    /** The limit that was exceeded */
    limit?: number;
    /** Time window of the limit */
    window?: string;
    /** When the limit resets */
    resets_at?: string;
    /** Seconds until retry is allowed */
    retry_after_seconds?: number;
    /** Token to continue after pause */
    confirmation_token?: string;
    /** When confirmation expires */
    expires_at?: string;
  };
}
```

---

## 6. Introspection

### 6.1 Quota Status Query

```javascript
{
  operation: "introspect",
  params: {
    query: "quota_status"
  }
}
```

### 6.2 Quota Status Response

```json
{
  "success": true,
  "data": {
    "adapter": "github-api",
    "api_limits": {
      "global": {
        "limit": 5000,
        "remaining": 3500,
        "window": "hour",
        "resets_at": "2026-01-28T13:00:00Z"
      }
    },
    "quotas": [
      {
        "metric": "requests_per_hour",
        "current": 1500,
        "warn": 4000,
        "pause": 4800,
        "hard_stop": 5000,
        "status": "ok"
      },
      {
        "metric": "cost_per_day",
        "current": 4.50,
        "warn": 5.00,
        "pause": 10.00,
        "hard_stop": 50.00,
        "status": "warn",
        "currency": "USD"
      }
    ],
    "next_reset": "2026-01-28T13:00:00Z"
  }
}
```

### 6.3 Status Values

| Status | Meaning |
|--------|---------|
| `ok` | Below warn threshold |
| `warn` | Above warn, below pause |
| `paused` | At pause threshold, confirmation required |
| `exhausted` | At hard stop, requests blocked |

---

## 7. Implementation Requirements

### 7.1 MUST Requirements

Implementations supporting rate limiting MUST:

1. Respect `api_limits` and not exceed target API constraints
2. Return proper error codes when limits are reached
3. Include `retry_after_seconds` when blocking requests
4. Support introspection of current quota status

### 7.2 SHOULD Requirements

Implementations supporting rate limiting SHOULD:

1. Track API response headers for remaining/reset info
2. Implement the three-tier quota system (warn/pause/hard_stop)
3. Persist quota counters across sessions
4. Provide warnings in successful responses when approaching limits

### 7.3 MAY Requirements

Implementations supporting rate limiting MAY:

1. Support cost estimation and tracking
2. Implement automatic request queuing and retry
3. Support per-operation rate limits
4. Integrate with external rate limit services

### 7.4 Cost Tracking

For adapters with cost estimation:

```yaml
cost:
  model: per_call    # per_call | per_token | per_byte | tiered
  currency: USD
  pricing:
    - endpoint: "*"
      cost_per_call: 0.001
    - endpoint: "POST /completions"
      cost_per_call: 0.002
      cost_per_token:
        input: 0.00001
        output: 0.00003
```

---

## 8. Future Extensions

### 8.1 Cross-Adapter Aggregation

For APIs with shared rate limits across endpoints:

```yaml
rate_limits:
  shared_pools:
    - name: "github_core"
      endpoints:
        - "GET /repos/*"
        - "GET /users/*"
        - "GET /orgs/*"
      limit: 5000
      window: hour
```

### 8.2 Intelligent Request Scheduling

Automatic request queuing and batching:

```yaml
rate_limits:
  scheduling:
    enabled: true
    max_queue_size: 100
    batch_similar_requests: true
    priority_by_danger_level: true
```

### 8.3 Token-Based Rate Limiting

For LLM APIs with token-based limits:

```yaml
rate_limits:
  api_limits:
    - scope: global
      metric: tokens
      limit: 90000
      window: minute
      count_method: tiktoken  # Token counting method
```

### 8.4 Budget Alerts

External notification integration:

```yaml
quotas:
  alerts:
    - trigger: warn
      action: webhook
      url: "https://alerts.example.com/budget"
    - trigger: pause
      action: email
      to: "admin@example.com"
```

### 8.5 Distributed Rate Limiting

For multi-instance deployments:

```yaml
rate_limits:
  coordination:
    backend: redis
    connection: "${REDIS_URL}"
    key_prefix: "mcpaql:ratelimit:"
```

---

## References

- [Adapter Element Type Specification](./element-type.md)
- [Error Codes Specification](../error-codes.md)
- [Trust Levels Specification](./trust-levels.md)
- GitHub Issue: [#60](https://github.com/MCPAQL/spec/issues/60)
