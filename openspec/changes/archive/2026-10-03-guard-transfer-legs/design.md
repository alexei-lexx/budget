## Context

See proposal.md - Why. `TransactionService.deleteTransaction` and `updateTransaction` load the transaction by ID and change it without checking `transferId`. `TransferService` changes both legs together. It does not call `TransactionService`.

## Goals / Non-Goals

**Goals:**

- Block single-leg delete and edit at the service layer, so GraphQL and MCP are both covered.

**Non-Goals:**

- Compound transactions. They may have a similar gap. That is a separate change.
- Frontend changes.

## Decisions

### Guard in `TransactionService`, not in the `Transaction` entity

`deleteTransaction` and `updateTransaction` return `Failure` when the loaded transaction has a `transferId`. The check runs right after the transaction is found, before any other validation.

Alternative: throw from `Transaction.archive()` and `Transaction.update()`. Rejected. A transaction is a ledger record. It does not know about its pair. The pairing rule spans two records, so it belongs to the service. Also, `TransferService` calls these entity methods on legs. An entity-level guard would block it.

Alternative: guard in the resolver. Rejected. Business rules belong in services. The MCP tool would bypass a resolver guard.

### Error messages

- Delete: `"Transfer transactions can only be deleted as a transfer"`.
- Edit: `"Transfer transactions can only be edited as a transfer"`.

## Risks / Trade-offs

- [Existing orphan legs from past single-leg deletes stay broken] → Out of scope. No migration. Fix by hand if found.

## Constitution Compliance

- **Backend Layer Structure**: The rule is in the service layer. Compliant.
- **Backend Domain Entities**: Entity invariants stay unchanged. Compliant.
- **Result Pattern**: Rejections return `Failure`. Compliant.
- **Test Strategy**: Co-located service tests with mocked repositories. Compliant.
