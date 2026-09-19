## Why

On the Trends page, the Categories filter and Currency filter sit in a two-column split (each half width) once the viewport reaches Vuetify's `md` breakpoint (960px), with the "Include uncategorized" checkbox stacked under Categories. Below that breakpoint, Categories, the checkbox, and Currency each stack in their own full-width row. Currency values are short (three-letter codes), so a full-width row for Currency wastes space. The checkbox row has room to spare and can hold Currency as its right column instead.

## What Changes

- Restructure the Trends filter panel in `TrendFilters.vue` into two rows:
  - Row 1: Categories filter, full width.
  - Row 2: the "Include uncategorized" checkbox and the Currency filter.
- Below the `sm` breakpoint (600px, mobile), row 2's checkbox and Currency filter continue to stack, each full width, same as today.
- At the `sm` breakpoint and above (600px+, tablet and desktop), row 2's checkbox and Currency filter sit side by side. This replaces the current `md`-breakpoint (960px) Categories/Currency two-column split.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `trends`: the Trends filter panel's layout changes. Categories always spans its own full-width row. The Include-uncategorized checkbox and Currency filter move into a second row, stacking on mobile and sitting side by side from the `sm` breakpoint up.

## Impact

- `frontend/src/components/reports/TrendFilters.vue`: move the "Include uncategorized" checkbox out of the Categories column into a new row alongside the Currency filter; adjust `v-col` widths so Categories is always full width and the checkbox/Currency pair stacks below `sm` (600px) and sits side by side at `sm` and above. No changes to filter behavior, state, or data.

## Constitution Compliance

- **Frontend stack (Vue 3, Vuetify)**: change stays within Vuetify's grid/breakpoint system; no new dependencies.
- **Vendor independence**: not affected; purely a client-side layout change.
- **Schema-driven development**: not affected; no GraphQL schema or API change.
- No violations identified.
