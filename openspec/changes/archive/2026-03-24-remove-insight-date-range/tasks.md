## 1. Backend Schema

- [x] 1.1 Remove `dateRange: DateRangeInput!` from `InsightInput` in `backend/src/graphql/schema.graphql`
- [x] 1.2 Remove the `DateRangeInput` type from `backend/src/graphql/schema.graphql`
- [x] 1.3 Run `npm run codegen` in `backend/` to regenerate `resolvers-types.ts`

## 2. Backend Service

- [x] 2.1 Remove `startDate` and `endDate` from `InsightInput` in `insight-service.ts`
- [x] 2.2 Remove date range validation (start ≤ end, range ≤ 365 days) from `InsightService.call`
- [x] 2.3 Update the system prompt: instruct the agent to infer the date range from the question, default to the current month when not specified, and state the assumed range at the start of the answer
- [x] 2.4 Simplify `buildUserPrompt`: remove the "I have transactions between X and Y" prefix and pass the question directly

## 3. Backend Resolver

- [x] 3.1 Update `insight-resolvers.ts`: remove `dateRange` extraction, pass only `question` to the service

## 4. Backend Tests and Validation

- [x] 4.1 Update `insight-service.test.ts`: remove `dateRange` from all test inputs and update affected assertions
- [x] 4.2 Run `npm test -- src/services/insight-service.test.ts` and fix any failures
- [x] 4.3 Run `npm test` in `backend/` and fix any regressions
- [x] 4.4 Run `npm run typecheck && npm run format` in `backend/` and fix any issues

## 5. Frontend Codegen

- [x] 5.1 Run `npm run codegen:sync-schema` in `frontend/` to sync schema from backend
- [x] 5.2 Run `npm run codegen` in `frontend/` to regenerate `vue-apollo.ts`

## 6. Frontend Composable

- [x] 6.1 Remove `dateRange` ref and `DateRangeInput` import from `useInsight.ts`
- [x] 6.2 Remove `dateRangeInput` parameter from `askQuestion` and stop passing it to the query

## 7. Frontend View

- [x] 7.1 Remove the preset chips section and custom date fields from `Insight.vue`
- [x] 7.2 Remove date range state: `selectedDateRangePreset`, `startDate`, `endDate`, `isCustomDateRangePreset`
- [x] 7.3 Remove date range logic: `applyDateRangePreset`, `isValidDateRange`, `formatDateForInput`, `dateRangePresetOptions`, `InsightDateRangePreset` type
- [x] 7.4 Remove date range fields from `StoredInput`, `saveInput`, and `loadStoredInput`; remove unused `formatDateAsYYYYMMDD` import
- [x] 7.5 Remove date range watcher and date range handling from `onMounted`
- [x] 7.6 Update `handleAskQuestion` to call `askQuestion` with only the question
- [x] 7.7 Update the empty state text to remove the date range reference

## 8. Frontend Validation

- [x] 8.1 Run `npm run typecheck` in `frontend/` and fix any issues
- [x] 8.2 Run `npm run format` in `frontend/` and fix any issues

## Constitution Compliance

- **Schema-Driven Development**: schema updated first (task 1), codegen runs on both sides (tasks 1.3, 5.1–5.2) before application code changes — compliant
- **Backend Layer Structure**: changes follow schema → resolver → service order — compliant
- **Test Strategy**: service tests updated before moving to frontend (task 4) — compliant
- **Code Quality Validation**: test, typecheck, and lint steps included for both backend and frontend — compliant
