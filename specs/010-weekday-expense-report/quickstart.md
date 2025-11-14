# Quickstart: Monthly Expense Report by Weekday

**Branch**: `010-weekday-expense-report`
**Estimated Time**: 4-6 hours
**Complexity**: Medium

## Overview

Add weekday expense reporting to the Reports page with backend aggregation and Chart.js visualization.

## Prerequisites

- Familiarity with existing `monthlyReport` query and ReportsService
- Understanding of GraphQL Code Generator workflow
- Chart.js basic knowledge (or willingness to follow examples)

## Implementation Checklist

### Backend (2-3 hours)

- [ ] **Schema First**: Update `backend/src/schema.graphql`
  ```graphql
  extend type Query {
    weekdayReport(year: Int!, month: Int!, type: TransactionType!): WeekdayReport!
  }

  type WeekdayReport { ... }
  type WeekdayReportDay { ... }
  type WeekdayReportCurrencyBreakdown { ... }
  type WeekdayReportCurrencyTotal { ... }
  ```
  See [contracts/schema.graphql](contracts/schema.graphql) for complete schema.

- [ ] **Generate Types**: Run `npm run codegen` in backend directory

- [ ] **Extend ReportsService**: Add method in `backend/src/services/ReportsService.ts`
  ```typescript
  async getWeekdayReport(
    userId: string,
    year: number,
    month: number,
    type: TransactionType
  ): Promise<WeekdayReport>
  ```
  See [data-model.md](data-model.md) for aggregation algorithm.

- [ ] **Add Resolver**: Update `backend/src/resolvers/reportResolvers.ts`
  ```typescript
  Query: {
    weekdayReport: async (_parent, args, context) => {
      // Validate with Zod
      // Call context.reportsService.getWeekdayReport()
      // Return result
    }
  }
  ```
  Follow pattern from existing `monthlyReport` resolver.

- [ ] **Write Tests**: Add tests to `backend/src/services/ReportsService.test.ts`
  - Test single currency aggregation
  - Test multi-currency aggregation
  - Test average calculation
  - Test percentage calculation
  - Test empty month

- [ ] **Verify**: Run `npm test` in backend directory

### Frontend (2-3 hours)

- [ ] **Install Dependencies**: Update `frontend/package.json`
  ```bash
  cd frontend
  npm install chart.js vue-chartjs
  ```

- [ ] **Sync Schema**: Run `npm run codegen:sync-schema` in frontend directory

- [ ] **Create GraphQL Query**: Create `frontend/src/graphql/weekdayReport.ts`
  ```typescript
  import { gql } from '@apollo/client/core';

  export const GET_WEEKDAY_REPORT = gql`
    query GetWeekdayReport($year: Int!, $month: Int!, $type: TransactionType!) {
      weekdayReport(year: $year, month: $month, type: $type) {
        year
        month
        weekdays {
          weekday
          currencyBreakdowns {
            currency
            totalAmount
            averageAmount
            percentage
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

- [ ] **Generate Types**: Run `npm run codegen` in frontend directory

- [ ] **Create Composable**: Create `frontend/src/composables/useWeekdayReport.ts`
  ```typescript
  import { useGetWeekdayReportQuery } from '@/__generated__/vue-apollo';

  export function useWeekdayReport() {
    const getWeekdayReport = (year, month, type) => {
      const { result, loading, error, refetch } = useGetWeekdayReportQuery(
        () => ({ year: unref(year), month: unref(month), type }),
        () => ({ fetchPolicy: 'cache-and-network' })
      );
      // Return computed weekdayReport, loading, error, refetch
    };
    return { getWeekdayReport };
  }
  ```
  Follow pattern from `useMonthlyReports.ts`.

- [ ] **Create Chart Component**: Create `frontend/src/components/reports/WeekdayChart.vue`
  ```vue
  <script setup lang="ts">
  import { Bar } from 'vue-chartjs';
  import { Chart as ChartJS, ... } from 'chart.js';

  ChartJS.register(...);

  const props = defineProps<{
    weekdays: WeekdayReportDay[];
    currencyTotals: WeekdayReportCurrencyTotal[];
    loading: boolean;
    error: string | null;
  }>();

  // Transform data for Chart.js
  // Configure chart options
  // Handle currency filtering
  </script>
  ```
  See [research.md](research.md) for Chart.js configuration examples.

- [ ] **Add Tab Navigation**: Update `frontend/src/views/Reports.vue`
  ```vue
  <template>
    <v-container>
      <!-- Existing month navigation -->
      <v-tabs v-model="selectedTab" @update:modelValue="handleTabChange">
        <v-tab value="category">By Category</v-tab>
        <v-tab value="weekday">By Weekday</v-tab>
      </v-tabs>

      <v-window v-model="selectedTab">
        <v-window-item value="category">
          <CategoryBreakdownTable ... />
        </v-window-item>
        <v-window-item value="weekday">
          <WeekdayChart ... />
        </v-window-item>
      </v-window>
    </v-container>
  </template>
  ```

  Key requirements:
  - Default to "category" tab
  - Update URL on tab change: `?tab=category|weekday&year=X&month=Y`
  - Persist month when switching tabs
  - Initialize from URL on mount

- [ ] **Manual Testing**:
  - Desktop: Chart renders, tooltips work on hover
  - Mobile: Chart responsive (320px min), tooltips persist on tap
  - Multi-currency: Selector appears, filtering works
  - Tab switching: Month persists, URL updates
  - Bookmarking: URL with tab parameter loads correct view

## Quick Reference

### Weekday Index Convention
```
0 = Monday
1 = Tuesday
2 = Wednesday
3 = Thursday
4 = Friday
5 = Saturday
6 = Sunday
```

### Weekday from ISO Date
```typescript
function getWeekdayIndex(isoDateString: string): number {
  const date = new Date(isoDateString);
  return (date.getDay() + 6) % 7;  // Convert Sun=0 to Mon=0
}
```

### Count Weekday Occurrences
```typescript
function countWeekdayOccurrences(year: number, month: number, weekdayIndex: number): number {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let count = 0;

  for (let day = new Date(firstDay); day <= lastDay; day.setDate(day.getDate() + 1)) {
    if (getWeekdayIndex(day.toISOString()) === weekdayIndex) {
      count++;
    }
  }

  return count;
}
```

### Average Calculation
```typescript
// CORRECT: Divide by weekday occurrences in month
averageAmount = totalAmount / countWeekdayOccurrences(year, month, weekdayIndex);

// WRONG: Do NOT divide by number of transactions
averageAmount = totalAmount / transactions.length;  // ❌
```

### Chart.js Dataset Order
```typescript
datasets: [
  { label: 'Total', data: [...], order: 1 },    // Left bar
  { label: 'Average', data: [...], order: 2 }   // Right bar
]
```

### Currency Display Logic
```typescript
// When "All" currencies selected
const displayAmount = amount.toFixed(2);  // No symbol

// When specific currency selected
const displayAmount = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: selectedCurrency
}).format(amount);
```

## Common Pitfalls

1. **Wrong Average Calculation**: Dividing by transaction count instead of weekday occurrences
   - ❌ `total / transactions.length`
   - ✅ `total / countWeekdayOccurrences()`

2. **Weekday Index Confusion**: Using Sunday=0 instead of Monday=0
   - ❌ `date.getDay()` returns Sunday=0
   - ✅ `(date.getDay() + 6) % 7` returns Monday=0

3. **Forgetting Currency Symbol Logic**: Always showing $ even when "All" selected
   - ❌ Always format with currency
   - ✅ Conditional formatting based on currency selection

4. **Tab State Not in URL**: Users can't bookmark specific tab
   - ❌ Only store in component state
   - ✅ Update URL query params on tab change

5. **Month Not Persisting**: Month resets when switching tabs
   - ❌ Each tab has separate month state
   - ✅ Shared month state across tabs

## Development Workflow

1. **Backend First** (Schema-Driven Development):
   ```bash
   cd backend
   # Edit schema.graphql
   npm run codegen
   # Implement ReportsService.getWeekdayReport()
   # Implement resolver
   npm test
   ```

2. **Frontend Second**:
   ```bash
   cd frontend
   npm install chart.js vue-chartjs
   npm run codegen:sync-schema
   # Create GraphQL query
   npm run codegen
   # Create composable
   # Create WeekdayChart component
   # Update Reports.vue
   npm run dev
   # Manual testing
   ```

3. **Verify End-to-End**:
   - Start backend: `cd backend && npm run dev`
   - Start frontend: `cd frontend && npm run dev`
   - Navigate to Reports page
   - Test all acceptance scenarios from spec.md

## Performance Targets

- Chart display: < 3 seconds (SC-001)
- Tooltip response: < 300ms (SC-004)
- Month navigation: < 2 seconds (SC-003)

## Documentation References

- [Feature Spec](spec.md) - Complete requirements and acceptance criteria
- [Research](research.md) - Technical decisions and library configurations
- [Data Model](data-model.md) - Detailed aggregation algorithm
- [Contracts](contracts/schema.graphql) - GraphQL schema with examples

## Getting Help

If stuck, reference these existing implementations:
- Backend: `backend/src/services/ReportsService.ts` (monthlyReport pattern)
- Resolver: `backend/src/resolvers/reportResolvers.ts` (monthlyReport resolver)
- Composable: `frontend/src/composables/useMonthlyReports.ts`
- Component: `frontend/src/components/reports/CategoryBreakdownTable.vue`
- Page: `frontend/src/views/Reports.vue`
