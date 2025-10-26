# Tasks: Rename Transaction Filter Buttons

**Input**: Design documents from `/specs/005-rename-filter-buttons/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: This feature has 2 independent user stories (both P1) that involve renaming button labels. Each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions
- **Frontend**: `frontend/src/`, `frontend/tests/`
- Paths shown below follow the web app structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify environment and locate affected files

- [x] T001 Verify TransactionFilterBar.vue exists at `frontend/src/components/transactions/TransactionFilterBar.vue`
- [x] T002 Locate and verify test file at `frontend/tests/components/transactions/TransactionFilterBar.spec.ts`
- [x] T003 Understand current button implementation and styling in TransactionFilterBar.vue

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish baseline before implementing changes

**⚠️ CRITICAL**: Inspection and verification must complete before implementation starts

- [x] T004 Document current button text and styling from TransactionFilterBar.vue (lines 100-107)
- [x] T005 Identify all test assertions that reference button text in TransactionFilterBar.spec.ts
- [x] T006 Verify no other components reference "Apply Filters" or "Clear Filters" strings across codebase

**Checkpoint**: Current state documented and no hidden dependencies found

---

## Phase 3: User Story 1 - Apply Transaction Filters (Priority: P1) 🎯 MVP

**Goal**: Rename "Apply Filters" button to "Apply" while preserving all functionality and styling

**Independent Test**: Open transaction filter bar, select filter criteria, verify button displays "Apply" and correctly applies selected filters when clicked

### Implementation for User Story 1

- [x] T007 [P] [US1] Update "Apply Filters" button text to "Apply" in `frontend/src/components/transactions/TransactionFilterBar.vue` line 100
- [x] T008 [P] [US1] Update test assertions for "Apply Filters" button text in `frontend/tests/components/transactions/TransactionFilterBar.spec.ts`
- [x] T009 [US1] Run Jest tests to verify button functionality still works correctly: `cd frontend && npm test -- TransactionFilterBar`
- [x] T010 [US1] Manually test: Open Transactions page, select filter criteria, click "Apply" button, verify filters apply correctly

**Checkpoint**: User Story 1 complete - "Apply Filters" renamed to "Apply" with all tests passing

---

## Phase 4: User Story 2 - Clear Transaction Filters (Priority: P1)

**Goal**: Rename "Clear Filters" button to "Clear" while preserving all functionality and styling

**Independent Test**: Open transaction filter bar with filters applied, verify button displays "Clear" and correctly clears all filters when clicked

### Implementation for User Story 2

- [x] T011 [P] [US2] Update "Clear Filters" button text to "Clear" in `frontend/src/components/transactions/TransactionFilterBar.vue` lines 101-107
- [x] T012 [P] [US2] Update test assertions for "Clear Filters" button text in `frontend/tests/components/transactions/TransactionFilterBar.spec.ts`
- [x] T013 [US2] Run Jest tests to verify button functionality still works correctly: `cd frontend && npm test -- TransactionFilterBar`
- [x] T014 [US2] Manually test: Open Transactions page with filters applied, click "Clear" button, verify all filters are cleared and full list displays

**Checkpoint**: User Story 2 complete - "Clear Filters" renamed to "Clear" with all tests passing

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and code quality

- [x] T015 [P] Run full frontend test suite: `cd frontend && npm test`
- [x] T016 [P] Run linting checks: `cd frontend && npm run lint`
- [x] T017 [P] Run formatting check: `cd frontend && npm run prettier`
- [x] T018 Verify no other components in codebase contain "Apply Filters" or "Clear Filters" strings
- [x] T019 Manual regression test: Navigate through transactions page, test all filter operations end-to-end
- [x] T020 Verify button styling and positioning remain unchanged after text updates

**Checkpoint**: All changes complete, tests passing, code quality verified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verify files exist
- **Foundational (Phase 2)**: Depends on Setup - document current state and verify no hidden dependencies
- **User Story 1 (Phase 3)**: Depends on Foundational - rename "Apply Filters" to "Apply"
- **User Story 2 (Phase 4)**: Depends on Foundational - can be done in parallel with US1 or sequentially
- **Polish (Phase 5)**: Depends on both user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational completion - No dependencies on US2
- **User Story 2 (P1)**: Can start after Foundational completion - No dependencies on US1
  - **Parallelization**: US1 and US2 can be worked on simultaneously by different team members (different button labels)

### Within Each User Story

- Component update before test update
- Tests run after implementation
- Manual testing after automated tests pass

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- **US1 and US2 can run completely in parallel** (different button labels, same file but no conflicts):
  - Developer A: T007-T010 (Apply button)
  - Developer B: T011-T014 (Clear button)
  - Merge after both complete with no conflicts (different lines)
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1 & 2 Parallel Execution

```bash
# Team with 2 developers after Foundational phase (T004-T006) complete:

# Developer A works on User Story 1 (US1):
Task T007: Update "Apply Filters" → "Apply" in TransactionFilterBar.vue
Task T008: Update test assertions for Apply button
Task T009: Run tests for Apply button
Task T010: Manual test Apply button

# Developer B works on User Story 2 (US2) in parallel:
Task T011: Update "Clear Filters" → "Clear" in TransactionFilterBar.vue
Task T012: Update test assertions for Clear button
Task T013: Run tests for Clear button
Task T014: Manual test Clear button

# After both complete, merge changes and run Polish phase (T015-T020)
```

---

## Implementation Strategy

### MVP First (Minimum Viable Product)

1. Complete Phase 1: Setup (verify files)
2. Complete Phase 2: Foundational (document current state)
3. Complete Phase 3: User Story 1 (rename Apply button)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery (Both Stories)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently
3. Add User Story 2 → Test independently
4. Run Polish phase → Final validation
5. Deploy to production

### Parallel Team Strategy (Recommended for Quick Delivery)

With 2 developers:

1. Both complete Setup + Foundational together (T001-T006)
2. Once Foundational is done:
   - Developer A: User Story 1 (T007-T010)
   - Developer B: User Story 2 (T011-T014)
3. Both run Polish phase together (T015-T020)
4. Total time: ~2 hours for complete feature

---

## Notes

- [P] tasks = different files or independent operations, can run in parallel
- [Story] label maps task to specific user story (US1, US2)
- Each user story is independently testable (both can be verified separately)
- No data model or API changes required (UI text only)
- No new dependencies introduced
- All tests should pass after each story implementation
- Changes are isolated to TransactionFilterBar.vue component (lines 100-107)
- Manual testing critical to verify button functionality and styling preserved
