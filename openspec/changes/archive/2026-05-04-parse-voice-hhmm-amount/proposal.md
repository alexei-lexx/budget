Issue: [#439 voice input "eleven twenty three" transcribed as "11:23" time](https://github.com/alexei-lexx/budget/issues/439)

## Why

When the user dictates a decimal amount like "eleven twenty three", browser speech-to-text often emits a time-style string `11:23`. The transaction-creation agent treats the value as a time and fails with "no amount", and no transaction is created.

## What Changes

- Extend the voice-input branch of the Amount inference rules in the create-transaction agent's system prompt to recognize `HH:MM`-style colon patterns as decimal amounts.
- Introduce an exception: when surrounding wording explicitly marks the colon-string as a time (e.g., "at 12:34", "around 7:30"), the agent treats it as time, not as amount.
- The new behavior applies only when `isVoiceInput` is true; keyboard-typed input is unaffected.
- Add integration test cases to `create-transaction-agent.int.test.ts` covering the new scenarios (bare colon-amount, mixed text, time-context exclusion, locative `at`, and keyboard isolation).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `transactions`: extends the existing "Voice Input for Natural Language Transaction Creation" requirement with new scenarios for `HH:MM`-style colon-amount disambiguation.

## Impact

- **Code**: [backend/src/langchain/agents/create-transaction-agent.ts](../../../backend/src/langchain/agents/create-transaction-agent.ts) — extend the voice-input sub-block under the Amount section of `SYSTEM_PROMPT`.
- **Tests**: [backend/src/langchain/agents/create-transaction-agent.int.test.ts](../../../backend/src/langchain/agents/create-transaction-agent.int.test.ts) — new integration test cases.
- **APIs**: No GraphQL schema changes. No new dependencies.
- **Other channels**: Telegram-bot voice input is out of scope; it uses a different transcription path.

## Constitution Compliance

- **Backend Layer Structure**: Change is confined to the agent system prompt; no resolver, service, or repository boundaries are altered. Compliant.
- **Test Strategy**: New tests are integration tests co-located with the agent source file (`*.int.test.ts` next to `create-transaction-agent.ts`). Compliant.
- **Input Validation**: The `isVoiceInput` flag is already validated upstream in the create-transaction-from-text service; this change adds no new input boundary. Compliant.
- **Code Quality Validation**: Implementation will pass through targeted test runs, full backend test suite, typecheck, and format steps. Compliant.
- **TypeScript Code Generation**: No new TypeScript code paths; prompt string change only. Compliant.
- Schema-driven development, GraphQL layer, pagination, soft-deletion, migrations, auth, finder naming, method ordering, frontend rules: not applicable to this change.
