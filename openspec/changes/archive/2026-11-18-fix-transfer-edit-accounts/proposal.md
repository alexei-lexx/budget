## Why

Editing a transfer can corrupt account balances. The edit form always sends both account IDs, also when they do not change. When only the destination changes, the source account gets the transfer amount a second time. Example: two transfers of 4000 and 2000 get a new destination, and the source balance becomes 6000 too low. The same occurs for the destination when only the source changes.

Editing a transfer also fails when its source or destination account is archived, also when that account does not change. Archived accounts keep their transactions, but these transfers cannot be corrected.

## What Changes

- An unchanged account keeps its balance when the other account of the transfer changes
- An edit can keep an archived source or destination account when that account does not change
- An edit still cannot move a transfer to an archived account

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transfers`: modify Transfer Editing to cover account changes and archived accounts

## Impact

- `backend/src/services/transfer-service.ts`: `updateTransfer` account lookups
- GraphQL mutation `updateTransfer`: no schema change
- Frontend: no change
- Existing balances that the defect corrupted do not change; the user corrects them manually

## Constitution Compliance

- **Backend Services**: The fix stays in `TransferService`. Compliant
- **Backend Domain Entities**: The `Transaction` entity keeps its rule that a new account must not be archived. Compliant
- **Soft-Deletion**: Archived accounts stay hidden from selection; only an existing reference is kept. Compliant
- **Result Pattern**: A missing or archived new account still returns a `Failure` result. Compliant
- **Schema-Driven Development**: No API contract change. Compliant
- **Test Strategy**: Service tests with mocked repositories cover the change. Compliant
