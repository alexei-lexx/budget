# Implementation Plan: Monthly Expense Report by Weekday

**Branch**: `010-weekday-expense-report` | **Date**: 2025-11-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-weekday-expense-report/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a new "By Weekday" tab to the Reports page that displays a vertical bar chart showing total and average expense amounts for each weekday (Monday-Sunday) within a selected month. Backend aggregates expense transactions by weekday using ReportsService, calculating totals, averages, and percentages per currency. Frontend renders grouped bars using Chart.js with tooltips, currency selector, and shared month navigation. Follows existing monthlyReport pattern for consistency.

## Technical Context

**Language/Version**: TypeScript (backend: Node.js, frontend: Vue 3)
**Primary Dependencies**:
- Backend: Apollo Server, GraphQL, DynamoDB (via existing repositories)
- Frontend: Vue 3, Vuetify, Chart.js (vue-chartjs), Apollo Client
**Storage**: DynamoDB (existing transaction data, no schema changes required)
**Testing**: Jest (backend service/repository tests), manual frontend testing
**Target Platform**: Web application (existing architecture: AWS Lambda backend, CloudFront + S3 frontend)
**Project Type**: Web application (multi-package monorepo: backend/, frontend/, backend-cdk/, frontend-cdk/)
**Performance Goals**:
- Chart display within 3 seconds of tab click (SC-001)
- Tooltip response within 300ms (SC-004)
- Month navigation under 2 seconds (SC-003)
**Constraints**:
- Client-side charting library must support accessibility (ARIA labels, keyboard navigation)
- Must work on mobile devices (minimum 320px width)
- Follow existing monthlyReport pattern for API consistency
**Scale/Scope**:
- Single new GraphQL query (weekdayReport)
- One new backend service method (getWeekdayReport in ReportsService)
- Two new frontend components (WeekdayChart, tab navigation in Reports.vue)
- One new composable (useWeekdayReport)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Test Strategy ✅ PASS
- **Requirement**: Backend tests for repositories/services, frontend manual testing
- **Status**: Compliant
- **Evidence**: Will add Jest tests for `ReportsService.getWeekdayReport()` method following existing test patterns. Frontend WeekdayChart component will be manually tested in dev environment.

### Soft-Deletion ✅ PASS
- **Requirement**: All entities use soft-deletion via isArchived flag
- **Status**: Not Applicable
- **Evidence**: No new entities created. Uses existing Transaction entities which already implement soft-deletion. Service will query active (non-archived) transactions via existing repository methods.

### Vendor Independence ✅ PASS
- **Requirement**: Repository pattern for database portability
- **Status**: Compliant
- **Evidence**: Uses existing ITransactionRepository and ICategoryRepository interfaces. No direct DynamoDB queries. All database access abstracted through repository layer.

### Schema-Driven Development ✅ PASS
- **Requirement**: GraphQL schema is source of truth, start with schema updates
- **Status**: Compliant
- **Evidence**: Will update `backend/src/schema.graphql` first with new `weekdayReport` query and types. Backend codegen generates TypeScript types. Frontend syncs schema and generates typed composables.

### Database Record Hydration ✅ PASS
- **Requirement**: Validate database records at repository boundary
- **Status**: Compliant
- **Evidence**: Uses existing repository methods that already implement Zod validation at read time. No new repository code required.

**Overall Status**: ✅ ALL GATES PASSED - No constitution violations. Proceed to Phase 0.

---

### Post-Design Re-Evaluation (2025-11-14)

**Status**: ✅ ALL GATES STILL PASSED

After completing Phase 0 (research) and Phase 1 (design artifacts), all constitution requirements remain satisfied:

- **Test Strategy**: Confirmed in [quickstart.md](quickstart.md) - Backend tests for ReportsService.getWeekdayReport() planned, frontend manual testing documented
- **Soft-Deletion**: No new entities introduced - uses existing Transaction repository methods that enforce soft-deletion
- **Vendor Independence**: No new database dependencies - all access through ITransactionRepository interface
- **Schema-Driven Development**: Followed correctly - GraphQL schema defined in [contracts/schema.graphql](contracts/schema.graphql) before implementation
- **Database Record Hydration**: Uses existing repository validation - no new database read paths introduced

**No new risks or violations introduced during design phase.**

## Project Structure

### Documentation (this feature)

```text
specs/010-weekday-expense-report/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── schema.graphql                      # [MODIFY] Add weekdayReport query and types
│   ├── resolvers/
│   │   ├── reportResolvers.ts              # [MODIFY] Add weekdayReport resolver
│   │   └── index.ts                        # [VERIFY] Resolver export
│   ├── services/
│   │   ├── ReportsService.ts               # [MODIFY] Add getWeekdayReport() method
│   │   └── ReportsService.test.ts          # [MODIFY] Add tests for getWeekdayReport()
│   ├── models/
│   │   └── Transaction.ts                  # [READ-ONLY] Existing transaction model
│   └── __generated__/
│       └── resolvers-types.ts              # [AUTO-GENERATED] Run npm run codegen

frontend/
├── src/
│   ├── views/
│   │   └── Reports.vue                     # [MODIFY] Add tab navigation, integrate WeekdayChart
│   ├── components/
│   │   └── reports/
│   │       ├── CategoryBreakdownTable.vue  # [READ-ONLY] Existing component
│   │       ├── MonthNavigation.vue         # [READ-ONLY] Shared component
│   │       └── WeekdayChart.vue            # [CREATE] New chart component
│   ├── composables/
│   │   ├── useMonthlyReports.ts            # [READ-ONLY] Reference for pattern
│   │   └── useWeekdayReport.ts             # [CREATE] New composable
│   ├── graphql/
│   │   └── weekdayReport.ts                # [CREATE] GraphQL query definitions
│   ├── schema.graphql                      # [AUTO-SYNC] Synced from backend
│   └── __generated__/
│       └── vue-apollo.ts                   # [AUTO-GENERATED] Run npm run codegen
└── package.json                            # [MODIFY] Add chart.js + vue-chartjs dependencies
```

**Structure Decision**: Web application with independent backend and frontend packages. Backend uses service layer for business logic with GraphQL resolvers. Frontend follows Vue 3 Composition API patterns with composables for data fetching and components for UI. This feature adds new query/service on backend and new composable/component on frontend while reusing existing navigation and infrastructure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A - No constitution violations. All gates passed.
