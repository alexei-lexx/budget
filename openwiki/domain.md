---
type: domain model
title: Domain Model
description: Finance, assistant, Telegram, and settings concepts enforced by the backend models and GraphQL schema, including embedded transaction behavior and key invariants.
tags: [domain, finance, assistant, telegram, graphql, settings]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-06T08:09:31.070Z
sources:
  - id: openwiki-source-709d1f706e5997a35fe23a3a
    resource: repo://backend/src/graphql/schema.graphql
  - id: openwiki-source-ff971581384c359cb9cb4b24
    resource: repo://backend/src/models/account.ts
  - id: openwiki-source-44dfed50c98dd7029252e7ae
    resource: repo://backend/src/models/category.ts
  - id: openwiki-source-d64b42d0c93f03e1be99a784
    resource: repo://backend/src/models/chat-message.ts
  - id: openwiki-source-61fe9093da4cc5cea377a352
    resource: repo://backend/src/models/telegram-bot.ts
  - id: openwiki-source-a05f6620889265cd9147b823
    resource: repo://backend/src/models/transaction.ts
  - id: openwiki-source-6cb76c288262abc5bba5d89e
    resource: repo://backend/src/models/trend-preset.ts
  - id: openwiki-source-dcf1fcb33a18bb487666e973
    resource: repo://backend/src/models/user.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-06T08:09:31.070Z" }
---

# Domain Model

This repository models a user-scoped personal finance system with a small set of domain objects that are shared across persistence, GraphQL, assistant flows, and Telegram messaging. The important shape is not just the entities themselves, but the invariants they enforce: currencies remain explicit, transactions are typed, account and category references are embedded in transaction reads, and several user-facing features carry session or preference state.

## Ownership and user scope

`User` is the top-level ownership boundary. The model requires a non-empty, valid email address and stores an `mcpToken` alongside optional per-user UI and assistant preferences. `Account`, `Category`, `Transaction`, `TrendPreset`, and `TelegramBot` are all keyed by `userId`, so data access and mutations must preserve that boundary rather than allowing cross-user reuse.

The user record also acts as a settings container:

- `interfaceLanguage` controls the frontend/backend locale preference and must be one of the supported interface languages.
- `transactionPatternsLimit` is optional and must be a non-negative integer when present.
- `voiceInputLanguage` is optional and is surfaced in the GraphQL settings shape.
- `mcpToken` is always present and can be regenerated without changing the rest of the user profile.

## Accounts

Accounts represent places where money is held, such as cash, bank accounts, or cards. They are currency-aware and carry both an `initialBalance` and a mutable `transactionBalance`; the derived `balance` is always the sum of the two.

Non-obvious account constraints matter when changing behavior:

- account names are trimmed and must be 1–100 characters after trimming
- only supported currencies are accepted
- archived accounts cannot be updated or archived again
- balance changes are represented as signed transaction deltas rather than by mutating the derived balance directly

The GraphQL `Account` type exposes the current balance, currency, and name, while the model keeps the more detailed lifecycle and audit fields in persistence.

## Categories

Categories classify transactions and are intentionally simple: a category has a name, a type, and an `excludeFromReports` flag, plus archived state in persistence.

The type system is narrow: `CategoryType` is `INCOME` or `EXPENSE`. That constraint feeds transaction validation and reporting behavior. `excludeFromReports` is not cosmetic; report calculations are expected to omit excluded categories, which means changing this flag affects totals, assistant explanations, and any summary features that reuse the same aggregates.

## Transactions

Transactions are the central financial record type and the place where multiple invariants meet.

### Transaction types

The system recognizes five transaction types:

- `INCOME`
- `EXPENSE`
- `REFUND`
- `TRANSFER_IN`
- `TRANSFER_OUT`

The type determines how the transaction contributes to balances and reporting. The model’s signed amount rules are:

- `INCOME`, `REFUND`, and `TRANSFER_IN` are positive
- `EXPENSE` and `TRANSFER_OUT` are negative

That distinction is important for report logic and account balance updates, because transfer transactions move money between accounts without being treated as spending.

### Transaction invariants

Transactions are always created against a concrete account, and the account’s currency is copied onto the transaction at creation time. The model also allows an optional category and an optional description, but several combinations are rejected:

- amount must be positive
- transfer transactions must include `transferId`
- non-transfer transactions must not include `transferId`
- transfer transactions cannot have a category
- categories must belong to the same user as the transaction
- archived accounts and archived categories cannot be attached to new transactions
- category type must match the transaction type: income categories only pair with income transactions, while expense categories pair with expense and refund transactions
- descriptions are trimmed before storage and cannot exceed 500 characters

The category rule for refunds is especially easy to miss: refunds are allowed to use expense categories because they reduce spending in that category.

### Embedded account and category behavior

GraphQL does not expose raw `accountId` and `categoryId` fields on `Transaction`. Instead, the schema returns embedded lightweight account and category objects. Those embedded objects are read-time views of the current account/category state, not historical snapshots, and they deliberately carry archive state.

Two edge cases are important:

- if a transaction points to an account or category ID that no longer resolves, GraphQL returns an `Unknown` stub instead of null
- if a transaction has no category, the `category` field is null

This embedded design avoids extra lookups and N+1 behavior while keeping transaction reads resilient to data integrity problems.

### Transfer semantics

Transfer transactions are represented as paired inbound and outbound transactions linked by `transferId`, and the GraphQL `Transfer` type exposes both sides. This makes transfers a first-class domain concept rather than an account-only balance adjustment.

## Assistant traces and natural-language transaction creation

Assistant-facing GraphQL mutations return both user-facing output and a structured `agentTrace`. The trace is a union of:

- `AgentTraceText`
- `AgentTraceToolCall`
- `AgentTraceToolResult`

That means assistant calls are meant to be explainable and debuggable, not opaque. Both success and failure responses include the trace, and assistant failures also include a `sessionId` so the caller can retry within the same conversation.

Natural-language transaction creation follows the same pattern. The input accepts free text and an `isVoiceInput` flag. Voice input is handled specially because speech-to-text can collapse spoken prices into integer-looking amounts, so the agent is expected to reinterpret those cases differently from keyboard input.

## Trend presets and reporting preferences

`TrendPreset` stores a reusable configuration for expense trend views. It is intentionally lightweight and does not use soft deletion; deleting a preset is a hard delete because the model treats it as a save/remove toggle with no recovery requirement.

Important preset constraints:

- `lookback` must be a whole number from 1 to 12
- `currency` must be non-empty
- `categoryIds` defaults to an empty list
- `includeUncategorized` is optional and only represented when enabled

This matters because trend calculations are driven by explicit user preferences rather than inferred defaults.

## Telegram bot state

Telegram integration is modeled as user-owned bot credentials plus operational status.

The bot record contains:

- `token` and `webhookSecret` credentials
- `status`, which can be `PENDING`, `CONNECTED`, or `DELETING`
- `isArchived`, creation time, and update time

The status is lifecycle-oriented rather than decorative:

- `PENDING` means webhook registration is in progress and the bot is not yet usable
- `CONNECTED` means the webhook is active and inbound messages are received
- `DELETING` means disconnect has been requested and the webhook is being removed

Chat history for assistant and Telegram conversations is stored separately as `ChatMessage`. Messages carry a `sessionId` that is either a UUID or a Telegram-specific `${botId}#${chatId}` identifier, plus a role, content, creation time, and DynamoDB TTL-based expiration. The TTL is set up so chat history naturally ages out after 24 hours, and the default in-memory/history cap is 20 messages.

## GraphQL shape worth knowing

The schema reflects the domain decisions above rather than exposing raw persistence details. Useful high-level points:

- `Query.accounts`, `categories`, `transactions`, `trendPresets`, `telegramBot`, and `userSettings` are the primary user-facing entrypoints
- `TransactionConnection` and filters imply paginated, filtered transaction access instead of an unbounded list
- `TransactionPatternType` exists for `INCOME`, `EXPENSE`, and `REFUND`, which is narrower than the full transaction enum because only those types participate in pattern learning
- `UserSettings` exposes `interfaceLanguage`, `transactionPatternsLimit`, `voiceInputLanguage`, and `mcpToken`, so settings reads and updates are intentionally separate from the full user record
- `TelegramBot` is exposed with a masked token, not the raw secret

## Change-sensitive invariants

When modifying this domain, the highest-risk behavioral constraints are:

- keep account and user scoping intact across reads, writes, and embedded transaction lookups
- preserve the distinction between transaction type, category type, and report eligibility
- maintain transfer semantics so transfer records do not leak into spending totals
- preserve the read-time embedding contract for transaction account/category data
- keep assistant traces attached to both success and failure outputs
- keep Telegram bot lifecycle status transitions aligned with webhook state

These constraints shape both storage and API behavior, so changes that seem local can have cross-cutting effects in reports, assistant responses, and external integrations.
