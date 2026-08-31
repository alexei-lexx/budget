## ADDED Requirements

### Requirement: Aggregate Transactions via MCP

The system SHALL provide an MCP tool named `aggregate_transactions` that computes `sum`, `count`, `min`, and `max` over the authenticated user's transactions matching a filter, without returning the transactions themselves.

Results SHALL always be split by transaction `type` and then by `currency` — a result SHALL NOT blend amounts of different types or different currencies together, regardless of `groupBy` or the `types` filter.

**Requires guides:** `basics`

**Input:**

- `startDate` (required, string, format `YYYY-MM-DD`) — inclusive start of the date range
- `endDate` (required, string, format `YYYY-MM-DD`) — inclusive end of the date range
- `accountIds` (optional, array of strings) — restrict results to these account IDs
- `categoryIds` (optional, array of strings) — restrict results to these category IDs
- `includeUncategorized` (optional, boolean) — when `true`, also include transactions with no category
- `types` (optional, array of enum: `INCOME`, `EXPENSE`, `TRANSFER_IN`, `TRANSFER_OUT`, `REFUND`) — restrict results to these transaction types
- `includeTransactionsExcludedFromReports` (required, boolean) — when `false`, transactions linked to a category flagged `excludeFromReports` are dropped before aggregating; when `true`, they are included
- `groupBy` (optional, enum: `ACCOUNT`, `CATEGORY`, `MONTH`) — buckets each type/currency split further along one additional dimension
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns (on success):** a flat array of aggregate result objects — one object per combination of `type`, `currency`, and (when `groupBy` is supplied) grouping dimension that has at least one matching transaction. A combination with no matching transactions does not appear in the array. Each object stands alone, carrying its own `type`, `currency`, and grouping field with no further nesting, and has:

- `type` (enum: `INCOME`, `EXPENSE`, `TRANSFER_IN`, `TRANSFER_OUT`, `REFUND`)
- `currency` (string) — currency code
- `accountId` (string, present only when `groupBy` is `ACCOUNT`) — the account this result is grouped by
- `categoryId` (string or `null`, present only when `groupBy` is `CATEGORY`, absent entirely otherwise; `null` for the group of transactions with no category) — the category this result is grouped by
- `month` (string, format `YYYY-MM`, present only when `groupBy` is `MONTH`) — the month this result is grouped by
- `sum` (number) — total of matching transaction amounts
- `count` (number) — number of matching transactions
- `min` (number) — smallest matching transaction amount
- `max` (number) — largest matching transaction amount

**Returns (on failure):** a failure result describing the violated rule; no aggregate results are returned.

**Validation:**

- `startDate` MUST NOT be after `endDate`
- The range between `startDate` and `endDate` MUST NOT exceed 365 days
- `categoryIds` MUST NOT name a category flagged `excludeFromReports` while `includeTransactionsExcludedFromReports` is `false` — that combination is self-contradictory, since the named category would be excluded before aggregating and the request would otherwise return an indistinguishable-from-zero result

#### Scenario: Agent aggregates transactions in a date range

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `aggregate_transactions` with a valid `startDate`, `endDate`, and `includeTransactionsExcludedFromReports`, and a valid `basics` guide token
- **THEN** the tool returns one result per combination of `type` and `currency` found among the user's own matching transactions, each with `sum`, `count`, `min`, and `max`, and no other user's transactions are included, for example:

```json
[
  {
    "type": "EXPENSE",
    "currency": "USD",
    "sum": 897.5,
    "count": 16,
    "min": 12.0,
    "max": 220.0
  },
  {
    "type": "INCOME",
    "currency": "USD",
    "sum": 3000.0,
    "count": 1,
    "min": 3000.0,
    "max": 3000.0
  }
]
```

#### Scenario: Agent filters by account, category, and type

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `aggregate_transactions` with `accountIds`, `categoryIds`, and/or `types` in addition to a date range, `includeTransactionsExcludedFromReports`, and a valid `basics` guide token
- **THEN** only transactions matching all supplied filters are included in the aggregation

#### Scenario: Agent includes uncategorized transactions in a category filter

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `aggregate_transactions` with `includeUncategorized` = `true` alongside zero or more `categoryIds`, a date range, `includeTransactionsExcludedFromReports`, and a valid `basics` guide token
- **THEN** transactions with no category are included in the aggregation, along with transactions in any of the given category IDs — categories not named in `categoryIds` are excluded

#### Scenario: Agent excludes report-excluded categories

- **GIVEN** an authenticated MCP connection and the user has transactions in a category flagged `excludeFromReports`
- **WHEN** the agent invokes `aggregate_transactions` with `includeTransactionsExcludedFromReports` = `false`, a date range, and a valid `basics` guide token
- **THEN** transactions linked to a category flagged `excludeFromReports` are dropped before computing `sum`, `count`, `min`, and `max`

#### Scenario: Agent includes report-excluded categories

- **GIVEN** an authenticated MCP connection and the user has transactions in a category flagged `excludeFromReports`
- **WHEN** the agent invokes `aggregate_transactions` with `includeTransactionsExcludedFromReports` = `true`, a date range, and a valid `basics` guide token
- **THEN** transactions linked to a category flagged `excludeFromReports` are included in the aggregation

#### Scenario: Agent groups results by account

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `aggregate_transactions` with `groupBy` = `ACCOUNT`, a date range, `includeTransactionsExcludedFromReports`, and a valid `basics` guide token
- **THEN** each result additionally carries an `accountId`, and results for different accounts are never combined, for example:

```json
[
  {
    "type": "EXPENSE",
    "currency": "USD",
    "accountId": "a1b2c3d4-...",
    "sum": 620.0,
    "count": 9,
    "min": 15.0,
    "max": 200.0
  },
  {
    "type": "EXPENSE",
    "currency": "EUR",
    "accountId": "b5e6f708-...",
    "sum": 340.75,
    "count": 5,
    "min": 20.25,
    "max": 150.0
  }
]
```

#### Scenario: Agent groups results by category

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `aggregate_transactions` with `groupBy` = `CATEGORY`, a date range, `includeTransactionsExcludedFromReports`, and a valid `basics` guide token
- **THEN** each result additionally carries a `categoryId` — a category ID for a categorized bucket, `null` for the bucket of transactions with no category — and results for different categories are never combined, for example:

```json
[
  {
    "type": "EXPENSE",
    "currency": "USD",
    "categoryId": "3f9a2e10-...",
    "sum": 842.5,
    "count": 14,
    "min": 12.0,
    "max": 220.0
  },
  {
    "type": "EXPENSE",
    "currency": "USD",
    "categoryId": null,
    "sum": 55.0,
    "count": 2,
    "min": 20.0,
    "max": 35.0
  }
]
```

#### Scenario: Agent groups results by month

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `aggregate_transactions` with `groupBy` = `MONTH`, a date range, `includeTransactionsExcludedFromReports`, and a valid `basics` guide token
- **THEN** each result additionally carries a `month` in `YYYY-MM` format, and results for different months are never combined, for example:

```json
[
  {
    "type": "EXPENSE",
    "currency": "USD",
    "month": "2026-01",
    "sum": 680.0,
    "count": 11,
    "min": 12.0,
    "max": 200.0
  },
  {
    "type": "EXPENSE",
    "currency": "USD",
    "month": "2026-02",
    "sum": 217.5,
    "count": 5,
    "min": 15.0,
    "max": 220.0
  }
]
```

#### Scenario: Results are never blended across type or currency

- **GIVEN** an authenticated MCP connection and the user has matching transactions of more than one `type` or more than one `currency`
- **WHEN** the agent invokes `aggregate_transactions` with a date range, `includeTransactionsExcludedFromReports`, and a valid `basics` guide token, with or without `groupBy` or `types`
- **THEN** the tool returns a separate result for each `type`/`currency` combination and never sums across types or currencies — never a row like `{ "type": "EXPENSE", "sum": 1238.25 }` combining a USD total and a EUR total, and never a row combining `EXPENSE` and `INCOME`

#### Scenario: Combination with no matching transactions is omitted

- **GIVEN** an authenticated MCP connection and a filter under which some `type`/`currency`/group combination has no matching transactions
- **WHEN** the agent invokes `aggregate_transactions` with that filter, `includeTransactionsExcludedFromReports`, and a valid `basics` guide token
- **THEN** the results array contains no object for that combination — not a row with `sum: 0, count: 0`

#### Scenario: Inverted date range is rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `aggregate_transactions` with a `startDate` after `endDate`, `includeTransactionsExcludedFromReports`, and a valid `basics` guide token
- **THEN** the tool reports a validation failure and returns no aggregate results

#### Scenario: Date range exceeding the limit is rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `aggregate_transactions` with a date range spanning more than 365 days, `includeTransactionsExcludedFromReports`, and a valid `basics` guide token
- **THEN** the tool reports a validation failure and returns no aggregate results

#### Scenario: Self-contradictory category exclusion is rejected

- **GIVEN** an authenticated MCP connection and a category flagged `excludeFromReports`
- **WHEN** the agent invokes `aggregate_transactions` with `categoryIds` naming that category, `includeTransactionsExcludedFromReports` = `false`, a date range, and a valid `basics` guide token
- **THEN** the tool reports a validation failure and returns no aggregate results

#### Scenario: Agent invokes `aggregate_transactions` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `aggregate_transactions` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and no aggregate results are returned
