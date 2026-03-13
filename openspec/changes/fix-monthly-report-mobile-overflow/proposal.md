## Why

On mobile and tablet screens, expanding a category row in the monthly expense report causes the transaction cards to overflow the card boundary horizontally. This happens because `TransactionCard` components are rendered inside an HTML `<table>` cell (`<td colspan="3">`), and the table's `auto` layout algorithm cannot properly constrain their width — the `v-table__wrapper` has `overflow-x: auto`, allowing the table to grow wider than its container instead of clipping.

## What Changes

- Fix `CategoryBreakdownTable.vue` to constrain the expanded transaction list to the available card width on all screen sizes
- The fix is scoped to the table layout — no changes to `TransactionCard` or other components

## Capabilities

### New Capabilities

_None_

### Modified Capabilities

- `reports`: Add responsive layout requirement for the expanded category transaction list

## Impact

- `frontend/src/components/reports/CategoryBreakdownTable.vue` — layout fix for the expanded row
