# Research: Exclude Categories from Reports

**Branch**: `028-exclude-non-operating` | **Date**: 2026-01-19

## Research Overview

This document resolves technical unknowns and establishes implementation patterns for adding an "Exclude from reports" flag to categories.

---

## Research Topic 1: GraphQL Schema Field Design

### Decision

Add `excludeFromReports: Boolean!` field to the `Category` GraphQL type with **required non-nullable** semantics. The field must be explicitly provided during creation and updates.

**Schema Change**:
```graphql
type Category {
  id: ID!
  name: String!
  type: CategoryType!
  excludeFromReports: Boolean!  # NEW: Required, non-nullable
}

input CreateCategoryInput {
  name: String!
  type: CategoryType!
  excludeFromReports: Boolean!  # NEW: Required in creation
}

input UpdateCategoryInput {
  name: String
  excludeFromReports: Boolean  # Optional in updates (can toggle)
}
```

### Rationale

**Required Field (no default):**
- User requirement: "make it required in graphql and services, and migrate existing records in database, no defaults"
- Forces explicit decision at category creation time
- Prevents ambiguity about whether a category should be included in reports
- Migration will set explicit values on existing records

**Boolean Type:**
- Simple binary choice (include or exclude)
- No need for enum or string type
- Follows DynamoDB best practice (BOOL type native support)

**Update Input Optional:**
- Allows toggling exclusion status via `updateCategory` mutation
- Matches pattern in `UpdateCategoryInput` where fields are optional

### Alternatives Considered

**Option: Optional field with default `false`** → Rejected per user requirement "no defaults"

**Option: Enum type** → Rejected as overkill for binary decision

---

## Research Topic 2: Database Schema and Migration Strategy

### Decision

**TypeScript Interface Change** (`backend/src/models/category.ts`):
```typescript
export interface Category {
  userId: string;
  id: string;
  name: string;
  type: CategoryType;
  excludeFromReports: boolean;  // NEW: Required, never null
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  userId: string;
  name: string;
  type: CategoryType;
  excludeFromReports: boolean;  // NEW: Required at creation
}

export interface UpdateCategoryInput {
  name?: string;
  excludeFromReports?: boolean;  // NEW: Optional in updates
}
```

**Zod Schema Change** (`backend/src/repositories/schemas/category.ts`):
```typescript
export const categorySchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  name: z.string().min(1),
  type: z.enum(CategoryType),
  excludeFromReports: z.boolean(),  // NEW: Required, never undefined
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Category>;
```

**Migration Strategy**:
- Create migration file: `backend/src/migrations/YYYYMMDDHHMMSS-add-exclude-from-reports.ts`
- Scan all existing categories in DynamoDB
- Set `excludeFromReports: false` on all existing records (default to "included in reports")
- Migration must be idempotent (safe to run multiple times)
- Use `UpdateCommand` with conditional expression to avoid overwriting if field already exists

**Migration Implementation Pattern**:
```typescript
import { DynamoDBClient, paginateScan } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export async function up(client: DynamoDBDocumentClient) {
  const tableName = process.env.CATEGORIES_TABLE_NAME;

  // Scan all categories
  const paginator = paginateScan({
    client,
    pageSize: 100,
  }, {
    TableName: tableName,
  });

  let updatedCount = 0;

  for await (const page of paginator) {
    const items = page.Items || [];

    for (const item of items) {
      // Only update if excludeFromReports doesn't exist
      if (item.excludeFromReports === undefined) {
        await client.send(new UpdateCommand({
          TableName: tableName,
          Key: { userId: item.userId, id: item.id },
          UpdateExpression: "SET excludeFromReports = :value",
          ExpressionAttributeValues: { ":value": false },
          ConditionExpression: "attribute_not_exists(excludeFromReports)",
        }));
        updatedCount++;
      }
    }
  }

  console.log(`Migration complete: Updated ${updatedCount} categories`);
}
```

### Rationale

**Required field (no optional):**
- Per user requirement: "make it required in graphql and services"
- Zod schema uses `z.boolean()` not `.optional()`
- Ensures all records have explicit value after migration

**Migration sets false (not true):**
- Conservative default: existing categories were implicitly "included in reports"
- Users can explicitly exclude categories after migration
- Avoids breaking existing user workflows (reports continue showing same data)

**Idempotent migration:**
- Uses `attribute_not_exists()` condition to avoid overwriting existing values
- Safe to run multiple times (dev, staging, production)
- Follows constitution requirement: "can be safely run multiple times"

### Alternatives Considered

**Option: Make field optional in TypeScript** → Rejected per user requirement

**Option: Set migration default to `true`** → Rejected as it would immediately hide all existing transactions from reports (breaking change)

**Option: Add field to DynamoDB table definition** → Not needed; DynamoDB is schemaless, field added at item level

---

## Research Topic 3: Service Layer Business Logic

### Decision

**CategoryService changes**: Minimal to none. The service layer already handles category creation/updates through the repository pattern. The new field is a simple data attribute with no complex business rules.

**Potential validation (if needed):**
```typescript
// In CategoryService.createCategory or updateCategory
// No validation needed - boolean field is self-validating
// GraphQL + Zod already ensure value is true/false
```

**No cross-service coordination needed:**
- Monthly report service (`MonthlyByCategoryReportService`) will read `excludeFromReports` from category entities
- No circular dependencies or complex orchestration
- Service layer remains simple CRUD orchestrator

### Rationale

**Minimal service layer changes:**
- The field is a simple boolean attribute, not complex business logic
- No validation beyond type checking (already handled by GraphQL/Zod)
- No multi-entity orchestration required
- Follows constitution: "Service layer implements business logic and domain rules"
- In this case, business logic is trivial (store and retrieve boolean)

**Report filtering happens at query time:**
- MonthlyByCategoryReportService already fetches categories via repository
- Will filter categories where `excludeFromReports === true` when calculating totals
- Separation of concerns: CategoryService doesn't need to know about reports

### Alternatives Considered

**Option: Add validation method `validateExcludeFromReports()`** → Rejected as unnecessary (boolean is self-validating)

**Option: Add service method `setCategoryExcluded(id, excluded)`** → Rejected as redundant with existing `updateCategory()` method

---

## Research Topic 4: Monthly Report Filtering Logic

### Decision

**MonthlyByCategoryReportService changes**:
- Modify the `call()` method to filter out excluded categories
- Filter transactions belonging to excluded categories from income/expense totals
- Exclude excluded categories from category breakdown
- Modify `groupByCategoryAndCurrency()` to check exclusion flag

**Implementation approach**:
```typescript
// In MonthlyByCategoryReportService.call()
// After fetching transactions, before grouping:
const transactions = await this.transactionRepository.findActiveByMonthAndTypes(...);

// NEW: Fetch all categories and filter to included ones
const allCategories = await this.categoryRepository.findActiveByUserId(userId);
const includedCategoryIds = new Set(
  allCategories.filter(c => !c.excludeFromReports).map(c => c.id)
);

// NEW: Filter transactions to only included categories (keep uncategorized)
const includedTransactions = transactions.filter(t =>
  !t.categoryId || includedCategoryIds.has(t.categoryId)
);

// Use includedTransactions for calculations
const currencyTotals = this.calculateCurrencyTotals(includedTransactions, amountGetter);
const categories = await this.groupByCategoryAndCurrency(includedTransactions, ...);
- Categories retain their `excludeFromReports` flag at all times
- Report generation logic in `call()` method decides what to include based on flag
- No changes to transaction storage or retrieval
- Clean separation: transactions remain unchanged, categories control visibility

**Exclude from both totals and breakdown:**
- Per requirements: "MUST exclude from monthly report income totals" (FR-003)
- Per requirements: "MUST exclude from category breakdown section" (FR-005)
- Consistent behavior: if excluded, it's completely invisible in reports

**Account balances unchanged:**
- Per requirements: "MUST continue to affect account balances" (FR-010)
- Account balance calculations don't check category exclusion flag
- Only reports are affected

### Alternatives Considered

**Option: Filter at transaction query time** → Rejected as it would require modifying transaction repository queries (broader scope)

**Option: Add `includeInReports` parameter to transaction queries** → Rejected as overcomplicating repository interface

---

## Research Topic 5: Frontend UI Integration

### Decision

**Category Edit Dialog**:
- Add `excludeFromReports` toggle switch/checkbox
- Position in category form (spec clarification: "In the existing category edit/create dialog as a toggle switch")
- Use Vuetify `v-switch` or `v-checkbox` component

**UI mockup (conceptual)**:
```vue
<v-text-field v-model="categoryName" label="Category Name" />
<v-select v-model="categoryType" :items="['INCOME', 'EXPENSE']" label="Type" />
<v-switch
  v-model="excludeFromReports"
  label="Exclude from reports"
  hint="Transactions in this category will not appear in income/expense reports"
  persistent-hint
/>
```

**Form validation**:
- Field is required (must be explicitly set to true or false)
- Default to `false` for better UX (most categories are included)
- Show toggle as required field in creation form

### Rationale

**Toggle switch over checkbox:**
- Spec states: "as a toggle switch"
- Better UX for binary on/off decision
- More visually prominent than checkbox

**Persistent hint:**
- Explains impact of setting to users
- Clarifies that only reports are affected, not transaction history or balances

**Default `false` in form (not in database):**
- User requirement was "no defaults" in database/backend
- Frontend form can have UI default for better UX
- User must still explicitly submit the value

### Alternatives Considered

**Option: Add as separate settings page** → Rejected per spec ("In the existing category edit/create dialog")

**Option: Use checkbox instead of switch** → Rejected per spec requirement

---

## Technology Stack Confirmation

Based on existing codebase analysis:

| Component | Technology | Confirmation |
|-----------|-----------|--------------|
| **Backend Language** | TypeScript + Node.js | ✅ Confirmed via `backend/package.json` and `backend/tsconfig.json` |
| **GraphQL Server** | Apollo Server | ✅ Confirmed via `backend/src/server.ts` |
| **Database** | AWS DynamoDB | ✅ Confirmed via `backend/src/repositories/` usage of `@aws-sdk/client-dynamodb` |
| **Schema Validation** | Zod | ✅ Confirmed via `backend/src/repositories/schemas/` |
| **Backend Testing** | Jest | ✅ Confirmed via `backend/jest.config.json` |
| **Frontend Framework** | Vue 3 + Vuetify | ✅ Confirmed via `frontend/package.json` |
| **GraphQL Client** | Apollo Client | ✅ Confirmed via `frontend/src/apollo.ts` |
| **Code Generation** | GraphQL Code Generator | ✅ Confirmed via `backend/codegen.ts` and `frontend/codegen.ts` |
| **Infrastructure** | AWS CDK | ✅ Confirmed via `infra-cdk/` package |

**No unknowns remain.** All technical context is confirmed from existing codebase patterns.

---

## Summary

All technical unknowns resolved:
1. ✅ GraphQL schema design: Required `Boolean!` field, no defaults
2. ✅ Database migration: Set `false` on existing records, idempotent pattern
3. ✅ Service layer: Minimal changes, no complex business logic
4. ✅ Report filtering: Filter at report generation time in MonthlyByCategoryReportService
5. ✅ Frontend UI: Toggle switch in existing category dialog

**Ready to proceed to Phase 1 (data model and contracts).**
