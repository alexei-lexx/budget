---

description: "Task list for fixing transaction description suggestion duplicate selection bug"
---

# Tasks: Fix Transaction Description Suggestion Duplicate Selection

**Input**: Design documents from `/specs/021-fix-description-suggestions/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Manual testing per quickstart.md is the primary validation method (per constitution). No automated tests required.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` for all frontend changes
- This is a frontend-only bug fix - no backend changes required

## Phase 1: Setup (Not Required)

**Purpose**: Project already exists, no setup needed for bug fix

*Skipped - existing project*

---

## Phase 2: Foundational (Not Required)

**Purpose**: No foundational changes needed for this bug fix

*Skipped - infrastructure exists*

---

## Phase 3: User Story 1 - Single Selection Completes Description Entry (Priority: P1) 🎯 MVP

**Goal**: Fix the race condition where selecting a description suggestion requires duplicate selection before enabling the save button. After this fix, selecting a suggestion once should immediately populate the field, close the dropdown, and enable the save button without the dropdown re-opening.

**Independent Test**: Enter partial description text → select suggestion from dropdown → verify dropdown closes and does NOT re-open after 300ms → verify save button is enabled immediately

### Implementation for User Story 1

- [ ] T001 [US1] Analyze current reactive flow and confirm race condition in frontend/src/components/common/DescriptionAutocomplete.vue (lines 52-72)
- [ ] T002 [US1] Add `justSelected` ref flag to component state in frontend/src/components/common/DescriptionAutocomplete.vue
- [ ] T003 [US1] Update `selectSuggestion` function to set `justSelected = true` before updating inputValue in frontend/src/components/common/DescriptionAutocomplete.vue
- [ ] T004 [US1] Modify `watch(showSuggestions)` to check `justSelected` flag and prevent re-opening dropdown in frontend/src/components/common/DescriptionAutocomplete.vue
- [ ] T005 [US1] Update `handleKeyDown` function to set `justSelected` flag when Enter key triggers selection in frontend/src/components/common/DescriptionAutocomplete.vue
- [ ] T006 [US1] Run `npm run format` in frontend/ directory to format changes
- [ ] T007 [US1] Fix any ESLint issues in frontend/src/components/common/DescriptionAutocomplete.vue
- [ ] T008 [US1] Manual test: Create transaction - single selection flow per quickstart.md Scenario 1
- [ ] T009 [US1] Manual test: Keyboard navigation (Arrow keys, Enter) per quickstart.md Scenario 3
- [ ] T010 [US1] Manual test: Manual edit after selection per quickstart.md Scenario 4
- [ ] T011 [US1] Manual test: Edge case - no matching suggestions per quickstart.md Scenario 5a
- [ ] T012 [US1] Manual test: Edge case - single suggestion per quickstart.md Scenario 5b
- [ ] T013 [US1] Manual test: Edge case - rapid field switching per quickstart.md Scenario 5c

**Checkpoint**: At this point, User Story 1 should be complete - suggestion selection works with single click/Enter in transaction creation mode

---

## Phase 4: User Story 2 - Consistent Behavior Across Edit and Create Modes (Priority: P2)

**Goal**: Verify and ensure that the fix from User Story 1 applies equally to both transaction creation and transaction editing modes. Since DescriptionAutocomplete component is reused via v-model binding, the fix should automatically work for both contexts, but this needs explicit validation.

**Independent Test**: Edit existing transaction → select suggestion → verify same single-selection behavior as create mode

### Implementation for User Story 2

- [ ] T014 [US2] Verify DescriptionAutocomplete component is used in TransactionForm for both create and edit modes in frontend/src/components/transactions/TransactionForm.vue
- [ ] T015 [US2] Verify no mode-specific logic exists that could cause different behavior in frontend/src/components/common/DescriptionAutocomplete.vue
- [ ] T016 [US2] Manual test: Edit transaction - consistent behavior per quickstart.md Scenario 2
- [ ] T017 [US2] Manual test: Verify TransferForm also works correctly (uses same DescriptionAutocomplete) per quickstart.md Scenario 6
- [ ] T018 [US2] Cross-validate: Create new transaction → Edit same transaction → verify identical suggestion behavior

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - suggestion selection is consistent across create and edit modes

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and regression testing

- [ ] T019 [P] Manual test: Edge case - network delay simulation per quickstart.md Scenario 5d
- [ ] T020 [P] Manual test: Edge case - empty string selection per quickstart.md Scenario 5e
- [ ] T021 [P] Regression test: Verify debounce functionality still works (300ms delay) per quickstart.md Regression Testing section
- [ ] T022 [P] Regression test: Verify suggestion matching still works correctly per quickstart.md Regression Testing section
- [ ] T023 [P] Regression test: Verify form validation still works correctly per quickstart.md Regression Testing section
- [ ] T024 [P] Regression test: Verify no visual glitches or flashing per quickstart.md Regression Testing section
- [ ] T025 Test in Chrome/Chromium browser (primary)
- [ ] T026 [P] Test in Firefox browser (secondary)
- [ ] T027 [P] Test in Safari browser (if available)
- [ ] T028 [P] Test in mobile viewport using Chrome DevTools responsive mode
- [ ] T029 Review browser console for any errors or warnings
- [ ] T030 Final validation: Complete all scenarios in quickstart.md Test Completion Checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped - project exists
- **Foundational (Phase 2)**: Skipped - infrastructure exists
- **User Story 1 (Phase 3)**: No dependencies - can start immediately
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (validates consistency of fix)
- **Polish (Phase 5)**: Depends on User Stories 1 and 2 completion

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies - implements core fix
- **User Story 2 (P2)**: Depends on US1 - validates fix works in both contexts

### Within Each User Story

**User Story 1 (Sequential within story)**:
- T001: Analysis (understand the bug)
- T002-T005: Implementation (make the fix)
- T006-T007: Code quality (format and lint)
- T008-T013: Validation (test the fix)

**User Story 2 (Sequential within story)**:
- T014-T015: Verification (confirm reusability)
- T016-T018: Validation (test consistency)

**Polish Phase**:
- T019-T030: All tasks can run in parallel (different test scenarios)

### Parallel Opportunities

- Within US1: T008-T013 (manual tests) can be executed in any order
- Within US2: T016-T018 (manual tests) can be executed in any order
- Within Polish: T019-T024 (regression tests) can run in parallel
- Within Polish: T025-T028 (browser tests) can run in parallel

---

## Parallel Example: User Story 1 Testing

```bash
# After implementation (T001-T007), all manual tests can run in any order:
Task T008: "Test create transaction single-selection flow"
Task T009: "Test keyboard navigation"
Task T010: "Test manual edit after selection"
Task T011: "Test edge case - no matching suggestions"
Task T012: "Test edge case - single suggestion"
Task T013: "Test edge case - rapid field switching"
```

---

## Parallel Example: Polish Phase

```bash
# All regression and browser tests can run concurrently:
Task T019: "Network delay simulation test"
Task T020: "Empty string test"
Task T021: "Debounce functionality test"
Task T022: "Suggestion matching test"
Task T023: "Form validation test"
Task T024: "Visual glitch test"
Task T025: "Chrome testing"
Task T026: "Firefox testing"
Task T027: "Safari testing"
Task T028: "Mobile viewport testing"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001-T013)
   - Implement the `justSelected` flag fix
   - Validate with manual tests
2. **STOP and VALIDATE**: Test User Story 1 independently per quickstart.md
3. Optional: Deploy/commit at this point (core bug is fixed)

### Full Implementation

1. Complete Phase 3: User Story 1 → Core bug fixed
2. Complete Phase 4: User Story 2 → Consistency validated
3. Complete Phase 5: Polish → Full regression testing
4. **STOP and VALIDATE**: Complete quickstart.md Test Completion Checklist
5. Ready for PR/merge

### Single Developer Strategy

Sequential execution in priority order:
1. Phase 3 (US1): ~30-45 minutes implementation + testing
2. Phase 4 (US2): ~15-20 minutes validation
3. Phase 5 (Polish): ~30-40 minutes comprehensive testing
4. Total time: ~1.5-2 hours

---

## Implementation Notes

### Key Implementation Details

**File to Modify**: `frontend/src/components/common/DescriptionAutocomplete.vue`

**Changes Required**:
1. Add `justSelected` ref (line ~35)
2. Set `justSelected = true` in `selectSuggestion` before updating value (line ~69)
3. Check `justSelected` in `watch(showSuggestions)` and skip re-opening if true (line ~52)
4. Set `justSelected = true` in `handleKeyDown` when Enter key triggers selection (line ~93)
5. Reset `justSelected` to false after preventing re-open

**No Changes Needed**:
- `frontend/src/composables/useDescriptionSuggestions.ts` (composable works correctly)
- `frontend/src/components/transactions/TransactionForm.vue` (consumer, no changes)
- `frontend/src/components/transfers/TransferForm.vue` (consumer, no changes)

### Validation Criteria

**Success Indicators**:
- ✅ Single click/Enter selects suggestion
- ✅ Dropdown closes immediately
- ✅ Dropdown does NOT re-open after ~300ms
- ✅ Save button enabled immediately
- ✅ Works identically in create and edit modes
- ✅ Keyboard navigation works same as mouse
- ✅ No console errors
- ✅ All quickstart.md scenarios pass

**Failure Indicators**:
- ❌ Dropdown re-opens after selection
- ❌ Requires second selection to enable save button
- ❌ Keyboard navigation behaves differently than mouse
- ❌ Different behavior in create vs edit mode
- ❌ Console errors appear

---

## Notes

- Manual testing is the primary validation method per constitution (frontend tests are optional)
- All test scenarios are documented in quickstart.md
- The fix is minimal (add one ref flag and one conditional check)
- No API changes, no schema changes, no data model changes
- No new dependencies required
- Fix maintains all existing functionality (keyboard nav, manual editing, focus/blur)
- Component reuse means fix automatically applies to all consumers (TransactionForm, TransferForm)
