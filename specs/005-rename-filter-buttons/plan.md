# Implementation Plan: Rename Transaction Filter Buttons

**Branch**: `005-rename-filter-buttons` | **Date**: 2025-10-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-rename-filter-buttons/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Rename transaction filter button labels from "Apply Filters" to "Apply" and "Clear Filters" to "Clear" in the frontend TransactionFilterBar component. This improves UI clarity and reduces cognitive load. The change is isolated to a single Vue component file with no functional behavior changes required.

## Technical Context

**Language/Version**: TypeScript 5.x (Vue 3 + Vite)
**Primary Dependencies**: Vue 3, Vuetify, Vite
**Storage**: N/A (UI text change only)
**Testing**: Jest, Vue Test Utils
**Target Platform**: Web browsers (same as existing frontend)
**Project Type**: Web application (frontend SPA component modification)
**Performance Goals**: Instant UI update (no additional performance concerns)
**Constraints**: Button styling and positioning MUST remain unchanged; functionality MUST remain identical
**Scale/Scope**: Single component file modification (TransactionFilterBar.vue); affects one feature (transaction filtering)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: ✅ PASS

**Verification**:
- ✅ Uses approved frontend stack (Vue 3, TypeScript, Vuetify) - aligns with constitution
- ✅ Modification scope: Single component file (TransactionFilterBar.vue) in frontend/src/components/
- ✅ Testing: Jest + Vue Test Utils (approved in constitution)
- ✅ Quality: No new dependencies; code quality standards (ESLint, Prettier, TypeScript) apply
- ✅ No complexity violations: Text change only, no architectural modifications needed
- ✅ No violations: Feature is a straightforward UI text modification with no functional changes

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
frontend/
├── src/
│   ├── components/
│   │   └── transactions/
│   │       └── TransactionFilterBar.vue  # PRIMARY FILE TO MODIFY
│   ├── composables/
│   │   └── useTransactionFilters.ts      # (reference only, no changes)
│   └── views/
│       └── Transactions.vue               # (reference only, no changes)
└── tests/
    └── components/
        └── transactions/
            └── TransactionFilterBar.spec.ts  # TEST FILE TO UPDATE
```

**Structure Decision**: This feature modifies the frontend component layer only. The change is isolated to:
1. **Primary file**: `frontend/src/components/transactions/TransactionFilterBar.vue` - Update button labels
2. **Test file**: `frontend/tests/components/transactions/TransactionFilterBar.spec.ts` - Update test assertions if they reference button text
3. **No changes needed**: The composable and parent view components remain unaffected as they only trigger callbacks, not read button labels

## Phase 0: Research Findings

**Status**: ✅ COMPLETE - No NEEDS CLARIFICATION items identified

### Key Findings

1. **Button Location**: Both buttons located in `frontend/src/components/transactions/TransactionFilterBar.vue`
   - "Apply Filters" button at line 100: `<v-btn color="primary" @click="handleApply">Apply Filters</v-btn>`
   - "Clear Filters" button at lines 101-107: Multi-line Vuetify button with `Clear Filters` text

2. **No Functional Changes Required**: Buttons already have correct handlers (`handleApply`, `handleClear`) that don't reference button text

3. **Test Coverage**: Jest + Vue Test Utils in place; test file exists at `frontend/tests/components/transactions/TransactionFilterBar.spec.ts`

4. **No Dependencies**: Change is isolated to UI layer; no data model, API contracts, or composable logic affected

5. **Framework**: Vue 3 with Vuetify components; text changes only, no component structure changes

## Phase 1: Design & Contracts

### Data Model
**Status**: N/A - No data changes required. This is a pure UI text modification.

### API Contracts
**Status**: N/A - No API changes required. Button functionality unchanged; existing GraphQL mutations/queries unaffected.

### Component Changes

**File**: `frontend/src/components/transactions/TransactionFilterBar.vue`

**Changes Required**:
1. Line 100: Change text from `Apply Filters` to `Apply`
2. Lines 101-107: Change text from `Clear Filters` to `Clear`
3. Preserve: All props, event emissions, handler functions, styling, disabled states

### Test Changes

**File**: `frontend/tests/components/transactions/TransactionFilterBar.spec.ts`

**Changes Required**:
1. Update any test assertions that check for button text "Apply Filters" → "Apply"
2. Update any test assertions that check for button text "Clear Filters" → "Clear"
3. Preserve: All handler tests, state management tests, UI interaction tests

## Complexity Tracking

**No Constitution violations** - Feature is a text-only modification to an existing component with no architectural impact.

