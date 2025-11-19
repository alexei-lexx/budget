# Tasks: Weekday Expense Report Outlier Filtering

**Input**: Design documents from `/specs/011-weekday-outlier-filter/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/schema.graphql

**Tests**: Backend unit tests are explicitly requested per plan.md. Frontend testing is manual.

**Organization**: Tasks organized by implementation layer (backend → frontend) as there is a single user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US1]**: User Story 1 - Filter Outliers from Weekday Averages
- Include exact file paths in descriptions

## Path Conventions

Web application structure:
- Backend: `backend/src/`, `backend/tests/`
- Frontend: `frontend/src/`

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: GraphQL schema changes and type generation that all subsequent tasks depend on

**⚠️ CRITICAL**: No implementation work can begin until this phase is complete

- [ ] T001 Update GraphQL schema to add excludeOutliers parameter to monthlyWeekdayReport query in backend/src/schema.graphql
- [ ] T002 Add outlierCount and outlierTotalAmount fields to MonthlyWeekdayReportCurrencyBreakdown type in backend/src/schema.graphql
- [ ] T003 Run backend codegen to generate TypeScript types from updated schema: `cd backend && npm run codegen`

**Checkpoint**: Schema updated, types generated - backend and frontend implementation can now proceed

---

## Phase 2: User Story 1 - Filter Outliers from Weekday Averages (Priority: P1) 🎯 MVP

**Goal**: Enable users to filter out statistical outliers (like rent payments) from weekday expense averages to see typical spending patterns. Users can toggle a checkbox to exclude outliers; the system calculates outliers using the IQR method and displays outlier information in tooltips.

**Independent Test**:
1. Navigate to monthly weekday expense report
2. Verify checkbox "Exclude outliers from averages" appears and is unchecked by default
3. Enable checkbox and verify bar chart updates within 1 second
4. Hover over weekday bars to verify tooltips show outlier count and total amount (when outliers exist)
5. Navigate away and return to verify checkbox resets to unchecked state

### Tests for User Story 1 (Backend) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T004 [P] [US1] Write unit tests for percentile calculation function in backend/src/utils/statistics.test.ts (create new file)
- [ ] T005 [P] [US1] Write unit tests for IQR outlier detection covering edge cases: <4 transactions, all similar values, all outliers, normal distribution in backend/src/utils/statistics.test.ts
- [ ] T006 [P] [US1] Write unit tests for MonthlyByWeekdayReportService.getMonthlyWeekdayReport with excludeOutliers=false in backend/src/services/MonthlyByWeekdayReportService.test.ts
- [ ] T007 [P] [US1] Write unit tests for MonthlyByWeekdayReportService.getMonthlyWeekdayReport with excludeOutliers=true covering multi-currency and edge cases in backend/src/services/MonthlyByWeekdayReportService.test.ts

### Implementation for User Story 1 (Backend)

- [ ] T008 [P] [US1] Create percentile calculation utility function in backend/src/utils/statistics.ts (create new file)
- [ ] T009 [P] [US1] Create calculateOutliers function using IQR method (Q3 + 1.5×IQR threshold) in backend/src/utils/statistics.ts
- [ ] T010 [US1] Update MonthlyByWeekdayReportService to accept excludeOutliers parameter and implement outlier filtering logic per currency group in backend/src/services/MonthlyByWeekdayReportService.ts
- [ ] T011 [US1] Update MonthlyByWeekdayReportService to populate outlierCount and outlierTotalAmount fields conditionally (only when count > 0) in backend/src/services/MonthlyByWeekdayReportService.ts
- [ ] T012 [US1] Update monthlyByWeekdayReportResolver to accept and validate excludeOutliers parameter using Zod (optional boolean, default false) in backend/src/resolvers/monthlyByWeekdayReportResolver.ts
- [ ] T013 [US1] Update monthlyByWeekdayReportResolver to pass excludeOutliers to service layer in backend/src/resolvers/monthlyByWeekdayReportResolver.ts
- [ ] T014 [US1] Run backend unit tests to verify all tests pass: `cd backend && npm test -- src/utils/statistics.test.ts && npm test -- src/services/MonthlyByWeekdayReportService.test.ts`

### Implementation for User Story 1 (Frontend)

- [ ] T015 [US1] Sync GraphQL schema from backend to frontend: `cd frontend && npm run codegen:sync-schema`
- [ ] T016 [US1] Regenerate frontend typed composables from updated schema: `cd frontend && npm run codegen`
- [ ] T017 [US1] Update MONTHLY_WEEKDAY_REPORT_QUERY to include excludeOutliers parameter and outlierCount/outlierTotalAmount fields in frontend/src/graphql/monthlyWeekdayReport.ts
- [ ] T018 [US1] Add v-checkbox component with label "Exclude outliers from averages" and bind to local excludeOutliers ref (default false) in frontend/src/components/reports/MonthlyWeekdayExpenseReport.vue
- [ ] T019 [US1] Update useMonthlyWeekdayReportQuery call to include excludeOutliers reactive parameter in frontend/src/components/reports/MonthlyWeekdayExpenseReport.vue
- [ ] T020 [US1] Update tooltip rendering to conditionally display outlier information (count and total amount) when breakdown.outlierCount > 0 in frontend/src/components/reports/MonthlyWeekdayExpenseReport.vue

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. All backend tests should pass, and the frontend should display the checkbox and outlier-filtered results.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and validation

- [ ] T021 [P] Manual testing: Verify checkbox defaults to unchecked on page load
- [ ] T022 [P] Manual testing: Toggle checkbox and verify bar chart updates within 1 second with filtered data
- [ ] T023 [P] Manual testing: Verify tooltips show outlier info (count and total) only when outlierCount > 0 for each currency breakdown
- [ ] T024 [P] Manual testing: Verify edge case with <4 transactions per weekday shows no filtering (all transactions included)
- [ ] T025 [P] Manual testing: Navigate away from report and return to verify checkbox resets to unchecked state (no persistence)
- [ ] T026 [P] Manual testing: Verify multi-currency handling - outliers detected separately per currency in each weekday breakdown
- [ ] T027 Run full quickstart.md validation workflow to ensure developer onboarding guide is accurate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies - can start immediately, BLOCKS all subsequent work
- **User Story 1 (Phase 2)**: Depends on Foundational completion (schema and types must exist)
  - Tests can run in parallel with each other (T004-T007)
  - Backend implementation utilities can run in parallel (T008, T009)
  - Service/resolver updates are sequential after utilities (T010-T013)
  - Frontend work is sequential (T015-T020) - schema sync must complete before query/component updates
- **Polish (Phase 3)**: Depends on User Story 1 completion, all manual tests can run in parallel

### Within User Story 1

**Backend:**
1. Tests first (T004-T007) - all can run in parallel [P]
2. Utility functions (T008-T009) - both can run in parallel [P]
3. Service layer updates (T010-T011) - sequential, depend on utilities
4. Resolver updates (T012-T013) - sequential, depend on service layer
5. Run tests (T014) - verify all tests pass

**Frontend:**
1. Schema sync (T015) - must complete first
2. Codegen (T016) - depends on T015
3. Query update (T017) - can start after T016
4. Component updates (T018-T020) - sequential, build on each other

### Parallel Opportunities

**Phase 1 (Foundational):**
- T001-T002 can be done in same edit (both schema changes)
- T003 runs after schema edits

**Phase 2 - User Story 1 (Tests):**
```bash
# Launch all backend test writing tasks in parallel:
Task T004: "Write unit tests for percentile calculation"
Task T005: "Write unit tests for IQR outlier detection"
Task T006: "Write unit tests for service without outliers"
Task T007: "Write unit tests for service with outliers"
```

**Phase 2 - User Story 1 (Backend Implementation):**
```bash
# Launch utility function implementations in parallel:
Task T008: "Create percentile calculation utility"
Task T009: "Create calculateOutliers function"
```

**Phase 3 (Polish):**
```bash
# Launch all manual testing tasks in parallel:
Task T021: "Verify checkbox default state"
Task T022: "Verify chart updates on toggle"
Task T023: "Verify tooltip outlier display"
Task T024: "Verify edge case <4 transactions"
Task T025: "Verify checkbox state persistence"
Task T026: "Verify multi-currency handling"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

This feature has a single user story, so the MVP is the complete feature:

1. Complete Phase 1: Foundational (schema updates, codegen)
2. Complete Phase 2: User Story 1
   - Write backend tests first (T004-T007)
   - Implement backend utilities (T008-T009)
   - Implement backend service/resolver (T010-T013)
   - Run tests to verify (T014)
   - Implement frontend (T015-T020)
3. **STOP and VALIDATE**: Run Phase 3 manual tests
4. Deploy/demo

### Test-Driven Development Workflow

**Backend:**
1. Write all unit tests for utilities (T004-T005) → Verify they FAIL
2. Implement utility functions (T008-T009) → Verify tests PASS
3. Write service layer tests (T006-T007) → Verify they FAIL
4. Implement service layer (T010-T011) → Verify tests PASS
5. Update resolver (T012-T013) → Run all tests (T014)

**Frontend:**
1. Sync schema and codegen (T015-T016)
2. Update query and component (T017-T020)
3. Manual validation (Phase 3)

### Single Developer Strategy

Sequential execution:
1. Phase 1 (T001-T003) - Foundation setup
2. Phase 2 Backend Tests (T004-T007) - Can parallelize if using agents
3. Phase 2 Backend Implementation (T008-T014) - Sequential with some parallel opportunities
4. Phase 2 Frontend (T015-T020) - Sequential
5. Phase 3 (T021-T027) - Manual validation

---

## Notes

- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[US1] label**: All tasks belong to User Story 1 (single story feature)
- **Test-first approach**: Backend tests (T004-T007) MUST be written and fail before implementation
- **Schema-driven development**: Frontend cannot proceed until backend schema is updated (T001-T003)
- **No state persistence**: Frontend checkbox must default to unchecked (spec requirement FR-001)
- **Multi-currency**: IQR applied separately per currency group (research.md decision)
- **Edge cases**: <4 transactions per weekday = no filtering (research.md decision)
- **Performance target**: <1 second response time for filtering (plan.md requirement)
- Commit after each logical task or small group of related tasks
- Stop at checkpoints to validate independently before proceeding

---

## Total Task Count

- **Phase 1 (Foundational)**: 3 tasks
- **Phase 2 (User Story 1)**: 17 tasks (4 tests, 10 implementation, 3 verification)
- **Phase 3 (Polish)**: 7 tasks
- **Total**: 27 tasks

### Tasks per User Story

- **User Story 1 (P1)**: 24 tasks (includes tests, backend, frontend)
- **Infrastructure/Polish**: 3 tasks

### Parallel Opportunities Identified

- Phase 1: Schema edits can be combined (2 schema changes in one edit)
- Phase 2 Tests: 4 test tasks can run in parallel
- Phase 2 Backend Utilities: 2 utility tasks can run in parallel
- Phase 3 Manual Tests: 6 manual test tasks can run in parallel

### Independent Test Criteria

**User Story 1**:
1. Checkbox appears and defaults to unchecked
2. Toggling checkbox triggers new GraphQL query with excludeOutliers parameter
3. Backend calculates outliers using IQR method (verified by unit tests)
4. Chart updates with filtered data within 1 second
5. Tooltips show outlier count and total amount only when outliers exist
6. Checkbox resets to unchecked on navigation (no persistence)
7. Multi-currency reports handle outliers separately per currency

### Suggested MVP Scope

**MVP = Complete Feature**: User Story 1 is the entire feature. Deploy after completing all phases and validating via Phase 3 manual tests.

**Incremental Deployment Option**:
1. Deploy backend-only first (T001-T014) - API ready but no UI
2. Deploy frontend second (T015-T020) - Complete feature live

### Format Validation

✅ All 27 tasks follow the checklist format:
- Start with `- [ ]` checkbox
- Include task ID (T001-T027) in execution order
- Include `[P]` marker for parallelizable tasks
- Include `[US1]` label for all User Story 1 tasks
- Include clear description with exact file path
