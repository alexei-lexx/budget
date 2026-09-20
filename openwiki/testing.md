---
type: testing guide
title: Testing and verification
description: Repository test entrypoints and how to choose the smallest useful test scope for backend, frontend, and infrastructure changes.
tags: [testing, verification, backend, frontend, infrastructure, vitest]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-20T15:02:07.269Z
sources:
  - id: openwiki-source-9a7277933ab0110af5cb7cbe
    resource: repo://backend/package.json
  - id: openwiki-source-25db427c1811bc00c2e7a9b3
    resource: repo://backend/src/services/assistant-chat-service.test.ts
  - id: openwiki-source-1047363cf615000e4c9bb694
    resource: repo://frontend/package.json
  - id: openwiki-source-b4616ec9243b6c4bf9f63160
    resource: repo://frontend/src/composables/useAssistant.test.ts
  - id: openwiki-source-f4a2ce27725d9eae2abac014
    resource: repo://infra-cdk/package.json
  - id: openwiki-source-76158408444ea2b1b27970df
    resource: repo://infra-cdk/test/backend-cdk.test.ts
generated: { by: "openwiki/0.5.2", at: "2026-09-20T15:02:07.269Z" }
---

# Testing and verification

This page summarizes the repository’s test layers, the canonical npm scripts for each layer, and the smallest useful checks to run when changing behavior.

## Test entrypoints by layer

### Backend

Use `backend/package.json` as the source of truth for backend verification commands:

- `npm run test` runs the default backend suite under `.env.test` and executes the `unit` and `repositories` Vitest projects.
- `npm run test:unit` runs only the backend unit project.
- `npm run test:repositories` runs only the repository project.
- `npm run test:integration` runs the integration project.
- `npm run test:evals` runs the evals project.
- `npm run test:coverage` runs unit and repository projects with coverage enabled.
- `npm run build` is not a test command, but it is a useful verification gate because it includes code generation, typechecking, bundling, and schema copy.

Backend test commands use `dotenvx run -f .env.test -- ...`, so they depend on the test environment file being present and correct. The package also provides `test:db:create`, `test:db:drop`, and `test:db:setup` helpers for cases where repository or integration tests need a real database schema.

### Frontend

Use `frontend/package.json` for frontend verification commands:

- `npm run test` runs the Vitest suite once.
- `npm run test:watch` keeps Vitest running in watch mode.
- `npm run test:coverage` runs the frontend suite with coverage.
- `npm run build` is a broader verification gate because it runs codegen, typecheck, and the Vite build.

### Infrastructure

Use `infra-cdk/package.json` for CDK verification commands:

- `npm run test` runs the CDK unit tests with Vitest.
- `npm run synth` renders the CloudFormation templates.
- `npm run diff` compares the stack against deployed state.
- `npm run build` typechecks the CDK app.

## How the test layers map to behavior

### Backend unit tests

Backend unit tests are the first choice for service-level logic, request shaping, and data flow that can be isolated with mocks. For example, `backend/src/services/assistant-chat-service.test.ts` checks that the chat service:

- creates a session id when one is not supplied,
- reuses a supplied session id,
- loads recent chat history and passes it to `AssistantService`,
- saves both the user message and assistant response after a successful call,
- forwards `isVoiceInput` to the assistant layer,
- avoids saving messages when the assistant call fails.

These tests are useful when you change orchestration, parameter plumbing, or error handling but do not need a real database or network dependency.

### Backend repository tests

Repository tests are the right scope when a change affects persistence behavior, query shape, or database invariants. They should usually be preferred over integration tests when the behavior can be verified with the repository boundary alone.

If the change requires table creation, seeding, or a known test database state, use the `test:db:*` helpers before running the repository suite.

### Backend integration tests

Integration tests are for behavior that crosses service boundaries or depends on real infrastructure wiring. Use them sparingly, only when a unit or repository test cannot validate the observable behavior.

A good rule is to start with `npm run test:unit`, then add `npm run test:repositories`, and only escalate to `npm run test:integration` when the change spans multiple backend layers or external dependencies.

### Backend eval tests

`npm run test:evals` is the dedicated entrypoint for eval-oriented checks. Use it when the change affects model behavior, prompt/agent quality, or other evaluation-specific flows rather than ordinary request handling.

### Frontend composables and components

Frontend Vitest tests should stay close to the interaction being changed. `frontend/src/composables/useAssistant.test.ts` is a good example of a narrow test: it verifies that `useAssistant()` passes an `AbortSignal` into the mutation and that `abortAskAssistant()` is safe to call.

Use targeted composable or component tests when the change affects UI state, mutation wiring, abort behavior, or generated GraphQL client usage. Prefer the smallest affected test file rather than a full frontend run when you only changed a single interaction.

### Infrastructure tests

CDK tests should verify stack shape and critical resources, not application behavior. `infra-cdk/test/backend-cdk.test.ts` demonstrates the pattern: it creates a placeholder `backend/dist` directory because the stack references `lambda.Code.fromAsset("../backend/dist")`, then synthesizes the stack and asserts that the HTTP API resource exists.

Use this layer when you change permissions, outputs, environment variables, tables, Lambdas, or other infrastructure wiring. Pair `npm run test` with `npm run synth` or `npm run diff` when you need to inspect the rendered infrastructure.

## Choosing the smallest useful check

Prefer the narrowest test that proves the changed behavior:

1. Start with a single unit or composable test when the change is local.
2. Add repository tests only if persistence behavior changed.
3. Escalate to integration tests only if the behavior crosses layers or depends on real wiring.
4. Use eval tests only for eval-specific changes.
5. Use CDK tests and synth/diff only for infrastructure changes.

This keeps verification focused while still catching regressions at the layer where they matter.
