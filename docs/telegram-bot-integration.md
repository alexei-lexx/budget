# Technical Design: Telegram Bot Integration

## Vision

Users connect a personal Telegram bot to their account via Settings. Once connected, text messages sent to the bot are routed through the existing Insight AI service and answered in Telegram — extending finance queries to a conversational, mobile-native channel. Each user controls their own bot (created via BotFather); the app acts as the message handler for all connected bots through a single webhook endpoint.

## User Perspective

**User stories:**
- As a user, I can paste my Telegram bot token in Settings and click Connect
- As a user, I see a masked indicator (`••••1234`) when a bot is connected
- As a user, I can click Disconnect to remove the integration
- As a user, I can click Test to verify the bot is still registered
- As a user, I can paste a new token to replace the connected bot (old bot disconnected first)
- As a user, I can ask a finance question via Telegram and receive an answer
- As a user, if I send a non-text message, the bot replies "I can only process text messages"
- As a user, if Insight fails, the bot sends an error message

**Settings UI:**
```
Not connected:
  [Telegram Bot]
  ┌─────────────────────────────┐
  │ Bot token                   │  [Connect]
  └─────────────────────────────┘

Connected:
  [Telegram Bot]  ✓ Connected
  ••••1234           [Test]  [Disconnect]
```

Connect failure: snackbar error, field retains token for retry.
Test: snackbar success/failure, no state change.

## Architecture Overview

**GraphQL API** (entry point — connect/disconnect/test)
- **Owns**: `connectTelegramBot` mutation, `disconnectTelegramBot` mutation, `telegramBotTest` query; authentication and userId resolution
- **Relations**: TelegramBotService

**Webhook handler** (entry point — inbound Telegram messages)
- **Owns**: Webhook request validation via `X-Telegram-Bot-Api-Secret-Token` header; routing text vs non-text messages; async dispatch
- **Relations**: TelegramBotService (connection lookup), BackgroundJobDispatcher (port)

**TelegramBotService** (domain entity service)
- **Owns**: Connection lifecycle — connect, disconnect, test, lookup by webhookSecret
- **Relations**: TelegramConnRepo, TelegramApiClient (port)

**ProcessTelegramMessageService** (single-purpose service)
- **Owns**: AI-reply orchestration for a single inbound Telegram message
- **Relations**: InsightService, TelegramApiClient (port)

**TelegramConnRepo**
- **Owns**: Persistence of TelegramConnections records
- **Relations**: TelegramConnectionsTable

**TelegramConnectionsTable** (new DynamoDB table)
- **Owns**: Connection state per user — bot token, webhookSecret, status, isArchived

**Telegram API** (external)
- **Owns**: Bot registration and message delivery

## Sequence Diagrams

**Connect bot:**
```
User        Frontend     GraphQL      TelegramBotService   TelegramAPI   TelegramConnRepo
 │               │            │               │                  │               │
 │ paste token   │            │               │                  │               │
 │──────────────>│            │               │                  │               │
 │               │ connectTelegramBot(token)  │                  │               │
 │               │───────────>│               │                  │               │
 │               │            │ connect(userId, token)           │               │
 │               │            │──────────────>│                  │               │
 │               │            │               │ GET /getMe       │               │
 │               │            │               │─────────────────>│               │
 │               │            │               │ bot info or err  │               │
 │               │            │               │<─────────────────│               │
 │               │            │               │ write status=pending             │
 │               │            │               │─────────────────────────────────>│
 │               │            │               │ POST /setWebhook(url,secret_token)│
 │               │            │               │─────────────────>│               │
 │               │            │               │ ok or err        │               │
 │               │            │               │<─────────────────│               │
 │               │            │               │ update status=connected          │
 │               │            │               │─────────────────────────────────>│
 │               │            │ Success{tokenHint}               │               │
 │               │            │<──────────────│                  │               │
 │               │ masked + Test/Disconnect   │                  │               │
 │<──────────────│            │               │                  │               │
```

**Webhook receive + async processing:**
```
User     Telegram  WebLambda  TelegramBotService  TelegramConnRepo  BackgroundJobLambda  ProcessTelegramMessageService  InsightService  TelegramAPI
  │          │         │              │                   │                │                  │                   │            │
  │ send msg │         │              │                   │                │                  │                   │            │
  │─────────>│         │              │                   │                │                  │                   │            │
  │          │ POST /telegram/webhook │                   │                │                  │                   │            │
  │          │ X-Telegram-Bot-Api-Secret-Token: secret    │                │                  │                   │            │
  │          │─────────>│             │                   │                │                  │                   │            │
  │          │          │ getConnectionByWebhookSecret(secret)             │                  │                   │            │
  │          │          │─────────────>│                  │                │                  │                   │            │
  │          │          │              │ findByWebhookSecret               │                  │                   │            │
  │          │          │              │──────────────────>│               │                  │                   │            │
  │          │          │              │ connection        │               │                  │                   │            │
  │          │          │              │<──────────────────│               │                  │                   │            │
  │          │          │ connection (userId, botToken)    │               │                  │                   │            │
  │          │          │<─────────────│                  │                │                  │                   │            │
  │          │  [no text]              │                   │                │                  │                   │            │
  │          │          │────── sendMessage("text only") ──────────────────────────────────────────────────────────────────────>│
  │          │  [text]  │              │                   │                │                  │                   │            │
  │          │          │ dispatch({type:'telegram-message',               │                  │                   │            │
  │          │          │          userId,chatId,text,botToken})           │                  │                   │            │
  │          │          │────────────────────────────────────────────────>│                  │                   │            │
  │          │ 200 OK   │              │                   │                │                  │                   │            │
  │          │<─────────│              │                   │                │                  │                   │            │
  │          │          │              │                   │                │ call(userId,q,chatId,botToken)       │            │
  │          │          │              │                   │                │─────────────────>│                  │            │
  │          │          │              │                   │                │                  │ call(userId,q)   │            │
  │          │          │              │                   │                │                  │─────────────────>│            │
  │          │          │              │                   │                │                  │ answer/failure   │            │
  │          │          │              │                   │                │                  │<─────────────────│            │
  │          │          │              │                   │                │                  │ sendMessage(answer or error)  │
  │          │          │              │                   │                │                  │──────────────────────────────>│
  │ answer   │          │              │                   │                │                  │                   │            │
  │<─────────│          │              │                   │                │                  │                   │            │
```

**Disconnect:**
```
User        Frontend     GraphQL      TelegramBotService   TelegramAPI   TelegramConnRepo
 │               │            │               │                  │               │
 │ click Disconnect           │               │                  │               │
 │──────────────>│            │               │                  │               │
 │               │ disconnectTelegramBot       │                  │               │
 │               │───────────>│               │                  │               │
 │               │            │ disconnect(userId)               │               │
 │               │            │──────────────>│                  │               │
 │               │            │               │ update status=deleting           │
 │               │            │               │─────────────────────────────────>│
 │               │            │               │ POST /deleteWebhook (best-effort)│
 │               │            │               │─────────────────>│               │
 │               │            │               │ archive record                  │
 │               │            │               │─────────────────────────────────>│
 │               │            │ Success       │                  │               │
 │               │            │<──────────────│                  │               │
 │               │ show token input           │                  │               │
 │<──────────────│            │               │                  │               │
```

## Key Design Decisions

**1. Separate `TelegramConnections` DynamoDB table**
- **Decision**: Store Telegram bot connections in a dedicated DynamoDB table with a status field (`PENDING` = webhook registered but not yet confirmed in DB; `CONNECTED` = fully active; `DELETING` = disconnect/replace in progress)
- **Rationale**: setWebhook and DB write are not atomic; status tracking makes partial failures recoverable — a `PENDING` record signals an incomplete connect, a `DELETING` record signals an incomplete disconnect. Keeps User table focused on user settings.
- **Alternative considered**: Fields on User record — simpler but no clean status tracking, harder to reason about partial failures during token replacement

**2. Single fixed webhook URL + `X-Telegram-Bot-Api-Secret-Token` header for identity and auth**
- **Decision**: All bots POST to `/telegram/webhook`; each bot registered with a unique `secret_token` (the `webhookSecret` UUID); Telegram echoes it as `X-Telegram-Bot-Api-Secret-Token` header; handler looks up user by header value
- **Rationale**: `setWebhook` is scoped per bot token — same URL can be registered by many bots independently (confirmed via official Telegram API docs). Secret never appears in URL or logs.
- **Alternative considered**: Secret in URL path — rejected; credentials in URLs appear in access logs

**3. Extend existing web Lambda to handle both `/graphql` and `/telegram/webhook`**
- **Decision**: Dispatch based on `event.rawPath` in the Lambda handler; `/telegram/webhook` goes to the webhook handler, everything else to Apollo Server
- **Rationale**: Less infrastructure, fewer cold starts in local dev, consistent with existing pattern of one backend process
- **Alternative considered**: Separate webhook Lambda — more isolation but unnecessary complexity

**4. Async processing: respond to Telegram immediately, process in a separate Lambda**
- **Decision**: Web Lambda returns 200 to Telegram immediately after handing off to a Background Job Lambda invoked asynchronously (fire-and-forget); async dispatch is abstracted behind an `BackgroundJobDispatcher` port so application code stays runtime-agnostic
- **Rationale**: AI processing regularly exceeds Telegram's 5-second webhook timeout. Lambda async invocation is built-in at no extra cost.
- **Alternative considered**: SQS — better retry semantics but adds cost and complexity disproportionate to personal-scale usage

**5. Background Job Lambda as general-purpose async job dispatcher**
- **Decision**: Reads `type` field from payload, dispatches to appropriate handler; `telegram-message` is the first type
- **Rationale**: Avoids proliferating Lambdas for each future async use case; single deployment unit for background work

**6. `TelegramBotService` (domain entity) + `ProcessTelegramMessageService` (single-purpose)**
- **Decision**: `TelegramBotService` owns the connection lifecycle (`connect`, `disconnect`, `test`, `getConnectionByWebhookSecret`); `ProcessTelegramMessageService` orchestrates AI processing and the Telegram reply
- **Rationale**: Matches constitution's two service patterns — CRUD operations in domain entity service, complex orchestration in single-purpose service.

**7. `telegramBotTest` as a Query (not mutation)**
- **Decision**: Reads `getMe` + `getWebhookInfo` from Telegram API; no server state changed
- **Rationale**: GraphQL convention — mutations for state changes, queries for reads

**8. Composite primary key (`userId` PK + `webhookSecret` SK) on `TelegramConnectionsTable`**
- **Decision**: Each connection record is keyed on the pair `(userId, webhookSecret)`, allowing multiple records per user to coexist. A Global Secondary Index (GSI) on `webhookSecret` (partition key only) supports the `findByWebhookSecret` lookup used by the webhook handler, which knows only the secret from the `X-Telegram-Bot-Api-Secret-Token` header.
- **Rationale**: During token replacement, the old record must stay alive (its webhook still receives messages) until the new one is fully set up; a single-key design would require deleting the old record first, creating a gap and making crash recovery harder. The GSI is a secondary index on a single field — portable to SQL and MongoDB per the vendor-independence principle.
- **Alternative considered**: `userId` as sole PK — simpler but forces delete-before-create, with no safe recovery path if the replacement crashes mid-way

**9. Port interfaces for all external dependencies**
- **Decision**: Telegram API calls (`TelegramApiClient`) and async job dispatch (`BackgroundJobDispatcher`) are accessed through port interfaces defined in `services/ports/`; concrete implementations are injected at the Lambda entry point
- **Rationale**: Constitution requires the backend to be deployable to any Node.js runtime without code changes; embedding AWS SDK calls or direct `fetch` calls in application code would violate that
- **Alternative considered**: Call dependencies directly in application code — fewer files but ties business logic to Lambda runtime and specific HTTP client

## Observability

Log errors at each failure point:

- **Webhook handler**: webhookSecret not found in DB; async dispatch failed
- **ProcessTelegramMessageService**: InsightService error; sendMessage error
- **TelegramBotService.connect**: `getMe` error; `setWebhook` error; DB write error
- **TelegramBotService.disconnect**: `deleteWebhook` error (best-effort — log and continue)
