# Tasks: Transaction Filtering

**Input**: Design documents from `/specs/003-transaction-filtering/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql-schema.graphql, quickstart.md

**Tests**: Backend tests using Jest with DynamoDB Local. Frontend uses manual testing only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/`
- Backend tests: `backend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure development environment is ready

- [X] T001 Verify DynamoDB Local is running with UserDateIndex and UserCreatedAtIndex GSIs
- [X] T002 [P] Verify backend dependencies installed (Apollo Server 4.x, @aws-sdk/lib-dynamodb 3.x, Zod 3.x)
- [X] T003 [P] Verify frontend dependencies installed (Vue 3.4+, Vuetify 3.x, @vue/apollo-composable 4.x)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core GraphQL schema and type infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add TransactionFilterInput to backend GraphQL schema in backend/src/schema.graphql
- [X] T005 Extend transactions query with filters parameter in backend/src/schema.graphql
- [X] T006 [P] Add TransactionFilterInput TypeScript interface in backend/src/models/Transaction.ts
- [X] T007 [P] Add Zod validation schema for TransactionFilterInput in backend/src/resolvers/transactionResolvers.ts
- [X] T008 Build and verify backend schema compiles with npm run build in backend/
- [X] T009 Sync GraphQL schema to frontend with npm run codegen:sync-schema in frontend/
- [X] T010 Generate TypeScript types in frontend with npm run codegen in frontend/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Filter by Account (Priority: P1) 🎯 MVP

**Goal**: Enable users to filter transactions by one or more accounts using multi-select dropdown with Apply button

**Independent Test**: Select one or more accounts, click Apply, verify only transactions from selected accounts appear in the list

### Backend Tests for User Story 1

- [X] T011 [P] [US1] Write unit test for buildFilterExpression with accountIds filter in backend/tests/repositories/TransactionRepository.test.ts
- [X] T012 [P] [US1] Write integration test for findActiveByUserId with single account filter in backend/tests/repositories/TransactionRepository.test.ts
- [X] T013 [P] [US1] Write integration test for findActiveByUserId with multi-account filter in backend/tests/repositories/TransactionRepository.test.ts

### Backend Implementation for User Story 1

- [X] T014 [US1] Add buildFilterExpression private method with accountIds support in backend/src/repositories/TransactionRepository.ts
- [X] T015 [US1] Update findActiveByUserId method signature to accept filters parameter in backend/src/repositories/TransactionRepository.ts
- [X] T016 [US1] Implement index selection logic (UserDateIndex vs UserCreatedAtIndex) in backend/src/repositories/TransactionRepository.ts
- [X] T017 [US1] Implement KeyConditionExpression building in findActiveByUserId in backend/src/repositories/TransactionRepository.ts
- [X] T018 [US1] Integrate buildFilterExpression into findActiveByUserId query in backend/src/repositories/TransactionRepository.ts
- [X] T019 [US1] Update countActiveTransactions to accept filters parameter in backend/src/repositories/TransactionRepository.ts
- [X] T020 [US1] Update TransactionService.getTransactionsByUser to accept and pass filters in backend/src/services/TransactionService.ts
- [X] T021 [US1] Update transactions resolver to validate and pass filters in backend/src/resolvers/transactionResolvers.ts
- [X] T022 [US1] Run backend tests with npm test in backend/ and verify all US1 tests pass

### Frontend Implementation for User Story 1

- [X] T023 [P] [US1] Create useTransactionFilters composable with account filter state in frontend/src/composables/useTransactionFilters.ts
- [X] T024 [P] [US1] Update GET_TRANSACTIONS_PAGINATED query to include filters parameter in frontend/src/graphql/transactions.ts
- [X] T025 [US1] Update useTransactions composable to accept filters parameter in frontend/src/composables/useTransactions.ts
- [X] T026 [US1] Create TransactionFilterBar.vue component with account multi-select in frontend/src/components/TransactionFilterBar.vue
- [X] T027 [US1] Integrate TransactionFilterBar into transactions page with apply/clear handlers in frontend/src/views/TransactionsPage.vue (or equivalent)
- [X] T028 [US1] Add watcher for appliedFilters to trigger refetch in frontend/src/views/TransactionsPage.vue

**Checkpoint**: Account filtering should be fully functional and testable independently

---

## Phase 4: User Story 2 - Filter by Category (Priority: P1)

**Goal**: Enable users to filter transactions by one or more categories with uncategorized option using multi-select dropdown with Apply button

**Independent Test**: Select one or more categories (including uncategorized option), click Apply, verify only matching transactions appear

### Backend Tests for User Story 2

- [X] T029 [P] [US2] Write unit test for buildFilterExpression with categoryIds filter in backend/tests/repositories/TransactionRepository.test.ts
- [X] T030 [P] [US2] Write unit test for buildFilterExpression with includeUncategorized only in backend/tests/repositories/TransactionRepository.test.ts
- [X] T031 [P] [US2] Write unit test for buildFilterExpression with categoryIds + includeUncategorized in backend/tests/repositories/TransactionRepository.test.ts
- [X] T032 [P] [US2] Write integration test for findActiveByUserId with category filter in backend/tests/repositories/TransactionRepository.test.ts

### Backend Implementation for User Story 2

- [X] T033 [US2] Add categoryIds and includeUncategorized handling to buildFilterExpression in backend/src/repositories/TransactionRepository.ts
- [X] T034 [US2] Implement OR logic for categoryIds IN (...) OR attribute_not_exists(categoryId) in backend/src/repositories/TransactionRepository.ts
- [X] T035 [US2] Run backend tests with npm test in backend/ and verify all US2 tests pass

### Frontend Implementation for User Story 2

- [X] T036 [P] [US2] Add category filter state (selectedCategoryIds, includeUncategorized) to useTransactionFilters in frontend/src/composables/useTransactionFilters.ts
- [X] T037 [P] [US2] Add category multi-select dropdown to TransactionFilterBar.vue in frontend/src/components/TransactionFilterBar.vue
- [X] T038 [US2] Add uncategorized checkbox to TransactionFilterBar.vue in frontend/src/components/TransactionFilterBar.vue
- [X] T039 [US2] Update applyFilters to include category filters in frontend/src/composables/useTransactionFilters.ts

**Checkpoint**: Account AND category filtering should both work independently

---

## Phase 5: User Story 3 - Filter by Date Range (Priority: P2)

**Goal**: Enable users to filter transactions by date range (dateAfter, dateBefore) with Apply button

**Independent Test**: Set dateAfter and/or dateBefore values, click Apply, verify only transactions with dates in range appear

### Backend Tests for User Story 3

- [ ] T040 [P] [US3] Write integration test for findActiveByUserId with dateAfter only in backend/tests/repositories/TransactionRepository.test.ts
- [ ] T041 [P] [US3] Write integration test for findActiveByUserId with dateBefore only in backend/tests/repositories/TransactionRepository.test.ts
- [ ] T042 [P] [US3] Write integration test for findActiveByUserId with date range (both dateAfter and dateBefore) in backend/tests/repositories/TransactionRepository.test.ts
- [ ] T043 [P] [US3] Write integration test for invalid date range (dateAfter > dateBefore) returns empty results in backend/tests/repositories/TransactionRepository.test.ts

### Backend Implementation for User Story 3

- [ ] T044 [US3] Add date filter logic to KeyConditionExpression in findActiveByUserId in backend/src/repositories/TransactionRepository.ts
- [ ] T045 [US3] Implement BETWEEN, >=, and <= operators for date filtering in backend/src/repositories/TransactionRepository.ts
- [ ] T046 [US3] Add date format validation in TransactionService.getTransactionsByUser in backend/src/services/TransactionService.ts
- [ ] T047 [US3] Run backend tests with npm test in backend/ and verify all US3 tests pass

### Frontend Implementation for User Story 3

- [ ] T048 [P] [US3] Add date filter state (dateAfter, dateBefore) to useTransactionFilters in frontend/src/composables/useTransactionFilters.ts
- [ ] T049 [P] [US3] Add date input fields (From Date, To Date) to TransactionFilterBar.vue in frontend/src/components/TransactionFilterBar.vue
- [ ] T050 [US3] Update applyFilters to include date filters in frontend/src/composables/useTransactionFilters.ts

**Checkpoint**: Account, category, AND date filtering should all work independently

---

## Phase 6: User Story 4 - Filter by Transaction Type (Priority: P2)

**Goal**: Enable users to filter transactions by type (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT) using multi-select dropdown with Apply button

**Independent Test**: Select one or more transaction types, click Apply, verify only transactions of selected types appear

### Backend Tests for User Story 4

- [ ] T051 [P] [US4] Write unit test for buildFilterExpression with types filter in backend/tests/repositories/TransactionRepository.test.ts
- [ ] T052 [P] [US4] Write integration test for findActiveByUserId with single type filter in backend/tests/repositories/TransactionRepository.test.ts
- [ ] T053 [P] [US4] Write integration test for findActiveByUserId with multi-type filter (INCOME + TRANSFER_IN) in backend/tests/repositories/TransactionRepository.test.ts

### Backend Implementation for User Story 4

- [ ] T054 [US4] Add types handling to buildFilterExpression with IN operator in backend/src/repositories/TransactionRepository.ts
- [ ] T055 [US4] Add #type attribute name mapping (reserved word) in backend/src/repositories/TransactionRepository.ts
- [ ] T056 [US4] Run backend tests with npm test in backend/ and verify all US4 tests pass

### Frontend Implementation for User Story 4

- [ ] T057 [P] [US4] Add transaction type filter state (selectedTypes) to useTransactionFilters in frontend/src/composables/useTransactionFilters.ts
- [ ] T058 [P] [US4] Add transaction type multi-select dropdown to TransactionFilterBar.vue in frontend/src/components/TransactionFilterBar.vue
- [ ] T059 [US4] Define transaction type options (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT) in TransactionFilterBar.vue
- [ ] T060 [US4] Update applyFilters to include type filters in frontend/src/composables/useTransactionFilters.ts

**Checkpoint**: All four individual filter dimensions should work independently

---

## Phase 7: User Story 5 - Combine Multiple Filters (Priority: P3)

**Goal**: Enable users to apply multiple filters simultaneously (account + category + date + type) with AND logic across filter types

**Independent Test**: Select combinations of filters (e.g., specific accounts + categories + date range + types), click Apply, verify results match ALL applied criteria

### Backend Tests for User Story 5

- [ ] T061 [P] [US5] Write integration test for account + category combination in backend/tests/repositories/TransactionRepository.test.ts
- [ ] T062 [P] [US5] Write integration test for date + account + type combination in backend/tests/repositories/TransactionRepository.test.ts
- [ ] T063 [P] [US5] Write integration test for all four filters combined in backend/tests/repositories/TransactionRepository.test.ts
- [ ] T064 [P] [US5] Write integration test for pagination with filters active (Load More) in backend/tests/repositories/TransactionRepository.test.ts

### Backend Implementation for User Story 5

- [ ] T065 [US5] Verify AND logic combines all filters correctly in buildFilterExpression in backend/src/repositories/TransactionRepository.ts
- [ ] T066 [US5] Verify pagination cursor handling with different indexes (UserDateIndex vs UserCreatedAtIndex) in backend/src/repositories/TransactionRepository.ts
- [ ] T067 [US5] Run all backend tests with npm test in backend/ and verify all 16 filter combinations pass

### Frontend Implementation for User Story 5

- [ ] T068 [US5] Verify all filter state properly combines in applyFilters method in frontend/src/composables/useTransactionFilters.ts
- [ ] T069 [US5] Test Apply button behavior with multiple filters selected in frontend
- [ ] T070 [US5] Test Clear button resets all filters correctly in frontend
- [ ] T071 [US5] Verify pagination Load More works with active filters in frontend

**Checkpoint**: All filter combinations should work correctly together

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, validation, and deployment preparation

- [ ] T072 [P] Add error handling for empty filter results (display "No transactions found" message) in frontend/src/views/TransactionsPage.vue
- [ ] T073 [P] Add loading state handling during filter application in frontend/src/components/TransactionFilterBar.vue
- [ ] T074 [P] Verify backward compatibility: existing queries without filters continue to work
- [ ] T075 Code review and cleanup of backend filter implementation
- [ ] T076 Code review and cleanup of frontend filter UI
- [ ] T077 Manual testing: Test all 16 filter combinations in development environment
- [ ] T078 Manual testing: Test Apply button prevents query on selection changes
- [ ] T079 Manual testing: Test Clear button functionality
- [ ] T080 Manual testing: Test pagination with filters active
- [ ] T081 Manual testing: Test invalid date range (dateAfter > dateBefore) shows empty results
- [ ] T082 Performance verification: Confirm query latency <200ms p95 in development
- [ ] T083 Run all backend unit and integration tests with npm test in backend/
- [ ] T084 Build backend with npm run build in backend/
- [ ] T085 Build frontend with npm run build in frontend/
- [ ] T086 Review quickstart.md for any missed implementation details

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Account)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1 - Category)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2 - Date)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2 - Type)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 5 (P3 - Combined)**: Should start after US1-US4 complete for thorough testing of combinations

### Within Each User Story

- Backend tests before backend implementation (TDD recommended but not required)
- Repository layer before service layer
- Service layer before resolver layer
- Backend implementation before frontend implementation
- Frontend composable before UI components
- Story complete and independently testable before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T003) marked [P] can run in parallel
- All Foundational tasks (T006-T007) marked [P] can run in parallel within Phase 2
- Once Foundational phase completes:
  - US1, US2, US3, US4 can all start in parallel (different filter dimensions)
  - Backend tests within each story marked [P] can run in parallel
  - Frontend implementation tasks within each story marked [P] can run in parallel
- Polish tasks (T072-T076) marked [P] can run in parallel

---

## Parallel Example: User Story 1 (Account Filtering)

```bash
# Launch all backend tests for User Story 1 together:
Task: "Write unit test for buildFilterExpression with accountIds filter"
Task: "Write integration test for findActiveByUserId with single account filter"
Task: "Write integration test for findActiveByUserId with multi-account filter"

# Launch frontend implementation tasks together:
Task: "Create useTransactionFilters composable with account filter state"
Task: "Update GET_TRANSACTIONS_PAGINATED query to include filters parameter"
```

---

## Parallel Example: User Stories 1-4 (After Foundational Complete)

```bash
# With 4 developers, work on all filter dimensions simultaneously:
Developer A: User Story 1 (Account filtering) - T011 through T028
Developer B: User Story 2 (Category filtering) - T029 through T039
Developer C: User Story 3 (Date filtering) - T040 through T050
Developer D: User Story 4 (Type filtering) - T051 through T060

# Each story is independently testable and deliverable
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T011-T028)
4. **STOP and VALIDATE**: Test account filtering independently in development
5. Deploy/demo if ready (MVP = account filtering only)

### Incremental Delivery

1. Complete Setup + Foundational → Schema and types ready
2. Add User Story 1 (Account) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Category) → Test independently → Deploy/Demo
4. Add User Story 3 (Date) → Test independently → Deploy/Demo
5. Add User Story 4 (Type) → Test independently → Deploy/Demo
6. Add User Story 5 (Combined) → Test all combinations → Deploy/Demo
7. Complete Polish → Final production release

### Parallel Team Strategy

With 4-5 developers:

1. Team completes Setup + Foundational together (T001-T010)
2. Once Foundational is done:
   - Developer A: User Story 1 (Account filtering)
   - Developer B: User Story 2 (Category filtering)
   - Developer C: User Story 3 (Date filtering)
   - Developer D: User Story 4 (Type filtering)
3. Developer E (or shared): User Story 5 (Combined filtering) + Polish

---

## Manual Testing Checklist

Since frontend uses manual testing only, use these scenarios:

### User Story 1 - Account Filtering
- [ ] Select single account, click Apply, verify only that account's transactions appear
- [ ] Select multiple accounts, click Apply, verify transactions from any selected account appear
- [ ] Make changes without clicking Apply, verify list doesn't update
- [ ] Clear account filter, click Apply, verify all transactions shown

### User Story 2 - Category Filtering
- [ ] Select single category, click Apply, verify only that category's transactions appear
- [ ] Select multiple categories, click Apply, verify transactions from any selected category appear
- [ ] Check "uncategorized" only, click Apply, verify only uncategorized transactions appear
- [ ] Select categories + uncategorized, click Apply, verify both appear
- [ ] Clear category filter, click Apply, verify all transactions shown

### User Story 3 - Date Filtering
- [ ] Set "From Date" only, click Apply, verify only transactions on/after that date appear
- [ ] Set "To Date" only, click Apply, verify only transactions on/before that date appear
- [ ] Set date range, click Apply, verify only transactions within range appear
- [ ] Set invalid range (From > To), click Apply, verify empty results with "No transactions found"
- [ ] Clear date filters, click Apply, verify all transactions shown

### User Story 4 - Type Filtering
- [ ] Select EXPENSE only, click Apply, verify only expense transactions appear
- [ ] Select INCOME + TRANSFER_IN, click Apply, verify all money received transactions appear
- [ ] Clear type filter, click Apply, verify all transactions shown

### User Story 5 - Combined Filtering
- [ ] Combine account + category, click Apply, verify AND logic (both criteria must match)
- [ ] Combine all four filters, click Apply, verify only transactions matching ALL criteria appear
- [ ] Modify one filter while others active, click Apply, verify new combination works
- [ ] Click Load More with filters active, verify additional matching transactions load
- [ ] Clear all filters, click Apply, verify all transactions shown

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Backend uses Jest tests, frontend uses manual testing
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story works independently
- No new DynamoDB GSIs required - uses existing UserDateIndex and UserCreatedAtIndex
- FilterExpression approach supports all 16 filter combinations
- Apply button pattern: selected state → applied state on button click
