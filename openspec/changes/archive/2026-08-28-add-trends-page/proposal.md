## Why

The Expense Report shows one period at a time. It cannot answer whether spending habits are changing. Users need to see net expenses for a chosen slice of their spending across many periods at once.

Users also need to judge the period that is still running. A partial period always looks low next to completed periods. The page must offer a like-with-like benchmark alongside the full-period one.

## What Changes

- New Trends page at `/trends`, showing net expenses as a bar chart across consecutive periods.
- Users pick the slice: categories (or no restriction), period type (Week or Month), lookback (3, 6 or 12 past periods), and a single currency.
- The chart draws two dashed reference lines: the median of the completed periods, and the median of those same periods truncated to the same number of elapsed days as the running period.
- The running period's bar is coloured distinctly and covers only elapsed days.
- Selections apply on demand, not on every keystroke. The applied selection is written to the URL so the view is bookmarkable.
- New GraphQL query `expenseTrend(input: ExpenseTrendInput!): ExpenseTrend!`.
- Navigation menu gains a "Trends" item after "Reports".
- Categories flagged "Exclude from reports" are hidden from the picker and from every total.
- Frontend gains `chart.js` and `vue-chartjs` dependencies.

## Capabilities

### New Capabilities

- `trends`: the Trends page — slice selectors, the multi-period expense bar chart, the two median reference lines, the running-period treatment, URL state, and error handling.

### Modified Capabilities

- `navigation`: the Section Navigation requirement changes from six menu items to seven, with "Trends" placed after "Reports".

## Impact

- **API**: `backend/src/graphql/schema.graphql` gains `TrendPeriod`, `ExpenseTrendInput`, `ExpenseTrendPoint`, `ExpenseTrend`, and the `expenseTrend` query. No breaking changes.
- **Backend**: new `ExpenseTrendService`; new resolver; `TransactionFilterInput` port gains an internal `currencies` filter, honoured by `DynTransactionRepository`.
- **Frontend**: new `Trends.vue` view, `useExpenseTrend` composable, `TrendFilters.vue` and `ExpenseTrendChart.vue` components, new route, new nav item, new `nav.trends` and `trends.*` locale keys in `en.json` and `de.json`.
- **Dependencies**: `chart.js` and `vue-chartjs` added to `frontend/package.json`. Both run in the browser and impose no hosting requirement.
- **Data**: no migration. No infrastructure change.

## Constitution Compliance

- **Schema-Driven Development**: the change starts with `backend/src/graphql/schema.graphql`, then `npm run codegen` in `backend/`, then `npm run codegen:sync-schema && npm run codegen` in `frontend/`.
- **Backend Layer Structure**: resolver authenticates and maps errors; `ExpenseTrendService` holds all business logic; the repository only reads. The frontend does no arithmetic.
- **Backend Service Layer** (Single-Purpose Services): `ExpenseTrendService` exposes one public method, `call`, for a non-CRUD calculation.
- **Backend Port Interfaces**: the `currencies` filter is added to the `TransactionRepository` port in `src/ports/`, and `DynTransactionRepository` conforms.
- **Result Pattern**: `call` returns `Result<ExpenseTrend, string>`; validation failures use the failure variant.
- **Input Validation**: the service self-validates lookback, date, and currency. Cheap checks run before any database round trip.
- **Authentication & Authorization**: the internal user ID comes from the authentication context, never from the query input.
- **GraphQL Pagination Strategy**: `points` is a short list (at most 13 entries), so a plain array is returned without a pagination wrapper.
- **Test Strategy**: service tested with mocked repositories; the new repository filter tested against a real database connection; frontend verified manually.
- **Vendor Independence**: `chart.js` and `vue-chartjs` are client-side libraries; the frontend stays deployable to any static host.
- **UI Guidelines** and **Frontend Code Discipline**: Vuetify components for all selectors, mobile-first layout, minimal custom CSS.

No violations identified.
