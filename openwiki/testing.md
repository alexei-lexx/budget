# Testing and verification

## Test commands by package

### Backend

`backend/package.json` defines:

- `npm run test` — unit + repository tests under the `.env.test` environment
- `npm run test:unit`
- `npm run test:repositories`
- `npm run test:integration`
- `npm run test:coverage`
- `npm run build` — includes code generation, typechecking, bundling, and schema copy

### Frontend

`frontend/package.json` defines:

- `npm run test`
- `npm run test:watch`
- `npm run test:coverage`
- `npm run build` — codegen, typecheck, and Vite build

### Infra

`infra-cdk/package.json` defines:

- `npm run test`
- `npm run synth`
- `npm run diff`
- `npm run build`

## What to test when changing each area

### GraphQL or service logic

Prefer to run the relevant backend unit tests first, then repository or integration tests if the change touches persistence or cross-service behavior.

### Assistant and voice flows

Changes in `backend/src/langchain/`, `backend/src/services/assistant-service.ts`, or `backend/src/services/create-transaction-from-text-service.ts` should be verified with the relevant agent and service tests, plus the frontend composable tests if UI behavior changed.

### Frontend UI and composables

If the change affects the assistant page, quick entry, or abort behavior, run the targeted Vitest tests in `frontend/src/components/` and `frontend/src/composables/`.

### Infrastructure

For stack changes, run `infra-cdk` tests and a synth or diff. If the change adds an environment variable, table, permission, or output, inspect the CDK output carefully.

## Testing culture clues from git history

The recent history includes multiple commits that align tests with a testing skill standard and several feature commits that added or updated tests alongside behavior changes. That suggests this repository expects tests to be updated as part of normal feature work, not as an afterthought.

Examples from the recent history you inspected:

- assistant/transaction voice-input handling and retry behavior
- abort support for in-flight AI requests
- test alignment work in repositories and services

## High-signal places to inspect during failures

- backend service tests under `backend/src/services/*.test.ts`
- repository tests under `backend/src/repositories/*.test.ts`
- frontend composable/component tests under `frontend/src/**/*.test.ts`
- infra tests under `infra-cdk/test/*.test.ts`
- generated GraphQL artifacts if a schema change has rippled through the client
