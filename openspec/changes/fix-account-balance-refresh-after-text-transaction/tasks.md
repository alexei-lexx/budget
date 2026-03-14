## 1. Refresh accounts after text-based transaction creation

- [ ] 1.1 In `Transactions.vue`, add `await refetchAccounts()` inside `handleCreateTransactionFromText` after `addTransactionsToList([transaction])`, matching the pattern used by all other mutation handlers

## 2. Update spec

- [ ] 2.1 In `openspec/specs/transactions/spec.md`, update the Natural Language Transaction Creation requirement to state that account balances are refreshed after a successful creation
- [ ] 2.2 Archive this change to apply the delta spec to `openspec/specs/transactions/spec.md`
