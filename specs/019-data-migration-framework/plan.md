# Implementation Plan: Data Migration Framework

**Branch**: `019-data-migration-framework` | **Date**: 2025-12-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-data-migration-framework/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a Rails-inspired data migration framework for DynamoDB that enables safe, versioned data transformations in both development and production environments. The framework executes migrations locally via npm script and on production via Lambda function, maintains execution history for idempotency, prevents concurrent execution, and enforces a 15-minute timeout limit per migration.

## Technical Context

**Language/Version**: TypeScript (Node.js 18+)
**Primary Dependencies**: AWS CDK, AWS Lambda, AWS SDK for DynamoDB v3, TypeScript
**Storage**: DynamoDB (migration history table with timestamp PK, lock record for concurrency control)
**Testing**: Jest (unit tests for runner logic, integration tests with DynamoDB Local)
**Target Platform**: AWS Lambda (production), Local Node.js with DynamoDB Local (development)
**Project Type**: Web (backend/frontend/backend-cdk/frontend-cdk structure)
**Performance Goals**: Each migration completes within 15 minutes (Lambda timeout constraint)
**Constraints**: 15-minute Lambda timeout, idempotent execution (skip completed migrations), concurrent execution prevention via lock record, manual lock cleanup if Lambda crashes
**Scale/Scope**: Small number of migration files (10-50 expected), operations on existing DynamoDB tables (Categories, Transactions, Accounts, etc.)

## Existing Infrastructure (Reusable Components)

The migration framework can leverage significant existing infrastructure from the current backend and backend-cdk implementations:

### DynamoDB Patterns

**Client Factory** (`backend/src/repositories/utils/dynamoClient.ts`):
- `createDynamoDBClient()` - Already handles local/production environment detection
- Auto-configures endpoint and credentials for NODE_ENV=development/test
- Can be directly imported and reused in migration scripts and Lambda handler

**Table Definition Pattern** (`backend-cdk/lib/backend-cdk-stack.ts:13-19`):
- `commonTableOptions` - Standard configuration for all tables:
  - PAY_PER_REQUEST billing
  - Point-in-time recovery enabled
  - RETAIN removal policy
- Migration history table can use identical pattern

**Schema Validation** (`backend/src/repositories/utils/hydrate.ts`):
- `hydrate()` utility - Validates DynamoDB records against Zod schemas
- Should be used for migration history record validation

### Lambda & Deployment Patterns

**Lambda Function Pattern** (`backend-cdk/lib/backend-cdk-stack.ts:83-116`):
- Complete Lambda definition pattern demonstrated by `graphqlFunction`
- Shows: runtime config, code bundling, environment variables, timeout, memory
- IAM permissions granted via `table.grantReadWriteData(lambdaFunction)`

**Build Process** (`backend/package.json:6-8`):
- `build:bundle` - Uses esbuild to bundle Lambda code to `dist/`
- Current: Single entry point (`src/lambda.ts`)
- Migration Lambda needs separate bundle: `src/lambda/migrate.ts`

**Environment Variables** (`backend-cdk/lib/backend-cdk-stack.ts:87-95`):
- Pattern for passing table names to Lambda via `environment` object
- Migration Lambda can inherit all existing table name env vars (CATEGORIES_TABLE_NAME, TRANSACTIONS_TABLE_NAME, etc.)

### Script Patterns

**Local Script Pattern** (`backend/src/scripts/create-tables.ts:11-18`):
- DynamoDB client creation for local development
- Exact pattern for reading endpoint, region, credentials from env vars
- Can be copied directly for `npm run migrate` script

**Error Handling Pattern** (`backend/src/repositories/CategoryRepository.ts:23-34`):
- Custom error class pattern: `CategoryRepositoryError`
- Includes: error code, original error, descriptive message
- Should be followed for migration errors

### Testing Infrastructure

**Jest Configuration** (`backend/jest.config.json`):
- Already configured: ts-jest preset, 10s timeout
- Test root: `backend/src/`
- Test pattern: `**/?(*.)+(test).ts` (discovers `.test.ts` files anywhere)

**Existing Structure** (**CRITICAL - Co-located Tests**):
- Tests co-located with source files using `.test.ts` suffix
- `src/services/AccountService.test.ts` (next to `AccountService.ts`)
- `src/repositories/CategoryRepository.test.ts` (next to `CategoryRepository.ts`)
- `src/utils/date.test.ts` (next to `date.ts`)
- **Migration tests MUST follow same co-location pattern**
- **Note**: `src/__tests__/` contains only test utilities, NOT test files

### Deployment Script

**Current deploy.sh**:
- Builds backend → Deploys backend-cdk → Deploys frontend-cdk → Deploys frontend
- Migration Lambda invocation must be added after backend-cdk deployment
- Can use AWS CLI `lambda invoke` with `--invocation-type RequestResponse`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Applicable Principles

| Principle | Status | Notes |
|-----------|--------|-------|
| Repository Structure | ✓ PASS | Working in backend/ (migration runner, files) and backend-cdk/ (Lambda, table definition) |
| Backend Layer Structure | ⚠️ EXCEPTION | Migration framework is standalone utility, not GraphQL API. Does not follow resolver→service→repository pattern. See Complexity Tracking. |
| Database Record Hydration | ✓ PASS | Migration history records validated when read from DynamoDB |
| Test Strategy | ✓ PASS | Unit tests for runner logic, integration tests with DynamoDB Local |
| Input Validation | ✓ PASS | Validate migration file structure (exported `up` function signature) |
| TypeScript Code Generation | ✓ PASS | Follow strict type safety, avoid `!` and `as any`, run format/lint |
| Vendor Independence | ⚠️ VIOLATION | Direct DynamoDB SDK usage creates vendor lock-in. See Complexity Tracking. |

### Non-Applicable Principles

- Schema-Driven Development: No GraphQL schema changes
- Backend GraphQL Layer: No API changes
- GraphQL Pagination Strategy: Not applicable
- Backend Service Layer: Standalone utility, not a service
- Soft-Deletion: Migration history is append-only, no deletion needed
- Authentication & Authorization: Lambda execution context, not user-facing
- UI Guidelines: Backend-only feature
- Frontend Code Discipline: Backend-only feature

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
│   ├── migrations/                    # Migration files and runner
│   │   ├── index.ts                   # Explicit imports/exports of all migrations
│   │   ├── runner.ts                  # Shared migration execution logic
│   │   ├── runner.test.ts             # Unit test for runner (co-located)
│   │   ├── operations/                # Core operation modules
│   │   │   ├── lock.ts                # Lock acquisition/release
│   │   │   ├── lock.test.ts           # Unit test for lock (co-located)
│   │   │   ├── history.ts             # Migration history tracking
│   │   │   ├── history.test.ts        # Unit test for history (co-located)
│   │   │   ├── loader.ts              # Migration file discovery
│   │   │   └── loader.test.ts         # Unit test for loader (co-located)
│   │   ├── types.ts                   # TypeScript interfaces
│   │   ├── utils/                     # Utilities (reuses existing dynamoClient)
│   │   ├── schemas/                   # Zod schemas for validation
│   │   ├── 20250101000000-example-count-categories.ts   # Example: read-only migration
│   │   ├── 20250101000100-example-update-categories.ts  # Example: write migration (safe)
│   │   └── [future migrations].ts     # Developer-created migrations
│   ├── lambda/
│   │   ├── migrate.ts                 # Lambda handler for production
│   │   └── migrate.test.ts            # Integration test for Lambda (co-located)
│   ├── scripts/
│   │   ├── migrate.ts                 # Local npm script entry point
│   │   ├── migrate.test.ts            # Integration test for script (co-located)
│   │   └── migration-status.ts        # Diagnostic script
│   └── __tests__/                     # Test utilities ONLY (not test files)
│       └── utils/                     # Shared test helpers
│           └── migrationHelpers.ts    # DynamoDB test utilities for migrations

backend-cdk/
└── lib/
    └── backend-cdk-stack.ts           # Add migration Lambda + history table

deploy.sh                               # Modified: invoke migration Lambda after CDK deploy
```

**Structure Decision**: Web application structure (backend + backend-cdk). Migration framework is backend-only with no frontend changes. Core logic lives in `backend/src/migrations/runner.ts` and is invoked by both the local npm script (`backend/src/scripts/migrate.ts`) and Lambda handler (`backend/src/lambda/migrate.ts`). CDK defines the Lambda function and migration history table in `backend-cdk/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Backend Layer Structure (3-layer pattern) | Migration framework is a standalone utility for data transformations, not a GraphQL API endpoint | Resolver→Service→Repository pattern is designed for user-facing API operations. Migrations are operational tasks that directly manipulate data outside the normal API flow. Adding service/repository layers would create unnecessary abstraction with no benefit. |
| Vendor Independence (DynamoDB SDK) | Migrations must use DynamoDB client directly to perform data transformations on production tables | The constitution's vendor independence principle requires repository abstraction for normal application code. However, migrations are database-specific by nature—they exist to fix data issues in the specific database system we're using. A database-agnostic migration framework would be over-engineered for a system that currently has zero plans to migrate databases. If database migration becomes necessary, we would rewrite migrations for the new database anyway. |
