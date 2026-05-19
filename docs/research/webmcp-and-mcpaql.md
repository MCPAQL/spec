---
title: "WebMCP and MCP-AQL: Structural Analysis and Adapter Surface"
version: 1.0.0
status: research
date: 2026-05-19
---

## WebMCP and MCP-AQL: Structural Analysis and Adapter Surface

> A first-pass structural read of WebMCP — the W3C Web Machine Learning Community
> Group draft announced at Google I/O 2026 (early preview shipped in Chrome 146,
> February 2026) — against MCP-AQL's CRUDE pattern, with an assessment of where an
> adapter is worth building and where it isn't.

## Table of Contents

- [Executive Summary](#executive-summary)
- [1. What WebMCP Is](#1-what-webmcp-is)
- [2. WebMCP's Surface](#2-webmcps-surface)
- [3. WebMCP vs. Anthropic MCP (the Wire Protocol)](#3-webmcp-vs-anthropic-mcp-the-wire-protocol)
- [4. WebMCP vs. MCP-AQL: Structural Comparison](#4-webmcp-vs-mcp-aql-structural-comparison)
- [5. Where They Align](#5-where-they-align)
- [6. Where They Diverge](#6-where-they-diverge)
- [7. Adapter Surface](#7-adapter-surface)
- [8. Where an Adapter Is Useful](#8-where-an-adapter-is-useful)
- [9. Where an Adapter Is Not Useful](#9-where-an-adapter-is-not-useful)
- [10. Open Questions](#10-open-questions)
- [Sources](#sources)

---

## Executive Summary

**WebMCP is a browser API, not a wire protocol.** A page calls
`navigator.modelContext.registerTool({...})` to expose a JavaScript function as an
agent-callable tool. The browser handles enumeration, mediation, and (eventually)
translation to whatever the in-browser agent speaks — Anthropic MCP, Gemini's
internal tool-use format, anything else. The page never sees JSON-RPC.

**WebMCP supports only the `tools` primitive.** No resources, no prompts, no
sampling, no elicitation (beyond a narrow `requestUserInteraction` callback during
a tool's own execution).

**WebMCP is page-scoped and dynamic.** Tools register/unregister as a single-page
app changes state. Discovery is lazy — an agent only sees a page's tools after
navigating to that page. There is no global catalog.

**Relative to MCP-AQL, WebMCP is the other end of the stack.** MCP-AQL collapses N
server-side tools into ~5 CRUDE endpoints to fight catalog bloat in the agent's
context window. WebMCP doesn't have a catalog-bloat problem because tool lists are
small (one page's worth) and lazy. The two are not in tension; they address
different layers of the same problem.

**The high-value adapter is MCP-AQL → WebMCP, not the reverse.** A small JS shim
that introspects an MCP-AQL adapter and re-registers each operation via
`navigator.modelContext.registerTool` lets any MCP-AQL adapter become consumable by
Gemini in Chrome and other in-page browser agents — without rewriting per-tool
wrappers. The reverse direction (WebMCP → MCP-AQL) is technically possible via a
headless browser substrate but has narrow utility.

---

## 1. What WebMCP Is

**Status as of 2026-05-19:** W3C Community Group Draft Report from the
[Web Machine Learning CG][spec]. Editors: Brandon Walderman (Microsoft), Khushal
Sagar (Google), Dominic Farolino (Google). The spec is explicit that "It is not a
W3C Standard nor is it on the W3C Standards Track."

**Shipping status:**

- **Chrome 146 (Feb 2026)** — flag-gated early preview, accessible to the
  registered Early Preview Program.
- **Chrome 149** — public origin trial (announced at I/O 2026).
- **Gemini in Chrome** — will consume WebMCP tools.
- **Inspector extension** — "Model Context Tool Inspector" shipped by the Chrome
  team for manual testing.

**Industry signals:** Booking.com, Expedia, Instacart, Intuit, Shopify, and Redfin
named as early adopters at I/O 2026.

**Common misframings to dispel up front:**

- It is **not Google's** standard — Microsoft co-authors the spec, and Edge will
  presumably ship a compatible implementation.
- It is **not a replacement for MCP** — Google's own
  [usage guidance][chrome-when] frames the two as complementary.
- It is **not the MCP wire protocol embedded in the browser** — the browser
  *translates* between page-registered tools and whatever protocol the in-browser
  agent uses. The page never sees JSON-RPC.

---

## 2. WebMCP's Surface

### 2.1 IDL

The full registration surface (verbatim from the [spec][spec]):

```webidl
partial interface Navigator {
  [SecureContext] readonly attribute ModelContext modelContext;
};

[Exposed=Window, SecureContext]
interface ModelContext {
  undefined registerTool(ModelContextTool tool,
    optional ModelContextRegisterToolOptions options = {});
};

dictionary ModelContextTool {
  required DOMString name;
  USVString title;
  required DOMString description;
  object inputSchema;          // JSON Schema
  required ToolExecuteCallback execute;
  ToolAnnotations annotations;
};

dictionary ToolAnnotations {
  boolean readOnlyHint = false;
  boolean untrustedContentHint = false;
};

callback ToolExecuteCallback =
  Promise<any> (object input, ModelContextClient client);

dictionary ModelContextRegisterToolOptions {
  AbortSignal signal;
};

[Exposed=Window, SecureContext]
interface ModelContextClient {
  Promise<any> requestUserInteraction(UserInteractionCallback callback);
};

callback UserInteractionCallback = Promise<any> ();
```

That is the entire normative surface. Five things to note:

1. **`SecureContext`** — HTTPS only.
2. **JSON Schema for inputs** — no symmetric `outputSchema`. Tools return
   `Promise<any>`.
3. **`AbortSignal` for unregistration** — passing a signal whose `abort()` is
   called removes the tool.
4. **`readOnlyHint` and `untrustedContentHint`** — the only side-effect signaling.
   No `destructiveHint`, no `idempotencyHint`. Comparison to MCP-AQL's CRUDE
   verbs is in §4.
5. **`requestUserInteraction`** — the only in-flight elicitation primitive. The
   tool's `execute` callback receives a `ModelContextClient` that can ask the
   browser to surface a UI gate before continuing.

### 2.2 The Older `provideContext` Surface

The [API proposal page][proposal] (predates the formal spec snapshot) describes a
`navigator.modelContext.provideContext({ tools: [...] })` method that replaces the
entire tool set on each call. The February 2026 update added the granular
`registerTool`/`unregisterTool` pair specifically because SPAs need to swap tools
without resetting state. The formal IDL snapshot of 2026-05-19 surfaces only
`registerTool`. Treat `provideContext` as legacy/sugar — write against
`registerTool` for new work.

### 2.3 Declarative API (Forms)

Chrome's docs and early articles reference a "Declarative API" that lets
annotated HTML `<form>` elements register themselves as tools. The spec section
covering this is explicitly marked TODO. A `SubmitEvent.agentInvoked` flag is
hinted at as the way a form handler distinguishes agent submissions from human
ones, but the attribute names and grammar are not yet specified. **Don't design an
adapter against the declarative surface yet.**

### 2.4 Permissions Policy

WebMCP is gated by the `tools` Permissions Policy directive. Default is `self` —
top-level and same-origin documents can register tools; cross-origin iframes
cannot unless the embedder explicitly grants `allow="tools"`. There is no
runtime user-permission prompt at registration time; the per-call surface for
user consent is `requestUserInteraction` during a tool's execution.

### 2.5 Discovery

There is no global discovery mechanism. An agent learns about a page's tools only
after navigating to that page. Per the spec's "Observation" algorithm, the
browser collects tool definitions from the active document tree at observation
time and exposes them to its agent via an implementation-defined channel. There
is no analogue to MCP's `tools/list` against an always-on server.

---

## 3. WebMCP vs. Anthropic MCP (the Wire Protocol)

| Dimension | Anthropic MCP | WebMCP |
|---|---|---|
| **Layer** | Wire protocol (JSON-RPC 2.0) | Browser API (no wire) |
| **Where it runs** | Server-side (stdio, HTTP) | In the page (browser) |
| **Lifetime** | Long-lived session | Per-document |
| **Tool registration** | Fixed at startup (capabilities locked after `connect`) | Dynamic, any time, per-document |
| **Primitives** | Tools, resources, prompts, sampling, elicitation | Tools only |
| **Discovery** | `tools/list` against a known endpoint | Lazy — visit the page |
| **Auth/session** | Server's concern | Free — page already has the user's cookies, login, DOM state |
| **Transport** | stdio / Streamable HTTP | Browser-internal IPC (implementation-defined) |
| **Catalog scope** | Whatever the server hosts | One page at a time |

The official Chrome guidance frames the split this way:

- **MCP** = "available everywhere, anytime" — call-center model. Right for
  persistent server-side capabilities, headless integrations, cloud workflows.
- **WebMCP** = "in-store expert present only during your visit" — right for
  user-contextual, session-bound, DOM-aware actions on the live page.

They compose: a Booking.com agent might use server-side MCP for inventory queries
and WebMCP for the actual booking flow on the live page (with the user's session,
cookies, payment instruments, etc.).

---

## 4. WebMCP vs. MCP-AQL: Structural Comparison

| Dimension | MCP-AQL | WebMCP |
|---|---|---|
| **Surface** | 5 endpoints per server (CRUDE), op-dispatched | N entries on `navigator.modelContext`, one per tool |
| **Input schema** | JSON Schema, per operation | JSON Schema, per tool |
| **Output schema** | Discriminated `{success, data \| error}` | Free-form `Promise<any>` |
| **Verb semantics** | Create / Read / Update / Delete / Execute carry destructive/idempotency semantics | `readOnlyHint` and `untrustedContentHint` only |
| **Introspection** | First-class `introspect` operation | Implementation-defined enumeration; no formal API |
| **Field selection** | First-class (control response payload size) | None |
| **Batch** | Multiple operations per request | None — each call is its own `execute` invocation |
| **Confirmation gate** | Gatekeeper + per-operation policy | `requestUserInteraction` callback, in-flight only |
| **Catalog scope** | Per-adapter, global to the agent's session | Per-page, lazy |
| **Where it runs** | Process-bounded MCP server | Inside the page |
| **Token cost concern** | Solved by CRUDE collapse (~96% reduction) | Naturally bounded — page-scoped, lazy |

The headline observation: **WebMCP and MCP-AQL are not competing at the same
layer.** MCP-AQL is a *server-side dispatch convention* on top of Anthropic MCP.
WebMCP is a *browser API* that the browser translates into whatever the agent
speaks. They could coexist in a stack where MCP-AQL governs the headless tier and
WebMCP governs the live-page tier.

---

## 5. Where They Align

1. **Tool as unit of action.** Both treat a named, JSON-Schema-typed, async
   callable as the atom of agent capability.
2. **JSON Schema for inputs.** Identical contract; an MCP-AQL operation's
   `inputSchema` is a drop-in for a WebMCP tool's `inputSchema`.
3. **Async, structured results.** Both expect `Promise`-returning callbacks that
   produce structured content rather than free text.
4. **Human-in-the-loop gates.** WebMCP's `requestUserInteraction` and MCP-AQL's
   Gatekeeper/permission-prompt occupy the same role — interrupting an in-flight
   tool to surface a UI for user consent. The mechanism is different (browser
   prompt vs. host-mediated permission server), but the semantics align.
5. **Implementation opacity.** Neither contract leaks transport. WebMCP says the
   browser→agent channel is implementation-defined; MCP-AQL says the
   operation→handler dispatch is the adapter's concern.

---

## 6. Where They Diverge

1. **Granularity of the registration unit.** MCP-AQL registers one CRUDE endpoint
   that op-dispatches across many operations. WebMCP registers each tool
   individually. An MCP-AQL adapter with 50 read operations is 1 tool on the MCP
   side; the same surface in WebMCP is 50 entries on `navigator.modelContext`.
2. **Verb semantics.** MCP-AQL's CRUDE pattern *encodes* destructive/idempotency
   semantics in the verb (Delete is destructive, Execute is non-idempotent,
   Update mutates). WebMCP collapses this to two booleans (`readOnlyHint`,
   `untrustedContentHint`). A WebMCP adapter generated from MCP-AQL loses the
   Create/Update/Delete/Execute distinction unless the adapter encodes it in the
   tool name or description.
3. **Response shape.** MCP-AQL's discriminated response (`{success: true, data}`
   vs `{success: false, error}`) is contractual. WebMCP returns `Promise<any>` —
   the convention is to throw on error. An adapter has to choose: preserve the
   AQL discriminator (good for typed clients, weird for agents) or unwrap it
   (good for agents, loses error metadata).
4. **Batch.** MCP-AQL supports `operations: [...]` in a single dispatch. WebMCP
   has no batch. If an MCP-AQL adapter is bridged to WebMCP, batch becomes
   client-side fan-out.
5. **Field selection.** MCP-AQL's response trimming has no WebMCP analogue.
6. **Catalog scope.** A single MCP-AQL adapter is visible to the agent for the
   whole session; a WebMCP page disappears from the catalog when the user
   navigates away.
7. **Session/identity.** WebMCP's killer feature is the browser session — the
   page already has the user's login, cookies, payment methods, OAuth tokens.
   MCP-AQL adapters typically run out-of-band and have to re-establish auth.

---

## 7. Adapter Surface

Three plausible adapter shapes:

### 7.1 MCP-AQL → WebMCP (page-side shim)

A small JS library that takes an MCP-AQL adapter endpoint, calls
`{ operation: "introspect", params: { query: "operations" } }`, and re-registers
each returned operation as a `navigator.modelContext` tool.

```javascript
// sketch
async function mountMcpAqlAdapter(endpoint) {
  const ops = await callAql(endpoint, "introspect", { query: "operations" });
  for (const op of ops) {
    navigator.modelContext.registerTool({
      name: `${op.verb}.${op.name}`,            // e.g. "read.list_messages"
      description: op.description,
      inputSchema: op.inputSchema,
      annotations: {
        readOnlyHint: op.verb === "read",
        untrustedContentHint: op.tainted ?? false,
      },
      execute: async (input) => {
        const res = await callAql(endpoint, op.name, input);
        if (!res.success) throw new Error(res.error.message);
        return res.data;
      },
    });
  }
}
```

Design decisions to make:

- **Naming.** `read.list_messages` vs `mcpaql_apple-mail_list_messages` vs a
  single umbrella tool per verb (`read({ operation, params })`). The umbrella
  approach preserves the CRUDE collapse but defeats WebMCP's per-tool selection
  optics in inspector tooling. **Recommendation: one WebMCP tool per AQL
  operation, named `<verb>.<operation>` or `<adapter>.<operation>`.**
- **Discriminator handling.** Unwrap on success, throw on failure. The agent
  gets a clean result on the happy path.
- **Batch.** Drop; document as not supported under WebMCP.
- **Field selection.** Pass through as an optional `_fields` input parameter on
  every tool — opt-in, doesn't bloat the schema.
- **Gatekeeper.** This is the interesting one. MCP-AQL's Gatekeeper lives in a
  separate permission server; WebMCP's `requestUserInteraction` lives in the
  page. The shim should route AQL's `permission_prompt`-style responses through
  `requestUserInteraction` so the user sees a browser-native confirmation rather
  than a separate prompt UI.

This adapter is small, mostly mechanical, and reuses MCP-AQL's introspection
end-to-end. It's the highest-leverage WebMCP work for the project.

### 7.2 WebMCP → MCP-AQL (headless substrate)

A headless-browser-backed MCP-AQL adapter that visits a target page, observes
its `navigator.modelContext` tool map, and re-exposes those tools as MCP-AQL
operations. Verb assignment heuristic:

- `readOnlyHint: true` → `read`
- otherwise → `execute` (safe default; CRUDE's catch-all)

Costs:

- A real browser process per session.
- Loses the WebMCP value proposition (in-page session, cookies, DOM) unless the
  headless browser is configured with the user's profile — and at that point
  you're shipping a security surface.
- `requestUserInteraction` is awkward to route — does it become an AQL
  Gatekeeper prompt? A separate channel?

Useful in narrow cases: pulling page-scoped tools into a headless agent pipeline
(e.g., "use Shopify's WebMCP `add_to_cart` tool from a Python pipeline"). For
most uses, the same site's server-side MCP is the better entry point.

### 7.3 Inline (browser-resident MCP-AQL adapter)

A page hosts an MCP-AQL adapter in a worker and exposes it through WebMCP. Mostly
a curiosity; valid if the adapter genuinely belongs in-page (e.g., a local
PWA-style tool surface), but in that case it's simpler to register tools
directly without an AQL intermediate.

---

## 8. Where an Adapter Is Useful

**Concrete wins for shipping MCP-AQL → WebMCP:**

- **Reach.** Every MCP-AQL adapter (apple-mail-mcpaql, shortcut-remote,
  whatever's next) becomes consumable by Gemini in Chrome with one drop-in
  `<script>`. No per-adapter wrappers.
- **Introspection symmetry.** MCP-AQL's `introspect` was designed for exactly
  this — programmatic enumeration of the operation catalog. WebMCP needs that
  catalog at registration time. The two surfaces compose cleanly.
- **Demos.** A "drop this script into your page and our adapter's tools light up
  in Chrome's WebMCP inspector" demo is a strong adoption story for both
  MCP-AQL and the inspector tooling.
- **Hybrid pages.** A site that already has MCP-AQL for headless callers can
  reuse the same adapter for in-page agent flows. Single source of truth for
  the operation catalog.

---

## 9. Where an Adapter Is Not Useful

- **Token compression.** MCP-AQL's 96% reduction comes from collapsing a large
  catalog into 5 endpoints in the agent's tool list. WebMCP's catalog is
  page-scoped and lazy, so the catalog-bloat problem isn't present in the first
  place. The MCP-AQL → WebMCP adapter re-expands the catalog (one WebMCP entry
  per operation), erasing the compression — and that's fine, because the
  page-scoped agent never sees thousands of tools at once.
- **Response wrapping.** Forcing every page-side WebMCP tool to return
  `{success, data | error}` works against the grain of the WebMCP convention
  (throw on error, return raw value on success). Unwrap in the shim.
- **Browser-replicated server features.** Resources, prompts, sampling, batch
  — WebMCP doesn't have them and won't soon. If the value of an MCP-AQL
  adapter comes from any of these, it doesn't translate. Tools-only adapters
  translate cleanly; resource-heavy adapters don't.
- **Cross-page state.** WebMCP tools vanish on navigation. An MCP-AQL adapter
  that assumes session continuity across "pages" needs the headless substrate,
  not the page-side shim.

---

## 10. Open Questions

These are worth tracking before committing to an adapter implementation:

1. **Declarative HTML form syntax.** Spec section is TODO. If the final form
   ends up close to existing HTML semantics, the AQL → WebMCP shim might be
   able to emit declarative tools for `read` operations and reserve the
   imperative path for `update`/`delete`/`execute`. Defer until spec lands.
2. **Outcome envelope.** Does any version of WebMCP standardize a structured
   result type beyond `Promise<any>`? If a `ToolResult` wrapper appears, the
   AQL discriminator can map directly. Watch the GitHub repo.
3. **`requestUserInteraction` → Gatekeeper bridge.** What's the right
   serialization of an AQL `permission_prompt` request through
   `requestUserInteraction`? Probably a small DOM-rendered confirmation panel
   with policy details; needs prototyping.
4. **Inspector compatibility.** Does the Model Context Tool Inspector surface
   AQL-style names (`read.list_messages`) cleanly, or does it expect bare names?
   Test before shipping.
5. **Origin trial timing.** Chrome 149 ships the origin trial. A pilot
   MCP-AQL → WebMCP adapter ready around 149 is good timing for a writeup.

---

## Sources

**Primary:**

- W3C WebML CG — [WebMCP draft spec][spec] (2026-05-19 snapshot)
- W3C WebML CG — [WebMCP API Proposal][proposal]
- Chrome for Developers — [WebMCP early preview announcement][chrome-epp] (Feb 2026)
- Chrome for Developers — [WebMCP documentation][chrome-docs]
- Chrome for Developers — [When to use WebMCP and MCP][chrome-when]
- Chrome for Developers — [Chrome at I/O 2026][chrome-io]
- Patrick Brosset — [WebMCP updates, clarifications, and next steps][brosset]
  (Feb 23, 2026)

**Secondary / triangulation:**

- Bug0 — [WebMCP just landed in Chrome 146][bug0]
- Alpic — [WebMCP and existing MCP server entry point][alpic]
- MCP-B — [WebMCP vs MCP architectural comparison][mcpb]
- SD Times — [Google I/O 2026 introduces the 'Agentic Web' era][sdtimes]
- The New Stack — [Google wants to make the web agent-ready][tns]

[spec]: https://webmachinelearning.github.io/webmcp/
[proposal]: https://webmachinelearning.github.io/webmcp/docs/proposal.html
[chrome-epp]: https://developer.chrome.com/blog/webmcp-epp
[chrome-docs]: https://developer.chrome.com/docs/ai/webmcp
[chrome-when]: https://developer.chrome.com/blog/webmcp-mcp-usage
[chrome-io]: https://developer.chrome.com/blog/chrome-at-io26
[brosset]: https://patrickbrosset.com/articles/2026-02-23-webmcp-updates-clarifications-and-next-steps/
[bug0]: https://bug0.com/blog/webmcp-chrome-146-guide
[alpic]: https://alpic.ai/blog/webmcp-explained-what-it-is-how-it-works-and-how-to-use-your-existing-mcp-server-as-an-entry-point
[mcpb]: https://docs.mcp-b.ai/explanation/webmcp-vs-mcp
[sdtimes]: https://sdtimes.com/ai/google-i-o-2026-introduces-the-agentic-web-era-with-major-chrome-updates/
[tns]: https://thenewstack.io/google-agent-ready-web/
