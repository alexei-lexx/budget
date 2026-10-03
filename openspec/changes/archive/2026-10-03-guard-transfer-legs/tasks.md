## Code Style

Apply [docs/code-style.md](../../../docs/code-style.md) during implementation.

## 1. Delete Guard

- [x] 1.1 (use `testing` skill) In `backend/src/services/transaction-service.test.ts` under `deleteTransaction`, add a failing test: a transfer leg returns `Failure("Transfer transactions can only be deleted as a transfer")` and the atomic writer is not called
- [x] 1.2 In `TransactionService.deleteTransaction`, return the failure when the found transaction has a `transferId`, before loading the account
- [x] 1.3 Run `npm run test:unit` in `backend/` and confirm the new test passes

## 2. Edit Guard

- [x] 2.1 (use `testing` skill) In `backend/src/services/transaction-service.test.ts` under `updateTransaction`, add a failing test: a transfer leg returns `Failure("Transfer transactions can only be edited as a transfer")` and the atomic writer is not called
- [x] 2.2 In `TransactionService.updateTransaction`, return the failure when the found transaction has a `transferId`, before validating account and category
- [x] 2.3 Run `npm run test:unit` in `backend/` and confirm the new test passes

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint`, and `npm test` in `backend/`

## Constitution Compliance

- **Backend Layer Structure**: Guards live in the service layer. Compliant.
- **Backend Domain Entities**: `Transaction` entity is unchanged. Compliant.
- **Result Pattern**: Guards return `Failure`. Compliant.
- **Test Strategy**: Co-located service tests with mocked repositories, written first. Compliant.
