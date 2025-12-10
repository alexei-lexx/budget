# Data Model: Transfer Transaction Sort Order Fix

**Feature**: 018-fix-transfer-sort
**Date**: 2025-12-10

## Entity Changes

### Transaction (Modified - Database Layer Only)

**Purpose**: Represents a single monetary transaction with deterministic sort ordering

#### Schema Changes

```typescript
export interface Transaction {
  userId: string;              // Partition key (unchanged)
  id: string;                  // Sort key - UNCHANGED (remains UUID v4)
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
  // NOTE: createdAtSortable is NOT in this interface - it's database-only
}
```

#### Field Specifications

**No changes to Transaction interface fields**

**Database-Only Field** (not in Transaction interface):
| Field | Type | Required | Description | Storage |
|-------|------|----------|-------------|---------|
| `createdAtSortable` | string | Yes | Composite: `createdAt + "#" + monotonicUlid()` | **DynamoDB only** - internal indexing field, never exposed to model/service/GraphQL layers |

#### Validation Rules

**Database Field: `createdAtSortable`** (not validated via Transaction schema)
- **Format**: `<ISO8601>#<ULID>`
- **Example**: `2025-12-10T10:30:45.123Z#01JECK8XQZR3K7P9M5N4YABCDE`
- **Computation**: Automatically generated in repository layer during item creation using monotonic ULID factory
- **Immutable**: Set once at creation, never updated
- **Storage**: DynamoDB item attribute only
- **Visibility**: Repository internal use only - NOT in Transaction interface, NOT exposed to service/resolver/GraphQL layers
- **Validation**: Pattern-validated when reading raw DynamoDB items in repository (not via transactionSchema)

**Unchanged Field: `id`**
- **Format**: UUID v4 (36 characters including hyphens)
- **Example**: `550e8400-e29b-41d4-a716-446655440000`
- **Generation**: `randomUUID()` from Node.js crypto module
- **No changes to ID generation or format**

#### Relationships (Unchanged)

- **Account**: `accountId` references Account entity
- **Category**: `categoryId` optionally references Category entity
- **Transfer Pair**: `transferId` links paired TRANSFER_IN/TRANSFER_OUT transactions

## DynamoDB Table Changes

### Transactions Table

#### Primary Key (Unchanged)
- **Partition Key**: `userId` (String)
- **Sort Key**: `id` (String) - format remains UUID v4

#### Attribute Definitions

**Added**:
```typescript
{ AttributeName: "createdAtSortable", AttributeType: "S" }
```

**Removed**:
```typescript
{ AttributeName: "createdAt", AttributeType: "S" }
```

#### Global Secondary Indexes

**Added Index: `UserCreatedAtSortableIndex`**
- **Partition Key**: `userId` (String)
- **Sort Key**: `createdAtSortable` (String)
- **Projection**: ALL
- **Purpose**: Enable efficient querying of transactions sorted by creation time with deterministic ordering

**Removed Index: `UserCreatedAtIndex`**
- Replaced by `UserCreatedAtSortableIndex`

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
  : "UserCreatedAtSortableIndex"; // Changed from UserCreatedAtIndex
```

## Data Migration

### Migration: Populate createdAtSortable

**File**: `backend/src/migrations/[timestamp]-populate-createdAtSortable.ts`

**Purpose**: Compute and populate `createdAtSortable` field for all existing transactions

#### Implementation

```typescript
import { monotonicFactory } from "ulidx";

const ulid = monotonicFactory();

export async function up(client: DynamoDBDocumentClient): Promise<void> {
  // 1. Scan all transactions
  // 2. For each transaction without createdAtSortable:
  //    - Compute: createdAtSortable = createdAt + "#" + ulid()
  //    - Note: ULIDs generated during migration are not temporally related
  //      to original transaction creation (UUID IDs aren't sortable)
  //    - Only new transactions created after deployment have true temporal ordering
  //    - Update record
  // 3. Process in batches (25 items per batch - DynamoDB limit)
  // 4. Log progress
}
```

#### Idempotency
- Check if `createdAtSortable` already exists before updating
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
    id: "550e8400-e29b-41d4-a716-446655440000",
    createdAt: "2025-12-10T10:30:45.123Z"
  },
  ScanIndexForward: false // Descending (newest first)
}
```

### After (UserCreatedAtSortableIndex)

```typescript
{
  IndexName: "UserCreatedAtSortableIndex",
  KeyConditionExpression: "userId = :userId",
  ExclusiveStartKey: {
    userId: "user123",
    id: "550e8400-e29b-41d4-a716-446655440000",
    createdAtSortable: "2025-12-10T10:30:45.123Z#01JECK8XQZR3K7P9M5N4YABCDE"
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
  createdAtSortable: string; // ISO8601#ULID format
  date: string;              // YYYY-MM-DD (unchanged)
  id: string;                // UUID (format unchanged)
}
```

**Impact**: Existing pagination cursors become invalid after deployment. Users will be redirected to first page.

## Sorting Behavior

### Transfer Pair Ordering

**Scenario**: User creates transfer from Account A to Account B

**Database Creation** (within single atomic operation):
1. Generate `createdAt`: `2025-12-10T10:30:45.123Z`
2. Create monotonic ULID factory for this operation
3. Generate TRANSFER_OUT transaction:
   - `id`: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
   - `monotonicUlid()` call generates: `01JECK8XQZR3K7P9M5N4YABCDE` (first call)
   - `createdAtSortable`: `2025-12-10T10:30:45.123Z#01JECK8XQZR3K7P9M5N4YABCDE`
4. Generate TRANSFER_IN transaction:
   - `id`: UUID v4 (e.g., `660e8400-e29b-41d4-a716-446655440001`)
   - `monotonicUlid()` call generates: `01JECK8XQZR3K7P9M5N4YABCDF` (second call - slightly larger)
   - `createdAtSortable`: `2025-12-10T10:30:45.123Z#01JECK8XQZR3K7P9M5N4YABCDF`

**Query Result** (descending order, newest first):
```
Position 1: TRANSFER_IN  (larger createdAtSortable due to larger ULID)
Position 2: TRANSFER_OUT (smaller createdAtSortable due to smaller ULID)
```

**Expected User View**: Inbound transaction appears first (most recent activity), then outbound

### General Transaction Ordering

All transactions sorted by `createdAtSortable` in descending order (newest first):
- Primary sort: `createdAt` timestamp (descending)
- Secondary sort: ULID portion of `createdAtSortable` (descending when timestamps match)
- Guarantees deterministic, stable ordering across queries

## Database Schema

### TransactionDbItem Schema

**File**: `backend/src/repositories/utils/Transaction.schema.ts`

```typescript
import { z } from "zod";
import { transactionSchema } from "./Transaction.schema";

// Database item schema extends Transaction schema with createdAtSortable
export const transactionDbItemSchema = transactionSchema.extend({
  createdAtSortable: z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z#[0-9A-HJKMNP-TV-Z]{26}$/,
    "createdAtSortable must be ISO8601#ULID format"
  ),
});

export type TransactionDbItem = z.infer<typeof transactionDbItemSchema>;
```

**Purpose**: Validate that DynamoDB items include `createdAtSortable` field with correct format before transforming to domain model.

## Component Layer Boundaries

### Repository Layer (Internal)
- **Generates**: `id` (UUID v4 - unchanged), `createdAtSortable` (composite with monotonic ULID) - stored in DynamoDB item
- **Validates**: Raw DynamoDB items against `transactionDbItemSchema` (ensures `createdAtSortable` exists and has correct format)
- **Transforms**: `TransactionDbItem` → `Transaction` by explicitly omitting `createdAtSortable`
- **Exposes**: `Transaction` object (WITHOUT `createdAtSortable`)
- **Internal Access**: Reads `createdAtSortable` from validated `TransactionDbItem` for cursor encoding

### Service Layer (Abstraction)
- **Receives**: `Transaction` object from repository (no `createdAtSortable` field)
- **Unaware**: `createdAtSortable` does not exist in Transaction interface
- **Uses**: `id`, `createdAt` for business logic
- **Passes**: Unchanged `Transaction` to resolvers

### GraphQL Layer (API Contract)
- **Schema**: No changes - `createdAtSortable` not in GraphQL schema
- **Returns**: `id` (as String), `createdAt` (as DateTime)
- **Hides**: `createdAtSortable` implementation detail from clients

### Frontend
- **No visibility** into `createdAtSortable`
- **No changes** required

## State Transitions

N/A - This feature adds internal indexing field only; no state machine changes.

## Constraints

1. **Monotonic ULID Generation**: Must use monotonic ULID factory to ensure increasing IDs within same millisecond
2. **Immutability**: `createdAtSortable` computed once at creation, never updated
3. **Atomicity**: Transfer pairs created in single DynamoDB transaction (existing behavior preserved)
4. **Migration**: Must complete before deploying code that uses new index
5. **Repository Boundary**: `createdAtSortable` must not leak to service/resolver/GraphQL layers
6. **ID Format**: Transaction ID remains UUID v4 (no breaking changes)

## Testing Implications

### Repository Tests (Updated)
- Verify UUID v4 generation for transaction `id` (unchanged)
- Verify `createdAtSortable` stored in DynamoDB items (not in Transaction interface)
- Verify `createdAtSortable` format in raw items: `createdAt#ulid`
- Test transfer pair ordering (TRANSFER_IN before TRANSFER_OUT in descending query)
- Test cursor encoding/decoding with `createdAtSortable` from raw DynamoDB items
- Test query using `UserCreatedAtSortableIndex`
- Verify hydrated Transaction objects do NOT contain `createdAtSortable` field

### Service Tests (Unchanged)
- No changes required (service layer completely unaware of `createdAtSortable`)

### Resolver Tests (Unchanged)
- No changes required (GraphQL schema unchanged)

### Migration Tests (New)
- Test migration populates `createdAtSortable` in DynamoDB items
- Test idempotency (running twice is safe)
- Test batch processing with large datasets
