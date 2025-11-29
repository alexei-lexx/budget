# Implementation Quickstart: Factor Refunds in Expense Reports

**Feature**: [spec.md](spec.md)
**Research**: [research.md](research.md)
**Data Model**: [data-model.md](data-model.md)
**Contracts**: [contracts/README.md](contracts/README.md)
**Date**: 2025-11-28

## Overview

Implement net expense calculation (expenses - refunds) in the monthly category report. This is a **backend-only change** with no schema modifications.

**Estimated Effort**: 2-3 hours
- Repository refactor: 45 min (rename method + update all callers)
- Service: 45 min (single-pass net calculation)
- Tests: 1-1.5 hours (update all method calls + add refund scenarios)

## Prerequisites

**Read First**:
- [research.md](research.md) - Understand current implementation and decisions
- [data-model.md](data-model.md) - Understand data structures
- [.specify/memory/constitution.md](../../.specify/memory/constitution.md) - Project standards

**Environment Setup**:
```bash
# Ensure development environment is running
cd backend
npm install
npm run dev  # Start backend dev server

# In another terminal
cd frontend
npm install
npm run dev  # Start frontend dev server

# Ensure DynamoDB Local is running (Docker)
docker ps | grep dynamodb  # Should see dynamodb-local container
```

## Implementation Steps

### Step 1: Refactor Repository Method (45 min)

**File**: `backend/src/models/Transaction.ts`

**Task 1**: Rename interface method to support arrays

**Find**: Locate `findActiveByMonthAndType()` method (around line 90)

**Replace**:
```typescript
findActiveByMonthAndType(
  userId: string,
  year: number,
  month: number,
  type: TransactionType,
): Promise<Transaction[]>;
```

**With**:
```typescript
/**
 * Find active transactions by month and transaction types
 * Supports multiple types for reports that need to factor in different transaction types
 * (e.g., EXPENSE reports factoring in REFUND transactions)
 */
findActiveByMonthAndTypes(
  userId: string,
  year: number,
  month: number,
  types: TransactionType[]  // Changed from single type to array
): Promise<Transaction[]>;
```

---

**File**: `backend/src/repositories/TransactionRepository.ts`

**Task 2**: Rename and update implementation

**Find**: Locate the `findActiveByMonthAndType()` implementation

**Replace method name and signature**:
**Replace entire method**:
```typescript
async findActiveByMonthAndTypes(  // Renamed from findActiveByMonthAndType
  userId: string,
  year: number,
  month: number,
  types: TransactionType[],  // Changed from single type to array
): Promise<Transaction[]> {
  const monthStr = month.toString().padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;

  // Calculate last day of month
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStr = nextMonth.toString().padStart(2, "0");
  const endDate = `${nextYear}-${nextMonthStr}-01`;

  const result = await this.client.send(
    new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "userId = :userId",
      FilterExpression:
        "#date >= :startDate AND #date < :endDate AND #isArchived = :isArchived",
      ExpressionAttributeNames: {
        "#date": "date",
        "#isArchived": "isArchived",
      },
      ExpressionAttributeValues: marshall({
        ":userId": userId,
        ":startDate": startDate,
        ":endDate": endDate,
        ":isArchived": false,
      }),
    }),
  );

  const items = result.Items?.map((item) => unmarshall(item)) || [];
  const validated = items.map((item) => transactionSchema.parse(item));

  // Filter by types in application layer (DynamoDB FilterExpression doesn't support IN operator easily)
  return validated.filter((t) => types.includes(t.type));
}
```

**Note**: This implementation fetches all transactions for the month, then filters by type in application code. This is acceptable for the expected data volume (< 1000 transactions/month) and maintains query portability.

---

**Task 3**: Update existing callers

**Files to update**:
1. `backend/src/services/MonthlyByCategoryReportService.ts`
2. `backend/src/services/MonthlyByWeekdayReportService.ts`
3. `backend/src/__tests__/utils/mockRepositories.ts`
4. All test files that call the method

**Find pattern**: `findActiveByMonthAndType(`

**Replace pattern**: `findActiveByMonthAndTypes(`

**Update calls**: Wrap single type in array

**Example in MonthlyByWeekdayReportService.ts**:
```typescript
// Before
const transactions = await this.transactionRepository.findActiveByMonthAndType(
  userId,
  year,
  month,
  type,
);

// After
const transactions = await this.transactionRepository.findActiveByMonthAndTypes(
  userId,
  year,
  month,
  [type],  // Wrap in array
);
```

**Example in mock repositories** (`__tests__/utils/mockRepositories.ts`):
```typescript
// Before
findActiveByMonthAndType: jest.fn(),

// After
findActiveByMonthAndTypes: jest.fn(),
```

### Step 2: Update Service Layer (45 min)

**File**: `backend/src/services/MonthlyByCategoryReportService.ts`

**Task 1**: Update the `call()` method to fetch multiple types

**Find**: Locate the `call()` method (around line 42)

**Replace**:
```typescript
async call(
  userId: string,
  year: number,
  month: number,
  type: TransactionType,
): Promise<MonthlyReport> {
  const transactions =
    await this.transactionRepository.findActiveByMonthAndType(
      userId,
      year,
      month,
      type,
    );

  if (transactions.length === 0) {
    return {
      year,
      month,
      type,
      categories: [],
      currencyTotals: [],
    };
  }

  const currencyTotals = calculateCurrencyTotals(transactions);
  const categories = await this.groupByCategoryAndCurrency(
    transactions,
    userId,
    currencyTotals,
  );

  return {
    year,
    month,
    type,
    categories,
    currencyTotals,
  };
}
```

**With**:
```typescript
async call(
  userId: string,
  year: number,
  month: number,
  type: TransactionType,
): Promise<MonthlyReport> {
  // For EXPENSE reports, fetch both EXPENSE and REFUND transactions
  // For INCOME reports, fetch only INCOME transactions (unchanged)
  const typesToFetch =
    type === TransactionType.EXPENSE
      ? [TransactionType.EXPENSE, TransactionType.REFUND]
      : [type];

  const transactions =
    await this.transactionRepository.findActiveByMonthAndTypes(
      userId,
      year,
      month,
      typesToFetch,
    );

  if (transactions.length === 0) {
    return {
      year,
      month,
      type,
      categories: [],
      currencyTotals: [],
    };
  }

  // For EXPENSE reports, calculate net amounts (expenses - refunds)
  // For other types, use amounts as-is
  const shouldCalculateNet = type === TransactionType.EXPENSE;

  const currencyTotals = this.calculateCurrencyTotals(transactions, shouldCalculateNet);
  const categories = await this.groupByCategoryAndCurrency(
    transactions,
    userId,
    currencyTotals,
    shouldCalculateNet,
  );

  return {
    year,
    month,
    type,
    categories,
    currencyTotals,
  };
}
```

**Task 2**: Add private `calculateCurrencyTotals()` method with net amount support

**Add as private method** (before `groupByCategoryAndCurrency()`):
```typescript
/**
 * Calculate currency totals with optional net amount calculation
 * When shouldCalculateNet=true: expenses add, refunds subtract (single pass)
 * When shouldCalculateNet=false: sum all amounts as-is
 */
private calculateCurrencyTotals(
  transactions: Transaction[],
  shouldCalculateNet: boolean,
): MonthlyReportCurrencyTotal[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    const current = totals.get(transaction.currency) || 0;

    if (shouldCalculateNet) {
      // Single-pass net calculation: add expenses, subtract refunds
      const signedAmount =
        transaction.type === TransactionType.EXPENSE
          ? transaction.amount
          : -transaction.amount;  // REFUND
      totals.set(transaction.currency, current + signedAmount);
    } else {
      // Standard sum
      totals.set(transaction.currency, current + transaction.amount);
    }
  }

  return Array.from(totals.entries())
    .map(([currency, totalAmount]) => ({ currency, totalAmount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
```

**Task 3**: Update `groupByCategoryAndCurrency()` to accept `shouldCalculateNet` flag

**Find**: Method signature (around line 82):
```typescript
private async groupByCategoryAndCurrency(
  transactions: Transaction[],
  userId: string,
  currencyTotals: MonthlyReportCurrencyTotal[],
): Promise<MonthlyReportCategory[]> {
```

**Replace with**:
```typescript
private async groupByCategoryAndCurrency(
  transactions: Transaction[],
  userId: string,
  currencyTotals: MonthlyReportCurrencyTotal[],
  shouldCalculateNet: boolean,  // New parameter
): Promise<MonthlyReportCategory[]> {
```

**Find**: Call to `this.calculateCurrencyBreakdowns()` (around line 113):
```typescript
const currencyBreakdowns = this.calculateCurrencyBreakdowns(
  categoryTransactions,
  currencyTotals,
);
```

**Replace with**:
```typescript
const currencyBreakdowns = this.calculateCurrencyBreakdowns(
  categoryTransactions,
  currencyTotals,
  shouldCalculateNet,  // Pass flag through
);
```

**Task 4**: Update `calculateCurrencyBreakdowns()` to support net amounts

**Find**: Method signature (around line 127):
```typescript
private calculateCurrencyBreakdowns(
  transactions: Transaction[],
  currencyTotals: MonthlyReportCurrencyTotal[],
): MonthlyReportCurrencyBreakdown[] {
```

**Replace entire method**:
```typescript
private calculateCurrencyBreakdowns(
  transactions: Transaction[],
  currencyTotals: MonthlyReportCurrencyTotal[],
  shouldCalculateNet: boolean,  // New parameter
): MonthlyReportCurrencyBreakdown[] {
  const categoryTotals = new Map<string, number>();

  for (const transaction of transactions) {
    const current = categoryTotals.get(transaction.currency) || 0;

    if (shouldCalculateNet) {
      // Single-pass net calculation: add expenses, subtract refunds
      const signedAmount =
        transaction.type === TransactionType.EXPENSE
          ? transaction.amount
          : -transaction.amount;  // REFUND
      categoryTotals.set(transaction.currency, current + signedAmount);
    } else {
      // Standard sum
      categoryTotals.set(transaction.currency, current + transaction.amount);
    }
  }

  const breakdowns: MonthlyReportCurrencyBreakdown[] = [];

  for (const [currency, totalAmount] of categoryTotals) {
    const currencyTotal = currencyTotals.find(
      (ct) => ct.currency === currency,
    );
    const percentage =
      currencyTotal && currencyTotal.totalAmount !== 0  // Changed from > 0 to !== 0
        ? Math.round((totalAmount / currencyTotal.totalAmount) * 100)
        : 0;

    breakdowns.push({
      currency,
      totalAmount,
      percentage,
    });
  }

  return breakdowns.sort((a, b) => a.currency.localeCompare(b.currency));
}
```

**Changes**:
1. Added `shouldCalculateNet` parameter
2. Single-pass calculation: add expenses, subtract refunds when flag is true
3. Fixed percentage calculation: `!== 0` instead of `> 0` to handle negative totals

### Step 3: Update Existing Tests (1 hour)

**File**: `backend/src/services/MonthlyByCategoryReportService.test.ts`

**Task 1**: Update mock repository

**Find**: Mock repository setup (typically at top of test file):
```typescript
const mockTransactionRepository = {
  findActiveByMonthAndType: jest.fn(),
  // ... other methods
};
```

**Replace with**:
```typescript
const mockTransactionRepository = {
  findActiveByMonthAndTypes: jest.fn(),  // Renamed
  // ... other methods
};
```

**Task 2**: Update all existing test mocks

**Find pattern**: `mockTransactionRepository.findActiveByMonthAndType`

**Replace pattern**: `mockTransactionRepository.findActiveByMonthAndTypes`

**Task 3**: Add new test cases for refund scenarios

```typescript
describe("MonthlyByCategoryReportService - Refund Factoring", () => {
  it("should calculate net amount (expenses - refunds)", async () => {
    const expenseTransaction: Transaction = {
      userId: "user-1",
      id: "txn-1",
      accountId: "acc-1",
      categoryId: "cat-1",
      type: TransactionType.EXPENSE,
      amount: 1000,
      currency: "EUR",
      date: "2025-11-15",
      isArchived: false,
      createdAt: "2025-11-15T00:00:00Z",
      updatedAt: "2025-11-15T00:00:00Z",
    };

    const refundTransaction: Transaction = {
      ...expenseTransaction,
      id: "txn-2",
      type: TransactionType.REFUND,
      amount: 200,
    };

    mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue([
      expenseTransaction,
      refundTransaction,
    ]);

    mockCategoryRepository.findActiveById.mockResolvedValue({
      id: "cat-1",
      userId: "user-1",
      name: "Clothes",
      type: CategoryType.EXPENSE,
      isArchived: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });

    const result = await service.call(
      "user-1",
      2025,
      11,
      TransactionType.EXPENSE,
    );

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].categoryName).toBe("Clothes");
    expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(800); // 1000 - 200
  });

  it("should handle negative net amount (refunds > expenses)", async () => {
    const refundTransaction: Transaction = {
      userId: "user-1",
      id: "txn-1",
      accountId: "acc-1",
      categoryId: "cat-1",
      type: TransactionType.REFUND,
      amount: 300,
      currency: "EUR",
      date: "2025-11-15",
      isArchived: false,
      createdAt: "2025-11-15T00:00:00Z",
      updatedAt: "2025-11-15T00:00:00Z",
    };

    mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue([
      refundTransaction,
    ]);

    mockCategoryRepository.findActiveById.mockResolvedValue({
      id: "cat-1",
      userId: "user-1",
      name: "Travel",
      type: CategoryType.EXPENSE,
      isArchived: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });

    const result = await service.call(
      "user-1",
      2025,
      11,
      TransactionType.EXPENSE,
    );

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].categoryName).toBe("Travel");
    expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(-300);
  });

  it("should not factor refunds for INCOME reports", async () => {
    const incomeTransaction: Transaction = {
      userId: "user-1",
      id: "txn-1",
      accountId: "acc-1",
      categoryId: "cat-1",
      type: TransactionType.INCOME,
      amount: 500,
      currency: "EUR",
      date: "2025-11-15",
      isArchived: false,
      createdAt: "2025-11-15T00:00:00Z",
      updatedAt: "2025-11-15T00:00:00Z",
    };

    mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue([
      incomeTransaction,
    ]);

    mockCategoryRepository.findActiveById.mockResolvedValue({
      id: "cat-1",
      userId: "user-1",
      name: "Salary",
      type: CategoryType.INCOME,
      isArchived: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });

    const result = await service.call(
      "user-1",
      2025,
      11,
      TransactionType.INCOME,
    );

    expect(mockTransactionRepository.findActiveByMonthAndTypes).toHaveBeenCalledWith(
      "user-1",
      2025,
      11,
      [TransactionType.INCOME], // Only INCOME, no REFUND
    );
    expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(500);
  });
});
```

### Step 4: Update Repository Tests (30 min)

**File**: `backend/src/repositories/TransactionRepository.test.ts`

**Task 1**: Update existing test calls

**Find pattern**: `.findActiveByMonthAndType(`

**Replace pattern**: `.findActiveByMonthAndTypes(`

**Update calls**: Wrap type argument in array `[type]`

**Example**:
```typescript
// Before
const results = await repository.findActiveByMonthAndType(
  TEST_USER_ID,
  2025,
  11,
  TransactionType.EXPENSE
);

// After
const results = await repository.findActiveByMonthAndTypes(
  TEST_USER_ID,
  2025,
  11,
  [TransactionType.EXPENSE]  // Wrapped in array
);
```

**Task 2**: Add tests for multiple types

**Code**:
```typescript
describe("findActiveByMonthAndTypes", () => {
  it("should find transactions matching multiple types", async () => {
    const expenseTransaction = createValidTransaction({
      type: TransactionType.EXPENSE,
      amount: 1000,
      date: "2025-11-15",
    });

    const refundTransaction = createValidTransaction({
      type: TransactionType.REFUND,
      amount: 200,
      date: "2025-11-20",
    });

    const incomeTransaction = createValidTransaction({
      type: TransactionType.INCOME,
      amount: 500,
      date: "2025-11-10",
    });

    await repository.create(expenseTransaction);
    await repository.create(refundTransaction);
    await repository.create(incomeTransaction);

    const results = await repository.findActiveByMonthAndTypes(
      TEST_USER_ID,
      2025,
      11,
      [TransactionType.EXPENSE, TransactionType.REFUND],
    );

    expect(results).toHaveLength(2);
    expect(results.map((t) => t.type)).toEqual(
      expect.arrayContaining([TransactionType.EXPENSE, TransactionType.REFUND]),
    );
    expect(results.find((t) => t.type === TransactionType.INCOME)).toBeUndefined();
  });

  it("should filter by month boundaries correctly", async () => {
    const novemberTransaction = createValidTransaction({
      date: "2025-11-15",
      type: TransactionType.EXPENSE,
    });

    const decemberTransaction = createValidTransaction({
      date: "2025-12-01",
      type: TransactionType.EXPENSE,
    });

    await repository.create(novemberTransaction);
    await repository.create(decemberTransaction);

    const results = await repository.findActiveByMonthAndTypes(
      TEST_USER_ID,
      2025,
      11,
      [TransactionType.EXPENSE],
    );

    expect(results).toHaveLength(1);
    expect(results[0].date).toBe("2025-11-15");
  });

  it("should exclude archived transactions", async () => {
    const activeTransaction = createValidTransaction({
      type: TransactionType.EXPENSE,
      date: "2025-11-15",
    });

    const archivedTransaction = createValidTransaction({
      type: TransactionType.EXPENSE,
      date: "2025-11-20",
      isArchived: true,
    });

    await repository.create(activeTransaction);
    await repository.create(archivedTransaction);

    const results = await repository.findActiveByMonthAndTypes(
      TEST_USER_ID,
      2025,
      11,
      [TransactionType.EXPENSE],
    );

    expect(results).toHaveLength(1);
    expect(results[0].isArchived).toBe(false);
  });
});
```

### Step 5: Run Tests (15 min)

```bash
cd backend

# Run all tests
npm test

# Run specific test suites
npm test TransactionRepository.test.ts
npm test MonthlyByCategoryReportService.test.ts

# Run tests in watch mode
npm test -- --watch
```

**Expected**: All tests pass ✅

### Step 6: Manual Testing (15 min)

**Setup test data**:
1. Start development environment (backend + frontend + DynamoDB Local)
2. Create test transactions via frontend:
   - Category "Clothes": €1000 expense (Nov 15)
   - Category "Clothes": €200 refund (Nov 20)
   - Category "Food": €500 expense (Nov 10)
   - Category "Travel": €300 refund (Nov 25, no expense)

**Test queries**:
```graphql
query {
  monthlyReport(year: 2025, month: 11, type: EXPENSE) {
    categories {
      categoryName
      currencyBreakdowns {
        currency
        totalAmount
        percentage
      }
    }
    currencyTotals {
      currency
      totalAmount
    }
  }
}
```

**Expected results**:
- Clothes: €800 (1000 - 200)
- Food: €500
- Travel: -€300
- Total: €1000 (800 + 500 - 300)

**Verify in frontend**:
- Navigate to monthly expense report
- Select November 2025
- Verify net amounts displayed correctly
- Verify negative amounts displayed with minus sign

### Step 7: Code Quality (10 min)

```bash
cd backend

# Format code
npm run format

# Fix linting issues
npm run lint:fix

# Type check
npx tsc --noEmit
```

**Expected**: No errors ✅

### Step 8: Update Documentation (5 min)

**File**: `backend/src/services/MonthlyByCategoryReportService.ts`

**Add JSDoc comments**:
```typescript
/**
 * Service for generating monthly expense/income reports by category.
 *
 * For EXPENSE reports, automatically factors in REFUND transactions:
 * - Fetches both EXPENSE and REFUND transactions for the month
 * - Calculates net amounts: sum(EXPENSE) - sum(REFUND) per category + currency
 * - Supports negative amounts when refunds exceed expenses
 *
 * For INCOME reports, behavior unchanged (no refund factoring).
 */
export class MonthlyByCategoryReportService {
  // ...
}
```

## Testing Checklist

- [ ] Repository interface renamed (Transaction.ts)
- [ ] Repository implementation renamed (TransactionRepository.ts)
- [ ] All existing callers updated (MonthlyByWeekdayReportService, etc.)
- [ ] Repository tests updated and pass
- [ ] Service tests updated with refactored method name
- [ ] New service tests pass (net calculation, negative amounts)
- [ ] Mock repositories updated (__tests__/utils/mockRepositories.ts)
- [ ] Manual test: expenses > refunds (positive net)
- [ ] Manual test: refunds > expenses (negative net)
- [ ] Manual test: INCOME report unchanged
- [ ] Manual test: multiple currencies
- [ ] Frontend displays negative amounts correctly
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Code formatted

## Common Issues & Solutions

### Issue 1: Percentage calculation incorrect with negative totals

**Symptom**: Percentages don't sum to 100% or show NaN

**Cause**: Division by zero or negative total handling

**Solution**: Update percentage calculation to handle negative denominators:
```typescript
const percentage =
  currencyTotal && currencyTotal.totalAmount !== 0
    ? Math.round((totalAmount / currencyTotal.totalAmount) * 100)
    : 0;
```

### Issue 2: Tests fail with "method not found"

**Symptom**: `mockTransactionRepository.findActiveByMonthAndTypes is not a function`

**Cause**: Mock repository not updated with renamed method

**Solution**: Update mock in test files and `__tests__/utils/mockRepositories.ts`:
```typescript
const mockTransactionRepository = {
  // ... existing mocks ...
  findActiveByMonthAndTypes: jest.fn(),  // Renamed from findActiveByMonthAndType
};
```

### Issue 3: "Too many arguments" or type errors

**Symptom**: TypeScript errors about argument count in method calls

**Cause**: Existing calls not updated to use array syntax

**Solution**: Wrap single types in arrays:
```typescript
// Before
repo.findActiveByMonthAndType(userId, year, month, TransactionType.EXPENSE)

// After
repo.findActiveByMonthAndTypes(userId, year, month, [TransactionType.EXPENSE])
```

### Issue 4: DynamoDB Local query returns empty results

**Symptom**: Repository test returns empty array

**Cause**: Date filtering or type filtering not working

**Solution**:
1. Verify date format: YYYY-MM-DD
2. Check month boundary calculation (end date should be first day of next month)
3. Verify type filtering happens after unmarshalling

## Next Steps

**After implementation**:
1. Run full test suite: `npm test`
2. Test manually in development environment
3. Commit changes following [commit guidelines](../../CLAUDE.md)
4. Create pull request following [PR guidelines](../../.specify/templates/commands/commit.md)
5. Deploy to staging/production following [deployment process](../../deploy.sh)

**Follow-up considerations** (future enhancements):
- Add transaction type filter to frontend (show/hide refunds)
- Add report export with refund details
- Add refund tracking UI (link refunds to original expenses)

## Performance Considerations

**Expected performance**:
- Query time: < 100ms for 1000 transactions
- Aggregation time: < 10ms (in-memory Map operations)
- Total report generation: < 200ms (well under 2-second requirement)

**If performance issues occur**:
1. Profile with `console.time()` around repository call and aggregation
2. Check DynamoDB Local query time (should be < 50ms)
3. Consider pagination if transaction count exceeds 5000/month (unlikely)

## Resources

- [Constitution](../../.specify/memory/constitution.md) - Project standards
- [GraphQL Schema](../../backend/src/schema.graphql) - API contracts
- [Repository Pattern Docs](https://martinfowler.com/eaaCatalog/repository.html) - Pattern reference
- [Jest Documentation](https://jestjs.io/) - Testing framework
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - Language reference
