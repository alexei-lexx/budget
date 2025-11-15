# Quickstart: Monthly Expense Report by Weekday

**Feature**: Monthly Expense Report by Weekday
**Branch**: `010-weekday-expense-report`
**Date**: 2025-11-15

## Overview

This guide helps developers understand and implement the weekday expense report feature. The feature adds a new report page showing total and average expenses for each day of the week (Monday-Sunday) in a given month.

## Prerequisites

- Node.js 18+ installed
- Backend and frontend dependencies installed (`npm install` in each package)
- DynamoDB Local running (`npm run db:setup` in backend)
- Existing expense transactions in database for testing
- Familiarity with GraphQL, Vue 3, and TypeScript

## Architecture Overview

```
User Request (Frontend)
    ↓
Vue Router (/reports/monthly-weekday?year=2025&month=11)
    ↓
MonthlyWeekdayReport.vue Component
    ↓
Apollo Client (useMonthlyWeekdayReportQuery composable)
    ↓
GraphQL Query: monthlyWeekdayReport(year, month, type)
    ↓
Backend Resolver (reports.ts)
    ↓
MonthlyByWeekdayReportService.getWeekdayReport()
    ↓
TransactionRepository.getByDateRange()
    ↓
DynamoDB (Transactions table)
    ↓
Aggregation Logic (group by weekday + currency)
    ↓
Response: MonthlyWeekdayReport { weekdays, currencyTotals }
    ↓
Chart.js Rendering (vertical bar chart)
    ↓
User sees weekday expense chart
```

## Implementation Steps

### Step 1: Backend - GraphQL Schema

**File**: `backend/src/schema.graphql`

Add the following types and query:

```graphql
enum Weekday {
  MON
  TUE
  WED
  THU
  FRI
  SAT
  SUN
}

type MonthlyWeekdayReportCurrencyBreakdown {
  currency: String!
  totalAmount: Float!
  averageAmount: Float!
  percentage: Int!
}

type MonthlyWeekdayReportDay {
  weekday: Weekday!
  currencyBreakdowns: [MonthlyWeekdayReportCurrencyBreakdown!]!
}

type MonthlyWeekdayReportCurrencyTotal {
  currency: String!
  totalAmount: Float!
}

type MonthlyWeekdayReport {
  year: Int!
  month: Int!
  type: TransactionType!
  weekdays: [MonthlyWeekdayReportDay!]!
  currencyTotals: [MonthlyWeekdayReportCurrencyTotal!]!
}

extend type Query {
  monthlyWeekdayReport(year: Int!, month: Int!, type: TransactionType!): MonthlyWeekdayReport!
}
```

**Generate types**:
```bash
cd backend
npm run codegen
```

### Step 2: Backend - MonthlyByWeekdayReportService

**File**: `backend/src/services/MonthlyByWeekdayReportService.ts`

Create new service for weekday aggregation logic:

```typescript
import { ITransactionRepository } from '../repositories/interfaces'
import { TransactionType } from '../__generated__/graphql-types'

export class MonthlyByWeekdayReportService {
  constructor(private transactionRepository: ITransactionRepository) {}

  async getWeekdayReport(
    userId: string,
    year: number,
    month: number,
    type: TransactionType
  ): Promise<MonthlyWeekdayReport> {
    // 1. Validate inputs
    // 2. Build date range for month
    // 3. Fetch transactions from repository
    // 4. Group by weekday and currency
    // 5. Calculate totals, averages, percentages
    // 6. Return aggregated report
  }

  private calculateWeekday(dateString: string): Weekday {
    const date = new Date(dateString)
    const dayIndex = date.getDay() // 0=Sunday, 6=Saturday
    const WEEKDAY_MAP = [
      Weekday.SUN, Weekday.MON, Weekday.TUE, Weekday.WED,
      Weekday.THU, Weekday.FRI, Weekday.SAT
    ]
    return WEEKDAY_MAP[dayIndex]
  }
}
```

See `data-model.md` for complete algorithm.

### Step 3: Backend - Rename Existing Service

**Old**: `backend/src/services/ReportService.ts`
**New**: `backend/src/services/MonthlyByCategoryReportService.ts`

```bash
cd backend/src/services
git mv ReportService.ts MonthlyByCategoryReportService.ts
```

Update all imports in resolvers and context.

### Step 4: Backend - GraphQL Resolver

**File**: `backend/src/resolvers/reports.ts`

Add resolver for new query:

```typescript
import { MonthlyByWeekdayReportService } from '../services/MonthlyByWeekdayReportService'

export const reportsResolvers = {
  Query: {
    monthlyReport: async (_, { year, month, type }, context) => {
      // Existing category report resolver
    },

    monthlyWeekdayReport: async (_, { year, month, type }, context) => {
      const { auth, monthlyByWeekdayReportService } = context

      if (!auth.isAuthenticated || !auth.user) {
        throw new Error('Authentication required')
      }

      return monthlyByWeekdayReportService.getWeekdayReport(
        auth.user.id,
        year,
        month,
        type
      )
    }
  }
}
```

### Step 5: Backend - Update Context

**File**: `backend/src/context.ts`

Add MonthlyByWeekdayReportService to GraphQL context:

```typescript
import { MonthlyByWeekdayReportService } from './services/MonthlyByWeekdayReportService'

export interface Context {
  // ... existing context fields
  monthlyByCategoryReportService: MonthlyByCategoryReportService  // Renamed
  monthlyByWeekdayReportService: MonthlyByWeekdayReportService    // New
}

export const createContext = ({ req }): Context => {
  // ... existing context setup
  const monthlyByWeekdayReportService = new MonthlyByWeekdayReportService(transactionRepository)

  return {
    // ... existing context
    monthlyByWeekdayReportService
  }
}
```

### Step 6: Backend - Testing

**File**: `backend/tests/services/MonthlyByWeekdayReportService.test.ts`

Create unit tests:

```typescript
import { MonthlyByWeekdayReportService } from '../../src/services/MonthlyByWeekdayReportService'
import { TransactionType } from '../../src/__generated__/graphql-types'

describe('MonthlyByWeekdayReportService', () => {
  let service: MonthlyByWeekdayReportService
  let mockTransactionRepository: jest.Mocked<ITransactionRepository>

  beforeEach(() => {
    mockTransactionRepository = {
      getByDateRange: jest.fn()
    } as any
    service = new MonthlyByWeekdayReportService(mockTransactionRepository)
  })

  it('should aggregate expenses by weekday', async () => {
    // Test implementation
  })

  it('should calculate percentages correctly', async () => {
    // Test implementation
  })

  it('should handle multiple currencies', async () => {
    // Test implementation
  })

  it('should return empty report when no expenses', async () => {
    // Test implementation
  })
})
```

Run tests:
```bash
cd backend
npm test
```

### Step 7: Frontend - Sync Schema

**Command**:
```bash
cd frontend
npm run codegen:sync-schema
```

This copies `backend/src/schema.graphql` to `frontend/src/schema.graphql`.

### Step 8: Frontend - GraphQL Query

**File**: `frontend/src/graphql/weekdayReport.ts`

Create GraphQL query:

```typescript
import { gql } from '@apollo/client/core'

export const MONTHLY_WEEKDAY_REPORT_QUERY = gql`
  query MonthlyWeekdayReport($year: Int!, $month: Int!, $type: TransactionType!) {
    monthlyWeekdayReport(year: $year, month: $month, type: $type) {
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
        }
      }
      currencyTotals {
        currency
        totalAmount
      }
    }
  }
`
```

**Generate composables**:
```bash
npm run codegen
```

This creates `useMonthlyWeekdayReportQuery()` in `frontend/src/__generated__/vue-apollo.ts`.

### Step 9: Frontend - Install Chart.js

**Command**:
```bash
cd frontend
npm install chart.js vue-chartjs
```

### Step 10: Frontend - Weekday Report Component

**File**: `frontend/src/components/reports/MonthlyWeekdayReport.vue`

Create new component (see `research.md` for complete implementation):

```vue
<template>
  <v-container>
    <!-- Currency Selector -->
    <v-select
      v-model="selectedCurrency"
      :items="currencyOptions"
      label="Currency"
      density="comfortable"
    />

    <!-- Chart -->
    <v-card elevation="2">
      <v-card-text>
        <Bar :data="chartData" :options="chartOptions" />
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import { useMonthlyWeekdayReportQuery } from '@/__generated__/vue-apollo'

const props = defineProps<{ year: number; month: number }>()

// Fetch data
const { result, loading, error } = useMonthlyWeekdayReportQuery({
  year: props.year,
  month: props.month,
  type: 'EXPENSE'
})

// Currency selection logic
const selectedCurrency = ref<string>('All')
// Chart data transformation
// See research.md for complete implementation
</script>
```

### Step 11: Frontend - Page Component

**File**: `frontend/src/pages/reports/monthly-weekday.vue`

Create route page:

```vue
<template>
  <v-container>
    <h1 class="text-h4 mb-4">Monthly Expense Report by Weekday</h1>

    <MonthNavigation
      :year="year"
      :month="month"
      :disabled="loading"
      @navigate="handleNavigate"
    />

    <MonthlyWeekdayReport
      :year="year"
      :month="month"
    />
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MonthNavigation from '@/components/reports/MonthNavigation.vue'
import MonthlyWeekdayReport from '@/components/reports/MonthlyWeekdayReport.vue'

const route = useRoute()
const router = useRouter()

const year = computed(() => {
  const param = route.query.year
  return param ? Number(param) : new Date().getFullYear()
})

const month = computed(() => {
  const param = route.query.month
  return param ? Number(param) : new Date().getMonth() + 1
})

const handleNavigate = ({ year, month }: { year: number; month: number }) => {
  router.push({ query: { year, month } })
}
</script>
```

### Step 12: Frontend - Update Router

**File**: `frontend/src/router/index.ts`

Add new routes:

```typescript
const routes = [
  // ... existing routes
  {
    path: '/reports/monthly-category',
    name: 'MonthlyCategoryReport',
    component: () => import('@/pages/reports/monthly-category.vue')
  },
  {
    path: '/reports/monthly-weekday',
    name: 'MonthlyWeekdayReport',
    component: () => import('@/pages/reports/monthly-weekday.vue')
  }
]
```

### Step 13: Frontend - Update Navigation Menu

**File**: Update navigation menu component to add two menu items:

```typescript
const menuItems = [
  // ... existing items
  {
    title: 'Monthly Report by Category',
    path: '/reports/monthly-category'
  },
  {
    title: 'Monthly Report by Weekday',
    path: '/reports/monthly-weekday'
  }
]
```

## Testing the Feature

### Backend Testing

1. **Start backend dev server**:
   ```bash
   cd backend
   npm run db:start
   npm run dev
   ```

2. **Open GraphQL Playground**: http://localhost:4000/graphql

3. **Test query**:
   ```graphql
   query {
     monthlyWeekdayReport(year: 2025, month: 11, type: EXPENSE) {
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
   ```

### Frontend Testing

1. **Start frontend dev server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to**: http://localhost:5173/reports/monthly-weekday

3. **Verify**:
   - Chart displays with 7 weekdays
   - Total and Average bars visible
   - Month navigation works
   - Currency selector appears (if multiple currencies)
   - Tooltips show on hover
   - URL updates with year/month params

## Common Issues

### Schema Sync Issues
**Problem**: Frontend types don't match backend
**Solution**: Run `npm run codegen:sync-schema && npm run codegen` in frontend

### Chart Not Rendering
**Problem**: Chart.js not registered
**Solution**: Ensure ChartJS.register() called with required components

### Empty Chart Data
**Problem**: No expenses in database for selected month
**Solution**: Create test expense transactions in DynamoDB Local

### Type Errors
**Problem**: TypeScript errors after schema changes
**Solution**: Restart TypeScript server in IDE, re-run codegen

## Development Workflow

1. Make schema changes in `backend/src/schema.graphql`
2. Run `npm run codegen` in backend
3. Implement resolver and MonthlyByWeekdayReportService logic
4. Test with GraphQL Playground
5. Run `npm run codegen:sync-schema` in frontend
6. Run `npm run codegen` in frontend
7. Implement Vue components
8. Test in browser

## Next Steps

After completing implementation:
1. Run `/speckit.tasks` to generate `tasks.md` with detailed implementation tasks
2. Follow tasks in order, marking completed as you go
3. Write unit tests for MonthlyByWeekdayReportService
4. Manually test UI interactions
5. Update documentation if needed

## References

- [spec.md](./spec.md) - Feature specification
- [plan.md](./plan.md) - Implementation plan
- [research.md](./research.md) - Technical research findings
- [data-model.md](./data-model.md) - Data structures and algorithms
- [contracts/schema.graphql](./contracts/schema.graphql) - GraphQL schema additions
- [CLAUDE.md](/CLAUDE.md) - Project development guidelines
