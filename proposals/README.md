# MCP-AQL Proposals

This directory contains proposals for changes to the MCP-AQL specification.

## Overview

Proposals are the file-based form of RFCs (Request for Comments) that describe significant changes to the MCP-AQL protocol. They follow the [RFC Process](../docs/process/rfc-process.md) and provide a structured mechanism for discussing and reviewing changes before they are incorporated into the specification.

## Proposal Process

1. **Create a Proposal**
   - Copy `TEMPLATE.md` to a new file with a descriptive name (e.g., `draft-your-proposal-name.md`)
   - Fill in all sections of the template
   - Leave the number as "TBD" (assigned by maintainers upon acceptance)

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

Proposal numbers are assigned sequentially by maintainers when a proposal is accepted:
- Draft proposals use descriptive names: `draft-example-proposal.md`
- Accepted proposals are renamed with numbers: `0001-example-proposal.md`
- Numbers start from 0001 and increment sequentially

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

- [RFC Process](../docs/process/rfc-process.md)
- [Architecture Decision Records](../docs/adr/)
