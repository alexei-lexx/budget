## Context

See proposal.md - Why, for motivation.

`get_transactions` calls `TransactionRepository.findManyByUserId` directly from inside the tool function on both surfaces, bypassing the service layer — it's a single query plus a couple of validation checks, so the shortcut costs nothing. `aggregate_transactions` does go through a service (`AggregateTransactionsService`), but that service is single-purpose specifically because it orchestrates two repositories (`TransactionRepository` and `CategoryRepository`).

`findManyByUserId` already accepts optional `dateAfter`/`dateBefore`, but two things make it unsuitable for "recent, no date range" on its own:

- Without a date filter, the repository's index selection falls back to `USER_CREATED_AT_SORTABLE_INDEX` (sorted by when a row was inserted), not `USER_DATE_INDEX` (sorted by the transaction's own date). A backfilled old transaction entered today would sort as "most recent."
- It has no result limit (`pageSize: undefined` — fetch everything matching the key condition). Omitting the date range would fetch the user's entire history.

`findManyByUserIdPaginated` (used by the UI's transaction list) does support a real limit (`first`), but every call also issues a second, separate `Select: COUNT` query over the same unbounded key condition to populate `totalCount` for UI pagination. That count query is not bounded by `first` — for a heavy account it can scan as much data as the searches this change exists to avoid, just hidden inside one tool call instead of three.

## Goals / Non-Goals

**Goals:**

- Resolve "recent similar transactions" and "recent history for account/category inference" without a caller-supplied date range, in as few DynamoDB reads as the data actually requires.
- Make `create-transaction-agent.ts`'s history search deterministic on a non-frontier model, by removing the multi-step, self-computed date-widening reasoning from the prompt.

**Non-Goals:**

- No MCP tool, and no change to the MCP `create-transaction` guide. The reliability problem this change solves — a weaker model executing a multi-step widening protocol correctly — doesn't apply to MCP clients (e.g. Claude web), which run frontier models capable of following the existing 1/3/12-month protocol correctly. The token/latency savings would still apply there, but aren't worth a second tool surface and a duplicated guide rewrite to maintain for a channel where the reliability problem doesn't exist; revisit if it becomes a real cost/latency pain point on that surface too.
- No change to `assistant-agent.ts`. Giving it a date-range-free lookup would need a carve-out to the `assistant` spec's "SHALL infer the relevant date range... defaulting to current month" requirement — out of scope here, left for a possible follow-up.
- No server-side subject/description matching. Matching a description against history stays a model-reasoning step over the returned transactions, consistent with the existing `clone-recurring-transaction-from-text` decision.
- No change to `get_transactions`, `aggregate_transactions`, or the `TransactionRepository` port.

## Decisions

### Add a method to `TransactionService`, not a direct repository call from the tool, and not a new Single-Purpose Service

This tool needs a segmented, escalating search (see next decision) — real orchestration logic, not a single query. Putting that loop directly in the tool function would mix orchestration into a layer meant to stay thin, and work against the service layer's purpose of grouping an entity's operations in one place.

Add `TransactionService.getRecentTransactions(...)`, throwing `BusinessError` for an invalid `expectedCount` and returning `Transaction[]` on success — matching how `TransactionService`'s existing methods signal errors (see Constitution Compliance). The tool file stays thin: validate input, call the service, map successful results to `TransactionDto` (reusing the existing `toTransactionDto` helper). A thrown `BusinessError` is left to propagate uncaught, matching `create-transaction.ts`/`create-account.ts` (both of which call a service that throws `BusinessError` and don't catch it either) — LangChain's `ToolNode` already catches any error thrown inside a tool call by default and converts it to an error `ToolMessage` fed back to the model, so a tool-level catch-and-convert-to-`Failure` is redundant for safety; it would only change the error's shape from the framework's generic fallback string to this tool's own `Failure` JSON, which isn't worth the inconsistency with the tool's siblings.

**Alternative considered**: implement the loop directly in the tool function, matching `get_transactions`/`aggregate_transactions`'s direct-repository shortcut exactly. Rejected — that shortcut works for those tools only because they have no orchestration logic; this one does.

**Alternative considered**: a new Single-Purpose Service (`FindRecentTransactionsService`, one `call()` method), matching how the MCP `aggregate_transactions` tool is backed by `AggregateTransactionsService`. Rejected — that service is single-purpose specifically because it orchestrates two repositories (`TransactionRepository` and `CategoryRepository`, for report-exclusion filtering). This search only ever touches `TransactionRepository`, which is squarely what a Domain Entity Service is for ("depend primarily on one repository for related entity"); a new single-purpose class would be an unjustified extra type for a single-repository read.

### Segmented, non-overlapping escalation over four fixed windows

`getRecentTransactions` calls `findManyByUserId` over disjoint calendar-month segments, closest first, accumulating results and stopping as soon as the accumulated count reaches `expectedCount`:

1. `[today − 1 month, today]`
2. `[today − 3 months, today − 1 month)`
3. `[today − 6 months, today − 3 months)`
4. `[today − 12 months, today − 6 months)`

Each segment is queried at most once. Every call passes an explicit `dateAfter`, so index selection always lands on `USER_DATE_INDEX` (sorted by transaction date) — the insertion-time fallback described in Context never applies here.

Segment boundaries use `Temporal.PlainDate` month arithmetic, matching how the prior prompt-driven search already expressed its windows ("past 1 month," "past 3 months," "past 12 months") and how `get-transactions.ts` already uses `Temporal`. A 6-month segment is added between 3 and 12 so the largest single query spans 6 months, not 9.

**Alternative considered**: a single `Limit`-bound query via `findManyByUserIdPaginated`. Rejected — its bundled `totalCount` query scans the full matched range regardless of `Limit` (see Context), undermining the goal for the exact case this feature targets.

**Alternative considered**: re-querying from `today` at each step (`0→1mo`, `0→3mo`, `0→6mo`, `0→12mo`) instead of disjoint segments. Rejected — re-fetches the same rows again at every escalation step once a search needs more than one segment.

**Alternative considered**: return `{ transactions, startDate }`, where `startDate` marks how far back the search reached, so the agent can tell whether retrying with a bigger `expectedCount` could find more. Rejected — the search only stops short of `expectedCount` once all four segments are exhausted, so a result shorter than the requested `expectedCount` already means "nothing more exists"; the agent gets that signal for free by comparing the response to the `expectedCount` it itself sent. `getRecentTransactions` returns plain `Transaction[]`, matching `get_transactions`'s existing shape.

### `expectedCount` is a soft target, not an exact count

Documented on the schema field, not in the calling prompts. The service returns fewer than `expectedCount` when history runs out, and can return more than `expectedCount` when the segment that satisfies the target naturally contains more matches — segments are never truncated mid-fetch.

### Prompt rewrites carry no tool name, mechanism, or window sizes — only two fixed defaults

Per proposal.md: the Amount section states only the outcome ("MUST look up at least 2 recent similar transactions"); the Account/Category sections state a fixed sample ("look up at least 10 most recent transactions for history-based criteria"). The prompt names neither the tool, the four-segment escalation, nor the month boundaries — those live entirely in the tool's own schema description and this document. Only `create-transaction-agent.ts`'s prompt changes; the MCP `create-transaction` guide is untouched (see Non-Goals).

The Amount section also states the fallback explicitly: "If fewer than 2 similar transactions are found, the amount cannot be inferred — MUST stop and report an error." The old three-step widening sequence made this fallback implicit — a model that literally executes "search 1mo, then 3mo, then 12mo, stopping as soon as you find 2" and never reaches 2 has, by construction, exhausted the search and effectively confirmed there's no second match. Collapsing that into a single `get_recent_transactions` call removes that structural cue: the eval run below (see Risks) showed the model instead treating a single returned match as sufficient to infer a recurring amount. Stating the fallback outcome directly restores the original behavior without reintroducing the widening mechanism in the prompt.

## Risks / Trade-offs

- **Sparse history triggers up to 4 sequential repository queries in one tool call** → Accepted: each is a fast, indexed, date-bounded query, the same cost class as a single `get_transactions` call today, and this replaces up to 3 full LLM round trips rather than adding to them.
- **Model doesn't retry with a bigger `expectedCount` when the first batch lacks enough real matches** → Mitigation: the tool's schema description states this explicitly, and a response shorter than the requested `expectedCount` is itself the signal that retrying would find nothing new.
- **Model treats a single returned match as sufficient to infer a recurring amount** → Confirmed during implementation: the `create-transaction-agent.eval.test.ts` scenario "does not create transaction from single prior match" failed consistently (2/2 runs) against the initial Amount rewrite, while passing consistently (2/2) against the original three-step prompt. Root cause: the old prompt's explicit widening loop implicitly proved "no second match exists" by construction (the model exhausted all three steps and never found 2); the one-line replacement dropped that implicit proof. Mitigation: the Amount section states the fallback outcome directly — "If fewer than 2 similar transactions are found, the amount cannot be inferred — MUST stop and report an error." Re-verified passing after this addition.
- **`expectedCount`'s soft-target semantics could surprise a caller expecting an exact count** → Accepted: documented on the field; `get_transactions` already returns a variable-length array to the same kind of caller.
- **New `TransactionService` method departs from `get_transactions`/`aggregate_transactions`'s direct-repository pattern** → Accepted per the first decision above; this is the first tool in the family whose logic is single-repository _and_ non-trivial, so it is the first to warrant a Domain Entity Service method rather than an inline repository call or a new Single-Purpose Service.
- **Account/Category history lookups go from unbounded to a fixed 10 most recent** → The old prompt text ("look up past transactions for history-based criteria") had no cap; `get_transactions` let the model choose any date range. Fixing it at 10 is a real narrowing, not just a mechanism swap, and could affect existing eval scenarios (e.g. "selects most used account overall") if their seeded history requires looking past the 10 most recent transactions. No spec commits to a specific scope here (`transactions/spec.md` only says "recent transaction history," not an exhaustive one), so this doesn't need a spec change, but the eval suite needs to be re-run and its fixtures adjusted if they rely on deeper history than 10.

## Migration Plan

Purely additive: one new service method, one new tool file, a prompt text edit in one existing file. No data migration, no schema change. Rollback is reverting the change.

## Constitution Compliance

- **Backend Service Layer**: Compliant. `getRecentTransactions` is added to the existing `TransactionService` (a Domain Entity Service) as an "other read," alongside its existing find-many methods; a new Single-Purpose Service was considered and rejected since this search only touches one repository (see Decisions).
- **Backend Port Interfaces**: Compliant. No new `TransactionRepository` method; reuses the existing `findManyByUserId`.
- **Result Pattern**: Compliant. `TransactionService`'s existing methods (`createTransaction`, `updateTransaction`, etc.) throw `BusinessError` rather than returning `Result`, a pre-existing pattern in this class; `getRecentTransactions` follows it for consistency with its siblings, throwing `BusinessError` for an invalid `expectedCount` and returning plain `Transaction[]` on success. The tool returns `Success` on the happy path, matching every existing tool, but does not catch and convert the thrown `BusinessError` — matching `create-transaction.ts`/`create-account.ts`, which call a `BusinessError`-throwing service method and let it propagate uncaught. LangChain's `ToolNode` catches it one layer up and reports it to the model, so this isn't a gap in error handling, just a boundary the framework already owns.
- **Input Validation**: Compliant. `expectedCount` being a positive integer is checked structurally at the schema layer, then re-validated in the service as a business rule, matching how `get_transactions` re-validates its date range in the tool despite schema-level format checks.
- **Method Ordering**: Compliant. `getRecentTransactions` is placed after `TransactionService`'s existing `findMany`-style reads and before any write methods.
- **Test Strategy**: Compliant. New tests are co-located: `get-recent-transactions.test.ts` next to the new tool file, and a new test block next to `transaction-service.ts`'s existing tests.
- **TypeScript Code Generation**: Compliant. The service method takes keyword arguments (more than two parameters); no new abbreviations or non-null assertions anticipated.

No violations identified.
