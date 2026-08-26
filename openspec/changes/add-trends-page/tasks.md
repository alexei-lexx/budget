## 1. GraphQL schema

- [x] 1.1 Add `TrendPeriod` enum (`MONTH`, `WEEK`), `ExpenseTrendInput`, `ExpenseTrendPoint` and `ExpenseTrend` types to `backend/src/graphql/schema.graphql`, and add `expenseTrend(input: ExpenseTrendInput!): ExpenseTrend!` to `type Query`
- [x] 1.2 Run `npm run codegen` in `backend/` and confirm the generated resolver types compile

## 2. Repository currency filter

- [x] 2.1 (use `testing` skill) Add cases to `backend/src/repositories/dyn-transaction-repository.test.ts` covering the `currencies` filter against a real database connection: a single currency matches only that currency's transactions, and an omitted filter matches every currency
- [x] 2.2 Add `currencies?: string[]` to `TransactionFilterInput` in `backend/src/ports/transaction-repository.ts`
- [x] 2.3 Add the `currencies` `IN` condition to the filter expression builder in `backend/src/repositories/dyn-transaction-repository.ts`, following the shape of the existing `accountIds` and `types` conditions
- [x] 2.4 Run `npm test -- src/repositories/dyn-transaction-repository.test.ts` in `backend/` and confirm the new cases pass

## 3. ExpenseTrendService

- [x] 3.1 (use `testing` skill) Write `backend/src/services/expense-trend-service.test.ts` with mocked `TransactionRepository` and `CategoryRepository`, `describe` blocks mirroring the source method order, covering: monthly grid construction; weekly grid construction starting Monday; `elapsedDays` including the running day; truncation of past periods to their first N days; median with an odd count and with an even count; periods with no transactions rendering as zero and pulling both medians down; transactions in `excludeFromReports` categories excluded; refunds netted against expenses; future-dated transactions inside the running period ignored; `Failure` for a lookback outside {3, 6, 12}, an unparseable `today`, and an empty currency; and `currencies` reaching the repository filter
- [x] 3.2 Implement `backend/src/services/expense-trend-service.ts` as a single-purpose service with one public `call` method returning `Result<ExpenseTrend, string>`, taking the two repository ports in its constructor, following the step order in design.md — Decisions
- [x] 3.3 Run `npm test -- src/services/expense-trend-service.test.ts` in `backend/` and confirm every case passes

## 4. Resolver and wiring

- [x] 4.1 Add an `expenseTrend` resolver that authenticates via the context, calls the service with the internal user ID, and maps `Failure` to a GraphQL error
- [x] 4.2 Register `ExpenseTrendService` in `backend/src/dependencies.ts` and add it to the GraphQL context in `backend/src/server.ts`
- [x] 4.3 Run `npm test`, then `npm run typecheck` and `npm run format` in `backend/`, and fix everything they report

## 5. Frontend schema sync

- [x] 5.1 Add the `expenseTrend` query document to `frontend/src/graphql/queries.ts`
- [x] 5.2 Run `npm run codegen:sync-schema && npm run codegen` in `frontend/` and confirm the generated composable and types appear

## 6. Frontend dependencies

- [x] 6.1 Add `chart.js` and `vue-chartjs` to `frontend/package.json` and install them

## 7. Frontend units

- [x] 7.1 Write `frontend/src/composables/useExpenseTrend.ts`, wrapping the generated query with `cache-and-network` and taking the committed selection as a reactive source, following `useByCategoryReport.ts`
- [x] 7.2 Write `frontend/src/components/TrendFilters.vue` holding the draft selection and emitting it on Apply: category multi-select over active expense categories excluding those flagged "Exclude from reports" and offering an "Uncategorized" entry, a Week/Month toggle, a 3/6/12 lookback toggle, a currency autocomplete seeded from `useCurrencies().defaultCurrency`, and Apply and Clear controls
- [x] 7.3 Write `frontend/src/components/ExpenseTrendChart.vue` as a `vue-chartjs` mixed chart: one bar dataset with a per-bar `backgroundColor` array keyed on `isCurrent`, plus two flat dashed line datasets for `pastMedian` and `pastMedianAtSamePoint`, the second labelled with `elapsedDays`
- [x] 7.4 Write `frontend/src/views/Trends.vue` holding the committed selection, computing `today` on mount, rendering the filters and the chart, and showing a `v-alert` in the page body on load failure

## 8. Route, navigation and locales

- [x] 8.1 Add the `/trends` route to `frontend/src/router/index.ts`, guarded by `requireAuth`, with `meta.titleKey: "nav.trends"`
- [x] 8.2 Add the "Trends" navigation item after "Reports" in `frontend/src/App.vue`
- [x] 8.3 Add `nav.trends` and a `trends.*` block covering the selector labels, the two median-line legends and the error state to `frontend/src/locales/en.json` and `frontend/src/locales/de.json`
- [x] 8.4 Run `npm run typecheck` and `npm run format` in `frontend/` and fix everything they report

## 9. Manual verification

- [x] 9.1 Confirm the chart draws `lookback + 1` bars for each of 3, 6 and 12, in both Week and Month modes, with the running bar coloured distinctly
- [x] 9.2 Confirm both dashed median lines render, and that the same-point line's label shows the elapsed day count
- [x] 9.3 Confirm nothing refetches until Apply, that Apply writes the URL parameters, that reloading the URL restores the selection, and that Clear restores the defaults and strips the parameters
- [x] 9.4 Confirm an invalid URL parameter falls back to its default without an error
- [x] 9.5 Confirm categories flagged "Exclude from reports" are absent from the picker and contribute to no bar
- [x] 9.6 Confirm the page is usable on phone, tablet and desktop, and that the navigation menu shows Trends after Reports

## 10. Selector and label revisions

- [x] 10.1 Change the default lookback in `frontend/src/views/Trends.vue` from 6 to 3
- [x] 10.2 Drop the year from the monthly axis label in `frontend/src/components/reports/ExpenseTrendChart.vue`, leaving `{ month: "short" }`
- [x] 10.3 Add a tooltip title callback to the same component: months render `{ month: "long", year: "numeric" }`, weeks render `periodStart` to `periodStart + 6 days` as a range, including the running week
- [x] 10.4 Rename the `trends.chart.netExpenses` key to `trends.chart.expenses` and change its value to "Expenses" / "Ausgaben" in `frontend/src/locales/en.json` and `frontend/src/locales/de.json`, updating the reference in the chart component
- [x] 10.5 Run `npm run typecheck` and `npm run format` in `frontend/` and fix everything they report
- [x] 10.6 Confirm the page opens with 4 bars, that monthly labels read as bare short months, that a weekly tooltip shows its full range and a monthly tooltip its month and year, and that legend and tooltip both read "Expenses"
- [x] 10.7 Give every control in `frontend/src/components/reports/TrendFilters.vue` `density="compact"`, scoped to this component rather than a global `defaults` block in `frontend/src/plugins/vuetify.ts`
- [x] 10.8 Label the two `v-btn-toggle` groups with `<v-label class="d-block mb-1">` instead of a `text-caption` div, following Vuetify's density and sizing page

## Constitution Compliance

- **Schema-Driven Development**: section 1 edits the schema and regenerates before any consuming code; section 5 syncs the frontend before its units are written.
- **Test Strategy**: the repository filter is tested against a real database connection (2.1), the service against mocked repositories (3.1), and the frontend manually (section 9). Tests are co-located next to their source files.
- **Method Ordering**: the service test's `describe` blocks mirror the source method order (3.1).
- **Code Quality Validation**: the changed file's tests run first (2.4, 3.3), then the full suite, then typecheck and format (4.3, 8.4).
- **Backend Layer Structure** and **Result Pattern**: sections 3 and 4 keep logic in the service and leave the resolver to authentication and error mapping.
- **Backend Port Interfaces**: 2.2 changes the port, 2.3 changes the adapter.
- **Input Validation**: the service self-validates before its repository read (3.2), with failure cases pinned by tests (3.1).
- **UI Guidelines** and **Frontend Code Discipline**: section 7 uses Vuetify components for every selector; 9.6 verifies responsiveness.
- **Code Quality Validation**: the label revisions in section 10 close with typecheck and format (10.5) and a manual re-check (10.6); the frontend has no test suite covering these components.
- **Frontend Code Discipline**: 10.7 and 10.8 replace a hand-rolled label class with the framework's own `v-label` and keep density a component-level choice; both were applied and verified visually ahead of 10.1-10.6.

No violations identified.
