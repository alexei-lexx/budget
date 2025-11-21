# Pagination Cursor Bug - UserDateIndex Incompatibility

**Status:** Identified
**Severity:** Critical
**Affected Component:** `backend/src/repositories/TransactionRepository.ts`
**Date Identified:** 2025-11-21
**Impact:** Complete pagination failure with date filters

---

## Summary

The pagination cursor implementation has a critical flaw when using date-based filtering. The cursor only encodes the `createdAt` field (ISO timestamp) but not the `date` field (YYYY-MM-DD), causing **complete pagination failure** when querying the `UserDateIndex` GSI.

DynamoDB rejects the second page query with `ValidationException`, blocking users from accessing any transactions beyond the first page when date filters are applied.

---

## Problem Description

### Current Cursor Structure

```typescript
interface CursorData {
  createdAt: string;  // ISO timestamp: "2024-01-15T10:30:00.000Z"
  id: string;         // UUID
}
```

The cursor **only stores `createdAt`**, which is correct for `UserCreatedAtIndex` but incorrect for `UserDateIndex`.

### Transaction Model

```typescript
interface Transaction {
  date: string;       // YYYY-MM-DD format: "2024-01-15"
  createdAt: string;  // ISO timestamp: "2024-01-15T10:30:00.000Z"
  // ... other fields
}
```

### DynamoDB GSI Configuration

**UserCreatedAtIndex** (used when no date filters)
```typescript
Partition Key: userId
Sort Key: createdAt  // ISO timestamp format
```

**UserDateIndex** (used when date filters present)
```typescript
Partition Key: userId
Sort Key: date       // YYYY-MM-DD format
```

---

## Root Cause

### Cursor Encoding (Lines 95-101)

```typescript
function encodeCursor(transaction: Transaction): string {
  const cursorData: CursorData = {
    createdAt: transaction.createdAt,  // ← Only stores createdAt
    id: transaction.id,
  };
  return Buffer.from(JSON.stringify(cursorData)).toString("base64");
}
```

**Issue:** The `transaction.date` field is never stored in the cursor.

### ExclusiveStartKey Construction (Lines 464-470)

```typescript
const decodedAfter = after ? decodeCursor(after) : undefined;
...(decodedAfter && {
  ExclusiveStartKey: {
    userId: userId,
    id: decodedAfter.id,
    [queryParams.sortKeyName]: decodedAfter.createdAt,  // ← Always uses createdAt
  },
})
```

**Issue:** The property name is dynamic (`"date"` or `"createdAt"`), but the value always comes from `decodedAfter.createdAt`.

### When Using UserDateIndex

```typescript
// Index expects:
ExclusiveStartKey = {
  userId: "user-123",
  id: "txn-456",
  date: "2024-01-15"  // ← YYYY-MM-DD format
}

// But cursor provides:
ExclusiveStartKey = {
  userId: "user-123",
  id: "txn-456",
  date: "2024-01-15T10:30:00.000Z"  // ← ISO timestamp format (WRONG!)
}
```

---

## Impact

### Severity: Critical

**User Impact:** Users cannot view more than one page of transactions when applying date filters. This makes the transaction list effectively unusable for date-filtered queries with many results.

### Affected Scenarios

| Query Type | Index Used | Status | Impact |
|------------|------------|--------|---------|
| No filters | UserCreatedAtIndex | ✓ Works correctly | None |
| Date filters (`dateAfter` or `dateBefore`) | UserDateIndex | ✗ **Broken** | Pagination fails after page 1 |
| Other filters only (account, category, type) | UserCreatedAtIndex | ✓ Works correctly | None |
| Date + other filters | UserDateIndex | ✗ **Broken** | Pagination fails after page 1 |

### Symptoms

When pagination is used with date filters:
- ✓ **First page works:** Initial query succeeds (no cursor needed)
- ✗ **Second page fails:** DynamoDB throws `ValidationException`
- ✗ **Complete pagination failure:** Users cannot navigate beyond the first page
- **Error message:** `"The provided starting key does not match the range key predicate"`

**Actual Error:**
```
ValidationException: The provided starting key does not match the range key predicate
    at TransactionRepository.findActiveByUserId
```

DynamoDB validates the ExclusiveStartKey format and **rejects queries** when the range key type doesn't match the index definition.

### Why Not Immediately Obvious

The bug only manifests when **both conditions** are met:
1. **Date filters are present** (triggers UserDateIndex usage)
2. **Pagination continues beyond first page** (requires cursor)

Without both conditions, the bug remains hidden:
- First page loads successfully (no cursor validation needed)
- Queries without date filters use UserCreatedAtIndex (cursor format matches)
- Single-page results never trigger cursor validation

---

## Reproduction Steps

### 1. Create Test Data

```typescript
// Create multiple transactions on different dates
await createTransaction({ date: "2024-01-15", ... });
await createTransaction({ date: "2024-01-14", ... });
await createTransaction({ date: "2024-01-13", ... });
// ... more transactions
```

### 2. Execute Paginated Query with Date Filter

```graphql
query {
  transactions(
    pagination: { first: 2 }
    filters: {
      dateAfter: "2024-01-01"
      dateBefore: "2024-01-31"
    }
  ) {
    edges {
      node { id date }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### 3. Request Next Page

```graphql
query {
  transactions(
    pagination: {
      first: 2
      after: "<endCursor from previous response>"
    }
    filters: {
      dateAfter: "2024-01-01"
      dateBefore: "2024-01-31"
    }
  ) {
    edges {
      node { id date }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Expected vs Actual

**Expected:** Page 2 continues from where page 1 ended with remaining transactions

**Actual:** Query throws `ValidationException` and pagination completely fails:
```
TransactionRepositoryError: Failed to find paginated transactions
Caused by: ValidationException: The provided starting key does not match the range key predicate
```

Users are **blocked from accessing any data beyond the first page** when using date filters.

---

## Solution

### Step 1: Update CursorData Interface

```typescript
interface CursorData {
  createdAt: string;  // ISO timestamp
  date: string;       // YYYY-MM-DD format  ← ADD THIS
  id: string;         // UUID
}
```

### Step 2: Update encodeCursor Function

```typescript
function encodeCursor(transaction: Transaction): string {
  const cursorData: CursorData = {
    createdAt: transaction.createdAt,
    date: transaction.date,  // ← ADD THIS
    id: transaction.id,
  };
  return Buffer.from(JSON.stringify(cursorData)).toString("base64");
}
```

### Step 3: Update decodeCursor Validation

```typescript
function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const cursorData = JSON.parse(decoded) as CursorData;

    // Validate cursor structure
    if (!cursorData.createdAt || !cursorData.date || !cursorData.id) {  // ← UPDATE
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
```

### Step 4: Update ExclusiveStartKey Construction

```typescript
const decodedAfter = after ? decodeCursor(after) : undefined;
...(decodedAfter && {
  ExclusiveStartKey: {
    userId: userId,
    id: decodedAfter.id,
    [queryParams.sortKeyName]:
      queryParams.sortKeyName === 'date'
        ? decodedAfter.date      // ← Use date for UserDateIndex
        : decodedAfter.createdAt // ← Use createdAt for UserCreatedAtIndex
  },
})
```

**Alternative (more explicit):**

```typescript
const decodedAfter = after ? decodeCursor(after) : undefined;
...(decodedAfter && {
  ExclusiveStartKey: {
    userId: userId,
    id: decodedAfter.id,
    ...(queryParams.sortKeyName === 'date'
      ? { date: decodedAfter.date }
      : { createdAt: decodedAfter.createdAt }
    )
  },
})
```

---

## Backward Compatibility Considerations

### Breaking Change

This fix introduces a **breaking change** for existing cursors:
- Old cursors: `{ createdAt, id }`
- New cursors: `{ createdAt, date, id }`

### Migration Strategy

**Option 1: Soft Validation (Recommended for development)**

```typescript
function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const cursorData = JSON.parse(decoded) as CursorData;

    if (!cursorData.createdAt || !cursorData.id) {
      throw new Error("Invalid cursor structure");
    }

    // For backward compatibility, allow missing date field
    // but log a warning
    if (!cursorData.date) {
      console.warn("Legacy cursor format detected (missing date field)");
      // Extract date from createdAt as fallback
      cursorData.date = cursorData.createdAt.split('T')[0];
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
```

**Option 2: Force Reset (Simpler)**

Accept that old cursors will fail and require users to restart pagination from the beginning. This is acceptable for development/staging environments.

---

## Testing Strategy

### Regression Test Added

**Location:** `backend/src/repositories/TransactionRepository.test.ts:2416-2511`

**Test Name:** `"should paginate correctly when using date filters without duplicates or missing items"`

**Run Test:**
```bash
npm test -- TransactionRepository.test.ts -t "pagination with date filters"
```

**Current Result (Bug Present):**
```
FAIL  src/repositories/TransactionRepository.test.ts
  ● TransactionRepository › BUG: pagination with date filters (UserDateIndex)
    › should paginate correctly when using date filters without duplicates or missing items

    TransactionRepositoryError: Failed to find paginated transactions

    ValidationException: The provided starting key does not match the range key predicate
```

**Expected Result (After Fix):**
```
PASS  src/repositories/TransactionRepository.test.ts
  ✓ should paginate correctly when using date filters without duplicates or missing items
```

### Additional Unit Tests Recommended

After fixing the bug, consider adding:

1. **Cursor encoding test** - Verify both `date` and `createdAt` are stored
```typescript
test('cursor should encode both date and createdAt', () => {
  const cursor = encodeCursor(transaction);
  const decoded = decodeCursor(cursor);

  expect(decoded.date).toBe('2024-01-15');
  expect(decoded.createdAt).toBe('2024-01-15T10:30:00.000Z');
  expect(decoded.id).toBe('txn-123');
});
```

2. **ExclusiveStartKey verification** - Use spies to verify correct key format
3. **Backward compatibility test** - Verify legacy cursors are handled gracefully

### Integration Tests

1. Create 50+ transactions across multiple dates
2. Apply date filters and paginate through all results
3. Verify no duplicates and no missing transactions
4. Verify consistent ordering

---

## Additional Notes

### Design Question: Why Two Time Fields?

The `Transaction` model has both `date` and `createdAt`:
- **`date`**: User-specified transaction date (what day the transaction occurred)
- **`createdAt`**: System timestamp (when the record was created)

These can differ when users backdate transactions.

### Performance Impact

The fix adds minimal overhead:
- Cursor size increases slightly (adds one date string)
- No impact on query performance
- Encoding/decoding complexity unchanged

---

## Related Files

- `backend/src/repositories/TransactionRepository.ts` - Main implementation
- `backend/src/models/Transaction.ts` - Transaction type definition
- `backend/src/types/pagination.ts` - Generic pagination types
- `backend/scripts/create-tables.ts` - DynamoDB table/GSI definitions
- `backend/src/repositories/TransactionRepository.test.ts` - Test coverage

---

## References

- [DynamoDB Pagination Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html)
- [Relay Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- Project Documentation: `docs/general-spec.md`, `docs/tech-spec.md`
