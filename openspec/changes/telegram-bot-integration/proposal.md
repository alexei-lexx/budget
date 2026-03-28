## Why

Users want to ask finance questions through Telegram without opening the web app. The app already has Insight (an AI service for natural language finance queries), so extending it to Telegram means connecting an existing capability to a new channel rather than building AI from scratch.

## What Changes

- New Settings section where users can connect, test, and disconnect a personal Telegram bot
- New GraphQL mutations and query: `connectTelegramBot`, `disconnectTelegramBot`, `testTelegramBot`, `telegramBot`
- New DynamoDB table `TelegramBotsTable` storing one bot record per user
- New webhook endpoint `/telegram/webhook` on the existing web Lambda to receive inbound Telegram messages
- New Background Job Lambda for async AI processing (avoids Telegram's 5-second webhook timeout)
- New port interfaces: `TelegramApiClient` and `BackgroundJobDispatcher` (keep business logic runtime-agnostic)
- New CDK infrastructure: `TelegramBotsTable`, Background Job Lambda, IAM for Lambda-to-Lambda invocation

## Capabilities

### New Capabilities

- `telegram-bot-integration`: Full Telegram bot feature — bot setup (connect, test, disconnect from Settings), and bot usage (send a message via Telegram, receive an AI-powered reply)

### Modified Capabilities

- `user-settings`: Settings page gains a Telegram Bot section (connect/disconnect/test UI)

## Impact

- **Backend**: New services, repository, GraphQL schema additions, two new port interfaces, webhook handler added to existing web Lambda entry point
- **Frontend**: New Telegram Bot section on the Settings page
- **Infra (CDK)**: New DynamoDB table, new Background Job Lambda, updated IAM for Lambda-to-Lambda invocation (no new API Gateway route — existing web Lambda handles `/telegram/webhook` internally via `event.rawPath` dispatch)
- **External dependency**: Telegram Bot API (`setWebhook`, `deleteWebhook`, `sendMessage`)

## Constitution Compliance

| Principle                      | Status | Notes                                                                                                                                |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Vendor Independence            | ✓      | `TelegramApiClient` and `BackgroundJobDispatcher` are port interfaces; business logic has no direct SDK or `fetch` calls             |
| Schema-Driven Development      | ✓      | New GraphQL operations added to `schema.graphql` first; codegen run before implementation                                            |
| Backend Layer Structure        | ✓      | Resolvers → `TelegramBotService` → `TelegramBotRepository`; `ProcessTelegramMessageService` → `InsightService` / `TelegramApiClient` |
| Service Patterns               | ✓      | `TelegramBotService` is a domain entity service; `ProcessTelegramMessageService` is a single-purpose service                         |
| Soft-Deletion                  | ✓      | `TelegramBot` records use `isArchived` flag; archived records excluded from user-facing queries                                      |
| Repository Pattern             | ✓      | `TelegramBotRepository` wraps all DynamoDB access; Zod validation at read boundary                                                   |
| Portable Query Patterns        | ✓      | GSI on `webhookSecret` is a single-field secondary index reproducible in SQL/MongoDB                                                 |
| Service Result Pattern         | ✓      | All public service methods return `Result`                                                                                           |
| Authentication & Authorization | ✓      | `userId` resolved from JWT context in GraphQL layer; never taken from input                                                          |
| Test Strategy                  | ✓      | Repository tests with real DB; service tests with mocked repositories; test files co-located                                         |
| UI Guidelines                  | ✓      | Snackbars for connect/test/disconnect feedback; mobile-first layout                                                                  |
