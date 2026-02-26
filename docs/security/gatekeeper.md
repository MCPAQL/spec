# Security Model: Gatekeeper Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-14

## Abstract

This document specifies an optional security model for MCP-AQL adapters, providing multi-layer access control, confirmation requirements, and audit capabilities.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Security Layers](#2-security-layers)
3. [Permission Model](#3-permission-model)
4. [Confirmation System](#4-confirmation-system)
5. [Audit Logging](#5-audit-logging)
6. [Implementation Requirements](#6-implementation-requirements)

---

## 1. Introduction

### 1.1 Purpose

A security layer (called "Gatekeeper" in this specification) provides centralized security enforcement for MCP-AQL operations, ensuring:

- **Authorization** - Operations are permitted for the caller
- **Safety classification** - Operations categorized by risk
- **Confirmation gates** - Destructive operations require acknowledgment
- **Audit trail** - Security-relevant events are logged

### 1.2 Status

The Gatekeeper is an **optional** feature. Adapters MAY implement it based on their security requirements.

### 1.3 Core Principle

> "LLM instructions are suggestions. Adapter policies are enforcement."

Security is enforced server-side by the adapter, not by client behavior. Clients cannot bypass security through endpoint selection or parameter manipulation.

### 1.4 Relationship to the Execution Safety Loop

The Gatekeeper can operate as a standalone security layer for individual operations, or as part of the [Execution Safety Loop](execution-safety-loop.md) — a continuous monitoring pattern where the LLM reports every intended action for safety evaluation. When deployed as a safety dongle (see [Section 2 of the Execution Safety Loop specification](execution-safety-loop.md#2-the-safety-dongle-deployment-model)), the Gatekeeper evaluates `nextActionHint` strings against configured policies, providing go/no-go directives for actions across all connected MCP servers.

---

## 2. Security Layers

### 2.1 Defense in Depth

```
┌────────────────────────────────────────────────────────┐
│                    REQUEST                             │
└────────────────────────┬───────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────┐
│  Layer 1: Route Validation                             │
│  - Operation exists?                                   │
│  - Correct endpoint (CRUDE mode)?                      │
└────────────────────────┬───────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────┐
│  Layer 2: Safety Tier                                  │
│  - Endpoint permissions (readOnly, destructive)        │
└────────────────────────┬───────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────┐
│  Layer 3: Operation Policy                             │
│  - Per-operation access rules                          │
│  - Parameter-based restrictions                        │
└────────────────────────┬───────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────┐
│  Layer 4: Confirmation                                 │
│  - Destructive operation acknowledgment                │
└────────────────────────┬───────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────┐
│                    EXECUTE                             │
└────────────────────────────────────────────────────────┘
```

### 2.2 Layer 1: Route Validation

Validates operation routing before any processing.

**Checks:**
- Operation name is recognized
- Operation is sent to correct endpoint (CRUDE mode)
- Required parameters are present

**Failure Response:**
```javascript
{
  success: false,
  error: "Operation 'create_user' must be called via mcp_aql_create, not mcp_aql_read"
}
```

### 2.3 Layer 2: Safety Tier

Applies endpoint-level safety classification.

**Endpoint Safety Matrix:**

| Endpoint | readOnly | destructive | Description |
|----------|----------|-------------|-------------|
| CREATE | false | false | Additive only |
| READ | true | false | No state changes |
| UPDATE | false | true | May overwrite data |
| DELETE | false | true | Removes data permanently |
| EXECUTE | false | true | May have external effects |

### 2.4 Layer 3: Operation Policy

Per-operation access control rules.

**Policy Structure:**
```typescript
interface OperationPolicy {
  operation: string;
  permission: Permission;
  conditions?: Condition[];
}

type Permission = 'allow' | 'deny' | 'confirm';
```

### 2.5 Layer 4: Confirmation

Final gate for destructive operations.

---

## 3. Permission Model

### 3.1 Permission Types

| Permission | Behavior |
|------------|----------|
| `allow` | Operation proceeds without additional checks |
| `deny` | Operation rejected with error |
| `confirm` | Operation requires explicit confirmation |

### 3.2 Permission Resolution

When multiple policies apply, most restrictive wins:

```
deny > confirm > allow
```

---

## 4. Confirmation System

This section provides an overview of the confirmation system. For detailed token generation, validation, and lifecycle requirements, see the [Confirmation Token Specification](./confirmation-tokens.md).

### 4.1 Confirmation Request

When confirmation is required:

```javascript
{
  success: false,
  error: "This operation requires confirmation",
  errorCode: "CONFIRMATION_REQUIRED",
  confirmation: {
    operation: "delete_user",
    message: "Are you sure you want to delete user 'alice'? This cannot be undone.",
    token: "conf_abc123"
  }
}
```

### 4.2 Confirming Operations

Client confirms by including the token:

```javascript
{
  operation: "delete_user",
  params: {
    user_id: "alice",
    _confirmation: "conf_abc123"
  }
}
```

### 4.3 Session-Scoped Confirmations

Confirmations MAY be cached per session (see [Section 2.3](../versions/v1.0.0-draft.md#23-session-lifecycle) of the core specification):
- Confirmations expire after configurable timeout
- Confirmations are scoped to specific operation
- Session end (MCP connection termination) clears all confirmations

---

## 5. Audit Logging

### 5.1 Security Events

Adapters implementing security SHOULD log:

| Event | Logged Data |
|-------|-------------|
| `OPERATION_DENIED` | Operation, reason |
| `CONFIRMATION_REQUIRED` | Operation, token |
| `CONFIRMATION_GRANTED` | Operation, token |

### 5.2 Audit Log Format

```typescript
interface AuditEntry {
  timestamp: string;
  event: string;
  operation: string;
  endpoint: CRUDEndpoint;
  result: 'allowed' | 'denied' | 'confirmed';
  reason?: string;
}
```

---

## 6. Implementation Requirements

### 6.1 MUST Requirements

Adapters implementing security MUST:

1. Enforce endpoint routing validation
2. Apply safety tier classifications
3. Return proper error codes for security failures
4. Protect against parameter manipulation

### 6.2 SHOULD Requirements

Adapters implementing security SHOULD:

1. Implement confirmation system for destructive operations
2. Maintain audit logs
3. Support policy configuration

### 6.3 MAY Requirements

Adapters implementing security MAY:

1. Support authenticated callers with different permissions
2. Provide policy administration API
3. Implement rate limiting

---

## 7. Autonomy Evaluator Integration

When the Gatekeeper operates within the [Execution Safety Loop](execution-safety-loop.md), it integrates with the Autonomy Evaluator (Section 8.7 of the core spec) to provide continuous per-action safety evaluation:

### 7.1 Gatekeeper Blocks as Notifications

When the Gatekeeper denies an operation during execution, the block is recorded and surfaced as a `permission_pending` notification in the next `AutonomyDirective` response. This allows bridge agents and remote interfaces to relay approval requests to human operators through their communication channel.

### 7.2 Policy Evaluation for `nextActionHint`

In safety dongle deployments, the Gatekeeper's Layer 3 (Operation Policy) evaluates `nextActionHint` strings against configured patterns rather than operation names. The same deny/confirm/allow semantics apply, but the input is the LLM's stated intent rather than a formal operation identifier.

### 7.3 Confirmation Flow During Execution

When the Gatekeeper returns `CONFIRMATION_REQUIRED` during an execution safety loop:

1. The `AutonomyDirective` returns `continue: false` with a `permission_pending` notification
2. The agent (or its bridge) presents the confirmation request to a human operator
3. The human approves via `confirm_operation`
4. The next `record_execution_step` call clears the notification and evaluation continues

---

## References

- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- [CRUDE Pattern Specification](../crude-pattern.md)
- [Confirmation Token Specification](./confirmation-tokens.md)
- [Execution Safety Loop Specification](./execution-safety-loop.md)
- [Danger Levels Specification](../adapter/danger-levels.md)
- [Operations Guide](../operations.md)
