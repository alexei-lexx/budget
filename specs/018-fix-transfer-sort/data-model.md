# Data Model: Transfer Transaction Sort Order Fix

**Feature**: 018-fix-transfer-sort
**Date**: 2025-12-06

## Entity Changes

### Transaction (Modified)

**Purpose**: Represents a single monetary transaction with deterministic sort ordering

#### Schema Changes

```typescript
export interface Transaction {
  userId: string;              // Partition key (unchanged)
  id: string;                  // Sort key - CHANGED: ULID instead of UUID v4
  accountId: string;           // Foreign key (unchanged)
  categoryId?: string;         // Optional foreign key (unchanged)
  type: TransactionType;       // Transaction type (unchanged)
  amount: number;              // Transaction amount (unchanged)
  currency: string;            // ISO currency code (unchanged)
  date: string;                // Transaction date YYYY-MM-DD (unchanged)
  description?: string;        // Optional description (unchanged)
  transferId?: string;         // Optional UUID linking transfers (unchanged)
  isArchived: boolean;         // Soft delete flag (unchanged)
  createdAt: string;           // ISO timestamp (unchanged)
  updatedAt: string;           // ISO timestamp (unchanged)
  // NOTE: createdAtId is NOT in this interface - it's database-only
}
```

#### Field Specifications

| Field | Type | Required | Description | Change |
|-------|------|----------|-------------|---------|
| `id` | string | Yes | ULID (replaces UUID v4) | **Modified** - now ULID for temporal ordering |

**Database-Only Field** (not in Transaction interface):
| Field | Type | Required | Description | Storage |
|-------|------|----------|-------------|---------|
| `createdAtId` | string | Yes | Composite: `createdAt + "#" + id` | **DynamoDB only** - internal indexing field, never exposed to model/service/GraphQL layers |

#### Validation Rules

**Database Field: `createdAtId`** (not validated via Transaction schema)
- **Format**: `<ISO8601>#<ULID>`
- **Example**: `2025-12-06T10:30:45.123Z#01JECK8XQZR3K7P9M5N4YABCDE`
- **Computation**: Automatically generated in repository layer during item creation
- **Immutable**: Set once at creation, never updated
- **Storage**: DynamoDB item attribute only
- **Visibility**: Repository internal use only - NOT in Transaction interface, NOT exposed to service/resolver/GraphQL layers
- **Validation**: Pattern-validated when reading raw DynamoDB items in repository (not via transactionSchema)

**Modified Field: `id`**
- **Format**: ULID (26 characters, base32 encoded)
- **Example**: `01JECK8XQZR3K7P9M5N4YABCDE`
- **Properties**:
  - First 48 bits: Unix timestamp in milliseconds
  - Remaining 80 bits: Randomness
  - Lexicographically sortable by creation time
  - Monotonic within same millisecond (using monotonic ULID generator)

#### Relationships (Unchanged)

- **Account**: `accountId` references Account entity
- **Category**: `categoryId` optionally references Category entity
- **Transfer Pair**: `transferId` links paired TRANSFER_IN/TRANSFER_OUT transactions

## DynamoDB Table Changes

### Transactions Table

#### Primary Key (Unchanged)
- **Partition Key**: `userId` (String)
- **Sort Key**: `id` (String) - format changes from UUID to ULID

#### Attribute Definitions

**Added**:
```typescript
{ AttributeName: "createdAtId", AttributeType: "S" }
```

**Removed**:
```typescript
{ AttributeName: "createdAt", AttributeType: "S" }
```

#### Global Secondary Indexes

**Added Index: `UserCreatedAtIdIndex`**
- **Partition Key**: `userId` (String)
- **Sort Key**: `createdAtId` (String)
- **Projection**: ALL
- **Purpose**: Enable efficient querying of transactions sorted by creation time with deterministic ordering

**Removed Index: `UserCreatedAtIndex`**
- Replaced by `UserCreatedAtIdIndex`

**Unchanged Index: `UserDateIndex`**
- **Partition Key**: `userId` (String)
- **Sort Key**: `date` (String)
- **Projection**: ALL
- **Purpose**: Enable date-range queries for filtering transactions

### Index Selection Logic

Repository selects index based on query filters:

```typescript
const useUserDateIndex = !!(filters?.dateAfter || filters?.dateBefore);
const indexName = useUserDateIndex
  ? "UserDateIndex"
  : "UserCreatedAtIdIndex"; // Changed from UserCreatedAtIndex
```

## Data Migration

### Migration: Populate createdAtId

**File**: `backend/src/migrations/[timestamp]-populate-createdAtId.ts`

**Purpose**: Compute and populate `createdAtId` field for all existing transactions

#### Implementation

```typescript
export async function up(client: DynamoDBDocumentClient): Promise<void> {
  // 1. Scan all transactions
  // 2. For each transaction without createdAtId:
  //    - Compute: createdAtId = createdAt + "#" + id
  //    - Update record
  // 3. Process in batches (25 items per batch - DynamoDB limit)
  // 4. Log progress
}
```

#### Idempotency
- Check if `createdAtId` already exists before updating
- Safe to run multiple times
- Handles partial completion scenarios

#### Batch Processing
- Use `TransactWriteCommand` for atomic batch updates
- Maximum 25 items per batch (DynamoDB limit)
- Retry logic for transient failures

## Query Pattern Changes

### Before (UserCreatedAtIndex)

```typescript
{
  IndexName: "UserCreatedAtIndex",
  KeyConditionExpression: "userId = :userId",
  ExclusiveStartKey: {
    userId: "user123",
    id: "uuid-value",
    createdAt: "2025-12-06T10:30:45.123Z"
  },
  ScanIndexForward: false // Descending (newest first)
}
```

### After (UserCreatedAtIdIndex)

```typescript
{
  IndexName: "UserCreatedAtIdIndex",
  KeyConditionExpression: "userId = :userId",
  ExclusiveStartKey: {
    userId: "user123",
    id: "01JECK8XQZR3K7P9M5N4YABCDE",
    createdAtId: "2025-12-06T10:30:45.123Z#01JECK8XQZR3K7P9M5N4YABCDE"
  },
  ScanIndexForward: false // Descending (newest first)
}
```

## Cursor Format Changes

### Before

```typescript
interface CursorData {
  createdAt: string; // ISO 8601 timestamp
  date: string;      // YYYY-MM-DD
  id: string;        // UUID
}
```

### After

```typescript
interface CursorData {
  createdAtId: string; // ISO8601#ULID format
  date: string;        // YYYY-MM-DD (unchanged)
  id: string;          // ULID (format change)
}
```

**Impact**: Existing pagination cursors become invalid after deployment. Users will be redirected to first page.

## Sorting Behavior

### Transfer Pair Ordering

**Scenario**: User creates transfer from Account A to Account B

**Database Creation**:
1. Generate `createdAt`: `2025-12-06T10:30:45.123Z`
2. Generate TRANSFER_OUT ULID: `01JECK8XQZR3K7P9M5N4YABCDE` (first)
3. Generate TRANSFER_IN ULID: `01JECK8XQZR3K7P9M5N4YABCDF` (second - slightly larger)
4. Compute `createdAtId` for both:
   - TRANSFER_OUT: `2025-12-06T10:30:45.123Z#01JECK8XQZR3K7P9M5N4YABCDE`
   - TRANSFER_IN: `2025-12-06T10:30:45.123Z#01JECK8XQZR3K7P9M5N4YABCDF`

**Query Result** (descending order, newest first):
```
Position 1: TRANSFER_IN  (larger createdAtId due to larger ULID)
Position 2: TRANSFER_OUT (smaller createdAtId due to smaller ULID)
```

**Expected User View**: Inbound transaction appears first (most recent activity), then outbound

### General Transaction Ordering

All transactions sorted by `createdAtId` in descending order (newest first):
- Primary sort: `createdAt` timestamp (descending)
- Secondary sort: ULID portion of `createdAtId` (descending when timestamps match)
- Guarantees deterministic, stable ordering across queries

## Component Layer Boundaries

### Repository Layer (Internal)
- **Generates**: `id` (ULID), `createdAtId` (composite) - stored in DynamoDB item
- **Uses**: `createdAtId` for index queries and pagination cursors
- **Exposes**: `Transaction` object (WITHOUT `createdAtId` - stripped during hydration)
- **Internal Access**: Reads `createdAtId` from raw DynamoDB items for cursor encoding

### Service Layer (Abstraction)
- **Receives**: `Transaction` object from repository (no `createdAtId` field)
- **Unaware**: `createdAtId` does not exist in Transaction interface
- **Uses**: `id`, `createdAt` for business logic
- **Passes**: Unchanged `Transaction` to resolvers

### GraphQL Layer (API Contract)
- **Schema**: No changes - `createdAtId` not in GraphQL schema
- **Returns**: `id` (as String), `createdAt` (as DateTime)
- **Hides**: `createdAtId` implementation detail from clients

### Frontend
- **No visibility** into `createdAtId`
- **No changes** required

## State Transitions

N/A - This feature adds internal indexing field only; no state machine changes.

## Constraints

1. **ULID Generation**: Must use monotonic ULID generator to ensure increasing IDs within same millisecond
2. **Immutability**: `createdAtId` computed once at creation, never updated
3. **Atomicity**: Transfer pairs created in single DynamoDB transaction (existing behavior preserved)
4. **Migration**: Must complete before deploying code that uses new index
5. **Repository Boundary**: `createdAtId` must not leak to service/resolver/GraphQL layers

## Testing Implications

### Repository Tests (Updated)
- Verify ULID generation for new transactions
- Verify `createdAtId` stored in DynamoDB items (not in Transaction interface)
- Verify `createdAtId` format in raw items: `createdAt#id`
- Test transfer pair ordering (TRANSFER_IN before TRANSFER_OUT in descending query)
- Test cursor encoding/decoding with `createdAtId` from raw DynamoDB items
- Test query using `UserCreatedAtIdIndex`
- Verify hydrated Transaction objects do NOT contain `createdAtId` field

### Service Tests (Unchanged)
- No changes required (service layer completely unaware of `createdAtId`)

### Resolver Tests (Unchanged)
- No changes required (GraphQL schema unchanged)

### Migration Tests (New)
- Test migration populates `createdAtId` in DynamoDB items
- Test idempotency (running twice is safe)
- Test batch processing with large datasets
