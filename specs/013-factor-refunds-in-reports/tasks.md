# Tasks: Factor Refunds in Expense Reports

**Input**: Design documents from `/specs/013-factor-refunds-in-reports/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md), [quickstart.md](quickstart.md)

**Organization**: Tasks are grouped by implementation phase. This feature has one user story (US1) with backend-only changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Repository: `/home/alex/workspace/budget2`

---

## Phase 1: Setup (Verification)

**Purpose**: Verify environment and dependencies before implementation

- [ ] T001 Verify backend development environment is running (DynamoDB Local, npm install)
- [ ] T002 Read constitution to understand project standards in .specify/memory/constitution.md

---

## Phase 2: Foundational (Repository Refactoring)

**Purpose**: Refactor repository method to support multiple transaction types - BLOCKS User Story 1

**⚠️ CRITICAL**: This phase must be complete before implementing US1 net calculation logic

### Repository Interface Updates

- [ ] T003 [P] Rename interface method from findActiveByMonthAndType to findActiveByMonthAndTypes in backend/src/models/Transaction.ts
- [ ] T004 [P] Update interface signature to accept types: TransactionType[] instead of type: TransactionType in backend/src/models/Transaction.ts

### Repository Implementation Updates

- [ ] T005 Rename implementation method from findActiveByMonthAndType to findActiveByMonthAndTypes in backend/src/repositories/TransactionRepository.ts
- [ ] T006 Update implementation to filter by multiple types using array includes in backend/src/repositories/TransactionRepository.ts

### Update Existing Callers

- [ ] T007 [P] Update MonthlyByWeekdayReportService to use findActiveByMonthAndTypes with array parameter in backend/src/services/MonthlyByWeekdayReportService.ts
- [ ] T008 [P] Update mock repository to use findActiveByMonthAndTypes in backend/src/__tests__/utils/mockRepositories.ts

### Repository Tests

- [ ] T009 [P] Update existing repository tests to use findActiveByMonthAndTypes with array syntax in backend/src/repositories/TransactionRepository.test.ts
- [ ] T010 [P] Add repository test for multiple transaction types (EXPENSE + REFUND) in backend/src/repositories/TransactionRepository.test.ts
- [ ] T011 [P] Add repository test for month boundary filtering in backend/src/repositories/TransactionRepository.test.ts
- [ ] T012 [P] Add repository test for archived transaction exclusion in backend/src/repositories/TransactionRepository.test.ts
- [ ] T013 Run repository tests to verify refactoring works correctly (npm test TransactionRepository.test.ts)

**Checkpoint**: Repository layer refactored - all tests passing, ready for service layer changes

---

## Phase 3: User Story 1 - Correctly Calculated Category Totals in Reports (Priority: P1) 🎯 MVP

**Goal**: Calculate net category totals (expenses - refunds) in monthly expense reports so users see accurate net spending

**Independent Test**: Navigate to monthly expense report and verify that categories with both expenses and refunds show net amounts (total expenses - total refunds)

### Service Layer Implementation

- [ ] T014 [US1] Update MonthlyByCategoryReportService.call() to fetch [EXPENSE, REFUND] types for EXPENSE reports in backend/src/services/MonthlyByCategoryReportService.ts
- [ ] T015 [US1] Add private calculateCurrencyTotals() method with shouldCalculateNet parameter in backend/src/services/MonthlyByCategoryReportService.ts
- [ ] T016 [US1] Implement single-pass net amount calculation (expense adds, refund subtracts) in calculateCurrencyTotals in backend/src/services/MonthlyByCategoryReportService.ts
- [ ] T017 [US1] Update groupByCategoryAndCurrency() to accept shouldCalculateNet flag in backend/src/services/MonthlyByCategoryReportService.ts
- [ ] T018 [US1] Update calculateCurrencyBreakdowns() to accept shouldCalculateNet flag and implement net calculation in backend/src/services/MonthlyByCategoryReportService.ts
- [ ] T019 [US1] Fix percentage calculation to handle negative totals (change > 0 to !== 0) in backend/src/services/MonthlyByCategoryReportService.ts

### Service Tests

- [ ] T020 [P] [US1] Update existing service test mocks to use findActiveByMonthAndTypes in backend/src/services/MonthlyByCategoryReportService.test.ts
- [ ] T021 [P] [US1] Add service test for net amount calculation (expenses - refunds) in backend/src/services/MonthlyByCategoryReportService.test.ts
- [ ] T022 [P] [US1] Add service test for negative net amount (refunds > expenses) in backend/src/services/MonthlyByCategoryReportService.test.ts
- [ ] T023 [P] [US1] Add service test verifying INCOME reports unchanged (no refund factoring) in backend/src/services/MonthlyByCategoryReportService.test.ts
- [ ] T024 [P] [US1] Add service test for multiple currencies with refunds in backend/src/services/MonthlyByCategoryReportService.test.ts
- [ ] T025 [P] [US1] Add service test for uncategorized transactions with refunds in backend/src/services/MonthlyByCategoryReportService.test.ts
- [ ] T026 [US1] Run all service tests to verify net calculation logic (npm test MonthlyByCategoryReportService.test.ts)

### Integration Verification

- [ ] T027 [US1] Run full backend test suite to ensure no regressions (npm test in backend/)
- [ ] T028 [US1] Verify TypeScript compilation with no errors (npx tsc --noEmit in backend/)

**Checkpoint**: User Story 1 complete - all tests passing, net calculation working correctly

---

## Phase 4: Manual Testing & Validation

**Purpose**: Validate feature with real data using quickstart.md test scenarios

- [ ] T029 Start backend and frontend development servers (npm run dev in both backend/ and frontend/)
- [ ] T030 Create test transaction data: Clothes category with €1000 expense and €200 refund for Nov 2025
- [ ] T031 Create test transaction data: Food category with €500 expense for Nov 2025
- [ ] T032 Create test transaction data: Travel category with €300 refund only for Nov 2025
- [ ] T033 Query monthlyReport via GraphQL playground to verify Clothes shows €800 net
- [ ] T034 Verify Food category shows €500 (no refunds)
- [ ] T035 Verify Travel category shows -€300 (refunds only)
- [ ] T036 Verify currency totals show correct net total across all categories
- [ ] T037 Verify INCOME report behavior unchanged (query with type: INCOME)
- [ ] T038 Test frontend monthly expense report page displays net amounts correctly
- [ ] T039 Verify negative amounts display with minus sign in frontend UI

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Code quality, documentation, and final validation

- [ ] T040 [P] Run code formatting (npm run format in backend/)
- [ ] T041 [P] Run linting and fix issues (npm run lint:fix in backend/)
- [ ] T042 [P] Add JSDoc comments to MonthlyByCategoryReportService explaining refund factoring in backend/src/services/MonthlyByCategoryReportService.ts
- [ ] T043 [P] Add JSDoc comments to repository method explaining multi-type support in backend/src/repositories/TransactionRepository.ts
- [ ] T044 Run quickstart.md validation checklist (verify all checklist items pass)
- [ ] T045 Final verification: Run all tests one more time (npm test in backend/)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS User Story 1
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **Manual Testing (Phase 4)**: Depends on User Story 1 (Phase 3) completion
- **Polish (Phase 5)**: Depends on Manual Testing (Phase 4) completion

### Within Phase 2 (Foundational)

1. Repository interface updates (T003, T004) can run in parallel
2. Repository implementation (T005, T006) depends on interface updates
3. Update existing callers (T007, T008) can run in parallel after implementation
4. All repository tests (T009-T012) can run in parallel
5. Run repository tests (T013) must be last

### Within Phase 3 (User Story 1)

1. Service layer implementation (T014-T019) must run sequentially (same file)
2. All service tests (T020-T025) can run in parallel
3. Run service tests (T026) after test writing
4. Integration verification (T027, T028) must be last

### Within Phase 4 (Manual Testing)

1. Start servers (T029) must be first
2. Create test data (T030-T032) can run in parallel
3. GraphQL verification (T033-T037) depends on test data
4. Frontend verification (T038-T039) depends on test data

### Within Phase 5 (Polish)

- All tasks (T040-T043) can run in parallel
- T044 and T045 should run last for final validation

### Parallel Opportunities

**Phase 2 - Foundational**:
```bash
# Parallel: Repository interface updates
Task T003: Rename interface method
Task T004: Update interface signature

# Parallel: Update existing callers
Task T007: Update MonthlyByWeekdayReportService
Task T008: Update mock repository

# Parallel: Repository tests
Task T009: Update existing tests
Task T010: Add multi-type test
Task T011: Add boundary test
Task T012: Add archived test
```

**Phase 3 - User Story 1**:
```bash
# Parallel: Service tests
Task T020: Update existing mocks
Task T021: Net amount test
Task T022: Negative amount test
Task T023: INCOME unchanged test
Task T024: Multi-currency test
Task T025: Uncategorized test
```

**Phase 4 - Manual Testing**:
```bash
# Parallel: Create test data
Task T030: Clothes category data
Task T031: Food category data
Task T032: Travel category data
```

**Phase 5 - Polish**:
```bash
# Parallel: Code quality
Task T040: Run formatting
Task T041: Run linting
Task T042: Add service JSDoc
Task T043: Add repository JSDoc
```

---

## Implementation Strategy

### MVP First (Complete Feature)

This feature has one user story (US1), so MVP = complete feature:

1. **Phase 1**: Setup - verify environment (5 min)
2. **Phase 2**: Foundational - refactor repository (45 min + 30 min tests = 75 min)
3. **Phase 3**: User Story 1 - implement net calculation (45 min + 45 min tests = 90 min)
4. **Phase 4**: Manual Testing - validate with real data (30 min)
5. **Phase 5**: Polish - code quality and final checks (15 min)

**Total Estimated Time**: 3.5 hours

### Incremental Validation

1. **After Phase 2**: All repository tests pass → Repository refactoring verified
2. **After Phase 3**: All service tests pass → Net calculation verified
3. **After Phase 4**: Manual tests pass → Feature works end-to-end
4. **After Phase 5**: Code quality checks pass → Ready to commit/deploy

### Stop Points for Review

- **After T013**: Review repository refactoring - all existing functionality intact
- **After T026**: Review service layer changes - net calculation working
- **After T039**: Review manual testing - feature working end-to-end
- **After T045**: Final review - feature complete and polished

---

## User Story Success Criteria

### User Story 1 - Correctly Calculated Category Totals (P1)

**Acceptance Scenarios** (from spec.md):

1. ✅ **Scenario 1**: €1000 expenses + €200 refunds in "Clothes" → Report shows €800
   - Verified by: T033 (manual GraphQL test)

2. ✅ **Scenario 2**: €500 expenses, no refunds in "Groceries" → Report shows €500
   - Verified by: T034 (manual GraphQL test)

3. ✅ **Scenario 3**: No expenses or refunds in "Electronics" → Not displayed or €0
   - Verified by: Service tests with empty data

4. ✅ **Scenario 4**: €300 refunds, no expenses in "Travel" → Report shows -€300
   - Verified by: T035 (manual GraphQL test) + T022 (service test)

**Independent Test**: After T039, navigate to frontend monthly expense report and verify net amounts are displayed correctly for all scenarios above

---

## Notes

- **[P]** tasks = different files, no dependencies - can run in parallel
- **[US1]** label maps task to User Story 1 for traceability
- **Backend-only changes**: No frontend modifications required (per plan.md)
- **No schema changes**: Purely behavioral change (per contracts/README.md)
- **Constitution compliance**: Follows schema-driven development, three-layer architecture, repository pattern, test strategy
- **Performance**: Expected report generation < 2 seconds for 1000 transactions (per SC-002 in spec.md)
- Commit after each phase completion
- Use quickstart.md as detailed implementation guide
- Verify tests fail before implementing (for new tests)
