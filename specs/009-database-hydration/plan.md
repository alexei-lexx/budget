# Implementation Plan: Database Record Hydration Pattern

**Branch**: `009-database-hydration` | **Date**: 2025-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Implement Database Record Hydration Pattern using Zod schemas to validate database records at the repository boundary

**Note**: This plan implements the constitutional principle "Database Record Hydration" for all entity repositories.

## Summary

The feature implements a generic, reusable database record hydration pattern using Zod schemas to validate all data read from DynamoDB at the repository boundary. This ensures data integrity through compile-time schema validation and runtime validation errors, preventing corrupted or incomplete data from propagating to service and resolver layers. The pattern applies consistently across all repositories (Account, Category, Transaction, User) using a shared `createHydrator<T>` utility function with TypeScript's `satisfies z.ZodType<EntityType>` for compile-time type safety.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+
**Primary Dependencies**: Zod (already available), Apollo Server, DynamoDB AWS SDK
**Storage**: AWS DynamoDB (production), DynamoDB Local with Docker Compose (development)
**Testing**: Jest with test environment setup
**Target Platform**: AWS Lambda (production), Node.js development server
**Project Type**: Web (backend + frontend monorepo)
**Performance Goals**: Validation overhead <1ms per record (negligible vs database latency)
**Constraints**: Must not break existing functionality, validation in all repository read operations
**Scale/Scope**: 4 entity repositories (User, Account, Category, Transaction) with 3+ million records max per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Database Record Hydration Principle**: This feature directly implements the constitutional principle. All data read from the database MUST be validated at the repository boundary using Zod schemas with TypeScript interface compile-time type safety.

✅ **Repository Pattern**: Enhances existing repository pattern with validation layer. All repositories abstract database operations; hydration adds validation to those operations.

✅ **Vendor Independence**: Uses Zod (vendor-agnostic) for schema validation. Pattern is portable to any database backend.

✅ **Schema-Driven Development**: Works alongside GraphQL schema validation. Database hydration validates at data source (DynamoDB); GraphQL schema validates at API boundary.

✅ **Soft-Deletion Compatibility**: Hydration validates all record fields including `isArchived` flags without conflict.

**Result**: ✅ PASS - Feature aligns with all constitutional principles and enhances repository pattern

## Project Structure

### Documentation (this feature)

```text
specs/009-database-hydration/
├── spec.md              # Feature specification
├── plan.md              # This file (Phase 0 planning output)
├── research.md          # Phase 0 output (research findings)
├── data-model.md        # Phase 1 output (entity schemas, validation)
├── contracts/           # Phase 1 output (Zod schemas, type exports)
├── quickstart.md        # Phase 1 output (implementation guide)
└── tasks.md             # Phase 2 output (actionable implementation tasks)
```

### Source Code (backend package)

```text
backend/
├── src/
│   ├── models/                            # TypeScript interfaces (existing)
│   │   ├── Account.ts
│   │   ├── Category.ts
│   │   ├── Transaction.ts
│   │   └── User.ts
│   ├── repositories/                      # Repository classes (existing)
│   │   ├── AccountRepository.ts           # Add hydration here
│   │   ├── CategoryRepository.ts          # Add hydration here
│   │   ├── TransactionRepository.ts       # Add hydration here
│   │   ├── UserRepository.ts              # Add hydration here
│   │   └── utils/                         # Repository utilities
│   │       ├── Account.schema.ts          # NEW: Account Zod schema
│   │       ├── Category.schema.ts         # NEW: Category Zod schema
│   │       ├── Transaction.schema.ts      # NEW: Transaction Zod schema
│   │       ├── User.schema.ts             # NEW: User Zod schema
│   │       ├── dynamoClient.ts            # Existing
│   │       ├── pagination.ts              # Existing
│   │       └── constants.ts               # Existing
│   ├── services/
│   │   ├── TransactionService.ts          # Depends on hydrated repositories
│   │   ├── AccountService.ts              # Depends on hydrated repositories
│   │   └── TransferService.ts             # Depends on hydrated repositories
│   └── resolvers/                         # GraphQL resolvers (consume validated data)
│
└── __tests__/                             # Test files (existing structure)
    ├── repositories/
    │   ├── AccountRepository.test.ts      # Updated with hydration tests
    │   ├── CategoryRepository.test.ts     # Updated with hydration tests
    │   ├── TransactionRepository.test.ts  # Updated with hydration tests
    │   └── UserRepository.test.ts         # Updated with hydration tests
    └── ...
```

**Structure Decision**: The feature is backend-only infrastructure enhancement. Zod schemas are internal to the repositories package in `backend/src/repositories/utils/`. Each repository defines its own hydration function (no shared utility) that catches ZodError and throws repository-specific errors. Hydration is added to repository read methods. Tests validate hydration behavior as part of existing repository test suites.

## Complexity Tracking

No constitutional violations. This feature enhances the repository pattern without increasing architectural complexity. Zod is already a project dependency. The implementation is minimal: 4 schema files and inline hydration functions in each repository. No additional utility files or abstract patterns needed.

## Phase 0: Research ✅ COMPLETE

Generated `research.md` with:
- ✅ Zod schema patterns and best practices
- ✅ TypeScript compilation type safety patterns (satisfies keyword)
- ✅ DynamoDB hydration integration patterns
- ✅ Error transformation and handling patterns
- ✅ Generic hydration utility patterns
- ✅ DynamoDB-specific considerations
- ✅ Compliance with constitution

**Status**: All research questions resolved

---

## Phase 1: Design ✅ COMPLETE

Generated design artifacts:
- ✅ `data-model.md` - Entity schemas with validation rules for User, Account, Category, Transaction
- ✅ `contracts/SPECIFICATION.md` - Design specification defining what files to implement and what each should export
- ✅ `quickstart.md` - Implementation guide with patterns, checklists, and troubleshooting (not copy-paste code)
- ✅ Updated agent context: Claude Code context enhanced with hydration patterns

**Status**: All design artifacts complete. Constitution re-check passed. ✅

**Constitution Re-Check**:
- ✅ Database Record Hydration Principle: Zod schemas validate at repository boundary
- ✅ Repository Pattern: Hydration enhances existing repositories
- ✅ Compile-Time Type Safety: `satisfies z.ZodType<T>` ensures schema/interface sync
- ✅ Error Handling: HydrationError with field-level validation details
- ✅ Vendor Independence: Zod is vendor-agnostic, pattern portable to any database
- ✅ No Breaking Changes: Pattern is additive, transparent to service layer

---

## Phase 2: Implementation Tasks

Generated via `/speckit.tasks` command (separate invocation)

Next command: `/speckit.tasks` to generate `tasks.md` with actionable implementation steps
