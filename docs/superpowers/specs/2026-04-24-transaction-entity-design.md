# Transaction Domain Entity Design

## Goal

Replace the current `Transaction` interface + free functions (`createTransactionModel`, `updateTransactionModel`, `archiveTransactionModel`, `getSignedAmount`) with a DDD-style domain entity: a class that encapsulates transaction state, enforces invariants, and exposes a stable domain contract via an interface.

## Motivation

- Today a `Transaction` is a plain interface. Any caller can build a value of that shape without running invariants. Invariants exist only inside the free factory/updater functions.
- Free functions are imported and injected into services (`createTransactionModel as defaultCreateTransactionModel` etc.) for testability. No test actually exercises the injection — it is dead flexibility.
- Domain logic (`getSignedAmount`) lives as a free function while the data it operates on is a plain record. Splitting state and behavior is the classical anaemic-domain-model smell.
- A class lets us attach state transitions, invariant checks, and derived values to a single addressable domain concept. New fields added to the interface are picked up by the class automatically; new behavior lives next to the data it operates on.

Scope is **`Transaction` only**. `Account`, `Category`, `User` stay as plain interfaces. If this pilot lands cleanly, rollout to other entities is separate work.

## Design Decisions (from brainstorming)

1. **Immutable entity.** Instance fields are `readonly`. Methods like `update()` and `archive()` return a new instance rather than mutating `this`. Chosen after explicit comparison with mutable: pre-image access, predictable serialization, and temporal reasoning during debugging matter more in this codebase than the minor ergonomic wins of mutable DDD.
2. **Two-layer type split.**
   - `TransactionData` — pure data shape. The storage / serialization contract. Used by Zod schemas, DynamoDB marshalling, and the persistence boundary.
   - `Transaction` — extends `TransactionData` with domain methods and computed getters. The contract services consume.
3. **Class implements the interface.** Class name: `TransactionEntity`. Consumers type against `Transaction`, not `TransactionEntity`.
4. **Public `readonly` fields, not private `#fields` + getters.** For immutable state without storage-vs-API divergence, getters add ceremony without a practical guarantee beyond `readonly`. Derived values (`signedAmount`) use `get`.
5. **Named static factories.**
   - `TransactionEntity.create(input, deps)` — build a new transaction. Generates id, timestamps, sets `version = 0`, `isArchived = false`. Runs full invariants.
   - `TransactionEntity.fromPersistence(data)` — rehydrate from a validated `TransactionData` (Zod-validated at repo boundary). Runs full invariants to catch DB drift. Trusts `id`, `createdAt`, `updatedAt`, `version` as provided.
   - Private constructor — called by both factories; assigns fields; runs invariants.
6. **Invariants re-run on rehydration.** Catches records written before an invariant was added. Cost is a handful of synchronous checks on a flat object; benefit is that every in-memory `Transaction` is guaranteed valid by current rules regardless of origin.
7. **Version (OCC token) stays owned by the repository.** Entity methods (`update`, `archive`) do not touch `version`. Repo reads the incoming entity's version for its DynamoDB conditional check, writes `version + 1`, and returns a new entity reflecting the persisted version (via `TransactionEntity.fromPersistence`). Rationale:
   - The version represents "how many times this has been persisted", not "how many in-memory transformations have been applied". Chained `tx.update(a).update(b)` must bump once per persist, not twice.
   - Putting the bump in the entity is speculative — the increment reflects a write that may not land.
   - OCC is one concern; splitting it across entity and repo multiplies reasoning surface.
8. **Repository speaks in instances both ways.** Reads return `Transaction` (really `TransactionEntity` instances, typed as `Transaction`). Writes accept `Transaction` and call `.toData()` internally for serialization. Service layer never sees raw `TransactionData`.
9. **Big-bang migration.** Single coordinated change: introduce class, migrate every consumer, delete free functions. Scope is bounded to `Transaction`, so blast radius fits one reviewable PR. Avoids a temporary dual-API state.
10. **Drop dependency-injected model functions from services.** Current `TransactionServiceImpl` and `TransferService` inject `createTransactionModel` / `updateTransactionModel` / `archiveTransactionModel` via constructor. No test uses the injection. Services call `TransactionEntity` static methods directly.
11. **Existing test fakes evolve.** `fakeTransaction()` continues to return a value typed as `Transaction`. Concrete value becomes a `TransactionEntity` instance (built via `fromPersistence`), transparently to call sites. No explicit `fakeTransactionData` needed; rare cases call `.toData()`.

## Types

```ts
// Pure data shape — storage, serialization, Zod.
export interface TransactionData {
  userId: string;
  id: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: DateString;
  description?: string;
  transferId?: string;
  isArchived: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Domain contract — what services consume.
export interface Transaction extends TransactionData {
  readonly signedAmount: number;
  update(input: UpdateTransactionInput, deps?: { clock?: () => Date }): Transaction;
  archive(deps?: { clock?: () => Date }): Transaction;
  toData(): TransactionData;
}

// Implementation.
export class TransactionEntity implements Transaction {
  readonly userId: string;
  readonly id: string;
  readonly accountId: string;
  readonly categoryId?: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly currency: string;
  readonly date: DateString;
  readonly description?: string;
  readonly transferId?: string;
  readonly isArchived: boolean;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;

  static create(
    input: CreateTransactionInput,
    deps?: { clock?: () => Date; idGenerator?: () => string },
  ): Transaction;

  static fromPersistence(data: TransactionData): Transaction;

  private constructor(data: TransactionData);

  get signedAmount(): number;

  update(
    input: UpdateTransactionInput,
    deps?: { clock?: () => Date },
  ): Transaction;

  archive(deps?: { clock?: () => Date }): Transaction;

  toData(): TransactionData;
}
```

`CreateTransactionInput`, `UpdateTransactionInput`, `TransactionType`, `NonTransferTransactionType`, `TransactionPattern`, `TransactionPatternType` keep their current shapes and exports.

## Behavior

### `TransactionEntity.create(input, deps?)`

Replaces `createTransactionModel`.

1. `now = (deps.clock ?? () => new Date())().toISOString()`
2. `id = (deps.idGenerator ?? randomUUID)()`
3. Build `TransactionData`:
   - `userId`, `type`, `amount`, `date`, `transferId` from `input`
   - `accountId = input.account.id`
   - `categoryId = input.category?.id`
   - `currency = input.account.currency`
   - `description = normalizeDescription(input.description)`
   - `isArchived = false`
   - `version = 0`
   - `createdAt = updatedAt = now`
4. Call private constructor with this `TransactionData` plus a reference to `input.account` and `input.category` so the constructor can run ownership/archive invariants against them. (Rationale: account/category ownership and archive checks require the full entities, not just ids. Keep the signature of the private constructor flexible enough to support this — see below.)
5. Return instance typed as `Transaction`.

Note on the construction path: the current code runs `assertTransactionInvariants({ transaction, newAccount, newCategory })`. The private constructor must accept either just `TransactionData` (for `fromPersistence`, where account/category are not in scope) or `TransactionData + { newAccount?, newCategory? }` (for `create` / `update`, which have the related entities on hand). Simplest shape:

```ts
private constructor(
  data: TransactionData,
  relations?: { newAccount?: Account; newCategory?: Category },
);
```

`fromPersistence` passes `data` only. `create` and `update` pass the related entities in `relations` so ownership + archive checks run against them. The same `#assertInvariants` method covers both cases — only the invariants that depend on `relations` run when relations are present (mirrors current `assertTransactionInvariants` behavior: `if (newAccount) { ... }`).

### `TransactionEntity.fromPersistence(data)`

Replaces the repository's current behavior of returning Zod-parsed plain objects.

1. Receives `TransactionData` (already Zod-validated at the repo boundary).
2. Calls private constructor with `data` only (no relations — account/category are not loaded by the repo on transaction reads).
3. Constructor runs invariants. Relation-dependent invariants (`newAccount`, `newCategory` archive/ownership checks) skip because relations are absent — matches current behavior where reads do not re-check account/category validity.
4. Returns instance typed as `Transaction`.

### `entity.update(input, deps?)`

Replaces `updateTransactionModel`.

1. If `this.isArchived` → throw `ModelError("Cannot update archived transaction")`.
2. Resolve new values with current `undefined` vs `null` semantics:
   - `accountId`, `currency` — from `input.account` if provided, else preserve current.
   - `categoryId` — `undefined` = no change, `null` = clear, else use `input.category.id`.
   - `description` — `undefined` = no change, `null` = clear, else `normalizeDescription(input.description)`.
   - `type`, `amount`, `date` — `??` fallback to current.
3. Build next `TransactionData`: all existing fields, overrides applied, `updatedAt = now`, `version` unchanged, `isArchived = false` (unchanged), `createdAt` unchanged, `id`/`userId`/`transferId` unchanged.
4. Pass to private constructor with `relations = { newAccount: input.account, newCategory: input.category ?? undefined }`. Invariants run.
5. Return new instance.

### `entity.archive(deps?)`

Replaces `archiveTransactionModel`.

1. If `this.isArchived` → throw `ModelError("Cannot archive archived transaction")`.
2. Build next `TransactionData`: all fields preserved, `isArchived = true`, `updatedAt = now`, `version` unchanged.
3. Pass to private constructor (no relations).
4. Return new instance.

### `get signedAmount()`

Replaces `getSignedAmount`.

Returns positive `amount` for `INCOME`, `REFUND`, `TRANSFER_IN`; negative for `EXPENSE`, `TRANSFER_OUT`; throws `Error("Unknown transaction type: ...")` for unknown types. Logic is identical to the current free function.

### `entity.toData()`

Returns a plain object conforming to `TransactionData` — the class fields pulled into a fresh object, no methods. Used by the repository for persistence writes.

## Invariants

Unchanged from current `assertTransactionInvariants`. Moved to private method `#assertInvariants` on the class and invoked from the private constructor. Invariants:

- If `relations.newAccount` present:
  - `newAccount.userId === data.userId` else `ModelError("Account does not belong to user")`.
  - `!newAccount.isArchived` else `ModelError("Account must not be archived")`.
- `data.amount > 0` else `ModelError("Amount must be positive")`.
- Transfer / transferId linkage:
  - If `type ∈ { TRANSFER_IN, TRANSFER_OUT }`: must have `transferId` else `ModelError("Transfer transactions must include transferId")`.
  - Transfer with `relations.newCategory` present → `ModelError("Transfer transactions cannot have a category")`.
  - Non-transfer with `transferId` → `ModelError("Only transfer transactions can include transferId")`.
- If `relations.newCategory` present:
  - `newCategory.userId === data.userId` else `ModelError("Category does not belong to user")`.
  - `!newCategory.isArchived` else `ModelError("Category must not be archived")`.
  - Type match: INCOME category requires INCOME transaction; EXPENSE category requires EXPENSE or REFUND transaction. Else `ModelError("Category type does not match transaction type")`.
- `description?.length <= DESCRIPTION_MAX_LENGTH` else `ModelError("Description cannot exceed N characters")`.

## Persistence Boundary

### Zod schema

`backend/src/repositories/schemas/transaction.ts` currently declares `transactionSchema satisfies z.ZodType<Transaction>`. After the change, `Transaction` has methods, which Zod cannot produce. Re-point:

```ts
transactionSchema satisfies z.ZodType<TransactionData>
```

No behavioral change to the schema itself — it continues to describe the flat record.

### Repository reads

`DynTransactionRepository` currently does:

```ts
const transaction = hydrate(transactionSchema, result.Item);
```

After the change:

```ts
const data = hydrate(transactionSchema, result.Item);
const transaction = TransactionEntity.fromPersistence(data);
```

Every read path that returns `Transaction` (or `Transaction[]`, or `TransactionConnection`) wraps Zod-validated data in `fromPersistence`. This includes `findOneById`, `findManyByUserId`, `findManyByUserIdPaginated`, `findManyByAccountId`, `findManyByTransferId`, `findManyByDescription`.

`transactionDbItemSchema` (extends `transactionSchema` with `createdAtSortable`) returns `TransactionDbItem` — that type stays internal to the repo for pagination cursor computations; instances returned to callers strip `createdAtSortable` and wrap via `fromPersistence`.

### Repository writes

Current:

```ts
async create(transaction: Readonly<Transaction>): Promise<void> {
  const dbItem: TransactionDbItem = { ...transaction, createdAtSortable: ... };
  // PutCommand
}
```

After the change, `transaction` is a class instance. Spread (`{ ...transaction }`) on a class instance does not enumerate getters or methods — only own enumerable properties. Readonly fields assigned via `Object.defineProperty` in the constructor may not be enumerable by default; fields assigned with `this.foo = ...` are enumerable. To be safe and explicit, use `toData()`:

```ts
async create(transaction: Readonly<Transaction>): Promise<void> {
  const data = transaction.toData();
  const dbItem: TransactionDbItem = { ...data, createdAtSortable: ... };
  // PutCommand
}
```

Same pattern in `createMany`, `update`, `updateMany`.

### Return shape on `update` / `updateMany`

Currently `update` returns `{ ...transaction, version: transaction.version + 1 }` — a plain object. After the change, the repo must return a `Transaction` instance so the service layer stays in class terms:

```ts
async update(transaction: Readonly<Transaction>): Promise<Transaction> {
  // ... DynamoDB write with condition on transaction.version ...
  return TransactionEntity.fromPersistence({
    ...transaction.toData(),
    version: transaction.version + 1,
  });
}
```

`updateMany` returns `Transaction[]` built the same way. No change to OCC semantics or the `ConditionExpression` / `VersionConflictError` machinery from PR #422.

## Service Layer

### `TransactionServiceImpl`

Changes:

- Drop constructor-injected model functions (`createTransactionModel`, `updateTransactionModel`, `archiveTransactionModel`) and their private fields.
- `createTransaction`: replace `this.createTransactionModel(...)` with `TransactionEntity.create(...)`.
- `updateTransaction`: replace `this.updateTransactionModel(existingTransaction, { ... })` with `existingTransaction.update({ ... })`.
- `deleteTransaction`: replace `this.archiveTransactionModel(existingTransaction)` with `existingTransaction.archive()`.

All other logic (pagination validation, filter validation, category type validation, pattern enrichment, description suggestions) unchanged.

### `TransferService`

Same shape of change:

- Drop constructor-injected model functions.
- `createTransfer`: replace the two `this.createTransactionModel(...)` calls with `TransactionEntity.create(...)`.
- `deleteTransfer`: replace `this.archiveTransactionModel(transaction)` with `transaction.archive()`.
- `updateTransfer`: replace `this.updateTransactionModel(...)` calls with `transaction.update(...)`.

### `getSignedAmount` consumers

Three call sites use the free function today. Each migrates to the instance getter:

- `backend/src/services/account-service.ts` — `(sum, transaction) => sum + getSignedAmount(transaction)` → `(sum, transaction) => sum + transaction.signedAmount`.
- `backend/src/langchain/tools/aggregate-transactions.ts` — `const signedAmount = getSignedAmount(transaction)` → `const signedAmount = transaction.signedAmount`.
- `backend/src/services/by-category-report-service.ts` — two call sites of the same form. Both migrate to `.signedAmount`. The local variable `amountGetter: typeof getSignedAmount` (currently a function binding) becomes a callback `(t: Transaction) => number` that returns either `t.signedAmount` or `-t.signedAmount` depending on inversion; the `-getSignedAmount(transaction)` branch becomes `-transaction.signedAmount`.

## Test Strategy

### New test file — class behavior

Rewrite `backend/src/models/transaction.test.ts` as tests for `TransactionEntity`. Structure: one top-level `describe("TransactionEntity")` with nested `describe` blocks mirroring the declaration order of the class (static factories first, then instance methods/getters — tests cannot exercise instance methods before construction works):

- `describe("create")` — all cases currently under `describe("createTransactionModel")`.
- `describe("fromPersistence")` — new cases: builds an instance from `TransactionData`, re-runs invariants (e.g., rejects amount ≤ 0, rejects transfer without transferId), does not re-check relation-dependent invariants (no account argument).
- `describe("signedAmount")` — all cases currently under `describe("getSignedAmount")`.
- `describe("update")` — all cases currently under `describe("updateTransactionModel")`.
- `describe("archive")` — all cases currently under `describe("archiveTransactionModel")`.
- `describe("toData")` — returns a plain object with the expected keys and values; the class' instance methods are not enumerable on the result; `result.toData` and `result.update` are `undefined` on the returned data.

Test names stay without the "should" prefix (per recent commit #421).

All assertions against a value of type `Transaction` (readable fields on the instance). `expect(result).toEqual({ ... })` assertions still work: Jest's `toEqual` treats class instances with matching fields as equal to plain objects.

### Fakes

`backend/src/utils/test-utils/models/transaction-fakes.ts`:

- `fakeTransaction(overrides?: Partial<TransactionData>): Transaction` — builds `TransactionData` with faker-generated fields (matching current), then returns `TransactionEntity.fromPersistence(data)`. Return type stays `Transaction` — call sites unaffected.
- `fakeCreateTransactionInput` unchanged.
- `fakeTransactionPattern` unchanged.

Signature note: the `overrides` parameter type changes from `Partial<Transaction>` to `Partial<TransactionData>` because callers pass raw field overrides, not method overrides. No call site passes methods.

### Service / repository tests

Existing tests in `transaction-service.test.ts`, `transfer-service.test.ts`, `account-service.test.ts`, `create-transaction-from-text-service.test.ts`, `dyn-transaction-repository.test.ts`, and the langchain tool tests all consume `fakeTransaction` or `TransactionType` enums. They compile unchanged as long as `fakeTransaction` keeps its return type. The parts that will change:

- Any test that imports `createTransactionModel` / `updateTransactionModel` / `archiveTransactionModel` / `getSignedAmount` directly — rewritten to use class instead.
- Any test that asserts `expect(x).toEqual(plainObject)` against a transaction instance — keeps working due to Jest field-equality semantics.
- Service tests that injected fake model functions (`deps.createTransactionModel = jest.fn(...)`) — rewritten to let the service use `TransactionEntity` directly, asserting on persisted state via repo mocks instead.

## Out of Scope

- Changes to `Account`, `Category`, `User` models.
- Changes to GraphQL schema or generated resolver types. `resolvers-types.ts` imports `TransactionType` and `TransactionPatternType` enums only — unaffected.
- Changes to the migration file `20260423093628-add-transaction-version.ts`.
- Changes to DynamoDB table shape or GSIs.
- Performance tuning on `fromPersistence` (the invariant checks are cheap; no need to skip them for hot paths).
- Any behavioral change to OCC beyond moving the version bump return path through `fromPersistence`.

## Acceptance

- `npm --prefix backend run typecheck` clean.
- `npm --prefix backend test` clean.
- `npm --prefix backend run format` clean.
- Free functions `createTransactionModel`, `updateTransactionModel`, `archiveTransactionModel`, `getSignedAmount` no longer exported from `backend/src/models/transaction.ts`.
- `TransactionEntity` exported from `backend/src/models/transaction.ts`. `Transaction` and `TransactionData` interfaces exported.
- `DynTransactionRepository` returns `TransactionEntity` instances (typed as `Transaction`) from all read methods and from `update` / `updateMany`.
- Services `TransactionServiceImpl` and `TransferService` no longer accept or use injected model functions.
