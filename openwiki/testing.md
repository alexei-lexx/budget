---
type: testing guide
title: Testing
description: How the repository’s unit, repository, integration, eval, frontend, and infrastructure tests are organized, what each suite validates, and how to choose the narrowest useful validation for a change.
tags: [testing, verification, vitest, backend, frontend, infrastructure]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-06T08:09:31.070Z
sources:
  - id: openwiki-source-9a7277933ab0110af5cb7cbe
    resource: repo://backend/package.json
  - id: openwiki-source-6cd293b047896e60f995896f
    resource: repo://backend/src/repositories/dyn-transaction-repository.test.ts
  - id: openwiki-source-c8c2c77176d3423469356bb5
    resource: repo://backend/src/services/assistant-service.test.ts
  - id: openwiki-source-1047363cf615000e4c9bb694
    resource: repo://frontend/package.json
  - id: openwiki-source-b4616ec9243b6c4bf9f63160
    resource: repo://frontend/src/composables/useAssistant.test.ts
  - id: openwiki-source-77c413f182fc2eead5535edb
    resource: repo://frontend/src/router/index.ts
  - id: openwiki-source-f4a2ce27725d9eae2abac014
    resource: repo://infra-cdk/package.json
  - id: openwiki-source-76158408444ea2b1b27970df
    resource: repo://infra-cdk/test/backend-cdk.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-06T08:09:31.070Z" }
---

# Testing

This page is the practical map for validating changes in this repository. The main idea is to start with the narrowest suite that covers the behavior you changed, then widen only if the change crosses a boundary such as persistence, the frontend/backend contract, or infrastructure shape.

## Test surfaces by package

### Backend

`backend/package.json` defines these relevant scripts:

- `npm run test` — runs the backend unit and repository Vitest projects under `.env.test`
- `npm run test:unit` — unit project only
- `npm run test:repositories` — repository project only
- `npm run test:integration` — integration project only
- `npm run test:evals` — eval project only
- `npm run test:coverage` — unit plus repository coverage run
- `npm run build` — codegen, typecheck, clean, bundle, and schema copy

The backend test commands all run through `dotenvx` with `.env.test` for the suite-specific tasks, so tests that hit real infrastructure depend on the test environment being present and configured.

### Frontend

`frontend/package.json` defines:

- `npm run test` — Vitest for the frontend project
- `npm run test:watch` — watch mode for the same suite
- `npm run test:coverage` — coverage run
- `npm run build` — schema sync, codegen, typecheck, and Vite build

### Infrastructure

`infra-cdk/package.json` defines:

- `npm run test` — Vitest for CDK assertions
- `npm run synth` — synthesize the stack
- `npm run diff` — compare local stack shape to deployed state
- `npm run build` — TypeScript compile

## What each suite is for

### Unit tests

Unit tests are the fastest feedback loop for local logic. They are the right first choice when you changed parsing, validation, orchestration, adapters with mocked dependencies, or other code whose behavior can be isolated without a database, HTTP server, or deployed stack.

In this repository, `backend/src/services/assistant-service.test.ts` is a good example of a unit suite: it mocks the assistant agent and verifies the service trims user input, forwards `userId`, injects today’s date and voice-input context, prepends history before the latest question, and preserves the agent’s response shape. That makes it a focused check for service-level request shaping rather than a full agent run.

The frontend composable tests in `frontend/src/composables/useAssistant.test.ts` are also unit-style tests: they mock the generated Apollo mutation hook and verify that `useAssistant()` creates an abort signal for requests and that `abortAskAssistant()` is safe to call. These tests are useful when changing the assistant UI control flow without needing to render the full page.

### Repository tests

Repository tests exercise persistence behavior against the test database. They matter when a change could alter query shape, filtering, sort order, pagination, optimistic locking, or mapping between domain objects and stored records.

`backend/src/repositories/dyn-transaction-repository.test.ts` shows the pattern. It uses the real DynamoDB document client, reads table configuration from `TRANSACTIONS_TABLE_NAME`, and truncates the transactions table before each test. Those tests verify behaviors such as excluding archived transactions, respecting currency filters, paginating per user, and filtering by account or category IDs.

Because repository suites hit real storage, they are the first place where test DB setup matters. Before editing or running them, make sure the test DynamoDB tables exist and that the helper setup can truncate them safely between cases.

### Integration tests

Integration tests are for cross-component behavior that is more realistic than an isolated unit test but still narrower than a full end-to-end run. In backend terms, this is the right layer when a change crosses service boundaries, HTTP/GraphQL wiring, or multiple application layers at once.

Use integration tests when the service logic alone is not enough to prove the behavior and the repository layer is part of the contract being exercised.

### Eval tests

Eval tests are the specialized backend suite for AI or agent-quality checks. Use them when the change affects prompt behavior, tool selection, response quality, or other assistant behavior that is not well captured by ordinary unit assertions.

### Frontend tests

Frontend tests validate composables, components, and route-driven UI behavior in a browser-like environment. They are the right narrow check when a change affects page state, button behavior, mutation wiring, navigation, or abort handling.

The router definition in `frontend/src/router/index.ts` is important context for those tests: authenticated routes like `/accounts`, `/categories`, `/transactions`, `/reports/by-category`, `/trends`, `/assistant`, and `/settings` all use the shared `requireAuth` guard, while the sign-in route does not. If you change route access or landing behavior, target the router-adjacent frontend tests first.

### Infrastructure tests

Infrastructure tests validate CDK stack shape through assertions. `infra-cdk/test/backend-cdk.test.ts` is a minimal example: it synthesizes a backend stack and checks that the API Gateway HTTP API is present.

Run these tests when you change stack composition, permissions, environment variables, outputs, or resource relationships. If the change may affect the synthesized template, pair the test run with `cdk synth` or `cdk diff` so you can inspect the generated infrastructure directly.

## Fixtures, mocks, and test database setup

A few setup details are easy to miss but matter a lot:

- Backend service tests typically mock agents and other collaborators, so failures there usually point to orchestration or request-shaping changes rather than external systems.
- Frontend composable tests commonly mock generated Apollo hooks. If a test starts failing after GraphQL codegen changes, make sure the generated module path and mock shape still match the generated client.
- Repository tests use real storage and usually rely on helpers such as `truncateTable`. They also depend on environment variables like `TRANSACTIONS_TABLE_NAME` and a test database that is already running and initialized.
- The CDK stack test in `infra-cdk/test/backend-cdk.test.ts` creates an empty `backend/dist` directory before synthesis because the stack references `lambda.Code.fromAsset("../backend/dist")`. Without that placeholder, synthesis would fail in CI when the backend has not been built yet.

## Choosing the narrowest useful validation

A good default is:

1. Change pure logic? Run the smallest unit test file or package project that covers it.
2. Change persistence or filtering semantics? Add or run the repository test(s) that touch the affected query path.
3. Change the assistant flow or prompt contract? Run the service tests first, then the eval suite if quality or tool behavior matters.
4. Change UI behavior? Run the relevant frontend composable or component tests before a full frontend suite.
5. Change stack shape? Run the CDK test plus `cdk synth` or `cdk diff`.

A practical example is assistant work: if you adjust backend request shaping only, `backend/src/services/assistant-service.test.ts` is the narrowest useful validation. If the UI now starts or aborts assistant requests differently, add `frontend/src/composables/useAssistant.test.ts`. If the change also affects agent quality, add `npm run test:evals` in the backend package.

Another example is transaction data access: if you change filtering or pagination, start with the repository tests, because they exercise the real DynamoDB behavior and the table truncation setup. Only widen to backend service or integration tests if the repository change affects a higher-level workflow.

## Operational notes

- Backend `npm run test` does not include evals or integration by default; run those explicitly when needed.
- Frontend `npm run build` includes schema synchronization and code generation, so build failures can reflect contract drift rather than view logic alone.
- Infrastructure changes should be checked both by assertion tests and by synthesized output, because the important failure mode is often a subtle resource or permission change that still compiles.

## High-signal files to inspect when a suite fails

- `backend/src/services/*.test.ts`
- `backend/src/repositories/*.test.ts`
- `backend/src/server.test.ts`
- `backend/src/server.ts`
- `frontend/src/composables/*.test.ts`
- `frontend/src/router/index.ts`
- `infra-cdk/test/*.test.ts`
- generated GraphQL artifacts if a schema change rippled through the client
