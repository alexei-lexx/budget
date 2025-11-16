# Data Model: Monthly Expense Report by Weekday

**Phase**: 1 (Design & Contracts)
**Date**: 2025-11-15

## Overview

This document defines the data structures for weekday expense aggregation. The feature does not introduce new database entities but creates computed aggregations from existing Transaction records.

## Domain Model

### Existing Entities (Reused)

#### Transaction
**Source**: DynamoDB `Transactions` table via `TransactionRepository`
**Lifecycle**: Managed by existing CRUD operations
**Soft-deletion**: Supports `isArchived` flag

```typescript
interface Transaction {
  id: string                    // UUID
  userId: string                // Internal user ID (partition key)
  accountId: string             // Account UUID
  categoryId?: string           // Category UUID (nullable for uncategorized)
  type: TransactionType         // INCOME | EXPENSE | TRANSFER_IN | TRANSFER_OUT
  amount: number                // Positive number
  currency: string              // ISO currency code (e.g., "USD", "EUR")
  date: string                  // ISO date string (YYYY-MM-DD)
  description?: string          // Optional text
  transferId?: string           // Links paired transfer transactions
  isArchived: boolean           // Soft-deletion flag
  createdAt: string             // ISO timestamp
  updatedAt: string             // ISO timestamp
}

enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT'
}
```

**Query Pattern**: MonthlyByWeekdayReportService uses TransactionRepository to fetch expense transactions for a given month/year:
```typescript
const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`

const transactions = await transactionRepository.getTransactionsByDateRange(
  userId,
  startDate,
  endDate,
  { type: TransactionType.EXPENSE } // Filter to expenses only
)
```

### Computed Entities (New)

#### Weekday
**Lifecycle**: Enum value, not persisted
**Purpose**: Type-safe representation of days of week

```typescript
enum Weekday {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN'
}

// Mapping from Date.getDay() to Weekday enum
const WEEKDAY_MAP: Record<number, Weekday> = {
  0: Weekday.SUN,
  1: Weekday.MON,
  2: Weekday.TUE,
  3: Weekday.WED,
  4: Weekday.THU,
  5: Weekday.FRI,
  6: Weekday.SAT
}
```

#### MonthlyWeekdayReportCurrencyBreakdown
**Lifecycle**: Computed per GraphQL query
**Source**: Aggregated from Transaction records
**Purpose**: Represents total and average spending for a specific weekday in a specific currency

```typescript
interface MonthlyWeekdayReportCurrencyBreakdown {
  currency: string          // ISO currency code (e.g., "USD")
  totalAmount: number       // Sum of all expense amounts for this weekday + currency
  averageAmount: number     // totalAmount / occurrences (number of dates with this weekday)
  percentage: number        // (totalAmount / currencyTotal) * 100
}
```

**Validation Rules**:
- `currency`: Must be non-empty string
- `totalAmount`: Must be >= 0
- `averageAmount`: Must be >= 0, equals totalAmount / occurrences
- `percentage`: Must be 0-100, sum of all weekday percentages for a currency = 100%

**Calculation Example**:
```
Given:
- Month: November 2025 (4 Mondays, 4 Tuesdays, etc.)
- Expenses on Mondays in USD: $100, $150, $200, $50
- Total USD expenses for month: $2000

Calculated:
- totalAmount: $500 (sum of Monday expenses)
- averageAmount: $125 ($500 / 4 Mondays)
- percentage: 25 ($500 / $2000 * 100)
```

#### MonthlyWeekdayReportDay
**Lifecycle**: Computed per GraphQL query
**Source**: Aggregated from Transaction records grouped by weekday
**Purpose**: Container for all currency breakdowns for a specific weekday

```typescript
interface MonthlyWeekdayReportDay {
  weekday: Weekday                                      // MON, TUE, WED, etc.
  currencyBreakdowns: MonthlyWeekdayReportCurrencyBreakdown[]  // One per currency
}
```

**Validation Rules**:
- `weekday`: Must be valid Weekday enum value
- `currencyBreakdowns`: Non-empty array (at least one currency if weekday appears)

**State Transitions**: None (computed on-demand)

#### MonthlyWeekdayReportCurrencyTotal
**Lifecycle**: Computed per GraphQL query
**Source**: Aggregated from all Transaction records for the month
**Purpose**: Provides denominator for percentage calculations

```typescript
interface MonthlyWeekdayReportCurrencyTotal {
  currency: string          // ISO currency code
  totalAmount: number       // Sum of all expense amounts for this currency in the month
}
```

**Validation Rules**:
- `currency`: Must match currency from currencyBreakdowns
- `totalAmount`: Must equal sum of all weekday totalAmounts for this currency

#### MonthlyWeekdayReport
**Lifecycle**: Computed per GraphQL query
**Source**: Root aggregation object returned by MonthlyByWeekdayReportService
**Purpose**: Top-level response containing all weekday data and metadata

```typescript
interface MonthlyWeekdayReport {
  year: number                                      // 4-digit year (e.g., 2025)
  month: number                                     // 1-12
  type: TransactionType                             // Always EXPENSE for this feature
  weekdays: MonthlyWeekdayReportDay[]               // 0-7 elements (only weekdays with data)
  currencyTotals: MonthlyWeekdayReportCurrencyTotal[]  // One per currency
}
```

**Validation Rules**:
- `year`: Valid 4-digit year (1900-2100)
- `month`: Valid month (1-12)
- `type`: Must be EXPENSE (per spec requirement FR-025)
- `weekdays`: Array of 0-7 elements, sorted Monday to Sunday
- `currencyTotals`: Non-empty array if any expenses exist

**Invariants**:
- If `weekdays` is empty, `currencyTotals` must be empty
- All weekdays in `weekdays` array must have matching currencies in `currencyTotals`
- Sum of all `percentage` values across weekdays for a given currency must equal 100%

## Service Layer Logic

### MonthlyByWeekdayReportService

**Responsibility**: Aggregate transaction data into weekday-based report

```typescript
class MonthlyByWeekdayReportService {
  constructor(private transactionRepository: ITransactionRepository) {}

  async getWeekdayReport(
    userId: string,
    year: number,
    month: number,
    type: TransactionType
  ): Promise<MonthlyWeekdayReport> {
    // 1. Validate inputs
    // 2. Calculate date range for month
    // 3. Fetch transactions from repository
    // 4. Group by weekday and currency
    // 5. Calculate totals, averages, percentages
    // 6. Return aggregated report
  }

  private calculateWeekday(dateString: string): Weekday {
    const date = new Date(dateString)
    const dayIndex = date.getDay() // 0=Sunday, 6=Saturday
    return WEEKDAY_MAP[dayIndex]
  }

  private calculateOccurrences(year: number, month: number, weekday: Weekday): number {
    // Count how many times this weekday appears in the month
    // Used for average calculation: averageAmount = totalAmount / occurrences
  }

  private calculatePercentage(weekdayTotal: number, currencyTotal: number): number {
    if (currencyTotal === 0) return 0
    return Math.round((weekdayTotal / currencyTotal) * 100)
  }
}
```

### Algorithm Pseudocode

```
FUNCTION getWeekdayReport(userId, year, month, type):
  // Step 1: Fetch transactions
  startDate = buildStartDate(year, month)
  endDate = buildEndDate(year, month)
  transactions = transactionRepository.getByDateRange(userId, startDate, endDate, { type: EXPENSE })

  // Step 2: Group by weekday and currency
  weekdayMap = new Map<Weekday, Map<Currency, Transaction[]>>()
  FOR EACH transaction IN transactions:
    weekday = calculateWeekday(transaction.date)
    currency = transaction.currency
    weekdayMap[weekday][currency].push(transaction)

  // Step 3: Calculate currency totals
  currencyTotals = new Map<Currency, number>()
  FOR EACH transaction IN transactions:
    currencyTotals[transaction.currency] += transaction.amount

  // Step 4: Build weekday breakdowns
  weekdays = []
  FOR EACH weekday IN weekdayMap:
    currencyBreakdowns = []
    FOR EACH currency IN weekdayMap[weekday]:
      transactions = weekdayMap[weekday][currency]
      totalAmount = SUM(transactions.map(t => t.amount))
      occurrences = calculateOccurrences(year, month, weekday)
      averageAmount = totalAmount / occurrences
      percentage = calculatePercentage(totalAmount, currencyTotals[currency])

      currencyBreakdowns.push({
        currency,
        totalAmount,
        averageAmount,
        percentage
      })

    weekdays.push({ weekday, currencyBreakdowns })

  // Step 5: Build currency totals array
  currencyTotalsArray = currencyTotals.map(([currency, totalAmount]) => ({
    currency,
    totalAmount
  }))

  // Step 6: Return report
  RETURN {
    year,
    month,
    type,
    weekdays,
    currencyTotals: currencyTotalsArray
  }
```

## Frontend Data Transformation

### Chart.js Data Structure

The frontend transforms the GraphQL response into Chart.js format:

```typescript
interface ChartData {
  labels: string[]                  // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  datasets: ChartDataset[]
}

interface ChartDataset {
  label: string                     // 'Total' or 'Average'
  data: number[]                    // 7 elements, one per weekday (or 0 if no data)
  backgroundColor: string           // Dark blue (#1976D2) or light blue (#64B5F6)
}

// Transformation logic
function transformToChartData(
  report: MonthlyWeekdayReport,
  selectedCurrency: string | 'All'
): ChartData {
  const weekdayOrder = [Weekday.MON, Weekday.TUE, Weekday.WED, Weekday.THU, Weekday.FRI, Weekday.SAT, Weekday.SUN]
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const totalData = weekdayOrder.map(wd => {
    const day = report.weekdays.find(d => d.weekday === wd)
    if (!day) return 0

    if (selectedCurrency === 'All') {
      return day.currencyBreakdowns.reduce((sum, cb) => sum + cb.totalAmount, 0)
    } else {
      const breakdown = day.currencyBreakdowns.find(cb => cb.currency === selectedCurrency)
      return breakdown?.totalAmount ?? 0
    }
  })

  const averageData = weekdayOrder.map(wd => {
    const day = report.weekdays.find(d => d.weekday === wd)
    if (!day) return 0

    if (selectedCurrency === 'All') {
      return day.currencyBreakdowns.reduce((sum, cb) => sum + cb.averageAmount, 0)
    } else {
      const breakdown = day.currencyBreakdowns.find(cb => cb.currency === selectedCurrency)
      return breakdown?.averageAmount ?? 0
    }
  })

  return {
    labels,
    datasets: [
      { label: 'Total', data: totalData, backgroundColor: '#1976D2' },
      { label: 'Average', data: averageData, backgroundColor: '#64B5F6' }
    ]
  }
}
```

## Edge Cases

### 1. No expenses for month
**Response**: Empty arrays
```typescript
{
  year: 2025,
  month: 11,
  type: 'EXPENSE',
  weekdays: [],
  currencyTotals: []
}
```
**Frontend**: Display empty state message

### 2. Month with missing weekdays
**Example**: February 2025 (28 days) starts on Saturday
- May have only 4 Mondays-Thursdays, 4 Fridays-Sundays
**Response**: Only include weekdays present in the month
```typescript
{
  weekdays: [
    { weekday: 'MON', currencyBreakdowns: [...] },  // 4 occurrences
    { weekday: 'TUE', currencyBreakdowns: [...] },  // 4 occurrences
    // ... all 7 weekdays present in this example
  ]
}
```

### 3. Single occurrence of weekday
**Example**: 5th Monday in a month with only one Monday
**Calculation**: averageAmount = totalAmount / 1 = totalAmount
**Response**: Average equals total

### 4. Multiple currencies with "All" selection
**Aggregation**: Sum amounts as plain numbers without conversion
```typescript
// User has $100 USD + €50 EUR on Monday
// selectedCurrency = 'All'
// Chart displays: 150 (no currency symbol)
```

### 5. Zero expenses for specific weekday
**Response**: Weekday not included in `weekdays` array
**Frontend**: Displays 0-height bar for that weekday

## Summary

This data model leverages existing Transaction entities without introducing new database tables. All aggregation happens in the MonthlyByWeekdayReportService, ensuring separation of concerns and testability. The GraphQL schema provides strong typing and consistency with existing report patterns.
