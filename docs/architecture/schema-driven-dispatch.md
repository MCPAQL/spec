# Schema-Driven Dispatch Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-14

## Abstract

This document specifies the schema-driven dispatch pattern that enables declarative operation definitions with automatic parameter resolution, validation, and handler invocation. This is an optional but recommended pattern for adapter implementation.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Operation Schema](#2-operation-schema)
3. [Parameter Resolution](#3-parameter-resolution)
4. [Handler Invocation](#4-handler-invocation)
5. [Security Considerations](#5-security-considerations)
6. [Introspection Integration](#6-introspection-integration)

---

## 1. Introduction

### 1.1 Purpose

Schema-driven dispatch separates the *definition* of operations from their *implementation*, providing:

- **Declarative configuration** - Operations defined as data, not code
- **Automatic validation** - Parameters validated against schema
- **Flexible resolution** - Parameters found from multiple sources
- **Generated documentation** - Introspection responses auto-generated
- **Consistent behavior** - All operations follow same patterns

### 1.2 Benefits

| Aspect | Traditional | Schema-Driven |
|--------|-------------|---------------|
| Adding operations | Code changes | Schema entry |
| Parameter validation | Manual code | Automatic |
| Introspection | Manual sync | Auto-generated |
| Documentation | Separate files | Single source |
| Testing | Per-operation | Schema-based |

### 1.3 When to Use

Schema-driven dispatch is recommended when:
- Adapter has many operations
- Operations have similar parameter patterns
- Introspection accuracy is critical
- Consistency is valued over flexibility

---

## 2. Operation Schema

### 2.1 Schema Structure

```typescript
interface OperationSchema {
  // Identity
  operation: string;           // Operation name (snake_case)
  endpoint: CRUDEndpoint;      // CRUDE endpoint routing

  // Handler
  handler: HandlerReference;   // How to invoke handler
  paramStyle: ParamStyle;      // Argument passing pattern

  // Parameters
  params: ParamDefinition[];   // Parameter specifications

  // Documentation
  description: string;         // Operation description
  examples?: Example[];        // Usage examples
}

type CRUDEndpoint = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
type ParamStyle = 'single' | 'named' | 'spread';
```

### 2.2 Parameter Definition

```typescript
interface ParamDefinition {
  // Identity
  name: string;               // Parameter name (snake_case)

  // Type
  type: ParamType;            // string, number, boolean, object, array

  // Requirements
  required: boolean;
  default?: unknown;

  // Resolution
  sources: string[];          // Resolution paths in priority order

  // Validation
  enum?: string[];            // Allowed values
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;           // Regex pattern

  // Documentation
  description: string;
}

type ParamType = 'string' | 'number' | 'boolean' | 'object' | 'array';
```

### 2.3 Example Schema Definition

```typescript
const CREATE_USER_SCHEMA: OperationSchema = {
  operation: 'create_user',
  endpoint: 'CREATE',
  handler: 'Users.create',
  paramStyle: 'named',
  params: [
    {
      name: 'email',
      type: 'string',
      required: true,
      sources: ['params.email', 'email'],
      description: 'User email address'
    },
    {
      name: 'name',
      type: 'string',
      required: true,
      sources: ['params.name', 'name'],
      description: 'User display name'
    },
    {
      name: 'role',
      type: 'string',
      required: false,
      sources: ['params.role', 'role'],
      default: 'user',
      enum: ['admin', 'user', 'guest'],
      description: 'User role'
    }
  ],
  description: 'Create a new user account',
  examples: [
    {
      name: 'Basic user',
      request: {
        operation: 'create_user',
        params: {
          email: 'alice@example.com',
          name: 'Alice'
        }
      }
    }
  ]
};
```

---

## 3. Parameter Resolution

### 3.1 Resolution Algorithm

For each parameter defined in the schema:

```
1. FOR each source in param.sources (in order):
     a. Parse source path (e.g., "params.email")
     b. Traverse input object along path
     c. IF value found AND not undefined:
          RETURN value

2. IF no value found:
     a. IF param.default defined:
          RETURN param.default
     b. IF param.required:
          THROW MissingParameterError
     c. ELSE:
          RETURN undefined
```

### 3.2 Source Path Syntax

Source paths use dot notation to traverse the input object:

| Path | Resolves From |
|------|---------------|
| `email` | `input.email` |
| `params.email` | `input.params.email` |
| `params.options.format` | `input.params.options.format` |

### 3.3 Resolution Examples

**Input:**
```javascript
{
  operation: "create_user",
  params: {
    email: "alice@example.com",
    name: "Alice"
  }
}
```

**Resolution with sources `['params.email', 'email']`:**
1. Check `input.params.email` → "alice@example.com" ✓
2. Return "alice@example.com"

**Resolution with sources `['params.role', 'role']` and default "user":**
1. Check `input.params.role` → undefined
2. Check `input.role` → undefined
3. Return default "user"

---

## 4. Handler Invocation

### 4.1 Parameter Styles

The `paramStyle` field determines how resolved parameters are passed to handlers.

#### 4.1.1 Named Style

Pass all parameters as a single object.

```typescript
// Schema: paramStyle: 'named'
// Invocation:
handler({ email, name, role })
```

**Use case:** Most common - handlers with multiple parameters.

#### 4.1.2 Single Style

Pass parameters as individual arguments in schema order.

```typescript
// Schema: paramStyle: 'single', params: [email, name, role]
// Invocation:
handler(email, name, role)
```

**Use case:** Simple handlers with fixed signatures.

#### 4.1.3 Spread Style

Pass primary parameter separately from options object.

```typescript
// Schema: paramStyle: 'spread', params: [query, limit, offset]
// Invocation:
handler(query, { limit, offset })
```

**Use case:** Search operations with query + options.

### 4.2 Handler Reference

Handlers are referenced using strings that the adapter resolves:

```typescript
// Common patterns:
"Users.create"           // Module.method
"handlers/users:create"  // Path:method
"createUser"             // Direct function name
```

The resolution mechanism is adapter-specific.

---

## 5. Security Considerations

### 5.1 Path Traversal Protection

Source paths MUST be validated to prevent prototype pollution:

```typescript
const SAFE_PATH_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_$.]*$/;
const FORBIDDEN_PATHS = new Set([
  '__proto__',
  'constructor',
  'prototype'
]);

function validatePath(path: string): boolean {
  if (!SAFE_PATH_PATTERN.test(path)) return false;

  const segments = path.split('.');
  for (const segment of segments) {
    if (FORBIDDEN_PATHS.has(segment)) return false;
  }

  return true;
}
```

### 5.2 Input Validation

Before resolution, input MUST be validated:

1. **Type check** - Input is object
2. **Operation check** - `operation` field is string
3. **Depth limit** - Nested objects limited (default: 10 levels)
4. **Size limit** - Total input size limited

### 5.3 Value Validation

After resolution, values MUST be validated against schema:

```typescript
function validateValue(value: unknown, param: ParamDefinition): void {
  // Type validation
  if (param.type === 'string' && typeof value !== 'string') {
    throw new ValidationError(`${param.name} must be string`);
  }

  // Enum validation
  if (param.enum && !param.enum.includes(value as string)) {
    throw new ValidationError(`${param.name} must be one of: ${param.enum.join(', ')}`);
  }

  // Length validation
  if (param.minLength && (value as string).length < param.minLength) {
    throw new ValidationError(`${param.name} must be at least ${param.minLength} characters`);
  }
}
```

---

## 6. Introspection Integration

### 6.1 Auto-Generated Responses

Operation schemas directly generate introspection responses:

```typescript
function generateOperationInfo(schema: OperationSchema): OperationInfo {
  return {
    name: schema.operation,
    endpoint: schema.endpoint,
    description: schema.description,
    parameters: schema.params.map(p => ({
      name: p.name,
      type: p.type,
      required: p.required,
      default: p.default,
      description: p.description,
      enum: p.enum
    })),
    examples: schema.examples
  };
}
```

### 6.2 Single Source of Truth

The operation schema serves as the canonical source for:
- Parameter definitions
- Validation rules
- Introspection responses
- Documentation generation

Changes to the schema automatically propagate to all consumers.

---

## References

- [Architecture Overview](overview.md)
- [Operations Guide](../operations.md)
- [Introspection Specification](../introspection.md)
