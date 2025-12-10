# Tasks: Transfer Transaction Sort Order Fix

**Input**: Design documents from `/specs/018-fix-transfer-sort/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Repository tests will be updated as part of implementation (test updates integrated with implementation tasks).

**Organization**: This feature has a single user story focused on fixing the transfer transaction sort order via database-level changes using a separate sortable field.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `backend-cdk/lib/`, `frontend/` (no frontend changes)
- Paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and prepare development environment

- [X] T001 Install ulidx package in backend/package.json via npm install ulidx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational prerequisites needed - this is an isolated database/repository change

**Checkpoint**: Setup complete - can proceed with user story implementation

---

## Phase 3: User Story 1 - View Transfer Transactions in Correct Order (Priority: P1) 🎯 MVP

**Goal**: Fix ordering of paired transfer transactions so that TRANSFER_IN appears before TRANSFER_OUT when viewing transactions list (sorted newest-first). This is achieved by adding a `createdAtSortable` field (using monotonic ULID) to DynamoDB items while keeping transaction IDs as UUID v4.

**Independent Test**:
1. Create a transfer from Account A to Account B
2. Navigate to transactions page (no filters)
3. Verify TRANSFER_IN transaction appears before TRANSFER_OUT transaction

### Implementation for User Story 1

**Validation Schema Changes**:

- [X] T002 [US1] Add transactionDbItemSchema to backend/src/repositories/utils/Transaction.schema.ts extending transactionSchema with createdAtSortable field (ISO8601#ULID regex pattern)
- [X] T003 [US1] Export TransactionDbItem type from transactionDbItemSchema in backend/src/repositories/utils/Transaction.schema.ts

**Backend Repository Changes**:

- [X] T004 [P] [US1] Add monotonicFactory import from ulidx at top of backend/src/repositories/TransactionRepository.ts
- [X] T005 [P] [US1] Create monotonic ULID factory instance at module level in backend/src/repositories/TransactionRepository.ts (const ulid = monotonicFactory())
- [X] T006 [US1] Update backend/src/repositories/TransactionRepository.ts - change index name constant from USER_CREATED_AT_INDEX to USER_CREATED_AT_SORTABLE_INDEX with value "UserCreatedAtSortableIndex"
- [X] T007 [US1] Update backend/src/repositories/TransactionRepository.ts - modify create() to add createdAtSortable field (createdAt + "#" + ulid()) to DynamoDB item before storage (keep Transaction object unchanged)
- [X] T008 [US1] Update backend/src/repositories/TransactionRepository.ts - modify createMany() to add createdAtSortable field to all DynamoDB items before batch write (using same ulid factory instance)
- [X] T009 [US1] Import transactionDbItemSchema and TransactionDbItem type in backend/src/repositories/TransactionRepository.ts
- [X] T010 [US1] Add toTransaction() helper function in backend/src/repositories/TransactionRepository.ts to transform TransactionDbItem to Transaction by omitting createdAtSortable
- [X] T011 [US1] Update CursorData interface in backend/src/repositories/TransactionRepository.ts to replace createdAt field with createdAtSortable field
- [X] T012 [US1] Update encodeCursor() function in backend/src/repositories/TransactionRepository.ts to accept TransactionDbItem parameter and use createdAtSortable from it
- [X] T013 [US1] Update decodeCursor() function in backend/src/repositories/TransactionRepository.ts to parse createdAtSortable from cursor data
- [X] T014 [US1] Update findActiveByUserId() in backend/src/repositories/TransactionRepository.ts to use USER_CREATED_AT_SORTABLE_INDEX, validate raw items with transactionDbItemSchema, create edges with cursors from dbItems, transform to Transaction nodes
- [X] T015 [US1] Update ExclusiveStartKey construction in backend/src/repositories/TransactionRepository.ts to use createdAtSortable instead of createdAt in pagination queries
- [X] T016 [P] [US1] Update findActiveByDescription() in backend/src/repositories/TransactionRepository.ts to use USER_CREATED_AT_SORTABLE_INDEX
- [X] T017 [P] [US1] Update detectPatterns() in backend/src/repositories/TransactionRepository.ts to use USER_CREATED_AT_SORTABLE_INDEX if it references the old index

**Infrastructure Changes**:

- [X] T018 [P] [US1] Update backend/src/scripts/create-tables.ts - remove createdAt from AttributeDefinitions array
- [X] T019 [P] [US1] Update backend/src/scripts/create-tables.ts - add createdAtSortable to AttributeDefinitions array with AttributeType "S"
- [X] T020 [US1] Update backend/src/scripts/create-tables.ts - remove UserCreatedAtIndex from GlobalSecondaryIndexes array
- [X] T021 [US1] Update backend/src/scripts/create-tables.ts - add UserCreatedAtSortableIndex to GlobalSecondaryIndexes with userId (HASH) and createdAtSortable (RANGE) KeySchema
- [X] T022 [P] [US1] Update backend-cdk/lib/backend-cdk-stack.ts - remove createdAt from table attribute definitions
- [X] T023 [P] [US1] Update backend-cdk/lib/backend-cdk-stack.ts - add createdAtSortable to table attribute definitions
- [X] T024 [US1] Update backend-cdk/lib/backend-cdk-stack.ts - remove UserCreatedAtIndex definition
- [X] T025 [US1] Update backend-cdk/lib/backend-cdk-stack.ts - add UserCreatedAtSortableIndex definition with userId and createdAtSortable keys

**Data Migration**:

- [X] T026 [US1] Create backend/src/migrations/TIMESTAMP-populate-createdAtSortable.ts with imports (DynamoDBDocumentClient, ScanCommand, TransactWriteCommand, monotonicFactory)
- [X] T027 [US1] Implement up() function in migration that scans all transactions and populates createdAtSortable field (createdAt + "#" + ulid())
- [X] T028 [US1] Add batch processing logic in migration (25 items per batch using TransactWriteCommand)
- [X] T029 [US1] Add idempotency check in migration to skip transactions that already have createdAtSortable
- [X] T030 [US1] Add progress logging to migration showing scanned and updated counts

**Testing**:

- [X] T031 [P] [US1] Update backend/src/repositories/TransactionRepository.test.ts - verify id field remains UUID v4 format (unchanged) in all create tests
- [X] T032 [P] [US1] Update backend/src/repositories/TransactionRepository.test.ts - verify returned Transaction objects do NOT contain createdAtSortable field
- [X] T033 [P] [US1] Add test in backend/src/repositories/TransactionRepository.test.ts - query raw DynamoDB items directly and verify they DO contain createdAtSortable field with correct format (ISO8601#ULID)
- [X] T034 [US1] Add test in backend/src/repositories/TransactionRepository.test.ts - create paired transfer transactions via createMany and verify TRANSFER_IN appears before TRANSFER_OUT in descending query result
- [X] T035 [P] [US1] Update pagination cursor tests in backend/src/repositories/TransactionRepository.test.ts to handle new cursor format with createdAtSortable

**Checkpoint**: User Story 1 implementation complete - transfer transactions now sort correctly with TRANSFER_IN before TRANSFER_OUT

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Code quality, validation, and documentation

- [X] T036 [P] Run npm run format in backend/ to format all modified files
- [X] T037 [P] Run npm run lint in backend/ and fix any ESLint issues
- [X] T038 Test locally by recreating database tables via npm run db:recreate in backend/
- [X] T039 Run migration locally via npm run migrate in backend/
- [X] T040 Manually test transfer creation and verify correct ordering in transactions list
- [X] T041 [P] Review quickstart.md and verify implementation matches all key points

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - install ulidx package first
- **Foundational (Phase 2)**: N/A (no foundational work needed)
- **User Story 1 (Phase 3)**: Depends on Setup completion
- **Polish (Phase 4)**: Depends on User Story 1 completion

### User Story Dependencies

- **User Story 1 (P1)**: Single user story - implements complete feature

### Within User Story 1

**Sequential Dependencies**:
1. T002-T003: Add database item schema first (validates DynamoDB items)
2. T004-T005: Add ULID factory for generating sortable portion
3. T006-T008: Update repository create methods to add createdAtSortable
4. T009-T010: Import schema and add transformation helper
5. T011-T017: Update cursor logic and query methods to use new index and schema
6. T018-T025: Infrastructure changes (can run parallel with repository changes)
7. T026-T030: Migration implementation after understanding repository changes
8. T031-T035: Tests updated after implementation

**Task Groups** (can run in parallel):
- **Group A - Schema** (T002-T003): Database item schema
- **Group B - ULID Setup** (T004-T005): Monotonic ULID factory
- **Group C - Repository Core** (T006-T008): After A+B, add createdAtSortable to storage
- **Group D - Transform Logic** (T009-T010): After A, add transformation helper
- **Group E - Infrastructure** (T018-T025): After understanding schema, update create-tables.ts and CDK
- **Group F - Repository Queries** (T011-T017): After C+D, update queries and cursors
- **Group G - Migration** (T026-T030): After understanding all repository changes
- **Group H - Tests** (T031-T035): After implementation complete

### Parallel Opportunities

**Can run in parallel**:
- T002-T003 and T004-T005 (schema vs ULID factory - independent)
- T009 and T011 (imports vs cursor interface update)
- T016 and T017 (different query methods)
- T018-T019 and T022-T023 (create-tables.ts vs CDK stack - same changes, different files)
- T020-T021 and T024-T025 (index definitions in different files)
- T031, T032, T033, T035 (independent test cases)

**Must run sequentially**:
- T002-T003 → T009 (schema must exist before importing it)
- T004-T005 → T007-T008 (ULID factory needed for create methods)
- T006 → T014 → T015 (index constant → use in queries → pagination)
- T011 → T012 → T013 (cursor interface → encode → decode)
- T026 → T027 → T028 → T029 → T030 (migration structure → scan → batch → idempotency → logging)

---

## Parallel Example: User Story 1

```bash
# After T001 (install ulidx), launch these groups in parallel:

# Terminal 1 - Schema + ULID Factory (T002-T005)
Task: "Add transactionDbItemSchema to Transaction.schema.ts"
Task: "Add monotonic ULID factory to TransactionRepository.ts"

# After T002-T005 complete, launch Repository Changes (T006-T010)
Task: "Update create methods to add createdAtSortable"
Task: "Add transformation helper toTransaction()"

# Terminal 2 - Infrastructure (T018-T025, can start anytime)
Task: "Update create-tables.ts attribute definitions and indexes"
Task: "Update CDK stack attribute definitions and indexes"

# After Repository Changes complete, launch Query Updates (T011-T017)
Task: "Update cursor logic and all query methods"

# After all implementation complete, launch all tests in parallel (T031-T035)
Task: "Verify UUID format unchanged"
Task: "Verify Transaction objects have no createdAtSortable"
Task: "Verify raw DB items have createdAtSortable"
Task: "Test transfer pair ordering"
Task: "Update cursor tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install ulidx)
2. Complete Phase 3: User Story 1 (all implementation tasks)
3. Complete Phase 4: Polish (format, lint, local testing)
4. **STOP and VALIDATE**:
   - Recreate local tables
   - Run migration
   - Create test transfer
   - Verify TRANSFER_IN appears before TRANSFER_OUT
5. Deploy infrastructure (CDK), run migration, deploy backend code

### Deployment Order

1. **Backend CDK**: Deploy infrastructure changes (new index)
2. **Migration**: Run migration to populate createdAtSortable for existing transactions
3. **Backend Code**: Deploy repository code changes

### Rollback Plan

If issues occur:
1. Revert backend code to use UserCreatedAtIndex
2. Revert CDK to restore UserCreatedAtIndex
3. Note: createdAtSortable field can remain in database (ignored by old code)

---

## Notes

- [P] tasks = different files, no dependencies between them
- [US1] = All tasks belong to single user story (fix transfer transaction ordering)
- **CRITICAL**: Transaction interface does NOT change - createdAtSortable is database-only
- **CRITICAL**: transactionDbItemSchema validates raw DB items, then transforms to Transaction (omits createdAtSortable)
- **CRITICAL**: Transaction IDs remain UUID v4 (no breaking changes)
- Repository validates with transactionDbItemSchema, transforms with toTransaction()
- Service/resolver/GraphQL layers remain completely unaware of createdAtSortable
- No GraphQL schema changes required
- No frontend changes required
- Migration is idempotent (safe to run multiple times)
- Existing pagination cursors become invalid after deployment (acceptable UX - users restart from page 1)
- Tests are integrated with implementation tasks rather than written first

## Key Implementation Points

1. **Keep UUID for IDs**: Transaction `id` field remains UUID v4 - no breaking changes
2. **Monotonic ULID for Sorting**: Use `monotonicFactory()` from ulidx for deterministic ordering within same millisecond
3. **Database Item Schema**: `transactionDbItemSchema` validates DynamoDB items (includes createdAtSortable)
4. **Transform to Domain Model**: `toTransaction()` explicitly omits createdAtSortable when returning to upper layers
5. **Layer Separation**: Repository uses `TransactionDbItem` internally, exposes `Transaction` externally
