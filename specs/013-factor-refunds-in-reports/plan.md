# Implementation Plan: Factor Refunds in Expense Reports

**Branch**: `013-factor-refunds-in-reports` | **Date**: 2025-11-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-factor-refunds-in-reports/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Modify the monthly expense by category report to calculate net category totals by subtracting refund transactions from expense transactions within the same category and reporting period. This ensures users see accurate net spending (Expenses - Refunds) for each category.

## Technical Context

**Language/Version**: TypeScript (strict mode)
**Primary Dependencies**: Backend: Apollo Server, Node.js, Jest | Frontend: Vue 3, Vite, Vuetify, Apollo Client
**Storage**: DynamoDB (on-demand scaling)
**Testing**: Jest (backend repositories and services)
**Target Platform**: AWS Lambda + API Gateway (backend), CloudFront + S3 (frontend), DynamoDB Local for development
**Project Type**: Web (frontend + backend as separate npm packages)
**Performance Goals**: Report generation < 2 seconds for up to 1000 transactions per month
**Constraints**: Must follow existing currency handling approach, maintain existing UI behavior (loading states, error handling)
**Scale/Scope**: Support at least 1000 transactions per month per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Schema-Driven Development ✓
- MUST update GraphQL schema first before any code changes
- MUST run code generation after schema updates (backend and frontend)
- Schema defines report query/mutation contracts

### Backend Layer Structure ✓
- MUST follow three-layer architecture: Resolvers → Services → Repositories
- GraphQL layer: validate input, enforce auth, call service methods
- Service layer: implement report calculation logic (expense - refund aggregation)
- Repository layer: pure data access for transactions

### Repository Pattern ✓
- MUST use repository pattern for all database access
- Use portable query patterns (no DynamoDB-specific features that can't be replicated elsewhere)

### Authentication & Authorization ✓
- MUST use authenticated user ID from context (never from input parameters)
- MUST scope all transaction queries to current user ID

### Input Validation ✓
- GraphQL layer: validate input structure (month/year format, date ranges) using Zod
- Service layer: enforce business rules (valid date ranges, category existence)

### Test Strategy ✓
- MUST test repository layer with real database connection
- MUST test service layer with mocked repositories
- Test utility functions for aggregation logic

### UI Guidelines ✓
- Use snackbars for error/success messages
- Maintain existing loading states and error handling behavior

**Status**: All gates passed - no violations requiring justification

**Post-Design Re-evaluation** (2025-11-28):
- ✅ Schema-Driven Development: No schema changes needed (documented in [contracts/README.md](contracts/README.md))
- ✅ Backend Layer Structure: Three-layer architecture maintained ([quickstart.md](quickstart.md))
- ✅ Repository Pattern: Refactored `findActiveByMonthAndType()` → `findActiveByMonthAndTypes()` with array support; uses portable query patterns ([data-model.md](data-model.md))
- ✅ Authentication & Authorization: User ID from context, no changes to auth flow
- ✅ Input Validation: Existing validation sufficient, no changes needed
- ✅ Test Strategy: Repository tests with real DB, service tests with mocks ([quickstart.md](quickstart.md))
- ✅ UI Guidelines: Backend-only changes, no UI modifications

**All gates continue to pass after design phase.**

**Design Refinements** (post-critique):
- **Q1**: Renamed existing method instead of adding new one - cleaner, eliminates duplication
- **Q2**: Single-pass net calculation (`netAmount += type === EXPENSE ? amount : -amount`) - more efficient than sum-then-subtract
- **Q3**: Kept implicit behavior (EXPENSE fetches both types) - simpler API, matches user mental model, well-documented in schema

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
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
│   ├── schema.graphql          # GraphQL schema (update report query/types)
│   ├── resolvers/              # GraphQL resolvers (query validators)
│   ├── services/               # Business logic (report calculation)
│   └── repositories/           # Database access (transaction queries)
└── tests/

frontend/
├── src/
│   ├── schema.graphql          # Synced from backend
│   ├── components/             # UI components (report display)
│   ├── pages/                  # Report page
│   └── graphql/                # GraphQL operations
└── tests/

backend-cdk/                    # Infrastructure (no changes expected)
frontend-cdk/                   # Infrastructure (no changes expected)
```

**Structure Decision**: Web application with separate backend and frontend packages. This feature will primarily modify the backend GraphQL schema, services, and repositories to support refund calculation, plus frontend components to display the updated report data.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
