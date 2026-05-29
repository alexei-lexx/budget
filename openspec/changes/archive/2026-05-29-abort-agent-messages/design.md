## Context

The app has two pages that send messages to AI agents:

- **Assistant page** (`Assistant.vue`) — uses `useAssistant` composable, which calls the `askAssistant` GraphQL mutation.
- **Transactions page** (`Transactions.vue`) — uses `useCreateTransactionFromText` composable, which calls the `createTransactionFromText` GraphQL mutation.

Both pages render an `AgenticInput` component, which wraps `TextboxButtonInput`. Currently, once a request is submitted, `loading` becomes `true`, the send button shows a spinner, and there is no way for the user to cancel. The user must wait for the server to respond.

Apollo Client mutations accept a `context.fetchOptions.signal` option, which passes an `AbortSignal` to the underlying `fetch` call. Aborting the controller cancels the HTTP request immediately.

## Goals / Non-Goals

**Goals:**

- Let users cancel an in-flight AI agent request on the Assistant and Transactions pages.
- Reset the UI to idle state immediately after abort.
- Cancel the actual HTTP fetch (not just hide the spinner).

**Non-Goals:**

- Stopping the backend agent mid-execution — the backend continues running; the result is discarded.
- Abort support for any other mutations or queries in the app.
- Debounce or timeout-based auto-abort.

## Decisions

### D1: AbortController per request, not per composable lifecycle

Each call to `askAssistant` or `submit` creates a fresh `AbortController`. The previous controller reference is stored in a `ref` and replaced on each call. Calling `abort()` cancels the most recent request.

**Alternative considered**: One controller per composable instance (shared across calls). Rejected because aborting mid-flight and immediately retrying would abort the retry too, since the same signal is reused.

### D2: Stop button replaces the send button when loading

In `TextboxButtonInput`, when `loading` is `true`, the send button becomes a stop button (`mdi-stop-circle`, `color="error"`). Clicking it emits `abort`. When idle, the send button is shown as usual.

**Alternative considered**: Show both send and stop buttons simultaneously. Rejected — too much visual noise; the send button is meaningless while loading anyway.

**Alternative considered**: Put the stop button inside `AgenticInput` near `AgentTraceTriggerButton`. Rejected — `TextboxButtonInput` already owns the button area and the `loading` prop; keeping abort there is more cohesive.

### D3: Abort propagates up via emit, not via prop

`TextboxButtonInput` emits `abort`. `AgenticInput` re-emits it. The parent page calls the composable's `abort()` function. This keeps each layer responsible only for its own concerns: the component signals intent, the composable acts on it.

**Alternative considered**: Pass the `AbortController` or `abort` function as a prop into `AgenticInput`. Rejected — couples the composable's internals to the component tree; emit-up is the Vue convention.

### D4: On abort, reset loading via caught error; do not touch stored results

When the `AbortController` fires, the `mutate()` promise rejects with an `AbortError`. The composable catches it, checks `error.name === 'AbortError'`, and silently resets without setting `askAssistantError`. Previously stored results (from a prior successful query) remain visible.

**Alternative considered**: Clear stored results on abort. Rejected — the user aborted this request; clearing the previous answer would be surprising and destructive.

## Risks / Trade-offs

- **Backend still runs**: The agent process on the server continues to completion after the client aborts. This wastes server compute for long-running agents. Acceptable trade-off — adding server-side cancellation would require subscription-based signaling and significant backend work, which is out of scope.
- **Race condition on rapid abort+resubmit**: If the user aborts and immediately submits again, two controllers exist briefly. The old one is aborted before being replaced; the new request proceeds normally. Low risk.
- **AbortError swallowed silently**: If `AbortError` is not distinguished from real errors, the user gets a misleading error message. The fix (check `error.name`) is simple and low-risk.

## Migration Plan

Frontend-only change. No schema migrations, no backend deploys, no feature flags. The change is additive — existing behavior is unchanged when the user does not click abort.

Deploy as a standard frontend release.

## Open Questions

None.

## Constitution Compliance

- **TypeScript strict mode**: All new props and emits will be fully typed; `AbortController` and `AbortSignal` are native browser/Node types, no extra imports needed.
- **Vue 3 composable pattern**: `AbortController` stored in a `ref` inside composables is idiomatic Vue 3.
- **Vuetify**: Stop button uses standard `v-btn` with `mdi-stop-circle` icon — no new dependencies.
- **Minimal surface**: Six files touched, no new files, no new dependencies.
