## 1. TextboxButtonInput — Abort Button

- [x] 1.1 (use `testing` skill) Write tests for `TextboxButtonInput`: stop button renders when `loading` is true; send button renders when `loading` is false; clicking stop button emits `abort`
- [x] 1.2 Add `abort` emit to `TextboxButtonInput` and render stop button (`mdi-stop-circle`, `color="error"`) in place of send button when `loading` is true

## 2. AgenticInput — Abort Passthrough

- [x] 2.1 (use `testing` skill) Write tests for `AgenticInput`: `abort` emit is forwarded when stop is triggered in the child
- [x] 2.2 Add `abort` emit to `AgenticInput` and wire it through from `TextboxButtonInput`

## 3. useAssistant — Abort Support

- [x] 3.1 (use `testing` skill) Write tests for `useAssistant`: calling `abortAskAssistant` while a request is in flight cancels the request; loading resets to false; stored result is not cleared; no error is set
- [x] 3.2 Add `AbortController` per request in `useAssistant`; pass `signal` via `context.fetchOptions`; catch `AbortError` silently; expose `abortAskAssistant`

## 4. useCreateTransactionFromText — Abort Support

- [x] 4.1 (use `testing` skill) Write tests for `useCreateTransactionFromText`: calling `abort` while a request is in flight cancels the request; loading resets to false; no error snackbar is shown; `agentTrace` is not updated
- [x] 4.2 Add `AbortController` per request in `useCreateTransactionFromText`; pass `signal` via `context.fetchOptions`; catch `AbortError` silently; expose `abort`

## 5. Wire-Up — Views

- [x] 5.1 Wire `abortAskAssistant` from `useAssistant` into the `AgenticInput` `@abort` handler in `Assistant.vue`
- [x] 5.2 Wire `abort` from `useCreateTransactionFromText` into the `AgenticInput` `@abort` handler in `Transactions.vue`

## Constitution Compliance

- **TypeScript strict mode**: All new props, emits, and composable return values are fully typed.
- **Vue 3 / Vuetify patterns**: `AbortController` in a `ref` is idiomatic Vue 3; `v-btn` with `mdi-stop-circle` follows Vuetify conventions.
- **TDD**: Each implementation task is preceded by a test-writing task.
- **Minimal surface**: No new files, no new dependencies; six existing files modified.
- **Surgical changes**: No unrelated refactoring; each changed line traces to a spec requirement.
