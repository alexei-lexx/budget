---

description: "Task list for Transfer Transaction Sort Order Fix implementation"
---

# Tasks: Transfer Transaction Sort Order Fix

**Input**: Design documents from `/specs/018-fix-transfer-sort/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, research.md, quickstart.md

**Tests**: Repository tests are included following the backend testing strategy from the constitution.

**Organization**: Tasks organized by user story to enable independent implementation and testing.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with backend and frontend packages:
- **Backend**: `backend/src/`, `backend-cdk/lib/`
- **Frontend**: `frontend/src/` (no changes for this feature)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install required dependencies for ULID support

- [ ] T001 Install ulidx dependency in backend/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**Status**: ✅ SKIP - No foundational work needed. Existing infrastructure (DynamoDB, repository pattern, migration framework) already supports this feature.

**Checkpoint**: Foundation ready - user story implementation can begin immediately after Setup (Phase 1)

---

## Phase 3: User Story 1 - Fix Transfer Transaction Sort Order (Priority: P1) 🎯 MVP

**Goal**: Fix the ordering of paired transfer transactions in the transactions list by implementing deterministic database-level sorting using ULID-based IDs and a composite sort key.

**Independent Test**:
1. Create a transfer from Account A to Account B
2. Navigate to transactions page (without account filtering)
3. Verify TRANSFER_IN transaction appears before TRANSFER_OUT transaction

### Implementation for User Story 1

- [ ] T002 [US1] Switch from UUID to ULID for ID generation in backend/src/repositories/TransactionRepository.ts
- [ ] T003 [US1] Add createdAtId field to DynamoDB items in backend/src/repositories/TransactionRepository.ts
- [ ] T004 [US1] Update cursor logic for createdAtId field in backend/src/repositories/TransactionRepository.ts
- [ ] T005 [US1] Update index name constant and all query references in backend/src/repositories/TransactionRepository.ts
- [ ] T006 [P] [US1] Update index definition in backend/src/scripts/create-tables.ts
- [ ] T007 [P] [US1] Update table schema in backend-cdk/lib/backend-cdk-stack.ts
- [ ] T008 [US1] Create migration file backend/src/migrations/YYYYMMDDHHMMSS-populate-createdAtId.ts (use current timestamp, e.g., 20251206143000-populate-createdAtId.ts)
- [ ] T009 [US1] Update existing repository tests in backend/src/repositories/TransactionRepository.test.ts
- [ ] T010 [US1] Add transfer ordering test in backend/src/repositories/TransactionRepository.test.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validation and deployment readiness checks

- [ ] T011 [P] Run local testing per quickstart.md validation (recreate tables, run migration, test transfers)
- [ ] T012 Verify deployment steps readiness and document deployment order

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Skipped - no blocking infrastructure needed
- **User Story 1 (Phase 3)**: Depends on Setup (Phase 1) completion
- **Polish (Phase 4)**: Depends on User Story 1 (Phase 3) completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup (Phase 1) - No dependencies on other stories (only story in this feature)

### Within User Story 1

**Sequential Tasks** (same file, must run in order):
- T002 → T003 → T004 → T005 (all in TransactionRepository.ts)
- T009 → T010 (both in TransactionRepository.test.ts)

**Parallel Opportunities**:
- T006 (create-tables.ts) and T007 (backend-cdk stack) can run in parallel
- After T002-T005 complete: T006, T007, T008 can run in parallel
- After implementation (T002-T008) completes: T009, T010 follow sequentially

### Task Breakdown Details

**T002**: Switch from UUID to ULID
- Import `ulid` from `ulidx` package
- Replace `randomUUID()` with `ulid()` in `buildTransaction` method
- Update related comments

**T003**: Add createdAtId to DynamoDB items
- In `create` method: Add `createdAtId: \`${transaction.createdAt}#${transaction.id}\`` to DynamoDB item
- In `createMany` method: Add `createdAtId: \`${transaction.createdAt}#${transaction.id}\`` to each DynamoDB item
- Ensure returned Transaction objects do NOT include createdAtId (only in DB items)

**T004**: Update cursor logic
- Update `CursorData` interface: Replace `createdAt` with `createdAtId`
- Update `encodeCursor`: Read `createdAtId` from raw DynamoDB item before hydration
- Update `decodeCursor`: Parse `createdAtId` from cursor
- Update `ExclusiveStartKey` in pagination: Use `createdAtId` instead of `createdAt`

**T005**: Update index references
- Update constant: `USER_CREATED_AT_ID_INDEX = "UserCreatedAtIdIndex"`
- Update all query `IndexName` parameters to use new constant
- Verify all queries using the index are updated

**T006**: Update create-tables.ts
- Remove `createdAt` from `AttributeDefinitions`
- Add `createdAtId` to `AttributeDefinitions` with type "S"
- Remove `UserCreatedAtIndex` from `GlobalSecondaryIndexes`
- Add `UserCreatedAtIdIndex` with `userId` (HASH) and `createdAtId` (RANGE)

**T007**: Update backend-cdk stack
- Remove `createdAt` from attribute definitions
- Add `createdAtId` attribute definition (String type)
- Remove `UserCreatedAtIndex` from GSI definitions
- Add `UserCreatedAtIdIndex` with `userId` (partition) and `createdAtId` (sort key)

**T008**: Create migration
- Create file: `backend/src/migrations/YYYYMMDDHHMMSS-populate-createdAtId.ts` (e.g., `20251206143000-populate-createdAtId.ts`)
- Implement `up` function with DynamoDB client parameter
- Scan all transactions
- Filter items missing `createdAtId`
- Batch update in groups of 25 (DynamoDB TransactWrite limit)
- Compute `createdAtId = \`${createdAt}#${id}\`` for each item
- Add idempotency check (skip if `createdAtId` exists)
- Log progress (scanned count, updated count)

**T009**: Update existing repository tests
- Verify `id` field is ULID format (26 characters, base32)
- Verify returned Transaction objects do NOT have `createdAtId` field
- Query raw DynamoDB items and verify they DO have `createdAtId` field
- Update cursor-related tests for new format

**T010**: Add transfer ordering test
- Create paired transfer transactions (TRANSFER_IN and TRANSFER_OUT with same timestamp)
- Query transactions via `findActiveByUserId`
- Assert TRANSFER_IN appears before TRANSFER_OUT in descending order
- Verify ordering is deterministic across multiple queries

**T011**: Local testing validation
- Run `npm install` to install ulidx
- Run `npm run db:recreate` to recreate local tables with new index
- Run `npm run migrate` to execute migration
- Create test transfer via GraphQL mutation
- Query transactions list and verify order
- Run `npm test -- TransactionRepository.test.ts` to verify all tests pass

**T012**: Deployment readiness
- Document deployment order: CDK → Migration → Backend code
- Verify migration is idempotent
- Confirm rollback plan is understood
- Note: Existing pagination cursors will be invalidated (acceptable)

---

## Parallel Example: User Story 1

```bash
# After completing T002-T005 (repository implementation), launch infrastructure tasks in parallel:
Task T006: "Update index definition in backend/src/scripts/create-tables.ts"
Task T007: "Update table schema in backend-cdk/lib/backend-cdk-stack.ts"

# Then T008 can proceed:
Task T008: "Create migration file backend/src/migrations/[timestamp]-populate-createdAtId.ts"

# Then test tasks run sequentially (same file):
Task T009: "Update existing repository tests"
Task T010: "Add transfer ordering test"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install ulidx)
2. Skip Phase 2: Foundational (no blocking work needed)
3. Complete Phase 3: User Story 1
   - T002-T005: Repository implementation (sequential, same file)
   - T006-T007: Infrastructure (parallel, different files)
   - T008: Migration (after repository understanding)
   - T009-T010: Tests (sequential, same file)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Complete Phase 4: Polish & validation
6. Deploy using documented deployment order

### Incremental Delivery

1. Complete Setup (T001) → Dependencies ready
2. Implement repository changes (T002-T005) → Core logic complete
3. Update infrastructure (T006-T007) → Database schema ready
4. Create migration (T008) → Existing data migration ready
5. Update tests (T009-T010) → Verification complete
6. Validate locally (T011) → Confidence in implementation
7. Document deployment (T012) → Ready for production

### Key Implementation Notes

**No API Changes**:
- GraphQL schema unchanged
- Transaction interface unchanged (createdAtId NOT added to interface)
- Service layer unchanged (completely unaware of createdAtId)
- Resolvers unchanged
- Frontend unchanged

**Database-Only Field**:
- `createdAtId` exists ONLY in DynamoDB items
- Added during storage (create/createMany)
- Stripped during hydration (Zod schema automatically removes it)
- Repository accesses it from raw DynamoDB items for pagination
- Never exposed to service/GraphQL/frontend layers

**Why This Works**:
- ULIDs are lexicographically sortable by creation time
- Composite key `createdAt#id` ensures deterministic sorting
- When transfers created at same millisecond: second ULID > first ULID
- Descending sort by `createdAtId` → TRANSFER_IN (larger ULID) before TRANSFER_OUT (smaller ULID)
- Achieves correct user-facing order: inbound then outbound

---

## Notes

- Tasks marked [P] can run in parallel (different files, no dependencies)
- [US1] label maps task to User Story 1 for traceability
- User Story 1 is independently testable and represents complete MVP
- Commit after each task or logical group
- Stop at checkpoints to validate story independently
- Constitution compliance: Repository pattern preserved, no GraphQL schema changes, backend-first testing approach followed
