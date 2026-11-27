# Tasks

## 1. GraphQL Schema

- [x] 1.1 In `backend/src/graphql/schema.graphql`, add `pastMeanAtSamePoint: Float!` to `ExpenseTrend` after `pastMean`; run `npm run codegen` in `backend/` and verify that it succeeds and that `backend/src/__generated__/resolvers-types.ts` has the field

## 2. Backend Trend Calculation

- [x] 2.1 In `backend/src/services/expense-trend-service.test.ts`, add the test "returns mean of completed period amounts truncated to elapsed days" that spies on `mean`, has today `2000-04-12`, a lookback of 3, completed months with 100, 200, and 300 on or before day 12 and 900, 0, and 300 after day 12, and expects `pastMeanAtSamePoint: 200`, `pastMean: 600`, and a `mean` call with `[100, 200, 300]`; verify with `npm test -- src/services/expense-trend-service.test.ts` in `backend/` that the new test fails
- [x] 2.2 In the same file, add the test "returns truncated mean counting periods without transactions as zero" that has completed months with no transactions in their first 12 days and expects a `mean` call with the zeros of those months; verify that the test fails
- [x] 2.3 In `backend/src/services/expense-trend-service.ts`, add `pastMeanAtSamePoint: number` to the `ExpenseTrend` interface and return `pastMeanAtSamePoint: mean(pastAmountsAtSamePoint)`; update the class doc comment to name two means; verify that the tests from 2.1 and 2.2 pass and that `npm run typecheck` in `backend/` passes

## 3. Frontend Same-Point Mean Line

- [x] 3.1 In `frontend/src/graphql/queries.ts`, add `pastMeanAtSamePoint` to the expense trend query after `pastMean`; run `npm run codegen` in `frontend/`, which also copies the backend schema to `frontend/src/schema.graphql`, and verify that it succeeds and that the copy has `pastMeanAtSamePoint`
- [x] 3.2 Add `trends.chart.pastMeanAtSamePoint` with "Mean of past periods at day {days}" to `frontend/src/locales/en.json` and with "Durchschnitt der vergangenen Zeiträume an Tag {days}" to `frontend/src/locales/de.json`; verify with `npm run typecheck` in `frontend/`
- [x] 3.3 In `frontend/src/components/reports/ExpenseTrendChart.vue`, add a `line` dataset after the full-period mean dataset with the label `t("trends.chart.pastMeanAtSamePoint", { days: props.trend.elapsedDays })`, the data `props.trend.pastMeanAtSamePoint` for each point, `borderColor: colors.value.error`, the same dash, width, point radius, and order as the other reference lines, and `hidden: true`; verify with `npm run typecheck` in `frontend/`

## 4. Validation

- [x] 4.1 Run `npm test`, `npm run typecheck`, and `npm run format` in `backend/`, and verify that all pass with no ESLint issues
- [x] 4.2 Run `npx -y node@24 node_modules/vitest/vitest.mjs run`, `npm run typecheck`, and `npm run format` in `frontend/`, and verify that all pass with no ESLint issues
- [x] 4.3 In the running app at a phone width of 360 px, open the Trends page and verify the spec scenarios: the legend has an entry "Mean of past periods at day N" with N equal to the elapsed days, the line is not drawn; a click on the entry draws a dashed red line at the mean of the truncated values while the full-period mean stays hidden; the German locale shows "Durchschnitt der vergangenen Zeiträume an Tag N"; and a page reload hides the line again

## Constitution Compliance

- **Schema-Driven Development**: group 1 changes the schema and runs the backend code generation before any code change; the frontend code generation runs after the query change
- **Test Strategy**: the service tests are co-located with the service and are written before the implementation
- **Backend Hexagonal Architecture**: the service calculates the mean; the resolver does not change
- **Frontend Code Discipline**: group 3 adds a Chart.js dataset with a theme color, with no custom CSS
- **Code Quality Validation**: group 4 runs the full suites, typecheck, and format in each package
- **Violations**: none
