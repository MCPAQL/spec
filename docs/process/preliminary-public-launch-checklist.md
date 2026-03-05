# Preliminary Public Launch Checklist

**Version:** 1.0.0-draft  
**Status:** Working  
**Last Updated:** 2026-03-05

This checklist defines the minimum quality bar for a coordinated preliminary public launch of:

- The MCP-AQL specification draft (`MCPAQL/spec`)
- The DollhouseMCP practical reference profile (`DollhouseMCP/mcp-server-v2-refactor`)

## Positioning

Launch messaging MUST clearly state:

1. MCP-AQL is a **preliminary public draft** focused on demonstrable utility and interoperability direction.
2. DollhouseMCP is a **practical reference profile**, not the canonical protocol definition.
3. Normative protocol authority lives in [`docs/versions/v1.0.0-draft.md`](../versions/v1.0.0-draft.md).

## Track A: Spec Draft Readiness

- [ ] Resolve phase-1 robustness blockers in `MCPAQL/spec`:
  - [#193](https://github.com/MCPAQL/spec/issues/193) (MCP protocol capability alignment audit)
  - [#197](https://github.com/MCPAQL/spec/issues/197) (batch/resource exhaustion limits)
  - [#199](https://github.com/MCPAQL/spec/issues/199) (structured error surface alignment)
- [ ] Ensure release-plan epic [#194](https://github.com/MCPAQL/spec/issues/194) has explicit launch-scope outcomes marked done.
- [ ] Keep normative/informative boundaries explicit across docs.
- [ ] Keep schema validation and fixture checks passing in CI.

## Track B: Dollhouse Reference Profile Readiness

- [ ] Ship additive spec-alignment items tracked in Dollhouse roadmap [#578](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/578).
- [ ] Land structured error surfacing work:
  - [#545](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/545)
  - [#298](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/298)
- [ ] Land batch safety limit work:
  - [#543](https://github.com/DollhouseMCP/mcp-server-v2-refactor/issues/543)
- [ ] Publish clear reference-profile notes documenting intentional deltas from generic MCP-AQL.

## Coordinated Launch Artifacts

- [ ] Draft launch post summarizing protocol goals, current scope, and known open items.
- [ ] Side-by-side statement:
  - Generic MCP-AQL protocol scope (spec repo)
  - Dollhouse practical profile scope (Dollhouse repo)
- [ ] Public quickstart that demonstrates token-efficiency gains and introspection-first operation discovery.
- [ ] Explicit "current limitations" section to reduce expectation mismatch.

## Non-Goals for Preliminary Launch

- Full certification-grade conformance automation
- Complete adapter ecosystem coverage
- Closure of phase-4/phase-5 feature backlog

