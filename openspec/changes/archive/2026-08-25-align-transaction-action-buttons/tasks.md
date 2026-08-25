## 1. Align header button breakpoint

- [x] 1.1 In `frontend/src/views/Transactions.vue`, change the Filter button's responsive classes from `d-none d-md-flex` / `d-flex d-md-none` to `d-none d-sm-flex` / `d-flex d-sm-none`, matching Accounts and Categories.
- [x] 1.2 Change the Add Transaction button's responsive classes from `d-none d-md-flex` / `d-flex d-md-none` to `d-none d-sm-flex` / `d-flex d-sm-none`.
- [x] 1.3 Change the Add Transfer button's responsive classes from `d-none d-md-flex` / `d-flex d-md-none` to `d-none d-sm-flex` / `d-flex d-sm-none`.
- [x] 1.4 Update the two inline comments above the button pairs (currently referencing the 960px/`md` breakpoint) to describe the new 600px/`sm` breakpoint.

## 2. Wrap the button row instead of overflowing

- [x] 2.1 Add a wrap utility (e.g. `flex-wrap`) and an appropriate row/column gap to the header's button-group container (the `d-flex align-center` div holding Filter, Add Transaction, and Add Transfer) so the three buttons wrap onto a second line when they don't fit on one.

## 3. Verify

- [x] 3.1 (use `testing` skill) Run the frontend test suite (`npm test` in `frontend/`) to confirm no regressions; no new automated test is added for this change per the constitution's frontend test strategy (manual visual verification; UI tests only for complex/critical components).
- [x] 3.2 Run `npm run typecheck` and `npm run format` (lint) in `frontend/` and fix any issues.
- [x] 3.3 Visually verify the Transactions page header at 600px, ~768px, ~900px, and 960px+ widths: buttons are labeled (not icon-only) from 600px up, and the row wraps cleanly with no overflow or hidden button at any width in that range.
- [x] 3.4 Visually confirm Accounts and Categories page headers are unchanged.

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive across screen sizes): Applies. Tasks 1 and 2 keep every button visible and labeled consistently with the rest of the app across screen sizes. Compliant.
- **Frontend Code Discipline** (prefer framework components/styles, minimize custom CSS): Applies. All tasks use existing Vuetify utility classes only; no custom CSS is introduced. Compliant.
- **Test Strategy** (frontend: manual visual verification, UI tests only for complex/critical components): Applies. Task 3.1 runs the existing suite for regressions; no new automated test is written since this is a simple, non-critical layout change. Compliant.
- **Code Quality Validation** (test, typecheck, lint pipeline before completion): Applies. Tasks 3.1-3.2 cover this pipeline. Compliant.
