## 1. GraphQL Schema

- [ ] 1.1 Add `TelegramBot` type to `schema.graphql` with fields: `id`, `maskedToken`
- [ ] 1.2 Add `telegramBot` query returning nullable `TelegramBot`
- [ ] 1.3 Add `connectTelegramBot(token: String!)`, `disconnectTelegramBot`, `testTelegramBot` mutations
- [ ] 1.4 Run `npm run codegen` in backend

## 2. Infrastructure (CDK)

- [ ] 2.1 Add `TelegramBotsTable` (`userId` PK, `id` SK, GSI: `webhookSecret` → `WebhookSecretIndex`)
- [ ] 2.2 Add Background Job Lambda (`background-jobs-lambda.handler`)
- [ ] 2.3 Grant web Lambda IAM permission to invoke Background Job Lambda asynchronously

## 3. Port Interfaces & Concrete Implementations

- [ ] 3.1 Add `TelegramApiClient` port interface (`setWebhook`, `deleteWebhook`, `getWebhookInfo`, `sendMessage`)
- [ ] 3.2 Add `BackgroundJobDispatcher` port interface (`dispatch`)
- [ ] 3.3 Implement `HttpTelegramApiClient` (concrete, using `fetch`)
- [ ] 3.4 Write `HttpTelegramApiClient` tests
- [ ] 3.5 Implement `LambdaBackgroundJobDispatcher` (concrete, using AWS Lambda SDK)
- [ ] 3.6 Write `LambdaBackgroundJobDispatcher` tests

## 4. Repository

- [ ] 4.1 Define Zod schema for `TelegramBot` entity (`id`, `userId`, `token`, `webhookSecret`, `status`, `isArchived`, timestamps)
- [ ] 4.2 Add `TelegramBotRepository` port interface (`findOneConnectedByUserId`, `findConnectedByWebhookSecret`, `create`, `updateStatus`, `archive`)
- [ ] 4.3 Implement `DynTelegramBotRepository`
- [ ] 4.4 Add `TelegramBotsTable` to DynamoDB Local setup script
- [ ] 4.5 Write `DynTelegramBotRepository` tests

## 5. TelegramBotService

- [ ] 5.1 Implement `TelegramBotService` (`connect`, `disconnect`, `test`, `findOneConnectedByUserId`, `acceptMessage`)
- [ ] 5.2 Write `TelegramBotService` tests

## 6. ProcessTelegramMessageService

- [ ] 6.1 Implement `ProcessTelegramMessageService.call({ webhookSecret, message })`
- [ ] 6.2 Write `ProcessTelegramMessageService` tests

## 7. GraphQL Resolvers

- [ ] 7.1 Implement `connectTelegramBot`, `disconnectTelegramBot`, `testTelegramBot` mutation resolvers
- [ ] 7.2 Implement `telegramBot` query resolver
- [ ] 7.3 Sync schema to frontend and run frontend codegen

## 8. Webhook & Lambda Handlers

- [ ] 8.1 Implement webhook handler function (validate secret header, call `acceptMessage`, return 200)
- [ ] 8.2 Wrap `web.ts` handler: dispatch to webhook handler on `/telegram/webhook`, delegate to Apollo otherwise
- [ ] 8.3 Create `background-jobs-lambda.ts` handler (route by `type`, call `ProcessTelegramMessageService`)
- [ ] 8.4 Wire concrete implementations (`HttpTelegramApiClient`, `LambdaBackgroundJobDispatcher`) in Lambda entry points

## 9. Frontend

- [ ] 9.1 Add Telegram Bot section to Settings page (not-connected state: token input + Connect button)
- [ ] 9.2 Add connected state (masked token + Test + Disconnect buttons)
- [ ] 9.3 Wire GraphQL operations, handle loading states and snackbar feedback for all actions

## 10. Validation

- [ ] 10.1 Run full backend test suite (`npm test`)
- [ ] 10.2 Run backend typecheck and lint (`npm run typecheck && npm run format`)
- [ ] 10.3 Run frontend typecheck and lint (`npm run typecheck && npm run format`)
