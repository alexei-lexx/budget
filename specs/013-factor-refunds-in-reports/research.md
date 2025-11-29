# Research: Factor Refunds in Expense Reports

**Feature**: [spec.md](spec.md)
**Date**: 2025-11-28

## Current Implementation Analysis

### GraphQL API Contract

**Query**: `monthlyReport(year: Int!, month: Int!, type: TransactionType!): MonthlyReport!`

**Types**:
```graphql
enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER_IN
  TRANSFER_OUT
  REFUND
}

type MonthlyReport {
  year: Int!
  month: Int!
  type: TransactionType!
  categories: [MonthlyReportCategory!]!
  currencyTotals: [MonthlyReportCurrencyTotal!]!
}

type MonthlyReportCategory {
  categoryId: ID
  categoryName: String!
  currencyBreakdowns: [MonthlyReportCurrencyBreakdown!]!
}

type MonthlyReportCurrencyBreakdown {
  currency: String!
  totalAmount: Float!
  percentage: Int!
}

type MonthlyReportCurrencyTotal {
  currency: String!
  totalAmount: Float!
}
```

**Source**: [backend/src/schema.graphql:11](backend/src/schema.graphql#L11), [backend/src/schema.graphql:232-238](backend/src/schema.graphql#L232-L238)

### Current Data Flow

1. **Resolver Layer** ([backend/src/resolvers/reportResolvers.ts:74-101](backend/src/resolvers/reportResolvers.ts#L74-L101)):
   - Validates input (year, month, type) using Zod schemas
   - Extracts authenticated user from context
   - Calls `monthlyByCategoryReportService.call(userId, year, month, type)`
   - Returns MonthlyReport

2. **Service Layer** ([backend/src/services/MonthlyByCategoryReportService.ts:42-80](backend/src/services/MonthlyByCategoryReportService.ts#L42-L80)):
   - Calls `transactionRepository.findActiveByMonthAndType(userId, year, month, type)`
   - Groups transactions by category
   - For each category:
     - Fetches category name (or "Uncategorized")
     - Calculates currency breakdowns (sum amounts per currency)
     - Calculates percentages based on total currency amounts
   - Returns aggregated report

3. **Repository Layer** ([backend/src/models/Transaction.ts:90-95](backend/src/models/Transaction.ts#L90-L95)):
   - Interface: `findActiveByMonthAndType(userId, year, month, type)`
   - Fetches transactions matching month and single transaction type
   - Filters by `isArchived = false`

### Data Model

**Transaction** ([backend/src/models/Transaction.ts:20-34](backend/src/models/Transaction.ts#L20-L34)):
- `userId`: string (partition key)
- `id`: string (sort key, UUID)
- `accountId`: string (foreign key)
- `categoryId?`: string (optional foreign key)
- `type`: TransactionType (INCOME | EXPENSE | TRANSFER_IN | TRANSFER_OUT | REFUND)
- `amount`: number (positive value)
- `currency`: string (ISO code, inherited from account)
- `date`: string (YYYY-MM-DD)
- `description?`: string
- `transferId?`: string
- `isArchived`: boolean
- `createdAt`: string
- `updatedAt`: string

**Category** (referenced but not shown in detail):
- `id`: string
- `name`: string
- `type`: CategoryType (INCOME | EXPENSE)
- `isArchived`: boolean

### Currency Handling

**Current Approach** ([backend/src/services/reportCalculations.ts:10-23](backend/src/services/reportCalculations.ts#L10-L23)):
- Transactions are grouped by currency
- Each category shows breakdowns per currency
- Percentages calculated per currency (category total / overall currency total * 100)
- Supports multiple currencies in same report
- No currency conversion - raw amounts displayed

**Example**:
- Category "Clothes": [{currency: "EUR", totalAmount: 1000, percentage: 50}]
- Category "Food": [{currency: "EUR", totalAmount: 500, percentage: 25}]
- Currency Totals: [{currency: "EUR", totalAmount: 2000}]

## Required Changes

### Decision 1: How to fetch expense and refund data?

**Option A: Refactor existing method to support multiple types**
- Rename `findActiveByMonthAndType()` → `findActiveByMonthAndTypes()`
- Change parameter: `type: TransactionType` → `types: TransactionType[]`
- Update all existing callers to pass single-element arrays: `[type]`
- Single database query with `type IN [...]`
- More efficient, single round-trip

**Option B: Add new method alongside existing**
- Keep `findActiveByMonthAndType()` as-is
- Add `findActiveByMonthAndTypes()` for multiple types
- Avoid touching existing code
- Method duplication

**Option C: Call existing method twice**
- Call `findActiveByMonthAndType()` for EXPENSE
- Call `findActiveByMonthAndType()` for REFUND
- Combine results in service layer
- Two database queries

**Chosen**: **Option A** - Refactor to support arrays

**Rationale**:
- Eliminates method duplication (cleaner than Option B)
- More efficient than Option C (single query vs two)
- More flexible for any future multi-type queries
- Migration cost is low (just add brackets around existing type arguments)
- Aligns with repository pattern (data access optimization)

**Alternatives considered**:
- Option B rejected: unnecessary duplication, two methods doing almost identical work
- Option C rejected: doubles database queries, potential performance impact at scale

### Decision 2: How to calculate net amounts?

**Approach**: Single-pass aggregation with sign-aware accumulation

**Implementation**:
1. Group transactions by category + currency (not by type)
2. For each transaction in group:
   - If type = EXPENSE: add amount to net
   - If type = REFUND: subtract amount from net
3. Result: netAmount per category + currency in one pass

**Why single-pass instead of sum-then-subtract**:
- More efficient: one iteration instead of two
- Simpler logic: no need to track separate expense/refund totals
- Direct calculation: `netAmount += (type === EXPENSE ? amount : -amount)`

**Edge Cases**:
- Refunds > Expenses: netAmount becomes negative (per FR-004)
- Only refunds, no expenses: netAmount = -refundTotal (per User Story 1, Scenario 4)
- No expenses, no refunds: Category not displayed or €0 (per User Story 1, Scenario 3)

### Decision 3: Schema changes needed?

**Analysis**: Current schema supports the feature without breaking changes

**No changes needed because**:
- `MonthlyReportCurrencyBreakdown.totalAmount` is `Float!` (supports negative values)
- `MonthlyReportCategory.currencyBreakdowns` is array (supports empty/multiple currencies)
- Query parameters unchanged (year, month, type=EXPENSE)

**Implementation detail**: When type=EXPENSE, backend fetches both EXPENSE and REFUND, calculates net

### Decision 4: How to maintain percentage calculations?

**Current**: percentage = (categoryAmount / currencyTotal) * 100

**With refunds**:
- Calculate percentages on net amounts (after subtracting refunds)
- Handle negative percentages (when refunds > expenses in category)
- Ensure percentages sum to ~100% per currency (accounting for rounding)

**Formula**: `percentage = round((netCategoryAmount / netCurrencyTotal) * 100)`

### Decision 5: Backend-only or frontend changes?

**Analysis**: Frontend currently displays `totalAmount` from API response

**Decision**: **Backend-only changes**

**Rationale**:
- Frontend consumes `MonthlyReportCurrencyBreakdown.totalAmount` as-is
- Backend calculates net amounts (expense - refund)
- No UI changes needed (per FR-006: maintain existing UI behavior)
- Frontend already handles negative amounts (no evidence of constraints)

**Alternatives considered**:
- Frontend calculation rejected: violates schema-driven development, duplicates logic

## Technology Choices

### Repository Pattern Implementation

**Refactor existing method**:
- Rename `findActiveByMonthAndType()` → `findActiveByMonthAndTypes()`
- Update `ITransactionRepository` interface
- Update implementation in `TransactionRepository` class
- Update all existing callers (report services, tests)
- Use DynamoDB query with composite filter
- Follow portable query patterns (no DynamoDB-specific features that can't be replicated)

**New signature**:
```typescript
findActiveByMonthAndTypes(
  userId: string,
  year: number,
  month: number,
  types: TransactionType[]  // Changed from single type to array
): Promise<Transaction[]>
```

**Migration for existing callers**:
```typescript
// Before
await repo.findActiveByMonthAndType(userId, year, month, TransactionType.EXPENSE)

// After
await repo.findActiveByMonthAndTypes(userId, year, month, [TransactionType.EXPENSE])
```

### Service Layer Logic

**Follow existing patterns** ([backend/src/services/MonthlyByCategoryReportService.ts](backend/src/services/MonthlyByCategoryReportService.ts)):
- Maintain `MonthlyByCategoryReportService` class
- Update `call()` method to:
  1. Fetch transactions with types=[EXPENSE, REFUND] when type=EXPENSE (using refactored repository method)
  2. Group by category + currency (not by type)
  3. Calculate net amounts in single pass (add expenses, subtract refunds)
  4. Calculate percentages based on net amounts
- Keep private helper methods for grouping and breakdown calculation
- Modify grouping logic to accumulate with sign-awareness:
  - `netAmount += (transaction.type === EXPENSE ? amount : -amount)`

### Testing Strategy

**Per constitution** ([.specify/memory/constitution.md:332-344](.specify/memory/constitution.md#L332-L344)):

1. **Repository tests** (with real database):
   - Test `findActiveByMonthAndTypes()` with EXPENSE and REFUND
   - Verify correct month filtering
   - Verify type filtering (multiple types)
   - Verify isArchived filtering

2. **Service tests** (with mocked repository):
   - Mock transactions with expenses and refunds
   - Verify net amount calculation (expense - refund)
   - Verify negative amounts when refunds > expenses
   - Verify category grouping with mixed types
   - Verify currency breakdown calculation
   - Verify percentage calculation with net amounts
   - Test edge cases: only refunds, only expenses, no data

3. **Utility function tests**:
   - If creating new calculation utilities, test in isolation

## Open Questions & Resolutions

### Q1: Should INCOME reports factor in refunds?
**Resolution**: No - feature scope limited to EXPENSE reports per spec context

### Q2: How to handle refund transactions without category?
**Resolution**: Same as expenses - show as "Uncategorized" (per Edge Cases in spec)

### Q3: Should we add a new query parameter to enable/disable refund factoring?
**Resolution**: No - always factor refunds when type=EXPENSE (simpler, matches user expectation)

### Q4: Performance impact of fetching two transaction types?
**Resolution**: Acceptable - still single query, well within 2-second requirement for 1000 transactions

## Implementation Sequence

1. **Repository Layer**:
   - Rename `findActiveByMonthAndType()` → `findActiveByMonthAndTypes()`
   - Update interface and implementation
   - Update all existing callers (MonthlyByCategoryReportService, MonthlyByWeekdayReportService, tests)
2. **Service Layer**:
   - Update `MonthlyByCategoryReportService.call()` to fetch [EXPENSE, REFUND] for expense reports
   - Modify aggregation logic to use single-pass calculation
3. **Tests**:
   - Update repository tests (rename method calls)
   - Update service tests (rename method calls, add refund scenarios)
4. **Validation**: Manual testing with real data (expenses + refunds)

## Dependencies

**No new dependencies required** - all changes use existing:
- TypeScript, Jest (testing)
- DynamoDB client (repository)
- Existing utility functions (currency totals)

## Constraints & Assumptions

**Constraints**:
- Maintain < 2 second report generation (SC-002)
- No schema breaking changes
- Follow repository pattern (portable queries)
- Maintain existing UI behavior

**Assumptions**:
- Refunds are accounted for in the month they are processed/recorded (not the original expense month)
- Refund transactions use the same category as the original expense (user responsibility)
- No direct link between refund and original expense transaction (matched by category only)
