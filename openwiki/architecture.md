---
type: system-architecture
title: System architecture
description: End-to-end architecture for the Vue SPA, GraphQL/Lambda backend, Cognito authentication, DynamoDB persistence, and CloudFront/CDK deployment, including AI, Telegram, and MCP entry paths.
tags: [architecture, runtime, graphql, frontend, backend, aws]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-20T15:02:07.269Z
sources:
  - id: openwiki-source-4e38730dbdb863cc91804ce6
    resource: repo://backend/src/graphql/resolvers/index.ts
  - id: openwiki-source-3ef7b141b339c0260aabd5e3
    resource: repo://backend/src/lambdas/telegram-webhook-handler.ts
  - id: openwiki-source-e134eec1e9c8a9a7cc9c133d
    resource: repo://backend/src/lambdas/web.ts
  - id: openwiki-source-aa4e428ae023b131766550e4
    resource: repo://backend/src/mcp/server.ts
  - id: openwiki-source-5d555e7fb0c2a28fa1fe774c
    resource: repo://backend/src/server.ts
  - id: openwiki-source-8c5b5dad189ab833d33fad1e
    resource: repo://frontend/src/composables/useCreateTransactionFromText.test.ts
  - id: openwiki-source-1e41517fc4d05dbdcf6e1dd1
    resource: repo://frontend/src/composables/useCreateTransactionFromText.ts
  - id: openwiki-source-69b522f10ffdb79d601b4fcf
    resource: repo://frontend/src/main.ts
  - id: openwiki-source-f4e1fcd7fb448b2d6f9cfb5d
    resource: repo://infra-cdk/lib/auth-cdk-stack.ts
  - id: openwiki-source-f79a31b0557004763509ee18
    resource: repo://infra-cdk/lib/backend-cdk-stack.ts
  - id: openwiki-source-1647748b461059b80c532cd9
    resource: repo://infra-cdk/lib/frontend-cdk-stack.ts
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "openwiki/0.5.2", at: "2026-09-20T15:02:07.269Z" }
---

# System architecture

This repository is split into three major layers:

- a Vue single-page application in `frontend/`
- a GraphQL API and supporting Lambdas in `backend/`
- AWS CDK infrastructure in `infra-cdk/`

The architectural boundary that matters most is that application behavior lives in the backend and frontend code, while AWS resources, permissions, routing, and hosting are defined in CDK. The GraphQL schema and generated client/resolver types sit between those layers: they are generated artifacts that encode the contract, but the actual behavior still comes from resolver, service, and composable code.

## Runtime responsibilities

### Frontend SPA

`frontend/src/main.ts` mounts the Vue app, installs auth, i18n, Vuetify, and routing plugins, and provides the Apollo client to the component tree. That file is the entrypoint for browser runtime only; it does not own persistence or authorization rules.

The frontend’s main job is to collect user input, call generated GraphQL operations, and render returned state. For example, the create-transaction-from-text composable sends the mutation, passes an abort signal, preserves failed input, and only clears the text after a successful transaction is returned.

### GraphQL backend

`backend/src/server.ts` constructs the Apollo Server and loads `backend/src/graphql/schema.graphql`. It also builds a fresh GraphQL context per request. That context is where request-scoped auth, repositories, services, and DataLoaders are wired together.

The resolver index in `backend/src/graphql/resolvers/index.ts` composes domain-specific resolver modules. It also defines union resolution for `AgentTraceMessage` by mapping the service-layer discriminated union into GraphQL concrete types.

The Lambda entrypoint in `backend/src/lambdas/web.ts` multiplexes three kinds of runtime traffic:

- GraphQL requests are handled by Apollo
- Telegram webhook calls are routed directly to the Telegram handler
- MCP traffic is routed directly to the MCP handler

It also forces `/.well-known/*` discovery paths to return 404 instead of falling through to Apollo, which avoids confusing MCP/OAuth clients with CSRF errors.

### Persistence and domain services

DynamoDB is the primary persistence layer. The backend context injects repositories and services, but request handlers do not talk to tables directly. They go through service and repository boundaries, which keeps persistence access constrained and makes it easier to preserve per-user isolation.

The CDK backend stack defines separate tables for users, accounts, categories, transactions, chat messages, migrations, Telegram bots, and trend presets, plus the secondary indexes needed for lookup patterns such as user email, MCP token, transaction date ordering, and Telegram webhook secret lookup.

### Authentication

Cognito is the authentication boundary for the browser-facing app. The auth stack creates a user pool, a public SPA client, a hosted UI domain, and a pre-token-generation Lambda that injects namespaced email claims into access tokens.

The important invariant is that email is required and immutable in Cognito because the app uses it as the user identifier for persisted data. Changing it would orphan DynamoDB records. The SPA uses an authorization-code flow, and the backend verifies JWTs against the configured issuer and client ID.

### Outbound integrations

The backend can call out to three main integration paths:

- AI services for assistant chat and natural-language transaction creation
- Telegram bot services for incoming webhook traffic and bot replies
- MCP tools and token-authenticated MCP requests for external AI clients

These integrations are all behind backend services or Lambda handlers rather than being invoked directly from the browser.

## End-to-end request boundaries

```mermaid
sequenceDiagram
  participant Browser
  participant CF as CloudFront
  participant S3 as S3 static site
  participant API as API Gateway
  participant Web as Web Lambda
  participant GraphQL as Apollo Server
  participant Auth as Cognito
  participant DB as DynamoDB
  participant AI as AI services
  participant TG as Telegram
  participant MCP as MCP clients

  Browser->>CF: Load SPA assets
  CF->>S3: Fetch index and static files
  Browser->>Auth: Sign in through Hosted UI
  Browser->>CF: Send GraphQL request
  CF->>API: Forward /graphql
  API->>Web: Invoke web Lambda
  Web->>GraphQL: Create context and execute operation
  GraphQL->>Auth: Verify JWT claims
  GraphQL->>DB: Read and write through repositories
  GraphQL->>AI: Call assistant or transaction agents when needed
  Browser->>CF: Post Telegram webhook path is not used
  TG->>CF: Deliver webhook to /webhooks/telegram
  CF->>API: Forward webhook path
  API->>Web: Invoke web Lambda
  Web->>TG: Dispatch to Telegram handler and service
  MCP->>CF: Request /mcp
  CF->>API: Forward /mcp
  API->>Web: Invoke web Lambda
  Web->>MCP: Dispatch to MCP handler
```
This diagram shows the runtime split between browser delivery, GraphQL execution, and outbound integration paths.

## Deployment wiring

CloudFront is the public edge entrypoint for both the SPA and API traffic. The frontend stack provisions an S3 website origin for static assets and forwards `/graphql*` and `/mcp*` to API Gateway through an HTTP origin. It also supports an optional custom domain via Route 53 and an ACM certificate in `us-east-1`.

```mermaid
flowchart TD
  CDK["CDK app"] --> AuthStack["AuthCdkStack"]
  CDK --> BackendStack["BackendCdkStack"]
  CDK --> FrontendStack["FrontendCdkStack"]

  AuthStack --> Cognito["Cognito User Pool and client"]
  BackendStack --> Tables["DynamoDB tables"]
  BackendStack --> WebLambda["Web Lambda"]
  BackendStack --> BgLambda["Background job Lambda"]
  BackendStack --> MigLambda["Migration Lambda"]
  FrontendStack --> CF["CloudFront distribution"]
  FrontendStack --> S3["S3 website bucket"]
  FrontendStack --> API["HTTP API"]
  API --> WebLambda
  CF --> S3
  CF --> API
```
This wiring keeps deployment concerns in infrastructure code and runtime behavior in application code.

## Safe-change invariants

### Auth and request scoping

`backend/src/server.ts` creates a new GraphQL context for every request, and the account/category loaders are recreated per request with a lazy user-id lookup. That prevents cross-request cache leakage and keeps loader results scoped to the authenticated user.

For safe changes, preserve these rules:

- do not reuse GraphQL context objects across requests
- keep loader instances request-scoped
- keep user identity resolution tied to the authenticated request context
- do not let frontend code bypass the backend for protected data access

### Persistence boundaries

Backend code should continue to access DynamoDB through repositories and services, not directly from resolvers or UI code. That separation is what keeps user scoping, validation, and business rules centralized.

The DynamoDB table keys and indexes are part of the data contract. Changing them affects lookup paths for accounts, categories, transactions, chat messages, Telegram bots, and migrations.

### Integration boundaries

Telegram webhooks and MCP traffic are intentionally separated from the normal GraphQL request path inside the Lambda handler. If you add a new externally reachable path, decide whether it belongs in Apollo, a dedicated Lambda branch, or separate infrastructure entirely.

AI features are also mediated through service layers and Lambda runtime configuration. They are not a frontend-only concern, because the backend owns tool access, persistence, and validation.

## Extension points

The codebase has a few stable change surfaces:

- GraphQL behavior: resolver modules under `backend/src/graphql/resolvers/`
- backend orchestration and request scoping: `backend/src/server.ts`
- Lambda path multiplexing: `backend/src/lambdas/web.ts`
- browser bootstrap and client wiring: `frontend/src/main.ts`
- auth and token policy: `infra-cdk/lib/auth-cdk-stack.ts`
- table definitions, Lambda permissions, and runtime env wiring: `infra-cdk/lib/backend-cdk-stack.ts`
- CloudFront, S3, API routing, and optional custom domain setup: `infra-cdk/lib/frontend-cdk-stack.ts`

## Test signals that matter

The most relevant tests are the ones that protect architectural boundaries rather than just symbol existence:

- frontend composable tests that confirm transaction submission preserves abort behavior and input state on failure
- backend resolver and service tests that verify business rules and error translation remain inside the backend
- MCP and Telegram handler tests that confirm non-GraphQL paths are isolated from the Apollo request path
- infrastructure tests, if present, that verify the CDK wiring for auth, API routing, and table/index definitions

Those tests are important because they guard the system’s main invariants: authenticated request scoping, persistence isolation by user, and clear separation between browser traffic, GraphQL traffic, and outbound integrations.
