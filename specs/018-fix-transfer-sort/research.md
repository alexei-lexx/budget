# Research: Transfer Transaction Sort Order Fix

**Feature**: 018-fix-transfer-sort
**Date**: 2025-12-10

## Problem Analysis

### Root Cause
Transfer transactions are created simultaneously with identical `createdAt` timestamps. When querying via `UserCreatedAtIndex` (userId + createdAt), DynamoDB doesn't guarantee consistent ordering for items with the same sort key value, causing paired transfer transactions to appear in unpredictable order.

### Current Implementation
- **Index**: `UserCreatedAtIndex` with partition key `userId` and sort key `createdAt` (ISO 8601 timestamp)
- **ID Generation**: UUID v4 (randomUUID) - no temporal ordering
- **Transfer Creation**: Both TRANSFER_IN and TRANSFER_OUT transactions created in single atomic operation with identical timestamps

## Solution Design

### Decision: Composite Sort Key with Monotonic ULID (Keep UUID ID)

**Approach**: Add separate `createdAtSortable` field for indexing while preserving UUID transaction IDs.

**Implementation**:
1. **New Field**: `createdAtSortable = createdAt + "#" + monotonicUlid()`
   - Format: `2025-12-10T10:30:45.123Z#01JECK8XQZR3K7P9M5N4YABCDE`
   - Ensures lexicographic sorting: first by timestamp, then by ULID
2. **ID Unchanged**: Transaction `id` remains UUID v4 (no breaking changes)
3. **ULID for Sorting Only**: Generate monotonic ULID solely for sort order, not as entity identifier
4. **Index Replacement**: Replace `UserCreatedAtIndex` (userId + createdAt) with `UserCreatedAtSortableIndex` (userId + createdAtSortable)
5. **Migration**: Populate `createdAtSortable` for existing records using UUID (not temporally sortable, but ensures field exists)
6. **Scope**: Internal repository field only - not exposed to service, resolver, or GraphQL layers

### Rationale

**Why keep UUID for transaction ID?**
- No breaking changes to existing transaction IDs
- External systems/integrations expecting UUID format remain compatible
- Simpler rollback (just revert index, IDs untouched)
- Clear separation: ID for identity, sortable for ordering
- Less invasive change

**Why monotonic ULID for sorting?**
- Monotonic ULIDs guarantee increasing values within same millisecond
- For transfers created at same timestamp, ULID ensures deterministic order
- First transfer operation gets smaller ULID, second gets larger ULID
- When sorted descending (newest first), second transaction (TRANSFER_IN) appears before first (TRANSFER_OUT)
- Provides general solution for all transactions (not just transfers)

**Why composite key over separate sort?**
- DynamoDB queries return results sorted by the index's sort key
- Composite key ensures database-level ordering without application-level post-processing
- Simplifies pagination cursor logic (single sort key)
- Maintains performance (no additional sorting overhead)

**Why internal field?**
- `createdAtSortable` is an indexing optimization, not a domain concept
- Service and GraphQL layers continue working with `createdAt` and `id` independently
- Reduces API surface area and maintains clean boundaries
- Follows constitution principle: don't expose database implementation details

### Alternatives Considered

**Alternative 1: Replace UUID with ULID for transaction ID**
- **Rejected**: Breaking change to transaction IDs, mixed UUID/ULID formats in database, more invasive, harder rollback

**Alternative 2: Application-level sorting**
- **Rejected**: Breaks pagination (requires fetching all pages to sort), poor performance, violates constitution (prefer database-level operations)

**Alternative 3: Millisecond delay between transfers**
- **Rejected**: Unreliable (clock precision issues), breaks atomicity guarantee, introduces race conditions

**Alternative 4: Transaction type priority in sort key**
- **Rejected**: Works only for transfers, doesn't provide general temporal ordering for all transactions

## Technology Choices

### ULID Library

**Decision**: Use `ulidx` npm package with monotonic factory

**Rationale**:
- Mature, well-maintained library (https://github.com/perry-mitchell/ulidx)
- TypeScript support out of the box
- Lightweight (minimal dependencies)
- Compatible with DynamoDB string type
- Provides `monotonicFactory()` for guaranteed increasing IDs within same millisecond

**Alternative Considered**: `ulid` package
- Original implementation but less actively maintained
- `ulidx` is a fork with better TypeScript support and continued maintenance

### Migration Strategy

**Decision**: Use existing migration framework from constitution

**Implementation**:
- Create migration file: `backend/src/migrations/[timestamp]-populate-createdAtSortable.ts`
- Export `up` function that:
  1. Scans all transactions
  2. Computes `createdAtSortable = createdAt + "#" + monotonicUlid()` for each
     - Note: Existing transactions use fresh ULIDs (not temporally related to original creation time)
     - Only new transactions created after deployment have true temporal ordering
  3. Updates records in batches (DynamoDB batch write limits)
  4. Handles idempotency (skip if `createdAtSortable` already exists)
- Run locally via npm script during development
- Run in production via Lambda during deployment

**Rationale**: Follows established patterns from constitution, ensures consistency across environments

## DynamoDB Index Design

### Index Configuration

**New Index**: `UserCreatedAtSortableIndex`
- **Partition Key**: `userId` (String)
- **Sort Key**: `createdAtSortable` (String)
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
IndexName: "UserCreatedAtSortableIndex"
KeyConditionExpression: "userId = :userId"
ScanIndexForward: false // Descending by createdAtSortable (timestamp#ulid)
```

### Cursor Format Changes

**Before**: `{ createdAt, date, id }`
**After**: `{ createdAtSortable, date, id }`

**Impact**: Existing pagination cursors become invalid after deployment (acceptable - users will start from first page)

## Implementation Scope

### Components to Modify

1. **Data Model** (`backend/src/models/Transaction.ts`)
   - **NO CHANGES** - Transaction interface unchanged (createdAtSortable NOT added)

2. **Validation Schema** (`backend/src/repositories/utils/Transaction.schema.ts`)
   - **ADD** `transactionDbItemSchema` extending `transactionSchema` with `createdAtSortable` field
   - **Purpose**: Validate database items include `createdAtSortable` with correct format
   - **Keep** existing `transactionSchema` unchanged (domain model validation)

3. **Repository** (`backend/src/repositories/TransactionRepository.ts`)
   - Update index name constant: `USER_CREATED_AT_SORTABLE_INDEX`
   - Create monotonic ULID factory instance at module level
   - Update `buildTransaction()`: Keep UUID for id
   - Update `create()`: Add `createdAtSortable` to DynamoDB item (not in Transaction object)
   - Update `createMany()`: Add `createdAtSortable` to all DynamoDB items
   - Validate raw items with `transactionDbItemSchema`, transform to `Transaction` by omitting `createdAtSortable`
   - Update cursor logic: Replace `createdAt` with `createdAtSortable`
   - Update query methods using `UserCreatedAtIndex`

4. **Table Creation Script** (`backend/src/scripts/create-tables.ts`)
   - Add `createdAtSortable` to `AttributeDefinitions`
   - Replace `UserCreatedAtIndex` with `UserCreatedAtSortableIndex`

5. **CDK Stack** (`backend-cdk/lib/backend-cdk-stack.ts`)
   - Add `createdAtSortable` attribute definition
   - Replace index configuration

6. **Migration** (new file)
   - Create `backend/src/migrations/[timestamp]-populate-createdAtSortable.ts`
   - Implement batch update logic with idempotency

### Components NOT Modified

- Transaction interface (domain model unchanged)
- GraphQL schema (no API changes)
- Service layer (works with `createdAt` and `id` independently)
- Resolvers (no changes needed)
- Frontend (no visibility into `createdAtSortable`)
- Tests (service/resolver tests unaffected; repository tests need updates)

## Testing Strategy

### Repository Tests
- Update existing tests to verify `createdAtSortable` generation in DynamoDB items (but NOT in returned Transaction objects)
- Add test: Transfer pairs return in correct order (TRANSFER_IN before TRANSFER_OUT)
- Add test: Transactions with same `createdAt` sort deterministically
- Update cursor pagination tests

### Integration Testing
- Create transfers via GraphQL mutation
- Query transactions list
- Verify TRANSFER_IN appears before TRANSFER_OUT in response

### Migration Testing
- Test migration locally with sample data
- Verify idempotency (running twice produces same result)
- Verify all records have `createdAtSortable` after migration

## Deployment Considerations

### Deployment Order
1. Deploy backend CDK (creates new index, removes old index)
2. Run migration Lambda (populates `createdAtSortable` for existing records)
3. Deploy backend code (uses new index)

### Backward Compatibility
- **Breaking Change**: Limited - only pagination cursors invalidated
- **User Impact**: Pagination cursors invalidated (users restart from page 1)
- **Data Safety**: Migration populates field before code deployment
- **Transaction IDs**: Unchanged (no breaking changes)

### Rollback Plan
- Revert CDK changes (restore `UserCreatedAtIndex`)
- Revert repository code changes
- `createdAtSortable` field can remain (ignored by old code)

## Open Questions

None - design is complete and validated against constitution.
