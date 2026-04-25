# Account Domain Entity Design

## Goal

Convert `Account` from a plain interface to an immutable domain class with invariants, an Optimistic Concurrency Control (OCC) `version` field, and instance-based repository writes. Mirrors the `Transaction` entity migration (PR #424) and transaction OCC rollout (PR #422).

## Motivation

- Today `Account` is a plain interface; any caller can produce a value of that shape without running validation.
- Account validation lives entirely in `AccountServiceImpl` (`validateName`, `validateCurrency`). Other entry points (langchain tools, future CLI/batch jobs) would need to repeat the checks.
- No `version` field — concurrent updates can clobber each other silently. The transaction migration added OCC; the same race exists on accounts (e.g. balance/initial-balance edits crossing with archive).
- The repository's create/update/archive methods take loose `CreateAccountInput` / `UpdateAccountInput` records. The service layer cannot express "this is the next state of the account" — it hands the repo a delta and trusts it to apply it. Flipping to instance-based writes makes the entity the single source of truth for account state transitions.

Scope is **`Account` only**. `Category`, `User` stay as plain interfaces. Rollout to other entities is separate work.

## Design Decisions

1. **Immutable entity.** Instance fields are `readonly`. `update()` and `archive()` return new instances. Same rationale as `Transaction`: pre-image access, predictable serialization, easier temporal reasoning.
2. **Two-layer type split.**
   - `AccountData` — pure data shape. Storage / serialization contract. Used by Zod schemas and DynamoDB marshalling.
   - `Account` — class implementing `AccountData` with domain methods. The contract services consume.
3. **Class named `Account`** (not `AccountEntity`). Matches the landed `Transaction` pattern (the design doc proposed `TransactionEntity` but the merged code uses `Transaction`).
4. **Public `readonly` fields, not private `#fields` + getters.** No derived getters today; `signedAmount`-style logic is not needed for accounts.
5. **Named static factories.**
   - `Account.create(input, deps)` — generates `id`, timestamps, sets `version = 0`, `isArchived = false`. Runs invariants.
   - `Account.fromPersistence(data)` — rehydrates from validated `AccountData`. Runs invariants to catch DB drift.
   - Private constructor — called by both factories; assigns fields; runs invariants (skippable via `bumpVersion`'s opt-out).
6. **Invariants re-run on rehydration.** Same rationale as `Transaction`.
7. **Version owned by repository writes.** Entity's `update()` / `archive()` do not touch `version`. Repo reads the incoming entity's `version` for its conditional check, writes `version + 1`, and returns a new entity reflecting the persisted version via `entity.bumpVersion()`.
8. **`bumpVersion()` exposed.** Required by the repo on successful conditional writes. Skips invariants (version-only transition).
9. **Repository speaks in instances both ways.** Reads return `Account` instances. Writes accept `Account` and call `.toData()` for serialization.
10. **`archive` method removed from the repository.** Soft-deletion is just an update with `isArchived = true`. Service calls `entity.archive()` then `repo.update(archived)`. Mirrors how `DynTransactionRepository` exposes only `update` / `updateMany` and no archive.
11. **`create` returns `Promise<void>`.** Caller already holds the entity it built via `Account.create(input)`. Matches `DynTransactionRepository.create`.
12. **Big-bang migration.** Single PR: introduce class, migrate consumers, drop the old `CreateAccountInput` / `UpdateAccountInput` types from the port file, remove `archive` from the repo interface, add the `version` migration.
13. **Drop `validateName` / `validateCurrency` from the service.** They move into entity invariants. The service keeps the cross-entity checks (`checkDuplicateName`, currency-change-with-transactions) because they require repository access.

## Types

```ts
// models/account.ts

// Pure data shape — storage, serialization, Zod.
export interface AccountData {
  userId: string;
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
  isArchived: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export class Account implements AccountData {
  readonly userId: string;
  readonly id: string;
  readonly name: string;
  readonly currency: string;
  readonly initialBalance: number;
  readonly isArchived: boolean;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;

  static create(
    input: CreateAccountInput,
    deps?: { clock?: () => Date; idGenerator?: () => string },
  ): Account;

  static fromPersistence(data: AccountData): Account;

  update(input: UpdateAccountInput, deps?: { clock?: () => Date }): Account;
  archive(deps?: { clock?: () => Date }): Account;
  bumpVersion(): Account;
  toData(): AccountData;

  private constructor(
    data: AccountData,
    opts?: { skipInvariants?: boolean },
  );

  private static assertInvariants(data: AccountData): void;
}

export interface CreateAccountInput {
  userId: string;
  name: string;
  currency: string;
  initialBalance: number;
}

export interface UpdateAccountInput {
  name?: string;
  currency?: string;
  initialBalance?: number;
}
```

`CreateAccountInput` and `UpdateAccountInput` move from `ports/account-repository.ts` to `models/account.ts` (matches transaction layout).

## Behavior

### `Account.create(input, deps?)`

1. `now = (deps.clock ?? () => new Date())().toISOString()`
2. `id = (deps.idGenerator ?? randomUUID)()`
3. Build `AccountData`:
   - `userId`, `currency`, `initialBalance` from `input`
   - `name = normalizeAccountName(input.name)` (trim)
   - `isArchived = false`
   - `version = 0`
   - `createdAt = updatedAt = now`
4. Call private constructor — invariants run.
5. Return instance.

### `Account.fromPersistence(data)`

1. Receives `AccountData` (already Zod-validated at the repo boundary).
2. Calls private constructor — invariants run.
3. Returns instance.

### `entity.update(input, deps?)`

1. If `this.isArchived` → `ModelError("Cannot update archived account")`.
2. Build next `AccountData`:
   - `name`: if `input.name !== undefined` → `normalizeAccountName(input.name)`, else preserve.
   - `currency`: `input.currency ?? this.currency`.
   - `initialBalance`: `input.initialBalance ?? this.initialBalance`.
   - `updatedAt = now`.
   - `id`, `userId`, `isArchived`, `version`, `createdAt` unchanged.
3. Call private constructor — invariants run.
4. Return new instance.

### `entity.archive(deps?)`

1. If `this.isArchived` → `ModelError("Cannot archive archived account")`.
2. Build next `AccountData`: all fields preserved, `isArchived = true`, `updatedAt = now`, `version` unchanged.
3. Call private constructor — invariants run (does not depend on `isArchived`).
4. Return new instance.

### `entity.bumpVersion()`

1. Build next `AccountData`: all fields preserved, `version = this.version + 1`.
2. Call private constructor with `{ skipInvariants: true }` — version-only transition leaves all invariant-bearing fields unchanged.
3. Return new instance.

### `entity.toData()`

Returns a plain `AccountData` object — fresh literal of the readonly fields, no methods.

## Invariants

Asserted in `Account.assertInvariants`:

- `name.trim().length` between `NAME_MIN_LENGTH` and `NAME_MAX_LENGTH` → `ModelError("Account name must be between {min} and {max} characters")`. Trimmed length is checked because `normalizeAccountName` trims; this keeps `fromPersistence` correct against any historical row that might have leading/trailing whitespace.
- `isSupportedCurrency(currency)` → `ModelError("Unsupported currency: {currency}")`.

`initialBalance` has no constraint (current code does not validate sign — credit-card style accounts may carry negative balances).

## `normalizeAccountName`

Module-level helper:

```ts
function normalizeAccountName(name: string): string {
  return name.trim();
}
```

Used by `Account.create` and `entity.update`. Not exported. The service's duplicate-name check compares case-insensitively (`name.toLowerCase()`) and continues to work because the entity always stores a trimmed name.

## Persistence Boundary

### Zod schema

`backend/src/repositories/schemas/account.ts`:

```ts
export const accountSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().min(1),
  currency: z.string().length(3).uppercase(),
  initialBalance: z.number(),
  isArchived: z.boolean(),
  version: z.number().int().nonnegative(),  // NEW
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<AccountData>;
```

`satisfies z.ZodType<Account>` becomes `satisfies z.ZodType<AccountData>` (the class has methods Zod cannot produce).

### Repository reads

Every read path wraps the Zod-validated record in `Account.fromPersistence`:

```ts
const data = hydrate(accountSchema, item);
const account = Account.fromPersistence(data);
```

Applies to `findOneById`, `findManyByUserId`, `findManyWithArchivedByIds`, `findManyWithArchivedByUserId`.

### Repository writes — interface

```ts
// ports/account-repository.ts
export interface AccountRepository {
  findOneById(selector: { id: string; userId: string }): Promise<Account | null>;
  findManyByUserId(userId: string): Promise<Account[]>;
  findManyWithArchivedByIds(selector: { ids: readonly string[]; userId: string }): Promise<Account[]>;
  findManyWithArchivedByUserId(userId: string): Promise<Account[]>;
  create(account: Readonly<Account>): Promise<void>;
  update(account: Readonly<Account>): Promise<Account>;
  // archive removed
}
```

`CreateAccountInput` / `UpdateAccountInput` are no longer exported from this file (they live in `models/account.ts` and are not part of the repo contract).

### `DynAccountRepository.create`

```ts
async create(account: Readonly<Account>): Promise<void> {
  const data = account.toData();
  try {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: data,
      ConditionExpression: "attribute_not_exists(id)",
    }));
  } catch (error) {
    // wrap, including ConditionalCheckFailedException → CREATE_FAILED
  }
}
```

### `DynAccountRepository.update`

OCC pattern, mirroring `DynTransactionRepository.update`:

```ts
async update(account: Readonly<Account>): Promise<Account> {
  const data = account.toData();
  try {
    await this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { userId: data.userId, id: data.id },
      UpdateExpression: "SET #name = :name, currency = :currency, initialBalance = :initialBalance, isArchived = :isArchived, updatedAt = :updatedAt, version = :nextVersion",
      ConditionExpression: "attribute_exists(id) AND version = :currentVersion",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: {
        ":name": data.name,
        ":currency": data.currency,
        ":initialBalance": data.initialBalance,
        ":isArchived": data.isArchived,
        ":updatedAt": data.updatedAt,
        ":currentVersion": data.version,
        ":nextVersion": data.version + 1,
      },
    }));
    return account.bumpVersion();
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      throw new VersionConflictError("Account version conflict");
    }
    throw new RepositoryError("Failed to update account", "UPDATE_FAILED", error);
  }
}
```

`VersionConflictError` already exists from PR #422.

### `DynAccountRepository.archive` — removed

Soft-deletion now flows through `update`. The repo no longer exposes `archive`.

## Service Layer

### `AccountServiceImpl`

The constitution requires auth/ownership first, cheap checks second, DB-dependent checks last. Authorization is enforced upstream by the resolver. The service runs entity invariants (cheap) before issuing any cross-entity DB query.

```ts
async createAccount(input: CreateAccountInput): Promise<Account> {
  // Cheap entity invariants run first inside Account.create.
  const account = Account.create(input);
  // DB-dependent uniqueness check after.
  await this.checkDuplicateName(account.userId, account.name);
  await this.accountRepository.create(account);
  return account;
}

async updateAccount(id: string, userId: string, input: UpdateAccountInput): Promise<Account> {
  const existing = await this.accountRepository.findOneById({ id, userId });
  if (!existing) throw new BusinessError("Account not found");

  // Cheap entity invariants run inside existing.update.
  const next = existing.update(input);

  if (input.name !== undefined && next.name !== existing.name) {
    await this.checkDuplicateName(userId, next.name, id);
  }
  if (input.currency && existing.currency !== next.currency) {
    const hasTransactions = await this.transactionRepository.hasTransactionsForAccount({ accountId: id, userId });
    if (hasTransactions) {
      throw new BusinessError(
        "Cannot change currency for account that has existing transactions. Please create a new account with the desired currency instead.",
      );
    }
  }

  return await this.accountRepository.update(next);
}

async deleteAccount(id: string, userId: string): Promise<Account> {
  const existing = await this.accountRepository.findOneById({ id, userId });
  if (!existing) throw new BusinessError("Account not found");
  return await this.accountRepository.update(existing.archive());
}
```

`getAccountsByUser` and `calculateBalance` are unchanged.

`validateName` and `validateCurrency` (private methods) are deleted — duplicated by entity invariants.

`checkDuplicateName` is unchanged. The case-insensitive comparison still works because entity-stored names are trimmed but case-preserving.

## Migration

`backend/src/migrations/YYYYMMDDHHMMSS-add-account-version.ts` — clone of `20260423093628-add-transaction-version.ts`:

- Scans `ACCOUNTS_TABLE_NAME`.
- For each item, `UpdateCommand` with `SET version = :zero`, `ConditionExpression: "attribute_not_exists(version)"` — idempotent.
- Logs scanned / updated counts.
- Registered in `backend/src/migrations/index.ts`.

Must run before code requiring `version` on reads is deployed.

## Test Strategy

### `models/account.test.ts` (new file)

`describe("Account")` with nested blocks mirroring class declaration order:

- `describe("create")` — generates id + timestamps; sets `version = 0`, `isArchived = false`; trims name; rejects too-short / too-long names; rejects unsupported currency; supports custom `clock` and `idGenerator`.
- `describe("fromPersistence")` — builds instance from `AccountData`; re-runs invariants (rejects bad name length, bad currency); preserves `id`, `version`, `createdAt`, `updatedAt`.
- `describe("update")` — applies partial changes; preserves unchanged fields; bumps `updatedAt`; preserves `version`; rejects updates on archived; trims new name; validates new currency.
- `describe("archive")` — flips `isArchived`; preserves other fields except `updatedAt`; rejects on already-archived.
- `describe("bumpVersion")` — increments `version`; preserves all other fields; skips invariants (so a name that was historically invalid does not block the version bump).
- `describe("toData")` — returns a plain object; methods are not enumerable on the result.

Test names without `should` prefix (per commit `c1c649a`).

### Fakes

`backend/src/utils/test-utils/models/account-fakes.ts`:

```ts
export const fakeAccount = (overrides: Partial<AccountData> = {}): Account => {
  const now = new Date().toISOString();
  return Account.fromPersistence({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    name: faker.finance.accountName(),
    currency: "USD",
    initialBalance: faker.number.int({ min: 0, max: 10000 }),
    isArchived: false,
    version: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
};
```

Return type stays `Account`. `overrides` parameter type changes from `Partial<Account>` to `Partial<AccountData>`.

### `dyn-account-repository.test.ts`

- `create` tests: pass `Account` instance; assert `Promise<void>`; verify item written to DynamoDB matches `account.toData()`.
- New tests for `create` with duplicate id → `ConditionalCheckFailedException` wrapped as `RepositoryError`.
- `update` tests:
  - Success: bumps `version`, updates fields, sets `updatedAt`; returned instance has `version + 1`.
  - Stale version: `VersionConflictError`.
  - Non-existent record: `VersionConflictError` (the same conditional check covers both).
- Drop `archive` tests; replace with `update` tests that pass an archived entity (`existing.archive()`) and assert the row's `isArchived = true`.

### `account-service.test.ts`

- `createAccount`: assert `repo.create` called with an `Account` instance whose fields match the input (after trimming).
- `createAccount` rejects bad name / currency before issuing DB calls (cheap-checks-first ordering).
- `updateAccount`: assert `repo.update` called with the mutated entity; OCC version flows through.
- `updateAccount` rejects bad input before issuing DB calls.
- `deleteAccount`: assert `repo.update` called with an entity whose `isArchived = true`.

### Consumer-test compile pass

Tests using `fakeAccount` continue to compile because the return type is unchanged. Spot-check call sites:

- `langchain/tools/account-dto.test.ts`
- `langchain/tools/get-accounts.test.ts`
- `langchain/tools/create-account.test.ts`
- `langchain/tools/update-account.test.ts`
- `services/transaction-service.test.ts` (uses `fakeAccount` for transaction relations)
- `services/transfer-service.test.ts`
- `services/by-category-report-service.test.ts`
- `graphql/dataloaders/account-loader.test.ts`

Any test passing a plain object literal in place of an `Account` to repository methods needs to switch to `fakeAccount({...})`.

## Out of Scope

- `Category`, `User` entity conversion.
- GraphQL schema changes — `version` is internal, not exposed to clients. `resolvers-types.ts` regeneration not required (the resolver returns `Account` fields it already exposes).
- DynamoDB table shape / GSI changes.
- `findManyWithArchivedByIds` and `findManyWithArchivedByUserId` semantics.
- Performance tuning on `fromPersistence` (invariants are two cheap synchronous checks).

## Acceptance

- `npm --prefix backend run typecheck` clean.
- `npm --prefix backend test` clean.
- `npm --prefix backend run format` clean.
- `Account` exported as a class from `backend/src/models/account.ts`.
- `AccountData`, `CreateAccountInput`, `UpdateAccountInput` exported as interfaces from `backend/src/models/account.ts`.
- `CreateAccountInput` and `UpdateAccountInput` no longer exported from `backend/src/ports/account-repository.ts`.
- `AccountRepository` interface exposes `create(account)`, `update(account)`, and the four finders. `archive` removed.
- `DynAccountRepository.create` returns `Promise<void>`.
- `DynAccountRepository.update` performs OCC and throws `VersionConflictError` on stale version.
- `AccountServiceImpl.deleteAccount` uses `entity.archive()` + `repo.update()`.
- `AccountServiceImpl.validateName` / `validateCurrency` removed.
- Migration file `YYYYMMDDHHMMSS-add-account-version.ts` exists and is registered in the migration index.
