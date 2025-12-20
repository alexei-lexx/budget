# Implementation Plan: Fix Transaction Description Suggestion Duplicate Selection

**Branch**: `021-fix-description-suggestions` | **Date**: 2025-12-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-fix-description-suggestions/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix a frontend bug where transaction description suggestions require duplicate selection before enabling the save button. When a user selects a suggestion from the autocomplete dropdown, the dropdown incorrectly re-opens after a 300ms debounce delay, requiring a second selection. The root cause is a race condition between the suggestion selection action and the reactive watchers managing dropdown visibility.

**Technical Approach**: Add a flag to track when a suggestion has been programmatically selected, preventing the `showSuggestions` watcher from re-opening the dropdown after the debounced search text update completes.

## Technical Context

**Language/Version**: TypeScript (Vue 3 Composition API)
**Primary Dependencies**: Vue 3, Vuetify 3, Apollo Client (GraphQL)
**Storage**: N/A (frontend bug fix, no data model changes)
**Testing**: Jest (manual testing recommended per constitution)
**Target Platform**: Web browser (responsive design, mobile-first)
**Project Type**: Web application (frontend package)
**Performance Goals**: Immediate dropdown dismissal on selection (<50ms)
**Constraints**: Must maintain keyboard navigation support, must work with existing GraphQL query
**Scale/Scope**: Single component fix (DescriptionAutocomplete.vue), no API changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Repository Structure
- **Gate**: Changes confined to `frontend/` package only
- **Status**: PASS - Bug fix is purely frontend, no backend or CDK changes required

### ✅ Schema-Driven Development
- **Gate**: No GraphQL schema changes allowed without backend schema update first
- **Status**: PASS - No schema changes required; existing `transactionDescriptionSuggestions` query is sufficient

### ✅ Frontend Code Discipline
- **Gate**: Prefer Vuetify framework components over custom implementations
- **Status**: PASS - Using v-text-field and v-menu from Vuetify, no custom CSS changes needed

### ✅ Test Strategy
- **Gate**: Frontend tests are optional; manual testing is primary validation method
- **Status**: PASS - Manual testing will validate fix; no automated tests required per constitution

### ✅ TypeScript Code Generation
- **Gate**: All code must adhere to strict type safety standards
- **Status**: PASS - Fix will use existing TypeScript types, no type assertions or non-null assertions needed

### ✅ UI Guidelines
- **Gate**: Optimize for mobile devices first, use snackbars for user feedback
- **Status**: PASS - No UI changes to layout or feedback mechanisms; bug fix maintains existing responsive behavior

**Constitution Compliance**: All gates PASS. No violations or exceptions required.

## Project Structure

### Documentation (this feature)

```text
specs/021-fix-description-suggestions/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Bug analysis and fix strategy
├── data-model.md        # Phase 1 output - N/A (no data changes)
├── quickstart.md        # Phase 1 output - Testing instructions
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── common/
│   │       └── DescriptionAutocomplete.vue  # PRIMARY FIX LOCATION
│   └── composables/
│       └── useDescriptionSuggestions.ts     # Review for side effects, likely no changes needed
```

**Structure Decision**: This is a single-component bug fix in the frontend package. The bug is isolated to `DescriptionAutocomplete.vue` where the interaction between `selectSuggestion()` function and `showSuggestions` watcher creates a race condition. The `useDescriptionSuggestions` composable provides correct behavior; the bug is in how the component consumes it.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations.

## Phase 0: Research

**Objective**: Analyze the bug's root cause and identify the precise fix location and strategy.

### Research Tasks

1. **Bug Analysis**: Trace the execution flow when a suggestion is selected
   - Identify the sequence of events from click to dropdown re-opening
   - Map the reactive dependencies between `inputValue`, `searchText`, `debouncedSearchText`, and `showSuggestions`
   - Confirm the 300ms debounce delay matches the observed re-opening timing

2. **Race Condition Root Cause**: Document the exact race condition
   - Why does `selectSuggestion` setting `dropdownOpen = false` not prevent re-opening?
   - When does the `watch(showSuggestions)` trigger relative to `selectSuggestion` completion?
   - What value does `showSuggestions` compute to after suggestion selection?

3. **Fix Strategy Options**: Evaluate approaches to prevent dropdown re-opening
   - Option A: Add `justSelected` flag to prevent watcher from re-opening dropdown
   - Option B: Modify `showSuggestions` computed to check if current value matches selected value
   - Option C: Clear `searchText` after selection to prevent query re-trigger
   - Document pros/cons of each approach

4. **Side Effect Analysis**: Verify fix doesn't break other functionality
   - Keyboard navigation (arrow keys, Enter, Escape, Tab)
   - Manual editing after selection
   - Focus/blur behavior
   - Edit mode vs create mode consistency

**Output**: `research.md` with root cause analysis, race condition timeline, recommended fix strategy, and side effect mitigation plan

## Phase 1: Design

**Prerequisites**: `research.md` complete with confirmed fix strategy

### Design Artifacts

#### data-model.md
**Content**: N/A - No data model changes required for this bug fix.

#### contracts/
**Content**: N/A - No API contract changes; existing GraphQL query `transactionDescriptionSuggestions(searchText: String!): [String!]!` is sufficient.

#### quickstart.md
**Content**: Manual testing guide for validating the fix

**Sections**:
1. **Prerequisites**: Local dev environment running, test data with multiple transactions with similar descriptions
2. **Test Scenario 1**: Create new transaction - single selection flow
   - Enter partial description → verify dropdown appears
   - Click suggestion → verify dropdown closes immediately
   - Verify save button is enabled immediately
   - Verify dropdown does NOT re-open after ~300ms
3. **Test Scenario 2**: Edit existing transaction - consistent behavior
   - Same steps as scenario 1, confirm identical behavior
4. **Test Scenario 3**: Keyboard navigation
   - Enter partial description → use arrow keys to navigate → press Enter
   - Verify same behavior as mouse click (no re-opening)
5. **Test Scenario 4**: Manual edit after selection
   - Select suggestion → manually edit text → verify dropdown behavior
6. **Test Scenario 5**: Edge cases
   - No matching suggestions
   - Dismiss dropdown with Escape
   - Blur field without selecting

### Agent Context Update

After design phase completion, run:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**Expected Updates**: No new technologies introduced; agent context should remain unchanged. This is a bug fix using existing Vue 3 patterns.

**Output**: quickstart.md with comprehensive manual testing scenarios

## Phase 2: Task Generation

**Command**: `/speckit.tasks` (separate command, not part of `/speckit.plan`)

**Expected Tasks**:
1. Analyze and document the race condition in research.md
2. Implement fix in DescriptionAutocomplete.vue
3. Manual testing per quickstart.md scenarios
4. Verify no regressions in keyboard navigation
5. Verify consistent behavior across create/edit modes

---

**Planning Complete**: This plan ready for review. Proceed with Phase 0 research to confirm root cause before implementation.
