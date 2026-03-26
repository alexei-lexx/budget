## Why

Interacting with Insight requires opening the app and navigating to the page — too much friction for a quick finance query. Telegram integration brings Insight to a channel users already have open: lower friction for quick queries, chat history preserved natively, and a foundation for proactive notifications (spending alerts, budget summaries) in the future.

## What Changes

- New Settings UI section: Telegram Bot — connect (paste token), disconnect, test, masked indicator when connected
- New GraphQL mutations (`connectTelegramBot`, `disconnectTelegramBot`) and query (`telegramBotTest`)
- New webhook endpoint `/telegram/webhook` on the existing web Lambda, dispatching to a new Background Job Lambda asynchronously
- New Background Job Lambda handling `telegram-message` job type: calls InsightService and sends the AI reply via Telegram API
- New `TelegramConnections` DynamoDB table with `(userId, webhookSecret)` composite key and a GSI on `webhookSecret`
- New `TelegramBotService` (domain entity service) owning connection lifecycle: connect, disconnect, test, lookup by webhookSecret
- New `ProcessTelegramMessageService` (single-purpose service) orchestrating InsightService call and Telegram reply
- New `TelegramConnRepo` repository for `TelegramConnections` table access
- Port interfaces for all external dependencies: `TelegramApiClient`, `BackgroundJobDispatcher`
- New CDK infrastructure: `TelegramConnectionsTable`, Background Job Lambda, IAM permissions for async invocation

## Capabilities

### New Capabilities

- `telegram-bot-integration`: Full lifecycle for connecting a personal Telegram bot to a user account, receiving inbound messages via webhook, and replying with AI-generated answers from InsightService

### Modified Capabilities

- `user-settings`: New "Telegram Bot" section added to the Settings page — requirements change to include connect/disconnect/test interactions and masked token display

## Impact

- **Backend**: new services (`TelegramBotService`, `ProcessTelegramMessageService`), new repository (`TelegramConnRepo`), new GraphQL resolvers, new webhook handler, new Background Job Lambda entry point, new port interfaces
- **Infra CDK**: new DynamoDB table (`TelegramConnections` with GSI), new Background Job Lambda function, IAM role allowing web Lambda to invoke Background Job Lambda asynchronously
- **Frontend**: new Telegram Bot section in Settings page
- **External dependency**: Telegram Bot API (via `setWebhook`, `deleteWebhook`, `getMe`, `getWebhookInfo`, `sendMessage`)

## Constitution Compliance

- **Vendor Independence**: `TelegramApiClient` and `BackgroundJobDispatcher` defined as port interfaces in `services/ports/`; concrete implementations injected at Lambda entry point — backend remains portable to any Node.js runtime ✓
- **Schema-Driven Development**: all API changes start with `schema.graphql` updates; codegen run for both backend and frontend types ✓
- **Backend Layer Structure**: resolvers → services → repositories maintained; no direct DB access from resolvers ✓
- **Backend Service Layer**: `TelegramBotService` follows domain entity pattern (CRUD lifecycle); `ProcessTelegramMessageService` follows single-purpose pattern (one `call` method, complex orchestration) ✓
- **Result Pattern**: all public service methods return `Result` ✓
- **Soft-Deletion**: `TelegramConnections` records use `isArchived` flag; disconnect archives rather than deletes ✓
- **Repository Pattern**: `TelegramConnRepo` provides the only DB access layer; GSI on `webhookSecret` uses a portable single-field secondary index ✓
- **Database Record Hydration**: Zod validation at repository read boundary ✓
- **Test Strategy**: repository tests against real DB; service tests with mocked repositories ✓
- **Authentication & Authorization**: `connectTelegramBot`/`disconnectTelegramBot`/`telegramBotTest` resolve userId from JWT context, never from input; webhook handler resolves userId from `webhookSecret` lookup ✓
- **UI Guidelines**: snackbars for connect/disconnect/test feedback; mobile-first Settings layout ✓
