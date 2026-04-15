# Commercial Licensing for MCP-AQL Software Artifacts

This document describes commercial licensing options for **MCP-AQL software artifacts**. It is an alternative licensing path for MCP-AQL code and tooling. It does **not** change the license for the MCP-AQL specification text.

## What stays open

The MCP-AQL specification text, narrative documentation, and other prose materials remain available under the repository's published documentation license, currently **CC BY 4.0**. See `LICENSE-DOCS` and `LICENSING.md`.

Anyone may read, adopt, and implement the specification itself. A commercial license is **not** required merely to use the specification text under its published documentation license.

## What this commercial license applies to

Commercial licensing is offered for MCP-AQL **software artifacts** made available by Licensor, including, as applicable:

- the interrogator, schema builder, compiler, adapter generator, and related tooling,
- runtime libraries, templates, and support code,
- software-oriented schemas, tests, scripts, and reference artifacts published under the repository's software license,
- generated or bundled components that include Licensor's code, and
- any non-public builds, templates, or support materials provided under commercial terms.

For authoritative scope rules inside this repository, see `LICENSING.md`.

## Three licensing paths for MCP-AQL software artifacts

### 1. Open-source path: AGPL

MCP-AQL software artifacts are available under **AGPL-3.0** unless an alternative commercial license is elected.

If your organization is willing to comply with AGPL obligations, you may use that path. In that case, the AGPL governs the covered software artifacts.

### 2. Self-serve free commercial license

If your organization has **less than $1,000,000 USD in annual revenue**, you may elect a **free commercial license** for MCP-AQL software artifacts.

This path is intended for organizations that need to use MCP-AQL tooling privately or internally without AGPL source-sharing obligations, while still accepting commercial restrictions designed to prevent strip-mining, resale, and competitive enclosure.

Key points of the self-serve free commercial path:

- no source publication obligation for private/internal use of covered MCP-AQL software artifacts,
- generated adapters, API mappings, schemas, prompts, and other API-specific outputs may remain private,
- attribution and notice preservation still apply to Licensor's covered code and materials,
- no resale, white-labeling, or hosted commercialization of the MCP-AQL toolchain itself, and
- no use of Licensor's software artifacts to build a competing product or service.

Unless and until Licensor publishes a required registration process for the self-serve tier, self-certification in your own records is sufficient.

Suggested self-certification text:

> We certify that we have less than $1,000,000 USD in annual revenue and elect to use MCP-AQL software artifacts under the self-serve free commercial license.

### 3. Paid commercial license

A **paid commercial license** is required if your organization:

- has **$1,000,000 USD or more** in annual revenue,
- wants to white-label MCP-AQL tooling or remove attribution,
- wants to resell or provide access to the MCP-AQL toolchain, generator, runtime, or related capabilities as a product or service,
- wants broader affiliate/group usage rights, or
- needs custom terms.

Paid commercial terms are intended for larger organizations and for scenarios where Licensor's tooling is part of a revenue-generating or white-labeled commercial offering.

Contact: `licensing@mcpaql.org`

## Generated adapters and API-specific work

Generated adapters and related API-specific artifacts are often sensitive because they can reflect private API shapes, internal routes, or implementation details.

Under the commercial licensing path, Licensee is not required to publish those generated/API-specific artifacts solely because they were created using MCP-AQL software artifacts, except to the extent they include or redistribute Licensor's covered code or other Licensed Software.

Each generated adapter or related code artifact may also carry its own separate license for the adapter-specific portions, subject to any MCP-AQL code or runtime components included within it.

## Important limitations

- This commercial licensing program applies to Licensor's code and other covered software artifacts, not to the underlying protocol idea.
- It does not grant trademark rights. See `TRADEMARKS.md`.
- It is intended as an alternative to AGPL obligations for covered software artifacts, not as a replacement for the repository's open documentation licensing.

## Terms

See `COMMERCIAL-LICENSE-TERMS.md` for baseline terms.
