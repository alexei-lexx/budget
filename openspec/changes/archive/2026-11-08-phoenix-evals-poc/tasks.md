# Tasks

## 1. Phoenix Service

- [x] 1.1 Add the `phoenix` service to `backend/docker-compose.yml` with `arizephoenix/phoenix:version-21.0.0`, port `6006:6006`, `PHOENIX_WORKING_DIR=/mnt/data`, and the volume `./docker/phoenix:/mnt/data`; verify that `docker compose up -d phoenix` starts and `http://localhost:6006` opens
- [x] 1.2 Add `docker/phoenix/*` and `!docker/phoenix/.gitkeep` to `backend/.gitignore` and create `backend/docker/phoenix/.gitkeep`; verify that `git status` shows only `.gitkeep` after Phoenix writes data
- [x] 1.3 Add `PHOENIX_ENDPOINT=http://localhost:6006` and a comment about `PHOENIX_TEST_TRACKING=false` to `backend/.env.test.example`; verify the file contents

## 2. Dependencies and Runner

- [x] 2.1 Add the devDependencies `@arizeai/phoenix-client` (exact version), `@arizeai/phoenix-evals`, and `@arizeai/openinference-instrumentation-langchain` in `backend/`; verify that `npm install` succeeds
- [x] 2.2 Create `backend/vitest.phoenix-evals.config.ts` with `include: ["src/**/*.phoenix-eval.test.ts"]`, the `default` and Phoenix reporters, `environment: "node"`, `maxWorkers: 1`, and `testTimeout: 100000`; verify with `npm run typecheck`
- [x] 2.3 Add the script `test:phoenix-evals` to `backend/package.json` with `dotenvx run -f .env.test -- vitest run --config vitest.phoenix-evals.config.ts`; verify that the script runs and reports that no test files are found
- [x] 2.4 Add `**/*.phoenix-eval.test.ts` to the `exclude` list of the unit project in `backend/vitest.config.ts`; verify that `npm run test:unit` does not list the new file

## 3. Phoenix Eval File

- [x] 3.1 Create `backend/src/langchain/agents/create-transaction-agent.phoenix-eval.test.ts` with the LangChain instrumentation at module load, `afterEach(awaitAllCallbacks)`, and the copied agent setup, `beforeEach`, `seedDatabase`, and `testId` from `create-transaction-agent.eval.test.ts`; verify with `npm run typecheck`
- [x] 3.2 Add the `trajectory_superset_match` CODE evaluator with `createEvaluator` that wraps the `agentevals` superset match and returns `1` or `0`; verify with `npm run typecheck`
- [x] 3.3 Add the cases "creates expense transaction" and "creates income transaction" with `px.test`, `id: testId(name)`, the copied inputs and references, `px.logOutput`, `px.evaluate`, and `expect(score).toBe(1)`; verify that `PHOENIX_TEST_TRACKING=false npm run test:phoenix-evals` passes both cases
- [x] 3.4 Run `npm run typecheck` and `npm run format` in `backend/`; verify that both finish without errors

## 4. Proof of Concept Check

- [x] 4.1 Run `npm run test:phoenix-evals` two times with Phoenix running; verify that Phoenix shows the `CreateTransactionAgent` dataset with 2 examples and 2 experiments
- [x] 4.2 Open a run in Phoenix; verify that it shows the `pass` and `trajectory_superset_match` annotations and that its trace has the LangChain LLM and tool spans as child spans of the task span
- [x] 4.3 Compare the two experiments in Phoenix; verify that the compare view shows both runs of each case side by side with their scores

## Constitution Compliance

- **General Requirements**: Phoenix runs locally in Docker; no cloud service. Compliant
- **Vendor Independence**: `PHOENIX_ENDPOINT` comes from the environment; traces use OpenTelemetry. Compliant
- **Test Strategy**: the eval file is co-located next to the agent; the eval cases are the tests of this change, so no other tests are written first. Compliant
- **Code Quality Validation**: tasks 2.2, 3.1, 3.2, and 3.4 run typecheck and lint; task 2.4 keeps the unit suite free of LLM calls. Compliant
