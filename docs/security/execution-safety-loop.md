# Execution Safety Loop Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-02-25

> **Informative Document:** This is an informative specification that provides detailed guidance for the execution safety loop pattern defined normatively in [Section 8.6 of the core specification](../versions/v1.0.0-draft.md#86-execution-safety-loop). In case of conflict, the normative specification takes precedence.

## Abstract

This document specifies the **execution safety loop** — an opt-in monitoring pattern that enables continuous safety evaluation of an LLM's intended actions across all connected MCP servers. It also defines the **safety dongle** deployment model, where a standalone MCP-AQL server functions as a universal safety layer without implementing any other MCP-AQL features.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [The Safety Dongle Deployment Model](#2-the-safety-dongle-deployment-model)
3. [The Execution Safety Loop](#3-the-execution-safety-loop)
4. [Minimal Operation Surface](#4-minimal-operation-surface)
5. [Integration with Gatekeeper](#5-integration-with-gatekeeper)
6. [Integration with Danger Zone](#6-integration-with-danger-zone)
7. [Deployment Examples](#7-deployment-examples)
8. [Opting Out](#8-opting-out)
9. [Implementation Requirements](#9-implementation-requirements)

---

## 1. Introduction

### 1.1 Purpose

The execution safety loop addresses a fundamental challenge in LLM tool-calling environments: **how do you enforce safety policies on an LLM's actions when those actions target multiple independent MCP servers?**

Individual MCP servers can protect their own operations, but no single server has visibility into what the LLM is doing across all connected servers. The execution safety loop solves this by providing a central checkpoint that the LLM reports to before taking any action — regardless of which server handles the actual operation.

### 1.2 Status

The execution safety loop is an **optional** feature defined normatively in [Section 8.6 of the core specification](../versions/v1.0.0-draft.md#86-execution-safety-loop). This document provides informative guidance on deployment models, integration patterns, and implementation strategies.

### 1.3 Core Concept

The execution safety loop is a protocol-level monitoring pattern:

1. The LLM plans an action (any tool call, file operation, shell command, etc.)
2. The LLM reports its intent to a safety-enabled MCP-AQL server via `record_execution_step` with `nextActionHint`
3. The server evaluates the intent against its safety pipeline (Gatekeeper policies, Autonomy Evaluator, Danger Zone rules)
4. The server returns an `AutonomyDirective` — go, pause, or hard stop
5. The LLM respects the directive before proceeding

This is distinct from the full agent lifecycle that a specific adapter (like DollhouseMCP) may implement. The safety loop is purely about monitoring and evaluating — it does not manage agent state, personas, elements, or any domain-specific functionality.

### 1.4 Opt-In Design

The execution safety loop is entirely optional at every level:

- **Adapters** choose whether to support it
- **Clients** choose whether to enable it
- **Users** can disable it at any time

No adapter is required to implement the safety loop, and no client is required to use it. When disabled, the adapter operates normally without any safety enforcement overhead. See [Section 8: Opting Out](#8-opting-out) for details.

---

## 2. The Safety Dongle Deployment Model

### 2.1 What Is a Safety Dongle?

A safety dongle is a standalone MCP-AQL server whose sole purpose is safety enforcement. It has no domain functionality — it does not manage files, query databases, or interact with external services. It exists only to evaluate the LLM's intended actions and return go/no-go directives.

The name "dongle" reflects the deployment model: you plug it in alongside your existing MCP servers, and it acts as a universal firewall for all tool calls in the session.

### 2.2 Architecture

```
┌────────────────────────────────────────────────────────┐
│  MCP Client (Claude, GPT, etc.)                        │
│                                                        │
│  LLM decides to take an action                         │
│       │                                                │
│       ▼                                                │
│  1. Report intent to safety dongle                     │
│     record_execution_step {                            │
│       nextActionHint: "calling write_file on server X" │
│     }                                                  │
│       │                                                │
│       ▼                                                │
│  ┌──────────────────────────────────────────┐          │
│  │  Safety Dongle (MCP-AQL Server)          │          │
│  │                                          │          │
│  │  Gatekeeper → Autonomy Evaluator →       │          │
│  │  Danger Zone Enforcer                    │          │
│  │                                          │          │
│  │  Returns: AutonomyDirective              │          │
│  │  { continue: true/false, factors: [...] }│          │
│  └──────────────────────────────────────────┘          │
│       │                                                │
│       ▼                                                │
│  2. If continue: execute the action on target server   │
│     If !continue: pause, escalate, or abort            │
│                                                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ MCP     │  │ MCP     │  │ MCP     │               │
│  │ Server A│  │ Server B│  │ Server C│               │
│  │ (files) │  │ (db)    │  │ (slack) │               │
│  └─────────┘  └─────────┘  └─────────┘               │
└────────────────────────────────────────────────────────┘
```

### 2.3 What the Dongle Does NOT Do

A safety dongle in its minimal configuration:

- **Does not** manage elements (personas, skills, templates, agents, memories)
- **Does not** store or query domain data
- **Does not** interact with external services beyond safety evaluation
- **Does not** implement the full CRUDE pattern for domain operations
- **Does not** require introspection of other servers' capabilities

It is a purpose-built safety layer with a minimal operation surface.

### 2.4 Relationship to Full MCP-AQL Adapters

The safety dongle and a full MCP-AQL adapter are both valid configurations of the same protocol. They differ only in scope:

| Aspect | Safety Dongle | Full MCP-AQL Adapter |
|--------|--------------|---------------------|
| Purpose | Safety enforcement only | Domain operations + safety |
| Operations | ~7 (safety loop + introspection) | Dozens (full CRUDE surface) |
| Elements | None | Personas, skills, agents, etc. |
| State | Execution state + policies only | Full domain state |
| Endpoints used | CREATE, EXECUTE, READ (subset) | All five CRUDE endpoints |

A full MCP-AQL adapter MAY embed the safety loop directly — it does not need a separate dongle. The dongle model is for environments where safety enforcement is decoupled from the adapters performing the actual work.

---

## 3. The Execution Safety Loop

### 3.1 Loop Protocol

The execution safety loop follows a simple protocol:

```
┌─────────────────────────────────────┐
│                                     │
│  ┌──────────┐                       │
│  │  Plan    │  LLM determines       │
│  │  action  │  next action          │
│  └────┬─────┘                       │
│       │                             │
│       ▼                             │
│  ┌──────────┐                       │
│  │  Report  │  record_execution_step│
│  │  intent  │  { nextActionHint }   │
│  └────┬─────┘                       │
│       │                             │
│       ▼                             │
│  ┌──────────┐                       │
│  │ Evaluate │  Gatekeeper +         │
│  │          │  Autonomy Evaluator + │
│  │          │  Danger Zone          │
│  └────┬─────┘                       │
│       │                             │
│       ▼                             │
│  ┌──────────┐    ┌──────────┐       │
│  │ continue │───▶│  Act     │       │
│  │ = true   │    │  (tool   │       │
│  └──────────┘    │   call)  │       │
│                  └────┬─────┘       │
│       ┌───────────────┘             │
│       │                             │
│       ▼                             │
│  ┌──────────┐    ┌──────────┐       │
│  │ continue │───▶│  Pause / │       │
│  │ = false  │    │  Escalate│       │
│  └──────────┘    └──────────┘       │
│                                     │
└─────────────────────────────────────┘
```

**Lifecycle:**

1. **Start:** `execute_agent` — initiates the safety loop (requires explicit approval)
2. **Loop:** `record_execution_step` — report each intended action, receive directive
3. **End:** `complete_execution` (success) or `abort_execution` (abnormal termination)

### 3.2 Monitoring Scope

The execution safety loop monitors **all intended actions**, not only MCP-AQL operations on the same adapter. This includes:

- Tool calls to any MCP server in the client session
- Tool calls to non-MCP-AQL MCP servers
- Built-in client capabilities (file I/O, shell access, web requests)
- Any operation that produces effects beyond the LLM's reasoning context

This broad scope is what makes the safety dongle deployment model possible: the dongle does not need to understand or proxy the actual operations — it only needs to evaluate the LLM's description of what it intends to do.

### 3.3 The `nextActionHint` Field

The `nextActionHint` is a human-readable string describing the intended action with sufficient detail for safety evaluation. It is provided as a parameter to `record_execution_step`.

**Good `nextActionHint` examples:**

```javascript
// Specific tool call with target
"calling write_file on project/config.json to update database URL"

// Shell command with detail
"executing shell command: npm install express"

// Cross-server operation
"sending message to #general channel via Slack MCP server"

// Destructive operation
"deleting all records from staging_users table via database MCP server"

// File system operation
"reading /etc/passwd to check user configuration"
```

**Poor `nextActionHint` examples:**

```javascript
// Too vague — cannot evaluate risk
"doing something"

// No target information
"writing a file"

// Missing context for risk assessment
"running a command"
```

The quality of safety evaluation depends directly on the quality of the `nextActionHint`. LLM system prompts SHOULD instruct the model to provide specific, detailed action descriptions.

### 3.4 The `AutonomyDirective` Response

Every `record_execution_step` call returns an `AutonomyDirective` indicating whether the LLM may proceed. See [Section 8.7 of the core specification](../versions/v1.0.0-draft.md#87-autonomy-evaluation) for the full type definition.

Key fields:

| Field | Type | Description |
|-------|------|-------------|
| `continue` | boolean | Whether the LLM may proceed with the reported action |
| `factors` | string[] | Human-readable explanations of the evaluation decision |
| `stopped` | boolean | Whether the agent has been hard-blocked (Danger Zone) |
| `reason` | string | Why the agent was paused or stopped |
| `stepsRemaining` | number | Steps remaining before mandatory pause |
| `nextStepRisk` | SafetyTier | Safety tier assigned to the reported action |
| `notifications` | AgentNotification[] | Gatekeeper blocks, danger alerts, and other events |

**Decision tree:**

1. If `stopped === true` → **Hard stop.** Agent MUST cease all actions until unblocked via out-of-band verification.
2. If `continue === false` → **Pause.** Agent MUST NOT proceed. Report the pause to the user or upstream system.
3. If `continue === true` → **Proceed.** Agent MAY execute the reported action.

---

## 4. Minimal Operation Surface

### 4.1 Required Operations

A safety dongle implements a minimal set of operations:

| Operation | Endpoint | Purpose |
|-----------|----------|---------|
| `execute_agent` | EXECUTE | Start the execution safety loop |
| `record_execution_step` | CREATE | Report intended action, receive `AutonomyDirective` |
| `complete_execution` | EXECUTE | Signal normal completion of the safety loop |
| `abort_execution` | EXECUTE | Signal abnormal termination |
| `confirm_operation` | EXECUTE | Approve pending Gatekeeper blocks |
| `verify_challenge` | CREATE | Submit verification code for Danger Zone unblocking |
| `introspect` | READ | Discover available operations and capabilities |

This is 7 operations across 3 endpoints — a fraction of a full MCP-AQL adapter's surface.

### 4.2 Endpoint Classification

The endpoint placement of these operations is critical to the permission architecture:

| Endpoint | Default Permission | Operations | Rationale |
|----------|-------------------|-----------|-----------|
| READ | `AUTO_APPROVE` | `introspect` | Zero friction for discovery |
| CREATE | `CONFIRM_SESSION` | `record_execution_step`, `verify_challenge` | Approve once, then frictionless for the session |
| EXECUTE | `CONFIRM_SINGLE_USE` | `execute_agent`, `complete_execution`, `abort_execution`, `confirm_operation` | Each invocation requires explicit approval |

The key design decision: `record_execution_step` is on CREATE (not EXECUTE) because it runs on every loop cycle. If it were on EXECUTE, the client would need to either:

- **Auto-approve all EXECUTE operations** — which also auto-approves `confirm_operation`, collapsing the Gatekeeper permission architecture
- **Manually approve every loop cycle** — making the safety loop unusable in practice

By placing it on CREATE with `CONFIRM_SESSION` semantics, the user approves it once at the start of the session, and subsequent calls are frictionless. Meanwhile, `confirm_operation` stays on EXECUTE with `CONFIRM_SINGLE_USE`, preserving the permission model.

### 4.3 Permission Architecture

The CRUDE endpoint classification directly determines default friction levels:

```
READ (AUTO_APPROVE)
  └── introspect           → Zero friction

CREATE (CONFIRM_SESSION)
  ├── record_execution_step → Approve once, then frictionless
  └── verify_challenge      → Approve once, then frictionless

EXECUTE (CONFIRM_SINGLE_USE)
  ├── execute_agent         → Explicit approval each time
  ├── complete_execution    → Explicit approval each time
  ├── abort_execution       → Explicit approval each time
  └── confirm_operation     → AUTO_APPROVE override (avoids "confirm to confirm" loop)
```

> **Implementation Note:** `confirm_operation` has an `AUTO_APPROVE` override despite being on the EXECUTE endpoint. This prevents an infinite confirmation loop where confirming an operation itself requires confirmation.
>
> **Security Note:** Because `confirm_operation` is auto-approved, the LLM could theoretically call it to approve its own Gatekeeper-blocked operations without human involvement. Implementations MUST prevent self-approval — the entity confirming an operation MUST NOT be the same agent that triggered the block. Server-side controls (caller identity validation, confirmation tokens bound to a human channel, or out-of-band confirmation delivery) are required. See [Section 8.7.3](../versions/v1.0.0-draft.md#873-agent-notification-system) for the normative requirement.

---

## 5. Integration with Gatekeeper

### 5.1 How the Dongle Evaluates Actions

The safety dongle uses the same [Gatekeeper](gatekeeper.md) architecture as a full MCP-AQL adapter, but scoped to the execution safety loop:

1. **Layer 1 — Route Validation:** Verifies the operation is called via the correct CRUDE endpoint
2. **Layer 2 — Safety Tier:** Evaluates the endpoint's permission characteristics
3. **Layer 3 — Policy Evaluation:** Checks `nextActionHint` against configured policies
4. **Layer 4 — Confirmation:** Issues confirmation tokens for operations requiring acknowledgment

For the safety dongle, Layer 3 is the most important: it evaluates the LLM's stated intent against configurable patterns.

### 5.2 Policy Model

Policies control which actions are allowed, denied, or require confirmation. Policies are matched against the `nextActionHint` string using glob patterns:

```javascript
// Example policy configuration
{
  deny: [
    "drop_*",           // Block any drop operations
    "delete_all*",      // Block bulk deletions
    "*_production*",    // Block anything targeting production
    "rm -rf*"           // Block recursive force deletions
  ],
  requiresApproval: [
    "delete_*",         // Require approval for deletions
    "*force*",          // Require approval for force operations
    "deploy_*",         // Require approval for deployments
    "git push*"         // Require approval for git pushes
  ],
  autoApprove: [
    "read_*",           // Auto-approve reads
    "list_*",           // Auto-approve listings
    "get_*",            // Auto-approve getters
    "search_*"          // Auto-approve searches
  ]
}
```

**Resolution order:** `deny` > `requiresApproval` > `autoApprove` > default (evaluate via Autonomy Evaluator)

### 5.3 Notification System

When the Gatekeeper blocks an operation or the Autonomy Evaluator pauses execution, notifications are included in the `AutonomyDirective` response:

```javascript
{
  continue: false,
  reason: "Action requires approval: delete_user",
  factors: ["Pattern match: delete_* requires approval"],
  notifications: [
    {
      type: "permission_pending",
      message: "Operation 'delete_user' requires confirmation",
      metadata: {
        operation: "delete_user",
        level: "CONFIRM_SINGLE_USE"
      },
      timestamp: "2026-02-25T14:30:00Z"
    }
  ]
}
```

Notification types:

| Type | Trigger | Action Required |
|------|---------|----------------|
| `permission_pending` | Gatekeeper blocked an operation | Call `confirm_operation` to approve |
| `autonomy_pause` | Autonomy Evaluator returned `continue: false` | Human review needed |
| `danger_zone` | Danger Zone hard block triggered | Out-of-band verification required (Section 6) |

The notification system is **pull-based**: notifications are included in `record_execution_step` responses. There is no push channel — the LLM must call `record_execution_step` to discover pending events. This aligns with the MCP protocol's request-response model.

---

## 6. Integration with Danger Zone

### 6.1 Danger Level Escalation During Execution

When the Autonomy Evaluator assigns a high risk score to a `nextActionHint`, the action escalates through safety tiers defined in the [Danger Levels specification](../adapter/danger-levels.md):

| Risk Score | Tier | Behavior |
|------------|------|----------|
| 0-30 | `advisory` | Log and continue |
| 31-60 | `confirm` | Pause for human review (`continue: false`) |
| 61-85 | `verify` | Pause + create verification challenge |
| 86-100 | `danger_zone` | Hard stop + out-of-band verification |

### 6.2 Hard Stops and Out-of-Band Verification

When a `danger_zone` action is detected, the system triggers a hard stop:

1. The `AutonomyDirective` returns `stopped: true`
2. A verification challenge is generated with a cryptographically random code
3. The code is displayed through a channel **inaccessible to the AI** (OS dialog, hardware token, SMS, etc.)
4. The agent is blocked until a human provides the correct code via `verify_challenge`
5. The block persists across server restarts

See [Section 8.8 of the core specification](../versions/v1.0.0-draft.md#88-out-of-band-verification) for the full out-of-band verification protocol.

> **Security Principle:** The verification code MUST NOT appear in any MCP response, tool result, log accessible to the AI, or `_meta` field. The AI can only see the challenge ID — never the code itself. This ensures that even a prompt-injected LLM cannot self-verify.

---

## 7. Deployment Examples

### 7.1 Minimal Safety Dongle

A standalone MCP-AQL server with no domain functionality:

```javascript
// MCP client configuration
{
  mcpServers: {
    // Safety dongle — evaluates all actions
    "safety": {
      command: "mcpaql-safety-dongle",
      args: ["--policy", "./safety-policies.json"]
    },
    // Domain servers — do the actual work
    "filesystem": { command: "mcp-filesystem", args: ["/workspace"] },
    "database": { command: "mcp-postgres", args: ["--connection", "..."] },
    "slack": { command: "mcp-slack", args: ["--token", "..."] }
  }
}
```

The LLM's system prompt includes:

```
Before taking any action (tool call, file operation, shell command),
you MUST report your intent to the safety server via
record_execution_step with a detailed nextActionHint.
Only proceed if the AutonomyDirective returns continue: true.
```

### 7.2 Safety Dongle + Multiple MCP Servers

In a multi-server environment, the safety dongle monitors actions across all servers:

```
┌─────────────────────────────────────────────────┐
│  MCP Client                                     │
│                                                 │
│  ┌─────────────┐                                │
│  │ Safety      │ ◄── report ALL intended actions│
│  │ Dongle      │ ──► go/no-go directives        │
│  │ (MCP-AQL)   │                                │
│  └─────────────┘                                │
│                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │FS    │ │DB    │ │Slack │ │Git   │           │
│  │Server│ │Server│ │Server│ │Server│           │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
└─────────────────────────────────────────────────┘
```

The domain servers do not need to know about the safety dongle. They are standard MCP servers — the safety evaluation happens between the LLM and the dongle, before the LLM calls any tool on any server.

### 7.3 Full MCP-AQL Adapter with Embedded Safety

A full MCP-AQL adapter can embed the execution safety loop directly — no separate dongle needed:

```javascript
// Single adapter with full CRUDE surface + embedded safety
{
  mcpServers: {
    "dollhouse": {
      command: "dollhouse-mcp",
      args: ["--safety-mode", "enforcing"]
    }
  }
}
```

In this model, the adapter handles both domain operations (elements, personas, agents) and safety enforcement (Gatekeeper, Autonomy Evaluator, Danger Zone) in the same server. The execution safety loop is just one feature among many.

---

## 8. Opting Out

### 8.1 When to Disable

The execution safety loop may be unnecessary or undesirable in several scenarios:

- **Trusted environments:** Development machines, sandboxed containers, or testing environments where safety enforcement adds friction without benefit
- **Performance-sensitive workloads:** The loop adds latency to every action (one round-trip per tool call)
- **Simple automation:** Scripts or pipelines where the action sequence is predetermined and does not need LLM-level safety evaluation
- **User preference:** Some users may prefer to operate without safety constraints

### 8.2 How to Disable

Adapters indicate their safety loop status via introspection:

```javascript
// Safety loop actively enforcing
{ capabilities: { execution_safety_loop: "enforcing" } }

// Safety loop in monitoring mode (advisory only)
{ capabilities: { execution_safety_loop: "monitoring" } }

// Safety loop logging only (no evaluation)
{ capabilities: { execution_safety_loop: "logging" } }

// Safety loop supported but currently disabled
{ capabilities: { execution_safety_loop: "disabled" } }

// Adapter does not support the safety loop (field omitted entirely)
```

Disabling is typically done via adapter configuration:

```javascript
// Adapter startup configuration
{ safetyLoop: { mode: "disabled" } }

// Or via environment variable
// MCPAQL_SAFETY_LOOP=disabled
```

### 8.3 Partial Modes

Between full enforcement and fully disabled, adapters MAY support intermediate modes:

**Monitoring mode** (`"monitoring"`):
- Actions are evaluated by the full safety pipeline
- `AutonomyDirective` is returned with accurate `factors` and risk assessment
- `continue` is always `true` — the directive is advisory, never blocking
- `stopped` MUST NOT be set to `true`
- Useful for: observing what the safety loop would block without actually blocking, gradual rollout, policy tuning

**Logging mode** (`"logging"`):
- Actions are recorded for audit purposes
- No evaluation occurs — the safety pipeline is not invoked
- Useful for: compliance auditing, post-incident analysis, establishing baseline action patterns

---

## 9. Implementation Requirements

### 9.1 MUST Requirements

Adapters that support the execution safety loop:

- MUST expose the `execution_safety_loop` capability via introspection
- MUST implement `execute_agent`, `record_execution_step`, `complete_execution`, and `abort_execution`
- MUST return an `AutonomyDirective` on every `record_execution_step` call
- MUST respect the `continue` and `stopped` directive semantics as defined in [Section 8.6.4 of the core specification](../versions/v1.0.0-draft.md#864-continuous-enforcement)
- MUST place `record_execution_step` on the CREATE endpoint
- MUST place `execute_agent`, `complete_execution`, and `abort_execution` on the EXECUTE endpoint
- MUST NOT set `stopped: true` when operating in monitoring mode

### 9.2 SHOULD Requirements

Adapters that support the execution safety loop:

- SHOULD implement `confirm_operation` for Gatekeeper approval flows
- SHOULD implement `verify_challenge` for Danger Zone unblocking
- SHOULD support configurable policy patterns (deny, requiresApproval, autoApprove)
- SHOULD include `notifications` in `AutonomyDirective` responses
- SHOULD log all safety evaluations for audit purposes
- SHOULD support the `"monitoring"` partial mode for gradual rollout

### 9.3 MAY Requirements

Adapters that support the execution safety loop:

- MAY support the `"logging"` partial mode
- MAY support configurable risk tolerance thresholds
- MAY support step limits (`maxAutonomousSteps`)
- MAY implement pattern-based automatic danger level classification
- MAY support out-of-band verification for Danger Zone events
- MAY persist blocked agent state across server restarts

---

## Related Specifications

- [Core Specification — Section 8.6: Execution Safety Loop](../versions/v1.0.0-draft.md#86-execution-safety-loop) — Normative requirements
- [Core Specification — Section 8.7: Autonomy Evaluation](../versions/v1.0.0-draft.md#87-autonomy-evaluation) — AutonomyDirective contract and evaluation pipeline
- [Core Specification — Section 8.8: Out-of-Band Verification](../versions/v1.0.0-draft.md#88-out-of-band-verification) — Danger Zone hard stop protocol
- [Gatekeeper Specification](gatekeeper.md) — Multi-layer access control architecture
- [Danger Levels Specification](../adapter/danger-levels.md) — Risk classification and trust-to-danger gating
- [Confirmation Tokens Specification](confirmation-tokens.md) — Token protocol for operation confirmation
