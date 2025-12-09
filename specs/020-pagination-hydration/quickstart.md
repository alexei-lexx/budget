# Quickstart: Database Record Hydration in Pagination Utility

**Feature**: 020-pagination-hydration
**Date**: 2025-12-06
**Estimated Effort**: 30-45 minutes

## Overview

Fix constitutional violation by integrating the EXISTING `hydrate()` function into the pagination utility. This is a simple integration of a pattern that's already used everywhere else in the repositories.

## Key Facts

- ✅ `hydrate()` function already exists in `backend/src/repositories/utils/hydrate.ts`
- ✅ Schemas already exist in `backend/src/repositories/utils/*.schema.ts`
- ✅ Repositories already import and use both for single-item reads
- ❌ **Pagination is the ONLY place not using hydrate - this is the violation**

## Implementation Steps

### Step 1: Update Pagination Utility (10 min)

**File**: `backend/src/repositories/utils/pagination.ts`

**Add imports** (after existing imports):
```typescript
import { z } from "zod";
import { hydrate } from "./hydrate";
```

**Add schema parameter** to function signature (line 25-34):
```typescript
export async function paginateQuery<T>({
  client,
  params,
  options = {},
  schema,  // ADD THIS LINE
  accumulatedItems = [],
}: {
  client: DynamoDBDocumentClient;
  params: QueryParams;
  options?: PaginationOptions;
  schema: z.ZodType<T>;  // ADD THIS LINE (matches hydrate signature)
  accumulatedItems?: T[];
}): Promise<PaginationResult<T>> {
```

**Replace line 50** with hydrate call:
```typescript
// OLD (line 50):
const newItems = (result.Items || []) as T[];

// NEW:
const newItems = (result.Items || []).map((item) => hydrate(schema, item));
```

**Pass schema to recursive call** (around line 65):
```typescript
if (shouldContinue) {
  return paginateQuery({
    client,
    params: {
      ...params,
      ExclusiveStartKey: result.LastEvaluatedKey,
    },
    options,
    schema,  // ADD THIS LINE
    accumulatedItems: newAccumulatedItems,
  });
}
```

**Complete updated function**:
```typescript
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { hydrate } from "./hydrate";

export type QueryParams = QueryCommandInput;

export interface PaginationOptions {
  pageSize?: number;
}

export interface PaginationResult<T> {
  items: T[];
  hasNextPage: boolean;
}

export async function paginateQuery<T>({
  client,
  params,
  options = {},
  schema,
  accumulatedItems = [],
}: {
  client: DynamoDBDocumentClient;
  params: QueryParams;
  options?: PaginationOptions;
  schema: z.ZodType<T>;
  accumulatedItems?: T[];
}): Promise<PaginationResult<T>> {
  const { pageSize } = options;

  const itemsNeedeCount = pageSize
    ? pageSize - accumulatedItems.length
    : undefined;

  const queryParams = itemsNeedeCount
    ? { ...params, Limit: itemsNeedeCount }
    : params;

  const command = new QueryCommand(queryParams);
  const result = await client.send(command);
  const newItems = (result.Items || []).map((item) => hydrate(schema, item));

  const newAccumulatedItems = [...accumulatedItems, ...newItems];

  const hasMoreInDb = Boolean(result.LastEvaluatedKey);

  const shouldContinue =
    hasMoreInDb && (!pageSize || newAccumulatedItems.length < pageSize);

  if (shouldContinue) {
    return paginateQuery({
      client,
      params: {
        ...params,
        ExclusiveStartKey: result.LastEvaluatedKey,
      },
      options,
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
```

### Step 2: Update AccountRepository (5 min)

**File**: `backend/src/repositories/AccountRepository.ts`

Repository already imports `accountSchema` from `'./utils/Account.schema'`.

**Find line ~94** (in `findActiveByUserId` method) and add `schema` parameter:
```typescript
const result = await paginateQuery<Account>({
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
  options: {},
  schema: accountSchema,  // ADD THIS LINE
});
```

### Step 3: Update CategoryRepository (5 min)

**File**: `backend/src/repositories/CategoryRepository.ts`

Repository already imports `categorySchema` from `'./utils/Category.schema'`.

**Find 2 paginateQuery calls** and add `schema: categorySchema` to each.

Example:
```typescript
const result = await paginateQuery<Category>({
  client: this.client,
  params: { /* ... */ },
  schema: categorySchema,  // ADD THIS LINE
});
```

### Step 4: Update TransactionRepository (10 min)

**File**: `backend/src/repositories/TransactionRepository.ts`

Repository already imports `transactionSchema` from `'./utils/Transaction.schema'`.

**Find 6 paginateQuery calls** and add `schema: transactionSchema` to each.

Example:
```typescript
const { items } = await paginateQuery<Transaction>({
  client: this.client,
  params: { /* ... */ },
  schema: transactionSchema,  // ADD THIS LINE
});
```

### Step 5: Add Pagination Tests (15 min)

**File**: `backend/src/repositories/utils/pagination.test.ts`

```typescript
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { paginateQuery } from "./pagination";

describe("paginateQuery", () => {
  const testSchema = z.object({
    id: z.string(),
    name: z.string(),
  });

  it("validates and returns valid items", async () => {
    const mockClient = {
      send: jest.fn().mockResolvedValue({
        Items: [
          { id: "1", name: "Test" },
          { id: "2", name: "Test2" },
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    const result = await paginateQuery({
      client: mockClient,
      params: { TableName: "test" },
      schema: testSchema,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: "1", name: "Test" });
  });

  it("throws validation error on invalid item", async () => {
    const mockClient = {
      send: jest.fn().mockResolvedValue({
        Items: [
          { id: "1", name: "Test" },
          { id: "2" }, // Missing 'name'
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    await expect(
      paginateQuery({
        client: mockClient,
        params: { TableName: "test" },
        schema: testSchema,
      })
    ).rejects.toThrow();
  });

  it("fails fast on first invalid item", async () => {
    const mockClient = {
      send: jest.fn().mockResolvedValue({
        Items: [
          { id: "1" }, // Invalid (missing name)
          { id: "2", name: "Test" }, // Would be valid
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    await expect(
      paginateQuery({
        client: mockClient,
        params: { TableName: "test" },
        schema: testSchema,
      })
    ).rejects.toThrow();
  });
});
```

### Step 6: Verify (5 min)

```bash
cd backend

# TypeScript compilation
npm run build

# Run tests
npm test

# Expected: All pass, no compilation errors
```

## Verification Checklist

- [ ] `pagination.ts` imports `hydrate` and `z`
- [ ] `paginateQuery` has `schema: z.ZodType<T>` parameter
- [ ] Line 50 uses `hydrate(schema, item)` instead of `as T[]`
- [ ] Schema passed to recursive call
- [ ] AccountRepository: 1 call updated with `schema: accountSchema`
- [ ] CategoryRepository: 2 calls updated with `schema: categorySchema`
- [ ] TransactionRepository: 6 calls updated with `schema: transactionSchema`
- [ ] Tests added in `pagination.test.ts`
- [ ] TypeScript compiles without errors
- [ ] All backend tests pass

## Common Issues

### Issue: "Property 'schema' does not exist"

**Cause**: Forgot to add schema parameter to paginateQuery call

**Fix**: Add `schema: accountSchema` (already imported in repository)

### Issue: Type errors

**Cause**: Used `z.ZodSchema<T>` instead of `z.ZodType<T>`

**Fix**: Use `z.ZodType<T>` to match `hydrate()` signature

### Issue: Tests failing

**Cause**: Mock data doesn't match schema

**Fix**: Ensure all required fields in test data

## What You DON'T Need to Do

- ❌ Create schemas (already exist in `backend/src/repositories/utils/*.schema.ts`)
- ❌ Create hydrate function (already exists in `backend/src/repositories/utils/hydrate.ts`)
- ❌ Import schemas in repositories (already imported)
- ❌ Add error handling (hydrate already throws ZodError)
- ❌ Modify any GraphQL or service layers

## Files Modified

1. `backend/src/repositories/utils/pagination.ts` - Add hydrate integration (3 changes)
2. `backend/src/repositories/AccountRepository.ts` - Add schema to 1 call
3. `backend/src/repositories/CategoryRepository.ts` - Add schema to 2 calls
4. `backend/src/repositories/TransactionRepository.ts` - Add schema to 6 calls
5. `backend/src/repositories/utils/pagination.test.ts` - Add validation tests

**Total**: 5 files, ~12 lines of actual code changes

## Next Steps

Run `/speckit.tasks` to generate task breakdown, then implement.
