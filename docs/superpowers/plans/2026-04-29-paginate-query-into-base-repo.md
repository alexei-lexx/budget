# Move `paginateQuery` into `DynBaseRepository` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relocate the standalone `paginateQuery<T>` helper into `DynBaseRepository` as a `protected` method, drop the redundant `client` argument from all call sites, and consolidate tests onto the base class.

**Architecture:** `DynBaseRepository` (in `backend/src/repositories/dyn-base-repository.ts`) already owns the `DynamoDBDocumentClient` shared by every Dyn-prefixed repository. Pagination naturally belongs to that base class. After the move, the three concrete repositories (`dyn-account-repository.ts`, `dyn-category-repository.ts`, `dyn-transaction-repository.ts`) call `this.paginateQuery({...})` instead of importing a free function. The `QueryResult<T>` interface and the recursive logic are preserved verbatim — only the dispatch and the shared `client` injection change.

**Tech Stack:** TypeScript (strict), AWS SDK v3 (`@aws-sdk/lib-dynamodb`), Zod, Jest (`ts-jest`), `dotenvx` for env loading. Repository tests run via `npm run test:repositories` (config: `jest.config.repositories.ts`, `maxWorkers: 1`, `roots: src/repositories`).

---

## File Structure

**Modified files:**

- `backend/src/repositories/dyn-base-repository.ts` — add `protected paginateQuery<T>` method and exported `QueryResult<T>` interface.
- `backend/src/repositories/dyn-account-repository.ts` — swap `paginateQuery({ client: this.client, ... })` for `this.paginateQuery({ ... })` at lines 150 and 227; drop the `import { paginateQuery } from "./utils/query"` line.
- `backend/src/repositories/dyn-category-repository.ts` — same swap at lines 99 and 131; drop the import.
- `backend/src/repositories/dyn-transaction-repository.ts` — same swap at lines 299, 356, 435, 482, 538, 688; drop the import.

**New files:**

- `backend/src/repositories/dyn-base-repository.test.ts` — test file co-located with the source (per constitution "Test File Location"). Uses a minimal in-file test subclass that exposes `paginateQuery` through a public `run` method. Mocks the `DynamoDBDocumentClient` send call.

**Deleted files:**

- `backend/src/repositories/utils/query.ts`
- `backend/src/repositories/utils/query.test.ts`

The `utils/` directory survives (still hosts `hydrate.ts`, `transact-write.ts`).

---

## Task 1: Add `paginateQuery` method + `QueryResult<T>` to `DynBaseRepository`

**Files:**

- Modify: `backend/src/repositories/dyn-base-repository.ts`
- Test: `backend/src/repositories/dyn-base-repository.test.ts` (new)

The current `paginateQuery` accepts a `DynamoDBDocumentClient` parameter. The new method drops that parameter and uses `this.client`. The `QueryResult<T>` interface gets co-located in the base file and exported for any future consumers (none today). The recursive call becomes `this.paginateQuery({...})`.

**Test approach.** `DynBaseRepository` is `abstract`, and `paginateQuery` is `protected`. The test file defines a tiny in-file subclass `TestRepo` whose `run` method forwards to `this.paginateQuery`, plus a constructor that swaps in a mocked document client. The mock injection writes to the protected `client` field with a `ts-expect-error` because `client` is `readonly` — this is acceptable for a test-only subclass and avoids changing the production constructor signature.

- [x] **Step 1: Create the failing test file**

Create `backend/src/repositories/dyn-base-repository.test.ts` with this exact content:

```ts
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it, jest } from "@jest/globals";
import { ZodError, z } from "zod";
import { DynBaseRepository, QueryResult } from "./dyn-base-repository";

const testSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type TestItem = z.infer<typeof testSchema>;

class TestRepo extends DynBaseRepository {
  constructor(mockClient: DynamoDBDocumentClient) {
    super("test-table");
    // @ts-expect-error - test override of readonly client to inject a mock
    this.client = mockClient;
  }

  async run<T>(args: {
    params: Parameters<TestRepo["paginateQueryProxy"]>[0]["params"];
    pageSize?: number;
    schema: z.ZodType<T>;
  }): Promise<QueryResult<T>> {
    return this.paginateQuery<T>(args);
  }

  // Helper used only to derive the param type above; never called.
  private async paginateQueryProxy(args: {
    params: Parameters<DynBaseRepository["paginateQuery"]>[0]["params"];
  }): Promise<void> {
    void args;
  }
}

describe("DynBaseRepository.paginateQuery", () => {
  it("validates and returns valid items successfully", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [
          { id: "1", name: "Test" },
          { id: "2", name: "Test2" },
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);
    const result = await repo.run({
      params: { TableName: "test" },
      schema: testSchema,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: "1", name: "Test" });
    expect(result.items[1]).toEqual({ id: "2", name: "Test2" });
    expect(result.hasNextPage).toBe(false);
  });

  it("fails fast on first invalid item and stops processing", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [{ id: "1" }, { id: "2", name: "Test" }],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);

    await expect(
      repo.run({ params: { TableName: "test" }, schema: testSchema }),
    ).rejects.toThrow(ZodError);
  });

  it("includes validation error details for missing required fields", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [{ id: "1" }],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);

    try {
      await repo.run({ params: { TableName: "test" }, schema: testSchema });
      throw new Error("Expected ZodError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const zodError = error as ZodError;
      expect(zodError.issues).toContainEqual(
        expect.objectContaining({
          path: ["name"],
          code: expect.any(String),
        }),
      );
    }
  });

  it("includes validation error details for type mismatches", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [{ id: "1", name: 123 }],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);

    try {
      await repo.run({ params: { TableName: "test" }, schema: testSchema });
      throw new Error("Expected ZodError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const zodError = error as ZodError;
      expect(zodError.issues).toContainEqual(
        expect.objectContaining({
          path: ["name"],
          code: "invalid_type",
        }),
      );
    }
  });

  it("validates all items when paginating with pageSize", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [
          { id: "1", name: "Test1" },
          { id: "2", name: "Test2" },
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);
    const result = await repo.run<TestItem>({
      params: { TableName: "test" },
      pageSize: 2,
      schema: testSchema,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: "1", name: "Test1" });
    expect(result.items[1]).toEqual({ id: "2", name: "Test2" });
  });

  it("validates items during recursive pagination", async () => {
    let callCount = 0;
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            Items: [{ id: "1", name: "Test1" }],
            LastEvaluatedKey: { id: "1" },
          });
        } else {
          return Promise.resolve({ Items: [{ id: "2" }] });
        }
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);

    await expect(
      repo.run({ params: { TableName: "test" }, schema: testSchema }),
    ).rejects.toThrow(ZodError);
  });

  it("returns empty array for no items", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);
    const result = await repo.run({
      params: { TableName: "test" },
      schema: testSchema,
    });

    expect(result.items).toHaveLength(0);
    expect(result.hasNextPage).toBe(false);
  });
});
```

Note: the `paginateQueryProxy` helper exists only to let the `run` method derive the `params` type from the still-unwritten `paginateQuery` signature; it is never invoked. After Task 1 is complete you can simplify this if desired, but leave it for now.

- [x] **Step 2: Run the test to verify it fails**

Run from `backend/`:

```bash
npm run test:repositories -- src/repositories/dyn-base-repository.test.ts
```

Expected: TypeScript compile error (or runtime error) because `paginateQuery` and `QueryResult` are not yet exported from `./dyn-base-repository`.

- [x] **Step 3: Add `paginateQuery` and `QueryResult` to `DynBaseRepository`**

Replace the entire contents of `backend/src/repositories/dyn-base-repository.ts` with:

```ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { RepositoryError } from "../ports/repository-error";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { hydrate } from "./utils/hydrate";

export interface QueryResult<T> {
  items: T[];
  hasNextPage: boolean;
}

export abstract class DynBaseRepository {
  protected readonly client: DynamoDBDocumentClient;
  protected readonly tableName: string;

  constructor(tableName: string, dynamoClient?: DynamoDBClient) {
    if (!tableName) {
      throw new RepositoryError("tableName is required", "MISSING_TABLE_NAME");
    }

    this.client = createDynamoDBDocumentClient(dynamoClient);
    this.tableName = tableName;
  }

  /**
   * Unified pagination that handles both paginated and "get all" queries.
   * @param params - Query parameters
   * @param pageSize - Number of items per page (undefined = get all items)
   * @param schema - Zod schema for item hydration
   * @param accumulatedItems - Accumulator for recursive calls
   */
  protected async paginateQuery<T>({
    params,
    pageSize,
    schema,
    accumulatedItems = [],
  }: {
    params: QueryCommandInput;
    pageSize?: number;
    schema: z.ZodType<T>;
    accumulatedItems?: T[];
  }): Promise<QueryResult<T>> {
    const itemsNeedeCount = pageSize
      ? pageSize - accumulatedItems.length
      : undefined;

    const queryParams = itemsNeedeCount
      ? { ...params, Limit: itemsNeedeCount }
      : params;

    const command = new QueryCommand(queryParams);
    const result = await this.client.send(command);
    const newItems = (result.Items || []).map((item) => hydrate(schema, item));

    const newAccumulatedItems = [...accumulatedItems, ...newItems];

    const hasMoreInDb = Boolean(result.LastEvaluatedKey);

    const shouldContinue =
      hasMoreInDb && (!pageSize || newAccumulatedItems.length < pageSize);

    if (shouldContinue) {
      return this.paginateQuery({
        params: {
          ...params,
          ExclusiveStartKey: result.LastEvaluatedKey,
        },
        pageSize,
        schema,
        accumulatedItems: newAccumulatedItems,
      });
    }

    const hasNextPage = pageSize ? hasMoreInDb : false;

    return {
      items: newAccumulatedItems,
      hasNextPage,
    };
  }
}
```

- [x] **Step 4: Run the test to verify it passes**

```bash
npm run test:repositories -- src/repositories/dyn-base-repository.test.ts
```

Expected: 7 tests pass.

- [x] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS. (`utils/query.ts` and the three repositories still import `paginateQuery` from `./utils/query` at this point; that file is still in place, so types resolve.)

- [x] **Step 6: Commit**

```bash
git add backend/src/repositories/dyn-base-repository.ts backend/src/repositories/dyn-base-repository.test.ts
git commit -m "feat(repo): add protected paginateQuery to DynBaseRepository"
```

---

## Task 2: Migrate `dyn-account-repository.ts` call sites

**Files:**

- Modify: `backend/src/repositories/dyn-account-repository.ts:17,150-163,227-238`

There are two call sites in this file (the `findManyByUserId` method around line 150 and the `findManyWithArchivedByUserId` method around line 227). Both pass `client: this.client`. The fix: drop that key, and call via `this.paginateQuery`.

- [x] **Step 1: Remove the `paginateQuery` import**

In `backend/src/repositories/dyn-account-repository.ts`, delete this line (currently line 17):

```ts
import { paginateQuery } from "./utils/query";
```

- [x] **Step 2: Update the first call site**

Locate the call inside `findManyByUserId`. It currently reads:

```ts
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
        pageSize: undefined, // No pageSize = get all items
        schema: accountDataSchema,
      });
```

Change to:

```ts
      const result = await this.paginateQuery({
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          FilterExpression: "isArchived = :isArchived",
          ExpressionAttributeValues: {
            ":userId": userId,
            ":isArchived": false,
          },
        },
        pageSize: undefined, // No pageSize = get all items
        schema: accountDataSchema,
      });
```

- [x] **Step 3: Update the second call site**

Locate the call inside `findManyWithArchivedByUserId` (around line 227). It currently reads:

```ts
      const result = await paginateQuery({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
        },
        pageSize: undefined, // No pageSize = get all items
        schema: accountDataSchema,
      });
```

Change to:

```ts
      const result = await this.paginateQuery({
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
        },
        pageSize: undefined, // No pageSize = get all items
        schema: accountDataSchema,
      });
```

- [x] **Step 4: Verify nothing else in the file references `paginateQuery`**

Run:

```bash
grep -n "paginateQuery" backend/src/repositories/dyn-account-repository.ts
```

Expected: no output (zero matches).

- [x] **Step 5: Run the account repository tests**

```bash
npm run test:repositories -- src/repositories/dyn-account-repository.test.ts
```

Expected: PASS, no regressions.

- [x] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add backend/src/repositories/dyn-account-repository.ts
git commit -m "refactor(repo): use this.paginateQuery in DynAccountRepository"
```

---

## Task 3: Migrate `dyn-category-repository.ts` call sites

**Files:**

- Modify: `backend/src/repositories/dyn-category-repository.ts:18,99-112,131-142`

Two call sites: `findManyByUserId` (around line 99) and `findManyWithArchivedByUserId` (around line 131). Both keep the `<Category>` type parameter.

- [x] **Step 1: Remove the `paginateQuery` import**

Delete the line (currently line 18):

```ts
import { paginateQuery } from "./utils/query";
```

- [x] **Step 2: Update the first call site**

Locate the call inside `findManyByUserId` (around line 99). Replace:

```ts
      const result = await paginateQuery<Category>({
        client: this.client,
        params: {
```

with:

```ts
      const result = await this.paginateQuery<Category>({
        params: {
```

Leave the rest of the call body (the `params` content, `pageSize`, `schema`, closing brace) exactly as it is.

- [x] **Step 3: Update the second call site**

Locate the call inside `findManyWithArchivedByUserId` (around line 131). Replace:

```ts
      const result = await paginateQuery<Category>({
        client: this.client,
        params: {
```

with:

```ts
      const result = await this.paginateQuery<Category>({
        params: {
```

Leave the rest of the call body unchanged.

- [x] **Step 4: Verify no remaining references**

```bash
grep -n "paginateQuery" backend/src/repositories/dyn-category-repository.ts
```

Wait — this should match `this.paginateQuery` twice. The check we actually want:

```bash
grep -n "from \"./utils/query\"\| paginateQuery(" backend/src/repositories/dyn-category-repository.ts
```

Expected: no output.

- [x] **Step 5: Run the category repository tests**

```bash
npm run test:repositories -- src/repositories/dyn-category-repository.test.ts
```

Expected: PASS.

- [x] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add backend/src/repositories/dyn-category-repository.ts
git commit -m "refactor(repo): use this.paginateQuery in DynCategoryRepository"
```

---

## Task 4: Migrate `dyn-transaction-repository.ts` call sites

**Files:**

- Modify: `backend/src/repositories/dyn-transaction-repository.ts:39,299,356,435,482,538,688`

Six call sites in this file. The line numbers above are approximate — locate them by pattern (`paginateQuery({`).

- [x] **Step 1: Remove the `paginateQuery` import**

Delete the line (currently line 39):

```ts
import { paginateQuery } from "./utils/query";
```

- [x] **Step 2: Replace every call site mechanically**

For each of the six occurrences, change:

```ts
      ... await paginateQuery({
        client: this.client,
        params: {
```

(or `await paginateQuery<TypeArg>({` for any typed variant)

to:

```ts
      ... await this.paginateQuery({
        params: {
```

(preserve the type parameter if present)

You can do this with a careful editor find-and-replace, but verify each occurrence individually because surrounding code differs (some destructure `{ items }`, others `{ items: dbItems, hasNextPage }`, others `{ items: transactions }`). Only the head of the call expression changes; the body is untouched.

- [x] **Step 3: Verify all six were updated**

```bash
grep -c "paginateQuery({" backend/src/repositories/dyn-transaction-repository.ts
grep -c "this.paginateQuery({" backend/src/repositories/dyn-transaction-repository.ts
grep -c "from \"./utils/query\"" backend/src/repositories/dyn-transaction-repository.ts
```

Expected: first command shows `6` (each `this.paginateQuery({` also matches), second shows `6`, third shows `0`.

If the first count exceeds 6, there's a stray un-prefixed `paginateQuery({` left over. Find it:

```bash
grep -n "paginateQuery({" backend/src/repositories/dyn-transaction-repository.ts
```

Every line should contain `this.paginateQuery({`.

- [x] **Step 4: Run the transaction repository tests**

```bash
npm run test:repositories -- src/repositories/dyn-transaction-repository.test.ts
```

Expected: PASS.

- [x] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add backend/src/repositories/dyn-transaction-repository.ts
git commit -m "refactor(repo): use this.paginateQuery in DynTransactionRepository"
```

---

## Task 5: Delete `utils/query.ts` and the old test file

**Files:**

- Delete: `backend/src/repositories/utils/query.ts`
- Delete: `backend/src/repositories/utils/query.test.ts`

At this point no production source imports `paginateQuery` from `./utils/query`. The only remaining references are the file itself and its test file.

- [x] **Step 1: Confirm zero imports remain anywhere in the backend**

```bash
grep -rn "utils/query" backend/src/ --include="*.ts"
```

Expected: matches only inside `backend/src/repositories/utils/query.ts` and `backend/src/repositories/utils/query.test.ts`. If anything else matches, stop and re-investigate — Tasks 2/3/4 missed something.

- [x] **Step 2: Delete both files**

```bash
rm backend/src/repositories/utils/query.ts backend/src/repositories/utils/query.test.ts
```

- [x] **Step 3: Run the full repository test suite**

```bash
npm run test:repositories
```

Expected: PASS (the new `dyn-base-repository.test.ts` covers the previous test cases).

- [x] **Step 4: Run the full non-repository test suite**

```bash
npm test -- --selectProjects=default 2>/dev/null || dotenvx run -f .env.test -- jest
```

(The first form may fail if no project selection is configured; the second is the underlying invocation that `npm test` uses for the non-repository half.)

Expected: PASS.

- [x] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [x] **Step 6: Run formatter and linter**

```bash
npm run format
```

Expected: PASS (or auto-fix imports/formatting). Re-run `npm run typecheck` if formatting changed anything substantive.

- [x] **Step 7: Commit**

```bash
git add -A backend/src/repositories/utils/
git commit -m "chore(repo): remove standalone paginateQuery util"
```

---

## Self-Review Notes

- **Spec coverage:** Add method to base (Task 1), drop `client` argument and recurse via `this` (Task 1 step 3), update three call sites (Tasks 2–4), delete old file (Task 5), rewrite tests as `dyn-base-repository.test.ts` preserving all seven cases (Task 1 step 1). All "Change" sub-bullets in the spec are covered.
- **`QueryResult<T>` re-export:** The spec's instruction to fix `QueryResult<T>` imports in repositories is a no-op in the current codebase — `grep -rn "QueryResult"` confirms no consumer outside `utils/query.ts` references the type. The interface is still exported from `dyn-base-repository.ts` per spec, available for future use.
- **Method ordering:** `paginateQuery` is `protected`, so per the constitution's "Public before private" rule it should sit after public methods. `DynBaseRepository` has no public methods (only the constructor), so placement after the constructor is correct.
- **Test layout:** Co-located beside source as `dyn-base-repository.test.ts` per constitution "Test File Location".
- **Cardinality naming:** The method name stays `paginateQuery` (not a finder), so the `findOne`/`findMany`/`get` rule does not apply.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-29-paginate-query-into-base-repo.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
