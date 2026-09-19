## Context

Two files currently render near-identical category `v-select` markup independently: `frontend/src/components/transactions/TransactionFilterBar.vue` and `frontend/src/components/reports/TrendFilters.vue`. See `proposal.md` - Why/What Changes for the specific deltas being closed.

Existing component conventions:

- `frontend/src/components/common/AccountSelect.vue` is a single-select, self-fetching form component (used for choosing one account on a transaction). Its shape does not fit here.
- `frontend/src/components/categories/` already holds category-domain components (`CategoryCard.vue`, `CategoryForm.vue`, `CategoryDeleteDialog.vue`).

## Goals / Non-Goals

**Goals:**

- One component renders the category multi-select markup for both filter bars
- Preserve each page's existing v-model target (a composable ref on Transactions, local draft state on Trends) without forcing either to change its state management

**Non-Goals:**

- Changing filter panel layout on either page (explicitly out of scope per proposal.md)
- Extracting the "Include uncategorized" checkbox or the account/date/type filters into shared components
- Self-fetching categories inside the new component (both pages already fetch and filter categories differently - Trends excludes `excludeFromReports` categories, Transactions does not)

## Decisions

**Component name: `CategoryMultiSelect.vue`, not `CategorySelect.vue`**
`CategorySelect` would read as the multi-select analog of `AccountSelect`, which is single-select. Naming it `CategoryMultiSelect` makes the multi-select shape explicit and avoids confusion if a single-select category picker is ever needed later.

**Location: `frontend/src/components/common/CategoryMultiSelect.vue`**
`components/categories/` holds components used within the categories domain's own views (`CategoryCard.vue`, `CategoryForm.vue`, `CategoryDeleteDialog.vue` are all consumed by `Categories.vue`). `CategoryMultiSelect.vue` is never used there — it's a cross-domain filter input consumed by `transactions/` and `reports/` (Trends), the same shape as `AccountSelect.vue`: account-typed but placed in `components/common/` because it's only ever consumed by `transactions/` and `transfers/`, never by an accounts-domain view. `CategoryMultiSelect.vue` follows that precedent rather than the categories domain folder.

**Props: `modelValue: string[]`, `categories: Category[]`, `label: string`, `disabled?: boolean`**

- `modelValue`/`update:modelValue` (array of category IDs) works identically whether the caller's underlying state is a composable ref or local draft state - the component doesn't need to know which.
- `categories` stays a prop, not internally fetched: category filtering rules differ per caller (Trends excludes `excludeFromReports` categories; Transactions does not), so filtering stays the responsibility of each page's own computed property.
- `label` stays a prop so each page keeps its own i18n key.

**Always render `clearable` and the per-item type icon**
Both call sites want both after this change (per proposal.md), so neither needs to be a toggleable prop. This keeps the component's interface minimal.

**Checkbox and layout stay in each page's template**
"Include uncategorized" placement and column widths differ per page (Transactions: checkbox directly under the select, same column; Trends: checkbox in its own row next to currency, per the existing `Trend Filter Panel Layout` requirement in `openspec/specs/trends/spec.md`). Moving the checkbox into the shared component would force one page's layout onto the other, which is explicitly out of scope.

**New i18n key for the Transactions "Types" filter label, instead of reusing `transactions.form.type`**
`transactions.form.type` also labels a single transaction's type on `TransactionForm.vue`, where singular is correct. Pluralizing that key would incorrectly change the form label too. A new key (e.g. `transactions.filterBar.types`) keeps the two labels independent.

## Risks / Trade-offs

- **Prop drift between the two call sites** → Mitigated by keeping the component's surface area small (4 props) and documenting each prop's purpose in the component itself; any future divergence should be a new prop, not a fork of the component.
- **The per-item icon is always the expense icon/color on Trends** (Trends only offers expense categories) → Accepted per proposal.md; not a defect, just a consequence of Trends' existing category scope. No mitigation needed.

## Constitution Compliance

- **Frontend Code Discipline** (prefer framework components, minimize custom code): the component is a thin wrapper composing `v-select`/`v-list-item`/`v-icon`, no custom CSS or non-framework UI. Compliant.
- **Test Strategy** (frontend: manual verification; component tests only for complex/critical components): not complex/critical, manual verification in dev is sufficient. Compliant.
- No other constitution principle applies to this design.
