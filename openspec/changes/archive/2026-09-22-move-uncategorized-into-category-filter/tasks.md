## Code Style

Follow `docs/code-style.md` for all changes in this task list.

## 1. CategoryMultiSelect: dual v-model and Uncategorized item

- [x] 1.1 (use `testing` skill) Write `frontend/src/components/common/CategoryMultiSelect.test.ts`: Uncategorized renders as the first item followed by a divider, before the real categories; toggling Uncategorized updates `include-uncategorized` without changing `category-ids`; selecting a real category updates `category-ids` without changing `include-uncategorized`. Expect these to fail until task 1.6.
- [x] 1.2 Replace the single `modelValue` prop with two `defineModel`s: `categoryIds: string[]` and `includeUncategorized: boolean`.
- [x] 1.3 Add an internal sentinel constant and a computed getter/setter that merges the two models into the single array `v-select` needs, and splits it back into both model updates on change. Prepend the sentinel so Uncategorized always sorts first.
- [x] 1.4 Prepend a `{ type: 'divider' }` item to the `items` list (after the sentinel item) and add a `#divider` template (`<v-divider />`) alongside the existing `#item` template.
- [x] 1.5 In the `#item` template, branch on the sentinel: render the checkbox-btn as usual, but skip the append icon (`getCategoryIcon`/`getCategoryIconColor` are typed for `CategoryType`, which the sentinel doesn't have).
- [x] 1.6 Import `useI18n` and use it for the sentinel item's label and chip text (see task 2.1 for the key).
- [x] 1.7 Run the test from 1.1 and fix implementation until it's green.

## 2. i18n

- [x] 2.1 Add `common.uncategorized` to `frontend/src/locales/en.json` and `frontend/src/locales/de.json`.
- [x] 2.2 Remove `trends.filters.includeUncategorized` and `transactions.filterBar.includeUncategorized` from both `en.json` and `de.json`. Leave `trends.presets.uncategorized` untouched (unrelated key, still used by `TrendPresetsList.vue`).

## 3. TrendFilters

- [x] 3.1 Remove the standalone "Include uncategorized" `v-checkbox` and its `v-col`.
- [x] 3.2 Bind `CategoryMultiSelect`'s `v-model:category-ids` and `v-model:include-uncategorized` to the existing `draftCategoryIds`/`draftIncludeUncategorized` refs.
- [x] 3.3 Move the Currency filter's `v-col` into the same row as Categories; both `cols="12" sm="6"`.

## 4. TransactionFilterBar

- [x] 4.1 Remove the standalone "Include uncategorized" `v-checkbox` from the Category Filter cell.
- [x] 4.2 Bind `CategoryMultiSelect`'s `v-model:category-ids` and `v-model:include-uncategorized` to `current.categoryIds`/`current.includeUncategorized`.

## 5. Verification

- [x] 5.1 Manually verify the Trends page: Uncategorized appears first in the Categories dropdown, divided from categories; Categories and Currency share a row at ≥600px width and stack below it; Period and Lookback are unaffected.
- [x] 5.2 Manually verify the Transactions page: Uncategorized appears first in the Categories dropdown, divided from categories; the Category Filter cell is shorter with the checkbox gone.
- [x] 5.3 Run the full frontend test suite (`npm test` from `frontend/`).
- [x] 5.4 Run `npm run typecheck` and `npm run format` from `frontend/`; fix any issues.

## Constitution Compliance

- **Code Quality Validation** (test changed file → full suite → typecheck/lint, in order): tasks 1.1/1.7 test the changed component first, 5.3 runs the full suite, 5.4 runs typecheck/lint last. Compliant.
- **Test Strategy** (frontend: manual verification; component tests only for complex/critical components): task 1.1 adds a component test for `CategoryMultiSelect`'s new merge/split logic (justified in `design.md`); tasks 5.1-5.2 cover manual verification of both pages. Compliant.
- **Test File Location** (co-located, `[source-file].test.ts` next to the source): `CategoryMultiSelect.test.ts` sits next to `CategoryMultiSelect.vue` in `frontend/src/components/common/`. Compliant.
- **Frontend Code Discipline** (framework components, minimal custom CSS): no new CSS in this task list; divider/item rendering uses Vuetify's own mechanisms. Compliant.
