## Context

The frontend sends both account IDs on every transfer edit, also when they do not change. For each account ID in the input, `TransferService.updateTransfer` loads the account again with `findOneById`. This causes two defects:

- The second load gives a separate instance of an unchanged account. The identity check `oldSourceAccount === newSourceAccount` fails, so the service treats the account as changed. The revert and the apply go to two instances of one account, and the apply overwrites the revert in the `accountsToUpdate` map
- `findOneById` returns no archived accounts, and `Transaction.update()` rejects an archived account. An edit fails when it keeps an archived account

## Goals / Non-Goals

**Goals:**

- Correct balances when an edit sends an unchanged account ID
- Allow edits that keep an unchanged archived account

**Non-Goals:**

- Correct the balances that the defect already corrupted
- Change regular transaction editing, which has a similar account lookup

## Decisions

### Decision: Load a new account only when its ID changes

When the input account ID equals the current account ID, the service keeps the account it loaded with `findOneWithArchivedById`. The service passes an account to `Transaction.update()` only when the account changes. The identity checks and the `accountsToUpdate` map then work as before.

- **Alternative considered**: load the new account with `findOneWithArchivedById` and remove the archived check from `Transaction`
- **Why rejected**: the entity rule that a new account must not be archived stays correct. A change to an archived account must still fail

## Risks / Trade-offs

- [The fix does not correct corrupted balances] → The user corrects them manually
- [Regular transactions can have the same archived account defect] → Out of scope; examine in a separate change

## Constitution Compliance

- **Backend Services**: The lookup rule stays in `TransferService`. Compliant
- **Backend Domain Entities**: `Transaction` and `Account` entities are unchanged. Compliant
- **Backend Port Interfaces**: The service uses existing `AccountRepository` methods. Compliant
- **Soft-Deletion**: Archived accounts load only through the explicit `findOneWithArchivedById` method. Compliant
- **Result Pattern**: Failures return a `Failure` result. Compliant
