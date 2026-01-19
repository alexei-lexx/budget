# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add an "Exclude from reports" boolean flag to categories to filter non-operating transactions (investments, loans, reimbursements) from monthly income/expense reports while preserving account balances and transaction history. Requires GraphQL schema update, database migration for existing records, and service layer modifications.

## Technical Context

**Language/Version**: TypeScript (backend Node.js, frontend Vue 3)
**Primary Dependencies**: Apollo Server, Vue 3, Vuetify, AWS CDK, DynamoDB
**Storage**: DynamoDB (NoSQL, single-table design per entity, partition key: userId)
**Testing**: Jest (backend repositories and services, frontend manual testing)
**Target Platform**: AWS Lambda (backend), CloudFront/S3 (frontend), local DynamoDB Docker (dev)
**Project Type**: Web application (backend GraphQL API + frontend SPA)
**Performance Goals**: Standard CRUD latency (<500ms API response), monthly report calculation <2s
**Constraints**: Free-tier AWS usage, vendor portability (repository pattern for DB), schema-driven development
**Scale/Scope**: Single-user personal finance tracker, ~3 packages (backend, frontend, infra-cdk), <100 categories per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| **Schema-Driven Development** | ✅ PASS | Will update `backend/src/schema.graphql` first, then generate types via codegen |
| **Backend Layer Structure** | ✅ PASS | Will modify CategoryService (service layer) and CategoryRepository (repository layer), resolvers delegate to service |
| **Backend GraphQL Layer** | ✅ PASS | Schema reflects business field ("excludeFromReports"), not internal DB implementation |
| **Repository Pattern** | ✅ PASS | Category entity already uses repository pattern; will extend existing CategoryRepository |
| **Database Record Hydration** | ✅ PASS | Will update categorySchema (Zod) to validate new field at repository boundary |
| **Soft-Deletion** | ✅ PASS | No soft-deletion changes needed; feature adds reporting flag, not deletion behavior |
| **Data Migrations** | ✅ PASS | Will create migration file `backend/src/migrations/YYYYMMDDHHMMSS-add-exclude-from-reports.ts` to set new field on existing categories |
| **Authentication & Authorization** | ✅ PASS | No auth changes needed; follows existing userId-scoped pattern in resolvers/services/repos |
| **Test Strategy** | ✅ PASS | Will add tests to `category-repository.test.ts` and `category-service.test.ts` (co-located) |
| **Input Validation** | ✅ PASS | GraphQL layer validates boolean input (Zod), service layer enforces business rules if needed |
| **TypeScript Code Generation** | ✅ PASS | Will run `npm run codegen` in backend and frontend after schema changes |

**No violations detected.** Existing architecture accommodates this feature without introducing complexity or constitutional violations.

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
│   ├── models/
│   │   └── category.ts          # Add excludeFromReports to interfaces
│   ├── repositories/
│   │   ├── schemas/
│   │   │   └── category.ts      # Update Zod schema with new field
│   │   └── category-repository.ts # No changes needed (field auto-handled)
│   ├── services/
│   │   └── category-service.ts  # No changes needed unless business logic added
│   ├── resolvers/
│   │   └── category-resolvers.ts # No changes needed (service handles logic)
│   ├── migrations/
│   │   └── YYYYMMDDHHMMSS-add-exclude-from-reports.ts # NEW: Set field on existing records
│   └── schema.graphql           # Add excludeFromReports: Boolean! to Category type
└── tests/ (co-located with source)
    ├── category-repository.test.ts
    └── category-service.test.ts

frontend/
├── src/
│   ├── schema.graphql           # Sync from backend via npm run codegen:sync-schema
│   ├── __generated__/           # Regenerate types via npm run codegen
│   ├── composables/
│   │   └── useCategories.ts     # May need minor updates if mutation args change
│   └── components/              # UI components for category edit dialog (manual testing)
```

**Structure Decision**: Web application structure with backend (GraphQL API) and frontend (SPA). No infrastructure changes needed as this is a data model extension only.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. Table not applicable.

---

## Post-Phase 1 Constitution Re-Check

| Rule | Status | Phase 1 Confirmation |
|------|--------|---------------------|
| **Schema-Driven Development** | ✅ PASS | Confirmed: Schema updated first in `backend/src/schema.graphql`, codegen ran successfully |
| **Backend Layer Structure** | ✅ PASS | Confirmed: Changes isolated to Category entity, service delegates to repository, no layer violations |
| **Backend GraphQL Layer** | ✅ PASS | Confirmed: `excludeFromReports` is business-facing field name (not internal DB detail) |
| **Repository Pattern** | ✅ PASS | Confirmed: No new repository methods needed, existing pattern handles new field via Zod |
| **Database Record Hydration** | ✅ PASS | Confirmed: Zod schema updated to validate `excludeFromReports` at repository boundary |
| **Soft-Deletion** | ✅ PASS | Confirmed: No changes to soft-deletion behavior, feature is orthogonal |
| **Data Migrations** | ✅ PASS | Confirmed: Migration file created at `backend/src/migrations/`, idempotent pattern used |
| **Authentication & Authorization** | ✅ PASS | Confirmed: No auth changes needed, userId scoping preserved |
| **Test Strategy** | ✅ PASS | Confirmed: Tests added to co-located files (repository.test.ts, service.test.ts) |
| **Input Validation** | ✅ PASS | Confirmed: GraphQL validates boolean type via Zod, no additional service validation needed |
| **TypeScript Code Generation** | ✅ PASS | Confirmed: Codegen workflow documented in quickstart.md |

**Final Assessment**: All constitutional requirements satisfied. Feature implementation aligns with project architecture and governance rules.
