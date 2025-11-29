# Tasks: Fix Pagination Cursor Bug - UserDateIndex Incompatibility

**Branch**: `014-fix-date-pagination`
**Input**: Design documents from `/specs/014-fix-date-pagination/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable focused implementation and testing of each acceptance criteria.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with `backend/` and `frontend/` packages. All changes are backend-focused in:
- `backend/src/repositories/TransactionRepository.ts` - Main implementation file
- `backend/src/repositories/TransactionRepository.test.ts` - Test file

---

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

**Status**: ✅ Complete - Project already initialized with all dependencies (TypeScript, Apollo Server, DynamoDB, Jest, Zod)

No setup tasks required. All infrastructure is in place.

---

## Phase 2: Foundational

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**Status**: ✅ Complete - All foundational infrastructure exists:
- DynamoDB table with UserDateIndex and UserCreatedAtIndex
- Transaction repository with pagination logic
- Existing cursor encode/decode functions
- Existing test suite

No foundational tasks required. Bug fix can proceed directly to implementation.

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: Core Pagination Fix (User Story 1) 🎯 MVP

**Priority**: P1 (Critical Bug Fix)

**Goal**: Fix pagination cursor to support date-filtered queries using UserDateIndex, enabling users to navigate through all pages when date filters are applied.

**Independent Test**: Create 50+ transactions across multiple dates, apply date range filter, load first page, then load second page using cursor. Success means all pages load without validation errors and all transactions are accessible.

### Implementation for User Story 1

- [ ] T001 [US1] Update CursorData interface to include date field in backend/src/repositories/TransactionRepository.ts (lines 75-78)
- [ ] T002 [US1] Add cursorDataSchema Zod validation schema after imports in backend/src/repositories/TransactionRepository.ts (around line 10)
- [ ] T003 [US1] Update encodeCursor function to include transaction.date in backend/src/repositories/TransactionRepository.ts (lines 95-101)
- [ ] T004 [US1] Update decodeCursor function to use Zod schema validation in backend/src/repositories/TransactionRepository.ts (lines 103-121)
- [ ] T005 [US1] Fix ExclusiveStartKey construction to select correct field based on sortKeyName in backend/src/repositories/TransactionRepository.ts (lines 463-468)
- [ ] T006 [US1] Enable pagination test by changing xdescribe to describe in backend/src/repositories/TransactionRepository.test.ts (line 2487)
- [ ] T007 [US1] Uncomment duplicate/missing item assertions in backend/src/repositories/TransactionRepository.test.ts (lines 2559-2572)
- [ ] T008 [US1] Run enabled test and verify it passes with date-filtered pagination working correctly

**Checkpoint**: At this point, date-filtered pagination (UserDateIndex) should work correctly. Users can navigate through all pages when date filters are applied without validation errors.

---

## Phase 4: Enhanced Error Handling (User Story 3)

**Priority**: P3

**Goal**: Ensure invalid or corrupted cursors return clear error messages to help users understand what went wrong.

**Independent Test**: Submit malformed cursors (invalid base64, missing fields, corrupted JSON) and verify clear, actionable error messages are returned.

**Note**: Core Zod validation from Phase 3 already handles this. This phase adds comprehensive test coverage.

### Implementation for User Story 3

- [ ] T009 [P] [US3] Add test for invalid base64 cursor format in backend/src/repositories/TransactionRepository.test.ts
- [ ] T010 [P] [US3] Add test for missing createdAt field in cursor in backend/src/repositories/TransactionRepository.test.ts
- [ ] T011 [P] [US3] Add test for missing date field in cursor in backend/src/repositories/TransactionRepository.test.ts
- [ ] T012 [P] [US3] Add test for missing id field in cursor in backend/src/repositories/TransactionRepository.test.ts
- [ ] T013 [P] [US3] Add test for corrupted JSON in cursor in backend/src/repositories/TransactionRepository.test.ts
- [ ] T014 [US3] Run all error handling tests and verify clear error messages are returned (TransactionRepositoryError with "Invalid cursor format" and "INVALID_CURSOR" code)

**Checkpoint**: Invalid cursors now produce clear error messages. All error scenarios tested and verified.

---

## Phase 5: Regression Prevention (User Story 2)

**Priority**: P2

**Goal**: Ensure unfiltered pagination (UserCreatedAtIndex path) continues to work correctly and isn't broken by the cursor structure changes.

**Independent Test**: Create 50+ transactions without any filters, load first page, navigate through subsequent pages. Success means pagination works exactly as before the fix.

### Implementation for User Story 2

- [ ] T015 [P] [US2] Add test for unfiltered pagination (no date filters) in backend/src/repositories/TransactionRepository.test.ts
- [ ] T016 [P] [US2] Add test verifying UserCreatedAtIndex is selected when no date filters in backend/src/repositories/TransactionRepository.test.ts
- [ ] T017 [P] [US2] Add test for pagination with other filters (account, category, type) but no date filters in backend/src/repositories/TransactionRepository.test.ts
- [ ] T018 [US2] Run all unfiltered pagination tests and verify they pass (ensuring backward compatibility)

**Checkpoint**: Unfiltered queries continue to work correctly. No regression in existing functionality.

---

## Phase 6: Polish & Verification

**Purpose**: Code quality, formatting, and final verification

- [ ] T019 [P] Run TypeScript compiler and fix any type errors with npm run build in backend/
- [ ] T020 [P] Run ESLint and fix all linting issues with npm run lint in backend/
- [ ] T021 [P] Format code with Prettier using npm run format in backend/
- [ ] T022 Run complete test suite with npm test in backend/ and verify all tests pass
- [ ] T023 Verify no type assertions (as Type) or non-null assertions (!) were introduced in backend/src/repositories/TransactionRepository.ts
- [ ] T024 Verify performance criteria: pagination queries complete in < 2 seconds (SC-002)
- [ ] T025 Verify error response time < 100ms for invalid cursors (SC-005)
- [ ] T026 Review quickstart.md validation checklist and confirm all items pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: ✅ Complete - no dependencies
- **Foundational (Phase 2)**: ✅ Complete - no dependencies
- **User Story 1 (Phase 3)**: CRITICAL - Must complete before other phases (core bug fix)
- **User Story 3 (Phase 4)**: Depends on Phase 3 (uses Zod schema from Phase 3)
- **User Story 2 (Phase 5)**: Depends on Phase 3 (needs cursor changes from Phase 3)
- **Polish (Phase 6)**: Depends on all user story phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies - MUST BE COMPLETED FIRST (blocking bug)
- **User Story 3 (P3)**: Depends on US1 (uses cursorDataSchema from US1)
- **User Story 2 (P2)**: Depends on US1 (uses updated cursor structure from US1)

### Within Each User Story

**User Story 1 (Sequential execution required)**:
1. T001: Update CursorData interface (FIRST - other tasks depend on this)
2. T002: Add Zod schema (SECOND - T004 depends on this)
3. T003: Update encodeCursor (uses CursorData from T001)
4. T004: Update decodeCursor (uses Zod schema from T002)
5. T005: Fix ExclusiveStartKey (uses decoded cursor from T004)
6. T006-T008: Enable and run tests (validates all previous tasks)

**User Story 3 (Parallel execution possible)**:
- All test tasks (T009-T013) can run in parallel (marked with [P])
- T014 runs after all tests are written to verify results

**User Story 2 (Parallel execution possible)**:
- All test tasks (T015-T017) can run in parallel (marked with [P])
- T018 runs after all tests are written to verify results

### Parallel Opportunities

- **Phase 3 (US1)**: Tasks must run sequentially due to dependencies
- **Phase 4 (US3)**: Tasks T009-T013 can run in parallel (different test cases)
- **Phase 5 (US2)**: Tasks T015-T017 can run in parallel (different test cases)
- **Phase 6 (Polish)**: Tasks T019-T021 can run in parallel (independent checks)

---

## Parallel Example: User Story 3

```bash
# Launch all error handling tests together:
Task: "Add test for invalid base64 cursor format"
Task: "Add test for missing createdAt field in cursor"
Task: "Add test for missing date field in cursor"
Task: "Add test for missing id field in cursor"
Task: "Add test for corrupted JSON in cursor"
```

## Parallel Example: User Story 2

```bash
# Launch all regression tests together:
Task: "Add test for unfiltered pagination (no date filters)"
Task: "Add test verifying UserCreatedAtIndex is selected when no date filters"
Task: "Add test for pagination with other filters but no date filters"
```

## Parallel Example: Polish Phase

```bash
# Launch all code quality checks together:
Task: "Run TypeScript compiler and fix any type errors"
Task: "Run ESLint and fix all linting issues"
Task: "Format code with Prettier"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Complete Phase 1: Setup (already complete)
2. ✅ Complete Phase 2: Foundational (already complete)
3. Complete Phase 3: User Story 1 (T001-T008)
4. **STOP and VALIDATE**: Run enabled test and verify date-filtered pagination works
5. This is the minimal fix to resolve the blocking bug

### Incremental Delivery

1. ✅ Foundation ready (Setup + Foundational complete)
2. Add User Story 1 → Test independently → **Core bug fixed! Date-filtered pagination works**
3. Add User Story 3 → Test independently → **Enhanced error messages for invalid cursors**
4. Add User Story 2 → Test independently → **Regression prevention confirmed**
5. Polish phase → **Production ready**

### Single Developer Strategy

Work sequentially through phases in priority order:

1. Complete Phase 3 (US1) - Critical bug fix
2. Complete Phase 4 (US3) - Error handling enhancement
3. Complete Phase 5 (US2) - Regression prevention
4. Complete Phase 6 (Polish) - Final verification

**Estimated Time**:
- Phase 3 (US1): 1-2 hours (core implementation)
- Phase 4 (US3): 30-60 minutes (test coverage)
- Phase 5 (US2): 30-60 minutes (regression tests)
- Phase 6 (Polish): 15-30 minutes (verification)

**Total**: 2.5-4.5 hours for complete implementation

### Critical Path

The critical path for this bug fix is:

```
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008
(CursorData) → (Zod) → (encode) → (decode) → (ExclusiveStartKey) → (enable test) → (verify)
```

All tasks in Phase 3 (US1) are on the critical path and must be completed sequentially.

---

## Success Criteria Verification

After completing all phases, verify these success criteria from spec.md:

- [ ] **SC-001**: Users can navigate through all pages with date filters without validation errors
- [ ] **SC-002**: Pagination queries using UserDateIndex complete in < 2 seconds
- [ ] **SC-003**: Pagination queries using UserCreatedAtIndex have no performance degradation
- [ ] **SC-004**: All transactions retrievable with zero duplicates and zero missing items (tested with 100+ transactions)
- [ ] **SC-005**: Invalid cursor attempts result in clear error messages within 100ms
- [ ] **SC-006**: Existing regression test "should paginate correctly when using date filters without duplicates or missing items" passes successfully

---

## Notes

- All changes isolated to `backend/src/repositories/TransactionRepository.ts` and its test file
- No GraphQL schema changes required
- No frontend changes required
- Cursor is opaque to clients - internal structure change is transparent
- This is a breaking change for existing cursors (acceptable - see research.md)
- Maintain strict type safety - no type assertions or non-null assertions
- Follow constitution: Use Zod for validation, maintain repository pattern
- Test with real DynamoDB connection (per constitution Test Strategy)
- Each user story should be independently verifiable before proceeding to next

---

## File Modification Summary

| File | Tasks | Purpose |
|------|-------|---------|
| `backend/src/repositories/TransactionRepository.ts` | T001-T005 | Core cursor and pagination fixes |
| `backend/src/repositories/TransactionRepository.test.ts` | T006-T018 | Enable existing test and add new test coverage |

**Total Files Modified**: 2

**Total Tasks**: 26 (8 implementation + 13 tests + 5 polish)

**Critical Path Tasks**: 8 (Phase 3 - User Story 1)

---

## Quick Reference

**Primary Implementation File**: [backend/src/repositories/TransactionRepository.ts](../../backend/src/repositories/TransactionRepository.ts)

**Key Line Numbers**:
- Lines 75-78: CursorData interface (T001)
- Line ~10: Add Zod schema (T002)
- Lines 95-101: encodeCursor function (T003)
- Lines 103-121: decodeCursor function (T004)
- Lines 463-468: ExclusiveStartKey construction (T005)

**Primary Test File**: [backend/src/repositories/TransactionRepository.test.ts](../../backend/src/repositories/TransactionRepository.test.ts)

**Key Line Numbers**:
- Line 2487: Enable test (T006)
- Lines 2559-2572: Uncomment assertions (T007)

**Supporting Documentation**:
- [research.md](./research.md) - Detailed bug analysis and decisions
- [data-model.md](./data-model.md) - Cursor structure and data flows
- [quickstart.md](./quickstart.md) - Step-by-step implementation guide
- [plan.md](./plan.md) - Technical context and constitution compliance
- [spec.md](./spec.md) - User stories and acceptance criteria
