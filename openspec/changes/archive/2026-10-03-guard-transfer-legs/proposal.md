## Why

A transfer is two linked transactions. The transaction API accepts the ID of a single transfer leg. Deleting one leg leaves an orphan leg and an unbalanced account. Editing one leg desyncs the pair. Example: −100 on the source account and +50 on the destination. The UI routes transfers to transfer operations, but the API does not enforce it. GraphQL and MCP clients can corrupt transfers.

## What Changes

- Reject deleting a transaction that belongs to a transfer through transaction deletion.
- Reject editing a transaction that belongs to a transfer through transaction editing.
- Transfer operations stay unchanged. They remain the only way to change transfer legs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transactions`: modify Transaction Editing and Transaction Deletion to reject transfer legs.

## Impact

- `backend/src/services/transaction-service.ts`: `deleteTransaction` and `updateTransaction` reject transfer legs.
- GraphQL mutations `deleteTransaction` and `updateTransaction` return an error for transfer legs. No schema change.
- MCP tool `update_transaction` returns an error for transfer legs.
- Frontend: no change. It already uses transfer mutations for transfers.

## Constitution Compliance

- **Backend Layer Structure**: The rule is business logic. It lives in the service layer. Compliant.
- **Backend Domain Entities**: The `Transaction` entity stays unaware of pairing. A cross-record rule does not belong in a single entity. Compliant.
- **Result Pattern**: Rejections return a `Failure` result. Compliant.
- **Schema-Driven Development**: No API contract change. Compliant.
- **Test Strategy**: Service tests with mocked repositories cover the new rules. Compliant.
