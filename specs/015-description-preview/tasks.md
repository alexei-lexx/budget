---
description: "Task list for Transaction Description Preview implementation"
---

# Tasks: Transaction Description Preview in Collapsed Cards

**Input**: Design documents from `/specs/015-description-preview/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No automated tests required per constitution - manual verification using quickstart.md checklist.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` for Vue components
- This feature modifies only: `frontend/src/components/transactions/TransactionCard.vue`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Review design documents and understand requirements

- [ ] T001 Read plan.md, spec.md, research.md, data-model.md, quickstart.md to understand feature requirements and technical approach

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Understand existing code structure before making changes

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Read existing TransactionCard.vue implementation in frontend/src/components/transactions/TransactionCard.vue to understand current structure
- [ ] T003 [P] Verify Transaction type includes description field in frontend/src/composables/useTransactions.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Description Preview on Collapsed Cards (Priority: P1) 🎯 MVP

**Goal**: Display transaction description in collapsed card header following "Date • Account • Category • Description" format when description exists

**Independent Test**: Navigate to transactions page, create a transaction with a description, verify the collapsed card shows "Date • Account • Category • Description" in the header line. Create a transaction without a description and verify only "Date • Account • Category" is shown.

### Implementation for User Story 1

- [ ] T004 [US1] Add computed property `descriptionPreview` to normalize whitespace (convert line breaks and multiple spaces to single space) in frontend/src/components/transactions/TransactionCard.vue
- [ ] T005 [US1] Modify header line template to add description after category using "•" delimiter in frontend/src/components/transactions/TransactionCard.vue
- [ ] T006 [US1] Add conditional rendering to only show description when `descriptionPreview` is not null/empty in frontend/src/components/transactions/TransactionCard.vue
- [ ] T007 [US1] Test: Create transaction with description and verify it appears in collapsed header after category

**Checkpoint**: At this point, User Story 1 should be fully functional - descriptions visible in collapsed cards without truncation or conditional hiding

---

## Phase 4: User Story 2 - Truncate Long Descriptions with Ellipsis (Priority: P2)

**Goal**: Ensure long descriptions truncate with ellipsis to maintain visual consistency and prevent wrapping

**Independent Test**: Create a transaction with a description longer than 50 characters, verify it truncates with ellipsis in collapsed state. Expand the card and verify the full description is visible in the expanded section.

### Implementation for User Story 2

- [ ] T008 [US2] Apply `text-truncate` class to header `<h4>` element for automatic ellipsis on overflow in frontend/src/components/transactions/TransactionCard.vue
- [ ] T009 [US2] Apply `text-opacity-70` class to description span for visual de-emphasis in frontend/src/components/transactions/TransactionCard.vue
- [ ] T010 [US2] Verify parent container maintains `flex-grow-1` and `min-width: 0` for responsive truncation in frontend/src/components/transactions/TransactionCard.vue
- [ ] T011 [US2] Test: Create transaction with long description (>100 characters) and verify truncation with ellipsis in collapsed state

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - descriptions visible and properly truncated with visual hierarchy

---

## Phase 5: User Story 3 - Hide Description from Header When Card is Expanded (Priority: P3)

**Goal**: Remove description from header line when card is expanded to avoid duplication (full description remains visible in expanded section)

**Independent Test**: Create a transaction with a description, verify it shows in the collapsed header line. Expand the card and verify the header shows only "Date • Account • Category" while the description remains visible in the expanded section below. Collapse the card again and verify the description reappears in the header.

### Implementation for User Story 3

- [ ] T012 [US3] Add `v-if="!isExpanded"` condition to description preview span to hide when card is expanded in frontend/src/components/transactions/TransactionCard.vue
- [ ] T013 [US3] Verify expanded section continues to display full description in dedicated area (lines 155-157) in frontend/src/components/transactions/TransactionCard.vue
- [ ] T014 [US3] Test: Expand card and verify description removed from header but visible in expanded section
- [ ] T015 [US3] Test: Collapse card and verify description reappears in header without layout shift

**Checkpoint**: All user stories should now be independently functional - description preview with truncation and conditional display

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and code quality

- [ ] T016 Run manual testing checklist from quickstart.md covering all edge cases (whitespace-only, special characters, line breaks, responsive behavior)
- [ ] T017 Verify no layout shift during expand/collapse transitions using browser DevTools
- [ ] T018 Test on mobile viewport (<600px) and desktop viewport (>1200px) for responsive truncation
- [ ] T019 [P] Run `npm run format` in frontend/ directory to format code
- [ ] T020 [P] Run `npm run lint` in frontend/ directory and fix any ESLint issues
- [ ] T021 Verify all functional requirements (FR-001 through FR-014) from spec.md are met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories SHOULD proceed sequentially (US1 → US2 → US3) as each builds on the previous
  - OR can be implemented all at once following quickstart.md (most efficient for this simple feature)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Builds on User Story 1 - Adds truncation and styling to existing preview
- **User Story 3 (P3)**: Builds on User Stories 1 and 2 - Adds conditional rendering logic

### Within Each User Story

- Tasks within a story should be completed in order (computed property → template changes → tests)
- All template modifications happen in the same file (TransactionCard.vue)
- Each story checkpoint represents an independently testable increment

### Parallel Opportunities

- T002 and T003 (Foundational phase) can run in parallel
- T019 and T020 (Polish phase formatting/linting) can run in parallel
- **Note**: Due to all changes being in a single file, user story tasks cannot run in true parallel - they must be sequential or implemented together

---

## Parallel Example: Foundational Phase

```bash
# Launch both foundational tasks together:
Task: "Read existing TransactionCard.vue implementation"
Task: "Verify Transaction type includes description field"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (read documentation)
2. Complete Phase 2: Foundational (understand existing code)
3. Complete Phase 3: User Story 1 (basic description preview)
4. **STOP and VALIDATE**: Test that descriptions appear in collapsed cards
5. Deploy/demo if ready - users can now see descriptions without expanding cards

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - descriptions visible!)
3. Add User Story 2 → Test independently → Deploy/Demo (truncation + visual hierarchy)
4. Add User Story 3 → Test independently → Deploy/Demo (smart hiding when expanded)
5. Each story adds value without breaking previous stories

### Most Efficient Strategy (Recommended)

Since all changes are in a single component and are simple, implement all three user stories together following quickstart.md:

1. Complete Setup + Foundational
2. Implement tasks T004-T015 in one session (adds computed property + all template changes)
3. Test all three user stories together using quickstart.md checklist
4. Complete Polish phase

**Rationale**: The user stories are artificially separated for independent testing, but in practice they're a single cohesive change to one Vue template.

---

## Notes

- [P] tasks = different files, no dependencies (limited in this feature due to single-file changes)
- [Story] label maps task to specific user story for traceability
- All changes isolated to frontend/src/components/transactions/TransactionCard.vue
- No backend changes, no GraphQL schema changes, no new dependencies
- Total implementation: ~10 lines of code (1 computed property + template modifications)
- Manual testing sufficient per constitution (automated tests not required for frontend)
- Each user story checkpoint represents an independently verifiable increment of value
