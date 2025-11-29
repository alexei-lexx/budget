# Implementation Plan: Fix Pagination Cursor Bug - UserDateIndex Incompatibility

**Branch**: `014-fix-date-pagination` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-fix-date-pagination/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix pagination cursor bug that prevents users from navigating beyond the first page when date filters are applied. The issue stems from cursor encoding that lacks the `date` field required by UserDateIndex queries. The solution involves updating cursor encoding to include all three required fields (`createdAt`, `date`, `id`) and ensuring ExclusiveStartKey construction uses the appropriate field based on the selected DynamoDB index.

## Technical Context

**Language/Version**: TypeScript with strict mode enabled
**Primary Dependencies**: Apollo Server, Node.js, DynamoDB, Jest, Zod
**Storage**: AWS DynamoDB with UserDateIndex and UserCreatedAtIndex GSIs
**Testing**: Jest for repository and service layer tests
**Target Platform**: AWS Lambda (backend), Browser (frontend via Apollo Client)
**Project Type**: Web (backend + frontend)
**Performance Goals**: Pagination queries < 2 seconds (SC-002)
**Constraints**: Error responses < 100ms (SC-005), maintain backward compatibility with existing unfiltered pagination
**Scale/Scope**: Multi-user system with per-user data isolation, cursor-based pagination for transaction lists

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Backend Layer Structure | ✅ PASS | Maintains three-layer architecture (GraphQL → Service → Repository). Changes isolated to cursor encoding/decoding and ExclusiveStartKey construction in repository layer. |
| Schema-Driven Development | ✅ PASS | No GraphQL schema changes required. This is a backend implementation fix for cursor handling. |
| GraphQL Pagination Strategy | ✅ PASS | Already implements Relay-Compatible Cursor pagination. This fix corrects the cursor encoding to support both UserDateIndex and UserCreatedAtIndex queries. |
| Database Record Hydration | ✅ PASS | No changes to record validation patterns. Maintains existing Zod validation at repository boundary. |
| Input Validation | ✅ PASS | Will enhance cursor validation to verify all three required fields (`createdAt`, `date`, `id`) using Zod schemas at GraphQL layer. |
| Authentication & Authorization | ✅ PASS | No changes to auth flow. Maintains user data isolation through userId-scoped queries. |
| Test Strategy | ✅ PASS | Will add/update repository tests with real DynamoDB connection and service tests with mocked repositories. |
| TypeScript Code Generation | ✅ PASS | Maintains strict type safety with no type assertions or non-null assertions. |
| Vendor Independence | ✅ PASS | Maintains repository pattern abstraction for database access. DynamoDB-specific query construction isolated in repository layer. |

**Result**: All gates passed. No constitutional violations. This is a bug fix that strengthens existing pagination implementation without introducing architectural changes.

**Post-Design Re-evaluation** (2025-11-29): All gates remain passing after Phase 1 design. The cursor structure enhancement, Zod validation improvements, and ExclusiveStartKey fixes maintain all constitutional principles. No new dependencies or architectural changes introduced.

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
│   ├── graphql/
│   │   ├── schema.graphql          # GraphQL schema (canonical source)
│   │   ├── resolvers/
│   │   │   └── transaction.ts      # Cursor validation (Zod), calls service
│   │   └── types/                  # Generated TypeScript types from schema
│   ├── services/
│   │   └── transaction.service.ts  # Business logic, orchestrates repository
│   ├── repositories/
│   │   └── transaction.repository.ts  # DynamoDB access, ExclusiveStartKey construction
│   └── utils/
│       └── cursor.ts               # Cursor encode/decode functions
└── tests/
    └── repositories/
        └── transaction.repository.test.ts  # Real DynamoDB tests

frontend/
├── src/
│   ├── graphql/
│   │   ├── schema.graphql          # Synced from backend
│   │   ├── queries/
│   │   │   └── transactions.graphql  # Query with pagination
│   │   └── generated/              # Generated composables
│   └── components/
│       └── TransactionList.vue     # Consumes paginated data
└── tests/
```

**Structure Decision**: Web application with separate backend and frontend packages. This is a backend-focused bug fix affecting:
- **Cursor utilities** (`backend/src/utils/cursor.ts`) - encoding/decoding logic
- **Transaction repository** (`backend/src/repositories/transaction.repository.ts`) - ExclusiveStartKey construction
- **GraphQL resolvers** (`backend/src/graphql/resolvers/transaction.ts`) - cursor validation
- **Repository tests** (`backend/tests/repositories/transaction.repository.test.ts`) - pagination test coverage

Frontend changes are minimal (if any), primarily consuming the corrected backend pagination behavior.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
