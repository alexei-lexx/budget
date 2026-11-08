# Design

## Context

See `proposal.md` for the motivation and scope.

Current eval setup in `backend/`:

- `vitest.evals.config.ts` runs `src/**/*.eval.test.ts` with `maxWorkers: 1`, `testTimeout: 100000`, the `langsmith/vitest/reporter`, and the `langsmith-flush.ts` setup file
- The unit project in `vitest.config.ts` includes `src/**/*.test.ts` and excludes `*.db.test.ts`, `*.int.test.ts`, and `*.eval.test.ts`
- All test scripts load `.env.test` through `dotenvx run -f .env.test`
- `create-transaction-agent.eval.test.ts` uses `ls.describe` and `ls.test`; `beforeEach` truncates all tables and creates the user; the `testToolCalls` helper seeds the database from the test inputs, invokes the agent, and asserts the `agentevals` trajectory superset match
- `docker-compose.yml` runs DynamoDB Local and DynamoDB Admin

Facts from the Phoenix docs and the installed package source:

- `@arizeai/phoenix-client/vitest` (beta) maps `describe` to a dataset and an experiment, `test` to a dataset example and an experiment run, and the assertion result to a `pass` annotation
- The suite registers its own tracer provider as the global provider and flushes it when the suite ends
- A test with a stable `id` upserts the same dataset example on each run; this needs Phoenix server 15.0.0 or later
- The newest server capability that `@arizeai/phoenix-client` 7.18.2 checks needs Phoenix server 20.12.0
- `px.evaluate()` runs a `@arizeai/phoenix-evals` evaluator and records its result as an annotation with an evaluator trace
- The tool evaluators of `@arizeai/phoenix-evals` are LLM judges, not deterministic matches

## Goals / Non-Goals

**Goals:**

- The 2 new cases pass and fail under the same conditions as the original cases
- Each run in Phoenix shows the `pass` annotation, the `trajectory_superset_match` score, and the agent trace with the LangChain spans
- Two runs of `test:phoenix-evals` give two experiments on one dataset that the Phoenix compare view can show side by side

**Non-Goals:**

- No shared helper module between the old and the new eval files
- No LLM judge in the new cases
- No Phoenix trace export for the old evals

## Decisions

### Decision 1: Native Phoenix Vitest integration

The new file uses `import * as px from "@arizeai/phoenix-client/vitest"` with `px.describe` and `px.test`, as the Phoenix Vitest guide shows.

Alternatives:

- `runExperiment` from `@arizeai/phoenix-client`: one task and one evaluator set for all examples; the guide recommends the test-runner integration when cases need their own setup and hard assertions
- Custom glue code over the Phoenix REST API inside the `langsmith/vitest` tests: more code to own, and not the documented path

### Decision 2: Copy the 2 cases and their setup

The new file copies the agent setup, `beforeEach`, `seedDatabase`, `testId`, and the inputs and references of "creates expense transaction" and "creates income transaction".

Mapping:

| Old                                   | New                                                               |
| ------------------------------------- | ----------------------------------------------------------------- |
| `ls.describe(name, fn, { metadata })` | `px.describe("CreateTransactionAgent", fn, { metadata })`         |
| `ls.test(name, { inputs, ... }, fn)`  | `px.test(name, { id: testId(name), input, expected }, fn)`        |
| `referenceOutputs.toolCalls`          | `expected.toolCalls`                                              |
| `ls.logOutputs({ answer })`           | `px.logOutput({ answer })`                                        |
| `expect(result.score).toBe(true)`     | `px.evaluate(trajectoryMatch, ...)`, then `expect(score).toBe(1)` |

Quality parity:

- Same agent factory, dependencies, `createMockLogger()`, and `LANGCHAIN_MODEL_ID`
- Same `testOnlyPromptCacheIsolationPrefix` with a new UUID for each run
- Same `beforeEach`: `truncateAllTables`, then the user with `testId("current-user")`
- Same `seedDatabase`, inputs, `today`, and agent context
- Same `testId` namespace UUID, so the agent sees the same IDs as in the old cases
- Same evaluator: `createTrajectoryMatchEvaluator` with `superset` mode and `toolArgsMatchOverrides` from the reference
- Same suite metadata `{ agentModelId, judgeModelId }`
- 1 repetition; `PHOENIX_TEST_REPETITIONS` stays unset

A copy keeps the old file unchanged.
A shared module is not necessary for 2 cases in a proof of concept.

### Decision 3: Trajectory match as a Phoenix CODE evaluator

`createEvaluator` from `@arizeai/phoenix-evals` wraps the `agentevals` superset match with `{ name: "trajectory_superset_match", kind: "CODE" }`.
The function converts the boolean result to `1` or `0`, because the Phoenix evaluation score is a number.
The test calls `px.evaluate()` with the agent messages and the reference tool calls, then asserts `expect(score).toBe(1)`.

- The trajectory match is a hard invariant, so the test keeps a per-case `expect()`
- `px.evaluate()` records the named score with an evaluator trace, the same information that LangSmith shows for the old cases
- `expect(score).toBe(1)` passes under the same condition as `expect(result.score).toBe(true)`

Alternatives:

- `createToolSelectionEvaluator` or `createToolInvocationEvaluator` from `@arizeai/phoenix-evals`: LLM judges, so the score changes
- `expect()` only: Phoenix shows only `pass`, without the named score
- `px.logAnnotation()`: no evaluator trace

### Decision 4: LangChain instrumentation in the eval file

The Phoenix suite creates only the task span of each test run.
Without the LangChain instrumentation, the trace of a run has no LLM calls and no tool calls.

The new eval file instruments LangChain at the top, before the agent is created:

- At module load: `new LangChainInstrumentation().manuallyInstrument(CallbackManagerModule)`
- In `afterEach`: `await awaitAllCallbacks()`

The instrumentation has no own tracer provider.
It uses the global provider, which the Phoenix suite registers, so the LangChain spans become child spans of the task span.

LangChain runs callbacks in the background.
`afterEach` waits for them, so the last spans of each test end before the suite flushes the provider when it ends.

Alternative:

- A Vitest setup file: reusable by more eval files, but the proof of concept has 1 eval file

### Decision 5: Separate Vitest config and npm script

`vitest.phoenix-evals.config.ts`:

- `include: ["src/**/*.phoenix-eval.test.ts"]`
- `reporters: ["default", "@arizeai/phoenix-client/vitest/reporter"]`
- `environment: "node"`, `maxWorkers: 1`, `testTimeout: 100000`, the same as the old eval config

Script: `"test:phoenix-evals": "dotenvx run -f .env.test -- vitest run --config vitest.phoenix-evals.config.ts"`.

The suffix `.phoenix-eval.test.ts` does not match `*.eval.test.ts`, so the old eval config does not run the new file.
The unit project matches `*.test.ts`, so its `exclude` list gets `**/*.phoenix-eval.test.ts`.

### Decision 6: Phoenix service in `docker-compose.yml`

- Image: `arizephoenix/phoenix:version-21.0.0`, pinned like `dynamodb-local`, and newer than the required 20.12.0
- Port: `6006:6006` for the UI, the REST API, and OTLP over HTTP
- Data: `PHOENIX_WORKING_DIR=/mnt/data` with the volume `./docker/phoenix:/mnt/data`
- `.gitignore` excludes `docker/phoenix/*` and keeps `docker/phoenix/.gitkeep`, the same as `docker/dynamodb/`

### Decision 7: Configuration

- `.env.test.example` gets `PHOENIX_ENDPOINT=http://localhost:6006`
- A comment tells how to run without Phoenix: `PHOENIX_TEST_TRACKING=false`
- `@arizeai/phoenix-client` is pinned to an exact version, because the Vitest API is beta

## Risks / Trade-offs

- [The Vitest API is beta and can change] → exact version pin; the proof of concept decides about a wider use
- [LangChain spans do not nest under the test run span] → the first run confirms it; the fallback is `tracerProvider` from the suite passed to the instrumentation
- [The copied setup drifts from the old file] → the copy is temporary; the decision after the proof of concept removes one of the files
- [Phoenix is not running] → the Phoenix sync fails; `PHOENIX_TEST_TRACKING=false` runs the tests without Phoenix

## Migration Plan

1. `docker compose up -d phoenix` in `backend/`
2. `npm install` in `backend/`
3. Add `PHOENIX_ENDPOINT` to `.env.test`
4. `npm run test:phoenix-evals` two times
5. Open `http://localhost:6006`, select the `CreateTransactionAgent` dataset, and compare the two experiments

Rollback: revert the commit.

## Constitution Compliance

- **General Requirements**: Phoenix runs locally in Docker and costs nothing. Compliant
- **Vendor Independence**: traces use OpenTelemetry and OpenInference; `PHOENIX_ENDPOINT` comes from the environment. Compliant
- **Test Strategy**: the new eval file is co-located next to the agent. Compliant
- **Code Quality Validation**: typecheck and lint cover the new files; the unit suite does not run the new eval file. Compliant
- **Backend Hexagonal Architecture**: no change to the core or the adapters. Not applicable
