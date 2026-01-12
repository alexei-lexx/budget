# Tasks: Move Sign-Out Button to Main Sidebar Menu

**Input**: Design documents from `/specs/027-move-signout-sidebar/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, quickstart.md

**Tests**: No test tasks included - feature follows constitution's manual testing approach for frontend changes.

**Organization**: Tasks organized by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` for Vue components, composables, and UI logic
- This feature modifies existing files only - no new files created

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify development environment and ensure feature branch is ready

- [ ] T001 Verify current branch is 027-move-signout-sidebar
- [ ] T002 Verify frontend development server can start (npm run dev in frontend/)
- [ ] T003 Verify existing sign-out button location in frontend/src/App.vue (line ~135 in app bar)

**Checkpoint**: Development environment ready

---

## Phase 2: User Story 1 - Sign Out from Sidebar (Priority: P1) 🎯 MVP

**Goal**: Relocate sign-out button from app bar to sidebar navigation menu, maintaining all existing functionality while improving accessibility for all screen sizes.

**Independent Test**: Can be fully tested by logging into the application, opening the sidebar menu, clicking the sign-out button, and verifying that the user is signed out and redirected appropriately.

**Acceptance Criteria** (from spec.md):
1. User can open sidebar and click sign-out button → signs out and redirects to login page
2. User with sidebar already open can click sign-out → immediately signs out and redirects
3. After sign-out → all session data cleared, protected pages inaccessible

### Implementation for User Story 1

- [ ] T004 [US1] Import useAuth composable in frontend/src/App.vue if not already imported
- [ ] T005 [US1] Add logout and isLoading destructure from useAuth() in frontend/src/App.vue script section
- [ ] T006 [US1] Create handleSignOut method in frontend/src/App.vue script section (closes drawer on mobile, calls logout)
- [ ] T007 [US1] Add v-divider component before closing v-list tag in frontend/src/App.vue sidebar (line ~185, conditional on isAuthenticated)
- [ ] T008 [US1] Add v-list-item for sign-out in frontend/src/App.vue sidebar after divider (prepend-icon: mdi-logout, title: Sign Out, @click: handleSignOut, :disabled: isLoading)
- [ ] T009 [US1] Remove LogoutButton component from app bar in frontend/src/App.vue (line ~135)
- [ ] T010 [US1] Remove LogoutButton import statement from frontend/src/App.vue if no longer needed

**Checkpoint**: Sign-out button relocated to sidebar, ready for manual testing

---

## Phase 3: Manual Testing & Validation

**Purpose**: Verify all acceptance criteria and success criteria through manual testing per constitution

- [ ] T011 Run npm run type-check in frontend/ to verify no TypeScript errors
- [ ] T012 Run npm run format in frontend/ to format code per project standards
- [ ] T013 Run npm run lint in frontend/ and fix any linting issues
- [ ] T014 Manual test: Desktop view (>960px) - verify sign-out in sidebar, removed from app bar, click works
- [ ] T015 Manual test: Mobile view (<960px) - verify sign-out in sidebar, drawer closes after click, sign-out works
- [ ] T016 Manual test: Tablet view (600-960px) - verify sign-out visible and functional
- [ ] T017 Manual test: Verify loading state (button disabled during sign-out)
- [ ] T018 Manual test: Verify redirect to login page after sign-out
- [ ] T019 Manual test: Verify cannot access protected routes after sign-out (session cleared)
- [ ] T020 Manual test: Keyboard navigation - verify sign-out item is keyboard accessible

**Checkpoint**: All acceptance criteria verified, feature complete

---

## Phase 4: Polish & Optional Cleanup

**Purpose**: Optional improvements and cleanup

- [ ] T021 [P] Optional: Delete frontend/src/components/auth/LogoutButton.vue if no longer needed anywhere
- [ ] T022 Review quickstart.md checklist in specs/027-move-signout-sidebar/quickstart.md for any missed items
- [ ] T023 Visual verification: Ensure sign-out button follows Vuetify design system (matches other list items)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup verification - This is the core and only feature story
- **Manual Testing (Phase 3)**: Depends on User Story 1 implementation completion
- **Polish (Phase 4)**: Optional - can be done anytime after User Story 1

### Task Dependencies Within User Story 1

```
T004 (import useAuth) → T005 (destructure from useAuth) → T006 (create handler)
                                                           ↓
T007 (add divider) → T008 (add list item using handler) → T009 (remove old button) → T010 (cleanup import)
```

- T004, T005, T006 must be completed before T008 (handler must exist before being used)
- T007 can be done in parallel with T004-T006 (different location in file)
- T009 and T010 should be done after T008 (keep old button until new one works)

### Parallel Opportunities

- T004, T005, T006, T007 can be prepared in parallel if working carefully (different sections of App.vue)
- T011, T012, T013 (type-check, format, lint) can run in parallel
- T014-T020 (manual tests) can be performed in any order after implementation

---

## Parallel Example: User Story 1 Implementation

```bash
# These tasks touch different areas and could be done in parallel by one developer
# (though sequential is simpler for a single-file change):

# Prepare script changes:
Task T004: "Import useAuth composable in frontend/src/App.vue"
Task T005: "Add logout and isLoading destructure"
Task T006: "Create handleSignOut method"

# Prepare template changes (can work in parallel with script):
Task T007: "Add v-divider in sidebar"

# Then sequential:
Task T008: "Add v-list-item after handler exists"
Task T009: "Remove old button"
Task T010: "Cleanup imports"
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

This feature has only one user story (P1), which IS the MVP:

1. Complete Phase 1: Setup (verify environment)
2. Complete Phase 2: User Story 1 (implement sign-out relocation)
3. Complete Phase 3: Manual Testing (verify all acceptance criteria)
4. **STOP and VALIDATE**: Feature complete and ready for deployment
5. Optional Phase 4: Polish (cleanup unused components)

### Single Story Approach

Since this feature has only one user story:
- User Story 1 delivers the complete feature
- No incremental delivery needed (all-or-nothing UI change)
- After User Story 1 + Manual Testing → Feature is complete

### Quality Gates

Before considering feature complete:
- ✓ All TypeScript type checks pass
- ✓ Code formatted per project standards
- ✓ No linting errors
- ✓ All acceptance scenarios verified manually
- ✓ Desktop, mobile, and tablet responsive behavior verified
- ✓ Keyboard accessibility verified

---

## Task Summary

**Total Tasks**: 23
- Setup: 3 tasks
- User Story 1 Implementation: 7 tasks
- Manual Testing & Validation: 10 tasks
- Polish: 3 tasks (optional)

**User Story Breakdown**:
- User Story 1 (P1): 7 implementation tasks + 10 testing tasks = 17 tasks total
- This is the only user story (complete feature)

**Parallel Opportunities**:
- Within implementation: 4 tasks can be parallelized (script vs template changes)
- Testing commands: 3 tasks can run in parallel (type-check, format, lint)
- Manual tests: 7 test scenarios can be performed in any order

**Critical Path**: T001 → T002 → T003 → T004 → T005 → T006 → T008 → T009 → T011 → T012 → T013 → T014-T020 (manual tests)

**Estimated Effort**:
- Implementation: 1-2 hours (straightforward single-file change)
- Manual Testing: 30-45 minutes (thorough cross-device testing)
- Total: ~2-3 hours for complete feature

---

## Notes

- [P] tasks = different files or independent operations, no dependencies
- [US1] label = all tasks belong to User Story 1 (only story in this feature)
- Single file modification (frontend/src/App.vue) keeps complexity low
- No new files created - pure reorganization of existing UI
- Manual testing required per constitution (Test Strategy section)
- Tests written in Jest would not add value for this UI relocation task
- Keyboard accessibility check ensures WCAG compliance
- Success criteria SC-001 through SC-005 verified through manual testing in Phase 3
