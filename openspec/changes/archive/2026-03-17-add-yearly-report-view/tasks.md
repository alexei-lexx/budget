## 1. Backend: Schema

- [x] 1.1 In `backend/src/graphql/schema.graphql`, change `month` argument on `byCategoryReport` query from `Int!` to `Int`
- [x] 1.2 In `backend/src/graphql/schema.graphql`, change `month` field on `ByCategoryReport` type from `Int!` to `Int`
- [x] 1.3 Run `npm run codegen` in `backend/` to regenerate TypeScript types

## 2. Backend: Service & Resolver

- [x] 2.1 In `ByCategoryReportService.call`, make `month` parameter optional (`month?: number`); add date-range branch: when month is absent use Jan 1 – Dec 31 of the given year
- [x] 2.2 Call `validateMonth` only when month is provided
- [x] 2.3 Return `month: undefined` (instead of a number) in the result object when generating a yearly report
- [x] 2.4 In `report-resolvers.ts`, pass `args.month ?? undefined` to the service (not the raw nullable GraphQL value)
- [x] 2.5 Add service tests for the yearly path: full-year date range, correct aggregation, `validateMonth` not called when month absent

## 3. Frontend: Codegen & Composable

- [x] 3.1 Run `npm run codegen:sync-schema` in `frontend/` to pull the updated schema
- [x] 3.2 Run `npm run codegen` in `frontend/` to regenerate typed composables
- [x] 3.3 In `useByCategoryReport.ts`, update `getByCategoryReport` to accept `month` as `Ref<number | null>`; pass `null` to the query when in yearly mode (GraphQL treats it as absent)

## 4. Frontend: New YearNavigation Component

- [x] 4.1 Create `frontend/src/components/reports/YearNavigation.vue` with Previous / Next year controls (mobile icon buttons + desktop text buttons, matching `MonthNavigation` layout)
- [x] 4.2 Component accepts `year: number` and `disabled?: boolean` props; emits `navigate: { year: number }`

## 5. Frontend: ByCategoryReport View

- [x] 5.1 Add `viewMode: Ref<'monthly' | 'yearly'>` state; default to `'monthly'`
- [x] 5.2 Add `v-btn-toggle` (Monthly / Yearly) in the page header
- [x] 5.3 Conditionally render `MonthNavigation` (monthly mode) or `YearNavigation` (yearly mode)
- [x] 5.4 Wire `YearNavigation`'s `navigate` event to update `selectedYear` and replace URL (`?year=YYYY`, no month param)
- [x] 5.5 On toggle switch monthly→yearly: drop `month` from URL; on yearly→monthly: set month to current month and update URL
- [x] 5.6 In `onMounted`, infer view mode from URL: presence of `month` param → monthly, absence → yearly

## 6. Frontend: CategoryBreakdownTable

- [x] 6.1 Update the `month-year` prop usage in `ByCategoryReport.vue` to pass a year-only string (e.g. `"2025"`) when in yearly mode, and the existing formatted string when in monthly mode

## 7. Code Quality

- [x] 7.1 Run `npm test -- by-category-report-service.test.ts` in `backend/`; fix any failures
- [x] 7.2 Run `npm test` in `backend/`; fix any regressions
- [x] 7.3 Run `npm run typecheck` and `npm run format` in `backend/`; fix all issues
- [x] 7.4 Run `npm run typecheck` and `npm run format` in `frontend/`; fix all issues

## Constitution Compliance

- **Schema-Driven Development**: Tasks start with schema change (1.1–1.2) and run codegen on both sides (1.3, 3.1–3.2) before any implementation. ✅
- **Backend Layer Structure**: Service holds date-range logic (2.1–2.3); resolver is a thin pass-through (2.4). ✅
- **Single-Purpose Services**: `ByCategoryReportService.call` gains an optional param, not a new method. ✅
- **Input Validation**: `validateMonth` conditionally called (2.2); `validateYear` always called. ✅
- **Frontend Code Discipline**: `v-btn-toggle` from Vuetify; `YearNavigation` mirrors `MonthNavigation` layout patterns. ✅
- **TypeScript Code Generation**: Codegen regenerated after schema changes; no non-null assertions. ✅
- **Code Quality Validation**: Tests → full suite → typecheck/lint on both packages (group 7). ✅
- **Test File Location**: New service tests co-located next to source file. ✅
