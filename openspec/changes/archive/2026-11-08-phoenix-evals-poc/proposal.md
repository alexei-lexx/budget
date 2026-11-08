# Proposal

## Why

The create-transaction agent evals record experiments in LangSmith cloud, and the LangSmith usage for this month is exhausted.
The evals need a local, free UI that compares experiments and shows score increases and decreases between runs.
This proof of concept tries Arize Phoenix with its native Vitest integration on 2 eval cases before a decision to replace the LangSmith evals.

## What Changes

- New eval file `create-transaction-agent.phoenix-eval.test.ts` with 2 cases copied from the existing evals: "creates expense transaction" and "creates income transaction"
- The new file uses `@arizeai/phoenix-client/vitest`: `describe` creates a Phoenix dataset and an experiment, `test` creates a dataset example and an experiment run
- The new cases evaluate with the same quality as the existing cases: same agent setup, database fixtures, trajectory match evaluator, and assertion
- The trajectory match result is recorded in Phoenix as a named score with an evaluator trace, through `@arizeai/phoenix-evals`
- LangChain spans go to Phoenix through the OpenInference LangChain instrumentation and show as child spans of each test run
- New Vitest config and npm script `test:phoenix-evals` run only the new file with the Phoenix reporter
- The unit test project excludes the new file suffix
- `backend/docker-compose.yml` gets a Phoenix service with a data volume
- `.env.test.example` documents the Phoenix endpoint
- The existing `langsmith/vitest` evals do not change

### Non-Goals

- No migration of the other eval cases
- No removal of the LangSmith evals or of `langsmith/vitest`
- No change to production, staging, or development tracing
- No acceptance criteria on aggregate scores
- No ADR; the ADR comes with the decision to replace the LangSmith evals

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The change affects only the developer eval tooling, so the change sets `skip_specs: true`.

## Impact

- `backend/src/langchain/agents/create-transaction-agent.phoenix-eval.test.ts`: new eval file
- `backend/vitest.phoenix-evals.config.ts`: new Vitest config
- `backend/vitest.config.ts`: the unit project excludes `*.phoenix-eval.test.ts`
- `backend/package.json`: new script `test:phoenix-evals` and new devDependencies `@arizeai/phoenix-client`, `@arizeai/phoenix-evals`, and `@arizeai/openinference-instrumentation-langchain`
- `backend/docker-compose.yml` and `backend/.gitignore`: Phoenix service and its data directory
- `backend/.env.test.example`: `PHOENIX_ENDPOINT`
- Production code, Lambda handlers, and infrastructure: no change

## Constitution Compliance

- **General Requirements**: Phoenix runs locally in Docker and costs nothing; no new cloud service. Compliant
- **Vendor Independence**: the eval traces use OpenTelemetry and OpenInference; the Phoenix endpoint comes from an environment variable. Compliant
- **Test Strategy**: the new eval file is co-located next to the agent. Compliant
- **Code Quality Validation**: typecheck and lint cover the new files. Compliant
- **Backend Hexagonal Architecture**, **Schema-Driven Development**, **Result Pattern**: no change to the core, GraphQL, or services. Not applicable
