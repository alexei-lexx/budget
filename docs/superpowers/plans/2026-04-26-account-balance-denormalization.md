# Account Balance Denormalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop computing `Account.balance` on every read by storing a denormalized `transactionBalance` field on the account row. Maintain it via a new `LedgerWriter` port that bundles transaction writes with version-checked account updates in a single cross-table DynamoDB `TransactWriteCommand`.

**Architecture:** Add `transactionBalance: number` to `AccountData` and zod schema. Add a `balance` getter (`= initialBalance + transactionBalance`) and two helpers (`increaseBalanceBySignedAmount`, `decreaseBalanceBySignedAmount`) on the `Account` entity. Introduce `LedgerWriter` port + `DynLedgerWriter` impl that takes a `{createTransactions?, updateTransactions?, updateAccounts}` payload and emits one TransactWrite. `TransactionService` and `TransferService` orchestrate fetches + balance math inline (no separate domain projection module) and call the writer once per mutation. Drop `AccountService.calculateBalance`; GraphQL resolver reads the entity getter. Backfill existing rows with a self-contained migration. Optimistic locking on both txn and account rows ensures consistency; conflicts surface via existing `handleVersionConflict` helper.

**Tech Stack:** TypeScript strict, Jest, Zod, DynamoDB (AWS SDK).

**Reference spec:** [docs/superpowers/specs/2026-04-26-account-balance-denormalization-design.md](../specs/2026-04-26-account-balance-denormalization-design.md).

**Commit policy:** Never run `git commit` as part of task execution. When a step reads "Stage changes" below, stage the listed files and stop. The user decides when to commit.

**Required skills:**

- **`jest-tests`** — every step that writes or modifies a Jest test starts with "Invoke `jest-tests` Skill via the Skill tool, then …". The Skill invocation is part of the step — it is not optional, not implicit, and not satisfied by recalling earlier guidance. **Re-invoke per step**, even if you invoked it for a previous step in the same task.

---

## File Structure

Files created:

- `backend/src/migrations/<timestamp>-add-account-transaction-balance.ts` — backfill `transactionBalance` on existing rows.
- `backend/src/ports/ledger-writer.ts` — `LedgerWriter` port + `LedgerWrite` / `LedgerWriteResult` types.
- `backend/src/repositories/dyn-ledger-writer.ts` — `DynLedgerWriter` implementation.
- `backend/src/repositories/dyn-ledger-writer.test.ts` — integration tests (DynamoDB Local).
- `backend/src/utils/test-utils/repositories/ledger-writer-mocks.ts` — `createMockLedgerWriter()`.

Files modified:

- `backend/src/models/account.ts` — adds `transactionBalance` to `AccountData`; adds `balance` getter, `increaseBalanceBySignedAmount`, `decreaseBalanceBySignedAmount`, private `updateTransactionBalance`. Round-trips field through `bumpVersion` / `archive` / `toData`.
- `backend/src/models/account.test.ts` — adds tests for new field, getter, and helpers.
- `backend/src/repositories/schemas/account.ts` — adds `transactionBalance: z.number()`.
- `backend/src/utils/test-utils/models/account-fakes.ts` — `fakeAccount` defaults `transactionBalance: 0` (overridable).
- `backend/src/ports/account-repository.ts` — adds `findOneWithArchivedById`.
- `backend/src/repositories/dyn-account-repository.ts` — implements `findOneWithArchivedById`; extracts and exports `buildUpdateAccountItem` (used by both repo internals and `DynLedgerWriter`); adds `transactionBalance` to SET list.
- `backend/src/repositories/dyn-account-repository.test.ts` — tests for `findOneWithArchivedById`; `transactionBalance` round-trip.
- `backend/src/utils/test-utils/repositories/account-repository-mocks.ts` — adds `findOneWithArchivedById` mock.
- `backend/src/repositories/dyn-transaction-repository.ts` — extracts and exports `buildCreateTransactionItem` and `buildUpdateTransactionItem`; removes `createMany` and `updateMany`.
- `backend/src/repositories/dyn-transaction-repository.test.ts` — drops `createMany` and `updateMany` test suites.
- `backend/src/ports/transaction-repository.ts` — drops `createMany` and `updateMany`.
- `backend/src/utils/test-utils/repositories/transaction-repository-mocks.ts` — drops `createMany` and `updateMany` mocks.
- `backend/src/services/transaction-service.ts` — adds `ledgerWriter` dependency; rewrites `createTransaction`, `updateTransaction`, `deleteTransaction` to bundle txn + account writes via writer.
- `backend/src/services/transaction-service.test.ts` — passes mock `LedgerWriter`; assertions check what was passed to `apply`.
- `backend/src/services/transfer-service.ts` — adds `ledgerWriter` dependency; rewrites `createTransfer`, `updateTransfer`, `deleteTransfer`.
- `backend/src/services/transfer-service.test.ts` — passes mock writer; assertions per balance scenario.
- `backend/src/services/account-service.ts` — drops `calculateBalance` from interface and impl.
- `backend/src/services/account-service.test.ts` — drops `calculateBalance` tests.
- `backend/src/graphql/resolvers/account-resolvers.ts` — `Account.balance` resolver reads parent entity's `balance` getter (no service call).
- `backend/src/graphql/resolvers/account-resolvers.test.ts` — adapt accordingly (if such a test exists; otherwise no change).
- `backend/src/dependencies.ts` — wires `DynLedgerWriter` singleton; injects into `TransactionService` and `TransferService`.
- `backend/src/migrations/index.ts` — registers the new migration.

Files unaffected (mentioned for confidence):

- `backend/src/models/transaction.ts` — already exposes `signedAmount` getter; nothing changes here.
- All `langchain/tools/*` and reports — consume entities; the new `balance` getter is a drop-in for code that reads the field.

---

## Task 1: Add `add-account-transaction-balance` migration

**Files:**
- Create: `backend/src/migrations/<timestamp>-add-account-transaction-balance.ts`
- Modify: `backend/src/migrations/index.ts`

The migration is self-contained (no project imports beyond `requireEnv` + AWS SDK), idempotent, and independent of the entity refactor. Land it first so deploys can roll forward.

- [ ] **Step 1: Pick the timestamp**

Use `YYYYMMDDHHMMSS` for the current UTC moment. Example: `20260426120000-add-account-transaction-balance.ts`. Replace `<timestamp>` below with that value.

- [ ] **Step 2: Create the migration file**

Create `backend/src/migrations/<timestamp>-add-account-transaction-balance.ts` with:

```ts
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { requireEnv } from "../utils/require-env";

/**
 * Backfills `transactionBalance` on every Account row.
 * For each account, sums signedAmount over its non-archived transactions.
 * Idempotent: `attribute_not_exists(transactionBalance)` guards against re-application.
 * Must run before code that requires `transactionBalance` on reads is deployed.
 */

// Type→sign mapping inlined; frozen at migration time.
const POSITIVE_TYPES = new Set(["INCOME", "REFUND", "TRANSFER_IN"]);

function signedAmount(type: string, amount: number): number {
  return POSITIVE_TYPES.has(type) ? amount : -amount;
}

export async function up(client: DynamoDBClient): Promise<void> {
  const accountsTable = requireEnv("ACCOUNTS_TABLE_NAME");
  const transactionsTable = requireEnv("TRANSACTIONS_TABLE_NAME");
  const docClient = DynamoDBDocumentClient.from(client);

  let scannedAccounts = 0;
  let backfilledAccounts = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log(
    "Starting migration: backfilling transactionBalance on accounts",
  );

  do {
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: accountsTable,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const accounts = scanResult.Items ?? [];
    scannedAccounts += accounts.length;

    for (const account of accounts) {
      // Sum signedAmount of non-archived transactions for this account.
      let sum = 0;
      let txKey: Record<string, unknown> | undefined;
      do {
        const txResult = await docClient.send(
          new QueryCommand({
            TableName: transactionsTable,
            KeyConditionExpression: "userId = :uid",
            FilterExpression: "accountId = :aid AND isArchived = :false",
            ExpressionAttributeValues: {
              ":uid": account.userId,
              ":aid": account.id,
              ":false": false,
            },
            ExclusiveStartKey: txKey,
          }),
        );
        for (const t of txResult.Items ?? []) {
          sum += signedAmount(t.type as string, t.amount as number);
        }
        txKey = txResult.LastEvaluatedKey;
      } while (txKey);

      try {
        await docClient.send(
          new UpdateCommand({
            TableName: accountsTable,
            Key: { userId: account.userId, id: account.id },
            UpdateExpression: "SET transactionBalance = :sum",
            ConditionExpression: "attribute_not_exists(transactionBalance)",
            ExpressionAttributeValues: { ":sum": sum },
          }),
        );
        backfilledAccounts++;
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) continue;
        throw error;
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(
    `Migration completed: scanned ${scannedAccounts} accounts, backfilled ${backfilledAccounts}`,
  );
}
```

- [ ] **Step 3: Register the migration**

Open `backend/src/migrations/index.ts`. Find the array of migrations (similar entries already present). Add the import and array entry for the new migration in chronological order. Match the surrounding style exactly (e.g. `{ name: "<timestamp>-add-account-transaction-balance", up }`).

- [ ] **Step 4: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 5: Stage changes**

```bash
git add backend/src/migrations/<timestamp>-add-account-transaction-balance.ts backend/src/migrations/index.ts
```
Stop. Do not commit.

---

## Task 2: Account model — add `transactionBalance` field (round-trip only)

**Files:**
- Modify: `backend/src/models/account.ts`
- Modify: `backend/src/repositories/schemas/account.ts`
- Modify: `backend/src/utils/test-utils/models/account-fakes.ts`
- Modify: `backend/src/models/account.test.ts`

This task **only** adds the field — `AccountData`, zod, fakes, and round-trip through `Account.create / fromPersistence / archive / bumpVersion / toData / update`. Helpers/getter come in Task 3.

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then add a failing test for `transactionBalance` field round-trip**

Open `backend/src/models/account.test.ts`. Add a new test inside `describe("Account", () => { ... })`:

```ts
describe("transactionBalance field", () => {
  it("create() defaults transactionBalance to 0", () => {
    const account = Account.create(fakeCreateAccountInput());
    expect(account.transactionBalance).toBe(0);
  });

  it("fromPersistence() round-trips transactionBalance", () => {
    const account = fakeAccount({ transactionBalance: 123 });
    expect(account.toData().transactionBalance).toBe(123);
  });

  it("bumpVersion() preserves transactionBalance", () => {
    const account = fakeAccount({ transactionBalance: 50, version: 3 });
    const bumped = account.bumpVersion();
    expect(bumped.transactionBalance).toBe(50);
    expect(bumped.version).toBe(4);
  });

  it("archive() preserves transactionBalance", () => {
    const account = fakeAccount({ transactionBalance: 42, isArchived: false });
    const archived = account.archive();
    expect(archived.transactionBalance).toBe(42);
    expect(archived.isArchived).toBe(true);
  });

  it("update() preserves transactionBalance when only public fields change", () => {
    const account = fakeAccount({ transactionBalance: 77, name: "old" });
    const updated = account.update({ name: "new" });
    expect(updated.transactionBalance).toBe(77);
    expect(updated.name).toBe("new");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- account.test.ts -t "transactionBalance field"`
Expected: FAIL — `transactionBalance` does not exist on `AccountData` (typecheck error before test runs).

- [ ] **Step 3: Add `transactionBalance` to `AccountData` interface**

In `backend/src/models/account.ts`, add a field to `AccountData`:

```ts
export interface AccountData {
  userId: string;
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
  transactionBalance: number;
  isArchived: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Add `readonly transactionBalance` to the `Account` class**

Below `readonly initialBalance: number;`, add:

```ts
readonly transactionBalance: number;
```

In the constructor body, after `this.initialBalance = data.initialBalance;`, add:

```ts
this.transactionBalance = data.transactionBalance;
```

- [ ] **Step 5: Default `transactionBalance: 0` in `Account.create()`**

In the `Account.create` static method, where the `data` literal is built, add `transactionBalance: 0` alongside `initialBalance: input.initialBalance`:

```ts
const data: AccountData = {
  id: idGenerator(),
  userId: input.userId,
  name: normalizeAccountName(input.name),
  currency: input.currency,
  initialBalance: input.initialBalance,
  transactionBalance: 0,
  isArchived: false,
  version: 0,
  createdAt: now,
  updatedAt: now,
};
```

- [ ] **Step 6: Round-trip `transactionBalance` in `toData()`**

Update `toData()`:

```ts
toData(): AccountData {
  return {
    userId: this.userId,
    id: this.id,
    name: this.name,
    currency: this.currency,
    initialBalance: this.initialBalance,
    transactionBalance: this.transactionBalance,
    isArchived: this.isArchived,
    version: this.version,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
}
```

- [ ] **Step 7: Carry `transactionBalance` through `archive()`**

Update `archive()`'s data literal:

```ts
const data: AccountData = {
  userId: this.userId,
  id: this.id,
  name: this.name,
  currency: this.currency,
  initialBalance: this.initialBalance,
  transactionBalance: this.transactionBalance,
  isArchived: true,
  version: this.version,
  createdAt: this.createdAt,
  updatedAt: now,
};
```

(`bumpVersion()` and `update()` already build via `...this.toData()` spread, so they pick up `transactionBalance` automatically once `toData()` returns it.)

- [ ] **Step 8: Add `transactionBalance` to zod schema**

Open `backend/src/repositories/schemas/account.ts`:

```ts
import { z } from "zod";
import type { AccountData } from "../../models/account";

export const accountDataSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().min(1),
  currency: z.string().length(3).uppercase(),
  initialBalance: z.number(),
  transactionBalance: z.number(),
  isArchived: z.boolean(),
  version: z.int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<AccountData>;
```

- [ ] **Step 9: Update `fakeAccount` to default `transactionBalance: 0`**

In `backend/src/utils/test-utils/models/account-fakes.ts`, add `transactionBalance: 0` to the literal passed to `Account.fromPersistence`:

```ts
return Account.fromPersistence({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  name: faker.finance.accountName(),
  currency: faker.helpers.arrayElement(["EUR", "USD"]),
  initialBalance: faker.number.int({ min: 0, max: 10000 }),
  transactionBalance: 0,
  isArchived: false,
  version: faker.number.int({ min: 1, max: 100 }),
  createdAt: now,
  updatedAt: now,
  ...overrides,
});
```

- [ ] **Step 10: Invoke `jest-tests` Skill via the Skill tool, then re-run the new tests to verify they pass**

Run: `cd backend && npm test -- account.test.ts -t "transactionBalance field"`
Expected: PASS (all 5 tests).

- [ ] **Step 11: Invoke `jest-tests` Skill via the Skill tool, then run the entire backend suite to confirm no regressions**

Run: `cd backend && npm test`
Expected: PASS for all suites. (Some pre-existing tests may explicitly assert `toData()` equals a literal; if any fail because the expected literal lacks `transactionBalance`, add `transactionBalance: 0` to that literal — do not change runtime behavior.)

- [ ] **Step 12: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 13: Stage changes**

```bash
git add backend/src/models/account.ts backend/src/models/account.test.ts backend/src/repositories/schemas/account.ts backend/src/utils/test-utils/models/account-fakes.ts
```
Stop. Do not commit.

---

## Task 3: Account model — `balance` getter and balance helpers

**Files:**
- Modify: `backend/src/models/account.ts`
- Modify: `backend/src/models/account.test.ts`

Adds the read-side getter and the two write-side helpers (`increaseBalanceBySignedAmount`, `decreaseBalanceBySignedAmount`) that produce a new `Account` with adjusted `transactionBalance`. Helpers do NOT call `update()` — they bypass the archived-account check (txn-driven balance moves are legal on archived accounts) and skip invariant assertions.

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then add failing tests for `balance` getter and helpers**

Open `backend/src/models/account.test.ts`. Add a new `describe`:

```ts
describe("balance getter and helpers", () => {
  it("balance getter returns initialBalance + transactionBalance", () => {
    const account = fakeAccount({ initialBalance: 100, transactionBalance: 50 });
    expect(account.balance).toBe(150);
  });

  it("balance getter handles negative transactionBalance", () => {
    const account = fakeAccount({ initialBalance: 100, transactionBalance: -30 });
    expect(account.balance).toBe(70);
  });

  it("increaseBalanceBySignedAmount returns new entity with adjusted transactionBalance", () => {
    const account = fakeAccount({ transactionBalance: 100 });
    const result = account.increaseBalanceBySignedAmount(25);
    expect(result.transactionBalance).toBe(125);
  });

  it("increaseBalanceBySignedAmount with negative delta decreases", () => {
    const account = fakeAccount({ transactionBalance: 100 });
    const result = account.increaseBalanceBySignedAmount(-30);
    expect(result.transactionBalance).toBe(70);
  });

  it("decreaseBalanceBySignedAmount returns new entity with subtracted transactionBalance", () => {
    const account = fakeAccount({ transactionBalance: 100 });
    const result = account.decreaseBalanceBySignedAmount(40);
    expect(result.transactionBalance).toBe(60);
  });

  it("decreaseBalanceBySignedAmount with negative delta increases", () => {
    const account = fakeAccount({ transactionBalance: 100 });
    const result = account.decreaseBalanceBySignedAmount(-30);
    expect(result.transactionBalance).toBe(130);
  });

  it("helpers do not bump version (writer bumps on persist)", () => {
    const account = fakeAccount({ transactionBalance: 0, version: 5 });
    const r1 = account.increaseBalanceBySignedAmount(10);
    const r2 = account.decreaseBalanceBySignedAmount(10);
    expect(r1.version).toBe(5);
    expect(r2.version).toBe(5);
  });

  it("helpers bump updatedAt", () => {
    const account = fakeAccount({
      transactionBalance: 0,
      updatedAt: "2000-01-01T00:00:00.000Z",
    });
    const result = account.increaseBalanceBySignedAmount(10);
    expect(result.updatedAt).not.toBe("2000-01-01T00:00:00.000Z");
  });

  it("helpers work on archived accounts (no archived-check)", () => {
    const account = fakeAccount({
      transactionBalance: 100,
      isArchived: true,
    });
    expect(() => account.decreaseBalanceBySignedAmount(20)).not.toThrow();
    const result = account.decreaseBalanceBySignedAmount(20);
    expect(result.transactionBalance).toBe(80);
    expect(result.isArchived).toBe(true);
  });

  it("chaining decrease then increase produces correct combined value", () => {
    const account = fakeAccount({ transactionBalance: 100 });
    const result = account
      .decreaseBalanceBySignedAmount(30)
      .increaseBalanceBySignedAmount(50);
    expect(result.transactionBalance).toBe(120);
  });

  it("update() still throws on archived for user-driven fields", () => {
    const account = fakeAccount({ isArchived: true });
    expect(() => account.update({ name: "new" })).toThrow(/archived/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- account.test.ts -t "balance getter and helpers"`
Expected: FAIL (typecheck errors — `balance`, `increaseBalanceBySignedAmount`, `decreaseBalanceBySignedAmount` not defined on `Account`).

- [ ] **Step 3: Add `balance` getter, `updateTransactionBalance` private helper, and the two public helpers**

In `backend/src/models/account.ts`, inside the `Account` class, after `archive()` and before `private constructor(...)`, add:

```ts
get balance(): number {
  return this.initialBalance + this.transactionBalance;
}

increaseBalanceBySignedAmount(delta: number): Account {
  return this.updateTransactionBalance(this.transactionBalance + delta);
}

decreaseBalanceBySignedAmount(delta: number): Account {
  return this.updateTransactionBalance(this.transactionBalance - delta);
}

private updateTransactionBalance(
  newValue: number,
  { clock = defaultClock }: { clock?: () => Date } = {},
): Account {
  const data: AccountData = {
    ...this.toData(),
    transactionBalance: newValue,
    updatedAt: clock().toISOString(),
  };
  // Skip invariant assertions — only transactionBalance / updatedAt change.
  // Skip the archived check — txn-driven balance moves are legal on archived accounts.
  return new Account(data, { skipInvariants: true });
}
```

- [ ] **Step 4: Invoke `jest-tests` Skill via the Skill tool, then re-run the tests to verify they pass**

Run: `cd backend && npm test -- account.test.ts -t "balance getter and helpers"`
Expected: PASS (all tests).

- [ ] **Step 5: Invoke `jest-tests` Skill via the Skill tool, then run the entire backend suite**

Run: `cd backend && npm test`
Expected: PASS — full backend suite still green.

- [ ] **Step 6: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 7: Stage changes**

```bash
git add backend/src/models/account.ts backend/src/models/account.test.ts
```
Stop. Do not commit.

---

## Task 4: `AccountRepository.findOneWithArchivedById`

**Files:**
- Modify: `backend/src/ports/account-repository.ts`
- Modify: `backend/src/repositories/dyn-account-repository.ts`
- Modify: `backend/src/repositories/dyn-account-repository.test.ts`
- Modify: `backend/src/utils/test-utils/repositories/account-repository-mocks.ts`

Adds a singular fetch that returns archived rows (used by txn update/delete flows that must adjust an archived account's `transactionBalance`).

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then add failing tests for `findOneWithArchivedById`**

Open `backend/src/repositories/dyn-account-repository.test.ts`. Find the existing `describe("findOneById", ...)` block; add a sibling block after it:

```ts
describe("findOneWithArchivedById", () => {
  it("returns the account when active", async () => {
    const account = fakeAccount({ isArchived: false });
    await repository.create(account);

    const result = await repository.findOneWithArchivedById({
      id: account.id,
      userId: account.userId,
    });

    expect(result?.id).toBe(account.id);
    expect(result?.isArchived).toBe(false);
  });

  it("returns the account when archived", async () => {
    const account = fakeAccount({ isArchived: false });
    await repository.create(account);
    await repository.update(account.archive());

    const result = await repository.findOneWithArchivedById({
      id: account.id,
      userId: account.userId,
    });

    expect(result?.id).toBe(account.id);
    expect(result?.isArchived).toBe(true);
  });

  it("returns null when missing", async () => {
    const result = await repository.findOneWithArchivedById({
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
    });
    expect(result).toBeNull();
  });

  it("throws when id is empty", async () => {
    await expect(
      repository.findOneWithArchivedById({
        id: "",
        userId: faker.string.uuid(),
      }),
    ).rejects.toThrow();
  });

  it("throws when userId is empty", async () => {
    await expect(
      repository.findOneWithArchivedById({
        id: faker.string.uuid(),
        userId: "",
      }),
    ).rejects.toThrow();
  });
});
```

(If `faker` and helpers aren't already imported in the file, leave existing imports alone — they should be there from sibling tests.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- dyn-account-repository.test.ts -t "findOneWithArchivedById"`
Expected: FAIL — `findOneWithArchivedById` does not exist.

- [ ] **Step 3: Declare `findOneWithArchivedById` in the port**

In `backend/src/ports/account-repository.ts`, add the method to the `AccountRepository` interface:

```ts
import { Account } from "../models/account";

export interface AccountRepository {
  findOneById(selector: {
    id: string;
    userId: string;
  }): Promise<Account | null>;
  findOneWithArchivedById(selector: {
    id: string;
    userId: string;
  }): Promise<Account | null>;
  findManyByUserId(userId: string): Promise<Account[]>;
  findManyWithArchivedByIds(selector: {
    ids: readonly string[];
    userId: string;
  }): Promise<Account[]>;
  findManyWithArchivedByUserId(userId: string): Promise<Account[]>;
  create(account: Readonly<Account>): Promise<void>;
  update(account: Readonly<Account>): Promise<Account>;
}
```

- [ ] **Step 4: Implement `findOneWithArchivedById` in `DynAccountRepository`**

In `backend/src/repositories/dyn-account-repository.ts`, add the method after `findOneById` (model the body on existing `findOneById`, but skip the archived filter):

```ts
async findOneWithArchivedById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Account | null> {
  if (!id) {
    throw new RepositoryError("Account ID is required", "INVALID_PARAMETERS");
  }

  if (!userId) {
    throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
  }

  try {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { userId, id },
    });

    const result = await this.client.send(command);

    if (!result.Item) {
      return null;
    }

    const data = hydrate(accountDataSchema, result.Item);
    return Account.fromPersistence(data);
  } catch (error) {
    console.error("Error finding account by ID (with archived):", error);
    throw new RepositoryError(
      "Failed to find account",
      "GET_FAILED",
      error,
    );
  }
}
```

- [ ] **Step 5: Add `findOneWithArchivedById` to the mock factory**

In `backend/src/utils/test-utils/repositories/account-repository-mocks.ts`:

```ts
import { jest } from "@jest/globals";
import { AccountRepository } from "../../../ports/account-repository";

export const createMockAccountRepository =
  (): jest.Mocked<AccountRepository> => ({
    findManyByUserId: jest.fn(),
    findManyWithArchivedByUserId: jest.fn(),
    findOneById: jest.fn(),
    findOneWithArchivedById: jest.fn(),
    findManyWithArchivedByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  });
```

- [ ] **Step 6: Invoke `jest-tests` Skill via the Skill tool, then re-run the new tests to verify they pass**

Run: `cd backend && npm test -- dyn-account-repository.test.ts -t "findOneWithArchivedById"`
Expected: PASS.

- [ ] **Step 7: Invoke `jest-tests` Skill via the Skill tool, then run the full backend suite**

Run: `cd backend && npm test`
Expected: PASS — no regressions.

- [ ] **Step 8: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 9: Stage changes**

```bash
git add backend/src/ports/account-repository.ts backend/src/repositories/dyn-account-repository.ts backend/src/repositories/dyn-account-repository.test.ts backend/src/utils/test-utils/repositories/account-repository-mocks.ts
```
Stop. Do not commit.

---

## Task 5: `DynAccountRepository.update` — include `transactionBalance` and extract `buildUpdateAccountItem`

**Files:**
- Modify: `backend/src/repositories/dyn-account-repository.ts`
- Modify: `backend/src/repositories/dyn-account-repository.test.ts`

Extract the SET expression assembly into an exported pure function `buildUpdateAccountItem(account, tableName)` that returns a `{ Update: {...} }` TransactWriteItem. The repo's `update` method calls it (wrapping in single-item `UpdateCommand`). `transactionBalance` is added to the SET list.

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then add a failing test for `transactionBalance` round-trip through repo**

Open `backend/src/repositories/dyn-account-repository.test.ts`. Inside the existing `describe("update", ...)` block (or add one if absent), add:

```ts
it("persists transactionBalance changes", async () => {
  const account = fakeAccount({ transactionBalance: 0 });
  await repository.create(account);

  // Simulate a balance helper having produced a new entity:
  const adjusted = account.increaseBalanceBySignedAmount(123);

  const result = await repository.update(adjusted);

  expect(result.transactionBalance).toBe(123);
  expect(result.version).toBe(account.version + 1);

  const fetched = await repository.findOneById({
    id: account.id,
    userId: account.userId,
  });
  expect(fetched?.transactionBalance).toBe(123);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- dyn-account-repository.test.ts -t "persists transactionBalance"`
Expected: FAIL — current `update()` does not include `transactionBalance` in the SET expression, so the field stays at 0 in storage.

- [ ] **Step 3: Add and export `buildUpdateAccountItem`**

In `backend/src/repositories/dyn-account-repository.ts`, after the imports and before the class, add:

```ts
import type { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";

type UpdateTransactWriteItem = NonNullable<
  TransactWriteCommandInput["TransactItems"]
>[number] & { Update: NonNullable<unknown> };

export function buildUpdateAccountItem(
  account: Readonly<Account>,
  tableName: string,
): UpdateTransactWriteItem {
  const data = account.toData();
  const setParts = [
    "#name = :name",
    "currency = :currency",
    "initialBalance = :initialBalance",
    "transactionBalance = :transactionBalance",
    "isArchived = :isArchived",
    "updatedAt = :updatedAt",
    "version = :nextVersion",
  ];

  return {
    Update: {
      TableName: tableName,
      Key: { userId: data.userId, id: data.id },
      UpdateExpression: `SET ${setParts.join(", ")}`,
      ConditionExpression:
        "attribute_exists(userId) AND attribute_exists(id) AND version = :currentVersion",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: {
        ":name": data.name,
        ":currency": data.currency,
        ":initialBalance": data.initialBalance,
        ":transactionBalance": data.transactionBalance,
        ":isArchived": data.isArchived,
        ":updatedAt": data.updatedAt,
        ":currentVersion": data.version,
        ":nextVersion": data.version + 1,
      },
    },
  };
}
```

- [ ] **Step 4: Refactor `DynAccountRepository.update()` to use the builder**

Replace the body of `update()` with:

```ts
async update(account: Readonly<Account>): Promise<Account> {
  const item = buildUpdateAccountItem(account, this.tableName);

  try {
    const command = new UpdateCommand({
      TableName: item.Update.TableName,
      Key: item.Update.Key,
      UpdateExpression: item.Update.UpdateExpression,
      ConditionExpression: item.Update.ConditionExpression,
      ExpressionAttributeNames: item.Update.ExpressionAttributeNames,
      ExpressionAttributeValues: item.Update.ExpressionAttributeValues,
    });

    await this.client.send(command);
    return account.bumpVersion();
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new VersionConflictError(error);
    }

    console.error("Error updating account:", error);
    throw new RepositoryError(
      "Failed to update account",
      "UPDATE_FAILED",
      error,
    );
  }
}
```

- [ ] **Step 5: Invoke `jest-tests` Skill via the Skill tool, then re-run the new test to verify it passes**

Run: `cd backend && npm test -- dyn-account-repository.test.ts -t "persists transactionBalance"`
Expected: PASS.

- [ ] **Step 6: Invoke `jest-tests` Skill via the Skill tool, then run all account-repo tests**

Run: `cd backend && npm test -- dyn-account-repository.test.ts`
Expected: PASS — existing `update` tests still green; the SET-expression refactor preserves behavior.

- [ ] **Step 7: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 8: Stage changes**

```bash
git add backend/src/repositories/dyn-account-repository.ts backend/src/repositories/dyn-account-repository.test.ts
```
Stop. Do not commit.

---

## Task 6: `DynTransactionRepository` — extract `buildCreateTransactionItem` and `buildUpdateTransactionItem`

**Files:**
- Modify: `backend/src/repositories/dyn-transaction-repository.ts`

Pure refactor. No behavior change. The existing `buildUpdateParams` private method becomes the exported `buildUpdateTransactionItem` returning a `{ Update: {...} }` shape. Add a sibling `buildCreateTransactionItem` for Puts. Internal `create` and `update` call them. `createMany` / `updateMany` will be removed in Task 10 (don't touch them yet — services still depend on them).

- [ ] **Step 1: Add `buildCreateTransactionItem` and `buildUpdateTransactionItem` exports**

In `backend/src/repositories/dyn-transaction-repository.ts`, after the imports and helper functions and before the class:

```ts
import type { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";

type PutTransactWriteItem = NonNullable<
  TransactWriteCommandInput["TransactItems"]
>[number] & { Put: NonNullable<unknown> };

type UpdateTransactWriteItem = NonNullable<
  TransactWriteCommandInput["TransactItems"]
>[number] & { Update: NonNullable<unknown> };

export function buildCreateTransactionItem(
  transaction: Readonly<Transaction>,
  tableName: string,
): PutTransactWriteItem {
  const dbItem = toTransactionDbItemForCreate(transaction);
  return {
    Put: {
      TableName: tableName,
      Item: dbItem,
      ConditionExpression: "attribute_not_exists(id)",
    },
  };
}

export function buildUpdateTransactionItem(
  transaction: Readonly<Transaction>,
  tableName: string,
): UpdateTransactWriteItem {
  const setParts: string[] = [
    "accountId = :accountId",
    "#type = :type",
    "amount = :amount",
    "currency = :currency",
    "#date = :date",
    "isArchived = :isArchived",
    "version = :newVersion",
    "createdAt = :createdAt",
    "updatedAt = :updatedAt",
  ];
  const removeParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {
    "#type": "type",
    "#date": "date",
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ":accountId": transaction.accountId,
    ":type": transaction.type,
    ":amount": transaction.amount,
    ":currency": transaction.currency,
    ":date": transaction.date,
    ":isArchived": transaction.isArchived,
    ":expectedVersion": transaction.version,
    ":newVersion": transaction.version + 1,
    ":createdAt": transaction.createdAt,
    ":updatedAt": transaction.updatedAt,
  };

  if (transaction.categoryId !== undefined) {
    setParts.push("categoryId = :categoryId");
    expressionAttributeValues[":categoryId"] = transaction.categoryId;
  } else {
    removeParts.push("categoryId");
  }

  if (transaction.description !== undefined) {
    setParts.push("description = :description");
    expressionAttributeValues[":description"] = transaction.description;
  } else {
    removeParts.push("description");
  }

  if (transaction.transferId !== undefined) {
    setParts.push("transferId = :transferId");
    expressionAttributeValues[":transferId"] = transaction.transferId;
  } else {
    removeParts.push("transferId");
  }

  const updateExpressionParts: string[] = [`SET ${setParts.join(", ")}`];
  if (removeParts.length > 0) {
    updateExpressionParts.push(`REMOVE ${removeParts.join(", ")}`);
  }

  return {
    Update: {
      TableName: tableName,
      Key: { userId: transaction.userId, id: transaction.id },
      UpdateExpression: updateExpressionParts.join(" "),
      ConditionExpression:
        "attribute_exists(userId) AND attribute_exists(id) AND version = :expectedVersion",
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    },
  };
}
```

- [ ] **Step 2: Refactor `DynTransactionRepository.create()` to use `buildCreateTransactionItem`**

Replace the existing `create()` body's PutCommand assembly with:

```ts
async create(transaction: Readonly<Transaction>): Promise<void> {
  try {
    const item = buildCreateTransactionItem(transaction, this.tableName);
    const command = new PutCommand({
      TableName: item.Put.TableName,
      Item: item.Put.Item,
      ConditionExpression: item.Put.ConditionExpression,
    });
    await this.client.send(command);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new RepositoryError(
        "Transaction with this ID already exists",
        "CREATE_FAILED",
      );
    }
    console.error("Error creating transaction:", error);
    throw new RepositoryError(
      "Failed to create transaction",
      "CREATE_FAILED",
      error,
    );
  }
}
```

- [ ] **Step 3: Refactor `DynTransactionRepository.update()` to use `buildUpdateTransactionItem`**

Replace the body of `update()` with:

```ts
async update(transaction: Readonly<Transaction>): Promise<Transaction> {
  const item = buildUpdateTransactionItem(transaction, this.tableName);

  try {
    const command = new UpdateCommand({
      TableName: item.Update.TableName,
      Key: item.Update.Key,
      UpdateExpression: item.Update.UpdateExpression,
      ConditionExpression: item.Update.ConditionExpression,
      ExpressionAttributeNames: item.Update.ExpressionAttributeNames,
      ExpressionAttributeValues: item.Update.ExpressionAttributeValues,
      ReturnValuesOnConditionCheckFailure: "ALL_OLD",
    });
    await this.client.send(command);
    return transaction.bumpVersion();
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      if (error.Item) {
        throw new VersionConflictError(error);
      }
      throw new RepositoryError("Transaction not found", "NOT_FOUND", error);
    }

    throw new RepositoryError(
      "Failed to update transaction",
      "UPDATE_FAILED",
      error,
    );
  }
}
```

- [ ] **Step 4: Delete the now-unused private `buildUpdateParams` method**

If a private `buildUpdateParams` (or similar) remains and is no longer referenced, remove it. `createMany` / `updateMany` may still reference it; if so, leave it for now and it will be removed in Task 10 along with those methods.

- [ ] **Step 5: Invoke `jest-tests` Skill via the Skill tool, then run all transaction-repo tests**

Run: `cd backend && npm test -- dyn-transaction-repository.test.ts`
Expected: PASS — existing tests cover `create`, `update`, `createMany`, `updateMany`. The refactor is behavior-preserving.

- [ ] **Step 6: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 7: Stage changes**

```bash
git add backend/src/repositories/dyn-transaction-repository.ts
```
Stop. Do not commit.

---

## Task 7: `LedgerWriter` port

**Files:**
- Create: `backend/src/ports/ledger-writer.ts`

Port-only task. Implementation in Task 8. Mock in Task 9.

- [ ] **Step 1: Create the port file**

Create `backend/src/ports/ledger-writer.ts`:

```ts
import { Account } from "../models/account";
import { Transaction } from "../models/transaction";

export interface LedgerWrite {
  /**
   * Transactions to insert with attribute_not_exists(id).
   * Caller passes freshly-built Transactions (version === 0).
   */
  createTransactions?: readonly Transaction[];

  /**
   * Transactions to update with version-checked condition.
   * Caller passes the Transaction carrying the EXPECTED version (the version they read).
   */
  updateTransactions?: readonly Transaction[];

  /**
   * Accounts to update with version-checked condition. May be empty for
   * metadata-only transaction updates that do not affect balance.
   * Caller passes Account entities with `transactionBalance` already adjusted
   * via `Account.increaseBalanceBySignedAmount` / `decreaseBalanceBySignedAmount`.
   */
  updateAccounts: readonly Account[];
}

export interface LedgerWriteResult {
  createdTransactions: Transaction[]; // mirrors input order; version unchanged (was 0)
  updatedTransactions: Transaction[]; // mirrors input order; bumped (version + 1)
  updatedAccounts: Account[]; // mirrors input order; bumped (version + 1)
}

export interface LedgerWriter {
  apply(write: LedgerWrite): Promise<LedgerWriteResult>;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Stage changes**

```bash
git add backend/src/ports/ledger-writer.ts
```
Stop. Do not commit.

---

## Task 8: `DynLedgerWriter` implementation

**Files:**
- Create: `backend/src/repositories/dyn-ledger-writer.ts`
- Create: `backend/src/repositories/dyn-ledger-writer.test.ts`

The implementation imports the three builders extracted in Tasks 5 and 6. Error mapping is inline — `TransactionCanceledException` reasons distinguish version conflict (`Item` present) from missing-row / duplicate-id (`Item` absent).

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then add a failing test for the create-transaction + account-update flow**

Create `backend/src/repositories/dyn-ledger-writer.test.ts`. Use the existing repo integration-test pattern (DynamoDB Local / `jest.config.integration.json`). Sketch:

```ts
import { describe, expect, it, beforeEach } from "@jest/globals";
import { DynLedgerWriter } from "./dyn-ledger-writer";
import { DynAccountRepository } from "./dyn-account-repository";
import { DynTransactionRepository } from "./dyn-transaction-repository";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { Transaction, TransactionType } from "../models/transaction";
import { VersionConflictError } from "../ports/repository-error";
import { requireEnv } from "../utils/require-env";

describe("DynLedgerWriter (integration)", () => {
  let writer: DynLedgerWriter;
  let accountRepo: DynAccountRepository;
  let transactionRepo: DynTransactionRepository;

  beforeEach(() => {
    accountRepo = new DynAccountRepository(requireEnv("ACCOUNTS_TABLE_NAME"));
    transactionRepo = new DynTransactionRepository(
      requireEnv("TRANSACTIONS_TABLE_NAME"),
    );
    writer = new DynLedgerWriter({
      accountsTableName: requireEnv("ACCOUNTS_TABLE_NAME"),
      transactionsTableName: requireEnv("TRANSACTIONS_TABLE_NAME"),
    });
  });

  it("creates a transaction and updates the account atomically", async () => {
    const account = fakeAccount({ transactionBalance: 0 });
    await accountRepo.create(account);

    const transaction = fakeTransaction({
      accountId: account.id,
      userId: account.userId,
      amount: 50,
      type: TransactionType.INCOME,
    }) as Transaction;
    const updatedAccount = account.increaseBalanceBySignedAmount(
      transaction.signedAmount,
    );

    const result = await writer.apply({
      createTransactions: [transaction],
      updateAccounts: [updatedAccount],
    });

    expect(result.createdTransactions[0].id).toBe(transaction.id);
    expect(result.updatedAccounts[0].version).toBe(account.version + 1);

    const persisted = await accountRepo.findOneById({
      id: account.id,
      userId: account.userId,
    });
    expect(persisted?.transactionBalance).toBe(50);
  });
});
```

(Add additional test cases in subsequent steps; this first one drives the minimal happy-path implementation.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npm run test:integration -- dyn-ledger-writer.test.ts`
Expected: FAIL — `dyn-ledger-writer.ts` does not exist.

- [ ] **Step 3: Create `DynLedgerWriter`**

Create `backend/src/repositories/dyn-ledger-writer.ts`:

```ts
import {
  DynamoDBClient,
  TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { Account } from "../models/account";
import { Transaction } from "../models/transaction";
import {
  LedgerWrite,
  LedgerWriteResult,
  LedgerWriter,
} from "../ports/ledger-writer";
import {
  RepositoryError,
  VersionConflictError,
} from "../ports/repository-error";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import {
  buildUpdateAccountItem,
} from "./dyn-account-repository";
import {
  buildCreateTransactionItem,
  buildUpdateTransactionItem,
} from "./dyn-transaction-repository";

export class DynLedgerWriter implements LedgerWriter {
  private readonly client: DynamoDBDocumentClient;
  private readonly accountsTableName: string;
  private readonly transactionsTableName: string;

  constructor(args: {
    accountsTableName: string;
    transactionsTableName: string;
    dynamoClient?: DynamoDBClient;
  }) {
    if (!args.accountsTableName) {
      throw new RepositoryError(
        "accountsTableName is required",
        "MISSING_TABLE_NAME",
      );
    }
    if (!args.transactionsTableName) {
      throw new RepositoryError(
        "transactionsTableName is required",
        "MISSING_TABLE_NAME",
      );
    }
    this.client = createDynamoDBDocumentClient(args.dynamoClient);
    this.accountsTableName = args.accountsTableName;
    this.transactionsTableName = args.transactionsTableName;
  }

  async apply(write: LedgerWrite): Promise<LedgerWriteResult> {
    const createTxns: readonly Transaction[] = write.createTransactions ?? [];
    const updateTxns: readonly Transaction[] = write.updateTransactions ?? [];
    const updateAccs: readonly Account[] = write.updateAccounts;

    const transactItems: NonNullable<
      TransactWriteCommandInput["TransactItems"]
    > = [
      ...createTxns.map((t) =>
        buildCreateTransactionItem(t, this.transactionsTableName),
      ),
      ...updateTxns.map((t) =>
        buildUpdateTransactionItem(t, this.transactionsTableName),
      ),
      ...updateAccs.map((a) =>
        buildUpdateAccountItem(a, this.accountsTableName),
      ),
    ];

    if (transactItems.length === 0) {
      throw new RepositoryError(
        "LedgerWriter.apply called with no items",
        "INVALID_PARAMETERS",
      );
    }

    try {
      await this.client.send(
        new TransactWriteCommand({ TransactItems: transactItems }),
      );
    } catch (error) {
      throw mapTransactWriteError(error);
    }

    return {
      createdTransactions: [...createTxns],
      updatedTransactions: updateTxns.map((t) => t.bumpVersion()),
      updatedAccounts: updateAccs.map((a) => a.bumpVersion()),
    };
  }
}

function mapTransactWriteError(error: unknown): Error {
  if (error instanceof TransactionCanceledException) {
    const reasons = error.CancellationReasons ?? [];

    // Any conditional-check failure with a returned Item ⇒ version conflict.
    const hasVersionConflict = reasons.some(
      (r) => r.Code === "ConditionalCheckFailed" && r.Item !== undefined,
    );
    if (hasVersionConflict) {
      return new VersionConflictError(error);
    }

    // No-Item conditional-check failures ⇒ missing row (Update) or duplicate id (Put).
    const hasFailure = reasons.some(
      (r) => r.Code === "ConditionalCheckFailed" && r.Item === undefined,
    );
    if (hasFailure) {
      return new RepositoryError(
        "Transaction or account row was missing or already existed",
        "NOT_FOUND",
        error,
      );
    }
  }

  console.error("LedgerWriter TransactWrite failed:", error);
  return new RepositoryError(
    "Failed to apply ledger write",
    "TRANSACT_WRITE_FAILED",
    error,
  );
}
```

- [ ] **Step 4: Invoke `jest-tests` Skill via the Skill tool, then re-run the integration test**

Run: `cd backend && npm run test:integration -- dyn-ledger-writer.test.ts`
Expected: PASS for the create-transaction test.

- [ ] **Step 5: Invoke `jest-tests` Skill via the Skill tool, then add the rest of the integration suite**

Open `backend/src/repositories/dyn-ledger-writer.test.ts`. Add these additional `it` blocks after the first:

```ts
it("updates a transaction and account atomically (cross-account scenario)", async () => {
  const fromAccount = await createAccountWith(accountRepo, { transactionBalance: 100 });
  const toAccount = await createAccountWith(accountRepo, { transactionBalance: 0 });

  const original = fakeTransaction({
    accountId: fromAccount.id,
    userId: fromAccount.userId,
    amount: 30,
    type: TransactionType.EXPENSE,
  }) as Transaction;
  await transactionRepo.create(original);

  // Move it to a different account.
  const moved = original.update({ account: toAccount });
  const adjustedFrom = fromAccount.decreaseBalanceBySignedAmount(original.signedAmount); // +30
  const adjustedTo = toAccount.increaseBalanceBySignedAmount(moved.signedAmount);        // -30

  const result = await writer.apply({
    updateTransactions: [moved],
    updateAccounts: [adjustedFrom, adjustedTo],
  });

  expect(result.updatedTransactions[0].version).toBe(original.version + 1);
  const persistedFrom = await accountRepo.findOneById({
    id: fromAccount.id,
    userId: fromAccount.userId,
  });
  const persistedTo = await accountRepo.findOneById({
    id: toAccount.id,
    userId: toAccount.userId,
  });
  expect(persistedFrom?.transactionBalance).toBe(130);
  expect(persistedTo?.transactionBalance).toBe(-30);
});

it("rolls back when the transaction's version condition fails", async () => {
  const account = fakeAccount({ transactionBalance: 0 });
  await accountRepo.create(account);

  const txn = fakeTransaction({
    accountId: account.id,
    userId: account.userId,
    amount: 10,
    type: TransactionType.INCOME,
  }) as Transaction;
  await transactionRepo.create(txn);

  // Build an update with a STALE version.
  const stale = txn.update({ amount: 20 });

  await expect(
    writer.apply({
      updateTransactions: [stale],
      updateAccounts: [account.increaseBalanceBySignedAmount(10)],
    }),
  ).rejects.toBeInstanceOf(VersionConflictError);

  // The account row should NOT have been mutated.
  const persistedAccount = await accountRepo.findOneById({
    id: account.id,
    userId: account.userId,
  });
  expect(persistedAccount?.transactionBalance).toBe(0);
});

it("rejects createTransactions for an existing id", async () => {
  const account = fakeAccount();
  await accountRepo.create(account);

  const txn = fakeTransaction({
    accountId: account.id,
    userId: account.userId,
    amount: 10,
    type: TransactionType.INCOME,
  }) as Transaction;
  await transactionRepo.create(txn);

  await expect(
    writer.apply({
      createTransactions: [txn], // duplicate id
      updateAccounts: [account.increaseBalanceBySignedAmount(10)],
    }),
  ).rejects.toBeInstanceOf(RepositoryError);
});

it("rejects update of a missing transaction", async () => {
  const account = fakeAccount();
  await accountRepo.create(account);

  const txn = fakeTransaction({
    accountId: account.id,
    userId: account.userId,
    amount: 10,
    type: TransactionType.INCOME,
  }) as Transaction;
  // Do NOT persist `txn`.

  await expect(
    writer.apply({
      updateTransactions: [txn],
      updateAccounts: [account.increaseBalanceBySignedAmount(10)],
    }),
  ).rejects.toBeInstanceOf(RepositoryError);
});
```

Update the imports at the top of the file to include `RepositoryError` (the new tests reference it):

```ts
import {
  RepositoryError,
  VersionConflictError,
} from "../ports/repository-error";
```

Add a small helper at the top of the file (below imports, above `describe`):

```ts
async function createAccountWith(
  repo: DynAccountRepository,
  overrides: Partial<import("../models/account").AccountData> = {},
) {
  const account = fakeAccount(overrides);
  await repo.create(account);
  return account;
}
```

- [ ] **Step 6: Run integration suite**

Run: `cd backend && npm run test:integration -- dyn-ledger-writer.test.ts`
Expected: PASS for all new tests.

- [ ] **Step 7: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 8: Stage changes**

```bash
git add backend/src/repositories/dyn-ledger-writer.ts backend/src/repositories/dyn-ledger-writer.test.ts
```
Stop. Do not commit.

---

## Task 9: `LedgerWriter` mock for unit tests

**Files:**
- Create: `backend/src/utils/test-utils/repositories/ledger-writer-mocks.ts`

Used by service-level tests in Tasks 10 and 11.

- [ ] **Step 1: Create the mock factory**

Create `backend/src/utils/test-utils/repositories/ledger-writer-mocks.ts`:

```ts
import { jest } from "@jest/globals";
import { LedgerWriter } from "../../../ports/ledger-writer";

export const createMockLedgerWriter = (): jest.Mocked<LedgerWriter> => ({
  apply: jest.fn(async () => ({
    createdTransactions: [],
    updatedTransactions: [],
    updatedAccounts: [],
  })),
});
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Stage changes**

```bash
git add backend/src/utils/test-utils/repositories/ledger-writer-mocks.ts
```
Stop. Do not commit.

---

## Task 10: Rewrite `TransactionService` to use `LedgerWriter`

**Files:**
- Modify: `backend/src/services/transaction-service.ts`
- Modify: `backend/src/services/transaction-service.test.ts`

`createTransaction`, `updateTransaction`, `deleteTransaction` now bundle the txn op with version-checked account updates via the writer. Read paths (`getTransactionById`, `getTransactionsByUser`, `getTransactionPatterns`, `getDescriptionSuggestions`) are unchanged.

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then update `transaction-service.test.ts` setup to inject a mock `LedgerWriter`**

Open `backend/src/services/transaction-service.test.ts`. At the top of the suite where the service is constructed, add:

```ts
import { createMockLedgerWriter } from "../utils/test-utils/repositories/ledger-writer-mocks";
// ...
let ledgerWriter: ReturnType<typeof createMockLedgerWriter>;

beforeEach(() => {
  // (existing setup)
  ledgerWriter = createMockLedgerWriter();
  service = new TransactionServiceImpl({
    accountRepository,
    categoryRepository,
    transactionRepository,
    ledgerWriter,
  });
});
```

(Don't change existing tests' assertions yet — just the constructor wiring. Existing `transactionRepository.create` / `update` mocks may go unused after the rewrite; remove their setup once tests are migrated.)

- [ ] **Step 2: Invoke `jest-tests` Skill via the Skill tool, then add a failing test for `createTransaction` calling the writer**

Add a new test inside the existing `describe("createTransaction", ...)` block:

```ts
it("calls ledgerWriter.apply with createTransactions and the increased account", async () => {
  const account = fakeAccount({ transactionBalance: 100 });
  accountRepository.findOneById.mockResolvedValueOnce(account);

  const userId = account.userId;
  const input = {
    accountId: account.id,
    type: TransactionType.INCOME,
    amount: 50,
    date: "2026-04-26" as DateString,
  };

  await service.createTransaction(input, userId);

  expect(ledgerWriter.apply).toHaveBeenCalledTimes(1);
  const call = ledgerWriter.apply.mock.calls[0][0];
  expect(call.createTransactions).toHaveLength(1);
  expect(call.createTransactions?.[0].amount).toBe(50);
  expect(call.updateAccounts).toHaveLength(1);
  expect(call.updateAccounts[0].transactionBalance).toBe(150);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npm test -- transaction-service.test.ts -t "calls ledgerWriter.apply with createTransactions"`
Expected: FAIL — service constructor doesn't accept `ledgerWriter`.

- [ ] **Step 4: Add `ledgerWriter` to `TransactionServiceImpl` constructor**

In `backend/src/services/transaction-service.ts`, update the class:

```ts
import { LedgerWriter } from "../ports/ledger-writer";

export class TransactionServiceImpl implements TransactionService {
  private accountRepository: AccountRepository;
  private categoryRepository: CategoryRepository;
  private transactionRepository: TransactionRepository;
  private ledgerWriter: LedgerWriter;

  constructor(deps: {
    accountRepository: AccountRepository;
    categoryRepository: CategoryRepository;
    transactionRepository: TransactionRepository;
    ledgerWriter: LedgerWriter;
  }) {
    this.accountRepository = deps.accountRepository;
    this.categoryRepository = deps.categoryRepository;
    this.transactionRepository = deps.transactionRepository;
    this.ledgerWriter = deps.ledgerWriter;
  }

  // ...
}
```

- [ ] **Step 5: Rewrite `createTransaction`**

Replace the body of `createTransaction` with:

```ts
async createTransaction(
  input: CreateTransactionServiceInput,
  userId: string,
): Promise<Transaction> {
  const account = await this.accountRepository.findOneById({
    id: input.accountId,
    userId,
  });
  if (!account) {
    throw new BusinessError("Account not found or doesn't belong to user");
  }

  let category: Category | undefined;
  if (input.categoryId) {
    category =
      (await this.categoryRepository.findOneById({
        id: input.categoryId,
        userId,
      })) ?? undefined;
    if (!category) {
      throw new BusinessError("Category not found or doesn't belong to user");
    }
  }

  const transaction = Transaction.create({
    ...input,
    userId,
    account,
    category,
  });

  const updatedAccount = account.increaseBalanceBySignedAmount(
    transaction.signedAmount,
  );

  await handleVersionConflict("Transaction", () =>
    this.ledgerWriter.apply({
      createTransactions: [transaction],
      updateAccounts: [updatedAccount],
    }),
  );

  return transaction;
}
```

- [ ] **Step 6: Invoke `jest-tests` Skill via the Skill tool, then re-run the createTransaction test**

Run: `cd backend && npm test -- transaction-service.test.ts -t "calls ledgerWriter.apply with createTransactions"`
Expected: PASS.

- [ ] **Step 7: Invoke `jest-tests` Skill via the Skill tool, then add failing tests for `updateTransaction` (4 branches)**

Add to the existing `describe("updateTransaction", ...)` block:

```ts
it("metadata-only update: writer called with empty updateAccounts", async () => {
  const existing = fakeTransaction({
    amount: 10,
    type: TransactionType.INCOME,
  }) as Transaction;
  transactionRepository.findOneById.mockResolvedValueOnce(existing);

  await service.updateTransaction(existing.id, existing.userId, {
    description: "new note",
  });

  const call = ledgerWriter.apply.mock.calls[0][0];
  expect(call.updateTransactions).toHaveLength(1);
  expect(call.updateAccounts).toEqual([]);
});

it("same-account amount change: chains decrease then increase", async () => {
  const account = fakeAccount({ transactionBalance: 100 });
  const existing = fakeTransaction({
    accountId: account.id,
    userId: account.userId,
    amount: 30,
    type: TransactionType.EXPENSE, // signedAmount = -30
  }) as Transaction;
  transactionRepository.findOneById.mockResolvedValueOnce(existing);
  accountRepository.findOneWithArchivedById.mockResolvedValueOnce(account);

  await service.updateTransaction(existing.id, existing.userId, {
    amount: 50, // signedAmount = -50
  });

  const call = ledgerWriter.apply.mock.calls[0][0];
  // 100 - (-30) + (-50) = 100 + 30 - 50 = 80
  expect(call.updateAccounts).toHaveLength(1);
  expect(call.updateAccounts[0].transactionBalance).toBe(80);
});

it("cross-account: produces two updateAccounts entries", async () => {
  const oldAccount = fakeAccount({ transactionBalance: 100 });
  const newAccount = fakeAccount({
    userId: oldAccount.userId,
    transactionBalance: 0,
  });
  const existing = fakeTransaction({
    accountId: oldAccount.id,
    userId: oldAccount.userId,
    amount: 30,
    type: TransactionType.EXPENSE,
  }) as Transaction;
  transactionRepository.findOneById.mockResolvedValueOnce(existing);
  accountRepository.findOneById.mockResolvedValueOnce(newAccount); // validateAccount
  accountRepository.findOneWithArchivedById.mockResolvedValueOnce(oldAccount);

  await service.updateTransaction(existing.id, existing.userId, {
    accountId: newAccount.id,
  });

  const call = ledgerWriter.apply.mock.calls[0][0];
  expect(call.updateAccounts).toHaveLength(2);
  // old: 100 - (-30) = 130; new: 0 + (-30) = -30
  expect(
    call.updateAccounts.find((a) => a.id === oldAccount.id)
      ?.transactionBalance,
  ).toBe(130);
  expect(
    call.updateAccounts.find((a) => a.id === newAccount.id)
      ?.transactionBalance,
  ).toBe(-30);
});

it("type change with sign flip: balance-affected branch taken", async () => {
  const account = fakeAccount({ transactionBalance: 100 });
  const existing = fakeTransaction({
    accountId: account.id,
    userId: account.userId,
    amount: 20,
    type: TransactionType.EXPENSE, // -20
  }) as Transaction;
  transactionRepository.findOneById.mockResolvedValueOnce(existing);
  accountRepository.findOneWithArchivedById.mockResolvedValueOnce(account);

  await service.updateTransaction(existing.id, existing.userId, {
    type: TransactionType.INCOME, // +20
  });

  const call = ledgerWriter.apply.mock.calls[0][0];
  // 100 - (-20) + 20 = 140
  expect(call.updateAccounts).toHaveLength(1);
  expect(call.updateAccounts[0].transactionBalance).toBe(140);
});
```

- [ ] **Step 8: Run tests to verify they fail**

Run: `cd backend && npm test -- transaction-service.test.ts -t "updateTransaction"`
Expected: FAIL — `updateTransaction` not yet rewritten.

- [ ] **Step 9: Rewrite `updateTransaction`**

Replace the body with:

```ts
async updateTransaction(
  id: string,
  userId: string,
  input: UpdateTransactionServiceInput,
): Promise<Transaction> {
  const existing = await this.transactionRepository.findOneById({
    id,
    userId,
  });
  if (!existing) {
    throw new BusinessError(
      "Transaction not found or doesn't belong to user",
    );
  }

  // newAccount: validate active when input.accountId is set; otherwise undefined.
  const newAccount = input.accountId
    ? await this.validateAccount(input.accountId, userId)
    : undefined;

  const transactionType = input.type ?? existing.type;
  const category =
    input.categoryId === undefined
      ? undefined
      : input.categoryId === null
        ? null
        : await this.validateCategory(
            input.categoryId,
            userId,
            transactionType,
          );

  const updated = existing.update({
    account: newAccount,
    category,
    type: input.type,
    amount: input.amount,
    date: input.date,
    description: input.description,
  });

  const balanceAffected =
    existing.accountId !== updated.accountId ||
    existing.signedAmount !== updated.signedAmount;

  let updatedAccounts: Account[] = [];
  if (balanceAffected) {
    if (existing.accountId === updated.accountId) {
      // Same account — single fetch (with-archived); chain decrease then increase.
      const account = await this.accountRepository.findOneWithArchivedById({
        id: existing.accountId,
        userId,
      });
      if (!account) {
        throw new BusinessError("Account not found");
      }
      updatedAccounts = [
        account
          .decreaseBalanceBySignedAmount(existing.signedAmount)
          .increaseBalanceBySignedAmount(updated.signedAmount),
      ];
    } else {
      // Cross-account — two distinct accounts.
      const oldAccount =
        await this.accountRepository.findOneWithArchivedById({
          id: existing.accountId,
          userId,
        });
      if (!oldAccount) {
        throw new BusinessError("Old account not found");
      }
      // newAccount is guaranteed non-null here because input.accountId differs
      // from existing.accountId, so input.accountId must have been set.
      updatedAccounts = [
        oldAccount.decreaseBalanceBySignedAmount(existing.signedAmount),
        newAccount!.increaseBalanceBySignedAmount(updated.signedAmount),
      ];
    }
  }

  const result = await handleVersionConflict("Transaction", () =>
    this.ledgerWriter.apply({
      updateTransactions: [updated],
      updateAccounts: updatedAccounts,
    }),
  );
  return result.updatedTransactions[0];
}
```

(`Account` may need to be imported into the service file — add `import { Account } from "../models/account";` at the top.)

- [ ] **Step 10: Invoke `jest-tests` Skill via the Skill tool, then re-run updateTransaction tests**

Run: `cd backend && npm test -- transaction-service.test.ts -t "updateTransaction"`
Expected: PASS.

- [ ] **Step 11: Invoke `jest-tests` Skill via the Skill tool, then add failing test for `deleteTransaction`**

Add to the existing `describe("deleteTransaction", ...)`:

```ts
it("calls ledgerWriter.apply with archived transaction and decreased account", async () => {
  const account = fakeAccount({ transactionBalance: 100 });
  const existing = fakeTransaction({
    accountId: account.id,
    userId: account.userId,
    amount: 30,
    type: TransactionType.EXPENSE, // signedAmount = -30
  }) as Transaction;
  transactionRepository.findOneById.mockResolvedValueOnce(existing);
  accountRepository.findOneWithArchivedById.mockResolvedValueOnce(account);

  await service.deleteTransaction(existing.id, existing.userId);

  const call = ledgerWriter.apply.mock.calls[0][0];
  expect(call.updateTransactions).toHaveLength(1);
  expect(call.updateTransactions?.[0].isArchived).toBe(true);
  // 100 - (-30) = 130
  expect(call.updateAccounts).toHaveLength(1);
  expect(call.updateAccounts[0].transactionBalance).toBe(130);
});

it("returns existing unchanged when already archived (no writer call)", async () => {
  const archived = fakeTransaction({}) as Transaction;
  // construct an already-archived txn:
  const archivedTxn = archived.archive();
  transactionRepository.findOneById.mockResolvedValueOnce(archivedTxn);

  const result = await service.deleteTransaction(
    archivedTxn.id,
    archivedTxn.userId,
  );
  expect(result).toBe(archivedTxn);
  expect(ledgerWriter.apply).not.toHaveBeenCalled();
});
```

- [ ] **Step 12: Run tests to verify they fail**

Run: `cd backend && npm test -- transaction-service.test.ts -t "deleteTransaction"`
Expected: FAIL.

- [ ] **Step 13: Rewrite `deleteTransaction`**

Replace the body with:

```ts
async deleteTransaction(id: string, userId: string): Promise<Transaction> {
  const existing = await this.transactionRepository.findOneById({
    id,
    userId,
  });
  if (!existing) {
    throw new BusinessError(
      "Transaction not found or doesn't belong to user",
    );
  }

  if (existing.isArchived) {
    return existing;
  }

  const account = await this.accountRepository.findOneWithArchivedById({
    id: existing.accountId,
    userId,
  });
  if (!account) {
    throw new BusinessError("Account not found");
  }

  const archived = existing.archive();
  const updatedAccount = account.decreaseBalanceBySignedAmount(
    existing.signedAmount,
  );

  const result = await handleVersionConflict("Transaction", () =>
    this.ledgerWriter.apply({
      updateTransactions: [archived],
      updateAccounts: [updatedAccount],
    }),
  );
  return result.updatedTransactions[0];
}
```

- [ ] **Step 14: Invoke `jest-tests` Skill via the Skill tool, then run all transaction-service tests**

Run: `cd backend && npm test -- transaction-service.test.ts`
Expected: PASS — entire suite green.

- [ ] **Step 15: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 16: Stage changes**

```bash
git add backend/src/services/transaction-service.ts backend/src/services/transaction-service.test.ts
```
Stop. Do not commit.

---

## Task 11: Rewrite `TransferService` to use `LedgerWriter`

**Files:**
- Modify: `backend/src/services/transfer-service.ts`
- Modify: `backend/src/services/transfer-service.test.ts`

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then update `transfer-service.test.ts` setup to inject a mock writer**

Open `backend/src/services/transfer-service.test.ts`. At the suite top:

```ts
import { createMockLedgerWriter } from "../utils/test-utils/repositories/ledger-writer-mocks";
// ...
let ledgerWriter: ReturnType<typeof createMockLedgerWriter>;

beforeEach(() => {
  // (existing setup)
  ledgerWriter = createMockLedgerWriter();
  service = new TransferService({
    accountRepository,
    transactionRepository,
    ledgerWriter,
  });
});
```

- [ ] **Step 2: Invoke `jest-tests` Skill via the Skill tool, then add failing test for `createTransfer`**

```ts
it("createTransfer calls ledgerWriter.apply with two creates and two account increases", async () => {
  const fromAccount = fakeAccount({ transactionBalance: 100, currency: "USD" });
  const toAccount = fakeAccount({
    userId: fromAccount.userId,
    transactionBalance: 50,
    currency: "USD",
  });
  accountRepository.findOneById.mockResolvedValueOnce(fromAccount);
  accountRepository.findOneById.mockResolvedValueOnce(toAccount);

  await service.createTransfer(
    {
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      amount: 25,
      date: "2026-04-26" as DateString,
    },
    fromAccount.userId,
  );

  const call = ledgerWriter.apply.mock.calls[0][0];
  expect(call.createTransactions).toHaveLength(2);
  expect(call.updateAccounts).toHaveLength(2);
  expect(
    call.updateAccounts.find((a) => a.id === fromAccount.id)
      ?.transactionBalance,
  ).toBe(75); // 100 + (-25)
  expect(
    call.updateAccounts.find((a) => a.id === toAccount.id)?.transactionBalance,
  ).toBe(75); // 50 + 25
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npm test -- transfer-service.test.ts -t "createTransfer calls ledgerWriter.apply"`
Expected: FAIL — service doesn't yet take `ledgerWriter`.

- [ ] **Step 4: Add `ledgerWriter` to `TransferService` constructor**

In `backend/src/services/transfer-service.ts`:

```ts
import { LedgerWriter } from "../ports/ledger-writer";

export class TransferService {
  private accountRepository: AccountRepository;
  private transactionRepository: TransactionRepository;
  private ledgerWriter: LedgerWriter;

  constructor(deps: {
    accountRepository: AccountRepository;
    transactionRepository: TransactionRepository;
    ledgerWriter: LedgerWriter;
  }) {
    this.accountRepository = deps.accountRepository;
    this.transactionRepository = deps.transactionRepository;
    this.ledgerWriter = deps.ledgerWriter;
  }

  // ...
}
```

- [ ] **Step 5: Rewrite `createTransfer`**

Replace the body with:

```ts
async createTransfer(
  input: CreateTransferServiceInput,
  userId: string,
): Promise<TransferResult> {
  this.validateNotSelfTransfer(input.fromAccountId, input.toAccountId);

  const fromAccount = await this.validateAccount(input.fromAccountId, userId);
  const toAccount = await this.validateAccount(input.toAccountId, userId);

  this.validateCurrencyMatch(fromAccount, toAccount);

  const transferId = randomUUID();

  const outboundTransaction = Transaction.create({
    userId,
    account: fromAccount,
    type: TransactionType.TRANSFER_OUT,
    amount: input.amount,
    date: input.date,
    description: input.description || undefined,
    transferId,
  });

  const inboundTransaction = Transaction.create({
    userId,
    account: toAccount,
    type: TransactionType.TRANSFER_IN,
    amount: input.amount,
    date: input.date,
    description: input.description || undefined,
    transferId,
  });

  const updatedFrom = fromAccount.increaseBalanceBySignedAmount(
    outboundTransaction.signedAmount,
  );
  const updatedTo = toAccount.increaseBalanceBySignedAmount(
    inboundTransaction.signedAmount,
  );

  try {
    await handleVersionConflict("Transfer", () =>
      this.ledgerWriter.apply({
        createTransactions: [outboundTransaction, inboundTransaction],
        updateAccounts: [updatedFrom, updatedTo],
      }),
    );
    return { transferId, outboundTransaction, inboundTransaction };
  } catch (error) {
    if (error instanceof BusinessError) throw error;
    console.error("Transfer creation failed:", {
      transferId,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      error,
    });
    throw new BusinessError("Failed to create transfer transactions");
  }
}
```

- [ ] **Step 6: Invoke `jest-tests` Skill via the Skill tool, then re-run createTransfer test**

Run: `cd backend && npm test -- transfer-service.test.ts -t "createTransfer calls ledgerWriter.apply"`
Expected: PASS.

- [ ] **Step 7: Invoke `jest-tests` Skill via the Skill tool, then add failing tests for `updateTransfer` (no balance impact + balance affected)**

```ts
it("updateTransfer with no balance impact: writer called with empty updateAccounts", async () => {
  // build existing transfer pair
  const fromAccount = fakeAccount({ currency: "USD" });
  const toAccount = fakeAccount({
    userId: fromAccount.userId,
    currency: "USD",
  });
  const existingOut = fakeTransaction({
    accountId: fromAccount.id,
    userId: fromAccount.userId,
    type: TransactionType.TRANSFER_OUT,
    amount: 30,
    transferId: "tid-1",
  }) as Transaction;
  const existingIn = fakeTransaction({
    accountId: toAccount.id,
    userId: fromAccount.userId,
    type: TransactionType.TRANSFER_IN,
    amount: 30,
    transferId: "tid-1",
  }) as Transaction;

  transactionRepository.findManyByTransferId
    .mockResolvedValueOnce([existingOut, existingIn]);

  // Update only the description (no balance impact)
  await service.updateTransfer("tid-1", fromAccount.userId, {
    description: "renamed",
  });

  const call = ledgerWriter.apply.mock.calls[0][0];
  expect(call.updateTransactions).toHaveLength(2);
  expect(call.updateAccounts).toEqual([]);
});

it("updateTransfer with amount change: 2 unique account updates with combined deltas", async () => {
  // existingOut signedAmount = -30; new amount 50 → updatedOut signedAmount = -50
  // existingIn  signedAmount = +30; new amount 50 → updatedIn  signedAmount = +50
  // fromAccount: 100 - (-30) + (-50) = 80
  // toAccount: 50 - (+30) + (+50) = 70
  const fromAccount = fakeAccount({
    transactionBalance: 100,
    currency: "USD",
  });
  const toAccount = fakeAccount({
    userId: fromAccount.userId,
    transactionBalance: 50,
    currency: "USD",
  });
  const existingOut = fakeTransaction({
    accountId: fromAccount.id,
    userId: fromAccount.userId,
    type: TransactionType.TRANSFER_OUT,
    amount: 30,
    transferId: "tid-2",
  }) as Transaction;
  const existingIn = fakeTransaction({
    accountId: toAccount.id,
    userId: fromAccount.userId,
    type: TransactionType.TRANSFER_IN,
    amount: 30,
    transferId: "tid-2",
  }) as Transaction;

  transactionRepository.findManyByTransferId
    .mockResolvedValueOnce([existingOut, existingIn]);
  // accounts unchanged → service fetches via findOneWithArchivedById per id
  accountRepository.findOneWithArchivedById
    .mockResolvedValueOnce(fromAccount)
    .mockResolvedValueOnce(toAccount);

  await service.updateTransfer("tid-2", fromAccount.userId, { amount: 50 });

  const call = ledgerWriter.apply.mock.calls[0][0];
  expect(call.updateTransactions).toHaveLength(2);
  expect(call.updateAccounts).toHaveLength(2);
  expect(
    call.updateAccounts.find((a) => a.id === fromAccount.id)
      ?.transactionBalance,
  ).toBe(80);
  expect(
    call.updateAccounts.find((a) => a.id === toAccount.id)?.transactionBalance,
  ).toBe(70);
});
```

- [ ] **Step 8: Run tests to verify they fail**

Run: `cd backend && npm test -- transfer-service.test.ts -t "updateTransfer"`
Expected: FAIL.

- [ ] **Step 9: Rewrite `updateTransfer`**

Replace the body with:

```ts
async updateTransfer(
  transferId: string,
  userId: string,
  input: UpdateTransferServiceInput,
): Promise<TransferResult> {
  const existing = await this.fetchValidatedTransfer(transferId, userId);
  if (!existing) {
    throw new BusinessError("Transfer not found or doesn't belong to user");
  }

  const { outboundTransaction: existingOut, inboundTransaction: existingIn } =
    existing;

  const fromAccountId = input.fromAccountId ?? existingOut.accountId;
  const toAccountId = input.toAccountId ?? existingIn.accountId;

  this.validateNotSelfTransfer(fromAccountId, toAccountId);

  const fromAccountActive = await this.validateAccount(fromAccountId, userId);
  const toAccountActive = await this.validateAccount(toAccountId, userId);
  this.validateCurrencyMatch(fromAccountActive, toAccountActive);

  const sharedUpdate = {
    amount: input.amount,
    date: input.date,
    description: input.description,
  };

  const updatedOut = existingOut.update({
    ...sharedUpdate,
    account: input.fromAccountId ? fromAccountActive : undefined,
  });
  const updatedIn = existingIn.update({
    ...sharedUpdate,
    account: input.toAccountId ? toAccountActive : undefined,
  });

  const balanceAffected =
    existingOut.amount !== updatedOut.amount ||
    existingOut.accountId !== updatedOut.accountId ||
    existingIn.accountId !== updatedIn.accountId;

  let updatedAccounts: Account[] = [];
  if (balanceAffected) {
    // Collect every unique accountId touched by either old or new state.
    const allIds = new Set<string>([
      existingOut.accountId,
      existingIn.accountId,
      updatedOut.accountId,
      updatedIn.accountId,
    ]);

    const accountsById = new Map<string, Account>();
    for (const accountId of allIds) {
      // For accountIds that are the new from/to, prefer the already-fetched
      // active entities. Otherwise fetch with-archived (old account may be archived).
      let account: Account | null = null;
      if (accountId === fromAccountActive.id) account = fromAccountActive;
      else if (accountId === toAccountActive.id) account = toAccountActive;
      else
        account = await this.accountRepository.findOneWithArchivedById({
          id: accountId,
          userId,
        });
      if (!account) {
        throw new BusinessError(`Account ${accountId} not found`);
      }
      accountsById.set(accountId, account);
    }

    const result = new Map<string, Account>();
    const get = (id: string): Account => {
      const a = result.get(id) ?? accountsById.get(id);
      if (!a) throw new Error(`Account ${id} not provided`);
      return a;
    };
    for (const txn of [existingOut, existingIn]) {
      result.set(
        txn.accountId,
        get(txn.accountId).decreaseBalanceBySignedAmount(txn.signedAmount),
      );
    }
    for (const txn of [updatedOut, updatedIn]) {
      result.set(
        txn.accountId,
        get(txn.accountId).increaseBalanceBySignedAmount(txn.signedAmount),
      );
    }
    updatedAccounts = Array.from(result.values());
  }

  await handleVersionConflict("Transfer", () =>
    this.ledgerWriter.apply({
      updateTransactions: [updatedOut, updatedIn],
      updateAccounts,
    }),
  );

  // Return the freshly-updated entities (no extra fetch needed).
  return {
    transferId,
    outboundTransaction: updatedOut.bumpVersion(),
    inboundTransaction: updatedIn.bumpVersion(),
  };
}
```

(Add `import { Account } from "../models/account";` if not present.)

- [ ] **Step 10: Invoke `jest-tests` Skill via the Skill tool, then re-run updateTransfer tests**

Run: `cd backend && npm test -- transfer-service.test.ts -t "updateTransfer"`
Expected: PASS.

- [ ] **Step 11: Invoke `jest-tests` Skill via the Skill tool, then add failing test for `deleteTransfer`**

```ts
it("deleteTransfer calls ledgerWriter.apply with archived pair and decreased accounts", async () => {
  const fromAccount = fakeAccount({
    transactionBalance: 100,
    currency: "USD",
  });
  const toAccount = fakeAccount({
    userId: fromAccount.userId,
    transactionBalance: 50,
    currency: "USD",
  });
  const existingOut = fakeTransaction({
    accountId: fromAccount.id,
    userId: fromAccount.userId,
    type: TransactionType.TRANSFER_OUT,
    amount: 30,
    transferId: "tid-3",
  }) as Transaction;
  const existingIn = fakeTransaction({
    accountId: toAccount.id,
    userId: fromAccount.userId,
    type: TransactionType.TRANSFER_IN,
    amount: 30,
    transferId: "tid-3",
  }) as Transaction;

  transactionRepository.findManyByTransferId.mockResolvedValueOnce([
    existingOut,
    existingIn,
  ]);
  accountRepository.findOneWithArchivedById
    .mockResolvedValueOnce(fromAccount)
    .mockResolvedValueOnce(toAccount);

  await service.deleteTransfer("tid-3", fromAccount.userId);

  const call = ledgerWriter.apply.mock.calls[0][0];
  expect(call.updateTransactions).toHaveLength(2);
  expect(
    call.updateTransactions?.every((t) => t.isArchived),
  ).toBe(true);
  expect(call.updateAccounts).toHaveLength(2);
  // 100 - (-30) = 130; 50 - (+30) = 20
  expect(
    call.updateAccounts.find((a) => a.id === fromAccount.id)
      ?.transactionBalance,
  ).toBe(130);
  expect(
    call.updateAccounts.find((a) => a.id === toAccount.id)?.transactionBalance,
  ).toBe(20);
});
```

- [ ] **Step 12: Run test to verify it fails**

Run: `cd backend && npm test -- transfer-service.test.ts -t "deleteTransfer"`
Expected: FAIL.

- [ ] **Step 13: Rewrite `deleteTransfer`**

Replace the body with:

```ts
async deleteTransfer(transferId: string, userId: string): Promise<void> {
  const transferTransactions =
    await this.transactionRepository.findManyByTransferId({
      transferId,
      userId,
    });

  if (transferTransactions.length === 0) {
    throw new BusinessError("Transfer not found or doesn't belong to user");
  }

  // Sort: outbound first, then inbound (existing fetchValidatedTransfer logic).
  const outbound = transferTransactions.find(
    (t) => t.type === TransactionType.TRANSFER_OUT,
  );
  const inbound = transferTransactions.find(
    (t) => t.type === TransactionType.TRANSFER_IN,
  );
  if (!outbound || !inbound) {
    throw new BusinessError("Invalid transfer state: missing pair");
  }

  const fromAccount = await this.accountRepository.findOneWithArchivedById({
    id: outbound.accountId,
    userId,
  });
  const toAccount = await this.accountRepository.findOneWithArchivedById({
    id: inbound.accountId,
    userId,
  });
  if (!fromAccount || !toAccount) {
    throw new BusinessError("Account not found");
  }

  const archivedOut = outbound.archive();
  const archivedIn = inbound.archive();

  const updatedFrom = fromAccount.decreaseBalanceBySignedAmount(
    outbound.signedAmount,
  );
  const updatedTo = toAccount.decreaseBalanceBySignedAmount(
    inbound.signedAmount,
  );

  try {
    await handleVersionConflict("Transfer", () =>
      this.ledgerWriter.apply({
        updateTransactions: [archivedOut, archivedIn],
        updateAccounts: [updatedFrom, updatedTo],
      }),
    );
  } catch (error) {
    if (error instanceof BusinessError) throw error;
    console.error("Transfer deletion failed:", {
      transferId,
      userId,
      transactionIds: [outbound.id, inbound.id],
      error,
    });
    throw new BusinessError("Failed to delete transfer transactions");
  }
}
```

- [ ] **Step 14: Invoke `jest-tests` Skill via the Skill tool, then run all transfer-service tests**

Run: `cd backend && npm test -- transfer-service.test.ts`
Expected: PASS — entire suite green.

- [ ] **Step 15: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 16: Stage changes**

```bash
git add backend/src/services/transfer-service.ts backend/src/services/transfer-service.test.ts
```
Stop. Do not commit.

---

## Task 12: Remove `TransactionRepository.createMany` and `updateMany`

**Files:**
- Modify: `backend/src/ports/transaction-repository.ts`
- Modify: `backend/src/repositories/dyn-transaction-repository.ts`
- Modify: `backend/src/repositories/dyn-transaction-repository.test.ts`
- Modify: `backend/src/utils/test-utils/repositories/transaction-repository-mocks.ts`

After Tasks 10 and 11, no service uses these methods. Remove them.

- [ ] **Step 1: Confirm no remaining callers**

Run: `cd backend && grep -rn "transactionRepository\.\(createMany\|updateMany\)" src --include='*.ts'`
Expected: 0 matches (any references should be in code being deleted in this task).

If matches exist outside the repo / port / mocks / test files, fix those callers first before continuing.

- [ ] **Step 2: Remove `createMany` and `updateMany` from the port**

In `backend/src/ports/transaction-repository.ts`, delete these two methods from the interface:

```ts
createMany(transactions: readonly Readonly<Transaction>[]): Promise<void>;
updateMany(
  transactions: readonly Readonly<Transaction>[],
): Promise<Transaction[]>;
```

- [ ] **Step 3: Remove `createMany` and `updateMany` from the impl**

In `backend/src/repositories/dyn-transaction-repository.ts`, delete the two method bodies. Also remove now-unused imports (`TransactionCanceledException`, `TransactWriteCommand`, `DYNAMODB_TRANSACT_WRITE_MAX_ITEMS`) if they're not referenced elsewhere in the file.

- [ ] **Step 4: Remove the mock entries**

In `backend/src/utils/test-utils/repositories/transaction-repository-mocks.ts`, drop `createMany: jest.fn()` and `updateMany: jest.fn()` entries.

- [ ] **Step 5: Invoke `jest-tests` Skill via the Skill tool, then delete the `createMany` and `updateMany` test suites**

In `backend/src/repositories/dyn-transaction-repository.test.ts`, delete the entire `describe("createMany", ...)` and `describe("updateMany", ...)` blocks.

- [ ] **Step 6: Invoke `jest-tests` Skill via the Skill tool, then run the full backend suite**

Run: `cd backend && npm test`
Expected: PASS — all suites green; nothing depends on the removed methods.

- [ ] **Step 7: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 8: Stage changes**

```bash
git add backend/src/ports/transaction-repository.ts backend/src/repositories/dyn-transaction-repository.ts backend/src/repositories/dyn-transaction-repository.test.ts backend/src/utils/test-utils/repositories/transaction-repository-mocks.ts
```
Stop. Do not commit.

---

## Task 13: Remove `AccountService.calculateBalance`; swap GraphQL resolver

**Files:**
- Modify: `backend/src/services/account-service.ts`
- Modify: `backend/src/services/account-service.test.ts`
- Modify: `backend/src/graphql/resolvers/account-resolvers.ts`

The resolver reads the entity getter. The service method and its test are removed.

- [ ] **Step 1: Update the GraphQL resolver to read the entity getter**

In `backend/src/graphql/resolvers/account-resolvers.ts`, replace the `Account.balance` resolver:

```ts
import { Account } from "../../models/account";

export const accountResolvers = {
  Account: {
    balance: (account: Account): number => account.balance,
  },
  Query: {
    // ...unchanged
  },
  Mutation: {
    // ...unchanged
  },
};
```

(`getAuthenticatedUser` is no longer needed for `Account.balance`. Remove its import only if it isn't used elsewhere in the file.)

- [ ] **Step 2: Remove `calculateBalance` from `AccountService` interface and impl**

In `backend/src/services/account-service.ts`:

- Delete the line `calculateBalance(accountId: string, userId: string): Promise<number>;` from the `AccountService` interface.
- Delete the entire `calculateBalance` method body from `AccountServiceImpl`.

- [ ] **Step 3: Invoke `jest-tests` Skill via the Skill tool, then delete the `calculateBalance` test suite**

In `backend/src/services/account-service.test.ts`, delete the entire `describe("calculateBalance", ...)` block.

- [ ] **Step 4: Invoke `jest-tests` Skill via the Skill tool, then run the full backend suite**

Run: `cd backend && npm test`
Expected: PASS — no test relies on `calculateBalance`.

- [ ] **Step 5: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Stage changes**

```bash
git add backend/src/services/account-service.ts backend/src/services/account-service.test.ts backend/src/graphql/resolvers/account-resolvers.ts
```
Stop. Do not commit.

---

## Task 14: Wire `DynLedgerWriter` into the composition root

**Files:**
- Modify: `backend/src/dependencies.ts`

- [ ] **Step 1: Add `resolveLedgerWriter` and inject into the two services**

In `backend/src/dependencies.ts`:

Add the import near the other repository imports:

```ts
import { DynLedgerWriter } from "./repositories/dyn-ledger-writer";
```

Add the resolver alongside the other repositories:

```ts
export const resolveLedgerWriter = createSingleton(
  () =>
    new DynLedgerWriter({
      accountsTableName: requireEnv("ACCOUNTS_TABLE_NAME"),
      transactionsTableName: requireEnv("TRANSACTIONS_TABLE_NAME"),
    }),
);
```

Update `resolveTransactionService`:

```ts
export const resolveTransactionService = createSingleton(
  () =>
    new TransactionServiceImpl({
      accountRepository: resolveAccountRepository(),
      categoryRepository: resolveCategoryRepository(),
      transactionRepository: resolveTransactionRepository(),
      ledgerWriter: resolveLedgerWriter(),
    }),
);
```

Update `resolveTransferService`:

```ts
export const resolveTransferService = createSingleton(
  () =>
    new TransferService({
      accountRepository: resolveAccountRepository(),
      transactionRepository: resolveTransactionRepository(),
      ledgerWriter: resolveLedgerWriter(),
    }),
);
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Build**

Run: `cd backend && npm run build`
Expected: succeeds.

- [ ] **Step 4: Invoke `jest-tests` Skill via the Skill tool, then run the full backend suite (unit + integration)**

Run: `cd backend && npm test && npm run test:integration`
Expected: PASS for both.

- [ ] **Step 5: Stage changes**

```bash
git add backend/src/dependencies.ts
```
Stop. Do not commit.

---

## Task 15: End-to-end smoke

**Files:**
- (no modifications — verification only)

- [ ] **Step 1: Confirm full clean run**

Run: `cd backend && npm run lint && npm run typecheck && npm test && npm run test:integration && npm run build`
Expected: every command succeeds.

- [ ] **Step 2: Confirm staged-but-uncommitted state**

Run: `git status` and verify the staged file list matches what was staged across Tasks 1–14, and there are no leftover unstaged changes.

- [ ] **Step 3: Stop**

Hand control back to the user. The user decides when to commit and how to split commits.
