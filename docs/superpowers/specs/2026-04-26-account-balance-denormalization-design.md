# Account Balance Denormalization

**Status:** design
**Date:** 2026-04-26

## Problem

`Account.balance` is computed on every read by summing the account's non-archived transactions ([backend/src/services/account-service.ts:130-154](backend/src/services/account-service.ts#L130-L154)). Cost scales with transactions per account per request — the Accounts page (N accounts × M txns each) issues N+1 queries plus per-account scans.

## Goal

Denormalize the txn-derived sum onto the `Account` row as a new field `transactionBalance`. Keep `initialBalance` separate. Expose `balance` as a derived getter (`= initialBalance + transactionBalance`); GraphQL field unchanged.

Maintain `transactionBalance` via cross-table DynamoDB `TransactWriteCommand`s through a new `LedgerWriter` port. Every txn-driven mutation bundles {transaction op, account update with bumped version + version-checked condition} in one transactional write. Concurrent edits resolve through optimistic locking + retry (existing `handleVersionConflict` machinery).

`initialBalance` is independent of `transactionBalance` — user edits to `initialBalance` don't go through the ledger writer, no cross-field race.

## Data model

`AccountData` (and `accountDataSchema` zod) gains:

```ts
transactionBalance: number  // signed sum of non-archived txns affecting this account
```

`Account` entity ([backend/src/models/account.ts](backend/src/models/account.ts)):

```ts
readonly transactionBalance: number

get balance(): number {
  return this.initialBalance + this.transactionBalance
}

increaseBalanceBySignedAmount(delta: number): Account {
  return this.updateTransactionBalance(this.transactionBalance + delta)
}

decreaseBalanceBySignedAmount(delta: number): Account {
  return this.updateTransactionBalance(this.transactionBalance - delta)
}

private updateTransactionBalance(newValue: number): Account {
  // Constructs a new Account with transactionBalance = newValue + bumped updatedAt.
  // Skips invariant assertions (only this field changes) and skips the archived check
  // — txn-driven balance moves are legal on archived accounts (their non-archived
  // transactions can still be archived later, reverting their balance impact).
}
```

- `Account.create()` defaults `transactionBalance: 0`.
- `Account.fromPersistence()` reads it from data.
- `UpdateAccountInput` (the public, service/GraphQL-facing input) stays as-is — it does NOT gain `transactionBalance`. Only the two private balance helpers above can change `transactionBalance`.
- `update()` keeps its existing strict archived check — throws on archived for any of `name`/`currency`/`initialBalance`.
- `archive()` / `bumpVersion()` / `toData()` mechanically extended to carry `transactionBalance`.

No new invariant. `transactionBalance` may be any number (negative balances are allowed in this app).

## `LedgerWriter` port

File: `backend/src/ports/ledger-writer.ts`.

```ts
import { Account } from "../models/account";
import { Transaction } from "../models/transaction";

export interface LedgerWrite {
  createTransactions?: readonly Transaction[];
  updateTransactions?: readonly Transaction[];
  updateAccounts: readonly Account[];   // may be empty for metadata-only txn updates
}

export interface LedgerWriteResult {
  createdTransactions: Transaction[];   // mirrors input order; version unchanged (was 0)
  updatedTransactions: Transaction[];   // mirrors input order; bumped (version + 1)
  updatedAccounts: Account[];           // mirrors input order; bumped (version + 1)
}

export interface LedgerWriter {
  apply(write: LedgerWrite): Promise<LedgerWriteResult>;
}
```

### Semantics

- All input items bundled into a single DynamoDB `TransactWriteCommand` — atomic, all-or-nothing.
- `createTransactions[i]` → `Put` with `attribute_not_exists(id)`. Caller passes a fresh-built Transaction (`version === 0`).
- `updateTransactions[i]` → `Update` with `version = :expected` condition. Caller passes the entity carrying the *expected* version (the version they read).
- `updateAccounts[i]` → `Update` with `version = :expected` condition. Same convention.
- On success: result arrays mirror input order; entities are `bumpVersion()`'d where applicable.
- Caller has already applied any balance change to Account entities via `increaseBalanceBySignedAmount` / `decreaseBalanceBySignedAmount` before passing them in.

### Error mapping (inline in `DynLedgerWriter.apply`)

- Cancellation reason `ConditionalCheckFailed` with returned `Item` → `VersionConflictError`.
- Cancellation reason `ConditionalCheckFailed` with no `Item` on a Put → `RepositoryError("Transaction with this ID already exists", "CREATE_FAILED")`.
- Cancellation reason `ConditionalCheckFailed` with no `Item` on an Update → `RepositoryError("Not found", "NOT_FOUND")`.
- Other DynamoDB errors → `RepositoryError(..., "TRANSACT_WRITE_FAILED")`.

### Constraints (caller's responsibility)

- Total items must fit `DYNAMODB_TRANSACT_WRITE_MAX_ITEMS` (100). All real flows are ≤ 6.
- No two items may target the same primary key (DynamoDB rule). Service flows naturally satisfy this — same-account amount changes must produce a single chained Account entity, not two.

## `DynLedgerWriter` implementation + shared builders

File: `backend/src/repositories/dyn-ledger-writer.ts`.

`DynLedgerWriter` does not extend `DynBaseRepository` (which is single-table); has its own constructor accepting two table names + the Dynamo client. `apply()` builds the `TransactWriteItems` list from the input lists using shared builders, sends one `TransactWriteCommand`, returns bumped entities, maps cancellation reasons to errors as described above.

### Shared write-item builders — co-located with their existing repos

- [backend/src/repositories/dyn-transaction-repository.ts](backend/src/repositories/dyn-transaction-repository.ts) — adds exports:
  - `buildCreateTransactionItem(transaction, tableName)` → `{ Put: {...} }`
  - `buildUpdateTransactionItem(transaction, tableName)` → `{ Update: {...} }`

  Internal `create` / `update` are refactored to call these (no behavior change).

- [backend/src/repositories/dyn-account-repository.ts](backend/src/repositories/dyn-account-repository.ts) — adds export:
  - `buildUpdateAccountItem(account, tableName)` → `{ Update: {...} }`

  Internal `update` calls it. SET list extended with `transactionBalance = :transactionBalance`.

### Removed

- `TransactionRepository.createMany` and `updateMany` from port + impl + tests. Their last callers (transfer flows) move to `LedgerWriter.apply()`.

## Service layer

### Repository surface change

`AccountRepository` gains:

```ts
findOneWithArchivedById(selector: { id: string; userId: string }): Promise<Account | null>
```

Mirrors existing `findManyWithArchivedByIds` naming. Used by txn update/delete flows that must touch a (possibly-archived) account row.

### DI changes

- `TransactionServiceImpl` constructor adds `ledgerWriter: LedgerWriter`.
- `TransferService` constructor adds `ledgerWriter: LedgerWriter`.
- `AccountServiceImpl` constructor unchanged.
- Composition root wires `DynLedgerWriter` once with the two table names.

### Method-by-method (all balance math inline)

`TransactionService.createTransaction` — fetch account (active), build txn, compute updated account, single `apply`:

```ts
const account = await accountRepository.findOneById({id, userId}); if (!account) throw ...;
const transaction = Transaction.create({...});
const updatedAccount = account.increaseBalanceBySignedAmount(transaction.signedAmount);

await handleVersionConflict("Transaction", () =>
  ledgerWriter.apply({createTransactions: [transaction], updateAccounts: [updatedAccount]})
);
return transaction;
```

`TransactionService.updateTransaction` — same/cross-account branching inline; metadata-only updates skip account writes:

```ts
const updated = existing.update({...});
const balanceAffected =
  existing.accountId !== updated.accountId ||
  existing.signedAmount !== updated.signedAmount;

let updatedAccounts: Account[] = [];
if (balanceAffected) {
  if (existing.accountId === updated.accountId) {
    const account = await accountRepository.findOneWithArchivedById({id: existing.accountId, userId});
    if (!account) throw ...;
    updatedAccounts = [
      account
        .decreaseBalanceBySignedAmount(existing.signedAmount)
        .increaseBalanceBySignedAmount(updated.signedAmount),
    ];
  } else {
    const oldAccount = await accountRepository.findOneWithArchivedById({id: existing.accountId, userId});
    if (!oldAccount) throw ...;
    // newAccount already fetched (validateAccount) when input.accountId provided
    updatedAccounts = [
      oldAccount.decreaseBalanceBySignedAmount(existing.signedAmount),
      newAccount.increaseBalanceBySignedAmount(updated.signedAmount),
    ];
  }
}

await handleVersionConflict("Transaction", () =>
  ledgerWriter.apply({updateTransactions: [updated], updateAccounts})
);
```

`TransactionService.deleteTransaction` (archive):

```ts
const account = await accountRepository.findOneWithArchivedById({id: existing.accountId, userId});
if (!account) throw ...;
const archived = existing.archive();
const updatedAccount = account.decreaseBalanceBySignedAmount(existing.signedAmount);

await handleVersionConflict("Transaction", () =>
  ledgerWriter.apply({updateTransactions: [archived], updateAccounts: [updatedAccount]})
);
```

`TransferService.createTransfer`:

```ts
const updatedAccounts = [
  fromAccount.increaseBalanceBySignedAmount(outbound.signedAmount),
  toAccount.increaseBalanceBySignedAmount(inbound.signedAmount),
];

await handleVersionConflict("Transfer", () =>
  ledgerWriter.apply({createTransactions: [outbound, inbound], updateAccounts})
);
```

`TransferService.updateTransfer` — dedupe-by-accountId loop inline, only when balance is actually affected:

```ts
const balanceAffected =
  existingOutbound.amount !== updatedOutbound.amount ||
  existingOutbound.accountId !== updatedOutbound.accountId ||
  existingInbound.accountId !== updatedInbound.accountId;

let updatedAccounts: Account[] = [];
if (balanceAffected) {
  // Service fetches all unique accountIds from {existing,updated}×{outbound,inbound}.
  // Active accounts via findOneById; previously-referenced (possibly archived) via findOneWithArchivedById.
  const accountsById = new Map<string, Account>([...]);  // 1..4 unique
  const result = new Map<string, Account>();
  const get = (id: string) => result.get(id) ?? accountsById.get(id) ?? (() => { throw new Error(`Account ${id} not provided`); })();

  for (const txn of [existingOutbound, existingInbound]) {
    result.set(txn.accountId, get(txn.accountId).decreaseBalanceBySignedAmount(txn.signedAmount));
  }
  for (const txn of [updatedOutbound, updatedInbound]) {
    result.set(txn.accountId, get(txn.accountId).increaseBalanceBySignedAmount(txn.signedAmount));
  }
  updatedAccounts = Array.from(result.values());
}

await handleVersionConflict("Transfer", () =>
  ledgerWriter.apply({updateTransactions: [updatedOutbound, updatedInbound], updateAccounts})
);
```

`TransferService.deleteTransfer`:

```ts
const fromAccount = await accountRepository.findOneWithArchivedById({id: outbound.accountId, userId});
const toAccount   = await accountRepository.findOneWithArchivedById({id: inbound.accountId,  userId});
if (!fromAccount || !toAccount) throw ...;

const updatedAccounts = [
  fromAccount.decreaseBalanceBySignedAmount(outbound.signedAmount),
  toAccount.decreaseBalanceBySignedAmount(inbound.signedAmount),
];

await handleVersionConflict("Transfer", () =>
  ledgerWriter.apply({updateTransactions: [archivedOut, archivedIn], updateAccounts})
);
```

`AccountService.calculateBalance` is removed entirely — interface, impl, tests.

## Read path

GraphQL `Account.balance` resolver ([backend/src/graphql/resolvers/account-resolvers.ts](backend/src/graphql/resolvers/account-resolvers.ts)):

```ts
Account: {
  balance: (account: Account) => account.balance,   // = initialBalance + transactionBalance
}
```

No service call, no per-request transaction scan. Accounts page goes from N accounts × per-account txn scan to a single `Query` returning N accounts.

## Migration

File: `backend/src/migrations/YYYYMMDDhhmmss-add-account-transaction-balance.ts`. Pure DynamoDB; no project imports beyond `requireEnv` + AWS SDK (matches the existing migration pattern).

```ts
const POSITIVE_TYPES = new Set(["INCOME", "REFUND", "TRANSFER_IN"]);
function signedAmount(type: string, amount: number): number {
  return POSITIVE_TYPES.has(type) ? amount : -amount;
}
```

For each account row (scan all, including archived):

1. Query non-archived transactions for `(userId, accountId)`.
2. Sum signedAmount (using the inlined helper).
3. Update the account row with `SET transactionBalance = :sum`, condition `attribute_not_exists(transactionBalance)` (idempotent).

Backfills both archived and non-archived accounts. Archived accounts may still hold non-archived transactions; the new write paths fetch via `findOneWithArchivedById`, and zod requires the field on read.

No version bump (matches existing migrations).

Type→sign rule is duplicated — frozen at migration time. Future entity refactors won't alter historical migration behavior.

Migration must run before code that requires `transactionBalance` on reads is deployed (same ordering rule as `add-account-version`).

## Risk and mitigation

- **Risk:** missing a mutation site causes silent drift.
  - **Mitigation:** integration tests per mutation path assert the stored `transactionBalance` after each operation; service tests assert the entity passed to `ledgerWriter.apply()`.
- **Risk:** racing `updateAccount(initialBalance)` and concurrent txn write on the same account.
  - **Mitigation:** they touch different fields. `updateAccount` writes `initialBalance`; txn writes write `transactionBalance`. Both bump version and check version. No silent overwrite — concurrent writes resolve via optimistic-lock retry.
- **Risk:** migration runs after deploy → new write path reads a row missing `transactionBalance`, zod fails.
  - **Mitigation:** migration is required to run before deploying new code (same rule as the version-add migration). File header states this explicitly.

## Scope

In:

- `Account.transactionBalance` field + zod schema.
- `Account` entity surface: `balance` getter, `increaseBalanceBySignedAmount`, `decreaseBalanceBySignedAmount`, private `updateTransactionBalance`.
- `LedgerWriter` port + `DynLedgerWriter` impl.
- Shared write-item builders co-located in existing repo files.
- `AccountRepository.findOneWithArchivedById`.
- Service rewrites: `TransactionService`, `TransferService` (with inline balance math).
- Removal of `TransactionRepository.createMany` / `updateMany`.
- Removal of `AccountService.calculateBalance`.
- GraphQL `Account.balance` resolver swap to entity getter.
- Migration to backfill `transactionBalance`.
- Tests: model, service, repo, new `dyn-ledger-writer.test.ts` integration suite.

Out:

- Audit log / event sourcing / ledger table.
- Periodic reconciliation job (writes are transactional + version-checked).
- Frontend changes (GraphQL field shape unchanged).
- A separate `AccountBalanceProjection` domain module — math is simple enough to inline at services.
- CRDT-style `ADD :delta` writes — version-check + retry is simpler at this app's scale.
- Switching account `Update` to `Put` — current `Update`-with-explicit-SET preserves forward compatibility for fields not in the model.
- Cleanup unrelated to the balance-write path.

## Test coverage

Model — `backend/src/models/account.test.ts`:

- `Account.create()` defaults `transactionBalance: 0`.
- `fromPersistence` round-trips the field.
- `balance` getter = `initialBalance + transactionBalance`.
- `increaseBalanceBySignedAmount` / `decreaseBalanceBySignedAmount` produce new entity with adjusted `transactionBalance`, fresh `updatedAt`, same `version`. Work on archived accounts.
- Chaining `.decrease(x).increase(y)` produces correct combined value.
- `update()` keeps strict archived-check on user-driven fields.

Services:

- `account-service.test.ts` — `calculateBalance` suite deleted.
- `transaction-service.test.ts` — mocked repos + mocked `LedgerWriter`. Per-method coverage:
  - create: writer called with expected `{createTransactions, updateAccounts}`.
  - update: same-account / cross-account / type-flip / metadata-only branches.
  - delete (archive): writer called with archived txn + decremented account; idempotent on already-archived.
- `transfer-service.test.ts` — analogous; covers all 1..4 unique-account counts on update plus the no-balance-impact skip.

Repositories:

- `dyn-account-repository.test.ts` — adds `findOneWithArchivedById` cases; existing `update` tests verify `transactionBalance` round-trip.
- `dyn-transaction-repository.test.ts` — `createMany` / `updateMany` suites deleted; remaining suites unchanged after builder extraction.
- `dyn-ledger-writer.test.ts` (new, DynamoDB Local):
  - One success test per LedgerOp combination matching the service-flow matrix.
  - Cross-table atomicity: when a single condition fails, neither side persists.
  - Version conflict on transaction → `VersionConflictError`.
  - Version conflict on account → `VersionConflictError`.
  - Update on non-existent transaction → `RepositoryError("not found")`.
  - Create with duplicate id → `RepositoryError("already exists")`.
  - Returned entities carry bumped versions matching persisted state.

GraphQL — `account-resolvers.test.ts`: `Account.balance` field reads `account.balance` getter directly; no service call.

Migration: no dedicated test file (matches existing migration pattern).
