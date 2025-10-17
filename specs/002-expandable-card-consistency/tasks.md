# Tasks: Expandable Card UI Consistency

**Input**: Design documents from `/specs/002-expandable-card-consistency/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature uses manual testing - no automated test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `frontend/src/` for frontend components
- All tasks are frontend-only (no backend changes)

---

## Phase 1: Setup (Reference Review)

**Purpose**: Review reference implementation before starting modifications

- [ ] T001 Review TransactionCard.vue implementation pattern in frontend/src/components/transactions/TransactionCard.vue
- [ ] T002 Review ActionButtons.vue component API in frontend/src/components/common/ActionButtons.vue
- [ ] T003 Review Transactions.vue state management pattern in frontend/src/views/Transactions.vue

**Checkpoint**: Pattern understanding complete - ready for implementation

---

## Phase 2: User Story 1 - Expandable Account Cards (Priority: P1) 🎯 MVP

**Goal**: Apply expandable card pattern to account cards, matching transaction card behavior

**Independent Test**: Navigate to accounts page (/accounts), click any account card to expand it, verify edit/delete buttons appear, click card again to collapse, verify buttons hidden. Edit and delete actions should work without collapsing the card.

### Implementation for User Story 1

- [ ] T004 [US1] Add isExpanded prop to AccountCard component in frontend/src/components/accounts/AccountCard.vue
- [ ] T005 [US1] Replace ActionDropdown import with ActionButtons import in frontend/src/components/accounts/AccountCard.vue
- [ ] T006 [US1] Add toggleExpand event to AccountCard component in frontend/src/components/accounts/AccountCard.vue
- [ ] T007 [US1] Add handleCardClick method that emits toggleExpand in frontend/src/components/accounts/AccountCard.vue
- [ ] T008 [US1] Add @click handler to v-card element in frontend/src/components/accounts/AccountCard.vue
- [ ] T009 [US1] Add cursor:pointer style to v-card element in frontend/src/components/accounts/AccountCard.vue
- [ ] T010 [US1] Wrap ActionButtons in v-if="isExpanded" conditional block in frontend/src/components/accounts/AccountCard.vue
- [ ] T011 [US1] Move ActionButtons to bottom of card content with justify-end class in frontend/src/components/accounts/AccountCard.vue
- [ ] T012 [US1] Add :class="{ expanded: isExpanded }" binding to v-card in frontend/src/components/accounts/AccountCard.vue
- [ ] T013 [US1] Add .expanded CSS class with hover:transform:none in frontend/src/components/accounts/AccountCard.vue
- [ ] T014 [US1] Update existing hover styles to disable transform when expanded in frontend/src/components/accounts/AccountCard.vue
- [ ] T015 [US1] Add expandedCards ref with Record<string, boolean> type in frontend/src/components/accounts/AccountsList.vue
- [ ] T016 [US1] Add toggleExpand method to AccountsList component in frontend/src/components/accounts/AccountsList.vue
- [ ] T017 [US1] Add isExpanded helper method to AccountsList component in frontend/src/components/accounts/AccountsList.vue
- [ ] T018 [US1] Pass isExpanded prop to AccountCard in template in frontend/src/components/accounts/AccountsList.vue
- [ ] T019 [US1] Add @toggleExpand event handler to AccountCard in template in frontend/src/components/accounts/AccountsList.vue
- [ ] T020 [US1] Manual test: Verify account cards start collapsed
- [ ] T021 [US1] Manual test: Verify clicking card expands and shows action buttons
- [ ] T022 [US1] Manual test: Verify clicking expanded card collapses it
- [ ] T023 [US1] Manual test: Verify edit button opens dialog without collapsing card
- [ ] T024 [US1] Manual test: Verify delete button opens dialog without collapsing card
- [ ] T025 [US1] Manual test: Verify hover effects work on collapsed cards
- [ ] T026 [US1] Manual test: Verify hover transform disabled on expanded cards
- [ ] T027 [US1] Manual test: Verify multiple cards can be expanded simultaneously

**Checkpoint**: User Story 1 complete - Account cards now match transaction card pattern

---

## Phase 3: User Story 2 - Expandable Category Cards (Priority: P2)

**Goal**: Apply expandable card pattern to category cards, matching transaction card behavior

**Independent Test**: Navigate to categories page (/categories), click any category card to expand it, verify edit/delete buttons appear, click card again to collapse, verify buttons hidden. Edit and delete actions should work without collapsing the card.

### Implementation for User Story 2

- [ ] T028 [US2] Add isExpanded prop to CategoryCard component in frontend/src/components/categories/CategoryCard.vue
- [ ] T029 [US2] Replace ActionDropdown import with ActionButtons import in frontend/src/components/categories/CategoryCard.vue
- [ ] T030 [US2] Add toggleExpand event to CategoryCard component in frontend/src/components/categories/CategoryCard.vue
- [ ] T031 [US2] Add handleCardClick method that emits toggleExpand in frontend/src/components/categories/CategoryCard.vue
- [ ] T032 [US2] Add @click handler to v-card element in frontend/src/components/categories/CategoryCard.vue
- [ ] T033 [US2] Add cursor:pointer style to v-card element in frontend/src/components/categories/CategoryCard.vue
- [ ] T034 [US2] Wrap ActionButtons in v-if="isExpanded" conditional block in frontend/src/components/categories/CategoryCard.vue
- [ ] T035 [US2] Move ActionButtons to bottom of card content with justify-end class in frontend/src/components/categories/CategoryCard.vue
- [ ] T036 [US2] Add :class="{ expanded: isExpanded }" binding to v-card in frontend/src/components/categories/CategoryCard.vue
- [ ] T037 [US2] Add .expanded CSS class with hover:transform:none in frontend/src/components/categories/CategoryCard.vue
- [ ] T038 [US2] Update existing hover styles to disable transform when expanded in frontend/src/components/categories/CategoryCard.vue
- [ ] T039 [US2] Add expandedCards ref with Record<string, boolean> type in frontend/src/views/Categories.vue
- [ ] T040 [US2] Add toggleExpand method to Categories view in frontend/src/views/Categories.vue
- [ ] T041 [US2] Add isExpanded helper method to Categories view in frontend/src/views/Categories.vue
- [ ] T042 [US2] Pass isExpanded prop to CategoryCard in template in frontend/src/views/Categories.vue
- [ ] T043 [US2] Add @toggleExpand event handler to CategoryCard in template in frontend/src/views/Categories.vue
- [ ] T044 [US2] Manual test: Verify category cards start collapsed
- [ ] T045 [US2] Manual test: Verify clicking card expands and shows action buttons
- [ ] T046 [US2] Manual test: Verify clicking expanded card collapses it
- [ ] T047 [US2] Manual test: Verify edit button opens dialog without collapsing card
- [ ] T048 [US2] Manual test: Verify delete button opens dialog without collapsing card
- [ ] T049 [US2] Manual test: Verify hover effects work on collapsed cards
- [ ] T050 [US2] Manual test: Verify hover transform disabled on expanded cards
- [ ] T051 [US2] Manual test: Verify multiple cards can be expanded simultaneously

**Checkpoint**: User Story 2 complete - Category cards now match transaction card pattern

---

## Phase 4: User Story 3 - Remove ActionDropdown Component (Priority: P3)

**Goal**: Remove deprecated ActionDropdown component to maintain clean codebase

**Independent Test**: Search codebase for ActionDropdown imports (should find none), build and run application (should work without errors), verify only ActionButtons used for card actions.

### Implementation for User Story 3

- [ ] T052 [US3] Search codebase for remaining ActionDropdown imports using grep/ripgrep in frontend/src/
- [ ] T053 [US3] Verify no active imports found (only AccountCard and CategoryCard should have been using it) across frontend/src/
- [ ] T054 [US3] Delete ActionDropdown.vue file from frontend/src/components/common/ActionDropdown.vue
- [ ] T055 [US3] Build frontend to verify no compilation errors with npm run build in frontend/
- [ ] T056 [US3] Start development server and verify application loads without errors with npm run dev in frontend/
- [ ] T057 [US3] Manual test: Navigate to accounts page and verify functionality
- [ ] T058 [US3] Manual test: Navigate to categories page and verify functionality
- [ ] T059 [US3] Manual test: Navigate to transactions page and verify no regressions

**Checkpoint**: User Story 3 complete - ActionDropdown removed, codebase clean

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and consistency checks

- [ ] T060 [P] Review all card components for visual consistency (TransactionCard, AccountCard, CategoryCard)
- [ ] T061 [P] Test rapid clicking on cards to verify smooth toggle behavior
- [ ] T062 [P] Test responsive behavior on mobile viewport (375px width)
- [ ] T063 [P] Test responsive behavior on tablet viewport (768px width)
- [ ] T064 [P] Test in Chrome/Edge browser
- [ ] T065 [P] Test in Firefox browser
- [ ] T066 [P] Verify no console errors or warnings in browser DevTools
- [ ] T067 [P] Check performance with browser DevTools (no frame drops during animations)
- [ ] T068 Verify quickstart.md test scenarios all pass in frontend/specs/002-expandable-card-consistency/quickstart.md
- [ ] T069 Update CLAUDE.md if any development patterns need documentation in CLAUDE.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - review reference implementation
- **User Story 1 (Phase 2)**: Depends on Setup completion - MVP
- **User Story 2 (Phase 3)**: Independent of User Story 1 - can start after Setup
- **User Story 3 (Phase 4)**: Depends on User Story 1 AND 2 completion
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - can start after Setup
- **User Story 2 (P2)**: Independent - can start after Setup (parallel with US1)
- **User Story 3 (P3)**: Depends on US1 AND US2 - must remove ActionDropdown only after both cards migrated

### Within Each User Story

**User Story 1 (Accounts)**:
1. Component modifications (T004-T014) - sequential, same file
2. Parent component updates (T015-T019) - sequential, same file
3. Manual testing (T020-T027) - can run in parallel after implementation

**User Story 2 (Categories)**:
1. Component modifications (T028-T038) - sequential, same file
2. Parent component updates (T039-T043) - sequential, same file
3. Manual testing (T044-T051) - can run in parallel after implementation

**User Story 3 (Cleanup)**:
1. Verification (T052-T053) - sequential
2. Deletion (T054) - after verification
3. Build validation (T055-T056) - sequential
4. Manual testing (T057-T059) - can run in parallel after build succeeds

### Parallel Opportunities

- **User Story 1 and 2 can run in parallel** (different components, no dependencies)
- **All manual tests within a story can run in parallel** (T020-T027, T044-T051, T057-T059)
- **All polish tasks can run in parallel** (T060-T067)

---

## Parallel Example: User Story 1 and 2

```bash
# Developer A can work on User Story 1 (Accounts):
Task: "Add isExpanded prop to AccountCard..." (T004-T014)
Task: "Add expandedCards ref to AccountsList..." (T015-T019)
Task: "Manual testing for accounts..." (T020-T027)

# Developer B can work on User Story 2 (Categories) simultaneously:
Task: "Add isExpanded prop to CategoryCard..." (T028-T038)
Task: "Add expandedCards ref to Categories view..." (T039-T043)
Task: "Manual testing for categories..." (T044-T051)

# Both can complete independently, then one developer does User Story 3
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (review reference)
2. Complete Phase 2: User Story 1 (expandable account cards)
3. **STOP and VALIDATE**: Test account cards independently
4. Deploy/demo if ready - UI consistency achieved for accounts

### Incremental Delivery

1. Complete Setup → Review complete
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - accounts working!)
3. Add User Story 2 → Test independently → Deploy/Demo (categories working!)
4. Add User Story 3 → Test independently → Deploy/Demo (cleanup complete!)
5. Polish → Full feature complete

### Parallel Team Strategy

With two developers:

1. Both complete Setup together (Phase 1)
2. Once Setup is done:
   - Developer A: User Story 1 (Account cards)
   - Developer B: User Story 2 (Category cards)
3. Both stories complete independently
4. Either developer: User Story 3 (cleanup)
5. Both: Polish tasks in parallel

---

## Notes

- [P] tasks = different files or independent manual tests
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Manual test tasks follow quickstart.md test scenarios
- Component modifications are sequential (same file edits)
- Parent component modifications are sequential (same file edits)
- User Stories 1 and 2 are fully parallel (different components)
- Commit after completing each component or logical group
- Stop at any checkpoint to validate story independently
- Reference TransactionCard.vue for any pattern questions

## Task Count Summary

- **Total Tasks**: 69
- **Setup Phase**: 3 tasks
- **User Story 1 (P1 - MVP)**: 24 tasks (14 implementation + 8 manual tests + 2 parent updates)
- **User Story 2 (P2)**: 24 tasks (11 implementation + 8 manual tests + 5 parent updates)
- **User Story 3 (P3)**: 8 tasks (4 verification/cleanup + 4 testing)
- **Polish Phase**: 10 tasks (all parallelizable)

## Parallel Opportunities Identified

- User Stories 1 and 2 can be developed in parallel (different files)
- 26 manual test tasks can run in parallel within their stories
- 8 polish tasks can run in parallel (T060-T067)
- **Total parallelizable tasks**: 34 tasks marked [P]
