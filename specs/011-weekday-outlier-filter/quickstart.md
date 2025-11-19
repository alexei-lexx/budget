# Quickstart Guide: Weekday Expense Report Outlier Filtering

**Feature**: 011-weekday-outlier-filter
**Date**: 2025-11-19
**Phase**: 1 (Design & Contracts)

## Overview

This guide helps developers quickly understand and implement the weekday expense report outlier filtering feature.

## What You're Building

Add a checkbox to the weekday expense report that filters out statistical outliers (like rent payments) to show typical daily spending patterns. The backend calculates outliers using the IQR method; the frontend displays results in an existing bar chart with outlier info in tooltips.

## Prerequisites

- Familiarity with GraphQL schema-driven development workflow
- Understanding of TypeScript, Apollo Server (backend), Vue 3 (frontend)
- Access to local development environment with DynamoDB Local running

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Frontend   │────────▶│   GraphQL    │────────▶│  Service    │
│  Checkbox   │         │   Resolver   │         │  (IQR Calc) │
│  (Vue)      │◀────────│  (Backend)   │◀────────│             │
└─────────────┘         └──────────────┘         └─────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────┐
                                              │  Repository     │
                                              │  (Transactions) │
                                              └─────────────────┘
```

## Development Workflow

### Step 1: Update GraphQL Schema (Backend)

**File**: `backend/src/schema.graphql`

**Location**: Find the existing `monthlyWeekdayReport` query (around line 11)

**Changes**:
```graphql
type Query {
  monthlyWeekdayReport(
    year: Int!
    month: Int!
    type: TransactionType!
    excludeOutliers: Boolean = false  # ADD THIS PARAMETER
  ): MonthlyWeekdayReport!
}

type MonthlyWeekdayReportCurrencyBreakdown {
  currency: String!
  totalAmount: Float!
  averageAmount: Float!
  percentage: Int!
  outlierCount: Int            # ADD THIS FIELD
  outlierTotalAmount: Float    # ADD THIS FIELD
}
```

**Generate Types**:
```bash
cd backend
npm run codegen
```

### Step 2: Implement IQR Utility Functions (Backend)

**File**: `backend/src/utils/statistics.ts` (CREATE NEW)

**Implementation**:
```typescript
/**
 * Calculate percentile value from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Identify outliers using IQR method
 * Returns arrays of normal and outlier transaction amounts
 */
export function calculateOutliers(amounts: number[]): {
  normal: number[];
  outliers: number[];
  threshold: number;
} {
  if (amounts.length < 4) {
    return { normal: amounts, outliers: [], threshold: Infinity };
  }

  const sorted = [...amounts].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const threshold = q3 + 1.5 * iqr;

  return {
    normal: amounts.filter(x => x <= threshold),
    outliers: amounts.filter(x => x > threshold),
    threshold
  };
}
```

**Test File**: `backend/src/utils/statistics.test.ts`

```typescript
import { calculateOutliers } from './statistics';

describe('calculateOutliers', () => {
  it('should return all as normal when count < 4', () => {
    const result = calculateOutliers([10, 20, 30]);
    expect(result.normal).toEqual([10, 20, 30]);
    expect(result.outliers).toEqual([]);
  });

  it('should identify outliers using IQR method', () => {
    const amounts = [10, 12, 14, 15, 16, 18, 100]; // 100 is outlier
    const result = calculateOutliers(amounts);
    expect(result.outliers).toContain(100);
    expect(result.normal).not.toContain(100);
  });

  it('should handle all similar values (no outliers)', () => {
    const result = calculateOutliers([10, 10, 10, 10]);
    expect(result.outliers).toEqual([]);
    expect(result.normal).toEqual([10, 10, 10, 10]);
  });
});
```

### Step 3: Update Service Layer (Backend)

**File**: `backend/src/services/MonthlyByWeekdayReportService.ts` (UPDATE EXISTING)

**Key Changes**:
```typescript
import { calculateOutliers } from '../utils/statistics';

interface MonthlyWeekdayReportCurrencyBreakdown {
  currency: string;
  totalAmount: number;
  averageAmount: number;
  percentage: number;
  outlierCount?: number;
  outlierTotalAmount?: number;
}

export class MonthlyByWeekdayReportService {
  async getMonthlyWeekdayReport(
    userId: string,
    year: number,
    month: number,
    type: TransactionType,
    excludeOutliers: boolean = false
  ): Promise<MonthlyWeekdayReport> {
    // 1. Fetch transactions for the specified month
    const transactions = await this.transactionRepository.findByMonth(
      userId, year, month,
      { type, isArchived: false }
    );

    // 2. Group by weekday and currency
    const grouped = this.groupByWeekdayAndCurrency(transactions);

    // 3. Calculate currency breakdowns with optional outlier filtering
    const weekdays = grouped.map(weekdayGroup => {
      const currencyBreakdowns = weekdayGroup.currencies.map(currencyGroup => {
        const amounts = currencyGroup.transactions.map(t => t.amount);

        if (!excludeOutliers) {
          // No filtering: return all transactions
          return {
            currency: currencyGroup.currency,
            totalAmount: sum(amounts),
            averageAmount: average(amounts),
            percentage: currencyGroup.percentage
          };
        }

        // Apply outlier filtering
        const { normal, outliers } = calculateOutliers(amounts);

        const breakdown: MonthlyWeekdayReportCurrencyBreakdown = {
          currency: currencyGroup.currency,
          totalAmount: sum(normal),
          averageAmount: average(normal),
          percentage: currencyGroup.percentage
        };

        // Add outlier info only if outliers detected
        if (outliers.length > 0) {
          breakdown.outlierCount = outliers.length;
          breakdown.outlierTotalAmount = sum(outliers);
        }

        return breakdown;
      });

      return {
        weekday: weekdayGroup.weekday,
        currencyBreakdowns
      };
    });

    return {
      year,
      month,
      type,
      weekdays,
      currencyTotals: this.calculateCurrencyTotals(transactions)
    };
  }
}
```

### Step 4: Update Resolver (Backend)

**File**: `backend/src/resolvers/monthlyByWeekdayReportResolver.ts` (UPDATE EXISTING)

**Changes**:
```typescript
import { z } from 'zod';

const monthlyWeekdayReportInputSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  type: z.enum(['INCOME', 'EXPENSE']),
  excludeOutliers: z.boolean().optional().default(false)
});

export const monthlyWeekdayReportResolvers = {
  Query: {
    monthlyWeekdayReport: async (
      _parent: unknown,
      args: unknown,
      context: GraphQLContext
    ) => {
      requireAuthentication(context);
      const { year, month, type, excludeOutliers } =
        monthlyWeekdayReportInputSchema.parse(args);

      return context.monthlyByWeekdayReportService.getMonthlyWeekdayReport(
        context.auth.userId,
        year,
        month,
        type,
        excludeOutliers
      );
    }
  }
};
```

### Step 5: Sync Schema to Frontend

**Command**:
```bash
cd frontend
npm run codegen:sync-schema  # Copies schema from backend
npm run codegen               # Regenerates typed composables
```

**Verify**: Check `frontend/src/__generated__/vue-apollo.ts` for updated types

### Step 6: Update Frontend GraphQL Query

**File**: `frontend/src/graphql/monthlyWeekdayReport.ts` (UPDATE EXISTING)

**Changes**:
```typescript
import { gql } from '@apollo/client/core';

export const MONTHLY_WEEKDAY_REPORT_QUERY = gql`
  query MonthlyWeekdayReport(
    $year: Int!
    $month: Int!
    $type: TransactionType!
    $excludeOutliers: Boolean
  ) {
    monthlyWeekdayReport(
      year: $year
      month: $month
      type: $type
      excludeOutliers: $excludeOutliers
    ) {
      year
      month
      type
      weekdays {
        weekday
        currencyBreakdowns {
          currency
          totalAmount
          averageAmount
          percentage
          outlierCount
          outlierTotalAmount
        }
      }
      currencyTotals {
        currency
        totalAmount
      }
    }
  }
`;
```

### Step 7: Update Frontend Component

**File**: `frontend/src/components/reports/MonthlyWeekdayExpenseReport.vue` (UPDATE EXISTING)

**Key Changes**:
```vue
<template>
  <div>
    <!-- Add checkbox control -->
    <v-checkbox
      v-model="excludeOutliers"
      label="Exclude outliers from averages"
    />

    <!-- Existing bar chart with updated data -->
    <BarChart :weekdays="reportData.weekdays" />

    <!-- Tooltips with outlier info (within BarChart component or here) -->
    <v-tooltip v-for="day in reportData.weekdays" :key="day.weekday">
      <template v-slot:activator="{ props }">
        <div v-bind="props">{{ day.weekday }}</div>
      </template>
      <div v-for="breakdown in day.currencyBreakdowns" :key="breakdown.currency">
        <div>{{ breakdown.currency }}</div>
        <div>Total: {{ formatCurrency(breakdown.totalAmount, breakdown.currency) }}</div>
        <div>Average: {{ formatCurrency(breakdown.averageAmount, breakdown.currency) }}</div>
        <!-- Show outlier info conditionally -->
        <div v-if="breakdown.outlierCount">
          Outliers: {{ breakdown.outlierCount }}
          ({{ formatCurrency(breakdown.outlierTotalAmount, breakdown.currency) }})
        </div>
      </div>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMonthlyWeekdayReportQuery } from '@/__generated__/vue-apollo';

const excludeOutliers = ref(false); // No persistence, always starts unchecked

const { result, loading, error } = useMonthlyWeekdayReportQuery({
  year: props.year,
  month: props.month,
  type: props.type,
  excludeOutliers // Reactive parameter
});

const reportData = computed(() => result.value?.monthlyWeekdayReport ?? { weekdays: [] });
</script>
```

## Testing Checklist

### Backend Tests

```bash
cd backend
npm test -- MonthlyByWeekdayReportService.test.ts
npm test -- statistics.test.ts
```

**Test Cases**:
- [ ] IQR calculation with normal distribution
- [ ] Edge case: <4 transactions (no filtering)
- [ ] Edge case: All similar values (no outliers)
- [ ] Edge case: All values are outliers
- [ ] Multi-currency handling (separate IQR per currency)
- [ ] excludeOutliers=false returns all transactions with original values
- [ ] excludeOutliers=true excludes high outliers from totals/averages
- [ ] outlierCount/outlierTotalAmount only present when > 0

### Frontend Manual Testing

1. Navigate to monthly weekday expense report
2. Verify checkbox is unchecked by default
3. Enable checkbox, verify bar chart updates (<1 second)
4. Hover over weekday bar, verify tooltip shows outlier info per currency (if any)
5. Navigate away and return, verify checkbox resets to unchecked
6. Test with multi-currency accounts (separate outlier detection per currency breakdown)

## Common Issues

### Issue: Frontend types not updating after schema change

**Solution**:
```bash
cd frontend
npm run codegen:sync-schema
npm run codegen
# Restart dev server
```

### Issue: Backend tests failing with "Cannot find module '@/utils/statistics'"

**Solution**: Ensure TypeScript path aliases are configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Issue: Tooltip not showing outlier info even when outliers exist

**Solution**: Check GraphQL query includes `outlierCount` and `outlierTotalAmount` fields. Verify conditional rendering: `v-if="summary.outlierCount"` (not `v-if="summary.outlierCount > 0"` which would skip when field is absent).

## Performance Considerations

- **Backend**: IQR calculation is O(n log n) due to sorting. For typical volumes (100-1000 transactions/month), this is negligible (<10ms).
- **Frontend**: Checkbox toggle triggers new GraphQL query. Response time <1 second per success criteria.
- **Future Optimization**: Backend could cache outlier calculations if performance becomes an issue.

## Next Steps

After completing implementation:
1. Run `/speckit.tasks` to generate detailed task breakdown
2. Follow test-driven development workflow (write tests first)
3. Submit PR following project git commit conventions

## References

- [IQR Method Documentation](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm)
- [Project Constitution](../../.specify/memory/constitution.md)
- [Feature Spec](./spec.md)
- [Data Model](./data-model.md)
- [GraphQL Schema Changes](./contracts/schema.graphql)
