## Why

When a user dictates a price like "twelve fifty-four", speech-to-text may transcribe it as two separate integers — "12 54" — causing the AI agent to reject the input with a multiple-amounts error instead of creating the transaction with amount 12.54.

## What Changes

- Add a new voice recognition rule to the AI agent's system prompt: when two adjacent integers N M are the only numbers in a voice-originated input, treat them as a decimal price where M is the fractional part, padded with a leading zero only when single-digit (e.g. "12 54" → 12.54, "12 5" → 12.05).
- Add integration test coverage for the new pattern.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `transactions`: Add **Voice Space-Separated Amount Recognition** — a new voice input rule covering the case where speech-to-text emits two integers instead of a decimal.
- `assistant`: Add **Voice Space-Separated Amount Recognition** — the same rule applies when logging a transaction through the Assistant, since it shares the transaction-creation agent.

## Impact

- `backend/src/langchain/agents/create-transaction-agent.ts` — `VOICE_INPUT_SUBPROMPT` constant updated.
- `backend/src/langchain/agents/create-transaction-agent.int.test.ts` — new test group added.
- No API, schema, or frontend changes.

## Constitution Compliance

- **Backend-only change**: No schema or frontend changes; consistent with the independent package principle.
- **Prompt is the correct layer**: All other voice artefact handling lives in `VOICE_INPUT_SUBPROMPT`; this change follows the same pattern.
- **Integration tests required**: Added alongside the prompt change, consistent with the constitution's test strategy for agent behaviour.
