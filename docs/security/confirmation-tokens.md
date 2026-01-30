# Confirmation Token Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-28

## Abstract

This document specifies the confirmation token mechanism used by MCP-AQL adapters to gate dangerous operations and quota continuations. Confirmation tokens provide a secure, time-limited method for clients to acknowledge and proceed with operations that require explicit consent.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Token Format](#2-token-format)
3. [Token Generation](#3-token-generation)
4. [Token Validation](#4-token-validation)
5. [Token Lifecycle](#5-token-lifecycle)
6. [Security Considerations](#6-security-considerations)
7. [Implementation Requirements](#7-implementation-requirements)

---

## 1. Overview

### 1.1 Purpose

Confirmation tokens serve as cryptographic proof that a client has acknowledged a warning and explicitly consents to proceed with a gated operation. They are used in two primary contexts:

- **Dangerous operation confirmation** - Operations requiring explicit consent due to their danger level (see [Dangerous Operation Classification](../adapter/danger-levels.md))
- **Quota continuation** - Proceeding past soft quota limits (see [Rate Limiting Specification](../adapter/rate-limiting.md))

### 1.2 Design Principles

1. **Single-use by default** - Tokens SHOULD be consumed upon successful use
2. **Time-bounded** - Tokens MUST have an expiration time
3. **Scope-bound** - Tokens are tied to a specific operation and parameters
4. **Tamper-resistant** - Tokens cannot be forged or modified by clients
5. **Auditable** - Token issuance and redemption are logged

### 1.3 Token Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│ Gatekeeper      │
│ (confirmation   │
│  required)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     Token + Expiry
│ Issue Token     │─────────────────────► Client
└─────────────────┘

Client Retry (with token)
      │
      ▼
┌─────────────────┐
│ Validate Token  │
│ (scope, expiry, │
│  single-use)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execute         │
│ Operation       │
└─────────────────┘
```

---

## 2. Token Format

### 2.1 Token Structure

Tokens are opaque strings with a prefix indicating their purpose:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `conf_` | Dangerous operation confirmation | `conf_a1b2c3d4e5f6g7h8` |
| `quota_continue_` | Quota pause continuation | `quota_continue_def456` |

### 2.2 Token Syntax

```
token = prefix "_" identifier
prefix = "conf" | "quota_continue"
identifier = 1*64(ALPHA / DIGIT / "_" / "-")
```

**Constraints:**
- Total token length: 8-80 characters
- Identifier: URL-safe characters only (alphanumeric, underscore, hyphen)
- Case-sensitive

### 2.3 Token Payload (Internal)

While tokens are opaque to clients, implementations SHOULD encode or reference:

```typescript
interface TokenPayload {
  /** Token identifier - the full token string including prefix (e.g., 'conf_abc123xyz789') */
  id: string;

  /** Purpose of the token */
  type: 'confirmation' | 'quota_continue';

  /** Operation this token gates */
  operation: string;

  /** Hash of bound parameters (prevents parameter tampering) */
  params_hash: string;

  /** Adapter that issued the token */
  adapter_name: string;

  /** Issuance timestamp (ISO 8601) */
  issued_at: string;

  /** Expiration timestamp (ISO 8601) */
  expires_at: string;

  /** Whether token has been used */
  consumed: boolean;

  /** Additional context for audit */
  context?: {
    danger_level?: string;
    quota_metric?: string;
    reasons?: string[];
  };
}
```

---

## 3. Token Generation

### 3.1 Entropy Requirements

Token identifiers MUST be generated with sufficient entropy to prevent guessing:

| Requirement | Specification |
|-------------|---------------|
| Minimum entropy | 128 bits |
| Recommended | 256 bits |
| Source | Cryptographically secure random number generator (CSPRNG) |

**Acceptable generation methods:**
- `crypto.randomBytes(16).toString('hex')` (Node.js)
- `secrets.token_hex(16)` (Python)
- `uuid.uuid4().hex` (UUID v4, 122 bits entropy)

**Unacceptable methods:**
- Sequential counters
- Timestamps alone
- `Math.random()` or similar non-cryptographic PRNGs

### 3.2 Scope Binding

Tokens MUST be bound to the specific operation and parameters they gate.

**Hash algorithm:** Implementations SHOULD use SHA-256 or stronger for parameter binding. The hash MUST be computed over a canonicalized representation of the critical parameters.

```javascript
// Token issuance binds to operation + critical parameters
// Hash algorithm: SHA-256 or stronger
const paramsHash = sha256({
  operation: "delete_repo",
  owner: "acme",
  repo: "widgets"
});

const token = {
  id: generateTokenId(),
  operation: "delete_repo",
  params_hash: paramsHash,
  // ...
};
```

**Critical parameters** are those that affect the operation's impact:
- Resource identifiers (IDs, names, paths)
- Scope modifiers (`force`, `permanent`, `recursive`)
- NOT metadata like timestamps or request IDs

### 3.3 Token Response Format

When issuing a confirmation token:

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
      "confirmation_token": "conf_a1b2c3d4e5f6g7h8",
      "expires_at": "2026-01-28T12:05:00Z"
    }
  }
}
```

---

## 4. Token Validation

### 4.1 Validation Checks

Token validation MUST perform all of the following checks:

| Check | Error Code | Description |
|-------|------------|-------------|
| Token exists | `TOKEN_INVALID` | Token ID not found in store |
| Not expired | `TOKEN_EXPIRED` | Current time > expires_at |
| Not consumed | `TOKEN_ALREADY_USED` | Token already redeemed |
| Operation matches | `TOKEN_SCOPE_MISMATCH` | Token issued for different operation |
| Parameters match | `TOKEN_SCOPE_MISMATCH` | Critical parameters changed |
| Adapter matches | `TOKEN_SCOPE_MISMATCH` | Token issued by different adapter |

### 4.2 Validation Response (Failure)

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Confirmation token has expired",
    "details": {
      "token": "conf_a1b2c3d4e5f6g7h8",
      "expired_at": "2026-01-28T12:05:00Z",
      "current_time": "2026-01-28T12:07:30Z"
    }
  }
}
```

### 4.3 Parameter Hash Verification

When validating, recompute the parameter hash and compare:

```javascript
function validateToken(token, operation, params) {
  const stored = tokenStore.get(token);
  if (!stored) return { valid: false, code: 'TOKEN_INVALID' };

  // Check operation match
  if (stored.operation !== operation) {
    return { valid: false, code: 'TOKEN_SCOPE_MISMATCH' };
  }

  // Recompute and compare parameter hash
  const currentHash = hashCriticalParams(operation, params);
  if (stored.params_hash !== currentHash) {
    return { valid: false, code: 'TOKEN_SCOPE_MISMATCH' };
  }

  // Check expiry (with optional clock skew tolerance, see Section 5.1)
  const expiryResult = checkTokenExpiry(stored, config);
  if (!expiryResult.valid) {
    return expiryResult;
  }

  // Check consumption
  if (stored.consumed) {
    return { valid: false, code: 'TOKEN_ALREADY_USED' };
  }

  return { valid: true };
}
```

---

## 5. Token Lifecycle

### 5.1 Expiration

Token expiration MUST be enforced:

| Context | Default TTL | Maximum TTL |
|---------|-------------|-------------|
| Dangerous operation (destructive/dangerous - levels 2-3) | 5 minutes | 15 minutes |
| Dangerous operation (forbidden - level 4) | 2 minutes | 5 minutes |
| Quota continuation | 5 minutes | 10 minutes |

Danger level values reference the danger level enum from [Dangerous Operation Classification](../adapter/danger-levels.md): safe (0), reversible (1), destructive (2), dangerous (3), forbidden (4).

**Expiration is a MUST requirement:**
- Tokens without expiration MUST be rejected
- Expired tokens MUST NOT be accepted under any circumstances
- Clock skew tolerance: implementations MAY allow up to 30 seconds grace (see below)

**Clock skew tolerance configurability:**

Implementations SHOULD allow operators to configure the clock skew tolerance value:

| Setting | Default | Range | Notes |
|---------|---------|-------|-------|
| `clock_skew_tolerance_seconds` | 30 | 0-300 | 0 disables tolerance |

**Configuration guidance:**
- The default of 30 seconds accommodates typical NTP-synchronized systems
- Environments with known clock synchronization issues (e.g., air-gapped systems, certain IoT deployments) MAY need higher values
- Security-sensitive deployments MAY reduce this to 0-5 seconds
- Values above 60 seconds SHOULD trigger a warning in logs, as they significantly increase the window for replay attacks

**Example configuration:**
```javascript
const tokenConfig = {
  // Default: 30 seconds
  clock_skew_tolerance_seconds: 30,

  // Strict mode for high-security environments
  // clock_skew_tolerance_seconds: 5,

  // Relaxed mode for environments with clock sync issues
  // clock_skew_tolerance_seconds: 120,
};
```

**Applying tolerance in validation:**

The tolerance is added to the expiry time, accepting tokens that expired within the tolerance window:

```javascript
function checkTokenExpiry(stored, config) {
  const now = new Date();
  const expiresAt = new Date(stored.expires_at);

  // Add tolerance to expiry time (not subtract from current time)
  // This accepts tokens expired within the tolerance window
  const toleranceMs = (config.clock_skew_tolerance_seconds || 30) * 1000;
  const expiryWithTolerance = new Date(expiresAt.getTime() + toleranceMs);

  if (now > expiryWithTolerance) {
    return { valid: false, code: 'TOKEN_EXPIRED' };
  }

  return { valid: true };
}
```

### 5.2 Single-Use Enforcement

Tokens SHOULD be single-use by default:

```javascript
function redeemToken(tokenId) {
  const token = tokenStore.get(tokenId);
  if (!token || token.consumed) {
    return { valid: false };
  }

  // Mark as consumed BEFORE executing operation
  token.consumed = true;
  token.consumed_at = new Date().toISOString();
  tokenStore.update(token);

  return { valid: true };
}
```

**Multi-use tokens** MAY be supported for specific scenarios:
- Session-scoped confirmations (see Section 5.4)
- Batch operations with the same parameters

### 5.3 Revocation

Tokens MAY be revoked before expiration:

**Automatic revocation triggers:**
- Session termination
- User logout
- Adapter configuration change
- Security event detection

**Manual revocation:**
```javascript
{
  operation: "introspect",
  params: {
    query: "revoke_token",
    token: "conf_a1b2c3d4e5f6g7h8"
  }
}
```

### 5.4 Session-Scoped Tokens

Implementations MAY support session-scoped confirmations for improved UX:

```typescript
interface SessionScopedToken extends TokenPayload {
  /** Session this token is valid for */
  session_id: string;

  /** Number of times token can be used (default: 1) */
  max_uses?: number;

  /** Current use count */
  use_count: number;
}
```

Session tokens:
- Are invalidated when the session ends
- MAY be reused within the session for identical operations
- MUST still respect expiration time

### 5.5 Storage Requirements

| Requirement | Specification |
|-------------|---------------|
| Persistence | At minimum, in-memory with TTL eviction |
| Cleanup | Expired tokens SHOULD be purged within 1 hour |
| Capacity | SHOULD support at least 1000 active tokens per adapter |

---

## 6. Security Considerations

### 6.1 Replay Attack Prevention

Tokens MUST NOT be replayable:

1. **Single-use enforcement** - Default behavior prevents replay
2. **Scope binding** - Token only valid for original operation + parameters
3. **Time limits** - Short TTL reduces replay window
4. **Session binding** - Optional additional protection

### 6.2 Token Tampering

Tokens MUST be tamper-resistant:

**Server-side storage (RECOMMENDED):**
- Token ID is a random lookup key
- All payload data stored server-side
- Client cannot modify scope or expiration

**Signed tokens (ALTERNATIVE):**
- If tokens encode payload, use HMAC-SHA256 or similar
- Signature covers all payload fields
- Signature key MUST NOT be exposed to clients

### 6.3 Information Disclosure

Token responses SHOULD limit information disclosure:

**DO:**
- Provide confirmation message explaining the action
- Include expiration time
- List reasons for confirmation requirement

**DO NOT:**
- Include internal system details in token
- Expose parameter values in error messages for failed validation
- Return different errors for "token not found" vs "token invalid"

### 6.4 Audit Requirements

All token operations MUST be logged:

```typescript
interface TokenAuditEntry {
  timestamp: string;
  event: 'TOKEN_ISSUED' | 'TOKEN_VALIDATED' | 'TOKEN_REJECTED' | 'TOKEN_REVOKED';
  token_id: string;
  operation: string;
  adapter_name: string;
  outcome: 'success' | 'failure';
  failure_reason?: string;
  client_context?: {
    session_id?: string;
    user_id?: string;
  };
}
```

### 6.5 Rate Limiting Token Requests

Implementations SHOULD rate limit token-related operations to prevent abuse:

- Token issuance: Limit repeated CONFIRMATION_REQUIRED responses
- Token validation: Limit failed validation attempts
- Token revocation: Limit revocation requests

---

## 7. Implementation Requirements

### 7.1 MUST Requirements

Implementations using confirmation tokens MUST:

1. Generate tokens with at least 128 bits of entropy from a cryptographically secure random source
2. Enforce expiration times on all tokens
3. Bind tokens to specific operations and critical parameters
4. Reject tokens that fail any validation check
5. Log token issuance and redemption events
6. Return appropriate error codes for token failures

### 7.2 SHOULD Requirements

Implementations using confirmation tokens SHOULD:

1. Use single-use tokens by default
2. Store token state server-side (not in the token itself)
3. Purge expired tokens within 1 hour
4. Support token revocation
5. Rate limit token-related operations

### 7.3 MAY Requirements

Implementations using confirmation tokens MAY:

1. Support session-scoped tokens for improved UX
2. Support multi-use tokens for batch scenarios
3. Implement signed tokens for stateless validation
4. Provide introspection queries for token status

---

## References

- [Dangerous Operation Classification](../adapter/danger-levels.md) - Confirmation flows for danger levels
- [Rate Limiting Specification](../adapter/rate-limiting.md) - Quota continuation tokens
- [Security Model: Gatekeeper](./gatekeeper.md) - Overall security architecture
- [Error Codes Specification](../error-codes.md) - Error code registry
