# Quickstart: Transfer Transaction Sort Order Fix

**Feature**: 018-fix-transfer-sort
**Branch**: `018-fix-transfer-sort`
**Complexity**: Medium (database index change + migration)

## What This Feature Does

Fixes the ordering of transfer transaction pairs in the transactions list. Currently, transfer transactions appear in unpredictable order when they have identical creation timestamps. After this fix, paired transfers will consistently appear with inbound transactions before outbound transactions (when sorted newest-first).

**User-Facing Impact**: When viewing the transactions page, transfer pairs will display in correct order (TRANSFER_IN before TRANSFER_OUT), making it clearer that money flows from source to destination account.

**Key Difference from Original Approach**: Transaction IDs remain UUID v4 (no breaking changes). A separate `createdAtSortable` field using monotonic ULID provides deterministic ordering without changing transaction identifiers.

## Key Implementation Points

### 1. Keep UUID for Transaction ID (No Changes)

**File**: `backend/src/repositories/TransactionRepository.ts`

**No changes to ID generation**:
```typescript
// Remains unchanged
import { randomUUID } from "crypto";
id: randomUUID()
```

**Why**: Preserves transaction ID format, avoids breaking changes, simpler rollback.

### 2. Add createdAtSortable to DynamoDB Items (NOT Transaction Interface)

**File**: `backend/src/models/Transaction.ts`

**NO CHANGES** - Transaction interface stays the same:
```typescript
export interface Transaction {
  // ... existing fields (id, createdAt, etc.)
  // NO createdAtSortable here - it's database-only
}
```

**File**: `backend/src/repositories/TransactionRepository.ts`

**Add monotonic ULID factory at module level**:
```typescript
import { monotonicFactory } from "ulidx";

// Create factory instance once at module level
const ulid = monotonicFactory();
```

**Add createdAtSortable to DynamoDB items only**:
```typescript
private buildTransaction(input: CreateTransactionInput, timestamp: string): Transaction {
  const id = randomUUID(); // Keep UUID for ID
  const transaction: Transaction = {
    id,
    userId: input.userId,
    // ... other fields
    createdAt: timestamp,
    updatedAt: timestamp,
    // NO createdAtSortable in Transaction object
  };

  return transaction;
}

// Create DynamoDB item with createdAtSortable
async create(input: CreateTransactionInput): Promise<Transaction> {
  const now = new Date().toISOString();
  const transaction = this.buildTransaction(input, now);

  // Add createdAtSortable when storing in DynamoDB
  const dynamoItem = {
    ...transaction,
    createdAtSortable: `${transaction.createdAt}#${ulid()}`, // Database-only field
  };

  const command = new PutCommand({
    TableName: this.tableName,
    Item: dynamoItem,
  });

  await this.client.send(command);
  return transaction; // Return WITHOUT createdAtSortable
}

// Same pattern for createMany - add createdAtSortable to each item
async createMany(inputs: CreateTransactionInput[]): Promise<Transaction[]> {
  const now = new Date().toISOString();
  const transactions = inputs.map(input => this.buildTransaction(input, now));

  const transactItems = transactions.map(transaction => ({
    Put: {
      TableName: this.tableName,
      Item: {
        ...transaction,
        createdAtSortable: `${transaction.createdAt}#${ulid()}`, // Add to DB item
      },
    },
  }));

  await this.client.send(new TransactWriteCommand({ TransactItems: transactItems }));
  return transactions; // Return WITHOUT createdAtSortable
}
```

**Why**:
- `createdAtSortable` is an indexing optimization, not a domain concept
- Keeps Transaction interface clean and aligned with GraphQL schema
- Repository adds it during storage, strips it during hydration
- Monotonic ULID factory ensures increasing values within same millisecond

### 3. Replace DynamoDB Index

**File**: `backend/src/scripts/create-tables.ts`

**Remove**:
```typescript
{
  IndexName: "UserCreatedAtIndex",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH" },
    { AttributeName: "createdAt", KeyType: "RANGE" },
  ],
  Projection: { ProjectionType: "ALL" },
}
```

**Add**:
```typescript
{
  IndexName: "UserCreatedAtSortableIndex",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH" },
    { AttributeName: "createdAtSortable", KeyType: "RANGE" },
  ],
  Projection: { ProjectionType: "ALL" },
}
```

**Also update** `AttributeDefinitions`:
```typescript
// Remove
{ AttributeName: "createdAt", AttributeType: "S" }

// Add
{ AttributeName: "createdAtSortable", AttributeType: "S" }
```

**Why**: New index sorts by composite key instead of timestamp alone.

### 4. Update Repository Queries

**File**: `backend/src/repositories/TransactionRepository.ts`

**Changes**:
1. Update index name constant:
   ```typescript
   const USER_CREATED_AT_SORTABLE_INDEX = "UserCreatedAtSortableIndex"; // Changed from UserCreatedAtIndex
   ```

2. Update cursor structure:
   ```typescript
   interface CursorData {
     createdAtSortable: string; // Changed from createdAt
     date: string;
     id: string;
   }
   ```

3. Update `encodeCursor` to read from raw DynamoDB items:
   ```typescript
   // Cursor encoding must happen BEFORE hydration to access createdAtSortable
   function encodeCursor(rawItem: Record<string, unknown>): string {
     const cursorData: CursorData = {
       createdAtSortable: rawItem.createdAtSortable as string, // Read from raw DB item
       date: rawItem.date as string,
       id: rawItem.id as string,
     };
     return Buffer.from(JSON.stringify(cursorData)).toString("base64");
   }

   // In findActiveByUserId, encode cursors BEFORE hydration:
   const rawItems = /* raw DynamoDB query results */;
   const edges = rawItems.map((rawItem) => ({
     node: hydrate(transactionSchema, rawItem), // Strips createdAtSortable
     cursor: encodeCursor(rawItem), // Accesses createdAtSortable before hydration
   }));
   ```

4. Update pagination `ExclusiveStartKey`:
   ```typescript
   ExclusiveStartKey: {
     userId: userId,
     id: decodedAfter.id,
     createdAtSortable: decodedAfter.createdAtSortable, // Changed from createdAt
   }
   ```

5. Update all queries using the index:
   ```typescript
   // In findActiveByUserId, findActiveByDescription, detectPatterns
   IndexName: USER_CREATED_AT_SORTABLE_INDEX, // Changed from USER_CREATED_AT_INDEX
   ```

### 5. Add Database Item Schema for Validation

**File**: `backend/src/repositories/utils/Transaction.schema.ts`

**ADD transactionDbItemSchema**:
```typescript
import { z } from "zod";

// Existing transactionSchema remains unchanged
export const transactionSchema = z.object({
  userId: z.string(),
  id: z.string().uuid(),
  accountId: z.string(),
  // ... all other Transaction fields
});

export type Transaction = z.infer<typeof transactionSchema>;

// NEW: Database item schema extends Transaction schema with createdAtSortable
export const transactionDbItemSchema = transactionSchema.extend({
  createdAtSortable: z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z#[0-9A-HJKMNP-TV-Z]{26}$/,
    "createdAtSortable must be ISO8601#ULID format"
  ),
});

export type TransactionDbItem = z.infer<typeof transactionDbItemSchema>;
```

**Why**:
- Validates that DynamoDB items include `createdAtSortable` with correct format
- Ensures hydration fails if field is missing or malformed
- Keeps Transaction interface and schema clean (domain model unchanged)
- Repository validates with `transactionDbItemSchema`, then transforms to `Transaction`

### 5b. Update Repository to Use Database Item Schema

**File**: `backend/src/repositories/TransactionRepository.ts`

**Transform from DbItem to Transaction**:
```typescript
import { transactionDbItemSchema, TransactionDbItem } from "./utils/Transaction.schema";

// In query methods (e.g., findActiveByUserId):
async findActiveByUserId(userId: string, filters, after?, first = 20) {
  // ... DynamoDB query ...

  const rawItems = result.Items || [];

  // Validate raw items against database schema (includes createdAtSortable)
  const dbItems = rawItems.map(item => hydrate(transactionDbItemSchema, item));

  // Create edges with cursors (before transforming to Transaction)
  const edges = dbItems.map((dbItem) => ({
    cursor: encodeCursor(dbItem), // Uses createdAtSortable from dbItem
    node: toTransaction(dbItem),   // Transform to Transaction (omits createdAtSortable)
  }));

  // ...
}

// Helper to transform TransactionDbItem -> Transaction
function toTransaction(dbItem: TransactionDbItem): Transaction {
  const { createdAtSortable, ...transaction } = dbItem;
  return transaction as Transaction;
}

// Update encodeCursor to accept TransactionDbItem
function encodeCursor(dbItem: TransactionDbItem): string {
  const cursorData: CursorData = {
    createdAtSortable: dbItem.createdAtSortable, // Now type-safe
    date: dbItem.date,
    id: dbItem.id,
  };
  return Buffer.from(JSON.stringify(cursorData)).toString("base64");
}
```

**Why**:
- Validates `createdAtSortable` exists and has correct format during hydration
- Accesses `createdAtSortable` from typed `TransactionDbItem` (type-safe)
- Explicitly transforms to `Transaction` by omitting `createdAtSortable`
- Clean separation between database model and domain model

### 6. Update CDK Stack

**File**: `backend-cdk/lib/backend-cdk-stack.ts`

**Changes**: Same as infrastructure changes in step 3:
- Remove `createdAt` from attribute definitions
- Add `createdAtSortable` attribute definition
- Replace `UserCreatedAtIndex` with `UserCreatedAtSortableIndex`

### 7. Create Migration

**File**: `backend/src/migrations/20251210HHMMSS-populate-createdAtSortable.ts`

**Implementation**:
```typescript
import { DynamoDBDocumentClient, ScanCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { monotonicFactory } from "ulidx";

const BATCH_SIZE = 25; // DynamoDB TransactWrite limit

export async function up(client: DynamoDBDocumentClient): Promise<void> {
  const tableName = process.env.TRANSACTIONS_TABLE_NAME;
  const ulid = monotonicFactory(); // Create factory for migration

  console.log("Starting migration: populate createdAtSortable for transactions");

  let scannedCount = 0;
  let updatedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    // Scan transactions
    const scanResult = await client.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    const items = scanResult.Items || [];
    scannedCount += items.length;

    // Filter items that need createdAtSortable populated
    const itemsToUpdate = items.filter(item => !item.createdAtSortable);

    // Process in batches
    for (let i = 0; i < itemsToUpdate.length; i += BATCH_SIZE) {
      const batch = itemsToUpdate.slice(i, i + BATCH_SIZE);

      const transactItems = batch.map(item => ({
        Update: {
          TableName: tableName,
          Key: { userId: item.userId, id: item.id },
          UpdateExpression: "SET createdAtSortable = :createdAtSortable",
          ExpressionAttributeValues: {
            ":createdAtSortable": `${item.createdAt}#${ulid()}`,
          },
        },
      }));

      await client.send(new TransactWriteCommand({ TransactItems: transactItems }));
      updatedCount += batch.length;
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Migration complete: scanned ${scannedCount}, updated ${updatedCount} transactions`);
}
```

**Why**: Existing transactions need `createdAtSortable` field populated before the new index can work correctly.

**Note**: Migration uses fresh ULIDs for existing transactions (not temporally related to original creation). Only new transactions created after deployment have true temporal ULID ordering.

## Testing Approach

### Local Development

1. **Install dependencies**:
   ```bash
   cd backend
   npm install ulidx
   ```

2. **Recreate local tables**:
   ```bash
   npm run db:recreate
   ```

3. **Run migration**:
   ```bash
   npm run migrate
   ```

4. **Test transfer creation**:
   - Create a transfer via GraphQL mutation
   - Query transactions list
   - Verify TRANSFER_IN appears before TRANSFER_OUT

5. **Run repository tests**:
   ```bash
   npm test -- TransactionRepository.test.ts
   ```

### Repository Test Cases

**Update existing tests**:
- Verify `id` is UUID v4 format (unchanged)
- Verify returned Transaction objects do NOT have `createdAtSortable` field
- Verify DynamoDB items DO have `createdAtSortable` field (query raw items to check)

**Add new test**:
```typescript
it("should return transfer transactions in correct order (TRANSFER_IN before TRANSFER_OUT)", async () => {
  const now = new Date().toISOString();

  // Create paired transfer transactions
  const transfers = await repository.createMany([
    {
      userId: "user1",
      accountId: "acc1",
      type: TransactionType.TRANSFER_OUT,
      amount: 100,
      currency: "USD",
      date: "2025-12-10",
      transferId: "transfer1",
    },
    {
      userId: "user1",
      accountId: "acc2",
      type: TransactionType.TRANSFER_IN,
      amount: 100,
      currency: "USD",
      date: "2025-12-10",
      transferId: "transfer1",
    },
  ]);

  // Query transactions (descending order - newest first)
  const result = await repository.findActiveByUserId("user1");

  // Verify TRANSFER_IN appears first
  expect(result.edges[0].node.type).toBe(TransactionType.TRANSFER_IN);
  expect(result.edges[1].node.type).toBe(TransactionType.TRANSFER_OUT);
});
```

## Deployment Steps

### 1. Backend CDK (Infrastructure)
```bash
cd backend-cdk
npm run deploy
```

**Effect**:
- Removes `UserCreatedAtIndex`
- Creates `UserCreatedAtSortableIndex`
- Updates table attribute definitions

### 2. Run Migration
```bash
# Production migration runs automatically via Lambda during deployment
```

**Effect**: Populates `createdAtSortable` for all existing transactions

### 3. Backend Code
```bash
cd backend
# Code deployed via deployment script or CI/CD
```

**Effect**: Repository starts using new index

## Rollback Plan

If issues arise after deployment:

1. **Revert backend code**: Deploy previous version that uses `UserCreatedAtIndex`
2. **Revert CDK stack**: Restore `UserCreatedAtIndex`, remove `UserCreatedAtSortableIndex`
3. **Note**: `createdAtSortable` field can remain in database (ignored by old code)

## Common Issues

### Issue: "Index UserCreatedAtSortableIndex not found"
**Cause**: CDK deployment not complete
**Fix**: Ensure backend-cdk deployment finishes before deploying backend code

### Issue: Transactions missing createdAtSortable
**Cause**: Migration not run or incomplete
**Fix**: Re-run migration (idempotent, safe to run multiple times)

### Issue: Old pagination cursors fail
**Cause**: Cursor format changed
**Expected**: Users automatically redirected to first page (acceptable UX)

## No API Changes Required

**GraphQL Schema**: No changes
**Transaction Model Interface**: No changes (createdAtSortable NOT added to interface)
**Transaction Schema**: Unchanged (domain model validation)
**Database Item Schema**: NEW - `transactionDbItemSchema` validates DynamoDB items (includes createdAtSortable)
**Service Layer**: No changes (completely unaware of createdAtSortable)
**Resolvers**: No changes
**Frontend**: No changes

The `createdAtSortable` field exists only in DynamoDB items and the `TransactionDbItem` type. It's validated during hydration via `transactionDbItemSchema`, then explicitly omitted when transforming to `Transaction`. Repository code uses `TransactionDbItem` internally for validation and cursor encoding, but exposes only `Transaction` objects to upper layers.

## Key Differences from ULID-as-ID Approach

1. **Transaction IDs unchanged**: Remain UUID v4, no breaking changes
2. **Clearer separation**: ID for identity, sortable for ordering
3. **Less invasive**: Only repository and infrastructure changes
4. **Simpler rollback**: Remove index, revert repository code
5. **Same sorting benefit**: Monotonic ULID ensures deterministic order within same timestamp
