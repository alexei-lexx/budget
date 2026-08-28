## 1. Backend

- [x] 1.1 (use `testing` skill) Update `expense-trend-service.test.ts`: replace the "not 3, 6 or 12" failure test with tests for lookback below 1, above 12, and non-integer values; add passing tests for lookback 1 and lookback 12
- [x] 1.2 In `expense-trend-service.ts`, replace `ALLOWED_LOOKBACKS` with a 1-12 range check (integer, inclusive) and update the failure message accordingly

## 2. Frontend

- [x] 2.1 In `TrendFilters.vue`, keep the existing lookback `v-btn-toggle` (3, 6, 12) and add a `v-select` listing values 1-12 alongside it, both bound to `draftLookback` so picking either keeps both in sync
- [x] 2.2 In `Trends.vue`, replace the `LOOKBACK_OPTIONS` fixed-set check in `readLookback` with a 1-12 integer range check, keeping the default of 3 for missing/invalid values

## 3. Verification

- [x] 3.1 Run backend test suite, typecheck, and lint for `backend/`
- [x] 3.2 Run typecheck and lint for `frontend/`
- [x] 3.3 Manually verify in the running app: toggle still offers 3/6/12, select offers 1-12 and stays in sync with the toggle, lookback of 1 shows 2 bars, a bookmarked URL with lookback=1 and lookback=12 restores correctly, an out-of-range URL value (e.g. 0 or 99) falls back to the default of 3

## Constitution Compliance

- **Input Validation**: the range check stays in the service layer (business rule); GraphQL schema is unchanged. Compliant.
- **Test Strategy**: backend service test updated first (TDD) to cover the new validation boundary; frontend verified manually. Compliant.
- **Frontend Code Discipline**: `v-btn-toggle` and `v-select` are Vuetify components, no custom CSS added. Compliant.
- **Code Quality Validation**: task 3.1-3.2 run the mandatory test/typecheck/lint pipeline for both packages. Compliant.
