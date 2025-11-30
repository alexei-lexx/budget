---
description: "Task list for fixing refund category data loss in edit form"
---

# Tasks: Fix Refund Category Data Loss in Edit Form

**Input**: Design documents from `/specs/016-fix-refund-category-edit/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Manual testing only - no automated tests required per constitution (frontend tests optional)

**Organization**: This is a single bug fix affecting one component. Tasks organized sequentially for the single user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 - Preserve Category When Editing Refund (Priority: P1)

**Goal**: Fix bug where category field appears empty when editing a refund transaction, causing category data loss on save.

**Root Cause**: Two watchers in TransactionForm.vue compare `selectedCategory.type !== formData.value.type` without mapping REFUND → EXPENSE, causing category to be cleared incorrectly.

**Fix**: Apply type mapping (`REFUND` → `EXPENSE`) in both watchers to match the logic in `filteredCategories` computed property.

**Independent Test**: Create refund with category, edit it, verify category appears selected, save without changes, verify category preserved.

### Implementation for User Story 1

- [ ] T001 [US1] Read current TransactionForm.vue to understand bug context in frontend/src/components/transactions/TransactionForm.vue
- [ ] T002 [US1] Update account change watcher (line 132) to use type mapping: `selectedCategory.type !== (formData.value.type === "REFUND" ? "EXPENSE" : formData.value.type)` in frontend/src/components/transactions/TransactionForm.vue
- [ ] T003 [US1] Update type change watcher (line 145) to use type mapping: `selectedCategory.type !== (formData.value.type === "REFUND" ? "EXPENSE" : formData.value.type)` in frontend/src/components/transactions/TransactionForm.vue
- [ ] T004 [US1] Run `npm run format` in frontend package to apply code formatting
- [ ] T005 [US1] Verify ESLint compliance (no errors) in frontend package

**Checkpoint**: Code fix complete, formatted, and ESLint-compliant

---

## Phase 2: Validation

**Purpose**: Manual testing to verify bug fix and ensure no regressions

- [ ] T006 [US1] Manual test: Create refund transaction with category assigned, verify it appears in transaction list
- [ ] T007 [US1] Manual test: Open edit form for refund with category, verify category field shows selected category (not empty)
- [ ] T008 [US1] Manual test: Edit refund description without changing category, save, verify category preserved
- [ ] T009 [US1] Manual test: Edit refund and explicitly change category to different value, save, verify new category assigned
- [ ] T010 [US1] Manual test: Edit refund and clear category field, save, verify category removed (if intentional removal supported)
- [ ] T011 Manual test: Edit EXPENSE transaction with category, verify no regression (category still works correctly)
- [ ] T012 Manual test: Edit INCOME transaction with category, verify no regression (category still works correctly)
- [ ] T013 Manual test: Change transaction type from EXPENSE to REFUND, verify category cleared (expected behavior since REFUND uses EXPENSE categories)

**Checkpoint**: All acceptance scenarios pass, no regressions in other transaction types

---

## Dependencies & Execution Order

### Task Dependencies

- **T001**: No dependencies - can start immediately
- **T002-T003**: Depend on T001 (understanding current code), can run in parallel after T001
- **T004**: Depends on T002 and T003 (code changes must be complete)
- **T005**: Depends on T004 (formatting must complete first)
- **T006-T010**: Depend on T005 (code must be complete and compliant), can run in parallel
- **T011-T013**: Depend on T006-T010 (core tests must pass first), can run in parallel

### Parallel Opportunities

```bash
# After T001, fix both watchers in parallel:
Task T002: "Update account change watcher (line 132)"
Task T003: "Update type change watcher (line 145)"

# After T005, run core acceptance tests in parallel:
Task T006: "Create refund with category"
Task T007: "Verify category shows in edit form"
Task T008: "Edit without changing category"
Task T009: "Edit and change category"
Task T010: "Edit and clear category"

# Regression tests in parallel:
Task T011: "Test EXPENSE transaction"
Task T012: "Test INCOME transaction"
Task T013: "Test type change EXPENSE→REFUND"
```

---

## Implementation Strategy

### Single Story Fix

1. Complete Phase 1: Implementation (T001-T005)
2. Complete Phase 2: Validation (T006-T013)
3. **STOP and VALIDATE**: Verify all acceptance scenarios from spec.md
4. Ready for commit/PR

### Estimated Effort

- **Implementation**: 15 minutes (2 line changes + formatting)
- **Testing**: 15 minutes (manual verification of 8 test scenarios)
- **Total**: < 30 minutes

---

## Notes

- This is a minimal bug fix affecting only frontend/src/components/transactions/TransactionForm.vue
- No backend changes, no GraphQL schema changes, no database changes
- No automated tests required per constitution (frontend tests optional)
- Manual testing covers all acceptance scenarios from spec.md
- Fix replicates existing pattern from `filteredCategories` computed property (lines 47-51)
- Two watchers require identical fix (account change watcher + type change watcher)
