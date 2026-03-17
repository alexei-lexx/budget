## Context

The Expense Report page (`ByCategoryReport.vue`) currently supports only monthly views. Period state is held as `selectedYear` + `selectedMonth` refs, passed to `useByCategoryReport`, which fires `byCategoryReport(year, month, type)` via GraphQL. Navigation lives in `MonthNavigation.vue` (prev/next month with year boundary wrapping). The backend `ByCategoryReportService` calculates a date range from `new Date(year, month-1, 1)` to `new Date(year, month, 0)` and aggregates transactions within that range.

Adding a yearly view means: (1) extending the API to accept a year-only query, (2) teaching the service to span Jan 1 – Dec 31 when no month is given, and (3) adding a toggle + year navigation to the frontend.

## Goals / Non-Goals

**Goals:**

- Allow users to switch between monthly and yearly views on the Expense Report page
- Yearly view aggregates the full calendar year — same category/currency breakdown as monthly
- URL encodes the view mode: `?year=2025&month=3` (monthly) vs `?year=2025` (yearly)
- Backward-compatible URL: existing bookmarks without a month param default to yearly view; existing bookmarks with a month param continue to work

**Non-Goals:**

- Custom date range (arbitrary start/end) — that is the Insight feature
- Fiscal year support (non-calendar year)
- Income yearly view (only expense report has this navigation; may be added later)
- Caching or prefetching adjacent periods

## Decisions

### D1: Extend the existing query rather than adding a new one

**Decision**: Make `month` optional on the existing `byCategoryReport` query. When omitted, the query returns the full-year report.

**Alternatives considered**:

- **New `byCategoryYearReport` query** — clean separation, no breaking change, but duplicates the GraphQL type, resolver, and composable with near-identical logic. Adds maintenance surface for minimal benefit.
- **Frontend-side aggregation (12 parallel calls)** — reuses the API as-is but makes 12 network round-trips per page load. Rejected for performance and complexity.

**Rationale**: The service logic is identical; only the date range changes. A single flexible query is DRY and keeps the schema minimal. The breaking change (`month: Int!` → `month: Int`) is acceptable — this is an internal single-client API.

**Schema change**:

```graphql
byCategoryReport(year: Int!, month: Int, type: ReportType!): ByCategoryReport!

type ByCategoryReport {
  year: Int!
  month: Int        # null = yearly report
  type: ReportType!
  ...
}
```

### D2: Service takes `month` as optional parameter

**Decision**: Add an optional `month?: number` parameter to `ByCategoryReportService.call`. When undefined, compute `dateAfter = Jan 1` and `dateBefore = Dec 31` of the given year.

**Rationale**: Keeps the service as a single-purpose class (`call` method pattern already established). Date range calculation is a trivial branch; all grouping, currency breakdown, and top-transaction logic is unchanged.

```
month provided  →  new Date(year, month-1, 1) .. new Date(year, month, 0)
month absent    →  new Date(year, 0, 1)       .. new Date(year, 11, 31)
```

`validateMonth` is called only when month is provided.

### D3: URL convention — absence of `month` param signals yearly mode

**Decision**: Yearly mode is indicated by the absence of the `?month` query parameter. Monthly mode requires both `?year` and `?month`.

**Alternatives considered**:

- Explicit `?view=yearly` param — more readable but redundant; the presence/absence of `month` already encodes the mode unambiguously.

**Rationale**: Simpler URL, backward-compatible (existing links without month param now open yearly view rather than defaulting to current month — this is acceptable since no such links existed before). On view-mode switch: monthly→yearly drops the month param; yearly→monthly adds current month.

### D4: New `YearNavigation` component, `MonthNavigation` unchanged

**Decision**: Create a separate `YearNavigation.vue` component. `ByCategoryReport.vue` conditionally renders one or the other based on `viewMode`.

**Alternatives considered**:

- Extend `MonthNavigation` with a `mode` prop — adds conditional logic to an otherwise simple component; harder to read and test.
- Single `PeriodNavigation` component handling both — over-engineering for two simple, structurally similar components.

**Rationale**: `YearNavigation` is simpler than `MonthNavigation` (no month boundary logic). Keeping them separate makes each component trivially readable. The parent view (`ByCategoryReport.vue`) owns the mode decision via a `v-if`/`v-else`.

### D5: View mode toggle — `v-btn-toggle` in the page header

**Decision**: Place a `v-btn-toggle` (Monthly / Yearly) in the page header row, aligned right alongside the existing `h1` title.

**Rationale**: Consistent with Vuetify design system (no custom CSS). Header placement is prominent without cluttering the navigation card. Toggling resets month to current month when switching monthly→yearly is not applicable (no month state needed); switching yearly→monthly sets month to current month.

## Risks / Trade-offs

**Breaking schema change (`month: Int!` → `month: Int`)** → Mitigation: Single frontend client, both sides updated in the same change. Frontend codegen regenerated immediately after schema update.

**`topTransactions` per category over a full year may be less useful** → Mitigation: Behavior unchanged (top 5 by amount); the UI already shows `totalTransactionCount`. No action needed; can revisit if users request a different yearly UX.

**`percentage` calculation across a full year is still per-currency** → No risk; existing logic handles this correctly without change.

**`selectedMonthYearDisplay` in `ByCategoryReport.vue` currently always formats as "Month YYYY"** → Mitigation: In yearly mode, pass just the year string to `CategoryBreakdownTable`'s `month-year` prop (rename or repurpose to `period`).

## Migration Plan

1. Update `schema.graphql` — make `month` optional on query and nullable on type
2. Run `npm run codegen` in backend
3. Update `ByCategoryReportService` — optional month, two date-range branches
4. Update resolver — pass `month | undefined`
5. Run `npm run codegen:sync-schema && npm run codegen` in frontend
6. Update `useByCategoryReport.ts` — accept `month: Ref<number | null>`
7. Add `YearNavigation.vue` component
8. Update `ByCategoryReport.vue` — view mode toggle, conditional navigation, URL management
9. Update `CategoryBreakdownTable.vue` — handle year-only period display

No data migrations required. No infrastructure changes. Rollback: revert schema change and redeploy (no persistent state affected).

## Open Questions

_(none — resolved during exploration)_

## Constitution Compliance

- **Schema-Driven Development**: Change begins with schema modification; codegen runs after every schema update on both backend and frontend. ✅
- **Backend Layer Structure**: Date-range logic stays in service layer; resolver remains a thin pass-through. ✅
- **Single-Purpose Services**: `ByCategoryReportService` retains one public `call` method; month optionality is a minor parameter change, not a new responsibility. ✅
- **Input Validation**: `validateYear` always runs; `validateMonth` runs only when month is provided. ✅
- **Frontend Code Discipline**: `v-btn-toggle` from Vuetify; no custom CSS for the toggle. ✅
- **UI Guidelines**: Mobile-first; toggle is responsive in the header row. ✅
- **TypeScript Code Generation**: No non-null assertions; generated types used throughout. ✅
- **Code Quality Validation**: Service tests updated; typecheck + lint run before completion. ✅
