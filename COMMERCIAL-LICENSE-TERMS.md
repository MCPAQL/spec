# MCP-AQL Commercial License Terms (Summary)

This document summarizes baseline terms for a commercial license to MCP-AQL materials and software.

**Important**: This is not legal advice. You should review and finalize these terms with counsel. If you use MCP-AQL under the “self-serve free commercial license” option described in `COMMERCIAL-LICENSE.md`, you are electing a commercial license and agreeing to these baseline terms.

## 1. Parties

- **Licensor**: Dollhouse MCP (a Delaware corporation) and/or Mick Darling (the “Licensor”). The final signed agreement should use the exact legal entity name.
- **Licensee**: you (individual or entity using MCP-AQL under a commercial license) (“Licensee”).

## 2. Definitions

### 2.1 Licensed Materials

“Licensed Materials” means the MCP-AQL materials and software you receive under a commercial license, including (as applicable) the toolchain, runtime, templates, documentation, schemas, tests, examples, and any non-public materials provided by Licensor.

### 2.2 Toolchain

“Toolchain” means the MCP-AQL interrogator, schema builder, compiler/adapter generator, associated templates, and any runtime libraries required by generated adapters.

### 2.3 Competitive Product or Service

“Competitive Product or Service” means any product, service, library, framework, or hosted offering that is intended to provide substantially similar value to MCP-AQL by:

- reducing an API/tool surface area into a small set of semantic endpoints and routing operations through them (including but not limited to “CRUDE”, single-endpoint, read/write/execute variants, or any other endpoint partitioning), and/or
- using schema-driven dispatch/introspection to translate between an upstream API surface (including MCP servers) and a reduced endpoint interface intended for LLM use.

This includes competing implementations of the Toolchain and/or competing translation layers/adapters/runtimes implementing the same approach.

### 2.4 Affiliate

“Affiliate” means any entity that directly or indirectly controls, is controlled by, or is under common control with another entity, where “control” means ownership of more than 50% of the voting securities or the power to direct management and policies.

## 3. Scope of commercial license grant

Subject to these terms, Licensor grants Licensee a non-exclusive, non-transferable, non-sublicensable license to use, modify, and distribute the Licensed Materials, without the obligations that would otherwise apply under the open source licenses (e.g., AGPL).

Unless otherwise agreed in writing, this commercial license grant may not be resold or sublicensed as a standalone license to third parties.

### 3.1 Contractors

Licensee may allow its contractors and service providers to access the Licensed Materials solely to provide services to Licensee, provided that:

- they are bound by written confidentiality and non-use obligations at least as protective as these terms,
- they receive no independent rights to use the Licensed Materials, and
- they may not reuse the Licensed Materials to create or assist in creating a Competitive Product or Service.

## 4. Self-serve free commercial license (under $1,000,000 USD revenue)

If Licensee has **less than $1,000,000 USD in annual revenue**, Licensee may obtain a **free** commercial license by self-certifying that revenue threshold in writing in Licensee’s own records (no correspondence required).

The revenue threshold is based on Licensee’s annual revenue (not a specific product’s revenue).

**Entity scope (self-serve tier)**: the self-serve free commercial license applies only to the single legal entity that makes the self-certification. It does not automatically extend to Affiliates.

## 5. Paid commercial license (at/over $1,000,000 USD revenue) or custom terms

If Licensee has **$1,000,000 USD or more** in annual revenue, or needs custom terms, Licensee must contact Licensor to obtain a paid commercial license.

Contact: `licensing@mcpaql.org`

Paid commercial agreements may optionally expand scope to:

- **Controlled affiliates** of Licensee, or
- an entire **corporate group** (entities under common control),

as priced and agreed in writing.

## 6. No reverse engineering

Licensee may not reverse engineer, decompile, or disassemble any MCP-AQL binaries or hosted components provided under a commercial license, except to the limited extent that such restrictions are prohibited by applicable law.

## 7. No competitive re-implementation (commercial path)

Licensee may not use the Licensed Materials or Confidential Information obtained through a commercial license to create, develop, train, improve, or assist in creating a Competitive Product or Service, including (without limitation):

- a Toolchain substantially similar to MCP-AQL (interrogator/schema builder/compiler/adapter generator), or
- any substantially similar endpoint-reduction translation layer (including “CRUDE”, single-endpoint, read/write/execute variants, or other partitions) intended to reduce tool surface area and tokens in the manner described by MCP-AQL.

This restriction is intended to prevent using the commercial license as a low-friction way to clone the product/toolchain.

Clarification: this section restricts what Licensee may do **using the commercial license path** (and any Confidential Information provided under it). It does not prevent truly independent development that does not use the Licensed Materials or Confidential Information, and it does not prevent use under the open source licenses if Licensee chooses to comply with those open source license terms instead of electing the commercial license.

## 8. Attribution tiers and notices (commercial)

Licensor offers commercial licenses in tiers:

- **Standard commercial**: Licensee must preserve the `NOTICE.md` and other copyright notices included with the Licensed Materials when distributing any substantial portion of them.
- **No-attribution commercial**: available by separate paid agreement; permits distribution without the attribution/notice requirements above.

The self-serve free commercial license option uses the **Standard commercial** tier (attribution/notice required).

## 9. Audit and certification

To protect the integrity of the self-serve and paid tiers, Licensor may request that Licensee provide a written certification of:

- Licensee’s annual revenue tier (under/over $1,000,000 USD), and/or
- Licensee’s compliance with these terms.

If Licensor has a reasonable basis to believe Licensee is in breach, the final commercial agreement may include a limited audit right (e.g., review of relevant records by an independent auditor under confidentiality).

## 10. Confidentiality (non-public materials)

If Licensor provides Licensee with any non-public materials (including private builds, roadmaps, or support materials), those materials are “Confidential Information”.

Licensee must:

- keep Confidential Information confidential,
- use it only for the purpose of evaluating/using MCP-AQL under the commercial license, and
- not use it to assist in creating a Competitive Product or Service.

## 11. Termination and cure

If Licensee breaches these terms, the commercial license terminates automatically unless otherwise agreed in writing.

Licensor may (but is not required to) provide a cure period for non-willful breaches. Willful breaches (including deliberate attribution stripping or deliberate competitive reimplementation using Licensed Materials) may be subject to immediate termination.

Upon termination, Licensee must cease use and distribution of the Licensed Materials under the commercial license.

## 12. No sublicensing / no transfer

Unless otherwise agreed in writing:

- Licensee may not sublicense the commercial license.
- Licensee may not assign or transfer the commercial license (including by merger, acquisition, or sale of substantially all assets) without Licensor’s written consent.

## 13. Governing law, venue, and fee shifting

The final commercial agreement should specify:

- **Governing law**: Delaware law (without regard to conflict of laws).
- **Venue**: Delaware state or federal courts (or another Delaware venue as appropriate).
- **Fee shifting**: the prevailing party in any dispute is entitled to recover reasonable attorneys’ fees and costs.

## 14. Injunctive relief

Licensee acknowledges that breach of Sections 6–10 may cause irreparable harm and that Licensor may seek injunctive relief (in addition to other remedies).

## 15. Relationship to open source licenses

Licensee must choose either:

- the open source license(s) (e.g., AGPL / CC BY) for the applicable materials, or
- this commercial license.

If Licensee elects the commercial license, Licensee may not simultaneously rely on open source license grants for the same use in a way that circumvents these commercial restrictions.
