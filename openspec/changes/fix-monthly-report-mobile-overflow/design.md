## Context

`CategoryBreakdownTable.vue` renders a `v-table` (Vuetify's `<table>` wrapper) to display the category breakdown. When a category is expanded, a `<tr>` with `<td colspan="3">` is inserted containing a list of `TransactionCard` components.

The root cause of the overflow is a combination of two HTML table behaviours:

1. `table-layout: auto` (the default) sizes columns based on content — so the table can grow wider than its container when the injected `TransactionCard` content is wider than the available viewport.
2. Vuetify's `v-table__wrapper` uses `overflow-x: auto`, which allows the table to scroll/overflow rather than constraining it.

`TransactionCard` works correctly elsewhere (transactions page) because it is rendered in a normal block/flex context where its parent width is naturally constrained by the viewport.

**Why `overflow: hidden` alone is insufficient:**
`TransactionCard` uses a flex row with `flex-shrink-0` on the amount and `text-truncate` on the text. For this to work the flex container must be sized to the _actual available_ width. If only visual clipping is applied (e.g. `overflow: hidden` on the card), the `<td>` still lays out at its unconstrained width — the amount ends up positioned beyond the card's right edge and gets clipped off, not shown.

## Goals / Non-Goals

**Goals:**

- The expanded transaction list in `CategoryBreakdownTable` must not overflow its parent card on any screen size
- The transaction card amount must always remain fully visible — text truncates, amount does not
- Fix must be localised to `CategoryBreakdownTable.vue` — no changes to `TransactionCard` or any other component

**Non-Goals:**

- Changing the visual design or font sizes of `TransactionCard`
- Adding horizontal scroll to the table (that would just move the problem)
- Affecting the layout on large screens (fix must be invisible at desktop widths)

## Decisions

### Decision: `table-layout: fixed; width: 100%` on the `v-table`

Force the `<table>` to be exactly as wide as its container by setting `table-layout: fixed` and `width: 100%` via a scoped deep style on the `v-table` in `CategoryBreakdownTable.vue`.

With `table-layout: fixed` the browser assigns the table a width equal to its container and distributes column widths from the first row. The `<td colspan="3">` in the expanded row then has a real constrained width. The `TransactionCard` flex layout runs at that width — `flex-shrink-0` keeps the amount fully visible, `text-truncate` truncates the date/account/category text on the left.

**Alternatives considered:**

- **`overflow: hidden` on the wrapping `v-card`** — Only clips visually. The `<td>` still lays out at unconstrained width, so `flex-shrink-0` positions the amount beyond the clip boundary. Amount gets cut off. Rejected.
- **`overflow-x: hidden` on `v-table__wrapper`** — Same problem: clipping does not constrain the flex layout's reference width.
- **Moving transaction list outside the `<table>` element** — Structurally the cleanest (block content doesn't belong in a table row), but a larger refactor with higher regression risk. Not warranted for this fix.

## Risks / Trade-offs

- `table-layout: fixed` changes how the browser distributes the three column widths. With `auto` layout, columns size to their content; with `fixed`, widths are proportional to the first row's cells. In practice the category name column will be slightly narrower on desktop. This is visually acceptable and invisible on mobile.
- No risk of clipping floating elements (`v-tooltip`, `v-menu`) since no `overflow` property is changed on the card.
