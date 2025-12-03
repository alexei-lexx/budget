# Quickstart: Data Migration Framework

**Feature**: 019-data-migration-framework
**Date**: 2025-12-03

This guide shows how to create and run data migrations in both development and production environments.

## Prerequisites

- Backend development environment running (Docker Compose with DynamoDB Local)
- AWS CLI configured (for production deployments)
- Familiarity with DynamoDB operations

## Table of Contents

1. [Creating a Migration](#creating-a-migration)
2. [Running Migrations Locally](#running-migrations-locally)
3. [Testing Your Migration](#testing-your-migration)
4. [Deploying Migrations to Production](#deploying-migrations-to-production)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

## Creating a Migration

### Step 1: Generate Timestamp

Create a migration filename using the format: `YYYYMMDDHHMMSS-description.ts`

```bash
# Generate current timestamp
date +"%Y%m%d%H%M%S"
# Output: 20231203120000

# Example filename
20231203120000-backfill-category-icons.ts
```

### Step 2: Create Migration File

Create a new file in `backend/src/migrations/`:

```typescript
// backend/src/migrations/20231203120000-backfill-category-icons.ts
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

/**
 * Migration: Add default icon to all categories missing icons
 * Created: 2023-12-03
 *
 * Idempotency: Uses conditional update (attribute_not_exists) to skip
 * categories that already have icons
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.CATEGORIES_TABLE_NAME;
  if (!tableName) {
    throw new Error("CATEGORIES_TABLE_NAME environment variable not set");
  }

  console.log(`Starting migration: backfill-category-icons`);

  // Scan all categories without icons
  const result = await client.send(new ScanCommand({
    TableName: tableName,
    FilterExpression: "attribute_not_exists(icon)"
  }));

  console.log(`Found ${result.Items?.length || 0} categories without icons`);

  // Update each category
  let updated = 0;
  for (const item of result.Items || []) {
    try {
      await client.send(new UpdateItemCommand({
        TableName: tableName,
        Key: { PK: item.PK },
        UpdateExpression: "SET icon = :icon",
        ConditionExpression: "attribute_not_exists(icon)",
        ExpressionAttributeValues: {
          ":icon": { S: "default" }
        }
      }));
      updated++;
    } catch (err: any) {
      // Ignore if icon was added by concurrent operation
      if (err.name !== "ConditionalCheckFailedException") {
        throw err;
      }
    }
  }

  console.log(`Migration complete: Updated ${updated} categories`);
}
```

### Step 3: Register Migration

Add your migration to `backend/src/migrations/index.ts`:

```typescript
// backend/src/migrations/index.ts
export * as migration_20231203120000 from "./20231203120000-example-read";
export * as migration_20231203130000 from "./20231203130000-example-write";
export * as migration_20231203120000 from "./20231203120000-backfill-category-icons"; // ADD THIS LINE
```

**Important**: The export name must match the pattern `migration_YYYYMMDDHHMMSS`.

## Running Migrations Locally

### Step 1: Ensure Backend is Running

```bash
# Start backend with Docker Compose (includes DynamoDB Local)
cd backend
npm run dev
```

### Step 2: Run Migrations

```bash
cd backend
npm run migrate
```

**Expected Output**:
```
Starting migration runner...
Acquiring lock...
Loading migrations...
Found 3 migrations
Checking migration history...

Migration: 20231203120000-example-read (already executed, skipping)
Migration: 20231203130000-example-write (already executed, skipping)
Migration: 20231203120000-backfill-category-icons (executing)
  Starting migration: backfill-category-icons
  Found 15 categories without icons
  Migration complete: Updated 15 categories
  ✓ Completed in 1.2s

Releasing lock...

Summary:
  Total: 3
  Executed: 1
  Skipped: 2
  Failed: 0
  Duration: 1.5s
```

### Step 3: Verify Migration

Query DynamoDB Local to verify changes:

```bash
# Using AWS CLI
aws dynamodb scan \
  --table-name Categories \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

## Testing Your Migration

### Write a Test

Create a test file in `backend/tests/migrations/`:

```typescript
// backend/tests/migrations/backfill-category-icons.test.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { up } from "../../src/migrations/20231203120000-backfill-category-icons";
import { createTestCategory, getCategory } from "../helpers/dynamodb";

describe("Migration: backfill-category-icons", () => {
  let client: DynamoDBClient;

  beforeAll(() => {
    client = new DynamoDBClient({
      endpoint: "http://localhost:8000",
      region: "us-east-1",
      credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" }
    });
  });

  it("should add default icon to categories without icons", async () => {
    // Arrange: Create category without icon
    const categoryId = await createTestCategory(client, { name: "Test", icon: undefined });

    // Act: Run migration
    await up(client);

    // Assert: Category now has default icon
    const category = await getCategory(client, categoryId);
    expect(category.icon).toBe("default");
  });

  it("should be idempotent (safe to run multiple times)", async () => {
    // Arrange: Create category without icon
    const categoryId = await createTestCategory(client, { name: "Test", icon: undefined });

    // Act: Run migration twice
    await up(client);
    await up(client);

    // Assert: Still has default icon (no errors)
    const category = await getCategory(client, categoryId);
    expect(category.icon).toBe("default");
  });

  it("should not overwrite existing icons", async () => {
    // Arrange: Create category with custom icon
    const categoryId = await createTestCategory(client, { name: "Test", icon: "custom" });

    // Act: Run migration
    await up(client);

    // Assert: Custom icon preserved
    const category = await getCategory(client, categoryId);
    expect(category.icon).toBe("custom");
  });
});
```

### Run Tests

```bash
cd backend
npm test -- migrations/backfill-category-icons.test.ts
```

## Deploying Migrations to Production

### Step 1: Commit Changes

```bash
git add backend/src/migrations/20231203120000-backfill-category-icons.ts
git add backend/src/migrations/index.ts
git commit -m "feat: add migration to backfill category icons"
git push origin 019-data-migration-framework
```

### Step 2: Deploy to Production

Run the deployment script from the repository root:

```bash
./deploy.sh
```

**What Happens**:
1. Backend CDK deploys backend stack (includes migration Lambda)
2. Frontend CDK deploys frontend stack
3. `deploy.sh` invokes migration Lambda synchronously
4. Migrations execute in production DynamoDB
5. Deployment completes (or halts if migrations fail)

**Expected Output**:
```
Deploying backend-cdk...
✓ BackendStack deployed

Deploying frontend-cdk...
✓ FrontendStack deployed

Running migrations...
Invoking migration Lambda function...
{
  "statusCode": 200,
  "body": {
    "message": "Migrations completed",
    "executed": 1,
    "skipped": 2,
    "totalDurationMs": 1500
  }
}
✓ Migrations completed successfully

Deployment complete!
```

### Step 3: Verify in Production

Check CloudWatch Logs for migration execution details:

```bash
# View Lambda logs
aws logs tail /aws/lambda/MigrationFunction --follow
```

## Troubleshooting

### Error: "Lock already held"

**Cause**: Another migration execution is in progress, or a stale lock exists from a previous crash.

**Solution**:
1. Wait for concurrent execution to complete (if in progress)
2. If Lambda crashed, manually delete stale lock:

```bash
# Local (development)
aws dynamodb delete-item \
  --table-name Migrations \
  --key '{"PK": {"S": "LOCK"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Production
aws dynamodb delete-item \
  --table-name Migrations \
  --key '{"PK": {"S": "LOCK"}}'
```

### Error: "Migration timeout (15 minutes exceeded)"

**Cause**: Migration is processing too much data.

**Solution**: Split migration into multiple files:

```typescript
// 20231203120000-backfill-batch-1.ts
export async function up(client: DynamoDBClient): Promise<void> {
  // Process items with PK starting with A-M
}

// 20231203120100-backfill-batch-2.ts
export async function up(client: DynamoDBClient): Promise<void> {
  // Process items with PK starting with N-Z
}
```

### Error: "ConditionalCheckFailedException"

**Cause**: Migration attempted to modify data that doesn't meet the condition.

**Solution**: This is expected if migration is idempotent. Catch and ignore:

```typescript
try {
  await client.send(new UpdateItemCommand({ /* ... */ }));
} catch (err: any) {
  if (err.name !== "ConditionalCheckFailedException") {
    throw err; // Re-throw unexpected errors
  }
  // Ignore - item already migrated
}
```

### Rerunning a Completed Migration

**Scenario**: Migration completed but had a bug, need to re-run with fix.

**Solution**: Manually delete the migration record from history table:

```bash
# Local
aws dynamodb delete-item \
  --table-name Migrations \
  --key '{"PK": {"S": "20231203120000"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Then re-run migration
npm run migrate
```

## Best Practices

### 1. Always Write Idempotent Migrations

Use conditional expressions to make migrations safe to retry:

```typescript
// Good: Conditional update
await client.send(new UpdateItemCommand({
  UpdateExpression: "SET newField = :val",
  ConditionExpression: "attribute_not_exists(newField)"
}));

// Bad: Unconditional update (not idempotent)
await client.send(new UpdateItemCommand({
  UpdateExpression: "SET newField = :val"
}));
```

### 2. Log Progress

Add console.log statements for observability:

```typescript
console.log(`Processing ${items.length} items...`);
console.log(`Completed: ${completed}/${total}`);
```

### 3. Handle Large Data Sets

Process in batches to avoid timeouts:

```typescript
const batchSize = 100;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await processBatch(batch);
  console.log(`Processed ${i + batchSize}/${items.length}`);
}
```

### 4. Test Locally First

Always test migrations in local environment before production:

```bash
# 1. Run migration locally
npm run migrate

# 2. Verify changes
# Query DynamoDB Local to check results

# 3. Run migration again (test idempotency)
npm run migrate

# 4. Write automated test
npm test -- migrations/your-migration.test.ts
```

### 5. Use Descriptive Names

Migration filenames should clearly describe the change:

```
✓ Good: 20231203120000-backfill-category-icons.ts
✓ Good: 20231203120000-fix-transaction-currency-format.ts
✗ Bad: 20231203120000-update-data.ts
✗ Bad: 20231203120000-fix.ts
```

### 6. Keep Migrations Small

One logical change per migration:

```
✓ Good: Separate migrations for separate concerns
  - 20231203120000-add-category-icons.ts
  - 20231203120100-add-transaction-tags.ts

✗ Bad: Combined unrelated changes
  - 20231203120000-update-everything.ts
```

### 7. Document Why, Not What

Comments should explain the business reason:

```typescript
/**
 * Migration: Add default icon to categories
 *
 * Why: UI now requires all categories to display an icon.
 *      Categories created before 2023-12-01 lack this field.
 *      This migration backfills the field with a default value.
 */
```

## Next Steps

- Review [data-model.md](data-model.md) for entity schemas
- Review [contracts/](contracts/) for TypeScript interfaces
- Check existing migrations in `backend/src/migrations/` for examples
- Read [research.md](research.md) for architectural decisions

## Support

If you encounter issues not covered in this guide, check:
- CloudWatch Logs for Lambda execution details
- Migration history table (`Migrations`) to see execution status
- Lock record in history table if migrations are blocked
