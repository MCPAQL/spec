# MCP-AQL Operations Reference

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-01-05

## Abstract

This document provides a complete reference for all MCP-AQL operations, their parameters, response formats, and usage examples.

## Table of Contents

1. [Operation Input Format](#1-operation-input-format)
2. [Response Format](#2-response-format)
3. [CREATE Operations](#3-create-operations)
4. [READ Operations](#4-read-operations)
5. [UPDATE Operations](#5-update-operations)
6. [DELETE Operations](#6-delete-operations)
7. [EXECUTE Operations](#7-execute-operations)
8. [Batch Operations](#8-batch-operations)
9. [Error Handling](#9-error-handling)

---

## 1. Operation Input Format

### 1.1 Standard Input Structure

All operations follow a consistent input structure:

```json
{
  "operation": "<operation_name>",
  "element_type": "<optional_element_type>",
  "params": {
    // Operation-specific parameters
  }
}
```

### 1.2 Parameter Naming Convention

MCP-AQL uses **snake_case** for all public-facing parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `element_name` | string | The name of an element |
| `element_type` | ElementType | The type of element |

### 1.3 Parameter Resolution

Parameters may be specified at multiple levels. Resolution order (first match wins):

1. `params.<parameter_name>`
2. Top-level `<parameter_name>`
3. Mapped alternative names (e.g., `elementType` maps to `element_type`)

**Example - Equivalent Requests:**
```javascript
// Preferred: element_type at top level
{
  operation: "list_elements",
  element_type: "persona"
}

// Alternative: element_type in params
{
  operation: "list_elements",
  params: { element_type: "persona" }
}

// Legacy: camelCase (backward compatible)
{
  operation: "list_elements",
  elementType: "persona"
}
```

---

## 2. Response Format

### 2.1 Discriminated Union Result

All operations return a discriminated union:

```typescript
type OperationResult = OperationSuccess | OperationFailure;

interface OperationSuccess {
  success: true;
  data: unknown;  // Operation-specific payload
}

interface OperationFailure {
  success: false;
  error: string;  // Human-readable error message
}
```

### 2.2 Success Response Example

```json
{
  "success": true,
  "data": {
    "name": "MyPersona",
    "type": "persona",
    "description": "A helpful assistant"
  }
}
```

### 2.3 Failure Response Example

```json
{
  "success": false,
  "error": "Missing required parameter 'element_name' for operation 'create_element'"
}
```

---

## 3. CREATE Operations

CREATE operations are additive and non-destructive.

### 3.1 create_element

Create a new element of any type.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_name` | string | Yes | Element name (unique within type) |
| `element_type` | ElementType | Yes | Element type |
| `description` | string | Yes | Element description |
| `instructions` | string | Conditional | Behavioral instructions (REQUIRED for personas) |
| `content` | string | Conditional | Element content (REQUIRED for agents, skills, templates) |
| `metadata` | object | No | Additional metadata |

**Element Type Requirements:**

| Element Type | Required Fields | Notes |
|--------------|-----------------|-------|
| persona | `instructions` | Must contain behavioral instructions |
| skill | `content` | Skill definition |
| template | `content` | Template with variable placeholders |
| agent | `content` | Goal and steps definition |
| memory | - | No content required |
| ensemble | `metadata.elements` | Array of element references |

**Examples:**

```javascript
// Create a persona
{
  operation: "create_element",
  element_type: "persona",
  params: {
    element_name: "CodeReviewer",
    description: "A thorough code reviewer",
    instructions: "You are a meticulous code reviewer. Focus on code quality, security, and maintainability."
  }
}

// Create an agent
{
  operation: "create_element",
  element_type: "agent",
  params: {
    element_name: "TaskRunner",
    description: "Executes multi-step tasks",
    content: "goal: Complete assigned tasks\nsteps:\n  - Analyze the task\n  - Execute step by step\n  - Report results"
  }
}

// Create a skill
{
  operation: "create_element",
  element_type: "skill",
  params: {
    element_name: "BugAnalysis",
    description: "Analyzes bugs and suggests fixes",
    content: "# Bug Analysis Skill\n\nAnalyze reported bugs and suggest comprehensive fixes."
  }
}
```

---

### 3.2 import_element

Import an element from exported data.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data` | string \| object | Yes | Export package (JSON string or object) |
| `overwrite` | boolean | No | Overwrite if exists (default: false) |

**Example:**

```javascript
{
  operation: "import_element",
  params: {
    data: {
      exportVersion: "1.0",
      elementType: "persona",
      elementName: "MyPersona",
      format: "json",
      data: "{\"name\":\"MyPersona\",\"description\":\"...\"}"
    },
    overwrite: false
  }
}
```

---

### 3.3 activate_element

Activate an element for use in the current session.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_name` | string | Yes | Element name to activate |
| `element_type` | ElementType | Yes | Element type |
| `context` | object | No | Activation context |

**Example:**

```javascript
{
  operation: "activate_element",
  element_type: "persona",
  params: {
    element_name: "CodeReviewer"
  }
}
```

---

### 3.4 addEntry

Add an entry to a memory element.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_name` | string | Yes | Memory element name |
| `content` | string | Yes | Entry content |
| `tags` | string[] | No | Entry tags |
| `metadata` | object | No | Entry metadata |

**Example:**

```javascript
{
  operation: "addEntry",
  params: {
    element_name: "project-notes",
    content: "Completed the API refactoring on 2024-01-15",
    tags: ["milestone", "api"]
  }
}
```

---

## 4. READ Operations

READ operations are safe and read-only.

### 4.1 list_elements

List elements with optional filtering and pagination.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_type` | ElementType | Yes | Element type to list |
| `page` | number | No | Page number (default: 1) |
| `pageSize` | number | No | Items per page (default: 25, max: 100) |
| `status` | string | No | Filter by status: "active", "inactive", "all" |
| `tags` | string[] | No | Filter by tags (AND logic) |
| `nameContains` | string | No | Filter by partial name match |

**Example:**

```javascript
{
  operation: "list_elements",
  element_type: "persona",
  params: {
    page: 1,
    pageSize: 10,
    status: "active"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "elements": [
      { "name": "CodeReviewer", "description": "...", "status": "active" },
      { "name": "Writer", "description": "...", "status": "active" }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 25,
      "totalPages": 3
    }
  }
}
```

---

### 4.2 get_element

Retrieve a specific element by name.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_name` | string | Yes | Element name |
| `element_type` | ElementType | Yes | Element type |

**Example:**

```javascript
{
  operation: "get_element",
  element_type: "persona",
  params: {
    element_name: "CodeReviewer"
  }
}
```

---

### 4.3 search

Unified search across multiple sources.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `scope` | string \| string[] | No | Search scope(s): "local", "github", "collection", "all" |
| `type` | ElementType | No | Filter by element type |
| `page` | number | No | Page number |
| `limit` | number | No | Results per page |
| `sort` | object | No | Sort options: { field, order } |

**Examples:**

```javascript
// Search all sources
{
  operation: "search",
  params: { query: "creative assistant" }
}

// Search only local portfolio
{
  operation: "search",
  params: { query: "helper", scope: "local" }
}

// Search multiple scopes with type filter
{
  operation: "search",
  params: {
    query: "code review",
    scope: ["local", "collection"],
    type: "skill"
  }
}
```

---

### 4.4 introspect

Query available operations and types for discovery.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | What to introspect: "operations" or "types" |
| `name` | string | No | Specific operation or type name |

**Examples:**

```javascript
// List all operations
{ operation: "introspect", params: { query: "operations" } }

// Get details for a specific operation
{ operation: "introspect", params: { query: "operations", name: "create_element" } }

// List all types
{ operation: "introspect", params: { query: "types" } }

// Get details for a specific type
{ operation: "introspect", params: { query: "types", name: "ElementType" } }
```

---

### 4.5 render

Render a template with provided variables.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_name` | string | Yes | Template name |
| `variables` | object | Yes | Template variables |

**Example:**

```javascript
{
  operation: "render",
  params: {
    element_name: "meeting-notes",
    variables: {
      date: "2024-01-15",
      attendees: ["Alice", "Bob"],
      topics: ["Q1 planning", "Budget review"]
    }
  }
}
```

---

### 4.6 export_element

Export an element to a portable format.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_name` | string | Yes | Element name |
| `element_type` | ElementType | Yes | Element type |
| `format` | string | No | Export format: "json" or "yaml" (default: "json") |

**Example:**

```javascript
{
  operation: "export_element",
  element_type: "persona",
  params: {
    element_name: "CodeReviewer",
    format: "yaml"
  }
}
```

---

### 4.7 get_active_elements

List currently active elements.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_type` | ElementType | Yes | Element type to check |

**Example:**

```javascript
{
  operation: "get_active_elements",
  element_type: "persona"
}
```

---

## 5. UPDATE Operations

UPDATE operations modify existing state.

### 5.1 edit_element

Edit an element using GraphQL-style nested input objects.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_name` | string | Yes | Element name |
| `element_type` | ElementType | Yes | Element type |
| `input` | object | Yes | Nested object with fields to update (deep-merged) |

The `input` object is deep-merged with the existing element, allowing partial updates without replacing the entire element.

**Examples:**

```javascript
// Update description
{
  operation: "edit_element",
  element_type: "persona",
  params: {
    element_name: "CodeReviewer",
    input: {
      description: "An expert code reviewer focusing on security"
    }
  }
}

// Update nested metadata
{
  operation: "edit_element",
  element_type: "skill",
  params: {
    element_name: "BugAnalysis",
    input: {
      description: "Enhanced bug analysis",
      metadata: {
        triggers: ["bug", "issue", "error"],
        priority: "high"
      }
    }
  }
}
```

---

### 5.2 deactivate_element

Deactivate an active element.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_name` | string | Yes | Element name to deactivate |
| `element_type` | ElementType | Yes | Element type |

**Example:**

```javascript
{
  operation: "deactivate_element",
  element_type: "persona",
  params: {
    element_name: "CodeReviewer"
  }
}
```

---

## 6. DELETE Operations

DELETE operations are destructive and may require confirmation.

### 6.1 delete_element

Permanently delete an element.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_name` | string | Yes | Element name |
| `element_type` | ElementType | Yes | Element type |
| `deleteData` | boolean | No | Also delete associated data files |

**Example:**

```javascript
{
  operation: "delete_element",
  element_type: "memory",
  params: {
    element_name: "old-project-notes",
    deleteData: true
  }
}
```

---

### 6.2 clear

Clear all entries from a memory element.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_name` | string | Yes | Memory element name |

**Example:**

```javascript
{
  operation: "clear",
  params: {
    element_name: "temp-memory"
  }
}
```

---

## 7. EXECUTE Operations

EXECUTE operations manage runtime execution lifecycle.

### 7.1 execute_agent

Start execution of an agent or executable element.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Agent name |
| `parameters` | object | Yes | Execution parameters |

**Example:**

```javascript
{
  operation: "execute_agent",
  params: {
    name: "code-reviewer",
    parameters: {
      goal: "Review the authentication module",
      files: ["src/auth/"]
    }
  }
}
```

---

### 7.2 get_execution_state

Query current execution state.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Agent name |
| `includeDecisionHistory` | boolean | No | Include decision history |
| `includeContext` | boolean | No | Include execution context |

**Example:**

```javascript
{
  operation: "get_execution_state",
  params: {
    name: "code-reviewer",
    includeContext: true
  }
}
```

---

### 7.3 update_execution_state

Record execution progress or findings.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Agent name |
| `stepDescription` | string | Yes | Description of step completed |
| `outcome` | string | Yes | Step outcome: "success", "failure", "partial" |
| `findings` | string | No | Step findings or results |
| `confidence` | number | No | Confidence score (0-1) |

**Example:**

```javascript
{
  operation: "update_execution_state",
  params: {
    name: "code-reviewer",
    stepDescription: "Analyzed authentication module",
    outcome: "success",
    findings: "Found 3 potential security issues",
    confidence: 0.85
  }
}
```

---

### 7.4 complete_execution

Signal that execution finished.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Agent name |
| `outcome` | string | Yes | Execution outcome: "success", "failure", "partial" |
| `summary` | string | Yes | Summary of execution results |
| `goalId` | string | No | Goal ID if tracking specific goal |

**Example:**

```javascript
{
  operation: "complete_execution",
  params: {
    name: "code-reviewer",
    outcome: "success",
    summary: "Completed review with 3 issues identified and 2 resolved"
  }
}
```

---

### 7.5 continue_execution

Resume execution from saved state.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Agent name |
| `previousStepResult` | string | No | Result from previous step |
| `parameters` | object | No | Additional parameters for continuation |

**Example:**

```javascript
{
  operation: "continue_execution",
  params: {
    name: "code-reviewer",
    previousStepResult: "User approved recommended changes"
  }
}
```

---

## 8. Batch Operations

### 8.1 Batch Request Format

Multiple operations can be executed in a single request:

```json
{
  "operations": [
    { "operation": "create_element", "params": { ... } },
    { "operation": "create_element", "params": { ... } },
    { "operation": "activate_element", "params": { ... } }
  ]
}
```

### 8.2 Batch Response Format

```json
{
  "success": true,
  "results": [
    { "index": 0, "operation": "create_element", "result": { "success": true, "data": ... } },
    { "index": 1, "operation": "create_element", "result": { "success": true, "data": ... } },
    { "index": 2, "operation": "activate_element", "result": { "success": true, "data": ... } }
  ],
  "summary": {
    "total": 3,
    "succeeded": 3,
    "failed": 0
  }
}
```

### 8.3 Batch Execution Semantics

- Operations execute in order
- Failure of one operation does NOT stop subsequent operations
- Each operation result is independent
- Overall success is true if batch completed (even with individual failures)

---

## 9. Error Handling

### 9.1 Error Categories

| Category | Description | Example |
|----------|-------------|---------|
| Missing Parameter | Required parameter not provided | "Missing required parameter 'element_name'" |
| Invalid Type | Parameter has wrong type | "Parameter 'page' must be a number" |
| Not Found | Referenced element doesn't exist | "Element 'MyPersona' not found" |
| Route Mismatch | Operation sent to wrong endpoint | "Operation 'create_element' must use CREATE endpoint" |
| Validation | Business rule violation | "Persona requires 'instructions' field" |

### 9.2 Error Response Structure

```json
{
  "success": false,
  "error": "Human-readable error message",
  "errorCode": "OPTIONAL_ERROR_CODE",
  "details": {
    // Optional additional context
  }
}
```

### 9.3 Standard Error Codes

| Code | Description |
|------|-------------|
| `MISSING_PARAMETER` | Required parameter not provided |
| `INVALID_TYPE` | Parameter type mismatch |
| `NOT_FOUND` | Element or resource not found |
| `ENDPOINT_MISMATCH` | Operation routed to wrong endpoint |
| `VALIDATION_ERROR` | Business rule violation |
| `ALREADY_EXISTS` | Element with same name exists |
| `UNAUTHORIZED` | Operation not permitted |

---

## References

- [MCP-AQL Specification v1.0.0-draft](versions/v1.0.0-draft.md)
- [CRUDE Pattern Specification](crude-pattern.md)
- [Introspection Specification](introspection.md)
