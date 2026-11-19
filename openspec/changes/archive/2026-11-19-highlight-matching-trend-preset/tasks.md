# Tasks

## 1. Selected Marking in the Starred Trends List

- [x] 1.1 In `frontend/src/composables/useTrendPresets.test.ts`, add a `matchingTrendPresets` describe block with tests that fail first: no match, one match, two identical presets both returned, and categories in a different order; verify with `npm test -- src/composables/useTrendPresets.test.ts` in `frontend/` that the new tests fail
- [x] 1.2 In `frontend/src/composables/useTrendPresets.ts`, extract the equality check that `matchingTrendPreset` uses, add `matchingTrendPresets` on top of it, and return it; verify that the tests from 1.1 and the existing `matchingTrendPreset` tests pass
- [x] 1.3 In `frontend/src/components/reports/TrendPresetsList.test.ts`, add tests that fail first: the chips whose preset IDs are in `selectedTrendPresetIds` have `aria-current="true"` and the outlined primary style, two identical entries are both marked, the other chips are not marked, and no chip is marked when `selectedTrendPresetIds` is empty; verify with `npm test -- src/components/reports/TrendPresetsList.test.ts` in `frontend/` that the new tests fail
- [x] 1.4 In `frontend/src/components/reports/TrendPresetsList.vue`, add the optional `selectedTrendPresetIds: string[]` prop and bind `color` and `aria-current` on each chip; verify that the tests from 1.3 pass
- [x] 1.5 In `frontend/src/views/Trends.vue`, get `matchingTrendPresets` from `useTrendPresets()`, compute `selectedTrendPresetIds` from `selection`, and pass it to `TrendPresetsList`; verify with `npm run typecheck` in `frontend/`

## 2. Validation

- [x] 2.1 Run `npm test`, `npm run typecheck`, and `npm run format` in `frontend/`, and verify that all pass with no ESLint issues
- [x] 2.2 In the running app, open the Trends page and verify the spec scenarios: a click on an entry marks it, an applied match marks the entry, an unapplied change keeps the marking, a new star marks the new entry, and the selected chip has readable contrast

## Constitution Compliance

- **Test Strategy**: the composable and component tests are co-located with their source files and are written before the implementation
- **Frontend Code Discipline**: the marking uses Vuetify chip props only
- **Code Quality Validation**: group 2 runs the changed test file, the full suite, typecheck, and format in the required order
- **Violations**: none
