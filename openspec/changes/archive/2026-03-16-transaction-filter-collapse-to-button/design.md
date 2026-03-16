## Context

The Transactions page currently renders a `TransactionFilterBar` component as a `v-card` below the page header. The card has a clickable header row ("Filter" + chevron) that expands/collapses the panel. Even when collapsed, the card header occupies a full row of vertical space on every page load — despite filters being unused in the common case.

The existing header area already has a responsive button group (Add Transaction, Add Transfer) that switches between text+icon and icon-only at the `md` breakpoint. The goal is to integrate a Filter toggle button into this group.

The `useTransactionFilters` composable exposes `hasAppliedFilters` (boolean computed) — exactly what is needed to drive the active-filter indicator without any new state.

## Goals / Non-Goals

**Goals:**

- Remove the always-visible filter card from the page layout.
- Add a Filter toggle button to the header action bar, positioned first (before Add Transaction / Add Transfer).
- Show a dot badge on the button when `hasAppliedFilters` is `true`.
- Follow the existing responsive pattern: text+icon on desktop, icon-only on mobile.
- Keep Apply / Clear logic and behaviour exactly as-is.
- Closing the panel does not auto-apply filters.

**Non-Goals:**

- Auto-applying on close.
- Changing filter logic or the composable API.
- Any backend or GraphQL changes.
- Adding a filter count (only a dot badge).

## Decisions

### Decision 1: Toggle state lives in `Transactions.vue`, not inside `TransactionFilterBar`

**Chosen:** `showFilter` ref in `Transactions.vue`, passed as a prop to `TransactionFilterBar`.

**Alternatives considered:**

- _Keep toggle inside `TransactionFilterBar`_: The button needs to live in the page header (a sibling of the filter panel, not inside it), so the parent must own the state. Keeping it inside the component would require emitting events up and passing a trigger slot — more complexity for no benefit.

**Rationale:** The button and the panel are in different parts of the template. Parent ownership is the natural Vue pattern.

---

### Decision 2: Filter panel rendered as inline `v-expand-transition` below the header

**Chosen:** `TransactionFilterBar` keeps its existing panel content wrapped in `v-expand-transition`, controlled via a `modelValue` / `v-model` boolean prop.

**Alternatives considered:**

- _Vuetify `v-menu` / popover_: Floats over content, positioning gets tricky on mobile, loses spatial relationship with the list.
- _Vuetify `v-navigation-drawer`_: Heavyweight, shifts page layout, better suited to site-wide navigation panels.
- _`v-dialog`_: Feels heavy for a filter panel; breaks the inline editing feel.

**Rationale:** An inline expand transition is the simplest approach, consistent with collapsible patterns already in the codebase (e.g., the existing `v-expand-transition` already in `TransactionFilterBar`).

---

### Decision 3: Active-filter indicator is a dot badge using `v-badge`

**Chosen:** Vuetify `v-badge` with `dot` prop, driven by `hasAppliedFilters`.

**Alternatives considered:**

- _Badge with count_: Requires deriving a count from `appliedFilters` fields; adds complexity for marginal clarity benefit.
- _Button color change (e.g., primary when active)_: Less discoverable; hard to distinguish from focus/hover states.

**Rationale:** A dot is the least intrusive indicator, clearly signals "something is active" without requiring interpretation of a number.

---

### Decision 4: `TransactionFilterBar` loses its card wrapper and header

**Chosen:** Remove the `v-card`, `.filter-header` div, and associated styles. The component becomes a plain panel (a `div` wrapping the existing grid + buttons), wrapped externally in `v-expand-transition` in `Transactions.vue`.

**Rationale:** The card chrome (border, background, header) is no longer needed — the panel now appears inline directly beneath the header action bar. Keeping it would add unnecessary visual weight. Moving the transition to the parent also makes control flow clearer.

## Risks / Trade-offs

- **Muscle memory**: Users accustomed to clicking the "Filter" card header will need to find the new button. Low risk — the card header was subtle; a prominent header button is more discoverable.
- **Mobile three-button row**: On mobile, the header now has three icon buttons (Filter, Add Transaction, Add Transfer). Layout should remain clean at small sizes given Vuetify's default button sizing, but worth verifying visually.

## Constitution Compliance

- **Vue 3 + Vuetify**: All changes use Vue 3 Composition API and Vuetify components (`v-btn`, `v-badge`, `v-expand-transition`). Compliant.
- **TypeScript strict mode**: The new `showFilter` ref is `ref<boolean>(false)` — no type issues. Compliant.
- **Mobile-first / PWA**: The responsive dual-button pattern (desktop text+icon, mobile icon-only) is explicitly preserved for the Filter button. Compliant.
- **No backend changes**: Pure UI refactor. Compliant.
