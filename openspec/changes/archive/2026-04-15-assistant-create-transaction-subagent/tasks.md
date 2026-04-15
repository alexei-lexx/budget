## 1. GraphQL Schema

- [x] 1.1 Add optional `isVoiceInput: Boolean` field to `AssistantInput` in `backend/src/graphql/schema.graphql`
- [x] 1.2 Run `npm run codegen` in `backend/` to regenerate TypeScript types
- [x] 1.3 Run `npm run codegen:sync-schema` and `npm run codegen` in `frontend/` to sync and regenerate types

## 2. Create-Transaction Subagent Tool

- [x] 2.1 Write co-located unit tests `backend/src/langchain/tools/create-transaction-subagent.test.ts` that mock `createTransactionAgent` and verify: tool forwards the user's description as the subagent user message, propagates `userId`/`today`/`isVoiceInput` from agent context into the subagent invocation, returns the subagent's last message text as the tool output, and returns a safe fallback when the subagent yields no text
- [x] 2.2 Implement `backend/src/langchain/tools/create-transaction-subagent.ts` as a thin wrapper over `createTransactionAgent` exposed as the `create_transaction_subagent` tool, modeled on `createJokeTool` — its `description` instructs the outer LLM to use it only when the user describes a specific transaction event and not for finance questions
- [x] 2.3 Run `npm test -- src/langchain/tools/create-transaction-subagent.test.ts` and confirm the suite passes

## 3. Assistant Agent Wiring

- [x] 3.1 Update the assistant agent factory in `backend/src/langchain/agents/assistant-agent.ts` to accept the dependencies needed to build `createTransactionAgent` (or accept the subagent factory directly) and register the new tool in `subagentTools`
- [x] 3.2 Extend the assistant system prompt with a short clarification-on-ambiguity rule — no routing logic duplicated from the tool description
- [x] 3.3 Update `backend/src/dependencies.ts` to inject the additional dependencies into `createAssistantAgent`
- [x] 3.4 Update existing assistant-agent tests/fixtures as needed to accommodate the new dependencies

## 4. Service Layer Threading for `isVoiceInput`

- [x] 4.1 Update `backend/src/services/assistant-service.ts` tests first: verify `AssistantService.ask` accepts an optional `isVoiceInput` argument and passes it into the assistant agent context
- [x] 4.2 Extend `AssistantService` implementation to accept and forward `isVoiceInput` in the agent context
- [x] 4.3 Update `backend/src/services/assistant-chat-service.ts` tests first: verify `AssistantChatService.ask` accepts an optional `isVoiceInput` argument and forwards it to `AssistantService`
- [x] 4.4 Extend `AssistantChatServiceImpl` implementation to accept and forward `isVoiceInput`
- [x] 4.5 Confirm chat-history persistence still stores only `USER` question and `ASSISTANT` final response — no new roles, no new columns

## 5. GraphQL Resolver

- [x] 5.1 Update the `askAssistant` resolver to read the optional `isVoiceInput` from input and forward it to `AssistantChatService.ask`
- [x] 5.2 Add or update the resolver test (if one exists) to confirm the flag is threaded; otherwise rely on service-layer coverage

## 6. Telegram Surface Verification

- [x] 6.1 Confirm `ProcessTelegramMessageService` continues to call `AssistantChatService` with `isVoiceInput` omitted (or `false`); no Telegram-side code change needed because the new subagent tool is reachable through the shared assistant agent. Verify existing Telegram-path tests still pass — no new tests required.

## 7. Assistant Page Frontend

- [x] 7.1 Pass the existing voice-input flag from the Assistant page mutation call into the new `isVoiceInput` input field
- [x] 7.2 Manually verify in the running dev stack that typing a transaction description logs a transaction and that voice-dictated amounts are disambiguated

## 8. Validation Pipeline

- [x] 8.1 Run `npm test` in `backend/` — full suite green
- [x] 8.2 Run `npm run typecheck` in `backend/` and `frontend/`
- [x] 8.3 Run `npm run format` in `backend/` and `frontend/`
- [x] 8.4 Run `npx prettier --write openspec/` after any artifact edits

## Constitution Compliance

- **Backend Layer Structure**: new subagent tool lives in `backend/src/langchain/tools/`; writes still flow through `createTransactionAgent` → `TransactionService`. No resolver or tool touches repositories directly.
- **Schema-Driven Development**: schema is edited first (Task 1); backend and frontend regenerate types before consuming the new `isVoiceInput` field.
- **Backend GraphQL Layer**: `isVoiceInput` is optional and additive; the resolver stays thin and delegates to the service layer.
- **Authentication & Authorization**: `userId` continues to flow through agent context only; the new tool never accepts user identity from input.
- **Input Validation**: the new tool does not validate transaction fields; validation is delegated to `createTransactionAgent` and `TransactionService.createTransaction`.
- **Result Pattern**: `TransactionService.createTransaction` still returns a Result internally. The tool-boundary contract is a string by design — this does not violate the pattern because the Result is consumed inside the agent, not across service boundaries.
- **Test Strategy**: all new and modified logic is covered by co-located unit tests with mocked collaborators (Tasks 2.1, 4.1, 4.3, 6.2). No test moves to a separate test directory.
- **TypeScript Code Generation**: factory functions with ≥3 arguments use destructured object arguments; names remain descriptive and unabbreviated.
- **Code Quality Validation**: Task 8 runs the mandatory test → typecheck → format pipeline for both packages before the change is considered complete.
