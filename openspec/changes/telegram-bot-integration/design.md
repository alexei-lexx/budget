## Context

The app exposes an Insight AI feature for natural-language finance queries, currently only accessible from the web UI. The backend runs on AWS Lambda (Apollo Server) with DynamoDB for persistence. This change adds Telegram as a second channel for Insight by letting users connect a personal bot they create via BotFather. The backend becomes the webhook handler for all connected bots through a single endpoint.

Reference: `docs/telegram-bot-integration.md` contains the full sequence diagrams and rationale for each decision.

## Goals / Non-Goals

**Goals:**

- Let users connect/disconnect/test a Telegram bot from Settings
- Receive inbound Telegram messages via a single webhook endpoint
- Route text messages through InsightService and reply in Telegram
- Handle AI processing latency without timing out Telegram's webhook
- Keep the data model recoverable if connect/disconnect crashes mid-way

**Non-Goals:**

- Proactive notifications (spending alerts, summaries) — channel is established but push messaging is out of scope
- Multi-step conversational context — each message is an independent Insight query
- Multiple active bots per user — one active connection per user at a time
- Group chat support — personal bot only

## Decisions

### 1. Separate `TelegramConnections` DynamoDB table

Store bot connections in a dedicated table with a `status` field (`PENDING` → `CONNECTED`; `DELETING` during disconnect/replace).

**Why**: `setWebhook` and the DB write are not atomic. Status tracking makes partial failures recoverable: a `PENDING` record signals an incomplete connect, a `DELETING` record signals an incomplete disconnect. Keeping this off the User table preserves single-entity focus.

**Alternative**: Fields on the User record — simpler, but no clean status tracking and harder to reason about partial failures during token replacement.

### 2. Composite primary key `(userId PK, webhookSecret SK)` + GSI on `webhookSecret`

Each connection record is keyed on the pair `(userId, webhookSecret)`. A GSI on `webhookSecret` alone supports the `findByWebhookSecret` lookup used by the webhook handler.

**Why**: During token replacement the old record must stay alive (its webhook still receives messages) until the new one is fully set up. A `userId`-only key would force delete-before-create, creating a gap and making crash recovery impossible. The GSI is a single-field secondary index — portable to SQL (unique index) and MongoDB (index on field).

**Alternative**: `userId` as sole PK — simpler but no safe recovery path if replacement crashes mid-way.

### 3. Single fixed webhook URL + `X-Telegram-Bot-Api-Secret-Token` for bot identity

All bots register `POST /telegram/webhook`. Each bot is registered with a unique `webhookSecret` (UUID generated at connect time). Telegram echoes it back as the `X-Telegram-Bot-Api-Secret-Token` header. The handler looks up the user by that header value.

**Why**: `setWebhook` is scoped per bot token — multiple bots can register the same URL independently. The secret never appears in URLs or logs.

**Alternative**: Per-bot URL path segment — rejected; credentials in URLs appear in access logs.

### 4. Extend existing web Lambda to handle `/telegram/webhook`

Dispatch based on `event.rawPath` in the existing Lambda handler: `/telegram/webhook` goes to the webhook handler; everything else to Apollo Server.

**Why**: Less infrastructure, fewer cold starts in local dev, consistent with the existing single-backend-process pattern.

**Alternative**: Separate webhook Lambda — more isolation but unnecessary complexity for this use case.

### 5. Async processing via a Background Job Lambda (fire-and-forget)

The web Lambda returns 200 to Telegram immediately after handing off to a Background Job Lambda invoked asynchronously. Async dispatch is abstracted behind an `BackgroundJobDispatcher` port so application code stays runtime-agnostic.

**Why**: AI processing regularly exceeds Telegram's 5-second webhook timeout. Lambda async invocation is built-in at no extra cost.

**Alternative**: SQS — better retry semantics but adds cost and complexity disproportionate to personal-scale usage.

### 6. Background Job Lambda as general-purpose async job dispatcher

Reads a `type` field from the payload and dispatches to the appropriate handler. `telegram-message` is the first type.

**Why**: Avoids proliferating Lambdas for each future async use case; single deployment unit for background work.

### 7. `TelegramBotService` (domain entity) + `ProcessTelegramMessageService` (single-purpose)

`TelegramBotService` owns the connection lifecycle (`connect`, `disconnect`, `test`, `getConnectionByWebhookSecret`). `ProcessTelegramMessageService` exposes a single `call` method orchestrating the InsightService query and Telegram reply.

**Why**: Matches the constitution's two service patterns — CRUD-like lifecycle in a domain entity service, complex AI orchestration in a single-purpose service.

### 8. `telegramBotTest` as a Query (not a Mutation)

Calls `getMe` + `getWebhookInfo` on the Telegram API; no server state is changed.

**Why**: GraphQL convention — mutations for state changes, queries for reads.

### 9. Port interfaces for all external dependencies

`TelegramApiClient` and `BackgroundJobDispatcher` are defined as interfaces in `services/ports/`. Concrete implementations are injected at the Lambda entry point.

**Why**: Constitution requires the backend to be deployable to any Node.js runtime without code changes. Embedding AWS SDK or `fetch` calls in application code would violate that.

**Alternative**: Call dependencies directly in application code — fewer files but ties business logic to Lambda runtime and specific HTTP client.

## Risks / Trade-offs

- **No retry for failed AI processing** → Fire-and-forget means a crashed Background Job Lambda silently drops the reply. Users can re-send the message manually. Acceptable for personal-scale usage; SQS retries are a future upgrade path.
- **BotFather setup friction** → Users must create their own bot before connecting. This is one-time setup and documented in the UI; no mitigation needed.
- **`setWebhook` + DB write not atomic** → Mitigated by the `PENDING`/`CONNECTED`/`DELETING` status field. A stuck `PENDING` record is detectable and can be retried.
- **Background Job Lambda cold starts add latency** → Async invocation already decouples reply time from Telegram's timeout. Cold-start latency is additive to AI processing time but invisible to the user (they get a reply whenever it completes).
- **Token stored in plaintext in DynamoDB** → The token is a credential. Encryption at rest via DynamoDB default KMS mitigates exposure at the storage layer. Token is never logged or returned to the frontend (only the masked hint is exposed).

## Migration Plan

1. CDK deploy adds the `TelegramConnections` DynamoDB table and GSI
2. CDK deploy adds the Background Job Lambda and IAM permission for the web Lambda to invoke it asynchronously
3. Web Lambda is updated with the `/telegram/webhook` routing and handler
4. No data migration needed — new feature with no existing records

Rollback: remove the CDK resources; web Lambda reverts to Apollo-only routing. No user data is at risk.

## Open Questions

- Should connecting a token that is already active for another user be rejected, or silently allowed (since each bot token is globally unique to one owner)? The Telegram API enforces uniqueness implicitly — `setWebhook` on an already-webhooking bot just updates the URL — so a stolen token would redirect the victim's bot. Consider validating token uniqueness across users at connect time.

## Constitution Compliance

- **Vendor Independence**: `TelegramApiClient` and `BackgroundJobDispatcher` behind port interfaces; injected at Lambda entry point — backend portable to any Node.js runtime ✓
- **Schema-Driven Development**: new mutations/query added to `schema.graphql` first; codegen run for both packages ✓
- **Backend Layer Structure**: resolvers → services → repositories; no direct DB access from resolvers or services ✓
- **Backend Service Layer**: `TelegramBotService` (domain entity, multiple public methods); `ProcessTelegramMessageService` (single-purpose, one `call` method) ✓
- **Result Pattern**: all public service methods return `Result` ✓
- **Soft-Deletion**: disconnect archives the record via `isArchived`; archived records excluded from active lookups ✓
- **Repository Pattern**: `TelegramConnRepo` is the sole DB access layer; GSI uses a portable single-field secondary index ✓
- **Database Record Hydration**: Zod validation at `TelegramConnRepo` read boundary ✓
- **Authentication & Authorization**: userId always resolved from JWT context in GraphQL resolvers; webhook handler resolves userId from `webhookSecret` DB lookup, never from request body ✓
- **Test Strategy**: `TelegramConnRepo` tested against real DynamoDB Local; `TelegramBotService` and `ProcessTelegramMessageService` tested with mocked repositories and port interfaces ✓
