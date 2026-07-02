# Development and deployment workflow

## Local development

The repository is split into three primary working directories, each with its own package scripts:

- `backend/`
  - `npm run dev` starts local infrastructure helpers, runs code generation, and launches the backend with `tsx`/`nodemon`.
  - `npm run test`, `npm run test:unit`, `npm run test:repositories`, and `npm run test:integration` cover the main test slices.
  - `npm run build` performs codegen, typecheck, bundle generation, and schema copying.
- `frontend/`
  - `npm run dev` runs GraphQL codegen and starts Vite.
  - `npm run test` runs Vitest.
  - `npm run build` typechecks and builds the SPA.
- `infra-cdk/`
  - `npm run synth`, `npm run diff`, and `npm run deploy` manage infrastructure.

The backend and frontend both generate typed GraphQL artifacts from the backend schema. The frontend script explicitly copies `backend/src/graphql/schema.graphql` into `frontend/src/schema.graphql` before code generation.

## Setup and environment

The README is the main bootstrap guide. It documents:

- required tooling: AWS CLI, Node.js, and `jq`
- deployment ordering
- SSM parameter names used for deployment-time and runtime configuration
- optional custom-domain setup in Route 53 and ACM

The infrastructure code in `infra-cdk/lib/backend-cdk-stack.ts` and `infra-cdk/lib/frontend-cdk-stack.ts` explains which values are required by the runtime and which are optional.

## Deployment

`deploy.sh` coordinates the full release flow. The README says it handles:

1. backend build
2. auth infrastructure deploy
3. backend infrastructure deploy
4. frontend infrastructure deploy
5. auth callback/logout URL updates
6. database migrations
7. frontend asset build/upload

The README also distinguishes between:

- deployment-time config, which is read during `deploy.sh`/CDK deployment
- runtime config, which is read by the backend Lambda on cold start

That distinction is important when changing environment variables or agent settings.

## Migrations and database setup

Backend scripts cover the local database lifecycle:

- `db:start` / `db:stop` manage the local Docker database
- `db:create`, `db:drop`, `db:recreate`, and `db:setup` manage table creation
- `migrate` runs schema migrations
- `db:seed` loads sample data

The source for this logic lives in `backend/src/scripts/` and `backend/src/migrations/`.

## AI-assisted workflows

The recent git history shows the assistant and quick-entry workflows changed together with frontend abort support and voice-input improvements:

- `frontend/src/composables/useAssistant.ts` handles assistant submission and aborts.
- `frontend/src/composables/useCreateTransactionFromText.ts` manages quick-entry submission, retry behavior, and aborts.
- `frontend/src/components/AgenticInput.vue` and related tests cover the interactive input behavior.

When changing these flows, prefer to inspect the service layer first, then the composables, then the view code.

## Recommended change sequence

For most feature work:

1. Update or confirm the relevant OpenSpec spec under `openspec/specs/`.
2. Change backend services or resolvers.
3. Update frontend composables/views.
4. Adjust infrastructure only if a new runtime resource or permission is required.
5. Run the affected package tests plus a build or typecheck.

## Useful commands

- `backend`: `npm test`, `npm run test:integration`, `npm run build`
- `frontend`: `npm test`, `npm run build`
- `infra-cdk`: `npm test`, `npm run synth`, `npm run diff`
- root deployment: `./deploy.sh`
