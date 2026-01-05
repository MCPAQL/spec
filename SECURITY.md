# Security Policy

## Scope

This document covers security considerations for the MCP-AQL protocol specification. This specification defines a protocol for AI element management; it does not include runtime code or reference implementations.

## Security Considerations for the Protocol

The MCP-AQL protocol specification includes security-relevant design decisions that implementers should be aware of:

### Input Validation

Implementations MUST validate all inputs according to the specification schemas. Malformed queries or parameters should be rejected before processing.

### Authorization Model

The specification defines operation categories (Create, Read, Update, Delete, Execute) with distinct permission boundaries. Implementers should map these categories to appropriate access control mechanisms.

### Execution Safety

Execute operations (agents, workflows) are potentially destructive and non-idempotent. The specification recommends:

- Explicit user consent before execution
- Sandboxed execution environments where possible
- Audit logging of all execute operations

### Data Exposure

Read operations may expose sensitive element metadata. Implementers should consider:

- Field-level access controls
- Filtering of sensitive attributes in responses
- Rate limiting to prevent enumeration attacks

## Reporting Security Issues

If you discover a security vulnerability in the MCP-AQL specification itself, please report it responsibly.

**Email:** security@mcpaql.org

Please include:

- A clear description of the vulnerability
- The affected section(s) of the specification
- Potential impact assessment
- Any suggested mitigations

## Responsible Disclosure Policy

We follow a coordinated disclosure process:

1. **Initial Report:** Send details to security@mcpaql.org
2. **Acknowledgment:** We will acknowledge receipt within 72 hours
3. **Assessment:** We will assess the report and determine severity within 14 days
4. **Resolution:** For confirmed issues, we will prepare specification updates
5. **Disclosure:** Public disclosure occurs after the fix is published, typically within 90 days of the initial report

We request that you:

- Allow reasonable time for assessment and remediation
- Avoid public disclosure until coordinated with the maintainers
- Act in good faith to avoid privacy violations or data destruction

## Implementation Security

**Important:** Security of implementations based on this specification is the sole responsibility of the implementers.

The specification defines protocol semantics and data formats. It does not:

- Provide reference implementations
- Guarantee security properties of any implementation
- Cover deployment, infrastructure, or operational security

Implementers are responsible for:

- Secure coding practices
- Authentication and authorization mechanisms
- Transport layer security (TLS)
- Input sanitization beyond schema validation
- Protection against injection attacks
- Secure storage of credentials and sensitive data
- Compliance with applicable regulations

## Contact

For non-security specification questions, please use the GitHub issue tracker.

For security matters only: security@mcpaql.org
