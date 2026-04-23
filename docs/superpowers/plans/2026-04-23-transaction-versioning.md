# Transaction Versioning (OCC) Implementation Plan

> **Stale — implementation has drifted.** The shipped code puts the version bump in the repository (not the model), and `update` / `updateMany` return the post-bump entity. Treat the source code as authoritative; use this plan only for historical context.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optimistic concurrency control to Transaction writes via a `version` attribute so concurrent updates and transfer-leg interleaving are detected and surfaced to the user.

**Architecture:** Each Transaction row carries an integer `version`. The model bumps it on every `update` / `archive` (same pattern as `updatedAt`). The repository writes conditional on `version = :expectedOld`, and uses `ReturnValuesOnConditionCheckFailure: "ALL_OLD"` to distinguish "row missing" from "version mismatch". On mismatch, the repo throws a new `VersionConflictError`. A shared service helper translates that to a `BusinessError("Transaction was modified, please reload and try again")` that surfaces through the existing resolver error path. A migration backfills `version = 0` on existing rows before the new code ships.

**Tech Stack:** TypeScript, Jest, DynamoDB (AWS SDK v3 `@aws-sdk/lib-dynamodb`), Zod, AWS Lambda migration runner.

**Reference spec:** [docs/superpowers/specs/2026-04-23-transaction-versioning-design.md](../specs/2026-04-23-transaction-versioning-design.md)

---

## File Structure

**Create:**

- `backend/src/services/with-conflict-mapping.ts` — shared `runWithConflictMapping` helper
- `backend/src/services/with-conflict-mapping.test.ts` — helper tests
- `backend/src/migrations/<timestamp>-add-transaction-version.ts` — backfill migration (timestamp generated at write time)

**Modify:**

- `backend/src/ports/repository-error.ts` — add `VersionConflictError`
- `backend/src/models/transaction.ts` — add `version` to `Transaction`; set on create; bump on update/archive
- `backend/src/models/transaction.test.ts` — cover `version` on all three model functions
- `backend/src/utils/test-utils/models/transaction-fakes.ts` — default `version: 0` in `fakeTransaction`
- `backend/src/repositories/schemas/transaction.ts` — add `version: z.int().nonnegative()` to both schemas
- `backend/src/repositories/dyn-transaction-repository.ts` — update-path version condition; split error handling on both `update` and `updateMany`
- `backend/src/repositories/dyn-transaction-repository.test.ts` — cover version happy-path and conflict paths
- `backend/src/services/transaction-service.ts` — wrap `update` / `archive` calls with helper
- `backend/src/services/transaction-service.test.ts` — cover conflict-to-BusinessError mapping
- `backend/src/services/transfer-service.ts` — wrap `updateMany` calls with helper in `updateTransfer` / `deleteTransfer`
- `backend/src/services/transfer-service.test.ts` — cover conflict-to-BusinessError mapping

**Test discipline:** Written per the `jest-tests` skill conventions — no "should" prefix; `describe` blocks mirror source method order; one behavior per `it`.

---

## Task 1: Add `version` to the Transaction type, zod schema, and fake

**Files:**

- Modify: `backend/src/models/transaction.ts` (interface `Transaction` at lines 21-35)
- Modify: `backend/src/repositories/schemas/transaction.ts`
- Modify: `backend/src/utils/test-utils/models/transaction-fakes.ts`

Type-shape change only. The three files must land together — `transactionSchema satisfies z.ZodType<Transaction>` ties them, so the interface and schema cannot be added separately without breaking typecheck.

- [x] **Step 1: Add `version` to the `Transaction` interface**

Edit [backend/src/models/transaction.ts](backend/src/models/transaction.ts): add `version: number` to the `Transaction` interface, right after `isArchived`:

```ts
export interface Transaction {
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
  version: number; // OCC token — bumped by updateTransactionModel / archiveTransactionModel
  createdAt: string;
  updatedAt: string;
}
```

- [x] **Step 2: Add `version` to `transactionSchema`**

Edit [backend/src/repositories/schemas/transaction.ts](backend/src/repositories/schemas/transaction.ts):

```ts
export const transactionSchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  accountId: z.uuid(),
  categoryId: z.uuid().optional(),
  type: z.enum(TransactionType),
  amount: z.number().positive(),
  currency: z.string().length(3).uppercase(),
  date: z.iso.date().transform(toDateString),
  description: z.string().optional(),
  transferId: z.uuid().optional(),
  isArchived: z.boolean(),
  version: z.int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Transaction>;
```

`transactionDbItemSchema` extends `transactionSchema` and inherits the field automatically — no edit needed.

- [x] **Step 3: Default `version: 0` in `fakeTransaction`**

Edit [backend/src/utils/test-utils/models/transaction-fakes.ts](backend/src/utils/test-utils/models/transaction-fakes.ts):

```ts
export const fakeTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    type: TransactionType.EXPENSE,
    currency: "USD",
    description: faker.finance.transactionDescription(),
    date: toDateString(faker.date.recent().toISOString().split("T")[0]),
    categoryId: faker.string.uuid(),
    isArchived: false,
    version: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};
```

- [x] **Step 4: Run typecheck**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
cd backend
git add src/models/transaction.ts src/repositories/schemas/transaction.ts src/utils/test-utils/models/transaction-fakes.ts
git commit -m "add version field to Transaction type and schema"
```

---

## Task 2: `createTransactionModel` — test that version is 0

**Files:**

- Test: `backend/src/models/transaction.test.ts`

Note: the `version: 0` initialization already landed in Task 1 because the `Transaction` interface required it. This task is test-only — a regression guard.

- [x] **Step 1: Add a dedicated assertion for version**

Add to the `describe("createTransactionModel", ...)` block in [backend/src/models/transaction.test.ts](backend/src/models/transaction.test.ts), next to other happy-path tests:

```ts
it("sets version to 0", () => {
  // Act
  const result = createTransactionModel(
    fakeCreateTransactionInput(),
    fixedDeps,
  );

  // Assert
  expect(result.version).toBe(0);
});
```

- [x] **Step 2: Update the full-shape snapshot**

In the existing "builds transaction with all fields populated" test (around line 48), add `version: 0` to the `expect(result).toEqual({...})` object so the full-shape snapshot stays complete.

- [x] **Step 3: Run the test file**

Run: `cd backend && npm test -- src/models/transaction.test.ts`
Expected: PASS (both the new `it` and the updated full-shape test).

- [x] **Step 4: Skip the commit (do not commit)**

---

## Task 3: `updateTransactionModel` bumps `version`

**Files:**

- Modify: `backend/src/models/transaction.ts` (function `updateTransactionModel` at lines 106-151)
- Test: `backend/src/models/transaction.test.ts`

- [x] **Step 1: Write the failing test**

Add to `describe("updateTransactionModel", ...)` in [backend/src/models/transaction.test.ts](backend/src/models/transaction.test.ts), alongside other happy-path tests:

```ts
it("increments version by 1", () => {
  // Arrange
  const existing = fakeTransaction({ version: 5 });

  // Act
  const result = updateTransactionModel(existing, { amount: 1 }, fixedDeps);

  // Assert
  expect(result.version).toBe(6);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- src/models/transaction.test.ts`
Expected: FAIL — `result.version` is still `5` (spread copies the old value).

- [x] **Step 3: Make it pass**

Edit `updateTransactionModel` in [backend/src/models/transaction.ts](backend/src/models/transaction.ts). In the `updatedTransaction` object, after `updatedAt: now`, add `version: transaction.version + 1`:

```ts
const updatedTransaction: Transaction = {
  ...transaction,
  accountId: account ? account.id : transaction.accountId,
  categoryId: newCategoryId,
  type: input.type ?? transaction.type,
  amount: input.amount ?? transaction.amount,
  currency: account ? account.currency : transaction.currency,
  date: input.date ?? transaction.date,
  description: newDescription,
  version: transaction.version + 1,
  updatedAt: now,
};
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- src/models/transaction.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
cd backend
git add src/models/transaction.ts src/models/transaction.test.ts
git commit -m "updateTransactionModel bumps version"
```

---

## Task 4: `archiveTransactionModel` bumps `version`

**Files:**

- Modify: `backend/src/models/transaction.ts` (function `archiveTransactionModel` at lines 153-166)
- Test: `backend/src/models/transaction.test.ts`

- [x] **Step 1: Write the failing test**

Add to `describe("archiveTransactionModel", ...)` in [backend/src/models/transaction.test.ts](backend/src/models/transaction.test.ts), alongside other happy-path tests:

```ts
it("increments version by 1", () => {
  // Arrange
  const existing = fakeTransaction({ version: 3 });

  // Act
  const result = archiveTransactionModel(existing, fixedDeps);

  // Assert
  expect(result.version).toBe(4);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- src/models/transaction.test.ts`
Expected: FAIL — `result.version` is still `3`.

- [x] **Step 3: Make it pass**

Edit `archiveTransactionModel` in [backend/src/models/transaction.ts](backend/src/models/transaction.ts):

```ts
export function archiveTransactionModel(
  transaction: Transaction,
  { clock = () => new Date() }: { clock?: () => Date } = {},
): Transaction {
  if (transaction.isArchived) {
    throw new ModelError("Cannot archive archived transaction");
  }

  return {
    ...transaction,
    isArchived: true,
    version: transaction.version + 1,
    updatedAt: clock().toISOString(),
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- src/models/transaction.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
cd backend
git add src/models/transaction.ts src/models/transaction.test.ts
git commit -m "archiveTransactionModel bumps version"
```

---

## Task 5: Add `VersionConflictError`

**Files:**

- Modify: `backend/src/ports/repository-error.ts`

- [x] **Step 1: Add the class**

Edit [backend/src/ports/repository-error.ts](backend/src/ports/repository-error.ts):

```ts
export class RepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class VersionConflictError extends RepositoryError {
  constructor(originalError?: unknown) {
    super("Version conflict", "VERSION_CONFLICT", originalError);
    this.name = "VersionConflictError";
  }
}
```

- [x] **Step 2: Run typecheck**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [x] **Step 3: Commit**

```bash
cd backend
git add src/ports/repository-error.ts
git commit -m "add VersionConflictError class"
```

---

## Task 6: Repository `create` persists `version`, `update` enforces it

**Files:**

- Modify: `backend/src/repositories/dyn-transaction-repository.ts` (methods `update` at lines 542-559 and `buildUpdateParams` at lines 876-944)
- Test: `backend/src/repositories/dyn-transaction-repository.test.ts`

The existing `create` method already passes the full `Transaction` object to `PutCommand` — `version: 0` from the model flows through with no code change. We add tests to lock the behavior, then change `update`.

Repo tests run against DynamoDB Local via `TRANSACTIONS_TABLE_NAME` env var (already wired). Follow the project's `jest-tests` skill.

- [x] **Step 1: Write failing test for `create` persisting version**

Add to `describe("create", ...)` (or wherever create tests live — if no such block exists, create one) in [backend/src/repositories/dyn-transaction-repository.test.ts](backend/src/repositories/dyn-transaction-repository.test.ts):

```ts
describe("create", () => {
  it("persists version = 0", async () => {
    // Arrange
    const transaction = fakeTransaction({ version: 0 });

    // Act
    await repository.create(transaction);

    // Assert
    const loaded = await repository.findOneById({
      id: transaction.id,
      userId: transaction.userId,
    });
    expect(loaded?.version).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it passes without code change**

Run: `cd backend && npm test -- src/repositories/dyn-transaction-repository.test.ts -t "persists version = 0"`
Expected: PASS. `create` already writes the full object; the new zod schema hydrates `version`.

This test exists as a regression guard.

- [x] **Step 3: Write failing test for `update` happy path bumping stored version**

Add to [backend/src/repositories/dyn-transaction-repository.test.ts](backend/src/repositories/dyn-transaction-repository.test.ts) in the `describe("update", ...)` block (or create one):

```ts
describe("update", () => {
  it("bumps stored version on success", async () => {
    // Arrange
    const original = fakeTransaction({ version: 0 });
    await repository.create(original);

    // Act
    const updated = { ...original, amount: 99, version: 1 };
    await repository.update(updated);

    // Assert
    const loaded = await repository.findOneById({
      id: original.id,
      userId: original.userId,
    });
    expect(loaded?.version).toBe(1);
    expect(loaded?.amount).toBe(99);
  });
});
```

- [x] **Step 4: Write failing test for `update` throwing `VersionConflictError` on stale version**

Add to the same `describe("update", ...)` block:

```ts
it("throws VersionConflictError when version is stale", async () => {
  // Arrange
  const original = fakeTransaction({ version: 0 });
  await repository.create(original);

  // Someone else bumped it to version 1 behind our back
  await repository.update({ ...original, amount: 50, version: 1 });

  // Our stale write still thinks current is version 0, producing version 1
  const staleWrite = { ...original, amount: 99, version: 1 };

  // Act & Assert
  await expect(repository.update(staleWrite)).rejects.toThrow(
    VersionConflictError,
  );
});
```

Import `VersionConflictError` at the top of the test file:

```ts
import { VersionConflictError } from "../ports/repository-error";
```

- [x] **Step 5: Write failing test for `update` throwing NOT_FOUND when row missing**

```ts
it("throws RepositoryError NOT_FOUND when row is missing", async () => {
  // Arrange
  const ghost = fakeTransaction({ version: 1 });

  // Act & Assert
  await expect(repository.update(ghost)).rejects.toMatchObject({
    name: "RepositoryError",
    code: "NOT_FOUND",
  });
});
```

- [x] **Step 6: Run tests to verify they fail**

Run: `cd backend && npm test -- src/repositories/dyn-transaction-repository.test.ts -t "update"`
Expected: FAIL on the three new cases — the current `update` ignores version and maps any condition failure to NOT_FOUND.

- [x] **Step 7: Implement version-conditional `update`**

Edit `buildUpdateParams` in [backend/src/repositories/dyn-transaction-repository.ts](backend/src/repositories/dyn-transaction-repository.ts):

```ts
private buildUpdateParams(transaction: Transaction): {
  TableName: string;
  Key: { userId: string; id: string };
  UpdateExpression: string;
  ConditionExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
} {
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
    ":newVersion": transaction.version,
    ":expectedOld": transaction.version - 1,
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
    TableName: this.tableName,
    Key: { userId: transaction.userId, id: transaction.id },
    UpdateExpression: updateExpressionParts.join(" "),
    ConditionExpression: "attribute_exists(id) AND version = :expectedOld",
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };
}
```

Edit `update` to pass `ReturnValuesOnConditionCheckFailure` and split the catch:

```ts
async update(transaction: Transaction): Promise<void> {
  const updateParams = this.buildUpdateParams(transaction);

  try {
    const command = new UpdateCommand({
      ...updateParams,
      ReturnValuesOnConditionCheckFailure: "ALL_OLD",
    });
    await this.client.send(command);
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

Import `VersionConflictError` at the top of the repository file:

```ts
import {
  RepositoryError,
  VersionConflictError,
} from "../ports/repository-error";
```

- [x] **Step 8: Run tests to verify they pass**

Run: `cd backend && npm test -- src/repositories/dyn-transaction-repository.test.ts -t "update"`
Expected: PASS on all new tests. Also run the full repo test file to catch regressions:

Run: `cd backend && npm test -- src/repositories/dyn-transaction-repository.test.ts`
Expected: PASS.

If an existing test fails because it used `repository.update(transaction)` with a stale or zero-version transaction that implicitly relied on the old "any row, any time" semantics, update the test to first call `create` then call `update` with `version: existing.version + 1`. This is a correctness fix, not a regression.

- [x] **Step 9: Commit**

```bash
cd backend
git add src/repositories/dyn-transaction-repository.ts src/repositories/dyn-transaction-repository.test.ts
git commit -m "enforce version condition on Transaction update"
```

---

## Task 7: Repository `updateMany` (transfer path) enforces per-leg version

**Files:**

- Modify: `backend/src/repositories/dyn-transaction-repository.ts` (method `updateMany` at lines 561-602)
- Test: `backend/src/repositories/dyn-transaction-repository.test.ts`

`updateMany` uses `TransactWriteCommand` with one `Update` op per leg. Each op reuses `buildUpdateParams` (already adjusted in Task 6), so the condition is correct. What changes:

1. Each `Update` op passes `ReturnValuesOnConditionCheckFailure: "ALL_OLD"`.
2. The catch parses `TransactionCanceledException.CancellationReasons` per leg to decide between `VersionConflictError` and `NOT_FOUND`.

- [x] **Step 1: Write failing test for `updateMany` bumping all legs on success**

Add to [backend/src/repositories/dyn-transaction-repository.test.ts](backend/src/repositories/dyn-transaction-repository.test.ts) in a `describe("updateMany", ...)` block:

```ts
describe("updateMany", () => {
  it("bumps stored versions on all legs on success", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const leg1 = fakeTransaction({ userId, version: 0 });
    const leg2 = fakeTransaction({ userId, version: 0 });
    await repository.create(leg1);
    await repository.create(leg2);

    // Act
    await repository.updateMany([
      { ...leg1, amount: 11, version: 1 },
      { ...leg2, amount: 22, version: 1 },
    ]);

    // Assert
    const [loaded1, loaded2] = await Promise.all([
      repository.findOneById({ id: leg1.id, userId }),
      repository.findOneById({ id: leg2.id, userId }),
    ]);
    expect(loaded1?.version).toBe(1);
    expect(loaded2?.version).toBe(1);
  });
});
```

- [x] **Step 2: Write failing test for any-leg stale throwing `VersionConflictError`**

```ts
it("throws VersionConflictError when any leg has stale version", async () => {
  // Arrange
  const userId = faker.string.uuid();
  const leg1 = fakeTransaction({ userId, version: 0 });
  const leg2 = fakeTransaction({ userId, version: 0 });
  await repository.create(leg1);
  await repository.create(leg2);

  // Someone bumped leg2 behind us
  await repository.update({ ...leg2, amount: 77, version: 1 });

  // Our stale write still targets the old version on leg2
  const stale = [
    { ...leg1, amount: 11, version: 1 },
    { ...leg2, amount: 22, version: 1 }, // stale: current is already v1
  ];

  // Act & Assert
  await expect(repository.updateMany(stale)).rejects.toThrow(
    VersionConflictError,
  );

  // Atomicity: leg1 must still be at its original version (unchanged)
  const loaded1 = await repository.findOneById({ id: leg1.id, userId });
  expect(loaded1?.version).toBe(0);
});
```

- [x] **Step 3: Run tests to verify they fail**

Run: `cd backend && npm test -- src/repositories/dyn-transaction-repository.test.ts -t "updateMany"`
Expected: FAIL on the new cases — current `updateMany` doesn't apply version conditions and maps cancellation to generic NOT_FOUND.

- [x] **Step 4: Implement per-leg version condition and error split**

Edit `updateMany` in [backend/src/repositories/dyn-transaction-repository.ts](backend/src/repositories/dyn-transaction-repository.ts):

```ts
async updateMany(transactions: Transaction[]): Promise<void> {
  if (!transactions.length) {
    throw new RepositoryError(
      "At least one transaction is required",
      "INVALID_PARAMETERS",
    );
  }

  if (transactions.length > DYNAMODB_TRANSACT_WRITE_MAX_ITEMS) {
    throw new RepositoryError(
      `DynamoDB transactions support a maximum of ${DYNAMODB_TRANSACT_WRITE_MAX_ITEMS} items`,
      "TOO_MANY_ITEMS",
    );
  }

  try {
    const transactItems = transactions.map((transaction) => ({
      Update: {
        ...this.buildUpdateParams(transaction),
        ReturnValuesOnConditionCheckFailure: "ALL_OLD" as const,
      },
    }));

    const command = new TransactWriteCommand({
      TransactItems: transactItems,
    });

    await this.client.send(command);
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      const reasons = error.CancellationReasons ?? [];
      const hasConflict = reasons.some(
        (reason) =>
          reason.Code === "ConditionalCheckFailed" && reason.Item !== undefined,
      );
      if (hasConflict) {
        throw new VersionConflictError(error);
      }

      const hasMissing = reasons.some(
        (reason) =>
          reason.Code === "ConditionalCheckFailed" && reason.Item === undefined,
      );
      if (hasMissing) {
        throw new RepositoryError(
          "One or more transactions not found",
          "NOT_FOUND",
          error,
        );
      }
    }

    console.error("Error updating transactions atomically:", error);
    throw new RepositoryError(
      "Failed to update transactions atomically",
      "UPDATE_MANY_FAILED",
      error,
    );
  }
}
```

Note: the `as const` on `ReturnValuesOnConditionCheckFailure: "ALL_OLD"` keeps the literal type narrow for the SDK's union.

- [x] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test -- src/repositories/dyn-transaction-repository.test.ts`
Expected: PASS on all `updateMany` tests and full repo file.

- [x] **Step 6: Commit**

```bash
cd backend
git add src/repositories/dyn-transaction-repository.ts src/repositories/dyn-transaction-repository.test.ts
git commit -m "enforce per-leg version condition on updateMany"
```

---

## Task 8: `runWithConflictMapping` helper

**Files:**

- Create: `backend/src/services/with-conflict-mapping.ts`
- Create: `backend/src/services/with-conflict-mapping.test.ts`

- [x] **Step 1: Write the failing test**

Create [backend/src/services/with-conflict-mapping.test.ts](backend/src/services/with-conflict-mapping.test.ts):

```ts
import { describe, expect, it } from "@jest/globals";
import {
  RepositoryError,
  VersionConflictError,
} from "../ports/repository-error";
import { BusinessError } from "./business-error";
import { runWithConflictMapping } from "./with-conflict-mapping";

describe("runWithConflictMapping", () => {
  it("returns operation result on success", async () => {
    // Act
    const result = await runWithConflictMapping(async () => 42);

    // Assert
    expect(result).toBe(42);
  });

  it("maps VersionConflictError to BusinessError with retry message", async () => {
    // Act & Assert
    await expect(
      runWithConflictMapping(async () => {
        throw new VersionConflictError();
      }),
    ).rejects.toThrow(
      new BusinessError(
        "Transaction was modified, please reload and try again",
      ),
    );
  });

  it("passes through unrelated errors unchanged", async () => {
    // Arrange
    const other = new RepositoryError("boom", "QUERY_FAILED");

    // Act & Assert
    await expect(
      runWithConflictMapping(async () => {
        throw other;
      }),
    ).rejects.toBe(other);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- src/services/with-conflict-mapping.test.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement the helper**

Create [backend/src/services/with-conflict-mapping.ts](backend/src/services/with-conflict-mapping.ts):

```ts
import { VersionConflictError } from "../ports/repository-error";
import { BusinessError } from "./business-error";

export async function runWithConflictMapping<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof VersionConflictError) {
      throw new BusinessError(
        "Transaction was modified, please reload and try again",
      );
    }
    throw error;
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- src/services/with-conflict-mapping.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
cd backend
git add src/services/with-conflict-mapping.ts src/services/with-conflict-mapping.test.ts
git commit -m "add runWithConflictMapping helper"
```

---

## Task 9: Wire `TransactionService.updateTransaction` and `deleteTransaction` through the helper

**Files:**

- Modify: `backend/src/services/transaction-service.ts` (methods `updateTransaction` and `deleteTransaction`)
- Test: `backend/src/services/transaction-service.test.ts`

- [x] **Step 1: Write failing test for update conflict mapping**

Add to [backend/src/services/transaction-service.test.ts](backend/src/services/transaction-service.test.ts) inside the relevant `describe("updateTransaction", ...)` block:

```ts
it("maps VersionConflictError from repo to BusinessError", async () => {
  // Arrange
  const userId = faker.string.uuid();
  const existing = fakeTransaction({ userId });
  transactionRepository.findOneById.mockResolvedValue(existing);
  accountRepository.findOneById.mockResolvedValue(
    fakeAccount({ userId, id: existing.accountId }),
  );
  transactionRepository.update.mockRejectedValue(new VersionConflictError());

  // Act & Assert
  await expect(
    service.updateTransaction(existing.id, userId, { amount: 50 }),
  ).rejects.toThrow(
    new BusinessError("Transaction was modified, please reload and try again"),
  );
});
```

Use existing imports (`faker`, `fakeTransaction`, `fakeAccount`, `BusinessError`) and add `VersionConflictError` from `../ports/repository-error`.

- [x] **Step 2: Write failing test for delete conflict mapping**

Add to `describe("deleteTransaction", ...)`:

```ts
it("maps VersionConflictError from repo to BusinessError", async () => {
  // Arrange
  const userId = faker.string.uuid();
  const existing = fakeTransaction({ userId });
  transactionRepository.findOneById.mockResolvedValue(existing);
  transactionRepository.update.mockRejectedValue(new VersionConflictError());

  // Act & Assert
  await expect(service.deleteTransaction(existing.id, userId)).rejects.toThrow(
    new BusinessError("Transaction was modified, please reload and try again"),
  );
});
```

- [x] **Step 3: Run tests to verify they fail**

Run: `cd backend && npm test -- src/services/transaction-service.test.ts -t "VersionConflictError"`
Expected: FAIL — the raw `VersionConflictError` escapes the service.

- [x] **Step 4: Wrap the repo calls in `runWithConflictMapping`**

Edit [backend/src/services/transaction-service.ts](backend/src/services/transaction-service.ts). Import at top:

```ts
import { runWithConflictMapping } from "./with-conflict-mapping";
```

Change the repository call inside `updateTransaction`:

```ts
await runWithConflictMapping(() => this.transactionRepository.update(updated));
```

And inside `deleteTransaction`:

```ts
await runWithConflictMapping(() => this.transactionRepository.update(archived));
```

- [x] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test -- src/services/transaction-service.test.ts`
Expected: PASS on all cases (new and existing).

- [x] **Step 6: Commit**

```bash
cd backend
git add src/services/transaction-service.ts src/services/transaction-service.test.ts
git commit -m "surface transaction version conflict as BusinessError"
```

---

## Task 10: Wire `TransferService.updateTransfer` and `deleteTransfer` through the helper

**Files:**

- Modify: `backend/src/services/transfer-service.ts` (methods `updateTransfer` at lines 211-288 and `deleteTransfer` at lines 170-201)
- Test: `backend/src/services/transfer-service.test.ts`

`TransferService` currently wraps `updateMany` failures in a generic `BusinessError("Failed to update transfer transactions")`. With OCC, we want `VersionConflictError` to get the specific retry message; other failures keep the generic one.

- [x] **Step 1: Write failing test for `updateTransfer` conflict mapping**

Add to [backend/src/services/transfer-service.test.ts](backend/src/services/transfer-service.test.ts) inside the `describe("updateTransfer", ...)` block:

```ts
it("maps VersionConflictError from repo to retry BusinessError", async () => {
  // Arrange — existing transfer with two legs
  const userId = faker.string.uuid();
  const fromAccount = fakeAccount({ userId });
  const toAccount = fakeAccount({ userId, currency: fromAccount.currency });
  const transferId = faker.string.uuid();
  const outbound = fakeTransaction({
    userId,
    accountId: fromAccount.id,
    type: TransactionType.TRANSFER_OUT,
    transferId,
    categoryId: undefined,
  });
  const inbound = fakeTransaction({
    userId,
    accountId: toAccount.id,
    type: TransactionType.TRANSFER_IN,
    transferId,
    categoryId: undefined,
  });
  transactionRepository.findManyByTransferId.mockResolvedValue([
    outbound,
    inbound,
  ]);
  accountRepository.findOneById.mockImplementation(async ({ id }) =>
    id === fromAccount.id ? fromAccount : toAccount,
  );
  transactionRepository.updateMany.mockRejectedValue(
    new VersionConflictError(),
  );

  // Act & Assert
  await expect(
    service.updateTransfer(transferId, userId, { amount: 50 }),
  ).rejects.toThrow(
    new BusinessError("Transaction was modified, please reload and try again"),
  );
});
```

- [x] **Step 2: Write failing test for `deleteTransfer` conflict mapping**

Add to `describe("deleteTransfer", ...)`:

```ts
it("maps VersionConflictError from repo to retry BusinessError", async () => {
  // Arrange
  const userId = faker.string.uuid();
  const transferId = faker.string.uuid();
  const outbound = fakeTransaction({
    userId,
    type: TransactionType.TRANSFER_OUT,
    transferId,
    categoryId: undefined,
  });
  const inbound = fakeTransaction({
    userId,
    type: TransactionType.TRANSFER_IN,
    transferId,
    categoryId: undefined,
  });
  transactionRepository.findManyByTransferId.mockResolvedValue([
    outbound,
    inbound,
  ]);
  transactionRepository.updateMany.mockRejectedValue(
    new VersionConflictError(),
  );

  // Act & Assert
  await expect(service.deleteTransfer(transferId, userId)).rejects.toThrow(
    new BusinessError("Transaction was modified, please reload and try again"),
  );
});
```

Add `VersionConflictError` import from `../ports/repository-error` if not already present.

- [x] **Step 3: Run tests to verify they fail**

Run: `cd backend && npm test -- src/services/transfer-service.test.ts -t "VersionConflictError"`
Expected: FAIL — the existing catch block throws the generic `BusinessError("Failed to update/delete transfer transactions")`, which does not match the retry message.

- [x] **Step 4: Thread `runWithConflictMapping` through the transfer paths**

Edit [backend/src/services/transfer-service.ts](backend/src/services/transfer-service.ts). Import:

```ts
import { runWithConflictMapping } from "./with-conflict-mapping";
```

Change `updateTransfer` — wrap the `updateMany` call with `runWithConflictMapping`. Keep the outer try/catch for the generic failure case, but let `BusinessError` propagate unchanged:

```ts
try {
  await runWithConflictMapping(() =>
    this.transactionRepository.updateMany([updatedOutbound, updatedInbound]),
  );

  const updatedTransfer = await this.fetchValidatedTransfer(transferId, userId);

  if (!updatedTransfer) {
    throw new BusinessError("Failed to retrieve updated transfer transactions");
  }

  return updatedTransfer;
} catch (error) {
  if (error instanceof BusinessError) {
    throw error; // preserve retry message and other domain errors
  }

  console.error("Transfer update failed:", {
    transferId,
    fromAccountId,
    toAccountId,
    amount: input.amount,
    error,
  });

  throw new BusinessError("Failed to update transfer transactions");
}
```

Change `deleteTransfer` similarly:

```ts
try {
  const archivedTransactions = transferTransactions.map((transaction) =>
    this.archiveTransactionModel(transaction),
  );

  await runWithConflictMapping(() =>
    this.transactionRepository.updateMany(archivedTransactions),
  );
} catch (error) {
  if (error instanceof BusinessError) {
    throw error;
  }

  console.error("Transfer deletion failed:", {
    transferId,
    userId,
    transactionIds: transferTransactions.map((t) => t.id),
    error,
  });

  throw new BusinessError("Failed to delete transfer transactions");
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test -- src/services/transfer-service.test.ts`
Expected: PASS on all cases (new conflict tests and all existing transfer tests).

- [x] **Step 6: Commit**

```bash
cd backend
git add src/services/transfer-service.ts src/services/transfer-service.test.ts
git commit -m "surface transfer version conflict as BusinessError"
```

---

## Task 11: Migration backfills `version = 0`

**Files:**

- Create: `backend/src/migrations/<timestamp>-add-transaction-version.ts`

- [x] **Step 1: Generate the migration filename**

Use the current UTC timestamp in `YYYYMMDDHHMMSS` format. For example, `20260423142530-add-transaction-version.ts`.

- [x] **Step 2: Write the migration file**

Create the file with this content (adjust only the leading timestamp; the body is fixed):

```ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Adds `version = 0` to every existing Transaction row.
 * Idempotent: `attribute_not_exists(version)` guards against re-application.
 * Must run before code that requires `version` on reads is deployed.
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.TRANSACTIONS_TABLE_NAME;

  if (!tableName) {
    throw new Error("TRANSACTIONS_TABLE_NAME environment variable not set");
  }

  const docClient = DynamoDBDocumentClient.from(client);

  let scannedCount = 0;
  let updatedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log("Starting migration: backfilling version = 0 on transactions");

  do {
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const items = scanResult.Items ?? [];
    scannedCount += items.length;

    for (const item of items) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { userId: item.userId, id: item.id },
            UpdateExpression: "SET version = :zero",
            ConditionExpression: "attribute_not_exists(version)",
            ExpressionAttributeValues: { ":zero": 0 },
          }),
        );
        updatedCount++;
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "ConditionalCheckFailedException"
        ) {
          // Already has version, skip (idempotency).
          continue;
        }
        throw error;
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(
    `Migration completed: scanned ${scannedCount}, backfilled ${updatedCount}`,
  );
}
```

- [x] **Step 3: Run the migration against DynamoDB Local to verify**

Find the migration runner script. It lives in [backend/src/migrations/runner.ts](backend/src/migrations/runner.ts) and is invoked via an npm script — check [backend/package.json](backend/package.json) for the exact command (likely `npm run migrate` or similar).

Run: `cd backend && npm run migrate` (or whatever script is defined)
Expected: logs "scanned N, backfilled N" on first run, "scanned N, backfilled 0" on second run (idempotent).

If no dev migration script exists, skip to Step 4 — the migration runner test suite below will exercise the function.

- [x] **Step 4: Run the migration runner test suite**

The project already has [backend/src/migrations/runner.test.ts](backend/src/migrations/runner.test.ts). Run it to confirm the new migration is discovered and runs:

Run: `cd backend && npm test -- src/migrations/runner.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
cd backend
git add src/migrations/*-add-transaction-version.ts
git commit -m "add migration backfilling version = 0 on transactions"
```

---

## Task 12: Full validation pipeline

Per the constitution's Code Quality Validation section, run the full pipeline before declaring done.

- [x] **Step 1: Full test suite**

Run: `cd backend && npm test`
Expected: PASS across all packages in `backend/`.

If any unrelated test fails because it mocked `VersionConflictError`-returning paths incorrectly, fix it.

- [x] **Step 2: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [x] **Step 3: Lint / format**

Run: `cd backend && npm run format`
Expected: PASS. Fix any ESLint issues.

- [x] **Step 4: Verify no stray commits / clean working tree**

Run: `git status`
Expected: `working tree clean` — all task-level commits landed.

- [x] **Step 5: Summary commit message review**

Run: `git log --oneline main..HEAD` (or equivalent)
Expected: a tight sequence of per-task commits, each named for its artifact (per the user's commit-subject convention).

---

## Deployment Notes (informational, not a task)

The migration must run before the new Lambda code is deployed so that the strict zod schema never sees unmigrated rows. This is guaranteed by the existing migration pipeline that runs in the Lambda deploy sequence — no special action required from the implementer beyond shipping the migration file in the same deployment.

If rollback becomes necessary after the migration has run but before code ships, the `version = 0` attribute on Transaction rows is harmless to older code (it ignores the field). No rollback migration is needed.
