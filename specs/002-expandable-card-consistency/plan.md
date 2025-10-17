# Implementation Plan: Expandable Card UI Consistency

**Branch**: `002-expandable-card-consistency` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-expandable-card-consistency/spec.md`

## Summary

This feature applies the expandable card interaction pattern (already implemented for transaction cards) to account and category cards, creating UI consistency across all list views in the application. The implementation involves:

1. Adding expand/collapse state management to AccountCard and CategoryCard components
2. Replacing ActionDropdown with ActionButtons component
3. Implementing click handlers for card expansion
4. Adding conditional rendering for action buttons based on expanded state
5. Styling updates to match transaction card behavior (hover effects, cursor)
6. Removing deprecated ActionDropdown component after migration

**Technical Approach**: Frontend-only Vue component modifications with no backend or data model changes. Follows the established pattern from TransactionCard.vue as the reference implementation.

## Technical Context

**Language/Version**: TypeScript 5.8, Vue 3.5.13
**Primary Dependencies**: Vue 3, Vuetify 3.8.9, Vue Router 4.5
**Storage**: N/A (UI state only, not persisted)
**Testing**: Manual testing (no automated tests in project currently)
**Target Platform**: Web application (SPA)
**Project Type**: Web (frontend + backend separation)
**Performance Goals**: Instant UI response (<16ms for 60fps), smooth animations
**Constraints**: Must match existing transaction card behavior exactly, no accessibility regressions
**Scale/Scope**: 2 Vue components (AccountCard.vue, CategoryCard.vue), 1 component removal (ActionDropdown.vue)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: N/A - No constitution file defined for this project

The project does not have an established constitution document. This UI consistency feature follows existing patterns and conventions from the codebase without introducing new architectural patterns or complexity.

## Project Structure

### Documentation (this feature)

```
specs/002-expandable-card-consistency/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output - component patterns research
├── data-model.md        # Phase 1 output - component state model
├── quickstart.md        # Phase 1 output - developer testing guide
└── contracts/           # Phase 1 output - component API contracts
    ├── AccountCard.contract.md
    └── CategoryCard.contract.md
```

### Source Code (repository root)

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── ActionButtons.vue        # Existing - reused
│   │   │   └── ActionDropdown.vue       # TO BE REMOVED
│   │   ├── accounts/
│   │   │   ├── AccountCard.vue          # TO BE MODIFIED
│   │   │   └── AccountsList.vue         # TO BE MODIFIED (state management)
│   │   └── categories/
│   │       └── CategoryCard.vue         # TO BE MODIFIED
│   └── views/
│       └── Categories.vue               # TO BE MODIFIED (state management)
└── tests/
    └── [manual testing only]

backend/                 # No changes required
backend-cdk/            # No changes required
frontend-cdk/           # No changes required
```

**Structure Decision**: Web application structure (Option 2). This feature only impacts the frontend Vue components. No backend, database, or infrastructure changes are required. The existing ActionButtons component serves as both a reference implementation and a reusable component for this feature.

## Complexity Tracking

*No violations - this section not applicable*

This feature does not introduce new patterns, architecture changes, or complexity. It applies an existing pattern (expandable cards) to additional components, reducing overall codebase complexity by:
- Standardizing the action button pattern across all card types
- Removing the deprecated ActionDropdown component
- Achieving UI consistency through pattern reuse
