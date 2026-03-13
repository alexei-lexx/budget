## Why

After clicking outside any form dialog (which correctly shows a wobble and stays open),
the Escape key stops working for the rest of that dialog session. This affects all
persistent form dialogs: transactions, transfers, accounts, and categories. Escape
should always close these dialogs regardless of prior interaction.

## What Changes

- Fix Escape key handler so it remains functional even after a failed outside-click
  attempt (i.e. after the Vuetify wobble animation plays)
- Applies to: Create/Edit Transaction, Create/Edit Transfer, Add/Edit Account,
  Add/Edit Category dialogs
- Clicking outside intentionally does NOT close the dialog — that behavior is correct
  and should be preserved

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `transactions`: Escape key must reliably dismiss the Create/Edit Transaction and
  Create/Edit Transfer dialogs regardless of where focus is within the dialog
- `accounts`: Escape key must reliably dismiss the Add/Edit Account dialog regardless
  of where focus is within the dialog
- `categories`: Escape key must reliably dismiss the Add/Edit Category dialog regardless
  of where focus is within the dialog

## Impact

- `Transactions.vue` — four `<v-dialog>` elements wrapping transaction/transfer forms
- `Accounts.vue` — two `<v-dialog>` elements wrapping the account form
- `Categories.vue` — two `<v-dialog>` elements wrapping the category form
