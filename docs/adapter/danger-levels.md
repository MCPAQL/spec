# Dangerous Operation Classification Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-28

## Abstract

This document defines a standard classification system for dangerous operations in MCP-AQL adapters. Danger levels enable automatic lockdown of high-risk actions, consistent confirmation requirements, and trust-based permission gating.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Danger Level Enum](#2-danger-level-enum)
3. [Operation Schema](#3-operation-schema)
4. [Trust-to-Danger Gating](#4-trust-to-danger-gating)
5. [Automatic Lockdown](#5-automatic-lockdown)
6. [Standard Dangerous Patterns](#6-standard-dangerous-patterns)
7. [Implementation Requirements](#7-implementation-requirements)
8. [Future Extensions](#8-future-extensions)

---

## 1. Overview

### 1.1 Purpose

MCP-AQL adapters expose operations that can have significant consequences:

- **Data modification** - Creating, updating, or deleting resources
- **Irreversible actions** - Operations that cannot be undone
- **Bulk operations** - Actions affecting multiple resources
- **System-level changes** - Configuration or access modifications

Danger levels provide a standardized framework for:

- **Risk classification** - Categorize operations by potential harm
- **Confirmation requirements** - Require acknowledgment for risky actions
- **Trust-based gating** - Restrict operations based on adapter trust level
- **Consistent UX** - Uniform handling across different adapters

### 1.2 Design Principles

1. **Safe by default** - Operations without classification treated as potentially dangerous
2. **Explicit classification** - Adapter authors declare danger levels
3. **Progressive escalation** - Higher danger requires stronger safeguards
4. **Auditable decisions** - All dangerous operation attempts logged

### 1.3 Inspiration

This specification is inspired by:

- Claude Code's dangerous git operation handling (force push, hard reset)
- Database permission systems (SELECT vs DELETE vs DROP)
- Unix file permissions (read, write, execute escalation)

### 1.4 Relationship to Trust Levels

Danger levels work in conjunction with trust levels (see [Trust Levels](./trust-levels.md)):

- **Trust levels** describe adapter reliability (who vouches for it)
- **Danger levels** describe operation risk (what harm could occur)
- **Gating matrix** combines both to determine if operation is permitted

---

## 2. Danger Level Enum

### 2.1 Danger Level Values

| Level | Value | Name | Behavior |
|-------|-------|------|----------|
| 0 | `safe` | Safe | No restrictions |
| 1 | `reversible` | Reversible | Standard confirmation |
| 2 | `destructive` | Destructive | Enhanced confirmation |
| 3 | `dangerous` | Dangerous | Explicit unlock required |
| 4 | `forbidden` | Forbidden | Blocked unless admin override |

### 2.2 Level Descriptions

#### 2.2.1 safe (Level 0)

Operations that cannot cause harm and are always permitted.

**Characteristics:**
- Read-only operations
- No state modification
- No external effects
- Fully reversible (N/A - no changes made)

**Examples:**
- List resources
- Get resource details
- Search operations
- Introspection queries

#### 2.2.2 reversible (Level 1)

Operations that modify state but whose effects can typically be undone.

**Characteristics:**
- Creates new resources
- Modifies existing data
- Changes are typically reversible
- Affects single resources

**Examples:**
- Create a new record
- Update existing fields
- Add permissions
- Enable features

#### 2.2.3 destructive (Level 2)

Operations that remove or significantly alter data, requiring enhanced confirmation.

**Characteristics:**
- Deletes resources
- Overwrites data
- May affect dependent resources
- Partially reversible (with effort)

**Examples:**
- Delete a single resource
- Overwrite file contents
- Remove permissions
- Archive/disable resources

#### 2.2.4 dangerous (Level 3)

Operations that can cause significant harm and require explicit unlock.

**Characteristics:**
- Bulk modifications
- Bypasses safety checks
- Affects multiple resources
- Difficult or impossible to reverse

**Examples:**
- Force push (overwrites history)
- Bulk delete operations
- Override safety validations
- Clear audit logs

#### 2.2.5 forbidden (Level 4)

Operations that should never be performed without administrator override.

**Characteristics:**
- Catastrophic potential
- System-wide impact
- Cannot be undone
- Production environment risks

**Examples:**
- Drop database/table
- Delete all records
- Reset to factory state
- Production data mutations
- Truncate operations

---

## 3. Operation Schema

### 3.1 Danger Metadata in Operations

Operations declare danger level in their schema:

```yaml
operations:
  delete:
    - name: delete_repo
      maps_to: "DELETE /repos/{owner}/{repo}"
      description: "Permanently delete a repository"
      danger:
        level: destructive
        reasons:
          - "Permanently removes repository and all contents"
          - "Cannot be recovered after grace period"
          - "Affects forks and dependent projects"
        confirmation_message: "Delete repository '{owner}/{repo}'? This cannot be undone."
        cooldown_seconds: 5
```

### 3.2 Danger Block Schema

```typescript
interface DangerMetadata {
  /**
   * Danger level (0-4)
   * Default: inferred from CRUDE category
   */
  level: 'safe' | 'reversible' | 'destructive' | 'dangerous' | 'forbidden';

  /**
   * Human-readable explanations of why this is dangerous
   */
  reasons?: string[];

  /**
   * Custom confirmation message template
   * Supports {param} interpolation
   */
  confirmation_message?: string;

  /**
   * Minimum seconds between confirmation and execution
   * Gives user time to reconsider
   */
  cooldown_seconds?: number;

  /**
   * Requires re-authentication before execution
   */
  requires_reauth?: boolean;

  /**
   * Additional context for audit logging
   */
  audit_context?: string[];
}
```

### 3.3 Default Danger Levels by CRUDE Category

When `danger.level` is not specified, defaults are inferred:

| CRUDE Category | Default Danger Level | Rationale |
|----------------|---------------------|-----------|
| Read | `safe` (0) | No state modification |
| Create | `reversible` (1) | Adds data, reversible by delete |
| Update | `reversible` (1) | Modifies data, often reversible |
| Delete | `destructive` (2) | Removes data |
| Execute | `reversible` (1) | Depends on operation |

Adapter authors SHOULD override defaults when operations are more dangerous than the category default suggests.

### 3.4 Introspection Response

Danger metadata is available via introspection:

```javascript
{
  operation: "introspect",
  params: { query: "operations", name: "force_delete" }
}

// Response
{
  success: true,
  data: {
    name: "force_delete",
    endpoint: "DELETE",
    danger: {
      level: "dangerous",
      reasons: [
        "Bypasses soft-delete protection",
        "Cannot be undone",
        "Affects dependent resources"
      ],
      confirmation_message: "This will permanently delete {resource} and all dependent data."
    }
  }
}
```

---

## 4. Trust-to-Danger Gating

This section defines the canonical gating matrix that combines adapter trust levels with operation danger levels. For trust level definitions and promotion rules, see [Trust Levels Specification](./trust-levels.md).

### 4.1 Gating Matrix

The combination of adapter trust level and operation danger level determines behavior:

| Danger Level | untested | generated | validated | community_reviewed | certified |
|--------------|----------|-----------|-----------|-------------------|-----------|
| safe (0) | introspect_only | allow | allow | allow | allow |
| reversible (1) | deny | deny | allow | allow | allow |
| destructive (2) | deny | deny | confirm | allow | allow |
| dangerous (3) | deny | deny | deny | confirm | allow |
| forbidden (4) | deny | deny | deny | deny | confirm |

### 4.2 Behavior Definitions

| Behavior | Description |
|----------|-------------|
| `allow` | Operation executes without additional gates |
| `confirm` | Operation requires explicit user confirmation |
| `deny` | Operation blocked with error response |
| `introspect_only` | Only introspection operations permitted; all other operations (including safe ones) are blocked |

### 4.3 Confirmation Flow

When confirmation is required, the adapter issues a confirmation token that the client must include in a retry request. See [Confirmation Token Specification](../security/confirmation-tokens.md) for token generation, validation, and lifecycle requirements.

**Step 1: Initial Request**
```javascript
{
  operation: "delete_repo",
  params: { owner: "acme", repo: "widgets" }
}
```

**Step 2: Confirmation Required Response**
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

**Step 3: Confirmed Request**
```javascript
{
  operation: "delete_repo",
  params: {
    owner: "acme",
    repo: "widgets",
    _confirmation: "conf_abc123xyz"
  }
}
```

### 4.4 Denial Response

When an operation is denied due to trust/danger mismatch:

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

> **Note:** The `PERMISSION_DANGER_LEVEL_DENIED` error code is introduced by this specification and should be added to the [Error Codes Specification](../error-codes.md) as a future extension under the `PERMISSION_` category.

---

## 5. Automatic Lockdown

### 5.1 Pattern-Based Classification

Systems SHOULD automatically classify operations based on naming patterns:

```yaml
# Gatekeeper configuration
danger_patterns:
  dangerous:
    - "force_*"           # Force operations
    - "*_permanently"     # Permanent actions
    - "bulk_delete*"      # Bulk deletion
    - "override_*"        # Safety overrides
    - "bypass_*"          # Validation bypass

  forbidden:
    - "drop_*"            # Drop database/table
    - "delete_all*"       # Delete all records
    - "truncate_*"        # Truncate operations
    - "reset_*"           # Reset to factory
    - "destroy_*"         # Destroy operations
```

**Pattern precedence:** When an operation matches multiple patterns at different danger levels, the **highest** danger level applies. For example, `force_delete_all` matches both `force_*` (dangerous, level 3) and `delete_all*` (forbidden, level 4), so it defaults to `forbidden`.

### 5.2 Lockdown Behavior

When an operation matches a dangerous pattern:

1. **Classification** - Operation tagged with inferred danger level
2. **Warning** - LLM/user warned of danger classification
3. **Confirmation** - Appropriate confirmation level applied
4. **Audit** - Operation attempt logged regardless of outcome

### 5.3 Override Mechanism

Explicit danger declarations in the adapter schema override pattern matching:

```yaml
operations:
  execute:
    - name: force_sync
      maps_to: "POST /sync?force=true"
      description: "Force synchronization (safe, just skips cache)"
      danger:
        level: safe  # Overrides pattern match for "force_*"
        reasons:
          - "Force flag only bypasses cache, no data risk"
```

---

## 6. Standard Dangerous Patterns

### 6.1 Level 3 (Dangerous) Patterns

Operations matching these patterns SHOULD default to `dangerous`:

| Pattern | Description | Examples |
|---------|-------------|----------|
| `force_*` | Force operations bypassing safety | `force_push`, `force_delete` |
| `*_permanently` | Permanent/irreversible actions | `remove_permanently` |
| `bulk_delete*` | Mass deletion operations | `bulk_delete_users` |
| `override_*` | Safety override operations | `override_validation` |
| `bypass_*` | Validation bypass | `bypass_approval` |
| `*_without_backup` | Operations skipping backup | `delete_without_backup` |
| `purge_*` | Purge/clean operations | `purge_logs`, `purge_cache` |

### 6.2 Level 4 (Forbidden) Patterns

Operations matching these patterns SHOULD default to `forbidden`:

| Pattern | Description | Examples |
|---------|-------------|----------|
| `drop_*` | Drop database/table/collection | `drop_table`, `drop_database` |
| `delete_all*` | Delete all records | `delete_all_users` |
| `truncate_*` | Truncate operations | `truncate_table` |
| `reset_*` | Reset to empty/factory state | `reset_database` |
| `destroy_*` | Complete destruction | `destroy_environment` |
| `wipe_*` | Wipe operations | `wipe_data` |
| `*_production` | Production mutations | `deploy_production` |

### 6.3 Safe Patterns

Operations matching these patterns are confirmed `safe`:

| Pattern | Description | Examples |
|---------|-------------|----------|
| `get_*` | Retrieve single resource | `get_user`, `get_repo` |
| `list_*` | List resources | `list_repos`, `list_users` |
| `search_*` | Search operations | `search_issues` |
| `count_*` | Count operations | `count_records` |
| `check_*` | Validation checks | `check_status` |
| `introspect*` | Introspection | `introspect` |

---

## 7. Implementation Requirements

### 7.1 MUST Requirements

Implementations supporting danger levels MUST:

1. Default unlabeled operations to at least `reversible` (not `safe`)
2. Enforce confirmation for `destructive` and higher operations
3. Log all dangerous operation attempts (level 2+)
4. Return appropriate error codes for denied operations
5. Include danger information in introspection responses

### 7.2 SHOULD Requirements

Implementations supporting danger levels SHOULD:

1. Implement pattern-based automatic classification
2. Support configurable gating policies
3. Provide confirmation token mechanism
4. Allow adapter-level danger overrides
5. Display danger reasons to users before confirmation

### 7.3 MAY Requirements

Implementations supporting danger levels MAY:

1. Implement cooldown periods between confirmation and execution
2. Require re-authentication for `dangerous` and `forbidden` operations
3. Support custom confirmation UX per danger level
4. Integrate with external approval workflows

### 7.4 Audit Requirements

All operations at danger level 2 (destructive) or higher MUST be logged:

```typescript
interface DangerAuditEntry {
  timestamp: string;
  adapter_name: string;
  operation: string;
  danger_level: number;
  adapter_trust: string;
  outcome: 'allowed' | 'confirmed' | 'denied';
  confirmation_token?: string;
  user_id?: string;
  parameters?: Record<string, unknown>;  // Redacted as appropriate
}
```

---

## 8. Future Extensions

### 8.1 Conditional Danger Levels

Danger level based on parameter values:

```yaml
operations:
  delete:
    - name: delete_records
      maps_to: "DELETE /records"
      danger:
        default_level: reversible
        conditions:
          - when: "params.count > 100"
            level: dangerous
            reason: "Bulk delete of more than 100 records"
          - when: "params.permanent == true"
            level: destructive
            reason: "Permanent deletion requested"
```

### 8.2 Approval Workflows

Integration with external approval systems:

```yaml
danger:
  level: dangerous
  approval:
    required: true
    approvers:
      - role: "admin"
      - team: "security"
    timeout_hours: 24
```

### 8.3 Danger Escalation

Operations that become more dangerous over time:

```yaml
danger:
  level: reversible
  escalation:
    - after_count: 10
      level: destructive
      message: "You've performed this operation 10 times this hour"
    - after_count: 50
      level: dangerous
      message: "Unusual activity detected"
```

### 8.4 Danger Score Aggregation

Combining multiple risk factors into a composite score:

```yaml
danger:
  score_factors:
    - base_level: reversible
    - production_env: +1
    - bulk_operation: +1
    - no_backup: +1
  computed_level: dangerous  # Sum exceeds threshold
```

---

## References

- [Adapter Element Type Specification](./element-type.md)
- [Trust Levels Specification](./trust-levels.md)
- [Rate Limiting Specification](./rate-limiting.md)
- [Confirmation Token Specification](../security/confirmation-tokens.md)
- [Security Model: Gatekeeper](../security/gatekeeper.md)
- [Error Codes Specification](../error-codes.md)
- Claude Code dangerous git operation handling
- GitHub Issue: [#49](https://github.com/MCPAQL/spec/issues/49)
