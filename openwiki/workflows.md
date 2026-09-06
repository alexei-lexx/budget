---
type: workflow
title: Workflows
description: End-to-end request, chat, transaction, Telegram, and deployment flows across the backend and release tooling.
tags: [workflow, backend, assistant, telegram, deployment]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-06T08:09:31.070Z
sources:
  - id: openwiki-source-202b75e5aaf4da76cc18348e
    resource: repo://backend/src/dependencies.ts
  - id: openwiki-source-fc9ac63c3d4a9c3259fb57bf
    resource: repo://backend/src/graphql/resolvers/assistant-resolvers.ts
  - id: openwiki-source-7b88ec7022ad474f9db85673
    resource: repo://backend/src/graphql/resolvers/shared.ts
  - id: openwiki-source-76deeda3338373c498d8b5f1
    resource: repo://backend/src/lambdas/migrate.ts
  - id: openwiki-source-3ef7b141b339c0260aabd5e3
    resource: repo://backend/src/lambdas/telegram-webhook-handler.ts
  - id: openwiki-source-e134eec1e9c8a9a7cc9c133d
    resource: repo://backend/src/lambdas/web.ts
  - id: openwiki-source-1381fe631584e1d0b93f96c3
    resource: repo://backend/src/migrations/runner.ts
  - id: openwiki-source-1acf7db88e503680606bbccf
    resource: repo://backend/src/services/assistant-chat-service.ts
  - id: openwiki-source-971538e520f50f02fe634f26
    resource: repo://backend/src/services/create-transaction-from-text-service.test.ts
  - id: openwiki-source-a19e4f7dbd9a0240f0a443d7
    resource: repo://backend/src/services/create-transaction-from-text-service.ts
  - id: openwiki-source-3bf988b23a82f06bb06dfb01
    resource: repo://backend/src/services/process-telegram-message-service.test.ts
  - id: openwiki-source-7ef2aa799f6eb14f7aee2fb1
    resource: repo://backend/src/services/process-telegram-message-service.ts
  - id: openwiki-source-828d24ee9ccc8738afe410fb
    resource: repo://deploy.sh
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "openwiki/0.5.0", at: "2026-09-06T08:09:31.070Z" }
---

# Workflows

This page traces the highest-value runtime and release flows across the backend. It focuses on authenticated GraphQL use, assistant chat, quick transaction creation, Telegram message handling, and production deployment.

## Authenticated GraphQL assistant flow

The assistant mutation is exposed through the GraphQL resolver layer. It first resolves the authenticated user from the request context, then calls the chat service with the user ID and the request input. The resolver returns either an `AssistantSuccess` payload or an `AssistantFailure` payload, so the client always receives the session identifier even when the assistant call fails.

Authentication is validated before any assistant work happens:

- `getAuthenticatedUser` requires an authenticated context and looks up the persisted user record by email.
- Missing auth produces a GraphQL error.
- A missing database user also fails the mutation.
- Unexpected resolver errors are normalized through `handleResolverError`.

```mermaid
sequenceDiagram
  participant Client
  participant Resolver as GraphQL resolver
  participant Auth as getAuthenticatedUser
  participant Repo as User repository
  participant Chat as AssistantChatService
  participant Assistant as Assistant service
  participant Store as Chat message repository

  Client->>Resolver: askAssistant(input)
  Resolver->>Auth: getAuthenticatedUser(context)
  Auth->>Repo: findOneByEmail(email)
  Repo-->>Auth: user or not found
  Auth-->>Resolver: user
  Resolver->>Chat: call(user.id, question, sessionId, isVoiceInput)
  Chat->>Store: load recent messages for session
  Chat->>Assistant: call(question, history)
  Assistant-->>Chat: answer or failure
  alt success
    Chat->>Store: save user message
    Chat->>Store: save assistant message
    Chat-->>Resolver: success(answer, trace, sessionId)
    Resolver-->>Client: AssistantSuccess
  else failure
    Chat-->>Resolver: failure(message, trace, sessionId)
    Resolver-->>Client: AssistantFailure
  end
```

This diagram shows the authenticated request path and the fact that chat history is loaded and persisted inside the chat service, not in the resolver.

## Assistant chat session lifecycle

`AssistantChatServiceImpl` creates a new session ID when the caller does not provide one. If the caller passes an existing `sessionId`, the service reuses it so a client can continue the same conversation.

The service loads the most recent messages for that user and session, reverses them into chronological order, and maps stored chat roles into agent roles before calling the assistant model. After a successful assistant response, it persists both the user question and the assistant answer. On failure, it returns a failure result that still includes the session ID and agent trace so callers can retry without losing conversational continuity.

The repository lookup is scoped by both user and session, which keeps chat history isolated per user and per conversation.

## Quick transaction creation from text

Quick-entry text is handled by `CreateTransactionFromTextService`. The service rejects empty user IDs and blank text immediately, before invoking the agent. For valid input, it sends a single user message to the transaction-creation agent together with runtime context containing the user ID, the current date, and whether the input came from voice.

After the agent responds, the service expects the last `CREATE_TRANSACTION_TOOL_NAME` execution to contain JSON describing either a successful transaction creation or a tool failure. It logs and returns failures when:

- the agent never attempted the create-transaction tool
- the tool output is not valid JSON
- the JSON does not match the expected schema
- the tool itself reports failure

When the tool succeeds, the service fetches the created transaction by ID and returns the persisted transaction together with the agent trace.

```mermaid
flowchart TD
  Start["Receive quick-entry text"] --> ValidateUser{"User ID present?"}
  ValidateUser -- no --> FailUser["Return failure: User ID is required"]
  ValidateUser -- yes --> ValidateText{"Text empty after trim?"}
  ValidateText -- yes --> FailText["Return failure: Text is required"]
  ValidateText -- no --> Agent["Invoke create-transaction agent"]
  Agent --> Tool{"Last create transaction tool execution found?"}
  Tool -- no --> FailNoTool["Return failure: agent did not attempt create transaction"]
  Tool -- yes --> Json{"Tool output valid JSON?"}
  Json -- no --> FailJson["Return failure: invalid JSON"]
  Json -- yes --> Shape{"Matches expected success or failure schema?"}
  Shape -- no --> FailShape["Return failure: unexpected format"]
  Shape -- failure --> FailTool["Return failure: agent failed to create transaction"]
  Shape -- success --> Load["Load transaction by ID"]
  Load --> Done["Return transaction and agent trace"]
```

Caption: quick-entry validation and agent/tool outcome handling.

## Telegram message handling

Telegram updates enter through the webhook Lambda. The handler requires the Telegram secret header, rejects empty bodies, and parses the webhook payload before it forwards the message to the Telegram bot service.

`ProcessTelegramMessageService` then revalidates the user-to-bot relationship before it does any assistant work:

- if the user has no connected bot, the service logs a warning and returns success without replying
- if the incoming bot ID does not match the user’s currently connected bot, it also returns success without replying
- if the Telegram update has no text, it sends a fixed non-text message reply and stops
- otherwise it derives a deterministic session ID from `botId#chatId`, calls the assistant chat service, and relays either the assistant answer or the assistant failure message back to Telegram

If Telegram cannot send the reply, the service returns failure.

```mermaid
sequenceDiagram
  participant Telegram
  participant Webhook as telegramWebhookHandler
  participant BotSvc as Telegram bot service
  participant Proc as ProcessTelegramMessageService
  participant Repo as Telegram bot repository
  participant Chat as AssistantChatService
  participant API as Telegram API client

  Telegram->>Webhook: POST update
  Webhook->>Webhook: require secret header and parse JSON
  Webhook->>BotSvc: acceptMessage(secret, chatId, text)
  BotSvc->>Proc: call(botId, chatId, text, userId)
  Proc->>Repo: findOneConnectedByUserId(userId)
  alt no bot or stale bot
    Proc-->>BotSvc: success without reply
  else non-text message
    Proc->>API: sendMessage(non-text notice)
    API-->>Proc: success or failure
  else text message
    Proc->>Chat: call(userId, question, sessionId)
    Chat-->>Proc: assistant success or failure
    Proc->>API: sendMessage(reply text)
    API-->>Proc: success or failure
  end
  BotSvc-->>Webhook: accept result
  Webhook-->>Telegram: 200 OK or error
```

Caption: webhook validation, bot ownership checks, and reply forwarding.

## Deployment and migrations

`deploy.sh` orchestrates the production release. It reads deployment-time configuration from SSM, builds the backend, deploys auth and application infrastructure, invokes the migration Lambda, then builds and uploads the frontend assets. It also extracts auth outputs from CDK to wire the frontend build and the deployed auth URLs.

The migration Lambda is a dedicated deployment step. It refreshes runtime environment values, runs `runMigrations` against DynamoDB, and returns a JSON summary with executed, skipped, failed, and total duration statistics. If migration execution throws, the Lambda logs the error and returns a 500 response body.

```mermaid
sequenceDiagram
  participant Shell as deploy.sh
  participant Backend as backend build
  participant CDK as infra-cdk deploy
  participant Mig as migrate Lambda
  participant DB as migrations runner
  participant Frontend as frontend build
  participant S3 as S3 upload

  Shell->>Backend: npm run build
  Shell->>CDK: deploy auth and app stacks
  CDK-->>Shell: stack outputs
  Shell->>Mig: invoke migration function
  Mig->>DB: runMigrations(DynamoDBClient)
  DB-->>Mig: stats or error
  Mig-->>Shell: 200 summary or 500 failure
  Shell->>Frontend: npm run build with auth outputs
  Shell->>S3: aws s3 sync dist/
```

Caption: release sequencing from build to migration to frontend publish.

## Operational expectations and extension points

A few invariants matter when changing these flows:

- Assistant chat continuity depends on session IDs; callers should pass the session ID back on retries when they want to continue a conversation.
- Assistant chat history is limited by the configured maximum message count and is loaded per user and session.
- Telegram handling deliberately treats missing or mismatched bot state as a no-op success, which prevents stale webhook deliveries from creating noise.
- Quick-entry creation requires a successful create-transaction tool execution before the service will fetch and return a transaction.
- Deployment-time configuration is consumed during `deploy.sh` and CDK deploys, while runtime AI configuration is loaded by the backend Lambda on cold start.

When extending these workflows, the safest change order is:

1. update the relevant service first
2. adjust the GraphQL resolver or Lambda entrypoint
3. update tests that cover the success and failure paths
4. change deployment tooling only if the runtime needs new config or permissions

## Focused tests that matter

Representative tests already cover the main control-flow guarantees:

- assistant chat service tests verify history handling, persisted session behavior, and failure propagation
- quick-entry service tests verify validation, tool selection, JSON parsing, schema validation, and transaction lookup
- Telegram message service tests verify bot matching, non-text replies, assistant replies, and Telegram send failures

Those tests are the best starting point when changing the flows documented here.
