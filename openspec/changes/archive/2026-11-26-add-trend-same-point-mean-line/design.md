# Design

## Context

- `ExpenseTrendService.call` in `backend/src/services/expense-trend-service.ts` already builds `pastAmountsAtSamePoint`: for each completed period, the sum of the transactions in its first `elapsedDays` days
- The service returns `pastMedianAtSamePoint: median(pastAmountsAtSamePoint)` and `pastMean: mean(pastAmounts)`
- `backend/src/utils/mean.ts` returns 0 for an empty list and has a co-located test
- `pastAmountsAtSamePoint` already excludes the running period and has a zero for each completed period with no transactions in its first `elapsedDays` days
- The service tests spy on `median` and `mean` to check their input
- The GraphQL resolver in `backend/src/graphql/resolvers/trends-resolvers.ts` returns the service result as it is
- `ExpenseTrendChart.vue` draws the reference lines as `line` datasets with `borderDash: [6, 4]`, `borderWidth: 2`, `pointRadius: 0`, and `order: 1`
- The chart uses the theme colors `primary` and `secondary` for the bars, `info` and `warning` for the medians, and `success` for the full-period mean
- The Vuetify theme in `frontend/src/plugins/vuetify.ts` is the default theme with no custom colors
- The same-point median label uses `trends.chart.pastMedianAtSamePoint` with the `{days}` parameter set to `elapsedDays`

## Goals / Non-Goals

**Goals:**

- One same-point mean over the same values as the same-point median
- A line that looks like the other reference lines, with its own color, hidden by default

**Non-Goals:**

- No change to the full-period mean, the medians, or their colors
- No new control to show the line; the legend is the control
- No persistence of the line visibility in the URL, local storage, or the starred configurations

## Decisions

### Calculate the mean in the service

`ExpenseTrendService` returns `pastMeanAtSamePoint: mean(pastAmountsAtSamePoint)` next to `pastMedianAtSamePoint`.

- The business logic stays in the backend, as the constitution requires
- The same-point median and the same-point mean use the same truncated values
- The existing `mean` utility gives 0 for an empty list, so no new utility is necessary

Alternatives considered:

- Calculate the mean in the frontend: the frontend does not have the truncated values, and it would put business logic in the frontend

### Expose `pastMeanAtSamePoint: Float!` on `ExpenseTrend`

The field is not nullable, as `pastMedianAtSamePoint` and `pastMean` are.
The field goes after `pastMean`, before `elapsedDays`.
The new field is the only API change.

### Hide the line with the dataset `hidden` flag

The new dataset in `ExpenseTrendChart.vue` sets `hidden: true`, as the full-period mean dataset does.
The default Chart.js legend shows and hides each dataset on its own.

- No new state in the component, so the visibility resets when the component mounts again

### Use the theme color `error`

The other datasets use `primary`, `secondary`, `info`, `warning`, and `success`.
`error` is the only color of the default Vuetify theme that the chart does not use.

- Its red hue is clearly different from the green `success` of the full-period mean and the orange `warning` of the same-point median
- A custom hex color or a `darken` variant would add colors outside the theme; the default theme has no variants

Alternatives considered:

- Reuse `success` with a different dash pattern: the two mean lines would be hard to tell apart on a phone
- Add a custom theme color: a change to the theme for one line

### Locale keys

`trends.chart.pastMeanAtSamePoint` is "Mean of past periods at day {days}" in `en.json` and "Durchschnitt der vergangenen Zeiträume an Tag {days}" in `de.json`.
The chart sets `days` to `elapsedDays`, as the same-point median label does.

## Risks / Trade-offs

- [The `error` color can look like a warning that the spend is too high] → the line is hidden by default, and the legend label names the line
- [Five legend entries can wrap to more lines on a phone] → the visual check covers a phone width of 360 px

## Migration Plan

- No data migration
- The new field is additive; deploy the backend before the frontend, as `deploy.sh` does
- Rollback: deploy the previous frontend and backend

## Constitution Compliance

- **Schema-Driven Development**: the backend schema changes first, then the frontend copy, the query, and the code generation
- **Backend Hexagonal Architecture**: the service calculates the value; the resolver does not change
- **Backend GraphQL API**: the field uses the domain terms "mean" and "same point", as `pastMedianAtSamePoint` does
- **Test Strategy**: co-located service tests; the chart is checked manually
- **Frontend Code Discipline**: the chart keeps Chart.js options and theme colors, with no custom CSS
- **UI Guidelines**: the legend label is in both locales, and the legend is checked at a phone width
- **Violations**: none
