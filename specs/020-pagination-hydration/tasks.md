# Tasks: Database Record Hydration in Pagination Utility

**Input**: Design documents from `/specs/020-pagination-hydration/`
**Feature Branch**: `020-pagination-hydration`
**Context**: Fix constitutional violation where pagination utility bypasses database record validation

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: No setup required - using existing codebase infrastructure

*Skipped - All required infrastructure (hydrate function, schemas) already exists*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modify pagination utility core to support validation

**⚠️ CRITICAL**: This phase must be complete before any repository updates (Phase 3)

- [ ] T001 Add Zod import to backend/src/repositories/utils/pagination.ts
- [ ] T002 Add hydrate function import to backend/src/repositories/utils/pagination.ts
- [ ] T003 Add schema parameter (z.ZodType\<T>) to paginateQuery function signature in backend/src/repositories/utils/pagination.ts
- [ ] T004 Replace type cast with hydrate validation call (line 50) in backend/src/repositories/utils/pagination.ts
- [ ] T005 Pass schema parameter to recursive paginateQuery call in backend/src/repositories/utils/pagination.ts

**Checkpoint**: Pagination utility now supports validation - TypeScript will show compilation errors for all repository calls missing schema parameter

---

## Phase 3: User Story 1 - Repository Developer Gets Validated Data (Priority: P1) 🎯

**Goal**: All pagination-based repository queries return validated data that complies with entity schemas

**Independent Test**: Run repository queries with valid database records and verify no validation errors occur while maintaining type safety

**Why P1**: Core functionality - ensures constitutional compliance for Database Record Hydration principle

### Implementation for User Story 1

- [ ] T006 [P] [US1] Update AccountRepository.findActiveByUserId() to pass accountSchema to paginateQuery in backend/src/repositories/AccountRepository.ts (line ~94)
- [ ] T007 [P] [US1] Update CategoryRepository first paginateQuery call to pass categorySchema in backend/src/repositories/CategoryRepository.ts
- [ ] T008 [P] [US1] Update CategoryRepository second paginateQuery call to pass categorySchema in backend/src/repositories/CategoryRepository.ts
- [ ] T009 [P] [US1] Update TransactionRepository first paginateQuery call to pass transactionSchema in backend/src/repositories/TransactionRepository.ts
- [ ] T010 [P] [US1] Update TransactionRepository second paginateQuery call to pass transactionSchema in backend/src/repositories/TransactionRepository.ts
- [ ] T011 [P] [US1] Update TransactionRepository third paginateQuery call to pass transactionSchema in backend/src/repositories/TransactionRepository.ts
- [ ] T012 [P] [US1] Update TransactionRepository fourth paginateQuery call to pass transactionSchema in backend/src/repositories/TransactionRepository.ts
- [ ] T013 [P] [US1] Update TransactionRepository fifth paginateQuery call to pass transactionSchema in backend/src/repositories/TransactionRepository.ts
- [ ] T014 [P] [US1] Update TransactionRepository sixth paginateQuery call to pass transactionSchema in backend/src/repositories/TransactionRepository.ts
- [ ] T015 [US1] Verify TypeScript compilation succeeds with npm run build in backend/
- [ ] T016 [US1] Run backend test suite to verify no regressions with npm test in backend/

**Checkpoint**: All repository pagination calls now validate data - User Story 1 complete and independently functional

---

## Phase 4: User Story 2 - Data Corruption Detection at Source (Priority: P2)

**Goal**: Database corruption detected at repository boundary with fail-fast behavior and clear validation error messages

**Independent Test**: Manually insert corrupted record in test database, run pagination query, verify clear ZodError thrown with validation details

**Why P2**: Error detection capability - validates that constitutional requirement works correctly when data is corrupted

**Dependencies**: Requires Phase 3 (US1) complete - cannot test error detection without validation implemented

### Tests for User Story 2

- [ ] T017 [P] [US2] Create pagination.test.ts with test case for valid items returning successfully in backend/src/repositories/utils/pagination.test.ts
- [ ] T018 [P] [US2] Add test case for invalid item throwing validation error in backend/src/repositories/utils/pagination.test.ts
- [ ] T019 [P] [US2] Add test case for fail-fast behavior (first invalid item stops processing) in backend/src/repositories/utils/pagination.test.ts
- [ ] T020 [US2] Add test case for missing required fields error details in backend/src/repositories/utils/pagination.test.ts
- [ ] T021 [US2] Add test case for type mismatch error details in backend/src/repositories/utils/pagination.test.ts
- [ ] T022 [US2] Run pagination utility tests to verify all error scenarios with npm test pagination.test.ts in backend/

**Checkpoint**: All error detection scenarios validated - User Story 2 complete and independently functional

---

## Phase 5: Verification & Polish

**Purpose**: Final validation and compliance checks

- [ ] T023 Run complete backend test suite to verify no regressions with npm test in backend/
- [ ] T024 Run linting and formatting with npm run format in backend/
- [ ] T025 Verify all acceptance scenarios from spec.md are satisfied
- [ ] T026 Run quickstart.md validation checklist to confirm implementation
- [ ] T027 Verify Database Record Hydration constitutional principle compliance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped - infrastructure exists
- **Foundational (Phase 2)**: No dependencies - modifies pagination utility core
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) complete - updates all repository calls
- **User Story 2 (Phase 4)**: Depends on User Story 1 (Phase 3) complete - tests error detection
- **Verification (Phase 5)**: Depends on User Story 1 and 2 complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - updates 9 repository calls atomically
- **User Story 2 (P2)**: MUST start after User Story 1 (Phase 3) - tests validation error behavior

### Within Each User Story

**User Story 1**:
- T006-T014 can run in parallel (different repository files)
- T015 depends on T006-T014 complete (compilation check)
- T016 depends on T015 (test execution)

**User Story 2**:
- T017-T021 can run in parallel (different test cases in same file)
- T022 depends on T017-T021 complete (test execution)

### Parallel Opportunities

- **Foundational Phase (Phase 2)**: All tasks sequential (same file)
- **User Story 1 (Phase 3)**:
  - T006-T014 all parallelizable (9 repository updates in different files)
  - AccountRepository (1 task), CategoryRepository (2 tasks), TransactionRepository (6 tasks)
- **User Story 2 (Phase 4)**:
  - T017-T021 all parallelizable (5 test cases, can be written together)

---

## Parallel Example: User Story 1 Repository Updates

```bash
# Launch all repository updates together (different files):
Task T006: "Update AccountRepository.findActiveByUserId() to pass accountSchema"
Task T007: "Update CategoryRepository first paginateQuery call to pass categorySchema"
Task T008: "Update CategoryRepository second paginateQuery call to pass categorySchema"
Task T009: "Update TransactionRepository first paginateQuery call to pass transactionSchema"
Task T010: "Update TransactionRepository second paginateQuery call to pass transactionSchema"
Task T011: "Update TransactionRepository third paginateQuery call to pass transactionSchema"
Task T012: "Update TransactionRepository fourth paginateQuery call to pass transactionSchema"
Task T013: "Update TransactionRepository fifth paginateQuery call to pass transactionSchema"
Task T014: "Update TransactionRepository sixth paginateQuery call to pass transactionSchema"

# Then sequentially:
Task T015: "Verify TypeScript compilation"
Task T016: "Run backend test suite"
```

## Parallel Example: User Story 2 Test Cases

```bash
# Launch all test cases together (same file, different test functions):
Task T017: "Test case for valid items"
Task T018: "Test case for invalid item throwing error"
Task T019: "Test case for fail-fast behavior"
Task T020: "Test case for missing fields error"
Task T021: "Test case for type mismatch error"

# Then sequentially:
Task T022: "Run pagination utility tests"
```

---

## Implementation Strategy

### Atomic Migration (Required)

This feature requires atomic migration per spec clarification:

1. Complete Phase 2: Foundational (pagination utility modification)
2. Complete Phase 3: User Story 1 (all 9 repository calls updated)
3. Complete Phase 4: User Story 2 (error detection tests)
4. Complete Phase 5: Verification
5. **Deploy ALL changes together** - partial deployment breaks compilation

### Constitutional Compliance Focus

**Before**: Pagination utility violates Database Record Hydration (no validation)
**After**: All database records validated at repository boundary (constitutional compliance)

This is a constitutional violation fix - must be completed fully before deployment.

### MVP Scope

**Minimum Viable Product** = Complete ALL phases (cannot partially deploy due to atomic migration requirement)

- Phase 2: Pagination utility modification
- Phase 3: All repository updates (9 calls)
- Phase 4: Error detection tests
- Phase 5: Verification

Total estimated effort: 30-45 minutes (per quickstart.md)

---

## Notes

- [P] tasks = different files or independent test cases
- [US1] and [US2] labels map tasks to user stories from spec.md
- Atomic migration: TypeScript enforces all repositories updated (compilation errors if schema parameter missing)
- Existing infrastructure reused: hydrate() function and entity schemas already exist
- No new schemas required: accountSchema, categorySchema, transactionSchema already in codebase
- Tests use co-located pattern: pagination.test.ts next to pagination.ts (per constitution)
- Fail-fast behavior: first validation error stops processing (per spec clarification)
- Error messages: Zod provides validation details automatically (field paths, type mismatches)
