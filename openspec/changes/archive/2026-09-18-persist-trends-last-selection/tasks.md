## Code Style

Follow `docs/code-style.md`.

## 1. Persistence helper

- [x] 1.1 (use `testing` skill) Write tests for a `trendSelectionStorage` helper (e.g. `frontend/src/lib/trendSelectionStorage.ts`) covering: reading back a previously written selection, returning nothing when no value is stored, returning nothing when the stored value is unparsable/malformed, and falling back field-by-field (period unit, lookback) when a stored field is out of range, mirroring the existing URL-parameter fallback behavior in `Trends.vue`
- [x] 1.2 Implement `trendSelectionStorage` using `frontend/src/lib/appStorage.ts` (one `budget:`-prefixed key, JSON-encoded `TrendSelection`), with a `read()` that validates/falls back per field and a `write(selection)` that stores the full selection
- [x] 1.3 Run the new tests and confirm they pass

## 2. Wire persistence into the Trends page

- [x] 2.1 In `frontend/src/views/Trends.vue`, when `route.query` carries no applied-selection parameters at all, seed `appliedSelection` from `trendSelectionStorage.read()` instead of the hardcoded defaults, then sync the resulting selection into the URL via the existing `router.replace` pattern used in `handleApply`
- [x] 2.2 Call `trendSelectionStorage.write(newSelection)` inside `handleApply`
- [x] 2.3 Call `trendSelectionStorage.write(...)` inside `handleClear` with the reset-to-defaults selection

## 3. Manual verification

- [x] 3.1 Apply a manual selection on Trends, navigate to another page via in-app navigation, return to Trends, and confirm the same selection loads and the chart matches
- [x] 3.2 Apply a starred preset on Trends, navigate away and back, and confirm the preset's selection loads
- [x] 3.3 Clear the selection, navigate away and back, and confirm the defaults load (not the previously remembered selection)
- [x] 3.4 Open a bookmarked Trends URL with an explicit selection while a different selection is remembered, and confirm the URL's selection wins
- [x] 3.5 Reload the Trends page directly (full page refresh) after applying a selection, and confirm the selection survives the reload
- [x] 3.6 Sign out and back in, and confirm the remembered selection was cleared along with other user-scoped local data

## 4. Quality gate

- [x] 4.1 Run `npm run typecheck` in `frontend/`
- [x] 4.2 Run `npm run format` in `frontend/` and resolve any lint issues
- [x] 4.3 Run `npm test` in `frontend/` and confirm no regressions

## Constitution Compliance

- **Test Strategy**: frontend is tested manually; the new persistence helper is small, pure, and self-contained, so it gets unit tests per the `testing` skill, while the page-level wiring is verified manually per Section 3.
- **Frontend Code Discipline**: reuses `appStorage.ts` rather than adding a new storage utility or a state library.
- **Code Quality Validation**: Section 4 runs the mandatory typecheck/lint/test pipeline before considering the change complete.

Compliant, no violations.
