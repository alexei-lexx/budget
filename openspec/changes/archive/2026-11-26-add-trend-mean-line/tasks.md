# Tasks

## 1. GraphQL Schema

- [x] 1.1 In `backend/src/graphql/schema.graphql`, add `pastMean: Float!` to `ExpenseTrend` after `pastMedianAtSamePoint`; run `npm run codegen` in `backend/` and verify that it succeeds

## 2. Backend Mean Utility

- [x] 2.1 Create `backend/src/utils/mean.test.ts` with tests that `mean` returns 0 for an empty list, the value for one value, 300 for `[100, 200, 600]`, and does not change the input list; verify with `npm test -- src/utils/mean.test.ts` in `backend/` that the tests fail
- [x] 2.2 Create `backend/src/utils/mean.ts` that exports `mean(values: number[]): number`, with a doc comment in the style of `median.ts`; verify that the tests from 2.1 pass

## 3. Backend Trend Calculation

- [x] 3.1 In `backend/src/services/expense-trend-service.test.ts`, add the test "returns mean of completed period amounts" that spies on `mean`, has completed months of 100, 200, and 600 and a running month of 1000, and expects `pastMean: 300` and a `mean` call with `[100, 200, 600]`; add the test "returns mean counting periods without transactions as zero" that expects a `mean` call with the zeros of the empty months; verify with `npm test -- src/services/expense-trend-service.test.ts` in `backend/` that the new tests fail
- [x] 3.2 In `backend/src/services/expense-trend-service.ts`, add `pastMean: number` to the `ExpenseTrend` interface and return `pastMean: mean(pastAmounts)`; update the class doc comment to name the mean; verify that the tests from 3.1 pass and that `npm run typecheck` in `backend/` passes

## 4. Frontend Mean Line

- [x] 4.1 In `frontend/src/graphql/queries.ts`, add `pastMean` to the expense trend query after `pastMedianAtSamePoint`; run `npm run codegen` in `frontend/`, which also copies the backend schema to `frontend/src/schema.graphql`, and verify that it succeeds and that the copy has `pastMean`
- [x] 4.2 Add `trends.chart.pastMean` with "Mean of past periods" to `frontend/src/locales/en.json` and with "Durchschnitt der vergangenen Zeiträume" to `frontend/src/locales/de.json`; verify with `npm run typecheck` in `frontend/`
- [x] 4.3 In `frontend/src/components/reports/ExpenseTrendChart.vue`, add a `line` dataset after the median datasets with the label `t("trends.chart.pastMean")`, the data `props.trend.pastMean` for each point, `borderColor: colors.value.success`, the same dash, width, point radius, and order as the median lines, and `hidden: true`; verify with `npm run typecheck` in `frontend/`

## 5. Validation

- [x] 5.1 Run `npm test`, `npm run typecheck`, and `npm run format` in `backend/`, and verify that all pass with no ESLint issues
- [x] 5.2 Run `npm test`, `npm run typecheck`, and `npm run format` in `frontend/`, and verify that all pass with no ESLint issues
- [x] 5.3 In the running app at a phone width of 360 px, open the Trends page and verify the spec scenarios: the legend has the mean entry with the line not drawn, a click on the entry draws a dashed line in its own color at the mean of the completed bars, the German locale shows "Durchschnitt der vergangenen Zeiträume", and a page reload hides the line again

## Constitution Compliance

- **Schema-Driven Development**: group 1 changes the schema and runs the backend code generation before any code change; the frontend code generation runs after the query change
- **Test Strategy**: the utility and service tests are co-located with their source files and are written before the implementation
- **Backend Hexagonal Architecture**: the service calculates the mean; the resolver does not change
- **Frontend Code Discipline**: group 4 adds a Chart.js dataset with a theme color, with no custom CSS
- **Code Quality Validation**: group 5 runs the full suites, typecheck, and format in each package after the changed test files pass
- **Violations**: none
