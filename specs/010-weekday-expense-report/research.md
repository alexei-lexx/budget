# Research: Monthly Expense Report by Weekday

**Date**: 2025-11-14
**Feature**: Monthly Expense Report by Weekday
**Branch**: `010-weekday-expense-report`

## Overview

This document captures technical research and decisions made during Phase 0 planning for the weekday expense report feature.

## Research Areas

### 1. Chart.js Integration with Vue 3

**Decision**: Use Chart.js via vue-chartjs wrapper

**Rationale**:
- Chart.js is the most widely-used charting library with excellent documentation
- vue-chartjs provides official Vue 3 integration with Composition API support
- Strong accessibility features including ARIA label support
- Responsive by default with mobile-friendly interactions
- Supports grouped bar charts natively
- Active maintenance and large community

**Integration Pattern**:
```typescript
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

// Register required Chart.js components
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)
```

**Accessibility Configuration**:
```typescript
options: {
  plugins: {
    legend: {
      display: true,
      labels: {
        // Ensures readable contrast
        color: theme.colors.text
      }
    }
  },
  // Enable keyboard navigation
  interaction: {
    mode: 'index',
    intersect: false
  },
  // ARIA support
  accessibility: {
    description: 'Weekly expense breakdown chart showing total and average spending'
  }
}
```

**Alternatives Considered**:
- ApexCharts: More features but heavier bundle size
- ECharts: Better for complex visualizations, overkill for this use case
- D3.js: Too low-level, would require significant custom implementation

### 2. Weekday Calculation from ISO Date Strings

**Decision**: Use native JavaScript Date.getDay() with offset for Monday-start week

**Rationale**:
- Transaction dates stored as ISO 8601 strings (YYYY-MM-DD format)
- JavaScript Date.getDay() returns 0-6 where 0=Sunday, 6=Saturday
- Spec requires Monday-first week (0=Monday, 6=Sunday)
- Simple mathematical transformation: `(date.getDay() + 6) % 7`

**Implementation**:
```typescript
function getWeekdayIndex(isoDateString: string): number {
  const date = new Date(isoDateString);
  // getDay() returns 0=Sun, 1=Mon, ..., 6=Sat
  // Transform to 0=Mon, 1=Tue, ..., 6=Sun
  return (date.getDay() + 6) % 7;
}
```

**Edge Cases Handled**:
- Timezone handling: Transaction dates are stored in user's local timezone, Date constructor parses ISO strings correctly
- Month boundaries: Calculation works regardless of which day of month
- Leap years: No special handling needed for weekday calculation

**Alternatives Considered**:
- date-fns library: Adds dependency for trivial calculation
- Luxon: Heavy library for simple weekday extraction
- Manual parsing: More error-prone than native Date

### 3. Multi-Currency Aggregation Strategy

**Decision**: Treat each currency as separate unit, sum amounts without conversion, hide currency symbol when "All" selected

**Rationale**:
- Spec clarifies (FR-026): "All" option sums amounts from all currencies without conversion
- Percentages calculated treating all currency amounts as equal units (clarification Q3)
- Display amounts without currency symbols when "All" selected (clarification Q4)
- Mathematically honest - users understand these are mixed units, not real currency values

**Backend Data Structure**:
```typescript
interface WeekdayReportCurrencyBreakdown {
  currency: string;
  totalAmount: number;
  averageAmount: number;
  percentage: number;
}
```

**Frontend Display Logic**:
```typescript
// When currency === "All"
displayAmount = totalAmount.toFixed(2);  // No currency symbol

// When specific currency selected
displayAmount = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: selectedCurrency
}).format(totalAmount);
```

**Alternatives Considered**:
- Currency conversion: Rejected - requires exchange rate API, adds complexity
- Separate charts per currency: Rejected - poor UX for multi-currency users
- Verbose tooltips showing breakdown: Rejected - clutters UI

### 4. Chart.js Grouped Bar Configuration

**Decision**: Use `grouped: true` with two datasets (Total and Average)

**Rationale**:
- Chart.js natively supports grouped bars with `grouped: true` option
- Two datasets: one for Total (dark blue), one for Average (light blue)
- Datasets aligned left-to-right matches spec requirement (FR-005)

**Configuration**:
```typescript
{
  type: 'bar',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Total',
        data: [/* totals */],
        backgroundColor: 'rgb(25, 118, 210)',  // Dark blue
        order: 1  // Ensures Total on left
      },
      {
        label: 'Average',
        data: [/* averages */],
        backgroundColor: 'rgb(100, 181, 246)',  // Light blue
        order: 2  // Ensures Average on right
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label;
            const value = context.parsed.y;
            if (label === 'Total') {
              const percentage = calculatePercentage(value, monthTotal);
              return `${weekdayLabel}: ${formatAmount(value)} (${percentage}%)`;
            } else {
              return `${weekdayLabel}: ${formatAmount(value)}`;
            }
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatAmount(value)
        }
      }
    }
  }
}
```

**Mobile Tooltip Persistence**:
- Chart.js supports `onClick` events to manually control tooltip display
- Implement custom tooltip controller for mobile tap-to-persist behavior (clarification Q1)

**Alternatives Considered**:
- Stacked bars: Rejected - doesn't show Total and Average relationship clearly
- Separate charts: Rejected - harder to compare weekdays
- Single bar with hover toggle: Rejected - confusing UX

## Dependencies

### Backend
No new backend dependencies required. Uses existing:
- Apollo Server
- GraphQL type system
- Existing transaction repository

### Frontend
New dependencies to add to `frontend/package.json`:
```json
{
  "dependencies": {
    "chart.js": "^4.4.0",
    "vue-chartjs": "^5.3.0"
  }
}
```

**Version Selection Rationale**:
- Chart.js 4.x is stable, well-supported, tree-shakeable
- vue-chartjs 5.x provides Vue 3 Composition API support
- Both actively maintained with regular security updates

## Performance Considerations

### Backend Aggregation Complexity
- Query all transactions for given month and type: O(n) where n = transactions in month
- Group by weekday: O(n) single pass
- Calculate per-currency breakdowns: O(n × c) where c = number of currencies (typically 1-3)
- Overall: Linear complexity, acceptable for typical monthly transaction volumes (< 1000 transactions)

### Frontend Rendering
- Chart.js uses canvas rendering for performance
- 7 weekdays × 2 bars = 14 bars total, negligible render time
- Vuetify reactive state updates handled efficiently by Vue 3 reactivity system
- Expected render time well under 300ms requirement (SC-004)

### Data Transfer
- GraphQL response size: ~1-2KB for typical monthly data
- Minimal payload: 7 weekdays × currencies × breakdown = small JSON
- Well within performance budget for 3-second initial load (SC-001)

## Testing Strategy

### Backend Testing
Create `backend/tests/services/ReportsService.test.ts` with coverage for:
1. Basic weekday aggregation with single currency
2. Multi-currency aggregation
3. Average calculation (total ÷ occurrences)
4. Percentage calculation
5. Empty month handling
6. Month with only some weekdays having expenses

### Frontend Testing
Manual testing scenarios:
1. Visual verification of chart rendering on desktop and mobile (320px minimum)
2. Tooltip interaction (hover on desktop, tap on mobile)
3. Currency selector behavior (hide when single currency, show when multiple)
4. Month navigation integration
5. Tab switching with month persistence
6. URL bookmark functionality
7. Accessibility testing with keyboard navigation and screen reader

## Implementation Order

1. **Backend (Schema-First)**:
   - Update `backend/src/schema.graphql` with new types
   - Run `npm run codegen` to generate TypeScript types
   - Add `getWeekdayReport()` method to ReportsService
   - Add resolver in `reportResolvers.ts`
   - Write tests for ReportsService.getWeekdayReport()

2. **Frontend**:
   - Install chart.js and vue-chartjs dependencies
   - Sync schema: `npm run codegen:sync-schema`
   - Create GraphQL query in `frontend/src/graphql/weekdayReport.ts`
   - Run `npm run codegen` to generate typed composables
   - Create `useWeekdayReport.ts` composable
   - Create `WeekdayChart.vue` component
   - Update `Reports.vue` with tab navigation
   - Manual testing and adjustments

## Open Questions (Resolved)

All technical questions resolved through user interview:
- ✅ Charting library: Chart.js
- ✅ Aggregation location: Backend (ReportsService)
- ✅ GraphQL schema structure: Confirmed
- ✅ Service architecture: Extend ReportsService
- ✅ Frontend component structure: Confirmed
- ✅ URL structure: /reports?tab=category|weekday&year=X&month=Y
- ✅ Chart grouping: Grouped bars side-by-side
- ✅ Tooltip persistence: Persist on mobile tap until next tap
- ✅ Bar ordering: Total left, Average right
- ✅ Multi-currency display: No symbol when "All", symbol when specific currency
- ✅ Percentage calculation: Treat all amounts as equal units
- ✅ Weekday labels: 3-letter abbreviations (Mon, Tue, etc.)

## References

- Chart.js Documentation: https://www.chartjs.org/docs/latest/
- vue-chartjs Documentation: https://vue-chartjs.org/
- GraphQL Code Generator: https://the-guild.dev/graphql/codegen
- Vue 3 Composition API: https://vuejs.org/guide/extras/composition-api-faq.html
- Vuetify 3 Components: https://vuetifyjs.com/
