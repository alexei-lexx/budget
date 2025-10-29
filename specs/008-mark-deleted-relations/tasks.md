# Implementation Tasks: Mark Deleted Accounts and Categories

**Feature**: Mark Deleted Accounts and Categories in Transactions
**Branch**: `008-mark-deleted-relations`
**Date**: 2025-10-29
**Status**: Ready for Implementation

**Total Tasks**: 18
**Estimated Effort**: 2-3 hours
**Primary Files Modified**: 2 (TransactionCard.vue, Transactions.vue)

---

## Task Dependencies & Execution Order

```
Phase 1: Setup & Verification (Independent)
├─ T001: Verify GraphQL schema
├─ T002: Verify GraphQL queries
└─ T003: Add component props interface

Phase 2: Component Base Implementation (T003 required)
├─ T004: Update account name template
├─ T005: Update category name template
└─ T006: Add CSS styling rules

Phase 3: User Story 1 - Deleted Account Display (T006 required)
├─ T007: [P] Pass accountIsArchived prop
└─ T008: Test deleted account styling

Phase 4: User Story 2 - Deleted Category Display (T006 required)
├─ T009: [P] Pass categoryIsArchived prop
└─ T010: Test deleted category styling

Phase 5: User Story 3 - Transaction Operations (T006 required)
├─ T011: Verify edit operations work
├─ T012: Verify delete operations work
└─ T013: Verify styling persists in expanded view

Phase 6: Polish & Quality Assurance
├─ T014: Code quality (ESLint + Prettier)
├─ T015: Visual testing (desktop/mobile)
└─ T016: Accessibility testing
```

**Parallel Execution Opportunities**:
- Phase 1 tasks can run in parallel (no dependencies)
- Phase 3, 4, and 5 can run in parallel after Phase 2 completes (different concerns)

---

## Phase 1: Setup & Verification

### Goal
Verify that GraphQL schema and queries include the `isArchived` field needed for this feature.

### Independent Test Criteria
✅ No changes needed; feature uses existing GraphQL data structures

---

- [x] T001 Verify GraphQL schema includes isArchived field on embedded types (`backend/src/schema.graphql`)
  - [x] Confirm `TransactionEmbeddedAccount` type has `isArchived: Boolean!` field
  - [x] Confirm `TransactionEmbeddedCategory` type has `isArchived: Boolean!` field
  - [x] Note: No schema changes needed; field already exists

- [x] T002 Verify GraphQL queries select isArchived field (`frontend/src/graphql/fragments.ts`)
  - [x] Confirm `TRANSACTION_FRAGMENT` includes `isArchived` in account selection
  - [x] Confirm `TRANSACTION_FRAGMENT` includes `isArchived` in category selection
  - [x] Note: No query changes needed; field already selected

- [x] T003 Add component props interface to TransactionCard.vue (`frontend/src/components/transactions/TransactionCard.vue`)
  - [x] Add `accountIsArchived: boolean` prop to interface
  - [x] Add `categoryIsArchived?: boolean` prop to interface
  - [x] Set defaults: `accountIsArchived = false`, `categoryIsArchived = undefined`

---

## Phase 2: Component Base Implementation

### Goal
Implement core component changes needed for displaying archived references: template updates and styling.

### Acceptance Criteria
- ✅ Account names show strikethrough when archived flag is true
- ✅ Category names show strikethrough when archived flag is true
- ✅ aria-label attributes include "Deleted: " prefix for accessibility
- ✅ title attributes provide hover tooltips
- ✅ Styling uses Vuetify theme variables

---

- [x] T004 Update account name template in TransactionCard.vue (`frontend/src/components/transactions/TransactionCard.vue`)
  - [x] Replace plain account name text with conditional span element
  - [x] Add `:class="{ 'account-archived': accountIsArchived }"` binding
  - [x] Add `:aria-label` with conditional "Deleted: " prefix (when archived)
  - [x] Add `:title` with "Archived account" tooltip text (when archived)
  - [x] Ensure span wraps only the account name, preserves surrounding punctuation

- [x] T005 Update category name template in TransactionCard.vue (`frontend/src/components/transactions/TransactionCard.vue`)
  - [x] Replace plain category name text with conditional span element
  - [x] Add `:class="{ 'category-archived': categoryIsArchived }"` binding
  - [x] Add `:aria-label` with conditional "Deleted: " prefix (when archived)
  - [x] Add `:title` with "Archived category" tooltip text (when archived)
  - [x] Ensure span is nested within the v-if category container

- [x] T006 Add CSS styling rules to TransactionCard.vue (`frontend/src/components/transactions/TransactionCard.vue`)
  - [x] Add `.account-archived` and `.category-archived` CSS classes to `<style scoped>` block
  - [x] Set `text-decoration: line-through` for both classes
  - [x] Set `opacity: 0.6` for both classes
  - [x] Set `color: var(--v-theme-on-surface-variant)` to use Vuetify theme color
  - [x] Verify styles apply to both collapsed and expanded states

---

## Phase 3: User Story 1 - View Transaction with Deleted Account

### User Story
A user creates a transaction referencing Account A, then deletes Account A. When viewing the transactions list, the user should immediately recognize that the account reference is no longer valid through visual styling.

### Acceptance Scenarios
1. **Given** a transaction exists with an embedded account reference, **When** that account is deleted, **Then** the account name appears with strikethrough text styling in the transaction card
2. **Given** a transaction with deleted account reference is viewed, **When** the user looks at the transactions list, **Then** the strikethrough is clearly visible and distinguishable from active accounts
3. **Given** multiple transactions where some reference deleted accounts, **When** viewing the list, **Then** only deleted account references have strikethrough styling

### Independent Test Criteria
✅ Can be fully tested by creating a transaction, deleting its referenced account, then viewing the transaction list. The account name should be rendered with strikethrough styling.

---

- [x] T007 [P] [US1] Update Transactions.vue to pass accountIsArchived prop (`frontend/src/views/Transactions.vue`)
  - [x] Locate TransactionCard component binding in template
  - [x] Add `:account-is-archived="transaction.account.isArchived"` prop
  - [x] Verify transaction object has access to account.isArchived from GraphQL

- [ ] T008 [US1] Manual test: Verify deleted account displays with strikethrough styling
  - [ ] Create a new transaction with account "Test Checking" and any amount/date
  - [ ] Navigate to Accounts page and delete the account
  - [ ] Return to Transactions page
  - [ ] Verify account name "Test Checking" displays with strikethrough
  - [ ] Verify strikethrough is clearly visible and distinguishable from active accounts
  - [ ] Test with multiple transactions (some with deleted, some with active accounts)
  - [ ] Verify aria-label announces "Deleted: Test Checking" in screen reader
  - [ ] Verify hover tooltip shows "Archived account"

---

## Phase 4: User Story 2 - View Transaction with Deleted Category

### User Story
A user creates a transaction with a category, then deletes that category. When viewing the transaction, the category name should be visually marked as deleted.

### Acceptance Scenarios
1. **Given** a transaction exists with an embedded category reference, **When** that category is deleted, **Then** the category name appears with strikethrough text styling in the transaction card
2. **Given** both account and category are deleted, **When** viewing the transaction, **Then** both names are displayed with strikethrough styling independently
3. **Given** a transaction references a deleted category but active account, **When** viewing it, **Then** only the category name has strikethrough, account name appears normal

### Independent Test Criteria
✅ Can be fully tested by creating a transaction with a category, deleting the category, then viewing the transaction list. The category name should display with strikethrough styling.

---

- [x] T009 [P] [US2] Update Transactions.vue to pass categoryIsArchived prop (`frontend/src/views/Transactions.vue`)
  - [x] Locate TransactionCard component binding in template
  - [x] Add `:category-is-archived="transaction.category?.isArchived"` prop
  - [x] Verify optional chaining (?.) handles undefined category case
  - [x] Verify transaction object has access to category.isArchived from GraphQL

- [ ] T010 [US2] Manual test: Verify deleted category displays with strikethrough styling
  - [ ] Create a new transaction with account and category "Groceries"
  - [ ] Navigate to Categories page and delete the category
  - [ ] Return to Transactions page
  - [ ] Verify category name "Groceries" displays with strikethrough
  - [ ] Test mixed scenario: Account active, category deleted
  - [ ] Verify only category name has strikethrough, account name is normal
  - [ ] Test with both account and category deleted
  - [ ] Verify both names display with strikethrough independently
  - [ ] Verify aria-label announces "Deleted: Groceries" for category
  - [ ] Verify hover tooltip shows "Archived category"

---

## Phase 5: User Story 3 - Interact with Transaction Having Deleted References

### User Story
A user should be able to perform all normal transaction operations (edit, delete) even if the transaction references deleted accounts or categories. The deleted reference marking is purely informational.

### Acceptance Scenarios
1. **Given** a transaction with deleted account reference, **When** the user clicks edit, **Then** the edit form opens successfully and the transaction can be modified
2. **Given** a transaction with deleted references, **When** the user initiates delete, **Then** the transaction deletes successfully
3. **Given** a transaction with deleted references, **When** the user expands the transaction card, **Then** the deleted reference styling persists in expanded view

### Independent Test Criteria
✅ Can be fully tested by editing and deleting transactions that reference deleted accounts/categories. Operations should complete successfully, and styling should persist.

---

- [ ] T011 [US3] Verify transaction edit works with deleted account reference (`frontend/src/components/transactions/TransactionCard.vue`)
  - [ ] Create transaction with account "Edit Test"
  - [ ] Delete the account
  - [ ] Open transaction edit form
  - [ ] Verify edit form opens without errors
  - [ ] Verify deleted account shows with strikethrough in form
  - [ ] Modify transaction amount or date
  - [ ] Submit edit
  - [ ] Verify transaction updates successfully
  - [ ] Verify deleted account strikethrough persists in updated transaction

- [ ] T012 [US3] Verify transaction delete works with deleted references (`frontend/src/components/transactions/TransactionCard.vue`)
  - [ ] Create transaction with deleted account reference
  - [ ] Initiate delete operation
  - [ ] Verify delete prompt displays without errors
  - [ ] Confirm deletion
  - [ ] Verify transaction removed from list
  - [ ] Repeat test with deleted category reference
  - [ ] Repeat test with both account and category deleted

- [ ] T013 [US3] Verify strikethrough styling persists in expanded view (`frontend/src/components/transactions/TransactionCard.vue`)
  - [ ] Create transaction with deleted account and category
  - [ ] Click transaction card to expand
  - [ ] Verify strikethrough styling visible in expanded state
  - [ ] Verify accessibility attributes (aria-label, title) still present
  - [ ] Verify edit and delete buttons remain functional in expanded state
  - [ ] Collapse and re-expand transaction
  - [ ] Verify styling persists across expand/collapse cycles

---

## Phase 6: Polish & Quality Assurance

### Goal
Ensure code quality, accessibility compliance, and cross-browser/device compatibility.

### Acceptance Criteria
- ✅ All code passes ESLint validation
- ✅ All code formatted with Prettier
- ✅ Strikethrough visible on desktop (1920x1080) and mobile (375x667)
- ✅ Sufficient contrast and readability with reduced opacity
- ✅ Screen reader correctly announces "Deleted: " prefix
- ✅ No regressions in existing transaction functionality

---

- [x] T014 Code quality validation (`frontend/src/components/transactions/TransactionCard.vue` and `frontend/src/views/Transactions.vue`)
  - [x] Run `npm run lint` from frontend directory
  - [x] Fix any ESLint violations
  - [x] Run `npm run prettier` to check formatting
  - [x] Run `npm run prettier:fix` if needed
  - [x] Verify no TypeScript strict mode errors
  - [x] All code changes follow project code style guidelines

- [ ] T015 Visual testing across screen sizes
  - [ ] Test on desktop browser (1920x1080)
    - [ ] Strikethrough clearly visible
    - [ ] Text is readable (opacity 0.6 adequate)
    - [ ] Hover tooltip works
    - [ ] No layout shifts or overflow
  - [ ] Test on tablet (768x1024)
    - [ ] Strikethrough visible and readable
    - [ ] Responsive layout maintains clarity
  - [ ] Test on mobile (375x667)
    - [ ] Strikethrough visible at small text size
    - [ ] No text wrapping issues
    - [ ] Touch interactions still work
  - [ ] Test light theme and dark theme (if supported)

- [ ] T016 Accessibility testing with screen reader
  - [ ] Use NVDA, JAWS, or browser accessibility inspector
  - [ ] Navigate to transaction with deleted account
  - [ ] Verify screen reader announces: "Deleted: [account name]"
  - [ ] Navigate to transaction with deleted category
  - [ ] Verify screen reader announces: "Deleted: [category name]"
  - [ ] Verify title/tooltip accessible via keyboard focus
  - [ ] Test with keyboard-only navigation
  - [ ] Verify tab order is logical
  - [ ] Verify no focus traps

---

## Implementation Strategy

### MVP Scope (Recommended for Phase 1)
**User Story 1 Only**: View transaction with deleted account

- Tasks: T001, T002, T003, T004, T005, T006, T007, T008
- Time: ~1 hour
- Delivers: Core feature working for account deletion
- Independent test: ✅ Fully testable without category changes

### Incremental Delivery
**After MVP**: Add User Story 2 (Category)
- Tasks: T009, T010
- Time: ~30 minutes
- Builds on: MVP foundation

**Then**: Add User Story 3 (Transaction Operations)
- Tasks: T011, T012, T013
- Time: ~30 minutes
- Ensures: All transaction operations work with deleted refs

**Finally**: Polish
- Tasks: T014, T015, T016
- Time: ~30 minutes
- Ensures: Code quality and accessibility

### Total Time Estimate
- MVP: 1 hour
- Full Feature: 2-3 hours (including all testing and polish)

---

## Testing Checklist Summary

### Manual Testing (Per Constitution - Primary Test Method)
- [ ] Create transaction with deleted account, verify strikethrough
- [ ] Create transaction with deleted category, verify strikethrough
- [ ] Test mixed scenario (one deleted, one active)
- [ ] Test both deleted (account and category)
- [ ] Verify edit operations work with deleted references
- [ ] Verify delete operations work with deleted references
- [ ] Verify styling persists in expanded/collapsed states
- [ ] Test hover tooltips (title attributes)
- [ ] Test accessibility with screen reader

### Visual Testing (Desktop, Tablet, Mobile)
- [ ] Desktop (1920x1080): Strikethrough visible, readable
- [ ] Tablet (768x1024): Responsive layout preserves clarity
- [ ] Mobile (375x667): Strikethrough visible on small screens
- [ ] Light/Dark themes: Sufficient contrast

### Code Quality
- [ ] ESLint passes
- [ ] Prettier formatting applied
- [ ] TypeScript strict mode validation passes
- [ ] No console errors or warnings

### Accessibility
- [ ] Screen reader announces "Deleted: " prefix
- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] No focus traps

---

## Success Criteria Summary

✅ **Feature Complete When**:
1. All tasks T001-T016 are marked complete
2. Manual testing passes (all test scenarios green)
3. Code quality checks pass (ESLint, Prettier, TypeScript)
4. Accessibility testing passes (screen reader verification)
5. No regressions in existing transaction functionality
6. All three user stories independently testable and working

✅ **MVP Success When**:
1. Tasks T001-T008 complete
2. Deleted accounts display with strikethrough
3. aria-label accessibility attributes work
4. Code passes quality checks
