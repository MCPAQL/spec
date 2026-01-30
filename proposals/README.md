# MCP-AQL Proposals

This directory contains proposals for changes to the MCP-AQL specification.

## Overview

Proposals are formal documents that describe significant changes to the MCP-AQL protocol. They provide a structured process for discussing and reviewing changes before they are incorporated into the specification.

## Proposal Process

1. **Create a Proposal**
   - Copy `TEMPLATE.md` to a new file with a descriptive name
   - Fill in all sections of the template
   - Assign a proposal number (next available NNNN)

2. **Submit for Review**
   - Create a pull request with your proposal
   - Request review from maintainers
   - Address feedback and iterate

3. **Status Progression**
   - **Draft** - Initial proposal, still being developed
   - **Under Review** - Submitted for formal review
   - **Accepted** - Approved for inclusion in the specification
   - **Rejected** - Not accepted (with documented rationale)
   - **Withdrawn** - Removed by author

## Numbering Scheme

Proposals are numbered sequentially starting from 0001:
- `0001-example-proposal.md`
- `0002-another-proposal.md`

## Relationship to Other Documents

| Document Type | Purpose |
|---------------|---------|
| **Proposals** | Future changes under consideration |
| **ADRs** (`docs/adr/`) | Past architectural decisions with rationale |
| **RFC Process** (`docs/process/rfc-process.md`) | Formal process for specification changes |

## Creating a New Proposal

```bash
# Copy template
cp proposals/TEMPLATE.md proposals/NNNN-your-proposal-name.md

# Edit with your proposal content
# Submit as a PR
```

## References

- [RFC Process](docs/process/rfc-process.md)
- [Architecture Decision Records](docs/adr/)
