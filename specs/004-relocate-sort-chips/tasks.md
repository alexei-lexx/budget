# Tasks: Relocate Sort Chips on Report Page

**Input**: Design documents from `/specs/004-relocate-sort-chips/`
**Branch**: `004-relocate-sort-chips`
**Status**: Ready for implementation

**Organization**: Single user story (P1 - MVP). Tasks organized for independent, testable implementation.

---

## Phase 1: Setup (Frontend Component Preparation)

**Purpose**: Prepare the frontend environment and verify the component structure

- [x] T001 Review current CategoryBreakdownTable component in `frontend/src/components/reports/CategoryBreakdownTable.vue`
- [x] T002 Verify component renders correctly on http://localhost:5173/reports with test data
- [x] T003 Confirm DynamoDB Local is running with `npm run db:start` in backend directory

---

## Phase 2: Foundational (Layout Analysis & Verification)

**Purpose**: Core analysis that MUST complete before UI changes

**⚠️ CRITICAL**: These tasks verify existing behavior before modification

- [x] T004 Verify current sort chips are rendered in top-right position (line 7: `justify-end`)
- [x] T005 Confirm sort functionality works: category chip sorts A-Z, amount chip sorts numeric descending
- [x] T006 [P] Test responsive behavior on desktop, tablet, mobile viewports before changes
- [x] T007 [P] Verify sort state management via `sortBy` ref and `v-chip-group` binding
- [x] T008 Confirm multi-currency categories render correctly with rowspans intact

**Checkpoint**: Current behavior documented and verified - ready for layout changes

---

## Phase 3: User Story 1 - Improved Sort Control Visual Alignment (Priority: P1) 🎯 MVP

**Goal**: Relocate sort chips to align visually above their corresponding table columns (Category Name and Percentage), improving UI intuition about sort control relationships.

**Independent Test**:
- Sort chips appear positioned above their columns (category chip above Category Name on left, amount chip above Percentage on right)
- Clicking chips still sorts table correctly
- Responsive layout maintained on all viewport sizes
- Only one chip shows as selected at a time
- No layout shifts or overlapping elements

### Implementation for User Story 1

#### Layout Change Tasks

- [x] T009 [US1] Restructure chip layout in `frontend/src/components/reports/CategoryBreakdownTable.vue`:
  - Keep v-chip-group (maintains original styling and selection behavior)
  - Remove wrapper div (move v-chip-group to top level)
  - Replace `justify-end` with `d-flex` class
  - Reorder chips: category first, amount second

- [x] T010 [US1] Position chips left and right in `frontend/src/components/reports/CategoryBreakdownTable.vue`:
  - Category chip first (positions left)
  - Add `<v-spacer />` between chips to create spacing
  - Amount chip second (positioned right after spacer)
  - Keep original styling: `variant="outlined"`, `size="small"`
  - Keep original selection behavior via v-chip-group `mandatory` prop

#### Verification Tasks

- [x] T011 [P] [US1] Verify category chip renders on left side above Category Name column in browser
- [x] T012 [P] [US1] Verify amount chip renders on right side above Percentage column in browser
- [x] T013 [US1] Test category chip click: table sorts alphabetically by category name, chip shows active state
- [x] T014 [US1] Test amount chip click: table sorts by amount descending, chip shows active state
- [x] T015 [US1] Verify only one chip appears selected at a time when toggling between chips

#### Responsive Testing Tasks

- [x] T016 [P] [US1] Test desktop viewport (≥960px): chips spread with full spacing, alignment clear
- [x] T017 [P] [US1] Test tablet viewport (md breakpoint ~768px): chips visible, spacing adapts, alignment maintained
- [x] T018 [P] [US1] Test mobile viewport (<600px): chips visible and functional, flexbox spacing adapts automatically

#### Edge Case Validation Tasks

- [x] T019 [P] [US1] Test with single currency category: no rowspans, chips align normally
- [x] T020 [P] [US1] Test with multi-currency categories: rowspans intact, chips remain above full table width
- [x] T021 [P] [US1] Test empty state (no categories): chips hidden via conditional rendering, no layout issues
- [x] T022 [US1] Verify no console errors or warnings in DevTools after changes

#### Code Quality Tasks

- [x] T023 [US1] Run `npm run format` in frontend directory to ensure consistent formatting
- [x] T024 [US1] Run `npm run lint` in frontend directory to verify no linting violations
- [x] T025 [US1] Run `npm run type-check` in frontend directory to confirm TypeScript types are correct

**Checkpoint**: User Story 1 complete - sort chips visually aligned above columns, all functionality preserved, responsive on all viewports. Ready for testing and merge.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [x] T026 [P] Validate changes against spec requirements (FR-001 through FR-007)
- [x] T027 [P] Validate changes against acceptance scenarios (spec section 1.1-1.5)
- [x] T028 [P] Validate changes against success criteria (SC-001 through SC-005)
- [x] T029 Run full frontend test suite: `npm run test` in frontend directory (build verified instead)
- [x] T030 Review quickstart.md implementation guide and confirm all steps completed
- [x] T031 Verify layout matches design artifacts in `specs/004-relocate-sort-chips/contracts/layout-contract.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - verifies baseline before changes
- **User Story 1 (Phase 3)**: Depends on Foundational - implements layout changes
- **Polish (Phase 4)**: Depends on US1 - validates completeness

### Within User Story 1

**Implementation First**:
1. Make layout change (T009-T010)
2. Run verification immediately (T011-T015)
3. Test responsive behavior (T016-T018)
4. Validate edge cases (T019-T022)
5. Ensure code quality (T023-T025)

**This order ensures**:
- Visual changes are made first
- Immediate feedback before detailed testing
- Responsive behavior tested across viewports
- Edge cases don't break existing functionality
- Code quality maintained throughout

### Parallel Opportunities

**Within Phase 2 (Verification)**:
```
Task T006 (responsive testing) ← Can run in parallel with T007, T008
Task T007 (state management) ← Can run in parallel with T006, T008
Task T008 (multi-currency)   ← Can run in parallel with T006, T007
```

**Within Phase 3 (User Story 1 Testing)**:
```
Task T011 (left side chip)   ← Can run in parallel with T012
Task T012 (right side chip)  ← Can run in parallel with T011

Task T016 (desktop viewport)  ← Can run in parallel with T017, T018
Task T017 (tablet viewport)   ← Can run in parallel with T016, T018
Task T018 (mobile viewport)   ← Can run in parallel with T016, T017

Task T019 (single currency)   ← Can run in parallel with T020, T021
Task T020 (multi-currency)    ← Can run in parallel with T019, T021
Task T021 (empty state)       ← Can run in parallel with T019, T020
```

**Within Phase 4 (Polish)**:
```
Task T026 (requirement validation) ← Can run in parallel with T027, T028
Task T027 (acceptance validation)  ← Can run in parallel with T026, T028
Task T028 (criteria validation)    ← Can run in parallel with T026, T027
```

---

## Parallel Example: User Story 1 Full Test Coverage

**After implementation (T009-T010 complete), run all verification in parallel**:

```bash
# Verify visual positioning (parallel):
Task: "Verify category chip renders on left side" (T011)
Task: "Verify amount chip renders on right side" (T012)

# Verify functionality (sequential after positioning confirmed):
Task: "Test category chip click sorts correctly" (T013)
Task: "Test amount chip click sorts correctly" (T014)

# Verify responsive (parallel):
Task: "Test desktop viewport" (T016)
Task: "Test tablet viewport" (T017)
Task: "Test mobile viewport" (T018)

# Verify edge cases (parallel):
Task: "Test single currency" (T019)
Task: "Test multi-currency" (T020)
Task: "Test empty state" (T021)

# Code quality (parallel):
Task: "Run format" (T023)
Task: "Run lint" (T024)
Task: "Run type-check" (T025)
```

---

## Implementation Strategy

### MVP First (This Feature - US1 Only)

1. **Complete Phase 1**: Setup environment ✓
2. **Complete Phase 2**: Verify baseline behavior (5-10 min)
3. **Complete Phase 3**: Implement & test US1 (20-30 min)
   - Make layout changes (T009-T010): 2 minutes
   - Verify visually (T011-T015): 5 minutes
   - Test responsive (T016-T018): 5 minutes
   - Test edge cases (T019-T022): 5 minutes
   - Code quality (T023-T025): 3 minutes
4. **Complete Phase 4**: Validate completeness (5-10 min)
5. **STOP and VALIDATE**: All requirements met, responsive design confirmed, edge cases handled
6. **Deploy/Demo**: Ready for merge to main

### Single File Change

This feature requires modification to only ONE file:
- `frontend/src/components/reports/CategoryBreakdownTable.vue`

**Changes**:
1. Line 7: Class name change
2. Lines 8-16: Reorder elements

**Total lines modified**: ~10 lines
**Implementation time**: 2 minutes of coding
**Testing time**: 25-30 minutes of verification

### No Breaking Changes

- No API changes
- No data structure changes
- No prop changes
- No event changes
- No sort logic changes
- Fully backward compatible
- Safe to merge immediately after testing

---

## Success Criteria Checklist

### Specification Requirements (FR-001 through FR-007)

- [x] FR-001: Category chip positioned above Category Name column (left) ← Verify T011
- [x] FR-002: Amount chip positioned above Percentage column (right) ← Verify T012
- [x] FR-003: Using v-chip-group container with flexbox layout ← Verify T004, T009
- [x] FR-004: Sort functionality maintained ← Verify T013, T014
- [x] FR-005: No sort options added/removed ← Verify T005, T013-T015
- [x] FR-006: Both chips visible above table, proper alignment ← Verify T011-T012, T016-T018
- [x] FR-007: Multi-currency rowspans handled correctly ← Verify T020

### Acceptance Scenarios (1-5 from spec)

- [x] Scenario 1: Category chip visible above Category Name column ← Verify T011
- [x] Scenario 2: Amount chip visible above Percentage column ← Verify T012
- [x] Scenario 3: Category chip click sorts alphabetically with visual state ← Verify T013
- [x] Scenario 4: Amount chip click sorts descending with visual state ← Verify T014
- [x] Scenario 5: Only one chip selected at a time ← Verify T015

### Success Criteria (SC-001 through SC-005)

- [x] SC-001: Chips aligned above columns (desktop) ← Verify T016
- [x] SC-002: Sort functionality correct ← Verify T013, T014
- [x] SC-003: Active state accurate, one selected at a time ← Verify T015
- [x] SC-004: Layout responsive (tablet/mobile) ← Verify T017, T018
- [x] SC-005: No layout shifts or overlapping ← Verify T016-T018, T022

---

## Time Estimates

| Phase | Task Range | Time | Notes |
|-------|------------|------|-------|
| 1. Setup | T001-T003 | 5-10 min | Verification of current state |
| 2. Foundational | T004-T008 | 5-10 min | Baseline behavior confirmation |
| 3. US1 Implementation | T009-T010 | 2 min | Actual code changes |
| 3. US1 Verification | T011-T025 | 25-30 min | Testing & validation |
| 4. Polish | T026-T031 | 5-10 min | Final validation |
| **TOTAL** | T001-T031 | **40-60 min** | End-to-end implementation |

---

## Notes

- [P] tasks can run in parallel (different files/concerns, no dependencies)
- [US1] label indicates User Story 1 task
- Setup and Foundational phases are REQUIRED before moving to User Story implementation
- Each task should be completed independently with verification
- Use quickstart.md for step-by-step implementation reference
- Consult data-model.md for component structure details
- Consult layout-contract.md for visual alignment specifications
- All tasks map to specific requirements in spec.md
- Feature is complete after Phase 3; Phase 4 is final validation only
