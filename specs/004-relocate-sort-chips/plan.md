# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Relocate the sort chips on the monthly expense report page from their current position in the top-right to be visually aligned above their corresponding table columns. The category sort chip positions above the "Category Name" column on the left, and the amount sort chip positions above the "Percentage" column on the right. This is a pure UI/layout change with no feature additions or backend modifications.

## Technical Context

**Language/Version**: TypeScript, Vue 3 (frontend)
**Primary Dependencies**: Vuetify 3, Vue 3, Apollo Client (frontend only)
**Storage**: N/A
**Testing**: Jest (frontend)
**Target Platform**: Web browser (responsive design)
**Project Type**: Web application (frontend only - no backend changes)
**Performance Goals**: No backend load changes; UI responsiveness maintained on all viewports
**Constraints**: Must maintain existing sort functionality; responsive layout on mobile/tablet
**Scale/Scope**: Single component (monthly expense report table) UI refactoring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**PASS**: Feature complies with constitution:
- Pure UI/layout change, no new architectural patterns required
- Frontend-only modification (Vue 3 + Vuetify)
- No new npm packages or complex dependencies
- Fits within existing project structure (4 packages)
- No storage, testing infrastructure, or governance changes needed

## Project Structure

### Documentation (this feature)

```
specs/004-relocate-sort-chips/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 output (research findings)
├── data-model.md        # Phase 1 output (component structure)
├── quickstart.md        # Phase 1 output (implementation guide)
├── contracts/           # Phase 1 output (UI contracts/examples)
└── tasks.md             # Phase 2 output (implementation tasks)
```

### Source Code Changes

```
frontend/
└── src/
    └── components/
        └── report/
            └── MonthlyExpenseReport.vue  # Primary component to modify
```

**Structure Decision**: Frontend-only modification to the existing MonthlyExpenseReport component. No new files or directory structure required. Changes isolated to component template and styling for chip positioning and layout flexbox distribution.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

