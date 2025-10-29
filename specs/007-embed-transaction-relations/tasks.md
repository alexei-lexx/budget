---
description: "Task list for embedding account and category into transaction GraphQL"
---

# Tasks: Embed Account and Category Into Transaction GraphQL

**Feature**: Extend Transaction type to embed related account and category data via DataLoader batching

**Status**: Implementation Planning

**Design Documents**: research.md (completed), data-model.md (detailed entities), contracts/graphql-schema.graphql (schema changes), quickstart.md (implementation guide)

**Expected Outcome**: Reduce database queries from 101 → 3 for 50 transactions (97% improvement) via DataLoader batching pattern

**Estimated Duration**: 1-2 sprints (12-17 hours)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project dependencies and prepare for backend implementation

- [ ] T001 Install dataloader npm package in backend directory

---

## Phase 2: Foundational Backend Implementation (BLOCKING)

**Purpose**: Backend GraphQL layer changes that MUST be complete before frontend can proceed

**⚠️ CRITICAL**: Frontend implementation blocked until this entire phase completes

### Backend Infrastructure Setup

- [ ] T002 Create DataLoader batch function for accounts in `backend/src/dataloaders/accountLoader.ts`
  - Implement `batchLoadAccounts()` function using DynamoDB BatchGetItem
  - Handle missing accounts: if ID exists but entity not found, return stub `{ id, name: "Unknown", isArchived: false }` (data consistency edge case from direct database changes)
  - Log warning for missing accounts (e.g., "Missing account {accountId} for transaction context")
  - Use environment variables for table names and endpoint
  - Import Account model and DynamoDBClient

- [ ] T002.1 Unit test for accountLoader batch function
  - Create `backend/src/dataloaders/accountLoader.test.ts` (colocated with source, not in __tests__)
  - Test happy path: batch load 5 valid account IDs using mocked AccountRepository, verify all returned correctly
  - Test missing account: batch load mix of valid and non-existent IDs, verify missing accounts return stub `{ id, name: "Unknown", isArchived: false }`
  - Test edge case: batch load with duplicate IDs, verify deduplication works
  - Use Jest and mock repository via `createMockAccountRepository` from `backend/src/__tests__/utils/mockRepositories.ts`
  - Use `fakeAccount()` factory from `backend/src/__tests__/utils/factories.ts` for test data

- [ ] T003 [P] Create DataLoader batch function for categories in `backend/src/dataloaders/categoryLoader.ts`
  - Implement `batchLoadCategories()` function using DynamoDB BatchGetItem
  - **Filter null categoryIds before batching** (no lookup needed if category ID not set; these return null in final response)
  - Handle missing categories (if non-null ID exists but entity not found, return stub `{ id, name: "Unknown", isArchived: false }`)
  - Log warning for missing categories (e.g., "Missing category {categoryId} for transaction context")
  - Use environment variables for table names and endpoint

- [ ] T003.1 [P] Unit test for categoryLoader batch function
  - Create `backend/src/dataloaders/categoryLoader.test.ts` (colocated with source, not in __tests__)
  - Test happy path: batch load 5 valid category IDs using mocked CategoryRepository, verify all returned correctly
  - Test null filtering: batch load mix of null and valid IDs, verify nulls are filtered before batching, nulls return null in result
  - Test missing category: batch load mix of valid and non-existent IDs, verify missing categories return stub `{ id, name: "Unknown", isArchived: false }`
  - Test edge case: batch load with duplicate IDs, verify deduplication works
  - Use Jest and mock repository via `createMockCategoryRepository` from `backend/src/__tests__/utils/mockRepositories.ts`
  - Use `fakeCategory()` factory from `backend/src/__tests__/utils/factories.ts` for test data

- [ ] T004 [P] Create DataLoader barrel export in `backend/src/dataloaders/index.ts`
  - Export both accountLoader and categoryLoader batch functions
  - Create factory functions for DataLoader instantiation

- [ ] T004a Create stub data helper in `backend/src/dataloaders/utils.ts` (or within loaders)
  - Implement `createUnknownAccount(id: string)` → `{ id, name: "Unknown", isArchived: false }`
  - Implement `createUnknownCategory(id: string)` → `{ id, name: "Unknown", isArchived: false }`
  - Document when stubs are used (data consistency edge cases from direct database changes)
  - Use these helpers in T002 and T003 batch functions for missing entities

- [ ] T004a.1 Unit test for stub data helpers
  - Create `backend/src/dataloaders/utils.test.ts` (colocated with stub helper module)
  - Test `createUnknownAccount(id)` returns correct stub structure with given ID
  - Test `createUnknownCategory(id)` returns correct stub structure with given ID
  - Verify all stub fields are immutable/correct (id, name: "Unknown", isArchived: false)
  - Use Jest (no external dependencies or mocking needed for pure functions)

### GraphQL Schema Updates

- [ ] T005 Add new GraphQL types to `backend/src/schema.graphql`
  - Add `TransactionEmbeddedAccount` type with fields: id, name, isArchived
  - Add `TransactionEmbeddedCategory` type with fields: id, name, isArchived
  - Include documentation comments for each field

- [ ] T006 Extend Transaction type in `backend/src/schema.graphql`
  - Add `account: TransactionEmbeddedAccount!` (non-nullable) field
  - Add `category: TransactionEmbeddedCategory` (nullable) field
  - **Remove `accountId` field entirely** (breaking change, immediate removal)
  - **Remove `categoryId` field entirely** (breaking change, immediate removal)
  - Add documentation explaining field behavior, data freshness, and stub data handling for data consistency edge cases

### Backend Resolvers

- [ ] T007 Create Transaction field resolvers in `backend/src/resolvers/Transaction.ts`
  - Implement `account` resolver using context.loaders.accountLoader.load()
  - Implement `category` resolver using context.loaders.categoryLoader.load()
  - Handle null cases properly (return null when accountId is missing)
  - Return embedded type objects with only id, name, isArchived fields

- [ ] T008 Update GraphQL context in `backend/src/server.ts`
  - Add `loaders` property to GraphQLContext interface with accountLoader and categoryLoader
  - Initialize DataLoaders in createContext function (per-request, not singleton)
  - Ensure loaders have access to authenticated user context for data isolation

- [ ] T009 Update resolver exports in `backend/src/resolvers/index.ts`
  - Export TransactionResolvers from newly created Transaction.ts
  - Ensure resolvers are included in Apollo Server configuration

### Backend Cache Invalidation (Post-Mutation)

- [ ] T010 Add cache invalidation after account mutations in `backend/src/resolvers/Mutation.ts`
  - After updateAccount mutation: clear accountLoader cache for that accountId
  - After deleteAccount mutation: clear accountLoader cache for that accountId
  - Pattern: `context.loaders.accountLoader.clear(accountId)`

- [ ] T011 [P] Add cache invalidation after category mutations in `backend/src/resolvers/Mutation.ts`
  - After updateCategory mutation: clear categoryLoader cache for that categoryId
  - After deleteCategory mutation: clear categoryLoader cache for that categoryId
  - Pattern: `context.loaders.categoryLoader.clear(categoryId)`

- [ ] T012 [P] Add cache invalidation after transaction mutations in `backend/src/resolvers/Mutation.ts`
  - After createTransaction: no loader clearing needed (new transaction, not cached)
  - Note: loaders auto-clear at end of GraphQL request anyway

### Backend Testing & Verification

- [ ] T013 [P] Run backend build and type checking
  - `cd backend && npm run build` (compiles TypeScript)
  - Verify no compilation errors
  - Verify schema.graphql is copied to dist/

- [ ] T015 [P] Run backend code quality checks
  - `cd backend && npm run lint` (ESLint)
  - `cd backend && npm run prettier` (formatting check)
  - Fix any linting issues found

**Checkpoint**: Backend GraphQL implementation complete with DataLoader batching. Frontend can now proceed.

---

## Phase 3: Frontend Implementation (Depends on Phase 2)

**Purpose**: Update Vue 3 components and GraphQL operations to use embedded fields

### Frontend Schema Synchronization

- [ ] T016 Sync GraphQL schema from backend
  - `cd frontend && npm run codegen:sync-schema`
  - Verify `frontend/src/schema.graphql` is updated with new types
  - Confirm TransactionEmbeddedAccount and TransactionEmbeddedCategory types present

- [ ] T017 Generate TypeScript types from updated schema
  - `cd frontend && npm run codegen`
  - Verify types generated in `frontend/src/__generated__/graphql-types.ts`
  - Verify Transaction type includes new account and category fields
  - Check generated composables in `frontend/src/__generated__/vue-apollo.ts`

### Frontend GraphQL Operations

- [ ] T018 Update TRANSACTION_FRAGMENT in `frontend/src/graphql/fragments.ts`
  - Add nested `account { id name isArchived }` fields
  - Add nested `category { id name isArchived }` fields
  - Keep existing transaction fields (id, type, amount, currency, date, description, transferId)
  - Remove requests for accountId and categoryId fields

- [ ] T019 [P] Verify GraphQL operation compilation
  - `cd frontend && npm run type-check`
  - Ensure no TypeScript errors from schema changes
  - Fix any operation type mismatches

### Frontend Component Updates

- [ ] T020 Update TransactionCard.vue to use embedded fields
  - Change `accountName` prop parameter usage to `transaction.account?.name`
  - Change `categoryName` prop parameter usage to `transaction.category?.name`
  - Remove accountName and categoryName from component props interface
  - Update template: use `transaction.account?.name` directly (not prop-passed value)
  - Update template: use optional chaining for archived account display
  - Keep category display conditional: `v-if="transaction.category"`

- [ ] T021 [P] Update Transactions.vue to remove lookup functions and queries
  - Remove `getAccountName()` helper function
  - Remove `getCategoryName()` helper function
  - Remove `useAccounts()` composable call (no longer needed for lookups)
  - Remove `useCategories()` composable call (no longer needed for lookups)
  - Keep `useTransactions()` composable call (needed for transaction list)
  - Update component to pass only transaction object (no lookup parameters)

- [ ] T022 [P] Update other transaction-related components
  - Update `frontend/src/components/TransactionList.vue` to use `transaction.account.name` and `transaction.category?.name` directly
  - Remove any getAccountName/getCategoryName helper calls from TransactionList
  - Update prop interfaces to remove lookup function parameters
  - Verify all transaction component imports use embedded fields (TransactionCard, Transactions, TransactionList)

- [ ] T024 [P] Verify frontend type safety
  - `cd frontend && npm run type-check`
  - Resolve any remaining TypeScript errors
  - Ensure all transaction.account and transaction.category accesses are properly typed

**Checkpoint**: Frontend fully updated with embedded fields. Implementation complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Backend Implementation)**: Depends on Phase 1 completion - **BLOCKS Phase 3**
- **Phase 3 (Frontend Implementation)**: Depends on Phase 2 completion - cannot start until backend GraphQL changes are live

### Critical Path

```
Phase 1 (Setup)
    ↓
Phase 2 (Backend - BLOCKING)
    ↓
Phase 3 (Frontend - depends on backend)
```

### Parallel Opportunities

**Within Phase 2**:
- T002 & T003 & T004 can run in parallel (different files)
- T002.1 & T003.1 & T004a.1 can run in parallel after respective main tasks (unit tests)
- T010 & T011 & T012 can run in parallel (same file but different sections)
- T014 & T015 can run in parallel (different commands)

**Within Phase 3**:
- T020, T021, T022 can run in parallel (different component files)

### Sequential Requirements (Within Phase 2)

- T001 must complete before T002, T003, T004 (dependency install needed)
- T002 must complete before T002.1 (implement before testing)
- T003 must complete before T003.1 (implement before testing)
- T004a must complete before T004a.1 (implement before testing)
- T005, T006 must complete before T007 (schema must exist before resolvers)
- T007, T008, T009 must complete before T010, T011 (resolvers needed for mutations)
- T012 must complete before T013 (cache invalidation needed before build check)
- T013, T014 must run after all other Phase 2 tasks (build and linting verification)

### Sequential Requirements (Within Phase 3)

- T016 must complete before T017 (schema sync before codegen)
- T017 must complete before T018 (types generated before fragment update)
- T018 must complete before T020-T022 (fragment needed before components use it)
- T024 must complete (type-check all components after updates)

---

## Parallel Example: Phase 2 Backend Work

**After T001 completes (dataloader installed), launch these in parallel**:

```
Developer A:
  - T002: Create accountLoader.ts
  - T002.1: Unit test accountLoader
  - T010: Invalidate accounts in mutations

Developer B:
  - T003: Create categoryLoader.ts
  - T003.1: Unit test categoryLoader
  - T011: Invalidate categories in mutations

Developer C:
  - T004: Create dataloaders/index.ts barrel
  - T004a: Create stub data helpers
  - T004a.1: Unit test stub helpers
  - T005 & T006: Update schema.graphql (sequential, same file)

Developer D:
  - T007: Create Transaction.ts resolvers
  - T008: Update server.ts context
  - T009: Update resolvers/index.ts
```

**Then sequentially**:
  - T012: Verify all mutations have cache invalidation
  - T013: Integration test in GraphQL Playground (after all unit tests pass)

---

## Parallel Example: Phase 3 Frontend Work

**After T017 completes (types generated), launch these in parallel**:

```
Developer A:
  - T020: Update TransactionCard.vue

Developer B:
  - T021: Update Transactions.vue

Developer C:
  - T022: Update other transaction components (TransactionList.vue)

Developer D:
  - T018: Update TRANSACTION_FRAGMENT
  - T024: Verify TypeScript types
```

---

## Implementation Strategy

### Standard Approach

**Scope**: Complete Phases 1-3 (full feature implementation)

1. ✅ Complete Phase 1: Setup (1 task, 5 min)
2. ✅ Complete Phase 2: Backend Implementation (14 tasks including 3 unit tests, 5-6 hours)
   - Unit tests: T002.1, T003.1, T004a.1 (batch loader and stub data testing)
   - Build & linting: T013, T014
3. ✅ Complete Phase 3: Frontend Implementation (7 tasks, 3-4 hours)
   - GraphQL schema sync and codegen (T016, T017)
   - Component updates (T020, T021, T022, T018)
   - TypeScript type validation (T019, T024)

### Incremental Delivery (If Needed)

If changes are too large, split into:
- **Iteration 1**: Backend DataLoaders + Schema changes (Phase 2 Tasks 1-9)
- **Iteration 2**: Backend cache invalidation & verification (Phase 2 Tasks 10-14)
- **Iteration 3**: Frontend integration (Phase 3)

However, **Phase 2 MUST be 100% complete before Phase 3 starts** (cannot split across iterations).

### Parallel Team Strategy

With multiple developers (4+):

1. All complete Phase 1 together (trivial)
2. Split Phase 2:
   - Developer A: accountLoader implementation & tests (T002, T002.1, T010)
   - Developer B: categoryLoader implementation & tests (T003, T003.1, T011)
   - Developer C: Barrel export, stub helpers & tests (T004, T004a, T004a.1, T005, T006)
   - Developer D: Resolvers, context, mutations, build & linting (T007, T008, T009, T012, T013, T014)
3. Merge/integrate Phase 2 work
4. Split Phase 3:
   - Developer A: Component updates (T020, T021, T022)
   - Developer B: Types & fragments (T024, T018, T019)
   - Developer C: Schema sync & codegen (T016, T017)

---

## Quality Gates

### Before Proceeding to Next Phase

**Phase 1 → Phase 2**:
- [ ] dataloader npm package successfully installed

**Phase 2 → Phase 3**:
- [ ] All unit tests pass: `npm test` (T002.1, T003.1, T004a.1)
- [ ] GraphQL schema has TransactionEmbeddedAccount and TransactionEmbeddedCategory types
- [ ] GraphQL query with nested account/category succeeds in GraphQL Playground
- [ ] Backend build succeeds: `npm run build` (T013)
- [ ] Backend linting passes: `npm run lint` (T014)
- [ ] DataLoader batch pattern verified via code review (no automated query counting required)

**Phase 3 Completion**:
- [ ] Frontend TypeScript compiles: `npm run type-check` (T019, T024)
- [ ] All component updates complete (T020, T021, T022)
- [ ] GraphQL operations updated with embedded fields (T018)
- [ ] Feature implementation fully complete

---

## Troubleshooting Reference

| Issue | Solution | Relevant Tasks |
|-------|----------|-----------------|
| "Cannot find field accountId" | Update TRANSACTION_FRAGMENT, remove accountId field | T018 |
| "account is null" | Data integrity issue - use optional chaining (`transaction.account?.name`) | T020, T022 |
| Query count still 101 | Verify DataLoaders initialized in context, field resolvers use loaders | T007, T008, T013 |
| Apollo cache not updating | Ensure fragments used for normalization | T018 |
| TypeScript errors after codegen | Run `npm run codegen` again, check schema sync | T017 |
| Backend build fails | Check import paths, verify schema.graphql syntax | T005, T006 |
| Frontend build fails | Clear node_modules and reinstall dependencies | T016, T017 |

---

## Notes

- **[P] marker**: Tasks without [P] have dependencies on previous tasks
- **Unit tests**: T002.1, T003.1, T004a.1 cover batch loader and stub helper functions per constitution mandate
  - Tests colocated with source files (e.g., `accountLoader.test.ts` next to `accountLoader.ts`)
  - Use mocked repositories via `createMockAccountRepository()` from `backend/src/__tests__/utils/mockRepositories.ts`
  - Use factory functions like `fakeAccount()` from `backend/src/__tests__/utils/factories.ts` for test data
- **File paths**: All paths are from repository root; adjust for your working directory
- **Timing estimates**: Based on quickstart.md (12-17 hours total), adjusted for unit tests
- **Breaking change**: accountId/categoryId removed from GraphQL schema
- **DataLoader pattern**: Per-request lifecycle, auto-clears at end of GraphQL request
- **Performance validation**: DataLoader batch pattern verified via code review (SC-002), not automated query counting
