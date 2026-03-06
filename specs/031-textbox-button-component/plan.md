# Implementation Plan: Reusable Textbox-Button Input Component

**Branch**: `031-textbox-button-component` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-textbox-button-component/spec.md`

## Summary

Create a single reusable `TextboxButtonInput` Vue component combining an auto-growing `v-textarea` with an inline clear icon (mdi-close-circle) and a send-icon submit button (mdi-send), then refactor both the Insight and Transactions pages to render it inside a `<v-footer app>` layout identical to the existing Transactions page footer — replacing the Insight page's current inline `.input-area` div and the Transactions page's current `v-text-field + v-btn` footer pair.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3 (Composition API), Vuetify 3
**Primary Dependencies**: Vue 3, Vuetify 3 (`v-textarea`, `v-btn`, `v-footer`) — no new dependencies
**Storage**: N/A
**Testing**: Manual visual verification (per constitution — frontend tests not required)
**Target Platform**: Web PWA, mobile-first responsive
**Project Type**: Web application — frontend only; no backend or schema changes
**Performance Goals**: Standard UI interaction; no specific targets
**Constraints**: Must use Vuetify framework components; minimize custom CSS; no new npm packages
**Scale/Scope**: 1 new reusable component (`TextboxButtonInput.vue`), 2 page refactors (`Insight.vue`, `Transactions.vue`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Frontend Code Discipline — use framework components | PASS | Uses `v-textarea`, `v-btn`, `v-footer`; no bespoke UI implementations |
| UI Guidelines — mobile-first, snackbars for feedback | PASS | `v-footer app` is mobile-appropriate; no new feedback patterns introduced |
| TypeScript Code Generation — strict types, descriptive names | PASS | Props/emits typed explicitly; no `as any` or non-null assertions |
| Test Strategy — frontend tested manually | PASS | No component tests required per constitution |
| Schema-Driven Development | N/A | Pure frontend change; no API or schema modifications |
| Backend Layer Structure | N/A | No backend changes |

**No violations. No Complexity Tracking required.**

## Project Structure

### Documentation (this feature)

```text
specs/031-textbox-button-component/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output — component interface & usage guide
└── tasks.md             # Phase 2 output (/speckit.tasks command — not created here)
```

*`data-model.md` and `contracts/` are omitted: no new entities, no API changes.*

### Source Code (repository root)

```text
frontend/src/
├── components/
│   └── common/
│       └── TextboxButtonInput.vue      # NEW — reusable component
└── views/
    ├── Insight.vue                     # REFACTOR — replace .input-area div with v-footer + TextboxButtonInput
    └── Transactions.vue                # REFACTOR — replace v-text-field+v-btn footer with TextboxButtonInput
```

**Structure Decision**: Frontend-only refactor within the existing `frontend/` package. No new directories at the repo root. The new component lives in `frontend/src/components/common/` alongside other shared components (`ActionButtons.vue`, `AccountSelect.vue`, etc.).
