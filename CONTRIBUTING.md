# Contributing to MCP-AQL Specification

Thank you for your interest in contributing to the MCP-AQL specification. This document outlines the process for contributing to the protocol specification.

## Contributor License Agreement

By submitting a contribution (including a pull request), you agree to the MCP-AQL CLA in `spec/CLA.md`.

## Ways to Contribute

### Reporting Issues

Use GitHub Issues to report:

- **Specification Bugs**: Ambiguities, contradictions, or errors in the specification
- **Editorial Issues**: Typos, unclear language, or documentation improvements
- **Implementation Concerns**: Practical difficulties in implementing the specification

When reporting an issue, please include:

- The specific section or document affected
- A clear description of the problem
- Suggested resolution (if applicable)

### Discussions

For broader topics that do not constitute a specific issue, use GitHub Discussions:

- Propose new features or extensions
- Discuss design philosophy or architectural decisions
- Seek clarification on specification intent
- Coordinate with other implementers

### Pull Requests

Pull requests are welcome for:

- Editorial corrections and clarifications
- Documentation improvements
- Conformance test additions
- Specification proposals (see process below)

## Branching Strategy

This repository uses a git flow branching model:

### Branch Types

| Branch | Purpose | Merges To |
|--------|---------|-----------|
| `main` | Stable releases only | - |
| `develop` | Integration branch | `main` (releases) |
| `feature/*` | New features | `develop` |
| `fix/*` | Bug fixes | `develop` |
| `docs/*` | Documentation changes | `develop` |
| `rfc/*` | Specification proposals | `develop` |
| `release/*` | Release preparation | `main` |

### Workflow

1. **Feature Development**: Create `feature/your-feature` from `develop`
2. **Pull Request**: Open PR to merge into `develop`
3. **Review**: CI must pass, requires approval
4. **Merge**: Squash merge into `develop`
5. **Release**: When ready, create `release/vX.Y.Z` branch, then merge to `main`

### Branch Protection

The following protection rules apply (when enabled):

**`main` branch:**
- Require pull request reviews (1 approval)
- Require status checks to pass
- Require branches to be up to date
- No direct pushes

**`develop` branch:**
- Require status checks to pass

## Specification Change Process

Changes to the MCP-AQL specification follow a structured process to ensure stability and consensus.

### 1. Proposal

Submit a proposal by opening an issue with the `proposal` label containing:

- **Title**: Clear, descriptive name for the change
- **Motivation**: Why the change is needed
- **Specification**: Detailed proposed changes to the specification text
- **Impact**: Effects on existing implementations
- **Alternatives Considered**: Other approaches evaluated

### 2. Discussion

- Proposals remain open for community discussion for a minimum of 14 days
- Maintainers and community members provide feedback
- The proposal may be revised based on discussion

### 3. Review

- A maintainer will conduct a formal review
- The proposal must address all substantive feedback
- Technical accuracy and specification consistency are verified

### 4. Acceptance

Proposals are accepted when:

- Consensus is reached among maintainers
- All blocking concerns are resolved
- The change aligns with specification goals

Accepted proposals proceed to implementation via pull request.

### 5. Integration

- Changes are merged into the draft specification
- The changelog is updated
- Version numbers are incremented according to semantic versioning

## Style Guidelines for Specification Documents

### Language

- Use precise, unambiguous language
- Define technical terms on first use
- Write in present tense for normative statements
- Use American English spelling

### Normative Keywords

Follow RFC 2119 for normative language:

- **MUST** / **MUST NOT**: Absolute requirements
- **SHOULD** / **SHOULD NOT**: Strong recommendations
- **MAY**: Optional features

### Document Structure

- Use hierarchical heading levels (H1 for title, H2 for major sections)
- Include a table of contents for documents exceeding 500 words
- Number sections for cross-referencing in longer documents
- Provide code examples in fenced code blocks with language identifiers

### Code Examples

- Use JavaScript/JSON syntax for protocol examples
- Include comments to explain non-obvious elements
- Ensure all examples are syntactically valid
- Test examples against the conformance suite when applicable

### Tables

- Use Markdown tables for structured data
- Include header rows
- Align columns for readability in source

### Cross-References

Use the following conventions for referencing other content:

**Inline cross-references** (within document text):
- Use relative file paths for references to other specification documents
- Example: `[Trust Levels Specification](./trust-levels.md)`
- Example: `[Error Codes](../error-codes.md)`

**Inline GitHub issue references** (within document text):
- Use shorthand `#123` format when discussing rationale or history inline
- GitHub auto-links `#123` to the issue, so explicit URLs are not required
- Example: "This feature was introduced to address #88"
- Example: "See #42 for the original design discussion"
- Reserve full URLs for external repositories: `[org/repo#123](<URL>)`
  - Example: `[MCPAQL/spec#49](https://github.com/MCPAQL/spec/issues/49)`

**References sections** (at the end of documents):
- Include relative file paths for related specification documents
- Include GitHub issue links for historical attribution (the issue that proposed the feature)
- External references (RFCs, standards) use full URLs

**Example References section:**
```markdown
## References

- [Trust Levels Specification](./trust-levels.md)
- [Security Model: Gatekeeper](../security/gatekeeper.md)
- [RFC 9110 Section 15](https://www.rfc-editor.org/rfc/rfc9110#section-15)
- GitHub Issue: [#49](https://github.com/MCPAQL/spec/issues/49)
```

**Rationale:**
- File paths enable navigation in any Markdown viewer
- GitHub issue links preserve historical context and attribution
- Inline `#123` references work naturally in prose when discussing rationale
- Footer references provide formal attribution without cluttering narrative text
- Separating inline (navigational) from footer (attribution) references improves readability

## Code of Conduct

All participants in the MCP-AQL community are expected to conduct themselves professionally and respectfully. We are committed to providing a welcoming and harassment-free environment for everyone.

In particular:

- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the specification and community
- Show empathy toward other community members

Unacceptable behavior may result in removal from project spaces at the discretion of maintainers.

## License

### Specification License

This repository uses split licensing:

- **Specification text (docs)**: Creative Commons Attribution 4.0 International (CC BY 4.0). See `LICENSE-DOCS`.
- **Code and other software artifacts (if any)**: GNU Affero General Public License v3.0 (AGPL-3.0). See `LICENSE`.

For clarity:

- Documentation contributions (e.g., files under `spec/docs/` and other narrative documentation) are under **CC BY 4.0**.
- Schema/test/code contributions (e.g., `spec/schemas/`, `spec/tests/`, and any code/scripts) are under **AGPL-3.0**.

By contributing, you agree that your contributions will be licensed under the same terms as the part of the repository you are contributing to (docs under CC BY 4.0; code under AGPL-3.0).

For authoritative path-based scope rules, see `spec/LICENSING.md`.

### Commercial Licensing

Organizations requiring a license without AGPL obligations may obtain commercial licensing. See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md) or contact [licensing@mcpaql.org](mailto:licensing@mcpaql.org) for details.

### Contributor License Agreement

For substantial contributions, contributors may be asked to sign a Contributor License Agreement (CLA) to ensure the project maintains the ability to offer dual licensing.

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: Report security concerns privately to [security@mcpaql.org](mailto:security@mcpaql.org)

## Acknowledgments

Contributors who make significant contributions to the specification will be acknowledged in the specification documents and changelog.
