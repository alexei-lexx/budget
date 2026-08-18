## 1. Layout Implementation

- [x] 1.1 In `TransactionCard.vue`, replace the responsive row/column classes on the expanded description+actions container (`flex-column flex-sm-row align-sm-center justify-sm-space-between`) with an always-stacked layout: description full-width on top, action buttons in their own row below, right-aligned.
- [x] 1.2 Verify the description-only case (`hideActions: true`, no buttons) and the actions-only case (no description) still render correctly in the stacked layout.

## 2. Manual Verification

- [x] 2.1 Run the frontend dev server; expand a transaction card and check it at mobile, mid, and desktop viewport widths — description stays above the buttons at every width, no side-by-side arrangement.
- [x] 2.2 Expand a transaction card with a long, multi-line description; confirm the buttons sit in their own row below the full wrapped text, not beside any line of it.
- [x] 2.3 Confirm unaffected behaviors still work: expand/collapse on card click, action button clicks don't collapse the card, description preview truncation in the collapsed header.

## 3. Validation

- [x] 3.1 Run `npm run typecheck` in `frontend/`.
- [x] 3.2 Run `npm run format` in `frontend/` and resolve any lint/prettier issues.

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive across all screen sizes): task 1.1 replaces a breakpoint-dependent layout with one that's stacked at every size — compliant.
- **Frontend Code Discipline** (prefer framework components/styles, minimize custom CSS): change uses existing Vuetify utility classes, no new custom CSS — compliant.
- **Test Strategy** (frontend: manual visual verification; UI component tests only for complex/critical components, not required): `TransactionCard.vue` has no existing test file and isn't a complex/critical component, so this task list uses manual verification (section 2) instead of adding automated tests — compliant, no test-writing task needed.
- **Code Quality Validation** workflow: task 3 covers typecheck and lint/format; no test suite step since the changed file has no test file (per the exception in that principle) — compliant.
