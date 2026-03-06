# Tasks: Reusable Textbox-Button Input Component

**Input**: Design documents from `/specs/031-textbox-button-component/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Not required — frontend tests not required per project constitution; manual visual verification only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in all descriptions

## Path Conventions

- New component: `frontend/src/components/common/TextboxButtonInput.vue`
- Pages: `frontend/src/views/Insight.vue`, `frontend/src/views/Transactions.vue`

---

## Phase 1: Setup

**Purpose**: Confirm the implementation environment before creating new files

- [ ] T001 Confirm `frontend/src/components/common/` directory exists, verify `TextboxButtonInput.vue` does not already exist, and review one existing common component (e.g., `frontend/src/components/common/ActionButtons.vue`) to confirm naming and `<script setup>` conventions

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Create the TextboxButtonInput component scaffold — both page refactors in Phase 3 depend on this file existing

**CRITICAL**: No page refactor can begin until this phase is complete

- [ ] T002 Create `frontend/src/components/common/TextboxButtonInput.vue` — `<script setup lang="ts">` with `defineProps<{ modelValue: string; loading?: boolean; placeholder?: string; inputAriaLabel?: string; submitAriaLabel?: string }>()` and `defineEmits<{ 'update:modelValue': [value: string]; submit: [] }>()`, and empty `<template><div class="d-flex ga-2 align-end"></div></template>`

**Checkpoint**: Component file exists and compiles — page refactors can now begin in parallel

---

## Phase 3: User Story 1 — Submit Text Input via Button Click (Priority: P1) 🎯 MVP

**Goal**: Users on either page can type text and click the send icon button to trigger the page action, with an identical `v-footer app` layout on both pages.

**Independent Test**: On the Insight page, type a question and click the send icon — verify the query is submitted. On the Transactions page, type a description and click the send icon — verify the action is triggered. Verify an empty input disables the send button on both pages.

### Implementation for User Story 1

- [ ] T003 [US1] Implement textarea and send button in `frontend/src/components/common/TextboxButtonInput.vue` — inside the `d-flex` wrapper add: `<v-textarea :model-value="modelValue" :placeholder="placeholder" :disabled="loading" :aria-label="inputAriaLabel" variant="outlined" density="compact" hide-details class="flex-grow-1" @update:model-value="$emit('update:modelValue', $event)" />` followed by `<v-btn icon="mdi-send" color="primary" :loading="loading" :disabled="loading || !modelValue.trim()" :aria-label="submitAriaLabel" @click="$emit('submit')" />`
- [ ] T004 [P] [US1] Refactor `frontend/src/views/Insight.vue` — remove the `.input-area` div and restructure so a `<v-footer app elevation="4" class="pa-3 pa-sm-4">` is a sibling to the main `v-container`; import and use `TextboxButtonInput` inside the footer with `v-model="question" :loading="insightLoading" placeholder="Ask about your spending..." input-aria-label="Ask a question" submit-aria-label="Submit question" @submit="handleAskQuestion"`
- [ ] T005 [P] [US1] Refactor `frontend/src/views/Transactions.vue` — inside the existing `<v-footer app elevation="4" class="pa-3 pa-sm-4">`, replace the current `v-text-field` + `v-btn` elements with `<TextboxButtonInput v-model="createTransactionFromTextQuestion" :loading="createTransactionFromTextLoading" placeholder="e.g., morning coffee 4.5 euro" input-aria-label="Create transaction" submit-aria-label="Add transaction" @submit="handleCreateTransactionFromText" />`; add the import for `TextboxButtonInput`

**Checkpoint**: Both pages render `TextboxButtonInput` inside a `v-footer app` layout; send button click triggers the page action on both pages

---

## Phase 4: User Story 2 — Submit via Keyboard Shortcut (Priority: P2)

**Goal**: Users can press Enter to submit without touching the mouse.

**Independent Test**: On either page, type text and press Enter — verify the same action as clicking the send button is triggered. Verify Enter on an empty input does nothing.

### Implementation for User Story 2

- [ ] T006 [US2] Add `@keydown.enter.exact.prevent="$emit('submit')"` to the `<v-textarea>` element in `frontend/src/components/common/TextboxButtonInput.vue`

**Checkpoint**: Enter key submits on both pages, identical outcome to clicking the send button

---

## Phase 5: User Story 3 — Clear Input Content (Priority: P3)

**Goal**: A clear icon appears inside the textarea when it contains text and clears the input on click.

**Independent Test**: On either page, type text — verify the `mdi-close-circle` icon appears inside the textarea border. Click it — verify the input empties and the icon disappears.

### Implementation for User Story 3

- [ ] T007 [US3] Add `<template #append-inner>` slot to the `<v-textarea>` in `frontend/src/components/common/TextboxButtonInput.vue` containing `<v-icon v-if="modelValue.trim()" icon="mdi-close-circle" size="small" class="cursor-pointer" @click="$emit('update:modelValue', '')" />`

**Checkpoint**: Clear icon is visible when input has text; clicking it empties the input and hides the icon

---

## Phase 6: User Story 4 — Auto-Growing Textarea (Priority: P4)

**Goal**: The textarea grows from 1 row up to 4 rows as the user types, then scrolls internally beyond that limit.

**Independent Test**: On either page, type a single line — verify the textarea is at minimum height. Type enough to wrap to multiple lines — verify it grows. Type beyond 4 rows — verify it caps at 4 rows and scrolls internally.

### Implementation for User Story 4

- [ ] T008 [US4] Add `auto-grow`, `rows="1"`, and `max-rows="4"` attributes to the `<v-textarea>` element in `frontend/src/components/common/TextboxButtonInput.vue`

**Checkpoint**: Textarea grows from 1 to 4 rows and scrolls internally beyond 4 rows

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Insight page layout cleanup and final cross-page verification

- [ ] T009 [P] Remove now-unused CSS from `frontend/src/views/Insight.vue` — delete the `.insight-container` `height: calc(100vh - 64px)` rule and the `.input-area` CSS block; verify the answer content area still scrolls correctly under the new Vuetify layout system
- [ ] T010 Visual verification per `specs/031-textbox-button-component/quickstart.md` — on both pages confirm: (1) send button click submits, (2) Enter key submits, (3) empty input disables button, (4) clear icon appears and disappears correctly, (5) textarea auto-grows to 4 rows then scrolls, (6) `loading` prop shows spinner and disables input

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — blocks all page refactors
- **US1 (Phase 3)**: Depends on Phase 2 — T004 and T005 can run in parallel after T003 completes
- **US2 (Phase 4)**: Depends on Phase 3 — adds Enter key to the established component template
- **US3 (Phase 5)**: Depends on Phase 4 — adds clear icon to the established textarea element
- **US4 (Phase 6)**: Depends on Phase 5 — adds auto-grow attributes to the established textarea element
- **Polish (Phase 7)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Depends only on T002 (component scaffold) — no other story dependencies
- **US2 (P2)**: Depends on US1 complete — component template and textarea element must be established
- **US3 (P3)**: Depends on US2 complete — textarea element must be established for slot insertion
- **US4 (P4)**: Depends on US3 complete — textarea element must be finalized before adding grow attributes

### Parallel Opportunities

- **Within Phase 3**: T004 (Insight.vue) and T005 (Transactions.vue) can run in parallel — different files, no conflict
- **Within Phase 7**: T009 (CSS cleanup) and T010 (visual verification) are independent

---

## Parallel Example: User Story 1

```bash
# After T003 completes, launch both page refactors together:
Task: "T004 — Refactor Insight.vue with v-footer + TextboxButtonInput"
Task: "T005 — Refactor Transactions.vue with TextboxButtonInput"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (creates the component — blocks all page work)
3. Complete Phase 3: User Story 1 (implement core component + both page refactors)
4. **STOP and VALIDATE**: Test button-click submit on both pages
5. Demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → component scaffold ready
2. Add US1 → test button-click submit on both pages → **Demo (MVP)**
3. Add US2 → test Enter key submit → Demo
4. Add US3 → test clear icon → Demo
5. Add US4 → test auto-grow → Demo
6. Polish → final visual verification across all stories

---

## Notes

- [P] tasks involve different files with no incomplete dependencies
- [Story] label maps each task to its user story for traceability
- US2, US3, US4 each add one atomic attribute/slot to `TextboxButtonInput.vue` — keep changes minimal
- No new npm dependencies required
- No backend or schema changes required
- Component interface is fully specified in `specs/031-textbox-button-component/quickstart.md`
