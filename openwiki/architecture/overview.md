---
type: system-architecture
title: Architecture Overview
description: Overview of the repository’s runtime shape, request surfaces, and AWS stack boundaries across the Vue SPA, GraphQL backend, MCP and Telegram entrypoints, and CDK infrastructure.
tags: [architecture, runtime, graphql, mcp, frontend, backend, aws]
verified:
  - by: openwiki/0.6.0
    at: 2026-09-27T13:28:59.762Z
sources:
  - id: openwiki-source-5bdefea72d4b7710439eee17
    resource: repo://backend/src/lambdas/mcp-handler.ts
  - id: openwiki-source-e134eec1e9c8a9a7cc9c133d
    resource: repo://backend/src/lambdas/web.ts
  - id: openwiki-source-aa4e428ae023b131766550e4
    resource: repo://backend/src/mcp/server.ts
  - id: openwiki-source-5d555e7fb0c2a28fa1fe774c
    resource: repo://backend/src/server.ts
  - id: openwiki-source-f4e1fcd7fb448b2d6f9cfb5d
    resource: repo://infra-cdk/lib/auth-cdk-stack.ts
  - id: openwiki-source-f79a31b0557004763509ee18
    resource: repo://infra-cdk/lib/backend-cdk-stack.ts
  - id: openwiki-source-1647748b461059b80c532cd9
    resource: repo://infra-cdk/lib/frontend-cdk-stack.ts
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "openwiki/0.6.0", at: "2026-09-27T13:28:59.762Z" }
---

# Architecture Overview

This repository is organized around three ownership boundaries:

- the Vue single-page application in `frontend/`
- the application runtime in `backend/`
- AWS infrastructure and deployment wiring in `infra-cdk/`

The important architectural rule is that browser behavior, GraphQL execution, MCP tooling, and Telegram handling are all implemented in backend code, while CDK defines the AWS resources, routing, permissions, and environment wiring that make those runtimes reachable.

## Runtime shape

The app is served as a CloudFront-backed SPA with API traffic routed through the same edge entrypoint. The frontend only owns browser bootstrap and client-side request initiation; it does not own data access or authorization policy.

The backend is a Lambda-based application server. It exposes GraphQL through Apollo, and it also multiplexes non-GraphQL requests for Telegram webhooks and MCP requests. That makes the backend the central runtime boundary where authentication, request scoping, and integration dispatch converge.

CDK provisions the AWS services that surround those runtimes: Cognito for browser authentication, DynamoDB for persistence, API Gateway for HTTP routing, CloudFront and S3 for the frontend, and optional Route 53 and ACM resources for a custom domain.

```mermaid
flowchart TD
  Browser["Browser SPA"] --> CF["CloudFront"]
  CF --> S3["S3 static site"]
  CF --> API["HTTP API"]
  API --> Web["Web Lambda"]
  Web --> GQL["Apollo GraphQL"]
  Web --> TG["Telegram handler"]
  Web --> MCP["MCP handler"]
  GQL --> DB["DynamoDB tables"]
  GQL --> Cognito["Cognito JWT auth"]
  MCP --> DB
  MCP --> Cognito
  TG --> DB
```

This diagram shows the main runtime split: CloudFront serves the browser application, API Gateway forwards dynamic requests to the web Lambda, and that Lambda dispatches into GraphQL, Telegram, or MCP processing.

## Request surfaces

### Browser and GraphQL

`backend/src/server.ts` constructs the Apollo Server and loads the GraphQL schema. It also creates a fresh request context for every request, which is where authenticated identity, repositories, services, and request-scoped DataLoaders are wired together.

`backend/src/lambdas/web.ts` is the main HTTP entrypoint. It routes requests by path:

- `/webhooks/telegram` goes to the Telegram webhook handler
- `/mcp` goes to the MCP handler
- `/.well-known/*` returns `404` so discovery probes do not fall through to Apollo
- everything else is handled by Apollo GraphQL

That path-based dispatch means GraphQL is not the only public surface, but it is the default surface for normal application traffic.

### MCP

MCP requests are authenticated separately from browser requests. `backend/src/lambdas/mcp-handler.ts` extracts a token from the query string, calls `createAuthenticatedMcpServer`, and returns `401 Unauthorized` when token authentication fails.

`backend/src/mcp/server.ts` binds the authenticated user to an `McpServer` instance and registers tool handlers that reuse backend services and repositories. The tools are user-scoped, so the MCP surface is not a generic database proxy; it is an authenticated extension point over the same backend domain model.

### Telegram

Telegram webhook traffic is isolated from GraphQL inside the web Lambda. The Lambda router sends `/webhooks/telegram` straight to the Telegram webhook handler, which keeps webhook processing separate from Apollo request parsing and GraphQL error handling.

## Ownership boundaries

### Frontend owns presentation and client workflow

The frontend mounts the Vue application and provides client-side infrastructure such as routing, auth integration, and Apollo client wiring. The browser code is responsible for collecting user input and issuing GraphQL operations, not for direct persistence or business-rule enforcement.

### Backend owns domain execution and integration policy

The backend owns the application’s runtime policy:

- GraphQL request context and error translation
- service and repository orchestration
- request-scoped identity resolution
- MCP tool registration and token authentication
- Telegram webhook dispatch
- AI-assisted features that need backend access to data and tools

The browser does not bypass the backend for protected data or integration access.

### CDK owns AWS resources and wiring

The infrastructure layer defines the deployable shape of the system rather than business logic.

- `infra-cdk/lib/auth-cdk-stack.ts` creates the Cognito user pool, SPA client, hosted UI domain, and pre-token-generation Lambda.
- `infra-cdk/lib/backend-cdk-stack.ts` creates DynamoDB tables, Lambdas, IAM permissions, runtime environment variables, backup configuration, and the HTTP API used by the web Lambda.
- `infra-cdk/lib/frontend-cdk-stack.ts` creates the CloudFront distribution, S3 origin, API routing behaviors, and optional custom domain resources.

```mermaid
flowchart LR
  CDK["CDK app"] --> AuthStack["AuthCdkStack"]
  CDK --> BackendStack["BackendCdkStack"]
  CDK --> FrontendStack["FrontendCdkStack"]

  AuthStack --> Cognito["Cognito user pool and client"]
  BackendStack --> Tables["DynamoDB tables"]
  BackendStack --> WebLambda["Web Lambda"]
  BackendStack --> BackgroundLambda["Background job Lambda"]
  BackendStack --> MigrationLambda["Migration Lambda"]
  FrontendStack --> Distribution["CloudFront distribution"]
  FrontendStack --> Assets["S3 static website bucket"]
  FrontendStack --> HttpApi["HTTP API"]
  HttpApi --> WebLambda
  Distribution --> Assets
  Distribution --> HttpApi
```

This diagram shows the deployment-level ownership split. Application code runs in Lambda and the browser, while AWS resources and connections are declared in CDK.

## AWS intersections that matter

### GraphQL and Cognito

Cognito is the authentication boundary for the browser-facing app. The auth stack uses email as the sign-in alias, makes email required and immutable, and creates a hosted UI client that uses the authorization-code flow. The backend then verifies JWTs against the configured issuer and client ID.

That design matters because email is also the persistent user identifier in the application data model. The architecture depends on identity staying stable so user-owned DynamoDB records are not orphaned.

### GraphQL and DynamoDB

The backend context injects repositories and services rather than letting resolvers talk to tables directly. The backend stack provisions separate tables for users, accounts, categories, transactions, migrations, chat messages, Telegram bots, and trend presets, plus indexes for email, MCP token, transaction ordering, and webhook-secret lookup.

The separation between resolver logic and storage access is an explicit boundary: GraphQL controls request-level behavior, but persistence access stays behind repositories and services.

### MCP and the backend stack

The backend stack’s HTTP API forwards `/mcp` to the web Lambda, and the web Lambda dispatches that path to the MCP handler. The MCP server then authenticates the token and exposes tool-based access to backend services.

This is the main place where GraphQL, MCP, and AWS routing intersect: they share the same public edge and Lambda runtime, but they remain separate request paths with different authentication and execution semantics.

### Telegram and the backend stack

Telegram webhooks are also routed through the web Lambda, but they are not treated as GraphQL operations. This keeps the webhook integration isolated from GraphQL concerns while still letting the Lambda share backend configuration and access to persistence or service layers.

## Control flow summary

```mermaid
sequenceDiagram
  participant Browser
  participant CF as CloudFront
  participant API as HTTP API
  participant Web as Web Lambda
  participant GQL as Apollo GraphQL
  participant Auth as Cognito
  participant DB as DynamoDB
  participant MCP as MCP handler
  participant TG as Telegram handler

  Browser->>CF: Load SPA assets
  CF->>Browser: Serve frontend from S3 origin
  Browser->>Auth: Sign in with Hosted UI
  Browser->>CF: Send GraphQL request
  CF->>API: Forward /graphql
  API->>Web: Invoke web Lambda
  Web->>GQL: Execute Apollo request
  GQL->>Auth: Verify JWT
  GQL->>DB: Read and write through repositories
  Browser->>CF: Send /mcp request
  CF->>API: Forward /mcp
  API->>Web: Invoke web Lambda
  Web->>MCP: Authenticate token and create MCP server
  Browser->>CF: Send /webhooks/telegram request
  CF->>API: Forward webhook path
  API->>Web: Invoke web Lambda
  Web->>TG: Dispatch Telegram webhook handler
```

This flow captures the main runtime relationships without mirroring the source tree: browser traffic, GraphQL execution, MCP tooling, and Telegram webhooks all meet in the same API/Lambda edge, but each follows its own internal path.

## Operational and change boundaries

The most important safe-change rule is to preserve the request boundaries:

- keep GraphQL context request-scoped
- keep MCP authentication separate from browser auth
- keep Telegram webhook dispatch out of the Apollo path
- keep storage access behind backend services and repositories
- keep AWS resource definition in CDK rather than application code

Relevant extension points are therefore architectural, not just file-based:

- GraphQL behavior and error handling in `backend/src/server.ts`
- Lambda path routing in `backend/src/lambdas/web.ts`
- MCP tool registration in `backend/src/mcp/server.ts`
- Cognito and token policy in `infra-cdk/lib/auth-cdk-stack.ts`
- table definitions, permissions, and runtime env wiring in `infra-cdk/lib/backend-cdk-stack.ts`
- CloudFront, S3, API routing, and custom-domain setup in `infra-cdk/lib/frontend-cdk-stack.ts`

The focused tests that matter most are the ones that protect those boundaries: GraphQL request-scoping behavior, MCP token handling, Telegram webhook routing, and CDK wiring for auth, routing, and tables.
