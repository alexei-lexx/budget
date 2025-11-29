# Research: Pagination Cursor Bug Analysis

**Feature**: Fix Pagination Cursor Bug - UserDateIndex Incompatibility
**Date**: 2025-11-29
**Status**: Complete

## Overview

This research document analyzes the pagination cursor bug that prevents users from navigating beyond the first page when date filters are applied to transaction queries.

## Bug Root Cause

### Decision: Identified Missing Date Field in Cursor Structure

**Root Cause**: The cursor structure only stores `createdAt` (ISO timestamp) and `id`, but lacks the `date` field (YYYY-MM-DD format) required for UserDateIndex queries.

**Current Implementation** (`backend/src/repositories/TransactionRepository.ts:75-78`):
```typescript
interface CursorData {
  createdAt: string;  // ISO 8601 timestamp
  id: string;         // UUID
  // ❌ Missing: date field (YYYY-MM-DD)
}
```

**Impact**: When pagination uses UserDateIndex (triggered by date filters), the ExclusiveStartKey construction attempts to use `createdAt` for the `date` sort key, causing a format mismatch:
- Expected: `{ userId: "...", id: "...", date: "2024-01-20" }` (YYYY-MM-DD)
- Actual: `{ userId: "...", id: "...", date: "2024-01-20T14:23:45.678Z" }` (ISO timestamp)

**Rationale**: The cursor must include all fields needed to construct ExclusiveStartKey for both DynamoDB indexes:
- UserCreatedAtIndex requires: `userId`, `createdAt`, `id`
- UserDateIndex requires: `userId`, `date`, `id`

Since the cursor is generic and doesn't know which index will be used on the next page request, it must include both `createdAt` and `date`.

### Alternatives Considered

1. **Store index type in cursor**: Encode which index was used (`{ index: "UserDateIndex", ... }`)
   - **Rejected**: Adds complexity and couples cursor to database implementation details. The index selection is determined by filters, not cursor history.

2. **Convert createdAt to date format when needed**: Extract YYYY-MM-DD from ISO timestamp
   - **Rejected**: Violates semantic correctness. `createdAt` (when record was created) and `date` (user-specified transaction date) can differ when users backdate transactions.

3. **Use only UserCreatedAtIndex for all queries**: Remove UserDateIndex dependency
   - **Rejected**: Performance degradation for date-filtered queries. UserDateIndex provides efficient date range queries.

## DynamoDB Index Analysis

### Decision: Use Dual-Index Strategy with Field-Appropriate ExclusiveStartKey

**DynamoDB Table Structure** (`backend-cdk/lib/backend-cdk-stack.ts:57-81`):

**UserCreatedAtIndex**:
- Partition Key: `userId` (STRING)
- Sort Key: `createdAt` (STRING, ISO 8601 format)
- Projection: ALL
- Purpose: Efficient queries for unfiltered transaction lists ordered by creation time

**UserDateIndex**:
- Partition Key: `userId` (STRING)
- Sort Key: `date` (STRING, YYYY-MM-DD format)
- Projection: ALL
- Purpose: Efficient queries for date-filtered transaction lists ordered by transaction date

**Index Selection Logic** (`backend/src/repositories/TransactionRepository.ts:1023-1032`):
```typescript
const useUserDateIndex = !!(filters?.dateAfter || filters?.dateBefore);
const indexName = useUserDateIndex ? USER_DATE_INDEX : USER_CREATED_AT_INDEX;
const sortKeyName = useUserDateIndex ? "date" : "createdAt";
```

**Rationale**: The dual-index strategy optimizes query performance:
- Unfiltered queries use `UserCreatedAtIndex` for chronological ordering by creation time
- Date-filtered queries use `UserDateIndex` for efficient date range scans

This is correct and should be maintained. The bug fix must preserve this strategy.

### Alternatives Considered

1. **Single index approach**: Use only `UserCreatedAtIndex` and filter results in application code
   - **Rejected**: Poor performance for date range queries. Would require full table scan with filter.

2. **Composite sort key**: Combine `date` and `createdAt` in single index
   - **Rejected**: DynamoDB doesn't support composite sort keys. Would require concatenated string (e.g., "2024-01-20#2024-01-20T14:23:45.678Z") which adds complexity.

## ExclusiveStartKey Construction Bug

### Decision: Use Correct Sort Key Field Based on Index

**Current Buggy Implementation** (`backend/src/repositories/TransactionRepository.ts:463-468`):
```typescript
...(after && {
  ExclusiveStartKey: {
    userId: userId,
    id: decodeCursor(after).id,
    [queryParams.sortKeyName]: decodeCursor(after).createdAt,  // ❌ Always uses createdAt
  },
}),
```

**Problem**: The dynamic key `[queryParams.sortKeyName]` correctly becomes `"date"` or `"createdAt"` based on the index, but the value is always `decodeCursor(after).createdAt`. When using UserDateIndex, this creates:
```typescript
{
  userId: "user-123",
  id: "abc-def",
  date: "2024-01-20T14:23:45.678Z"  // ❌ Wrong format for date field
}
```

**Required Fix**:
```typescript
...(after && {
  ExclusiveStartKey: {
    userId: userId,
    id: decodedCursor.id,
    [queryParams.sortKeyName]: queryParams.sortKeyName === "date"
      ? decodedCursor.date
      : decodedCursor.createdAt
  },
}),
```

**Rationale**: ExclusiveStartKey must provide values that exactly match the index key types and formats. The sort key field name and value must be synchronized.

### Alternatives Considered

1. **Normalize date storage**: Store all dates as ISO timestamps in DynamoDB
   - **Rejected**: Requires DynamoDB schema migration. Breaks existing data. Date semantic (YYYY-MM-DD) is correct for user-specified transaction dates.

2. **Convert formats in query**: Transform `createdAt` to date format before query
   - **Rejected**: Semantic incorrectness. `createdAt` and `date` represent different concepts (system time vs. user time).

## Cursor Validation Strategy

### Decision: Add Zod Schema Validation for All Three Required Fields

**Current Validation** (`backend/src/repositories/TransactionRepository.ts:103-121`):
```typescript
function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const cursorData = JSON.parse(decoded) as CursorData;

    if (!cursorData.createdAt || !cursorData.id) {  // ❌ Missing date validation
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

**Required Enhancement**:
```typescript
const cursorDataSchema = z.object({
  createdAt: z.string(),  // ISO 8601 timestamp
  date: z.string(),       // YYYY-MM-DD format
  id: z.string(),         // UUID
});

function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const cursorData = cursorDataSchema.parse(parsed);  // Zod validation
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

**Rationale**: Aligns with constitution principle of Input Validation using Zod schemas. Provides clear error messages for cursor structure violations. Catches both legacy cursors (missing `date`) and malformed cursors.

### Alternatives Considered

1. **Manual field checks**: Continue using `if (!field)` pattern
   - **Rejected**: Violates constitution standard of using Zod for validation. Less robust error messages.

2. **No validation enhancement**: Rely on DynamoDB query errors
   - **Rejected**: Poor user experience. Cryptic DynamoDB errors instead of clear "invalid cursor" messages.

## Backward Compatibility Analysis

### Decision: No Backward Compatibility Needed - Breaking Change Acceptable

**Scenario**: Existing cursors in client applications only contain `createdAt` and `id`.

**Impact Analysis**:
- Users with an open pagination session using old cursor format will receive "Invalid cursor structure" error when requesting next page
- Error message clearly indicates cursor is invalid
- User can restart pagination from first page
- All new pagination sessions will work correctly

**Rationale**:
1. Cursors are ephemeral and short-lived (used during single user session)
2. Current implementation is broken - users can't paginate beyond first page anyway
3. Clear error message guides users to refresh/restart
4. Alternative (maintaining dual cursor formats) adds significant complexity with minimal benefit

### Alternatives Considered

1. **Graceful degradation**: Accept old cursors, default missing `date` to `createdAt`
   - **Rejected**: Semantically incorrect. Would still produce wrong results for date-filtered queries.

2. **Cursor versioning**: Add version field (`v1`, `v2`) to support multiple formats
   - **Rejected**: Over-engineering for ephemeral data. Cursors aren't persisted long-term.

## Testing Strategy

### Decision: Enable Existing Disabled Test and Add Comprehensive Repository Test Coverage

**Existing Test** (`backend/src/repositories/TransactionRepository.test.ts:2487-2582`):

Currently disabled with `xdescribe`. This test:
1. Creates 6 transactions with dates from 2024-01-15 to 2024-01-20
2. Fetches first page (3 items) with date filter
3. Fetches second page using cursor
4. Validates no duplicates across pages
5. Validates all transactions accessible

**Actions Required**:
1. Change `xdescribe` to `describe` to enable test
2. Uncomment assertions validating no duplicates and no missing items
3. Verify test passes with cursor fix

**Additional Test Coverage Needed**:
- Test pagination with unfiltered queries (UserCreatedAtIndex path)
- Test cursor validation for invalid formats
- Test cursor validation for missing required fields
- Test error messages for invalid cursors

**Rationale**: Aligns with constitution Test Strategy - repository tests use real DynamoDB connection to validate data access layer. The existing test already covers the critical bug scenario.

### Alternatives Considered

1. **Mock-based testing**: Mock DynamoDB client
   - **Rejected**: Constitution requires repository tests to use real database connection.

2. **Integration tests only**: Test through GraphQL API
   - **Rejected**: Constitution prioritizes unit tests. Repository-level tests provide faster feedback and clearer error isolation.

## Implementation Summary

### Files Requiring Modification

1. **`backend/src/repositories/TransactionRepository.ts`**
   - Update `CursorData` interface to include `date: string`
   - Update `encodeCursor` to include `transaction.date`
   - Update `decodeCursor` to validate `date` field using Zod schema
   - Fix `ExclusiveStartKey` construction to use correct field based on `sortKeyName`

2. **`backend/src/repositories/TransactionRepository.test.ts`**
   - Enable disabled pagination test (`xdescribe` → `describe`)
   - Uncomment duplicate/missing item assertions
   - Add additional test cases for cursor validation

### No Schema Changes Required

The GraphQL schema does not require changes. The cursor is opaque to clients (base64-encoded string). The internal structure change is transparent to the API contract.

### No Frontend Changes Required

Frontend uses cursor as opaque pagination token. The internal structure change is transparent to Apollo Client and Vue components.

## Performance Impact

**Expected**: No performance degradation. The fix corrects existing broken functionality without changing query patterns or adding computational overhead.

**Cursor Size**: Minimal increase (~10 bytes for "date":"2024-01-20" in JSON before base64 encoding)

## Security Considerations

**Cursor Validation**: Enhanced validation prevents malformed cursors from reaching DynamoDB, reducing risk of query errors or unexpected behavior.

**User Data Isolation**: No changes to userId-scoped queries. Maintains constitution requirement for zero cross-user data leakage.

## Conclusion

The research confirms that the bug is caused by a missing `date` field in the cursor structure, combined with incorrect field selection when constructing ExclusiveStartKey for UserDateIndex queries. The fix requires:

1. Expand cursor to include all three fields: `createdAt`, `date`, `id`
2. Fix ExclusiveStartKey construction to select correct field based on index
3. Enhance cursor validation using Zod schema
4. Enable existing disabled test to verify fix

All changes maintain constitutional compliance and require no GraphQL schema modifications or frontend changes.
