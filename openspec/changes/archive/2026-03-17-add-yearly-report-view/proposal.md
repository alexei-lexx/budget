## Why

Users can only view expenses one month at a time, making it impossible to understand annual spending patterns. A yearly view would let users see their full-year category breakdown without manually summing 12 months.

## What Changes

- Add a Monthly / Yearly toggle to the Expense Report page
- In monthly mode: existing behavior unchanged (prev/next month navigation)
- In yearly mode: prev/next year navigation, report aggregates the full calendar year (Jan 1 – Dec 31)
- **BREAKING**: `ByCategoryReport.month` field changes from `Int!` to `Int` (nullable; `null` indicates a yearly report)
- `byCategoryReport` GraphQL query: `month` argument becomes optional (`Int` instead of `Int!`); omitting it returns the full-year report
- URL reflects view mode: `?year=2025&month=3` (monthly) vs `?year=2025` (yearly — no month param)
- New `YearNavigation` frontend component (prev/next year controls)

## Capabilities

### New Capabilities

_(none — the yearly view extends an existing capability)_

### Modified Capabilities

- `reports`: Monthly-only navigation and report generation expands to support a yearly view mode; navigation requirement, report period requirement, and URL state requirement all change

## Impact

- **Backend schema**: `schema.graphql` — `month` argument on `byCategoryReport` becomes optional; `ByCategoryReport.month` becomes nullable
- **Backend service**: `ByCategoryReportService` — `month` parameter becomes optional; when absent, date range spans the full year
- **Backend resolver**: `report-resolvers.ts` — passes `month | undefined` to service
- **Backend codegen**: regenerate after schema change (`npm run codegen`)
- **Frontend composable**: `useByCategoryReport.ts` — pass `month` as `number | null`
- **Frontend view**: `ByCategoryReport.vue` — new `viewMode` state, conditional navigation component, updated URL management
- **Frontend component**: `MonthNavigation.vue` — no change; new `YearNavigation.vue` added alongside it
- **Frontend component**: `CategoryBreakdownTable.vue` — `month-year` prop updated to display year-only string when in yearly mode
- **Frontend codegen**: regenerate after schema sync (`npm run codegen:sync-schema && npm run codegen`)
- **No new dependencies**; no database schema changes

## Constitution Compliance

- **Schema-Driven Development**: Change begins with schema modification (`month` argument made optional); both backend and frontend run codegen after schema update. ✅
- **Backend Layer Structure**: Service layer handles date-range logic; resolver stays thin. ✅
- **Input Validation**: `ByCategoryReportService` validates year (existing); when month is provided it validates 1–12 (existing); no month = full-year path added. ✅
- **TypeScript Code Generation**: Avoid non-null assertions; generated types consumed for type safety. ✅
- **UI Guidelines**: Toggle control uses Vuetify framework component (`v-btn-toggle`); mobile-first responsive layout maintained. ✅
- **Frontend Code Discipline**: Use Vuetify components; minimize custom CSS. ✅
- **Code Quality Validation**: Tests for changed service logic; typecheck and lint before completion. ✅
