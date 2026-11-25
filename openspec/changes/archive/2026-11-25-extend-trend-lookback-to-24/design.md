# Design

## Context

- The lookback maximum of 12 is a literal or a constant in five places:
  - `ExpenseTrendService.call` in `backend/src/services/expense-trend-service.ts` checks `lookback > 12`
  - `LOOKBACK_MAX` in `backend/src/models/trend-preset.ts`; the repository schema in `backend/src/repositories/schemas/trend-preset.ts` uses the same constant
  - `Trends.vue` checks the `lookback` URL parameter against 12
  - `readLookback` in `frontend/src/lib/trendSelectionStorage.ts` checks the remembered lookback against 12
  - `TrendFilters.vue` defines the quick choices `[3, 6, 12]` and the select choices `1..12`
- The description of `ExpenseTrendInput.lookback` in the GraphQL schema says "Accepts 3, 6 or 12", but the backend already accepts any value from 1 to 12
- `ExpenseTrendChart.vue` labels a monthly bar with the short month name only, and shows the year only in the tooltip
- The trend query reads all transactions of the user in the date range from the date index; categories, currency, and type are filtered after the read
- The app has two locales: `en` and `de`

## Goals / Non-Goals

**Goals:**

- One maximum of 24 for both period types, so that the checks stay simple numbers
- Monthly axis labels that show where each year starts

**Non-Goals:**

- No maximum that depends on the period type
- No change to the weekly axis labels: 24 weeks span at most two calendar years, and the tooltip shows the week range
- No change to the trend query or to the median calculation
- No year-over-year comparison

## Decisions

### One `LOOKBACK_MAX` constant in each package

The backend and the frontend are separate packages, so each package has one constant.

- **Backend**: `LOOKBACK_MAX` in `backend/src/models/trend-preset.ts` changes from 12 to 24. `ExpenseTrendService` imports `LOOKBACK_MIN` and `LOOKBACK_MAX` from it, and builds its failure message from them, as the entity does.
- **Frontend**: `frontend/src/composables/useExpenseTrend.ts` exports `LOOKBACK_MAX = 24`, next to the `TrendSelection` type. `Trends.vue`, `trendSelectionStorage.ts`, and `TrendFilters.vue` already import from this file, and use the constant instead of their own 12.

- A future change of the maximum edits one line in each package
- The error message "Lookback must be a whole number from 1 to 24" stays the same in the service and in the entity
- Services can call the domain, so the service import follows the hexagonal architecture

Alternatives considered:

- Change each literal from 12 to 24 in place: the next change of the maximum touches five places again
- Also share the range check in the frontend: `Trends.vue` and `trendSelectionStorage.ts` repeat the same check, but a shared function is a larger refactor than the constant

### Keep the quick choices, extend the select to 1..24

`LOOKBACK_OPTIONS` stays `[3, 6, 12]`.
`LOOKBACK_SELECT_OPTIONS` becomes `1..24`.

- The filter row keeps its current layout, so the mobile layout does not change
- A lookback above 12 is available through the select

### 4-digit year on January bars only

The `labels` computed value in `ExpenseTrendChart.vue` formats a January bar with `{ month: "short", year: "numeric" }` and every other monthly bar with `{ month: "short" }`.
The January result is "Jan 2026" in `en` and "Jan. 2026" in `de`.

- The year marks the start of each year on the axis, and the other labels stay short
- The labels are already computed per bar, so no custom tick callback is needed
- The 4-digit year cannot be read as a day of the month
- A lookback with no January shows no year on the axis; the tooltip still shows the month and its year

Alternatives considered:

- The year on every monthly label: longer labels, so Chart.js skips more of them on a phone
- A 2-digit year on January bars: shorter, but "Jan 26" can be read as 26 January

### Update the GraphQL description only

The description of `ExpenseTrendInput.lookback` changes to "Accepts any whole number from 1 to 24".
The types do not change.
The backend schema changes first, then `frontend/src/schema.graphql` gets the same text, then `npm run codegen` runs in both packages.

## Risks / Trade-offs

- [A lookback of 24 months reads 2 years of transactions, twice the current maximum] → acceptable for one user's data; the query already pages through the results
- [25 bars on a phone are about 11 px wide] → acceptable; the tooltip selects the nearest bar, so the user does not have to hit a bar exactly
- [On a narrow screen, Chart.js can skip a January label] → acceptable; the tooltip shows the month and its year for each bar

## Migration Plan

- No data migration: all stored starred configurations have a lookback of 12 or less, and the new range includes them
- Rollback: a starred configuration with a lookback above 12 fails the old entity check when it is read; delete such configurations before a rollback

## Constitution Compliance

- **Schema-Driven Development**: the backend schema description changes first, then the frontend copy and the code generation
- **Input Validation**: `ExpenseTrendService` keeps its own range check with the new maximum
- **Backend Domain Entities**: `TrendPreset` keeps the lookback invariant in its constructor, with the new maximum
- **Database Record Hydration**: the repository schema keeps validating the stored lookback through `LOOKBACK_MAX`
- **Frontend Code Discipline**: only the values of Vuetify components and the date format change, with no custom CSS
- **UI Guidelines**: the filter row and the chart are checked at a phone width
- **Violations**: none
