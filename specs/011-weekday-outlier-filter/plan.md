# Implementation Plan: Weekday Expense Report Outlier Filtering

**Branch**: `011-weekday-outlier-filter` | **Date**: 2025-11-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-weekday-outlier-filter/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add statistical outlier filtering to the existing weekday expense report using the Interquartile Range (IQR) method. Users can toggle a checkbox to exclude unusually high expenses (like rent) from average calculations. Backend implements outlier detection logic and accepts a boolean parameter via GraphQL schema. Frontend displays filtered results in the existing bar chart with outlier information (count and total amount) shown in existing tooltips.

## Technical Context

**Language/Version**: TypeScript (backend/frontend), Node.js runtime
**Primary Dependencies**: Apollo Server (backend), Vue 3 + Apollo Client (frontend), Vuetify (UI components)
**Storage**: DynamoDB (transaction data for outlier calculation)
**Testing**: Jest (backend services), manual testing (frontend)
**Target Platform**: Web application (responsive, mobile-first)
**Project Type**: Web (backend + frontend packages)
**Performance Goals**: <1 second response time for outlier calculation and chart re-render
**Constraints**: Client-side rendering optimized for mobile devices, backend calculation must support multi-currency reports
**Scale/Scope**: Typical user has 100-1000 transactions per month, 4-100 transactions per weekday

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Schema-Driven Development
- GraphQL schema will be updated first with new boolean parameter `excludeOutliers`
- Backend codegen will generate types from updated schema
- Frontend will sync schema and regenerate composables

### ✅ Backend Layer Structure
- **GraphQL Layer**: Add `excludeOutliers` boolean parameter to existing `monthlyWeekdayReport` query, validate input with Zod
- **Service Layer**: Implement IQR outlier detection logic in existing `MonthlyByWeekdayReportService`
- **Repository Layer**: Use existing TransactionRepository to fetch transaction data

### ✅ Input Validation
- **GraphQL Layer**: Zod validation for `excludeOutliers` boolean parameter (optional, defaults to false)
- **Service Layer**: Business validation for minimum transaction threshold (4+ transactions required for IQR calculation)

### ✅ Vendor Independence
- IQR algorithm is database-agnostic, operates on in-memory data
- No DynamoDB-specific query features required
- Calculation logic portable to any database backend

### ✅ Soft-Deletion
- Outlier filtering applies only to non-archived transactions (existing `isArchived` scoping)

### ✅ Frontend Code Discipline
- Use existing Vuetify chart components and tooltip components
- Leverage existing bar chart implementation, add checkbox using v-checkbox

### ✅ Test Strategy
- Unit test IQR calculation logic in service layer with mocked repositories
- Test edge cases: insufficient data, no outliers, all outliers

**Gate Status**: ✅ PASS - No violations detected

## Project Structure

### Documentation (this feature)

```text
specs/011-weekday-outlier-filter/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── schema.graphql   # Updated GraphQL schema fragment
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── schema.graphql                              # UPDATE: Add excludeOutliers parameter to monthlyWeekdayReport query
│   ├── resolvers/
│   │   └── monthlyByWeekdayReportResolver.ts       # UPDATE: Add excludeOutliers parameter handling
│   ├── services/
│   │   └── MonthlyByWeekdayReportService.ts        # UPDATE: Add IQR outlier filtering logic to existing service
│   ├── repositories/
│   │   └── transactionRepository.ts                # (existing - no changes)
│   └── utils/
│       └── statistics.ts                           # CREATE: IQR calculation utility functions
└── tests/
    └── services/
        └── MonthlyByWeekdayReportService.test.ts   # UPDATE: Add tests for outlier filtering logic

frontend/
├── src/
│   ├── schema.graphql                              # UPDATE: Sync from backend after schema changes
│   ├── graphql/
│   │   └── monthlyWeekdayReport.ts                 # UPDATE: Add excludeOutliers parameter to query
│   ├── components/
│   │   └── reports/
│   │       └── MonthlyWeekdayExpenseReport.vue     # UPDATE: Add checkbox, handle filtering state
│   └── __generated__/
│       └── vue-apollo.ts                           # REGENERATE: After schema sync
```

**Structure Decision**: Web application structure (Option 2) with separate backend and frontend packages. Backend implements outlier detection service logic, frontend adds UI controls and displays filtered results. GraphQL schema serves as contract between layers.

## Complexity Tracking

No violations detected. Feature aligns with existing architectural patterns.

## Phase 0: Research & Technical Decisions

See [research.md](./research.md) for detailed findings.

### Research Tasks Completed

1. ✅ IQR (Interquartile Range) outlier detection algorithm implementation
2. ✅ Handling edge cases (insufficient data, no outliers, all outliers)
3. ✅ Multi-currency outlier detection strategy
4. ✅ GraphQL schema patterns for optional boolean parameters
5. ✅ Vuetify checkbox and tooltip integration patterns

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to calculate outliers | Backend (service layer) | User requirement: "expluding of outliers happens in backend". Centralizes logic, reduces client computation, enables future caching |
| Outlier algorithm | IQR method (Q3 + 1.5×IQR) | Industry standard, robust, well-understood, spec requirement |
| Minimum data threshold | 4 transactions per weekday | Required for meaningful quartile calculation (Q1, Q2, Q3) |
| Multi-currency handling | Apply IQR separately per currency | Prevents currency conversion issues, maintains data isolation |
| Parameter location | GraphQL query parameter | Aligns with schema-driven development, type-safe, frontend flexibility |
| State persistence | No persistence | User requirement: "dont persist outlier checkbox; by default it is unchecked" |

## Phase 1: Design Artifacts

### Data Model

See [data-model.md](./data-model.md) for complete entity definitions.

**Key Entities**:
- **WeekdayExpenseSummary**: Extended with optional `outlierCount` and `outlierTotalAmount` fields when filtering is active
- **Transaction**: Existing entity, no schema changes required

### API Contracts

See [contracts/schema.graphql](./contracts/schema.graphql) for GraphQL schema changes.

**Modified Queries**:
```graphql
type Query {
  monthlyWeekdayReport(
    year: Int!
    month: Int!
    type: TransactionType!
    excludeOutliers: Boolean = false  # NEW PARAMETER
  ): MonthlyWeekdayReport!
}
```

**Modified Types**:
```graphql
type MonthlyWeekdayReportCurrencyBreakdown {
  currency: String!
  totalAmount: Float!
  averageAmount: Float!
  percentage: Int!
  outlierCount: Int            # NEW: Present only when excludeOutliers=true and outliers detected
  outlierTotalAmount: Float    # NEW: Present only when excludeOutliers=true and outliers detected
}
```

### Quickstart Guide

See [quickstart.md](./quickstart.md) for developer onboarding.

## Phase 2: Task Decomposition

**Note**: Task generation is handled by `/speckit.tasks` command, not `/speckit.plan`.

Task breakdown will be generated from this plan and the data model, following the test-driven development workflow defined in the constitution.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| IQR calculation incorrect for edge cases | Medium | High | Comprehensive unit tests for all edge cases, compare against reference implementation |
| Performance degradation with large datasets | Low | Medium | Backend calculation enables future optimization (caching, indexing), test with realistic data volumes |
| Multi-currency outlier detection complexity | Low | Low | Apply IQR separately per currency group, well-defined in data model |
| Tooltip UX confusion (when to show outlier info) | Medium | Low | Clear conditional logic: show only when count > 0, documented in spec |

## Implementation Notes

- Frontend checkbox state is ephemeral (no persistence), defaults to unchecked on every page load
- Outlier information in tooltips appears only when filtering is enabled AND outliers are detected (count > 0)
- Backend returns `outlierCount` and `outlierTotalAmount` as nullable fields, present only when applicable
- IQR threshold is fixed at 1.5× (industry standard), no user customization in this phase
- Weekdays with <4 transactions skip outlier filtering entirely (insufficient data for quartile calculation)
