# Tasks: Minimal Refund Transaction Type

**Input**: Design documents from `/home/alex/workspace/budget2/specs/012-minimal-refund/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql-schema.md

**Tests**: No test tasks included (not explicitly requested in specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project ignore files for detected technologies

- [ ] T001 [P] Verify/create .gitignore with Node.js patterns (node_modules/, dist/, .env*, *.log) in repository root
- [ ] T002 [P] Verify/create backend/.gitignore if needed for backend-specific patterns
- [ ] T003 [P] Verify/create frontend/.gitignore if needed for frontend-specific patterns

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema and type system changes that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Add REFUND to TransactionType enum in backend/src/schema.graphql
- [ ] T005 Add REFUND to TransactionType enum in backend/src/models/Transaction.ts
- [ ] T006 Add REFUND to create/update Zod type schema in backend/src/resolvers/transactionResolvers.ts
- [ ] T007 Add REFUND to filter Zod type schema in backend/src/resolvers/transactionResolvers.ts
- [ ] T008 Add REFUND to TransactionType Zod enum in backend/src/repositories/utils/Transaction.schema.ts
- [ ] T009 Sync GraphQL schema from backend to frontend by running npm run codegen:sync-schema in frontend/
- [ ] T010 Generate TypeScript types and Apollo composables by running npm run codegen in frontend/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create REFUND Transaction (Priority: P1) 🎯 MVP

**Goal**: Enable users to create REFUND transactions with optional expense categories, increasing account balance

**Independent Test**: Open transaction form, click REFUND tab, fill required fields (account, amount, date), optionally select expense category, save. Transaction appears in list with type REFUND, account balance increases by refund amount.

### Implementation for User Story 1

- [ ] T011 [US1] Update category validation logic to allow REFUND with EXPENSE categories in backend/src/services/TransactionService.ts (category validation section around line 90-132)
- [ ] T012 [US1] Update balance calculation to add REFUND to positive impact group in backend/src/services/AccountService.ts (balance calculation around line 23-70)
- [ ] T013 [US1] Add REFUND button to transaction type selector in frontend/src/components/transactions/TransactionForm.vue (v-btn-toggle section)
- [ ] T014 [US1] Update category filter computed property to show expense categories for REFUND type in frontend/src/components/transactions/TransactionForm.vue
- [ ] T015 [US1] Manual verification: Create REFUND transaction via form, verify it saves, appears in list, and increases account balance

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create REFUND transactions

---

## Phase 4: User Story 2 - View REFUND Transactions in List (Priority: P2)

**Goal**: Display REFUND transactions in the transaction list with same layout as other types, visually distinguishable by type label

**Independent Test**: Create one or more REFUND transactions, view transaction list. REFUND transactions appear with same layout (date, account, category, amount, description), display "REFUND" type label, use green color (positive balance impact).

### Implementation for User Story 2

- [ ] T016 [US2] Add REFUND to positive (green) color group in frontend/src/components/transactions/TransactionCard.vue (type-based styling section)
- [ ] T017 [US2] Ensure REFUND type label displays correctly in frontend/src/components/transactions/TransactionCard.vue
- [ ] T018 [US2] Manual verification: View transaction list with REFUND transactions, verify display matches other types, verify green color, verify type label

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can create and view REFUND transactions

---

## Phase 5: User Story 3 - Filter Transactions by REFUND Type (Priority: P3)

**Goal**: Allow users to filter transaction list to show only REFUND transactions

**Independent Test**: Create multiple transaction types (INCOME, EXPENSE, REFUND), open transaction filter, select REFUND type filter, verify only REFUND transactions display. Clear filter, verify all types display again.

### Implementation for User Story 3

- [ ] T019 [US3] Add REFUND option to transactionTypeOptions computed property in frontend/src/components/transactions/TransactionFilterBar.vue (around line 144-149)
- [ ] T020 [US3] Manual verification: Open filter, select REFUND type, apply filter, verify only REFUND transactions shown. Clear filter, verify all types shown.

**Checkpoint**: All user stories should now be independently functional - complete REFUND feature works end-to-end

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and verification

- [ ] T021 Run all manual verification scenarios from quickstart.md to validate complete feature
- [ ] T022 Verify REFUND transactions are excluded from monthly expense report (query report, confirm no REFUND transactions appear)
- [ ] T023 Verify REFUND transactions are excluded from weekday expense report (query report, confirm no REFUND transactions appear)
- [ ] T024 Verify edit REFUND transaction works (change amount, category, date, type conversion to INCOME/EXPENSE)
- [ ] T025 Verify delete REFUND transaction works (soft-delete with isArchived=true, balance decreases correctly)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent but benefits from US1 having test data
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent but benefits from US1 having test data

### Within Each User Story

- Backend service updates before frontend component updates
- Frontend form changes can be parallel with display/filter changes
- Manual verification after implementation tasks complete

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- Foundational tasks T004-T008 can run in parallel (different files)
- T009 and T010 must run sequentially (T010 depends on T009)
- Once Foundational phase completes, all user stories (Phase 3-5) can start in parallel if team capacity allows
- Within US1: T011 and T012 can run in parallel (different files), T013 and T014 are in same file so sequential
- Polish tasks (T021-T025) can run in parallel (independent verification scenarios)

---

## Parallel Example: Foundational Phase

```bash
# Launch schema and type updates together:
Task: "Add REFUND to TransactionType enum in backend/src/schema.graphql"
Task: "Add REFUND to TransactionType enum in backend/src/models/Transaction.ts"
Task: "Add REFUND to create/update Zod type schema in backend/src/resolvers/transactionResolvers.ts"
Task: "Add REFUND to filter Zod type schema in backend/src/resolvers/transactionResolvers.ts"
Task: "Add REFUND to TransactionType Zod enum in backend/src/repositories/utils/Transaction.schema.ts"
```

---

## Parallel Example: User Story 1

```bash
# Launch backend service updates together (different files):
Task: "Update category validation logic in backend/src/services/TransactionService.ts"
Task: "Update balance calculation in backend/src/services/AccountService.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (ignore file verification)
2. Complete Phase 2: Foundational (schema and type system updates) - CRITICAL
3. Complete Phase 3: User Story 1 (create REFUND functionality)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Run Polish validation → Final release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (create REFUND)
   - Developer B: User Story 2 (display REFUND)
   - Developer C: User Story 3 (filter REFUND)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Manual verification required (no automated tests per spec)
- Backend changes are minimal (extend existing enums and logic)
- Frontend changes follow existing patterns (button, color group, filter option)
- No new entities, no database migration needed
- REFUND automatically excluded from expense reports (no code changes needed)
- Repository layer requires no changes (type-agnostic implementation)
