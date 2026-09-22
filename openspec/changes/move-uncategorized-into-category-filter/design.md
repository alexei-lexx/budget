## Context

See `proposal.md` - Why.

`CategoryMultiSelect.vue` is a thin wrapper around Vuetify's `v-select`: `modelValue: string[]` bound to category ids, with a custom `#item` slot rendering a checkbox-btn (prepend) and a category-type icon (append). It's used by `TrendFilters.vue` and `TransactionFilterBar.vue`, each pairing it with its own standalone `v-checkbox` for "Include uncategorized" and its own `includeUncategorized` field (`TrendSelection.includeUncategorized: true | undefined`; `TransactionFilterSelection.includeUncategorized: boolean`).

Both locale files, `frontend/src/locales/en.json` and `frontend/src/locales/de.json`, carry the same three keys at matching line numbers: `trends.filters.includeUncategorized`, `transactions.filterBar.includeUncategorized`, and `trends.presets.uncategorized` (the last one, used by `TrendPresetsList.vue` for preset labels, is unrelated and stays). `proposal.md`'s Impact section lists only `en.json`; `de.json` needs the same edits.

## Goals / Non-Goals

**Goals:**

- Give `CategoryMultiSelect` a second v-model for `includeUncategorized`, rendering it as the dropdown's first item, divided from real categories.
- Remove the standalone checkbox from both `TrendFilters` and `TransactionFilterBar`.

**Non-Goals:**

- No change to how `categoryIds`/`includeUncategorized` are typed, stored, or sent to GraphQL outside the component boundary (see proposal.md - What Changes).
- No visual redesign of the dropdown itself beyond the new first item and divider.

## Decisions

**Dual v-model, not a compound object or a null-in-array sentinel.** `CategoryMultiSelect` exposes `v-model:category-ids="string[]"` and `v-model:include-uncategorized="boolean"`, using two `defineModel` calls (the pattern `TransactionFilterBar.vue` already uses for its own top-level model). Alternatives considered and rejected:

- A single v-model carrying `{ categoryIds, includeUncategorized }`: callers would still hold two separate draft refs and just repack them into an object at the binding site — no less wiring, and it invents a shape nothing else in the codebase uses.
- `null` inside `categoryIds` as the uncategorized sentinel: the GraphQL schema declares `categoryIds: [ID!]` (non-null elements), so `null` could never reach the wire; it would have to be filtered out at the same call sites anyway, but now as a public, easy-to-forget convention instead of a private implementation detail.

**Sentinel value stays internal.** Inside the component, a private string constant (not `null`, not user-visible) represents the pseudo-item in the single array `v-select` needs for its own `modelValue`. A computed getter/setter merges the two model props into that array for `v-select`, and splits the array back into the two model updates on change. The sentinel never appears in any prop, emit, or the two model types — both stay `string[]` and `boolean`.

**Divider via Vuetify's native `{ type: 'divider' }` item, not custom slot logic.** Verified against the installed Vuetify version (`node_modules/vuetify/lib/composables/list-items.js`, `VSelect.js`): items are recognized as `type: 'item' | 'divider' | 'subheader'`; a `divider`-typed item bypasses the `#item` slot entirely and is dispatched to a `#divider` slot instead. Without an explicit `#divider` slot, Vuetify renders nothing for it - this is a real gotcha, not a hypothetical, so `CategoryMultiSelect` must add a `#divider` template (`<v-divider />`) alongside its existing `#item` template. The divider item itself is filtered out of `transformOut`'s selection value automatically (Vuetify's `useItems` only maps selected `type: 'item'` entries), so it can never be "selected" or become a chip.

**No icon for the Uncategorized item.** `getCategoryIcon`/`getCategoryIconColor` (from `@/utils/category.ts`) are typed to take a `CategoryType`, which the pseudo-item doesn't have. Rather than inventing a placeholder icon (e.g. `mdi-help-circle-outline`) that isn't asked for anywhere else in the app, the `#item` template branches: real categories keep their append icon, the Uncategorized item renders none. Simplest option, no new iconography decision to defend.

**New shared i18n key, not a prop.** `CategoryMultiSelect` imports `useI18n` itself and uses a new key, `common.uncategorized`, for the pseudo-item's label and its chip text - both call sites want the same word, so there's no reason to thread it through as a prop. `trends.filters.includeUncategorized` and `transactions.filterBar.includeUncategorized` are deleted from both `en.json` and `de.json` (orphaned once both checkboxes are gone). `trends.presets.uncategorized` (lowercase, used in preset chip text elsewhere) is untouched - different key, different consumer.

**Trends row grid.** `TrendFilters.vue`: Categories and Currency move into one `v-row`'s first two `v-col`s (`cols="12" sm="6"` each, per the earlier 6/6 decision). Period and Lookback keep their existing `v-col`s and `v-row`, unchanged in markup - removing the checkbox's `v-col` upstream is what shifts them from visual row 3 to row 2, not an edit to their own cols.

**Component test: yes.** `proposal.md` flagged this as undecided. Resolving now: `CategoryMultiSelect` becomes a shared component with real merge/split logic (not just a passthrough) used by two pages, which crosses the constitution's bar for "complex/critical" (Test Strategy: frontend tests are manual by default, component tests only for complex/critical components). Add `frontend/src/components/common/CategoryMultiSelect.test.ts` covering: Uncategorized renders first with a divider before real categories; toggling it updates `include-uncategorized` without touching `category-ids`; selecting a real category updates `category-ids` without touching `include-uncategorized`. This is a task-breakdown decision, so it's resolved here rather than left open.

## Risks / Trade-offs

- [Forgetting the `#divider` slot silently renders no divider, not an error] → Covered by the component test asserting the divider is present in the rendered item list.
- [`CategoryMultiSelect` is shared; `TransactionFilterBar`'s v-model binding was the subject of two recent fix commits (#645, #646)] → Manual verification on both Trends and Transactions pages after the change, per the constitution's manual frontend testing strategy; the new component test also exercises the exact logic those commits were fixing (correct event/model wiring).
- [Chip order: the merged array must always put the Uncategorized sentinel first for the item to render first] → The merge computed controls insertion order explicitly (sentinel prepended, not appended), independent of whatever order the two model props are in.

## Migration Plan

Frontend-only change: no data migration, no GraphQL schema change, no backend deploy. Ships as a normal frontend release; rollback is a normal revert of the frontend build.

## Constitution Compliance

- **Frontend Code Discipline** (framework components, minimal custom CSS): divider and item rendering both use Vuetify's own `v-select`/`v-list` item-type mechanism; no custom CSS added. Compliant.
- **Test Strategy** (manual testing; component tests only for complex/critical components): resolved above - `CategoryMultiSelect`'s new merge/split logic, shared across two pages, warrants a component test; both pages are still manually verified. Compliant.
- **Frontend Code Discipline / Vue conventions**: dual v-model via `defineModel` matches the existing pattern in `TransactionFilterBar.vue`. Compliant.
