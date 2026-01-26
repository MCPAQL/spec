---
name: github-api
type: adapter
version: "1.0.0"
description: "Adapter for GitHub REST API v3, enabling repository and issue management through MCP-AQL"

author: "MCP-AQL Specification Team"
tags:
  - github
  - git
  - repositories
  - issues
  - version-control
triggers:
  - github
  - repository
  - repo
  - issue
  - pull request
created: "2026-01-26T00:00:00Z"
modified: "2026-01-26T00:00:00Z"

target:
  base_url: "https://api.github.com"
  transport: http
  protocol: rest
  serialization: json

auth:
  type: bearer
  token_env: GITHUB_TOKEN

operations:
  create:
    - name: create_repo
      maps_to: "POST /user/repos"
      description: "Create a new repository for the authenticated user"
      params:
        name:
          type: string
          required: true
          description: "The name of the repository"
        description:
          type: string
          description: "A short description of the repository"
        private:
          type: boolean
          default: false
          description: "Whether the repository is private"
        auto_init:
          type: boolean
          default: false
          description: "Create an initial commit with empty README"

    - name: create_issue
      maps_to: "POST /repos/{owner}/{repo}/issues"
      description: "Create a new issue in a repository"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"
        title:
          type: string
          required: true
          description: "The title of the issue"
        body:
          type: string
          description: "The contents of the issue"
        labels:
          type: array
          description: "Labels to associate with this issue"
        assignees:
          type: array
          description: "Logins for users to assign to this issue"

    - name: create_comment
      maps_to: "POST /repos/{owner}/{repo}/issues/{issue_number}/comments"
      description: "Create a comment on an issue"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"
        issue_number:
          type: integer
          required: true
          description: "The number of the issue"
        body:
          type: string
          required: true
          description: "The contents of the comment"

  read:
    - name: introspect
      maps_to: "INTERNAL"
      description: "Query available operations and types"
      params:
        query:
          type: string
          required: true
          enum: [operations, types]
          description: "Query type: 'operations' or 'types'"
        name:
          type: string
          description: "Specific item name for details"

    - name: get_repo
      maps_to: "GET /repos/{owner}/{repo}"
      description: "Get detailed information about a repository"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"

    - name: list_repos
      maps_to: "GET /users/{username}/repos"
      description: "List public repositories for a user"
      params:
        username:
          type: string
          required: true
          description: "The handle for the GitHub user account"
        type:
          type: string
          enum: [all, owner, member]
          default: owner
          description: "Filter repos by type"
        sort:
          type: string
          enum: [created, updated, pushed, full_name]
          default: full_name
          description: "Sort order for results"
        per_page:
          type: integer
          default: 30
          description: "Results per page (max 100)"

    - name: list_my_repos
      maps_to: "GET /user/repos"
      description: "List repositories for the authenticated user"
      params:
        visibility:
          type: string
          enum: [all, public, private]
          default: all
          description: "Filter repos by visibility"
        type:
          type: string
          enum: [all, owner, public, private, member]
          default: all
          description: "Filter repos by type"
        sort:
          type: string
          enum: [created, updated, pushed, full_name]
          default: full_name
          description: "Sort order for results"
        per_page:
          type: integer
          default: 30
          description: "Results per page (max 100)"

    - name: get_issue
      maps_to: "GET /repos/{owner}/{repo}/issues/{issue_number}"
      description: "Get a specific issue"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"
        issue_number:
          type: integer
          required: true
          description: "The number of the issue"

    - name: list_issues
      maps_to: "GET /repos/{owner}/{repo}/issues"
      description: "List issues in a repository"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"
        state:
          type: string
          enum: [open, closed, all]
          default: open
          description: "Filter by issue state"
        labels:
          type: string
          description: "Comma-separated list of label names"
        sort:
          type: string
          enum: [created, updated, comments]
          default: created
          description: "Sort order for results"
        direction:
          type: string
          enum: [asc, desc]
          default: desc
          description: "Sort direction"
        per_page:
          type: integer
          default: 30
          description: "Results per page (max 100)"

    - name: search_repos
      maps_to: "GET /search/repositories"
      description: "Search for repositories"
      params:
        q:
          type: string
          required: true
          description: "Search query (GitHub search syntax)"
        sort:
          type: string
          enum: [stars, forks, help-wanted-issues, updated]
          description: "Sort field"
        order:
          type: string
          enum: [asc, desc]
          default: desc
          description: "Sort order"
        per_page:
          type: integer
          default: 30
          description: "Results per page (max 100)"

    - name: get_user
      maps_to: "GET /users/{username}"
      description: "Get a user's profile"
      params:
        username:
          type: string
          required: true
          description: "The handle for the GitHub user account"

    - name: get_authenticated_user
      maps_to: "GET /user"
      description: "Get the authenticated user's profile"

  update:
    - name: update_repo
      maps_to: "PATCH /repos/{owner}/{repo}"
      description: "Update a repository's settings"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"
        name:
          type: string
          description: "New name for the repository"
        description:
          type: string
          description: "New description for the repository"
        private:
          type: boolean
          description: "Whether the repository is private"
        has_issues:
          type: boolean
          description: "Enable issues"
        has_wiki:
          type: boolean
          description: "Enable wiki"

    - name: update_issue
      maps_to: "PATCH /repos/{owner}/{repo}/issues/{issue_number}"
      description: "Update an issue"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"
        issue_number:
          type: integer
          required: true
          description: "The number of the issue"
        title:
          type: string
          description: "New title for the issue"
        body:
          type: string
          description: "New body content for the issue"
        state:
          type: string
          enum: [open, closed]
          description: "State of the issue"
        labels:
          type: array
          description: "Labels to set on the issue"
        assignees:
          type: array
          description: "Logins for users to assign"

    - name: add_labels
      maps_to: "POST /repos/{owner}/{repo}/issues/{issue_number}/labels"
      description: "Add labels to an issue"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"
        issue_number:
          type: integer
          required: true
          description: "The number of the issue"
        labels:
          type: array
          required: true
          description: "Labels to add to the issue"

  delete:
    - name: delete_repo
      maps_to: "DELETE /repos/{owner}/{repo}"
      description: "Delete a repository (requires admin access)"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"

    - name: remove_label
      maps_to: "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}"
      description: "Remove a label from an issue"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"
        issue_number:
          type: integer
          required: true
          description: "The number of the issue"
        name:
          type: string
          required: true
          description: "The name of the label to remove"

    - name: delete_comment
      maps_to: "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}"
      description: "Delete an issue comment"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"
        comment_id:
          type: integer
          required: true
          description: "The unique identifier of the comment"

  execute:
    - name: star_repo
      maps_to: "PUT /user/starred/{owner}/{repo}"
      description: "Star a repository"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"

    - name: unstar_repo
      maps_to: "DELETE /user/starred/{owner}/{repo}"
      description: "Unstar a repository"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"

    - name: fork_repo
      maps_to: "POST /repos/{owner}/{repo}/forks"
      description: "Fork a repository"
      params:
        owner:
          type: string
          required: true
          description: "The account owner of the repository"
        repo:
          type: string
          required: true
          description: "The name of the repository"
        organization:
          type: string
          description: "Organization to fork into (defaults to user)"
---

## Overview

This adapter provides MCP-AQL access to the GitHub REST API v3, enabling LLMs to manage repositories, issues, and related resources through the unified CRUDE interface.

## Authentication

This adapter requires a GitHub Personal Access Token with appropriate scopes:

- `repo` - Full control of private repositories
- `public_repo` - Access public repositories only
- `delete_repo` - Delete repositories (for delete_repo operation)

Set your token in the `GITHUB_TOKEN` environment variable.

## Operations Overview

### CREATE Operations

| Operation | Description |
|-----------|-------------|
| `create_repo` | Create a new repository |
| `create_issue` | Create an issue in a repository |
| `create_comment` | Add a comment to an issue |

### READ Operations

| Operation | Description |
|-----------|-------------|
| `introspect` | Query available operations and types |
| `get_repo` | Get repository details |
| `list_repos` | List user's repositories |
| `list_my_repos` | List authenticated user's repositories |
| `get_issue` | Get issue details |
| `list_issues` | List repository issues |
| `search_repos` | Search for repositories |
| `get_user` | Get user profile |
| `get_authenticated_user` | Get current user profile |

### UPDATE Operations

| Operation | Description |
|-----------|-------------|
| `update_repo` | Modify repository settings |
| `update_issue` | Modify issue details |
| `add_labels` | Add labels to an issue |

### DELETE Operations

| Operation | Description |
|-----------|-------------|
| `delete_repo` | Delete a repository |
| `remove_label` | Remove a label from an issue |
| `delete_comment` | Delete an issue comment |

### EXECUTE Operations

| Operation | Description |
|-----------|-------------|
| `star_repo` | Star a repository |
| `unstar_repo` | Unstar a repository |
| `fork_repo` | Fork a repository |

## Usage Examples

### Create a Repository

```json
{
  "operation": "create_repo",
  "params": {
    "name": "my-new-project",
    "description": "A new project created via MCP-AQL",
    "private": true,
    "auto_init": true
  }
}
```

### List Issues

```json
{
  "operation": "list_issues",
  "params": {
    "owner": "octocat",
    "repo": "Hello-World",
    "state": "open",
    "labels": "bug,help wanted"
  }
}
```

### Create an Issue

```json
{
  "operation": "create_issue",
  "params": {
    "owner": "octocat",
    "repo": "Hello-World",
    "title": "Found a bug",
    "body": "Steps to reproduce...",
    "labels": ["bug"]
  }
}
```

### Search Repositories

```json
{
  "operation": "search_repos",
  "params": {
    "q": "language:typescript stars:>1000",
    "sort": "stars",
    "per_page": 10
  }
}
```

## Rate Limits

GitHub API has rate limits:
- Authenticated requests: 5,000 per hour
- Search API: 30 requests per minute

The adapter does not currently enforce rate limits (deferred to #60).

## References

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [MCP-AQL Adapter Element Type Specification](../docs/adapter/element-type.md)
