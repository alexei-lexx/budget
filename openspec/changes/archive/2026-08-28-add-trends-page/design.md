## Context

See proposal.md — Why. Requirements live in `specs/trends/spec.md` and `specs/navigation/spec.md`.

Relevant current state:

- `ByCategoryReportService` already computes net expenses as `sum(EXPENSE) - sum(REFUND)` for one month or one year, and already drops transactions in categories flagged `excludeFromReports`.
- `TransactionFilterInput` in `backend/src/ports/transaction-repository.ts` supports `accountIds`, `categoryIds`, `includeUncategorized`, `dateAfter`, `dateBefore` and `types`. It has no currency filter.
- `DynTransactionRepository` builds a DynamoDB filter expression from those fields, using an `IN` list per multi-select filter.
- The Expense Report frontend already computes the current year and month in the browser and sends them with the query. It also already syncs its period selection to the URL.
- `useCurrencies()` exposes `defaultCurrency`, the first entry of `supportedCurrencies`, which sorts the user's own account currencies ahead of the rest.
- The frontend has no charting library.

## Goals / Non-Goals

**Goals:**

- Put all trend arithmetic behind the service boundary, so the frontend renders finished numbers.
- Read the transactions for a whole trend in a single repository call.
- Reuse the Expense Report's existing patterns for currency defaults, URL state and error display.
- Add charting with the smallest dependency footprint that covers bars and reference lines.

**Non-Goals:**

- No currency conversion. One currency at a time.
- No income or refund trends. Expenses only, netted against refunds.
- No per-category breakdown inside a period. Each bar is one net total.
- No user-configurable week start.
- No change to the public GraphQL `TransactionFilterInput`.

## Decisions

### The client sends today's date

`ExpenseTrendInput` carries `today` as a `YYYY-MM-DD` string. The backend does not derive the current day itself.

The backend runs on Lambda in UTC. Deriving the day server-side would shift the running period for any user outside UTC. The Expense Report already sends the current year and month from the browser for the same reason.

- Alternative considered: an IANA timezone field on the input, with the backend deriving the date. Rejected — it adds a timezone dependency to the backend for information the client already holds.

### "Same point in past periods" means truncation, not scaling

For each completed period, sum only its first N days, where N is the elapsed day count of the running period. Take the median of those sums.

- Alternative considered: scale the full-period median by `N / periodLength`. Rejected — spending is lumpy at period start (rent, subscriptions), so scaling systematically misreports the running period.

`elapsedDays` counts today. A user on day 1 of a month compares against day 1 of each past month.

### `elapsedDays` is returned to the client

The UI needs it to label the second reference line ("median at day 12"). Returning it avoids duplicating the day arithmetic in the browser, where a mismatch with the backend would be invisible.

### `lookback` is an `Int`, validated in the service

The service accepts 3, 6 and 12, and returns `Failure` for anything else.

- Alternative considered: a GraphQL enum. Rejected — the constitution requires UPPER_CASE enum members, forcing `THREE`, `SIX`, `TWELVE`, which reads worse than a validated integer.

### An input object rather than positional arguments

`expenseTrend(input: ExpenseTrendInput!)`. There are six parameters. The constitution's argument rule prefers keyword arguments past two.

### Category selection mirrors the existing filter model

`categoryIds` plus optional `includeUncategorized`, exactly as `TransactionFilterInput` already models it. Omitting both means no category restriction. There is no "all categories" value.

- Alternative considered: an explicit "all" sentinel. Rejected — it duplicates the meaning of "omitted" and would need special-casing at every layer.

### The currency filter goes in the repository, not the service

`TransactionFilterInput` gains `currencies?: string[]`, and `DynTransactionRepository` adds it to the filter expression as an `IN` list, following the shape of the existing `accountIds` and `types` filters.

Filtering in the service would mean transferring every currency's transactions for 13 periods and discarding most of them. This is an internal port change only; the public GraphQL `TransactionFilterInput` is untouched.

The field is a `string[]`, not a single `string`, to match the plural shape of the neighbouring filters even though the trend query passes exactly one value.

### `ExpenseTrendService` is a single-purpose service

One public method, `call`, returning `Result<ExpenseTrend, string>`. Constructor takes the `TransactionRepository` and `CategoryRepository` ports.

Order of operations, following the constitution's validation ordering — cheap checks before any database round trip:

1. Validate `lookback` is one of 3, 6, 12.
2. Validate `today` parses as a real calendar date.
3. Validate `currency` is non-empty.
4. Build the period grid from `today`: the running period plus `lookback` completed periods. Months are calendar months; weeks run Monday to Sunday. Always `lookback + 1` entries.
5. One repository read: `findManyByUserId(userId, { dateAfter: earliestPeriodStart, dateBefore: today, types: [EXPENSE, REFUND], currencies: [currency], categoryIds, includeUncategorized })`.
6. Load the user's categories and drop every transaction in a category flagged `excludeFromReports`.
7. Net amount per transaction is `-transaction.signedAmount` — expenses positive, refunds negative. Same rule as `ByCategoryReportService`.
8. Bucket transactions into the grid to produce `points`. Empty periods yield `amount: 0`. The last point carries `isCurrent: true`.
9. `elapsedDays = daysBetween(currentPeriodStart, today) + 1`.
10. `pastMedian` — median of the completed points' amounts.
11. `pastMedianAtSamePoint` — median of, per completed period, the sum of its transactions in that period's first `elapsedDays` days.
12. `Success`.

Median of an even-sized set is the mean of the two middle values.

Step 6 is defensive: the picker never offers excluded categories, but the constitution makes services validate their own input regardless of caller.

`dateBefore: today` is required, not incidental. The running bar must represent elapsed spend, because it is compared against elapsed spend.

`ByCategoryReportService` throws `BusinessError` rather than returning a `Result`. The new service uses `Result`, per the constitution. Existing code is left alone.

### The two reference lines are extra line datasets, not an annotation plugin

`ExpenseTrendChart.vue` renders a mixed chart: one bar dataset plus two line datasets. Each line dataset is a flat array repeating its median across every label, drawn with `borderDash: [6, 4]` and `pointRadius: 0`.

- Alternative considered: `chartjs-plugin-annotation`. Rejected — a third dependency for a purely cosmetic need that two trivial datasets already cover.

The running period is coloured through a per-bar `backgroundColor` array keyed on `isCurrent`.

### Bar labels carry the period, tooltips carry the year

Every label is formatted from `periodStart` alone via `toLocaleDateString`, so the chart stays localised without a second date field on the API.

|       | Axis label                                      | Tooltip title                                        |
| ----- | ----------------------------------------------- | ---------------------------------------------------- |
| Month | `{ month: "short" }` — "Aug"                    | `{ month: "long", year: "numeric" }` — "August 2026" |
| Week  | `{ day: "numeric", month: "short" }` — "Aug 24" | "Aug 24 - Aug 30"                                    |

Dropping the year from the monthly axis label leaves a 12-period lookback with two bars reading "Aug", thirteen months apart. Accepted: the tooltip carries the year, and special-casing the widest lookback would make the axis inconsistent with itself.

The weekly tooltip range ends at `periodStart + 6 days`, derived in the chart component. This is formatting, not the arithmetic the service boundary exists to own — a week is always seven days, so there is no calendar rule to duplicate and no money involved. Month tooltips need no end date at all, which is why `ExpenseTrendPoint` gains no `periodEnd` field.

The running period's range is its whole period, not the elapsed part. The elapsed figure is already communicated by the second median line's label; repeating it here would imply the bar's period had been shortened rather than its total.

- Alternative considered: a `periodEnd` field on `ExpenseTrendPoint`. Rejected — only Week mode would read it, for a value that is `start + 6 days`, at the cost of a schema change and two codegen runs.

### The expense series is labelled "Expenses"

One locale value drives both the legend and the tooltip, so the series cannot be named two different things in one chart. "Net" is dropped as redundant: the requirement that refunds reduce a bar holds regardless of what the series is called, and the shorter label reads better in a narrow tooltip on a phone.

### Draft state in the filter component, committed state in the view

`TrendFilters.vue` holds the draft selection and emits it on Apply. `Trends.vue` holds a separate committed ref that drives the query. Nothing refetches until Apply.

Apply also writes the URL query parameters:

```
/trends?period=MONTH&lookback=6&currency=EUR&categories=a,b&uncategorized=1
```

On mount the URL is parsed and any invalid value falls back to its default rather than raising. Clear restores the defaults and strips the parameters. `ByCategoryReport.vue` already uses this URL-syncing pattern.

Defaults: period MONTH, lookback 3, currency `defaultCurrency`, no category restriction.

`today` is computed in the browser on mount and sent with every query.

### Load failures render in the page body

A `v-alert` in the page body, matching the Expense Report — not a snackbar. A page that failed to load is a persistent state, not transient feedback. The constitution's snackbar guideline covers action feedback; this is a page-level load state.

## Risks / Trade-offs

- [A user whose device clock or timezone is wrong gets a shifted running period] → Accepted. The alternative shifts the period for every non-UTC user instead of a few misconfigured ones. The Expense Report already makes this trade.
- [`currencies` is a DynamoDB filter expression, applied after the read, so it reduces payload but not consumed capacity] → Accepted. This matches every other filter on this repository, and the read is already bounded by the date range on `UserDateIndex`.
- [A 12-month lookback reads 13 months of EXPENSE and REFUND transactions in one call] → The Expense Report already reads a full year in yearly mode. No pagination is introduced.
- [`chart.js` and `vue-chartjs` are new frontend dependencies] → Both are client-side only and impose no hosting requirement, so vendor independence is unaffected.
- [Zero bars for empty periods can flatten the chart when the lookback is wide and data is sparse] → By design; the medians must count those periods. Narrowing the lookback is the user's remedy.
- [Two schema codegen steps must run in order across two packages] → Sequenced explicitly in tasks.md: backend schema and codegen first, then `codegen:sync-schema` and codegen in the frontend.

## Migration Plan

No data migration. No infrastructure change. The GraphQL change is purely additive, so the backend can deploy ahead of the frontend.

## Constitution Compliance

- **Schema-Driven Development**: `backend/src/graphql/schema.graphql` is edited first; both packages regenerate types before any consuming code is written.
- **Backend Layer Structure**: resolver authenticates and maps failures; `ExpenseTrendService` holds the logic; the repository only reads.
- **Backend Service Layer** (Single-Purpose Services): one public `call` method for a non-CRUD calculation.
- **Backend Port Interfaces**: `currencies` is added to the `TransactionRepository` port; `DynTransactionRepository` conforms.
- **Result Pattern**: `call` returns `Result<ExpenseTrend, string>`; validation failures use the failure variant, database errors propagate.
- **Input Validation** and **Validation Ordering**: lookback, date and currency are checked in the service before the repository read.
- **Authentication & Authorization**: the internal user ID comes from the authentication context and is passed to the service and the repository.
- **Backend GraphQL Layer**: the schema exposes only user-facing fields; no user ID in the input.
- **GraphQL Pagination Strategy**: `points` holds at most 13 entries, so a plain array is correct.
- **TypeScript Code Generation**: `TrendPeriod` members are UPPER_CASE and alphabetical (`MONTH`, `WEEK`); `call` takes an object argument; names are spelled in full.
- **Test Strategy**: service tests use mocked repositories; the new repository filter is tested against a real database connection; frontend is verified manually.
- **Vendor Independence**: the new dependencies are client-side; the DynamoDB filter uses only portable equality and `IN` semantics.
- **UI Guidelines** and **Frontend Code Discipline**: Vuetify selectors, mobile-first layout, minimal custom CSS.

No violations identified.
