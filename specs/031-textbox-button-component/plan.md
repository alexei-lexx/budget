# Implementation Plan: Reusable Textbox-Button Input Component

**Branch**: `031-textbox-button-component` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/031-textbox-button-component/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a reusable Vue 3 component that combines a Vuetify textarea (with auto-grow and max-rows=4) and a submit icon button, supporting clear functionality, keyboard submission (Enter), and loading states. Apply this component consistently across Insight and Transactions pages by refactoring each page to use the component in a native app footer. Leverage Vuetify's built-in auto-grow behavior — no manual height computation required.

## Technical Context

**Language/Version**: TypeScript, Vue 3
**Primary Dependencies**: Vue 3, Vuetify, Apollo Client
**Storage**: N/A (frontend only)
**Testing**: Jest
**Target Platform**: Web browser (frontend SPA)
**Project Type**: Frontend Vue 3 single-page application
**Performance Goals**: No specific performance targets
**Constraints**: Must render consistently on mobile and desktop
**Scale/Scope**: Single reusable component, applied to 2 pages, ~200-300 lines of component code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Frontend Code Discipline**: ✅ Component will use Vuetify components (VTextarea, VBtn, VIcon) rather than custom implementations.

**UI Guidelines**: ✅ Will use framework components (Vuetify) throughout.

**TypeScript Code Generation**: ✅ Will follow strict type safety standards, descriptive names, no non-null assertions.

**Code Quality Validation**: ✅ Will include component tests; will run test suite after implementation.

**No backend changes required** — this is pure frontend refactoring and new component development. No schema or API changes needed.

## Project Structure

### Documentation (this feature)

```text
specs/031-textbox-button-component/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command) - N/A for frontend
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository structure)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── TextboxButtonInput.vue       # NEW: Reusable component
│   │   ├── TextboxButtonInput.test.ts   # NEW: Component tests
│   │   └── [existing components]
│   ├── pages/
│   │   ├── InsightPage.vue              # REFACTORED: Use TextboxButtonInput
│   │   ├── TransactionsPage.vue         # REFACTORED: Use TextboxButtonInput
│   │   └── [other pages]
│   ├── composables/
│   │   └── [existing]
│   └── schema.graphql
└── tests/
    └── [existing test structure]
```

**Structure Decision**: Pure frontend feature — adds one new Vue component (`TextboxButtonInput.vue`) and refactors two existing pages (InsightPage, TransactionsPage) to use it. No backend changes required.

## Phase 0: Research — COMPLETE ✓

**Output**: [research.md](research.md)

- ✅ Textarea auto-growing pattern established (Vuetify `auto-grow` + `max-rows="4"`)
- ✅ Vue 3 keyboard handling patterns (Enter key submission)
- ✅ Vuetify component selection (VBtn, VIcon, VTextarea)
- ✅ Jest testing strategy for Vue 3 components
- ✅ Focus management patterns (post-clear behavior)
- ✅ Page integration model (parent control of handlers)

**Result**: No blocking unknowns. All patterns documented and ready for implementation.

---

## Phase 1: Design — COMPLETE ✓

**Outputs**:
- [data-model.md](data-model.md) — Component interface, props, events, state management
- [quickstart.md](quickstart.md) — Implementation guide and usage examples
- `contracts/` directory — N/A for frontend (no API contracts required)
- Agent context updated — CLAUDE.md now includes Vue 3, Vuetify, TypeScript

**Design Decisions**:
- ✅ Component is presentational (no internal state)
- ✅ Parent pages control business logic and handlers
- ✅ Props follow Vue 3 `<script setup>` TypeScript pattern
- ✅ Events use typed `emits()` for compile-time safety
- ✅ Testing strategy: Jest + @vue/test-utils with co-located .test.ts files
- ✅ Vuetify components used throughout (VBtn, VIcon, VTextarea, VFooter)
- ✅ Accessibility: aria-labels on all interactive elements
- ✅ Mobile-first responsive design (Vuetify handles responsive layout)

---

## Constitution Check: Post-Design ✓

Re-evaluated after Phase 1 design:

**Frontend Code Discipline**: ✅ PASS
- Component uses Vuetify components exclusively
- No custom CSS beyond height calculations
- Framework design system preferred over custom implementations

**TypeScript Code Generation**: ✅ PASS
- Props use `type Props` with `defineProps`
- Emits use typed `emits()` with explicit event types
- No non-null assertions needed (refs properly typed)
- Descriptive names throughout (textHeight, showClear, isSubmitDisabled, etc.)

**Code Quality Validation**: ✅ PASS
- Component tests required and specified in data-model.md
- Test strategy includes all user interactions, state changes, accessibility
- Tests co-located with source (.test.ts files)
- Full test suite must pass before completion

**Schema-Driven Development**: ✅ PASS (N/A)
- No GraphQL changes required
- Pure frontend component — no API contracts

**No Backend Architecture Violations**: ✅ PASS
- Presentational component only
- No Repository pattern, Service layer, or GraphQL resolver changes
- Parent pages retain all business logic responsibility

**Result**: All gates pass. No violations or exceptions needed.

---

## Complexity Tracking

No violations to document — design adheres to all constitutional principles without exception.

---

## Next Phase: Implementation (Phase 2)

Ready for task generation via `/speckit.tasks` command:

1. Create `TextboxButtonInput.vue` component
2. Create `TextboxButtonInput.test.ts` tests
3. Refactor `InsightPage.vue` to use component
4. Refactor `TransactionsPage.vue` to use component
5. Run test suite and quality checks
6. Manual testing across both pages

Tasks will be generated from this design by the `/speckit.tasks` command.
