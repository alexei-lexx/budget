## Why

Issue: alexei-lexx/budget#291 — Chat History
Title: Chat History

Users cannot ask follow-up questions in the Insight view or Telegram bot because each message is treated as an isolated query with no context from prior exchanges. Adding per-session conversation history enables multi-turn conversations so users can refine or build on previous answers.

## What Changes

- Insight supports multi-turn conversations: follow-up questions are answered in context of prior exchanges within the same session
- Telegram bot supports multi-turn conversations: each chat maintains its own ongoing session
- Sessions persist for 24 hours; after expiry the next message starts a fresh session (transparent to the user)
- **BREAKING**: `Mutation.askInsight` input gains optional `sessionId`; success output gains required `sessionId`; GraphQL types renamed from `Insight*` to `AskInsight*`
- In-app session survives page navigation and revisits via `localStorage`

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `insight`: Users can now ask follow-up questions — each submission is part of a session, and prior exchanges inform the AI's response; session persists across page visits
- `telegram-bot-integration`: Each Telegram chat maintains its own conversation session; users can ask follow-up questions within the same chat

## Impact

- **Backend**: New files under `backend/src/types/`, `backend/src/models/`, `backend/src/services/ports/`, `backend/src/repositories/`, `backend/src/services/`; modified `InsightService`, `ProcessTelegramMessageService`, GraphQL schema, resolvers, DI wiring, and server bootstrap
- **Frontend**: Updated `ASK_INSIGHT` mutation, regenerated types, `useInsight` composable updated with `sessionId` localStorage persistence
- **Infra**: New `ChatMessagesTable` DynamoDB table; read/write grants to both Lambda functions
- **Dependencies**: `ulidx` package added to backend

## Constitution Compliance

- **TypeScript strict mode**: All new code uses TypeScript with strict types; `Ulid` branded type enforces sort-order correctness at the type level ✓
- **GraphQL API**: New mutation input/output fields follow existing Apollo Server patterns ✓
- **Database Access**: New repository follows the port/adapter pattern already established by other repositories ✓
- **Free/minimal cost**: DynamoDB with TTL-based cleanup avoids unbounded storage growth ✓
- **Test strategy**: Repository tests use real DynamoDB Local; service tests use mocked repository — consistent with existing patterns ✓
- **Authorization / user data scoping**: All queries are scoped by `userId` as partition key — no cross-user data access possible ✓
