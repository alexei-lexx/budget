## Issue

[#581 — aggregation MCP tool(s)](https://github.com/alexei-lexx/budget/issues/581)

An AI agent connected via MCP has no way to compute a spending or income total without fetching every matching transaction and adding amounts itself. This wastes context on large date ranges: a single "how much did I spend this year?" question can mean paging through hundreds of rows just to add them up.

## Why

The MCP server exposes `get_transactions`, which returns raw transaction rows. Answering "how much did I spend on groceries last quarter?" today means paging through every matching row and summing them — potentially hundreds of rows read just to produce a single number.

## What Changes

- Add a new MCP tool, `aggregate_transactions`, that computes `sum`, `count`, `min`, and `max` over transactions matching a filter, without returning the transactions themselves.
- Filters mirror `get_transactions`: `startDate`/`endDate` (required, capped at `MAX_PERIOD_DAYS`), `accountIds`, `types`.
- `categoryIds` and `includeUncategorized` mirror the standard filter pair used elsewhere in this repo (`ExpenseTrendService`, the GraphQL transaction/trend filters): `categoryIds` holds real category IDs only, and a separate optional `includeUncategorized` boolean also includes transactions with no category when `true`.
- A required `includeTransactionsExcludedFromReports` boolean (no default) controls whether transactions linked to categories flagged `excludeFromReports` are included (`true`) or dropped (`false`) before aggregating.
- An optional single `groupBy` (`account` | `category` | `month`) buckets results along one additional dimension. A category group can be `Uncategorized`.
- Every result is split by transaction `type` and then `currency` — these are never summed together, regardless of `groupBy` or the `types` filter, since blending different transaction types or currencies into one number is never meaningful.
- Requires a `basics` guide token, same as `get_transactions` and `get_categories`.
- Fails with an error if `categoryIds` names a category that is flagged `excludeFromReports` while `includeTransactionsExcludedFromReports` is `false` — that combination is self-contradictory and would otherwise return an indistinguishable-from-zero result.

## Capabilities

### Modified Capabilities

- `mcp-server`: adds the `aggregate_transactions` tool requirement (input, output shape, guide-token gating) alongside the existing `get_transactions`, `get_categories`, and other tool requirements.

## Impact

- New file `backend/src/services/aggregate-transactions-service.ts` (plus co-located test) holding the aggregation logic, orchestrating `TransactionRepository` and `CategoryRepository`.
- New file `backend/src/mcp/tools/aggregate-transactions.ts` (plus co-located test) — a thin wrapper that checks the guide token and calls `AggregateTransactionsService`, registered in `backend/src/mcp/server.ts`.
- No GraphQL schema, DynamoDB schema, or port interface changes — reuses `TransactionRepository.findManyByUserId`'s existing filters (`dateAfter`/`dateBefore`, `accountIds`, `categoryIds`, `includeUncategorized`, `types`).
- Does not touch `backend/src/langchain/tools/aggregate-transactions.ts` — that tool serves a different agent (create-transaction) and consumer; this is a separate, MCP-facing tool.
- Does not touch `ByCategoryReportService` or `ExpenseTrendService` — this tool is a general-purpose primitive, not a reuse of those report-specific services.

## Constitution Compliance

- **Backend Layer Structure / Service Layer**: aggregation logic (bucketing, exclusion filtering, the `categoryIds`/`excludeReportExcludedCategories` collision check) lives in a new single-purpose `AggregateTransactionsService`, orchestrating `TransactionRepository` and `CategoryRepository` — matching the existing `ByCategoryReportService`/`ExpenseTrendService` pattern rather than the thin repository-calling shape used by simpler tools like `get_transactions`. The MCP tool itself stays a thin wrapper: guide-token check, delegate to the service, map its `Result` to the MCP response.
- **Result Pattern**: returns `Result<...>` via `Success`/`Failure`, consistent with every other MCP tool.
- **Input Validation Ordering**: guide-token check, then cheap validation (date range), then the database query — same order as `get_transactions`.
- **Repository Pattern / Vendor Independence**: no new repository methods; aggregation runs in-memory over rows already returned by `findManyByUserId`, using only filters that already exist on the port.
- **Test Strategy**: co-located `aggregate-transactions.test.ts`, unit-tested with a fake repository.
- **Finder Method Naming / TypeScript standards**: no new finder methods introduced; new code follows existing naming and argument-passing conventions.

No violations identified.
