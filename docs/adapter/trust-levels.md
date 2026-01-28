# Trust Levels Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-28

## Abstract

This document defines the trust level system for MCP-AQL adapters. Trust levels indicate the verification and validation status of an adapter, enabling systems to make informed decisions about which operations to permit based on adapter provenance and reliability.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Trust Level Enum](#2-trust-level-enum)
3. [Trust Metadata Schema](#3-trust-metadata-schema)
4. [Promotion Rules](#4-promotion-rules)
5. [Permission Gating](#5-permission-gating)
6. [Implementation Requirements](#6-implementation-requirements)
7. [Future Extensions](#7-future-extensions)

---

## 1. Overview

### 1.1 Purpose

Adapters can originate from multiple sources with varying reliability guarantees:

- **Dynamically generated** from API interrogation or OpenAPI specs
- **Hand-crafted** by developers with domain knowledge
- **Community-contributed** via collection submissions
- **Officially certified** by API vendors or trusted authorities

Trust levels provide a standardized way to communicate adapter reliability, enabling:

- **Progressive permission unlocking** - Higher trust enables more operations
- **Risk-appropriate defaults** - New adapters start with minimal permissions
- **Audit trail** - Track how and when trust was established
- **Automated gating** - Systems can enforce trust requirements programmatically

### 1.2 Design Principles

1. **Conservative defaults** - Untrusted adapters have minimal permissions
2. **Earned trust** - Higher levels require explicit validation or certification
3. **Transparent provenance** - Trust metadata is auditable
4. **Graceful degradation** - Missing trust info treated as lowest level

### 1.3 Relationship to Danger Levels

Trust levels work in conjunction with danger levels (see [Dangerous Operation Classification](./danger-levels.md)):

- **Trust levels** describe adapter reliability (who vouches for it)
- **Danger levels** describe operation risk (what harm could occur)
- **Gating matrix** combines both to determine permission

---

## 2. Trust Level Enum

### 2.1 Trust Level Values

| Level | Value | Description |
|-------|-------|-------------|
| Untested | `untested` | Newly created, no validation performed |
| Generated | `generated` | Programmatically generated, basic schema validation passed |
| Validated | `validated` | Passed programmatic test harness |
| Community Reviewed | `community_reviewed` | Validated plus community vetting process |
| Certified | `certified` | Official verification by vendor or trusted authority |

### 2.2 Level Descriptions

#### 2.2.1 untested

The adapter has been created but not validated in any way.

**Typical sources:**
- Freshly generated from API interrogation
- User-created adapters not yet tested
- Imported from unknown sources

**Characteristics:**
- Schema may be malformed
- Operations may not match actual API
- Parameters may be incorrect or missing

#### 2.2.2 generated

The adapter was programmatically generated and passes basic schema validation.

**Validation requirements:**
- YAML front matter parses correctly
- Required fields present (name, type, version, description)
- Target configuration is valid
- All operations have valid structure

**Characteristics:**
- Schema is structurally correct
- No guarantee operations work at runtime
- May have incorrect parameter types or mappings

#### 2.2.3 validated

The adapter has passed automated test harness validation against the target API.

**Validation requirements:**
- All `generated` requirements PLUS:
- Test harness executed against live API
- Read operations return valid responses
- Create operations succeed with valid inputs
- Error handling behaves as documented

**Characteristics:**
- Operations verified to work at time of validation
- May break if API changes
- Validation report available for review

#### 2.2.4 community_reviewed

The adapter has been validated and reviewed by the community.

**Validation requirements:**
- All `validated` requirements PLUS:
- Submitted to community collection
- Reviewed by at least N community members (configurable, recommended default: 2)
- No security concerns raised
- Documentation quality verified

**Characteristics:**
- Human eyes have reviewed the adapter
- Security implications considered
- Higher confidence in production use

#### 2.2.5 certified

The adapter has official certification from the API vendor or a trusted authority.

**Validation requirements:**
- All `community_reviewed` requirements PLUS:
- Vendor signature or authority attestation
- Formal certification process completed
- Ongoing maintenance commitment

**Characteristics:**
- Highest confidence level
- Official support available
- Production-ready for all operations

---

## 3. Trust Metadata Schema

### 3.1 Schema Structure

The `trust` block in adapter front matter:

```yaml
trust:
  level: validated
  generated_at: "2026-01-15T10:00:00Z"
  generated_by: "mcpaql-adapter-generator-v1.2.0"
  validated_at: "2026-01-15T12:00:00Z"
  validated_by: "mcpaql-test-harness-v2.0.0"
  validation_report:
    tests_passed: 47
    tests_total: 47
    endpoints_verified: 23
    coverage_percent: 95
    last_api_response: "2026-01-15T12:00:00Z"
  promoted_from: "generated"
  promotion_history:
    - from: "untested"
      to: "generated"
      at: "2026-01-15T10:00:00Z"
      by: "mcpaql-adapter-generator-v1.2.0"
    - from: "generated"
      to: "validated"
      at: "2026-01-15T12:00:00Z"
      by: "mcpaql-test-harness-v2.0.0"
  certification: null
```

### 3.2 Field Definitions

#### 3.2.1 level (required)

**Type:** string (enum)
**Values:** `untested`, `generated`, `validated`, `community_reviewed`, `certified`

The current trust level of the adapter.

```yaml
level: validated
```

#### 3.2.2 generated_at

**Type:** string (ISO 8601 timestamp)

When the adapter was initially generated or created.

```yaml
generated_at: "2026-01-15T10:00:00Z"
```

#### 3.2.3 generated_by

**Type:** string

Identifier of the tool or person that created the adapter.

```yaml
generated_by: "mcpaql-adapter-generator-v1.2.0"
```

#### 3.2.4 validated_at

**Type:** string (ISO 8601 timestamp)

When the adapter was last validated against the target API.

```yaml
validated_at: "2026-01-15T12:00:00Z"
```

#### 3.2.5 validated_by

**Type:** string

Identifier of the validation tool or process.

```yaml
validated_by: "mcpaql-test-harness-v2.0.0"
```

#### 3.2.6 validation_report

**Type:** object

Detailed results from the validation process.

```yaml
validation_report:
  tests_passed: 47
  tests_total: 47
  endpoints_verified: 23
  coverage_percent: 95
  last_api_response: "2026-01-15T12:00:00Z"
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `tests_passed` | integer | Number of tests that passed |
| `tests_total` | integer | Total number of tests executed |
| `endpoints_verified` | integer | Number of API endpoints tested |
| `coverage_percent` | number | Percentage of operations covered by tests |
| `last_api_response` | string | Timestamp of last successful API response |

#### 3.2.7 promoted_from

**Type:** string (enum)

The previous trust level before the most recent promotion.

```yaml
promoted_from: "generated"
```

#### 3.2.8 promotion_history

**Type:** array of promotion records

Complete history of trust level changes.

```yaml
promotion_history:
  - from: "untested"
    to: "generated"
    at: "2026-01-15T10:00:00Z"
    by: "mcpaql-adapter-generator-v1.2.0"
    reason: "Schema validation passed"
```

**Promotion record fields:**

| Field | Type | Description |
|-------|------|-------------|
| `from` | string | Previous trust level |
| `to` | string | New trust level |
| `at` | string | ISO 8601 timestamp |
| `by` | string | Tool or person identifier |
| `reason` | string | Optional explanation |

#### 3.2.9 certification

**Type:** object or null

Certification details for `certified` level adapters.

```yaml
certification:
  authority: "GitHub, Inc."
  signature: "base64-encoded-signature"
  certificate_id: "GH-CERT-2026-001"
  issued_at: "2026-01-20T00:00:00Z"
  expires_at: "2027-01-20T00:00:00Z"
  scope:
    - "all_operations"
```

**Certification fields:**

| Field | Type | Description |
|-------|------|-------------|
| `authority` | string | Certifying organization name |
| `signature` | string | Cryptographic signature (base64) |
| `certificate_id` | string | Unique certificate identifier |
| `issued_at` | string | When certification was granted |
| `expires_at` | string | When certification expires |
| `scope` | array | What the certification covers |

---

## 4. Promotion Rules

### 4.1 Promotion Path

Trust levels follow a linear promotion path:

```
untested → generated → validated → community_reviewed → certified
```

Adapters MUST NOT skip levels during promotion. Each level builds on the requirements of previous levels.

### 4.2 Promotion Triggers

| Transition | Trigger | Requirements |
|------------|---------|--------------|
| untested → generated | Schema validation | YAML parses, required fields present, valid structure |
| generated → validated | Test harness pass | All read ops succeed, representative create/update tested |
| validated → community_reviewed | Community review | N reviewers approve, no security flags |
| community_reviewed → certified | Vendor attestation | Signed certificate from recognized authority |

### 4.3 Demotion Rules

Trust levels MAY be demoted when:

1. **Validation failure** - Re-validation against API fails
2. **Security issue** - Vulnerability discovered in adapter
3. **API change** - Target API changed, adapter no longer valid
4. **Certificate expiry** - Certification has expired

**Demotion behavior:**

- Demotion MUST be recorded in `promotion_history` with negative transition
- Systems SHOULD notify users when adapter trust is demoted
- Demoted adapters retain their `validated_at` timestamp for audit purposes

```yaml
promotion_history:
  - from: "validated"
    to: "generated"
    at: "2026-02-01T08:00:00Z"
    by: "mcpaql-test-harness-v2.0.0"
    reason: "API endpoint /users deprecated, 3 operations failing"
```

### 4.4 Re-validation

Adapters SHOULD be periodically re-validated to maintain trust level:

| Trust Level | Recommended Re-validation |
|-------------|---------------------------|
| generated | On each use (schema check) |
| validated | Weekly or on API version change |
| community_reviewed | Monthly |
| certified | Per certification terms |

---

## 5. Permission Gating

### 5.1 Trust-to-Operation Gating

Systems SHOULD enforce minimum trust levels for operations based on risk:

| Operation Category | Minimum Trust Level |
|--------------------|---------------------|
| Introspection | `untested` |
| Read operations | `generated` |
| Safe create operations | `validated` |
| Update operations | `validated` |
| Delete operations | `community_reviewed` |
| Dangerous operations | `certified` |

### 5.2 Trust-to-Danger Matrix

The complete trust-to-danger gating matrix is defined in the [Dangerous Operation Classification](./danger-levels.md#4-trust-to-danger-gating) specification. The matrix determines which operations are allowed, require confirmation, or are denied based on the combination of adapter trust level and operation danger level.

**Behavior summary:**
- `allow` - Operation executes without additional gates
- `confirm` - Operation requires explicit user confirmation
- `deny` - Operation blocked with error response
- `introspect_only` - Only introspection operations permitted; all other operations are blocked

### 5.3 Configuration Override

Systems MAY allow administrators to override default gating:

```yaml
# System configuration
trust_policy:
  minimum_trust_for_writes: validated
  minimum_trust_for_deletes: community_reviewed
  allow_untested_introspection: true
  require_confirmation_below: validated
```

### 5.4 Error Response

When an operation is denied due to insufficient trust:

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

> **Note:** The `PERMISSION_TRUST_LEVEL_INSUFFICIENT` error code is introduced by this specification and should be added to the [Error Codes Specification](../error-codes.md) as a future extension under the `PERMISSION_` category.

---

## 6. Implementation Requirements

### 6.1 MUST Requirements

Implementations supporting trust levels MUST:

1. Default to `untested` when trust block is missing
2. Validate trust level enum values
3. Reject invalid trust metadata gracefully
4. Record trust level in audit logs for security operations

### 6.2 SHOULD Requirements

Implementations supporting trust levels SHOULD:

1. Enforce the trust-to-operation gating matrix
2. Provide introspection of current trust level
3. Support trust level promotion workflows
4. Preserve promotion history for audit

### 6.3 MAY Requirements

Implementations supporting trust levels MAY:

1. Implement custom gating policies
2. Support automatic re-validation
3. Integrate with external certification authorities
4. Provide trust level comparison across adapters

### 6.4 Introspection Support

Trust information SHOULD be available via introspection:

```javascript
{
  operation: "introspect",
  params: { query: "adapter_info" }
}

// Response
{
  success: true,
  data: {
    name: "github-api",
    version: "1.0.0",
    trust: {
      level: "validated",
      validated_at: "2026-01-15T12:00:00Z",
      validation_report: {
        tests_passed: 47,
        tests_total: 47
      }
    }
  }
}
```

---

## 7. Future Extensions

### 7.1 Scoped Trust Levels

Future versions may support per-operation trust levels:

```yaml
trust:
  level: validated
  operation_overrides:
    delete_repo:
      level: certified
      reason: "Destructive operation requires higher trust"
```

### 7.2 Trust Delegation

Organizations may delegate trust decisions:

```yaml
trust:
  level: community_reviewed
  delegated_from:
    authority: "acme-corp"
    scope: "internal-apis"
```

### 7.3 Composite Trust

For adapters aggregating multiple APIs:

```yaml
trust:
  composite: true
  components:
    - api: "github"
      level: certified
    - api: "slack"
      level: validated
  effective_level: validated  # Minimum of components
```

### 7.4 Trust Attestation Protocol

A future specification may define a protocol for trust attestation exchange between systems.

---

## References

- [Adapter Element Type Specification](./element-type.md)
- [Dangerous Operation Classification](./danger-levels.md)
- [Security Model: Gatekeeper](../security/gatekeeper.md)
- [Error Codes Specification](../error-codes.md)
- GitHub Issue: [#59](https://github.com/MCPAQL/spec/issues/59)
