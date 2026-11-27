# Proposal

## Why

The Trends chart has a mean line for the full values of the completed periods.
The running period is not complete, so the user cannot compare it with that mean in a fair way.
The same-point median solves this problem for the median, but there is no mean at the same point.

## What Changes

- Add a dashed reference line at the arithmetic mean of the completed periods, measured to the same point as the same-point median
- Count only the first N days of each completed period, where N is the number of days elapsed in the running period, today included
- Exclude the running period from the mean, and count a completed period with no transactions as zero
- Give the line its own color and the legend label "Mean of past periods at day {days}" ("Durchschnitt der vergangenen Zeiträume an Tag {days}" in German)
- Hide the line when the chart loads; the user shows it with a click on its legend entry
- Do not remember the visibility of the line
- Add the field `pastMeanAtSamePoint` to the `ExpenseTrend` GraphQL type

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `expense-trends`: the mean reference line and its visibility rules cover a second mean line, measured to the same point

## Impact

- GraphQL schema: new field `ExpenseTrend.pastMeanAtSamePoint: Float!` in `backend/src/graphql/schema.graphql` and its copy in `frontend/src/schema.graphql`; the change adds a field only, so existing clients continue to work
- Backend: `backend/src/services/expense-trend-service.ts` and its test; the generated resolver types
- Frontend: `frontend/src/graphql/queries.ts`, `frontend/src/components/reports/ExpenseTrendChart.vue`, `frontend/src/locales/en.json`, `frontend/src/locales/de.json`, and the generated Apollo code
- No data migration and no change to the transaction query

## Constitution Compliance

- **Schema-Driven Development**: the backend schema changes first, then the frontend copy, the GraphQL operation, and the code generation in both packages
- **Backend Hexagonal Architecture**: the service calculates the mean; the resolver only passes the value through
- **Backend Services**: the mean is business logic, so it stays in `ExpenseTrendService`
- **Test Strategy**: co-located service tests cover the new value
- **Violations**: none
