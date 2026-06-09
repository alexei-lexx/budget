## Context

`AgenticInput.vue` is the shared component used on both the Transactions page and the Assistant page for natural-language input with voice support. When a voice transcript is received it immediately emits `submit(true)`. The submit button, however, is wired as `@submit="$emit('submit', false)"` — a hard-coded `false` that is never changed regardless of how the input was populated.

The `isVoiceInput` flag travels from the frontend submit event → GraphQL mutation argument → service layer → LangChain agent context, and is consumed only in `create-transaction-agent.ts` to inject the `VOICE_INPUT_SUBPROMPT` that guides amount disambiguation. On the Assistant page, the flag is propagated into the create-transaction subagent tool via `config.context`, so it reaches the same prompt.

## Goals / Non-Goals

**Goals:**

- Preserve the voice origin flag when text was set by voice and has not been manually edited since.
- Cover both Transactions and Assistant pages through the single shared component.

**Non-Goals:**

- No change to the backend, GraphQL schema, or any service.
- No change to `useVoiceInput.ts` — the composable is correct; only the consumer is wrong.
- Not persisting voice origin across page reloads or across separate voice sessions.

## Decisions

### Track `isVoiceSet` as reactive state in `AgenticInput.vue`

**Decision**: Add `const isVoiceSet = ref(false)` to `AgenticInput`. Set it `true` inside `onTranscript`. Clear it when `TextboxButtonInput` emits `update:modelValue` (user typed). Pass it — and then clear it — when the button submit event fires.

**Alternative considered**: Track the flag in each parent view (`Transactions.vue`, `Assistant.vue`). Rejected — duplicates logic in two places and the component already has all the information needed.

**Alternative considered**: Persist the flag through a `v-model` prop from the parent. Rejected — the parents have no business reason to know about voice state; it is an `AgenticInput` concern.

**Why clear on user edit**: Any manual keystroke after a voice transcript changes the text; the voice inference rules are designed for unmodified STT output. Clearing on edit is the correct boundary.

**Why clear after submit**: Prevents stale `true` from surviving into the next input cycle if the parent does not reset the `modelValue` (e.g. after a failed submission).

### No change to the `update:modelValue` event emitted to the parent

The parent continues to receive the pass-through unchanged. Only the `submit` payload changes from always-`false` to `isVoiceSet.value`.

## Risks / Trade-offs

- **Risk**: A future refactor moves the submit button out of `AgenticInput` and the `isVoiceSet` ref is no longer accessible. → Mitigation: The flag is an internal implementation detail; the emitted API (`submit: [isVoiceInput: boolean]`) stays identical, so consumers are unaffected.

- **Trade-off**: Clearing `isVoiceSet` on any manual edit means a user who speaks, then corrects a single typo, loses the voice flag. This matches the agreed requirement (any edit = not voice) and is explicit user intent.

## Constitution Compliance

- **Minimum code**: One `ref`, one guard on the pass-through, one change to the submit emit. No new abstractions, no new files.
- **Surgical changes**: Only `AgenticInput.vue` is modified; no adjacent code, comments, or formatting is touched.
- **No backwards-compatibility hacks**: The external emit signature (`submit: [isVoiceInput: boolean]`) is unchanged; parents require no update.
