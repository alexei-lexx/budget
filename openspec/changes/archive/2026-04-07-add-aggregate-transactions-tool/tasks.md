## 1. Implement `aggregateTransactions` Tool

- [x] 1.1 Create `backend/src/services/agent-tools/aggregate-transactions-tool.ts` — input schema mirrors `getTransactions` (startDate, endDate, accountIds, categoryIds, types) with same date validation (startDate ≤ endDate, max period ≤ MAX_PERIOD_DAYS)
- [x] 1.2 Implement `func`: call `transactionRepository.findManyByUserId` with filters, group results by currency, compute `sum` using `getSignedAmount` (expenses/transfers out negative, income/refunds/transfers in positive), return `{ sum: { [currency]: number }, count: { [currency]: number }, avg: { [currency]: number } }` via `Success`; return `Failure` for validation errors
- [x] 1.3 Create `backend/src/services/agent-tools/aggregate-transactions-tool.test.ts` covering all spec scenarios: valid aggregation, empty result, multi-currency, date range exceeded, startDate after endDate, type filter

## 2. Register Tool in Insight Service

- [x] 2.1 Import `createAggregateTransactionsTool` in `backend/src/services/agent-services/insight-service.ts` and add it to the `dataTools` array alongside `createGetTransactionsTool`

## 3. Validation

- [x] 3.1 Run tests for the new file: `npm test -- aggregate-transactions-tool` from `backend/` — fix any failures
- [x] 3.2 Run full backend test suite: `npm test` from `backend/` — ensure no regressions
- [x] 3.3 Run `npm run typecheck` and `npm run format` from `backend/` — fix all errors

## Constitution Compliance

- **Backend Layer Structure**: Tool is in the service layer (`agent-tools/`), depends on `TransactionRepository` port — no direct database access.
- **Result Pattern**: `func` returns `Result<AggregationResult>` using `Success`/`Failure`.
- **Test Strategy**: Test file co-located at `aggregate-transactions-tool.test.ts`. Repository is mocked (service-layer test).
- **Vendor Independence**: Aggregation computed in TypeScript over repository results — no DynamoDB-specific features.
- **TypeScript Code Quality**: Strict types, no `any`, descriptive naming throughout.
- **Code Quality Validation**: Tasks 3.1–3.3 enforce the constitution's mandatory validation pipeline.
