---
description: "Task list for Data Migration Framework implementation (REVISED with existing infrastructure)"
---

# Tasks: Data Migration Framework

**Input**: Design documents from `/specs/019-data-migration-framework/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## 🎯 Implementation Status: 67% Complete (31/46 tasks)

| Phase | Status | Progress | Notes |
|-------|--------|----------|-------|
| Setup (Phase 1) | ✅ **COMPLETE** | 4/4 (100%) | Directory structure, dependencies, config |
| Foundational (Phase 2) | ✅ **COMPLETE** | 3/3 (100%) | CDK table, types, validation |
| User Story 1 (P1) | ✅ **COMPLETE** | 15/15 (100%) | **Local migrations working** 🎉 |
| User Story 2 (P2) | ✅ **COMPLETE** | 6/6 (100%) | **Production deployment working** 🚀 |
| User Story 3 (P3) | ⚠️ **PARTIAL** | 2/8 (25%) | Missing: status script, docs |
| Polish (Phase 6) | ⚠️ **MINIMAL** | 1/10 (10%) | Missing: generator, enhanced docs |

**Core Framework**: ✅ **PRODUCTION READY** - Local execution & deployment automation complete
**Remaining Work**: Observability tooling (US3) and developer experience improvements (Polish)

---

**Tests**: Tests are included based on constitution requirements (unit tests for runner logic, integration tests with DynamoDB Local)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Revision Notes**: This task list has been optimized to leverage existing backend infrastructure. Key changes:
- Eliminated tasks for infrastructure that already exists (DynamoDB client factory)
- Consolidated Lambda deployment tasks by referencing existing patterns
- Fixed test paths to align with jest.config.json (backend/src/__tests__/)
- Added explicit references to reusable patterns from existing codebase

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `backend/src/`, `backend-cdk/lib/`
- **Test pattern**: Co-located `.test.ts` files (e.g., `file.ts` → `file.test.ts` in same directory)
- **Test utilities**: `backend/src/__tests__/utils/` (NOT test files, only helpers/mocks)
- Root: `deploy.sh`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic TypeScript structure

- [X] T001 Create migrations directory structure in backend/src/migrations/ with subdirectories: operations/, utils/, schemas/
- [X] T002 Install AWS SDK for DynamoDB v3 dependencies in backend/package.json (if not already present)
- [X] T003 [P] Configure TypeScript compiler options for migrations in backend/tsconfig.json
- [X] T004 [P] Verify Jest configuration for migration tests in backend/jest.config.json (already configured, tests in src/__tests__/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Define migration history DynamoDB table in backend-cdk/lib/backend-cdk-stack.ts using existing commonTableOptions pattern (lines 13-19)
- [X] T006 [P] Create TypeScript types for migration interfaces in backend/src/migrations/types.ts following contract specifications
- [X] T007 [P] Create migration history table schema validation in backend/src/migrations/schemas/history-record.ts using Zod (follow existing hydrate() pattern from repositories/utils/hydrate.ts)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Run Migration Locally (Priority: P1) 🎯 MVP

**Goal**: Developer can create migration files, test them locally against DynamoDB Local, and verify execution via npm script

**Independent Test**: Create a test migration that updates Categories table, run `npm run migrate` locally, verify migration executes successfully and is tracked in migration history table

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
> **Tests are co-located with source files using .test.ts suffix (NOT in __tests__/ directory)**

- [X] T008 [P] [US1] Unit test for lock acquisition logic in backend/src/migrations/operations/lock.test.ts (co-located with lock.ts) - IMPLEMENTED in migrations-table.test.ts
- [X] T009 [P] [US1] Unit test for migration history operations in backend/src/migrations/operations/history.test.ts (co-located with history.ts) - IMPLEMENTED in migrations-table.test.ts
- [X] T010 [P] [US1] Unit test for migration loader in backend/src/migrations/operations/loader.test.ts (co-located with loader.ts)
- [X] T011 [US1] Integration test for full migration run in backend/src/scripts/migrate.test.ts (co-located with migrate.ts) - IMPLEMENTED in runner.test.ts

### Implementation for User Story 1

- [X] T012 [P] [US1] Implement lock acquisition operations in backend/src/migrations/operations/lock.ts using DynamoDB conditional PutItem - IMPLEMENTED in migrations-table.ts
- [X] T013 [P] [US1] Implement migration history operations in backend/src/migrations/operations/history.ts (isExecuted, markExecuted, getExecutedMigrations) - IMPLEMENTED in migrations-table.ts
- [X] T014 [P] [US1] Implement migration loader operations in backend/src/migrations/operations/loader.ts (loadMigrations, validateMigration)
- [X] T015 [US1] Implement core migration runner logic in backend/src/migrations/runner.ts (depends on T012, T013, T014) - orchestrates lock, load, execute, update history
- [X] T016 [P] [US1] Create example read-only migration in backend/src/migrations/20250101000000-example-count-categories.ts (scan and count Categories table)
- [X] T017 [P] [US1] Create example write migration in backend/src/migrations/20250101000100-example-update-categories.ts (safe update with always-false condition)
- [X] T018 [US1] Create migrations index file in backend/src/migrations/index.ts that exports both example migrations (depends on T016, T017)
- [X] T019 [US1] Implement local npm script entry point in backend/src/scripts/migrate.ts following existing pattern from src/scripts/create-tables.ts:11-18 for DynamoDB client creation (depends on T015)
- [X] T020 [US1] Add "migrate" npm script to backend/package.json scripts section
- [X] T021 [US1] Add migration execution logging with console.log statements in backend/src/migrations/runner.ts (progress, stats, errors)
- [X] T022 [US1] Add error handling for migration failures in backend/src/migrations/runner.ts following CategoryRepositoryError pattern (CategoryRepository.ts:23-34)

**Checkpoint**: At this point, User Story 1 should be fully functional - developers can create and run migrations locally

---

## Phase 4: User Story 2 - Automatic Migration on Deployment (Priority: P2)

**Goal**: Migrations execute automatically during production deployment via Lambda function invoked by deploy.sh

**Independent Test**: Deploy to staging with a new test migration, verify Lambda executes it automatically and deployment waits for completion

### Tests for User Story 2

- [X] T023 [US2] Integration test for Lambda handler in backend/src/lambda/migrate.test.ts (co-located with migrate.ts) - Tests exist in runner.test.ts

### Implementation for User Story 2

- [X] T024 [P] [US2] Create Lambda handler entry point in backend/src/lambda/migrate.ts that imports and invokes runMigrations() from runner.ts with production DynamoDB client
- [X] T025 [US2] Define migration Lambda function in backend-cdk/lib/backend-cdk-stack.ts following existing graphqlFunction pattern (lines 83-116): runtime config, 15-minute timeout, environment variables (inherit existing CATEGORIES_TABLE_NAME, TRANSACTIONS_TABLE_NAME, etc. plus MIGRATIONS_TABLE_NAME), IAM grants using table.grantReadWriteData() pattern
- [X] T026 [US2] Add migration Lambda bundle build to backend/package.json - create separate build:bundle:migrate script using esbuild for src/lambda/migrate.ts entry point
- [X] T027 [US2] Modify deploy.sh to invoke migration Lambda function synchronously after backend-cdk deployment using AWS CLI: aws lambda invoke --invocation-type RequestResponse
- [X] T028 [US2] Add deployment error handling in deploy.sh to halt deployment if migration Lambda fails (check exit code and response)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - local development and production deployment both execute migrations

---

## Phase 5: User Story 3 - Migration History Tracking (Priority: P3)

**Goal**: System maintains independent migration history per environment (dev, staging, prod) and provides visibility into execution status

**Independent Test**: Run migrations in local environment, query migration history table, verify records exist with correct timestamps. Run same migration again, verify it skips (idempotent).

### Tests for User Story 3

- [ ] T029 [P] [US3] Unit test for environment-specific history tracking in backend/src/migrations/utils/environment.test.ts (co-located with environment.ts)
- [X] T030 [US3] Integration test for idempotent migration execution in backend/src/migrations/runner.test.ts (additional test case in existing runner.test.ts)

### Implementation for User Story 3

- [ ] T031 [US3] Add NODE_ENV-based environment detection in backend/src/migrations/utils/environment.ts (reuse existing pattern from repositories/utils/dynamoClient.ts:4-5)
- [X] T032 [US3] Verify migration history table isolation per environment in backend-cdk/lib/backend-cdk-stack.ts (separate table per env via CDK stack naming)
- [ ] T033 [P] [US3] Create diagnostic script to query migration history in backend/src/scripts/migration-status.ts using existing DynamoDB client pattern
- [ ] T034 [US3] Add npm script "migrate:status" to backend/package.json pointing to migration-status.ts
- [ ] T035 [US3] Document environment variable requirements in backend/src/migrations/README.md (MIGRATIONS_TABLE_NAME, table names, NODE_ENV)
- [ ] T036 [US3] Add migration history query examples in backend/src/migrations/README.md showing how to check execution status

**Checkpoint**: All user stories should now be independently functional - complete migration framework with local execution, production deployment, and history tracking

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and overall quality

- [ ] T037 [P] Add comprehensive error messages for lock acquisition failures in backend/src/migrations/operations/lock.ts (lock already held, timeout, DynamoDB errors)
- [ ] T038 [P] Add comprehensive error messages for migration validation failures in backend/src/migrations/operations/loader.ts (missing up function, invalid signature, file not found)
- [ ] T039 Add stale lock cleanup documentation in quickstart.md troubleshooting section with AWS CLI command examples
- [ ] T040 Add migration timeout handling documentation in quickstart.md best practices section (15-minute limit, splitting strategies)
- [ ] T041 [P] Create migration file template/generator script in backend/src/scripts/create-migration.ts that generates timestamped filename with boilerplate
- [ ] T042 Add code comments for migration runner core logic in backend/src/migrations/runner.ts explaining workflow steps
- [X] T043 Run npm run format and fix all ESLint issues in backend/src/migrations/
- [ ] T044 Verify all migrations follow naming convention (YYYYMMDDHHMMSS-description.ts) pattern
- [ ] T045 Run quickstart.md validation: create test migration, run locally, verify results, test idempotency
- [ ] T046 Update backend/README.md with migration framework usage instructions and npm script reference

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories. Creates core runner logic used by US2.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 runner logic being complete (T015). Adds Lambda handler and deployment integration.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US1 history operations being complete (T013). Adds environment isolation and diagnostic tools.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Parallel operations (lock, history, loader) before runner core
- Runner core before entry points (npm script, Lambda handler)
- Infrastructure (CDK) before deployment (deploy.sh)
- Core implementation before documentation

### Parallel Opportunities

- **Setup**: T003, T004 can run in parallel
- **Foundational**: T006, T007 can run in parallel after T005
- **US1 Tests**: T008, T009, T010 can run in parallel
- **US1 Operations**: T012, T013, T014 can run in parallel
- **US1 Examples**: T016, T017 can run in parallel
- **US2 Infrastructure**: T024, T025 can run in parallel
- **US3 Tests**: T029 independent, T030 after US1 runner complete
- **US3 Docs**: T033, T035, T036 can run in parallel
- **Polish**: T037, T038, T041 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (co-located with source):
Task: "Unit test for lock acquisition logic in backend/src/migrations/operations/lock.test.ts"
Task: "Unit test for migration history operations in backend/src/migrations/operations/history.test.ts"
Task: "Unit test for migration loader in backend/src/migrations/operations/loader.test.ts"

# Launch all operation modules for User Story 1 together:
Task: "Implement lock acquisition operations in backend/src/migrations/operations/lock.ts"
Task: "Implement migration history operations in backend/src/migrations/operations/history.ts"
Task: "Implement migration loader operations in backend/src/migrations/operations/loader.ts"

# Launch both example migrations together:
Task: "Create example read-only migration in backend/src/migrations/20250101000000-example-count-categories.ts"
Task: "Create example write migration in backend/src/migrations/20250101000100-example-update-categories.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch Lambda handler and CDK definition together:
Task: "Create Lambda handler entry point in backend/src/lambda/migrate.ts"
Task: "Define migration Lambda function in backend-cdk/lib/backend-cdk-stack.ts following graphqlFunction pattern"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T007) - CRITICAL blocks all stories
3. Complete Phase 3: User Story 1 (T008-T022)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Create a test migration
   - Run `npm run migrate` locally
   - Verify migration executes and is tracked
   - Run again, verify idempotency
5. Deploy/demo if ready (local development workflow complete)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - local migrations!)
3. Add User Story 2 → Test independently → Deploy/Demo (production deployment!)
4. Add User Story 3 → Test independently → Deploy/Demo (full observability!)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T007)
2. Once Foundational is done:
   - Developer A: User Story 1 core (T008-T022)
   - Developer B: Can start preparing User Story 2 tests (T023)
3. After US1 runner complete (T015):
   - Developer A: User Story 3 (T029-T036)
   - Developer B: User Story 2 (T024-T028)
4. Stories complete and integrate independently

---

## Task Summary

**Total Tasks**: 46 (reduced from 53 by leveraging existing infrastructure)
**Completed Tasks**: 31 (67%)
**Remaining Tasks**: 15 (33%)

**Completion by Phase**:
- ✅ Setup (Phase 1): 4/4 tasks (100%)
- ✅ Foundational (Phase 2): 3/3 tasks (100%)
- ✅ User Story 1 (P1): 15/15 tasks (100%) - **MVP COMPLETE**
- ✅ User Story 2 (P2): 6/6 tasks (100%) - **PRODUCTION READY**
- ⚠️ User Story 3 (P3): 2/8 tasks (25%) - **PARTIAL** (observability missing)
- ⚠️ Polish (Phase 6): 1/10 tasks (10%) - **MINIMAL** (docs/generator missing)

**Reductions Applied**:
- Eliminated 1 task (DynamoDB client factory - already exists)
- Consolidated 7 Lambda tasks into 2 (following existing graphqlFunction pattern)
- Net reduction: 7 tasks (13% efficiency gain)

**Parallel Opportunities**: 15 tasks marked [P] can run in parallel within their phase

**Independent Test Criteria**:
- **US1**: ✅ Create test migration, run `npm run migrate`, verify execution and history tracking
- **US2**: ✅ Deploy with new migration, verify Lambda executes automatically
- **US3**: ⚠️ Query history table, verify environment isolation and idempotency (needs migration-status script)

**MVP Status**: ✅ **COMPLETE** - User Story 1 & 2 fully functional (local + production)

**Existing Infrastructure Leveraged**:
- DynamoDB client factory (repositories/utils/dynamoClient.ts)
- Table definition pattern (backend-cdk-stack.ts commonTableOptions)
- Lambda deployment pattern (backend-cdk-stack.ts graphqlFunction)
- Script pattern (src/scripts/create-tables.ts)
- Error handling pattern (repositories CategoryRepositoryError)
- Test infrastructure (jest.config.json)
- Environment variable pattern (backend-cdk-stack.ts)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow constitution: strict TypeScript, avoid `!` and `as any`, run format/lint
- Migration framework violates 3-layer pattern (justified in plan.md Complexity Tracking)
- **CRITICAL**: Tests are co-located with source files using `.test.ts` suffix (e.g., `lock.ts` → `lock.test.ts` in same directory) - NOT in separate `__tests__/` directories
- The `backend/src/__tests__/` directory contains only test utilities (helpers, mocks, factories), NOT test files
- Reuse existing patterns wherever possible - see plan.md "Existing Infrastructure" section
