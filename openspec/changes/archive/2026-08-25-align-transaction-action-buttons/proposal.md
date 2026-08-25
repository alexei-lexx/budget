## Why

The Transactions page switches its header buttons from icon-only to labeled text at a wider viewport (960px) than every other page (600px). Since page titles moved into the app bar, each page header is now just an action-button row, and the mismatch is now the only visible difference in an otherwise identical pattern. On tablet-width screens (600-960px), Transactions shows icon-only circular buttons while Accounts and Categories show labeled buttons, making Transactions look like a different, older design.

## What Changes

- Transactions page header buttons (Filter, Add Transaction, Add Transfer) switch to labeled text at 600px, matching the breakpoint already used by Accounts, Categories, and the report navigation controls.
- The header button row wraps onto a second line when its buttons no longer fit in one row, instead of overflowing. This lets the row show three labeled buttons at 600px without hiding or removing any of them.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `transactions`: The "Filter Panel Access" requirement's responsive breakpoint changes from 960px to 600px. The header action bar gains a new requirement that it wraps to a second line instead of overflowing when its buttons do not fit on one line.

## Impact

- `frontend/src/views/Transactions.vue`: header button breakpoint classes and row wrapping.
- No backend, API, or data changes.

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive across screen sizes): Applies. This change closes a tablet-width gap where Transactions diverged from the rest of the app's responsive behavior. Compliant.
- **Frontend Code Discipline** (prefer framework components/styles, minimize custom CSS): Applies. The fix uses Vuetify's built-in responsive display utilities and flex-wrap; no custom CSS. Compliant.
- No other principles apply (frontend-only UI change, no API, data, or architecture impact).
