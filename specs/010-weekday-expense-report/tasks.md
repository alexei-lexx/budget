---
description: "Implementation tasks for Monthly Expense Report by Weekday feature"
---

# Tasks: Monthly Expense Report by Weekday

**Input**: Design documents from `/specs/010-weekday-expense-report/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/schema.graphql, quickstart.md

**Tests**: Backend unit tests for MonthlyByWeekdayReportService are included. Frontend uses manual testing per plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install required dependencies for Chart.js

- [ ] T001 Install Chart.js dependencies in frontend/package.json: `chart.js@^4.4.0` and `vue-chartjs@^5.3.0`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend schema, service layer, and GraphQL infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Schema & Type Generation

- [ ] T002 Add Weekday enum (MON, TUE, WED, THU, FRI, SAT, SUN) to backend/src/schema.graphql
- [ ] T003 Add MonthlyWeekdayReportCurrencyBreakdown type to backend/src/schema.graphql
- [ ] T004 Add MonthlyWeekdayReportDay type to backend/src/schema.graphql
- [ ] T005 Add MonthlyWeekdayReportCurrencyTotal type to backend/src/schema.graphql
- [ ] T006 Add MonthlyWeekdayReport type to backend/src/schema.graphql
- [ ] T007 Add monthlyWeekdayReport query to backend/src/schema.graphql Query type
- [ ] T008 Run `npm run codegen` in backend/ to generate TypeScript types from updated schema

### Backend Service Layer

- [ ] T009 [P] Rename backend/src/services/ReportService.ts to backend/src/services/MonthlyByCategoryReportService.ts
- [ ] T010 [P] Update imports of MonthlyByCategoryReportService in backend/src/resolvers/reports.ts
- [ ] T011 [P] Update imports of MonthlyByCategoryReportService in backend/src/context.ts
- [ ] T012 Create MonthlyByWeekdayReportService class in backend/src/services/MonthlyByWeekdayReportService.ts with constructor accepting ITransactionRepository
- [ ] T013 Implement getWeekdayReport method in backend/src/services/MonthlyByWeekdayReportService.ts (aggregation logic per data-model.md algorithm)
- [ ] T014 Implement calculateWeekday private method in backend/src/services/MonthlyByWeekdayReportService.ts (maps date to Weekday enum)
- [ ] T015 Implement calculateOccurrences private method in backend/src/services/MonthlyByWeekdayReportService.ts (counts weekday appearances in month)
- [ ] T016 Implement calculatePercentage private method in backend/src/services/MonthlyByWeekdayReportService.ts (calculates percentage of total)

### Backend Service Tests

- [ ] T017 [P] Create test file backend/src/services/MonthlyByWeekdayReportService.test.ts with test setup and mocks
- [ ] T018 [P] Add test case: should aggregate expenses by weekday for single currency in backend/src/services/MonthlyByWeekdayReportService.test.ts
- [ ] T019 [P] Add test case: should calculate percentages correctly in backend/src/services/MonthlyByWeekdayReportService.test.ts
- [ ] T020 [P] Add test case: should handle multiple currencies with separate breakdowns in backend/src/services/MonthlyByWeekdayReportService.test.ts
- [ ] T021 [P] Add test case: should return empty report when no expenses exist in backend/src/services/MonthlyByWeekdayReportService.test.ts
- [ ] T022 [P] Add test case: should calculate average correctly based on weekday occurrences in backend/src/services/MonthlyByWeekdayReportService.test.ts
- [ ] T023 [P] Add test case: should handle months with different weekday counts in backend/src/services/MonthlyByWeekdayReportService.test.ts
- [ ] T024 Run `npm test` in backend/ to verify all MonthlyByWeekdayReportService tests pass

### Frontend Schema Sync

- [ ] T025 Run `npm run codegen:sync-schema` in frontend/ to copy backend schema to frontend/src/schema.graphql

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Weekday Spending Patterns (Priority: P1) 🎯 MVP

**Goal**: Display vertical bar chart showing total and average spending for each weekday (Mon-Sun) for the current month

**Independent Test**: Navigate to /reports/monthly-weekday and verify chart displays with 7 weekdays showing two bars (total and average) for current month expenses. Hover over bars to see tooltips with amounts and percentages.

### Backend Implementation for User Story 1

- [ ] T026 [US1] Add monthlyWeekdayReport resolver to backend/src/resolvers/reports.ts that calls monthlyByWeekdayReportService.getWeekdayReport()
- [ ] T027 [US1] Add MonthlyByWeekdayReportService instance to GraphQL context in backend/src/context.ts
- [ ] T028 [US1] Update context interface to include monthlyByWeekdayReportService in backend/src/context.ts

### Frontend GraphQL Query for User Story 1

- [ ] T029 [US1] Create MONTHLY_WEEKDAY_REPORT_QUERY GraphQL query in frontend/src/graphql/weekdayReport.ts
- [ ] T030 [US1] Run `npm run codegen` in frontend/ to generate useMonthlyWeekdayReportQuery composable in frontend/src/__generated__/vue-apollo.ts

### Frontend Chart Component for User Story 1

- [ ] T031 [US1] Create MonthlyWeekdayReport.vue component in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T032 [US1] Register Chart.js components (BarElement, CategoryScale, LinearScale, Tooltip, Legend) in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T033 [US1] Implement useMonthlyWeekdayReportQuery composable call with year, month, type=EXPENSE in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T034 [US1] Implement currency selector logic in frontend/src/components/reports/MonthlyWeekdayReport.vue (defaultCurrency, availableCurrencies, currencyOptions)
- [ ] T035 [US1] Implement transformToChartData function in frontend/src/components/reports/MonthlyWeekdayReport.vue (converts GraphQL response to Chart.js format per data-model.md)
- [ ] T036 [US1] Configure Chart.js bar chart with 7 weekday labels (Mon-Sun), two datasets (Total dark blue #1976D2, Average light blue #64B5F6) in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T037 [US1] Implement tooltip callbacks for Total bars showing "{Abbr}: {amount} (percentage%)" format in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T038 [US1] Implement tooltip callbacks for Average bars showing "{Abbr}: {amount}" format without percentage in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T039 [US1] Configure Y-axis to start at zero with grid lines in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T040 [US1] Add ARIA labels for accessibility (canvas role="img", aria-label) in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T041 [US1] Add currency symbol formatting logic (no symbol for "All", currency symbol for specific currency) in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T042 [US1] Add loading state display using Apollo Client loading state in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T043 [US1] Add error state display using Apollo Client error state in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T044 [US1] Add empty state display when no expenses exist for month in frontend/src/components/reports/MonthlyWeekdayReport.vue
- [ ] T045 [US1] Add legend below chart identifying "Total" and "Average" bars in frontend/src/components/reports/MonthlyWeekdayReport.vue

### Frontend Page Component for User Story 1

- [ ] T046 [US1] Create monthly-weekday.vue page component in frontend/src/pages/reports/monthly-weekday.vue
- [ ] T047 [US1] Add default year/month computed properties (current year/month) in frontend/src/pages/reports/monthly-weekday.vue
- [ ] T048 [US1] Import and render MonthlyWeekdayReport component with year and month props in frontend/src/pages/reports/monthly-weekday.vue
- [ ] T049 [US1] Add page title "Monthly Expense Report by Weekday" in frontend/src/pages/reports/monthly-weekday.vue

**Checkpoint**: At this point, User Story 1 should be fully functional - chart displays weekday data for current month with tooltips

---

## Phase 4: User Story 2 - Navigate Between Months (Priority: P2)

**Goal**: Allow users to navigate to previous/next months and see updated weekday data

**Independent Test**: Click previous/next month arrows and verify chart updates to show selected month's data. URL should update with year/month parameters.

### Implementation for User Story 2

- [ ] T050 [US2] Import MonthNavigation component in frontend/src/pages/reports/monthly-weekday.vue
- [ ] T051 [US2] Add year and month computed properties reading from route.query in frontend/src/pages/reports/monthly-weekday.vue
- [ ] T052 [US2] Add handleNavigate function that updates router with new year/month query params in frontend/src/pages/reports/monthly-weekday.vue
- [ ] T053 [US2] Render MonthNavigation component with year, month, loading props and @navigate event handler in frontend/src/pages/reports/monthly-weekday.vue
- [ ] T054 [US2] Add onMounted hook to set default year/month in URL if query params missing in frontend/src/pages/reports/monthly-weekday.vue
- [ ] T055 [US2] Add aria-live="polite" region announcing month changes for screen readers in frontend/src/pages/reports/monthly-weekday.vue

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - chart displays and month navigation works with URL updates

---

## Phase 5: User Story 3 - Navigate Between Report Pages (Priority: P3)

**Goal**: Add two separate menu items for category and weekday reports, each page maintains independent month state

**Independent Test**: Navigate between "Monthly Report by Category" and "Monthly Report by Weekday" menu items. Each page should load at current month (month selection does not carry over). Bookmark URLs with year/month params should work.

### Implementation for User Story 3

- [ ] T056 [P] [US3] Rename existing category report component to MonthlyCategoryReport.vue in frontend/src/components/reports/
- [ ] T057 [P] [US3] Create monthly-category.vue page component in frontend/src/pages/reports/ with same structure as monthly-weekday.vue
- [ ] T058 [US3] Add route for /reports/monthly-category pointing to monthly-category.vue in frontend/src/router/index.ts
- [ ] T059 [US3] Add route for /reports/monthly-weekday pointing to monthly-weekday.vue in frontend/src/router/index.ts
- [ ] T060 [US3] Update navigation menu to add "Monthly Report by Category" menu item linking to /reports/monthly-category in navigation component
- [ ] T061 [US3] Update navigation menu to add "Monthly Report by Weekday" menu item linking to /reports/monthly-weekday in navigation component
- [ ] T062 [US3] Verify keyboard navigation works for both menu items (tab, enter) in navigation component

**Checkpoint**: All user stories should now be independently functional - both report pages accessible via menu, each maintains independent state

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [ ] T063 [P] Run quickstart.md validation: start backend dev server, test GraphQL query in playground
- [ ] T064 [P] Run quickstart.md validation: start frontend dev server, navigate to /reports/monthly-weekday, verify chart renders
- [ ] T065 Run full backend test suite with `npm test` in backend/
- [ ] T066 Verify Chart.js bar colors meet WCAG 2.1 Level AA contrast ratio (3:1 minimum) using contrast checker tool

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Depends on User Story 1 completion (adds navigation to existing page)
  - User Story 3 (P3): Depends on User Story 1 completion (creates separate routes for existing functionality)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core chart display functionality
- **User Story 2 (P2)**: Can start after User Story 1 - Adds month navigation to existing page
- **User Story 3 (P3)**: Can start after User Story 1 - Splits into separate pages with menu navigation

### Within Each Phase

**Phase 2 (Foundational)**:
- Schema updates (T002-T007) must complete before T008 (codegen)
- Service implementation (T012-T016) can start after T008 (types generated)
- Service tests (T017-T024) depend on service implementation (T012-T016)
- T009-T011 (rename) can run in parallel with schema work
- Frontend schema sync (T025) depends on backend schema completion (T008)

**Phase 3 (User Story 1)**:
- Backend resolver (T026-T028) depends on Foundational phase
- Frontend query (T029-T030) depends on T025 (schema sync)
- Chart component (T031-T045) depends on T030 (composable generation)
- Page component (T046-T049) depends on chart component creation (T031)

**Phase 4 (User Story 2)**:
- All tasks depend on User Story 1 page component (T046-T049)

**Phase 5 (User Story 3)**:
- T056-T057 (component rename and page creation) can run in parallel
- T058-T059 (routes) depend on T056-T057
- T060-T062 (menu updates) can run in parallel with T058-T059

### Parallel Opportunities

**Phase 1 (Setup)**:
- Only one task, no parallelism

**Phase 2 (Foundational)**:
- T009-T011 (rename service and update imports) can run in parallel
- T017-T023 (all test cases) can run in parallel after service implementation

**Phase 3 (User Story 1)**:
- T031-T045 (chart component implementation details) have internal dependencies but can be worked on continuously
- T046-T049 (page component) can run in parallel after chart component structure exists

**Phase 5 (User Story 3)**:
- T056-T057 can run in parallel
- T060-T062 can run in parallel

---

## Parallel Example: Phase 2 Foundational

```bash
# Backend service rename (independent, can run together):
Task T009: "Rename backend/src/services/ReportService.ts to MonthlyByCategoryReportService.ts"
Task T010: "Update imports in backend/src/resolvers/reports.ts"
Task T011: "Update imports in backend/src/context.ts"

# Test cases (after service implementation, can run together):
Task T018: "Add test case: should aggregate expenses by weekday for single currency"
Task T019: "Add test case: should calculate percentages correctly"
Task T020: "Add test case: should handle multiple currencies"
Task T021: "Add test case: should return empty report when no expenses"
Task T022: "Add test case: should calculate average correctly"
Task T023: "Add test case: should handle months with different weekday counts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T025) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T026-T049)
4. **STOP and VALIDATE**: Test chart display with current month data
5. Demo/review if ready before proceeding to P2/P3

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (P1) → Test chart display independently → Deploy/Demo (MVP!)
3. Add User Story 2 (P2) → Test month navigation independently → Deploy/Demo
4. Add User Story 3 (P3) → Test menu navigation independently → Deploy/Demo
5. Polish phase → Final validation
6. Each story adds value without breaking previous stories

### Sequential Implementation (Recommended)

Since User Stories 2 and 3 depend on User Story 1's page component:

1. Team completes Setup + Foundational together
2. Complete User Story 1 (P1) - Core chart functionality
3. Complete User Story 2 (P2) - Month navigation
4. Complete User Story 3 (P3) - Menu and routing
5. Polish and validate

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 2 and 3 build upon User Story 1 (not independently parallelizable)
- Backend unit tests included for MonthlyByWeekdayReportService per plan.md
- Frontend uses manual testing for chart visualization per plan.md
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- WCAG 2.1 Level AA compliance: 3:1 contrast ratio for chart bars
- Week starts on Monday per spec assumptions
