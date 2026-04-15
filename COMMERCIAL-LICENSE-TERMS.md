# MCP-AQL Software Artifacts Commercial License Terms (Summary)

This document summarizes baseline terms for commercial licensing of **MCP-AQL software artifacts**. It is intended to work alongside the repository's split licensing model and does not replace the open license for the specification text and other documentation.

**Important**: This is not legal advice. You should review and finalize these terms with counsel. If you elect a commercial license path described in `COMMERCIAL-LICENSE.md`, you are agreeing to these baseline terms for the covered software artifacts.

## 1. Parties

- **Licensor**: Dollhouse MCP (a Delaware corporation) and/or Mick Darling (the "Licensor"). The final signed agreement should use the exact legal entity name.
- **Licensee**: you (individual or entity using MCP-AQL software artifacts under a commercial license) ("Licensee").

## 2. Definitions

### 2.1 Licensed Software

"Licensed Software" means MCP-AQL software artifacts made available by Licensor under AGPL or under an alternative commercial license, including (as applicable):

- the interrogator, schema builder, compiler, adapter generator, and related tooling,
- runtime libraries, templates, support code, scripts, tests, and software-oriented schemas,
- bundled or embedded code components supplied by Licensor, and
- any non-public builds, templates, roadmaps, or support materials provided by Licensor under commercial terms.

### 2.2 Specification Materials

"Specification Materials" means the MCP-AQL specification text, narrative documentation, and other prose materials that Licensor publishes under the repository's documentation license (currently CC BY 4.0 unless otherwise stated).

For clarity, these commercial terms do **not** govern mere implementation of the MCP-AQL specification or other clean-room implementations that do not use Licensor's Licensed Software.

### 2.3 Generated Artifacts

"Generated Artifacts" means adapters, manifests, schemas, prompts, mappings, configuration, code, or other output created using the Licensed Software for a specific API, service, deployment, or integration.

### 2.4 Toolchain

"Toolchain" means the MCP-AQL interrogator, schema builder, compiler, adapter generator, associated templates, and any runtime libraries required by generated adapters.

### 2.5 Competitive Product or Service

"Competitive Product or Service" means any product, service, library, framework, hosted offering, or white-labeled system that is intended to provide substantially similar value to the MCP-AQL Toolchain by:

- reducing an API/tool surface area into a small set of semantic endpoints and routing operations through them (including but not limited to "CRUDE", single-endpoint, read/write/execute variants, or any other endpoint partitioning), and/or
- using schema-driven dispatch/introspection to translate between an upstream API surface (including MCP servers) and a reduced endpoint interface intended for LLM use.

This includes competing implementations of the Toolchain and/or competing translation layers, generators, adapters, or runtimes implementing substantially the same commercialized approach using the Licensed Software or Confidential Information.

### 2.6 Affiliate

"Affiliate" means any entity that directly or indirectly controls, is controlled by, or is under common control with another entity, where "control" means ownership of more than 50% of the voting securities or the power to direct management and policies.

## 3. Scope of commercial license grant

Subject to these terms, Licensor grants Licensee a non-exclusive, non-transferable, non-sublicensable license to use, modify, and distribute the Licensed Software under the elected commercial path instead of relying on AGPL obligations for that Licensed Software.

These commercial terms do **not** restrict:

- mere reading or implementation of the MCP-AQL specification,
- clean-room implementations that do not use Licensor's Licensed Software or Confidential Information, or
- use of Specification Materials under their published documentation license.

Unless otherwise agreed in writing, this commercial license grant may not be resold or sublicensed as a standalone license to third parties.

### 3.1 Contractors

Licensee may allow its contractors and service providers to access the Licensed Software solely to provide services to Licensee, provided that:

- they are bound by written confidentiality and non-use obligations at least as protective as these terms,
- they receive no independent rights to use the Licensed Software apart from services for Licensee, and
- they may not reuse the Licensed Software to create or assist in creating a Competitive Product or Service.

## 4. Open-source alternative remains available

Nothing in these terms prevents Licensee from using MCP-AQL software artifacts under AGPL if Licensee chooses to comply with AGPL obligations for the applicable covered software.

The commercial path is an alternative license for Licensor's Licensed Software. It is not a modification of AGPL itself.

## 5. Self-serve free commercial license (under $1,000,000 USD revenue)

If Licensee has **less than $1,000,000 USD in annual revenue**, Licensee may elect a **free** commercial license for the Licensed Software by self-certifying that revenue threshold in writing in Licensee's own records, unless Licensor publishes a required self-serve registration process.

The revenue threshold is based on Licensee's annual revenue (not a specific product's revenue).

**Entity scope (self-serve tier)**: the self-serve free commercial license applies only to the single legal entity that makes the self-certification. It does not automatically extend to Affiliates.

If Licensor publishes a self-serve registration or certification process, Licensee must comply with that published process, which may include providing reasonable business contact information for license administration.

## 6. Paid commercial license (at/over $1,000,000 USD revenue) or custom terms

If Licensee has **$1,000,000 USD or more** in annual revenue, or needs custom terms, Licensee must contact Licensor to obtain a paid commercial license.

Contact: `licensing@mcpaql.org`

Paid commercial agreements may optionally expand scope to:

- **Controlled affiliates** of Licensee,
- an entire **corporate group** (entities under common control),
- white-label or no-attribution usage,
- reseller or hosted-service rights, and/or
- separate support, SLA, or professional services commitments.

## 7. Generated Artifacts and private adapter work

Under the commercial license path, Licensee is not required to publish Generated Artifacts, internal API mappings, private schemas, prompts, configuration, or adapter source solely because they were created using the Licensed Software.

However:

- any portion of a Generated Artifact that includes or redistributes Licensor's Licensed Software remains subject to the applicable open or commercial license for that included material, and
- this section does not create rights to redistribute the Licensed Software itself outside the scope otherwise permitted by these terms.

Each Generated Artifact may carry its own separate license for the adapter-specific portions created by Licensee, subject to any embedded or bundled MCP-AQL Licensed Software.

## 8. No reverse engineering

Licensee may not reverse engineer, decompile, or disassemble any MCP-AQL binaries or hosted components provided by Licensor under a commercial license, except to the limited extent that such restrictions are prohibited by applicable law.

## 9. No competitive re-implementation using Licensed Software

Licensee may not use the Licensed Software or Confidential Information obtained through a commercial license to create, develop, train, improve, or assist in creating a Competitive Product or Service, including (without limitation):

- a Toolchain substantially similar to MCP-AQL (interrogator/schema builder/compiler/adapter generator), or
- any substantially similar endpoint-reduction translation layer, generator, or runtime intended to reduce tool surface area and tokens in the manner implemented by MCP-AQL.

This restriction is intended to prevent using the commercial license path as a low-friction way to clone, enclosure-wrap, or strip-mine Licensor's Toolchain.

## 10. No resale, hosted commercialization, or white-labeling without paid terms

Unless otherwise agreed in writing, Licensee may not:

- resell the Licensed Software,
- offer access to the Toolchain or adapter-generation capabilities as a service to third parties,
- embed the Toolchain in a hosted or managed commercial offering for third parties,
- white-label the Licensed Software, or
- monetize third-party access to the Licensed Software as a product or feature.

For clarity, Licensee may use Generated Artifacts in Licensee's own internal systems and customer-facing services, provided Licensee is not thereby offering the Licensed Software itself or adapter-generation capability as a standalone or managed third-party service.

## 11. Attribution tiers and notices

Licensor offers commercial licenses in tiers:

- **Standard commercial**: Licensee must preserve `NOTICE.md`, copyright notices, and other attribution notices included with the Licensed Software when distributing any substantial portion of it.
- **White-label / no-attribution commercial**: available only by separate paid written agreement; may permit distribution without the attribution/notice requirements above.

The self-serve free commercial license uses the **Standard commercial** tier unless otherwise agreed in writing.

## 12. Audit, certification, and compliance information

To protect the integrity of the self-serve and paid tiers, Licensor may request that Licensee provide a written certification of:

- Licensee's annual revenue tier (under/over $1,000,000 USD),
- Licensee's compliance with these terms, and/or
- the legal entity using the self-serve free commercial license.

If Licensor has a reasonable basis to believe Licensee is in breach, the final commercial agreement may include a limited audit right (for example, review of relevant records by an independent auditor under confidentiality).

## 13. Confidentiality (non-public materials)

If Licensor provides Licensee with any non-public materials (including private builds, roadmaps, support materials, or non-public templates), those materials are "Confidential Information".

Licensee must:

- keep Confidential Information confidential,
- use it only for the purpose of evaluating or using MCP-AQL under the commercial license, and
- not use it to assist in creating a Competitive Product or Service.

## 14. Termination and cure

If Licensee breaches these terms, the commercial license terminates automatically unless otherwise agreed in writing.

Licensor may (but is not required to) provide a cure period for non-willful breaches. Willful breaches (including deliberate attribution stripping, resale of the Toolchain without permission, or deliberate competitive reimplementation using Licensed Software) may be subject to immediate termination.

Upon termination, Licensee must cease use and distribution of the Licensed Software under the commercial license.

## 15. No sublicensing / no transfer

Unless otherwise agreed in writing:

- Licensee may not sublicense the commercial license.
- Licensee may not assign or transfer the commercial license (including by merger, acquisition, or sale of substantially all assets) without Licensor's written consent.

## 16. Governing law, venue, and fee shifting

The final commercial agreement should specify:

- **Governing law**: Delaware law (without regard to conflict of laws).
- **Venue**: Delaware state or federal courts (or another Delaware venue as appropriate).
- **Fee shifting**: the prevailing party in any dispute is entitled to recover reasonable attorneys' fees and costs.

## 17. Injunctive relief

Licensee acknowledges that breach of Sections 8-13 may cause irreparable harm and that Licensor may seek injunctive relief (in addition to other remedies).

## 18. Indemnification

### 18.1 Licensee indemnification of Licensor

Licensee will indemnify, defend, and hold harmless Licensor and its officers, directors, employees, and agents from and against any and all third-party claims, demands, actions, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or relating to:

- Licensee's use of the Licensed Software,
- any Generated Artifacts, output, data, adapters, or results produced by or through the Licensed Software as used by Licensee,
- Licensee's distribution of the Licensed Software or any derivative works,
- any violation of applicable law or regulation by Licensee in connection with the Licensed Software, or
- any breach of these terms by Licensee.

This indemnification obligation applies regardless of whether Licensee is using the self-serve free commercial license (Section 5) or a paid commercial license (Section 6).

### 18.2 No indemnification by Licensor

Licensor does not provide any indemnification to Licensee under this commercial license, including (without limitation) any indemnification for intellectual property infringement claims. The Licensed Software is provided "AS IS" (see Section 20).

### 18.3 Indemnification procedure

If Licensor seeks indemnification under Section 18.1, Licensor will:

- promptly notify Licensee in writing of the claim (provided that failure to notify does not relieve Licensee of its obligations except to the extent Licensee is materially prejudiced),
- give Licensee reasonable control of the defense and settlement (provided that Licensee may not settle any claim in a manner that imposes obligations on Licensor or admits fault on Licensor's behalf without Licensor's prior written consent), and
- cooperate reasonably with Licensee at Licensee's expense.

## 19. Support, SLAs, and additional services

### 19.1 No support or SLA included

This commercial license does not include any support, maintenance, service level agreement (SLA), uptime guarantee, or professional services obligation. The Licensed Software is self-service unless separately agreed in writing.

### 19.2 Separate service agreements

Support, SLAs, and other services may be available under separate written agreements on a case-by-case basis. Contact `licensing@mcpaql.org` for inquiries.

### 19.3 Free-tier limitations

The self-serve free commercial license (Section 5) does not include and is not eligible for SLAs or support agreements unless separately agreed in writing.

## 20. Disclaimer of warranty

THE LICENSED SOFTWARE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

LICENSOR DOES NOT WARRANT THAT THE LICENSED SOFTWARE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS, OR THAT ANY CONTENT, GENERATED ARTIFACT, OR OUTPUT WILL BE SECURE OR NOT OTHERWISE LOST OR DAMAGED.

NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED FROM LICENSOR OR THROUGH THE LICENSED SOFTWARE WILL CREATE ANY WARRANTY NOT EXPRESSLY STATED IN A SIGNED COMMERCIAL AGREEMENT.

## 21. Limitation of liability

### 21.1 Scope of liability

LICENSOR'S LIABILITY UNDER THIS COMMERCIAL LICENSE IS LIMITED TO DIRECT DAMAGES ARISING FROM LICENSOR'S MATERIAL BREACH OF THE LICENSE GRANT IN SECTION 3 (I.E., FAILURE TO PROVIDE OR MAINTAIN THE LICENSE RIGHTS GRANTED). LICENSOR HAS NO LIABILITY FOR:

- DEFECTS, BUGS, ERRORS, OR MALFUNCTIONS IN THE LICENSED SOFTWARE,
- LICENSEE'S USE OF OR INABILITY TO USE THE LICENSED SOFTWARE,
- ANY GENERATED ARTIFACTS, OUTPUT, DATA, OR RESULTS PRODUCED BY THE LICENSED SOFTWARE,
- INTERRUPTIONS IN AVAILABILITY OR ACCESS, OR
- ANY OTHER MATTER RELATING TO THE PERFORMANCE OR NON-PERFORMANCE OF THE LICENSED SOFTWARE.

THE LICENSED SOFTWARE IS PROVIDED WITHOUT ANY SERVICE LEVEL AGREEMENT, UPTIME GUARANTEE, OR SUPPORT OBLIGATION UNLESS SEPARATELY AGREED IN WRITING.

### 21.2 Exclusive remedy for paid licensees

FOR PAID COMMERCIAL LICENSEES (SECTION 6), IF LICENSOR MATERIALLY BREACHES THE LICENSE GRANT AND FAILS TO CURE SUCH BREACH WITHIN THIRTY (30) DAYS AFTER RECEIVING WRITTEN NOTICE FROM LICENSEE, LICENSEE'S SOLE AND EXCLUSIVE REMEDY IS A PRO-RATA REFUND OF PRE-PAID, UNUSED LICENSE FEES FOR THE REMAINING TERM. IN NO EVENT WILL ANY REFUND EXCEED THE FEES ACTUALLY PAID BY LICENSEE IN THE TWELVE (12) MONTHS PRECEDING THE BREACH.

### 21.3 No liability for free-tier licensees

FOR LICENSEES USING THE SELF-SERVE FREE COMMERCIAL LICENSE (SECTION 5), LICENSOR'S MAXIMUM AGGREGATE LIABILITY IS ZERO ($0 USD). LICENSEE'S SOLE REMEDY IS TERMINATION OF THE LICENSE.

### 21.4 Exclusion of consequential damages

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL LICENSOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR DAMAGES FOR LOSS OF PROFITS, GOODWILL, DATA, USE, OR OTHER INTANGIBLE LOSSES, REGARDLESS OF WHETHER LICENSOR HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES AND REGARDLESS OF THE LEGAL THEORY UPON WHICH THE CLAIM IS BASED.

### 21.5 Essential basis

THE LIMITATIONS AND EXCLUSIONS IN THIS SECTION ARE AN ESSENTIAL BASIS OF THE BARGAIN BETWEEN THE PARTIES AND WILL APPLY EVEN IF ANY REMEDY FAILS OF ITS ESSENTIAL PURPOSE. LICENSEE ACKNOWLEDGES THAT LICENSOR HAS OFFERED THE LICENSED SOFTWARE (INCLUDING THE $0 SELF-SERVE TIER) IN RELIANCE ON THESE LIMITATIONS AND THAT THESE LIMITATIONS WILL APPLY REGARDLESS OF WHETHER LICENSEE HAS PAID ANY FEES.

## 22. Relationship to open licenses and specification materials

Licensee may choose either:

- the applicable open licenses for the relevant MCP-AQL materials (for example, AGPL for covered software artifacts and CC BY 4.0 for documentation/specification materials), or
- this commercial license for the applicable Licensed Software.

If Licensee elects the commercial license for Licensed Software, Licensee may not simultaneously rely on AGPL rights for that same covered software in a way that circumvents these commercial restrictions.

For clarity, Specification Materials remain available under their published documentation license, and nothing in these commercial terms restricts implementation of the MCP-AQL specification itself.
