# Proposal

## Why

The Trends chart compares the running period only with medians of the completed periods.
A median ignores how large the outliers are, so the user cannot see the average spend per period.
The user asks for a mean line that works like the median line and is hidden by default.

## What Changes

- Add a dashed reference line at the arithmetic mean of the completed periods' full values
- Exclude the running period from the mean, and count a completed period with no transactions as zero, as the full-period median does
- Give the mean line its own color and the legend label "Mean of past periods" ("Durchschnitt der vergangenen Zeiträume" in German)
- Hide the mean line when the chart loads; the user shows it with a click on its legend entry
- Do not remember the visibility of the mean line
- Add the field `pastMean` to the `ExpenseTrend` GraphQL type

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `expense-trends`: the chart has a mean reference line that is hidden by default

## Impact

- GraphQL schema: new field `ExpenseTrend.pastMean: Float!` in `backend/src/graphql/schema.graphql` and its copy in `frontend/src/schema.graphql`; the change adds a field only, so existing clients continue to work
- Backend: new utility `backend/src/utils/mean.ts` with its test; `backend/src/services/expense-trend-service.ts` and its test
- Frontend: `frontend/src/graphql/queries.ts`, `frontend/src/components/reports/ExpenseTrendChart.vue`, `frontend/src/locales/en.json`, and `frontend/src/locales/de.json`
- No data migration and no change to the trend query

## Constitution Compliance

- **Schema-Driven Development**: the backend schema changes first, then the frontend copy, the GraphQL operation, and the code generation in both packages
- **Backend Hexagonal Architecture**: the service calculates the mean; the resolver only passes the value through
- **Backend Services**: the mean is business logic, so it stays in `ExpenseTrendService`
- **Test Strategy**: co-located tests cover the new utility and the service
- **Violations**: none
