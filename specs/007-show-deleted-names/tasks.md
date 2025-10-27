# Tasks: Display Original Names for Deleted Accounts and Categories

**Input**: Design documents from `/specs/007-show-deleted-names/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql-schema.md, quickstart.md
**Branch**: `007-show-deleted-names`

**Overview**: Implement the ability to display original account and category names on transaction cards even after those entities are deleted (soft-archived). All user stories depend on the same backend and frontend implementation, so foundational work must complete first, then each story can be independently tested.

---

## Phase 1: Setup

**Purpose**: Project and environment validation

- [ ] T001 Review and validate quickstart.md implementation guide in `specs/007-show-deleted-names/quickstart.md`
- [ ] T002 Verify development environment: backend dev server, frontend dev server, and DynamoDB Local running

---

## Phase 2: Foundational Backend Implementation

**Purpose**: GraphQL schema changes and backend repository updates to support archived entity lookups

**⚠️ CRITICAL**: This phase MUST complete before any user story testing can begin

### Backend Schema Changes

- [ ] T003 Add `isArchived: Boolean!` field to Account type in `backend/src/schema.graphql`
- [ ] T004 Add `isArchived: Boolean!` field to Category type in `backend/src/schema.graphql`
- [ ] T005 Add `includeArchived: Boolean = false` parameter to `accounts` query in `backend/src/schema.graphql`
- [ ] T006 Add `includeArchived: Boolean = false` parameter to `categories` query in `backend/src/schema.graphql`

### Backend Repository Updates

- [ ] T007 [P] Add new `findByUserId(userId: string, options?: { includeArchived?: boolean })` method in `backend/src/repositories/AccountRepository.ts` that includes all accounts (active and archived) when `includeArchived: true`, filters to active only when false (reuse paginateQuery pattern like findActiveByUserId)
- [ ] T008 [P] Add new `findByUserId(userId: string, options?: { includeArchived?: boolean })` method in `backend/src/repositories/CategoryRepository.ts` that includes all categories (active and archived) when `includeArchived: true`, filters to active only when false (reuse paginateQuery pattern like findActiveByUserId)

### Backend Resolver Updates

- [ ] T009 [P] Update `accounts` query resolver in `backend/src/resolvers/accountResolvers.ts` to extract `includeArchived` parameter from args and call new `findByUserId()` method instead of `findActiveByUserId()` when `includeArchived: true`
- [ ] T010 [P] Update `categories` query resolver in `backend/src/resolvers/categoryResolvers.ts` to extract `includeArchived` parameter from args and call new `findByUserId()` method instead of `findActiveByUserId()` when `includeArchived: true` (handle both type-filtered and unfiltered cases)

### Backend Testing

- [ ] T011 [P] Add tests for `AccountRepository.findByUserId()` with `includeArchived=false` (default, excludes archived) in `backend/tests/repositories/AccountRepository.test.ts`
- [ ] T012 [P] Add tests for `AccountRepository.findByUserId()` with `includeArchived=true` (includes archived) in `backend/tests/repositories/AccountRepository.test.ts`
- [ ] T013 [P] Add tests for `CategoryRepository.findByUserId()` with `includeArchived=false` in `backend/tests/repositories/CategoryRepository.test.ts`
- [ ] T014 [P] Add tests for `CategoryRepository.findByUserId()` with `includeArchived=true` in `backend/tests/repositories/CategoryRepository.test.ts`
- [ ] T015 Add GraphQL query tests for accounts resolver with `includeArchived` parameter in `backend/tests/resolvers/account.test.ts`
- [ ] T016 Add GraphQL query tests for categories resolver with `includeArchived` parameter in `backend/tests/resolvers/category.test.ts`

### Backend Type Generation

- [ ] T017 Run GraphQL CodeGen in backend to generate TypeScript types from updated schema: `cd backend && npm run codegen`
- [ ] T018 Verify generated types include `isArchived` field and `includeArchived` parameter in `backend/src/types/generated/`

**Checkpoint**: Backend infrastructure complete. All repositories can filter by archive status. GraphQL API exposes isArchived field and includeArchived parameter.

---

## Phase 3: Foundational Frontend Implementation

**Purpose**: Frontend query updates, composable updates, and component styling to support displaying deleted entities with visual distinction

**Depends on**: Phase 2 completion

### Frontend GraphQL Fragment Updates

- [ ] T019 [P] Update `ACCOUNT_FRAGMENT` in `frontend/src/graphql/fragments.ts` to include `isArchived` field in the account fields selection
- [ ] T020 [P] Update `CATEGORY_FRAGMENT` in `frontend/src/graphql/fragments.ts` to include `isArchived` field in the category fields selection

### Frontend GraphQL Query Updates

- [ ] T021 Update `GET_ACCOUNTS` query in `frontend/src/graphql/queries.ts` to add `$includeArchived: Boolean = false` variable and pass to accounts query (fragments will auto-include isArchived)
- [ ] T022 Update `GET_CATEGORIES` query in `frontend/src/graphql/queries.ts` to add `$includeArchived: Boolean = false` variable and pass to categories query (fragments will auto-include isArchived)

### Frontend Schema Sync & Type Generation

- [ ] T023 Sync frontend GraphQL schema from backend: `cd frontend && npm run codegen:sync-schema`
- [ ] T024 Run GraphQL CodeGen in frontend to generate TypeScript types and composables: `cd frontend && npm run codegen`
- [ ] T025 Verify generated types include `isArchived` field in Account and Category interfaces in `frontend/src/__generated__/`
- [ ] T026 Verify generated composables accept `includeArchived` variable in `frontend/src/__generated__/vue-apollo.ts`

### Frontend Composable Updates

- [ ] T027 Update `useAccounts` composable in `frontend/src/composables/useAccounts.ts` to accept optional `{ includeArchived?: boolean }` parameter and pass to `useGetAccountsQuery`
- [ ] T028 Update `useCategories` composable in `frontend/src/composables/useCategories.ts` to accept optional `{ includeArchived?: boolean }` parameter and pass to `useGetCategoriesQuery`

### Frontend View Updates

- [ ] T029 Update `Transactions.vue` page in `frontend/src/pages/Transactions.vue` to call `useAccounts({ includeArchived: true })` to fetch deleted accounts for lookup
- [ ] T030 Update `Transactions.vue` page to call `useCategories({ includeArchived: true })` to fetch deleted categories for lookup
- [ ] T031 Add helper functions in `Transactions.vue` to check if accounts/categories are deleted: `isAccountDeleted(accountId)` and `isCategoryDeleted(categoryId)`

### Frontend Component Updates

- [ ] T032 [P] Update `TransactionCard.vue` component in `frontend/src/components/TransactionCard.vue` to accept props for `accounts`, `categories`, `isAccountDeleted`, and `isCategoryDeleted`
- [ ] T033 [P] Add strikethrough styling CSS class `text-deleted` in `TransactionCard.vue` with `text-decoration: line-through; opacity: 0.7;`
- [ ] T034 [P] Apply `text-deleted` class conditionally to account name span when account is archived
- [ ] T035 [P] Apply `text-deleted` class conditionally to category name span when category is archived and category exists

### Frontend Testing

- [ ] T036 [P] Add tests for `useAccounts` composable with `includeArchived=false` (default) in `frontend/tests/composables/useAccounts.test.ts`
- [ ] T037 [P] Add tests for `useAccounts` composable with `includeArchived=true` in `frontend/tests/composables/useAccounts.test.ts`
- [ ] T038 [P] Add tests for `useCategories` composable with `includeArchived=false` in `frontend/tests/composables/useCategories.test.ts`
- [ ] T039 [P] Add tests for `useCategories` composable with `includeArchived=true` in `frontend/tests/composables/useCategories.test.ts`
- [ ] T040 Add snapshot test for `TransactionCard.vue` with deleted account in `frontend/tests/components/TransactionCard.test.ts`
- [ ] T041 Add snapshot test for `TransactionCard.vue` with deleted category in `frontend/tests/components/TransactionCard.test.ts`
- [ ] T042 Add unit test for `TransactionCard.vue` strikethrough styling when account is deleted in `frontend/tests/components/TransactionCard.test.ts`
- [ ] T043 Add unit test for `TransactionCard.vue` strikethrough styling when category is deleted in `frontend/tests/components/TransactionCard.test.ts`
- [ ] T044 Add unit test for `TransactionCard.vue` no strikethrough styling when entities are active in `frontend/tests/components/TransactionCard.test.ts`

**Checkpoint**: Frontend queries, composables, and components updated. TypeScript types generated. All styling in place. Frontend infrastructure ready for user story testing.

---

## Phase 4: User Story 1 - View Transaction History After Deleting Account (Priority: P1)

**Goal**: Users can review their transaction history and see the original account name even after the account is deleted, maintaining historical context.

**Independent Test**:
1. Create an account with a unique name
2. Create a transaction assigned to that account
3. Delete (archive) the account
4. View the transaction list
5. Verify the original account name displays on the transaction card (not "Unknown Account")
6. Verify the account name has strikethrough styling

### Integration Test for Account Deletion

- [ ] T045 [US1] Write integration test for account deletion scenario in `backend/tests/integration/delete-account.test.ts`: Create account → Create transaction → Delete account → Query transaction → Verify account data still available
- [ ] T046 [US1] Write end-to-end test for account deletion in `frontend/tests/e2e/delete-account.test.ts`: Create account → Create transaction → Delete account → View transaction → Verify account name displays with strikethrough

### Manual QA for User Story 1

- [ ] T047 [US1] Manual test: Create account with transactions, delete account, navigate to Transactions page, verify original account name displays with strikethrough, verify no "Unknown Account" text appears
- [ ] T048 [US1] Manual test: Verify deleted account does NOT appear in account selector/dropdown when creating new transactions
- [ ] T049 [US1] Manual test: Verify deleted account DOES appear when viewing historical transactions

**Checkpoint**: User Story 1 fully functional. Users can see deleted account names on transactions with visual distinction. Story can be tested independently.

---

## Phase 5: User Story 2 - View Transaction History After Deleting Category (Priority: P1)

**Goal**: Users can review their transaction history and see the original category name even after the category is deleted, maintaining categorization context.

**Independent Test**:
1. Create a category with a unique name
2. Create a transaction assigned to that category
3. Delete (archive) the category
4. View the transaction list
5. Verify the original category name displays on the transaction card (not blank/missing)
6. Verify the category name has strikethrough styling

### Integration Test for Category Deletion

- [ ] T050 [US2] Write integration test for category deletion scenario in `backend/tests/integration/delete-category.test.ts`: Create category → Create transaction → Delete category → Query transaction → Verify category data still available
- [ ] T051 [US2] Write end-to-end test for category deletion in `frontend/tests/e2e/delete-category.test.ts`: Create category → Create transaction → Delete category → View transaction → Verify category name displays with strikethrough

### Manual QA for User Story 2

- [ ] T052 [US2] Manual test: Create category with transactions, delete category, navigate to Transactions page, verify original category name displays with strikethrough, verify no blank category field
- [ ] T053 [US2] Manual test: Verify deleted category does NOT appear in category selector/dropdown when creating new transactions
- [ ] T054 [US2] Manual test: Verify deleted category DOES appear when viewing historical transactions
- [ ] T055 [US2] Manual test: Verify transaction with no category assigned (optional field) displays correctly even when account is deleted

**Checkpoint**: User Story 2 fully functional. Users can see deleted category names on transactions with visual distinction. Story can be tested independently.

---

## Phase 6: User Story 3 - Audit Trail Consistency (Priority: P2)

**Goal**: Historical transactions maintain their original account and category information accurately, supporting audit trail and financial record requirements.

**Independent Test**:
1. Create a transaction with account and category
2. Verify the transaction snapshot contains the entity names
3. Delete the associated account and category
4. View the transaction
5. Verify transaction still shows original account and category names
6. Verify no data loss occurred

### Historical Data Validation Tests

- [ ] T056 [US3] Write test to verify transaction data immutability in `backend/tests/integration/audit-trail.test.ts`: Create transaction → Delete related entities → Query transaction → Verify original names still present in transaction record
- [ ] T057 [US3] Write test to verify audit trail consistency across multiple deleted entities in `backend/tests/integration/audit-trail.test.ts`: Create multiple transactions with various accounts/categories → Delete all entities → Query transactions → Verify all original names preserved
- [ ] T058 [US3] Write test for edge case: transaction with both account AND category deleted in `backend/tests/integration/audit-trail.test.ts`

### Manual QA for User Story 3

- [ ] T059 [US3] Manual test: Create transactions with various combinations of accounts and categories, delete all entities, verify transaction history is complete and accurate
- [ ] T060 [US3] Manual test: Verify transaction filtering/search still works with deleted entities in results
- [ ] T061 [US3] Manual test: Export transaction history and verify all original account/category names are preserved in export

**Checkpoint**: User Story 3 complete. Historical audit trail is maintained and accurate. All transaction data is properly preserved.

---

## Phase 7: User Story 4 - Distinguish Deleted Entities from Existing Ones (Priority: P2)

**Goal**: Users can quickly identify which accounts and categories are still active versus deleted through visual distinction, aiding decision-making.

**Independent Test**:
1. Create transactions with mix of active and deleted accounts/categories
2. View transaction list
3. Verify deleted entities have strikethrough styling
4. Verify active entities have normal styling
5. Verify visual distinction is clear and immediately recognizable

### Visual Distinction Verification

- [ ] T062 [US4] Manual test: Create transactions with both active and deleted accounts, verify deleted accounts show strikethrough styling, active accounts show normal text
- [ ] T063 [US4] Manual test: Create transactions with both active and deleted categories, verify deleted categories show strikethrough styling, active categories show normal text
- [ ] T064 [US4] Manual test: Verify strikethrough is consistent across all transaction cards (same account/category always displays same way)
- [ ] T065 [US4] Manual test: Verify opacity/color changes don't make deleted text unreadable
- [ ] T066 [US4] Accessibility test: Verify strikethrough styling is not the only visual indicator (check color contrast, opacity level)
- [ ] T067 [US4] Manual test: Test on different screen sizes (mobile, tablet, desktop) to ensure strikethrough styling remains visible and consistent

**Checkpoint**: User Story 4 complete. Deleted entities are visually distinguished with strikethrough styling. Users can easily identify entity status at a glance.

---

## Phase 8: Polish & Integration Testing

**Purpose**: End-to-end integration, deployment validation, and documentation

### Integration & Deployment Testing

- [ ] T068 [P] Run full backend test suite: `cd backend && npm run test` - all tests should pass
- [ ] T069 [P] Run full frontend test suite: `cd frontend && npm run test` - all tests should pass
- [ ] T070 Run backend linting: `cd backend && npm run lint`
- [ ] T071 Run frontend linting: `cd frontend && npm run lint`
- [ ] T072 Run backend formatting: `cd backend && npm run format`
- [ ] T073 Run frontend formatting: `cd frontend && npm run format`

### Deployment Validation

- [ ] T074 Verify backend deployment steps in quickstart work correctly (deploy backend-cdk first)
- [ ] T075 Verify frontend deployment steps work after backend is deployed
- [ ] T076 Test deployed backend GraphQL endpoint accepts `includeArchived` parameter
- [ ] T077 Test deployed frontend displays deleted entities with strikethrough
- [ ] T078 Verify performance: transaction page with deleted entities loads in <1 second

### Documentation & Cleanup

- [ ] T079 Verify all code changes follow project code style guidelines in CLAUDE.md
- [ ] T080 Update any relevant code comments about isArchived field usage
- [ ] T081 Verify git commits follow project commit message conventions
- [ ] T082 Create summary of changes for code review

**Checkpoint**: All user stories complete and integrated. Tests passing. Feature ready for production deployment.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Phase 2 (Foundational Backend)**: Depends on Setup - BLOCKS all user stories
- **Phase 3 (Foundational Frontend)**: Depends on Phase 2 completion - BLOCKS all user stories
- **User Stories (Phases 4-7)**: All depend on Phase 2 AND Phase 3 completion
  - Can proceed in parallel (P1 stories first, then P2 stories)
  - Or sequentially in priority order
- **Polish (Phase 8)**: Depends on desired user stories being complete

### Within Foundational Phases

All [P] marked tasks can run in parallel within each phase.

### User Story Implementation Order

**Recommended MVP First Approach**:
1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational Backend ← CRITICAL
3. Complete Phase 3: Foundational Frontend ← CRITICAL
4. Complete Phase 4: User Story 1 (P1) ← MVP minimum
5. **VALIDATE USER STORY 1 INDEPENDENTLY**
6. Complete Phase 5: User Story 2 (P1)
7. Complete Phase 6: User Story 3 (P2) if time permits
8. Complete Phase 7: User Story 4 (P2) if time permits
9. Complete Phase 8: Polish & Deployment

**Parallel Team Approach** (if resources available):
1. Team completes Phase 1 & 2 & 3 together
2. Once foundations complete:
   - Developer A: Phase 4 (US1)
   - Developer B: Phase 5 (US2)
   - Developer C: Phase 6 (US3)
   - Developer D: Phase 7 (US4)
3. All stories merge and integrate independently

---

## Parallel Execution Examples

### Phase 2 Backend Parallelization

All [P] tasks can run together:
- T007: Update AccountRepository
- T008: Update CategoryRepository
- T009: Update account resolver
- T010: Update category resolver
- T011-T014: Repository tests

### Phase 3 Frontend Parallelization

All [P] tasks can run together:
- T030: TransactionCard props
- T031: CSS styling
- T032-T033: Apply styling
- T034-T037: Composable tests

### User Story Parallelization

After Phase 3 completes:
- US1 (Phase 4): Account deletion tests
- US2 (Phase 5): Category deletion tests
- US3 (Phase 6): Audit trail validation
- US4 (Phase 7): Visual distinction verification

Can all be worked on simultaneously by different team members.

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

The MVP consists of:
- Phase 1: Setup ✓
- Phase 2: Foundational Backend (REQUIRED) ✓
- Phase 3: Foundational Frontend (REQUIRED) ✓
- Phase 4: User Story 1 - Account Deletion (CORE VALUE) ✓

**Result**: Users can see deleted account names with strikethrough on transactions

**Timeline**: ~2-3 development days

### Feature Complete Scope

Add to MVP:
- Phase 5: User Story 2 - Category Deletion (CORE VALUE)

**Result**: Users can see both deleted account AND category names with distinction

**Timeline**: +1 day (runs mostly in parallel with US1)

### Enhanced Scope (Optional)

Add to Feature Complete:
- Phase 6: User Story 3 - Audit Trail (validation & confidence)
- Phase 7: User Story 4 - Visual Distinction (UX refinement)

**Timeline**: +1-2 days

---

## Success Criteria Checklist

### Backend Implementation
- [ ] Account type exposes `isArchived` field in GraphQL schema
- [ ] Category type exposes `isArchived` field in GraphQL schema
- [ ] `accounts` query accepts `includeArchived: Boolean = false` parameter
- [ ] `categories` query accepts `includeArchived: Boolean = false` parameter
- [ ] AccountRepository.findByUserId filters based on includeArchived correctly
- [ ] CategoryRepository.findByUserId filters based on includeArchived correctly
- [ ] All backend tests pass
- [ ] Backend GraphQL schema validates without errors

### Frontend Implementation
- [ ] GET_ACCOUNTS query includes `isArchived` field and `$includeArchived` variable
- [ ] GET_CATEGORIES query includes `isArchived` field and `$includeArchived` variable
- [ ] useAccounts composable accepts `{ includeArchived }` option
- [ ] useCategories composable accepts `{ includeArchived }` option
- [ ] Transactions.vue calls composables with `includeArchived: true`
- [ ] TransactionCard.vue displays deleted accounts with strikethrough
- [ ] TransactionCard.vue displays deleted categories with strikethrough
- [ ] All frontend tests pass
- [ ] No TypeScript compilation errors

### User Story Validation
- [ ] US1: Deleted account names display on transactions with strikethrough
- [ ] US1: Account does not appear in dropdown when creating new transactions
- [ ] US2: Deleted category names display on transactions with strikethrough
- [ ] US2: Category does not appear in dropdown when creating new transactions
- [ ] US3: Historical transaction data is preserved accurately
- [ ] US4: Visual distinction between active and deleted entities is clear
- [ ] All edge cases handled: deleted account + deleted category, missing category, transfer transactions

### Deployment
- [ ] Backend deploys without errors (backend-cdk)
- [ ] Frontend schema syncs successfully from deployed backend
- [ ] Frontend builds without errors
- [ ] Production deployment verified
- [ ] Performance: <1 second page load with deleted entities

---

## Common Pitfalls to Avoid

1. **Forgetting isArchived in GraphQL query** - Frontend will request it but backend won't return it
2. **Forgetting to pass includeArchived to repository** - Queries won't filter correctly
3. **Using old composable signatures** - Must update useAccounts/useCategories to accept options parameter
4. **Breaking existing queries** - Ensure default includeArchived=false maintains backward compatibility
5. **Deploying frontend before backend** - Backend GraphQL schema changes must deploy first
6. **Missing edge cases** - Test transaction with deleted account AND deleted category, missing category field
7. **Styling visibility** - Ensure strikethrough doesn't make text unreadable on all devices/browsers
8. **Performance regression** - Verify loading all archived entities doesn't slow down transactions page

---

## Notes

- Follow quickstart.md implementation guide for step-by-step details
- Each user story is independently testable - can stop at any checkpoint
- Tests marked [P] can run in parallel (different files, no dependencies)
- [Story] label maps task to specific user story for traceability
- All paths are relative to project root (backend/, frontend/)
- Commit after each logical task group or phase
- Use `npm run format` to maintain code style before committing
