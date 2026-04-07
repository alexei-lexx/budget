## Issue

[#365](https://github.com/alexei-lexx/budget/issues/365) — Add transaction aggregation tool for AI agent

## Why

Weak AI models (e.g. openai-oss) cannot reliably process large transaction datasets returned by `getTransactions`. When a user asks a question that involves 20–100+ transactions, the model attempts to aggregate the raw rows itself, exhausts its output token budget, and fails to answer. Moving aggregation server-side eliminates this problem: the model receives a compact numeric summary instead of a large table.

## What Changes

- **New agent tool `aggregateTransactions`**: accepts the same date-range and filter parameters as `getTransactions` (startDate, endDate, accountIds, categoryIds, types) and returns pre-computed `sum`, `count`, and `avg` per currency.
- The tool performs all aggregation in the service layer (TypeScript) by calling the existing `findManyByUserId` repository method, then grouping results by currency.
- Output schema is always `{ sum: { [currency]: number }, count: { [currency]: number }, avg: { [currency]: number } }` — consistent regardless of input, requiring only a key lookup from the model.
- The model controls transaction type selection via the existing `types` filter; no type breakdown in output is needed.
- Existing tools (`getTransactions`, `sum`, `avg`, `calculate`) are unchanged.

## Capabilities

No new user-facing capabilities. This is an internal quality improvement — the AI agent already promises to answer financial questions (Insight spec); this change makes it more reliable for large datasets without altering any visible behavior.

## Impact

- **Backend only** — no GraphQL schema changes, no frontend changes.
- New file: `backend/src/services/agent-tools/aggregate-transactions-tool.ts` (+ test file).
- The tool must be registered wherever the agent tools are wired together.

## Constitution Compliance

- **Backend Layer Structure**: Tool lives in the service layer, calls the existing `TransactionRepository` port — no repository bypass.
- **Result Pattern**: Tool `func` returns `Result<AggregationResult>` via `Success`/`Failure`.
- **Test Strategy**: New tool file is co-located with its test file (`aggregate-transactions-tool.test.ts`). Repository is mocked in service-layer tests.
- **Vendor Independence**: Aggregation is performed in TypeScript over repository results — no DynamoDB-specific aggregation features used.
- **TypeScript Code Quality**: Strict types, no `any`, descriptive names.
