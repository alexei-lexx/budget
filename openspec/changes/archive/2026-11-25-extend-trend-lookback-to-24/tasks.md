# Tasks

## 1. GraphQL Schema

- [x] 1.1 In `backend/src/graphql/schema.graphql`, change the description of `ExpenseTrendInput.lookback` to "Number of completed periods to plot before the running one. Accepts any whole number from 1 to 24."; copy the same text to `frontend/src/schema.graphql`; run `npm run codegen` in `backend/` and in `frontend/` and verify that both commands succeed

## 2. Backend Starred Trend Configuration

- [x] 2.1 In `backend/src/models/trend-preset.test.ts`, change the expected error message to "Lookback must be a whole number from 1 to 24", change the "above 12" and "out of range" tests to use a lookback of 25, and add a test that `TrendPreset.create` accepts a lookback of 24; verify with `npm test -- src/models/trend-preset.test.ts` in `backend/` that the changed and new tests fail
- [x] 2.2 In `backend/src/models/trend-preset.ts`, change `LOOKBACK_MAX` from 12 to 24; verify that the tests from 2.1 pass and that `npm test -- src/repositories/dyn-trend-preset-repository.db.test.ts` in `backend/` passes

## 3. Backend Trend Calculation

- [x] 3.1 In `backend/src/services/expense-trend-service.test.ts`, change the expected failure message to "Lookback must be a whole number from 1 to 24", change the "above 12" test to "above 24" with a lookback of 25, and change the "accepts lookback of 12" test to a lookback of 24 that checks the count of 25 points, the first 2 points, and the last 2 points, with only the last point marked as current; verify with `npm test -- src/services/expense-trend-service.test.ts` in `backend/` that the changed tests fail
- [x] 3.2 In `backend/src/services/expense-trend-service.ts`, import `LOOKBACK_MIN` and `LOOKBACK_MAX` from `../models/trend-preset` and use them in the range check and in the failure message instead of the literals 1 and 12; verify that the tests from 3.1 pass

## 4. Frontend Selection Limits

- [x] 4.1 In `frontend/src/composables/useExpenseTrend.ts`, export `LOOKBACK_MAX = 24`; verify with `npm run typecheck` in `frontend/`
- [x] 4.2 In `frontend/src/lib/trendSelectionStorage.ts`, use `LOOKBACK_MAX` in `readLookback` instead of 12; verify with `npm test -- src/lib/trendSelectionStorage.test.ts` in `frontend/` that the existing tests pass
- [x] 4.3 In `frontend/src/views/Trends.vue`, use `LOOKBACK_MAX` in the check of the `lookback` URL parameter instead of 12; verify with `npm run typecheck` in `frontend/`
- [x] 4.4 In `frontend/src/components/reports/TrendFilters.vue`, build `LOOKBACK_SELECT_OPTIONS` from `LOOKBACK_MAX` instead of 12, and keep `LOOKBACK_OPTIONS` as `[3, 6, 12]`; verify with `npm run typecheck` in `frontend/`

## 5. Frontend Monthly Axis Labels

- [x] 5.1 In `frontend/src/components/reports/ExpenseTrendChart.vue`, format a January bar label with `{ month: "short", year: "numeric" }`, keep `{ month: "short" }` for the other monthly bars, and update the comment above `labels` to match; verify with `npm run typecheck` in `frontend/`

## 6. Validation

- [x] 6.1 Run `npm test`, `npm run typecheck`, and `npm run format` in `backend/`, and verify that all pass with no ESLint issues
- [x] 6.2 Run `npm test`, `npm run typecheck`, and `npm run format` in `frontend/`, and verify that all pass with no ESLint issues
- [x] 6.3 In the running app at a phone width of 360 px, open the Trends page and verify the spec scenarios: the select offers 1 to 24, a lookback of 24 weeks and of 24 months each show 25 bars, only the January labels show the year, a URL with a lookback of 24 restores it, and a URL with a lookback of 25 falls back to 3

## Constitution Compliance

- **Schema-Driven Development**: group 1 changes the schema description and runs the code generation before any code change
- **Test Strategy**: the service and entity tests are co-located with their source files and are written before the implementation
- **Input Validation**: the service and the entity both check the new range
- **Frontend Code Discipline**: groups 4 and 5 change only component values and the date format, with no custom CSS
- **Code Quality Validation**: group 6 runs the full suites, typecheck, and format in each package after the changed test files pass
- **Violations**: none
