# Changelog

All notable changes to the MCP-AQL specification will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Updated cross-references in trust-levels.md from GitHub issues to file paths (#78)

### Added

- Trust Levels specification for adapter verification and validation status (#59)
  - Trust level enum: untested, generated, validated, community_reviewed, certified
  - Trust metadata schema with promotion history
  - Promotion and demotion rules
  - Trust-to-operation permission gating matrix
  - Integration with danger levels for combined security gating
- Dangerous Operation Classification specification for operation risk management (#49)
  - Danger level enum: safe (0), moderate (1), destructive (2), dangerous (3), forbidden (4)
  - Operation danger metadata schema with reasons and confirmation messages
  - Trust-to-danger gating matrix for combined security decisions
  - Automatic lockdown behavior with pattern-based classification
  - Standard dangerous/forbidden operation patterns
  - Confirmation flow with token-based acknowledgment
- Rate Limiting and Quota Management specification for API usage control (#60)
  - API limits schema for target API rate constraints
  - User-configurable quotas with warn/pause/hard_stop thresholds
  - Cost estimation and tracking for paid APIs
  - Enforcement behavior with progressive response
  - Rate limit error codes: RATE_LIMIT_EXCEEDED, RATE_LIMIT_QUOTA_PAUSE, RATE_LIMIT_QUOTA_EXHAUSTED
  - Introspection of quota status
- Cursor-based Pagination specification for collection operations (#37)
  - Pagination parameters: first, after, last, before
  - PageInfo response structure with hasNextPage, hasPreviousPage, cursors
  - Connection-style response format with items or edges (mutually exclusive)
  - Uses existing VALIDATION_INVALID_TYPE for pagination errors
  - Introspection of pagination support
- Phase 1 error codes formally added to error-codes.md (#77)
  - PERMISSION_TRUST_LEVEL_INSUFFICIENT - adapter trust level too low
  - PERMISSION_DANGER_LEVEL_DENIED - operation danger level exceeds trust
  - CONFIRMATION_REQUIRED - dangerous operation requires confirmation
  - RATE_LIMIT_EXCEEDED - API rate limit reached
  - RATE_LIMIT_QUOTA_PAUSE - user quota pause threshold
  - RATE_LIMIT_QUOTA_EXHAUSTED - user quota hard stop
  - RATE_LIMIT_QUOTA_WARNING - approaching quota limit (warning)

## [1.0.0-alpha.1] - 2026-01-28

### Security

- Fix script injection vulnerabilities in CI workflows
  - Pass step outputs and PR number through `env:` blocks instead of direct `${{ }}` interpolation in shell scripts
  - Remove user-controlled PR title from Claude review prompt to prevent prompt injection
  - Narrow Claude review bot API access to only PR/issue comment endpoints

### Added

- Adapter Element Type specification (MVP) defining declarative adapter schema format (#61)
  - Required fields: name, type, version, description
  - Target configuration for HTTP/REST/JSON
  - Authentication support: bearer, api_key, none
  - Operation definitions with typed parameters
- GitHub API adapter example demonstrating all CRUDE operations
- Plugin Interface specification (MVP) for adapter extensibility (#62)
  - Transport plugins: HTTP
  - Protocol plugins: REST
  - Serialization plugins: JSON
  - Auth plugins: bearer, api_key, none
  - Plugin composition pipeline documentation
- Universal Adapter Runtime specification (MVP) for schema-driven execution (#63)
  - Schema loading and validation
  - Operation dispatch pipeline
  - Error mapping to structured codes
  - Response transformation
- Structured Error Codes specification (MVP) for machine-readable errors (#35)
  - 6 MVP error codes: VALIDATION_MISSING_PARAM, VALIDATION_INVALID_TYPE,
    NOT_FOUND_OPERATION, NOT_FOUND_RESOURCE, PERMISSION_DENIED, INTERNAL_ERROR
  - Error response format with code, message, and optional details
  - JSON Schema for error response validation
- CI workflows for documentation quality (markdown lint, link check, spell check)
- CI workflow for JSON Schema validation
- CI workflow for changelog enforcement
- Git flow branching strategy with `develop` branch
- Issue templates (bug report, feature request, RFC proposal)
- Pull request template with checklist
- CODEOWNERS file for review auto-assignment
- Process documentation:
  - RFC process for specification changes
  - Breaking change policy
  - Versioning strategy
- Initial JSON schemas for operation input/result formats
- JSON Schema for introspection response format (`introspection-response.schema.json`)
- JSON Schema for danger level classification (`danger-level.schema.json`)
- Schema documentation with usage examples (`schemas/README.md`)
- Core specification documents:
  - Protocol overview (`docs/overview.md`)
  - Introspection system (`docs/introspection.md`)
  - Endpoint modes (`docs/endpoint-modes.md`)
  - Operations reference (`docs/operations.md`)
  - Protocol comparison guide (`docs/guides/protocol-comparison.md`)
- Architecture Decision Records (ADRs):
  - ADR-001: CRUDE Pattern
  - ADR-002: GraphQL-style Input Objects
  - ADR-003: snake_case Parameters
  - ADR-004: Schema-driven Operations
  - ADR-005: Introspection System
  - ADR-006: Discriminated Responses
- Main specification document updates (`docs/versions/v1.0.0-draft.md`):
  - Added Appendix D with JSON Schema references
  - Added links to all new documentation in Appendix B
  - Renamed `CRUDEndpoint` to `EndpointCategory` in type system section

### Changed

- Rewrite Claude Code review prompt for substantive peer-quality reviews on every run
- Broaden lychee link checker exclude to all MCPAQL GitHub repos (private, return 404 from CI)
- Made specification fully generic (removed DollhouseMCP-specific terminology)
- Changed operations.md from prescriptive list to design guide
- Clarified that only `introspect` operation is required by protocol
- Updated token efficiency examples to be generic
- Enhanced Claude code review workflow with comprehensive prompt:
  - Project context and key concepts
  - Specific review criteria for spec documents, schemas, and examples
  - Structured output format (Summary, Strengths, Issues, Suggestions, Verdict)
  - Progress tracking enabled

### Fixed

- Fixed markdown lint errors (MD022) in session notes - missing blank lines after headings
- Added DollhouseMCP/mcp-server-v2-refactor to lychee exclusions (historical references)

## [1.0.0-draft] - 2026-01-05

### Added

- Initial draft specification for MCP-AQL (Model Context Protocol - AQL Query Language)
- CRUDE pattern defining five operation categories: Create, Read, Update, Delete, Execute
- Introspection system for runtime schema and capability discovery
- Operations reference documenting standard operations and parameters
