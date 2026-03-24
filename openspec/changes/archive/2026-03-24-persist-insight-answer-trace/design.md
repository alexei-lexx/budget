## Context

The Insight page currently persists only the question text to `localStorage` (key `"insight-input"`), managed directly in `Insight.vue`. The `useInsight` composable holds no localStorage awareness — it exposes reactive state from Apollo's lazy query (`insightAnswer`, `insightAgentTrace`) that is lost on navigation.

The result is that returning to the Insight page restores the question input but shows the empty state, discarding the previous answer and agent trace.

## Goals / Non-Goals

**Goals:**

- Persist the last answer and agent trace to `localStorage` after each successful query
- Restore answer and agent trace on page load so the user sees their last result immediately
- Consolidate all Insight localStorage logic into `useInsight`, removing it from `Insight.vue`

**Non-Goals:**

- Persisting failure states (error messages are transient feedback, not results)
- Cache invalidation or expiry (no TTL on stored answer)
- Persisting multiple past answers (only the last result is stored)

## Decisions

### All persistence in `useInsight`

Move question persistence out of `Insight.vue` and into `useInsight`. The composable becomes the single owner of Insight localStorage state.

**Alternatives considered:**

- _Keep question in view, add answer/trace to composable_ — splits the same concern across two files; the user explicitly rejected this approach
- _Introduce a separate `useInsightPersistence` composable_ — unnecessary indirection for a small amount of state; one file is simpler

### Single storage key for the full result

Store `{ question, answer, agentTrace }` under one key (`"insight-last-result"`) rather than separate keys per field.

**Rationale:** The three values are always written and read together. One key keeps reads and writes atomic and avoids partial-restore edge cases.

**Alternatives considered:**

- _Reuse existing `"insight-input"` key_ — would break existing stored data on deploy; a new key is safer and more descriptive

### Expose `displayedAnswer` and `displayedAgentTrace` from the composable

The composable exposes computed values that return the live Apollo result when available, falling back to the restored stored values. The view uses only these, with no awareness of stored vs. live state.

**Rationale:** Keeps the view simple; the composable owns the decision of what to display.

### Expose `restoredQuestion` from the composable

The composable reads the stored question from localStorage on init and exposes it as `restoredQuestion`. `Insight.vue` initialises its `question` ref from this value, replacing the current `loadStoredInput()` logic in the view.

**Rationale:** All localStorage reads happen in one place.

## Risks / Trade-offs

- **Stale answer visible after question edit**: The restored answer remains visible while the user edits the question in the input box. The user accepted this as tolerable (they know they haven't re-submitted).
- **Agent trace visible on page load**: The robot icon will be enabled on load if a trace is stored. This is intentional — users can review how the last answer was derived.
- **localStorage size**: Agent traces can contain many messages. Unlikely to hit the ~5 MB localStorage limit in practice, but no mitigation is in place.

## Migration Plan

1. Deploy frontend with the new composable. On first load after deploy, `"insight-last-result"` will not exist — page shows the empty state as before. The old `"insight-input"` key becomes orphaned (no code reads it after this change).
2. No rollback concern: the old key is simply unused; rolling back restores the old code which reads it again.

## Open Questions

_(none)_
