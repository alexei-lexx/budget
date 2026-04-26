# Account Domain Entity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `backend/src/models/account.ts` from a plain interface into an immutable domain entity (class named `Account` implementing an `AccountData` interface). Add an OCC `version` field. Flip `DynAccountRepository` to instance-based writes (`create(account)`, `update(account)`), drop `archive`. Migrate every consumer.

**Architecture:** Split today's `Account` interface into `AccountData` (pure data shape) and a class `Account` exposing static factories `create` / `fromPersistence`, instance methods `update` / `archive` / `bumpVersion` / `toData`. Version bump happens in the repository on successful conditional write. Soft-deletion goes through `update(entity.archive())` — no `archive` repo method. Class is introduced under the parallel name `AccountEntity` to avoid colliding with the existing `Account` interface; the final task atomically renames it and deletes the old interface.

**Tech Stack:** TypeScript strict, Jest, Zod, DynamoDB (AWS SDK).

**Reference spec:** [`docs/superpowers/specs/2026-04-25-account-entity-design.md`](../specs/2026-04-25-account-entity-design.md).

**Commit policy:** Never run `git commit` as part of task execution. When a step reads "Stage changes" below, stage the listed files and stop. The user decides when to commit.

**Required skills:**
- **`jest-tests`** — every step that writes or modifies a Jest test starts with "Invoke `jest-tests` Skill via the Skill tool, then …". The Skill invocation is part of the step — it is not optional, not implicit, and not satisfied by recalling earlier guidance. Re-invoke per step, even if you invoked it for a previous step in the same task.
- **`backend-repository`** — every step that creates or modifies a repository file (`dyn-account-repository.ts` or its test) starts with "Invoke `backend-repository` Skill via the Skill tool, then …". Same rule as above: invoke per step.

---

## File Structure

Files created:

- `backend/src/models/account.test.ts` — class-level tests (new; today the model has no test file).
- `backend/src/migrations/<timestamp>-add-account-version.ts` — backfill `version = 0` on existing rows.

Files modified:

- `backend/src/models/account.ts` — adds `AccountData`, `CreateAccountInput`, `UpdateAccountInput`, `AccountEntity` class. Final task renames class to `Account` and removes the old interface.
- `backend/src/repositories/schemas/account.ts` — adds `version`; re-points `satisfies z.ZodType<AccountData>`.
- `backend/src/repositories/dyn-account-repository.ts` — hydrate via `AccountEntity.fromPersistence`; serialize via `.toData()`; flip `create` to `Promise<void>`; rewrite `update` with OCC; remove `archive`.
- `backend/src/repositories/dyn-account-repository.test.ts` — adapt for new signatures, drop `archive` tests, add OCC tests.
- `backend/src/ports/account-repository.ts` — drop `CreateAccountInput`/`UpdateAccountInput` exports; flip `create`/`update` signatures; remove `archive`.
- `backend/src/utils/test-utils/models/account-fakes.ts` — `fakeAccount` returns `AccountEntity` instance; `Partial<AccountData>` overrides; adds `version: 0`.
- `backend/src/utils/test-utils/repositories/account-repository-fakes.ts` — adapt to new repo signatures.
- `backend/src/utils/test-utils/repositories/account-repository-mocks.ts` — drop `archive` mock; flip `create`/`update` signatures.
- `backend/src/services/account-service.ts` — drop `validateName` / `validateCurrency`; rewrite `createAccount` / `updateAccount` / `deleteAccount` to use entity transitions.
- `backend/src/services/account-service.test.ts` — assertions match the new flow; drop direct repo `archive` calls.
- `backend/src/migrations/index.ts` — register the new migration.

Files unaffected (mentioned for confidence):

- `backend/src/graphql/resolvers/account-resolvers.ts` — consumes `Account` as a value; works without changes once class replaces interface.
- `backend/src/graphql/dataloaders/account-loader.ts` and its test — same.
- `backend/src/langchain/tools/account-dto.ts`, `create-account.ts`, `update-account.ts`, `get-accounts.ts` and their tests — same.
- `backend/src/services/transaction-service.ts`, `transfer-service.ts`, `by-category-report-service.ts` and their tests — they consume `Account` via `fakeAccount`; the return type of `fakeAccount` stays `Account`.

---

## Task 1: Add `add-account-version` migration

**Files:**
- Create: `backend/src/migrations/<timestamp>-add-account-version.ts`
- Modify: `backend/src/migrations/index.ts`

The migration is independent of the entity refactor and idempotent. Land it first so deployments can roll forward without coupling to the code change.

- [ ] **Step 1: Pick the timestamp**

Use `YYYYMMDDHHMMSS` for the current UTC moment. Example: `20260425141500-add-account-version.ts`.

- [ ] **Step 2: Create the migration file**

Create `backend/src/migrations/<timestamp>-add-account-version.ts` with:

```ts
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { requireEnv } from "../utils/require-env";

/**
 * Adds `version = 0` to every existing Account row.
 * Idempotent: `attribute_not_exists(version)` guards against re-application.
 * Must run before code that requires `version` on reads is deployed.
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = requireEnv("ACCOUNTS_TABLE_NAME");
  const docClient = DynamoDBDocumentClient.from(client);

  let scannedCount = 0;
  let updatedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log("Starting migration: backfilling version = 0 on accounts");

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
        if (error instanceof ConditionalCheckFailedException) {
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

- [ ] **Step 3: Register in migration index**

Open `backend/src/migrations/index.ts`. Add an import + registry entry that mirrors the existing `add-transaction-version` registration. (Match the file's existing style — alphabetical / chronological ordering as already followed.)

- [ ] **Step 4: Verify typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean.

- [ ] **Step 5: Verify full test suite**

Run: `npm --prefix backend test`
Expected: all pass.

- [ ] **Step 6: Stage changes**

```bash
git add backend/src/migrations/<timestamp>-add-account-version.ts backend/src/migrations/index.ts
```

---

## Task 2: Add `AccountData`, `CreateAccountInput`, `UpdateAccountInput` alongside existing `Account`

**Files:**
- Modify: `backend/src/models/account.ts`

Introduce the new types as new exports. The existing `Account` interface stays untouched. No consumer breaks.

- [ ] **Step 1: Replace the file content**

Open `backend/src/models/account.ts`. Replace the entire file with:

```ts
// Existing public interface — kept for backward compatibility through the
// migration. Final task renames the class `AccountEntity` to `Account` and
// deletes this interface.
export interface Account {
  id: string;
  userId: string;
  name: string;
  currency: string;
  initialBalance: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Pure data shape. Used by Zod, DynamoDB, and anywhere a value (not a domain
// object) is needed.
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

Note: `CreateAccountInput` / `UpdateAccountInput` previously lived in `ports/account-repository.ts`. They are not removed there yet; both copies coexist temporarily. Task 12 deletes the port copies.

- [ ] **Step 2: Verify typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean. (Two copies of `CreateAccountInput` / `UpdateAccountInput` exist in different modules — TypeScript treats them as distinct types but identical structurally; consumer code imports from one or the other.)

If any consumer imports from both modules and fails on a name clash, alias the import. Most consumers import from `ports/account-repository.ts` today; leave them as-is.

- [ ] **Step 3: Verify full test suite**

Run: `npm --prefix backend test`
Expected: all pass.

- [ ] **Step 4: Stage changes**

```bash
git add backend/src/models/account.ts
```

---

## Task 3: Failing test scaffold for `AccountEntity.create`

**Files:**
- Create: `backend/src/models/account.test.ts`

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then create the test file with one failing case**

Create `backend/src/models/account.test.ts`:

```ts
import { faker } from "@faker-js/faker";
import { describe, expect, it } from "@jest/globals";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "../types/validation";
import { AccountEntity, CreateAccountInput } from "./account";
import { ModelError } from "./model-error";

describe("AccountEntity", () => {
  describe("create", () => {
    const fixedClock = () => new Date("2000-01-02T10:11:12.000Z");
    const fixedIdGenerator = () => "fixed-uuid";
    const fixedDeps = { clock: fixedClock, idGenerator: fixedIdGenerator };

    const baseInput = (overrides: Partial<CreateAccountInput> = {}): CreateAccountInput => ({
      userId: faker.string.uuid(),
      name: "Cash",
      currency: "USD",
      initialBalance: 100,
      ...overrides,
    });

    it("builds an account with generated id, timestamps, version 0, and isArchived false", () => {
      const input = baseInput();
      const account = AccountEntity.create(input, fixedDeps);

      expect(account.id).toBe("fixed-uuid");
      expect(account.userId).toBe(input.userId);
      expect(account.name).toBe("Cash");
      expect(account.currency).toBe("USD");
      expect(account.initialBalance).toBe(100);
      expect(account.isArchived).toBe(false);
      expect(account.version).toBe(0);
      expect(account.createdAt).toBe("2000-01-02T10:11:12.000Z");
      expect(account.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails to compile**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: TypeScript / module resolution error — `AccountEntity` is not exported from `./account`.

- [ ] **Step 3: Stage changes**

```bash
git add backend/src/models/account.test.ts
```

---

## Task 4: Implement `AccountEntity` class with `create` and invariants

**Files:**
- Modify: `backend/src/models/account.ts`

Build the smallest class that makes Task 3's test pass, plus the invariants required by the spec. Subsequent tasks add `fromPersistence`, `update`, `archive`, `bumpVersion`, `toData` and tests.

- [ ] **Step 1: Add imports and a name-normalization helper**

At the top of `backend/src/models/account.ts`, add:

```ts
import { randomUUID } from "crypto";
import { isSupportedCurrency } from "../types/currency";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "../types/validation";
import { ModelError } from "./model-error";

const defaultClock = () => new Date();

function normalizeAccountName(name: string): string {
  return name.trim();
}
```

- [ ] **Step 2: Add the `AccountEntity` class below the existing exports**

Append to `backend/src/models/account.ts`:

```ts
export class AccountEntity implements AccountData {
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
    {
      clock = defaultClock,
      idGenerator = randomUUID,
    }: { clock?: () => Date; idGenerator?: () => string } = {},
  ): AccountEntity {
    const now = clock().toISOString();

    const data: AccountData = {
      id: idGenerator(),
      userId: input.userId,
      name: normalizeAccountName(input.name),
      currency: input.currency,
      initialBalance: input.initialBalance,
      isArchived: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };

    return new AccountEntity(data);
  }

  private constructor(
    data: AccountData,
    { skipInvariants = false }: { skipInvariants?: boolean } = {},
  ) {
    if (!skipInvariants) {
      AccountEntity.assertInvariants(data);
    }

    this.userId = data.userId;
    this.id = data.id;
    this.name = data.name;
    this.currency = data.currency;
    this.initialBalance = data.initialBalance;
    this.isArchived = data.isArchived;
    this.version = data.version;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  private static assertInvariants(data: AccountData): void {
    const trimmedLength = data.name.trim().length;
    if (
      trimmedLength < NAME_MIN_LENGTH ||
      trimmedLength > NAME_MAX_LENGTH
    ) {
      throw new ModelError(
        `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      );
    }

    if (!isSupportedCurrency(data.currency)) {
      throw new ModelError(`Unsupported currency: ${data.currency}`);
    }
  }
}
```

- [ ] **Step 3: Run the test to confirm it passes**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: PASS.

- [ ] **Step 4: Verify typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean.

- [ ] **Step 5: Verify full test suite**

Run: `npm --prefix backend test`
Expected: all pass.

- [ ] **Step 6: Stage changes**

```bash
git add backend/src/models/account.ts backend/src/models/account.test.ts
```

---

## Task 5: Add `create` invariant tests

**Files:**
- Modify: `backend/src/models/account.test.ts`

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then append invariant cases to `describe("create")`**

Inside the `describe("create")` block, after the first `it`, add:

```ts
it("trims the input name", () => {
  const account = AccountEntity.create(baseInput({ name: "  Cash  " }), fixedDeps);
  expect(account.name).toBe("Cash");
});

it("rejects a name shorter than NAME_MIN_LENGTH", () => {
  expect(() =>
    AccountEntity.create(baseInput({ name: "" }), fixedDeps),
  ).toThrow(ModelError);
});

it("rejects a name longer than NAME_MAX_LENGTH", () => {
  const tooLong = "a".repeat(NAME_MAX_LENGTH + 1);
  expect(() =>
    AccountEntity.create(baseInput({ name: tooLong }), fixedDeps),
  ).toThrow(ModelError);
});

it("rejects an unsupported currency", () => {
  expect(() =>
    AccountEntity.create(baseInput({ currency: "ZZZ" }), fixedDeps),
  ).toThrow(ModelError);
});

it("uses defaultClock and defaultIdGenerator when deps are omitted", () => {
  const account = AccountEntity.create(baseInput());
  expect(account.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(typeof account.createdAt).toBe("string");
  expect(account.createdAt).toBe(account.updatedAt);
});
```

- [ ] **Step 2: Run the file**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: all PASS.

- [ ] **Step 3: Stage changes**

```bash
git add backend/src/models/account.test.ts
```

---

## Task 6: Implement `fromPersistence` (with tests)

**Files:**
- Modify: `backend/src/models/account.ts`
- Modify: `backend/src/models/account.test.ts`

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then add the failing tests**

Inside `describe("AccountEntity")`, after `describe("create")`, add:

```ts
describe("fromPersistence", () => {
  const baseData = (overrides: Partial<AccountData> = {}): AccountData => ({
    userId: faker.string.uuid(),
    id: faker.string.uuid(),
    name: "Cash",
    currency: "USD",
    initialBalance: 100,
    isArchived: false,
    version: 3,
    createdAt: "2000-01-02T10:11:12.000Z",
    updatedAt: "2000-01-02T10:11:12.000Z",
    ...overrides,
  });

  it("rebuilds an instance preserving all fields", () => {
    const data = baseData();
    const account = AccountEntity.fromPersistence(data);

    expect(account.id).toBe(data.id);
    expect(account.userId).toBe(data.userId);
    expect(account.name).toBe(data.name);
    expect(account.currency).toBe(data.currency);
    expect(account.initialBalance).toBe(data.initialBalance);
    expect(account.isArchived).toBe(data.isArchived);
    expect(account.version).toBe(data.version);
    expect(account.createdAt).toBe(data.createdAt);
    expect(account.updatedAt).toBe(data.updatedAt);
  });

  it("re-runs invariants and rejects an invalid record", () => {
    expect(() =>
      AccountEntity.fromPersistence(baseData({ currency: "ZZZ" })),
    ).toThrow(ModelError);
  });
});
```

Add `import` for `AccountData`:

```ts
import { AccountData, AccountEntity, CreateAccountInput } from "./account";
```

- [ ] **Step 2: Run tests — expect compile failure**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: failure — `AccountEntity.fromPersistence` is not a function.

- [ ] **Step 3: Implement `fromPersistence`**

In `backend/src/models/account.ts`, add a static method to `AccountEntity` immediately after `create`:

```ts
static fromPersistence(data: AccountData): AccountEntity {
  return new AccountEntity(data);
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: all PASS.

- [ ] **Step 5: Stage changes**

```bash
git add backend/src/models/account.ts backend/src/models/account.test.ts
```

---

## Task 7: Implement `update` (with tests)

**Files:**
- Modify: `backend/src/models/account.ts`
- Modify: `backend/src/models/account.test.ts`

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then add failing tests**

Append to `describe("AccountEntity")`:

```ts
describe("update", () => {
  const fixedClock = () => new Date("2001-02-03T04:05:06.000Z");
  const fixedDeps = { clock: fixedClock };

  const existingData = (overrides: Partial<AccountData> = {}): AccountData => ({
    userId: faker.string.uuid(),
    id: faker.string.uuid(),
    name: "Cash",
    currency: "USD",
    initialBalance: 100,
    isArchived: false,
    version: 5,
    createdAt: "2000-01-02T10:11:12.000Z",
    updatedAt: "2000-01-02T10:11:12.000Z",
    ...overrides,
  });

  it("returns a new instance with updated fields and bumped updatedAt", () => {
    const existing = AccountEntity.fromPersistence(existingData());
    const next = existing.update(
      { name: "Wallet", initialBalance: 250 },
      fixedDeps,
    );

    expect(next).not.toBe(existing);
    expect(next.name).toBe("Wallet");
    expect(next.initialBalance).toBe(250);
    expect(next.currency).toBe(existing.currency);
    expect(next.updatedAt).toBe("2001-02-03T04:05:06.000Z");
    expect(next.createdAt).toBe(existing.createdAt);
    expect(next.version).toBe(existing.version);
    expect(next.isArchived).toBe(false);
  });

  it("trims a new name", () => {
    const existing = AccountEntity.fromPersistence(existingData());
    const next = existing.update({ name: "  Wallet  " }, fixedDeps);
    expect(next.name).toBe("Wallet");
  });

  it("preserves unchanged fields when input omits them", () => {
    const existing = AccountEntity.fromPersistence(existingData());
    const next = existing.update({}, fixedDeps);
    expect(next.name).toBe(existing.name);
    expect(next.currency).toBe(existing.currency);
    expect(next.initialBalance).toBe(existing.initialBalance);
    expect(next.updatedAt).toBe("2001-02-03T04:05:06.000Z");
  });

  it("rejects updates to an archived account", () => {
    const existing = AccountEntity.fromPersistence(existingData({ isArchived: true }));
    expect(() => existing.update({ name: "Wallet" }, fixedDeps)).toThrow(ModelError);
  });

  it("rejects an invalid new name", () => {
    const existing = AccountEntity.fromPersistence(existingData());
    expect(() => existing.update({ name: "" }, fixedDeps)).toThrow(ModelError);
  });

  it("rejects an unsupported new currency", () => {
    const existing = AccountEntity.fromPersistence(existingData());
    expect(() => existing.update({ currency: "ZZZ" }, fixedDeps)).toThrow(ModelError);
  });
});
```

Add `UpdateAccountInput` to imports if needed.

- [ ] **Step 2: Run tests — expect failure**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: failure — `update` not a method on `AccountEntity`.

- [ ] **Step 3: Implement `update`**

In `backend/src/models/account.ts`, add to `AccountEntity` after `fromPersistence`:

```ts
update(
  input: UpdateAccountInput,
  { clock = defaultClock }: { clock?: () => Date } = {},
): AccountEntity {
  if (this.isArchived) {
    throw new ModelError("Cannot update archived account");
  }

  const now = clock().toISOString();

  const data: AccountData = {
    userId: this.userId,
    id: this.id,
    name:
      input.name !== undefined ? normalizeAccountName(input.name) : this.name,
    currency: input.currency ?? this.currency,
    initialBalance: input.initialBalance ?? this.initialBalance,
    isArchived: this.isArchived,
    version: this.version,
    createdAt: this.createdAt,
    updatedAt: now,
  };

  return new AccountEntity(data);
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: all PASS.

- [ ] **Step 5: Stage changes**

```bash
git add backend/src/models/account.ts backend/src/models/account.test.ts
```

---

## Task 8: Implement `archive` (with tests)

**Files:**
- Modify: `backend/src/models/account.ts`
- Modify: `backend/src/models/account.test.ts`

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then add failing tests**

Append to `describe("AccountEntity")`:

```ts
describe("archive", () => {
  const fixedClock = () => new Date("2001-02-03T04:05:06.000Z");

  it("returns a new instance with isArchived true and bumped updatedAt", () => {
    const existing = AccountEntity.fromPersistence({
      userId: faker.string.uuid(),
      id: faker.string.uuid(),
      name: "Cash",
      currency: "USD",
      initialBalance: 100,
      isArchived: false,
      version: 7,
      createdAt: "2000-01-02T10:11:12.000Z",
      updatedAt: "2000-01-02T10:11:12.000Z",
    });

    const archived = existing.archive({ clock: fixedClock });

    expect(archived).not.toBe(existing);
    expect(archived.isArchived).toBe(true);
    expect(archived.updatedAt).toBe("2001-02-03T04:05:06.000Z");
    expect(archived.version).toBe(existing.version);
    expect(archived.name).toBe(existing.name);
  });

  it("rejects archiving an already-archived account", () => {
    const existing = AccountEntity.fromPersistence({
      userId: faker.string.uuid(),
      id: faker.string.uuid(),
      name: "Cash",
      currency: "USD",
      initialBalance: 100,
      isArchived: true,
      version: 7,
      createdAt: "2000-01-02T10:11:12.000Z",
      updatedAt: "2000-01-02T10:11:12.000Z",
    });

    expect(() => existing.archive({ clock: fixedClock })).toThrow(ModelError);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: failure.

- [ ] **Step 3: Implement `archive`**

In `backend/src/models/account.ts`, add to `AccountEntity` after `update`:

```ts
archive({ clock = defaultClock }: { clock?: () => Date } = {}): AccountEntity {
  if (this.isArchived) {
    throw new ModelError("Cannot archive archived account");
  }

  const now = clock().toISOString();

  const data: AccountData = {
    userId: this.userId,
    id: this.id,
    name: this.name,
    currency: this.currency,
    initialBalance: this.initialBalance,
    isArchived: true,
    version: this.version,
    createdAt: this.createdAt,
    updatedAt: now,
  };

  return new AccountEntity(data);
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: all PASS.

- [ ] **Step 5: Stage changes**

```bash
git add backend/src/models/account.ts backend/src/models/account.test.ts
```

---

## Task 9: Implement `bumpVersion` (with tests)

**Files:**
- Modify: `backend/src/models/account.ts`
- Modify: `backend/src/models/account.test.ts`

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then add failing tests**

Append to `describe("AccountEntity")`:

```ts
describe("bumpVersion", () => {
  it("returns a new instance with version + 1 and all other fields preserved", () => {
    const existing = AccountEntity.fromPersistence({
      userId: faker.string.uuid(),
      id: faker.string.uuid(),
      name: "Cash",
      currency: "USD",
      initialBalance: 100,
      isArchived: false,
      version: 5,
      createdAt: "2000-01-02T10:11:12.000Z",
      updatedAt: "2000-01-02T10:11:12.000Z",
    });

    const bumped = existing.bumpVersion();

    expect(bumped.version).toBe(6);
    expect(bumped.name).toBe(existing.name);
    expect(bumped.updatedAt).toBe(existing.updatedAt);
    expect(bumped).not.toBe(existing);
  });

});
```

(Skip-invariants behavior is exercised end-to-end via the repo's OCC path on records that pre-date stricter invariants; no model-level test for it.)

- [ ] **Step 2: Run tests — expect failure**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: failure — `bumpVersion` not a method.

- [ ] **Step 3: Implement `bumpVersion`**

In `backend/src/models/account.ts`, add to `AccountEntity` after `archive`:

```ts
bumpVersion(): AccountEntity {
  const data: AccountData = {
    userId: this.userId,
    id: this.id,
    name: this.name,
    currency: this.currency,
    initialBalance: this.initialBalance,
    isArchived: this.isArchived,
    version: this.version + 1,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };

  return new AccountEntity(data, { skipInvariants: true });
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: all PASS.

- [ ] **Step 5: Stage changes**

```bash
git add backend/src/models/account.ts backend/src/models/account.test.ts
```

---

## Task 10: Implement `toData` (with tests)

**Files:**
- Modify: `backend/src/models/account.ts`
- Modify: `backend/src/models/account.test.ts`

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then add failing tests**

Append to `describe("AccountEntity")`:

```ts
describe("toData", () => {
  it("returns a plain object with all fields and no methods", () => {
    const existing = AccountEntity.fromPersistence({
      userId: faker.string.uuid(),
      id: faker.string.uuid(),
      name: "Cash",
      currency: "USD",
      initialBalance: 100,
      isArchived: false,
      version: 5,
      createdAt: "2000-01-02T10:11:12.000Z",
      updatedAt: "2000-01-02T10:11:12.000Z",
    });

    const data = existing.toData();

    expect(data).toEqual({
      userId: existing.userId,
      id: existing.id,
      name: existing.name,
      currency: existing.currency,
      initialBalance: existing.initialBalance,
      isArchived: existing.isArchived,
      version: existing.version,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    });
    // Methods on the original instance are not enumerated on the result.
    expect((data as Record<string, unknown>).update).toBeUndefined();
    expect((data as Record<string, unknown>).archive).toBeUndefined();
    expect((data as Record<string, unknown>).bumpVersion).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: failure — `toData` not a method.

- [ ] **Step 3: Implement `toData`**

In `backend/src/models/account.ts`, add to `AccountEntity` after `bumpVersion`:

```ts
toData(): AccountData {
  return {
    userId: this.userId,
    id: this.id,
    name: this.name,
    currency: this.currency,
    initialBalance: this.initialBalance,
    isArchived: this.isArchived,
    version: this.version,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm --prefix backend test -- src/models/account.test.ts`
Expected: all PASS.

- [ ] **Step 5: Verify full test suite**

Run: `npm --prefix backend test`
Expected: all PASS.

- [ ] **Step 6: Stage changes**

```bash
git add backend/src/models/account.ts backend/src/models/account.test.ts
```

---

## Task 11: Re-point Zod schema to `AccountData` and add `version`

**Files:**
- Modify: `backend/src/repositories/schemas/account.ts`

- [ ] **Step 1: Replace the schema definition**

Replace the contents of `backend/src/repositories/schemas/account.ts` with:

```ts
import { z } from "zod";
import type { AccountData } from "../../models/account";

export const accountSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().min(1),
  currency: z.string().length(3).uppercase(),
  initialBalance: z.number(),
  isArchived: z.boolean(),
  version: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<AccountData>;
```

- [ ] **Step 2: Verify typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean.

- [ ] **Step 3: Run repository tests — expect failures**

Run: `npm --prefix backend test -- src/repositories/dyn-account-repository.test.ts`
Expected: failures because seed rows lack `version`. Fixed in Task 13. Skip running again until then.

- [ ] **Step 4: Stage changes**

```bash
git add backend/src/repositories/schemas/account.ts
```

---

## Task 12: Update `fakeAccount` to return an `AccountEntity` instance

**Files:**
- Modify: `backend/src/utils/test-utils/models/account-fakes.ts`

- [ ] **Step 1: Replace the fake**

Replace `backend/src/utils/test-utils/models/account-fakes.ts` with:

```ts
import { faker } from "@faker-js/faker";
import { Account, AccountData, AccountEntity } from "../../../models/account";

export const fakeAccount = (overrides: Partial<AccountData> = {}): Account => {
  const now = new Date().toISOString();
  const data: AccountData = {
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
  };
  return AccountEntity.fromPersistence(data);
};
```

`Account` is the existing interface (not yet replaced). `AccountEntity` is structurally compatible with the interface (it has all the interface's fields), so the assignment is sound.

- [ ] **Step 2: Verify typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean.

- [ ] **Step 3: Run dependent tests**

Run: `npm --prefix backend test -- src/services`
Expected: all PASS (consumers see structurally-compatible objects).

- [ ] **Step 4: Stage changes**

```bash
git add backend/src/utils/test-utils/models/account-fakes.ts
```

---

## Task 13: Migrate `DynAccountRepository`

**Files:**
- Modify: `backend/src/repositories/dyn-account-repository.ts`
- Modify: `backend/src/repositories/dyn-account-repository.test.ts`

- [ ] **Step 1: Invoke `backend-repository` Skill via the Skill tool, then replace the file**

Replace `backend/src/repositories/dyn-account-repository.ts` with the version below. Changes vs. current:

- `findOneById`, `findManyByUserId`, `findManyWithArchivedByIds`, `findManyWithArchivedByUserId` wrap the hydrated record via `AccountEntity.fromPersistence(data)`.
- `create(account: Readonly<Account>): Promise<void>` — accepts an instance, persists `account.toData()`, returns void. Adds `attribute_not_exists(id)` condition.
- `update(account: Readonly<Account>): Promise<Account>` — OCC; throws `VersionConflictError` on version mismatch; returns `account.bumpVersion()` on success.
- `archive` removed entirely.

```ts
import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Account, AccountEntity } from "../models/account";
import { AccountRepository } from "../ports/account-repository";
import { RepositoryError } from "../ports/repository-error";
import { VersionConflictError } from "../ports/version-conflict-error";
import { DynBaseRepository } from "./dyn-base-repository";
import { accountSchema } from "./schemas/account";
import { hydrate } from "./utils/hydrate";
import { paginateQuery } from "./utils/query";

export class DynAccountRepository
  extends DynBaseRepository
  implements AccountRepository
{
  async findOneById({
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
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { userId, id },
        }),
      );
      if (!result.Item) {
        return null;
      }
      const data = hydrate(accountSchema, result.Item);
      const account = AccountEntity.fromPersistence(data);
      if (account.isArchived) {
        return null;
      }
      return account;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      console.error("Error finding account by ID:", error);
      throw new RepositoryError("Failed to find account", "GET_FAILED", error);
    }
  }

  async findManyByUserId(userId: string): Promise<Account[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }
    try {
      const result = await paginateQuery({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          FilterExpression: "isArchived = :isArchived",
          ExpressionAttributeValues: {
            ":userId": userId,
            ":isArchived": false,
          },
        },
        pageSize: undefined,
        schema: accountSchema,
      });
      const accounts = result.items.map((data) =>
        AccountEntity.fromPersistence(data),
      );
      return accounts.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      console.error("Error finding active accounts by user ID:", error);
      throw new RepositoryError(
        "Failed to find active accounts",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findManyWithArchivedByIds({
    ids,
    userId,
  }: {
    ids: readonly string[];
    userId: string;
  }): Promise<Account[]> {
    if (ids.length === 0) {
      return [];
    }
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }
    try {
      const result = await this.client.send(
        new BatchGetCommand({
          RequestItems: {
            [this.tableName]: {
              Keys: ids.map((id) => ({ userId, id })),
            },
          },
        }),
      );
      return (result.Responses?.[this.tableName] || []).map((item) =>
        AccountEntity.fromPersistence(hydrate(accountSchema, item)),
      );
    } catch (error) {
      console.error("Error batch finding accounts by IDs:", error);
      throw new RepositoryError(
        "Failed to batch find accounts",
        "BATCH_GET_FAILED",
        error,
      );
    }
  }

  async findManyWithArchivedByUserId(userId: string): Promise<Account[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }
    try {
      const result = await paginateQuery({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId },
        },
        pageSize: undefined,
        schema: accountSchema,
      });
      return result.items.map((data) => AccountEntity.fromPersistence(data));
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      console.error("Error finding all accounts by user ID:", error);
      throw new RepositoryError(
        "Failed to find all accounts",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async create(account: Readonly<Account>): Promise<void> {
    const data = account.toData();
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: data,
          ConditionExpression: "attribute_not_exists(id)",
        }),
      );
    } catch (error) {
      console.error("Error creating account:", error);
      throw new RepositoryError(
        "Failed to create account",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async update(account: Readonly<Account>): Promise<Account> {
    const data = account.toData();
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { userId: data.userId, id: data.id },
          UpdateExpression:
            "SET #name = :name, currency = :currency, initialBalance = :initialBalance, isArchived = :isArchived, updatedAt = :updatedAt, version = :nextVersion",
          ConditionExpression:
            "attribute_exists(id) AND version = :currentVersion",
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
        }),
      );
      return account.bumpVersion();
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new VersionConflictError("Account version conflict");
      }
      console.error("Error updating account:", error);
      throw new RepositoryError(
        "Failed to update account",
        "UPDATE_FAILED",
        error,
      );
    }
  }
}
```

`Account` (the still-current interface) lacks `toData` and `bumpVersion`. The argument type widening will flag this on typecheck. To make TypeScript happy until Task 14, type the parameter as `AccountEntity` here — but that breaks the interface. Cleaner alternative: import `AccountEntity` from the model and type the parameter as `Readonly<AccountEntity>`. Update `AccountRepository` interface in the next step accordingly.

Update the parameter type in BOTH `create` and `update` in this file to `Readonly<AccountEntity>`.

- [ ] **Step 2: Run typecheck**

Run: `npm --prefix backend run typecheck`
Expected: errors in the port (`AccountRepository` still declares old signatures). Fixed in next task.

- [ ] **Step 3: Stage changes**

```bash
git add backend/src/repositories/dyn-account-repository.ts
```

---

## Task 14: Update `AccountRepository` port interface

**Files:**
- Modify: `backend/src/ports/account-repository.ts`

- [ ] **Step 1: Replace the file**

Replace `backend/src/ports/account-repository.ts` with:

```ts
import { Account, AccountEntity } from "../models/account";

export interface AccountRepository {
  findOneById(selector: {
    id: string;
    userId: string;
  }): Promise<Account | null>;
  findManyByUserId(userId: string): Promise<Account[]>;
  findManyWithArchivedByIds(selector: {
    ids: readonly string[];
    userId: string;
  }): Promise<Account[]>;
  findManyWithArchivedByUserId(userId: string): Promise<Account[]>;
  create(account: Readonly<AccountEntity>): Promise<void>;
  update(account: Readonly<AccountEntity>): Promise<Account>;
}
```

`CreateAccountInput` / `UpdateAccountInput` are no longer exported here. Consumers must import them from `../models/account`.

- [ ] **Step 2: Verify typecheck — expect failures in service code**

Run: `npm --prefix backend run typecheck`
Expected: errors in `account-service.ts` (uses removed inputs / methods) and possibly in langchain tools that imported `CreateAccountInput` / `UpdateAccountInput` from the port. Fix in subsequent tasks.

- [ ] **Step 3: Stage changes**

```bash
git add backend/src/ports/account-repository.ts
```

---

## Task 15: Migrate `AccountServiceImpl`

**Files:**
- Modify: `backend/src/services/account-service.ts`
- Modify: `backend/src/services/account-service.test.ts`

- [ ] **Step 1: Replace the service file**

Replace `backend/src/services/account-service.ts` with:

```ts
import {
  Account,
  AccountEntity,
  CreateAccountInput,
  UpdateAccountInput,
} from "../models/account";
import { AccountRepository } from "../ports/account-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { BusinessError } from "./business-error";

export interface AccountService {
  getAccountsByUser(userId: string): Promise<Account[]>;
  calculateBalance(accountId: string, userId: string): Promise<number>;
  createAccount(input: CreateAccountInput): Promise<Account>;
  updateAccount(
    id: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Account>;
  deleteAccount(id: string, userId: string): Promise<Account>;
}

export class AccountServiceImpl implements AccountService {
  constructor(
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  async getAccountsByUser(userId: string): Promise<Account[]> {
    return await this.accountRepository.findManyByUserId(userId);
  }

  async calculateBalance(accountId: string, userId: string): Promise<number> {
    const account = await this.accountRepository.findOneById({
      id: accountId,
      userId,
    });
    if (!account) {
      throw new BusinessError("Account not found or doesn't belong to user");
    }
    const transactions =
      await this.transactionRepository.findManyByAccountId({
        accountId,
        userId,
      });
    return transactions.reduce(
      (sum, transaction) => sum + transaction.signedAmount,
      account.initialBalance,
    );
  }

  async createAccount(input: CreateAccountInput): Promise<Account> {
    // Cheap entity invariants run first.
    const account = AccountEntity.create(input);
    await this.checkDuplicateName(account.userId, account.name);
    await this.accountRepository.create(account);
    return account;
  }

  async updateAccount(
    id: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Account> {
    const existing = await this.accountRepository.findOneById({ id, userId });
    if (!existing) {
      throw new BusinessError("Account not found");
    }

    // existing is typed as Account but is actually an AccountEntity (the repo
    // returns instances). Narrow for entity transitions.
    const next = (existing as AccountEntity).update(input);

    if (input.name !== undefined && next.name !== existing.name) {
      await this.checkDuplicateName(userId, next.name, id);
    }

    if (input.currency && existing.currency !== next.currency) {
      const hasTransactions =
        await this.transactionRepository.hasTransactionsForAccount({
          accountId: id,
          userId,
        });
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
    if (!existing) {
      throw new BusinessError("Account not found");
    }
    return await this.accountRepository.update(
      (existing as AccountEntity).archive(),
    );
  }

  private async checkDuplicateName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existingAccounts =
      await this.accountRepository.findManyByUserId(userId);
    const duplicateAccount = existingAccounts.find(
      (account) =>
        account.name.toLowerCase() === name.toLowerCase() &&
        account.id !== excludeId,
    );
    if (duplicateAccount) {
      throw new BusinessError(`Account "${name}" already exists`);
    }
  }
}
```

The `as AccountEntity` casts are temporary noise; Task 17 (final flip) replaces the `Account` interface with the class, dropping the casts.

`deleteAccount` previously returned the result of `repo.archive`. Now it returns the updated archived entity from `repo.update`.

- [ ] **Step 2: Invoke `jest-tests` Skill via the Skill tool, then adapt service tests**

Open `backend/src/services/account-service.test.ts` and:

- Replace any expectation on `accountRepository.archive` with an expectation on `accountRepository.update` receiving an entity whose `isArchived === true`.
- Replace any test that constructs an account literal with `fakeAccount({...})`.
- Update `deleteAccount` test: `expect(accountRepository.update).toHaveBeenCalledWith(expect.objectContaining({ isArchived: true, id }))`.
- Update `createAccount` tests: assert `accountRepository.create` was called with an `AccountEntity` instance (`expect.objectContaining({ id: expect.any(String), version: 0, isArchived: false, name: ... })`).
- Add a test for `createAccount` where invalid name throws *before* any repository call:

  ```ts
  it("rejects an invalid name before issuing DB calls", async () => {
    await expect(
      service.createAccount({
        userId: "u",
        name: "",
        currency: "USD",
        initialBalance: 0,
      }),
    ).rejects.toThrow();
    expect(accountRepository.findManyByUserId).not.toHaveBeenCalled();
    expect(accountRepository.create).not.toHaveBeenCalled();
  });
  ```

- Add a similar pre-DB rejection test for `updateAccount` when the new currency is unsupported.

- [ ] **Step 3: Run service tests**

Run: `npm --prefix backend test -- src/services/account-service.test.ts`
Expected: all PASS.

- [ ] **Step 4: Stage changes**

```bash
git add backend/src/services/account-service.ts backend/src/services/account-service.test.ts
```

---

## Task 16: Adapt repository tests, fakes, and mocks

**Files:**
- Modify: `backend/src/repositories/dyn-account-repository.test.ts`
- Modify: `backend/src/utils/test-utils/repositories/account-repository-fakes.ts`
- Modify: `backend/src/utils/test-utils/repositories/account-repository-mocks.ts`

- [ ] **Step 1: Invoke `jest-tests` Skill via the Skill tool, then update `account-repository-mocks.ts`**

Replace `backend/src/utils/test-utils/repositories/account-repository-mocks.ts` with:

```ts
import { jest } from "@jest/globals";
import { AccountRepository } from "../../../ports/account-repository";

/**
 * Mock account repository for testing
 */
export const createMockAccountRepository =
  (): jest.Mocked<AccountRepository> => ({
    findManyByUserId: jest.fn(),
    findManyWithArchivedByUserId: jest.fn(),
    findOneById: jest.fn(),
    findManyWithArchivedByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  });
```

(Removes `archive: jest.fn()`.)

- [ ] **Step 2: Invoke `jest-tests` Skill via the Skill tool, then update `account-repository-fakes.ts`**

The file only contains `fakeCreateAccountInput`. `CreateAccountInput` now lives in the model. Replace the file with:

```ts
import { faker } from "@faker-js/faker";
import { CreateAccountInput } from "../../../models/account";

export const fakeCreateAccountInput = (
  overrides: Partial<CreateAccountInput> = {},
): CreateAccountInput => {
  return {
    userId: faker.string.uuid(),
    name: `${faker.finance.accountName()}-${faker.string.uuid()}`,
    currency: "USD",
    initialBalance: faker.number.int({ min: 0, max: 10000 }),
    ...overrides,
  };
};
```

- [ ] **Step 3: Invoke `jest-tests` Skill via the Skill tool, then add `version` to seed data and rebuild `create`/`update` cases in repo test**

Open `backend/src/repositories/dyn-account-repository.test.ts`. For every helper that builds a raw account row (e.g. `createTestAccount`, `seedAccount`, inline `PutCommand` literals), add `version: 0`.

- [ ] **Step 4: Invoke `jest-tests` Skill via the Skill tool, then rewrite `create` test cases**

Replace the existing `describe("create")` block. Pattern:

```ts
describe("create", () => {
  it("persists an account and returns void", async () => {
    const account = AccountEntity.create({
      userId: "user-1",
      name: "Cash",
      currency: "USD",
      initialBalance: 100,
    });
    const result = await repository.create(account);
    expect(result).toBeUndefined();

    const stored = await repository.findOneById({
      id: account.id,
      userId: account.userId,
    });
    expect(stored).not.toBeNull();
    expect(stored?.name).toBe("Cash");
    expect(stored?.version).toBe(0);
  });

  it("rejects creating an account with a duplicate id", async () => {
    const account = AccountEntity.create({
      userId: "user-1",
      name: "Cash",
      currency: "USD",
      initialBalance: 100,
    });
    await repository.create(account);
    await expect(repository.create(account)).rejects.toThrow(RepositoryError);
  });
});
```

Add `import { AccountEntity } from "../models/account";` and `import { RepositoryError } from "../ports/repository-error";` if not already present.

- [ ] **Step 5: Invoke `jest-tests` Skill via the Skill tool, then replace `archive` tests with `update`-with-`archive()` tests, add OCC tests**

Delete the entire `describe("archive")` block. Replace `describe("update")` with:

```ts
describe("update", () => {
  it("persists changes, bumps version, returns the bumped instance", async () => {
    const account = AccountEntity.create({
      userId: "user-1",
      name: "Cash",
      currency: "USD",
      initialBalance: 100,
    });
    await repository.create(account);

    const next = account.update({ name: "Wallet", initialBalance: 250 });
    const result = await repository.update(next);

    expect(result.name).toBe("Wallet");
    expect(result.initialBalance).toBe(250);
    expect(result.version).toBe(account.version + 1);

    const reloaded = await repository.findOneById({
      id: account.id,
      userId: account.userId,
    });
    expect(reloaded?.name).toBe("Wallet");
    expect(reloaded?.version).toBe(account.version + 1);
  });

  it("archives via update with an archived entity", async () => {
    const account = AccountEntity.create({
      userId: "user-1",
      name: "Cash",
      currency: "USD",
      initialBalance: 100,
    });
    await repository.create(account);

    await repository.update(account.archive());

    const reloaded = await repository.findOneById({
      id: account.id,
      userId: account.userId,
    });
    // findOneById returns null for archived rows.
    expect(reloaded).toBeNull();
  });

  it("throws VersionConflictError when version is stale", async () => {
    const account = AccountEntity.create({
      userId: "user-1",
      name: "Cash",
      currency: "USD",
      initialBalance: 100,
    });
    await repository.create(account);

    // Stale: pretend we still hold the original (v=0) and update.
    const firstUpdate = await repository.update(
      account.update({ name: "First" }),
    );
    expect(firstUpdate.version).toBe(1);

    // Now attempt a second update from the original v=0 entity.
    await expect(
      repository.update(account.update({ name: "Second" })),
    ).rejects.toThrow(VersionConflictError);
  });

  it("throws VersionConflictError for a non-existent record", async () => {
    const ghost = AccountEntity.create({
      userId: "user-1",
      name: "Ghost",
      currency: "USD",
      initialBalance: 0,
    });
    await expect(
      repository.update(ghost.update({ name: "Ghost-2" })),
    ).rejects.toThrow(VersionConflictError);
  });
});
```

Add `import { VersionConflictError } from "../ports/version-conflict-error";` if not present.

- [ ] **Step 6: Run repository tests**

Run: `npm --prefix backend test -- src/repositories/dyn-account-repository.test.ts`
Expected: all PASS.

- [ ] **Step 7: Run full test suite**

Run: `npm --prefix backend test`
Expected: all PASS.

- [ ] **Step 8: Stage changes**

```bash
git add \
  backend/src/repositories/dyn-account-repository.test.ts \
  backend/src/utils/test-utils/repositories/account-repository-fakes.ts \
  backend/src/utils/test-utils/repositories/account-repository-mocks.ts
```

---

## Task 17: Atomic flip — rename `AccountEntity` to `Account`, delete the old interface

**Files:**
- Modify: `backend/src/models/account.ts`
- Modify: every file that referenced `AccountEntity` (model test, fakes, repo, port, service)

This collapses the temporary parallel name. After this task, the codebase has a single `Account` symbol that is the class.

- [ ] **Step 1: Rewrite `models/account.ts`**

Replace the entire `backend/src/models/account.ts` with:

```ts
import { randomUUID } from "crypto";
import { isSupportedCurrency } from "../types/currency";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "../types/validation";
import { ModelError } from "./model-error";

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

const defaultClock = () => new Date();

function normalizeAccountName(name: string): string {
  return name.trim();
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
    {
      clock = defaultClock,
      idGenerator = randomUUID,
    }: { clock?: () => Date; idGenerator?: () => string } = {},
  ): Account {
    const now = clock().toISOString();
    const data: AccountData = {
      id: idGenerator(),
      userId: input.userId,
      name: normalizeAccountName(input.name),
      currency: input.currency,
      initialBalance: input.initialBalance,
      isArchived: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    return new Account(data);
  }

  static fromPersistence(data: AccountData): Account {
    return new Account(data);
  }

  update(
    input: UpdateAccountInput,
    { clock = defaultClock }: { clock?: () => Date } = {},
  ): Account {
    if (this.isArchived) {
      throw new ModelError("Cannot update archived account");
    }
    const now = clock().toISOString();
    const data: AccountData = {
      userId: this.userId,
      id: this.id,
      name:
        input.name !== undefined
          ? normalizeAccountName(input.name)
          : this.name,
      currency: input.currency ?? this.currency,
      initialBalance: input.initialBalance ?? this.initialBalance,
      isArchived: this.isArchived,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: now,
    };
    return new Account(data);
  }

  archive({ clock = defaultClock }: { clock?: () => Date } = {}): Account {
    if (this.isArchived) {
      throw new ModelError("Cannot archive archived account");
    }
    const now = clock().toISOString();
    const data: AccountData = {
      userId: this.userId,
      id: this.id,
      name: this.name,
      currency: this.currency,
      initialBalance: this.initialBalance,
      isArchived: true,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: now,
    };
    return new Account(data);
  }

  bumpVersion(): Account {
    const data: AccountData = {
      userId: this.userId,
      id: this.id,
      name: this.name,
      currency: this.currency,
      initialBalance: this.initialBalance,
      isArchived: this.isArchived,
      version: this.version + 1,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    return new Account(data, { skipInvariants: true });
  }

  toData(): AccountData {
    return {
      userId: this.userId,
      id: this.id,
      name: this.name,
      currency: this.currency,
      initialBalance: this.initialBalance,
      isArchived: this.isArchived,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private constructor(
    data: AccountData,
    { skipInvariants = false }: { skipInvariants?: boolean } = {},
  ) {
    if (!skipInvariants) {
      Account.assertInvariants(data);
    }
    this.userId = data.userId;
    this.id = data.id;
    this.name = data.name;
    this.currency = data.currency;
    this.initialBalance = data.initialBalance;
    this.isArchived = data.isArchived;
    this.version = data.version;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  private static assertInvariants(data: AccountData): void {
    const trimmedLength = data.name.trim().length;
    if (
      trimmedLength < NAME_MIN_LENGTH ||
      trimmedLength > NAME_MAX_LENGTH
    ) {
      throw new ModelError(
        `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      );
    }
    if (!isSupportedCurrency(data.currency)) {
      throw new ModelError(`Unsupported currency: ${data.currency}`);
    }
  }
}
```

- [ ] **Step 2: Replace remaining references in dependent files**

Run a project-wide search for `AccountEntity` and replace with `Account`. Files affected (verify with `grep`):

- `backend/src/models/account.test.ts`
- `backend/src/utils/test-utils/models/account-fakes.ts` — `Account` import only; drop double-import.
- `backend/src/repositories/dyn-account-repository.ts` — parameter types and `fromPersistence` calls.
- `backend/src/repositories/dyn-account-repository.test.ts`
- `backend/src/ports/account-repository.ts` — drop the `AccountEntity` import; `Account` is the class now.
- `backend/src/services/account-service.ts` — drop the `as AccountEntity` casts; `existing.update(...)` and `existing.archive()` work directly because `existing: Account` is now the class.

- [ ] **Step 3: Verify typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean.

- [ ] **Step 4: Run full test suite**

Run: `npm --prefix backend test`
Expected: all PASS.

- [ ] **Step 5: Stage changes**

```bash
git add backend/src/models/account.ts \
  backend/src/models/account.test.ts \
  backend/src/utils/test-utils/models/account-fakes.ts \
  backend/src/repositories/dyn-account-repository.ts \
  backend/src/repositories/dyn-account-repository.test.ts \
  backend/src/ports/account-repository.ts \
  backend/src/services/account-service.ts
```

---

## Task 18: Final validation pipeline

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npm --prefix backend run typecheck`
Expected: clean.

- [ ] **Step 2: Full test suite**

Run: `npm --prefix backend test`
Expected: clean.

- [ ] **Step 3: Format / lint**

Run: `npm --prefix backend run format`
Expected: no diff.

- [ ] **Step 4: Sanity-check scope**

Run: `git diff --stat main` — review the file list against the spec's "Files modified / created" list. No unrelated files.

- [ ] **Step 5: Verify no stragglers**

Run: `grep -rn "AccountEntity" backend/src` — expect zero matches.
Run: `grep -rn "accountRepository.archive" backend/src` — expect zero matches.
Run: `grep -rn "validateName\|validateCurrency" backend/src/services/account-service.ts` — expect zero matches.

- [ ] **Step 6: Final stage if any drift**

Stage any formatting / lint fixes the previous step produced.

```bash
git add -u
```

The branch is now ready for review.
