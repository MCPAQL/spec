# Adversarial Input Security for MCP Adapters

**Version:** 1.0.0-draft
**Status:** Research
**Last Updated:** 2026-04-04
**Related Issues:** MCPAQL/spec#240, DollhouseMCP/mcp-server#1779

## Abstract

This document presents comprehensive research findings on securing MCP adapters that process adversarial input — content from untrusted external sources such as email, social media, messaging platforms, and forums. It surveys the existing MCP security ecosystem, documents known attack vectors and defenses, and establishes the technical foundation for the MCPAQL adversarial-input security proxy architecture.

---

## Table of Contents

1. [The Threat Model](#1-the-threat-model)
2. [Existing MCP Security Servers](#2-existing-mcp-security-servers)
3. [Prompt Injection Defenses](#3-prompt-injection-defenses)
4. [Email-Specific LLM Security](#4-email-specific-llm-security)
5. [MCP Proxy and Gateway Patterns](#5-mcp-proxy-and-gateway-patterns)
6. [Known Limitations and Open Problems](#6-known-limitations-and-open-problems)
7. [Architecture Recommendations](#7-architecture-recommendations)
8. [References](#8-references)

---

## 1. The Threat Model

### 1.1 The Lethal Trifecta

Simon Willison defines the core risk as any agent combining three capabilities:

1. **Access to private data** (email content, contacts, files)
2. **Exposure to untrusted content** (emails from anyone on the internet)
3. **Ability to externally communicate** (send email, post to APIs, write files)

An email processing agent inherently possesses all three. This combination creates an exploitable attack surface where an attacker crafts input that, when processed by the LLM, causes it to exfiltrate private data or take unauthorized actions.

### 1.2 Indirect Prompt Injection

Unlike direct prompt injection (where the attacker controls the user prompt), indirect prompt injection embeds malicious instructions in data the LLM processes via tool calls. The LLM reads an email containing hidden instructions, and those instructions influence its subsequent behavior — potentially causing it to forward emails, reveal private data, or execute attacker-controlled commands.

### 1.3 Why Email Is Uniquely Hostile

- **Unsolicited delivery**: Unlike web browsing (user chooses pages), emails arrive from anyone
- **Rich content**: HTML, attachments, headers provide multiple injection surfaces
- **Expected actions**: Email naturally involves replies, forwards, and file access — making malicious actions harder to distinguish from legitimate ones
- **Volume**: High email volume normalizes automated processing, reducing human oversight
- **Authentication complexity**: Display names, spoofed headers, and forwarding chains obscure true origin

### 1.4 Attack Statistics

- **340% year-over-year increase** in documented prompt injection attempts against enterprise AI (Wiz Research, Q4 2025)
- **73% of production AI deployments** encountered prompt injection in 2025 (Wiz Research)
- **Attack success rates exceed 85%** when adaptive strategies are used (meta-analysis of 78 studies, arxiv:2601.17548)
- **60-72% attack success rates** on MCPTox benchmark testing 20 LLM agents (arxiv:2508.14925)

---

## 2. Existing MCP Security Servers

### 2.1 Security Proxy Servers

The MCP security proxy pattern is well-established. Multiple implementations exist, each with different approaches:

#### Trail of Bits — mcp-context-protector

**Repository:** https://github.com/trailofbits/mcp-context-protector (217 stars)

The most credible security wrapper in the ecosystem. Three defense mechanisms:

1. **Configuration pinning via trust-on-first-use**: Captures server configuration on first connection, blocks any subsequent deviations. Detects "rug-pull" attacks where a server changes its tool definitions after initial trust is established.

2. **Tool response guardrails**: Integrates with Meta's LlamaFirewall to scan every tool response for prompt injection. Flagged responses are quarantined in a database for human review rather than silently blocked.

3. **ANSI control character sanitization**: Strips terminal escape sequences that could manipulate CLI display or logging.

Operates by intercepting MCP protocol messages between clients and servers. Published with a detailed blog post (July 2025): "We built the security layer MCP always needed."

#### MCP-Watchdog

**Repository:** https://github.com/bountyyfi/mcp-watchdog (22 stars)

The most comprehensive content-level defense found. Implements a 10-layer defense proxy:

- **Layer 0 (SMAC-L3)**: Pre-LLM sanitization that strips hidden instructions, zero-width characters (U+200B, U+FEFF, U+200C, U+200D), ANSI escapes, bidirectional text overrides, and redacts 30+ token/secret patterns BEFORE content reaches the AI.
- Detects 80+ specific threats including `<IMPORTANT>` instruction blocks, homoglyph variants, HTML-encoded injection, split-line evasion patterns.
- Includes email-specific detection: BCC exfiltration attempts, comma-injection in recipient fields.
- Monitors for behavioral drift and tool integrity (hashes tool definitions to catch rug pulls).
- Enforces filesystem restrictions (blocks writes to `.git/config`, `.ssh/`, etc.).

#### Arbiter / mcp-proxy-firewall

**Repository:** https://github.com/cyrenei/mcp-proxy-firewall (new, Rust-based)

12 specialized crates implementing deny-by-default authorization, session budgets (time + call count caps), and drift detection.

**Critically honest about limitations**: Documentation explicitly states it "does not reduce semantic risk" — it restricts what tools are available but cannot prevent deceptive prompting of allowed tools. This honesty is rare and valuable in the security tool space.

#### MCP-Dandan

**Repository:** https://github.com/82ch/MCP-Dandan (61 stars)

Desktop security framework with Python backend and Electron UI. Five detection engines: command injection, filesystem exposure, PII leak, data exfiltration, and tools poisoning (uses LLM-based semantic analysis). Provides human-in-the-loop blocking controls.

#### Lasso Security MCP Gateway

**Repository:** https://github.com/lasso-security/mcp-gateway

Plugin-based gateway that orchestrates other MCP servers. Security Scanner evaluates server reputation using marketplace and GitHub data, detects hidden instructions and malicious actions, auto-blocks risky servers. Supports guardrail plugins:

- **Basic**: Token masking
- **Presidio**: PII detection
- **Lasso**: Comprehensive AI safety

Intercepts requests and responses to sanitize sensitive information.

#### IBM ContextForge

**Repository:** https://github.com/IBM/mcp-context-forge

Enterprise-grade gateway, registry, and proxy. Federates MCP, A2A, and REST/gRPC APIs. Release 1.0.0-RC2 includes 40+ security controls:

- SSRF strict defaults
- OIDC verification
- OAuth secret at-rest protection
- Token scoping default-deny
- Session ownership enforcement
- Full SAST/DAST/SCA/IAST/fuzz/mutation testing pipeline

#### MetaMCP

**Repository:** https://github.com/metatool-ai/metamcp

Aggregator, orchestrator, middleware, and gateway. Pluggable middleware for auth, logging, and security. Multi-tenancy support, OIDC auth, namespace-based server grouping. More of an infrastructure play than security-specific.

#### MCP Proxy Wrapper

**Website:** https://mcp-proxy.dev/

Hook system with `beforeToolCall`/`afterToolCall` for validation and interception. Plugin architecture for analytics, AI enhancement, and security. 273 tests. Focused on extensibility rather than security-specific features.

### 2.2 Scanning and Auditing Tools

#### Invariant Labs mcp-scan (now Snyk agent-scan)

**Repository:** https://github.com/snyk/agent-scan

Acquired by Snyk. Scans MCP server configurations for tool poisoning, cross-origin escalation, rug pull attacks, and toxic flows. Uses Invariant Guardrails API to classify tool descriptions. Also has a proxy mode for real-time monitoring. Detects 15+ risk categories.

#### Praetorian MCPHammer

**Repository:** https://github.com/praetorian-inc/MCPHammer (26 stars)

Security testing framework for evaluating MCP server vulnerabilities. Offensive testing rather than defense — useful for validating our own adapter security.

### 2.3 Notable Non-Security Projects

**Google mcp-security** (457 stars): Despite the name, this is NOT a security tool. It provides MCP servers for accessing Google's security products (Chronicle, GTI, SCC). It is "security tools via MCP" not "MCP security."

**Spring AI Community mcp-security**: Spring Security configuration for MCP servers. Authentication and authorization framework, not content security.

---

## 3. Prompt Injection Defenses

### 3.1 Major Vendor Approaches

#### Anthropic — Model-Level Hardening

Uses reinforcement learning during training, exposing Claude to prompt injections in simulated environments and rewarding correct identification and refusal. Claude Opus 4.5 reduced attack success to approximately 1% in browser-based operations.

**Key insight**: This is model-level defense, not transferable to other models. External defenses (proxies, firewalls) work at inference time and are model-agnostic but weaker.

#### Microsoft — Spotlighting

The most documented technical defense. Core technique: transforms untrusted input text with special markers so the model can distinguish instructions from data.

- Uses random delimiters (not disclosed to attackers)
- Combined with Prompt Shields (ML classifier)
- Hardened system prompts
- Deterministic blocking of known exfiltration methods

**Key insight**: Deterministic defenses (hard blocks) are more reliable than probabilistic ones (ML detection). Microsoft's experience shows that hard-blocking URL patterns and `mailto:` schemes in tool responses prevents exfiltration even when the model is successfully manipulated.

#### Google — Layered Defense

- Proprietary ML classifiers for detecting malicious prompts across data formats
- "Security thought reinforcement" — targeted instructions around prompt content reminding the LLM to ignore adversarial instructions
- Markdown sanitization and suspicious URL redaction via Google Safe Browsing

#### OpenAI — Automated Red Teaming

Continuous RL-trained automated attacker discovers new injection classes. Updated agent models are then trained against the best attacks. An adversarial improvement loop.

OpenAI has explicitly acknowledged (December 2025): "Prompt injection, much like scams and social engineering on the web, is unlikely to ever be fully 'solved'."

#### Meta — LlamaFirewall

**Repository:** https://github.com/meta-llama/llama-firewall

Three components:
1. **PromptGuard 2**: BERT-based injection detector
2. **Agent Alignment Checks**: Chain-of-thought auditor for goal misalignment
3. **CodeShield**: Static analysis for generated code

Achieved 90%+ efficacy on AgentDojo benchmark.

**Already bypassed** using non-English prompts, leetspeak, and Unicode invisible characters. Documented bypass study: https://medium.com/trendyol-tech/bypassing-metas-llama-firewall

### 3.2 Academic Research

#### Systematization of Knowledge: MCP Security (arxiv:2512.08290, December 2025)

Comprehensive taxonomy of MCP risks. Categorizes threats across the MCP lifecycle: server discovery, connection, tool execution, and response handling.

#### MCPTox Benchmark (arxiv:2508.14925, August 2025)

Tested 20 LLM agents against tool poisoning attacks. Attack success rates exceeded 60%, with the highest reaching 72%. Demonstrates that even well-configured agents are vulnerable to adversarial tool descriptions and responses.

#### Prompt Injection on Agentic Coding Assistants (arxiv:2601.17548, January 2026)

Meta-analysis of 78 studies. Key finding: **attack success rates exceed 85% when adaptive strategies are used**. Single-strategy defenses are consistently bypassed; layered defenses show the most promise.

#### Defense via Tool Result Parsing (arxiv:2601.04795, January 2026)

Novel approach: asks the LLM to parse tool results and remove segments that triggered malicious calls. Essentially a self-reflection defense where the model audits its own tool responses.

#### AgentSentry (arxiv:2602.22724, February 2026)

Temporal causal diagnostics: performs controlled counterfactual re-executions at tool-return boundaries to detect if the next action is causally dominated by user goal versus injected context. Improved utility-under-attack by 20-33 percentage points. The most promising research-stage defense found.

#### LLMail-Inject (Microsoft, arxiv:2506.09956)

208,095 attack submissions against email agent defenses. State-of-the-art models achieve less than 5% success on existing benchmarks, but LLMail-Inject drove success to 32% under realistic adaptive attacks. Full defenses combined with GPT-4o blocked all attacks in Phase 2, but at the cost of significant false positives.

---

## 4. Email-Specific LLM Security

### 4.1 Documented Real-World Attacks

#### EchoLeak (CVE-2025-32711) — CVSS 9.3

Zero-click prompt injection against Microsoft 365 Copilot via email. A single crafted email with hidden instructions triggered data exfiltration from OneDrive, SharePoint, and Teams through a trusted Microsoft domain.

**Bypassed**: Microsoft's XPIA classifier, link redaction, and Content Security Policy.

**Patched**: Server-side by Microsoft after responsible disclosure.

This is the canonical example of the attack we are defending against.

#### CVE-2026-26133 (March 2026)

Cross-prompt injection in Copilot email summarization. Attacker-controlled text appended to email influenced Copilot output, producing fake "security alert" content inside trusted Copilot summary UI.

#### Google Workspace AI Attack

Independent demonstration of identical pattern against Google AI assistant: indirect prompt injection caused data search across Gmail, Calendar, and Drive and exfiltration via image URL requests.

#### Supabase/Cursor Incident (mid-2025)

Cursor agent with privileged service-role access processed support tickets containing embedded SQL injection instructions, exfiltrating integration tokens. Not email-specific, but demonstrates the same pattern: untrusted content processed by an LLM agent with privileged access.

### 4.2 Email-Specific Defenses

#### email-security Agent Skill (mcp.directory, by OpenClaw)

**URL:** https://mcp.directory/skills/email-security

An MCP agent skill specifically for email processing security. Provides sender verification, content sanitization, threat detection for Gmail, AgentMail, Proton Mail, and IMAP. Extracts newest message only, checks for injection patterns, neutralizes threats, and alerts. This is a prompt/skill definition, not a running service — it instructs the LLM on how to behave, but does not perform pre-LLM sanitization.

#### Apple Mail MCP Server (privacy-first approach)

**URL:** https://lobehub.com/mcp/attilagyorffy-apple-mail-mcp

Query-based access where AI sees only explicitly requested emails. Operation logging for audit trail. Reduces attack surface by not granting OAuth access to cloud email APIs. Notable for its privacy-first architecture, though it does not perform content sanitization.

#### Proofpoint AI Security (March 2026)

Enterprise product: intent-based detection, "Agent Integrity Framework" that scans for threats before email arrives at inbox. Addresses zero-click prompt injection and agentic privilege escalation. Commercial, closed-source.

#### Immersive Labs Research

Demonstrated that **LLM-based email security products themselves can be bypassed via indirect prompt injection**. Hidden instructions in email HTML manipulate AI assistants into reconstructing malicious links, bypassing traditional scanning. A meta-attack: injecting the security tool itself.

---

## 5. MCP Proxy and Gateway Patterns

### 5.1 The Common Architecture

All MCP security proxies follow the same fundamental pattern:

```
Agent → Proxy/Gateway → MCP Server(s)
```

The proxy intercepts JSON-RPC traffic, applies security checks (varying from regex pattern matching to LLM-based semantic analysis), and either passes clean traffic through or blocks/quarantines suspicious content.

### 5.2 Comparison Matrix

| Project | Type | Content Sanitization | Auth/Authz | Config Security | LLM-Based Analysis | Human-in-Loop |
|---------|------|---------------------|-----------|----------------|-------------------|---------------|
| Trail of Bits | Wrapper | ANSI only | No | Config pinning | LlamaFirewall | Quarantine DB |
| MCP-Watchdog | Proxy | 80+ patterns | No | Tool hash | No | No |
| Arbiter | Proxy | No | Deny-by-default | No | No | No |
| MCP-Dandan | Gateway | 5 engines | No | No | Yes (semantic) | Yes (desktop UI) |
| Lasso | Gateway | Plugin-based | Yes | Reputation | Plugin-dependent | No |
| IBM ContextForge | Enterprise | 40+ controls | OIDC/OAuth | Full lifecycle | No | No |
| MetaMCP | Middleware | Plugin-dependent | OIDC | Namespace | No | No |

### 5.3 Industry Standards

**CoSAI (Coalition for Secure AI)** published a comprehensive MCP Security whitepaper (January 2026) identifying 12 threat categories and approximately 40 distinct threats. Organized around four pillars:

1. Agent Identity and Access Management
2. Tool Supply Chain Security
3. Execution Environment Isolation
4. Observability and Incident Response

**MCP Specification** (2025-11-25 revision) added a security best practices page, OAuth 2.0 Resource Server classification, and Security Considerations for token theft, confused deputy, and session hijacking. However, the spec says servers MUST "sanitize tool outputs" and clients SHOULD "validate tool results before passing to LLM" but provides **zero guidance on how to do this**. The spec delegates the hardest problem to implementers.

---

## 6. Known Limitations and Open Problems

### 6.1 The Fundamental Unsolvable Tension

**You cannot fully sanitize adversarial content without potentially removing legitimate content.** A regex that blocks "ignore previous instructions" also blocks a legitimate email discussing prompt injection research. An LLM-based classifier that flags imperative verbs in tool results would flag every email containing a request.

### 6.2 Specific Defense Limitations

#### Regex and Pattern Matching

Trivially bypassed via:
- Rephrasing ("disregard" instead of "ignore")
- Encoding (Base64, URL encoding, Unicode normalization tricks)
- Multi-step instructions spread across multiple messages
- Homoglyphs (visually identical characters from different Unicode blocks)
- Zero-width characters and bidirectional text overrides
- Non-English languages
- Leetspeak and other obfuscation

#### LLM-Based Classifiers

- LlamaFirewall already bypassed via non-English prompts and Unicode tricks
- Classifiers trained on known attacks miss novel phrasings
- The classifier itself can potentially be prompt-injected (the "meta-attack" demonstrated by Immersive Labs)
- Adds latency and cost to every operation

#### The Asymmetry Problem

Defenders must catch ALL attacks with low false positives. Attackers need only ONE bypass. This asymmetry fundamentally favors attackers in any arms race.

#### Semantic Risk vs. Authorization

Arbiter's documentation articulates this clearly: restricting which tools are available does NOT prevent an agent from being manipulated into misusing allowed tools. An agent with only `send_email` permission can still be tricked into sending an email it shouldn't. Authorization is necessary but insufficient.

#### No Content-Level Defense in the MCP Specification

The MCP spec addresses authentication, authorization, and transport security. Its guidance on content sanitization amounts to two sentences ("sanitize tool outputs", "validate tool results") with no implementation guidance. The hardest problem is left entirely to implementers.

#### Training-Time vs. Inference-Time Gap

Anthropic's approach (RL during training) achieves approximately 1% attack success, but this is model-specific and not transferable. External defenses (proxies, firewalls) work at inference time and are model-agnostic but achieve significantly higher attack success rates.

### 6.3 The Current Gap

**No purpose-built MCP content sanitization server for email exists.** The email-security skill on mcp.directory is a prompt definition. MCP-Watchdog has email injection detection but is general-purpose. Nobody has assembled the existing techniques (spotlighting, deterministic blocking, content sanitization, config pinning) into a turnkey email security proxy for MCP.

---

## 7. Architecture Recommendations

Based on these findings, the MCPAQL adversarial-input security proxy should implement a defense-in-depth architecture combining the best techniques from existing tools and research.

### 7.1 Three-Layer Defense Model

```
Layer 1: Security Proxy (pre-LLM)
  → Content sanitization, spotlighting, deterministic blocking
  → The LLM never sees raw adversarial content
  → Deterministic, fast, cheap

Layer 2: Agent Behavior (DollhouseMCP elements)
  → Skeptical persona, structured triage skill
  → Guides the LLM to evaluate content critically
  → Probabilistic, model-dependent

Layer 3: Action Gating (DollhouseMCP Gatekeeper + Autonomy Evaluator)
  → Block outbound actions after reading untrusted content
  → Detect goal drift (reading email → trying to visit attacker URL)
  → Human-in-the-loop for high-risk actions
  → The only guaranteed defense against successful injection
```

### 7.2 Techniques to Incorporate

| Technique | Source | Layer | Purpose |
|-----------|--------|-------|---------|
| Zero-width character stripping | MCP-Watchdog | 1 | Remove hidden text encoding |
| Prompt injection pattern matching | MCP-Watchdog (80+ patterns) | 1 | Detect known injection patterns |
| Spotlighting with random delimiters | Microsoft | 1 | Mark untrusted content as DATA |
| Deterministic exfiltration blocking | Microsoft | 1 | Hard-block URLs, mailto, data URIs |
| Config pinning (trust-on-first-use) | Trail of Bits | 1 | Detect tool definition changes |
| Email auth validation (DKIM/SPF/DMARC) | Standard | 1 | Trust scoring for sender |
| Skeptical analysis persona | DollhouseMCP | 2 | Guide LLM behavior |
| Structured triage skill | DollhouseMCP | 2 | Systematic evaluation process |
| Outbound action blocking | DollhouseMCP Gatekeeper | 3 | Prevent exfiltration |
| Goal drift detection | DollhouseMCP Autonomy Evaluator | 3 | Detect manipulation |
| Human-in-the-loop | DollhouseMCP confirm_operation | 3 | Final authority |

### 7.3 Design Principles

1. **Assume breach**: Layer 1 will eventually be bypassed. Layers 2 and 3 must catch what Layer 1 misses.
2. **Deterministic over probabilistic**: Hard rules that block exfiltration patterns are more reliable than ML classifiers.
3. **Minimize LLM exposure**: The proxy should strip or redact adversarial content before the LLM sees it. Everything else is mitigation after exposure.
4. **Content blocking, not just flagging**: When injection is detected, return a safe summary, not the raw content.
5. **Continuous improvement**: Log what gets through, update patterns, red-team regularly.
6. **Model-agnostic**: Defenses should work regardless of which LLM is used.

### 7.4 What We Are Building vs. What Exists

| Capability | Exists in ecosystem? | Our approach |
|------------|---------------------|--------------|
| General MCP proxy | Yes (many) | Build on proven proxy pattern |
| Content sanitization | Yes (MCP-Watchdog) | Incorporate their 80+ patterns |
| Config pinning | Yes (Trail of Bits) | Adopt trust-on-first-use |
| Spotlighting | Yes (Microsoft, research) | Implement for all adversarial sources |
| Email-specific security | **No** (gap) | Purpose-built email proxy |
| Integration with agent policy engine | **No** (gap) | DollhouseMCP Gatekeeper integration |
| Adapter-for-adapters pattern in MCPAQL | **No** (gap) | New MCPAQL spec pattern |

---

## 8. References

### MCP Security Tools

- Trail of Bits mcp-context-protector: https://github.com/trailofbits/mcp-context-protector
- MCP-Watchdog: https://github.com/bountyyfi/mcp-watchdog
- Arbiter / mcp-proxy-firewall: https://github.com/cyrenei/mcp-proxy-firewall
- MCP-Dandan: https://github.com/82ch/MCP-Dandan
- Lasso MCP Gateway: https://github.com/lasso-security/mcp-gateway
- IBM ContextForge: https://github.com/IBM/mcp-context-forge
- MetaMCP: https://github.com/metatool-ai/metamcp
- MCP Proxy Wrapper: https://mcp-proxy.dev/
- Apache Casbin Gateway: https://github.com/apache/casbin-gateway
- Snyk Agent Scan (formerly Invariant mcp-scan): https://github.com/snyk/agent-scan
- Praetorian MCPHammer: https://github.com/praetorian-inc/MCPHammer
- Awesome MCP Security: https://github.com/Puliczek/awesome-mcp-security

### Vendor Security Documentation

- Anthropic: https://www.anthropic.com/research/prompt-injection-defenses
- Microsoft: https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks
- OpenAI: https://openai.com/index/hardening-atlas-against-prompt-injection/
- OpenAI (understanding): https://openai.com/index/prompt-injections/
- Google: https://knowledge.workspace.google.com/admin/security/indirect-prompt-injections-and-googles-layered-defense-strategy-for-gemini
- Meta LlamaFirewall: https://ai.meta.com/research/publications/llamafirewall-an-open-source-guardrail-system-for-building-secure-ai-agents/

### Academic Papers

- Systematization of Knowledge — MCP Security (arxiv:2512.08290): https://arxiv.org/html/2512.08290v1
- MCPTox Benchmark (arxiv:2508.14925): https://arxiv.org/html/2508.14925v1
- Prompt Injection on Agentic Coding Assistants (arxiv:2601.17548): https://arxiv.org/abs/2601.17548
- Defense via Tool Result Parsing (arxiv:2601.04795): https://arxiv.org/abs/2601.04795
- AgentSentry (arxiv:2602.22724): https://arxiv.org/abs/2602.22724
- LLMail-Inject (arxiv:2506.09956): https://arxiv.org/abs/2506.09956
- Microsoft Spotlighting (arxiv:2403.14720): https://arxiv.org/html/2403.14720v1

### Real-World Attacks

- EchoLeak (CVE-2025-32711): https://www.hackthebox.com/blog/cve-2025-32711-echoleak-copilot-vulnerability
- Copilot email phishing surface: https://permiso.io/blog/copilot-prompt-injection-ai-email-phishing
- LLM email security bypass (Immersive Labs): https://www.immersivelabs.com/resources/c7-blog/weaponizing-llms-bypassing-email-security-products-via-indirect-prompt-injection
- Proofpoint AI Security: https://www.proofpoint.com/us/newsroom/press-releases/proofpoint-unveils-industrys-newest-intent-based-ai-security-solution

### Community and Commentary

- Simon Willison — MCP prompt injection: https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/
- Simon Willison — The lethal trifecta: https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
- CoSAI MCP Security Guide: https://www.coalitionforsecureai.org/securing-the-ai-agent-revolution-a-practical-guide-to-mcp-security/
- MCP content sanitization best practices: https://vulnerablemcp.info/security.html
- Securing MCP defense-first architecture: https://christian-schneider.net/blog/securing-mcp-defense-first-architecture/
- The Agent Perimeter Fallacy: https://research.securityblueprints.io/p/blog/agent-perimeter-fallacy
- Palo Alto Unit 42 — MCP Sampling Attack Vectors: https://unit42.paloaltonetworks.com/model-context-protocol-attack-vectors/
- MCP Threat Modeling with Tool Poisoning: https://arxiv.org/html/2603.22489v1
- LlamaFirewall bypass study: https://medium.com/trendyol-tech/bypassing-metas-llama-firewall
- email-security Agent Skill: https://mcp.directory/skills/email-security

### Industry Standards

- MCP Specification Security Best Practices: https://modelcontextprotocol.io/specification/2025-11-25
- CoSAI MCP Security Whitepaper (January 2026)
