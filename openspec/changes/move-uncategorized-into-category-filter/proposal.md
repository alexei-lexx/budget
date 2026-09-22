## Why

The Trends and Transactions filter panels both let users filter by category and by "Uncategorized". Today those are two separate controls: a category dropdown, plus a standalone "Include uncategorized" checkbox next to or under it. Uncategorized is really just another category choice, so splitting it out is unnecessary. On Trends it costs a full stacked row on phones. On Transactions it adds height to the category cell for no benefit. Folding "Uncategorized" into the category dropdown, as its first item with a divider, removes that separate control on both pages.

## What Changes

- `CategoryMultiSelect` (shared component) gains a second v-model, `include-uncategorized`. It renders "Uncategorized" as the first selectable item in the dropdown, separated from real categories by a divider, with its own checkbox and closable chip, matching how real category items already render.
- `TrendFilters`: the standalone "Include uncategorized" checkbox is removed. Categories and Currency now share row 1 (6/6 split); Period and Lookback move up from row 3 to row 2, keeping their existing 5/7 split. On phones, both rows still stack full-width.
- `TransactionFilterBar`: the standalone "Include uncategorized" checkbox under the Categories dropdown is removed. The dropdown cell keeps its existing column width; it just gets shorter.
- The `includeUncategorized`/`Include uncategorized` checkbox labels (`trends.filters.includeUncategorized`, `transactions.filterBar.includeUncategorized`) are removed from `en.json`; a new shared label for the dropdown item is added.
- No change to `TrendSelection`, `TransactionFilterSelection`, URL query params, localStorage schema, or GraphQL. `categoryIds` and `includeUncategorized` stay separate fields end to end in both types (`TrendSelection.includeUncategorized` is `true | undefined`; `TransactionFilterSelection.includeUncategorized` is `boolean`) — only the dropdown's internal rendering merges them for display, using whatever boolean the caller's existing draft state already normalizes them to.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trends`: the "Trend Filter Panel Layout" requirement changes. It currently pins the checkbox's row and breakpoint behavior; the checkbox no longer exists, and Categories/Currency now share row 1.

## Impact

- `frontend/src/components/common/CategoryMultiSelect.vue` (shared: also used by Transactions)
- `frontend/src/components/reports/TrendFilters.vue`
- `frontend/src/components/transactions/TransactionFilterBar.vue`
- `frontend/src/locales/en.json`
- No backend, GraphQL, or persisted-data changes.

## Constitution Compliance

- **Frontend Code Discipline** (framework components, minimal custom CSS): the divider and dropdown item use Vuetify's own `v-select`/`v-list` primitives (a raw `{ type: 'divider' }` item), no custom CSS. Compliant.
- **UI Guidelines** (mobile-first, responsive): below `sm`, all rows still stack full-width (unchanged). At `sm`-and-up, only row 1 changes — Categories moves from a lone full-width column to a 6/6 split with Currency; row 2 (Period/Lookback, 5/7) is unchanged, just shifted up from row 3. Compliant.
- **Test Strategy** (frontend: manual testing, component tests only for complex/critical components): `CategoryMultiSelect` becomes shared, dual-purpose logic (merging/splitting the uncategorized sentinel) and is used on two pages, which raises its complexity enough to warrant a component test; this will be decided in `design.md`. Manual verification is required either way.
- **Schema-Driven Development**: no GraphQL schema change. Not applicable.
