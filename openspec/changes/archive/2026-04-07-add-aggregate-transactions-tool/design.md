## Context

The AI insight feature uses a set of agent tools to answer user financial questions. The existing `getTransactions` tool returns full transaction rows. Weak AI models (e.g. openai-oss) run out of output tokens when trying to aggregate 20–100+ rows manually.

Existing math tools (`sum`, `avg`, `calculate`) require the model to first fetch raw rows, extract an array of amounts, then call the math tool — still forcing the model to process all rows.

Tools are registered in `InsightService` and wired with the agent. The pattern is factory functions returning a `ToolSignature<TInput, TOutput>`.

## Goals / Non-Goals

**Goals:**

- Add a single `aggregateTransactions` tool that performs server-side aggregation
- Output is always compact: `{ sum, count, avg }` keyed by currency
- Reuse existing repository method and filter infrastructure
- No changes to GraphQL schema, frontend, or existing tools

**Non-Goals:**

- `groupBy` by category, account, or month — the model can call the tool with narrow date ranges or category filters directly
- Database-level aggregation — DynamoDB has no native SUM/COUNT; TS aggregation is equivalent
- Replacing `getTransactions` — raw rows remain available for model use when needed

## Decisions

### Output schema: metric-first, currency as nested key

**Decision**: `{ sum: { USD: 450 }, count: { USD: 12 }, avg: { USD: 37.5 } }`

**Rationale**: A weak model's question is "what is the sum?" — the metric is the primary lookup, currency is a detail underneath. The alternative (currency-first: `{ USD: { sum: 450, count: 12 } }`) requires the model to know the currency upfront. Metric-first lets the model read `sum` and then discover currencies. For the common single-currency case the value is minimal: `sum: { EUR: 400 }`.

**Alternative considered**: Flat array `[{ currency, sum, count }]` — clean for humans but requires the model to filter/iterate rows, which defeats the purpose.

### Single tool, no `groupBy`

**Decision**: One `aggregateTransactions` tool with no `groupBy` parameter.

**Rationale**: `groupBy: "month"` is unnecessary — the model can call the tool with a monthly date range. `groupBy: "category"` would produce a potentially large map and require the model to navigate it. Keeping the output always `{ sum, count, avg }` guarantees the model can answer with a single key lookup regardless of what it asked.

### Sum uses signed cashflow convention

**Decision**: `sum` (and therefore `avg`) uses the existing `getSignedAmount` utility from `transaction.ts`. Expenses and transfers out are negative; income, refunds, and transfers in are positive. With no type filter, `sum` represents net cashflow. The tool description makes this explicit so the model can interpret results without reasoning about signs itself.

**Rationale**: Requiring the model to always pass the correct `types` filter to get a meaningful sum is fragile — weak models can and do omit it. A signed sum is always financially meaningful regardless of which types are included. The `getSignedAmount` convention already exists in the codebase and is the established project standard.

**Alternative considered**: Unsigned sum with mandatory `types` filter guidance — too fragile for weak models; a missing filter produces a nonsense number silently.

### Aggregation in TypeScript at the tool layer

**Decision**: Call `transactionRepository.findManyByUserId` with filters, then group and aggregate in TypeScript.

**Rationale**: DynamoDB has no native aggregation primitives. Any aggregation must happen in application code. The tool layer already has repository access, so no new repository methods are needed. This also satisfies the constitution's vendor independence principle.

### `avg` pre-computed in output

**Decision**: Include `avg` in the output even though it's derivable from `sum / count`.

**Rationale**: Saves a weak model from performing division, which is an additional reasoning step that could fail or consume output tokens.

## Risks / Trade-offs

- **Large datasets**: The tool fetches all matching transactions before aggregating. For very large date ranges or users with many transactions, this could be slow. Mitigation: the existing `MAX_PERIOD_DAYS` constraint (365 days) bounds the dataset.
- **Currency precision**: Floating-point arithmetic for financial sums may introduce minor rounding errors. Mitigation: acceptable for AI-generated approximate answers; exact accounting uses the database directly.

## Migration Plan

No data migrations required. The new tool is additive — register it in `InsightService` alongside existing tools. No rollback needed; removing the tool from registration restores previous behavior.

## Constitution Compliance

- **Backend Layer Structure**: Tool lives in the service layer, depends on `TransactionRepository` port. No repository bypass.
- **Result Pattern**: `func` returns `Result<AggregationResult>` via `Success`/`Failure`.
- **Vendor Independence**: Aggregation is in TypeScript, no DynamoDB-specific features.
- **Test Strategy**: Tool file co-located with test file. Repository mocked in service tests.
- **TypeScript Code Quality**: Strict types, no `any`, descriptive naming.
- **Finder Method Naming**: Uses `findManyByUserId` which follows the `findMany` naming convention for arrays.
