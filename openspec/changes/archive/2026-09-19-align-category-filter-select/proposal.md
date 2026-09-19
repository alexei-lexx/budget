## Why

The Transactions and Trends filter panels each have their own category `v-select`. They drifted apart: the Transactions version has a `clearable` icon and a per-item type icon, the Trends version has neither, and their labels use inconsistent grammar ("Category" vs "Categories") for the same multi-select field. This makes the app feel inconsistent and leaves near-duplicate markup in both filter bars.

## What Changes

- Extract a shared `CategoryMultiSelect.vue` component (multi-select, chips, clearable, per-item type icon) used by both the Transactions and Trends category filters
- Add a `clearable` icon to the Trends category filter (parity with Transactions)
- Add a per-item type icon to the Trends category filter (parity with Transactions); the icon always renders as the expense icon/color today since Trends only offers expense categories
- Fix filter labels for multi-select fields to use plural grammar consistently:
  - Transactions: "Account" → "Accounts", "Category" → "Categories"
  - Transactions "Type" filter keeps its own label change to "Types" via a new, filter-specific i18n key (the existing `transactions.form.type` key stays "Type" since it also labels a single transaction's type on the transaction form)
- No change to filter panel layout (checkbox/currency placement, column widths) on either page

## Capabilities

This is a UI consistency refactor: it reuses existing filtering behavior through a shared component and adjusts field labels and per-field affordances (clear icon, item icon). It does not change what users can filter by, how filters combine, or any documented requirement in `transactions` or `trends`. No spec-level behavior changes.

`skip_specs: true` is set in `.openspec.yaml`.

## Impact

- `frontend/src/components/common/CategoryMultiSelect.vue` (new)
- `frontend/src/components/transactions/TransactionFilterBar.vue` (use shared component, label keys)
- `frontend/src/components/reports/TrendFilters.vue` (use shared component)
- `frontend/src/locales/en.json`, `frontend/src/locales/de.json` (label keys)

## Constitution Compliance

- **Frontend Code Discipline** (prefer framework components, minimize custom code): extracting the shared component reduces duplicated Vuetify markup rather than adding custom implementation. Compliant.
- **Test Strategy** (frontend: manual verification; component tests only for complex/critical components): this component is a thin wrapper around `v-select`, not complex/critical, so manual verification in dev is sufficient. Compliant.
- **Schema-Driven Development**: not applicable, no GraphQL schema changes.
- No other constitution principle applies to this change.
