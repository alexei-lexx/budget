## Context

In `Transactions.vue`, every mutation that modifies account balances calls `refetchAccounts()` after success:

- `handleCreateTransactionSubmit` (form dialog) — calls `refetchAccounts()`
- `handleEditTransactionSubmit` — calls `refetchAccounts()`
- `confirmDeleteTransaction` — calls `refetchAccounts()`
- `handleCreateTransferSubmit` — calls `refetchAccounts()`
- `handleEditTransferSubmit` — calls `refetchAccounts()`
- `confirmDeleteTransfer` — calls `refetchAccounts()`

The single exception is `handleCreateTransactionFromText`, which only calls `addTransactionsToList([transaction])` to update the local transaction list but never invalidates the accounts cache. Since `useAccounts` holds a separate Apollo-cached query (`GET_ACCOUNTS`), the balance field — resolved server-side per account — remains stale until the query is explicitly refetched or the page is reloaded.

## Goals / Non-Goals

**Goals:**

- After a successful text-based transaction creation, refresh the accounts query so the balance is up to date when the user navigates to the Accounts page
- Keep the change minimal and localised to `Transactions.vue`

**Non-Goals:**

- Changing error-path behaviour (no refetch on failure)
- Any backend, GraphQL schema, or infrastructure changes

## Decisions

### Call `refetchAccounts()` inside `handleCreateTransactionFromText`

`refetchAccounts` is already available in `Transactions.vue` (destructured from `useAccounts()`). Adding `await refetchAccounts()` immediately after `addTransactionsToList([transaction])` mirrors the exact pattern used by all other transaction/transfer mutation handlers.

**Alternatives considered:**

- **Apollo `refetchQueries` option on the mutation**: The `createTransactionFromText` mutation is invoked inside `useCreateTransactionFromText` composable, which has no coupling to the accounts query. Adding `refetchQueries` there would introduce an implicit dependency between composables. Keeping the refetch in the view layer is more explicit and consistent with the existing pattern.
- **Evict the account cache entries directly**: More complex and brittle; `refetchAccounts()` is the established pattern throughout the file.
- **Return the updated account from the mutation**: Requires a backend schema change; out of scope for this fix.

## Risks / Trade-offs

- [Extra network request] `refetchAccounts()` fires an additional `GET_ACCOUNTS` query after each text-based creation. This is identical behaviour to all other handlers and is acceptable given the benefit of up-to-date balances.
