# Implementation Tasks: Transaction Duplication

**Branch**: `017-duplicate-transaction` | **Feature**: Transaction Duplication | **Status**: Ready for Implementation

## Overview

This document defines all implementation tasks for the transaction duplication feature, organized by user story and priority. The feature adds a "Copy" button to expanded transaction cards that opens the appropriate form (transaction create or transfer create) with fields prefilled from the original transaction, except date which is always set to today.

**Tech Stack**: TypeScript 5.x, Vue 3, Vuetify, Apollo Server, Apollo Client, DynamoDB, Jest

## Task Summary

- **Total Tasks**: 18
- **Setup/Foundational**: 3 tasks
- **User Story 1 (P1)**: 8 tasks
- **User Story 2 (P2)**: 4 tasks
- **Edge Cases & Polish**: 3 tasks

## Dependencies & Execution Strategy

### User Story Completion Order

```
Setup & Foundational (must complete first)
    ↓
User Story 1: Quick Transaction Duplication [P1] (no dependencies on US2)
    ↓
User Story 2: Edit Before Saving [P2] (depends on US1 functionality)
    ↓
Edge Cases & Polish (final refinements)
```

### Parallelization Opportunities

Within each user story phase:
- Frontend (Copy button, form wiring) and backend (mutation support) tasks can run in parallel if mutations already support prefilled data
- Component tasks can run in parallel with composable/utility tasks
- Different file modifications can be parallelized

## Phase 1: Setup & Foundational

*Prerequisites: Must complete before starting user story implementation*

- [ ] T001 Verify transaction query returns all required fields for duplication in `backend/src/schema.graphql` (id, date, amount, currency, accountId, categoryId, description, type)
- [ ] T002 Verify createTransaction and createTransfer mutations accept prefilled input in `backend/src/schema.graphql` (no schema changes if already supported)
- [ ] T003 Confirm existing form components support prefilled initial values in `frontend/src/components/` (TransactionCreateForm, TransferCreateForm)

## Phase 2: User Story 1 - Quick Transaction Duplication [P1]

**Goal**: Users can expand any transaction, click Copy, and see the create form open with all fields prefilled (except date set to today)

**Independent Test Criteria**:
- Copy button is visible on expanded transactions
- Copy button opens correct form (transaction form for EXPENSE/INCOME/REFUND, transfer form for TRANSFER_IN/TRANSFER_OUT)
- Form fields are prefilled from source transaction
- Date is always set to today (not source date)
- Original transaction unchanged after clicking Copy and canceling

**Frontend Implementation** (Copy Button & Form Wiring):

- [ ] T004 [P] [US1] Find transaction card component that displays expanded transactions in `frontend/src/components/` or `frontend/src/views/`
- [ ] T005 [P] [US1] Add Copy button to expanded transaction card positioned right of Edit button in transaction card component file
- [ ] T006 [P] [US1] Create composable `useDuplicateTransaction()` in `frontend/src/composables/useDuplicateTransaction.ts` to handle duplicate logic
- [ ] T007 [US1] Wire Copy button to load source transaction data and determine form type (transfer vs. regular) in composable
- [ ] T008 [US1] Create helper function `buildDuplicateData()` in `frontend/src/composables/useDuplicateTransaction.ts` to extract and format transaction fields with date set to today
- [ ] T009 [US1] Open appropriate form (transaction or transfer) with prefilled data using existing form modal/dialog in transaction card component
- [ ] T010 [P] [US1] Update frontend transaction queries to ensure all needed fields are fetched in GraphQL query in `frontend/src/graphql/` or composables

**Backend Implementation** (Mutation Support Verification):

- [ ] T011 [P] [US1] Verify createTransaction mutation accepts and processes prefilled input fields in `backend/src/resolvers/transaction.resolver.ts`
- [ ] T012 [P] [US1] Verify createTransfer mutation accepts and processes prefilled input fields in `backend/src/resolvers/transfer.resolver.ts`
- [ ] T013 [US1] Test that mutations enforce user data isolation (users can only access their own transactions) via authenticated context

**Testing** (User Story 1):

- [ ] T014 [US1] Test Copy button is visible on expanded EXPENSE transaction in `frontend/tests/` (if manual testing preferred, skip)
- [ ] T015 [US1] Test Copy button opens transaction form for EXPENSE/INCOME/REFUND with correct prefilled data in `frontend/tests/` (if manual testing preferred, skip)
- [ ] T016 [US1] Test Copy button opens transfer form for TRANSFER_IN/TRANSFER_OUT with correct prefilled data in `frontend/tests/` (if manual testing preferred, skip)

## Phase 3: User Story 2 - Edit Before Saving Duplicated Transaction [P2]

**Goal**: Users can modify any prefilled field (especially date) before saving, and the new transaction is created with modified values

**Independent Test Criteria**:
- Date can be changed to a different value before saving
- Amount can be modified before saving
- Category can be changed before saving
- Description can be updated before saving
- New transaction saves with modified values
- Original transaction remains unchanged

**Frontend Implementation** (Form Modification Support):

- [ ] T017 [P] [US2] Ensure existing transaction form accepts and preserves user modifications to all fields (should already work, verify in `frontend/src/components/TransactionCreateForm.vue` or equivalent)
- [ ] T018 [US2] Test modifying date field and saving duplicated transaction with new date in manual testing or `frontend/tests/`
- [ ] T019 [US2] Test modifying amount, category, description fields and saving in manual testing or `frontend/tests/`

**Backend Implementation** (No Changes Needed):

- [ ] T020 [US2] Verify mutation input validation handles modified values correctly in `backend/src/resolvers/` and `backend/src/services/`

## Phase 4: Edge Cases & Polish

**Frontend Edge Cases**:

- [ ] T021 [P] Handle duplicating transactions with deleted accounts in `frontend/src/composables/useDuplicateTransaction.ts` (form should show deleted account, allow user to select new one)
- [ ] T022 [P] Handle duplicating transactions with deleted categories in `frontend/src/composables/useDuplicateTransaction.ts` (form should show deleted category, allow user to select new one or leave uncategorized)
- [ ] T023 Test duplicating refund transactions opens correct form with prefilled data in manual testing

**Code Quality & Testing**:

- [ ] T024 Run ESLint and Prettier on all modified files in `frontend/src/` and `backend/src/`
- [ ] T025 Run existing test suite to ensure no regressions in `frontend/` and `backend/`
- [ ] T026 Verify TypeScript strict mode passes on all new code

## Test Scenarios (Manual or Automated)

### User Story 1 Acceptance Tests

**Scenario 1: Copy button visible on expanded transaction**
- Given: User opens transactions list
- When: User expands any EXPENSE transaction
- Then: "Copy" button appears to the right of "Edit" button
- File: Transaction card component

**Scenario 2: Copy button opens form with prefilled data**
- Given: Expanded EXPENSE transaction with amount=$50, account="Checking", category="Groceries"
- When: User clicks Copy button
- Then: Transaction create form opens with prefilled data (amount=$50, account="Checking", category="Groceries", date=today)
- File: useDuplicateTransaction composable, transaction form component

**Scenario 3: Transfer copy opens transfer form**
- Given: Expanded TRANSFER_OUT transaction from Account A to Account B, amount=$100
- When: User clicks Copy button
- Then: Transfer create form opens (NOT regular transaction form) with fromAccount=A, toAccount=B, amount=$100, date=today
- File: useDuplicateTransaction composable

**Scenario 4: Original unchanged after Copy**
- Given: Expanded transaction with ID=txn123, amount=$50
- When: User clicks Copy button (without saving)
- Then: Original transaction txn123 still has amount=$50, no new transaction created
- File: All components (verifying no mutation called)

### User Story 2 Acceptance Tests

**Scenario 1: Modify date before saving**
- Given: Duplicate form open with date=today
- When: User changes date to yesterday and saves
- Then: New transaction created with date=yesterday, original unchanged
- File: Transaction form component, createTransaction mutation

**Scenario 2: Modify amount before saving**
- Given: Duplicate form open with amount=$50
- When: User changes amount to $75 and saves
- Then: New transaction created with amount=$75, original still $50
- File: Transaction form component, createTransaction mutation

**Scenario 3: Modify category before saving**
- Given: Duplicate form open with category="Groceries"
- When: User changes category to "Utilities" and saves
- Then: New transaction created with category="Utilities"
- File: Transaction form component, createTransaction mutation

**Scenario 4: Modify description before saving**
- Given: Duplicate form open with description="Weekly groceries"
- When: User changes description to "Monthly groceries" and saves
- Then: New transaction created with updated description
- File: Transaction form component, createTransaction mutation

## File Paths Reference

### Frontend

- Transaction list/card component: `frontend/src/components/` (find TransactionCard, TransactionItem, or ExpandableTransaction)
- Create transaction form: `frontend/src/components/TransactionCreateForm.vue` (or similar pattern)
- Transfer create form: `frontend/src/components/TransferCreateForm.vue` (or similar pattern)
- Composables: `frontend/src/composables/`
- GraphQL queries: `frontend/src/graphql/` or co-located in composables
- Tests: `frontend/tests/` or co-located as `.test.ts` files

### Backend

- Schema: `backend/src/schema.graphql`
- Transaction resolver: `backend/src/resolvers/transaction.resolver.ts` (or similar)
- Transfer resolver: `backend/src/resolvers/transfer.resolver.ts` (or similar)
- Transaction service: `backend/src/services/transaction.service.ts`
- Transfer service: `backend/src/services/transfer.service.ts`
- Tests: `backend/tests/` or co-located as `.test.ts` files

## Implementation Notes

### Key Design Decisions

1. **Date Handling**: Date is ALWAYS set to today when duplicating, not copied from source. User can modify before saving.
2. **Form Selection**: Route TRANSFER_IN/TRANSFER_OUT to dedicated transfer form. Route EXPENSE/INCOME/REFUND to regular transaction form.
3. **Authorization**: User can only duplicate their own transactions (enforced via authenticated context in existing mutations).
4. **No Schema Changes**: Reuses existing createTransaction and createTransfer mutations. No new mutations or schema modifications.
5. **No Analytics Tracking**: Don't log or track duplication events (FR-010 requirement).

### Testing Strategy

- **Frontend**: Test Copy button logic (loading data, determining form type, opening form)
- **Backend**: Mutations already tested for normal creation. Same validation applies to duplicated data.
- **E2E**: Manual testing of user flow (expand → click Copy → modify → save)

### MVP Scope

Minimum Viable Product = User Story 1 only:
- Copy button on transaction cards
- Form opens with prefilled data (except date)
- Date set to today
- Original transaction unchanged

User Story 2 is dependent on US1 being complete.

## Success Criteria

- ✓ Users can duplicate a transaction in under 30 seconds
- ✓ All fields (except date) accurately copied from source
- ✓ Date always set to today
- ✓ New transaction created, original unchanged
- ✓ Authorization enforced (users can only duplicate their own)
- ✓ Forms accept and validate duplicated data same as manual creation
- ✓ No analytics tracking of duplication events
