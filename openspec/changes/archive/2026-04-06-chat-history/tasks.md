## 1. GraphQL Schema & Codegen

- [x] 1.1 Add optional `sessionId: ID` field to `InsightInput` in `backend/src/graphql/schema.graphql`
- [x] 1.2 Add `sessionId: ID!` field to `InsightSuccess` in `backend/src/graphql/schema.graphql`
- [x] 1.3 Run `npm run codegen` in `backend/` to regenerate resolver types

## 2. Infrastructure (CDK)

- [x] 2.1 Add `ChatMessagesTable` DynamoDB table in `infra-cdk/lib/backend-cdk-stack.ts` with partition key `userId`, sort key `sessionMessageCombinedId`, and TTL attribute `expiresAt`
- [x] 2.2 Grant Lambda read/write permissions to `ChatMessagesTable`
- [x] 2.3 Pass `CHAT_MESSAGES_TABLE_NAME`, `CHAT_MESSAGE_TTL_SECONDS`, and `CHAT_HISTORY_MAX_MESSAGES` env vars to the Lambda function

## 3. Backend – Domain Types

- [x] 3.1 Add `ulidx` dependency to `backend/package.json`
- [x] 3.2 Create `Ulid` branded type in `backend/src/types/ulid.ts`
- [x] 3.3 Create `ChatMessage` domain model in `backend/src/models/chat-message.ts`
- [x] 3.4 Create `ChatMessageRepository` port in `backend/src/services/ports/chat-message-repository.ts` with `save` and `findManyRecentBySessionId` methods; document TTL exception

## 4. Backend – Repository

- [x] 4.1 Create `chatMessageRecordSchema` Zod schema in `backend/src/repositories/schemas/chat-message.ts`
- [x] 4.2 Implement `DynChatMessageRepository` in `backend/src/repositories/dyn-chat-message-repository.ts` using ULID compound sort key and TTL
- [x] 4.3 Write `DynChatMessageRepository` tests against real DynamoDB Local in `backend/src/repositories/dyn-chat-message-repository.test.ts`

## 5. Backend – Service Updates

- [x] 5.1 Update `InsightService.call()` in `backend/src/services/agent-services/insight-service.ts` to accept optional `history?: AgentMessage[]` and prepend it to agent messages
- [x] 5.2 Update `InsightService` tests in `backend/src/services/agent-services/insight-service.test.ts`
- [x] 5.3 Create `InsightChatService` in `backend/src/services/agent-services/insight-chat-service.ts`: generate/accept `sessionId`, load history via repository, call `InsightService` with history, save user+assistant messages, return `sessionId`
- [x] 5.4 Write `InsightChatService` tests in `backend/src/services/agent-services/insight-chat-service.test.ts` with mocked repository
- [x] 5.5 Update `ProcessTelegramMessageService` in `backend/src/services/process-telegram-message-service.ts` to inject `ChatMessageRepository`, derive `sessionId` from `"${botId}#${chatId}"`, load history, call `InsightService` with history, save messages after successful response
- [x] 5.6 Update `ProcessTelegramMessageService` tests in `backend/src/services/process-telegram-message-service.test.ts`

## 6. Backend – Wiring & Resolver

- [x] 6.1 Register `DynChatMessageRepository` and `InsightChatService` singletons in `backend/src/dependencies.ts`; update `ProcessTelegramMessageService` registration to inject `chatMessageRepository`
- [x] 6.2 Add `insightChatService` to `GraphQLContext` in `backend/src/graphql/context.ts` and wire it in `backend/src/server.ts`
- [x] 6.3 Update `backend/src/graphql/resolvers/insight-resolvers.ts` to call `insightChatService` instead of `insightService`, pass `sessionId` from input, return `sessionId` in `InsightSuccess`

## 7. Backend – Validation

- [x] 7.1 Run `npm test` in `backend/` and fix any failures
- [x] 7.2 Run `npm run typecheck` and `npm run format` in `backend/` and fix all issues

## 8. Frontend – Schema, Mutation & Codegen

- [x] 8.1 Run `npm run codegen:sync-schema` in `frontend/` to pull the updated schema
- [x] 8.2 Update the `askInsight` mutation in `frontend/src/graphql/mutations.ts` to send `sessionId` in input and receive `sessionId` from `InsightSuccess`
- [x] 8.3 Run `npm run codegen` in `frontend/` to regenerate typed composables

## 9. Frontend – useInsight Composable

- [x] 9.1 Update `frontend/src/composables/useInsight.ts` to read `sessionId` from `localStorage` key `"insight-session-id"` on mount and write it back after each successful call
- [x] 9.2 Pass `sessionId` in the `AskInsightInput` when calling the mutation
- [x] 9.3 Persist `question`, last `answer`, and last `agentTrace` to `localStorage` and restore them on mount; suppress empty state when a stored answer exists

## 10. Frontend – Validation

- [x] 10.1 Run `npm run typecheck` and `npm run format` in `frontend/` and fix all issues

## Constitution Compliance

| Principle                                    | Status                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Three-layer architecture**                 | ✓ `DynChatMessageRepository` (data), `InsightChatService` / updated `ProcessTelegramMessageService` (business logic), resolvers (API) |
| **Single-purpose service pattern**           | ✓ `InsightChatService.call()` is a single-purpose orchestrator                                                                        |
| **Result pattern**                           | ✓ `InsightChatService.call()` returns `Result<...>`; existing `InsightService` result is propagated                                   |
| **Repository pattern / vendor independence** | ✓ `ChatMessageRepository` port abstracts DynamoDB; `DynChatMessageRepository` is the adapter                                          |
| **Portable query patterns**                  | ✓ prefix scan + limit on compound sort key is reproducible in any ordered key-value store                                             |
| **Schema-driven development**                | ✓ schema updated first (tasks 1.1–1.3); frontend syncs from backend (task 8.1–8.3)                                                    |
| **Database record hydration**                | ✓ `chatMessageRecordSchema` (Zod) validates every DynamoDB record at read time (task 4.1)                                             |
| **Soft-deletion exception**                  | ✓ TTL-based cleanup documented in `ChatMessageRepository` port comment (task 3.4)                                                     |
| **Authentication & authorization**           | ✓ `userId` is always the DynamoDB partition key; cross-user access structurally impossible                                            |
| **Test strategy**                            | ✓ `DynChatMessageRepository` tests against real DynamoDB Local; service tests with mocked repository                                  |
| **TypeScript strict mode / branded types**   | ✓ `Ulid` branded type (task 3.2); no `as any`                                                                                         |
| **Finder method naming**                     | ✓ `findManyRecentBySessionId` returns array                                                                                           |
| **Code quality validation**                  | ✓ typecheck + format in tasks 7.1–7.2 and 10.1                                                                                        |
