# MCP-AQL Conformance Fixtures

This directory contains the repository's **fixture-driven conformance suite**.
It is the current implementation of the conformance framework described in
`docs/conformance-testing.md`.

## Scope

The suite currently validates **evidence bundles** rather than executing live
network traffic against running adapters. Each evidence bundle captures the
pieces needed to evaluate conformance claims:

- `introspect` list/detail responses
- accepted parameter sets for each documented operation
- representative success and failure responses
- round-trip and update-preservation examples
- optional Level 2 evidence such as batch responses, constraint metadata, and
  semantic-discoverability cases

This gives the specification repo a concrete, reviewable baseline today while a
future `mcpaql-conformance` package can add direct adapter execution later.

## Fixture Files

Fixtures live in `tests/conformance/evidence/` and are plain JSON files. Each
fixture declares:

- implementation metadata
- expected level and exit code
- introspection evidence
- parameter-handling evidence
- error-quality evidence
- round-trip evidence
- optional Level 2 feature, constraint, and semantic-evaluation evidence

## Running

```bash
# Verify every reference fixture against its expected outcome
npm run test:conformance

# Run a single fixture as a conformance report
node scripts/run-conformance-tests.mjs test \
  tests/conformance/evidence/reference-level2.json \
  --level 2 \
  --tier both \
  --format text

# Emit JSON for downstream reporting
node scripts/run-conformance-tests.mjs test \
  tests/conformance/evidence/reference-level2.json \
  --level 2 \
  --format json \
  --output conformance-report.json

# Re-render a saved report as markdown
node scripts/run-conformance-tests.mjs report conformance-report.json --format markdown
```

## Reference Fixtures

- `reference-level1.json` - minimal passing Level 1 evidence
- `reference-level2.json` - passing Level 2 evidence with batch, field
  selection, constraints, and semantic checks
- `reference-semantic-warn.json` - demonstrates the Tier 1 fail / Tier 2 pass
  warning path from issue `#56`
- `reference-failure.json` - demonstrates a genuine MUST-level conformance
  failure
