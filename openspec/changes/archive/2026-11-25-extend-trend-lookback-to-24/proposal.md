# Proposal

## Why

The Trends page accepts a lookback of at most 12 completed periods.
For months, this covers 1 year, so monthly spending over 2 years cannot be shown.
Weeks use the same maximum, so a weekly lookback can cover about 3 months.

## What Changes

- Increase the maximum lookback from 12 to 24 completed periods for both period types
- Keep the minimum lookback at 1 and the default lookback at 3
- Show the year in the label of each January bar, so that the start of each year is visible on the monthly chart
- Accept a lookback from 1 to 24 in the URL, in the remembered selection, and in starred trend configurations
- Keep one maximum for both period types, so that a change of the period type never makes the lookback invalid

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `expense-trends`: the lookback accepts any whole number from 1 to 24, and the label of each January bar includes the year

## Impact

- Backend service: `backend/src/services/expense-trend-service.ts` and its tests
- Backend domain entity: `backend/src/models/trend-preset.ts` and its tests
- GraphQL schema: the description of `ExpenseTrendInput.lookback` in `backend/src/graphql/schema.graphql` and its copy in `frontend/src/schema.graphql`; the API types do not change
- Frontend: `frontend/src/composables/useExpenseTrend.ts`, `frontend/src/views/Trends.vue`, `frontend/src/lib/trendSelectionStorage.ts` with its tests, `frontend/src/components/reports/TrendFilters.vue`, and `frontend/src/components/reports/ExpenseTrendChart.vue`
- The largest trend query reads 2 years of transactions instead of 1 year
- No data migration: all stored starred configurations have a lookback of 12 or less, so they stay valid

## Constitution Compliance

- **Schema-Driven Development**: the schema description changes first, then the code generation runs in both packages
- **Input Validation**: the service and the domain entity check the new range
- **Backend Domain Entities**: the `TrendPreset` entity keeps its lookback invariant, with the new maximum
- **Frontend Code Discipline**: the lookback select stays a Vuetify component, with no custom CSS
- **UI Guidelines**: the filter row keeps its current layout on a mobile screen
- **Test Strategy**: co-located service, entity, and storage tests cover the new range
- **Violations**: none
