# Implementation Plan: Monthly Expense Report by Weekday

**Branch**: `010-weekday-expense-report` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-weekday-expense-report/spec.md`

## Summary

Add a new weekday-based expense report page that displays total and average spending for each day of the week (Monday-Sunday) in a given month. Users can navigate between months, filter by currency, and analyze spending patterns by weekday. The feature follows the existing monthly category report pattern with backend aggregation via GraphQL and Chart.js visualization on the frontend.

## Technical Context

**Language/Version**: TypeScript (Node.js for backend, Vue 3 for frontend)
**Primary Dependencies**:
- Backend: Apollo Server, GraphQL, DynamoDB
- Frontend: Vue 3, Vite, Vuetify, Apollo Client, Chart.js (vue-chartjs)
**Storage**: DynamoDB (existing transactions table via TransactionRepository)
**Testing**: Jest (backend service layer tests)
**Target Platform**: AWS Lambda (backend), CloudFront + S3 (frontend)
**Project Type**: Web application (separate backend and frontend packages)
**Performance Goals**:
- Chart renders within 3 seconds of page load
- Month navigation updates within 2 seconds
- Tooltips appear within 300ms
**Constraints**:
- Follow existing `monthlyReport` GraphQL pattern
- Reuse existing MonthNavigation.vue component
- Support responsive design (minimum 320px width)
- WCAG 2.1 Level AA accessibility (3:1 contrast ratio for chart bars)
**Scale/Scope**:
- 7 weekday groups maximum per chart
- Multiple currencies per user
- Client-side Chart.js rendering

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Test Strategy ✅ PASS
- **Backend**: Test new MonthlyByWeekdayReportService with unit tests (happy path + error cases)
- **Frontend**: Manual testing for chart visualization and interactions
- Justification: Follows established pattern - backend logic tested, UI verified manually

### Soft-Deletion ✅ PASS
- **No new entities**: Feature aggregates existing Transaction entities
- Existing transactions already support soft-deletion via `isArchived` flag
- All queries will naturally scope to non-archived transactions via TransactionRepository

### Vendor Independence ✅ PASS
- **Repository Pattern**: Reuses existing TransactionRepository abstraction
- **Frontend**: Chart.js is vendor-neutral, can be replaced
- **Backend Logic**: Aggregation logic is database-agnostic (works with any transaction source)
- No vendor-specific features or lock-in introduced

### Schema-Driven Development ✅ PASS
- **Process**:
  1. Start with GraphQL schema update in `backend/src/schema.graphql`
  2. Add `monthlyWeekdayReport` query following existing `monthlyReport` pattern
  3. Run `npm run codegen` in backend to generate TypeScript types
  4. Frontend syncs schema via `npm run codegen:sync-schema`
  5. Frontend generates typed composables via `npm run codegen`
- Follows established workflow for all API changes

### Database Record Hydration ✅ PASS
- **No new database reads**: Feature uses existing TransactionRepository methods
- TransactionRepository already validates records at boundary using schemas
- MonthlyByWeekdayReportService will receive validated transaction data from repository

**GATE STATUS**: ✅ ALL CHECKS PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/010-weekday-expense-report/
├── plan.md              # This file
├── research.md          # Phase 0: Chart.js integration patterns
├── data-model.md        # Phase 1: Weekday aggregation data structure
├── quickstart.md        # Phase 1: Developer onboarding guide
├── contracts/           # Phase 1: GraphQL schema additions
│   └── schema.graphql
└── tasks.md             # Phase 2: NOT created by /speckit.plan
```

### Source Code (repository root)

```text
backend/
└── src/
    ├── schema.graphql                          # Add monthlyWeekdayReport query
    ├── resolvers/
    │   └── reports.ts                          # Add monthlyWeekdayReport resolver
    ├── services/
    │   ├── MonthlyByCategoryReportService.ts   # Renamed from ReportService
    │   ├── MonthlyByWeekdayReportService.ts    # NEW: Weekday aggregation logic
    │   └── MonthlyByWeekdayReportService.test.ts  # NEW: Co-located unit tests
    └── repositories/
        └── TransactionRepository.ts            # Existing, reused

frontend/
├── src/
│   ├── schema.graphql                          # Synced from backend
│   ├── components/
│   │   └── reports/
│   │       ├── MonthNavigation.vue             # Existing, reused
│   │       ├── MonthlyCategoryReport.vue       # Renamed from existing
│   │       └── MonthlyWeekdayReport.vue        # NEW: Weekday chart page
│   ├── pages/
│   │   └── reports/
│   │       ├── monthly-category.vue            # Renamed route
│   │       └── monthly-weekday.vue             # NEW: Route page
│   ├── graphql/
│   │   └── weekdayReport.ts                    # NEW: GraphQL queries
│   └── router/
│       └── index.ts                            # Update routes
└── __generated__/
    ├── graphql-types.ts                        # Updated with new types
    └── vue-apollo.ts                           # Updated with new composables
```

**Structure Decision**: Web application pattern with separate backend and frontend packages. Backend adds new service following established service layer pattern. Frontend adds new page component with Chart.js integration. Both packages coordinated via GraphQL schema-driven development.

## Complexity Tracking

> **No constitutional violations** - this section remains empty.
