---
title: RFC Process for MCP-AQL Specification
version: 1.0.0
status: Active
date: 2026-01-14
---

This document describes the formal process for proposing, reviewing, and accepting changes to the MCP-AQL specification through Requests for Comments (RFCs).

## Table of Contents

- [Introduction](#introduction)
- [RFC Lifecycle](#rfc-lifecycle)
- [Submitting an RFC](#submitting-an-rfc)
- [Review Process](#review-process)
- [After Acceptance](#after-acceptance)
- [RFC Numbering](#rfc-numbering)

---

## Introduction

### What is an RFC?

An RFC (Request for Comments) is a formal proposal for a significant change to the MCP-AQL specification. RFCs provide a consistent and controlled process for introducing new features, modifying existing behaviors, or making other substantive changes to the protocol.

The RFC process ensures that:

- Changes are thoroughly documented before implementation
- The community has opportunity to provide feedback
- Design decisions are recorded for future reference
- Breaking changes are carefully considered
- Implementations can prepare for upcoming changes

### When to Use an RFC

You SHOULD submit an RFC for:

- **New operations or endpoints**: Adding new functionality to the CRUDE pattern
- **Behavioral changes**: Modifying how existing operations work
- **New parameters or fields**: Extending request/response schemas
- **Security-related changes**: Modifications to authentication, authorization, or access control
- **Breaking changes**: Any change that affects backward compatibility
- **Architectural changes**: Modifications to core patterns or design principles

You MAY skip the RFC process for:

- Editorial corrections (typos, grammar, clarifications)
- Documentation improvements that do not change the specification
- Adding conformance tests for existing features
- Bug fixes to specification text that correct obvious errors

When in doubt, start with a GitHub Issue to discuss whether an RFC is appropriate.

---

## RFC Lifecycle

RFCs progress through five stages from initial concept to integration into the specification.

### Stage 0: Pre-RFC (Discussion)

**Purpose**: Gather initial feedback before investing effort in a formal proposal.

**Process**:
1. Open a GitHub Issue describing the problem or enhancement
2. Use the `discussion` label to indicate this is exploratory
3. Engage with community feedback
4. Refine the idea based on input

**Exit Criteria**:
- General agreement that the change is worth pursuing
- Clear understanding of the problem being solved
- Initial design direction identified

**Duration**: No minimum; proceed when ready

### Stage 1: Draft (Formal Proposal)

**Purpose**: Submit a complete, formal proposal for review.

**Process**:
1. Create a new Issue using the RFC issue template
2. Complete all required sections (see [Submitting an RFC](#submitting-an-rfc))
3. Apply the `rfc` and `proposal` labels
4. Link to any related Pre-RFC discussions

**Exit Criteria**:
- RFC is complete and well-formed
- All required sections are filled out
- Examples and use cases are provided

**Duration**: Immediate upon submission

### Stage 2: Review (Community and Maintainer Review)

**Purpose**: Gather comprehensive feedback and iterate on the design.

**Process**:
1. The RFC enters the minimum 14-day discussion period
2. Community members provide feedback via Issue comments
3. Maintainers review for technical accuracy and consistency
4. The RFC author addresses feedback and updates the proposal
5. Spec editors may request changes or clarifications

**Exit Criteria**:
- Minimum discussion period has elapsed
- All blocking concerns have been addressed
- Maintainer consensus is reached

**Duration**: Minimum 14 days; may extend based on complexity or ongoing discussion

### Stage 3: Accepted (Approved for Implementation)

**Purpose**: Signal that the RFC is approved and ready for implementation.

**Process**:
1. A maintainer applies the `accepted` label
2. The RFC Issue is updated to reflect acceptance
3. An RFC number is assigned (see [RFC Numbering](#rfc-numbering))
4. The RFC is added to the accepted RFC tracking list

**Exit Criteria**:
- RFC has been formally accepted by maintainers
- RFC number has been assigned
- Implementation can begin

**Duration**: Immediate upon acceptance decision

### Stage 4: Integrated (Merged into Spec)

**Purpose**: The RFC changes have been merged into the specification.

**Process**:
1. Specification changes are implemented in a PR
2. The PR undergoes review and is merged
3. The RFC Issue is closed with the `integrated` label
4. The changelog is updated to reference the RFC

**Exit Criteria**:
- All specification changes from the RFC are merged
- Changelog updated
- RFC Issue closed

**Duration**: Varies based on implementation complexity

---

## Submitting an RFC

### Using the RFC Issue Template

All RFCs MUST be submitted using the RFC issue template located at `.github/ISSUE_TEMPLATE/rfc.md`. This ensures consistency and completeness across proposals.

To create an RFC:

1. Navigate to the repository's Issues tab
2. Click "New Issue"
3. Select the "RFC Proposal" template
4. Fill out all sections completely

### Required Sections

Every RFC MUST include the following sections:

#### Summary

A concise, one-paragraph description of the proposed change. This should be understandable without reading the full RFC.

**Example**:
> This RFC proposes adding a `batch` operation to the CRUDE pattern, allowing multiple operations to be submitted and executed in a single request, with support for transactional semantics.

#### Motivation

Explain why this change is needed:

- What problem does it solve?
- What use cases does it enable?
- Why is the current approach insufficient?
- Who benefits from this change?

#### Detailed Design

Provide a comprehensive description of the proposal:

- Specific changes to the specification text
- New operations, parameters, or behaviors introduced
- Request and response examples (in JSON format)
- How the change interacts with existing features
- Edge cases and their handling

#### Drawbacks

Honestly assess the potential downsides:

- Complexity added to the specification
- Implementation burden for adapters
- Breaking changes or migration requirements
- Performance implications
- Security considerations

#### Alternatives

Document other approaches that were considered:

- Alternative designs and why they were rejected
- Status quo (doing nothing) and its implications
- Partial solutions and their trade-offs

### Optional Sections

The following sections are encouraged but not required:

#### Prior Art

References to similar features in other specifications, protocols, or systems.

#### Unresolved Questions

Open design decisions that need further discussion or will be resolved during implementation.

### Discussion Period

All RFCs are subject to a **minimum 14-day discussion period** from the date of submission. This period:

- Allows sufficient time for community review
- Enables asynchronous participation across time zones
- Provides opportunity for implementation feedback

The discussion period MAY be extended for:

- Complex or controversial proposals
- Significant ongoing discussion
- Requests from maintainers or active participants

---

## Review Process

### Who Reviews RFCs

RFCs are reviewed by two groups:

#### Maintainers

Project maintainers have final authority on RFC acceptance. They evaluate:

- Alignment with specification goals and philosophy
- Technical soundness and feasibility
- Impact on existing implementations
- Long-term maintenance implications

#### Spec Editors

Spec editors focus on:

- Consistency with existing specification language
- Completeness of the proposal
- Clarity and precision of the design
- Integration with other specification sections

### Criteria for Acceptance

An RFC is accepted when it meets the following criteria:

1. **Completeness**: All required sections are filled out thoroughly
2. **Technical Soundness**: The design is technically feasible and well-reasoned
3. **Consistency**: The proposal aligns with existing specification patterns
4. **Addressed Feedback**: All substantive concerns have been resolved
5. **Consensus**: Maintainers agree the change should proceed
6. **Clear Benefit**: The proposal provides meaningful value to the specification

### Determining Consensus

Consensus is determined through the following process:

1. **Discussion**: All feedback is considered and addressed
2. **Maintainer Review**: At least two maintainers must review the RFC
3. **Approval**: A maintainer signals readiness to accept
4. **Objection Period**: 48 hours for final objections
5. **Decision**: If no blocking objections, the RFC is accepted

Blocking objections MUST include:

- A clear statement of the concern
- Specific changes that would resolve the objection
- Willingness to engage in discussion

If consensus cannot be reached, maintainers may:

- Request additional changes to address concerns
- Defer the RFC for future consideration
- Close the RFC as not accepted (with explanation)

---

## After Acceptance

### Create rfc/* Branch

Once an RFC is accepted:

1. Create a branch named `rfc/RFC-NNNN-short-description`
   - Example: `rfc/RFC-0001-batch-operations`
2. Branch from `develop` (not `main`)
3. Reference the RFC number in the branch name

### Implement Spec Changes

Implement the accepted RFC in the branch:

1. Update relevant specification documents
2. Add or modify examples as needed
3. Update schema files if applicable
4. Add conformance tests for new features
5. Ensure all existing tests pass

### PR Review Process

Submit a Pull Request for the implementation:

1. Title format: `[RFC-NNNN] Brief description`
2. Reference the RFC Issue in the PR description
3. Provide a checklist of all specification changes made
4. Request review from maintainers

The PR review focuses on:

- Accurate implementation of the accepted RFC
- Quality of specification language
- Completeness of examples
- Test coverage

### Changelog Updates

All RFC implementations MUST update the changelog:

1. Add an entry under "Unreleased" or the appropriate version
2. Reference the RFC number: `[RFC-NNNN]`
3. Provide a brief description of the change
4. Link to the RFC Issue and PR

**Example changelog entry**:
```markdown
### Added
- Batch operations support ([RFC-0001](link-to-issue)) - Enables multiple operations in a single request with transactional semantics
```

---

## RFC Numbering

### Assignment

RFC numbers are assigned sequentially, starting from RFC-0001. Numbers are assigned:

- When an RFC is accepted (Stage 3)
- By a maintainer updating the RFC Issue
- In chronological order of acceptance

### Format

RFC numbers use a four-digit format with leading zeros:

- `RFC-0001`
- `RFC-0042`
- `RFC-0123`

### Tracking

Accepted and integrated RFCs are tracked in the repository:

- A comment on the RFC Issue includes the assigned number
- The RFC is listed in project documentation
- Branch names and PR titles reference the RFC number

### Numbers Are Permanent

Once assigned, RFC numbers are never reused, even if:

- The RFC is later withdrawn
- The implementation is reverted
- The feature is deprecated

This ensures stable references in documentation, changelogs, and external resources.

---

## Quick Reference

| Stage | Name | Duration | Exit Criteria |
|-------|------|----------|---------------|
| 0 | Pre-RFC | No minimum | Ready to formalize |
| 1 | Draft | Immediate | Complete submission |
| 2 | Review | 14+ days | Consensus reached |
| 3 | Accepted | Immediate | Number assigned |
| 4 | Integrated | Varies | PR merged |

---

## Related Documents

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - General contribution guidelines
- [RFC Issue Template](../../.github/ISSUE_TEMPLATE/rfc.md) - Template for RFC submissions
- [Branching Strategy](../../CONTRIBUTING.md#branching-strategy) - Branch naming conventions

---

*This document is part of the MCP-AQL specification. See [LICENSING.md](../../LICENSING.md) for license information.*
