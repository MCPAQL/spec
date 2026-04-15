---
title: Protocol Comparison Guide
version: 1.0.0
status: draft
---

> This document helps developers familiar with GraphQL, MongoDB, REST, SQL, or classic MCP
> understand MCP-AQL by mapping familiar concepts to their MCP-AQL equivalents.

## Table of Contents

- [Introduction](#introduction)
- [Quick Reference Table](#quick-reference-table)
- [For GraphQL Developers](#for-graphql-developers)
- [For MongoDB Developers](#for-mongodb-developers)
- [For REST API Developers](#for-rest-api-developers)
- [For SQL Developers](#for-sql-developers)
- [For Classic MCP Users](#for-classic-mcp-users)
- [Comprehensive Concept Mapping](#comprehensive-concept-mapping)
- [Code Examples: Same Operation Across Protocols](#code-examples-same-operation-across-protocols)

---

## Introduction

**MCP-AQL** (Model Context Protocol - Advanced Agent API Adapter Query Language) is a **protocol pattern**
for consolidating multiple MCP tools into semantic endpoints. The core ideas are:

- **CRUDE Endpoints** - Categorize operations by safety: Create, Read, Update, Delete, Execute
- **Operation Routing** - A single `operation` parameter dispatches to the appropriate handler
- **Schema-Driven Dispatch** - Declarative operation definitions with automatic validation
- **Introspection** - On-demand discovery replaces upfront schema parsing

### Token Efficiency by Mode

MCP-AQL supports multiple endpoint modes with different token trade-offs:

| Mode | Endpoints | Token Cost | Reduction | Use Case |
|------|-----------|------------|-----------|----------|
| **Discrete** | Many individual tools | ~30,000 | Baseline | Traditional MCP |
| **CRUDE** | 5 semantic endpoints | ~4,300 | ~85% | Host-level permission control |
| **Single** | 1 unified endpoint | ~1,100 | ~96% | Maximum token efficiency |

**Response Token Savings:** Field selection (`fields` parameter) provides additional ~73-86%
reduction in response tokens. Combined with endpoint consolidation, total savings can exceed 98%.

### Why Compare?

Developers often approach new protocols through the lens of what they already know. This guide
provides mental models for understanding MCP-AQL by drawing parallels to:

| Protocol | Similarity to MCP-AQL |
|----------|----------------------|
| **GraphQL** | Introspection, typed operations, nested input objects |
| **MongoDB** | Document-based operations, flexible queries |
| **REST** | Resource-oriented endpoints, HTTP-like semantics |
| **SQL** | Structured queries, CRUD operations |
| **Classic MCP** | Tool-based interface (what MCP-AQL can replace) |

---

## Core Design Philosophy

MCP-AQL optimizes for **LLM token efficiency** while maintaining **human readability**:

1. **Consolidated Endpoints** - Semantic grouping instead of many discrete tools
2. **On-Demand Discovery** - Introspection replaces upfront schema parsing
3. **Schema-Driven Dispatch** - Declarative operation definitions with automatic validation
4. **Flexible Parameter Resolution** - Multiple sources checked for each parameter

---

## Quick Reference Table

| Concept | GraphQL | MongoDB | REST | SQL | MCP-AQL |
|---------|---------|---------|------|-----|---------|
| **Define Operation** | `mutation createUser` | `db.users.insertOne()` | `POST /users` | `INSERT INTO users` | `{ operation: "..." }` |
| **Specify Parameters** | `variables: { ... }` | `{ filter: { ... } }` | Request body / query params | `WHERE clause` | `params: { ... }` |
| **Target Type** | Type in schema | Collection name | URL path | Table name | Implementation-defined |
| **Read One** | `query { user(id) }` | `findOne({ _id })` | `GET /users/:id` | `SELECT ... WHERE id=` | Read operation |
| **Read Many** | `query { users }` | `find({})` | `GET /users` | `SELECT * FROM` | List operation |
| **Create** | `mutation { createUser }` | `insertOne()` | `POST /users` | `INSERT INTO` | Create operation |
| **Update** | `mutation { updateUser }` | `updateOne()` | `PUT /users/:id` | `UPDATE ... SET` | Update operation |
| **Delete** | `mutation { deleteUser }` | `deleteOne()` | `DELETE /users/:id` | `DELETE FROM` | Delete operation |
| **Search** | `query { search(q) }` | `find({ $text })` | `GET /search?q=` | `LIKE '%term%'` | Search operation |
| **Discover Schema** | `__schema` introspection | `db.getCollectionInfos()` | OpenAPI / Swagger | `DESCRIBE table` | `introspect` |
| **Field Selection** | Field list in query | Projection `{ field: 1 }` | `?fields=a,b` | `SELECT a, b` | `fields` param or preset |
| **Response Format** | `{ data, errors }` | Document / cursor | JSON body | Result set | `{ success, data/error }` |
| **Error Handling** | `errors` array | Exception | HTTP status codes | SQLSTATE | `{ success: false, error }` |

---

## For GraphQL Developers

If you are familiar with GraphQL, MCP-AQL will feel conceptually similar. Both protocols emphasize
typed operations, introspection, and structured inputs.

### Operations = Queries/Mutations

GraphQL separates read operations (queries) from write operations (mutations). MCP-AQL takes this
further with the **CRUDE pattern** (5 semantic categories):

| GraphQL | MCP-AQL Endpoint | Purpose |
|---------|------------------|---------|
| `query` | `mcp_aql_read` | Read-only operations |
| `mutation` (create) | `mcp_aql_create` | Additive operations |
| `mutation` (update) | `mcp_aql_update` | Modifying operations |
| `mutation` (delete) | `mcp_aql_delete` | Destructive operations |
| `subscription` | `mcp_aql_execute` | Runtime/stateful operations |

**GraphQL:**
```graphql
mutation CreateUser($input: UserInput!) {
  createUser(input: $input) {
    name
    email
  }
}
```

**MCP-AQL:**
```javascript
{
  operation: "create_resource",
  params: {
    resource_type: "user",
    resource_id: "user-123",
    name: "Alice",
    email: "alice@example.com"
  }
}
```

### Resource Types

In GraphQL, you query specific types (`User`, `Post`). In MCP-AQL, implementations define their own
resource type parameter:

| GraphQL | MCP-AQL Pattern |
|---------|-----------------|
| `type User` | `resource_type: "user"` |
| `type Post` | `resource_type: "post"` |
| `type Comment` | `resource_type: "comment"` |

### Introspection: `__schema` vs `introspect`

Both protocols support self-description. MCP-AQL's introspection is modeled after GraphQL:

**GraphQL:**
```graphql
{
  __schema {
    types { name }
    queryType { name }
  }
}
```

**MCP-AQL:**
```javascript
// List all operations
{ operation: "introspect", params: { query: "operations" } }

// Get specific operation details
{ operation: "introspect", params: { query: "operations", name: "create_resource" } }

// List available types
{ operation: "introspect", params: { query: "types" } }
```

### Nested Input Objects (GraphQL-style Updates)

MCP-AQL supports GraphQL-style nested `input` objects for updates. This allows partial updates
with deep merging:

**GraphQL:**
```graphql
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    name
  }
}
```

**MCP-AQL:**
```javascript
{
  operation: "update_resource",
  params: {
    resource_id: "user-123",
    input: {                    // Everything in 'input' gets deep-merged
      name: "Updated Name",
      settings: { theme: "dark" }
    }
  }
}
```

### Field Selection (GraphQL-style)

MCP-AQL supports GraphQL-style field selection to reduce response token usage. Implementations
can support a `fields` parameter for specific fields or define presets for common use cases.

**MCP-AQL Field Selection:**
```javascript
{
  operation: "list_resources",
  params: {
    resource_type: "user",
    fields: ["name", "description", "metadata.tags"]
  }
}
// Returns only requested fields, reducing response tokens
```

**Preset Field Sets:**

Implementations MAY define preset field sets for common use cases:

```javascript
{
  operation: "get_resource",
  params: {
    resource_id: "user-123",
    fields: "minimal"  // Preset: returns only essential fields
  }
}
```

| Preset | Description | Typical Token Savings |
|--------|-------------|----------------------|
| `minimal` | Only identifier and description | ~86% |
| `standard` | Common fields for most use cases | ~73% |
| `full` | All fields (default) | 0% |

### Key Differences from GraphQL

| Aspect | GraphQL | MCP-AQL |
|--------|---------|---------|
| **Field Selection** | Client selects specific fields | `fields` param or presets |
| **Subscriptions** | Real-time WebSocket streams | EXECUTE for stateful lifecycle |
| **Schema Definition** | SDL files | Declarative operation schemas |
| **Fragments/Aliases** | Supported | Not applicable |
| **Batching** | DataLoader pattern | Built-in batch operations |

---

## For MongoDB Developers

If you are familiar with MongoDB, MCP-AQL's document-oriented operations and flexible query patterns
will feel natural.

### Resource Types (like Collections)

MongoDB organizes documents into collections. MCP-AQL implementations define resource type parameters:

| MongoDB | MCP-AQL Pattern |
|---------|-----------------|
| `db.users` | `resource_type: "user"` |
| `db.posts` | `resource_type: "post"` |
| `db.comments` | `resource_type: "comment"` |
| Collection name in method | Passed as parameter |

### CRUD Method Mapping

| MongoDB | MCP-AQL |
|---------|---------|
| `insertOne()` | `create_resource` |
| `find()` | `list_resources` |
| `findOne()` | `get_resource` |
| `updateOne()` | `update_resource` |
| `deleteOne()` | `delete_resource` |
| `aggregate()` | `search` or `query_resources` |

**MongoDB:**
```javascript
db.users.insertOne({
  name: "Alice",
  description: "A helpful assistant",
  settings: { theme: "light" }
})
```

**MCP-AQL:**
```javascript
{
  operation: "create_resource",
  params: {
    resource_type: "user",
    resource_id: "alice",
    description: "A helpful assistant",
    settings: { theme: "light" }
  }
}
```

### Query Patterns

**MongoDB Find:**
```javascript
db.users.find({
  tags: { $in: ["creative", "writing"] }
}).limit(10)
```

**MCP-AQL Search:**
```javascript
{
  operation: "search",
  params: {
    query: "creative writing",
    scope: "local",
    limit: 10
  }
}
```

### Update Patterns

MongoDB's `$set` operator is similar to MCP-AQL's deep-merge `input`:

**MongoDB:**
```javascript
db.users.updateOne(
  { name: "Alice" },
  { $set: {
    description: "Updated",
    "metadata.triggers": ["helper"]
  }}
)
```

**MCP-AQL:**
```javascript
{
  operation: "update_resource",
  params: {
    resource_id: "alice",
    input: {
      description: "Updated",
      metadata: {
        triggers: ["helper"]
      }
    }
  }
}
```

### Key Differences from MongoDB

| Aspect | MongoDB | MCP-AQL |
|--------|---------|---------|
| **Query Operators** | Rich ($gt, $in, $regex) | Simplified search/filter |
| **Aggregation** | Complex pipelines | Normalized via `search` operation |
| **Indexes** | User-defined | Managed by server |
| **Transactions** | Multi-document ACID | Per-operation atomicity |
| **Cursors** | Iterable result sets | Paginated responses |

---

## For REST API Developers

If you are familiar with REST APIs, MCP-AQL maps cleanly to RESTful patterns while adding
semantic grouping and introspection.

### HTTP Methods = CRUDE Endpoints

REST uses HTTP methods for semantics. MCP-AQL uses 5 semantic endpoints:

| HTTP Method | MCP-AQL Endpoint | Description |
|-------------|------------------|-------------|
| `POST` (create) | `mcp_aql_create` | Create new resources |
| `GET` | `mcp_aql_read` | Read resources |
| `PUT` / `PATCH` | `mcp_aql_update` | Modify resources |
| `DELETE` | `mcp_aql_delete` | Remove resources |
| N/A | `mcp_aql_execute` | Runtime operations |

### URL Paths = operation + resource parameters

REST encodes resources in URLs. MCP-AQL uses `operation` plus implementation-defined parameters:

| REST Pattern | MCP-AQL Pattern |
|--------------|-----------------|
| `GET /resources` | `{ operation: "list_resources" }` |
| `GET /resources/:id` | `{ operation: "get_resource", params: { id } }` |
| `POST /resources` | `{ operation: "create_resource", params: { ... } }` |
| `PUT /resources/:id` | `{ operation: "update_resource", params: { id, input } }` |
| `DELETE /resources/:id` | `{ operation: "delete_resource", params: { id } }` |

### Request/Response Patterns

**REST:**
```http
POST /api/users HTTP/1.1
Content-Type: application/json

{
  "name": "Alice",
  "description": "A helpful assistant",
  "settings": { "theme": "light" }
}
```

Response:
```json
{
  "id": "123",
  "name": "Alice",
  "description": "A helpful assistant",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**MCP-AQL:**
```javascript
// Request
{
  operation: "create_resource",
  params: {
    resource_type: "user",
    resource_id: "alice",
    description: "A helpful assistant",
    settings: { theme: "light" }
  }
}

// Response
{
  success: true,
  data: {
    name: "alice",
    type: "user",
    description: "A helpful assistant",
    // ... full resource data
  }
}
```

### Error Handling

| REST | MCP-AQL |
|------|---------|
| HTTP 200 OK | `{ success: true, data: ... }` |
| HTTP 400 Bad Request | `{ success: false, error: "Invalid parameter..." }` |
| HTTP 404 Not Found | `{ success: false, error: "Resource not found..." }` |
| HTTP 500 Internal Error | `{ success: false, error: "..." }` |

### API Documentation = Introspection

REST APIs use OpenAPI/Swagger for documentation. MCP-AQL uses introspection:

**OpenAPI (conceptual):**
```yaml
paths:
  /users:
    post:
      summary: Create a user
      parameters: [...]
```

**MCP-AQL:**
```javascript
// Discover all operations
{ operation: "introspect", params: { query: "operations" } }

// Get specific operation docs
{ operation: "introspect", params: { query: "operations", name: "create_resource" } }

// Returns:
{
  operation: {
    name: "create_resource",
    endpoint: "CREATE",
    mcpTool: "mcp_aql_create",
    description: "Create a new resource",
    parameters: [
      { name: "resource_id", type: "string", required: true, description: "Resource identifier" },
      // ...
    ],
    examples: [...]
  }
}
```

### Key Differences from REST

| Aspect | REST | MCP-AQL |
|--------|------|---------|
| **Transport** | HTTP | MCP (stdio/SSE) |
| **Versioning** | URL path (`/v1/...`) | Schema version in response |
| **HATEOAS** | Links in responses | Introspection for discovery |
| **Caching** | HTTP headers | Server-managed |
| **Authentication** | Headers (Bearer, API key) | MCP session-based |

---

## For SQL Developers

If you are familiar with SQL, MCP-AQL's structured operations and type system will feel familiar,
though the query patterns differ.

### Resource Types (like Tables)

SQL organizes data into tables. MCP-AQL implementations define resource type parameters:

| SQL | MCP-AQL Pattern |
|-----|-----------------|
| `users` table | `resource_type: "user"` |
| `posts` table | `resource_type: "post"` |
| `SELECT * FROM users` | `list_resources` with `resource_type` |

### SQL Statement Mapping

| SQL | MCP-AQL Pattern |
|-----|-----------------|
| `INSERT INTO` | Create operation |
| `SELECT * FROM` | List operation |
| `SELECT ... WHERE id =` | Get operation |
| `UPDATE ... SET` | Update operation |
| `DELETE FROM` | Delete operation |
| `SELECT ... WHERE ... LIKE` | Search operation |

### Query Examples

**SQL INSERT:**
```sql
INSERT INTO users (name, description, settings)
VALUES ('alice', 'A helpful assistant', '{"theme": "light"}');
```

**MCP-AQL:**
```javascript
{
  operation: "create_resource",
  params: {
    resource_type: "user",
    resource_id: "alice",
    description: "A helpful assistant",
    settings: { theme: "light" }
  }
}
```

**SQL SELECT:**
```sql
SELECT * FROM users WHERE name = 'alice';
```

**MCP-AQL:**
```javascript
{
  operation: "get_resource",
  params: {
    resource_type: "user",
    resource_id: "alice"
  }
}
```

**SQL UPDATE:**
```sql
UPDATE users
SET description = 'Updated description'
WHERE name = 'alice';
```

**MCP-AQL:**
```javascript
{
  operation: "update_resource",
  params: {
    resource_id: "alice",
    input: { description: "Updated description" }
  }
}
```

**SQL SEARCH:**
```sql
SELECT * FROM users
WHERE description LIKE '%creative%'
   OR settings LIKE '%creative%'
LIMIT 10;
```

**MCP-AQL:**
```javascript
{
  operation: "search",
  params: {
    query: "creative",
    scope: "local",
    type: "user",
    limit: 10
  }
}
```

### Schema Discovery

| SQL | MCP-AQL |
|-----|---------|
| `DESCRIBE users` | `introspect` with `query: "types"` |
| `SHOW TABLES` | `introspect` with `query: "operations"` |

### Key Differences from SQL

| Aspect | SQL | MCP-AQL |
|--------|-----|---------|
| **Query Language** | Declarative SQL | Structured JSON |
| **Joins** | Complex multi-table joins | Resource relationships via handlers |
| **Transactions** | BEGIN/COMMIT/ROLLBACK | Per-operation atomicity |
| **Indexes** | User-defined CREATE INDEX | Managed by server |
| **Stored Procedures** | User-defined functions | Agent execution |

---

## For Classic MCP Users

This section helps developers migrating from discrete MCP tool interfaces
to MCP-AQL understand the consolidation benefits.

### Before: Many Discrete Tools

Traditional MCP servers expose each operation as a separate tool:

```
create_user             delete_user             list_users
create_post             delete_post             list_posts
create_comment          delete_comment          list_comments
get_user                edit_user               search_users
get_post                edit_post               search_posts
...and more (potentially 40+ tools)
```

**Token cost:** ~30,000 tokens for tool registrations (depending on tool count)

### After: 5 CRUDE Endpoints

MCP-AQL consolidates into 5 semantic endpoints:

```
mcp_aql_create  - CREATE operations (create, import, activate, add entry)
mcp_aql_read    - READ operations (list, get, search, introspect)
mcp_aql_update  - UPDATE operations (edit)
mcp_aql_delete  - DELETE operations (delete, clear)
mcp_aql_execute - EXECUTE operations (execute workflows, update state)
```

**Token cost by mode:**
| Mode | Token Cost | Reduction |
|------|------------|-----------|
| CRUDE (5 endpoints) | ~4,300 | ~85% |
| Single (1 endpoint) | ~1,100 | ~96% |

### Migration Examples

**Before (Classic MCP):**
```javascript
// Tool: create_user
{
  name: "alice",
  description: "A helpful assistant",
  settings: { theme: "light" }
}
```

**After (MCP-AQL):**
```javascript
// Endpoint: mcp_aql_create
{
  operation: "create_resource",
  params: {
    resource_type: "user",
    resource_id: "alice",
    description: "A helpful assistant",
    settings: { theme: "light" }
  }
}
```

**Before (Classic MCP):**
```javascript
// Tool: list_users
{ page: 1, pageSize: 10 }
```

**After (MCP-AQL):**
```javascript
// Endpoint: mcp_aql_read
{
  operation: "list_resources",
  params: {
    resource_type: "user",
    first: 10
  }
}
```

### Tool to Operation Mapping

| Classic Tool Pattern | MCP-AQL Operation Pattern | Endpoint |
|---------------------|---------------------------|----------|
| `create_<type>` | `create_resource` + `resource_type` | CREATE |
| `list_<type>s` | `list_resources` + `resource_type` | READ |
| `get_<type>` | `get_resource` + `resource_type` | READ |
| `edit_<type>` | `update_resource` + `resource_type` | UPDATE |
| `delete_<type>` | `delete_resource` + `resource_type` | DELETE |
| `search_<type>s` | `search` | READ |
| `execute_<workflow>` | `execute_workflow` | EXECUTE |

### Permission Model Changes

**Before:** Each tool had implicit permissions based on naming convention.

**After:** Explicit CRUDE endpoint permissions:

| Endpoint | readOnly | destructive | Description |
|----------|----------|-------------|-------------|
| CREATE | false | false | Additive, non-destructive |
| READ | true | false | Safe, read-only |
| UPDATE | false | true | Modifying |
| DELETE | false | true | Destructive |
| EXECUTE | false | true | Potentially destructive, non-idempotent |

### Discovery Changes

**Before:** LLMs parsed all 40+ tool schemas upfront (~30,000 tokens).

**After:** LLMs use introspection for on-demand discovery:

```javascript
// Step 1: Quick discovery (~50 tokens)
{ operation: "introspect", params: { query: "operations" } }

// Step 2: Get details for relevant operation (~100 tokens)
{ operation: "introspect", params: { query: "operations", name: "create_resource" } }

// Step 3: Use the operation
{ operation: "create_resource", ... }
```

---

## Comprehensive Concept Mapping

This table maps concepts across all compared protocols.

| Concept | GraphQL | MongoDB | REST | SQL | MCP-AQL |
|---------|---------|---------|------|-----|---------|
| **Namespace** | Schema | Database | Base URL | Schema | Implementation-defined |
| **Type/Entity** | Type | Collection | Resource | Table | Resource type param |
| **Instance** | Object | Document | Resource instance | Row | Resource |
| **Identifier** | ID field | `_id` | Path param | Primary key | Resource ID |
| **Create** | Mutation | `insertOne` | POST | INSERT | `create_*` operation |
| **Read One** | Query | `findOne` | GET /:id | SELECT ... WHERE | `get_*` operation |
| **Read Many** | Query | `find` | GET / | SELECT * | `list_*` operation |
| **Update** | Mutation | `updateOne` | PUT/PATCH | UPDATE | `update_*` operation |
| **Delete** | Mutation | `deleteOne` | DELETE | DELETE | `delete_*` operation |
| **Search** | Query | `find`+text | GET /search | LIKE/FTS | `search` operation |
| **Schema Discovery** | `__schema` | `getCollectionInfos` | OpenAPI | DESCRIBE | `introspect` |
| **Parameters** | Variables | Filter/options | Query/body | WHERE/VALUES | `params` object |
| **Response** | `{ data, errors }` | Document | JSON body | Result set | `{ success, data/error }` |
| **Error** | `errors` array | Exception | HTTP status | SQLSTATE | `{ success: false, error }` |
| **Batch** | N/A (single) | `insertMany` | Bulk endpoint | Transaction | `operations` array |
| **Pagination** | `first/after` | `skip/limit` | Query params | OFFSET/LIMIT | `first/after` (preferred) or adapter-documented compatibility params |

---

## Code Examples: Same Operation Across Protocols

### Example 1: Create a Resource

**GraphQL:**
```graphql
mutation CreateUser($input: UserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}

# Variables
{
  "input": {
    "name": "CreativeWriter",
    "email": "writer@example.com",
    "bio": "A creative writing assistant"
  }
}
```

**MongoDB:**
```javascript
db.users.insertOne({
  name: "CreativeWriter",
  email: "writer@example.com",
  bio: "A creative writing assistant",
  created_at: new Date()
});
```

**REST:**
```http
POST /api/users HTTP/1.1
Content-Type: application/json

{
  "name": "CreativeWriter",
  "description": "A creative writing assistant",
  "settings": { "expertise": "storytelling, poetry, imaginative content" }
}
```

**SQL:**
```sql
INSERT INTO users (name, description, settings, created_at)
VALUES (
  'CreativeWriter',
  'A creative writing assistant',
  '{"expertise": "storytelling, poetry, imaginative content"}',
  NOW()
);
```

**Classic MCP:**
```javascript
// Tool: create_user
{
  name: "CreativeWriter",
  description: "A creative writing assistant",
  settings: { expertise: "storytelling, poetry, imaginative content" }
}
```

**MCP-AQL:**
```javascript
// Endpoint: mcp_aql_create
{
  operation: "create_resource",
  params: {
    resource_type: "user",
    resource_id: "CreativeWriter",
    description: "A creative writing assistant",
    settings: { expertise: "storytelling, poetry, imaginative content" }
  }
}
```

### Example 2: Search for Resources

**GraphQL:**
```graphql
query SearchUsers($query: String!, $limit: Int) {
  searchUsers(query: $query, limit: $limit) {
    results {
      name
      description
    }
    total
  }
}

# Variables
{ "query": "creative writing", "limit": 10 }
```

**MongoDB:**
```javascript
db.users.find({
  $text: { $search: "creative writing" }
}).limit(10).toArray();
```

**REST:**
```http
GET /api/users/search?q=creative+writing&limit=10 HTTP/1.1
```

**SQL:**
```sql
SELECT * FROM users
WHERE description LIKE '%creative%'
   OR description LIKE '%writing%'
LIMIT 10;
```

**Classic MCP:**
```javascript
// Tool: search_users
{
  query: "creative writing",
  type: "user",
  limit: 10
}
```

**MCP-AQL:**
```javascript
// Endpoint: mcp_aql_read
{
  operation: "search",
  params: {
    query: "creative writing",
    type: "user",
    scope: "local",
    limit: 10
  }
}
```

### Example 3: Update a Resource

**GraphQL:**
```graphql
mutation UpdateUser($name: String!, $input: UpdateUserInput!) {
  updateUser(name: $name, input: $input) {
    name
    description
  }
}

# Variables
{
  "name": "CreativeWriter",
  "input": {
    "description": "An enhanced creative writing assistant with poetry expertise"
  }
}
```

**MongoDB:**
```javascript
db.users.updateOne(
  { name: "CreativeWriter" },
  { $set: { description: "An enhanced creative writing assistant with poetry expertise" } }
);
```

**REST:**
```http
PATCH /api/users/CreativeWriter HTTP/1.1
Content-Type: application/json

{
  "description": "An enhanced creative writing assistant with poetry expertise"
}
```

**SQL:**
```sql
UPDATE users
SET description = 'An enhanced creative writing assistant with poetry expertise'
WHERE name = 'CreativeWriter';
```

**Classic MCP:**
```javascript
// Tool: edit_user
{
  name: "CreativeWriter",
  description: "An enhanced creative writing assistant with poetry expertise"
}
```

**MCP-AQL:**
```javascript
// Endpoint: mcp_aql_update
{
  operation: "update_resource",
  params: {
    resource_id: "CreativeWriter",
    input: {
      description: "An enhanced creative writing assistant with poetry expertise"
    }
  }
}
```

### Example 4: Discover Available Operations

**GraphQL:**
```graphql
{
  __schema {
    mutationType {
      fields {
        name
        description
      }
    }
  }
}
```

**MongoDB:**
```javascript
// No direct equivalent - typically use documentation
db.getCollectionInfos();
```

**REST:**
```http
GET /api/openapi.json HTTP/1.1
# or
GET /api/swagger.json HTTP/1.1
```

**SQL:**
```sql
SHOW TABLES;
DESCRIBE users;
```

**Classic MCP:**
```
# No dedicated operation - parsed from tool schemas
# (Consumed ~30,000 tokens for all 40+ tools)
```

**MCP-AQL:**
```javascript
// Endpoint: mcp_aql_read
// List all operations
{ operation: "introspect", params: { query: "operations" } }

// Get details for specific operation
{ operation: "introspect", params: { query: "operations", name: "update_resource" } }

// List available types
{ operation: "introspect", params: { query: "types" } }
```

---

## Summary

MCP-AQL combines the best patterns from established protocols:

- **From GraphQL:** Introspection, typed operations, nested input objects, **field selection**
- **From MongoDB:** Flexible document operations, simple query patterns
- **From REST:** Semantic endpoint grouping, clear resource addressing
- **From SQL:** Structured CRUD operations, schema awareness

The result is a protocol optimized for **LLM token efficiency** while remaining **human-readable**
and **developer-friendly**.

### Token Efficiency Summary

| Feature | Token Savings | Description |
|---------|---------------|-------------|
| **CRUDE Consolidation** | ~85-96% | Semantic endpoints instead of discrete tools |
| **On-Demand Introspection** | ~95% | Query schemas as needed vs. upfront parsing |
| **Field Selection** | ~70-90% | Return only requested fields in responses |

---

## Related Documentation

- [Overview](../reference/overview.md) - Architecture overview
- [Operations](../reference/operations.md) - Complete operation reference
- [Introspection](../reference/introspection.md) - Discovery system
- [Design Decisions](../reference/design-decisions.md) - Design rationale
