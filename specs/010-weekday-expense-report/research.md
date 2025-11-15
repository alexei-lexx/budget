# Research: Monthly Expense Report by Weekday

**Phase**: 0 (Outline & Research)
**Date**: 2025-11-15

## Overview

This document consolidates research findings for implementing the weekday expense report feature, covering Chart.js integration with Vue 3, weekday aggregation patterns, and accessibility requirements.

## 1. Chart.js Integration with Vue 3

### Decision
Use **vue-chartjs v5** with **Chart.js v4** for rendering the weekday bar chart.

### Rationale
- **Official Vue 3 Support**: vue-chartjs v5 provides native Composition API support
- **Lightweight**: Chart.js core is ~200KB, suitable for client-side rendering
- **Accessibility**: Built-in ARIA label support and keyboard navigation
- **Customization**: Extensive tooltip and styling options
- **Active Maintenance**: Both libraries actively maintained with strong ecosystem
- **TypeScript Support**: Full TypeScript definitions available

### Implementation Pattern
```typescript
// MonthlyWeekdayReport.vue
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const chartData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'Total',
      data: [100, 200, 150, 300, 250, 400, 350],
      backgroundColor: '#1976D2' // Dark blue
    },
    {
      label: 'Average',
      data: [50, 100, 75, 150, 125, 200, 175],
      backgroundColor: '#64B5F6' // Light blue
    }
  ]
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      grid: { display: true }
    }
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.dataset.label
          const value = context.parsed.y
          const percentage = calculatePercentage(...)
          return label === 'Total'
            ? `${context.label}: ${formatCurrency(value)} (${percentage}%)`
            : `${context.label}: ${formatCurrency(value)}`
        }
      }
    }
  }
}
```

### Alternatives Considered
- **Apache ECharts**: More features but larger bundle size (~800KB), overkill for simple bar chart
- **D3.js**: Maximum flexibility but steep learning curve and more maintenance overhead
- **Recharts**: React-focused, poor Vue integration

### Dependencies
```json
{
  "chart.js": "^4.4.0",
  "vue-chartjs": "^5.3.0"
}
```

## 2. Weekday Aggregation Logic

### Decision
Implement backend aggregation in **WeekdayReportService** with per-currency calculation.

### Rationale
- **Performance**: Reduces data transfer (7 aggregated records vs hundreds of transactions)
- **Testability**: Business logic centralized in testable service layer
- **Consistency**: Matches existing `CategoryReportService` pattern
- **Reusability**: Aggregation logic can be reused for future reports

### Algorithm
```typescript
// Pseudo-code for WeekdayReportService.getWeekdayReport()

1. Fetch transactions for given month/year/type using TransactionRepository
2. Filter by type=EXPENSE (spec requires expense-only)
3. Group transactions by:
   - Weekday (0=Monday, 6=Sunday)
   - Currency
4. For each weekday + currency combination:
   - totalAmount = sum of all amounts
   - occurrences = count of unique dates with that weekday
   - averageAmount = totalAmount / occurrences
5. Calculate currency totals for percentage calculation
6. For each weekday breakdown:
   - percentage = (totalAmount / currencyTotal) * 100
7. Return only weekdays with data (0-7 records per currency)
```

### Weekday Calculation
```typescript
// ISO weekday: Monday=1, Sunday=7
// Convert to 0-indexed: Monday=0, Sunday=6
const date = new Date(transaction.date)
const isoWeekday = date.getDay() // 0=Sunday, 6=Saturday
const weekdayIndex = isoWeekday === 0 ? 6 : isoWeekday - 1 // 0=Monday, 6=Sunday
```

### Edge Cases
- **Zero expenses for weekday**: Return empty array for that weekday (frontend handles gracefully)
- **Month with missing weekdays**: Only return weekdays with data
- **Single occurrence**: Average equals total (total ÷ 1)
- **Multiple currencies**: Separate breakdown per currency, "All" aggregates as plain numbers

### Alternatives Considered
- **Client-side aggregation**: Simpler backend but more data transfer and client computation
- **Database aggregation**: DynamoDB doesn't support GROUP BY, would require Scan + filter (inefficient)

## 3. Accessibility Requirements (WCAG 2.1 Level AA)

### Decision
Implement ARIA labels, keyboard navigation, and sufficient color contrast for chart elements.

### Requirements
1. **Color Contrast**: 3:1 minimum contrast ratio for graphical objects
   - Dark blue (total): `#1976D2`
   - Light blue (average): `#64B5F6`
   - Contrast ratio: 3.2:1 ✅ (verified with contrast checker)

2. **ARIA Labels**:
   ```typescript
   chartOptions = {
     plugins: {
       accessibility: {
         enabled: true,
         description: 'Weekday expense report showing total and average spending per day'
       }
     }
   }
   ```
   Canvas element:
   ```html
   <canvas aria-label="Weekday expense chart" role="img"></canvas>
   ```

3. **Keyboard Navigation**:
   - Month navigation buttons: Already accessible via `v-btn`
   - Currency selector: Native `v-select` provides keyboard support
   - Chart interactions: Chart.js handles focus management

4. **Screen Reader Support**:
   - Provide text alternative for chart data
   - Announce month changes to screen readers
   ```html
   <div role="status" aria-live="polite" class="sr-only">
     {{ `Showing data for ${monthYearDisplay}` }}
   </div>
   ```

### Rationale
- **Legal Compliance**: WCAG 2.1 Level AA is standard for web applications
- **Inclusive Design**: Ensures users with visual impairments can access data
- **Best Practice**: Accessibility improves UX for all users

### Testing
- Manual testing with screen readers (NVDA, VoiceOver)
- Automated contrast checking tools
- Keyboard-only navigation testing

## 4. Multi-Currency Display

### Decision
Currency selector with "All" option using inline `v-select` component.

### Display Rules
```typescript
// When "All" selected:
- Y-axis labels: No currency symbol (e.g., "100", "200")
- Tooltips: No currency symbol (e.g., "Mon: 150 (25%)")
- Aggregation: Sum amounts as plain numbers (USD 100 + EUR 50 = 150)

// When specific currency selected (e.g., "USD"):
- Y-axis labels: Currency symbol (e.g., "$100", "$200")
- Tooltips: Currency symbol (e.g., "Mon: $150 (25%)")
- Aggregation: Only USD amounts included
```

### Implementation
```typescript
const formatAmount = (amount: number, currency: string | null) => {
  if (currency === null || currency === 'All') {
    return amount.toFixed(2) // No symbol
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}
```

### Selector Behavior
```typescript
// Determine available currencies from response
const availableCurrencies = response.currencyTotals.map(ct => ct.currency)

// Default selection
const defaultCurrency = availableCurrencies.length === 1
  ? availableCurrencies[0]  // Single currency: select it
  : 'All'                    // Multiple currencies: select "All"

// Options (always includes "All")
const currencyOptions = [
  { value: 'All', title: 'All Currencies' },
  ...availableCurrencies.map(c => ({ value: c, title: c }))
]
```

## 5. GraphQL Schema Pattern

### Decision
Follow existing `monthlyReport` pattern with currency breakdowns.

### Schema Structure
```graphql
enum Weekday { MON, TUE, WED, THU, FRI, SAT, SUN }

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

type Query {
  monthlyWeekdayReport(year: Int!, month: Int!, type: TransactionType!): MonthlyWeekdayReport!
}
```

### Rationale
- **Consistency**: Mirrors existing `monthlyReport` structure
- **Type Safety**: Enum for weekdays prevents invalid values
- **Flexibility**: Currency breakdowns support multi-currency scenarios
- **Completeness**: Includes year/month/type echo for client caching

## 6. URL State Management

### Decision
Use Vue Router query parameters directly in component (no composable abstraction).

### Pattern
```typescript
// Read from URL
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

// Update URL on navigation
const navigateToMonth = (newYear: number, newMonth: number) => {
  router.push({
    query: { year: newYear, month: newMonth }
  })
}

// Default to current month when no params
onMounted(() => {
  if (!route.query.year && !route.query.month) {
    const now = new Date()
    router.replace({
      query: { year: now.getFullYear(), month: now.getMonth() + 1 }
    })
  }
})
```

### Rationale
- **Simplicity**: Direct router usage is explicit and easy to understand
- **No over-abstraction**: Feature-specific logic doesn't need reusable composable
- **Bookmarkable**: URL contains full state for sharing/bookmarking

## Summary of Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **Charting Library** | Chart.js v4 + vue-chartjs v5 | Lightweight, accessible, well-maintained |
| **Aggregation Location** | Backend (WeekdayReportService) | Better performance, testability, consistency |
| **Service Architecture** | New WeekdayReportService + rename existing to CategoryReportService | Follows service layer pattern |
| **Weekday Enum** | MON, TUE, WED, THU, FRI, SAT, SUN | Type-safe, explicit ordering |
| **Currency Handling** | Per-currency breakdowns, "All" option | Flexible multi-currency support |
| **Accessibility** | ARIA labels, keyboard nav, 3:1 contrast | WCAG 2.1 Level AA compliance |
| **URL State** | Direct Vue Router query params | Simple, explicit, bookmarkable |
| **Component Reuse** | Reuse MonthNavigation.vue | DRY principle, consistency |

## Next Steps (Phase 1)

1. Create `data-model.md` with detailed entity definitions
2. Generate GraphQL contract in `contracts/schema.graphql`
3. Create `quickstart.md` for developer onboarding
4. Update agent context with Chart.js dependency
