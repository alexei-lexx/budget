## Context

`create-transaction-agent.ts` powers both the Transactions page quick-entry box (via `CreateTransactionFromTextService`) and the Assistant chat (via the `create_transaction_subagent` tool). Its system prompt currently treats amount as mandatory: if the user's text has no amount, the agent stops and reports an error. The MCP server exposes an equivalent, separately-worded `create-transaction` guide in `guides.ts` for external clients. See proposal.md for motivation.

`get_transactions` is the only lookup tool available to the agent. It filters by date range (max 365 days), account IDs, category IDs, and types — it has no description filter. Matching a description against history is therefore left to the model's own reasoning over the returned transactions, not a query parameter.

## Goals / Non-Goals

**Goals:**

- Make the recurring-lookup rule identical, in substance, across the three surfaces (internal agent prompt, MCP guide).
- Keep the change to prompt text only — no new tools, schema fields, or repository methods.
- Specify the search strategy precisely enough that the model behaves consistently (window sizes, stop condition, tie-breaking).

**Non-Goals:**

- Server-side or repository-level description matching (fuzzy search, indexing). Matching stays a model-reasoning step over `get_transactions` results.
- Any UI change to the quick-entry box or Assistant chat.

## Decisions

### Widening search: three fixed windows, stop early on a decision

The agent searches transaction history ending today, starting with a 1-month window. If that does not yield a decision (see below), it widens to 3 months, then to 12 months — the last possible widening step, since a single history lookup cannot span more than a year. It stops widening as soon as a window produces a decision — either a recurring match or a confirmed disagreement — rather than always searching the full year.

The search is scoped only by date range, not narrowed by category, account, or type, since narrowing by an inferred category before the match is found risks excluding the very history the search is trying to find.

Alternative considered: a single 12-month search. Rejected — most recurring transactions are recent, and starting narrow keeps the common case (a match in the last month) cheap while still reaching back a full year when needed.

### Matching is semantic, done by the model

"Matching the description" is model reasoning over the returned transactions' `description` field (and, secondarily, category/account context), the same way the agent already reasons over history for account/category inference. There is no new exact- or fuzzy-match parameter — this stays consistent with "no new tools, GraphQL fields, or repository methods" in the proposal.

### Decision rule: ≥2 exact-amount agreement among matches

Within a window, the agent groups the matching transactions by exact amount. If any amount is shared by two or more matches, that is the recurring amount; ties between two different amounts (e.g., two at 50 and two at 60) are not addressed by the spec's scenarios and are treated as disagreement — fall through to unresolved, per the "matches disagree on the amount" clause. Fewer than two total matches, or matches that disagree, are not a recurring pattern.

### Field source: most recent match, explicit text overrides

When a recurring amount is found, the new transaction's type, account, category, amount, and description come from the most recent matching transaction (by date) that has that amount — not an arbitrary or merged match — dated today. Any field stated explicitly in the new user text (e.g., a different account named in "gym from savings") overrides the matched value for that field only. This mirrors the existing override pattern already in the prompt (explicit input beats inferred history) rather than introducing a new precedence concept.

### Full rule under Amount; recurring match added as a priority tier in Account/Category, a one-liner in Description

The rule is triggered by, and only by, a missing amount, so its full text — trigger condition plus the widening-search/≥2-match logic — lives under Amount, keeping Amount self-contained rather than pointing elsewhere to resolve itself.

Account and Category already resolve by a numbered priority list whose top tier is an explicit mention in the user's input. That existing top tier already implements "explicit detail overrides the matched value" — no separate override caveat is needed. So recurring match is inserted as a new tier directly below the explicit-match tier, ahead of the softer signal/history-based tiers, making it discoverable to a reader scanning only that section without restating the override rule:

- **Account**: `1. Currency match → 2. Name match (explicit) → 3. Recurring match (see Amount) → 4. Category history → 5. Overall history`
- **Category**: `1. Name match (explicit) → 2. Recurring match (see Amount) → 3. Signal match → 4. History`

Description has no priority list today, only prose rules, so it gets one line instead: "If set by recurring-transaction inference, use the matched description, unless the new text states a different one." Type needs no note — it has no priority list either, and the recurring rule setting it is a direct single-value override, same as any other field inferred from context.

Added to:

- `create-transaction-agent.ts` — `SYSTEM_PROMPT_TEMPLATE`, used by both the quick-entry box and Assistant chat.
- `guides.ts` — `CREATE_TRANSACTION_INSTRUCTION`.

Wording differs slightly only where the surrounding prompt's voice already differs (e.g., "MUST stop and respond with an error" vs. the guide's process-neutral phrasing), matching how the existing voice-input rule is duplicated today. No shared constant is introduced across the two files — the proposal explicitly notes this duplication pattern already exists for the voice-input rule, and the files live in different modules with independently evolving prompt structure.

### Test coverage: internal agent only

Per the proposal, only `create-transaction-agent.int.test.ts` gets new scenarios (the three spec scenarios: recurring match used, single-match fallback, disagreeing-amount fallback, no-match fallback). The MCP guide's instruction text is not independently agent-tested today (no existing int test exercises the MCP guide through an LLM), so none is added here — consistent with "no changes to ... GraphQL schema, or tool schemas" and keeping the change surgical.

## Risks / Trade-offs

- **Model doesn't reliably widen through all three windows** → Mitigation: prompt states the widening sequence explicitly (1 → 3 → 12 months) and the stop condition, rather than leaving retry behavior implicit.
- **Model treats a near-duplicate description (e.g., "gym" vs. "gym membership") inconsistently across runs** → Accepted: matching is inherently fuzzy/semantic, same as existing category/account history inference; scenarios in the spec use clearly related text ("gym abo" / "gym").
- **Extra history searches add latency/cost when amount is missing** → Accepted: bounded to at most 3 searches, only triggered when amount is absent (today's behavior does zero searches and immediately errors), and each search is capped by the existing 365-day history-lookup limit.

## Constitution Compliance

- **Schema-Driven Development**: N/A — no GraphQL schema change; reuses `get_transactions` as-is.
- **Backend Layer Structure**: N/A — no resolver, service, or repository changes; the change is confined to prompt text consumed by the existing agent/tool wiring.
- **Result Pattern**: N/A — no new service methods.
- **Test Strategy**: Compliant — new coverage lands in the existing co-located `create-transaction-agent.int.test.ts`, no new test directory.
- **TypeScript Code Generation**: Compliant — no new types or generated code introduced.

No violations identified.
