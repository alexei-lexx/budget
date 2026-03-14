## Why

After creating a transaction via the natural language text input, the account balance shown on the Accounts page is not updated until the user manually refreshes.
The form dialog path already refreshes correctly; only the text input path is missing the balance update.

## What Changes

- After a successful natural language transaction creation, trigger an account balance refresh so the Accounts page reflects the new transaction immediately.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `transactions`: The natural language transaction creation scenario must guarantee that account balances update immediately after a transaction is created, consistent with the form dialog path.

## Impact

- `frontend/src/views/Transactions.vue` — add `refetchAccounts()` call in the text-input success handler
- No backend, schema, or database changes required
