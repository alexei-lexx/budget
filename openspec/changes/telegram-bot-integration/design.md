## Context

The app has an existing Insight AI service that answers natural language finance questions. This change exposes it through Telegram: each user connects their own bot (created via BotFather), the app registers itself as the webhook handler, and inbound messages are routed to Insight and answered in Telegram.

A detailed technical design exists at `docs/telegram-bot-integration.md` — this document summarises the key decisions and trade-offs for implementation reference.

## Goals / Non-Goals

**Goals:**

- Let users connect, test, and disconnect a personal Telegram bot from Settings
- Route inbound text messages to Insight and reply via Telegram
- Respond to Telegram's webhook within 5 seconds regardless of AI processing time
- Keep business logic runtime-agnostic (deployable outside Lambda without code changes)

**Non-Goals:**

- Group or channel bots
- Multiple bots per user
- Rich media responses (images, buttons, etc.)
- Retry logic for failed AI processing

## Decisions

### 1. Dedicated `TelegramBots` DynamoDB table

Store bot records in their own table with a `status` field (`PENDING` → `CONNECTED`; `DELETING` → archived). `setWebhook` and the DB write are not atomic; status tracking makes partial failures detectable and recoverable. Keeping this out of the User table preserves a clean separation.

**Alternative considered**: Fields on the User record — simpler but no clean status tracking; harder to reason about partial failures during token replacement.

### 2. Single webhook URL + `X-Telegram-Bot-Api-Secret-Token` for bot identity

All bots share one URL (`/telegram/webhook`). Each bot is registered with a unique `webhookSecret` UUID; Telegram echoes it as the `X-Telegram-Bot-Api-Secret-Token` header. The handler looks up the bot record by that secret.

Credentials stay out of URLs and logs. `setWebhook` is scoped per bot token, so the same URL can be registered by many bots independently.

**Alternative considered**: Secret in the URL path — rejected because credentials in URLs appear in access logs.

### 3. Extend the existing web Lambda to handle `/telegram/webhook`

Dispatch based on `event.rawPath` in the Lambda handler. Everything except `/telegram/webhook` goes to Apollo Server. No new Lambda or API Gateway route is needed.

**Implementation note**: `web.ts` currently passes all requests directly to `startServerAndCreateLambdaHandler`. The handler must be wrapped — check `event.rawPath` first and dispatch to the webhook handler before delegating to Apollo.

**Webhook testing**: end-to-end testing requires a publicly reachable URL; use the staging environment on AWS.

**Alternative considered**: Separate webhook Lambda — more isolation but unnecessary complexity and extra cold starts in local dev.

### 4. Async processing via Background Job Lambda

`TelegramBotService.acceptMessage` dispatches a job asynchronously (fire-and-forget) and returns immediately; the web Lambda replies 200 to Telegram at once. AI processing happens in the Background Job Lambda.

AI responses regularly exceed Telegram's 5-second webhook timeout. Lambda async invocation handles this at no extra infrastructure cost.

**Alternative considered**: SQS — better retry semantics but adds cost and complexity disproportionate to personal-scale usage.

### 5. Background Job Lambda as a general-purpose async dispatcher

Reads a `type` field from the payload and routes to the appropriate handler. `telegram-message` is the first type; future async work can be added without a new Lambda.

**Infrastructure note**: this is the third Lambda in the system (after web and migration-runner) and the first general-purpose async worker. It needs a new CDK definition, a new handler entry point, and IAM permission for the web Lambda to invoke it asynchronously.

### 6. `TelegramBotService` (domain entity) + `ProcessTelegramMessageService` (single-purpose)

`TelegramBotService` owns the bot lifecycle (`connect`, `disconnect`, `test`, `findOneConnectedByUserId`, `acceptMessage`). `ProcessTelegramMessageService` owns AI orchestration and the Telegram reply for a single inbound message. Matches the constitution's two service patterns.

### 7. Table key design: `userId` PK + `id` SK, GSI on `webhookSecret`

Consistent with other tables (every entity has an `id` SK). The GSI on `webhookSecret` supports the `findConnectedByWebhookSecret` lookup in `acceptMessage`, which only knows the secret from the request header. Both `findConnectedByWebhookSecret` and `findOneConnectedByUserId` filter by `status = CONNECTED` — the names encode this. The status update after a successful `setWebhook` targets the record by `id`, consistent with how other entities handle updates. Single-field GSI — portable to SQL and MongoDB.

**Alternative considered**: `userId` as sole PK — workable given one bot per user, but inconsistent with the rest of the table design.

### 8. Port interfaces for external dependencies

`TelegramApiClient` and `BackgroundJobDispatcher` are port interfaces defined in `services/ports/`. Concrete implementations are injected at the Lambda entry point. Application code stays runtime-agnostic as required by the constitution.

**Alternative considered**: Direct AWS SDK / `fetch` calls in application code — fewer files but ties business logic to Lambda and specific HTTP clients.

## Risks / Trade-offs

- **Partial connect** (`setWebhook` fails, error caught) → service archives the `PENDING` record before returning failure; no stuck records. If the Lambda crashes mid-connect, the stale `PENDING` record is inert (`findOneConnectedByUserId` and `findConnectedByWebhookSecret` both filter by `status = CONNECTED`); the next connect attempt creates a fresh record and proceeds normally.
- **Partial disconnect** (`deleteWebhook` fails, record still archived) → `deleteWebhook` is best-effort; Telegram will keep calling the webhook but `findConnectedByWebhookSecret` returns null for archived records, so messages are silently dropped.
- **Background Lambda cold starts** add latency to the first reply after inactivity → acceptable for personal-scale usage; Telegram has no hard timeout on the reply-to-message path.
- **Bot token stored in DB** → treat as a sensitive credential; do not log it.

## Migration Plan

1. Deploy CDK changes: new `TelegramBotsTable`, new Background Job Lambda, updated IAM.
2. Deploy backend code: web Lambda now handles `/telegram/webhook`; new GraphQL operations available.
3. No data migration required — new table, no existing records to transform.
4. Rollback: redeploy previous backend version; CDK table can be left in place (empty, unused).

## Open Questions

_(none — all decisions resolved in `docs/telegram-bot-integration.md`)_

## Constitution Compliance

| Principle                             | Status | Notes                                                                                         |
| ------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Vendor Independence                   | ✓      | `TelegramApiClient` and `BackgroundJobDispatcher` are ports; no SDK calls in application code |
| Schema-Driven Development             | ✓      | New GraphQL operations added to schema first                                                  |
| Backend Layer Structure               | ✓      | Resolvers → Services → Repositories throughout                                                |
| Service Patterns                      | ✓      | Domain entity service + single-purpose service                                                |
| Soft-Deletion                         | ✓      | `isArchived` flag on bot records                                                              |
| Repository Pattern + Portable Queries | ✓      | GSI on single field; reproducible in SQL/MongoDB                                              |
| Service Result Pattern                | ✓      | All public service methods return `Result`                                                    |
| Authentication & Authorization        | ✓      | `userId` from JWT context only; webhook validated by `webhookSecret` header                   |
| Test Strategy                         | ✓      | Repository tests with real DB; service tests with mocked repos; tests co-located              |
