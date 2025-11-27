# Implementation Plan: Minimal Refund Transaction Type

**Branch**: `012-minimal-refund` | **Date**: 2025-11-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-minimal-refund/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add REFUND as a new transaction type that represents money received back from previous purchases. REFUND transactions increase account balance (like INCOME), can optionally use expense categories, appear in transaction lists and filters, but are excluded from existing expense reports.

## Technical Context

**Language/Version**: TypeScript (strict mode enabled in both backend and frontend)
**Primary Dependencies**: Backend (Apollo Server, Node.js), Frontend (Vue 3, Vuetify, Apollo Client)
**Storage**: DynamoDB (AWS production), DynamoDB Local (Docker for development)
**Testing**: Jest (both backend and frontend)
**Target Platform**: Web application - AWS Lambda (backend), S3/CloudFront (frontend)
**Project Type**: Web application (frontend + backend packages)
**Performance Goals**: Account balance updates within 1 second, transaction creation under 30 seconds, immediate list updates
**Constraints**: 100% operation success rate for CRUD operations, mobile-first responsive design
**Scale/Scope**: Small feature adding one transaction type (REFUND) to existing transaction system with 5 current types (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Schema-Driven Development
- **Status**: ✓ PASS
- **Action**: Update GraphQL schema to include REFUND transaction type in TransactionType enum
- **Note**: All type generation will follow after schema update

### Backend Layer Structure
- **Status**: ✓ PASS
- **Action**: Extend existing transaction resolver, service, and repository to handle REFUND type
- **Note**: No new services or repositories needed; REFUND is a variant of existing Transaction entity

### Soft-Deletion
- **Status**: ✓ PASS
- **Action**: REFUND transactions use existing isArchived flag for soft-deletion
- **Note**: Already specified in spec.md (FR-012)

### Input Validation
- **Status**: ✓ PASS
- **Action**: Use existing Zod validation patterns for transaction input; validate REFUND-specific business rules (category must be expense type if provided) in service layer
- **Note**: Follows existing transaction validation patterns

### Test Strategy
- **Status**: ✓ PASS
- **Action**: Add repository tests for REFUND CRUD operations, service tests for REFUND business logic (balance calculation, category validation)
- **Note**: Follows existing test patterns for transaction types

### UI Guidelines
- **Status**: ✓ PASS
- **Action**: Use Vuetify components for REFUND tab in transaction form, use existing expandable card pattern
- **Note**: Mobile-first design already implemented in existing transaction components

**Overall Gate Status**: ✓ ALL GATES PASS - No constitution violations detected

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
│   ├── schema.graphql              # GraphQL schema (add REFUND to TransactionType enum)
│   ├── resolvers/                  # GraphQL resolvers
│   │   └── transactionResolver.ts  # Extend to handle REFUND type
│   ├── services/                   # Business logic
│   │   └── transactionService.ts   # Extend for REFUND balance logic and category validation
│   ├── repositories/               # Data access layer
│   │   └── transactionRepository.ts # Extend for REFUND CRUD operations
│   └── models/                     # Generated types from schema
└── tests/
    └── [co-located .test.ts files]

frontend/
├── src/
│   ├── schema.graphql              # Synced from backend (will include REFUND type)
│   ├── components/
│   │   ├── transactions/
│   │   │   ├── TransactionForm.vue      # Add REFUND tab
│   │   │   ├── TransactionList.vue      # Display REFUND transactions
│   │   │   └── TransactionFilters.vue   # Add REFUND filter option
│   │   └── shared/
│   └── composables/                # Generated Apollo composables
└── tests/
    └── [optional component tests]
```

**Structure Decision**: Web application with separate backend and frontend packages. Backend follows three-layer architecture (Resolvers → Services → Repositories). Frontend uses Vue 3 components with Apollo Client for GraphQL communication.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations detected. This feature extends existing transaction infrastructure without introducing new architectural patterns or deviating from established principles.
