## Context

The Transactions page supports two paths for creating a transaction:

1. **Form dialog** — calls `createTransaction()`, then explicitly calls `refetchAccounts()` on success.
2. **Natural language text input** — calls `createTransactionFromText()`, then calls `addTransactionsToList()` to prepend the new transaction to the local list, but does **not** call `refetchAccounts()`.

Because account balances are fetched independently via the `GetAccounts` query and cached by Apollo, they are not automatically invalidated when a transaction mutation succeeds.
The missing `refetchAccounts()` call is the sole cause of the stale balance on the Accounts page.

## Goals / Non-Goals

**Goals:**

- Account balance on the Accounts page reflects a new transaction immediately after it is created via the text input, without a manual page refresh.
- Behavior is consistent between the form dialog and the text input paths.

**Non-Goals:**

- Refactoring the broader cache-invalidation strategy (e.g., moving to Apollo cache policies or subscriptions).
- Changing the backend or GraphQL schema.
- Modifying the form dialog path (it already works correctly).

## Decisions

**Add `refetchAccounts()` to the text-input success handler in `Transactions.vue`.**

The form dialog already uses `refetchAccounts()` (from `useAccounts`) after a successful `createTransaction` call.
Applying the same call after `createTransactionFromText` succeeds is the minimal, consistent fix.

_Alternative considered:_ Apollo `refetchQueries` option on the mutation — rejected because the mutation composable (`useCreateTransactionFromText`) is generic and should not couple itself to a sibling query; the call site in `Transactions.vue` is the right place.

## Risks / Trade-offs

- **Extra network round-trip** — `refetchAccounts()` issues a second GraphQL request after each text-input transaction. This is the same cost already paid by the form dialog path and is acceptable.
  → No mitigation needed; behaviour is already expected by existing form dialog usage.
