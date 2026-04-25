# Transaction Domain Entity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `backend/src/models/transaction.ts` from interface + free functions into a DDD-style immutable entity (`TransactionEntity` class implementing an extended `Transaction` interface). Migrate every consumer.

**Architecture:** Split the existing `Transaction` interface into `TransactionData` (pure data shape) and `Transaction` (data + domain methods). Add `TransactionEntity` class with `readonly` fields, static factories `create` / `fromPersistence`, instance methods `update` / `archive` / `toData`, and `signedAmount` getter. Version bump (OCC) stays in the repository. Drop dependency-injected model functions from services. Migration is staged so main stays green (typecheck + full test suite) after each task. Final task deletes the free functions and tightens the `Transaction` interface to include methods.

**Tech Stack:** TypeScript strict, Jest, Zod, DynamoDB (via AWS SDK).

**Reference spec:** [`docs/superpowers/specs/2026-04-24-transaction-entity-design.md`](../specs/2026-04-24-transaction-entity-design.md).

**Commit policy:** Never run `git commit` as part of task execution. When a step reads "Commit" below, it means "this is a natural stopping point where the user may choose to commit; stage the files and wait." Leave the working tree with staged changes and move to the next task.

**Required skills:**
- **`jest-tests`** — MUST be invoked via the Skill tool *immediately before* every individual step that writes or modifies a Jest test. Every such step is tagged `[requires jest-tests skill]` inline. Invoke the skill once per tagged step, not once per task — it is easy to forget when a task contains multiple test batches. Invocations are cheap; skipping is not.

---

## File Structure

Files created:

- `backend/src/models/transaction-entity.test.ts` — new test file for the class (replaces the old `transaction.test.ts` at the end).

Files modified:

- `backend/src/models/transaction.ts` — adds `TransactionData`, adds `TransactionEntity` class, extends `Transaction` interface, removes free functions.
- `backend/src/repositories/schemas/transaction.ts` — Zod schema `satisfies z.ZodType<TransactionData>`.
- `backend/src/repositories/dyn-transaction-repository.ts` — hydrate via `TransactionEntity.fromPersistence`; serialize via `.toData()`; return instances on writes.
- `backend/src/utils/test-utils/models/transaction-fakes.ts` — `fakeTransaction` returns `TransactionEntity` instance.
- `backend/src/services/transaction-service.ts` — drop injected model functions, call `TransactionEntity` statics + instance methods.
- `backend/src/services/transfer-service.ts` — same migration.
- `backend/src/services/account-service.ts` — `getSignedAmount(t)` → `t.signedAmount`.
- `backend/src/services/by-category-report-service.ts` — `getSignedAmount(t)` → `t.signedAmount`.
- `backend/src/langchain/tools/aggregate-transactions.ts` — `getSignedAmount(t)` → `t.signedAmount`.
- Any service test that injected fake `createTransactionModel` / `updateTransactionModel` / `archiveTransactionModel` — drop the injection.

Files deleted:

- `backend/src/models/transaction.test.ts` — superseded by `transaction-entity.test.ts`.

---

## Task 1: Add `TransactionData` alongside existing `Transaction`

**Files:**
- Modify: `backend/src/models/transaction.ts`

- [ ] **Step 1: Add `TransactionData` interface mirroring current `Transaction` shape**

In `backend/src/models/transaction.ts`, right above the existing `export interface Transaction` block, add:

```ts
// Plain data shape. Used by Zod, DynamoDB, and anywhere a value (not a domain object) is needed.
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
```

Leave the existing `Transaction` interface unchanged. Task 9 will rewire it to `extends TransactionData`.

- [ ] **Step 2: Verify typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean (no errors).

- [ ] **Step 3: Verify full test suite**

Run: `npm --prefix backend test`
Expected: all tests pass (no behavioral change yet).

- [ ] **Step 4: Stage changes**

```bash
git add backend/src/models/transaction.ts
```

---

## Task 2: Create failing test file for `TransactionEntity.create`

**Files:**
- Create: `backend/src/models/transaction-entity.test.ts`

- [ ] **Step 1: Scaffold test file with one failing case for `create`** `[requires jest-tests skill]`

Create `backend/src/models/transaction-entity.test.ts`:

```ts
import { faker } from "@faker-js/faker";
import { describe, expect, it } from "@jest/globals";
import { toDateString } from "../types/date";
import { DESCRIPTION_MAX_LENGTH } from "../types/validation";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import { fakeCreateTransactionInput } from "../utils/test-utils/models/transaction-fakes";
import { CategoryType } from "./category";
import { ModelError } from "./model-error";
import { TransactionEntity, TransactionType } from "./transaction";

describe("TransactionEntity", () => {
  describe("create", () => {
    const fixedClock = () => new Date("2000-01-02T10:11:12.000Z");
    const fixedIdGenerator = () => "fixed-uuid";
    const fixedDeps = { clock: fixedClock, idGenerator: fixedIdGenerator };

    it("builds transaction with all fields populated", () => {
      const userId = faker.string.uuid();
      const account = fakeAccount({ userId, currency: "EUR" });
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });
      const input = fakeCreateTransactionInput({
        userId,
        account,
        category,
        type: TransactionType.EXPENSE,
        amount: 42.5,
        date: toDateString("2000-01-02"),
        description: "lunch",
      });

      const result = TransactionEntity.create(input, fixedDeps);

      expect(result.toData()).toEqual({
        id: "fixed-uuid",
        userId,
        accountId: account.id,
        categoryId: category.id,
        type: TransactionType.EXPENSE,
        amount: 42.5,
        currency: "EUR",
        date: "2000-01-02",
        description: "lunch",
        transferId: undefined,
        isArchived: false,
        version: 0,
        createdAt: "2000-01-02T10:11:12.000Z",
        updatedAt: "2000-01-02T10:11:12.000Z",
      });
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm --prefix backend test -- src/models/transaction-entity.test.ts`
Expected: FAIL with "TransactionEntity is not exported" (or similar — `TransactionEntity` does not exist yet).

---

## Task 3: Implement `TransactionEntity` class with `create` and invariants

**Files:**
- Modify: `backend/src/models/transaction.ts`

- [ ] **Step 1: Add minimal `TransactionEntity` class below the `Transaction` interface block**

At the end of `backend/src/models/transaction.ts` (before the closing of the file and after the existing free functions — free functions stay in place for now), add:

```ts
export class TransactionEntity {
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

  private constructor(
    data: TransactionData,
    relations?: { newAccount?: Account; newCategory?: Category },
  ) {
    this.userId = data.userId;
    this.id = data.id;
    this.accountId = data.accountId;
    this.categoryId = data.categoryId;
    this.type = data.type;
    this.amount = data.amount;
    this.currency = data.currency;
    this.date = data.date;
    this.description = data.description;
    this.transferId = data.transferId;
    this.isArchived = data.isArchived;
    this.version = data.version;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    TransactionEntity.assertInvariants(data, relations);
  }

  static create(
    input: CreateTransactionInput,
    {
      clock = () => new Date(),
      idGenerator = randomUUID,
    }: { clock?: () => Date; idGenerator?: () => string } = {},
  ): TransactionEntity {
    const { account, category } = input;
    const now = clock().toISOString();

    const data: TransactionData = {
      id: idGenerator(),
      userId: input.userId,
      accountId: account.id,
      categoryId: category?.id,
      type: input.type,
      amount: input.amount,
      currency: account.currency,
      date: input.date,
      description: normalizeDescription(input.description),
      transferId: input.transferId,
      isArchived: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };

    return new TransactionEntity(data, {
      newAccount: account,
      newCategory: category,
    });
  }

  static fromPersistence(data: TransactionData): TransactionEntity {
    return new TransactionEntity(data);
  }

  get signedAmount(): number {
    switch (this.type) {
      case TransactionType.INCOME:
      case TransactionType.REFUND:
      case TransactionType.TRANSFER_IN:
        return this.amount;
      case TransactionType.EXPENSE:
      case TransactionType.TRANSFER_OUT:
        return -this.amount;
      default:
        throw new Error(`Unknown transaction type: ${this.type}`);
    }
  }

  update(
    input: UpdateTransactionInput,
    { clock = () => new Date() }: { clock?: () => Date } = {},
  ): TransactionEntity {
    if (this.isArchived) {
      throw new ModelError("Cannot update archived transaction");
    }

    const { account, category } = input;
    const now = clock().toISOString();

    const newCategoryId =
      category === undefined
        ? this.categoryId
        : category === null
          ? undefined
          : category.id;

    const newDescription =
      input.description === undefined
        ? this.description
        : input.description === null
          ? undefined
          : normalizeDescription(input.description);

    const data: TransactionData = {
      userId: this.userId,
      id: this.id,
      accountId: account ? account.id : this.accountId,
      categoryId: newCategoryId,
      type: input.type ?? this.type,
      amount: input.amount ?? this.amount,
      currency: account ? account.currency : this.currency,
      date: input.date ?? this.date,
      description: newDescription,
      transferId: this.transferId,
      isArchived: this.isArchived,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: now,
    };

    return new TransactionEntity(data, {
      newAccount: account,
      newCategory: category ?? undefined,
    });
  }

  archive({
    clock = () => new Date(),
  }: { clock?: () => Date } = {}): TransactionEntity {
    if (this.isArchived) {
      throw new ModelError("Cannot archive archived transaction");
    }

    const data: TransactionData = {
      userId: this.userId,
      id: this.id,
      accountId: this.accountId,
      categoryId: this.categoryId,
      type: this.type,
      amount: this.amount,
      currency: this.currency,
      date: this.date,
      description: this.description,
      transferId: this.transferId,
      isArchived: true,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: clock().toISOString(),
    };

    return new TransactionEntity(data);
  }

  toData(): TransactionData {
    return {
      userId: this.userId,
      id: this.id,
      accountId: this.accountId,
      categoryId: this.categoryId,
      type: this.type,
      amount: this.amount,
      currency: this.currency,
      date: this.date,
      description: this.description,
      transferId: this.transferId,
      isArchived: this.isArchived,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static assertInvariants(
    data: TransactionData,
    relations?: { newAccount?: Account; newCategory?: Category },
  ): void {
    const newAccount = relations?.newAccount;
    const newCategory = relations?.newCategory;

    if (newAccount) {
      if (newAccount.userId !== data.userId) {
        throw new ModelError("Account does not belong to user");
      }

      if (newAccount.isArchived) {
        throw new ModelError("Account must not be archived");
      }
    }

    if (data.amount <= 0) {
      throw new ModelError("Amount must be positive");
    }

    const isTransfer =
      data.type === TransactionType.TRANSFER_IN ||
      data.type === TransactionType.TRANSFER_OUT;

    if (isTransfer && newCategory) {
      throw new ModelError("Transfer transactions cannot have a category");
    }

    if (isTransfer) {
      if (!data.transferId) {
        throw new ModelError("Transfer transactions must include transferId");
      }
    } else {
      if (data.transferId) {
        throw new ModelError(
          "Only transfer transactions can include transferId",
        );
      }
    }

    if (newCategory) {
      if (newCategory.userId !== data.userId) {
        throw new ModelError("Category does not belong to user");
      }

      if (newCategory.isArchived) {
        throw new ModelError("Category must not be archived");
      }

      const typeMismatch =
        (newCategory.type === CategoryType.INCOME &&
          data.type !== TransactionType.INCOME) ||
        (newCategory.type === CategoryType.EXPENSE &&
          data.type !== TransactionType.EXPENSE &&
          data.type !== TransactionType.REFUND);

      if (typeMismatch) {
        throw new ModelError("Category type does not match transaction type");
      }
    }

    if (
      data.description &&
      data.description.length > DESCRIPTION_MAX_LENGTH
    ) {
      throw new ModelError(
        `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
      );
    }
  }
}
```

- [ ] **Step 2: Run the new test file to confirm the first case passes**

Run: `npm --prefix backend test -- src/models/transaction-entity.test.ts`
Expected: PASS (the single case).

- [ ] **Step 3: Run full test suite to confirm nothing else broke**

Run: `npm --prefix backend test`
Expected: all pass. The old `transaction.test.ts` still exercises the free functions, which are untouched.

- [ ] **Step 4: Stage changes**

```bash
git add backend/src/models/transaction.ts backend/src/models/transaction-entity.test.ts
```

---

## Task 4: Port remaining test cases from `transaction.test.ts`

Port every remaining `describe` block from the existing `backend/src/models/transaction.test.ts` into `transaction-entity.test.ts`, mapping free functions to class members. **Do not delete the old file yet** — it keeps the free functions covered until Task 11.

Mapping:

- `createTransactionModel(input, deps)` → `TransactionEntity.create(input, deps)`
- `updateTransactionModel(existing, input, deps)` → `existing.update(input, deps)` (where `existing` comes from `fakeTransaction()` which returns an instance — see Task 6)
- `archiveTransactionModel(existing, deps)` → `existing.archive(deps)`
- `getSignedAmount(transaction)` → `transaction.signedAmount`

At this point `fakeTransaction()` still returns a plain object. Use `TransactionEntity.fromPersistence(fakeTransaction())` inside the ported tests for every case that currently passes the fake into an update/archive/getSignedAmount function. This is temporary — Task 6 converts `fakeTransaction` to return an instance, then remove the `fromPersistence` wrapper.

- [ ] **Step 1: Add `describe("fromPersistence")` block to `transaction-entity.test.ts`** `[requires jest-tests skill]`

Append after the existing `describe("create")`:

```ts
  describe("fromPersistence", () => {
    it("reconstructs an instance from data", () => {
      const data = fakeTransactionData();
      const result = TransactionEntity.fromPersistence(data);

      expect(result.toData()).toEqual(data);
    });

    it("rejects data with non-positive amount", () => {
      const data = fakeTransactionData({ amount: 0 });

      expect(() => TransactionEntity.fromPersistence(data)).toThrow(
        new ModelError("Amount must be positive"),
      );
    });

    it("rejects non-transfer data with transferId", () => {
      const data = fakeTransactionData({
        type: TransactionType.EXPENSE,
        transferId: faker.string.uuid(),
      });

      expect(() => TransactionEntity.fromPersistence(data)).toThrow(
        new ModelError("Only transfer transactions can include transferId"),
      );
    });

    it("rejects transfer data without transferId", () => {
      const data = fakeTransactionData({
        type: TransactionType.TRANSFER_OUT,
        transferId: undefined,
        categoryId: undefined,
      });

      expect(() => TransactionEntity.fromPersistence(data)).toThrow(
        new ModelError("Transfer transactions must include transferId"),
      );
    });

    it("does not require an account argument", () => {
      // Sanity: even if the stored record references an account we never load,
      // fromPersistence succeeds because ownership checks only run when relations
      // are supplied.
      const data = fakeTransactionData();
      expect(() => TransactionEntity.fromPersistence(data)).not.toThrow();
    });
  });
```

`fakeTransactionData` does not exist yet. Add it to `transaction-fakes.ts` now:

```ts
export const fakeTransactionData = (
  overrides: Partial<TransactionData> = {},
): TransactionData => {
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
    version: faker.number.int({ min: 1, max: 100 }),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};
```

Update the import in `transaction-fakes.ts` to pull `TransactionData` from `../../../models/transaction`.

Update the test file to import `fakeTransactionData` from the fakes module.

- [ ] **Step 2: Add `describe("signedAmount")` block** `[requires jest-tests skill]`

```ts
  describe("signedAmount", () => {
    it("returns positive amount for INCOME transactions", () => {
      const tx = TransactionEntity.fromPersistence(
        fakeTransactionData({ type: TransactionType.INCOME, amount: 100 }),
      );
      expect(tx.signedAmount).toBe(100);
    });

    it("returns positive amount for REFUND transactions", () => {
      const tx = TransactionEntity.fromPersistence(
        fakeTransactionData({ type: TransactionType.REFUND, amount: 100 }),
      );
      expect(tx.signedAmount).toBe(100);
    });

    it("returns positive amount for TRANSFER_IN transactions", () => {
      const tx = TransactionEntity.fromPersistence(
        fakeTransactionData({
          type: TransactionType.TRANSFER_IN,
          amount: 100,
          transferId: faker.string.uuid(),
          categoryId: undefined,
        }),
      );
      expect(tx.signedAmount).toBe(100);
    });

    it("returns negative amount for EXPENSE transactions", () => {
      const tx = TransactionEntity.fromPersistence(
        fakeTransactionData({ type: TransactionType.EXPENSE, amount: 100 }),
      );
      expect(tx.signedAmount).toBe(-100);
    });

    it("returns negative amount for TRANSFER_OUT transactions", () => {
      const tx = TransactionEntity.fromPersistence(
        fakeTransactionData({
          type: TransactionType.TRANSFER_OUT,
          amount: 100,
          transferId: faker.string.uuid(),
          categoryId: undefined,
        }),
      );
      expect(tx.signedAmount).toBe(-100);
    });

    it("throws error for unknown transaction type", () => {
      // Bypass invariants via Object.assign on a valid instance, because
      // fromPersistence would reject the unknown type.
      const tx = TransactionEntity.fromPersistence(
        fakeTransactionData({ type: TransactionType.EXPENSE }),
      );
      Object.defineProperty(tx, "type", { value: "UNKNOWN" });
      expect(() => tx.signedAmount).toThrow(
        "Unknown transaction type: UNKNOWN",
      );
    });
  });
```

- [ ] **Step 3: Port the remaining `describe("createTransactionModel")` cases into `describe("create")`** `[requires jest-tests skill]`

Open `backend/src/models/transaction.test.ts`. For every `it(...)` under `describe("createTransactionModel", ...)` other than the first (already ported), copy it into the `describe("create", ...)` block in `transaction-entity.test.ts` and replace `createTransactionModel(...)` with `TransactionEntity.create(...)`. Replace any assertion that expects a plain object shape (e.g. `expect(result).toEqual({ ... })`) with `expect(result.toData()).toEqual({ ... })`. For assertions on single fields (e.g. `expect(result.categoryId).toBeUndefined()`), access works directly on the instance — no `.toData()` needed.

- [ ] **Step 4: Port `describe("updateTransactionModel")` cases into `describe("update")`** `[requires jest-tests skill]`

For each `it(...)`:

- Replace `const existing = fakeTransaction({ ... })` with `const existing = TransactionEntity.fromPersistence(fakeTransactionData({ ... }))`. (Task 6 changes `fakeTransaction` to return an instance — these `fromPersistence` wrappers will be removed in Task 6.)
- Replace `updateTransactionModel(existing, input, fixedDeps)` with `existing.update(input, fixedDeps)`.
- Replace `updateTransactionModel(existing, input)` (no deps) with `existing.update(input)`.
- Field assertions work directly on the returned instance.

- [ ] **Step 5: Port `describe("archiveTransactionModel")` cases into `describe("archive")`** `[requires jest-tests skill]`

Same pattern. `archiveTransactionModel(existing, deps)` → `existing.archive(deps)`.

- [ ] **Step 6: Add `describe("toData")` block** `[requires jest-tests skill]`

```ts
  describe("toData", () => {
    it("returns a plain object with all data fields", () => {
      const data = fakeTransactionData();
      const tx = TransactionEntity.fromPersistence(data);

      expect(tx.toData()).toEqual(data);
    });

    it("does not expose instance methods on the returned object", () => {
      const tx = TransactionEntity.fromPersistence(fakeTransactionData());
      const result = tx.toData() as unknown as Record<string, unknown>;

      expect(result.update).toBeUndefined();
      expect(result.archive).toBeUndefined();
      expect(result.toData).toBeUndefined();
      expect(result.signedAmount).toBeUndefined();
    });
  });
```

- [ ] **Step 7: Run the new test file**

Run: `npm --prefix backend test -- src/models/transaction-entity.test.ts`
Expected: all cases pass.

- [ ] **Step 8: Run full test suite**

Run: `npm --prefix backend test`
Expected: all pass (the old `transaction.test.ts` still passes against free functions).

- [ ] **Step 9: Stage changes**

```bash
git add backend/src/models/transaction-entity.test.ts backend/src/utils/test-utils/models/transaction-fakes.ts
```

---

## Task 5: Re-point Zod schema to `TransactionData`

**Files:**
- Modify: `backend/src/repositories/schemas/transaction.ts`

- [ ] **Step 1: Update type assertion on the schema**

Replace:

```ts
import type { Transaction } from "../../models/transaction";
...
}) satisfies z.ZodType<Transaction>;
```

with:

```ts
import type { TransactionData } from "../../models/transaction";
...
}) satisfies z.ZodType<TransactionData>;
```

No other changes — the `z.object({ ... })` body stays identical because `TransactionData` currently has the same shape as `Transaction`.

- [ ] **Step 2: Run typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean.

- [ ] **Step 3: Run full tests**

Run: `npm --prefix backend test`
Expected: all pass.

- [ ] **Step 4: Stage changes**

```bash
git add backend/src/repositories/schemas/transaction.ts
```

---

## Task 6: Update `fakeTransaction` to return a `TransactionEntity` instance

**Files:**
- Modify: `backend/src/utils/test-utils/models/transaction-fakes.ts`
- Modify: `backend/src/models/transaction-entity.test.ts`

- [ ] **Step 1: Rewrite `fakeTransaction`**

In `backend/src/utils/test-utils/models/transaction-fakes.ts`, change the existing `fakeTransaction` body to delegate through `fakeTransactionData`:

```ts
import {
  CreateTransactionInput,
  Transaction,
  TransactionData,
  TransactionEntity,
  TransactionPattern,
  TransactionType,
} from "../../../models/transaction";
import { toDateString } from "../../../types/date";
import { fakeAccount } from "./account-fakes";

export const fakeTransactionData = (
  overrides: Partial<TransactionData> = {},
): TransactionData => {
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
    version: faker.number.int({ min: 1, max: 100 }),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const fakeTransaction = (
  overrides: Partial<TransactionData> = {},
): Transaction => TransactionEntity.fromPersistence(fakeTransactionData(overrides));
```

Keep `fakeCreateTransactionInput` and `fakeTransactionPattern` unchanged.

Note: the parameter type of `fakeTransaction` changes from `Partial<Transaction>` to `Partial<TransactionData>`. This is safe: no call site of `fakeTransaction` passes a method — grep with `rg 'fakeTransaction\(\{[^}]*(update|archive|signedAmount|toData)'` to confirm.

- [ ] **Step 2: Remove temporary `fromPersistence` wrappers from `transaction-entity.test.ts`** `[requires jest-tests skill]`

Inside `transaction-entity.test.ts`, every `TransactionEntity.fromPersistence(fakeTransactionData({ ... }))` that was introduced as a bridge in Task 4 Steps 4–5 (for update/archive/signedAmount cases where the existing transaction instance is needed) collapses back to `fakeTransaction({ ... })`. Cases in the `fromPersistence` describe block keep using `fakeTransactionData` (the data shape under test).

- [ ] **Step 3: Run new test file**

Run: `npm --prefix backend test -- src/models/transaction-entity.test.ts`
Expected: all pass.

- [ ] **Step 4: Run full test suite**

Run: `npm --prefix backend test`
Expected: all pass. The old `transaction.test.ts` still passes because free functions accept either the plain `Transaction` shape or an entity instance (instance has all the data fields via readonly).

- [ ] **Step 5: Stage changes**

```bash
git add backend/src/utils/test-utils/models/transaction-fakes.ts backend/src/models/transaction-entity.test.ts
```

---

## Task 7: Migrate `DynTransactionRepository` to use the entity

**Files:**
- Modify: `backend/src/repositories/dyn-transaction-repository.ts`

- [ ] **Step 1: Import `TransactionEntity` and wrap Zod outputs**

At the top of `dyn-transaction-repository.ts`, add `TransactionEntity` to the existing import from `../models/transaction`:

```ts
import {
  Transaction,
  TransactionEntity,
  TransactionPattern,
  TransactionPatternType,
  TransactionType,
} from "../models/transaction";
```

- [ ] **Step 2: Wrap each `hydrate(transactionSchema, ...)` call with `TransactionEntity.fromPersistence`**

Every read method currently builds a `Transaction` from the Zod parse. For each occurrence, wrap the parsed data in `TransactionEntity.fromPersistence(...)`. The locations (from grep on the current file):

- `const transaction = hydrate(transactionSchema, result.Item);` → `const transaction = TransactionEntity.fromPersistence(hydrate(transactionSchema, result.Item));`
- Any `items.map((item) => hydrate(transactionSchema, item))` pattern → `items.map((item) => TransactionEntity.fromPersistence(hydrate(transactionSchema, item)))`
- For the pagination call that uses `transactionDbItemSchema`: the returned items carry `createdAtSortable`. Strip `createdAtSortable` before calling `fromPersistence`:

  ```ts
  items.map((item) => {
    const dbItem = hydrate(transactionDbItemSchema, item);
    const { createdAtSortable: _createdAtSortable, ...data } = dbItem;
    return TransactionEntity.fromPersistence(data);
  });
  ```

  (Name the unused destructured field with a leading underscore or use whatever convention the codebase uses for ignored destructuring.)

- [ ] **Step 3: Serialize via `.toData()` on writes**

In `create`, replace `const dbItem: TransactionDbItem = { ...transaction, createdAtSortable: ... }` with:

```ts
const data = transaction.toData();
const dbItem: TransactionDbItem = {
  ...data,
  createdAtSortable: buildCreatedAtSortable(data),
};
```

(Preserve whatever exact expression the current code uses to compute `createdAtSortable`.)

In `createMany`, apply the same `.toData()` pattern inside the `.map(...)` that builds `dbItem`s.

In `update` and `updateMany`, the function `buildUpdateParams(transaction)` is called. Open `buildUpdateParams` in the same file and change its signature from accepting `Transaction` to accepting either `Transaction` (still works — fields are readable) or to internally call `.toData()`. Simplest: at the top of `buildUpdateParams`, do:

```ts
const data = transaction.toData();
```

and reference `data.foo` instead of `transaction.foo` for the rest of the function body. This guarantees serialization consistency.

- [ ] **Step 4: Return `Transaction` instance from `update` and `updateMany`**

Current `update` returns `{ ...transaction, version: transaction.version + 1 }`. Change to:

```ts
return TransactionEntity.fromPersistence({
  ...transaction.toData(),
  version: transaction.version + 1,
});
```

Current `updateMany` returns an array of similar plain objects. Change to:

```ts
return transactions.map((transaction) =>
  TransactionEntity.fromPersistence({
    ...transaction.toData(),
    version: transaction.version + 1,
  }),
);
```

- [ ] **Step 5: Run repository integration test**

Run: `npm --prefix backend test -- src/repositories/dyn-transaction-repository.test.ts`
Expected: all pass. Any failures likely involve assertions comparing returned objects to plain-object literals — Jest's `toEqual` treats instances with matching fields as equal, so this usually works. If a strict `toStrictEqual` is used, convert expected values through `TransactionEntity.fromPersistence(fakeTransactionData({ ... }))` or assert on `.toData()` equality.

- [ ] **Step 6: Run full test suite**

Run: `npm --prefix backend test`
Expected: all pass.

- [ ] **Step 7: Stage changes**

```bash
git add backend/src/repositories/dyn-transaction-repository.ts
```

---

## Task 8: Drop injected model functions from `TransactionServiceImpl`

**Files:**
- Modify: `backend/src/services/transaction-service.ts`
- Modify: `backend/src/services/transaction-service.test.ts`

- [ ] **Step 1: Update imports in `transaction-service.ts`**

Replace:

```ts
import {
  NonTransferTransactionType,
  Transaction,
  TransactionPattern,
  TransactionPatternType,
  TransactionType,
  archiveTransactionModel as defaultArchiveTransactionModel,
  createTransactionModel as defaultCreateTransactionModel,
  updateTransactionModel as defaultUpdateTransactionModel,
} from "../models/transaction";
```

with:

```ts
import {
  NonTransferTransactionType,
  Transaction,
  TransactionEntity,
  TransactionPattern,
  TransactionPatternType,
  TransactionType,
} from "../models/transaction";
```

- [ ] **Step 2: Drop injected model fields and constructor params**

In `TransactionServiceImpl`, delete these private fields:

```ts
private createTransactionModel: typeof defaultCreateTransactionModel;
private updateTransactionModel: typeof defaultUpdateTransactionModel;
private archiveTransactionModel: typeof defaultArchiveTransactionModel;
```

Delete their constructor-param counterparts in the `deps` object type. Delete their assignments in the constructor body. The remaining constructor takes only `accountRepository`, `categoryRepository`, `transactionRepository`.

- [ ] **Step 3: Replace `createTransaction` body's model call**

Replace:

```ts
const transaction = this.createTransactionModel({
  ...input,
  userId,
  account,
  category,
});
```

with:

```ts
const transaction = TransactionEntity.create({
  ...input,
  userId,
  account,
  category,
});
```

- [ ] **Step 4: Replace `updateTransaction` body's model call**

Replace:

```ts
const updated = this.updateTransactionModel(existingTransaction, {
  account,
  category,
  type: input.type,
  amount: input.amount,
  date: input.date,
  description: input.description,
});
```

with:

```ts
const updated = existingTransaction.update({
  account,
  category,
  type: input.type,
  amount: input.amount,
  date: input.date,
  description: input.description,
});
```

- [ ] **Step 5: Replace `deleteTransaction` body's model call**

Replace:

```ts
const archived = this.archiveTransactionModel(existingTransaction);
```

with:

```ts
const archived = existingTransaction.archive();
```

- [ ] **Step 6: Remove model-function injections from `transaction-service.test.ts`** `[requires jest-tests skill]`

Search for any test setup that builds `TransactionServiceImpl` with injected `createTransactionModel`, `updateTransactionModel`, or `archiveTransactionModel`. Delete those injections. If a test asserts a mock was called (e.g. `expect(mockCreateTransactionModel).toHaveBeenCalledWith(...)`), rewrite the assertion to check the persisted state on the repository mock instead — e.g. `expect(transactionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 42 }))`.

- [ ] **Step 7: Run service test**

Run: `npm --prefix backend test -- src/services/transaction-service.test.ts`
Expected: all pass.

- [ ] **Step 8: Run full test suite**

Run: `npm --prefix backend test`
Expected: all pass.

- [ ] **Step 9: Stage changes**

```bash
git add backend/src/services/transaction-service.ts backend/src/services/transaction-service.test.ts
```

---

## Task 9: Drop injected model functions from `TransferService`

**Files:**
- Modify: `backend/src/services/transfer-service.ts`
- Modify: `backend/src/services/transfer-service.test.ts`

- [ ] **Step 1: Update imports**

Replace:

```ts
import {
  Transaction,
  TransactionType,
  archiveTransactionModel as defaultArchiveTransactionModel,
  createTransactionModel as defaultCreateTransactionModel,
  updateTransactionModel as defaultUpdateTransactionModel,
} from "../models/transaction";
```

with:

```ts
import {
  Transaction,
  TransactionEntity,
  TransactionType,
} from "../models/transaction";
```

- [ ] **Step 2: Drop injected fields and constructor params**

Delete the three private model fields and their constructor wiring (mirror Task 8 Step 2).

- [ ] **Step 3: Replace model calls in `createTransfer`**

Replace the two `this.createTransactionModel({ ... })` calls (lines 115 and 126 in the current file) with `TransactionEntity.create({ ... })`. Arguments unchanged.

- [ ] **Step 4: Replace model call in `deleteTransfer`**

Replace:

```ts
const archivedTransactions = transferTransactions.map((transaction) =>
  this.archiveTransactionModel(transaction),
);
```

with:

```ts
const archivedTransactions = transferTransactions.map((transaction) =>
  transaction.archive(),
);
```

- [ ] **Step 5: Replace model calls in `updateTransfer`**

Replace:

```ts
const updatedOutbound = this.updateTransactionModel(outboundTransaction, { ... });
const updatedInbound = this.updateTransactionModel(inboundTransaction, { ... });
```

with:

```ts
const updatedOutbound = outboundTransaction.update({ ... });
const updatedInbound = inboundTransaction.update({ ... });
```

- [ ] **Step 6: Remove model-function injections from `transfer-service.test.ts`** `[requires jest-tests skill]`

Same pattern as Task 8 Step 6.

- [ ] **Step 7: Run service test**

Run: `npm --prefix backend test -- src/services/transfer-service.test.ts`
Expected: all pass.

- [ ] **Step 8: Run full test suite**

Run: `npm --prefix backend test`
Expected: all pass.

- [ ] **Step 9: Stage changes**

```bash
git add backend/src/services/transfer-service.ts backend/src/services/transfer-service.test.ts
```

---

## Task 10: Migrate `getSignedAmount` call sites

**Files:**
- Modify: `backend/src/services/account-service.ts`
- Modify: `backend/src/services/by-category-report-service.ts`
- Modify: `backend/src/langchain/tools/aggregate-transactions.ts`

- [ ] **Step 1: `account-service.ts`**

Remove the import of `getSignedAmount` from `../models/transaction`. Replace `(sum, transaction) => sum + getSignedAmount(transaction)` with `(sum, transaction) => sum + transaction.signedAmount`.

- [ ] **Step 2: `by-category-report-service.ts`**

Remove the `getSignedAmount` import. Open the file and locate the two call sites (from grep): around line 89 (`-getSignedAmount(transaction)`) and line 100 (`amountGetter = getSignedAmount`). The local `amountGetter: typeof getSignedAmount` typing becomes `amountGetter: (transaction: Transaction) => number`. The two branches:

```ts
// before
let amountGetter: typeof getSignedAmount;
if (invertAmounts) {
  amountGetter = (transaction) => -getSignedAmount(transaction);
} else {
  amountGetter = getSignedAmount;
}
```

```ts
// after
let amountGetter: (transaction: Transaction) => number;
if (invertAmounts) {
  amountGetter = (transaction) => -transaction.signedAmount;
} else {
  amountGetter = (transaction) => transaction.signedAmount;
}
```

Adjust imports so `Transaction` is in scope if not already.

- [ ] **Step 3: `aggregate-transactions.ts`**

Remove `getSignedAmount` from the import `{ TransactionType, getSignedAmount }`. Replace `const signedAmount = getSignedAmount(transaction);` with `const signedAmount = transaction.signedAmount;`.

- [ ] **Step 4: Run tests for the affected areas**

Run: `npm --prefix backend test -- src/services/account-service.test.ts src/services/by-category-report-service.test.ts src/langchain/tools/aggregate-transactions.test.ts`
Expected: all pass.

- [ ] **Step 5: Run full test suite**

Run: `npm --prefix backend test`
Expected: all pass.

- [ ] **Step 6: Stage changes**

```bash
git add backend/src/services/account-service.ts backend/src/services/by-category-report-service.ts backend/src/langchain/tools/aggregate-transactions.ts
```

---

## Task 11: Delete free functions, delete old test file, tighten `Transaction` interface

**Files:**
- Modify: `backend/src/models/transaction.ts`
- Delete: `backend/src/models/transaction.test.ts`

- [ ] **Step 1: Delete free functions from `transaction.ts`**

Remove the four exports:

- `export function createTransactionModel(...)` block.
- `export function updateTransactionModel(...)` block.
- `export function archiveTransactionModel(...)` block.
- `export function getSignedAmount(...)` block.

The private helper `assertTransactionInvariants` (old free-function version) is now unreferenced — delete it. The `normalizeDescription` helper is still referenced by `TransactionEntity.create` and `TransactionEntity.update` — keep it.

- [ ] **Step 2: Tighten `Transaction` interface**

Replace:

```ts
export interface Transaction {
  userId: string;
  id: string;
  // ... all fields ...
}
```

with:

```ts
export interface Transaction extends TransactionData {
  readonly signedAmount: number;
  update(
    input: UpdateTransactionInput,
    deps?: { clock?: () => Date },
  ): Transaction;
  archive(deps?: { clock?: () => Date }): Transaction;
  toData(): TransactionData;
}
```

Move `TransactionData` above `Transaction` in the file (if not already) so the `extends` resolves.

- [ ] **Step 3: Declare that `TransactionEntity implements Transaction`**

Change the class declaration from `export class TransactionEntity {` to `export class TransactionEntity implements Transaction {`. TypeScript will verify every member of `Transaction` is present on the class. The return types of `create`, `fromPersistence`, `update`, `archive` can tighten from `TransactionEntity` to `Transaction` (optional — leaving them as `TransactionEntity` is still valid since `TransactionEntity implements Transaction`). Prefer to return `Transaction` from public statics and instance methods so callers code against the interface:

```ts
static create(...): Transaction { ... }
static fromPersistence(...): Transaction { ... }
update(...): Transaction { ... }
archive(...): Transaction { ... }
```

- [ ] **Step 4: Delete the old test file**

```bash
git rm backend/src/models/transaction.test.ts
```

- [ ] **Step 5: Run typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean. Any error here is a consumer that still imports one of the deleted free functions — fix by migrating the consumer (should not happen if Tasks 8–10 covered everything; grep to confirm: `rg 'createTransactionModel|updateTransactionModel|archiveTransactionModel|getSignedAmount' backend/src` — only the `transaction.ts` file should remain, and only via the class's private helper references if any, which there shouldn't be).

- [ ] **Step 6: Run full test suite**

Run: `npm --prefix backend test`
Expected: all pass.

- [ ] **Step 7: Stage changes**

```bash
git add backend/src/models/transaction.ts
```

---

## Task 12: Final validation pipeline

- [ ] **Step 1: Run full test suite from backend root**

Run: `npm --prefix backend test`
Expected: all pass.

- [ ] **Step 2: Run typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean.

- [ ] **Step 3: Run formatter / linter**

Run: `npm --prefix backend run format`
Expected: clean; no files reformatted unexpectedly. If any files are touched, stage them.

- [ ] **Step 4: Grep for leftover references to the removed free functions**

Run: `grep -rn "createTransactionModel\|updateTransactionModel\|archiveTransactionModel\|getSignedAmount" backend/src`
Expected: no results.

- [ ] **Step 5: Grep for direct `getSignedAmount` imports in any overlooked file**

Run: `grep -rn "from .*models/transaction" backend/src | grep -v test`
Expected: imports use `Transaction`, `TransactionData`, `TransactionEntity`, `TransactionType`, `NonTransferTransactionType`, `TransactionPattern`, `TransactionPatternType`, `CreateTransactionInput`, `UpdateTransactionInput` — nothing else.

- [ ] **Step 6: Stop and hand off for user review**

All staged. Working tree is ready for the user to inspect with `git diff --cached` and commit when they choose.

---

## Acceptance

All checked from Task 12:

- Full backend test suite passes.
- `npm --prefix backend run typecheck` clean.
- `npm --prefix backend run format` clean.
- No remaining references to `createTransactionModel`, `updateTransactionModel`, `archiveTransactionModel`, or `getSignedAmount` in `backend/src`.
- `Transaction`, `TransactionData`, `TransactionEntity` exported from `backend/src/models/transaction.ts`.
- `DynTransactionRepository` read methods return `TransactionEntity` instances typed as `Transaction`.
- `DynTransactionRepository.update` and `updateMany` return `TransactionEntity` instances with bumped version.
- `TransactionServiceImpl` and `TransferService` no longer accept injected model functions.
