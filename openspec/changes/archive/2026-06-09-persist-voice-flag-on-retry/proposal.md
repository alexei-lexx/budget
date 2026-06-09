## Why

When a voice-originated submission fails (e.g. network error), pressing the submit button again always sends `isVoiceInput: false`, silently dropping the voice origin flag and bypassing the amount-inference rules that prevent misinterpretation of transcribed numbers like "234" (spoken "two thirty four") or "11:23" (spoken price). The user submitted via voice; the system should honour that when they submit again.

## What Changes

- `AgenticInput.vue` gains a `isVoiceSet` reactive flag that is set `true` when a voice transcript populates the input and cleared when the user manually edits the text or after any submission.
- The submit button, when clicked, forwards `isVoiceSet` instead of the hard-coded `false` it currently emits.
- No backend, GraphQL schema, or service changes — the `isVoiceInput` field already exists end-to-end.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `transactions`: Add requirement — when the text was set by voice and not subsequently edited, pressing submit again SHALL carry the voice origin flag.
- `assistant`: Same requirement for the Assistant page (which also routes transactions through the create-transaction agent via the subagent tool).

## Impact

- **Frontend**: `AgenticInput.vue` only — one reactive ref, one guard on the text-change pass-through, one change to the submit emit.
- **Backend / API**: None — `isVoiceInput` is already plumbed through GraphQL, services, and the agent context.
- **Both pages**: Transactions page and Assistant page share `AgenticInput`, so both are fixed by the single component change.

## Constitution Compliance

- **Minimum code that solves the problem** — change confined to one component, no new abstractions.
- **Surgical changes** — only the submit emit and the `update:modelValue` pass-through are touched; nothing else in `AgenticInput` changes.
- **No speculative features** — flag reset on edit and on submit covers exactly the described scenarios, nothing more.
