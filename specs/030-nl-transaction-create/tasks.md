---

description: "Task list for Natural Language Transaction Creation"
---

# Tasks: Natural Language Transaction Creation

**Input**: Design documents from `/specs/030-nl-transaction-create/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅
**Tests**: Unit tests included (co-located Jest tests per plan.md)
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Schema-Driven Development)

**Purpose**: Add GraphQL schema additions and regenerate TypeScript types before any implementation. Required by the constitution's Schema-Driven Development rule — codegen must precede implementation.

- [X] T001 Add `CreateTransactionFromTextInput` input type and `createTransactionFromText` mutation to `backend/src/schema.graphql` per `specs/030-nl-transaction-create/contracts/schema-additions.graphql`
- [X] T002 Run backend TypeScript codegen to generate resolver and input types in `backend/` (`npm run codegen`)
- [X] T003 [P] Run frontend schema sync and codegen to generate typed mutation hooks in `frontend/` (`npm run codegen:sync-schema && npm run codegen`)

**Checkpoint**: Schema types are generated — backend and frontend TypeScript types reflect the new mutation

---

## Phase 2: Foundational (Backend Core — Blocks All User Stories)

**Purpose**: Implement the backend service, resolver, and context registration that all four user stories share. No user story phase can be tested until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement `CreateTransactionFromTextService` with `call(userId, text)` method, four agent tools (`getAccounts`, `getCategories`, `getTransactions`, `createTransaction`), system prompt, agent call, `transaction.id` parse, and `getTransactionById` fetch in `backend/src/services/create-transaction-from-text-service.ts`
- [X] T005 [P] Create `createTransactionFromTextResolvers` module with `Mutation.createTransactionFromText` resolver (authenticates via `getAuthenticatedUser`, delegates to service) in `backend/src/resolvers/create-transaction-from-text-resolvers.ts`
- [X] T006 Register `createTransactionFromTextService` in `GraphQLContext` interface and add lazy-init block in `createContext()` (mirrors `insightService` pattern) in `backend/src/server.ts`
- [X] T007 Spread `createTransactionFromTextResolvers.Mutation` into the `Mutation` resolver map in `backend/src/resolvers/index.ts`

**Checkpoint**: Backend is fully wired — `createTransactionFromText` mutation is callable via GraphQL

---

## Phase 3: User Story 1 — Create Expense from Short Text (Priority: P1) 🎯 MVP

**Goal**: A user types a short expense phrase (e.g. `spent 45 euro at rewe yesterday`), the AI agent infers all fields, and the created transaction appears at the top of the list. Loading state (disabled input + submit + spinner) is shown while the mutation is in flight.

**Independent Test**: Type `spent 45 euro at rewe yesterday` and verify: transaction type is `EXPENSE`, amount is `45`, currency matches a EUR account, category is closest match to "groceries", date is yesterday, description is `rewe`; input clears on success. Also verify `20` submits as an expense with today's date and most-used account.

- [X] T008 [US1] Write unit tests for the expense creation happy path (amount extracted, date resolved, category matched, account selected, transaction returned) in `backend/src/services/create-transaction-from-text-service.test.ts`
- [X] T009 [P] [US1] Add `CREATE_TRANSACTION_FROM_TEXT` mutation document (with full `Transaction` fields: id, type, amount, currency, date, description, account, category) to `frontend/src/graphql/mutations.ts`
- [X] T010 [US1] Re-run frontend codegen to generate typed `useCreateTransactionFromTextMutation` hook in `frontend/` after T009 (`npm run codegen`)
- [X] T011 [US1] Create `useCreateTransactionFromText` composable (reactive `text` ref, `loading`/`error` from Apollo mutation, `submit()` that invokes the mutation, clears `text` on success, calls `showErrorSnackbar` and preserves `text` on error) in `frontend/src/composables/useCreateTransactionFromText.ts`
- [X] T012 [US1] Add NL input section above the transaction list in `frontend/src/views/Transactions.vue`: `v-text-field` bound to `text`, disabled while loading, submit on Enter; `v-btn` with `:loading` and `:disabled="!text.trim() || loading"`, calls `submit()`; on success prepend created transaction to the list

**Checkpoint**: User Story 1 is fully functional — expense creation end-to-end works, loading state is visible, transaction appears at top of list

---

## Phase 4: User Story 2 — Create Income from Natural Language (Priority: P2)

**Goal**: A user types an income phrase (e.g. `received salary 4500 PLN`), and the system correctly classifies the transaction as `INCOME` with category `salary` and a PLN-currency account.

**Independent Test**: Type `received salary 4500 PLN` and verify transaction type is `INCOME`, amount is `4500`, a PLN account is selected, and category matches salary. Also verify `earned` and `earn` keywords produce type `INCOME`.

- [X] T013 [P] [US2] Add income scenario unit tests (salary/earn/earned/received keyword → type `INCOME`, amount and account resolved correctly, default-to-expense when no type indicator) to `backend/src/services/create-transaction-from-text-service.test.ts`

**Checkpoint**: User Story 2 verified — income classification and account resolution are correct

---

## Phase 5: User Story 3 — Create Refund from Natural Language (Priority: P3)

**Goal**: A user types a refund phrase (e.g. `got a refund from zalando 29.99`), and the system creates a `REFUND` transaction with the account resolved from cross-type transaction history for the inferred category.

**Independent Test**: Type `got a refund from zalando 29.99` and verify transaction type is `REFUND`, amount is `29.99`, category is closest match to "shopping", and account is the most-used for shopping across all transaction types.

- [X] T014 [P] [US3] Add refund scenario unit tests (refund keyword → type `REFUND`, amount resolved, account selected using cross-type category history) to `backend/src/services/create-transaction-from-text-service.test.ts`

**Checkpoint**: User Story 3 verified — refund classification and cross-type account resolution are correct

---

## Phase 6: User Story 4 — Error When Required Fields Cannot Be Resolved (Priority: P4)

**Goal**: When the user submits input from which the system cannot extract a required field (amount, or no accounts available), a clear error message is shown and the input text is preserved unchanged.

**Independent Test**: Submit `bought something` (no amount) and verify an error is displayed via snackbar and the input text is unchanged. Submit from an account-free state and verify an appropriate error. Verify whitespace-only input keeps the submit button disabled.

- [X] T015 [US4] Add error path unit tests (agent skips `createTransaction` call → plain-text answer → `BusinessError` thrown; no accounts available; multiple-transaction rejection) to `backend/src/services/create-transaction-from-text-service.test.ts`
- [X] T016 [P] [US4] Verify `useCreateTransactionFromText` composable error branch: `showErrorSnackbar` is called with the error message and `text` is NOT cleared on mutation error in `frontend/src/composables/useCreateTransactionFromText.ts`

**Checkpoint**: User Story 4 verified — all error paths display user-facing messages and preserve input

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Code quality validation and final end-to-end verification per quickstart.md

- [X] T017 [P] Run full backend test suite, typecheck, and lint in `backend/` (`npm test && npm run typecheck && npm run format`)
- [X] T018 [P] Run frontend typecheck and lint in `frontend/` (`npm run typecheck && npm run format`)
- [ ] T019 Manually validate all quickstart.md test scenarios end-to-end against the running dev server

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (generated types required) — **BLOCKS all user story phases**
- **User Stories (Phases 3–6)**: All depend on Phase 2 completion
  - Phases 3–6 can proceed sequentially in priority order (P1 → P2 → P3 → P4)
  - Or in parallel if staffed (each phase touches different test blocks and different frontend files)
- **Polish (Phase 7)**: Depends on all desired user story phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependencies on US2/US3/US4
- **User Story 2 (P2)**: Can start after Phase 2 — tests extend the file written in US1 (T008) but do not block on it; safe to run in parallel with US1 tests if filing separately
- **User Story 3 (P3)**: Can start after Phase 2 — same as US2
- **User Story 4 (P4)**: Can start after Phase 2 — error behavior is built into the service (T004) and composable (T011); Phase 6 only adds test coverage

### Within Each Phase

- T004 and T005 are independent (different files) — run in parallel
- T006 depends on T004 (service class must exist for type-safe context registration)
- T007 depends on T005 (resolver module must exist for import)
- T008 and T009 are independent — run in parallel
- T010 depends on T009 (codegen requires mutation document)
- T011 depends on T010 (composable references generated mutation type)
- T012 depends on T011 (view imports the composable)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch T004 and T005 together (different files):
Task: "Implement CreateTransactionFromTextService in backend/src/services/create-transaction-from-text-service.ts"
Task: "Create createTransactionFromTextResolvers in backend/src/resolvers/create-transaction-from-text-resolvers.ts"

# Then T006 and T007 (after T004/T005 complete):
Task: "Register service in backend/src/server.ts"
Task: "Register resolver in backend/src/resolvers/index.ts"
```

## Parallel Example: Phase 3 (User Story 1)

```bash
# Launch T008 and T009 together (different files):
Task: "Write expense unit tests in backend/src/services/create-transaction-from-text-service.test.ts"
Task: "Add CREATE_TRANSACTION_FROM_TEXT mutation document to frontend/src/graphql/mutations.ts"

# Then sequentially: T010 → T011 → T012
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schema + codegen)
2. Complete Phase 2: Foundational (backend service + resolver + registration)
3. Complete Phase 3: User Story 1 (frontend composable + UI + expense tests)
4. **STOP and VALIDATE**: Run `npm test -- create-transaction-from-text-service.test.ts` and manually test per quickstart.md
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + 2 → Backend mutation is live and callable
2. Phase 3 → Full end-to-end expense creation (MVP!)
3. Phase 4 → Income creation verified
4. Phase 5 → Refund creation verified
5. Phase 6 → Error paths verified
6. Phase 7 → Production-ready quality pass

### Parallel Team Strategy

With two developers:
- Developer A: T004 (service) → T006 (server.ts) → T008 (expense tests)
- Developer B: T005 (resolver) → T007 (resolver index) → T009+T010 (frontend codegen) → T011+T012 (composable + UI)

---

## Notes

- [P] tasks = different files with no incomplete-task dependencies
- [Story] label maps each task to a specific user story for traceability
- The backend service (T004) handles all transaction types (expense/income/refund/error) through the AI agent — user story phases primarily add test coverage per acceptance scenario
- System prompt for the agent must include all type indicators from FR-002 (salary, earn, earned, received → INCOME; refund → REFUND; all others default to EXPENSE) and the FR-005 account resolution algorithm
- `createTransaction` tool inside the agent must use Zod validation on its input before calling `TransactionService.createTransaction`
- TypeScript strict mode: no `!` non-null assertions or `as any` casts anywhere
- Commit after each phase checkpoint
- Run `npm run format` after each file is written (constitution: Code Quality Validation)
