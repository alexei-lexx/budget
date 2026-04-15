## Why

The assistant today answers finance questions only. Transaction creation from natural language lives on the transactions page and is not available through the conversational interface — including the Telegram bot, which is the primary mobile entry point. Users who want to log a transaction via chat must switch contexts to the transactions page. Integrating the existing create-transaction agent into the assistant removes that friction while reusing the agent already proven on the transactions page.

## What Changes

- Expose the create-transaction agent to the assistant agent as a subagent tool, following the same pattern as the existing joke subagent tool.
- Teach the assistant agent to distinguish between finance questions (read tools) and specific transaction events (subagent tool), and to ask for clarification when the user's intent is genuinely ambiguous.
- Extend the `askAssistant` GraphQL mutation input with an optional `isVoiceInput` flag, and thread it through `AssistantChatService` → `AssistantService` → assistant agent context so voice-originated amounts are disambiguated correctly when the user logs a transaction through the assistant page.
- Preserve the existing `CreateTransactionFromTextService` entry point used by the transactions page — it continues to invoke the create-transaction agent directly to obtain the structured `Transaction` needed for UI refresh.
- Preserve existing chat history semantics: store the user's question and the assistant's final response verbatim, unchanged.

## Capabilities

### New Capabilities

_None. This change extends existing capabilities._

### Modified Capabilities

- `assistant`: add a requirement that the assistant can create transactions from natural-language descriptions in addition to answering questions, including clarification-on-ambiguity behavior and voice-input propagation.
- `telegram-bot-integration`: add a requirement that Telegram users can log transactions by describing them in chat, reflecting the new user-visible capability on the Telegram surface.

## Impact

**Backend code**

- `backend/src/langchain/tools/` — new tool wrapping the create-transaction agent (mirrors `joke.ts`).
- `backend/src/langchain/agents/assistant-agent.ts` — register the new subagent tool; extend the system prompt to cover event-vs-query routing and clarification behavior.
- `backend/src/langchain/agents/agent-context.ts` — context already carries `isVoiceInput`; confirm it propagates to the assistant agent.
- `backend/src/services/assistant-service.ts` and `assistant-chat-service.ts` — accept and forward `isVoiceInput` from callers.
- `backend/src/dependencies.ts` — inject the create-transaction agent (or transaction service) into the assistant agent factory.

**Unchanged**

- `CreateTransactionFromTextService` and the transactions-page flow.
- Chat history persistence and the `ChatMessageRepository` schema.
- The create-transaction agent itself (prompt, tools, per-invocation tool-call limit).

**GraphQL schema**

- `backend/src/graphql/schema.graphql` — add optional `isVoiceInput: Boolean` to `AssistantInput`. Frontend regenerates types via `npm run codegen:sync-schema` + `npm run codegen`.

**Specs**

- Delta updates to `specs/assistant/spec.md` and `specs/telegram-bot-integration/spec.md`.

**Dependencies**

- No new runtime dependencies.

## Constitution Compliance

- **Backend Layer Structure**: the new subagent tool lives in the langchain layer and calls `TransactionService` through the existing create-transaction agent path. No new direct repository access from resolvers or tools.
- **Result Pattern**: the outer assistant tool forwards the subagent's final message as a string; the underlying `TransactionService.createTransaction` call still returns via the Result pattern internally.
- **Authentication & Authorization**: `userId` continues to flow through agent context; the subagent tool does not accept a user ID from input.
- **Input Validation**: the create-transaction agent retains its existing validation; the assistant agent prompt handles routing, not validation of transaction fields.
- **Test Strategy**: new tool and updated services will be covered by co-located unit tests with mocked dependencies, consistent with existing langchain tool and service tests.
- **TypeScript Code Generation**: follow existing naming and argument conventions (object destructuring for factory functions with ≥3 arguments).
- **Schema-Driven Development**: schema change is small and additive — an optional `isVoiceInput` field on `AssistantInput`. Updates start at `schema.graphql`; both backend and frontend regenerate types before consuming the new field.
