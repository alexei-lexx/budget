## Context

See proposal.md for motivation. Relevant existing pieces:

- `TransactionRepository.findManyByUserId` already filters by `dateAfter`/`dateBefore`, `accountIds`, `categoryIds`, `includeUncategorized`, `types`. No repository changes needed.
- `Transaction.amount` is an unsigned magnitude. `ExpenseTrendService` and the LangChain `aggregate_transactions` tool use `signedAmount` only when they need to blend types into one net number. This tool never blends types, so it uses `amount` directly.
- `ExpenseTrendService` and `ByCategoryReportService` already implement the "drop transactions linked to a report-excluded category" rule in-memory, by loading categories with `categoryRepository.findManyWithArchivedByUserId` and filtering by `excludeFromReports`. This tool reuses that approach so archived report-excluded categories are still honored, matching the `basics` guide rule that historical totals include archived categories.
- `ExpenseTrendService` already takes a `categoryIds` + `includeUncategorized` pair and passes it straight through to the repository filter shape. This tool takes the same two inputs directly — no translation needed.

## Goals / Non-Goals

**Goals:**

- Define how filter input maps to the existing repository filter shape.
- Define how the exclusion rule and its validation are computed in-memory.
- Define the grouping/bucketing algorithm and result shape.

**Non-Goals:**

- No repository or port changes.
- No changes to `get_transactions`, `ByCategoryReportService`, `ExpenseTrendService`, or the LangChain `aggregate_transactions` tool.
- No category names in output — grouped results carry `categoryId` only, never a display name.

## Decisions

**Single-purpose service, following `ExpenseTrendService`/`ByCategoryReportService`.**
`AggregateTransactionsService` exposes one public method, `call()`, orchestrating `TransactionRepository` and `CategoryRepository`. Wired via a new `resolveAggregateTransactionsService` singleton in `dependencies.ts`, same pattern as the two existing report services. The MCP tool file stays a thin wrapper: guide-token check, call the service, return its `Result`.

**`categoryIds` and `includeUncategorized` pass straight through to the repository filter.**
The input already matches the repository port shape — a plain `categoryIds: string[]` plus a separate `includeUncategorized: boolean` — so no translation is needed. `categoryIds` is passed as-is only when non-empty (matches the existing `...(categoryIds && { categoryIds })` spread convention in `get_transactions`), and `includeUncategorized` only when `true` (matches the opt-in-only convention now used by `ExpenseTrendService` and the GraphQL filters).

**Category exclusion is computed in-memory, not pushed into the repository filter.**
Alternative considered: add an `excludeCategoryIds` filter to `TransactionFilterInput`. Rejected — it would touch the port and every adapter for a rule only this feature (and the two report services, which already duplicate it) needs, and the constitution's Vendor Independence rule favors keeping the port minimal. Instead, when `includeTransactionsExcludedFromReports` is `false`, the service:

1. Loads all categories via `categoryRepository.findManyWithArchivedByUserId` (includes archived, since a report-excluded flag on an archived category still applies to historical totals).
2. Builds a `Set` of category IDs where `excludeFromReports` is `true`.
3. Fetches transactions from the repository (full filter, no exclusion applied yet).
4. Filters out any transaction whose `categoryId` is in that set.

When `includeTransactionsExcludedFromReports` is `true`, no category lookup happens at all — the exclusion rule and its validation are both skipped.

**The self-contradictory `categoryIds` validation reuses the same excluded-category `Set`.**
No second category lookup. After building the excluded-category `Set` (step 1 above, only when `includeTransactionsExcludedFromReports` is `false`), the service checks whether any of the input's `categoryIds` intersect that `Set`. If so, it fails validation before fetching transactions. This runs after the cheap date-range checks and before the transaction fetch, per the constitution's validation ordering (cheap checks, then database-dependent checks) — the category lookup is a database round trip, but it must happen before the transaction fetch either way (to filter results), so validating with the same data costs nothing extra.

**Grouping is one in-memory bucketing pass over the fetched, filtered transactions.**
Every result is keyed by `(type, currency, groupValue)`, where `groupValue` is:

- absent, when no `groupBy` is given
- `transaction.accountId`, when `groupBy` is `ACCOUNT`
- `transaction.categoryId ?? null`, when `groupBy` is `CATEGORY`
- `transaction.date.slice(0, 7)` (`YYYY-MM`), when `groupBy` is `MONTH`

The service iterates transactions once, accumulating `sum` (running total of `amount`), `count`, `min`, and `max` per bucket in a `Map`. Buckets are created lazily from the data — a combination with zero matching transactions never gets an entry, which is exactly the "omit empty combinations" requirement with no extra filtering step. The final result array comes from `Map.values()`, each entry spread into the appropriate output shape (adding `accountId`/`categoryId`/`month` only when that `groupBy` was requested).

**`groupBy` is a plain union type, not a model enum.**
`type AggregateGroupBy = "ACCOUNT" | "CATEGORY" | "MONTH"` in the service file — it is a request option, not a persisted domain concept, matching the existing precedent of `ReportType` in `ByCategoryReportService`. The MCP tool's Zod schema still validates it as `z.enum(["ACCOUNT", "CATEGORY", "MONTH"])`.

**Sum/min/max use `amount`, not `signedAmount`.**
Because every result is already split by `type`, blending sign conventions would be redundant (and wrong for `min`/`max`, which should reflect transaction size, not cashflow direction). This matches the worked examples in specs/mcp-server/spec.md, which show positive sums for `EXPENSE` results.

## Risks / Trade-offs

- **In-memory aggregation over up to 365 days of transactions** → Same approach and same bound as `get_transactions` and `ExpenseTrendService`; no new risk introduced.
- **Extra `findManyWithArchivedByUserId` call whenever `includeTransactionsExcludedFromReports` is `false`** → Mitigated by only issuing it when needed (never when `true`), and by reusing its result for both the collision check and the filtering step (no duplicate lookups).

## Constitution Compliance

- **Backend Service Layer**: single-purpose service (`call()` only), orchestrating two repositories — matches the `ExpenseTrendService`/`ByCategoryReportService` precedent cited in proposal.md.
- **Backend Port Interfaces / Vendor Independence**: no port changes; exclusion logic stays in-memory in the service rather than becoming a new portable-but-unproven repository filter.
- **Result Pattern**: `call()` returns `Result<AggregateTransactionsResult[]>`.
- **Input Validation Ordering**: guide-token check, then cheap date-range checks, then the database-dependent category-collision check, then the transaction fetch — mirrors `get_transactions` with one added database-dependent step.
- **TypeScript Code Generation**: `groupBy` modeled as a union type (like `ReportType`), not a new enum, since it is not a persisted domain value.

No violations identified.
