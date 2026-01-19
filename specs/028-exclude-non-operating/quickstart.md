# Quickstart: Exclude Categories from Reports

**Branch**: `028-exclude-non-operating`
**Estimated Time**: 4-6 hours (backend 3-4h, frontend 1-2h)

---

## Prerequisites

- [x] Constitution read and understood
- [x] Research phase complete (research.md)
- [x] Data model defined (data-model.md)
- [x] API contracts specified (contracts/graphql-api.md)
- [x] Development environment setup (local DynamoDB running)

---

## Implementation Checklist

### Phase 1: Backend Schema & Types (30 min)

#### 1.1 Update GraphQL Schema

**File**: `backend/src/schema.graphql`

**Change**:
```graphql
type Category {
  id: ID!
  name: String!
  type: CategoryType!
  excludeFromReports: Boolean!  # ADD THIS LINE
}

# ... (scroll down to inputs)

input CreateCategoryInput {
  name: String!
  type: CategoryType!
  excludeFromReports: Boolean!  # ADD THIS LINE
}

input UpdateCategoryInput {
  name: String
  excludeFromReports: Boolean  # ADD THIS LINE (note: optional)
}
```

**Verification**:
```bash
cd backend
npm run codegen  # Should complete without errors
```

---

#### 1.2 Update TypeScript Interfaces

**File**: `backend/src/models/category.ts`

**BEFORE** (lines 6-14):
```typescript
export interface Category {
  userId: string;
  id: string;
  name: string;
  type: CategoryType;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**AFTER**:
```typescript
export interface Category {
  userId: string;
  id: string;
  name: string;
  type: CategoryType;
  excludeFromReports: boolean;  // ADD THIS LINE
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**BEFORE** (lines 16-20):
```typescript
export interface CreateCategoryInput {
  userId: string;
  name: string;
  type: CategoryType;
}
```

**AFTER**:
```typescript
export interface CreateCategoryInput {
  userId: string;
  name: string;
  type: CategoryType;
  excludeFromReports: boolean;  // ADD THIS LINE
}
```

**BEFORE** (lines 22-25):
```typescript
export interface UpdateCategoryInput {
  name?: string;
  type?: CategoryType;
}
```

**AFTER**:
```typescript
export interface UpdateCategoryInput {
  name?: string;
  excludeFromReports?: boolean;  // ADD THIS LINE (note: optional)
}
```

---

#### 1.3 Update Zod Schema

**File**: `backend/src/repositories/schemas/category.ts`

**BEFORE** (lines 6-13):
```typescript
export const categorySchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  name: z.string().min(1),
  type: z.enum(CategoryType),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Category>;
```

**AFTER**:
```typescript
export const categorySchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  name: z.string().min(1),
  type: z.enum(CategoryType),
  excludeFromReports: z.boolean(),  // ADD THIS LINE
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Category>;
```

**Verification**:
```bash
cd backend
npm run type-check  # Should pass with no errors
```

---

### Phase 2: Database Migration (45 min)

#### 2.1 Create Migration File

**File**: `backend/src/migrations/20260119120000-add-exclude-from-reports.ts` (NEW FILE)

```typescript
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { paginateScan, DynamoDBClient } from "@aws-sdk/client-dynamodb";

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

  console.log(
    `Starting migration: Add excludeFromReports to categories in ${tableName}`,
  );

  let updatedCount = 0;
  let skippedCount = 0;

  // Scan all items in categories table
  const paginator = paginateScan(
    {
      client: client as unknown as DynamoDBClient,
      pageSize: 100,
    },
    {
      TableName: tableName,
    },
  );

  for await (const page of paginator) {
    const items = page.Items || [];

    for (const item of items) {
      try {
        // Only update if excludeFromReports doesn't exist
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              userId: item.userId?.S,
              id: item.id?.S,
            },
            UpdateExpression: "SET excludeFromReports = :value",
            ExpressionAttributeValues: {
              ":value": false, // Default to included in reports
            },
            ConditionExpression: "attribute_not_exists(excludeFromReports)",
          }),
        );

        updatedCount++;
      } catch (error: unknown) {
        const err = error as { name?: string };
        // ConditionalCheckFailedException means field already exists - skip
        if (err.name === "ConditionalCheckFailedException") {
          skippedCount++;
        } else {
          console.error(`Error updating category ${item.id}:`, error);
          throw error;
        }
      }
    }
  }

  console.log(
    `Migration complete: Updated ${updatedCount} categories, skipped ${skippedCount} (already had field)`,
  );
}
```

---

#### 2.2 Test Migration Locally

**Terminal**:
```bash
cd backend

# Ensure local DynamoDB is running
docker-compose up -d dynamodb

# Run migration
npm run migrate

# Expected output:
# Starting migration: Add excludeFromReports to categories in ...
# Migration complete: Updated X categories, skipped 0 (already had field)
```

**Verification**:
```bash
# Check that existing categories now have the field
npm run dev

# In another terminal, run GraphQL query:
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEV_TOKEN" \
  -d '{"query":"{ categories { id name excludeFromReports } }"}'

# Should return categories with excludeFromReports: false
```

---

### Phase 3: Repository Layer (No Changes Required)

**File**: `backend/src/repositories/category-repository.ts`

**Verification**: No code changes needed. The repository automatically handles the new field because:
1. DynamoDB is schemaless
2. `create()` spreads input object (includes new field)
3. `update()` uses dynamic UpdateExpression
4. Zod validation at hydration catches missing field

**Test**:
```bash
cd backend
npm test -- category-repository.test.ts

# Should pass (may need to update test data to include excludeFromReports)
```

---

### Phase 4: Service Layer (No Changes Required)

**File**: `backend/src/services/category-service.ts`

**Verification**: No business logic changes needed. Service methods pass input through to repository.

**Test**:
```bash
cd backend
npm test -- category-service.test.ts

# May need to update test factories to include excludeFromReports
```

---

### Phase 5: Report Service Filtering (60 min)

#### 5.1 Update MonthlyByCategoryReportService

**File**: `backend/src/services/monthly-by-category-report-service.ts`

**Locate** the `call()` method (around line 64-131).

**BEFORE** (actual current code structure):
```typescript
async call(
  userId: string,
  year: number,
  month: number,
  type: ReportType,
): Promise<MonthlyReport> {
  this.validateYear(year);
  this.validateMonth(month);

  // Determine transaction types to fetch
  let transactionTypesToFetch: TransactionType[];
  let amountGetter: typeof getSignedAmount;

  if (type === ReportType.EXPENSE) {
    transactionTypesToFetch = [TransactionType.EXPENSE, TransactionType.REFUND];
    amountGetter = negatedSignedAmount;
  } else if (type === ReportType.INCOME) {
    transactionTypesToFetch = [TransactionType.INCOME];
    amountGetter = getSignedAmount;
  } else {
    throw new Error("Invalid report type");
  }

  const transactions = await this.transactionRepository.findActiveByMonthAndTypes(
    userId, year, month, transactionTypesToFetch,
  );

  if (transactions.length === 0) {
    return { year, month, type, categories: [], currencyTotals: [] };
  }

  const currencyTotals = this.calculateCurrencyTotals(transactions, amountGetter);

  const categories = await this.groupByCategoryAndCurrency(
    transactions, userId, currencyTotals, amountGetter,
  );

  return { year, month, type, categories, currencyTotals };
}
```

**AFTER**:
```typescript
async call(
  userId: string,
  year: number,
  month: number,
  type: ReportType,
): Promise<MonthlyReport> {
  this.validateYear(year);
  this.validateMonth(month);

  // Determine transaction types to fetch
  let transactionTypesToFetch: TransactionType[];
  let amountGetter: typeof getSignedAmount;

  if (type === ReportType.EXPENSE) {
    transactionTypesToFetch = [TransactionType.EXPENSE, TransactionType.REFUND];
    amountGetter = negatedSignedAmount;
  } else if (type === ReportType.INCOME) {
    transactionTypesToFetch = [TransactionType.INCOME];
    amountGetter = getSignedAmount;
  } else {
    throw new Error("Invalid report type");
  }

  const transactions = await this.transactionRepository.findActiveByMonthAndTypes(
    userId, year, month, transactionTypesToFetch,
  );

  if (transactions.length === 0) {
    return { year, month, type, categories: [], currencyTotals: [] };
  }

  // NEW: Fetch all categories and build set of included category IDs
  const allCategories = await this.categoryRepository.findActiveByUserId(userId);
  const includedCategoryIds = new Set(
    allCategories.filter((c) => !c.excludeFromReports).map((c) => c.id)
  );

  // NEW: Filter transactions to only included categories (keep uncategorized)
  const includedTransactions = transactions.filter(
    (t) => !t.categoryId || includedCategoryIds.has(t.categoryId)
  );

  const currencyTotals = this.calculateCurrencyTotals(includedTransactions, amountGetter);

  const categories = await this.groupByCategoryAndCurrency(
    includedTransactions, userId, currencyTotals, amountGetter,
  );

  return { year, month, type, categories, currencyTotals };
}
```

**Key Changes**:
1. After fetching transactions, fetch all categories via `findActiveByUserId()`
2. Build `includedCategoryIds` set from categories where `!excludeFromReports`
3. Filter transactions to `includedTransactions` (preserve uncategorized: `!t.categoryId`)
4. Pass `includedTransactions` to `calculateCurrencyTotals()` and `groupByCategoryAndCurrency()`

---

#### 5.2 Add Tests for Report Filtering

**File**: `backend/src/services/monthly-by-category-report-service.test.ts`

**Add test cases**:
```typescript
describe("call() with excluded categories", () => {
  it("should exclude transactions in excluded categories from totals", async () => {
    // Arrange
    const userId = uuidv4();
    const year = 2026;
    const month = 1;

    const groceriesCategory = fakeCategory({
      id: "cat-1",
      userId,
      name: "Groceries",
      type: CategoryType.EXPENSE,
      excludeFromReports: false,
    });

    const investmentsCategory = fakeCategory({
      id: "cat-2",
      userId,
      name: "Investments",
      type: CategoryType.EXPENSE,
      excludeFromReports: true, // EXCLUDED
    });

    mockCategoryRepository.findActiveByUserId.mockResolvedValue([
      groceriesCategory,
      investmentsCategory,
    ]);

    const transactions = [
      fakeTransaction({ categoryId: "cat-1", amount: 500 }), // Groceries
      fakeTransaction({ categoryId: "cat-2", amount: 5000 }), // Investments (excluded)
    ];

    mockTransactionRepository.findByUserAndMonth.mockResolvedValue(transactions);

    // Act
    const report = await service.call(
      userId,
      year,
      month,
      ReportType.EXPENSE,
    );

    // Assert
    expect(report.totalExpense).toBe(500); // Only groceries
    expect(report.categoryBreakdown).toHaveLength(1); // Only groceries
    expect(report.categoryBreakdown[0].category.name).toBe("Groceries");
  });

  it("should include uncategorized transactions even with excluded categories", async () => {
    // Test that transactions with categoryId === null are included
    // ...
  });

  it("should return zero totals when all categories are excluded", async () => {
    // Test edge case: all categories have excludeFromReports: true
    // ...
  });
});
```

**Run tests**:
```bash
cd backend
npm test -- monthly-by-category-report-service.test.ts
```

---

### Phase 6: Frontend Integration (90 min)

#### 6.1 Sync Schema and Regenerate Types

**Terminal**:
```bash
cd frontend
npm run codegen:sync-schema  # Copy schema from backend
npm run codegen              # Generate TypeScript types

# Should complete without errors
# Check generated types in src/__generated__/vue-apollo.ts
```

---

#### 6.2 Update Test Factories (if needed)

**File**: `backend/src/__tests__/utils/factories.ts`

**Locate** `fakeCategory()` and `fakeCreateCategoryInput()` functions.

**Update** to include `excludeFromReports` field:
```typescript
export function fakeCategory(overrides?: Partial<Category>): Category {
  return {
    userId: faker.string.uuid(),
    id: faker.string.uuid(),
    name: faker.commerce.department(),
    type: faker.helpers.arrayElement([CategoryType.INCOME, CategoryType.EXPENSE]),
    excludeFromReports: false,  // ADD THIS LINE
    isArchived: false,
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function fakeCreateCategoryInput(
  overrides?: Partial<CreateCategoryInput>,
): CreateCategoryInput {
  return {
    userId: faker.string.uuid(),
    name: faker.commerce.department(),
    type: faker.helpers.arrayElement([CategoryType.INCOME, CategoryType.EXPENSE]),
    excludeFromReports: false,  // ADD THIS LINE
    ...overrides,
  };
}
```

---

#### 6.3 Update Category Form Component

**File**: `frontend/src/components/CategoryDialog.vue` (or similar)

**Locate** the category form template.

**Add toggle switch** (example using Vuetify):
```vue
<template>
  <v-dialog v-model="dialog" max-width="500">
    <v-card>
      <v-card-title>{{ isEdit ? 'Edit' : 'Create' }} Category</v-card-title>

      <v-card-text>
        <v-text-field
          v-model="form.name"
          label="Category Name"
          :rules="[rules.required]"
        />

        <v-select
          v-model="form.type"
          :items="categoryTypes"
          label="Type"
          :rules="[rules.required]"
        />

        <!-- NEW: Add this switch -->
        <v-switch
          v-model="form.excludeFromReports"
          label="Exclude from reports"
          color="primary"
          hide-details="auto"
          class="mt-4"
        >
          <template #prepend>
            <v-icon>mdi-chart-line-variant</v-icon>
          </template>
        </v-switch>

        <v-card-text class="text-caption text-medium-emphasis pa-0 mt-2">
          When enabled, transactions in this category will not appear in
          monthly income/expense reports. Useful for investments, loans,
          and reimbursable expenses.
        </v-card-text>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="dialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useCategories, CategoryType } from '@/composables/useCategories';

const form = ref({
  name: '',
  type: CategoryType.EXPENSE,
  excludeFromReports: false,  // ADD THIS LINE (default for UI)
});

// ... rest of component logic
</script>
```

---

#### 6.4 Update Mutation Calls

**File**: `frontend/src/composables/useCategories.ts` (or wherever mutations are called)

**Ensure** `createCategory` and `updateCategory` pass `excludeFromReports`:

```typescript
const createCategory = async (input: CreateCategoryInput) => {
  const result = await createCategoryMutation.mutate({
    input: {
      name: input.name,
      type: input.type,
      excludeFromReports: input.excludeFromReports,  // Ensure this is included
    },
  });
  return result;
};

const updateCategory = async (id: string, input: UpdateCategoryInput) => {
  const result = await updateCategoryMutation.mutate({
    id,
    input: {
      name: input.name,
      excludeFromReports: input.excludeFromReports,  // Include if provided
    },
  });
  return result;
};
```

**Note**: Generated composables from `npm run codegen` should already handle this correctly. Verify types match.

---

### Phase 7: Testing & Verification (60 min)

#### 7.1 Backend Tests

**Run all backend tests**:
```bash
cd backend
npm test

# Expected: All tests pass
# If failures, update test data to include excludeFromReports field
```

**Key test files to verify**:
- `category-repository.test.ts` - CRUD operations
- `category-service.test.ts` - Service methods
- `monthly-by-category-report-service.test.ts` - Report filtering

---

#### 7.2 Manual Frontend Testing

**Test Case 1: Create category with exclusion**
1. Navigate to category management
2. Click "Create Category"
3. Enter name: "Investment Purchases"
4. Select type: "Expense"
5. Toggle "Exclude from reports" to ON
6. Click Save
7. ✅ Verify: Category created with exclusion flag

**Test Case 2: Update category to exclude**
1. Select existing category (e.g., "Groceries")
2. Click Edit
3. Toggle "Exclude from reports" to ON
4. Click Save
5. ✅ Verify: Category updated

**Test Case 3: View monthly report**
1. Create/edit categories with exclusion
2. Create transactions in excluded categories
3. Navigate to monthly report
4. ✅ Verify: Excluded transactions don't appear in totals
5. ✅ Verify: Excluded categories don't appear in breakdown
6. ✅ Verify: Account balances still accurate

**Test Case 4: Toggle exclusion status**
1. Exclude a category with existing transactions
2. View report (should exclude transactions)
3. Re-include the category
4. View report again (should include transactions)
5. ✅ Verify: Changes take effect immediately

---

#### 7.3 Integration Testing

**Test end-to-end flow**:
```bash
# 1. Start backend
cd backend
npm run dev

# 2. Start frontend (in another terminal)
cd frontend
npm run dev

# 3. Test with Auth0 login in browser
# 4. Complete manual test cases above
# 5. Check browser console for errors
# 6. Check network tab for correct GraphQL requests/responses
```

---

### Phase 8: Code Quality & Cleanup (30 min)

#### 8.1 Run Linters and Formatters

**Backend**:
```bash
cd backend
npm run format   # Format code with Prettier
npm run lint     # Check ESLint rules
npm run type-check  # Verify TypeScript types
```

**Frontend**:
```bash
cd frontend
npm run format
npm run lint
npm run type-check
```

---

#### 8.2 Code Review Checklist

- [ ] GraphQL schema updated with new field
- [ ] TypeScript interfaces include `excludeFromReports`
- [ ] Zod schema validates new field
- [ ] Migration file created and tested
- [ ] Report service filters excluded categories
- [ ] Frontend form includes toggle switch
- [ ] All tests pass (backend)
- [ ] Manual testing complete (frontend)
- [ ] No console errors in browser
- [ ] Code formatted and linted
- [ ] No TypeScript errors

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass locally
- [ ] Migration tested against local DynamoDB
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Backend builds without errors (`npm run build`)

### Deployment Steps

1. **Run migration** (production):
   ```bash
   # Migration runs automatically during CDK deployment
   # Verify in CloudWatch logs
   ```

2. **Deploy backend**:
   ```bash
   cd infra-cdk
   npm run deploy:backend
   ```

3. **Deploy frontend**:
   ```bash
   cd infra-cdk
   npm run deploy:frontend
   ```

4. **Verify deployment**:
   - Test GraphQL API with excluded category
   - View monthly report with excluded categories
   - Check CloudWatch logs for migration success

---

## Rollback Plan

**If issues arise**:

1. **Revert GraphQL schema changes** (backend)
2. **Redeploy previous backend version**
3. **Frontend will continue to work** (optional field in UpdateCategoryInput)
4. **Database state**: Migration is idempotent, no rollback needed

**Data integrity**: Migration sets `excludeFromReports: false` by default, so existing functionality is preserved.

---

## Estimated Time Breakdown

| Phase | Task | Time |
|-------|------|------|
| 1 | Backend schema & types | 30 min |
| 2 | Database migration | 45 min |
| 3 | Repository layer | 0 min (no changes) |
| 4 | Service layer | 0 min (no changes) |
| 5 | Report service filtering | 60 min |
| 6 | Frontend integration | 90 min |
| 7 | Testing & verification | 60 min |
| 8 | Code quality & cleanup | 30 min |
| **Total** | | **~5-6 hours** |

---

## Troubleshooting

### Issue: Migration fails with "CATEGORIES_TABLE_NAME not set"

**Solution**: Ensure environment variable is set:
```bash
export CATEGORIES_TABLE_NAME=local-categories-table
npm run migrate
```

---

### Issue: TypeScript error "Property 'excludeFromReports' does not exist"

**Solution**: Regenerate types:
```bash
cd backend
npm run codegen

cd ../frontend
npm run codegen
```

---

### Issue: Tests fail with "excludeFromReports is required"

**Solution**: Update test factories to include field:
```typescript
fakeCategory({ excludeFromReports: false })
fakeCreateCategoryInput({ excludeFromReports: false })
```

---

### Issue: Frontend form doesn't show toggle switch

**Solution**: Check that:
1. Schema synced: `npm run codegen:sync-schema`
2. Types generated: `npm run codegen`
3. Component imports correct types from `__generated__/vue-apollo`

---

## Next Steps

After completing this implementation:

1. **Monitor production**: Check CloudWatch logs for migration success
2. **User feedback**: Monitor for issues with excluded categories
3. **Documentation**: Update user-facing docs with new feature
4. **Future enhancements**: Consider adding UI indicators for excluded categories in transaction lists

---

## Success Criteria

- ✅ Users can mark categories as "Exclude from reports"
- ✅ Monthly reports exclude transactions in excluded categories
- ✅ Account balances remain accurate
- ✅ Exclusion status can be toggled at any time
- ✅ All existing categories migrated with default value (false)
- ✅ No breaking changes to existing API consumers (after migration)
