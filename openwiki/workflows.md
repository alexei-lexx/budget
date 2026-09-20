---
type: Reference
title: Workflows and request flows
description: End-to-end request and operator workflows for authentication, GraphQL calls, assistant chat, quick transaction entry, Telegram message handling, migrations, and deployment.
tags: [workflows, requests, authentication, deployment, graphql]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-20T15:02:07.269Z
sources:
  - id: openwiki-source-202b75e5aaf4da76cc18348e
    resource: repo://backend/src/dependencies.ts
  - id: openwiki-source-fc9ac63c3d4a9c3259fb57bf
    resource: repo://backend/src/graphql/resolvers/assistant-resolvers.ts
  - id: openwiki-source-af53f70e3751f11aa56b0eb2
    resource: repo://backend/src/scripts/migrate.ts
  - id: openwiki-source-5d555e7fb0c2a28fa1fe774c
    resource: repo://backend/src/server.ts
  - id: openwiki-source-1acf7db88e503680606bbccf
    resource: repo://backend/src/services/assistant-chat-service.ts
  - id: openwiki-source-a19e4f7dbd9a0240f0a443d7
    resource: repo://backend/src/services/create-transaction-from-text-service.ts
  - id: openwiki-source-7ef2aa799f6eb14f7aee2fb1
    resource: repo://backend/src/services/process-telegram-message-service.ts
  - id: openwiki-source-828d24ee9ccc8738afe410fb
    resource: repo://deploy.sh
  - id: openwiki-source-77c413f182fc2eead5535edb
    resource: repo://frontend/src/router/index.ts
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "openwiki/0.5.2", at: "2026-09-20T15:02:07.269Z" }
---

# Workflows and request flows

This page ties the main user and operator intents to the code paths that execute them. It focuses on where requests enter the system, how they branch, when data is persisted, and which failures are surfaced to the caller versus only logged.

## Authenticate and enter the SPA

A user who opens the frontend and tries to reach a protected route goes through the Vue router guard first. The `SignIn` route is public, while `Accounts`, `Categories`, `Transactions`, `ByCategoryReport`, `Trends`, `Assistant`, and `Settings` all use `beforeEnter: requireAuth`.

`requireAuth` waits for the auth composable to finish loading before deciding. If the app is still loading auth state, it watches `isLoading` until it becomes false. It then routes authenticated users through and redirects unauthenticated users back to `SignIn`.

```mermaid
sequenceDiagram
  participant User
  participant Router
  participant Auth as useAuth

  User->>Router: navigate to protected route
  Router->>Auth: read isAuthenticated and isLoading
  alt auth still loading
    Router->>Auth: wait until isLoading becomes false
  end
  alt authenticated
    Router-->>User: continue to route
  else unauthenticated
    Router-->>User: redirect to SignIn
  end
```

The guard only decides client-side navigation. The backend still authenticates GraphQL requests separately.

## Authenticate a GraphQL request

Every GraphQL request builds a fresh request context in `backend/src/server.ts`. The server reads the `Authorization` header, normalizes array-valued headers to a single string, and passes that value to `resolveJwtAuthService().getAuthContext(...)`.

The context is assembled after auth resolution and includes repositories, CRUD services, reporting services, AI services, and Telegram services. The request also gets per-request DataLoaders for accounts and categories. Those loaders are created after a lazy `getUserId` function is defined so the loaders can resolve the authenticated internal user id only when needed.

If a request is unauthenticated, `getUserId` returns an empty string. If user lookup fails for loader scoping, the helper also falls back to an empty string rather than throwing.

```mermaid
sequenceDiagram
  participant Client
  participant Server as Apollo server
  participant JWT as JwtAuthService
  participant Ctx as createContext
  participant User as getAuthenticatedUser
  participant Loader as DataLoaders

  Client->>Server: GraphQL request with Authorization
  Server->>Ctx: build request context
  Ctx->>JWT: getAuthContext(header)
  Ctx->>User: resolve internal user id lazily
  alt authenticated user available
    User-->>Ctx: user id
  else auth lookup fails
    User-->>Ctx: empty id fallback
  end
  Ctx->>Loader: create request-scoped loaders
  Server-->>Client: execute operation with context
```

## Handle GraphQL errors

The Apollo server uses a custom `formatError` policy to separate user-facing failures from internal faults. Intentional `GraphQLError` instances pass through unchanged, which covers auth checks and inline validation. Date parsing errors are translated to `BAD_USER_INPUT`. `BusinessError` and `ModelError` become `BAD_REQUEST` responses.

Anything else is treated as an internal fault: the server logs the full error with the GraphQL path, then returns a generic `Internal server error` with `INTERNAL_SERVER_ERROR` to the client.

```mermaid
flowchart TD
  A[Resolver throws] --> B{Error type}
  B -->|GraphQLError| C[Return as formatted]
  B -->|InvalidDateStringError or InvalidDateTimeStringError| D[Return BAD_USER_INPUT]
  B -->|BusinessError or ModelError| E[Return BAD_REQUEST]
  B -->|Other| F[Log full error]
  F --> G[Return Internal server error]
```

## Ask the assistant from the web app

A signed-in user who opens the Assistant screen submits a GraphQL `askAssistant` mutation. The resolver authenticates the user, then calls `context.assistantChatService.call(user.id, ...)` with the question, optional voice flag, and optional session id.

`AssistantChatServiceImpl` owns the chat session boundary. It either reuses the provided `sessionId` or generates a new UUID. It loads recent messages for that user and session from `ChatMessageRepository`, reverses them into chronological order, converts them into the agent message format, and passes them to `AssistantService`.

If `AssistantService` fails, the service returns a failure result that includes the same `sessionId` so the caller can retry in the same conversation thread. It does not persist any new messages on this path.

If `AssistantService` succeeds, the service persists the user question first and the assistant answer second, both with the configured TTL, then returns success with the answer, agent trace, and session id.

```mermaid
sequenceDiagram
  participant Client
  participant Resolver as askAssistant
  participant Chat as AssistantChatService
  participant Repo as ChatMessageRepository
  participant Assistant as AssistantService

  Client->>Resolver: mutation(question, sessionId, isVoiceInput)
  Resolver->>Chat: call(userId, input)
  Chat->>Repo: findManyRecentBySessionId(userId, sessionId)
  Chat->>Assistant: call(userId, history, question)
  alt assistant fails
    Assistant-->>Chat: failure
    Chat-->>Resolver: failure with sessionId
    Resolver-->>Client: AssistantFailure
  else assistant succeeds
    Assistant-->>Chat: answer and agent trace
    Chat->>Repo: create USER message
    Chat->>Repo: create ASSISTANT message
    Chat-->>Resolver: success with sessionId
    Resolver-->>Client: AssistantSuccess
  end
```

The chat history limit and message TTL come from the async singleton in `backend/src/dependencies.ts`, which reads the relevant runtime environment settings.

## Create a transaction from free text

A user who types a quick-entry phrase such as `coffee 4.50` goes through `CreateTransactionFromTextService`. The service first validates the caller by checking that `userId` is present and that the trimmed text is non-empty. Invalid input returns a failure immediately and the agent is never invoked.

For valid input, the service invokes the create-transaction agent with a single user message and a context object containing `userId`, `isVoiceInput`, and today’s date. It then inspects the agent’s tool executions and requires that the create-transaction tool was actually called.

If no matching tool execution exists, the service logs an agent error and returns a failure message to the caller. If the tool output is not valid JSON, does not match the expected schema, or reports `success: false`, the service also logs the details and returns a failure. These branches are user-visible failures, but the logging preserves the agent output for debugging.

When the tool reports success, the service fetches the created transaction by id through `TransactionService.getTransactionById(transactionId, userId)` and returns the persisted transaction plus the agent trace.

```mermaid
flowchart TD
  A[Validate userId and text] --> B{Valid input}
  B -->|no| C[Return failure]
  B -->|yes| D[Invoke createTransactionAgent]
  D --> E{Tool execution found}
  E -->|no| F[Log agent error and fail]
  E -->|yes| G[Parse JSON output]
  G --> H{Schema valid}
  H -->|no| I[Log agent error and fail]
  H -->|yes| J{Tool success}
  J -->|no| K[Log agent error and fail]
  J -->|yes| L[Load transaction by id]
  L --> M[Return transaction and agent trace]
```

The service reuses the last `create-transaction` tool execution when the agent calls the tool more than once.

## Process a Telegram message

Telegram message handling is intentionally conservative. `ProcessTelegramMessageService` first asks `TelegramBotRepository.findOneConnectedByUserId(userId)` for the currently connected bot.

If no bot is connected, it logs a warning and returns success without doing anything. If the connected bot id does not match the incoming `botId`, it also logs a warning and returns success. This prevents stale Telegram deliveries from an old bot connection from affecting the current session.

For non-text messages, the service replies with `I can only process text messages` through `TelegramApiClient.sendMessage`. If that send fails, the service logs the error and returns a failure result; otherwise it exits successfully.

For text messages, the service derives a deterministic session id from `botId` and `chatId`, then forwards the text to `AssistantChatService`. It sends the assistant answer, or the assistant failure message, back to Telegram. Again, send failures are logged and returned as failures.

```mermaid
flowchart TD
  A[Incoming Telegram update] --> B[Load connected bot for user]
  B --> C{Bot connected}
  C -->|no| D[Warn and return success]
  C -->|yes| E{botId matches}
  E -->|no| F[Warn and return success]
  E -->|yes| G{text present}
  G -->|no| H[Send non-text notice]
  H --> I{sendMessage ok}
  I -->|no| J[Log and return failure]
  I -->|yes| K[Return success]
  G -->|yes| L[Derive sessionId from botId and chatId]
  L --> M[Call AssistantChatService]
  M --> N[Send assistant reply]
  N --> O{sendMessage ok}
  O -->|no| J
  O -->|yes| K
```

## Run migrations locally

The local migration script `backend/src/scripts/migrate.ts` creates a DynamoDB client, runs `runMigrations(client)`, and exits with a process status based on the result.

If `runMigrations` reports any failed migrations, the script prints `Migrations failed` and exits with code 1. If the runner throws, the script logs `Migration error:` with the exception and also exits with code 1. Only the all-success path exits with code 0.

```mermaid
flowchart TD
  A[npm run migrate] --> B[Create DynamoDB client]
  B --> C[runMigrations]
  C --> D{Any failures}
  D -->|yes| E[Exit 1]
  D -->|no| F[Exit 0]
  C --> G{Throws}
  G -->|yes| H[Log error and exit 1]
```

## Deploy the full stack

`deploy.sh` is the operator entrypoint for release ordering. It defaults `ENV` to `production`, validates that the environment name is alphanumeric with dashes, and then reads deployment-time SSM parameters before doing any build or infrastructure work. Those parameter reads are strict: missing parameters are tolerated, but AWS transport, IAM, or CLI failures stop the script.

The script then builds the backend, deploys the infrastructure, extracts auth and backend outputs from the CDK output file, and refuses to continue if the required auth values or migration function name are missing. Only after backend deployment succeeds does it invoke the migration Lambda.

After migrations succeed, the script switches to the frontend, builds the SPA with the auth values and GraphQL endpoints injected as environment variables, uploads the static assets to S3, and invalidates CloudFront when a distribution id is present.

This order matters: auth and backend infrastructure must exist before the frontend build needs the auth outputs, and migrations must complete before the frontend is published.

```mermaid
flowchart TD
  A[Start deploy.sh] --> B[Validate ENV and read SSM config]
  B --> C[Build backend]
  C --> D[Deploy infra-cdk]
  D --> E{Required CDK outputs present}
  E -->|no| F[Fail]
  E -->|yes| G[Invoke migration Lambda]
  G --> H{Migration status 200}
  H -->|no| F
  H -->|yes| I[Build frontend]
  I --> J[Upload to S3]
  J --> K{CloudFront id present}
  K -->|yes| L[Invalidate cache]
  K -->|no| M[Skip invalidation]
```

## How these workflows connect

These flows are intentionally layered:

- the router gate keeps unauthenticated users out of protected views
- Apollo context authenticates each GraphQL request again on the backend
- assistant chat persists history only after a successful model call
- Telegram processing reuses assistant chat but does not persist Telegram-specific state itself
- quick-entry transaction creation validates, invokes the agent, then resolves the created transaction through the transactional service layer
- deployment always builds and deploys backend pieces before publishing the frontend

For code changes, the main entrypoints to inspect are `frontend/src/router/index.ts`, `backend/src/server.ts`, `backend/src/graphql/resolvers/assistant-resolvers.ts`, `backend/src/services/assistant-chat-service.ts`, `backend/src/services/create-transaction-from-text-service.ts`, `backend/src/services/process-telegram-message-service.ts`, `backend/src/scripts/migrate.ts`, and `deploy.sh`.
