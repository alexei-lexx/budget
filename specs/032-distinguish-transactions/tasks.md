# Tasks: Distinguish Refund and Income Transactions

**Input**: Design documents from `/specs/032-distinguish-transactions/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Web app: `frontend/src/` (frontend only — no backend changes for this feature)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Orientation — no new packages, migrations, or infrastructure required

No project initialization needed. This is a pure frontend presentation-layer change. The repository and all dependencies are already configured.

- [X] T001 Read `frontend/src/utils/transaction.ts` to understand existing `isPositiveTransactionType()` before adding the new utility

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utility function that MUST be complete before either user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add exported function `getTransactionTypeColor(type: TransactionType): string` to `frontend/src/utils/transaction.ts` — switch on all five TransactionType values: INCOME→"success", REFUND→"info", TRANSFER_IN→"warning", TRANSFER_OUT→"warning", EXPENSE→"error"

**Checkpoint**: `getTransactionTypeColor` is exported from `transaction.ts` — both user stories can now proceed in parallel

---

## Phase 3: User Story 1 - Visually Distinguish Transactions at a Glance (Priority: P1) MVP

**Goal**: Transaction list displays distinct colors per type — REFUND appears blue (not green like INCOME); TRANSFER_IN/OUT appear orange (not green/red)

**Independent Test**: View the transaction list with INCOME and REFUND transactions side-by-side; the INCOME amount shows green, the REFUND amount shows blue, TRANSFER amounts show orange

### Implementation for User Story 1

- [X] T003 [US1] Replace the inline `amountColor` computed property in `frontend/src/components/transactions/TransactionCard.vue` with `computed(() => getTransactionTypeColor(props.transaction.type))`, importing `getTransactionTypeColor` from `@/utils/transaction`

**Checkpoint**: User Story 1 complete — transaction list displays distinct Vuetify colors for all five transaction types

---

## Phase 4: User Story 2 - Maintain Visual Consistency Across Transaction Types (Priority: P2)

**Goal**: Transaction form type-toggle icons use the same color mapping as the transaction card, making the UI cohesive across both surfaces

**Independent Test**: Open the "Create Transaction" form and verify type-toggle icon colors match the card: EXPENSE=red (error), INCOME=green (success), REFUND=blue (info)

### Implementation for User Story 2

- [X] T004 [US2] Replace hardcoded `color="..."` on the three type-toggle icons in `frontend/src/components/transactions/TransactionForm.vue` with dynamic bindings — `:color="getTransactionTypeColor('EXPENSE')"`, `:color="getTransactionTypeColor('INCOME')"`, `:color="getTransactionTypeColor('REFUND')"` — importing `getTransactionTypeColor` from `@/utils/transaction`

**Checkpoint**: User Stories 1 AND 2 complete — TransactionCard and TransactionForm use identical color mapping via shared utility

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Full validation across both user stories

- [X] T005 [P] Run the complete manual testing checklist from `specs/032-distinguish-transactions/quickstart.md` — verify all 7 scenarios pass: INCOME=green in list, REFUND=blue in list, EXPENSE=red in list, TRANSFER=orange in list, EXPENSE=red in form, INCOME=green in form, REFUND=blue in form, and mobile viewport (375px) check

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS both user stories
- **User Story 1 (Phase 3)**: Depends on T002
- **User Story 2 (Phase 4)**: Depends on T002 (independent of US1 — different file)
- **Polish (Phase 5)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after T002 — no dependency on US2
- **User Story 2 (P2)**: Can start after T002 — no dependency on US1 (different file: TransactionForm.vue vs TransactionCard.vue)

### Within Each User Story

- Each story is a single-task modification to an existing component
- Both stories consume the same foundational utility (T002)
- No new files created — all changes modify existing files

### Parallel Opportunities

- T003 [US1] and T004 [US2] touch different files and can run in parallel after T002 completes

---

## Parallel Example: User Stories 1 & 2

```bash
# After T002 completes, US1 and US2 can run simultaneously:
Task T003: Replace amountColor computed in frontend/src/components/transactions/TransactionCard.vue
Task T004: Replace icon colors in frontend/src/components/transactions/TransactionForm.vue
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002) — adds `getTransactionTypeColor()`
3. Complete Phase 3: User Story 1 (T003) — updates TransactionCard.vue
4. **STOP and VALIDATE**: View transaction list, verify REFUND=blue and INCOME=green
5. Deploy/demo if ready

### Incremental Delivery

1. T001 → T002 → Foundation ready
2. T003 → Test transaction list → Deploy/Demo (MVP)
3. T004 → Test form icons → Deploy/Demo
4. T005 → Full validation pass

### Parallel Team Strategy

After T002 completes:

- Developer A: T003 (TransactionCard.vue)
- Developer B: T004 (TransactionForm.vue)
- Both complete independently; no merge conflicts

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps each task to a specific user story for traceability
- No tests requested — manual testing via `quickstart.md` checklist only
- No backend changes, no codegen, no database migration required
- All changes are purely frontend and confined to three files
