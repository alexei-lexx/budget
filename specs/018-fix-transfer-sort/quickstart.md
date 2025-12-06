# Quickstart: Transfer Transaction Sort Order Fix

**Feature**: 018-fix-transfer-sort
**Branch**: `018-fix-transfer-sort`
**Complexity**: Medium (database index change + migration)

## What This Feature Does

Fixes the ordering of transfer transaction pairs in the transactions list. Currently, transfer transactions appear in unpredictable order when they have identical creation timestamps. After this fix, paired transfers will consistently appear with inbound transactions before outbound transactions (when sorted newest-first).

**User-Facing Impact**: When viewing the transactions page, transfer pairs will display in correct order (TRANSFER_IN before TRANSFER_OUT), making it clearer that money flows from source to destination account.

## Key Implementation Points

### 1. Switch ID Generation from UUID to ULID

**File**: `backend/src/repositories/TransactionRepository.ts`

**Change**:
```typescript
// Before
import { randomUUID } from "crypto";
id: randomUUID()

// After
import { ulid } from "ulidx";
id: ulid()
```

**Why**: ULIDs are lexicographically sortable by creation time. When transfer transactions are created in the same millisecond, the ULID generator ensures the second ID is greater than the first.

### 2. Add createdAtId to DynamoDB Items (NOT Transaction Interface)

**File**: `backend/src/models/Transaction.ts`

**NO CHANGES** - Transaction interface stays the same:
```typescript
export interface Transaction {
  // ... existing fields (id, createdAt, etc.)
  // NO createdAtId here - it's database-only
}
```

**File**: `backend/src/repositories/TransactionRepository.ts`

**Add createdAtId to DynamoDB items only**:
```typescript
private buildTransaction(input: CreateTransactionInput, timestamp: string): Transaction {
  const id = ulid();
  const transaction: Transaction = {
    id,
    userId: input.userId,
    // ... other fields
    createdAt: timestamp,
    updatedAt: timestamp,
    // NO createdAtId in Transaction object
  };

  return transaction;
}

// Create DynamoDB item with createdAtId
async create(input: CreateTransactionInput): Promise<Transaction> {
  const now = new Date().toISOString();
  const transaction = this.buildTransaction(input, now);

  // Add createdAtId when storing in DynamoDB
  const dynamoItem = {
    ...transaction,
    createdAtId: `${transaction.createdAt}#${transaction.id}`, // Database-only field
  };

  const command = new PutCommand({
    TableName: this.tableName,
    Item: dynamoItem,
  });

  await this.client.send(command);
  return transaction; // Return WITHOUT createdAtId
}

// Same pattern for createMany - add createdAtId to each item
async createMany(inputs: CreateTransactionInput[]): Promise<Transaction[]> {
  const now = new Date().toISOString();
  const transactions = inputs.map(input => this.buildTransaction(input, now));

  const transactItems = transactions.map(transaction => ({
    Put: {
      TableName: this.tableName,
      Item: {
        ...transaction,
        createdAtId: `${transaction.createdAt}#${transaction.id}`, // Add to DB item
      },
    },
  }));

  await this.client.send(new TransactWriteCommand({ TransactItems: transactItems }));
  return transactions; // Return WITHOUT createdAtId
}
```

**Why**:
- `createdAtId` is an indexing optimization, not a domain concept
- Keeps Transaction interface clean and aligned with GraphQL schema
- Repository adds it during storage, strips it during hydration

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
  IndexName: "UserCreatedAtIdIndex",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH" },
    { AttributeName: "createdAtId", KeyType: "RANGE" },
  ],
  Projection: { ProjectionType: "ALL" },
}
```

**Also update** `AttributeDefinitions`:
```typescript
// Remove
{ AttributeName: "createdAt", AttributeType: "S" }

// Add
{ AttributeName: "createdAtId", AttributeType: "S" }
```

**Why**: New index sorts by composite key instead of timestamp alone.

### 4. Update Repository Queries

**File**: `backend/src/repositories/TransactionRepository.ts`

**Changes**:
1. Update index name constant:
   ```typescript
   const USER_CREATED_AT_ID_INDEX = "UserCreatedAtIdIndex"; // Changed from UserCreatedAtIndex
   ```

2. Update cursor structure:
   ```typescript
   interface CursorData {
     createdAtId: string; // Changed from createdAt
     date: string;
     id: string;
   }
   ```

3. Update `encodeCursor` to read from raw DynamoDB items:
   ```typescript
   // Cursor encoding must happen BEFORE hydration to access createdAtId
   function encodeCursor(rawItem: Record<string, unknown>): string {
     const cursorData: CursorData = {
       createdAtId: rawItem.createdAtId as string, // Read from raw DB item
       date: rawItem.date as string,
       id: rawItem.id as string,
     };
     return Buffer.from(JSON.stringify(cursorData)).toString("base64");
   }

   // In findActiveByUserId, encode cursors BEFORE hydration:
   const rawItems = /* raw DynamoDB query results */;
   const edges = rawItems.map((rawItem) => ({
     node: hydrate(transactionSchema, rawItem), // Strips createdAtId
     cursor: encodeCursor(rawItem), // Accesses createdAtId before hydration
   }));
   ```

4. Update pagination `ExclusiveStartKey`:
   ```typescript
   ExclusiveStartKey: {
     userId: userId,
     id: decodedAfter.id,
     createdAtId: decodedAfter.createdAtId, // Changed from createdAt
   }
   ```

5. Update all queries using the index:
   ```typescript
   // In findActiveByUserId, findActiveByDescription, detectPatterns
   IndexName: USER_CREATED_AT_ID_INDEX, // Changed from USER_CREATED_AT_INDEX
   ```

### 5. NO Changes to Validation Schema

**File**: `backend/src/repositories/utils/Transaction.schema.ts`

**NO CHANGES NEEDED**:
```typescript
// Transaction schema validates the Transaction interface
// Since createdAtId is NOT in the interface, it's NOT in the schema
// The schema correctly strips createdAtId during hydration
```

**Why**: The hydration process uses the Zod schema to validate and transform raw DynamoDB items into Transaction objects. Since `createdAtId` is not in the Transaction interface or schema, it gets automatically stripped during hydration - which is exactly what we want.

### 6. Create Migration

**File**: `backend/src/migrations/20251206HHMMSS-populate-createdAtId.ts`

**Implementation**:
```typescript
import { DynamoDBDocumentClient, ScanCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const BATCH_SIZE = 25; // DynamoDB TransactWrite limit

export async function up(client: DynamoDBDocumentClient): Promise<void> {
  const tableName = process.env.TRANSACTIONS_TABLE_NAME;

  console.log("Starting migration: populate createdAtId for transactions");

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

    // Filter items that need createdAtId populated
    const itemsToUpdate = items.filter(item => !item.createdAtId);

    // Process in batches
    for (let i = 0; i < itemsToUpdate.length; i += BATCH_SIZE) {
      const batch = itemsToUpdate.slice(i, i + BATCH_SIZE);

      const transactItems = batch.map(item => ({
        Update: {
          TableName: tableName,
          Key: { userId: item.userId, id: item.id },
          UpdateExpression: "SET createdAtId = :createdAtId",
          ExpressionAttributeValues: {
            ":createdAtId": `${item.createdAt}#${item.id}`,
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

**Why**: Existing transactions need `createdAtId` field populated before the new index can work correctly.

### 7. Update CDK Stack

**File**: `backend-cdk/lib/backend-cdk-stack.ts`

**Changes**: Same as step 3, but in CDK format:
- Remove `createdAt` from attribute definitions
- Add `createdAtId` attribute definition
- Replace `UserCreatedAtIndex` with `UserCreatedAtIdIndex`

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
- Verify `id` is ULID format (26 characters)
- Verify returned Transaction objects do NOT have `createdAtId` field
- Verify DynamoDB items DO have `createdAtId` field (query raw items to check)

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
      date: "2025-12-06",
      transferId: "transfer1",
    },
    {
      userId: "user1",
      accountId: "acc2",
      type: TransactionType.TRANSFER_IN,
      amount: 100,
      currency: "USD",
      date: "2025-12-06",
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
- Creates `UserCreatedAtIdIndex`
- Updates table attribute definitions

### 2. Run Migration
```bash
# Production migration runs automatically via Lambda during deployment
```

**Effect**: Populates `createdAtId` for all existing transactions

### 3. Backend Code
```bash
cd backend
# Code deployed via deployment script or CI/CD
```

**Effect**: Repository starts using new index

## Rollback Plan

If issues arise after deployment:

1. **Revert backend code**: Deploy previous version that uses `UserCreatedAtIndex`
2. **Revert CDK stack**: Restore `UserCreatedAtIndex`, remove `UserCreatedAtIdIndex`
3. **Note**: `createdAtId` field can remain in database (ignored by old code)

## Common Issues

### Issue: "Index UserCreatedAtIdIndex not found"
**Cause**: CDK deployment not complete
**Fix**: Ensure backend-cdk deployment finishes before deploying backend code

### Issue: Transactions missing createdAtId
**Cause**: Migration not run or incomplete
**Fix**: Re-run migration (idempotent, safe to run multiple times)

### Issue: Old pagination cursors fail
**Cause**: Cursor format changed
**Expected**: Users automatically redirected to first page (acceptable UX)

## No API Changes Required

**GraphQL Schema**: No changes
**Transaction Model Interface**: No changes (createdAtId NOT added to interface)
**Service Layer**: No changes (completely unaware of createdAtId)
**Resolvers**: No changes
**Frontend**: No changes

The `createdAtId` field exists only in DynamoDB items. It's added during storage and stripped during hydration. Repository code accesses it from raw DynamoDB items for indexing and pagination, but it never appears in the Transaction interface or any layer above the repository.
