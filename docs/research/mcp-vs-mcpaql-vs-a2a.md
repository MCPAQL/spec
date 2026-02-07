---
title: "Protocol Landscape: MCP vs MCP-AQL vs A2A"
version: 1.0.0
status: research
date: 2026-02-07
---

# Protocol Landscape: MCP vs MCP-AQL vs A2A

> A strategic comparison of three protocols shaping how AI agents interact with the
> world: where they overlap, where they diverge, and where the gaps are.

## Table of Contents

- [Executive Summary](#executive-summary)
- [1. What Each Protocol Is](#1-what-each-protocol-is)
- [2. Architecture Stack](#2-architecture-stack)
- [3. The Core Problem Each Solves](#3-the-core-problem-each-solves)
- [4. How Each Protocol Works](#4-how-each-protocol-works)
- [5. Key Capabilities Comparison](#5-key-capabilities-comparison)
- [6. Strengths and Weaknesses](#6-strengths-and-weaknesses)
- [7. Overlap and Toe-Stepping Analysis](#7-overlap-and-toe-stepping-analysis)
- [8. Gap Analysis](#8-gap-analysis)
- [9. A2A Under the Hood: What It Provides vs. What It Doesn't](#9-a2a-under-the-hood-what-it-provides-vs-what-it-doesnt)
- [10. The COMMS Element Type and A2A](#10-the-comms-element-type-and-a2a)
- [11. The Composite Architecture](#11-the-composite-architecture)
- [12. Scenario Guide](#12-scenario-guide)
- [13. Maturity and Adoption](#13-maturity-and-adoption)
- [14. Key Takeaways](#14-key-takeaways)
- [Sources](#sources)

---

## Executive Summary

Three protocols are shaping how AI agents interact with the world. They are not
competitors -- they are layers of the same stack, each solving a different fundamental
problem:

- **MCP** (Model Context Protocol) is the **wiring standard** -- it defines how an LLM
  application connects to external tools, data, and services.
- **MCP-AQL** (MCP Advanced Agent API Adapter Query Language) is the **universal
  translation layer** -- it makes any API safely and efficiently accessible to LLMs
  through a single, self-describing interface.
- **A2A** (Agent-to-Agent Protocol) is the **diplomatic protocol** -- it defines how
  autonomous AI agents discover each other and collaborate across vendor and framework
  boundaries.

This document examines where they overlap, where they step on each other's toes
(or don't), and where gaps remain.

---

## 1. What Each Protocol Is

### MCP -- The Wiring Standard

**Origin:** Anthropic, November 2024
**Governance:** Agentic AI Foundation (Linux Foundation), December 2025
**Current spec:** 2025-11-25 (4th revision)
**Backers:** Anthropic, OpenAI, Google, Microsoft, AWS, Cloudflare, Block, Bloomberg,
and hundreds more

MCP standardizes how LLM applications connect to external capabilities. It solves the
**M x N integration problem** -- without a standard, every AI application must build
custom integrations for every external service. MCP replaces this with a universal
protocol inspired by the Language Server Protocol (LSP), which solved the same problem
for IDE-to-language tooling.

**Core primitives:**

- **Tools** -- Executable actions the AI model can invoke (function calling)
- **Resources** -- Read-only data sources for context (files, databases, configurations)
- **Prompts** -- Predefined message templates that guide AI behavior

**Architecture:** Host → Client → Server model over JSON-RPC 2.0. Transports include
stdio (local) and Streamable HTTP (remote). Stateful sessions with capability
negotiation at connect time.

**Ecosystem:** 10,000+ servers in production, 300+ clients, 97M+ monthly SDK downloads
across TypeScript, Python, Java, C#, Go, and Rust.

### MCP-AQL -- The Universal Translation Layer

**Origin:** MCPAQL Organization, 2025
**Current spec:** v1.0.0-draft (nearing v1.0-rc)
**Reference implementation:** DollhouseMCP (private beta V2)
**Status:** Launch expected within weeks

MCP-AQL is a protocol specification that makes **any system with an API** safely and
efficiently accessible to LLMs through a uniform, self-describing interface. It sits on
top of MCP as a transport but its purpose extends far beyond MCP optimization.

The core insight: **LLMs struggle to correctly call arbitrary APIs.** They hallucinate
parameters, miss constraints, trigger destructive operations blindly, and waste enormous
amounts of context window on tool schemas they may never use. MCP-AQL solves this by
providing:

1. **A universal translation layer** that wraps any API (REST, GraphQL, gRPC, OS native,
   hardware, other MCP servers, other agents) behind a consistent CRUDE interface
2. **Runtime introspection** with rich constraint metadata (enums, min/max, patterns,
   formats) that tells the LLM exactly what values are valid -- eliminating hallucinated
   parameters
3. **Protocol-enforced safety** via a Gatekeeper that cannot be bypassed by prompt
   injection -- because "LLM instructions are suggestions; adapter policies are
   enforcement"
4. **Radical token efficiency** (~85-96% reduction) as a natural consequence of the
   consolidated, progressive-disclosure design

**Key distinction:** MCP-AQL doesn't just optimize MCP -- it's a **computational
middleware layer** that handles messy API translation so the LLM only deals with clean,
structured, safe interactions.

### A2A -- The Diplomatic Protocol

**Origin:** Google, April 2025
**Governance:** Linux Foundation (LF AI & Data), July 2025
**Current spec:** v0.3 (July 2025)
**Backers:** Google, AWS, Cisco, SAP, Salesforce, ServiceNow, IBM, Atlassian, PayPal,
MongoDB, LangChain, 150+ organizations

A2A standardizes how autonomous AI agents discover each other and collaborate on tasks
across vendor and framework boundaries. It solves the **agent interoperability problem**
-- agents built on different frameworks (LangChain, CrewAI, Google ADK) exist in silos
and cannot communicate.

**Core concepts:**

- **Agent Cards** -- JSON metadata published at `/.well-known/agent.json` describing
  what an agent can do
- **Tasks** -- Stateful units of work with lifecycle (working → completed/failed/canceled)
- **Messages** -- Multi-turn conversational exchanges between agents
- **Artifacts** -- Tangible outputs/deliverables produced by agents

**Design philosophy:** Agents are **opaque** to each other -- they share no internal
state, tools, or memory. Collaboration happens through natural, unstructured multi-turn
conversation, not rigid API contracts.

**Protocol:** JSON-RPC 2.0 and gRPC (as of v0.3), with synchronous, streaming (SSE),
and push notification delivery modes. IBM's Agent Communication Protocol (ACP) was
merged into A2A in August 2025.

---

## 2. Architecture Stack

```
┌──────────────────────────────────────────────────────────────┐
│                    A2A (Agent ↔ Agent)                        │
│        Discovery, delegation, multi-turn task negotiation     │
│        Agents are opaque autonomous peers                     │
├──────────────────────────────────────────────────────────────┤
│               MCP-AQL (Universal Translation)                 │
│        Any API → uniform CRUDE interface for LLMs            │
│        Declarative adapters, introspection, safety,          │
│        constraint enforcement, computational middleware       │
├──────────────────────────────────────────────────────────────┤
│               MCP (Wiring Standard)                           │
│        Transport + primitives (Tools, Resources, Prompts)    │
│        stdio / Streamable HTTP / JSON-RPC 2.0                │
├──────────────────────────────────────────────────────────────┤
│                    Target Systems                             │
│        REST APIs, GraphQL, gRPC, databases, OS native,       │
│        hardware (serial/USB), IoT, file systems,             │
│        other MCP servers, other agents                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. The Core Problem Each Solves

| | MCP | MCP-AQL | A2A |
|---|---|---|---|
| **Core problem** | Every AI app builds custom integrations for every tool/service (M x N explosion) | LLMs can't reliably call arbitrary APIs -- they hallucinate parameters, miss constraints, and waste context on schemas | Agents from different vendors/frameworks can't discover or collaborate with each other |
| **Solution** | Standardize the connection protocol (one universal wire format) | Translate any API into an LLM-native interface with self-describing operations, constraint metadata, and safety enforcement | Standardize agent discovery and task delegation via Agent Cards and multi-turn task conversations |
| **Analogy** | USB-C: a universal connector | A universal interpreter that speaks every API dialect but presents one clean language | Embassy communications between sovereign nations |

---

## 4. How Each Protocol Works

### MCP: Connect and Call

1. Host launches MCP server (local process or remote HTTP endpoint)
2. Client connects and performs capability negotiation (both sides declare what they
   support)
3. Server exposes Tools, Resources, and Prompts -- all definitions loaded into LLM
   context at connect time
4. LLM calls tools via structured function calling, gets responses
5. Client can also provide Sampling (server requests LLM completions) and Elicitation
   (server requests user input)

**Wire format:** JSON-RPC 2.0 messages over stdio or Streamable HTTP
**State:** Stateful session (capabilities fixed for session lifetime)

### MCP-AQL: Translate and Dispatch

1. An adapter wraps a target system (REST API, MCP server, OS, hardware, etc.) using a
   **declarative schema file** (Markdown + YAML front matter -- no code generation
   required)
2. The universal runtime interprets the schema at call time
3. LLM connects via MCP and sees 1-5 semantic endpoints instead of dozens of tools
4. On first contact with an unfamiliar API, the LLM introspects to discover operations
   and their constraints
5. On subsequent calls, the LLM sends operations directly -- no introspection needed
6. The Gatekeeper enforces safety policies server-side, regardless of what the LLM was
   instructed to do

**Request format:**

```javascript
{
  operation: "create_element",
  params: { element_name: "foo", description: "A new element" }
}
```

**Discovery flow (first contact only):**

```javascript
// Step 1: What operations exist?
{ operation: "introspect", params: { query: "operations" } }

// Step 2: How do I call this specific one?
{ operation: "introspect", params: { query: "operations", name: "create_element" } }
// Returns: params with types, enums, min/max, patterns, examples

// Step 3: Make the call
{ operation: "create_element", params: { ... } }
```

**Confident call (already knows the API):**

```javascript
// Single call, single response -- same round-trip cost as discrete tools
{ operation: "create_element", params: { element_name: "foo", ... } }
```

**Fire-and-forget (telemetry/feedback):**

```javascript
// Request
{ operation: "notify", type: "element_used",
  params: { element_type: "persona", element_name: "Advisor" } }

// Minimal response (~15 tokens)
{ ack: true }
```

**Response format (discriminated union):**

```javascript
// Success
{ success: true, data: { /* ... */ }, warnings: [ /* optional */ ] }

// Failure
{ success: false, error: { code: "VALIDATION_MISSING_PARAM", message: "..." } }
```

### A2A: Discover and Delegate

1. Client agent fetches Agent Cards from potential collaborators at
   `/.well-known/agent.json`
2. Agent Card describes the remote agent's skills, authentication requirements, and
   capabilities
3. Client sends a task to the remote agent via JSON-RPC or gRPC
4. Remote agent processes the task, potentially through multiple conversation turns
5. Task progresses through lifecycle states (working → input_required → completed)
6. Client receives results as Artifacts (text, files, structured data, multimedia)

**Minimum viable interaction (JSON-RPC binding):**

```
POST https://remote-agent.example.com/a2a
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "a2a.SendMessage",
  "params": {
    "message": {
      "messageId": "msg-001",
      "role": "user",
      "parts": [{ "kind": "text", "text": "Find the population of Tokyo." }]
    },
    "configuration": { "blocking": true }
  }
}
```

**Communication modes:**

- Synchronous request/response (`blocking: true`)
- Streaming via SSE
- Asynchronous via push notifications (webhooks) for long-running tasks

---

## 5. Key Capabilities Comparison

### Discovery and Self-Description

| | MCP | MCP-AQL | A2A |
|---|---|---|---|
| **Discovery mechanism** | Static -- client connects to pre-configured servers | Runtime introspection -- `introspect` operation discovers operations on demand | Agent Cards at well-known URLs |
| **Schema loading** | All tool definitions loaded upfront into LLM context | Progressive disclosure -- discover what you need, when you need it | Agent Card skills are high-level descriptions, not detailed schemas |
| **Constraint metadata** | Tool annotations (readOnly, destructive hints) + JSON Schema for inputs | Rich constraints: enums, min/max, patterns, formats, sensitive markers, examples | Minimal -- skill descriptions are natural language |
| **Token cost of discovery** | ~500-700 tokens per tool (50 tools = ~30,000 tokens upfront) | ~1,100 tokens total (single mode) for unlimited operations | Agent Cards fetched out of band, not in LLM context |

### Token Efficiency

| | MCP | MCP-AQL | A2A |
|---|---|---|---|
| **Registration overhead** | ~30,000 tokens for 50 tools | ~1,100 (single mode) to ~4,300 (CRUDE mode) for 50+ operations | N/A -- agents, not tools |
| **Reduction from baseline** | Baseline (0%) | 85-96% reduction | Not comparable |
| **Response efficiency** | Raw tool output dumped to context | Field selection (minimal/standard/full presets) provides 65-86% additional reduction | Artifacts with structured Parts |
| **Repeated call optimization** | Same cost every time | "Ditto" shorthand pattern: 97% reduction on repeated calls (~15 tokens vs ~450) | N/A |
| **Fire-and-forget** | No -- every tool call requires full response processing | `notify` operation returns minimal `{ ack: true }` (~15 tokens) | N/A |

### Safety and Security

| | MCP | MCP-AQL | A2A |
|---|---|---|---|
| **Safety model** | Tool annotations are hints; client decides whether to honor them | **Protocol-enforced Gatekeeper** -- 4-layer defense-in-depth; server-side enforcement that LLM cannot bypass | Agent can reject tasks; standard auth schemes |
| **Danger classification** | Binary: readOnly or destructive annotation | 5-level system: safe → reversible → destructive → dangerous → forbidden | N/A |
| **Trust model** | Implicit trust in configured servers | 5-level trust: untested → generated → validated → community_reviewed → certified; gating matrix with danger levels | Authentication schemes (OAuth, OIDC, mTLS) |
| **Hallucination prevention** | Depends on tool description quality | Unknown parameter rejection -- if LLM hallucinates `force: true`, adapter rejects and returns valid params | Depends on Agent Card quality |
| **Confirmation workflow** | Human-in-the-loop via Sampling | Confirmation tokens for destructive operations; pattern-based auto-classification (`force_*` → dangerous, `drop_*` → forbidden) | N/A |
| **Auth** | OAuth 2.1 (as of Jun 2025) | Inherits MCP + per-adapter auth plugins (API key, Bearer, OAuth, mTLS, AWS SigV4) | OAuth 2.0, OIDC, mTLS, API keys, in-task auth escalation |
| **Core principle** | Security by design (but client-enforced) | "LLM instructions are suggestions. Adapter policies are enforcement." | Secure by default (enterprise-grade from day one) |

### Scope and Reach

| | MCP | MCP-AQL | A2A |
|---|---|---|---|
| **What it connects to** | MCP-compatible servers | **Any system with an API**: REST, GraphQL, gRPC, MCP servers, OS native APIs, hardware (serial/USB), IoT, databases, file systems, other agents | Other A2A-compatible agents |
| **Adapter creation** | SDK integration + custom code per server | **Declarative schema file** (Markdown + YAML) -- no code generation, hot-reloadable | SDK integration per agent |
| **Plugin system** | N/A | Transport (HTTP, WebSocket, serial, native OS), Protocol (REST, GraphQL, gRPC, JSON-RPC), Serialization (JSON, XML, Protobuf, MessagePack), Auth (multiple schemes), Pagination (cursor, offset, page) | N/A |
| **Performance tiers** | Single implementation | Three-tier architecture planned: Standard (TypeScript) for MCP wrapping, Local Systems (Rust, 5-50x faster) for OS/hardware, Network API (Rust) for concurrent web API processing | Single implementation |

### Agent-to-Agent Capabilities

| | MCP | MCP-AQL | A2A |
|---|---|---|---|
| **Agent-to-agent** | No | Yes -- via adapter chains, distributed tracing (W3C Trace Context), EXECUTE lifecycle | **Primary purpose** |
| **Task delegation** | No | EXECUTE endpoint with state machine (pending → running → completed/failed/cancelled) | First-class task lifecycle with 7-state machine and multi-turn conversation |
| **Multi-agent coordination** | No | Optimistic concurrency (ETags), notifications/telemetry for inter-agent signaling | Discovery via Agent Cards, context IDs for conversation threading |
| **Distributed tracing** | No | W3C Trace Context propagation across adapter chains (traceId, spanId, parentSpanId) | No built-in (implementer responsibility) |

### Computational Middleware

| | MCP | MCP-AQL | A2A |
|---|---|---|---|
| **Processing model** | LLM calls tool → gets raw result → reasons about it | Adapter can process server-side: computed fields, aggregations, multi-step API iteration **without returning to the LLM** -- LLM only sees final processed result | Remote agent does all internal processing; returns artifacts |
| **Server-side computation** | Not built in | Computed fields (so LLM doesn't do math), server-side aggregations (counts, groupings without fetching all records) | Agent handles internally |
| **Batch operations** | No native batching | Optional batch operations with per-item results, continueOnError, and atomic modes | N/A |
| **Dry-run mode** | No | Preview consequences before committing, including policy checks and estimated token costs | No |

---

## 6. Strengths and Weaknesses

### MCP

**Strengths:**

- De facto industry standard with massive ecosystem and adoption
- Clean three-primitive model (Tools, Resources, Prompts) with clear separation
- Transport flexibility (stdio for dev, Streamable HTTP for production)
- Capability negotiation prevents feature mismatches at connect time
- Sampling and Elicitation enable rich bidirectional LLM-server interaction
- Async Tasks (Nov 2025) handle long-running operations
- Under neutral governance with every major AI company backing it

**Weaknesses:**

- **Tool sprawl is the critical pain point** -- many tools consume thousands of tokens
  for schemas before any work begins, crowding out context for actual reasoning
- No native agent-to-agent communication
- Stateful sessions complicate horizontal scaling (sticky sessions or distributed state
  required)
- Security is well-designed in spec but problematic in practice (43% command injection in
  one audit of real-world implementations; all verified servers lacked authentication in
  a Knostic scan)
- Multiple spec revisions with breaking changes have required repeated rework from early
  adopters
- Every tool call gets raw output dumped to context -- wasteful for data-heavy operations

### MCP-AQL

**Strengths:**

- **Universal translation layer** -- one interface for any API, OS, hardware, or agent
- **Zero-code adapters** -- declarative schema files (Markdown + YAML), no compilation,
  hot-reloadable
- **LLM-native design** -- constraint metadata in introspection responses directly
  eliminates hallucinated parameters
- **Protocol-enforced safety** -- Gatekeeper cannot be bypassed by prompt injection or
  context manipulation; server-side authority is absolute
- **Token efficiency is a natural consequence** (~85-96% on registration, 65-86% on
  responses via field selection, 97% on repeated calls via Ditto shorthand)
- **Progressive disclosure** matches how LLMs actually work
- **No introspection required for confident calls** -- single round-trip, same as
  discrete tools
- **Fire-and-forget via `notify`** -- minimal `{ ack: true }` (~15 tokens) for telemetry
- **Computational middleware** -- server-side processing shields LLM from raw API
  complexity
- **Three-tier performance architecture** planned (TypeScript, Rust local, Rust network)
- **Agent-to-agent capable** via distributed tracing, EXECUTE lifecycle, and optimistic
  concurrency
- **Domain-agnostic** -- each adapter defines its own operations for its own domain

**Weaknesses:**

- **First-contact discovery takes multiple round trips** (one-time cost, not per-call)
- **Draft specification** -- v1.0.0-draft, though nearing v1.0-rc with launch imminent
- **Single reference implementation** (DollhouseMCP private beta V2)
- **Advanced transport plugins** (serial, native OS, gRPC, Rust tiers) are future work
- **CRUDE pattern unfamiliarity** -- minor learning curve beyond standard CRUD
- **Single endpoint mode trades safety for efficiency** -- no endpoint-level permission
  blocking in single mode
- **Adapter quality depends on schema authors** -- mitigated by canonical operation verbs

### A2A

**Strengths:**

- Fills a gap nothing else addresses -- true agent-to-agent interoperability across
  vendors
- Opaque agent model protects intellectual property and proprietary logic
- Rich task lifecycle with multi-turn conversations, streaming, and push notifications
- Multimodal content support (text, files, structured data, audio, video)
- Enterprise-grade security from day one (OAuth 2.0, OIDC, mTLS, in-task auth
  escalation)
- gRPC support (v0.3) for high-performance binary communication
- Signed Agent Cards (v0.3) for cryptographic identity verification
- Strong governance trajectory (Linux Foundation, 150+ orgs, IBM ACP merger)

**Weaknesses:**

- **O(n squared) scaling** -- 50 agents = 1,200+ connections to manage
- **No built-in orchestration** -- conflict resolution, cascading failure handling, and
  circular dependency prevention left to implementers
- **Agent Card skill descriptions are high-level** -- imprecise for task routing
- **Early-stage maturity** -- v0.3 draft; breaking changes expected
- **Missing economics** -- no pricing, SLAs, or inter-agent billing
- **Observability challenges** -- tracing gaps across agent chains
- **State management gaps** -- elaborate state infrastructure required
- **Security surface concerns** -- Agent Card spoofing, tool squatting, data sovereignty
  across agent chains are unsolved

---

## 7. Overlap and Toe-Stepping Analysis

### Does MCP-AQL Step on MCP's Toes?

**No.** MCP-AQL rides on top of MCP -- it uses MCP as its transport layer. MCP-AQL
registers as 1-5 MCP tools and communicates via the standard `CallToolResult` mechanism.
MCP-AQL doesn't replace MCP; it makes MCP-connected servers more efficient and safer to
use. They are symbiotic, not competitive.

### Does MCP-AQL Step on A2A's Toes?

**Partially, in a good way.** There is genuine overlap at the agent-to-agent boundary:

| Capability | MCP-AQL | A2A | Overlap? |
|---|---|---|---|
| Agent discovery | Introspection (what operations exist?) | Agent Cards (what can this agent do?) | **Complementary** -- different granularity |
| Task delegation | EXECUTE endpoint with lifecycle states | Task lifecycle with 7-state machine | **Overlapping** -- but MCP-AQL is structured/typed while A2A is conversational |
| Multi-turn interaction | Not native (each call is independent) | First-class multi-turn with context IDs | **A2A is stronger here** |
| Distributed tracing | W3C Trace Context across adapter chains | Not built in | **MCP-AQL is stronger here** |
| Safety enforcement | Gatekeeper with danger/trust levels | Agent-level accept/reject | **Different philosophy, both valid** |

The overlap is at the **precision-flexibility boundary**:

- **MCP-AQL** provides a normalized API endpoint for agents -- typed, constrained,
  validated, with protocol-enforced safety. Best when one agent needs to *correctly
  execute a specific operation* on another system.
- **A2A** provides unstructured multi-turn negotiation between opaque peers. Best when
  agents need to *reason together about ambiguous, evolving tasks*.

These are complementary, not competing. A system might use A2A for high-level delegation
("Research Agent, investigate this") and MCP-AQL for the precise operations within that
delegation.

### Does A2A Step on MCP's Toes?

**No.** A2A and MCP are explicitly complementary. A2A's own documentation describes the
relationship: MCP handles agent-to-tool (vertical), A2A handles agent-to-agent
(horizontal). An agent uses MCP internally to access tools and A2A externally to
collaborate with other agents.

### Does A2A Step on MCP-AQL's Toes?

**Slightly, at the edges.** A2A's task lifecycle (7 states, multi-turn, streaming,
push notifications) is more mature than MCP-AQL's EXECUTE endpoint lifecycle. If your
use case is *primarily* agent-to-agent task delegation with rich conversational context,
A2A is the right choice. MCP-AQL's agent-to-agent capabilities are structured and
precise but less flexible for open-ended collaboration.

---

## 8. Gap Analysis

### Gaps in MCP (Addressed by the Other Two)

| Gap | Who fills it |
|---|---|
| Tool sprawl / context window bloat | **MCP-AQL** (85-96% token reduction) |
| No agent-to-agent communication | **A2A** (primary purpose) and **MCP-AQL** (via adapter chains) |
| Safety is advisory, not enforced | **MCP-AQL** (Gatekeeper with server-side authority) |
| No progressive discovery | **MCP-AQL** (introspection on demand) |
| Raw tool output wastes tokens | **MCP-AQL** (field selection, server-side computation) |

### Gaps in A2A (Not Yet Addressed)

| Gap | Description | Potential fill |
|---|---|---|
| **No message persistence** | The spec does not specify whether agents must persist messages after task completion, how long task state must be retained, or storage format. An A2A server could lose everything on restart and still be conformant. | **COMMS element type** (file-based, database, Redis backends) |
| **No message queuing** | No guaranteed delivery, no ordering guarantees beyond streaming, no dead-letter queues, no backpressure mechanism. Push notification retry policy is the closest thing. | **COMMS element type** or external message broker |
| **No offline delivery** | If the server agent is unreachable, the request fails. No store-and-forward, no inbox/outbox pattern. | **COMMS element type** (file-based persistence survives offline) |
| **No local agent-to-agent communication** | All three standard bindings (JSON-RPC/HTTP, gRPC, REST) assume network communication. No Unix socket, shared memory, IPC, or localhost optimization. | **COMMS element type** (filesystem IPC at `~/.dollhouse/team-ipc/`) |
| **No state management between sessions** | No session concept at the protocol level, no session tokens or resumption, no requirement that context IDs persist across restarts. | **Memory elements** + **COMMS element type** |
| **No orchestration** | No workflow definition, conditional branching, routing, fan-out/fan-in, saga patterns, circuit breakers, or load balancing. Explicitly out of scope. | Application layer / **TEAM element type** |
| **No discovery registry** | Agent Cards at well-known URLs require knowing the URL in advance. No search, marketplace, or broadcast discovery. | **MCP-AQL adapter registry** / **COMMS discovery** |
| **No distributed tracing** | No built-in tracing format; metadata maps can carry trace IDs but nothing is standardized. | **MCP-AQL** (W3C Trace Context) |
| **No economics** | No pricing, SLAs, inter-agent billing, or dispute resolution. | Not addressed by any protocol yet |
| **No streaming client-to-server** | Clients cannot stream large inputs during task execution; only agents stream output back. | Not addressed |

### Gaps in MCP-AQL (Not Yet Addressed)

| Gap | Description | Potential fill |
|---|---|---|
| **Multi-turn conversational context** | Each MCP-AQL call is independent; no built-in context threading across calls | **A2A** (context IDs, multi-turn tasks) |
| **Agent opaqueness** | MCP-AQL introspection reveals operation details; no mechanism to hide internals when that's desirable | **A2A** (opaque by design) |
| **Multimodal content exchange** | MCP-AQL responses are structured JSON; no native audio, video, or rich media support | **A2A** (multimodal Parts) |
| **Cross-vendor interoperability** | MCP-AQL requires MCP as transport; cannot directly interoperate with non-MCP agents | **A2A** (framework-agnostic) |

---

## 9. A2A Under the Hood: What It Provides vs. What It Doesn't

A critical question for positioning MCP-AQL relative to A2A: **does A2A have its own
wiring, or is it simply a description of how agents interact?**

### What A2A Actually Provides

A2A is a **real protocol with real wire bindings**, not just a description. It has three
layers:

| Layer | What A2A Defines |
|---|---|
| **Canonical Data Model** | Protocol Buffers (`a2a.proto`) defining Task, Message, AgentCard, Artifact, Part types |
| **Abstract Operations** | 11 transport-agnostic operations (SendMessage, GetTask, ListTasks, CancelTask, SubscribeToTask, etc.) |
| **Protocol Bindings** | Concrete mappings to JSON-RPC 2.0 over HTTP, gRPC over HTTP/2, and REST over HTTP |

A2A mandates TLS 1.2+, registers an IANA media type (`application/a2a+json`), and
defines HTTP headers (`A2A-Version`, `A2A-Extensions`). It provides real message
formats, real state machines, and real security schemes.

### What A2A Leaves to Implementers

This is where the gaps are significant:

| Concern | A2A's Position |
|---|---|
| **Message persistence** | Completely unspecified |
| **Message queuing / guaranteed delivery** | Not addressed; push notification retry is closest |
| **Offline delivery** | Not supported; synchronous with async extensions |
| **Local IPC (same machine)** | Not addressed; all bindings assume network |
| **Session state management** | Not specified; no session concept |
| **Orchestration / routing** | Explicitly out of scope |
| **Agent registry / search** | Not provided; must know URL to fetch Agent Card |
| **Distributed tracing** | Not standardized; metadata can carry trace IDs |
| **Economics / billing** | Not addressed |

### Could A2A Run on MCP?

Technically possible via A2A's custom binding mechanism (Section 12), but
**architecturally awkward** because:

1. **Role inversion** -- MCP treats remote parties as stateless tools; A2A treats them
   as autonomous agents with state machines
2. **Streaming mismatch** -- A2A's task-lifecycle-aware streaming doesn't map cleanly to
   MCP's generic SSE
3. **Discovery conflict** -- Two discovery systems (tool listings vs. Agent Cards) would
   need reconciliation

The intended relationship is **side by side**, not layered: A2A for inter-agent
delegation, MCP for tool invocation.

---

## 10. The COMMS Element Type and Protocol-Specific Variants

DollhouseMCP has a planned (but not yet specified) **COMMS element type** designed for
inter-agent, inter-session, and inter-computer communication. It is part of the broader
**TEAM element** hierarchy for multi-computer orchestration.

### COMMS as a Protocol-Specific Element Category

A critical design decision: COMMS is not a single monolithic element type. It is an
**element type category** with **protocol-specific variants**. Each variant presents a
focused, constrained interface to the AI for a specific communication protocol's
semantics.

This follows the same philosophy as MCP-AQL itself: rather than giving the AI one
giant comms element with a thousand protocol-specific options to navigate, each protocol
variant presents a clean, limited set of operations that the AI can correctly use.

**Potential COMMS variants:**

| Variant | Protocol | Use Case |
|---|---|---|
| **A2A comms** | Google A2A | Cross-vendor agent-to-agent delegation with task lifecycle |
| **TCP/IP comms** | Raw TCP/IP | Low-level network communication, custom protocols |
| **HTTP comms** | HTTP/REST | Direct web API messaging, webhooks |
| **SMTP comms** | SMTP/email | Email-based notifications and async communication |
| **WebSocket comms** | WebSocket | Real-time bidirectional messaging |
| **Filesystem comms** | Local IPC | Same-machine agent-to-agent via file-based messaging |
| **Mesh comms** | WireGuard/Tailscale | Encrypted multi-node agent mesh networking |

Each variant is a separate element that encapsulates its protocol's semantics. An AI
using "A2A comms" sees Agent Cards, Tasks, Messages, and Artifacts. An AI using
"TCP/IP comms" sees connections, packets, and streams. An AI using "SMTP comms" sees
recipients, subjects, and message bodies. The protocol complexity is contained within
each variant, not dumped into a single generic element.

### Element Hierarchy

```
TEAM (orchestrates computers/sessions)
  → uses COMMS variants (protocol-specific message passing)
      → A2A comms (cross-vendor agent delegation)
      → Filesystem comms (local IPC)
      → Mesh comms (encrypted multi-node)
      → HTTP comms (webhooks, REST messaging)
      → ...
  → uses MEMORY (for shared state persistence)
  → contains ENSEMBLES (which contain agents, personas, skills, etc.)
```

### Transport Mechanisms

| Scope | Likely Variant | Mechanism |
|---|---|---|
| Same computer, different sessions | Filesystem comms | File-based IPC at `~/.dollhouse/team-ipc/` |
| Different computers (network) | HTTP comms / A2A comms | REST/HTTP or A2A task delegation |
| Encrypted enterprise mesh | Mesh comms | WireGuard via Tailscale or Headscale (self-hosted) |
| Cross-vendor agent collaboration | A2A comms | A2A protocol with Agent Cards and task lifecycle |
| Async notifications | SMTP comms / HTTP comms | Email or webhook-based |

### A2A as One COMMS Variant (Not THE Comms Element)

This distinction matters. A2A is an excellent protocol for cross-vendor agent
interoperability and would be a natural fit as one COMMS variant. But COMMS should not
be designed as "A2A plus extras" -- that would:

1. **Conflate the transport layer with a specific protocol's semantics.** COMMS is about
   *how messages move*. A2A is about *what agents say to each other*. These are separate
   concerns even when they overlap.
2. **Limit future protocol support.** If COMMS is designed around A2A's data model
   (Tasks, Messages, Artifacts), adding TCP/IP or SMTP variants later would be awkward
   -- those protocols have fundamentally different semantics.
3. **Present the AI with an unnecessarily complex interface.** An AI doing simple
   filesystem IPC between local agents doesn't need to navigate A2A's 7-state task
   machine. An AI sending email notifications doesn't need Agent Cards.

Instead, each COMMS variant is a self-contained element that the AI understands on its
own terms. The protocol specifics stay inside the variant.

### Where COMMS Variants Fill A2A's Gaps

A2A leaves significant infrastructure gaps (see Section 9). Different COMMS variants
address different gaps:

| A2A Gap | Which COMMS Variant Fills It |
|---|---|
| **No message persistence** | Filesystem comms, database-backed variants |
| **No message queuing** | Filesystem comms (natural queue semantics), database variants |
| **No offline delivery** | Filesystem comms (persists regardless of recipient availability) |
| **No local IPC** | Filesystem comms at `~/.dollhouse/team-ipc/` (sub-100ms) |
| **No state between sessions** | Memory elements + any persistent COMMS variant |
| **No orchestration** | TEAM element coordinates across COMMS variants |
| **No discovery on local network** | TEAM session discovery protocol (planned) |

### Where A2A Provides What COMMS Variants Don't

| Gap | What A2A Provides |
|---|---|
| **Cross-vendor interoperability** | A2A works across any framework; COMMS variants are DollhouseMCP elements |
| **Standardized Agent Cards** | A2A's discovery model is an industry standard |
| **Multi-turn conversational protocol** | A2A has formal message/task/artifact semantics |
| **Multimodal content** | A2A's Part type supports text, files, data, UI components |
| **Industry governance** | A2A is under the Linux Foundation with 150+ backers |

An **A2A comms variant** would bring all of these into the DollhouseMCP ecosystem
while keeping A2A's semantics cleanly separated from other communication protocols.

### The Architecture

```
┌──────────────────────────────────────┐
│  Agent (DollhouseMCP)                │
│  ┌────────────────────────────────┐  │
│  │ COMMS variants (protocol-      │  │
│  │ specific elements)             │  │
│  │                                │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │ A2A      │ │ Filesystem │  │  │
│  │  │ comms    │ │ comms      │  │  │
│  │  │ (agents) │ │ (local)    │  │  │
│  │  └──────────┘ └────────────┘  │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │ HTTP     │ │ Mesh       │  │  │
│  │  │ comms    │ │ comms      │  │  │
│  │  │ (webhooks│ │ (encrypted)│  │  │
│  │  └──────────┘ └────────────┘  │  │
│  ├────────────────────────────────┤  │
│  │ MCP-AQL adapter                │  │  ← CRUDE interface for all variants
│  │ (safety, constraints)          │  │
│  ├────────────────────────────────┤  │
│  │ MCP transport                  │  │  ← Wire format
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## 11. The Composite Architecture

The end state for a sophisticated system uses all layers:

```
┌────────────────────────────────────────────────────────────────┐
│                     Enterprise AI Platform                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────┐    A2A     ┌──────────┐    A2A    ┌──────────┐  │
│  │ Research │◄──────────►│ Planning │◄─────────►│ Execution│  │
│  │  Agent   │            │  Agent   │           │  Agent   │  │
│  └────┬─────┘            └────┬─────┘           └────┬─────┘  │
│       │                       │                      │        │
│       │ MCP-AQL               │ MCP-AQL              │ MCP-AQL│
│       │                       │                      │        │
│  ┌────┴─────┐            ┌────┴─────┐          ┌────┴─────┐  │
│  │ Web APIs │            │ Database │          │ OS / CI  │  │
│  │ (REST,   │            │ (SQL,    │          │ (Native, │  │
│  │  GraphQL)│            │  NoSQL)  │          │  Docker) │  │
│  └──────────┘            └──────────┘          └──────────┘  │
│       ▲                       ▲                      ▲        │
│       └───────────────────────┴──────────────────────┘        │
│                          MCP Transport                         │
└────────────────────────────────────────────────────────────────┘
```

On a single machine with local agents, a **filesystem comms** element provides IPC with
sub-100ms latency, no network overhead, and offline persistence. When agents span
multiple machines, an **A2A comms** element handles cross-vendor delegation, or a
**mesh comms** element provides encrypted WireGuard networking. Different protocol
variants for different scopes -- same CRUDE interface to the AI through MCP-AQL.

**A2A** handles high-level discovery and task delegation between agents.

Each agent uses **MCP-AQL adapters** to safely interact with its systems through CRUDE
endpoints with protocol-enforced safety.

**MCP** provides the underlying transport and session management.

The **Gatekeeper** ensures no agent can execute forbidden operations without
authorization and confirmation, regardless of instructions.

---

## 12. Scenario Guide

| Scenario | Best fit | Why |
|----------|----------|-----|
| Connect my LLM to a few specific tools quickly | **MCP** | Simple, direct, massive ecosystem |
| 50+ MCP tools and context window is choking | **MCP-AQL** | 85-96% token reduction; progressive disclosure |
| LLM needs to correctly call an unfamiliar REST API | **MCP-AQL** | Introspection with constraint metadata eliminates hallucination |
| Sales agent delegates to a research agent | **A2A** | Agent discovery and multi-turn task delegation |
| Agents from LangChain and CrewAI need to collaborate | **A2A** | Cross-framework interoperability |
| Permission control over destructive operations | **MCP-AQL** | CRUDE + Gatekeeper + danger levels + confirmation tokens |
| LLM needs to interact with OS or hardware APIs | **MCP-AQL** | Plugin system with native transport; Rust adapters planned |
| Multi-day async tasks across agent boundaries | **A2A** | First-class long-running task lifecycle with push notifications |
| Wrap any API for LLM access with zero code | **MCP-AQL** | Declarative adapter schemas; hot-reloadable |
| Trace operations across a chain of systems | **MCP-AQL** | W3C Trace Context propagation |
| Agents reasoning together about ambiguous problems | **A2A** | Unstructured multi-turn conversation between opaque peers |
| Same-machine agent-to-agent messaging | **Filesystem comms** | IPC, sub-100ms, no network overhead |
| Agent communication with offline persistence | **Filesystem comms** | File/database-backed; survives restarts and outages |
| Cross-vendor agent delegation over network | **A2A comms** | A2A protocol with Agent Cards and task lifecycle |
| Enterprise multi-computer agent orchestration | **Mesh comms + TEAM** | Encrypted WireGuard mesh, hierarchical coordination |

---

## 13. Maturity and Adoption

| | MCP | MCP-AQL | A2A |
|---|---|---|---|
| **Announced** | November 2024 | 2025 | April 2025 |
| **Current version** | 2025-11-25 (4th revision) | v1.0.0-draft | v0.3 |
| **Governance** | Agentic AI Foundation (Linux Foundation) | Independent | Linux Foundation (LF AI & Data) |
| **Spec maturity** | Production-stable, widely adopted | Nearing v1.0-rc; launch imminent | Draft; breaking changes expected |
| **Ecosystem** | 10,000+ servers, 300+ clients | 1 reference impl (DollhouseMCP V2 private beta) | 150+ backing organizations, Python SDK |
| **SDK availability** | TypeScript, Python, Java, C#, Go, Rust | Via MCP SDKs (runs on MCP transport) | Python |
| **Notable adopters** | OpenAI, Google, Microsoft, AWS, Cloudflare | DollhouseMCP | Google, AWS, SAP, Salesforce, IBM, Atlassian |

---

## 14. Key Takeaways

1. **They're layers, not competitors.** MCP provides wiring. MCP-AQL provides
   translation and safety. A2A provides agent collaboration. Each solves a problem the
   others don't address.

2. **MCP-AQL is a universal translation layer, not a token optimizer.** Its core purpose
   is making any API correctly callable by an LLM on the first try, through
   constraint-rich introspection, protocol-enforced safety, and computational middleware.
   Token efficiency is a consequence, not the goal.

3. **MCP's biggest pain point (tool sprawl) is MCP-AQL's reason for existing.** The
   85-96% reduction directly addresses the most frequently cited MCP production problem.

4. **A2A defines the semantics of agent collaboration but leaves infrastructure to
   implementers.** Message persistence, queuing, offline delivery, local IPC, session
   state, orchestration, and distributed tracing are all out of scope. These are real
   gaps for production deployments.

5. **The COMMS element type category fills A2A's infrastructure gaps** -- but COMMS is
   broader than A2A. It is a protocol-specific element category where A2A is one variant
   alongside TCP/IP, HTTP, SMTP, filesystem IPC, and encrypted mesh comms. Each variant
   presents a focused interface to the AI for that protocol's semantics, rather than
   exposing a single monolithic element with every protocol's complexity.

6. **MCP-AQL does not step on A2A's toes.** They overlap at the agent interaction
   boundary but from different philosophical positions: MCP-AQL provides
   typed/constrained/safe structured operations; A2A provides flexible/opaque
   conversational collaboration. Both are needed for different scenarios.

7. **Safety philosophy differs fundamentally across all three.** MCP provides advisory
   annotations. A2A provides agent-level accept/reject. MCP-AQL provides
   **protocol-enforced server-side authority** that the LLM cannot override -- the
   strongest safety guarantee of the three.

8. **The composite future is all layers working together.** A2A for cross-vendor
   discovery and delegation (via an A2A comms variant), protocol-specific COMMS variants
   for different transport needs, MCP-AQL for safe and efficient system interaction,
   MCP for transport, and the Gatekeeper ensuring no agent operates beyond its
   authorization regardless of its instructions.

---

## Sources

### MCP

- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25)
- [Model Context Protocol - Wikipedia](https://en.wikipedia.org/wiki/Model_Context_Protocol)
- [One Year of MCP](http://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/)
- [MCP joins the Agentic AI Foundation](http://blog.modelcontextprotocol.io/posts/2025-12-09-mcp-joins-agentic-ai-foundation/)
- [Linux Foundation Announces AAIF](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [The Current State of MCP - Elasticsearch Labs](https://www.elastic.co/search-labs/blog/mcp-current-state)
- [MCP Features Guide - WorkOS](https://workos.com/blog/mcp-features-guide)
- [Why the Model Context Protocol Won - The New Stack](https://thenewstack.io/why-the-model-context-protocol-won/)

### MCP-AQL

- [MCP-AQL Specification v1.0.0-draft](https://github.com/MCPAQL/spec)
- MCPAQL/spec issue tracker (183 issues reviewed)
- DollhouseMCP/mcp-server-v2-refactor issue tracker (450+ issues reviewed)
- Normative specification: `docs/versions/v1.0.0-draft.md`
- CRUDE Pattern: `docs/crude-pattern.md`
- Introspection System: `docs/introspection.md`
- Gatekeeper Security: `docs/security/gatekeeper.md`
- Adapter Element Type: `docs/adapter/element-type.md`
- Plugin Interface Contracts: `docs/plugin-contracts.md`
- Endpoint Modes: `docs/endpoint-modes.md`
- Three-Tier Adapter Architecture: DollhouseMCP/mcp-server-v2-refactor#172
- Ditto Shorthand Pattern: DollhouseMCP/mcp-server-v2-refactor#166
- Notifications with Minimal Acknowledgment: DollhouseMCP/mcp-server-v2-refactor#308
- TEAM Element / COMMS Design: DollhouseMCP/experimental-server#108

### A2A

- [A2A Protocol Specification (Latest)](https://a2a-protocol.org/latest/specification/)
- [A2A Protocol Official Documentation](https://a2a-protocol.org/latest/)
- [A2A and MCP - A2A Protocol Docs](https://a2a-protocol.org/latest/topics/a2a-and-mcp/)
- [Announcing A2A - Google Developers](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [What Is Agent2Agent Protocol? - IBM](https://www.ibm.com/think/topics/agent2agent-protocol)
- [Linux Foundation Launches A2A Project](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents)
- [A2A for Enterprise-Scale AI - HiveMQ](https://www.hivemq.com/blog/a2a-enterprise-scale-agentic-ai-collaboration-part-1/)
- [MCP vs A2A - Auth0](https://auth0.com/blog/mcp-vs-a2a/)
- [A2A GitHub Repository](https://github.com/a2aproject/A2A)
- [A2A Protocol Architecture - DeepWiki](https://deepwiki.com/google/A2A)
