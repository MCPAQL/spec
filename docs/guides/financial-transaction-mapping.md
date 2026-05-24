# Financial Transaction Mapping Guide

**Version:** 1.0.0-draft
**Status:** Draft
**Last Updated:** 2026-05-24

> **Document Status:** This document is **informative**. For normative protocol
> requirements, see [MCP-AQL Specification v1.0.0](../versions/v1.0.0-draft.md).

## Abstract

Financial APIs often describe money-movement operations as resource creation:
`create_transfer`, `create_payment`, `create_payment_order`, or
`create_outbound_transfer`. In MCP-AQL, endpoint classification is based on
the user-visible economic effect, not the provider's HTTP verb or resource name.

The central rule for financial adapters is:

> A money movement may create a transaction record, but the user-impacting
> operation modifies account balances, holds, limits, obligations, settlement
> state, or payment-network state.

This guide maps common banking, treasury, card, ledger, and payment operations
to the CRUDE endpoint profile and identifies the extra safety controls financial
adapters need.

## 1. Classification Principle

MCP-AQL classifies operations by effect. For financial domains, "effect" means
economic effect:

- Does this operation move, reserve, release, settle, refund, reverse, or return
  money?
- Does it create or modify an enforceable obligation, payment instruction, hold,
  limit consumption, recipient trust state, or settlement state?
- Does it change the account, ledger, or rail state even if the provider returns
  a newly-created object?
- Is the returned transaction object an immutable record of a state change rather
  than the resource the user intended to create?

If the answer is yes, the operation belongs in `UPDATE`, not `CREATE`.

This deliberately differs from provider API labels. An upstream
`POST /transfers` can be an MCP-AQL `UPDATE` when it changes balances or starts
a payment-network workflow.

## 2. Endpoint Mapping

| MCP-AQL endpoint | Use for financial APIs | Do not use for | Safety notes |
|------------------|------------------------|----------------|--------------|
| `CREATE` | Additive setup records that do not move money or alter enforceable financial state | Direct payments, transfers, payouts, captures, refunds, reversals, holds, funding, settlement | May still be sensitive or high-risk when it creates recipients, bank details, mandates, cards, or payment templates |
| `READ` | Balances, accounts, transactions, statements, recipients, payment status, limits, FX estimates that do not reserve funds | Any operation that changes limits, reserves funds, starts processing, or queues approval | Read-only financial data is still confidential and should support minimization and redaction |
| `UPDATE` | Money movement and financial lifecycle changes: initiate, submit, approve, fund, capture, settle, sweep, cancel, reverse, refund, return, release, stop payment | Static setup that only adds a new inert record | Default to confirmation and idempotency for production financial effects |
| `DELETE` | Removal of non-ledger setup or configuration records when deletion is truly the provider action | Cancelling, reversing, returning, refunding, or hiding a payment/transaction | Financial transaction records should generally be immutable or corrected by updates/reversals |
| `EXECUTE` | Long-running jobs, autonomous workflows, reconciliation runs, bulk processors, import/export jobs, scheduled sweeps | A single direct transfer solely because it touches external payment rails | Use when the adapter is managing a runtime process, not merely because money movement has external effects |

### 2.1 CREATE

Use `CREATE` when the operation adds a record that is not itself an economic
state change.

Examples:

- create a recipient or counterparty record
- create a webhook endpoint
- create a draft payment template that cannot be submitted automatically
- create a non-binding quote or estimate record
- create a virtual account, ledger account, or category before any balance
  activity exists

Creating a recipient is not money movement, but it still enables future money
movement. Adapters should treat payment-enabled recipient creation as sensitive
and may require confirmation even though the endpoint is `CREATE`.

### 2.2 READ

Use `READ` for inquiry and retrieval.

Examples:

- list accounts, balances, safes, cards, statements, or recipients
- get transaction or payment status
- download a statement or receipt
- search transactions
- calculate an estimate that does not reserve rate, limit, or funds

Financial `READ` operations are mutation-safe, not disclosure-safe. Account
balances, transaction histories, routing details, statements, and recipient
details are sensitive data. Adapters should support field selection, response
redaction, least-privilege tokens, and audit logging for sensitive reads.

### 2.3 UPDATE

Use `UPDATE` for any operation that modifies economic state.

Examples:

- initiate a payment, transfer, wire, ACH, real-time payment, FedNow, check,
  payout, sweep, or card settlement
- request money movement that enters an approval queue
- approve, submit, release, fund, capture, post, settle, or retry a payment
- cancel, reverse, return, refund, stop, or recall a payment
- place, release, or capture a hold or reserve
- modify recipient bank details, mandate details, spend controls, card status,
  or payment terms
- create or issue an invoice when it establishes an enforceable receivable

The provider may create a payment object, ledger transaction, outbound transfer,
or reversal object. That record creation is an implementation artifact. The
adapter classification should follow the account, obligation, or settlement
state being modified.

### 2.4 DELETE

Use `DELETE` sparingly in financial adapters.

Examples:

- delete an unused payment template
- remove a webhook endpoint
- delete a draft setup artifact that has no ledger, compliance, or audit impact
- revoke a non-ledger token or static configuration record

Do not use `DELETE` for cancellation. Cancellation changes payment lifecycle
state and often creates compensating ledger activity. That is an `UPDATE`.

Do not use `DELETE` for transaction correction. Financial systems generally
preserve records and correct them with reversal, refund, archive, or adjustment
flows.

### 2.5 EXECUTE

Use `EXECUTE` when the adapter is managing a runtime process.

Examples:

- run reconciliation for a date range
- execute a scheduled sweep plan
- launch a bulk payout job
- resume, pause, or abort a multi-step financial workflow
- run a simulation or dry-run that produces a job artifact
- start an autonomous approval or compliance-review workflow

Direct money movement should not be placed in `EXECUTE` solely because it has
external effects. A single transfer changes financial state and usually belongs
in `UPDATE`. A transfer bot that later decides which transfers to initiate is an
execution workflow and belongs in `EXECUTE`.

## 3. Common Financial Operation Classes

| Operation class | Examples | Endpoint | Default danger posture |
|-----------------|----------|----------|------------------------|
| Account inquiry | balances, transactions, statements, payment status | `READ` | `safe` mutation posture, high confidentiality |
| Recipient setup | create counterparty, add bank account, create mandate | `CREATE` | `reversible` or `dangerous` depending on payment enablement |
| Recipient modification | change routing/account number, enable beneficiary, change mandate | `UPDATE` | `dangerous`; require out-of-band verification in production |
| Non-binding quote | fee estimate, FX estimate, delivery estimate | `READ` or `CREATE` | `safe` or `reversible`; no funds or limits reserved |
| Authorization or hold | transfer authorization, card authorization, balance hold, reserve | `UPDATE` | `dangerous`; may consume limits or reserve funds |
| Payment initiation | ACH, wire, card capture, payout, sweep, check, internal transfer | `UPDATE` | `dangerous`; confirmation and idempotency required |
| Approval and submission | approve payment, submit to bank, release hold, fund transfer | `UPDATE` | `dangerous`; stronger gate for external rails |
| Cancellation | cancel payment, cancel authorization, stop payment | `UPDATE` | `destructive` or `dangerous`; time-window sensitive |
| Correction | refund, return, reversal, recall, chargeback response | `UPDATE` | `dangerous`; must preserve audit and reason codes |
| Static configuration removal | delete webhook, remove unused template | `DELETE` | `destructive`; confirm if it affects notification or controls |
| Batch workflow | bulk payroll, scheduled sweep, reconciliation run | `EXECUTE` | `dangerous` or `forbidden` without supervised approval |

## 4. Provider Patterns

The following provider patterns show why financial adapters should classify by
economic effect instead of provider verb.

| Provider/API | Observed pattern | MCP-AQL implication |
|--------------|------------------|---------------------|
| [Mercury API](https://docs.mercury.com/docs/getting-started) and [Mercury CLI](https://github.com/MercuryTechnologies/mercury-cli) | API tokens have read-only, read-write, and custom tiers. Read-write tokens can initiate transactions, while Mercury's hosted MCP is limited to read-only tools. The CLI prompts for confirmation on `payments create`, `payments request`, and `payments transfer`. | Mercury read tools map to `READ` with sensitive responses. Payment creation, request, and transfer commands map to `UPDATE` because they initiate or queue money movement. |
| [Stripe Treasury outbound transfers](https://docs.stripe.com/treasury/connect/moving-money/out-of/outbound-transfers) | Creating an outbound transfer sends funds over ACH or wire, creates a transaction, and holds funds immediately. Cancellation is a POST to a cancel endpoint that changes status. | `POST /outbound_transfers` is `UPDATE`, not `CREATE`. Cancel is `UPDATE`, not `DELETE`. The transaction object is audit evidence of the balance effect. |
| [Plaid Transfer](https://plaid.com/docs/transfer/creating-transfers/) | Transfer authorization runs risk and compliance checks, may be cancelled, can consume limits, and is followed by `/transfer/create`. Plaid strongly recommends idempotency keys to avoid duplicate transfer authorizations. | Authorization and transfer creation are `UPDATE` because they control payment capability and initiation. Get/list/event/sweep retrieval are `READ`. Cancel authorization or transfer is `UPDATE`. |
| [Modern Treasury Payment Orders](https://docs.moderntreasury.com/platform/reference/create-payment-order) and [Ledgers](https://docs.moderntreasury.com/ledgers/docs/ledgers-guarantees) | Payment orders include amount, direction, originating account, receiving account, rail, and settlement metadata. Ledgers enforce balanced entries, immutability after posting, archival instead of deletion, idempotency, and reversing transactions. | Create payment order is `UPDATE`. Ledger setup may be `CREATE`, but posted ledger effects are `UPDATE`; correction uses reversal/archival flows, not `DELETE`. |
| [Dwolla transfers](https://developers.dwolla.com/docs/connect/api-reference/transfers/initiate-a-transfer) | The transfer endpoint initiates movement between funding sources across ACH, real-time payment/FedNow, push-to-debit, and wire rails, with idempotency support. | Transfer initiation is `UPDATE`; funding-source and customer setup are separate `CREATE`/`UPDATE` surfaces. |
| [Wise transfers](https://docs.wise.com/api-reference/transfer) | A transfer is a payment order based on a quote. Funding a transfer starts payout processing. Wise uses customer-provided IDs for idempotency, limits one transfer per quote, and treats cancellation as final when allowed. | Quote creation may be `READ`/`CREATE` if non-binding. Transfer creation, funding, and cancellation are `UPDATE`. Receipts and transfer lookup are `READ`. |
| [Unit ACH and wire payments](https://www.unit.co/docs/api/payments/ach/originating/) | ACH payments have pending, review, rejected, clearing, sent, and canceled states. Wires move funds from the Unit account to a counterparty and process immediately; canceling a wire creates a cancellation transaction. | Payment creation and cancellation are `UPDATE`. Manual review, limits, and same-day rails raise the danger level. |

## 5. Safety Metadata for Financial Adapters

Endpoint routing is necessary but not sufficient. Financial adapters should add
or derive safety metadata for each operation.

Recommended review fields:

- **economic_effect**: `none`, `setup`, `quote`, `authorization`, `hold`,
  `ledger_movement`, `external_transfer`, `obligation`, `document`,
  `configuration`, `workflow`
- **sensitivity**: response and parameter confidentiality independent of
  mutation danger
- **environment**: `sandbox`, `test`, `production`, or provider equivalent
- **rail**: ACH, same-day ACH, wire, real-time payment, FedNow, card, check,
  internal transfer, ledger-only, FX, stablecoin, or provider-specific rail
- **amount and currency**: normalized minor units plus display units
- **source and destination**: account IDs, recipient IDs, external account
  fingerprints, and whether a destination is new or trusted
- **settlement timing**: cutoff windows, reversibility window, expected arrival,
  and finality
- **idempotency**: required key, source, binding fields, retention window, and
  replay behavior
- **confirmation policy**: required display fields, confirmation token scope,
  cooldown, and whether out-of-band verification is required
- **audit fields**: actor, adapter, operation, provider request ID, idempotency
  key, confirmation token, approval session, and redacted request summary

Some of these fields are already covered by existing MCP-AQL danger and
confirmation metadata. Others are domain-specific extensions that adapters can
include in operation descriptions or future schema extensions.

## 6. Confirmation and Idempotency

Financial `UPDATE` operations should require confirmation in production when
they can affect balances, obligations, recipient trust, or payment rails.

Confirmation messages should include:

- operation name and provider action
- source account and destination recipient/account
- exact amount and currency
- rail and expected timing
- environment
- idempotency key or retry key
- whether the recipient, external account, or bank details are new or recently
  modified
- cancellation or reversal constraints

Idempotency should be mandatory for mutable financial operations. The
idempotency key should be bound to the economic operation, not merely generated
per retry. At minimum, bind it to:

- source account
- destination account or recipient
- amount and currency
- operation type
- requested execution date or schedule
- rail
- provider environment

If an adapter retries after a timeout, it should reuse the same idempotency key
and surface unknown-outcome states to the user. It should never silently
generate a new key and risk duplicate payment initiation.

## 7. Mercury Adapter Sketch

Mercury's public CLI is generated from the Mercury OpenAPI/SDK surface, with
human-authored command overrides for payment descriptions and confirmation
copy. The payment commands are a useful case study because provider commands
named `create` still represent financial state changes.

Representative mapping:

| Mercury surface | MCP-AQL endpoint | Rationale and controls |
|-----------------|------------------|------------------------|
| `accounts list`, `accounts get` | `READ` | Account inquiry; sensitive balance data |
| `transactions list`, `transactions get` | `READ` | Transaction inquiry; sensitive counterparties, amounts, categories |
| `statements download` | `READ` | Document retrieval; sensitive file output handling |
| `recipients create` | `CREATE` | Adds a payment-enabled setup record; confirm and redact bank details |
| `recipients update` | `UPDATE` | Modifies payment destination details; require stronger verification |
| `payments create` | `UPDATE` | Initiates outgoing money movement despite upstream "create" wording |
| `payments request` | `UPDATE` | Queues or requests money movement; not an inert record creation |
| `payments transfer` | `UPDATE` | Modifies balances across accounts and creates paired ledger records |
| `payments list`, `payments get` | `READ` | Payment status inquiry |
| `webhooks create` | `CREATE` | Adds configuration, not ledger state; still security-sensitive |
| `webhooks update` | `UPDATE` | Modifies notification configuration |
| `webhooks delete` | `DELETE` | Removes notification configuration |
| `webhooks verify` | `EXECUTE` or `UPDATE` | Depends on whether it triggers a runtime test delivery or changes stored verification state |

The Mercury hosted MCP is intentionally read-only today, which is a strong
baseline for financial MCP exposure. An MCP-AQL Mercury adapter that adds write
operations should keep read-only operation discovery separate from
money-movement execution, require confirmation tokens for all payment `UPDATE`
operations, and preserve the CLI's confirmation posture rather than bypassing it
with non-interactive flags.

## 8. Prepare/Commit Pattern

Financial adapters should expose multi-step flows explicitly:

1. **Prepare**: collect recipient, amount, rail, schedule, quote, limits, fees,
   risk outcome, and warnings.
2. **Confirm**: present a stable confirmation summary and bind it to an
   operation fingerprint.
3. **Commit**: execute the balance- or obligation-changing `UPDATE` with the
   confirmed fingerprint and idempotency key.
4. **Observe**: return provider status and expose `READ` operations for
   subsequent status, events, statements, and receipts.

Endpoint mapping depends on what prepare does:

- A non-binding estimate can be `READ`.
- A saved draft can be `CREATE`.
- A quote, authorization, hold, or reservation that consumes limits or enables a
  future transfer is `UPDATE`.
- The committed money movement is `UPDATE`.

## 9. Adapter Review Checklist

Before publishing a financial adapter, review every operation against this
checklist:

- Does any `CREATE` operation move money, reserve funds, consume limits, submit
  to a rail, or create an enforceable obligation?
- Does any `DELETE` operation actually cancel, reverse, refund, return, archive,
  or stop a payment lifecycle?
- Are sensitive `READ` responses clearly marked and compatible with field
  selection or redaction?
- Are all balance- or obligation-changing operations `UPDATE` unless they are
  true runtime workflow jobs?
- Is idempotency required and stable across retries?
- Does confirmation show amount, currency, source, destination, rail,
  environment, timing, and reversibility?
- Are new or recently modified recipients subject to stronger verification?
- Are production rails, wire/instant rails, high amounts, bulk operations, and
  autonomous workflows gated as `dangerous` or `forbidden` by policy?
- Are audit records immutable enough to investigate who authorized what?
- Does introspection make the endpoint classification and danger posture visible
  to clients?

## 10. References

- [Mercury API Getting Started](https://docs.mercury.com/docs/getting-started)
- [Mercury MCP supported tools](https://docs.mercury.com/docs/supported-tools-on-mercury-mcp)
- [Mercury MCP security best practices](https://docs.mercury.com/docs/security-best-practices)
- [Mercury CLI repository](https://github.com/MercuryTechnologies/mercury-cli)
- [Stripe Treasury outbound transfers](https://docs.stripe.com/treasury/connect/moving-money/out-of/outbound-transfers)
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Plaid Transfer creation guide](https://plaid.com/docs/transfer/creating-transfers/)
- [Modern Treasury payment order API](https://docs.moderntreasury.com/platform/reference/create-payment-order)
- [Modern Treasury ledger guarantees](https://docs.moderntreasury.com/ledgers/docs/ledgers-guarantees)
- [Dwolla initiate a transfer](https://developers.dwolla.com/docs/connect/api-reference/transfers/initiate-a-transfer)
- [Wise transfer API reference](https://docs.wise.com/api-reference/transfer)
- [Unit ACH payments](https://www.unit.co/docs/api/payments/ach/originating/)
- [Unit wire payments](https://www.unit.co/docs/api/payments/wires/apis/)
