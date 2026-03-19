# MCP Server Discovery Bundle

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-03-19

> **Document Status:** This document is **informative support text** for the current MCP-AQL draft. The normative source of truth remains [Specification v1.0.0-draft](../versions/v1.0.0-draft.md) plus the published schemas in `spec/schemas/`.

## Abstract

This document defines the minimal discovery bundle contract used when interrogating an MCP server and synthesizing a spec-aligned MCP-AQL adapter schema. The bundle is an intermediate artifact in the MCP server -> MCP-AQL adapter pipeline. It is not a separate protocol layer and does not supersede the main MCP-AQL specification.

## Purpose

The discovery bundle exists to make generator pipelines reproducible and auditable:

- `raw_capture` preserves what the source MCP server actually reported
- `normalized_bundle` records the generator-facing interpretation of that capture
- provenance fields make it possible to trace every inferred value back to source metadata or an explicit heuristic

This split is especially important when adapting third-party MCP servers whose tool descriptions may be incomplete, ambiguous, or biased toward a specific host application.

## Two-Layer Structure

### `raw_capture`

`raw_capture` contains source facts captured directly from the MCP server, without semantic rewriting.

Current minimal required contents:

- exact `tools/list` payload

`raw_capture` SHOULD preserve source field names exactly as received.

When an interrogator captures additional source response metadata such as pagination cursors, opaque `_meta` fields, or other transport-specific response facts, those MAY also be preserved in `raw_capture`.

The following capture context belongs in `source`, not `raw_capture`:

- server identity/version information when available
- capture timestamp
- connection metadata needed to understand the source context
- redacted capture configuration

### `normalized_bundle`

`normalized_bundle` contains derived records that downstream schema builders and validators consume.

Minimum contents:

- normalized operation records
- endpoint classification suggestions
- parameter normalization records
- danger-level defaults
- confidence markers
- warnings for ambiguity or unsupported shapes

Every inferred field in `normalized_bundle` SHOULD carry enough provenance to explain whether it came from:

1. `direct_source_metadata`
2. `deterministic_normalization`
3. `heuristic_classification`
4. `manual_override`

Generators SHOULD populate `provenance.inference_sources` whenever a normalized field was derived rather than copied directly from source metadata.

## Minimal Record Shape

The current minimal discovery bundle contract is captured in [`schemas/discovery-bundle.schema.json`](../../schemas/discovery-bundle.schema.json).

Important required concepts:

- `source`
  - source server identity
  - transport information
  - auth metadata with secrets redacted from persisted config
- `raw_capture.tools`
  - raw upstream tool definitions
- `normalized_bundle.operations`
  - `source_tool_name`
  - `operation_name`
  - `endpoint`
  - `endpoint_confidence`
  - `danger_level`
  - `needs_review`
  - normalized parameter list
  - `maps_to`
- `normalized_bundle.warnings`
  - machine-readable warnings emitted during capture/normalization
  - `review_reasons` remain human-readable operation-local explanations, while `warnings` remain the cross-operation machine-readable signal channel

## Mapping Expectations

The discovery bundle is intentionally narrow. It does not define MCP-AQL itself. Instead, it exists to preserve enough information for a later schema builder to produce an MCP-AQL adapter schema that validates against the current MCP-AQL spec.

The schema builder is expected to:

- preserve source semantics before style normalization
- classify CRUDE endpoints conservatively
- surface ambiguous operations for review rather than silently “guessing”
- transform `normalized_bundle.operations[].params` from an ordered array of parameter records into the keyed `params` object used by the adapter schema
- treat `params[].source_path` as a dot-path into the raw upstream tool object unless a future version defines a different encoding
- understand that `maps_to` and `danger_level` may be generator suggestions or manual-review outcomes rather than source-declared facts
- carry or intentionally discard fields such as parameter `format` when the downstream adapter schema cannot represent them directly
- preserve the normalized `returns` wrapper contract even when the upstream MCP tool returns a non-object domain payload
- keep sidecar provenance/warning data outside the adapter schema when the adapter schema cannot represent it directly

## Current Scope Notes

The current minimal schema reflects the first transport and auth milestone for the GitHub golden path:

- `source.transport` currently enumerates `streamable_http` only
- `source.auth.type` currently enumerates `bearer` and `none` only
- `source.server` is optional because not every interrogated MCP server exposes stable server identity metadata during initialization

These constraints describe the current capture contract, not the full design space for future interrogators.

## Non-Goals

The discovery bundle does **not**:

- replace the MCP-AQL adapter schema
- replace the canonical Markdown + YAML adapter format
- make existing implementations normative
- require speculative probing of side-effecting tools

## Safety Guidance

Interrogators SHOULD default to non-side-effecting capture:

- call `tools/list`
- capture initialization metadata
- avoid tool execution unless the operator explicitly opts into safe probes

If probes are used, probe results SHOULD be stored separately from pure `tools/list` facts and clearly labeled as observations rather than declarations.
