## Code Style

Apply `docs/code-style.md` while implementing these tasks.

## 1. Shared Component

- [x] 1.1 Create `frontend/src/components/common/CategoryMultiSelect.vue` with props `modelValue: string[]`, `categories: Category[]`, `label: string`, `disabled?: boolean` and `update:modelValue` emit. Move the `v-select` markup (`multiple`, `chips`, `closable-chips`, `clearable`, `variant="outlined"`, `density="compact"`, `item-title="name"`, `item-value="id"`) and the per-item type icon slot (using `getCategoryIcon`/`getCategoryIconColor` from `@/utils/category`) out of `TransactionFilterBar.vue` and into the new component

## 2. Wire Into Transactions

- [x] 2.1 Replace the category `v-select` block in `TransactionFilterBar.vue` with `<CategoryMultiSelect>` bound to `filters.selectedCategoryIds.value`
- [x] 2.2 Add `transactions.filterBar.accounts` ("Accounts"), `transactions.filterBar.categories` ("Categories"), and `transactions.filterBar.types` ("Types") keys to `frontend/src/locales/en.json` and `frontend/src/locales/de.json`; point the Account, Category, and Type filter labels in `TransactionFilterBar.vue` at the new keys (the Type filter uses its own new key, not `transactions.form.type`, which stays "Type" for the transaction form)
- [x] 2.3 Remove the `getCategoryIconColor`/`getCategoryIcon` import and the now-unreferenced `categoryOptions` computed from `TransactionFilterBar.vue` if nothing else in the file uses them

## 3. Wire Into Trends

- [x] 3.1 Replace the category `v-select` block in `TrendFilters.vue` with `<CategoryMultiSelect>` bound to `draftCategoryIds`, passing the existing `categoryOptions` computed (already filters out `excludeFromReports` categories) and the existing `trends.filters.categories` label

## 4. Verify

- [x] 4.1 Manually verify in the browser: Transactions category filter still filters transactions correctly, chips render, the clearable icon clears the selection, and per-item icons still show; Trends category filter now also shows a clearable icon and per-item icons; Transactions' Account/Category/Type filter labels read "Accounts"/"Categories"/"Types"; the transaction form's "Type" label is unchanged
- [x] 4.2 Run `npm run typecheck` and `npm run format` in `frontend/` and fix any issues

## Constitution Compliance

- **Frontend Code Discipline** (prefer framework components, minimize custom code): tasks only move existing `v-select`/`v-list-item`/`v-icon` markup into a shared component, no custom implementation added. Compliant.
- **Test Strategy** (frontend: manual verification; component tests only for complex/critical components): neither `TransactionFilterBar.vue` nor `TrendFilters.vue` has an existing test file, and `CategoryMultiSelect.vue` is a thin, non-critical wrapper, so task 4.1 covers verification manually instead of adding automated tests. Compliant.
- **Code Quality Validation** (typecheck/lint before completion): covered by task 4.2.
- No other constitution principle applies to these tasks.
