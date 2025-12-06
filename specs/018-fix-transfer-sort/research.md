# Research: Transfer Transaction Sort Order Fix

**Feature**: 018-fix-transfer-sort
**Date**: 2025-12-06

## Problem Analysis

### Root Cause
Transfer transactions are created simultaneously with identical `createdAt` timestamps. When querying via `UserCreatedAtIndex` (userId + createdAt), DynamoDB doesn't guarantee consistent ordering for items with the same sort key value, causing paired transfer transactions to appear in unpredictable order.

### Current Implementation
- **Index**: `UserCreatedAtIndex` with partition key `userId` and sort key `createdAt` (ISO 8601 timestamp)
- **ID Generation**: UUID v4 (randomUUID) - no temporal ordering
- **Transfer Creation**: Both TRANSFER_IN and TRANSFER_OUT transactions created in single atomic operation with identical timestamps

## Solution Design

### Decision: Composite Sort Key with ULID

**Approach**: Replace `createdAt` sort key with composite `createdAtId` field combining timestamp and lexicographically-sortable ID.

**Implementation**:
1. **New Field**: `createdAtId = createdAt + "#" + id`
   - Format: `2025-12-06T10:30:45.123Z#01JECK8XQZR3K7P9M5N4YABCDE`
   - Ensures lexicographic sorting: first by timestamp, then by ID
2. **ID Switch**: Replace UUID v4 with ULID
   - ULID provides temporal ordering (earlier IDs < later IDs)
   - For transfers created at same millisecond, TRANSFER_IN gets smaller ID than TRANSFER_OUT
3. **Index Replacement**: Replace `UserCreatedAtIndex` (userId + createdAt) with `UserCreatedAtId` (userId + createdAtId)
4. **Migration**: Populate `createdAtId` for existing records
5. **Scope**: Internal repository field only - not exposed to service, resolver, or GraphQL layers

### Rationale

**Why ULID over UUID?**
- ULIDs are lexicographically sortable by creation time
- First 48 bits encode Unix timestamp in milliseconds (monotonically increasing)
- Remaining 80 bits are random (collision resistance similar to UUID)
- When combined with timestamp in composite key, provides deterministic ordering

**Why composite key over separate sort?**
- DynamoDB queries return results sorted by the index's sort key
- Composite key ensures database-level ordering without application-level post-processing
- Simplifies pagination cursor logic (single sort key)
- Maintains performance (no additional sorting overhead)

**Why internal field?**
- `createdAtId` is an indexing optimization, not a domain concept
- Service and GraphQL layers continue working with `createdAt` and `id` independently
- Reduces API surface area and maintains clean boundaries
- Follows constitution principle: don't expose database implementation details

### Alternatives Considered

**Alternative 1: Application-level sorting**
- **Rejected**: Breaks pagination (requires fetching all pages to sort), poor performance, violates constitution (prefer database-level operations)

**Alternative 2: Millisecond delay between transfers**
- **Rejected**: Unreliable (clock precision issues), breaks atomicity guarantee, introduces race conditions

**Alternative 3: Add `sequenceNumber` field**
- **Rejected**: Requires counter management, complicates concurrent writes, doesn't solve general case (still need deterministic ordering for all transactions)

## Technology Choices

### ULID Library

**Decision**: Use `ulidx` npm package

**Rationale**:
- Mature, well-maintained library (https://github.com/perry-mitchell/ulidx)
- TypeScript support out of the box
- Lightweight (minimal dependencies)
- Compatible with DynamoDB string type
- Provides monotonic ULID generation (ensures increasing IDs within same millisecond)

**Alternative Considered**: `ulid` package
- Original implementation but less actively maintained
- `ulidx` is a fork with better TypeScript support and continued maintenance

### Migration Strategy

**Decision**: Use existing migration framework from constitution

**Implementation**:
- Create migration file: `backend/src/migrations/[timestamp]-populate-createdAtId.ts`
- Export `up` function that:
  1. Scans all transactions
  2. Computes `createdAtId = createdAt + "#" + id` for each
  3. Updates records in batches (DynamoDB batch write limits)
  4. Handles idempotency (skip if `createdAtId` already exists)
- Run locally via npm script during development
- Run in production via Lambda during deployment

**Rationale**: Follows established patterns from constitution, ensures consistency across environments

## DynamoDB Index Design

### Index Configuration

**New Index**: `UserCreatedAtIdIndex`
- **Partition Key**: `userId` (String)
- **Sort Key**: `createdAtId` (String)
- **Projection**: ALL (include all attributes)

**Index to Remove**: `UserCreatedAtIndex`
- Will be removed from CDK stack definition
- DynamoDB will handle index removal during deployment

### Query Pattern Changes

**Before**:
```typescript
IndexName: "UserCreatedAtIndex"
KeyConditionExpression: "userId = :userId"
ScanIndexForward: false // Descending by createdAt
```

**After**:
```typescript
IndexName: "UserCreatedAtIdIndex"
KeyConditionExpression: "userId = :userId"
ScanIndexForward: false // Descending by createdAtId (timestamp#id)
```

### Cursor Format Changes

**Before**: `{ createdAt, date, id }`
**After**: `{ createdAtId, date, id }`

**Impact**: Existing cursors become invalid after deployment (acceptable - users will start from first page)

## Implementation Scope

### Components to Modify

1. **Data Model** (`backend/src/models/Transaction.ts`)
   - Add `createdAtId: string` field to `Transaction` interface

2. **Repository** (`backend/src/repositories/TransactionRepository.ts`)
   - Update index name constant: `USER_CREATED_AT_ID_INDEX`
   - Update `buildTransaction()`: Generate ULID, compute `createdAtId`
   - Update cursor logic: Replace `createdAt` with `createdAtId`
   - Update query methods using `UserCreatedAtIndex`

3. **Table Creation Script** (`backend/src/scripts/create-tables.ts`)
   - Add `createdAtId` to `AttributeDefinitions`
   - Replace `UserCreatedAtIndex` with `UserCreatedAtIdIndex`

4. **CDK Stack** (`backend-cdk/lib/backend-cdk-stack.ts`)
   - Add `createdAtId` attribute definition
   - Replace index configuration

5. **Migration** (new file)
   - Create `backend/src/migrations/[timestamp]-populate-createdAtId.ts`
   - Implement batch update logic with idempotency

6. **Validation Schema** (`backend/src/repositories/utils/Transaction.schema.ts`)
   - Add `createdAtId` to Zod schema

### Components NOT Modified

- GraphQL schema (no API changes)
- Service layer (works with `createdAt` and `id` independently)
- Resolvers (no changes needed)
- Frontend (no visibility into `createdAtId`)
- Tests (service/resolver tests unaffected; repository tests need updates)

## Testing Strategy

### Repository Tests
- Update existing tests to verify `createdAtId` generation
- Add test: Transfer pairs return in correct order (TRANSFER_IN before TRANSFER_OUT)
- Add test: Transactions with same `createdAt` sort by ID
- Update cursor pagination tests

### Integration Testing
- Create transfers via GraphQL mutation
- Query transactions list
- Verify TRANSFER_IN appears before TRANSFER_OUT in response

### Migration Testing
- Test migration locally with sample data
- Verify idempotency (running twice produces same result)
- Verify all records have `createdAtId` after migration

## Deployment Considerations

### Deployment Order
1. Deploy backend CDK (creates new index, removes old index)
2. Run migration Lambda (populates `createdAtId` for existing records)
3. Deploy backend code (uses new index)

### Backward Compatibility
- **Breaking Change**: Yes, but isolated to database layer
- **User Impact**: Pagination cursors invalidated (users restart from page 1)
- **Data Safety**: Migration populates field before code deployment

### Rollback Plan
- Revert CDK changes (restore `UserCreatedAtIndex`)
- Revert repository code changes
- `createdAtId` field can remain (ignored by old code)

## Open Questions

None - design is complete and validated against constitution.
