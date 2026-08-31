## 1. Fix matching logic

- [x] 1.1 (use `testing` skill) Write a failing unit test for `matchingTrendPreset` in `frontend/src/composables/useTrendPresets.ts`: a preset with `includeUncategorized: null` (as returned by GraphQL when unset) must match a selection with `includeUncategorized: undefined`.
- [x] 1.2 Fix `matchingTrendPreset` to compare `includeUncategorized` by truthiness (or another null/undefined/false-safe comparison) instead of strict equality.
- [x] 1.3 Run `npm test -- useTrendPresets` in `frontend/` and confirm the new test passes and no existing test regresses.

## 2. Manual verification

- [x] 2.1 On the Trends page, apply a configuration without "include uncategorized" checked, click the star, and confirm the star button shows filled/starred immediately.
- [x] 2.2 Click a starred entry in the presets list that has no "include uncategorized" set and confirm the star button in the filters panel shows starred.
- [x] 2.3 Click the star again on a starred configuration and confirm it unstars (removes the preset and the button returns to outlined).

## 3. Validation

- [x] 3.1 Run `npm run typecheck` and `npm run format` in `frontend/`; fix any issues.

## Constitution Compliance

- **Test Strategy**: frontend tests are optional per the constitution; this task list adds one focused unit test for `useTrendPresets` because the fix is a pure comparison function, cheap to test, and directly guards against regressing this bug.
- **TypeScript Code Generation**: fix stays within strict typing; no `any`/non-null assertions.
- **Code Quality Validation**: tasks 1.3 and 3.1 follow the mandated test → typecheck/lint pipeline before completion.

No other constitution principles apply — this is a frontend-only comparison fix with no schema, backend, or architectural impact.
