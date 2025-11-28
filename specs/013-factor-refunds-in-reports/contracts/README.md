# API Contracts: Factor Refunds in Expense Reports

**Feature**: [../spec.md](../spec.md)
**Research**: [../research.md](../research.md)
**Date**: 2025-11-28

## Overview

This feature **does not require GraphQL schema changes**. All modifications are behavioral (computational changes to returned values).

## GraphQL Schema (Unchanged)

### Query

```graphql
type Query {
  """
  Fetch monthly report aggregated by category for a given month and transaction type.

  BEHAVIORAL CHANGE (this feature):
  - When type = EXPENSE, the report now factors in REFUND transactions
  - totalAmount = sum(EXPENSE) - sum(REFUND) per category + currency
  - Percentages calculated on net amounts
  - Negative amounts possible when refunds > expenses
  """
  monthlyReport(year: Int!, month: Int!, type: TransactionType!): MonthlyReport!
}
```

**Source**: [backend/src/schema.graphql:11](../../backend/src/schema.graphql#L11)

### Types

```graphql
"""
Monthly report aggregated by category.
Schema unchanged - values computed differently for EXPENSE type.
"""
type MonthlyReport {
  year: Int!
  month: Int!
  type: TransactionType!
  categories: [MonthlyReportCategory!]!
  currencyTotals: [MonthlyReportCurrencyTotal!]!
}

"""
Category breakdown within a monthly report.
Schema unchanged - totalAmount now represents net amount (expenses - refunds).
"""
type MonthlyReportCategory {
  categoryId: ID                                    # null for uncategorized
  categoryName: String!                             # "Uncategorized" if categoryId is null
  currencyBreakdowns: [MonthlyReportCurrencyBreakdown!]!
}

"""
Currency breakdown for a category.
BEHAVIORAL CHANGE: totalAmount now represents NET amount (expenses - refunds).
"""
type MonthlyReportCurrencyBreakdown {
  currency: String!
  totalAmount: Float!                               # Can be negative (when refunds > expenses)
  percentage: Int!                                   # Can be negative, based on net amounts
}

"""
Currency totals across all categories.
BEHAVIORAL CHANGE: totalAmount now represents NET total (expenses - refunds).
"""
type MonthlyReportCurrencyTotal {
  currency: String!
  totalAmount: Float!                               # Can be negative (when refunds > expenses)
}
```

**Source**: [backend/src/schema.graphql:215-238](../../backend/src/schema.graphql#L215-L238)

## Contract Changes

### Breaking Changes
**None** - schema remains identical

### Non-Breaking Behavioral Changes

#### Change 1: Net Amount Calculation for EXPENSE Reports

**Before**:
```
Request:  monthlyReport(year: 2025, month: 11, type: EXPENSE)
Response: totalAmount = sum of all EXPENSE transactions
```

**After**:
```
Request:  monthlyReport(year: 2025, month: 11, type: EXPENSE)
Response: totalAmount = sum(EXPENSE) - sum(REFUND) transactions
```

**Impact**:
- Clients receive different values for same query parameters
- Values more accurately represent net spending
- Existing clients automatically receive corrected data (no code changes needed)

#### Change 2: Negative Values Now Possible

**Before**:
- `totalAmount` always ≥ 0 (sum of positive amounts)
- `percentage` always ≥ 0

**After**:
- `totalAmount` can be < 0 (when refunds > expenses)
- `percentage` can be < 0 (based on negative net amounts)

**Example**:
```json
{
  "categoryName": "Travel",
  "currencyBreakdowns": [
    {
      "currency": "EUR",
      "totalAmount": -300,    // Only refunds, no expenses
      "percentage": -15       // Negative percentage
    }
  ]
}
```

**Impact**:
- Frontend must handle negative values gracefully (display with minus sign)
- Existing UI likely already handles this (no known constraints)

#### Change 3: INCOME Reports Unchanged

**Behavior**:
- When `type = INCOME`, behavior remains unchanged
- Only INCOME transactions fetched (no refund factoring)
- All values remain positive

## Request/Response Examples

### Example 1: Standard Case (Expenses > Refunds)

**Request**:
```graphql
query {
  monthlyReport(year: 2025, month: 11, type: EXPENSE) {
    year
    month
    type
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

**Data**:
- Clothes: €1000 expenses, €200 refunds
- Food: €500 expenses, €0 refunds
- Total: €1500 expenses, €200 refunds

**Response** (After this feature):
```json
{
  "data": {
    "monthlyReport": {
      "year": 2025,
      "month": 11,
      "type": "EXPENSE",
      "categories": [
        {
          "categoryName": "Clothes",
          "currencyBreakdowns": [
            {
              "currency": "EUR",
              "totalAmount": 800,        // 1000 - 200
              "percentage": 62           // 800 / 1300 * 100
            }
          ]
        },
        {
          "categoryName": "Food",
          "currencyBreakdowns": [
            {
              "currency": "EUR",
              "totalAmount": 500,        // 500 - 0
              "percentage": 38           // 500 / 1300 * 100
            }
          ]
        }
      ],
      "currencyTotals": [
        {
          "currency": "EUR",
          "totalAmount": 1300          // (1000 + 500) - 200
        }
      ]
    }
  }
}
```

**Before this feature** (for comparison):
- Clothes totalAmount: 1000 (refunds ignored)
- Food totalAmount: 500
- Currency total: 1500

### Example 2: Refunds Exceed Expenses (Negative Net)

**Data**:
- Travel: €0 expenses, €300 refunds
- Food: €500 expenses, €0 refunds
- Total: €500 expenses, €300 refunds

**Response**:
```json
{
  "data": {
    "monthlyReport": {
      "year": 2025,
      "month": 11,
      "type": "EXPENSE",
      "categories": [
        {
          "categoryName": "Food",
          "currencyBreakdowns": [
            {
              "currency": "EUR",
              "totalAmount": 500,
              "percentage": 250          // 500 / 200 * 100 (can exceed 100%)
            }
          ]
        },
        {
          "categoryName": "Travel",
          "currencyBreakdowns": [
            {
              "currency": "EUR",
              "totalAmount": -300,       // NEGATIVE (only refunds)
              "percentage": -150         // -300 / 200 * 100
            }
          ]
        }
      ],
      "currencyTotals": [
        {
          "currency": "EUR",
          "totalAmount": 200           // 500 - 300
        }
      ]
    }
  }
}
```

### Example 3: No Data

**Data**: No transactions for the month

**Response** (Unchanged):
```json
{
  "data": {
    "monthlyReport": {
      "year": 2025,
      "month": 11,
      "type": "EXPENSE",
      "categories": [],
      "currencyTotals": []
    }
  }
}
```

### Example 4: Multiple Currencies

**Data**:
- Clothes (EUR): €1000 expenses, €200 refunds
- Clothes (USD): $500 expenses, $100 refunds
- Food (EUR): €300 expenses, €0 refunds

**Response**:
```json
{
  "data": {
    "monthlyReport": {
      "year": 2025,
      "month": 11,
      "type": "EXPENSE",
      "categories": [
        {
          "categoryName": "Clothes",
          "currencyBreakdowns": [
            {
              "currency": "EUR",
              "totalAmount": 800,        // 1000 - 200
              "percentage": 73           // 800 / 1100 EUR total
            },
            {
              "currency": "USD",
              "totalAmount": 400,        // 500 - 100
              "percentage": 100          // 400 / 400 USD total
            }
          ]
        },
        {
          "categoryName": "Food",
          "currencyBreakdowns": [
            {
              "currency": "EUR",
              "totalAmount": 300,
              "percentage": 27           // 300 / 1100 EUR total
            }
          ]
        }
      ],
      "currencyTotals": [
        {
          "currency": "EUR",
          "totalAmount": 1100          // (1000 + 300) - 200
        },
        {
          "currency": "USD",
          "totalAmount": 400           // 500 - 100
        }
      ]
    }
  }
}
```

## Error Handling

**No changes** - existing error handling applies:

### Validation Errors (400 Bad Request)
```json
{
  "errors": [
    {
      "message": "Expected number, received string",
      "extensions": { "code": "BAD_USER_INPUT" }
    }
  ]
}
```

**Validation rules** (unchanged):
- `year`: integer, within ±10 years of current year
- `month`: integer, 1-12
- `type`: must be INCOME or EXPENSE (REFUND not accepted as query parameter)

### Authentication Errors (401 Unauthorized)
```json
{
  "errors": [
    {
      "message": "Not authenticated",
      "extensions": { "code": "UNAUTHENTICATED" }
    }
  ]
}
```

### Server Errors (500 Internal Server Error)
```json
{
  "errors": [
    {
      "message": "Failed to fetch monthly report",
      "extensions": { "code": "INTERNAL_SERVER_ERROR" }
    }
  ]
}
```

## Client Migration Guide

### Required Changes
**None** - schema unchanged, clients continue to work

### Recommended Changes

#### 1. Handle Negative Values

**Before** (may not handle negatives):
```typescript
// Frontend display logic
const displayAmount = Math.abs(breakdown.totalAmount); // Always positive
```

**After** (handle negatives gracefully):
```typescript
// Frontend display logic
const displayAmount = breakdown.totalAmount; // Can be negative
const formattedAmount = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: breakdown.currency
}).format(displayAmount); // Automatically adds minus sign if negative
```

#### 2. Update Documentation/Help Text

**Example**:
```
Old: "View your total expenses by category"
New: "View your net expenses (expenses minus refunds) by category"
```

#### 3. Handle Edge Case UI

**Categories with negative totals**:
- Consider styling (e.g., red text for negatives)
- Add tooltip: "Refunds exceeded expenses this month"

## Backward Compatibility

### Client Compatibility
✅ **Fully backward compatible**
- Existing clients receive updated values automatically
- No client code changes required
- GraphQL schema unchanged (no breaking changes)

### API Versioning
**Not required** - behavioral change aligns with user expectations (more accurate data)

## Testing Contracts

### GraphQL Query Tests

**Test Case 1**: Verify net calculation
```graphql
# Given: €1000 expenses, €200 refunds in "Clothes" category
# When: Query monthlyReport for EXPENSE type
# Then: Expect totalAmount = 800 for "Clothes"
```

**Test Case 2**: Verify negative amounts
```graphql
# Given: €0 expenses, €300 refunds in "Travel" category
# When: Query monthlyReport for EXPENSE type
# Then: Expect totalAmount = -300 for "Travel"
```

**Test Case 3**: Verify INCOME unchanged
```graphql
# Given: €500 income, €0 refunds (wrong type for income)
# When: Query monthlyReport for INCOME type
# Then: Expect totalAmount = 500 (no refund factoring)
```

**Test Case 4**: Verify percentage calculation
```graphql
# Given: Category A = €800 net, Category B = €200 net, Total = €1000
# When: Query monthlyReport for EXPENSE type
# Then: Expect Category A percentage = 80, Category B percentage = 20
```

## Implementation Notes

### Backend Changes Only

**Files Modified**:
1. `backend/src/models/Transaction.ts` - rename interface method `findActiveByMonthAndType` → `findActiveByMonthAndTypes`
2. `backend/src/repositories/TransactionRepository.ts` - rename and update implementation
3. `backend/src/services/MonthlyByCategoryReportService.ts` - update to use refactored method, implement single-pass net calculation
4. `backend/src/services/MonthlyByWeekdayReportService.ts` - update to use refactored method (pass array)
5. All test files - update method calls to use array syntax

**Files Unchanged**:
- `backend/src/schema.graphql` - no schema changes
- `backend/src/resolvers/reportResolvers.ts` - no resolver changes (validation unchanged)
- `frontend/src/**` - no frontend changes (displays API data as-is)

### Code Generation

**After backend changes**:
```bash
cd backend
npm run codegen  # Regenerate TypeScript types (no changes expected)
```

**Frontend sync** (optional, no changes expected):
```bash
cd frontend
npm run codegen:sync-schema  # Sync schema from backend
npm run codegen              # Regenerate composables
```

## Summary

**Contract Status**: ✅ **Stable** - No breaking changes

**Key Points**:
1. GraphQL schema unchanged
2. Behavioral change: EXPENSE reports now factor in refunds
3. Values can be negative (new capability)
4. Fully backward compatible
5. Clients automatically receive corrected data
6. No client code changes required (recommended for negative value handling)

**Next Steps**: Proceed to implementation ([../quickstart.md](../quickstart.md))
