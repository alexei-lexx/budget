# Implementation Plan: Transaction Description Preview in Collapsed Cards

**Branch**: `015-description-preview` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-description-preview/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add transaction description preview to collapsed card headers, following the format "Account * Category * Description". Truncate long descriptions with ellipsis to maintain visual consistency. When cards are expanded, hide description from header (remains visible in expanded section). Apply subtle styling to make descriptions visually less prominent than account and category names.

## Technical Context

**Language/Version**: TypeScript (Vue 3 with Composition API)
**Primary Dependencies**: Vue 3, Vuetify 3, Apollo Client
**Storage**: N/A (frontend-only UI change, no data model changes)
**Testing**: Jest (component tests optional per constitution)
**Target Platform**: Web (responsive design for mobile and desktop)
**Project Type**: Web application (frontend package modification only)
**Performance Goals**: <16ms render time per frame, 60fps animations, zero layout shift during expand/collapse
**Constraints**: Must maintain responsive design across breakpoints, CSS-only truncation (no JS text measurement), single-line header regardless of description length
**Scale/Scope**: Single component modification (TransactionCard.vue), affects transaction list view only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Applicable Gates:**

1. **Test Strategy** ✅ PASS
   - Frontend tests optional per constitution
   - Manual verification in dev environment acceptable
   - No complex business logic requiring automated tests

2. **UI Guidelines** ✅ PASS
   - Mobile-first responsive design maintained
   - Uses existing Vuetify responsive classes (flex-column, flex-sm-row)
   - No snackbar feedback needed (display-only change)

3. **Frontend Code Discipline** ✅ PASS
   - Uses Vuetify components (v-card, v-icon) and utility classes
   - Minimal custom CSS (only for "less prominent" description styling)
   - Leverages Vuetify text-truncate class for ellipsis

4. **TypeScript Code Generation** ✅ PASS
   - No type assertions or non-null assertions needed
   - Uses existing Transaction type from composables
   - Computed properties maintain type safety

**Non-Applicable Gates:**
- Schema-Driven Development (no GraphQL changes)
- Backend Layer Structure (frontend-only)
- Database Hydration (no data changes)
- Authentication/Authorization (no auth changes)
- Input Validation (display-only, no new input)

**Status**: All applicable gates PASS. No violations requiring justification.

---

**Post-Design Re-evaluation** (after Phase 1):

All gates continue to PASS:

1. **Test Strategy** ✅ PASS
   - Manual testing plan provided in quickstart.md
   - No automated tests required per constitution
   - Simple UI change with visual verification

2. **UI Guidelines** ✅ PASS
   - Maintains responsive design using existing Vuetify breakpoints
   - Mobile-first approach preserved
   - No new UI patterns, extends existing card component

3. **Frontend Code Discipline** ✅ PASS
   - Uses Vuetify utility classes: `text-truncate`, `text-opacity-70`
   - Zero custom CSS added (only existing styles remain)
   - Leverages framework design system throughout

4. **TypeScript Code Generation** ✅ PASS
   - Single new computed property `descriptionPreview` with proper type inference
   - No type assertions or non-null assertions
   - Maintains type safety with existing Transaction type

**Final Status**: APPROVED - Ready for implementation (Phase 2).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
└── src/
    └── components/
        └── transactions/
            └── TransactionCard.vue  # Modified component
```

**Structure Decision**: Frontend-only modification. Changes isolated to TransactionCard.vue component. No backend, schema, or infrastructure changes required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations detected.
