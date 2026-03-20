## Why

When users create transactions via voice, the browser's speech-to-text engine collapses spoken prices — "two thirty four" becomes "234" — and the LLM agent has no signal that the input came from voice, so it creates a transaction for 234 EUR instead of 2.34 (or 23.4). Adding a voice input flag lets the agent apply appropriate skepticism to integer amounts when the source is voice.

## What Changes

- Add `isVoiceInput: Boolean` to the `CreateTransactionFromTextInput` GraphQL input type
- Pass the flag through the resolver into `CreateTransactionFromTextService.call()`
- When `isVoiceInput` is `true`, inject a voice-specific hint into the amount inference section of the agent system prompt explaining the STT collapse pattern and instructing the agent to use similar past transactions to determine the most realistic interpretation; if no similar history exists, the transcribed amount is used as-is
- Frontend: track whether the last submit was triggered by voice, and include `isVoiceInput: true` in the mutation input when it was

## Capabilities

### New Capabilities

_None_

### Modified Capabilities

- `transactions`: `CreateTransactionFromTextInput` gains an optional `isVoiceInput` field; agent prompt behaviour changes when voice input is detected

## Impact

- `backend/src/graphql/schema.graphql` — add `isVoiceInput: Boolean` to `CreateTransactionFromTextInput`
- `backend/src/graphql/resolvers/create-transaction-from-text-resolvers.ts` — pass flag to service
- `backend/src/services/create-transaction-from-text-service.ts` — accept flag, conditionally extend system prompt
- `frontend/src/components/AgenticInput.vue` — distinguish voice submits from text submits
- `frontend/src/composables/useCreateTransactionFromText.ts` — accept and forward `isVoiceInput`
- `frontend/src/graphql/mutations.ts` — include `isVoiceInput` in mutation variables
- Code generation must be re-run in both backend and frontend after schema change

## Constitution Compliance

- **Schema-Driven Development**: Change starts with `schema.graphql` modification; codegen runs in both packages before any implementation — compliant
- **Backend Layer Structure**: Flag flows Resolver → Service; no business logic added to resolver layer — compliant
- **GraphQL Layer**: `isVoiceInput` is user-facing intent, not an internal detail — compliant
- **Input Validation**: `isVoiceInput` is optional (`Boolean`, not `Boolean!`); no new service-layer validation needed — compliant
- **TypeScript Code Generation**: No `as any` or `!` assertions; generated types used throughout — compliant
