---
title: "WebMCP and MCP-AQL: Structural Analysis and Adapter Surface"
version: 1.1.0
status: research
date: 2026-05-19
---

## WebMCP and MCP-AQL: Structural Analysis and Adapter Surface

> A structural read of WebMCP — the W3C Web Machine Learning Community Group
> draft announced at Google I/O 2026 (early preview shipped in Chrome 146,
> February 2026) — against MCP-AQL's CRUDE pattern, with an assessment of where
> an adapter is worth building and where it isn't. Includes a comparison to
> Drawing Room (Auto-Dollhouse's AQL-over-HTTP browser surface) as prior art for
> the page-side half of the same problem.

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
- [11. Drawing Room as Prior Art](#11-drawing-room-as-prior-art)
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

**Two adapter directions, both small.** (a) **MCP-AQL → WebMCP**: a JS shim that
introspects an MCP-AQL adapter and re-registers each operation via
`navigator.modelContext.registerTool` so any MCP-AQL adapter becomes consumable by
Gemini in Chrome. (b) **WebMCP → MCP-AQL**: an AQL adapter that attaches to the
user's running Chrome via the Chrome DevTools Protocol, enumerates each tab's
`navigator.modelContextTesting.listTools()`, and runs the result through the
existing `adapter-generator` pipeline (CRUDE classification, danger tagging,
description enrichment, introspection synthesis). The discovery and invocation
surfaces are already exposed — no browser extension or Playwright fork required.

**WebMCP's surface is intentionally bare; MCP-AQL's job is to make it pedagogical.**
WebMCP gives an agent a name, a description, and an input schema. That's enough
for a frontier model; it isn't enough for a small one. AQL's contribution —
introspection, discriminated `{success | error}` responses, error suggestions,
CRUDE verb semantics carrying destructive/idempotency information — is exactly
the scaffolding that lets a weak model recover from a wrong first call. The
WebMCP → MCP-AQL adapter is the generator pattern with a CDP-based discovery
front-end; no new architecture, just a new input source.

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

Two adapters in opposite directions. Both are small because the discovery and
execution surfaces already exist on each side.

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
end-to-end.

### 7.2 WebMCP → MCP-AQL (CDP-attached, generator-backed)

The reverse direction is also small once two facts are pinned down:

1. **WebMCP already exposes an outside-the-page enumeration surface.** The
   `navigator.modelContextTesting` interface, gated behind the
   `WebMCP for testing` flag (`chrome://flags`), provides `listTools()` and
   `executeTool(name, input)`. This is the production hook for external
   consumers — it's what the Model Context Tool Inspector uses internally.
   Chrome 149 additionally adds a `DevToolsWebMCPSupport` flag that surfaces
   WebMCP through CDP directly.
2. **The Chrome DevTools Protocol gives external processes that surface for
   free.** Start Chrome with `--remote-debugging-port=9222`, attach over
   WebSocket, and `Runtime.evaluate` against any tab — no browser extension
   required, no Playwright fork required, no headless variant required. The
   user's *own* browser session (cookies, login, payment instruments) is the
   substrate.
3. **`WebMCP-org/chrome-devtools-quickstart`** is a fork of Google's
   `chrome-devtools-mcp` that already wraps this as the MCP tools
   `list_webmcp_tools` and `call_webmcp_tool`. So an MCP server exposing WebMCP
   pages to any MCP client already exists; the adapter only needs to wrap *it*.

The adapter shape collapses to:

- **Discovery front-end**: a thin call to `list_webmcp_tools` (or direct CDP
  `Runtime.evaluate('navigator.modelContextTesting.listTools()')`) producing a
  `DiscoveryBundle` of `DiscoveryOperation[]` — the same shape the
  `adapter-generator` already consumes.
- **Classification heuristic**: WebMCP's `annotations.readOnlyHint = true`
  maps to `endpoint: "READ"` with `endpoint_confidence: "high"`; everything
  else falls to `endpoint: "EXECUTE"` with `endpoint_confidence: "low"` and
  `needs_review: true`. `annotations.untrustedContentHint` raises
  `danger_level`. This is the only genuinely new code.
- **Pipeline reuse**: `buildToolDescription`, `buildIntrospectionOperations`,
  `buildOperationDetails`, `buildServerSource` — all of the
  `adapter-generator`'s existing passes — run unchanged on the resulting
  bundle. This is where the pedagogy layer comes from. The agent sees the
  AQL introspect surface, not the bare WebMCP tool list.
- **Runtime shim**: the generated adapter's `handle*` methods dispatch to
  `call_webmcp_tool` (or CDP `Runtime.evaluate(executeTool(...))`) instead of
  the upstream MCP server's `tools/call`.

No Playwright. No browser extension. No new transport. Existing generator
pipeline does the heavy lifting; WebMCP is just a new front-end on top of the
same `DiscoveryBundle` schema that already drives apple-mail-mcpaql et al.

The one piece the existing generator does not yet handle is **per-page
dynamism**: a WebMCP page can swap its tool set via `provideContext` or
`registerTool`/`unregisterTool` mid-session, and the user navigating between
tabs changes the catalog entirely. The adapter needs to listen on CDP
`Page.frameNavigated` and re-run discovery per active tab, with an in-process
cache keyed by `(origin, document_url)`. The generator pipeline runs lazily on
cache misses. AQL `introspect` responses reflect the current tab's enriched
catalog.

### 7.3 Inline (browser-resident MCP-AQL adapter)

A page hosts an MCP-AQL adapter in a worker and exposes it through WebMCP.
Mostly a curiosity; valid if the adapter genuinely belongs in-page (e.g., a
local PWA-style tool surface), but in that case it's simpler to register tools
directly without an AQL intermediate.

---

## 8. Where an Adapter Is Useful

**For MCP-AQL → WebMCP (the page-side shim):**

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

**For WebMCP → MCP-AQL (the CDP-attached adapter):**

- **Pedagogy on top of bare metal.** WebMCP gives a weak model `{name,
  description, inputSchema}` and expects it to figure things out. AQL gives
  the same model an introspect surface, a CRUDE verb that encodes
  destructive/idempotency semantics, a discriminated error response with
  suggested next operations, and a stable per-verb dispatch. The adapter is
  the pedagogy layer that makes WebMCP usable by models that aren't frontier.
- **Reuse of the existing generator pipeline.** This is not a parallel build;
  it's a new discovery front-end (CDP-driven, ~one new file) feeding the same
  `adapter-generator` that already produces apple-mail-mcpaql. The
  classification, enrichment, introspection synthesis, and server emission
  are unchanged.
- **Composes with the user's real session.** Because CDP attaches to the
  user's existing Chrome, the WebMCP page operates against real cookies,
  real login state, and real DOM — preserving the value proposition that
  makes WebMCP interesting in the first place. A headless variant would have
  thrown that away.

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
  that assumes session continuity across "pages" needs explicit per-page
  catalog management, not a static schema.
- **Server-side or headless contexts.** A WebMCP page only exists when a real
  browser is rendering it. The CDP-attached adapter exists to bridge into the
  user's *running* browser. Running a headless variant in CI or on a server
  loses the WebMCP session-context value prop — at that point you're just
  scraping a page, which a normal MCP server does better.

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
6. **CDP attach UX.** The WebMCP → AQL adapter requires the user to start
   Chrome with `--remote-debugging-port=N` *and* enable the
   `WebMCP for testing` flag. Chrome 149's `DevToolsWebMCPSupport` flag may
   make this cleaner. Test the path; document the flag set.
7. **Per-tab catalog scope.** The adapter's introspect surface should reflect
   the *active* tab, but a CDP attach sees all tabs. Decide: per-target AQL
   adapter instances, or a single adapter that scopes introspect by active
   target? The latter matches user intuition but complicates caching.
8. **`chrome-devtools-quickstart` as backend vs. CDP-direct.** Wrapping the
   existing fork is faster to ship; speaking CDP directly avoids a transitive
   dependency. Pick one. Wrapping is the right first move; the surface
   (`list_webmcp_tools`, `call_webmcp_tool`) is small enough to swap later.

---

## 11. Drawing Room as Prior Art

Auto-Dollhouse already ships the inverse half of this pattern, and the choices
it made are directly informative for the WebMCP → MCP-AQL adapter.

### What Drawing Room is

A browser-rendered chat-and-canvas surface (HTML/JS at
`~/.dollhouse/pages/the-drawing-room.html`) driven by an Express web server
that exposes the same `MCPAQLHandler` used by the stdio MCP transport. The page
is a *render target with structured events*. The LLM doesn't discover per-page
tools; it uses a stable AQL operation alphabet (`send_page_event`,
`wait_for_page_events`, plus a small allowlist of read/create operations) and
the page dispatches the typed payloads as DOM actions
(`chat-response | page-command | inject-html | inject-css | confirm-dialog`).

Key files (in `DollhouseMCP/active/auto-dollhouse/`):

| File | Role |
|---|---|
| `docs/architecture/drawing-room.md` | Authoritative architecture writeup |
| `src/web/routes/mcpAqlGatewayRoutes.ts` | `POST /api/mcp-aql` HTTP gateway with CSRF + rate-limit + operation allowlist |
| `src/handlers/mcp-aql/MCPAQLHandler.ts` | Shared AQL handler — same instance serves stdio and HTTP |
| `src/web/PageEventDispatcher.ts` | Classifies browser events as wake (notify LLM) or background (write to memory) |
| `src/web/routes/pageStreamRoutes.ts` | SSE push channel for LLM → browser |
| `src/web/routes/pageEventRoutes.ts` | `POST /api/page-event` for browser → LLM |
| `src/web/routes/permissionRoutes.ts` | PreToolUse hook → Gatekeeper → browser confirmation dialog |
| `src/web/console/LeaderForwardingSink.ts` | `LeaderPageEventProxy` — follower sessions HTTP-proxy to the leader that owns port 3939 |

### The architectural inversion

| | Drawing Room | WebMCP |
|---|---|---|
| **Who owns the tool catalog** | The LLM-side AQL handler | The page |
| **What the page does** | Renders + emits events | Registers tools |
| **What the LLM does** | Calls `send_page_event` with typed payloads; page dispatches | Discovers per-page tools and calls them |
| **Surface stability** | Small stable alphabet; pedagogy in handler's introspect | One bespoke catalog per page; pedagogy on page author |
| **What scales** | One AQL handler, N pages of any shape | N pages × M tools, each separately documented |
| **Transport** | HTTP gateway (`/api/mcp-aql`) + SSE | `navigator.modelContext` + browser-internal IPC |

Both are valid; they solve different problems. Drawing Room is right when the
LLM wants to *drive* an open-ended canvas (chat, dashboards, ad-hoc UI).
WebMCP is right when a site wants to *publish* its own structured action
surface (checkout, add-to-cart, filter-search).

### What Drawing Room teaches the WebMCP adapter

1. **One handler, many transports.** Drawing Room runs the same
   `MCPAQLHandler` over stdio and over HTTP without modification. The
   WebMCP → AQL adapter can follow the same pattern: a `MCPAQLHandler`
   instance whose handlers dispatch into a CDP-backed runtime instead of an
   `osascript`-backed one. No fork of the handler is needed.
2. **HTTP-with-allowlist is the right shape for a browser-facing AQL surface.**
   `mcpAqlGatewayRoutes.ts` shows the production-grade pattern: CSRF header
   (`X-Dollhouse-Request: true`), sliding-window rate limiter, unicode
   normalization, explicit operation allowlist, discriminated `{success,
   data | error}` responses. Reuse the pattern shape for any future
   WebMCP-adjacent gateway.
3. **Long-poll + SSE beats keep-alive WebSocket for zero idle cost.** Drawing
   Room's `wait_for_page_events` is a server-resolved long-poll;
   `send_page_event` pushes via SSE. The LLM consumes no tokens while
   waiting. The same pattern fits a WebMCP adapter that watches for CDP
   `Page.frameNavigated` or `navigator.modelContext` change events and
   invalidates its enriched-catalog cache — long-poll the change, SSE the
   notification.
4. **Gatekeeper round-trips through any UI surface.** The PreToolUse hook →
   `/api/evaluate_permission` → SSE `confirm-dialog` → browser button →
   `/api/submit-confirmation` flow shows that the AQL Gatekeeper doesn't
   care what renders the prompt. A WebMCP adapter can route `permission_prompt`
   responses through `requestUserInteraction` on the active WebMCP page using
   the same hook contract, no Gatekeeper changes required.
5. **Leader/follower already exists for multi-session.** The
   `LeaderPageEventProxy` pattern (port 3939 owned by one process; others
   HTTP-proxy in) directly solves "what if two Claude Code sessions both try
   to drive the same Chrome." Port allocation, leader election, and HTTP
   proxying are written and tested.

### The gap Drawing Room doesn't fill

Drawing Room has no concept of per-page tool catalogs — the page is just a
canvas the LLM paints on. If a site wants to publish its own AQL-grade
operations (rich descriptions, examples, error suggestions) over a local
gateway in the Drawing Room style — rather than the bare-bones
`navigator.modelContext` surface WebMCP offers — there's no spec for it yet.
The Drawing Room gateway pattern (`POST /api/mcp-aql` with CSRF) is the
right shape for such a thing: a *page* could speak to a local AQL adapter on
a discovered port, publishing a richer catalog than WebMCP allows. That's a
real spec hole and a plausible MCP-AQL-side proposal — call it "WebAQL" —
worth filing once the WebMCP adapter exists to compare against.

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
- `beaufortfrancois/model-context-tool-inspector` — [Inspector extension source][inspector]
  (canonical reference for `navigator.modelContextTesting`)
- `GoogleChromeLabs/webmcp-tools` — [WebMCP tooling][gcl-tools]
- Chrome DevTools team — [Chrome DevTools Protocol reference][cdp]

**Secondary / triangulation:**

- Bug0 — [WebMCP just landed in Chrome 146][bug0]
- Alpic — [WebMCP and existing MCP server entry point][alpic]
- MCP-B — [WebMCP vs MCP architectural comparison][mcpb]
- SD Times — [Google I/O 2026 introduces the 'Agentic Web' era][sdtimes]
- The New Stack — [Google wants to make the web agent-ready][tns]
- `WebMCP-org/chrome-devtools-quickstart` — [CDP+WebMCP MCP server][cdp-qs]
- Simon Willison — [WebMCP + Chrome DevTools Protocol demo][simon] (Feb 22, 2026)

**Prior art (internal):**

- `DollhouseMCP/active/auto-dollhouse/docs/architecture/drawing-room.md` —
  authoritative Drawing Room architecture

[spec]: https://webmachinelearning.github.io/webmcp/
[proposal]: https://webmachinelearning.github.io/webmcp/docs/proposal.html
[chrome-epp]: https://developer.chrome.com/blog/webmcp-epp
[chrome-docs]: https://developer.chrome.com/docs/ai/webmcp
[chrome-when]: https://developer.chrome.com/blog/webmcp-mcp-usage
[chrome-io]: https://developer.chrome.com/blog/chrome-at-io26
[brosset]: https://patrickbrosset.com/articles/2026-02-23-webmcp-updates-clarifications-and-next-steps/
[inspector]: https://github.com/beaufortfrancois/model-context-tool-inspector
[gcl-tools]: https://github.com/GoogleChromeLabs/webmcp-tools
[cdp]: https://chromedevtools.github.io/devtools-protocol/
[bug0]: https://bug0.com/blog/webmcp-chrome-146-guide
[alpic]: https://alpic.ai/blog/webmcp-explained-what-it-is-how-it-works-and-how-to-use-your-existing-mcp-server-as-an-entry-point
[mcpb]: https://docs.mcp-b.ai/explanation/webmcp-vs-mcp
[sdtimes]: https://sdtimes.com/ai/google-i-o-2026-introduces-the-agentic-web-era-with-major-chrome-updates/
[tns]: https://thenewstack.io/google-agent-ready-web/
[cdp-qs]: https://github.com/WebMCP-org/chrome-devtools-quickstart
[simon]: https://simonwillison.net/2026/Feb/22/webmcp-chrome-demo/
