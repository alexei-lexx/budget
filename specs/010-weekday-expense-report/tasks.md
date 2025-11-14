# Implementation Tasks: Monthly Expense Report by Weekday

**Branch**: `010-weekday-expense-report`
**Feature Spec**: [spec.md](spec.md)
**Implementation Plan**: [plan.md](plan.md)
**Estimated Total Time**: 4-6 hours

## Overview

This document breaks down the implementation into sequential phases organized by user story priority. Each phase delivers a complete, independently testable increment of functionality.

## Implementation Strategy

**MVP Scope**: User Story 1 (P1) - Core weekday chart display
**Incremental Delivery**: Each user story builds on previous stories
**Testing Approach**: Backend Jest tests + manual frontend testing

## Phase Dependency Graph

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
Phase 3 (US1 - Core Chart) ← MVP DELIVERY
    ↓
Phase 4 (US2 - Month Navigation)
    ↓
Phase 5 (US3 - Tab Switching)
    ↓
Phase 6 (Polish)
```

## User Story Completion Order

1. **User Story 1 (P1)**: View Weekday Spending Patterns - MUST complete first
2. **User Story 2 (P2)**: Navigate Between Months - Requires US1
3. **User Story 3 (P3)**: Switch Between Report Types - Requires US1 and US2

---

## Phase 1: Setup

**Goal**: Install dependencies and verify development environment

**Estimated Time**: 15 minutes

### Tasks

- [ ] T001 [P] Install Chart.js dependencies in frontend/package.json (add "chart.js": "^4.4.0" and "vue-chartjs": "^5.3.0")
- [ ] T002 [P] Verify backend development environment ready (run `cd backend && npm run build && npm test` to ensure existing tests pass)
- [ ] T003 [P] Verify frontend development environment ready (run `cd frontend && npm run build` to ensure no existing errors)

**Parallel Execution Example**:
```bash
# Terminal 1
cd frontend && npm install chart.js vue-chartjs

# Terminal 2
cd backend && npm run build && npm test

# Terminal 3
cd frontend && npm run build
```

---

## Phase 2: Foundational Tasks

**Goal**: Create GraphQL schema and generate types (blocks all user stories)

**Estimated Time**: 30 minutes

**Why Foundational**: Schema changes must be completed before any user story implementation can begin. All backend and frontend tasks depend on generated types.

### Tasks

- [ ] T004 Add weekdayReport query to backend/src/schema.graphql (extend Query type with weekdayReport field, see contracts/schema.graphql for complete schema)
- [ ] T005 Add WeekdayReport type to backend/src/schema.graphql (year: Int!, month: Int!, weekdays: [WeekdayReportDay!]!, currencyTotals: [WeekdayReportCurrencyTotal!]!)
- [ ] T006 Add WeekdayReportDay type to backend/src/schema.graphql (weekday: Int!, currencyBreakdowns: [WeekdayReportCurrencyBreakdown!]!)
- [ ] T007 Add WeekdayReportCurrencyBreakdown type to backend/src/schema.graphql (currency: String!, totalAmount: Float!, averageAmount: Float!, percentage: Int!)
- [ ] T008 Add WeekdayReportCurrencyTotal type to backend/src/schema.graphql (currency: String!, totalAmount: Float!)
- [ ] T009 Generate backend TypeScript types (run `cd backend && npm run codegen` to generate resolvers-types.ts)
- [ ] T010 Sync GraphQL schema to frontend (run `cd frontend && npm run codegen:sync-schema` to copy schema from backend)
- [ ] T011 Create GraphQL query definition in frontend/src/graphql/weekdayReport.ts (import gql and define GET_WEEKDAY_REPORT query)
- [ ] T012 Generate frontend TypeScript types (run `cd frontend && npm run codegen` to generate vue-apollo.ts with typed composables)

**Sequential Execution Required**: T004-T008 → T009 → T010 → T011 → T012 (must complete in order due to code generation dependencies)

---

## Phase 3: User Story 1 - View Weekday Spending Patterns (P1)

**Story Goal**: Users can view a weekday expense chart showing total and average spending for each day of the week

**Priority**: P1 - Core value proposition

**Independent Test Criteria**:
1. Navigate to Reports page
2. Click "By Weekday" tab
3. Verify vertical bar chart displays with 7 weekdays (Mon-Sun)
4. Verify each weekday shows two bars (total and average)
5. Verify tooltips show correct format on hover/tap

**Estimated Time**: 3-4 hours

### Backend Implementation

- [ ] T013 [P] [US1] Add weekday calculation helper function in backend/src/services/ReportsService.ts (getWeekdayIndex: returns 0-6 for Mon-Sun from ISO date string)
- [ ] T014 [P] [US1] Add weekday occurrence counter in backend/src/services/ReportsService.ts (countWeekdayOccurrences: counts how many times a weekday appears in a month)
- [ ] T015 [US1] Implement getWeekdayReport method in backend/src/services/ReportsService.ts (fetch transactions, group by weekday, calculate totals/averages/percentages per currency)
- [ ] T016 [US1] Add Zod validation schema for weekdayReport input in backend/src/resolvers/reportResolvers.ts (year: int within ±10 years, month: 1-12, type: EXPENSE only)
- [ ] T017 [US1] Add weekdayReport resolver in backend/src/resolvers/reportResolvers.ts (validate input, call context.reportsService.getWeekdayReport, handle errors)
- [ ] T018 [US1] Write test for single-currency weekday aggregation in backend/src/services/ReportsService.test.ts (verify totals, averages, percentages)
- [ ] T019 [US1] Write test for multi-currency weekday aggregation in backend/src/services/ReportsService.test.ts (verify separate currency breakdowns)
- [ ] T020 [US1] Write test for empty month handling in backend/src/services/ReportsService.test.ts (verify empty weekdays and currencyTotals arrays)
- [ ] T021 [US1] Write test for average calculation correctness in backend/src/services/ReportsService.test.ts (verify division by weekday occurrences, not transaction count)
- [ ] T022 [US1] Verify all backend tests pass (run `cd backend && npm test`)

**Parallel Opportunities (Backend)**:
```bash
# Can work on T013, T014 in parallel (independent helper functions)
# T015 depends on T013, T014
# T016, T017 depend on T015
# T018-T021 can be written in parallel after T015 complete
```

### Frontend Implementation

- [ ] T023 [P] [US1] Create useWeekdayReport composable in frontend/src/composables/useWeekdayReport.ts (wrap useGetWeekdayReportQuery, return computed weekdayReport/loading/error/refetch)
- [ ] T024 [P] [US1] Create WeekdayChart component skeleton in frontend/src/components/reports/WeekdayChart.vue (setup script with props for weekdays/currencyTotals/loading/error)
- [ ] T025 [US1] Register Chart.js components in frontend/src/components/reports/WeekdayChart.vue (import and register Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)
- [ ] T026 [US1] Transform weekday data for Chart.js in frontend/src/components/reports/WeekdayChart.vue (convert WeekdayReportDay[] to Chart.js dataset format)
- [ ] T027 [US1] Configure Chart.js options in frontend/src/components/reports/WeekdayChart.vue (grouped bars, Y-axis from 0, grid lines, accessibility)
- [ ] T028 [US1] Implement tooltip formatters in frontend/src/components/reports/WeekdayChart.vue (total: "{Abbr}: {amount} (percentage%)", average: "{Abbr}: {amount}")
- [ ] T029 [US1] Add mobile tooltip persistence in frontend/src/components/reports/WeekdayChart.vue (onClick handler to persist tooltip until next tap)
- [ ] T030 [US1] Add currency symbol logic in frontend/src/components/reports/WeekdayChart.vue (hide symbol when "All" selected, show when specific currency)
- [ ] T031 [US1] Implement currency selector in frontend/src/components/reports/WeekdayChart.vue (dropdown with "All" + individual currencies, default "All", hidden if single currency)
- [ ] T032 [US1] Add loading state UI in frontend/src/components/reports/WeekdayChart.vue (Vuetify skeleton loader matching existing reports)
- [ ] T033 [US1] Add error state UI in frontend/src/components/reports/WeekdayChart.vue (error alert matching existing reports)
- [ ] T034 [US1] Add empty state UI in frontend/src/components/reports/WeekdayChart.vue (message matching existing reports, hide chart)
- [ ] T035 [US1] Add basic tab structure to frontend/src/views/Reports.vue (v-tabs with "By Category" and "By Weekday" options, v-window for content)
- [ ] T036 [US1] Integrate WeekdayChart into Reports.vue (import component, add to "By Weekday" tab, pass data from useWeekdayReport)

**Parallel Opportunities (Frontend)**:
```bash
# Can work on T023, T024 in parallel (composable and component skeleton)
# T025-T031 are sequential (build up chart configuration)
# T032-T034 can be done in parallel (independent UI states)
# T035, T036 must be done after T024-T034 complete
```

### User Story 1 Manual Testing

- [ ] T037 [US1] Test chart display on desktop (verify 7 weekdays, total/average bars, correct colors, tooltips on hover)
- [ ] T038 [US1] Test chart display on mobile (verify responsive at 320px width, tooltips persist on tap)
- [ ] T039 [US1] Test multi-currency handling (verify currency selector appears, filtering works, symbol display correct)
- [ ] T040 [US1] Test empty month scenario (verify empty state message displays, chart hidden)
- [ ] T041 [US1] Test loading state (verify skeleton loader displays during fetch)
- [ ] T042 [US1] Test error handling (simulate network error, verify error message displays)

**Story 1 Completion Criteria**: ✅ All T013-T042 tasks complete, manual tests pass, weekday chart displays correctly

---

## Phase 4: User Story 2 - Navigate Between Months (P2)

**Story Goal**: Users can navigate between different months to view historical weekday spending patterns

**Priority**: P2 - Depends on US1 being functional

**Dependencies**: Requires Phase 3 (US1) complete

**Independent Test Criteria**:
1. On weekday report view, click "next month" arrow
2. Verify chart updates to show next month's data
3. Click "previous month" arrow
4. Verify chart updates to show previous month's data
5. Verify month/year display updates correctly

**Estimated Time**: 30 minutes

### Tasks

- [ ] T043 [US2] Connect MonthNavigation to weekday report in frontend/src/views/Reports.vue (ensure month state shared between tabs)
- [ ] T044 [US2] Verify refetch on month change in frontend/src/views/Reports.vue (ensure useWeekdayReport refetches when year/month changes)
- [ ] T045 [US2] Test month navigation forward (click next month arrow, verify chart updates within 2 seconds)
- [ ] T046 [US2] Test month navigation backward (click previous month arrow, verify chart updates within 2 seconds)
- [ ] T047 [US2] Test return to current month (navigate away and back, verify data accurate)

**Story 2 Completion Criteria**: ✅ All T043-T047 tasks complete, month navigation works correctly

---

## Phase 5: User Story 3 - Switch Between Report Types (P3)

**Story Goal**: Users can switch between "By Category" and "By Weekday" report views while maintaining selected month

**Priority**: P3 - Depends on US1 and US2 being functional

**Dependencies**: Requires Phase 3 (US1) and Phase 4 (US2) complete

**Independent Test Criteria**:
1. On "By Category" tab, select a specific month
2. Click "By Weekday" tab
3. Verify weekday chart shows same month
4. Verify URL updates to reflect tab selection
5. Bookmark URL and reload
6. Verify correct tab displays

**Estimated Time**: 1 hour

### Tasks

- [ ] T048 [US3] Add tab state management in frontend/src/views/Reports.vue (reactive selectedTab variable, default to "category")
- [ ] T049 [US3] Implement URL sync for tab selection in frontend/src/views/Reports.vue (update query param ?tab=category|weekday on tab change)
- [ ] T050 [US3] Implement URL initialization on mount in frontend/src/views/Reports.vue (read ?tab query param, set selectedTab)
- [ ] T051 [US3] Ensure month persists across tab switches in frontend/src/views/Reports.vue (verify year/month state shared across both tabs)
- [ ] T052 [US3] Add keyboard navigation support in frontend/src/views/Reports.vue (verify Vuetify tabs support keyboard arrow navigation)
- [ ] T053 [US3] Test tab switching from category to weekday (verify month persists, URL updates)
- [ ] T054 [US3] Test tab switching from weekday to category (verify month persists, URL updates)
- [ ] T055 [US3] Test URL bookmarking (bookmark ?tab=weekday&year=2025&month=11, reload, verify correct view)
- [ ] T056 [US3] Test default tab behavior (visit /reports without params, verify "By Category" selected)

**Story 3 Completion Criteria**: ✅ All T048-T056 tasks complete, tab switching works correctly with URL state

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Ensure accessibility, performance, and code quality standards

**Estimated Time**: 30 minutes

### Tasks

- [ ] T057 [P] Add ARIA labels to chart elements in frontend/src/components/reports/WeekdayChart.vue (description, labels for bars)
- [ ] T058 [P] Verify color contrast for accessibility in frontend/src/components/reports/WeekdayChart.vue (dark blue vs light blue meets WCAG AA)
- [ ] T059 [P] Test keyboard navigation for tabs in frontend/src/views/Reports.vue (verify arrow keys work, focus indicators visible)
- [ ] T060 [P] Test screen reader compatibility (verify chart data announced meaningfully)
- [ ] T061 [P] Verify performance targets (chart display < 3s, tooltip < 300ms, navigation < 2s)
- [ ] T062 [P] Run linter on all modified files (run `npm run lint` in backend and frontend)
- [ ] T063 [P] Run formatter on all modified files (run `npm run format` in backend and frontend)
- [ ] T064 Final verification (test all user stories end-to-end, verify all acceptance scenarios pass)

**Parallel Opportunities (Polish)**:
```bash
# T057-T060 can be done in parallel (independent accessibility checks)
# T062, T063 can be done in parallel (backend and frontend separately)
```

---

## Summary

**Total Tasks**: 64 tasks across 6 phases
**Estimated Time**: 4-6 hours

### Task Distribution by User Story

- **Setup (Phase 1)**: 3 tasks, 15 minutes
- **Foundational (Phase 2)**: 9 tasks, 30 minutes
- **User Story 1 (Phase 3)**: 30 tasks, 3-4 hours
- **User Story 2 (Phase 4)**: 5 tasks, 30 minutes
- **User Story 3 (Phase 5)**: 9 tasks, 1 hour
- **Polish (Phase 6)**: 8 tasks, 30 minutes

### Parallel Execution Opportunities

**Phase 1 (Setup)**: All 3 tasks can run in parallel
**Phase 2 (Foundational)**: Sequential due to code generation dependencies
**Phase 3 (US1)**: Backend helpers (T013-T014) parallel, frontend states (T032-T034) parallel
**Phase 6 (Polish)**: Accessibility tasks (T057-T060) parallel, linting (T062-T063) parallel

### MVP Delivery Strategy

**Minimum Viable Product**: Complete through Phase 3 (User Story 1)
- Delivers core value: weekday expense chart with totals and averages
- Independently testable and demonstrable
- Foundation for subsequent stories

**Incremental Additions**:
- Phase 4 adds month navigation (small increment)
- Phase 5 adds tab switching (UI enhancement)
- Phase 6 ensures quality and accessibility

### Independent Test Validation

Each user story phase includes specific test tasks ensuring:
- ✅ **US1**: Can view weekday chart (T037-T042)
- ✅ **US2**: Can navigate months (T045-T047)
- ✅ **US3**: Can switch tabs (T053-T056)

All acceptance scenarios from spec.md are covered by manual test tasks.

---

## Development Workflow

### Recommended Execution Order

1. **Phase 1**: Quick setup (all parallel)
2. **Phase 2**: Schema foundation (sequential)
3. **Phase 3**: Core feature (backend → frontend → testing)
4. **Phase 4**: Month navigation (quick integration)
5. **Phase 5**: Tab switching (URL state management)
6. **Phase 6**: Polish (parallel accessibility checks)

### Testing Strategy

**Backend**: Jest tests (T018-T022) ensure aggregation logic correctness
**Frontend**: Manual testing (T037-T042, T045-T047, T053-T056) verify UI behavior
**Quality**: Linting and formatting (T062-T063) maintain code standards

### Key Implementation Notes

1. **Schema First**: Phase 2 must complete before any implementation work
2. **Backend Before Frontend**: Complete backend implementation (T013-T022) before frontend UI (T023-T036)
3. **Incremental Testing**: Test each user story independently before moving to next
4. **Code Generation**: Run codegen after schema changes (T009, T012)
5. **Average Calculation**: Must divide by weekday occurrences, not transaction count (T014, T021)

---

## Reference Documentation

- [Feature Spec](spec.md) - Complete requirements and acceptance scenarios
- [Implementation Plan](plan.md) - Technical context and constitution compliance
- [Data Model](data-model.md) - Aggregation algorithm details
- [Contracts](contracts/schema.graphql) - GraphQL schema with examples
- [Quickstart Guide](quickstart.md) - Developer reference with code snippets
