# Implementation Tasks: Exclude Categories from Reports

**Feature**: Exclude Categories from Reports
**Branch**: `028-exclude-non-operating`
**Estimated Total Time**: 4-6 hours

---

## Task Organization

Tasks are organized by user story to enable independent implementation and testing. Each phase represents a complete, independently testable increment.

---

## Phase 1: Setup & Infrastructure

### Project Initialization

- [X] T001 Verify local development environment is running (DynamoDB Docker container)
- [ ] T002 Confirm backend and frontend development servers can start without errors

---

## Phase 2: Foundational Changes (Must complete before user stories)

### Backend Schema & Type System

- [X] T003 [P] Add `excludeFromReports: Boolean!` field to Category type in `backend/src/schema.graphql`
- [X] T004 [P] Add `excludeFromReports: Boolean!` to CreateCategoryInput in `backend/src/schema.graphql`
- [X] T005 [P] Add `excludeFromReports: Boolean` (optional) to UpdateCategoryInput in `backend/src/schema.graphql`
- [X] T006 Run `npm run codegen` in backend to regenerate TypeScript types from GraphQL schema
- [X] T007 [P] Add `excludeFromReports: boolean` field to Category interface in `backend/src/models/category.ts`
- [X] T008 [P] Add `excludeFromReports: boolean` field to CreateCategoryInput interface in `backend/src/models/category.ts`
- [X] T009 [P] Add `excludeFromReports?: boolean` field to UpdateCategoryInput interface in `backend/src/models/category.ts`
- [X] T010 [P] Add `excludeFromReports: z.boolean()` to categorySchema in `backend/src/repositories/schemas/category.ts`
- [X] T011 Run `npm run type-check` in backend to verify TypeScript compilation

### Database Migration

- [X] T012 Create migration file `backend/src/migrations/YYYYMMDDHHMMSS-add-exclude-from-reports.ts` with idempotent logic to set `excludeFromReports: false` on existing categories
- [X] T013 Test migration locally against DynamoDB Docker container via `npm run migrate`
- [X] T014 Verify migration is idempotent by running it twice and confirming no errors

### Test Data Factories

- [X] T015 [P] Update `fakeCategory()` in `backend/src/__tests__/utils/factories.ts` to include `excludeFromReports: false`
- [X] T016 [P] Update `fakeCreateCategoryInput()` in `backend/src/__tests__/utils/factories.ts` to include `excludeFromReports: false`

---

## Phase 3: User Story 1 - Exclude Category from Reports (P1)

**Goal**: Enable users to mark categories as "Exclude from reports" and persist this setting.

**Independent Test Criteria**:
- Create a category with `excludeFromReports: true` → Category saved with flag enabled
- Update existing category to toggle exclusion status → Change persists
- Query categories → `excludeFromReports` field returned correctly

### Backend Implementation

- [X] T017 [US1] Run backend tests to verify repository handles new field: `npm test -- category-repository.test.ts`
- [X] T018 [US1] Run backend tests to verify service passes field correctly: `npm test -- category-service.test.ts`
- [ ] T019 [US1] Test GraphQL createCategory mutation with `excludeFromReports: true` via GraphQL Playground
- [ ] T020 [US1] Test GraphQL updateCategory mutation to toggle `excludeFromReports` via GraphQL Playground
- [ ] T021 [US1] Test GraphQL categories query returns `excludeFromReports` field via GraphQL Playground

### Frontend Integration

- [X] T022 [US1] Run `npm run codegen:sync-schema` in frontend to sync GraphQL schema from backend
- [X] T023 [US1] Run `npm run codegen` in frontend to regenerate TypeScript types and composables
- [X] T024 [US1] Add `v-switch` for "Exclude from reports" to category create/edit dialog component
- [X] T025 [US1] Bind switch to `excludeFromReports` field in category form model
- [X] T026 [US1] Add help text explaining feature below toggle switch
- [X] T027 [US1] Set default value to `false` for new category form (UI default only)
- [ ] T028 [US1] Test create category with exclusion enabled in browser
- [ ] T029 [US1] Test edit category to toggle exclusion status in browser
- [ ] T030 [US1] Verify `excludeFromReports` field displays correctly when viewing categories in browser

---

## Phase 4: User Story 2 - View Accurate Monthly Reports (P1)

**Goal**: Monthly reports exclude transactions in excluded categories from totals and breakdown.

**Independent Test Criteria**:
- Create excluded category with transactions → Monthly report excludes those transactions from totals
- Category breakdown does not include excluded categories
- Toggling exclusion status updates reports immediately

### Backend Report Service

- [X] T031 [US2] Modify `call()` method in `backend/src/services/monthly-by-category-report-service.ts` to fetch all categories after fetching transactions
- [X] T032 [US2] Add logic to filter categories where `!excludeFromReports` and build `includedCategoryIds` Set in `backend/src/services/monthly-by-category-report-service.ts`
- [X] T033 [US2] Add logic to filter transactions to only included categories (preserve uncategorized) in `backend/src/services/monthly-by-category-report-service.ts`
- [X] T034 [US2] Pass filtered transactions to `calculateCurrencyTotals()` in `backend/src/services/monthly-by-category-report-service.ts`
- [X] T035 [US2] Pass filtered transactions to `groupByCategoryAndCurrency()` in `backend/src/services/monthly-by-category-report-service.ts`

### Backend Report Tests

- [X] T036 [US2] Add test case "should exclude transactions in excluded categories from totals" to `backend/src/services/monthly-by-category-report-service.test.ts`
- [X] T037 [US2] Add test case "should exclude excluded categories from category breakdown" to `backend/src/services/monthly-by-category-report-service.test.ts`
- [X] T038 [US2] Add test case "should include uncategorized transactions even with excluded categories" to `backend/src/services/monthly-by-category-report-service.test.ts`
- [X] T039 [US2] Add test case "should return zero totals when all categories are excluded" to `backend/src/services/monthly-by-category-report-service.test.ts`
- [X] T040 [US2] Run all report service tests: `npm test -- monthly-by-category-report-service.test.ts`

### Frontend Report Verification

- [ ] T041 [US2] Create test category "Investments" with exclusion enabled
- [ ] T042 [US2] Create test transactions in excluded category (e.g., $5000 investment purchase)
- [ ] T043 [US2] Create test transactions in included category (e.g., $500 groceries)
- [ ] T044 [US2] Navigate to monthly report and verify excluded transactions not in totals
- [ ] T045 [US2] Verify excluded category not in breakdown section
- [ ] T046 [US2] Toggle category exclusion status and verify report updates immediately
- [ ] T047 [US2] Verify account balances remain accurate (not affected by exclusion)

---

## Phase 5: User Story 3 - Track Loans to Friends/Family (P2)

**Goal**: Validate bidirectional exclusions (both income and expense categories can be excluded).

**Independent Test Criteria**:
- Create excluded expense category "Loans - Outgoing" → Loan transactions excluded from expense reports
- Create excluded income category "Loans - Incoming" → Repayment transactions excluded from income reports
- Transaction history shows both transactions, reports exclude both

### Manual Testing

- [ ] T048 [US3] Create expense category "Loans - Outgoing" with `excludeFromReports: true`
- [ ] T049 [US3] Create income category "Loans - Incoming" with `excludeFromReports: true`
- [ ] T050 [US3] Record $500 loan to friend as expense in "Loans - Outgoing"
- [ ] T051 [US3] Record $500 loan repayment as income in "Loans - Incoming"
- [ ] T052 [US3] Verify both transactions appear in transaction history
- [ ] T053 [US3] View monthly expense report → Verify loan-out not in totals
- [ ] T054 [US3] View monthly income report → Verify loan-in not in totals
- [ ] T055 [US3] Verify account balance reflects both transactions (net zero)

---

## Phase 6: User Story 4 - Track Reimbursable Business Expenses (P2)

**Goal**: Validate feature works for employer reimbursement scenarios.

**Independent Test Criteria**:
- Create excluded expense category "Work Expenses" → Out-of-pocket expense excluded from reports
- Create excluded income category "Reimbursements" → Employer reimbursement excluded from reports
- Net effect on reports is zero

### Manual Testing

- [ ] T056 [US4] Create expense category "Work Expenses" with `excludeFromReports: true`
- [ ] T057 [US4] Create income category "Reimbursements" with `excludeFromReports: true`
- [ ] T058 [US4] Record $200 work supplies purchase as expense in "Work Expenses"
- [ ] T059 [US4] Record $200 employer reimbursement as income in "Reimbursements"
- [ ] T060 [US4] Verify both transactions appear in transaction history
- [ ] T061 [US4] View monthly expense report → Verify work expense not in totals
- [ ] T062 [US4] View monthly income report → Verify reimbursement not in totals
- [ ] T063 [US4] Verify net effect on personal spending analysis is zero

---

## Phase 7: Polish & Cross-Cutting Concerns

### Code Quality

- [X] T064 [P] Run `npm run format` in backend to format all modified code
- [X] T065 [P] Run `npm run lint` in backend and fix any ESLint errors
- [X] T066 [P] Run `npm run format` in frontend to format all modified code
- [X] T067 [P] Run `npm run lint` in frontend and fix any ESLint errors
- [X] T068 Run all backend tests: `npm test` in backend directory
- [X] T069 Test frontend build: `npm run build` in frontend directory

### Edge Case Testing

- [ ] T070 Test edge case: Exclude a category mid-month → Verify historical transactions excluded from current month report
- [ ] T071 Test edge case: All categories excluded → Verify report shows zero totals with empty breakdown
- [ ] T072 Test edge case: Uncategorized transactions → Verify they remain included in reports
- [ ] T073 Test edge case: Category with refunds → Verify refunds follow same exclusion rules as original transactions

### Documentation & Cleanup

- [ ] T074 Review all changed files for console.log statements and remove debug code
- [ ] T075 Verify no breaking changes to existing API consumers (after migration runs)
- [ ] T076 Document any known limitations or future enhancements in code comments

---

## Dependencies

### Dependency Graph (User Story Completion Order)

```
Phase 1 (Setup) → Phase 2 (Foundational) → User Stories (parallel)
                                          ├→ US1 (P1)
                                          ├→ US2 (P1) [depends on US1]
                                          ├→ US3 (P2) [depends on US1, US2]
                                          └→ US4 (P2) [depends on US1, US2]

All User Stories → Phase 7 (Polish)
```

### Critical Path

1. **Must complete Phase 2 before any user stories** - Schema, types, and migration are foundational
2. **US1 must complete before US2** - Can't test reports without ability to set exclusion flag
3. **US3 and US4 can run in parallel** - Both depend on US1+US2 but are independent of each other

---

## Parallel Execution Opportunities

### Phase 2 Parallel Tasks
- T003-T005 (GraphQL schema changes) can be done simultaneously
- T007-T009 (TypeScript interface changes) can be done simultaneously
- T015-T016 (Factory updates) can be done simultaneously

### Phase 3 (US1) Parallel Tasks
- T017-T018 (Backend tests) can run simultaneously
- T024-T027 (Frontend UI changes) can be done simultaneously after T022-T023 complete

### Phase 4 (US2) Parallel Tasks
- T031-T035 (Report service modifications) should be sequential (same file, same method)
- T036-T039 (Test cases) can be written simultaneously

### Phase 5 & 6 Parallel Tasks
- US3 and US4 can be executed completely in parallel (independent test scenarios)

### Phase 7 Parallel Tasks
- T064-T067 (Code quality) can run in parallel (backend and frontend separate)
- T070-T073 (Edge case testing) can run in parallel

---

## Implementation Strategy

**MVP Scope**: User Story 1 + User Story 2 (P1 items)
- Delivers core functionality: ability to exclude categories and see accurate reports
- Can be deployed independently for user validation

**Incremental Delivery**:
1. **Sprint 1**: Phase 1 + Phase 2 (foundational setup)
2. **Sprint 2**: Phase 3 (US1 - category exclusion flag)
3. **Sprint 3**: Phase 4 (US2 - report filtering)
4. **Sprint 4**: Phase 5 + Phase 6 (US3 + US4 - use case validation)
5. **Sprint 5**: Phase 7 (polish and edge cases)

**Suggested MVP**: Complete through Phase 4 (US1 + US2) for initial release.

---

## Summary

- **Total Tasks**: 76
- **By Phase**:
  - Phase 1 (Setup): 2 tasks
  - Phase 2 (Foundational): 14 tasks
  - Phase 3 (US1): 14 tasks
  - Phase 4 (US2): 17 tasks
  - Phase 5 (US3): 8 tasks
  - Phase 6 (US4): 8 tasks
  - Phase 7 (Polish): 13 tasks

- **By User Story**:
  - US1 (Exclude Category): 14 tasks
  - US2 (View Reports): 17 tasks
  - US3 (Track Loans): 8 tasks
  - US4 (Track Reimbursements): 8 tasks

- **Parallelizable Tasks**: 15 tasks marked with [P]
- **Independent Test Criteria**: Each user story has clear acceptance criteria
- **MVP Scope**: 47 tasks (Phase 1-4, excludes US3 and US4)

**Format Validation**: ✅ All tasks follow checklist format (checkbox, ID, optional labels, file paths where applicable)
