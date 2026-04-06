## Context

The app has two entry points for asking the AI agent questions: the Insight view (`Mutation.askInsight`) and the Telegram bot. Both currently pass only the current question to the agent — no prior exchanges are included. Follow-up questions ("What about last month?") are answered without context. This change adds a `ChatMessage` store and orchestration services that load history before each call and persist new messages after, enabling multi-turn conversations through both entry points.

**Constraints**:

- DynamoDB is the only database available — no RDBMS, no Redis.
- Cost must remain minimal — unbounded storage growth is unacceptable.
- `InsightService` and the AI agent layer must remain stateless and reusable.

## Goals / Non-Goals

**Goals:**

- Enable multi-turn conversations in the Insight view with session persistence across page visits.
- Enable multi-turn conversations in the Telegram bot, scoped to each chat.
- Each message expires independently after 24 hours via DynamoDB TTL.
- Keep `InsightService` stateless — it accepts optional `history` and forwards it to the agent.

**Non-Goals:**

- Permanent conversation history or user-facing conversation management UI.
- Cross-device session sharing (session ID is `localStorage`-scoped per browser).
- Real-time streaming responses.
- Permanent conversation history or user-facing conversation management UI (out of scope).

## Decisions

### 1. Two separate orchestrators — `InsightChatService` and updated `ProcessTelegramMessageService`

The in-app and Telegram paths have different session ID strategies and different lifecycles, so they need separate orchestrators rather than a shared one.

- `InsightChatService` generates or accepts a UUID `sessionId` passed from the frontend.
- `ProcessTelegramMessageService` derives `sessionId = "${botId}#${chatId}"` deterministically from the Telegram context — no separate client-side storage needed, unlike the in-app path where the frontend persists it in `localStorage`.

**Alternative considered:** A shared `ChatOrchestrator` used by both paths. Rejected because the two paths differ enough (session ID source, output channel, error handling) that the abstraction would add indirection without real code reuse.

### 2. `InsightService` stays stateless — history is caller responsibility

`InsightService.call()` gains an optional `history?: AgentMessage[]` parameter. It prepends history messages before the user's question and forwards them to the agent. It does not load or save anything.

**Rationale:** Keeps the AI layer pure and testable in isolation. The session lifecycle (load → call → save) is an orchestration concern, not an AI concern. This allows the same `InsightService` to be used without history (e.g., one-off queries) without changes.

### 3. ULID sort key for messages

Each message's `messageId` is a ULID (Universally Unique Lexicographically Sortable Identifier) generated via `ulidx`. The DynamoDB sort key is `sessionMessageCombinedId = "${sessionId}#${messageId}"`.

**Why ULID over UUID:** ULIDs are lexicographically sortable by creation time. DynamoDB's `begins_with` + descending scan retrieves the N most recent messages for a session in a single query, then the results are reversed to ascending order before returning. A UUID sort key would require a GSI or a separate timestamp attribute for ordering.

**Why compound sort key over separate attributes:** DynamoDB does not support filtering on non-key attributes in a `KeyConditionExpression`. Embedding `sessionId` in the sort key enables efficient prefix queries (`begins_with(sessionMessageCombinedId, "${sessionId}#")`) without a GSI. Using a dedicated `sessionId` attribute as sort key would prevent storing multiple sessions per user in the same table efficiently.

**Branded `Ulid` type:** A `string & { readonly __brand: unique symbol }` branded type is used so the compiler prevents accidentally passing a plain UUID where ULID sort order matters.

### 4. DynamoDB TTL for session expiry

Messages include an `expiresAt` Unix timestamp. DynamoDB's native TTL attribute deletes expired items automatically, at no extra cost and with no background job required.

Default TTL: 24 hours (`CHAT_MESSAGE_TTL_SECONDS=86400`). Configurable via env var for future adjustment without code changes.

**Alternative considered:** A scheduled Lambda to delete old messages. Rejected — DynamoDB TTL is free, built-in, and requires zero operational overhead.

### 5. Frontend session ID in `localStorage`

The frontend stores `sessionId` in `localStorage` keyed by `"insight-session-id"`. On the next visit, the stored ID is passed in `AskInsightInput.sessionId`. If the session has expired server-side (TTL), the backend finds no history and proceeds with an empty context, but returns the same `sessionId` back to the frontend.

**Alternative considered:** Server-generated session ID returned on first successful response and stored client-side. This is what's implemented — `InsightChatService` generates a UUID if none is provided and returns it in `AskInsightSuccess.sessionId`.

### 6. History window limited to 20 messages

`findManyRecentBySessionId` is called with `limit: CHAT_HISTORY_MAX_MESSAGES` (default 20). Only the N most recent messages are sent to the agent to prevent unbounded context growth and keep AI costs predictable. Configurable via env var.

### 7. Messages saved after the agent responds, not before

User and assistant messages are persisted only after `InsightService` returns a successful result. If the agent fails, no messages are stored — the user can retry without polluting the session history with failed exchanges.

## Risks / Trade-offs

- **History window is a hard limit, not semantic** → Mitigation: 20 messages (10 turns) covers typical follow-up depth; can be tuned via env var without code changes.
- **DynamoDB TTL is approximate** → Items may persist up to 48 hours past `expiresAt` per AWS docs. This is acceptable — stale messages produce a slightly extended session, not a security issue. Mitigation: None needed; behavior is cosmetic.
- **ULID monotonic factory is per-process** → `monotonicFactory()` in `InsightChatService` and `ProcessTelegramMessageService` guarantees ordering within a single Lambda invocation. Across concurrent invocations, two messages created at the same millisecond could have non-deterministic order. Mitigation: Acceptable for chat history — adjacent-millisecond ordering ambiguity does not affect usability.
- **`localStorage` session ID is device-scoped** → Users opening the app on a second device start a fresh session. Mitigation: Acceptable for the current scope; cross-device sync is a non-goal.
- **Soft-deletion exception for `ChatMessage`** → Messages expire via TTL instead of `isArchived`. Documented in the port interface comment. TTL-based cleanup is the intended lifecycle for short-lived, immutable records.

## Migration Plan

1. Deploy backend with `ChatMessagesTable` via CDK — no data migration needed (new table).
2. Deploy updated backend Lambda — existing `askInsight` callers that omit `sessionId` get a fresh session automatically.
3. Deploy frontend — `useInsight` picks up `sessionId` from `localStorage` (empty on first load, populated after first successful call).

**Rollback:** Remove `InsightChatService` wiring in `dependencies.ts` and `server.ts`, restore `insightService` in context. The `ChatMessagesTable` can remain — it is not read by the old code path.

## Open Questions

_(none — all decisions are resolved in the plan)_

## Constitution Compliance

| Principle                                                          | Status                                                                                                                                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Three-layer architecture** (Resolvers → Services → Repositories) | ✓ `DynChatMessageRepository` is pure data access; `InsightChatService` and `ProcessTelegramMessageService` contain all orchestration logic; resolver calls service only |
| **Single-purpose service pattern**                                 | ✓ `InsightChatService.call()` is a single-purpose orchestrator                                                                                                          |
| **Result pattern**                                                 | ✓ `InsightChatService.call()` returns `Result<InsightChatOutput, ...>`; `InsightService.call()` already returns `Result`                                                |
| **Repository pattern / vendor independence**                       | ✓ `ChatMessageRepository` port abstracts DynamoDB; `DynChatMessageRepository` is the adapter                                                                            |
| **Portable query patterns**                                        | ✓ prefix scan + limit is reproducible in any ordered key-value store; no DynamoDB-specific features beyond standard table operations                                    |
| **Schema-driven development**                                      | ✓ schema.graphql updated first; backend then frontend codegen                                                                                                           |
| **Database record hydration**                                      | ✓ `chatMessageRecordSchema` (Zod) validates every DynamoDB record at read time                                                                                          |
| **Soft-deletion exception documented**                             | ✓ TTL-based cleanup documented in the port interface comment                                                                                                            |
| **Authentication & authorization**                                 | ✓ `userId` is always the DynamoDB partition key; cross-user access is structurally impossible                                                                           |
| **Test strategy**                                                  | ✓ `DynChatMessageRepository` tested against real DynamoDB Local; `InsightChatService` and updated `ProcessTelegramMessageService` tested with mocked repository         |
| **TypeScript strict mode / branded types**                         | ✓ `Ulid` branded type; no `as any` except where documented                                                                                                              |
| **Finder method naming**                                           | ✓ `findManyRecentBySessionId` returns array (never null)                                                                                                                |
| **Free/minimal cost**                                              | ✓ DynamoDB TTL is free; on-demand billing; no extra Lambda or background jobs                                                                                           |
