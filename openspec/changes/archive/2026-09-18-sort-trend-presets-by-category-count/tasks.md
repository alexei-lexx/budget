## Code Style

Apply `docs/code-style.md` throughout implementation.

## 1. Tests

- [x] 1.1 (use `testing` skill) In `frontend/src/components/reports/TrendPresetsList.test.ts`, add a test asserting a 3-category preset sorts before a 2-category preset even when the 2-category preset's label is alphabetically earlier.
- [x] 1.2 (use `testing` skill) Add a test asserting the "all" preset still sorts before any categorized preset regardless of category count differences among the categorized presets.
- [x] 1.3 (use `testing` skill) Add a test asserting two presets with the same category count still fall back to existing alphabetical-label, then period, then lookback, then currency ordering.

## 2. Implementation

- [x] 2.1 In `frontend/src/components/reports/TrendPresetsList.vue`, update the `sortedTrendPresets` comparator to compare `categoryIds.length` (descending) between the existing "all" handling and the category-label comparison.
- [x] 2.2 Update the comment above the comparator to document the new category-count ordering step.

## 3. Verification

- [x] 3.1 Run `npm test -- TrendPresetsList.test.ts` in `frontend/` and confirm all tests pass.
- [x] 3.2 Run `npm test` in `frontend/` to confirm no regressions.
- [x] 3.3 Run `npm run typecheck` and `npm run format` in `frontend/` and resolve any issues.

## Constitution Compliance

- **Frontend Code Discipline**: No custom CSS or new components introduced; change is confined to the existing comparator.
- **Test Strategy**: Adds unit test scenarios to the existing `TrendPresetsList.test.ts` file, consistent with this component's established test coverage.
- No backend, schema, data-layer, or authentication principles apply — this change is frontend-only.
