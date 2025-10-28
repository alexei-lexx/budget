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

- [ ] T003 [P] Create DataLoader batch function for categories in `backend/src/dataloaders/categoryLoader.ts`
  - Implement `batchLoadCategories()` function using DynamoDB BatchGetItem
  - **Filter null categoryIds before batching** (no lookup needed if category ID not set; these return null in final response)
  - Handle missing categories (if non-null ID exists but entity not found, return stub `{ id, name: "Unknown", isArchived: false }`)
  - Log warning for missing categories (e.g., "Missing category {categoryId} for transaction context")
  - Use environment variables for table names and endpoint

- [ ] T004 [P] Create DataLoader barrel export in `backend/src/dataloaders/index.ts`
  - Export both accountLoader and categoryLoader batch functions
  - Create factory functions for DataLoader instantiation

- [ ] T004a Create stub data helper in `backend/src/dataloaders/utils.ts` (or within loaders)
  - Implement `createUnknownAccount(id: string)` → `{ id, name: "Unknown", isArchived: false }`
  - Implement `createUnknownCategory(id: string)` → `{ id, name: "Unknown", isArchived: false }`
  - Document when stubs are used (data consistency edge cases from direct database changes)
  - Use these helpers in T002 and T003 batch functions for missing entities

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

- [ ] T013 Test DataLoader batching in development environment
  - Start backend: `cd backend && npm run dev`
  - Start DynamoDB: `cd backend && npm run db:start`
  - Open GraphQL Playground at http://localhost:4000/graphql
  - Test query with nested account/category fields
  - Verify query count reduction (should see 3 queries instead of 101 for 50 transactions)
  - Test null category handling with uncategorized transaction
  - Test archived account display (isArchived: true)

- [ ] T014 [P] Run backend build and type checking
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
  - Find and update all files importing/using transactions: `frontend/src/components/**/*Transaction*.vue`, `frontend/src/views/**/*Transaction*.vue`
  - Update components to use `transaction.account.name` and `transaction.category?.name` directly
  - Remove any getAccountName/getCategoryName helper calls
  - Update prop interfaces to remove lookup function parameters

- [ ] T023 Update test files to mock embedded field structure
  - Find test files using mocked transactions: `frontend/src/**/*.test.ts`, `frontend/src/**/*.spec.ts`
  - Update mock transaction objects to include nested account and category objects
  - Mock structure: `{ id: '...', account: { id: '...', name: 'Test Account', isArchived: false }, category: { id: '...', name: 'Test Category', isArchived: false }, ... }`
  - Test null category case: `category: null`
  - Test archived account case: `isArchived: true`

- [ ] T024 [P] Verify frontend type safety
  - `cd frontend && npm run type-check`
  - Resolve any remaining TypeScript errors
  - Ensure all transaction.account and transaction.category accesses are properly typed

### Frontend Testing

- [ ] T025 Test component rendering with embedded fields
  - `cd frontend && npm run dev`
  - Create new transaction with account and category
  - Verify transaction card displays account name from embedded field
  - Verify transaction card displays category name from embedded field
  - Verify archive status displays for archived accounts
  - Verify null category renders gracefully (no errors in console)

- [ ] T026 [P] Run frontend unit tests
  - `cd frontend && npm test`
  - Ensure all component tests pass with new embedded field mocks
  - Fix any test failures from component changes

- [ ] T027 [P] Run frontend code quality checks
  - `cd frontend && npm run lint` (ESLint)
  - `cd frontend && npm run format` (prettier:fix)
  - Fix any linting issues found

- [ ] T028 Test Apollo cache reactivity
  - In dev environment, create transaction with account
  - Then update the account (change name or archive status)
  - Verify transaction display updates automatically (Apollo normalized cache)
  - Verify no manual refresh needed (reactive updates working)

**Checkpoint**: Frontend fully updated with embedded fields. All components working correctly.

---

## Phase 4: Integration & Deployment

**Purpose**: End-to-end testing and coordinated deployment

### Integration Testing

- [ ] T029 End-to-end transaction workflow test
  - Start backend: `cd backend && npm run db:start && npm run dev`
  - Start frontend: `cd frontend && npm run dev`
  - Create account (e.g., "Checking")
  - Create category (e.g., "Groceries")
  - Create transaction with both account and category
  - Verify transaction displays both embedded fields correctly
  - Test pagination if loading 20+ transactions
  - Verify batch loading works (network tab shows 3 requests, not 101)

- [ ] T030 [P] Test data integrity handling
  - Use DynamoDB Admin UI (http://localhost:8001) to manually delete an account or category
  - Query transactions that reference deleted entity
  - Verify transaction returns null for missing account/category (no error)
  - Verify console shows warning logs for missing entities
  - Verify UI displays fallback gracefully

- [ ] T031 [P] Test transaction operations
  - Create transaction with account, no category
  - Verify category displays as null (no errors)
  - Update transaction amount
  - Verify updated amount displays (cache invalidation working)
  - Delete transaction
  - Verify transaction removed from list

- [ ] T032 [P] Test account and category operations
  - Archive account and verify isArchived updates in transaction display
  - Unarchive account and verify isArchived updates
  - Archive category and verify isArchived updates in transaction display
  - Delete category and verify transaction category becomes null
  - Create new category and verify transactions with it display properly

### Deployment Coordination

- [ ] T033 Prepare coordinated deployment
  - Plan deployment order: backend → frontend (same deployment window)
  - Document breaking change: accountId/categoryId fields removed
  - Prepare rollback plan if issues detected
  - Communicate timeline to team

- [ ] T034 [P] Create deployment checklist
  - Backend pre-deployment: verify all tests pass, build succeeds
  - Frontend pre-deployment: verify all tests pass, build succeeds
  - Deployment steps: backend first, then frontend
  - Post-deployment verification steps

- [ ] T035 Deploy backend changes
  - Merge backend changes to main branch
  - Deploy backend: `cd backend-cdk && npm run deploy`
  - Verify API schema updated: query http://api-endpoint/graphql with introspection
  - Confirm DataLoaders active and batching working

- [ ] T036 Deploy frontend changes
  - Merge frontend changes to main branch
  - Deploy frontend: `cd frontend-cdk && npm run deploy && npm run build`
  - Verify frontend assets deployed
  - Test application in production environment

- [ ] T037 Post-deployment verification
  - Test transaction list displays with embedded fields
  - Verify query performance (3 queries, not 101)
  - Monitor logs for any null account/category references (data quality)
  - Check for any console errors in production
  - Run smoke test suite

**Checkpoint**: Feature fully deployed and verified in production.

---

## Phase 5: Polish & Cleanup

**Purpose**: Final improvements and documentation

- [ ] T038 [P] Update project documentation
  - Update CLAUDE.md if any patterns changed
  - Add note about DataLoader batching pattern in architecture section
  - Document per-request DataLoader lifecycle
  - Document cache invalidation pattern for mutations

- [ ] T039 [P] Remove deprecated code (if applicable)
  - Check if any legacy lookup functions remain that should be deleted
  - Verify old accountId/categoryId access patterns completely removed
  - Clean up any commented-out code

- [ ] T040 Code cleanup and optimization
  - Review backend dataloaders for any performance improvements
  - Review component updates for unnecessary re-renders
  - Ensure error logging is consistent and helpful

- [ ] T041 Run full test suite
  - `cd backend && npm test` (backend tests)
  - `cd frontend && npm test` (frontend tests)
  - `cd backend-cdk && npm test` (CDK tests)
  - `cd frontend-cdk && npm test` (CDK tests)
  - Ensure all tests pass

- [ ] T042 [P] Security & Data Integrity Review
  - Verify DataLoader per-request scoping prevents data leakage
  - Confirm null handling for missing entities logged properly
  - Review error responses don't expose internal details
  - Ensure repository scoping still enforces user-level isolation

**Checkpoint**: Feature ready for production with all quality checks passed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Backend Implementation)**: Depends on Phase 1 completion - **BLOCKS Phase 3**
- **Phase 3 (Frontend Implementation)**: Depends on Phase 2 completion - cannot start until backend GraphQL changes are live
- **Phase 4 (Integration & Deployment)**: Depends on Phase 2 AND Phase 3 completion
- **Phase 5 (Polish)**: Depends on Phase 4 completion

### Critical Path

```
Phase 1 (Setup)
    ↓
Phase 2 (Backend - BLOCKING)
    ↓
Phase 3 (Frontend - depends on backend)
    ↓
Phase 4 (Integration)
    ↓
Phase 5 (Polish)
```

### Parallel Opportunities

**Within Phase 2**:
- T002 & T003 & T004 can run in parallel (different files)
- T010 & T011 & T012 can run in parallel (same file but different sections)
- T014 & T015 can run in parallel (different commands)

**Within Phase 3**:
- T019, T021, T022 can run in parallel (different component files)
- T026 & T027 can run in parallel (tests and linting)

**Within Phase 4**:
- T030, T031, T032 can run in parallel (different test scenarios)
- T034, T035 can start after T033 in parallel

### Sequential Requirements (Within Phase 2)

- T001 must complete before T002, T003, T004 (dependency install needed)
- T005, T006 must complete before T007 (schema must exist before resolvers)
- T007, T008, T009 must complete before T010, T011 (resolvers needed for mutations)
- T013 must run last (verifies T002-T012 all work together)

### Sequential Requirements (Within Phase 3)

- T016 must complete before T017 (schema sync before codegen)
- T017 must complete before T018 (types generated before fragment update)
- T018 must complete before T020-T022 (fragment needed before components use it)
- T025 must run after T020-T024 (tests all components before running dev)

---

## Parallel Example: Phase 2 Backend Work

**After T001 completes (dataloader installed), launch these in parallel**:

```
Developer A:
  - T002: Create accountLoader.ts
  - T010: Invalidate accounts in mutations

Developer B:
  - T003: Create categoryLoader.ts
  - T011: Invalidate categories in mutations

Developer C:
  - T004: Create dataloaders/index.ts barrel
  - T005 & T006: Update schema.graphql (sequential, same file)

Developer D:
  - T007: Create Transaction.ts resolvers
  - T008: Update server.ts context
  - T009: Update resolvers/index.ts
```

**Then sequentially**:
  - T012: Verify all mutations have cache invalidation
  - T013: Integration test in GraphQL Playground

---

## Parallel Example: Phase 3 Frontend Work

**After T017 completes (types generated), launch these in parallel**:

```
Developer A:
  - T020: Update TransactionCard.vue
  - T026: Run component unit tests

Developer B:
  - T021: Update Transactions.vue
  - T027: Run linting and formatting

Developer C:
  - T022: Update other transaction components
  - T023: Update test mocks

Developer D:
  - T018: Update TRANSACTION_FRAGMENT
  - T024: Verify TypeScript types
  - T025: Test in dev environment
```

---

## Implementation Strategy

### MVP First (Most Common)

**Scope**: Complete Phases 1-3 (full feature implementation)

1. ✅ Complete Phase 1: Setup (1 task, 5 min)
2. ✅ Complete Phase 2: Backend Implementation (12 tasks, 4-5 hours)
   - Test with GraphQL Playground
3. ✅ Complete Phase 3: Frontend Implementation (9 tasks, 3-4 hours)
   - Test in dev environment
4. 🎯 **STOP and VALIDATE Phase 3**: Feature fully working with embedded fields
5. Then proceed to Phase 4 for deployment

### Incremental Delivery (If Needed)

If changes are too large, split into:
- **Iteration 1**: Backend DataLoaders + Schema changes (Phase 2 Tasks 1-9)
- **Iteration 2**: Backend cache invalidation (Phase 2 Tasks 10-12)
- **Iteration 3**: Frontend integration (Phase 3)

However, **Phase 2 MUST be 100% complete before Phase 3 starts** (cannot split across iterations).

### Parallel Team Strategy

With multiple developers (4+):

1. All complete Phase 1 together (trivial)
2. Split Phase 2:
   - Developer A: DataLoaders (T002, T003, T004)
   - Developer B: Schema (T005, T006)
   - Developer C: Resolvers (T007, T008, T009)
   - Developer D: Mutations & Testing (T010-T013)
3. Merge/integrate Phase 2 work
4. Split Phase 3:
   - Developer A: Component updates (T020, T021, T022)
   - Developer B: Tests & types (T023, T024, T026, T027)
   - Developer C: Schema sync & fragments (T016, T017, T018)
   - Developer D: Integration testing (T025, T028)

---

## Quality Gates

### Before Proceeding to Next Phase

**Phase 1 → Phase 2**:
- [ ] dataloader npm package successfully installed

**Phase 2 → Phase 3**:
- [ ] GraphQL schema has TransactionEmbeddedAccount and TransactionEmbeddedCategory types
- [ ] GraphQL query with nested account/category succeeds
- [ ] Query count reduced to 3 (verified in GraphQL Playground)
- [ ] Backend build succeeds: `npm run build`
- [ ] Backend linting passes: `npm run lint`

**Phase 3 → Phase 4**:
- [ ] Frontend TypeScript compiles: `npm run type-check`
- [ ] All component tests pass: `npm test`
- [ ] Frontend linting passes: `npm run lint`
- [ ] Dev environment loads without console errors: `npm run dev`
- [ ] Transaction card displays embedded account and category correctly

**Phase 4 Completion**:
- [ ] End-to-end test passes (create transaction → view with embedded fields)
- [ ] Null category handling works gracefully
- [ ] Archived account status displays correctly
- [ ] All query performance tests pass
- [ ] Backend and frontend tests pass
- [ ] No console errors in production environment

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
- **File paths**: All paths are from repository root; adjust for your working directory
- **Timing estimates**: Based on quickstart.md (12-17 hours total)
- **Breaking change**: accountId/categoryId removed - requires coordinated deployment
- **DataLoader pattern**: Per-request lifecycle, auto-clears at end of GraphQL request
- **Testing**: No explicit test suite tasks included (feature is UI-focused); use manual testing
- **Deployment**: Atomic - both backend and frontend must deploy together
