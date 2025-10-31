# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a refunds feature allowing users to record refunds against existing expense transactions. Refunds are separate transaction entities (type "REFUND") linked to original expenses, supporting partial/multiple refunds, different destination accounts, and soft-deletion. Design decision focus: refund relationship storage, data loading strategy, and GraphQL type evolution to support refund nesting and summary calculations.

## Technical Context

**Language/Version**: TypeScript with Node.js 18+
**Primary Dependencies**: Apollo GraphQL Server, Vue 3, Apollo Client, DynamoDB, Auth0
**Storage**: DynamoDB with repository pattern abstraction
**Testing**: Jest (backend unit tests, services, repositories)
**Target Platform**: Full-stack web (AWS Lambda backend, CloudFront/S3 frontend)
**Project Type**: Web application with separate backend and frontend packages
**Performance Goals**: Sub-2s refund creation, 100+ refunds per transaction without degradation
**Constraints**: Data isolation by user, soft-deletion required, vendor-independent architecture
**Scale/Scope**: Personal finance tracker with multi-account, multi-currency support

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Soft-Deletion Required**: Refunds must support soft-deletion via `isArchived` flag (matches entity pattern)
✅ **Repository Pattern**: Database access through repositories; all queries scoped to authenticated user
✅ **Vendor Independence**: Repository abstraction preserves DynamoDB portability to SQL/NoSQL
✅ **Service Layer**: Business logic (refund calculations, relationship management) in services, not resolvers
✅ **Type Safety**: TypeScript strict mode; GraphQL schema defines all types and relationships
✅ **Test Strategy**: Jest for repository/service layer unit tests; manual UI verification for frontend

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
│   ├── resolvers/
│   │   └── transaction.ts (refund mutations/queries)
│   ├── services/
│   │   ├── refundService.ts (NEW - refund business logic)
│   │   └── transactionService.ts (enhanced for refund relationship)
│   ├── repositories/
│   │   ├── transactionRepository.ts (enhanced with refund queries)
│   │   └── refundRepository.ts (NEW - refund persistence)
│   └── schema.graphql (enhanced with Refund type + relationships)
└── tests/

frontend/
├── src/
│   ├── components/
│   │   └── TransactionCard.vue (enhanced with refund section)
│   ├── pages/
│   │   └── TransactionList.vue (updated for REFUND type filtering)
│   ├── graphql/
│   │   └── operations/ (NEW refund queries/mutations)
│   └── __generated__/
│       └── (auto-generated from schema changes)
└── tests/
```

**Structure Decision**: Standard two-package web application (backend + frontend). Refunds integrate into existing transaction infrastructure at three layers:
- **Database**: New Refund table or embedded refund records (TBD by research)
- **Services**: New RefundService for business logic; TransactionService enhanced for balance calculations
- **API**: GraphQL schema extended with Refund type and parent Transaction.refunds relationship

## Complexity Tracking

✅ **No violations** - Constitution Check fully satisfied. Standard repository + service patterns apply.
