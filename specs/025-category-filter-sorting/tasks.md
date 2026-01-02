---

description: "Task list for Category Filter Sorting Enhancement"
---

# Tasks: Category Filter Sorting Enhancement

**Input**: Design documents from `/specs/025-category-filter-sorting/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested in spec.md, but service and repository tests will be created following constitution test requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths follow project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project validation and preparation

- [ ] T001 Read constitution.md at .specify/memory/constitution.md to understand architecture patterns
- [ ] T002 Verify DynamoDB Local is running for local development
- [ ] T003 [P] Review existing CategoryRepository implementation at backend/src/repositories/category-repository.ts
- [ ] T004 [P] Review existing category resolver at backend/src/resolvers/category-resolvers.ts
- [ ] T005 [P] Review TransactionFilterBar component at frontend/src/components/transactions/TransactionFilterBar.vue

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service layer setup that both user stories depend on

**⚠️ CRITICAL**: This phase must be complete before user story implementation can begin

- [ ] T006 Create CategoryService class at backend/src/services/category-service.ts following domain entity service pattern
- [ ] T007 Add CategoryService to GraphQL context in backend/src/context.ts or equivalent context file
- [ ] T008 Create CategoryService unit tests at backend/src/services/category-service.test.ts with mocked repository

**Checkpoint**: Service layer ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Quick Category Location (Priority: P1) 🎯 MVP

**Goal**: Replace type-grouped sorting with unified alphabetical sorting so users can quickly find categories in a predictable order

**Independent Test**: Open category filter dropdown and verify all categories appear in a single alphabetically sorted list (no type grouping)

### Implementation for User Story 1

- [ ] T009 [US1] Update CategoryRepository.findActiveByUserId() sorting logic in backend/src/repositories/category-repository.ts to remove type grouping and use localeCompare with sensitivity:'base'
- [ ] T010 [US1] Update CategoryRepository.findActiveByUserIdAndType() sorting logic in backend/src/repositories/category-repository.ts to use localeCompare with sensitivity:'base'
- [ ] T011 [US1] Update category resolver Query.categories in backend/src/resolvers/category-resolvers.ts to delegate to CategoryService.getCategoriesByUser()
- [ ] T012 [US1] Update CategoryRepository tests at backend/src/repositories/category-repository.test.ts to verify new alphabetical sorting behavior (no type grouping)

**Checkpoint**: At this point, categories sort alphabetically without type grouping. User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Category Type Disambiguation (Priority: P2)

**Goal**: Add visual type indicators (colored icons) to distinguish income from expense categories in the dropdown

**Independent Test**: Create two categories with the same name but different types, open the dropdown, and verify each has a clear visual indicator (icon)

### Implementation for User Story 2

- [ ] T013 [P] [US2] Import CategoryType enum in frontend/src/components/transactions/TransactionFilterBar.vue
- [ ] T014 [P] [US2] Add getCategoryIcon helper function in TransactionFilterBar.vue that returns mdi-cash-plus for INCOME and mdi-cash-minus for EXPENSE
- [ ] T015 [P] [US2] Add getCategoryIconColor helper function in TransactionFilterBar.vue that returns 'success' for INCOME and 'error' for EXPENSE
- [ ] T016 [US2] Add item slot template to v-select in TransactionFilterBar.vue with v-list-item and append icon rendering
- [ ] T017 [US2] Test icon rendering with mixed income and expense categories in the dropdown

**Checkpoint**: At this point, User Stories 1 AND 2 are both complete. Categories sort alphabetically with visual type indicators.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, testing, and quality checks

- [ ] T018 [P] Run npm run format in backend directory
- [ ] T019 [P] Run npm run format in frontend directory
- [ ] T020 [P] Run npm run typecheck in backend directory
- [ ] T021 [P] Run npm run typecheck in frontend directory
- [ ] T022 [P] Run backend tests with npm test
- [ ] T023 Manual testing: Verify alphabetical sorting with mixed case names (Travel, APPLE, banana)
- [ ] T024 Manual testing: Verify numeric prefix sorting (401k Contribution sorts before alphabetic names)
- [ ] T025 Manual testing: Verify icon colors (green for income, red for expense)
- [ ] T026 Manual testing: Verify duplicate name disambiguation (Refund INCOME vs Refund EXPENSE)
- [ ] T027 Manual testing: Verify filter functionality still works correctly (backward compatibility)
- [ ] T028 Validate implementation against quickstart.md test scenarios at specs/025-category-filter-sorting/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion - Can run in parallel with US1 since frontend/backend work is independent
- **Polish (Phase 5)**: Depends on both user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational phase - No dependencies on other stories
- **User Story 2 (P2)**: Depends only on Foundational phase - Independent from US1 (frontend only vs backend only)

### Within Each User Story

**User Story 1 (Backend Changes):**
- T009, T010 can run in parallel (different methods in same file, but logically independent)
- T011 depends on T006 (CategoryService must exist)
- T012 can run after T009, T010 (test the implementation)

**User Story 2 (Frontend Changes):**
- T013, T014, T015 can all run in parallel (adding independent functions)
- T016 depends on T014, T015 (uses the helper functions)
- T017 validates T016

### Parallel Opportunities

- **Phase 1 Setup**: T003, T004, T005 can all run in parallel (reading different files)
- **Phase 2 Foundational**: T006, T008 can run in parallel (writing service and tests simultaneously)
- **Phase 3 + Phase 4**: Can run in parallel if two developers - US1 is backend-only, US2 is frontend-only
- **Phase 4 User Story 2**: T013, T014, T015 can all run in parallel
- **Phase 5 Polish**: T018, T019, T020, T021, T022 can all run in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all helper function additions together:
Task: "Import CategoryType enum in TransactionFilterBar.vue"
Task: "Add getCategoryIcon helper function in TransactionFilterBar.vue"
Task: "Add getCategoryIconColor helper function in TransactionFilterBar.vue"

# These three tasks modify different parts of the same file but are logically independent
```

---

## Parallel Example: Cross-Story Execution

```bash
# With two developers after Foundational phase completes:

Developer A (Backend):
- T009: Update findActiveByUserId sorting
- T010: Update findActiveByUserIdAndType sorting
- T011: Update resolver to use service
- T012: Update repository tests

Developer B (Frontend):
- T013: Import CategoryType enum
- T014: Add getCategoryIcon function
- T015: Add getCategoryIconColor function
- T016: Add item slot template
- T017: Test icon rendering

# Both stories progress independently and can merge without conflicts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (read and understand existing code)
2. Complete Phase 2: Foundational (CategoryService - CRITICAL)
3. Complete Phase 3: User Story 1 (alphabetical sorting)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready (MVP achieved)
6. Then proceed to Phase 4 (User Story 2) as enhancement

### Incremental Delivery

1. Complete Setup + Foundational → Service layer ready
2. Add User Story 1 → Test independently → **MVP Release** (Core usability improvement)
3. Add User Story 2 → Test independently → **Enhancement Release** (Visual clarity)
4. Polish → Final validation → **Production Ready**

### Parallel Team Strategy

With two developers:

1. Both complete Setup + Foundational together (T001-T008)
2. Once Foundational is done (T006-T008 complete):
   - **Developer A (Backend specialist)**: User Story 1 (T009-T012)
   - **Developer B (Frontend specialist)**: User Story 2 (T013-T017)
3. Both stories integrate cleanly (no file conflicts)
4. Combined testing in Phase 5

---

## Task Count Summary

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 3 tasks (BLOCKING)
- **Phase 3 (User Story 1)**: 4 tasks
- **Phase 4 (User Story 2)**: 5 tasks
- **Phase 5 (Polish)**: 11 tasks

**Total**: 28 tasks

**Parallel Opportunities**:
- Phase 1: 3 tasks can run in parallel (T003, T004, T005)
- Phase 2: 2 tasks can run in parallel (T006, T008)
- User Story 2: 3 tasks can run in parallel (T013, T014, T015)
- Polish: 5 tasks can run in parallel (T018, T019, T020, T021, T022)
- Cross-story: US1 and US2 can run in parallel (8 tasks total)

---

## Notes

- [P] tasks = different files or logically independent modifications, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Test tasks (T008, T012) follow constitution requirement for co-located tests
- Commit after each logical group of tasks (e.g., after each user story)
- Stop at any checkpoint to validate story independently
- No test coverage tasks for frontend (not required by spec or constitution for this feature)
- Focus on delivering US1 first as MVP, then enhance with US2

---

## Success Validation

After completing all tasks, verify against spec.md success criteria:

- **SC-001**: Users can locate categories 40-60% faster (alphabetical vs type-grouped)
- **SC-002**: Zero confusion incidents with duplicate category names (icons distinguish types)
- **SC-003**: 95% correct selection rate on first attempt (visual indicators work)
- **SC-004**: Category dropdown renders in <300ms for up to 100 categories (performance maintained)
- **SC-005**: User satisfaction increases measurably (gather feedback)

---

## Rollback Plan

If issues arise, rollback is simple (no database changes):

1. Revert backend/src/repositories/category-repository.ts (restore type grouping)
2. Revert backend/src/services/category-service.ts (remove service)
3. Revert backend/src/resolvers/category-resolvers.ts (restore direct repository calls)
4. Revert frontend/src/components/transactions/TransactionFilterBar.vue (remove icon slot)
5. Redeploy

No database migrations to rollback.
