## Context

`create-transaction-agent`'s amount-inference rule currently searches in three fixed tiers (1, 3, 12 months), stopping as soon as it finds two matches. Its account-inference rule ("Category history", "Overall history") has no window guidance at all. Both share one `MAX_PERIOD_DAYS = 365` tool constant with MCP and `assistant-agent`.

During this change's own design discussion, two variants were tried directly against the running agent and traced:

- `MAX_PERIOD_DAYS = 31` with the ladder reworded to open-ended "search recent history, capped at a year": a genuine positive match (history at day 40/70/100) crashed once with `GraphRecursionError` (LangGraph's default 25-step ceiling) and succeeded on retry with identical seed data — the outcome depended on an incidental model choice (adding an `accountIds` filter), not on the actual search logic.
- The same setup on a true negative (no matching history) needed to walk the full year in ~31-day hops (~12 round-trips) and exceeded the test's 100s timeout.

Neither failure is new in kind — the original 3-tier ladder already required up to 3 round-trips to confirm a negative — narrowing the per-call cap multiplied that cost. The relationship is mechanical: worst-case round-trips to confirm no match ≈ `365 / MAX_PERIOD_DAYS`.

## Goals / Non-Goals

**Goals:**

- Reduce the per-call size of `create-transaction-agent`'s history lookups (amount-inference ladder and account/category-history inference)
- Keep the worst-case round-trip count, for both a genuine match and a true negative, small enough to stay well inside LangGraph's recursion ceiling and typical request timeouts
- Preserve the existing twelve-month search guarantee from `transactions/spec.md` and `assistant/spec.md` exactly

**Non-Goals:**

- Changing `assistant-agent` or MCP's `get_transactions`/`aggregate_transactions` behavior (both keep the 365-day cap, per the earlier scoping decision)
- Building a general pagination mechanism for `get_transactions` — sequential re-calls with a description hint are enough for this use case
- Re-deriving the twelve-month requirement itself

## Decisions

**`MAX_PERIOD_DAYS = 90` for `create-transaction-agent`'s instance, not 31.**
`ceil(365 / 90) = 5` worst-case round-trips to walk a full year, versus `ceil(365 / 31) = 12`. The 12-hop case is what produced the recursion crash and the timeout; 5 hops keeps both the recursion budget and wall-clock time comfortably clear while still cutting the worst-case single response to a quarter of today's 365-day call. A 31-day cap was tried and rejected on direct evidence. Leaving `MAX_PERIOD_DAYS` at 365 and only adding narrow-first guidance to the account/category-history rule was considered (it would fix that one lookup without touching the amount ladder) but doesn't address the ladder's own worst-case tier-3 payload, which was the original complaint.

**`toolCallLimitMiddleware` on `get_transactions` with `runLimit: 10`, for `create-transaction-agent` only.**
Bounds worst-case round-trips structurally, independent of which path the model happens to take — this is what the 31-day experiment was missing, and why identical inputs crashed once and succeeded once. Budget: 5 covers one full-year walk (the amount ladder's worst case), the remaining 5 cover the account/category-history lookup, which now inherits the same 90-day-per-call cap automatically and needs no separate tiering instruction of its own. Considered a separate limit per lookup purpose (amount vs. account/category) — rejected: the tool has no way to distinguish which rule triggered a given call, and one shared budget is simpler.

**Amount-inference rule reworded to narrow-first / widen-as-needed, capped at a year — no explicit month tiers.**
The tested wording already in the working tree (`create-transaction-agent.ts`) is kept as-is; only the tool's cap changes, from 31 back up to 90. The explicit 1/3/12-month breakdown is dropped because the tool's own 90-day cap plus its "call multiple times with sequential ranges" description line now do the job the named tiers used to do — spelling out fixed month boundaries in the prompt would just be a second, disconnected copy of a constraint the tool already enforces. Keeping fixed tiers _and_ the new cap (e.g., a tier at "90 days" instead of "3 months") was considered and rejected as redundant: nothing about the observed failures required named tiers, only a bounded number of hops, which the cap and `runLimit` now guarantee directly.

**`get_transactions` description gains a "call multiple times with sequential ranges" line, on every instance.**
Already in the working tree. Applies to the 365-day instances too (`assistant-agent`, MCP) — harmless there, and keeps the tool self-describing regardless of which cap a given construction uses.

**`mcp/tools/guides.ts`'s `CREATE_TRANSACTION_INSTRUCTION` is left untouched.**
It serves external MCP callers, whose tool keeps the 365-day cap, so it has no reason to chain and no reason to lose its explicit ladder.

## Risks / Trade-offs

- **A single invocation that genuinely needs a full negative walk for both the amount ladder and the account/category-history lookup lands exactly at the 10-call ceiling, with no margin left** → accepted, unverified by test. A deterministic integration test would need to force the model to attempt account/category-history lookups before giving up on an unstated amount, which is model-strategy-dependent, not code-controlled — the same non-determinism that turned identical seed data into a crash on one run and a success on the next during this change's exploration. `runLimit: 10` still bounds the scenario structurally (hard failure instead of a recursion-limit crash or timeout), just not exercised by an automated test.
- **Chaining depends on the model issuing non-overlapping sequential windows on its own** → the description line is guidance, not enforcement; a model that instead retries the same rejected range makes no progress toward covering the year. Mitigation: the new negative-search integration test (see proposal.md - Impact) fails loudly if this regresses.
- **The 90/10 numbers are derived from the 31-day trace's mechanics (`ceil(365/90) = 5`), not measured directly at 90 days** → confirm with the same trace-inspection approach once implemented, before considering the numbers final.

## Constitution Compliance

- **Backend Layer Structure / Ports**: no service, repository, or port changes; confined to the langchain tool/agent layer
- **Test Strategy**: new coverage is added to the existing co-located `create-transaction-agent.int.test.ts`, consistent with co-location rules
- No other constitution principle applies; no violations identified
