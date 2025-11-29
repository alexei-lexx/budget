# Quickstart: Fix Pagination Cursor Bug

**Feature**: Fix Pagination Cursor Bug - UserDateIndex Incompatibility
**Branch**: `014-fix-date-pagination`
**Date**: 2025-11-29

## Overview

This guide helps developers understand, implement, and test the pagination cursor bug fix. The bug prevents users from navigating beyond the first page when date filters are applied to transaction queries.

## Prerequisites

- Node.js and npm installed
- Docker installed (for local DynamoDB)
- AWS CLI configured (optional, for DynamoDB Local)
- Repository cloned and dependencies installed

## Quick Start (5 minutes)

### 1. Start Local DynamoDB

```bash
# From repository root
cd backend
docker compose up -d
```

Verify DynamoDB is running:
```bash
# Should return empty list (or existing tables if you've run tests before)
AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy AWS_REGION=us-east-1 \
  aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### 2. Run the Failing Test (Before Fix)

```bash
# From backend directory
npm test -- TransactionRepository.test.ts
```

**Expected Result**: The test `"should paginate correctly when using date filters without duplicates or missing items"` is currently disabled with `xdescribe`.

Enable the test temporarily to see the failure:
```bash
# Edit backend/src/repositories/TransactionRepository.test.ts
# Change line 2487 from:
xdescribe("BUG: pagination with date filters (UserDateIndex)", () => {
# To:
describe("BUG: pagination with date filters (UserDateIndex)", () => {
```

Run again:
```bash
npm test -- TransactionRepository.test.ts
```

**Expected Failure**: Test fails because cursor lacks `date` field, causing ExclusiveStartKey format mismatch.

### 3. Understanding the Bug

**Location**: `backend/src/repositories/TransactionRepository.ts`

**Current Cursor** (lines 75-78):
```typescript
interface CursorData {
  createdAt: string;  // ✅ Has createdAt
  id: string;         // ✅ Has id
  // ❌ Missing: date field
}
```

**Buggy ExclusiveStartKey** (lines 463-468):
```typescript
ExclusiveStartKey: {
  userId: userId,
  id: decodeCursor(after).id,
  [queryParams.sortKeyName]: decodeCursor(after).createdAt,  // ❌ Always uses createdAt
}
```

**Problem**: When `sortKeyName` is `"date"` (UserDateIndex), the code uses `createdAt` value:
```typescript
{
  userId: "user-123",
  id: "abc-def",
  date: "2024-01-20T14:23:45.678Z"  // ❌ Wrong! Should be "2024-01-20"
}
```

## Implementation Guide

### Step 1: Update CursorData Interface

**File**: `backend/src/repositories/TransactionRepository.ts`

**Location**: Lines 75-78

**Change**:
```typescript
// Before
interface CursorData {
  createdAt: string;
  id: string;
}

// After
interface CursorData {
  createdAt: string;  // ISO 8601 timestamp for UserCreatedAtIndex
  date: string;       // YYYY-MM-DD format for UserDateIndex
  id: string;         // UUID
}
```

### Step 2: Update encodeCursor Function

**File**: `backend/src/repositories/TransactionRepository.ts`

**Location**: Lines 95-101

**Change**:
```typescript
// Before
function encodeCursor(transaction: Transaction): string {
  const cursorData: CursorData = {
    createdAt: transaction.createdAt,
    id: transaction.id,
  };
  return Buffer.from(JSON.stringify(cursorData)).toString("base64");
}

// After
function encodeCursor(transaction: Transaction): string {
  const cursorData: CursorData = {
    createdAt: transaction.createdAt,
    date: transaction.date,  // ✅ Add date field
    id: transaction.id,
  };
  return Buffer.from(JSON.stringify(cursorData)).toString("base64");
}
```

### Step 3: Add Zod Schema for Cursor Validation

**File**: `backend/src/repositories/TransactionRepository.ts`

**Location**: Add after imports (around line 10)

**Add**:
```typescript
const cursorDataSchema = z.object({
  createdAt: z.string(),
  date: z.string(),
  id: z.string(),
});
```

### Step 4: Update decodeCursor Function

**File**: `backend/src/repositories/TransactionRepository.ts`

**Location**: Lines 103-121

**Change**:
```typescript
// Before
function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const cursorData = JSON.parse(decoded) as CursorData;

    // Validate cursor structure
    if (!cursorData.createdAt || !cursorData.id) {
      throw new Error("Invalid cursor structure");
    }

    return cursorData;
  } catch (error) {
    throw new TransactionRepositoryError(
      "Invalid cursor format",
      "INVALID_CURSOR",
      error,
    );
  }
}

// After
function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const cursorData = cursorDataSchema.parse(parsed);  // ✅ Use Zod validation
    return cursorData;
  } catch (error) {
    throw new TransactionRepositoryError(
      "Invalid cursor format",
      "INVALID_CURSOR",
      error,
    );
  }
}
```

### Step 5: Fix ExclusiveStartKey Construction

**File**: `backend/src/repositories/TransactionRepository.ts`

**Location**: Lines 463-468

**Change**:
```typescript
// Before
...(after && {
  ExclusiveStartKey: {
    userId: userId,
    id: decodeCursor(after).id,
    [queryParams.sortKeyName]: decodeCursor(after).createdAt,  // ❌ Always uses createdAt
  },
}),

// After
...(after && {
  ExclusiveStartKey: {
    userId: userId,
    id: decodedCursor.id,
    [queryParams.sortKeyName]:
      queryParams.sortKeyName === "date"
        ? decodedCursor.date       // ✅ Use date for UserDateIndex
        : decodedCursor.createdAt  // ✅ Use createdAt for UserCreatedAtIndex
  },
}),
```

**Important**: You'll need to decode the cursor once at the beginning of the function to avoid calling `decodeCursor` multiple times:

```typescript
// At the beginning of findPaginated method (before building query params)
const decodedCursor = after ? decodeCursor(after) : null;

// Then use decodedCursor throughout
```

### Step 6: Enable the Test

**File**: `backend/src/repositories/TransactionRepository.test.ts`

**Location**: Line 2487

**Change**:
```typescript
// Before
xdescribe("BUG: pagination with date filters (UserDateIndex)", () => {

// After
describe("pagination with date filters (UserDateIndex)", () => {
```

**Location**: Lines 2559-2572

**Uncomment assertions**:
```typescript
// Uncomment these assertions to verify no duplicates and no missing items
const allIds = [...page1Ids, ...page2Ids];
const uniqueIds = new Set(allIds);
expect(uniqueIds.size).toBe(allIds.length);  // No duplicates
expect(allIds.length).toBe(6);  // All 6 transactions retrieved
```

## Testing Guide

### Run Repository Tests

```bash
# From backend directory
npm test -- TransactionRepository.test.ts
```

**Expected Result**: All tests pass, including the previously disabled pagination test.

### Test Coverage Checklist

- [ ] Pagination with date filters (UserDateIndex) - enabled test passes
- [ ] Pagination without filters (UserCreatedAtIndex) - existing tests pass
- [ ] Invalid cursor validation (missing fields) - verify error handling
- [ ] Invalid base64 cursor - verify error handling
- [ ] No duplicate transactions across pages
- [ ] No missing transactions across pages

### Manual Testing (Optional)

If you want to test the GraphQL API manually:

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Use GraphQL client (e.g., Apollo Sandbox, Insomnia) to query:

```graphql
query GetTransactionsPage1 {
  transactions(
    filters: {
      dateAfter: "2024-01-01"
      dateBefore: "2024-01-31"
    }
    pagination: { first: 10 }
  ) {
    edges {
      node {
        id
        date
        amount
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

3. Copy `endCursor` from page 1 and use it for page 2:

```graphql
query GetTransactionsPage2 {
  transactions(
    filters: {
      dateAfter: "2024-01-01"
      dateBefore: "2024-01-31"
    }
    pagination: {
      first: 10
      after: "eyJjcmVhdGVkQXQiOi...=="  # Paste cursor here
    }
  ) {
    edges {
      node {
        id
        date
        amount
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Expected Result**: Page 2 loads successfully without errors.

## Verification Checklist

### Before Deployment

- [ ] All repository tests pass
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formatting applied (`npm run format`)
- [ ] No type assertions or non-null assertions introduced
- [ ] Cursor validation uses Zod schema
- [ ] ExclusiveStartKey construction handles both indexes correctly

### Functional Verification

- [ ] Pagination works with date filters (dateAfter, dateBefore)
- [ ] Pagination works without filters (existing functionality)
- [ ] Invalid cursors return clear error messages
- [ ] No duplicate transactions across pages
- [ ] No missing transactions across pages
- [ ] Performance < 2 seconds per page (SC-002)
- [ ] Error responses < 100ms (SC-005)

## Common Issues

### Issue 1: Zod Import Missing

**Error**: `'z' is not defined`

**Solution**: Add Zod import at top of file:
```typescript
import { z } from "zod";
```

### Issue 2: decodeCursor Called Multiple Times

**Error**: Performance degradation or error handling issues

**Solution**: Decode cursor once at the beginning of the function:
```typescript
const decodedCursor = after ? decodeCursor(after) : null;
```

### Issue 3: Test Still Disabled

**Error**: Test doesn't run

**Solution**: Verify you changed `xdescribe` to `describe` on line 2487.

### Issue 4: DynamoDB Local Not Running

**Error**: `ECONNREFUSED localhost:8000`

**Solution**: Start DynamoDB Local with Docker:
```bash
cd backend
docker compose up -d
```

## File Locations Reference

| File | Purpose | Lines Modified |
|------|---------|----------------|
| `backend/src/repositories/TransactionRepository.ts` | Cursor implementation and pagination logic | 75-78, 95-101, 103-121, 463-468 |
| `backend/src/repositories/TransactionRepository.test.ts` | Pagination tests | 2487, 2559-2572 |

## Architecture Notes

### No Schema Changes

This bug fix requires **no GraphQL schema changes**. The pagination API contract remains unchanged:

```graphql
type TransactionConnection {
  edges: [TransactionEdge!]!
  pageInfo: PageInfo!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String  # Opaque cursor (internal structure changed)
}
```

The cursor is opaque to clients (base64-encoded string). The internal structure change is transparent.

### No Frontend Changes

Frontend components continue to use the cursor as an opaque pagination token:

```typescript
// Frontend code remains unchanged
const { data } = useTransactionsQuery({
  filters: { dateAfter: '2024-01-01' },
  pagination: { first: 10, after: cursor }
});
```

### Layer Boundaries

- **GraphQL Layer**: No changes (cursor is opaque string)
- **Service Layer**: No changes (delegates to repository)
- **Repository Layer**: All changes (cursor encoding/decoding, ExclusiveStartKey construction)

This maintains clean separation of concerns per the constitution.

## Performance Expectations

### Cursor Size Impact

- **Old Cursor**: ~90 bytes (base64 encoded)
- **New Cursor**: ~100 bytes (base64 encoded)
- **Impact**: Negligible (~10 bytes per request)

### Query Performance

- **No Change**: Same DynamoDB query patterns
- **Expected Latency**: < 2 seconds per page (SC-002)

### Memory Impact

- **Per Request**: +10 bytes per cursor object
- **Impact**: Negligible

## Next Steps

After implementing and testing locally:

1. Run full test suite: `npm test`
2. Build project: `npm run build`
3. Format code: `npm run format`
4. Commit changes following project commit guidelines
5. Create pull request for code review
6. Deploy to staging for integration testing
7. Deploy to production

## Support

### Documentation References

- [plan.md](./plan.md) - Implementation plan and technical context
- [research.md](./research.md) - Detailed bug analysis and architecture decisions
- [data-model.md](./data-model.md) - Data structure specifications
- [spec.md](./spec.md) - Feature requirements and success criteria

### Related Files

- `backend/src/repositories/TransactionRepository.ts` - Main implementation
- `backend/src/repositories/TransactionRepository.test.ts` - Tests
- `backend-cdk/lib/backend-cdk-stack.ts` - DynamoDB index definitions
- `backend/src/types/pagination.ts` - Pagination type definitions

## Summary

This quickstart provides a focused guide to understanding and implementing the cursor bug fix. The changes are isolated to the repository layer, maintain constitutional compliance, and require no GraphQL schema or frontend modifications. Follow the step-by-step implementation guide, run the tests, and verify all success criteria before deployment.
