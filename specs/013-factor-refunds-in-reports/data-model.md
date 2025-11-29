# Data Model: Factor Refunds in Expense Reports

**Feature**: [spec.md](spec.md)
**Research**: [research.md](research.md)
**Date**: 2025-11-28

## Overview

This feature does not introduce new entities or modify existing entity schemas. All changes are computational (aggregation logic) within the service layer.

## Existing Entities

### Transaction

**Source**: [backend/src/models/Transaction.ts:20-34](backend/src/models/Transaction.ts#L20-L34)

**Purpose**: Represents financial events (expenses, income, transfers, refunds)

**Schema**:
```typescript
interface Transaction {
  userId: string;          // Partition key - user ownership
  id: string;              // Sort key - UUID v4
  accountId: string;       // FK to Account
  categoryId?: string;     // Optional FK to Category
  type: TransactionType;   // INCOME | EXPENSE | TRANSFER_IN | TRANSFER_OUT | REFUND
  amount: number;          // Positive value
  currency: string;        // ISO code (EUR, USD, etc.)
  date: string;            // YYYY-MM-DD
  description?: string;    // Optional description
  transferId?: string;     // Links paired transfer transactions
  isArchived: boolean;     // Soft delete flag
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

**Validation Rules**:
- `amount` must be positive (sign determined by `type`)
- `date` must be valid YYYY-MM-DD format
- `currency` inherited from associated account
- `categoryId` optional (uncategorized transactions allowed)
- `type` must match category type when category present (EXPENSE type → EXPENSE category)

**State Transitions**:
- Created: `isArchived = false`
- Deleted: `isArchived = true` (soft delete)

**Relevance to Feature**:
- Report fetches transactions where `type IN [EXPENSE, REFUND]`
- Groups by `categoryId` and `currency`
- Aggregates `amount` values (sum expenses, sum refunds, calculate net)

### Category

**Source**: [backend/src/schema.graphql:62-66](backend/src/schema.graphql#L62-L66)

**Purpose**: User-defined spending/income categories

**Schema**:
```typescript
interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;  // INCOME | EXPENSE
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Validation Rules**:
- `name` must be unique per user per type
- `type` determines which transactions can use this category

**Relevance to Feature**:
- Used to display category names in report
- Transactions without `categoryId` shown as "Uncategorized"

### MonthlyReport (Service Layer DTO)

**Source**: [backend/src/services/MonthlyByCategoryReportService.ts:28-34](backend/src/services/MonthlyByCategoryReportService.ts#L28-L34)

**Purpose**: Aggregated report data structure

**Schema**:
```typescript
interface MonthlyReport {
  year: number;
  month: number;
  type: TransactionType;
  categories: MonthlyReportCategory[];
  currencyTotals: MonthlyReportCurrencyTotal[];
}

interface MonthlyReportCategory {
  categoryId?: string;
  categoryName: string;
  currencyBreakdowns: MonthlyReportCurrencyBreakdown[];
}

interface MonthlyReportCurrencyBreakdown {
  currency: string;
  totalAmount: number;      // NET amount (expenses - refunds)
  percentage: number;        // % of currency total
}

interface MonthlyReportCurrencyTotal {
  currency: string;
  totalAmount: number;      // NET total across all categories
}
```

**Calculation Changes**:
- **Before**: `totalAmount` = sum of expenses for category + currency
- **After**: `totalAmount` = sum(expenses) - sum(refunds) for category + currency
- **percentages**: calculated on net amounts

**Example**:
```json
{
  "year": 2025,
  "month": 11,
  "type": "EXPENSE",
  "categories": [
    {
      "categoryId": "cat-123",
      "categoryName": "Clothes",
      "currencyBreakdowns": [
        {
          "currency": "EUR",
          "totalAmount": 800,     // 1000 (expenses) - 200 (refunds)
          "percentage": 80        // 800 / 1000 * 100
        }
      ]
    },
    {
      "categoryId": "cat-456",
      "categoryName": "Travel",
      "currencyBreakdowns": [
        {
          "currency": "EUR",
          "totalAmount": -300,    // 0 (expenses) - 300 (refunds)
          "percentage": -30       // -300 / 1000 * 100
        }
      ]
    }
  ],
  "currencyTotals": [
    {
      "currency": "EUR",
      "totalAmount": 1000       // Net total: 800 + 200 (other categories) - 300 (Travel)
    }
  ]
}
```

## Entity Relationships

```mermaid
erDiagram
    User ||--o{ Transaction : owns
    User ||--o{ Category : owns
    User ||--o{ Account : owns
    Account ||--o{ Transaction : "has"
    Category ||--o{ Transaction : "categorizes (optional)"
    Transaction }o--o| Transaction : "linked by transferId"

    Transaction {
        string userId PK
        string id SK
        string accountId FK
        string categoryId FK_OPTIONAL
        TransactionType type
        number amount
        string currency
        string date
        boolean isArchived
    }

    Category {
        string id
        string userId
        string name
        CategoryType type
        boolean isArchived
    }

    Account {
        string id
        string userId
        string name
        string currency
        boolean isArchived
    }
```

**Key Relationships**:
- Transaction → Category: Many-to-One (optional)
- Transaction → Account: Many-to-One (required)
- Transaction → User: Many-to-One (required, enforced at DB level)

**Report Aggregation**:
1. Fetch transactions: `userId = :userId AND date BETWEEN :monthStart AND :monthEnd AND type IN [EXPENSE, REFUND]`
2. Group by: `categoryId` + `currency` (NOT by type)
3. Aggregate with sign-awareness in single pass:
   - For each transaction: `netAmount += (type === EXPENSE ? amount : -amount)`
4. Result: `netAmount[category][currency]` calculated directly
5. Calculate percentages: `percentage = netAmount / totalNetAmount * 100`

## Data Access Patterns

### Refactored Repository Method

**Old Signature** (being replaced):
```typescript
interface ITransactionRepository {
  findActiveByMonthAndType(
    userId: string,
    year: number,
    month: number,
    type: TransactionType  // Single type
  ): Promise<Transaction[]>;
}
```

**New Signature**:
```typescript
interface ITransactionRepository {
  findActiveByMonthAndTypes(  // Renamed from findActiveByMonthAndType
    userId: string,
    year: number,
    month: number,
    types: TransactionType[]  // Array of types
  ): Promise<Transaction[]>;
}
```

**Migration Impact**:
- All existing callers must be updated: `findActiveByMonthAndType(userId, year, month, type)` → `findActiveByMonthAndTypes(userId, year, month, [type])`
- Affected files: MonthlyByCategoryReportService, MonthlyByWeekdayReportService, tests

**Query Pattern** (DynamoDB):
```
Query:
  PK = userId
  SK BEGINS_WITH "transaction#"
Filter:
  date >= "2025-11-01" AND date <= "2025-11-30"
  type IN ["EXPENSE", "REFUND"]
  isArchived = false
```

**Portability**: Compatible with SQL equivalent:
```sql
SELECT * FROM transactions
WHERE userId = ?
  AND date >= ?
  AND date <= ?
  AND type IN (?, ?)
  AND isArchived = false
```

## Validation Rules

### Input Validation (GraphQL Layer)

**Schema**: Zod validation in resolver ([backend/src/resolvers/reportResolvers.ts:59-63](backend/src/resolvers/reportResolvers.ts#L59-L63))

```typescript
const monthlyReportInputSchema = z.object({
  year: z.number().int().min(currentYear - 10).max(currentYear + 10),
  month: z.number().int().min(1).max(12),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE])
});
```

**No changes needed** - existing validation sufficient

### Business Validation (Service Layer)

**No additional business rules needed** for this feature:
- Date range validation: handled by repository (month boundaries)
- Category existence: handled by existing lookup (falls back to "Uncategorized")
- Currency validation: inherited from transactions (already validated at creation)

## Data Integrity Considerations

### Soft-Deletion Impact

**Current behavior** (maintained):
- Archived transactions excluded via `isArchived = false` filter
- Archived categories show as "Uncategorized" in reports (existing fallback)
- No change needed - existing logic handles this

### Edge Cases

1. **Refund without expense in same month**:
   - Result: Negative category total
   - Display: Category shown with negative amount (per FR-004)
   - Example: Travel category = -€300

2. **Uncategorized transactions** (categoryId = null):
   - Grouped under categoryId = undefined
   - Displayed as "Uncategorized"
   - Net calculation same as categorized transactions

3. **Multiple currencies**:
   - Each currency calculated independently
   - Net amounts per currency: expenses[EUR] - refunds[EUR], expenses[USD] - refunds[USD]
   - Percentages per currency

4. **Zero net amount**:
   - Category with equal expenses and refunds = €0
   - Decision: Include in report or exclude? (Implementation decision - recommend exclude if totalAmount = 0 for cleaner UI)

## Migration Requirements

**None** - no schema changes, no data migration needed

## Performance Considerations

### Query Efficiency

**Current**: Single query for one transaction type
**New**: Single query for two transaction types (EXPENSE + REFUND)

**Impact**: Negligible
- Same DynamoDB query pattern (filter on type)
- Result set size similar (refunds typically < expenses)
- Well within 2-second performance requirement (SC-002)

### Aggregation Complexity

**Current**: O(n) where n = number of expense transactions
**New**: O(n + m) where n = expenses, m = refunds

**Impact**: Minimal
- Linear complexity maintained
- Single-pass aggregation (no separate sum-then-subtract loops)
- In-memory aggregation (Map-based grouping)
- Expected: n + m ≤ 1000 transactions (per SC-002)
- Processing time: < 10ms for 1000 transactions

## Summary

**No entity schema changes required**. All modifications are computational:
- Repository: fetch multiple transaction types in one query
- Service: calculate net amounts (expenses - refunds) during aggregation
- GraphQL: return existing schema with updated values

**Data model remains stable** - feature is purely an aggregation logic change.
