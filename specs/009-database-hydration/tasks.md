# Phase 2: Implementation Tasks - Database Record Hydration Pattern

**Feature**: 009-database-hydration | **Branch**: `009-database-hydration`
**Date Generated**: 2025-11-07 | **Status**: Ready for Implementation

---

## Overview

This document defines actionable implementation tasks for the Database Record Hydration Pattern feature. Tasks are organized by user story (P1: User Stories 1-3, P2: User Story 4) and deployment phases. Each task is independently executable with clear acceptance criteria.

**Total Task Count**: 20 tasks
**Task Breakdown**:
- Phase 1 (Setup): 2 tasks
- Phase 2 (Foundational): 4 tasks
- Phase 3 (US1: Type-Safe Hydration): 4 tasks
- Phase 4 (US2: Compile-Time Validation): 2 tasks
- Phase 5 (US3: Reusable Pattern): 1 task
- Phase 6 (US4: Data Corruption Detection): 4 tasks
- Phase 7 (Polish & Validation): 3 tasks

**Parallel Opportunities**: Schema creation (T005-T006) can run in parallel. Repository hydration updates (T008-T010) can run in parallel after schemas are complete. Test implementations (T015-T017) can run in parallel.

---

## Phase 1: Setup

### 2.1 Project Structure Verification

- [ ] T001 Verify project structure `backend/src/repositories/` exists with AccountRepository, CategoryRepository, TransactionRepository, UserRepository files
- [ ] T002 Verify `backend/src/repositories/utils/` directory exists and contains dynamoClient.ts, pagination.ts, constants.ts (create utils directory if missing)

---

## Phase 2: Foundational - Create Zod Schemas

These tasks implement core validation schemas used by all repositories. Based on design specifications in `data-model.md` and `contracts/SPECIFICATION.md`.

### 2.2 User Schema Implementation

- [ ] T003 Create `backend/src/repositories/utils/User.schema.ts` with userSchema object
  - Export `userSchema` const with `satisfies z.ZodType<User>`
  - Validate: id (uuid), auth0Id (non-empty string), createdAt (ISO 8601), updatedAt (ISO 8601)
  - Re-export User type from `../../models/User`
  - Reference: `data-model.md` section 1 and `contracts/SPECIFICATION.md` section 5

- [ ] T004 Create `backend/src/repositories/utils/Account.schema.ts` with accountSchema object
  - Export `accountSchema` const with `satisfies z.ZodType<Account>`
  - Validate: id (uuid), userId (uuid), name (1-255 chars), initialBalance (number), currency (3-char uppercase), isArchived (boolean), createdAt (ISO 8601), updatedAt (ISO 8601)
  - Re-export Account type from `../../models/Account`
  - Reference: `data-model.md` section 2 and `contracts/SPECIFICATION.md` section 2

- [ ] T005 [P] Create `backend/src/repositories/utils/Category.schema.ts` with categorySchema object
  - Export `categorySchema` const with `satisfies z.ZodType<Category>`
  - Validate: id (uuid), userId (uuid), name (1-255 chars), type (enum: 'INCOME' | 'EXPENSE'), description (optional, max 1000), isArchived (boolean), createdAt (ISO 8601), updatedAt (ISO 8601)
  - Re-export Category and CategoryType types from `../../models/Category`
  - Reference: `data-model.md` section 3 and `contracts/SPECIFICATION.md` section 3

- [ ] T006 [P] Create `backend/src/repositories/utils/Transaction.schema.ts` with transactionSchema object
  - Export `transactionSchema` const with `satisfies z.ZodType<Transaction>`
  - Validate: id (uuid), userId (uuid), accountId (uuid), amount (positive number), type (enum: 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT'), currency (3-char uppercase), date (YYYY-MM-DD format), description (optional, max 500), categoryId (optional uuid), transferId (optional uuid), isArchived (boolean), createdAt (ISO 8601), updatedAt (ISO 8601)
  - Re-export Transaction and TransactionType types from `../../models/Transaction`
  - Reference: `data-model.md` section 4 and `contracts/SPECIFICATION.md` section 4

---

## Phase 3: User Story 1 - Type-Safe Hydration Implementation

These tasks add hydration validation to each repository. Hydration validates raw DynamoDB data at the repository boundary before it reaches service layers.

### 2.3 UserRepository Hydration

- [ ] T007 [US1] Update `backend/src/repositories/UserRepository.ts` to implement hydration
  - Import userSchema from `./utils/User.schema`
  - Define private `hydrateUser(data: unknown): User` function that catches ZodError and throws UserRepositoryError
  - Replace all `as User` type assertions with `hydrateUser()` calls
  - Update methods: findById, findByAuth0Id, and any other read operations returning User
  - For array returns: use `.map(hydrateUser)`
  - Reference: `contracts/SPECIFICATION.md` section "Integration Points"

- [ ] T008 [P] [US1] Update `backend/src/repositories/AccountRepository.ts` to implement hydration
  - Import accountSchema from `./utils/Account.schema`
  - Define private `hydrateAccount(data: unknown): Account` function that catches ZodError and throws AccountRepositoryError
  - Replace all `as Account` type assertions with `hydrateAccount()` calls
  - Update all repository read methods (findById, findActive, find, etc.)
  - For array returns: use `.map(hydrateAccount)`
  - Reference: `quickstart.md` Repository Method Pattern section

- [ ] T009 [P] [US1] Update `backend/src/repositories/CategoryRepository.ts` to implement hydration
  - Import categorySchema from `./utils/Category.schema`
  - Define private `hydrateCategory(data: unknown): Category` function that catches ZodError and throws CategoryRepositoryError
  - Replace all `as Category` type assertions with `hydrateCategory()` calls
  - Update all repository read methods (findById, findActive, find, etc.)
  - For array returns: use `.map(hydrateCategory)`

- [ ] T010 [P] [US1] Update `backend/src/repositories/TransactionRepository.ts` to implement hydration
  - Import transactionSchema from `./utils/Transaction.schema`
  - Define private `hydrateTransaction(data: unknown): Transaction` function that catches ZodError and throws TransactionRepositoryError
  - Replace all `as Transaction` type assertions with `hydrateTransaction()` calls
  - Update all repository read methods (findById, findByAccountId, find, findCursor, etc.)
  - For array returns: use `.map(hydrateTransaction)`
  - Reference: Most complex entity with optional fields and enums

---

## Phase 4: User Story 2 - Compile-Time Type Safety Verification

These tasks verify that TypeScript catches schema/interface mismatches at compile-time.

### 2.4 Type Safety Validation

- [ ] T011 [US2] Verify TypeScript compilation succeeds for all schema files
  - Run `cd backend && npm run type-check`
  - Confirm no TypeScript errors for User.schema.ts, Account.schema.ts, Category.schema.ts, Transaction.schema.ts
  - Confirm `satisfies z.ZodType<Entity>` catches all field mismatches
  - Acceptance: Zero TypeScript compilation errors from schema files

- [ ] T012 [US2] Document compile-time type safety patterns in backend developer context
  - Add notes to `.specify/memory/claude-backend.md` explaining how `satisfies z.ZodType<Entity>` ensures schema/interface alignment
  - Include examples of common mistakes (missing fields, wrong types) and how TypeScript catches them
  - Reference user story 2 acceptance scenarios

---

## Phase 5: User Story 3 - Reusable Pattern Across All Repositories

This task validates that the hydration pattern is consistent and reusable across all repositories.

### 2.5 Pattern Consistency

- [ ] T013 [US3] Validate hydration pattern consistency across all four repositories
  - Verify all 4 repositories (User, Account, Category, Transaction) follow the same hydration pattern
  - Confirm each defines `hydrateEntity` function with identical error handling logic
  - Confirm each catches ZodError and throws repository-specific error with 'VALIDATION_FAILED' code
  - Confirm ZodError issues array is passed to repository error for debugging
  - Acceptance: All 4 repositories use consistent, reusable patterns

---

## Phase 6: User Story 4 - Data Corruption Detection

These tasks implement and test error handling for corrupted database records.

### 2.6 Corruption Detection Tests

- [ ] T014 [US4] Create and add test cases for UserRepository hydration in `backend/src/repositories/UserRepository.test.ts`
  - Create new test file (UserRepository.test.ts does not yet exist)
  - Test scenario: Valid user data hydrates successfully
  - Test scenario: Missing required field (e.g., auth0Id) throws UserRepositoryError with 'VALIDATION_FAILED' code
  - Test scenario: Invalid UUID in id field throws error with field-level details
  - Use existing test structure and faker factories from `src/__tests__/utils/factories.ts` (note: may need to add fakeUser factory if not present)
  - Reference existing test patterns: AccountRepository.test.ts
  - Acceptance: All scenarios pass, new test file created and integrated

- [ ] T015 [P] [US4] Add test cases for AccountRepository hydration in `backend/src/repositories/AccountRepository.test.ts`
  - Test scenario: Valid account data hydrates successfully
  - Test scenario: Missing required field (e.g., initialBalance) throws AccountRepositoryError with field location in error
  - Test scenario: Invalid currency code throws error with expected 3-char validation rule
  - Test scenario: isArchived field missing throws error (never null)
  - Use existing test pattern with `fakeAccount()` factory and truncateTable helper
  - Acceptance: All scenarios pass without affecting existing tests

- [ ] T016 [P] [US4] Add test cases for CategoryRepository hydration in `backend/src/repositories/CategoryRepository.test.ts`
  - Test scenario: Valid category with required fields hydrates successfully
  - Test scenario: Valid category with optional description hydrates successfully
  - Test scenario: Invalid CategoryType enum throws error with expected values
  - Test scenario: Missing userId throws error identifying partition key validation failure
  - Use `fakeCategory()` factory from test utilities and existing test patterns
  - Acceptance: All scenarios pass without affecting existing tests

- [ ] T017 [P] [US4] Add test cases for TransactionRepository hydration in `backend/src/repositories/TransactionRepository.test.ts`
  - Test scenario: Valid INCOME transaction hydrates successfully
  - Test scenario: Valid TRANSFER_IN transaction hydrates successfully
  - Test scenario: Invalid transaction type throws error with enum options
  - Test scenario: Negative amount throws error (amount must be positive)
  - Test scenario: Invalid date format (not YYYY-MM-DD) throws error with format requirement
  - Test scenario: Missing accountId (FK) throws error with field location
  - Use `fakeTransaction()` factory and existing test patterns from AccountRepository.test.ts as reference
  - Acceptance: All scenarios pass without affecting existing tests

---

## Phase 7: Polish & Documentation

Final validation, testing, and documentation tasks.

### 2.7 Integration Testing

- [ ] T018 Run full test suite for repositories to verify no breaking changes
  - Execute `cd backend && npm run test`
  - Confirm all existing repository tests pass without modification
  - Confirm new hydration test cases pass
  - Acceptance: 100% test pass rate

- [ ] T019 Run backend build process to ensure no compilation errors
  - Execute `cd backend && npm run build`
  - Confirm TypeScript compilation succeeds
  - Confirm dist/ directory is created with compiled code
  - Acceptance: Build succeeds with no errors

### 2.8 Final Validation

- [ ] T020 [P] Verify feature completion against all user story acceptance criteria
  - **US1 Acceptance**: Verify repository hydration validates data, catches errors, returns typed objects for all 4 repositories
  - **US2 Acceptance**: Verify TypeScript compilation fails if Zod schema is missing fields from interface
  - **US3 Acceptance**: Verify all 4 repositories use same generic hydration pattern with appropriate error transformation
  - **US4 Acceptance**: Verify validation errors clearly identify missing/invalid fields with field locations
  - Acceptance: All acceptance scenarios from spec.md pass

---

## Dependencies & Execution Order

### Critical Path
1. **T001-T002**: Setup (must complete first)
2. **T003-T006**: Create all schemas (can run in parallel)
3. **T007-T010**: Add hydration to repositories (can run in parallel after schemas)
4. **T011-T012**: Verify compile-time safety
5. **T013**: Validate pattern consistency
6. **T014-T017**: Add corruption detection tests (can run in parallel)
7. **T018-T019**: Integration testing (sequential, final check)
8. **T020**: Final validation

### Parallelization Opportunities
- **Schemas (T005-T006)** can run parallel with User and Account schemas completing
- **Repository Updates (T008-T010)** can run parallel after all schemas complete
- **Test Implementations (T015-T017)** can run parallel after all repositories are updated

---

## Success Criteria

✅ **All Phase Completion**:
- All 4 Zod schemas created with proper validation rules
- All 4 repositories updated with hydration functions
- TypeScript compilation passes without errors
- All existing tests pass without modification
- New hydration test cases cover validation and error scenarios
- Clear error messages identify corrupted fields with locations
- Documentation covers implementation patterns for future entities

✅ **User Story 1 (P1) - Type-Safe Hydration**:
- [x] Repository methods validate data at boundary using Zod schemas
- [x] ZodError caught and transformed to repository-specific error
- [x] Error includes field-level validation details for debugging
- [x] Pattern applies to all 4 repositories consistently

✅ **User Story 2 (P1) - Compile-Time Validation**:
- [x] TypeScript compilation fails if schema field missing from interface
- [x] `satisfies z.ZodType<Entity>` ensures schema/interface alignment
- [x] Adding/removing interface field immediately triggers TypeScript error

✅ **User Story 3 (P1) - Reusable Pattern**:
- [x] All 4 repositories follow identical hydration pattern
- [x] No code duplication - each uses same approach
- [x] New entities can be added using same pattern

✅ **User Story 4 (P2) - Data Corruption Detection**:
- [x] Missing required fields caught with clear error identifying field
- [x] Invalid field values caught with validation rule context
- [x] Error messages point to repository as source of validation failure
- [x] Test scenarios verify corruption detection effectiveness

---

## Implementation Notes

### Key Files to Create
1. `backend/src/repositories/utils/User.schema.ts`
2. `backend/src/repositories/utils/Account.schema.ts`
3. `backend/src/repositories/utils/Category.schema.ts`
4. `backend/src/repositories/utils/Transaction.schema.ts`

### Key Files to Update
1. `backend/src/repositories/UserRepository.ts` (add hydration)
2. `backend/src/repositories/AccountRepository.ts` (add hydration)
3. `backend/src/repositories/CategoryRepository.ts` (add hydration)
4. `backend/src/repositories/TransactionRepository.ts` (add hydration)
5. `backend/src/repositories/UserRepository.test.ts` (add tests, co-located with source)
6. `backend/src/repositories/AccountRepository.test.ts` (add tests, co-located with source)
7. `backend/src/repositories/CategoryRepository.test.ts` (add tests, co-located with source)
8. `backend/src/repositories/TransactionRepository.test.ts` (add tests, co-located with source)

### Key Documentation
- `docs/database-hydration.md` (source document - reference for patterns)
- `quickstart.md` (source document - implementation guide)
- `CLAUDE.md` (source document - architectural context)

### Testing Strategy
- Existing tests should pass without modification (hydration is transparent to service layer)
- New tests focus on hydration validation and error scenarios
- No test code changes required for service layer or resolvers

### Deployment Safety
- Feature is backward compatible (hydration is at repository boundary)
- No database migration required (validation operates on existing data)
- No breaking changes to repository interfaces
- Services and resolvers consume validated data transparently

---

## References

- **spec.md** - User stories with acceptance criteria
- **plan.md** - Overall feature plan and structure
- **data-model.md** - Entity schemas with validation rules
- **research.md** - Technical decisions and patterns
- **contracts/SPECIFICATION.md** - Implementation specification
- **quickstart.md** - Step-by-step implementation guide
