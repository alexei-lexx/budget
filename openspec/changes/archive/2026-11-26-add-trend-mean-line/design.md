# Design

## Context

- `ExpenseTrendService.call` in `backend/src/services/expense-trend-service.ts` builds the bar values of the completed periods as `pastAmounts`, and returns `pastMedian` as `median(pastAmounts)`
- `pastAmounts` already excludes the running period and has a zero for each completed period with no transactions
- `backend/src/utils/median.ts` returns 0 for an empty list; `median.test.ts` is next to it
- The service tests spy on `median` to check its input
- The GraphQL resolver in `backend/src/graphql/resolvers/trends-resolvers.ts` returns the service result as it is
- `ExpenseTrendChart.vue` draws each median as a `line` dataset with `borderDash: [6, 4]`, `borderWidth: 2`, `pointRadius: 0`, and `order: 1`; it uses the theme colors `info` and `warning` for the medians, and `primary` and `secondary` for the bars
- The Chart.js legend is the default legend, so a click on an entry already shows or hides its dataset

## Goals / Non-Goals

**Goals:**

- One mean value over the same values as the full-period median
- A mean line that looks like the median lines, but with its own color

**Non-Goals:**

- No mean at the same point of the period
- No new control to show the line; the legend is the control
- No persistence of the line visibility in the URL, local storage, or the starred configurations

## Decisions

### Calculate the mean in the service

`ExpenseTrendService` returns `pastMean: mean(pastAmounts)` next to `pastMedian`.

- The business logic stays in the backend, as the constitution requires
- The mean uses the same `pastAmounts` as the median, so both lines use the same periods

Alternatives considered:

- Calculate the mean in the frontend from `points`: less code, but it puts business logic in the frontend

### Add a `mean` utility next to `median`

`backend/src/utils/mean.ts` exports `mean(values: number[]): number`.
It returns 0 for an empty list, as `median` does.
The co-located `mean.test.ts` covers the empty list, one value, and several values.

- The service test can spy on `mean` as it spies on `median`

Alternatives considered:

- Inline the calculation in the service: the service would then also have to test the empty list case

### Expose `pastMean: Float!` on `ExpenseTrend`

The field is not nullable, as `pastMedian` is.
The new field is the only API change.

### Hide the line with the dataset `hidden` flag

The mean dataset in `ExpenseTrendChart.vue` sets `hidden: true`.
The default Chart.js legend shows the entry with a strike-through and shows the line on a click.

- No new state in the component, so the visibility resets when the component mounts again
- A redraw after a new selection keeps the user's choice only while Chart.js keeps the same chart instance; this is acceptable because the visibility is not persisted

Alternatives considered:

- A Vuetify switch above the chart: a new control and new state for a feature that the legend already gives

### Use the theme color `success`

The bars use `primary` and `secondary`, and the medians use `info` and `warning`.
`success` is the next theme color that is not used and is not `error`.

- `error` could suggest that the spend is too high

### Locale keys

`trends.chart.pastMean` is "Mean of past periods" in `en.json` and "Durchschnitt der vergangenen Zeiträume" in `de.json`.

## Risks / Trade-offs

- [A large outlier period moves the mean far from the usual spend] → the median lines stay visible, and the mean line is hidden by default
- [The `success` color can look like a "good" signal] → the legend label names the line

## Migration Plan

- No data migration
- The new field is additive; deploy the backend before the frontend, as `deploy.sh` does
- Rollback: deploy the previous frontend and backend

## Constitution Compliance

- **Schema-Driven Development**: the backend schema changes first, then the frontend copy, the query, and the code generation
- **Backend Hexagonal Architecture**: the service calculates the value; the resolver does not change
- **Backend GraphQL API**: the field uses the domain term "mean" and the user sees it on the chart
- **Test Strategy**: co-located tests for the utility and the service; the chart is checked manually
- **Frontend Code Discipline**: the chart keeps Chart.js options and theme colors, with no custom CSS
- **UI Guidelines**: the legend label is in both locales, and the legend is checked at a phone width
- **Violations**: none
