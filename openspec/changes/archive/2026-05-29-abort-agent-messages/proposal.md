## Why

When the Assistant or Transactions page sends a message to an AI agent, there is no way to cancel it — the user must wait for the server to respond, which can take many seconds.
Adding an abort control lets users recover immediately from accidental submissions or slow responses.

## What Changes

- The `AgenticInput` component gains an `abort` emit and passes it through to its parent.
- The `TextboxButtonInput` component swaps the send button for a stop button while a request is in flight.
- `useAssistant` and `useCreateTransactionFromText` expose an `abort` function backed by `AbortController`, which cancels the in-flight HTTP fetch.
- `Assistant.vue` and `Transactions.vue` wire the composable abort function into `AgenticInput`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant`: The assistant input now supports aborting an in-flight request.
- `transactions`: The create-transaction-from-text input now supports aborting an in-flight request.

## Impact

- **Frontend components**: `TextboxButtonInput.vue`, `AgenticInput.vue`
- **Frontend composables**: `useAssistant.ts`, `useCreateTransactionFromText.ts`
- **Frontend views**: `Assistant.vue`, `Transactions.vue`
- **No backend changes required** — aborting cancels the client-side fetch; the backend agent runs to completion but the result is discarded.
- **No GraphQL schema changes** — mutations are unchanged.

## Constitution Compliance

- **TypeScript strict mode**: All new code will be fully typed.
- **Vue 3 / Vuetify**: Changes are within the existing component/composable patterns.
- **Minimal surface**: No new components, no new dependencies; changes are confined to existing files.
- **No backend changes**: Fully frontend-scoped, consistent with the frontend's responsibility for UI interactions.
