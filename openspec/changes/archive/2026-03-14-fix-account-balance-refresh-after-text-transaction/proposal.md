## Why

After successfully creating a transaction via the natural language text input, the account balance shown on the Accounts page is stale. The Apollo cache is not invalidated, so navigating back to the Accounts page displays the old balance until a manual page refresh is performed.

This creates a confusing user experience because the form dialog and transfer creation both refresh accounts immediately, while the text-based creation path silently leaves the cached balance outdated.

## What Changes

- After a successful natural language transaction creation, account balances are refreshed so that navigating to the Accounts page shows the updated balance

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `transactions`: Update the Natural Language Transaction Creation requirement to specify that account balances are refreshed after a successful creation

## Impact

- **Frontend**: `Transactions.vue` — `handleCreateTransactionFromText` must call `refetchAccounts()` after a transaction is successfully created, consistent with the form dialog and transfer creation handlers
- No backend, GraphQL schema, or infrastructure changes required
