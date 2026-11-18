## Code Style

Apply [docs/code-style.md](../../../docs/code-style.md) during implementation.

## 1. Unchanged Account in a Transfer Edit

- [x] 1.1 (use `testing` skill) In `backend/src/services/transfer-service.test.ts` under `updateTransfer`, add failing tests: only the destination changes and the archived source ID is sent again; only the source changes and the archived destination ID is sent again. Verify that the unchanged account keeps its balance, the other balances move, and both tests fail
- [x] 1.2 In `TransferService.updateTransfer`, load a new account only when its ID differs from the current account ID, and pass an account to `Transaction.update()` only when the account changes. Verify that the tests from 1.1 pass
- [x] 1.3 Verify that the existing tests "fails when new source account not found" and "fails when new destination account not found" still pass; they cover a change to an archived account

## 2. Verification

- [x] 2.1 Run `npm run typecheck`, `npm run lint`, and `npm test` in `backend/`, and verify that all pass

## Constitution Compliance

- **Backend Services**: Changes stay in `TransferService`. Compliant
- **Backend Domain Entities**: `Transaction` and `Account` entities are unchanged. Compliant
- **Result Pattern**: Failures return a `Failure` result. Compliant
- **Test Strategy**: Co-located service tests with mocked repositories, written first. Compliant
