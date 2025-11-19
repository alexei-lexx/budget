# Research: Weekday Expense Report Outlier Filtering

**Feature**: 011-weekday-outlier-filter
**Date**: 2025-11-19
**Phase**: 0 (Research & Technical Decisions)

## Overview

This document captures research findings and technical decisions for implementing statistical outlier filtering in the weekday expense report.

## Research Areas

### 1. IQR (Interquartile Range) Outlier Detection Algorithm

**Decision**: Implement standard IQR method with 1.5× multiplier threshold

**Research Findings**:
- IQR is the difference between the third quartile (Q3) and first quartile (Q1): `IQR = Q3 - Q1`
- Standard outlier threshold: Values above `Q3 + 1.5 × IQR` are considered outliers
- Requires sorting data to calculate quartiles
- Minimum 4 data points needed for meaningful Q1, Q2 (median), Q3 calculation

**Implementation Approach**:
```typescript
function calculateOutliers(amounts: number[]): { outliers: number[], normal: number[] } {
  if (amounts.length < 4) {
    return { outliers: [], normal: amounts };
  }

  const sorted = [...amounts].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const upperBound = q3 + 1.5 * iqr;

  return {
    outliers: amounts.filter(x => x > upperBound),
    normal: amounts.filter(x => x <= upperBound)
  };
}
```

**Alternatives Considered**:
- **Z-score method**: Rejected - assumes normal distribution, less robust for skewed expense data
- **Modified Z-score (MAD)**: Rejected - more complex, overkill for this use case
- **Standard deviation threshold**: Rejected - sensitive to outliers themselves, less robust

**Rationale**: IQR is robust against outliers (uses quartiles, not mean/std), well-understood, industry standard for this type of analysis.

### 2. Handling Edge Cases

**Research Question**: How to handle insufficient data, no outliers, or all outliers?

**Decisions**:

| Edge Case | Behavior | Rationale |
|-----------|----------|-----------|
| < 4 transactions per weekday | No filtering, return all transactions | Insufficient data for quartile calculation |
| No outliers detected | Return `outlierCount: 0`, omit outlier fields in response | Keeps tooltip clean, consistent with spec |
| All transactions are outliers | Return original values with warning | Prevents empty results, spec requirement (FR-007) |
| Zero transactions | Return zero totals regardless of filter state | Spec requirement (FR-007) |

**Implementation Notes**:
- Backend checks transaction count before applying IQR
- Service layer returns nullable `outlierCount` and `outlierTotalAmount` fields
- Frontend conditionally displays outlier info only when count > 0

### 3. Multi-Currency Outlier Detection Strategy

**Decision**: Apply IQR separately per currency group

**Research Findings**:
- Weekday expense report already groups by currency (per project constitution)
- Cannot compare amounts across different currencies without conversion
- Outlier detection must respect currency boundaries

**Implementation Approach**:
```typescript
function calculateOutliersByWeekdayAndCurrency(
  transactions: Transaction[]
): Map<string, Map<string, OutlierResult>> {
  // Group by weekday, then by currency
  const grouped = groupBy(transactions, ['weekday', 'currency']);

  // Apply IQR to each (weekday, currency) group
  const results = new Map();
  for (const [weekday, currencyGroups] of grouped) {
    for (const [currency, txns] of currencyGroups) {
      const amounts = txns.map(t => t.amount);
      results.set(weekday, currency, calculateOutliers(amounts));
    }
  }
  return results;
}
```

**Alternatives Considered**:
- **Convert all to base currency**: Rejected - adds conversion complexity, exchange rate dependency, violates vendor independence
- **Apply IQR globally across all currencies**: Rejected - mathematically invalid to compare amounts in different currencies

**Rationale**: Maintains data isolation, avoids currency conversion, aligns with existing multi-currency support patterns in project.

### 4. GraphQL Schema Patterns for Optional Boolean Parameters

**Decision**: Use optional parameter with default value `false`

**Research Findings**:
- GraphQL supports default values in schema: `excludeOutliers: Boolean = false`
- Optional parameters are nullable unless specified otherwise
- Frontend can omit parameter to use default behavior

**Schema Pattern**:
```graphql
type Query {
  weekdayExpenseReport(
    startDate: String!
    endDate: String!
    excludeOutliers: Boolean = false
  ): [WeekdayExpenseSummary!]!
}
```

**Alternatives Considered**:
- **Required boolean parameter**: Rejected - breaks backward compatibility, forces all clients to update
- **Separate query for filtered results**: Rejected - duplicates logic, violates DRY principle
- **Input object wrapper**: Rejected - overkill for single optional boolean

**Rationale**: Backward compatible, clear intent, follows GraphQL best practices for optional filtering parameters.

### 5. Vuetify Checkbox and Tooltip Integration Patterns

**Decision**: Use `v-checkbox` component, extend existing tooltip data structure

**Research Findings**:
- Vuetify provides `v-checkbox` with built-in styling and state management
- Existing weekday report already uses Vuetify tooltips (based on spec clarification)
- No state persistence needed (spec requirement)

**Frontend Pattern**:
```vue
<template>
  <v-checkbox
    v-model="excludeOutliers"
    label="Exclude outliers from averages"
  />

  <v-tooltip>
    <template v-slot:activator="{ props }">
      <div v-bind="props">{{ weekday }}</div>
    </template>
    <div>
      <div>Total: {{ formatCurrency(summary.totalAmount) }}</div>
      <div>Average: {{ formatCurrency(summary.averageAmount) }}</div>
      <div v-if="summary.outlierCount">
        Outliers: {{ summary.outlierCount }} ({{ formatCurrency(summary.outlierTotalAmount) }})
      </div>
    </div>
  </v-tooltip>
</template>

<script setup lang="ts">
const excludeOutliers = ref(false); // No persistence, always starts unchecked
</script>
```

**Alternatives Considered**:
- **Custom checkbox component**: Rejected - violates frontend code discipline (prefer framework components)
- **Persistent checkbox state**: Rejected - spec explicitly requires no persistence
- **Separate tooltip for outlier info**: Rejected - spec requires combined tooltip

**Rationale**: Leverages existing Vuetify components, minimal custom code, aligns with project UI guidelines.

## Technical Constraints Validated

✅ **Performance**: IQR calculation is O(n log n) due to sorting, acceptable for typical transaction volumes (100-1000 per month)
✅ **Backend Calculation**: User requirement confirmed - backend implements filtering logic
✅ **Schema-Driven**: GraphQL schema changes drive implementation workflow
✅ **Vendor Independence**: Algorithm is database-agnostic, operates on in-memory data
✅ **Testing**: Pure functions enable comprehensive unit testing without database dependencies

## Open Questions

None - all clarifications resolved in spec clarification session.

## References

- [IQR Method (Wikipedia)](https://en.wikipedia.org/wiki/Interquartile_range)
- [Outlier Detection Methods](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm)
- GraphQL Schema Documentation (apollo-server)
- Vuetify v-checkbox Component Documentation
- Project Constitution (Backend Layer Structure, Input Validation)

## Next Steps

Proceed to Phase 1: Generate data-model.md and API contracts based on these decisions.
