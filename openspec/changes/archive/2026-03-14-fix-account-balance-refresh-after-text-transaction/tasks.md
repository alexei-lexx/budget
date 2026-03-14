## 1. Frontend Fix

- [x] 1.1 In `frontend/src/views/Transactions.vue`, call `refetchAccounts()` inside `handleCreateTransactionFromText` after a transaction is successfully created (mirror the pattern used in `handleCreateTransactionSubmit`)

## 2. Validation

- [x] 2.1 Run `npm run typecheck` in `frontend/` and confirm no errors
- [x] 2.2 Run `npm run format` in `frontend/` and confirm no lint issues
- [x] 2.3 Manually verify: create a transaction via text input, navigate to Accounts page, confirm balance is updated without a page refresh
