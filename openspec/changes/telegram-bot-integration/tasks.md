## 1. GraphQL Schema

- [ ] 1.1 Add `TelegramBotStatus` type with `tokenHint: String!` and `isConnected: Boolean!` fields to `schema.graphql`
- [ ] 1.2 Add `telegramBotStatus: TelegramBotStatus!` query to `schema.graphql`
- [ ] 1.3 Add `ConnectTelegramBotResult` type with `tokenHint: String!` to `schema.graphql`
- [ ] 1.4 Add `connectTelegramBot(token: String!): ConnectTelegramBotResult!` mutation to `schema.graphql`
- [ ] 1.5 Add `disconnectTelegramBot: Boolean!` mutation to `schema.graphql`
- [ ] 1.6 Add `TelegramBotTestResult` type with `success: Boolean!` and `message: String!` to `schema.graphql`
- [ ] 1.7 Add `telegramBotTest: TelegramBotTestResult!` query to `schema.graphql`
- [ ] 1.8 Run `npm run codegen` in `backend/` to generate TypeScript types

## 2. Infrastructure (CDK)

- [ ] 2.1 Define `TelegramConnectionsTable` DynamoDB table in CDK with `userId` (PK) and `webhookSecret` (SK) as composite key
- [ ] 2.2 Add a GSI on `webhookSecret` (partition key only) to support webhook handler lookup
- [ ] 2.3 Define the Background Job Lambda function in CDK (Node.js runtime, entry point `src/backgroundJobLambda.ts`)
- [ ] 2.4 Grant the web Lambda IAM permission to invoke the Background Job Lambda asynchronously
- [ ] 2.5 Pass the Background Job Lambda ARN and `TelegramConnectionsTable` name as environment variables to the web Lambda

## 3. Backend — Port Interfaces & Repository

- [ ] 3.1 Define `TelegramApiClient` port interface in `backend/src/services/ports/TelegramApiClient.ts` with methods: `getMe`, `setWebhook`, `deleteWebhook`, `getWebhookInfo`, `sendMessage`
- [ ] 3.2 Define `BackgroundJobDispatcher` port interface in `backend/src/services/ports/BackgroundJobDispatcher.ts` with method `dispatch(job: BackgroundJob): Promise<void>`
- [ ] 3.3 Define `TelegramConnection` type and `TelegramConnectionStatus` enum (`PENDING`, `CONNECTED`, `DELETING`)
- [ ] 3.4 Implement `TelegramConnRepo` with methods: `create`, `findActiveByUserId`, `findByWebhookSecret`, `updateStatus`, `archive`
- [ ] 3.5 Add Zod schema validation for `TelegramConnection` records at the read boundary in `TelegramConnRepo`

## 4. Backend — Services

- [ ] 4.1 Implement `TelegramBotService.connect(userId, token)`: call `getMe` → write `PENDING` record → call `setWebhook` → update to `CONNECTED`; return `Result` with `tokenHint`
- [ ] 4.2 Implement `TelegramBotService.disconnect(userId)`: update to `DELETING` → call `deleteWebhook` (best-effort, log and continue on error) → archive record
- [ ] 4.3 Implement `TelegramBotService.test(userId)`: call `getMe` + `getWebhookInfo`; return `Result` with success/message
- [ ] 4.4 Implement `TelegramBotService.getStatus(userId)`: return `isConnected` + `tokenHint` (last 4 chars masked) for the Settings page
- [ ] 4.5 Implement `TelegramBotService.getConnectionByWebhookSecret(webhookSecret)`: delegate to repo GSI lookup
- [ ] 4.6 Implement `ProcessTelegramMessageService.call({ userId, chatId, text, botToken })`: call `InsightService` → send AI answer via `TelegramApiClient.sendMessage`; on `InsightService` failure, send error message via `sendMessage`

## 5. Backend — Implementations & Wiring

- [ ] 5.1 Implement `HttpTelegramApiClient` using `fetch` (no third-party HTTP client); inject base URL as constructor parameter for testability
- [ ] 5.2 Implement `LambdaBackgroundJobDispatcher` using AWS Lambda SDK `InvokeCommand` with `InvocationType: "Event"` (fire-and-forget)
- [ ] 5.3 Implement `/telegram/webhook` handler: extract `X-Telegram-Bot-Api-Secret-Token` header → look up connection → reject if not found (log + 200) → dispatch text messages via `BackgroundJobDispatcher` → reply "I can only process text messages" for non-text messages
- [ ] 5.4 Add `/telegram/webhook` routing in the web Lambda entry point (`src/lambda.ts`) based on `event.rawPath`
- [ ] 5.5 Implement the Background Job Lambda entry point (`src/backgroundJobLambda.ts`): parse `type` field → dispatch to `telegram-message` handler → instantiate and call `ProcessTelegramMessageService`
- [ ] 5.6 Wire all concrete implementations and inject into services at the web Lambda entry point
- [ ] 5.7 Wire all concrete implementations and inject into `ProcessTelegramMessageService` at the Background Job Lambda entry point

## 6. Backend — GraphQL Resolvers

- [ ] 6.1 Implement `telegramBotStatus` query resolver: resolve `userId` from context → call `TelegramBotService.getStatus`
- [ ] 6.2 Implement `connectTelegramBot` mutation resolver: resolve `userId` from context → call `TelegramBotService.connect` → return `tokenHint` on success, throw on failure
- [ ] 6.3 Implement `disconnectTelegramBot` mutation resolver: resolve `userId` from context → call `TelegramBotService.disconnect`
- [ ] 6.4 Implement `telegramBotTest` query resolver: resolve `userId` from context → call `TelegramBotService.test` → return result

## 7. Backend — Tests

- [ ] 7.1 Write `TelegramConnRepo` tests against real DynamoDB Local: `create`, `findActiveByUserId`, `findByWebhookSecret`, `updateStatus`, `archive`
- [ ] 7.2 Write `TelegramBotService` tests with mocked `TelegramConnRepo` and `TelegramApiClient`: `connect` (success, `getMe` failure, `setWebhook` failure), `disconnect`, `test`, `getStatus`, `getConnectionByWebhookSecret`
- [ ] 7.3 Write `ProcessTelegramMessageService` tests with mocked `InsightService` and `TelegramApiClient`: AI success reply, AI failure error reply

## 8. Frontend

- [ ] 8.1 Run `npm run codegen:sync-schema` then `npm run codegen` in `frontend/` to sync schema and generate typed composables
- [ ] 8.2 Add Telegram Bot section to the Settings page: token input + Connect button when not connected
- [ ] 8.3 Show masked token (`••••••••••XXXX`) with Test and Disconnect buttons when connected; load initial state via `telegramBotStatus` query
- [ ] 8.4 Wire Connect button to `connectTelegramBot` mutation; show error snackbar on failure (retain token value), transition to connected state on success
- [ ] 8.5 Wire Disconnect button to `disconnectTelegramBot` mutation; show snackbar on error, transition to disconnected state on success
- [ ] 8.6 Wire Test button to `telegramBotTest` query; show success or failure snackbar without changing connection state

## Constitution Compliance

- **Schema-Driven Development**: schema updated first (task 1), codegen run in both backend and frontend ✓
- **Backend Layer Structure**: resolvers (task 6) → services (task 4) → repositories (task 3); no direct DB access from resolvers ✓
- **Backend Service Layer**: `TelegramBotService` is a domain entity service (multiple public methods); `ProcessTelegramMessageService` is a single-purpose service (one `call` method) ✓
- **Result Pattern**: all public service methods return `Result` (tasks 4.1–4.5) ✓
- **Soft-Deletion**: `archive` in `TelegramConnRepo` (task 3.4); `findActiveByUserId` excludes archived records ✓
- **Repository Pattern**: `TelegramConnRepo` is the sole DB access layer (task 3.4); GSI uses a portable single-field index ✓
- **Database Record Hydration**: Zod validation at repo read boundary (task 3.5) ✓
- **Vendor Independence**: `TelegramApiClient` and `BackgroundJobDispatcher` behind port interfaces (task 3.1–3.2); concrete implementations injected at entry points (tasks 5.6–5.7) ✓
- **Authentication & Authorization**: resolvers resolve `userId` from JWT context, never from input (task 6) ✓
- **Test Strategy**: repo tests against real DynamoDB Local; service tests with mocked dependencies (task 7) ✓
- **Test File Location**: test files co-located with source files ✓
- **UI Guidelines**: snackbars for all feedback (tasks 8.4–8.6); Settings UI follows mobile-first pattern ✓
