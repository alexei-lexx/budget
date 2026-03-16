## Why

The transaction filter panel occupies a persistent row of vertical space on the Transactions page even when no filters are in use, which is the common case. Converting it to a button in the existing action bar reclaims this space and aligns filter access with the page's primary actions.

## What Changes

- The always-visible `TransactionFilterBar` card (with its clickable header) is removed from the page layout.
- A **Filter** button is added to the Transactions page header action bar, positioned before "Add Transaction" and "Add Transfer".
- The Filter button follows the existing responsive pattern: text + icon on desktop, icon-only on mobile.
- Clicking the Filter button toggles the filter panel open or closed (inline expansion below the header).
- When filters are currently applied, the Filter button displays a dot badge to indicate active filtering.
- Apply and Clear button behaviour is unchanged.
- Closing the panel does not auto-apply filters; explicit Apply is still required.

## Capabilities

### New Capabilities

_None — this is a UI restructuring of an existing capability._

### Modified Capabilities

- `transactions`: The filter panel access mechanism changes from an always-visible collapsible card to a toggled button in the header action bar. The active-filter indicator (dot badge) is a new visual requirement.

## Impact

- `frontend/src/views/Transactions.vue` — adds Filter button to header, owns `showFilter` toggle ref, passes it to `TransactionFilterBar`.
- `frontend/src/components/transactions/TransactionFilterBar.vue` — removes card wrapper and clickable header; becomes a pure panel component controlled by a prop.
- No backend changes. No GraphQL changes. No composable API changes.

## Constitution Compliance

- **Vue 3 + Vuetify**: Changes are confined to Vue SFCs using Vuetify components (`v-btn`, `v-badge`, `v-expand-transition`). Compliant.
- **TypeScript strict mode**: No new TS logic introduced; existing composable types unchanged. Compliant.
- **Mobile-first / PWA**: Responsive dual-button pattern (text on desktop, icon on mobile) is preserved. Compliant.
- **No backend impact**: Pure frontend UI change. Compliant.
