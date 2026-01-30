# Changelog

All notable changes to the MCP-AQL specification will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Danger level enum inconsistency across schemas (#99)
  - Aligned all schemas and docs with canonical `danger-levels.md` spec
  - Renamed `moderate` → `reversible` for clearer semantic meaning
  - Canonical enum: `["safe", "reversible", "destructive", "dangerous", "forbidden"]`
- Claude auto-review workflow not triggering on pull_request events (#95)

### Changed

- Added clock skew tolerance validation code example to confirmation tokens (#111)
  - Shows how to apply tolerance by adding to expiry time
  - Updated validateToken example to reference clock skew handling
- Added deployment environment table for clock skew tolerance (#112)
  - Recommended values for typical, air-gapped, IoT, high-security, and zero-trust environments
- Added reference links to MVP error codes for consistency with Phase 1 codes (#86)
  - MVP codes reference this specification as primary source
  - HTTP-mapped codes include RFC 9110 section links
- Enhanced RATE_LIMIT_QUOTA_WARNING note to better distinguish it from error codes (#87)
  - Added warning emoji and IMPORTANT label for visual prominence
  - Cross-reference to Warnings Specification
- Added explanatory notes for CONFIRMATION_REQUIRED error code category placement (#85)
  - Explains why it's under "Permission" category (part of permission gating flow)
  - Documents conditional denial with recovery path pattern
- Added bidirectional navigation links between spec documents for improved discoverability (#69)
  - error-codes.md, trust-levels.md, rate-limiting.md, danger-levels.md, element-type.md, plugin-contracts.md
- Updated cross-references in trust-levels.md from GitHub issues to file paths (#78)
- Deduplicated trust-to-danger gating matrix (#81)
  - danger-levels.md is now the canonical source for the gating matrix
  - trust-levels.md references danger-levels.md instead of duplicating the matrix
  - Consistent terminology: `introspect_only` instead of `introspect`

### Added

- SCHEMA_ error code category for generator validation errors (#128)
  - Added to Category Prefixes table in error-codes.md
  - Explanatory note distinguishing generator-time from runtime errors
  - Cross-reference to adapter generator specification Section 2.2
- Warning deduplication guidance in warnings specification (#92)
  - Server-side deduplication strategies with optional occurrence_count field
  - Client-side deduplication patterns (session, time-based, code filtering)
  - Recommendations table for different contexts
- Optional severity field for warnings to enable client prioritization (#93)
  - Levels: low, medium (default), high
  - Implementation guidelines and client handling examples
- Severity recommendations for standard warning codes (#117)
  - RATE_LIMIT_QUOTA_WARNING: high (>90%), medium (at threshold)
  - DEPRECATION_WARNING: high (<30 days), medium (>30 days), low (no date)
  - VALIDATION_TRUNCATED_WARNING: medium (>50%), low (≤50%)
  - PERFORMANCE_SLOW_QUERY_WARNING: high (>10x), medium (2-10x), low (<2x)
- Numeric severity mapping convention (#118)
  - high=0, medium=1, low=2 for consistent sorting and comparison
  - Enables database storage and threshold filtering
- Clock skew tolerance configurability documentation for confirmation tokens (#94)
  - Default 30s accommodates typical NTP-synchronized systems
  - Guidance for air-gapped, high-security, and IoT deployments
- Adapter generator specification (#21)
  - Schema input format with AdapterSchema interface
  - Generated output structure and directory layout
  - Licensing artifacts (AGPL-3.0, NOTICE.md, COMMERCIAL-LICENSE.md)
  - Provenance information with MCPAQL-PROVENANCE.json
  - Language template guidance (TypeScript, JavaScript required)
  - Generator and adapter conformance requirements
- Generator CLI interface specification (#113)
  - Required arguments (--schema, --target)
  - Optional arguments (--output, --config, --verbose, etc.)
  - Exit codes for different failure modes
  - JSON output format for programmatic consumption
- Schema version evolution strategy documentation (#114)
  - Version format rationale (major.minor vs semver)
  - Evolution strategy with change type examples
  - Backward compatibility requirements
  - Version handling code example with deprecation support
- Validation error code examples for adapter generator (#115)
  - Error codes for each validation requirement (SCHEMA_MISSING_FIELD, etc.)
  - Example validation error response format
- Conformance Testing specification with Level 1/Level 2 definitions (#10, #55, #56)
  - Level 1 Basic: introspect, endpoint routing, response format, error handling
  - Level 2 Full: field selection, batch operations, cross-cutting params
  - Five test categories: Introspection Fidelity, Parameter Handling, Error Quality, Round-Trip Integrity, Constraint Documentation
  - Two-tier evaluation methodology (structural + semantic) for LLM discoverability testing
- mcpaql-conformance CLI interface specification (#116)
  - Commands: test, report, version
  - Options: --level, --output, --format, --verbose, --tier, --category, --timeout
  - Exit codes for different test outcomes (0-5)
  - Integration guidance with adapter generator
- JSON Schema definitions for batch operations, field selection, and adapter schemas (#9)
  - `batch-operation.schema.json`: Batch request/response validation
  - `field-selection.schema.json`: Field selection parameters and presets
  - `adapter-schema.schema.json`: Adapter definition file validation
- RFC 2119 conformance requirements from DollhouseMCP learnings (#54, #57)
  - Introspection accuracy MUST requirements (parameter names, types, required status)
  - Parameter completeness MUST requirements (all handler params in introspection)
  - Error message quality MUST requirements (no implementation leakage)
  - Unknown parameter handling, element-type constraints SHOULD requirements
- Cross-cutting parameter standard in operations.md (#58)
  - Standard params: fields, limit, offset, page, page_size, sort, order, dry_run
  - Shared parameter definition pattern with $ref mechanism
  - Consistency requirements for multi-operation parameters
- Warnings Array specification for non-fatal conditions in successful responses (#80)
  - Optional `warnings` array extension to discriminated response format
  - Warning object schema matching error object structure
  - Standard warning codes: RATE_LIMIT_QUOTA_WARNING, DEPRECATION_WARNING, VALIDATION_TRUNCATED_WARNING, PERFORMANCE_SLOW_QUERY_WARNING
  - Client processing requirements and display guidelines
  - ADR-006 updated to include warnings in success response schema
- Confirmation Token specification for gating dangerous operations and quota continuations (#79)
  - Token format with `conf_` and `quota_continue_` prefixes
  - Cryptographic generation requirements (128+ bit entropy from secure random source)
  - Scope binding with SHA-256 parameter hashing
  - Validation checks (existence, expiry, single-use, scope matching)
  - Token lifecycle (expiration, single-use, revocation, session-scoped)
  - `TOKEN_` error category: `TOKEN_INVALID`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED`, `TOKEN_SCOPE_MISMATCH`
- Trust Levels specification for adapter verification and validation status (#59)
  - Trust level enum: untested, generated, validated, community_reviewed, certified
  - Trust metadata schema with promotion history
  - Promotion and demotion rules
  - Trust-to-operation permission gating matrix
  - Integration with danger levels for combined security gating
- Dangerous Operation Classification specification for operation risk management (#49)
  - Danger level enum: safe (0), reversible (1), destructive (2), dangerous (3), forbidden (4)
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
