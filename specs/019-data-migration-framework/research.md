# Research: Data Migration Framework

**Date**: 2025-12-03
**Feature**: 019-data-migration-framework

## Overview

This document captures technical decisions and best practices for implementing a Rails-inspired data migration framework for DynamoDB. All decisions are informed by the detailed clarifications in [spec.md](spec.md).

## 1. Migration Runner Architecture

### Decision: Shared Runner Module Pattern

**Chosen**: Extract core migration logic into `backend/src/migrations/runner.ts` that both npm script and Lambda handler invoke with a DynamoDB client.

**Rationale**:
- Eliminates code duplication between local and production execution
- Enables consistent behavior across environments
- Simplifies testing (test runner once, not twice)
- Follows single responsibility principle

**Implementation Pattern**:
```typescript
// backend/src/migrations/runner.ts
export async function runMigrations(dynamoDbClient: DynamoDBClient): Promise<void> {
  // 1. Acquire lock
  // 2. Load migration list from index.ts
  // 3. Query migration history
  // 4. Execute pending migrations in order
  // 5. Update history after each success
  // 6. Release lock
}

// backend/src/scripts/migrate.ts (npm script)
const client = createLocalDynamoDBClient();
await runMigrations(client);

// backend/src/lambda/migrate.ts (Lambda handler)
const client = new DynamoDBClient({});
await runMigrations(client);
```

**Alternatives Considered**:
- Separate implementations for local and Lambda → Rejected due to duplication risk
- CLI tool package → Rejected as over-engineered for single-project use

## 2. Concurrency Control via DynamoDB Lock

### Decision: Single Lock Record with Conditional Put

**Chosen**: Use `PutItem` with `attribute_not_exists(PK)` condition on a dedicated lock record (PK="LOCK").

**Rationale**:
- DynamoDB guarantees atomic conditional writes
- Simple implementation (one API call to acquire, one to release)
- No external coordination service needed
- Explicit error when lock acquisition fails

**Implementation Pattern**:
```typescript
// Acquire lock
await dynamoDbClient.send(new PutItemCommand({
  TableName: migrationTableName,
  Item: { PK: { S: "LOCK" }, acquiredAt: { S: new Date().toISOString() } },
  ConditionExpression: "attribute_not_exists(PK)"
}));

// Release lock
await dynamoDbClient.send(new DeleteItemCommand({
  TableName: migrationTableName,
  Key: { PK: { S: "LOCK" } }
}));
```

**Edge Case**: If Lambda crashes before releasing lock, stale lock blocks future runs. Resolution: manual deletion by operator (documented in spec).

**Alternatives Considered**:
- TTL-based lock expiration → Rejected: DynamoDB TTL is not precise (delay up to 48 hours)
- Distributed lock service (e.g., DynamoDB Lock Client) → Rejected as over-engineered for this use case

## 3. Migration File Discovery

### Decision: Explicit Import via index.ts

**Chosen**: Maintain `backend/src/migrations/index.ts` that explicitly imports and exports all migration modules. Developers manually add new migrations.

**Rationale**:
- TypeScript compilation requires explicit imports (no dynamic `require()` at runtime)
- Lambda deployment bundles only imported code
- Explicit listing makes migration inventory visible in code
- Forces developer awareness when adding migrations

**Implementation Pattern**:
```typescript
// backend/src/migrations/index.ts
export * as migration_20231203120000 from "./20231203120000-example-read";
export * as migration_20231203130000 from "./20231203130000-example-write";
// Developer adds new line for each migration
```

**Runner Code**:
```typescript
import * as migrations from "./index";

const migrationList = Object.entries(migrations)
  .map(([key, module]) => ({
    timestamp: key.replace("migration_", ""),
    up: module.up
  }))
  .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
```

**Alternatives Considered**:
- Filesystem scanning (`fs.readdir`) → Rejected: doesn't work in Lambda bundle
- Dynamic imports → Rejected: complicates TypeScript compilation
- Glob patterns → Rejected: requires build-time code generation

## 4. Lambda Invocation for Deployment Integration

### Decision: Synchronous RequestResponse Invocation

**Chosen**: `deploy.sh` invokes migration Lambda with `InvocationType: RequestResponse` and waits for completion.

**Rationale**:
- Deployment must block until migrations complete
- Errors propagate to deployment script (halt deployment on failure)
- Simple shell script check: non-zero exit code on Lambda error

**Implementation Pattern**:
```bash
# deploy.sh
echo "Running migrations..."
aws lambda invoke \
  --function-name MigrationFunction \
  --invocation-type RequestResponse \
  --payload '{}' \
  response.json

if [ $? -ne 0 ]; then
  echo "Migration failed, aborting deployment"
  exit 1
fi
```

**Alternatives Considered**:
- Asynchronous Event invocation → Rejected: deployment would complete before migrations run
- Step Functions → Rejected as over-engineered for simple sequential execution

## 5. Migration History Table Schema

### Decision: Minimal Schema with Timestamp PK

**Chosen**: Primary key is timestamp string (e.g., "20231203120000"). Records contain only PK. Existence indicates successful execution.

**Rationale**:
- Simplest possible schema
- DynamoDB query by PK is fast
- No need for additional metadata (execution time, user, etc.)
- Aligns with idempotency check: "Does record exist? Skip migration."

**Table Definition**:
```typescript
const migrationHistoryTable = new Table(this, "MigrationHistory", {
  partitionKey: { name: "PK", type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST
});
```

**Query Pattern**:
```typescript
// Check if migration executed
const result = await dynamoDbClient.send(new GetItemCommand({
  TableName: migrationTableName,
  Key: { PK: { S: timestamp } }
}));
const executed = !!result.Item;
```

**Alternatives Considered**:
- Composite key with environment partition → Rejected: each environment has its own table
- Additional attributes (executedAt, executedBy) → Rejected: not needed for idempotency
- GSI for querying by execution time → Rejected: no query use case exists

## 6. Local DynamoDB Connection

### Decision: Reuse Existing Backend Local Setup

**Chosen**: Migration npm script connects to same DynamoDB Local instance that backend uses for development (Docker Compose).

**Rationale**:
- Zero additional configuration needed
- Consistent connection pattern across backend and migrations
- Developers already running DynamoDB Local for backend development

**Implementation Pattern**:
```typescript
// backend/src/scripts/migrate.ts
const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
  region: "us-east-1", // dummy region for local
  credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" }
});
```

**Alternatives Considered**:
- Separate DynamoDB Local instance for migrations → Rejected: unnecessary complexity
- In-memory database → Rejected: migrations test against real DynamoDB API

## 7. Migration Timeout Handling

### Decision: Document 15-Minute Limit, Manual Splitting

**Chosen**: Enforce 15-minute Lambda timeout as hard constraint. Migrations exceeding limit must be split into multiple files.

**Rationale**:
- Lambda maximum timeout is 15 minutes (AWS limit)
- Splitting migrations is safer than extending timeout (smaller blast radius)
- Forces developers to think about data volume and performance
- Each migration remains independently retryable

**Documentation Pattern**:
```typescript
// Example: Split large migration
// 20231203120000-backfill-categories-batch-1.ts
export async function up(client: DynamoDBClient) {
  // Process items with PK starting with A-M
}

// 20231203120100-backfill-categories-batch-2.ts
export async function up(client: DynamoDBClient) {
  // Process items with PK starting with N-Z
}
```

**Alternatives Considered**:
- Step Functions for longer executions → Rejected: adds complexity for rare case
- Streaming/pagination within migration → Acceptable but not enforced

## 8. Error Handling and Idempotency

### Decision: Fail Fast, Rely on Developer-Written Idempotency

**Chosen**: Runner fails immediately on error and does NOT mark migration as complete. Developers write idempotent migrations for safe retries.

**Rationale**:
- Partial success is worse than clean failure
- Developer knows migration intent better than framework
- Forcing idempotency consideration improves migration quality
- Aligns with database migration best practices (Rails, Flyway)

**Idempotency Patterns** (documented for developers):
```typescript
// Pattern 1: Conditional updates
export async function up(client: DynamoDBClient) {
  await client.send(new UpdateItemCommand({
    Key: { PK: { S: "category-123" } },
    UpdateExpression: "SET newField = :val",
    ConditionExpression: "attribute_not_exists(newField)", // Only if not exists
    ExpressionAttributeValues: { ":val": { S: "value" } }
  }));
}

// Pattern 2: Check before modify
export async function up(client: DynamoDBClient) {
  const item = await getItem(client, "category-123");
  if (item.alreadyMigrated) return; // Skip if already done
  await updateItem(client, "category-123", { alreadyMigrated: true });
}
```

**Alternatives Considered**:
- Automatic transaction rollback → Rejected: DynamoDB transactions limited to 100 items
- Checkpoint/resume within migration → Rejected: too complex for framework to enforce

## 9. Table Name Discovery in Migrations

### Decision: Environment Variables

**Chosen**: Migration code reads table names from environment variables (e.g., `process.env.CATEGORIES_TABLE_NAME`). Runner ensures all table env vars available.

**Rationale**:
- Consistent with existing backend Lambda pattern
- CDK injects table names as environment variables
- No hardcoded table names in migration code
- Works across all environments (dev, staging, prod)

**Implementation Pattern**:
```typescript
// Example migration
export async function up(client: DynamoDBClient) {
  const tableName = process.env.CATEGORIES_TABLE_NAME;
  if (!tableName) throw new Error("CATEGORIES_TABLE_NAME not set");

  await client.send(new ScanCommand({ TableName: tableName }));
}
```

**Alternatives Considered**:
- Pass table names as runner parameters → Rejected: too many parameters for multiple tables
- Centralized config file → Rejected: duplicates CDK table definitions

## 10. Example Migrations

### Decision: Two Safe Examples on Categories Table

**Chosen**: Provide two example migrations demonstrating read and write patterns:
1. Read-only: Count records in Categories table
2. Write (safe): Update with always-false condition to show syntax

**Rationale**:
- Developers learn by example
- Safe examples prevent accidental data modification
- Categories table chosen as safest (less critical than Transactions)

**Example Files**:
```typescript
// 20250101000000-example-count-categories.ts
export async function up(client: DynamoDBClient) {
  const result = await client.send(new ScanCommand({
    TableName: process.env.CATEGORIES_TABLE_NAME,
    Select: "COUNT"
  }));
  console.log(`Categories count: ${result.Count}`);
}

// 20250101000100-example-update-categories.ts
export async function up(client: DynamoDBClient) {
  // Safe: condition is always false
  await client.send(new UpdateItemCommand({
    TableName: process.env.CATEGORIES_TABLE_NAME,
    Key: { PK: { S: "category-never-exists" } },
    UpdateExpression: "SET exampleField = :val",
    ConditionExpression: "PK = :nonexistent",
    ExpressionAttributeValues: {
      ":val": { S: "example" },
      ":nonexistent": { S: "this-will-never-match" }
    }
  })).catch(err => {
    if (err.name === "ConditionalCheckFailedException") {
      console.log("Example: Conditional update pattern (safe)");
    } else throw err;
  });
}
```

## Summary

All technical decisions are finalized based on the comprehensive clarifications in the spec. No additional research needed. Ready to proceed to Phase 1 (Design & Contracts).
