## 1. Refactor `useInsight` to own all persistence

- [x] 1.1 Define a `StoredInsightResult` interface `{ question: string; answer: string; agentTrace: AgentTraceMessage[] }` inside the composable
- [x] 1.2 Add `loadStoredResult` and `saveStoredResult` helpers reading/writing `localStorage` key `"insight-last-result"`
- [x] 1.3 On composable init, read stored result and initialise `restoredQuestion`, `storedAnswer`, and `storedAgentTrace` refs
- [x] 1.4 After a successful query (`insightAnswer` becomes non-null), save `{ question, answer, agentTrace }` to localStorage and update the stored refs
- [x] 1.5 Expose `restoredQuestion`, `displayedAnswer` (live answer ?? stored answer), and `displayedAgentTrace` (live trace when answer is live, stored trace otherwise)

## 2. Update `Insight.vue` to use composable-provided state

- [x] 2.1 Remove `StoredInput` interface, `loadStoredInput`, `saveInput`, and the `watch(question, ...)` persistence logic from `Insight.vue`
- [x] 2.2 Initialise the `question` ref from `restoredQuestion` instead of `loadStoredInput()`
- [x] 2.3 Replace `insightAnswer` with `displayedAnswer` and `insightAgentTrace` with `displayedAgentTrace` in the template and empty-state condition

## 3. Validation

- [x] 3.1 Run `npm run typecheck` and `npm run format` in `frontend/` and fix any issues
- [x] 3.2 Manually verify: load page fresh — empty state shown; ask a question — answer appears; navigate away and back — question, answer, and trace are restored; ask a new question — stored result is replaced
