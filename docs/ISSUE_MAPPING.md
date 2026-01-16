# MCP-AQL Issue Mapping

This document maps related issues across the MCPAQL organization repositories and the DollhouseMCP reference implementation.

## Protocol Feature Issues

| Feature | MCPAQL/spec | DollhouseMCP Reference |
|---------|-------------|------------------------|
| Structured Error Codes | [#35](https://github.com/MCPAQL/spec/issues/35) | [#298](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/298) |
| Server-side Aggregations | [#36](https://github.com/MCPAQL/spec/issues/36) | [#309](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/309) |
| Cursor-based Pagination | [#37](https://github.com/MCPAQL/spec/issues/37) | [#299](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/299) |
| Dry-run Mode | [#38](https://github.com/MCPAQL/spec/issues/38) | [#310](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/310) |
| ETag Versioning | [#39](https://github.com/MCPAQL/spec/issues/39) | [#300](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/300) |
| Notifications | [#40](https://github.com/MCPAQL/spec/issues/40) | [#311](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/311) |
| Request IDs / Tracing | [#41](https://github.com/MCPAQL/spec/issues/41) | [#301](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/301) |
| Computed Fields | [#42](https://github.com/MCPAQL/spec/issues/42) | [#312](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/312) |
| Streaming Responses | [#43](https://github.com/MCPAQL/spec/issues/43) | [#302](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/302) |
| Relationship Queries | [#44](https://github.com/MCPAQL/spec/issues/44) | [#303](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/303) |
| ADR: GraphQL Format | [#45](https://github.com/MCPAQL/spec/issues/45) | [#150](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/150) |
| Partial Success in Batch | [#46](https://github.com/MCPAQL/spec/issues/46) | [#304](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/304) |
| GraphQL Specification Docs | [#47](https://github.com/MCPAQL/spec/issues/47) | [#157](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/157) |
| Schema Versioning | [#48](https://github.com/MCPAQL/spec/issues/48) | [#305](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/305) |
| Dangerous Operation Classification | [#49](https://github.com/MCPAQL/spec/issues/49) | [#318](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/318) |

## Adapter Generator Issues

| Feature | MCPAQL/adapter-generator | DollhouseMCP Reference |
|---------|--------------------------|------------------------|
| Epic: Adapter Generator | [#8](https://github.com/MCPAQL/adapter-generator/issues/8) | [#152](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/152) |
| Schema Generator (GraphQL) | [#9](https://github.com/MCPAQL/adapter-generator/issues/9) | [#153](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/153) |
| Adapter Compiler | [#10](https://github.com/MCPAQL/adapter-generator/issues/10) | [#154](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/154) |
| Policy Engine Integration | [#11](https://github.com/MCPAQL/adapter-generator/issues/11) | [#155](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/155) |
| Adapter Registry | [#12](https://github.com/MCPAQL/adapter-generator/issues/12) | [#156](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/156) |

## Implementation Guide

Created as MCPAQL/spec#34: [docs: Add implementation guide for adapting MCP-AQL to other domains](https://github.com/MCPAQL/spec/issues/34)

## How to Use This Mapping

- **Spec issues** define protocol requirements that any MCP-AQL implementation should follow
- **DollhouseMCP issues** track the reference implementation
- **Adapter Generator issues** track the standalone tooling for creating new adapters

When working on a feature:
1. Check the spec issue for protocol requirements
2. Check the DollhouseMCP issue for implementation patterns
3. Update both when making changes

---

*Last updated: 2026-01-16*
