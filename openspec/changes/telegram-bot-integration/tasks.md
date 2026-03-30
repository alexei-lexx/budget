## 1. GraphQL Schema

- [x] 1.1 Add `TelegramBot` type to `schema.graphql` with fields: `id`, `maskedToken`
- [x] 1.2 Add `telegramBot` query returning nullable `TelegramBot`
- [x] 1.3 Add `connectTelegramBot(token: String!)`, `disconnectTelegramBot`, `testTelegramBot` mutations
- [x] 1.4 Run `npm run codegen` in backend

## 2. Infrastructure (CDK)

- [x] 2.1 Add `TelegramBotsTable` (`userId` PK, `id` SK, GSI: `webhookSecret` → `WebhookSecretIndex`)
- [x] 2.2 Add Background Job Lambda (`background-jobs-lambda.handler`)
- [x] 2.3 Grant web Lambda IAM permission to invoke Background Job Lambda asynchronously

## 3. Port Interfaces & Concrete Implementations

- [x] 3.1 Add `TelegramApiClient` port interface (`setWebhook`, `deleteWebhook`, `getWebhookInfo`, `sendMessage`)
- [x] 3.2 Add `BackgroundJobDispatcher` port interface (`dispatch`)
- [x] 3.3 Implement `HttpTelegramApiClient` (concrete, using `fetch`)
- [x] 3.4 Write `HttpTelegramApiClient` tests
- [x] 3.5 Implement `LambdaBackgroundJobDispatcher` (concrete, using AWS Lambda SDK)
- [x] 3.6 Write `LambdaBackgroundJobDispatcher` tests

## 4. Repository

- [x] 4.1 Define Zod schema for `TelegramBot` entity (`id`, `userId`, `token`, `webhookSecret`, `status`, `isArchived`, timestamps)
- [x] 4.2 Add `TelegramBotRepository` port interface (`findOneConnectedByUserId`, `findOneConnectedByWebhookSecret`, `create`, `updateStatus`, `archive`)
- [x] 4.3 Implement `DynTelegramBotRepository`
- [x] 4.4 Add `TelegramBotsTable` to DynamoDB Local setup script
- [x] 4.5 Write `DynTelegramBotRepository` tests

## 5. TelegramBotService

- [x] 5.1 Implement `TelegramBotService` (`connect`, `disconnect`, `test`, `findOneConnectedByUserId`, `acceptMessage`)
- [x] 5.2 Write `TelegramBotService` tests

## 6. ProcessTelegramMessageService

- [x] 6.1 Implement `ProcessTelegramMessageService.call({ webhookSecret, message })`
- [x] 6.2 Write `ProcessTelegramMessageService` tests

## 7. GraphQL Resolvers

- [x] 7.1 Implement `connectTelegramBot`, `disconnectTelegramBot`, `testTelegramBot` mutation resolvers
- [x] 7.2 Implement `telegramBot` query resolver
- [x] 7.3 Sync schema to frontend and run frontend codegen

## 8. Webhook & Lambda Handlers

- [x] 8.1 Implement webhook handler function (validate secret header, call `acceptMessage`, return 200)
- [x] 8.2 Wrap `web.ts` handler: dispatch to webhook handler on `/webhooks/telegram`, delegate to Apollo otherwise
- [x] 8.3 Create `background-jobs-lambda.ts` handler (route by `type`, call `ProcessTelegramMessageService`)
- [x] 8.4 Wire concrete implementations (`HttpTelegramApiClient`, `LambdaBackgroundJobDispatcher`) in Lambda entry points

## 9. Frontend

- [x] 9.1 Add Telegram Bot section to Settings page (not-connected state: token input + Connect button)
- [x] 9.2 Add connected state (masked token + Test + Disconnect buttons)
- [x] 9.3 Wire GraphQL operations, handle loading states and snackbar feedback for all actions

## 10. Validation

- [x] 10.1 Run full backend test suite (`npm test`)
- [x] 10.2 Run backend typecheck and lint (`npm run typecheck && npm run format`)
- [x] 10.3 Run frontend typecheck and lint (`npm run typecheck && npm run format`)
