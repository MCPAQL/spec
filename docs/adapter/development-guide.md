# MCP-AQL Adapter Development Guide

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-14

## Abstract

This guide provides practical instructions for developing MCP-AQL compliant adapters. It covers the implementation steps, required components, and best practices for building adapters that wrap existing services.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Implementation Steps](#3-implementation-steps)
4. [Core Components](#4-core-components)
5. [Operation Implementation](#5-operation-implementation)
6. [Testing](#6-testing)
7. [Conformance](#7-conformance)

---

## 1. Overview

### 1.1 What is an Adapter?

An MCP-AQL adapter translates the MCP-AQL protocol into calls to your domain-specific backend, enabling any service to be accessed through the unified CRUDE interface.

### 1.2 Adapter Responsibilities

Your adapter must:
1. Register MCP tools (CRUDE endpoints or single endpoint)
2. Route operations to appropriate handlers
3. Provide introspection for operation discovery
4. Format responses consistently

Your adapter may optionally:
5. Enforce security policies (see [Gatekeeper](../security/gatekeeper.md))
6. Support field selection for payload reduction
7. Support batch operations

### 1.3 Development Approaches

| Approach | Description | Best For |
|----------|-------------|----------|
| **Manual** | Implement all components from scratch | Maximum control, custom requirements |
| **Generated** | Use adapter generator with your schema | Standard backends, rapid development |
| **Extended** | Extend existing adapter implementation | Similar domain to existing adapter |

---

## 2. Prerequisites

### 2.1 Required Knowledge

- MCP (Model Context Protocol) basics
- TypeScript/JavaScript (reference implementations)
- Your domain backend's API

### 2.2 Required Reading

Before starting, review:
- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- [CRUDE Pattern](../crude-pattern.md)
- [Operations Guide](../operations.md)
- [Architecture Overview](../architecture/overview.md)

### 2.3 Development Environment

```bash
# Typical setup
node >= 18.0.0
typescript >= 5.0.0
@modelcontextprotocol/sdk >= 1.0.0
```

---

## 3. Implementation Steps

### 3.1 Step 1: Define Your Domain Resources

Identify what entities your adapter will manage:

```typescript
// Example: Document management adapter
type DocumentType = 'document' | 'folder' | 'tag' | 'template';

// Example: User management adapter
type UserRole = 'admin' | 'user' | 'guest';

// Example: Task management adapter
type TaskStatus = 'pending' | 'in_progress' | 'completed';
```

### 3.2 Step 2: Map Operations to CRUDE Endpoints

Determine which operations your adapter supports and their endpoint mapping:

```typescript
// Example: User management adapter
const OPERATION_ROUTES = {
  // CREATE - Additive operations
  create_user: { endpoint: 'CREATE', handler: 'Users.create' },
  add_user_role: { endpoint: 'CREATE', handler: 'Users.addRole' },

  // READ - Query operations
  list_users: { endpoint: 'READ', handler: 'Users.list' },
  get_user: { endpoint: 'READ', handler: 'Users.get' },
  search_users: { endpoint: 'READ', handler: 'Users.search' },
  introspect: { endpoint: 'READ', handler: 'Introspection.query' },

  // UPDATE - Modification operations
  update_user: { endpoint: 'UPDATE', handler: 'Users.update' },
  change_password: { endpoint: 'UPDATE', handler: 'Users.changePassword' },

  // DELETE - Removal operations
  delete_user: { endpoint: 'DELETE', handler: 'Users.delete' },
  remove_user_role: { endpoint: 'DELETE', handler: 'Users.removeRole' },

  // EXECUTE - Lifecycle operations (if applicable)
  send_verification_email: { endpoint: 'EXECUTE', handler: 'Users.sendVerification' },
  reset_password: { endpoint: 'EXECUTE', handler: 'Users.resetPassword' },
};
```

### 3.3 Step 3: Implement the MCP Server

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'my-mcpaql-adapter', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Register tools (CRUDE mode)
server.setRequestHandler('tools/list', async () => ({
  tools: [
    createEndpointTool('mcp_aql_create', 'CREATE'),
    createEndpointTool('mcp_aql_read', 'READ'),
    createEndpointTool('mcp_aql_update', 'UPDATE'),
    createEndpointTool('mcp_aql_delete', 'DELETE'),
    createEndpointTool('mcp_aql_execute', 'EXECUTE'),
  ]
}));

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  return handleMCPAQLRequest(name, args);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3.4 Step 4: Implement Operation Router

```typescript
class OperationRouter {
  route(operation: string, endpoint: string): OperationRoute {
    const route = OPERATION_ROUTES[operation];

    if (!route) {
      throw new Error(`Unknown operation: ${operation}`);
    }

    // Validate endpoint in CRUDE mode
    if (this.mode === 'crude' && route.endpoint !== endpoint) {
      throw new Error(
        `Operation '${operation}' must be called via mcp_aql_${route.endpoint.toLowerCase()}`
      );
    }

    return route;
  }
}
```

### 3.5 Step 5: Implement Handlers

```typescript
class UserHandler {
  async create(params: CreateUserParams): Promise<OperationResult> {
    // Validate required fields
    if (!params.email) {
      return { success: false, error: "Missing required parameter 'email'" };
    }

    // Call backend
    const user = await this.backend.createUser({
      email: params.email,
      name: params.name,
      role: params.role || 'user'
    });

    // Return success
    return {
      success: true,
      data: this.formatUser(user)
    };
  }

  async list(params: ListParams): Promise<OperationResult> {
    const users = await this.backend.listUsers({
      role: params.role,
      page: params.page,
      pageSize: params.page_size
    });

    return {
      success: true,
      data: {
        items: users.map(this.formatUser),
        pagination: {
          page: params.page,
          page_size: params.page_size,
          total_items: users.total,
          total_pages: Math.ceil(users.total / params.page_size)
        }
      }
    };
  }
}
```

### 3.6 Step 6: Implement Introspection

The `introspect` operation is the only operation required by MCP-AQL. It enables clients to discover your adapter's capabilities at runtime.

```typescript
class IntrospectionResolver {
  queryOperations(name?: string): OperationResult {
    if (name) {
      const route = OPERATION_ROUTES[name];
      if (!route) {
        return { success: true, data: { operation: null } };
      }
      return {
        success: true,
        data: { operation: this.formatOperationDetails(name, route) }
      };
    }

    return {
      success: true,
      data: {
        operations: Object.entries(OPERATION_ROUTES).map(([name, route]) => ({
          name,
          endpoint: route.endpoint,
          description: route.description
        }))
      }
    };
  }

  queryTypes(name?: string): OperationResult {
    // Return your adapter's type definitions
    return {
      success: true,
      data: {
        types: [
          { name: 'UserRole', kind: 'enum', values: ['admin', 'user', 'guest'] },
          { name: 'User', kind: 'object', description: 'User account' },
          { name: 'CRUDEndpoint', kind: 'enum', values: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'] }
        ]
      }
    };
  }
}
```

---

## 4. Core Components

### 4.1 Required Components

| Component | Purpose | Required |
|-----------|---------|----------|
| MCP Server | Tool registration, request handling | Yes |
| Operation Router | Map operations to handlers | Yes |
| Introspection Resolver | Runtime discovery | Yes |
| Response Formatter | Consistent response structure | Yes |

### 4.2 Optional Components

| Component | Purpose | When Needed |
|-----------|---------|-------------|
| Schema Dispatcher | Declarative operation definitions | Complex adapters |
| Gatekeeper | Security enforcement | Production use |
| Field Selection Engine | Payload reduction | Token-sensitive clients |
| Batch Processor | Multi-operation requests | Bulk operations |

### 4.3 Component Interactions

```
Request → Router → [Gatekeeper] → Dispatcher → Handler → Formatter → Response
                                      ↓
                              [Field Selection]
```

---

## 5. Operation Implementation

### 5.1 Required vs Domain Operations

MCP-AQL requires only one operation:
- **`introspect`** - Must be implemented by all adapters

All other operations are defined by your adapter based on your domain. Common patterns include:

| Domain | Typical Operations |
|--------|-------------------|
| **User Management** | create_user, list_users, get_user, update_user, delete_user |
| **Document Storage** | create_document, list_documents, get_document, update_document, delete_document |
| **Task Tracking** | create_task, list_tasks, assign_task, complete_task, delete_task |
| **API Gateway** | list_endpoints, call_endpoint, get_schema |
| **Workflow Engine** | create_job, run_job, get_job_status, cancel_job |

### 5.2 Operation Template

```typescript
interface OperationHandler {
  // Standard signature
  (params: Record<string, unknown>): Promise<OperationResult>;
}

// Implementation pattern
async function operationHandler(params: Record<string, unknown>): Promise<OperationResult> {
  try {
    // 1. Validate required parameters
    const validated = validateParams(params, REQUIRED_PARAMS);

    // 2. Call backend
    const result = await backend.doSomething(validated);

    // 3. Format response
    return {
      success: true,
      data: formatResult(result)
    };
  } catch (error) {
    // 4. Handle errors consistently
    return {
      success: false,
      error: error.message
    };
  }
}
```

### 5.3 Parameter Validation

```typescript
function validateParams(
  params: Record<string, unknown>,
  required: string[]
): Record<string, unknown> {
  const missing = required.filter(name => params[name] === undefined);

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }

  return params;
}
```

### 5.4 Response Formatting

```typescript
function formatSuccess(data: unknown): OperationResult {
  return { success: true, data };
}

function formatError(message: string, code?: string): OperationResult {
  return {
    success: false,
    error: message,
    ...(code && { errorCode: code })
  };
}
```

---

## 6. Testing

### 6.1 Unit Tests

Test each operation handler in isolation:

```typescript
describe('create_user', () => {
  it('creates user with valid params', async () => {
    const result = await handler.create({
      email: 'alice@example.com',
      name: 'Alice'
    });

    expect(result.success).toBe(true);
    expect(result.data.email).toBe('alice@example.com');
  });

  it('fails with missing email', async () => {
    const result = await handler.create({
      name: 'Alice'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('email');
  });
});
```

### 6.2 Integration Tests

Test full request flow:

```typescript
describe('MCP-AQL Integration', () => {
  it('routes create_user to CREATE endpoint', async () => {
    const result = await callTool('mcp_aql_create', {
      operation: 'create_user',
      params: { email: 'alice@example.com', name: 'Alice' }
    });

    expect(result.success).toBe(true);
  });

  it('rejects create_user on READ endpoint', async () => {
    const result = await callTool('mcp_aql_read', {
      operation: 'create_user',
      params: { email: 'alice@example.com' }
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('mcp_aql_create');
  });
});
```

### 6.3 Introspection Tests

Verify operation discovery:

```typescript
describe('Introspection', () => {
  it('lists all operations', async () => {
    const result = await callTool('mcp_aql_read', {
      operation: 'introspect',
      params: { query: 'operations' }
    });

    expect(result.success).toBe(true);
    expect(result.data.operations).toContainEqual(
      expect.objectContaining({ name: 'introspect' })
    );
  });

  it('provides operation details', async () => {
    const result = await callTool('mcp_aql_read', {
      operation: 'introspect',
      params: { query: 'operations', name: 'create_user' }
    });

    expect(result.success).toBe(true);
    expect(result.data.operation.parameters).toBeDefined();
  });
});
```

---

## 7. Conformance

### 7.1 Conformance Levels

**Level 1 (Basic):**
- `introspect` operation implemented
- At least one endpoint mode (CRUDE or Single)
- Standard request/response formats
- Discriminated union responses

**Level 2 (Full):**
- Level 1 requirements
- Both endpoint modes supported
- Field selection supported
- Batch operations supported
- Pass conformance test suite

### 7.2 Self-Assessment Checklist

```markdown
## Level 1 Checklist

- [ ] introspect operation implemented (operations query)
- [ ] introspect operation implemented (types query)
- [ ] At least one CRUDE endpoint registered
- [ ] Operation routing works correctly
- [ ] Discriminated union responses used
- [ ] snake_case parameter naming
- [ ] Correct endpoint routing enforced (CRUDE mode)

## Level 2 Checklist

- [ ] All Level 1 items
- [ ] CRUDE mode supported
- [ ] Single mode supported
- [ ] Field selection supported
- [ ] Batch operations supported
- [ ] Conformance tests pass
```

### 7.3 Claiming Conformance

To claim MCP-AQL conformance:

1. Complete self-assessment for target level
2. Run conformance test suite
3. Document any deviations or extensions
4. Include conformance statement in documentation

**Example Statement:**
```
This adapter implements MCP-AQL Level 1 conformance.
Domain: User management
Operations: create_user, list_users, get_user, update_user, delete_user, introspect
Extensions: bulk_import (custom batch operation)
Deviations: None
```

---

## References

- [MCP-AQL Specification](../versions/v1.0.0-draft.md)
- [Architecture Overview](../architecture/overview.md)
- [Schema-Driven Dispatch](../architecture/schema-driven-dispatch.md)
- [Operations Guide](../operations.md)
