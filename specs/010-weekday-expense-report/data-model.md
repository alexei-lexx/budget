# Data Model: Monthly Expense Report by Weekday

**Date**: 2025-11-14
**Feature**: Monthly Expense Report by Weekday
**Branch**: `010-weekday-expense-report`

## Overview

This feature introduces new aggregated data structures for weekday expense reporting. No new database entities are created. All data is computed from existing Transaction entities.

## Entities

### Existing Entities (Read-Only)

#### Transaction
**Source**: Existing DynamoDB table via TransactionRepository
**Usage**: Source data for weekday aggregation

```typescript
interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;  // INCOME | EXPENSE | TRANSFER_IN | TRANSFER_OUT
  amount: number;
  currency: string;
  date: string;  // ISO 8601 format: YYYY-MM-DD
  description?: string;
  transferId?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Constraints**:
- Only `type: EXPENSE` transactions are included in weekday reports
- Only non-archived (`isArchived: false`) transactions are included
- Transactions must fall within the specified year and month

### Computed Entities (Not Persisted)

These entities are computed on-demand by ReportsService and returned via GraphQL API.

#### WeekdayReport
**Lifecycle**: Computed per request, not stored
**Scope**: User-specific, month-specific

```typescript
interface WeekdayReport {
  year: number;          // 4-digit year (e.g., 2025)
  month: number;         // 1-12
  weekdays: WeekdayReportDay[];
  currencyTotals: WeekdayReportCurrencyTotal[];
}
```

**Business Rules**:
- `weekdays` array always contains 7 elements (Monday through Sunday)
- Weekdays with zero expenses have empty `currencyBreakdowns` arrays or zero amounts
- `currencyTotals` contains one entry per currency found in the month's expenses

#### WeekdayReportDay
**Lifecycle**: Computed as part of WeekdayReport
**Scope**: Single weekday within a month

```typescript
interface WeekdayReportDay {
  weekday: number;       // 0=Monday, 1=Tuesday, ..., 6=Sunday
  currencyBreakdowns: WeekdayReportCurrencyBreakdown[];
}
```

**Business Rules**:
- `weekday` uses 0-based index where 0=Monday (international standard)
- `currencyBreakdowns` contains one entry per currency with expenses on that weekday
- Empty array when no expenses for that weekday in the month

#### WeekdayReportCurrencyBreakdown
**Lifecycle**: Computed as part of WeekdayReportDay
**Scope**: Single currency for a single weekday

```typescript
interface WeekdayReportCurrencyBreakdown {
  currency: string;      // ISO 4217 currency code (USD, EUR, etc.)
  totalAmount: number;   // Sum of all expenses for this weekday+currency
  averageAmount: number; // totalAmount ÷ occurrences
  percentage: number;    // (totalAmount ÷ monthTotal) × 100, rounded to integer
}
```

**Business Rules**:
- `totalAmount` is the sum of all expense amounts for this weekday in this currency
- `averageAmount` = `totalAmount` ÷ number of times this weekday appeared in the month (NOT ÷ number of transactions)
- `percentage` is calculated relative to the month's total for this currency
- When multiple currencies exist and "All" is selected in frontend, percentage is calculated treating all amounts as equal units

**Calculation Example**:
```
November 2025 has 4 Mondays and 5 Tuesdays
Monday USD expenses: $40, $60, $30, $70 (4 transactions across 4 Mondays)
  totalAmount = $200
  averageAmount = $200 ÷ 4 Mondays = $50 per Monday
  percentage = ($200 ÷ $monthTotal) × 100
```

#### WeekdayReportCurrencyTotal
**Lifecycle**: Computed as part of WeekdayReport
**Scope**: Single currency for entire month

```typescript
interface WeekdayReportCurrencyTotal {
  currency: string;      // ISO 4217 currency code
  totalAmount: number;   // Sum of all expenses in this currency for the month
}
```

**Business Rules**:
- Used to calculate percentages in `WeekdayReportCurrencyBreakdown`
- One entry per currency found in the month's expenses
- Sorted alphabetically by currency code

## Data Relationships

```
WeekdayReport
├── weekdays: WeekdayReportDay[]
│   └── currencyBreakdowns: WeekdayReportCurrencyBreakdown[]
│       ├── currency (foreign reference to currencyTotals)
│       ├── totalAmount (aggregated from Transactions)
│       ├── averageAmount (calculated: totalAmount ÷ weekday occurrences)
│       └── percentage (calculated: totalAmount ÷ currencyTotal.totalAmount × 100)
└── currencyTotals: WeekdayReportCurrencyTotal[]
    ├── currency
    └── totalAmount (sum of all weekday totals for this currency)
```

## Aggregation Algorithm

### Phase 1: Fetch Source Data
```typescript
const transactions = await transactionRepository.findActiveByMonthAndType(
  userId,
  year,
  month,
  TransactionType.EXPENSE
);
```

### Phase 2: Calculate Currency Totals
```typescript
const currencyTotals = new Map<string, number>();
for (const transaction of transactions) {
  const current = currencyTotals.get(transaction.currency) || 0;
  currencyTotals.set(transaction.currency, current + transaction.amount);
}
```

### Phase 3: Group by Weekday and Currency
```typescript
const weekdayGroups = new Map<number, Map<string, Transaction[]>>();
// Map<weekdayIndex, Map<currency, transactions[]>>

for (const transaction of transactions) {
  const weekdayIndex = getWeekdayIndex(transaction.date); // 0-6
  const weekdayMap = weekdayGroups.get(weekdayIndex) || new Map();
  const currencyTransactions = weekdayMap.get(transaction.currency) || [];
  currencyTransactions.push(transaction);
  weekdayMap.set(transaction.currency, currencyTransactions);
  weekdayGroups.set(weekdayIndex, weekdayMap);
}
```

### Phase 4: Calculate Weekday Occurrences
```typescript
function countWeekdayOccurrences(year: number, month: number, weekdayIndex: number): number {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let count = 0;

  for (let day = firstDay; day <= lastDay; day.setDate(day.getDate() + 1)) {
    if (getWeekdayIndex(day.toISOString()) === weekdayIndex) {
      count++;
    }
  }

  return count;
}
```

### Phase 5: Build Response
```typescript
const weekdays: WeekdayReportDay[] = [];

for (let weekdayIndex = 0; weekdayIndex < 7; weekdayIndex++) {
  const currencyMap = weekdayGroups.get(weekdayIndex) || new Map();
  const occurrences = countWeekdayOccurrences(year, month, weekdayIndex);
  const currencyBreakdowns: WeekdayReportCurrencyBreakdown[] = [];

  for (const [currency, transactions] of currencyMap) {
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageAmount = totalAmount / occurrences;
    const currencyTotal = currencyTotals.get(currency) || 0;
    const percentage = currencyTotal > 0
      ? Math.round((totalAmount / currencyTotal) * 100)
      : 0;

    currencyBreakdowns.push({
      currency,
      totalAmount,
      averageAmount,
      percentage
    });
  }

  // Sort by currency for consistency
  currencyBreakdowns.sort((a, b) => a.currency.localeCompare(b.currency));

  weekdays.push({
    weekday: weekdayIndex,
    currencyBreakdowns
  });
}

return {
  year,
  month,
  weekdays,
  currencyTotals: Array.from(currencyTotals.entries())
    .map(([currency, totalAmount]) => ({ currency, totalAmount }))
    .sort((a, b) => a.currency.localeCompare(b.currency))
};
```

## Validation Rules

### Input Validation (GraphQL Resolver Layer)

```typescript
const weekdayReportInputSchema = z.object({
  year: z.number().int()
    .min(currentYear - YEAR_RANGE_OFFSET)
    .max(currentYear + YEAR_RANGE_OFFSET),
  month: z.number().int().min(1).max(12),
  type: z.enum([TransactionType.EXPENSE])  // Currently only EXPENSE supported
});
```

**Constraints**:
- `year`: Must be within ±10 years of current year (YEAR_RANGE_OFFSET = 10)
- `month`: Must be 1-12
- `type`: Must be EXPENSE (validates at resolver level even though frontend only requests EXPENSE)

### Business Logic Validation (Service Layer)

No additional validation required. Service layer uses validated inputs from resolver and existing repository methods that enforce:
- User data isolation (all queries scoped to authenticated userId)
- Soft-deletion (only non-archived transactions included)
- Type filtering (only EXPENSE transactions queried)

## State Transitions

Not applicable - all data is computed on-demand. No persistent state changes.

## Data Volume Estimates

**Typical Monthly Transaction Count**: 50-200 expenses per user
**Typical Currency Count**: 1-3 currencies per user
**Response Payload Size**:
- 7 weekdays × 3 currencies × ~60 bytes = ~1.2 KB
- Total response with metadata: ~1-2 KB

**Performance Implications**:
- Backend aggregation: O(n) where n = monthly transactions (< 1ms for typical volumes)
- Frontend rendering: 7 weekdays × 2 bars = 14 Chart.js elements (< 50ms render time)
- Well within performance requirements (3s initial load, 2s navigation)

## Edge Cases

### Empty Month
**Scenario**: User has no expenses for selected month
**Behavior**:
```typescript
{
  year: 2025,
  month: 11,
  weekdays: [],  // Empty array
  currencyTotals: []  // Empty array
}
```
**Frontend Handling**: Display empty state message, hide chart

### Partial Week Coverage
**Scenario**: November 2025 has 4 Mondays but 5 Tuesdays
**Behavior**: Each weekday calculates its own occurrence count independently
- Monday average = total ÷ 4
- Tuesday average = total ÷ 5

### Single Transaction
**Scenario**: Only one expense on one Monday in the entire month
**Behavior**:
- totalAmount = transaction amount
- averageAmount = totalAmount ÷ 4 (if 4 Mondays in month)
- percentage = 100% (only expense in month)

### Zero Expenses on Specific Weekday
**Scenario**: User has expenses on Mon, Tue, Wed but not Thu-Sun
**Behavior**:
- Thu-Sun weekdays have empty `currencyBreakdowns` arrays
- Frontend displays zero-height bars with "$0" tooltips

### Multiple Currencies
**Scenario**: User has expenses in USD and EUR
**Behavior**:
```typescript
weekdays: [
  {
    weekday: 0,  // Monday
    currencyBreakdowns: [
      { currency: "EUR", totalAmount: 50, averageAmount: 12.5, percentage: 25 },
      { currency: "USD", totalAmount: 100, averageAmount: 25, percentage: 33 }
    ]
  }
]
```
**Frontend Handling**:
- Currency selector shows "All", "EUR", "USD" options
- When "All" selected: sum EUR and USD amounts without conversion
- When "EUR" selected: show only EUR data
- When "USD" selected: show only USD data

## Integration Points

### Backend
- **Input**: GraphQL query parameters (year, month, type)
- **Source**: TransactionRepository.findActiveByMonthAndType()
- **Output**: WeekdayReport object via GraphQL response

### Frontend
- **Input**: User selection (year, month, currency filter)
- **Query**: GraphQL weekdayReport query via useWeekdayReport composable
- **Processing**: Chart.js transforms data into visual representation
- **Output**: Interactive bar chart with tooltips and currency selector
