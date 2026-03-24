## Why

When a user navigates away from the Insight page and returns, the answer to their last question is lost — only the question text is restored. Persisting the answer and agent trace alongside the question restores the full last session state, so users can review their last result without re-submitting.

## What Changes

- `useInsight` composable takes over all localStorage persistence (question, answer, agent trace), consolidating what is currently split between the composable and the view
- Answer and agent trace are persisted to localStorage after each successful query and restored on page load
- `Insight.vue` reads the restored question from the composable instead of managing its own localStorage logic
- The empty state is suppressed when a restored answer is available on page load

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `insight`: Input Persistence requirement extended — answer and agent trace are now persisted and restored alongside the question

## Impact

- `frontend/src/composables/useInsight.ts` — add localStorage persistence for answer and agent trace; expose restored question; expose a single `displayedAnswer` and `displayedAgentTrace` that fall back to stored values
- `frontend/src/views/Insight.vue` — remove question persistence logic; consume restored question and displayed answer/trace from composable

## Constitution Compliance

- **Frontend Code Discipline**: No new components or custom CSS introduced. Changes are limited to composable and view logic.
- **TypeScript Code Generation**: Generated Apollo types used throughout; no schema changes required.
- **Test Strategy**: Frontend changes are tested manually per constitution. No backend changes introduced.
- **Vendor Independence**: `localStorage` is a standard browser API with no vendor lock-in.
