## 1. Service Layer

- [x] 1.1 (use `testing` skill) Write `backend/src/services/aggregate-transactions-service.test.ts` covering: sum/count/min/max per `type`/`currency` combination; no `groupBy`; `groupBy` = `ACCOUNT`/`CATEGORY`/`MONTH` (including the `null` category bucket for uncategorized transactions); empty combinations omitted; `categoryIds`/`includeUncategorized` passed through to the repository filter; `includeTransactionsExcludedFromReports` = `false` drops transactions linked to an `excludeFromReports` category (using a fake `CategoryRepository`); `includeTransactionsExcludedFromReports` = `true` skips the category lookup entirely; inverted date range rejected; date range over `MAX_PERIOD_DAYS` rejected; self-contradictory `categoryIds` (naming an excluded category while `includeTransactionsExcludedFromReports` is `false`) rejected
- [x] 1.2 Implement `backend/src/services/aggregate-transactions-service.ts`:
  - `AggregateGroupBy` union type (`"ACCOUNT" | "CATEGORY" | "MONTH"`), following the `ReportType` precedent in `by-category-report-service.ts`
  - `AggregateTransactionsInput` and `AggregateTransactionsResult` interfaces matching specs/mcp-server/spec.md's input/output shape
  - `AggregateTransactionsService` class, constructor-injecting `TransactionRepository` and `CategoryRepository`, exposing a single `call()` method
  - `call()` validates in order: `startDate` not after `endDate`; range not exceeding `MAX_PERIOD_DAYS` (reuse the 365-day constant, matching `get_transactions`); when `includeTransactionsExcludedFromReports` is `false`, load categories via `findManyWithArchivedByUserId`, build the excluded-category `Set`, and fail if any input `categoryIds` intersects it
  - `call()` fetches transactions via `transactionRepository.findManyByUserId` passing `dateAfter`/`dateBefore`/`accountIds`/`categoryIds`/`includeUncategorized`/`types` straight through (spread only when defined, matching `get_transactions`'s convention)
  - When `includeTransactionsExcludedFromReports` is `false`, filter out transactions whose `categoryId` is in the excluded-category `Set` built above
  - Bucket transactions in one pass into a `Map` keyed by `(type, currency, groupValue)`, accumulating `sum` (via `amount`, not `signedAmount`), `count`, `min`, `max`; `groupValue` is absent, `accountId`, `categoryId ?? null`, or `date.slice(0, 7)` depending on `groupBy`
  - Return `Success` with `Map.values()` spread into the output shape (only including `accountId`/`categoryId`/`month` when that `groupBy` was requested)

## 2. Dependency Wiring

- [x] 2.1 Add `resolveAggregateTransactionsService` singleton to `backend/src/dependencies.ts`, constructing `AggregateTransactionsService` from `resolveTransactionRepository()` and `resolveCategoryRepository()`, alongside the existing report service singletons

## 3. MCP Tool

- [x] 3.1 (use `testing` skill) Write `backend/src/mcp/tools/aggregate-transactions.test.ts` covering: missing/invalid guide token rejected before the service is called; valid input delegates to `AggregateTransactionsService.call()` and returns its `Result` unchanged (using a fake/mocked service)
- [x] 3.2 Implement `backend/src/mcp/tools/aggregate-transactions.ts` following the `create-transaction.ts` pattern (service-backed tool, not repository-backed like `get-transactions.ts`):
  - `aggregateTransactions()` function: verify `guideTokens` against `requiredGuides = ["basics"]`, then call `aggregateTransactionsService.call()` and return its `Result`
  - Zod `inputSchema`: `startDate`/`endDate` (`z.iso.date()`), `accountIds`/`categoryIds` (optional string arrays), `includeUncategorized` (optional boolean), `types` (optional array of `z.enum(TransactionType)`), `includeTransactionsExcludedFromReports` (required boolean), `groupBy` (optional `z.enum(["ACCOUNT", "CATEGORY", "MONTH"])`), `guideTokens` via `buildGuideTokensField(requiredGuides)`
  - Tool `description` documenting the type/currency split, the `includeTransactionsExcludedFromReports` requirement, and the `groupBy` options
  - `createAggregateTransactionsTool(deps)` following `createCreateTransactionTool`'s shape, taking `{ aggregateTransactionsService, userId }`

## 4. Registration

- [x] 4.1 Register the new tool in `backend/src/mcp/server.ts`: import `resolveAggregateTransactionsService` and `createAggregateTransactionsTool`, resolve the service alongside the other services, and add `createAggregateTransactionsTool({ aggregateTransactionsService, userId })` to the `tools` array in alphabetical position

## 5. Validation

- [x] 5.1 Run `npm test` in `backend/` and fix any failures
- [x] 5.2 Run `npm run typecheck` and `npm run format` in `backend/` and resolve all issues
- [x] 5.3 Run `npx prettier --write openspec/` to format the change's artifacts

## Constitution Compliance

- **Backend Layer Structure / Service Layer**: aggregation logic lives in single-purpose `AggregateTransactionsService.call()`, orchestrating `TransactionRepository` and `CategoryRepository`; the MCP tool stays a thin wrapper (guide-token check, delegate, return `Result`).
- **Result Pattern**: `call()` and `aggregateTransactions()` both return `Result<...>` via `Success`/`Failure`.
- **Input Validation Ordering**: guide-token check (tool) → cheap date-range checks → database-dependent category-collision check → transaction fetch (service).
- **Repository Pattern / Vendor Independence**: no new repository or port methods; reuses `findManyByUserId` and `findManyWithArchivedByUserId` as-is.
- **Test Strategy**: co-located `aggregate-transactions-service.test.ts` (fake repositories) and `aggregate-transactions.test.ts` (fake/mocked service).
- **Finder Method Naming / TypeScript standards**: no new finder methods; `groupBy` modeled as a union type, not an enum, matching `ReportType`.

No violations identified.
