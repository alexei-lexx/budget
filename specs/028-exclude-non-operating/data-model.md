# Data Model: Exclude Categories from Reports

**Branch**: `028-exclude-non-operating` | **Date**: 2026-01-19

## Overview

This document defines the data model changes required to add category exclusion functionality to monthly reports.

---

## 1. Category Entity (Modified)

### TypeScript Interface

**File**: `backend/src/models/category.ts`

```typescript
export interface Category {
  userId: string;              // Partition key (unchanged)
  id: string;                  // Sort key - UUID v4 (unchanged)
  name: string;                // Category name (unchanged)
  type: CategoryType;          // Category type (unchanged)
  excludeFromReports: boolean; // NEW: Whether to exclude from monthly reports
  isArchived: boolean;         // Soft delete flag (unchanged)
  createdAt: string;           // ISO timestamp (unchanged)
  updatedAt: string;           // ISO timestamp (unchanged)
}

export interface CreateCategoryInput {
  userId: string;
  name: string;
  type: CategoryType;
  excludeFromReports: boolean; // NEW: Required at creation
}

export interface UpdateCategoryInput {
  name?: string;
  excludeFromReports?: boolean; // NEW: Optional in updates
}
```

### Validation Rules

**New Field: `excludeFromReports`**:
- Type: Boolean
- Required: Yes (never null, never undefined)
- Default: None (must be explicitly provided)
- Constraints: Must be `true` or `false`
- Migration value: `false` for existing records

### Zod Schema

**File**: `backend/src/repositories/schemas/category.ts`

```typescript
import { z } from "zod";
import type { Category } from "../../models/category";
import { CategoryType } from "../../models/category";

export const categorySchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  name: z.string().min(1),
  type: z.enum(CategoryType),
  excludeFromReports: z.boolean(), // NEW: Required boolean
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Category>;
```

### Database Behavior

**DynamoDB Storage**:
- Field name: `excludeFromReports`
- DynamoDB type: `BOOL`
- Storage cost: Negligible (~1 byte per record)
- Indexing: Not indexed (queried via scan/filter in repository)

**Queries Affected**:
- `findActiveByUserId()` - No change (returns all categories)
- `findActiveByUserIdAndType()` - No change (returns all categories of type)
- `findActiveById()` - No change (returns category with field)
- `create()` - Must include `excludeFromReports` in item
- `update()` - Can modify `excludeFromReports` field

**Repository Layer Impact**:
- No new repository methods needed
- Existing methods automatically handle new field via Zod validation
- Hydration fails if field is missing (after migration runs)

---

## 2. Monthly Report Calculation (Modified Logic)

### MonthlyByCategoryReportService Changes

**File**: `backend/src/services/monthly-by-category-report-service.ts`

**Current Flow**:
```typescript
async generateMonthlyReport(userId, year, month, type) {
  // 1. Fetch all active categories
  const categories = await categoryRepository.findActiveByUserId(userId);

  // 2. Fetch all transactions for month
  const transactions = await transactionRepository.findByUserAndMonth(userId, year, month);

  // 3. Filter transactions by type (INCOME or EXPENSE)
  const filteredTransactions = transactions.filter(t => matchesType(t.type, type));

  // 4. Calculate totals and breakdown
  return buildReport(categories, filteredTransactions);
}
```

**Modified Flow**:
```typescript
async generateMonthlyReport(userId, year, month, type) {
  // 1. Fetch all active categories
  const allCategories = await categoryRepository.findActiveByUserId(userId);

  // 2. NEW: Filter to only included categories
  const includedCategories = allCategories.filter(c => !c.excludeFromReports);

  // 3. Fetch all transactions for month
  const transactions = await transactionRepository.findByUserAndMonth(userId, year, month);

  // 4. Filter transactions by type (INCOME or EXPENSE)
  const typedTransactions = transactions.filter(t => matchesType(t.type, type));

  // 5. NEW: Filter transactions to only included categories
  const includedCategoryIds = new Set(includedCategories.map(c => c.id));
  const reportTransactions = typedTransactions.filter(t =>
    !t.categoryId || includedCategoryIds.has(t.categoryId)
  );

  // 6. Calculate totals and breakdown (using reportTransactions and includedCategories)
  return buildReport(includedCategories, reportTransactions);
}
```

**Key Changes**:
1. Fetch all categories and build included category ID set (where `!excludeFromReports`)
2. Filter transactions to only those in included categories (preserve uncategorized)
3. Pass filtered transactions to `calculateCurrencyTotals()` and `groupByCategoryAndCurrency()`
4. Excluded categories are never fetched or processed in grouping logic

**Edge Cases Handled**:
- Uncategorized transactions (`categoryId === null`): Included in reports (not affected by category exclusion)
- All categories excluded: Report shows zero totals with empty breakdown
- Category exclusion status changes: Takes effect immediately in next report generation

---

## 3. GraphQL Schema Changes

**File**: `backend/src/schema.graphql`

### Type Modifications

```graphql
type Category {
  id: ID!
  name: String!
  type: CategoryType!
  excludeFromReports: Boolean!  # NEW: Required field
}

input CreateCategoryInput {
  name: String!
  type: CategoryType!
  excludeFromReports: Boolean!  # NEW: Required at creation
}

input UpdateCategoryInput {
  name: String
  excludeFromReports: Boolean  # NEW: Optional in updates
}
```

**No resolver signature changes needed:**
- Resolvers already delegate to `CategoryService`
- Service methods accept input objects that now include `excludeFromReports`
- Type generation handles new field automatically

---

## 4. Data Migration

### Migration File

**File**: `backend/src/migrations/YYYYMMDDHHMMSS-add-exclude-from-reports.ts`

```typescript
import { DynamoDBDocumentClient, UpdateCommand, paginateScan } from "@aws-sdk/client-dynamodb";

/**
 * Add excludeFromReports field to all existing categories
 * Sets field to false (included in reports) for all existing records
 * Migration is idempotent - safe to run multiple times
 */
export async function up(client: DynamoDBDocumentClient): Promise<void> {
  const tableName = process.env.CATEGORIES_TABLE_NAME;

  if (!tableName) {
    throw new Error("CATEGORIES_TABLE_NAME environment variable is required");
  }

  console.log(`Starting migration: Add excludeFromReports to categories in ${tableName}`);

  let updatedCount = 0;
  let skippedCount = 0;

  // Scan all items in categories table
  const paginator = paginateScan(
    { client, pageSize: 100 },
    { TableName: tableName }
  );

  for await (const page of paginator) {
    const items = page.Items || [];

    for (const item of items) {
      try {
        // Only update if excludeFromReports doesn't exist
        await client.send(new UpdateCommand({
          TableName: tableName,
          Key: {
            userId: item.userId,
            id: item.id,
          },
          UpdateExpression: "SET excludeFromReports = :value",
          ExpressionAttributeValues: {
            ":value": false, // Default to included in reports
          },
          ConditionExpression: "attribute_not_exists(excludeFromReports)",
        }));

        updatedCount++;
      } catch (error: any) {
        // ConditionalCheckFailedException means field already exists - skip
        if (error.name === "ConditionalCheckFailedException") {
          skippedCount++;
        } else {
          console.error(`Error updating category ${item.id}:`, error);
          throw error;
        }
      }
    }
  }

  console.log(`Migration complete: Updated ${updatedCount} categories, skipped ${skippedCount} (already had field)`);
}
```

**Migration Strategy**:
- **Timing**: Run before deploying new code (as part of deployment pipeline)
- **Direction**: Up migration only (no down migration - field becomes permanent)
- **Default value**: `false` (categories are included in reports by default)
- **Idempotency**: Uses `attribute_not_exists()` condition to skip records that already have the field
- **Error handling**: Throws on unexpected errors, logs and continues on conditional check failures

**Local Testing**:
```bash
cd backend
npm run migrate  # Runs all pending migrations against local DynamoDB
```

**Production Deployment**:
- Migration runs automatically via Lambda during CDK deployment
- Logs visible in CloudWatch

---

## 5. Repository Layer

### CategoryRepository (No Changes Required)

**File**: `backend/src/repositories/category-repository.ts`

**Analysis**: No code changes needed in repository methods because:
1. DynamoDB is schemaless - new field automatically included in reads/writes
2. `create()` method already spreads input object into item
3. `update()` method uses `UpdateExpression` with dynamic attributes
4. Zod schema validation at hydration boundary catches missing field

**Verification Points**:
- `create()`: Input now includes `excludeFromReports`, automatically written to DynamoDB
- `update()`: Input may include `excludeFromReports`, handled by existing update logic
- `findActiveByUserId()`: Returns categories with new field, validated by Zod
- `findActiveById()`: Returns category with new field, validated by Zod

---

## 6. Service Layer

### CategoryService (Minimal Changes)

**File**: `backend/src/services/category-service.ts`

**Analysis**: Minimal to no business logic changes needed because:
1. Field is a simple boolean attribute with no complex validation
2. No cross-entity dependencies or orchestration required
3. GraphQL + Zod handle type validation automatically

**Potential Addition** (if validation needed):
```typescript
// In CategoryService class (optional - only if business rule added)
private validateExcludeFromReports(excludeFromReports: boolean): void {
  // Currently no validation needed - boolean is self-validating
  // Placeholder for future business rules if needed
}
```

**Current Methods Affected**:
- `createCategory()`: Input now includes `excludeFromReports`, passed to repository
- `updateCategory()`: Input may include `excludeFromReports`, passed to repository

**No new service methods required.**

---

## 7. Resolver Layer

### CategoryResolvers (No Changes Required)

**File**: `backend/src/resolvers/category-resolvers.ts`

**Analysis**: No code changes needed because:
1. Resolvers already delegate to `CategoryService`
2. Service methods accept input objects that now include `excludeFromReports`
3. GraphQL type generation handles new field automatically
4. Type safety enforced by generated types from codegen

**Verification Points**:
- `createCategory` mutation: Generated types include `excludeFromReports` in input
- `updateCategory` mutation: Generated types include optional `excludeFromReports`
- `categories` query: Returns categories with new field

---

## 8. Frontend Changes

### Generated Types

**Files**: `frontend/src/__generated__/vue-apollo.ts` (auto-generated)

**Changes**: After running `npm run codegen` in frontend:
- `Category` type includes `excludeFromReports: boolean`
- `CreateCategoryInput` includes `excludeFromReports: boolean`
- `UpdateCategoryInput` includes `excludeFromReports?: boolean`

### Composables

**File**: `frontend/src/composables/useCategories.ts`

**Minimal changes expected:**
- Types automatically updated via codegen
- May need to update mutation calls to include `excludeFromReports` parameter
- No breaking changes to existing API

### UI Components

**Changes required** (manual implementation, not in data model scope):
- Add toggle switch to category create/edit dialog
- Bind to `excludeFromReports` field in form model
- Add help text explaining feature
- Handle required validation (must be explicitly set)

---

## Testing Strategy

### Backend Tests Required

**File**: `backend/src/repositories/category-repository.test.ts`
- Test `create()` includes `excludeFromReports` field
- Test `update()` modifies `excludeFromReports` field
- Test hydration validates `excludeFromReports` presence

**File**: `backend/src/services/category-service.test.ts`
- Test `createCategory()` passes `excludeFromReports` to repository
- Test `updateCategory()` passes `excludeFromReports` to repository

**File**: `backend/src/services/monthly-by-category-report-service.test.ts`
- Test report excludes categories where `excludeFromReports === true`
- Test report includes categories where `excludeFromReports === false`
- Test edge case: all categories excluded

**File**: `backend/src/migrations/YYYYMMDDHHMMSS-add-exclude-from-reports.test.ts`
- Test migration sets field to `false` on existing records
- Test migration is idempotent (doesn't overwrite existing values)

### Frontend Testing

**Manual testing only** (per constitution):
- Create category with exclusion flag enabled
- Edit category to toggle exclusion flag
- Verify monthly report reflects exclusions correctly

---

## Summary

**Entities Modified:**
1. ✅ Category - Add `excludeFromReports: boolean` field
2. ✅ MonthlyByCategoryReportService - Filter excluded categories

**New Files:**
1. ✅ Migration: `YYYYMMDDHHMMSS-add-exclude-from-reports.ts`

**Code Changes:**
- GraphQL schema: Add field to `Category` type and inputs
- TypeScript interfaces: Add field to `Category`, `CreateCategoryInput`, `UpdateCategoryInput`
- Zod schema: Add field validation
- Report service: Filter logic for excluded categories
- Migration: Set field on existing records

**Testing:**
- Repository tests for CRUD with new field
- Service tests for passing field correctly
- Report service tests for filtering logic
- Migration test for idempotency

**No breaking changes:** Existing API consumers continue to work after migration runs.
