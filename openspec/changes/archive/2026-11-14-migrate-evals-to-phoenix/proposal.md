# Proposal

## Why

The proof of concept showed that the local Phoenix service can replace LangSmith for the agent evals.
The backend now has 3 kinds of tests that call a real model:

- 39 LangSmith evals in `create-transaction-agent.eval.test.ts`
- 2 Phoenix copies in `create-transaction-agent.phoenix-eval.test.ts`
- 12 integration tests in `create-transaction-agent.int.test.ts` and `assistant-agent.int.test.ts`, with plain pass or fail and no scores

The LangSmith evals need a LangSmith account.
3 of the 4 create transaction integration tests repeat evals with weaker checks.
The assistant agent has no evals.
The backend README does not tell how to run evals, name an experiment, or open the Phoenix UI.

## What Changes

- All 39 create transaction evals move to Phoenix in `create-transaction-agent.eval.test.ts`
- New create transaction eval from the integration tests: no transaction when the user has no accounts
- New Phoenix eval suite `assistant-agent.eval.test.ts` with the 8 assistant integration cases: the assistant calls the expected tool for each request
- **BREAKING** (local scripts): the integration tests, the `integration` Vitest project, and the `test:integration` script are removed
- Each eval gets a named Phoenix score, and passes only at score 1:
  - `tool_calls_match` (CODE): the agent calls the reference tools with the reference args
  - `no_transaction_created` (CODE): the agent does not call the create transaction tool
  - `judge_rating` (LLM): a judge from `@arizeai/phoenix-evals` rates the trajectory against the criteria on a 1 to 5 scale, normalized to 0 to 1
- The LLM judge runs on the Vercel AI SDK and accepts only Bedrock models; the new dev dependency is `@ai-sdk/amazon-bedrock`
- **BREAKING** (local env): `JUDGE_LANGCHAIN_MODEL_ID` becomes `EVAL_JUDGE_MODEL_ID` with the same `provider:model` format; the ID must start with `bedrock:`
- `EVAL_EXPERIMENT_NAME` keeps its name and sets the Phoenix experiment name
- The Phoenix Vitest config becomes `vitest.evals.config.ts`, and `test:evals` runs it
- Removed: the proof of concept file `create-transaction-agent.phoenix-eval.test.ts`, `vitest.phoenix-evals.config.ts`, the `test:phoenix-evals` script, `langsmith-flush.ts`, `integration-matchers.ts`, and the `LANGSMITH_*` lines in `.env.test.example`
- `.env.test.example` gets a commented `PHOENIX_TEST_REPETITIONS` line
- The backend README gets a `test:evals` entry in "Quality Checks": start and stop Phoenix, run all evals or one eval, set the experiment name, set repetitions, run without Phoenix, open the Phoenix UI; the `test:integration` entry goes away

### Non-Goals

- No change to production, staging, or development tracing; LangSmith tracing in Lambda stays
- No removal of the `langsmith` dependency and its patch; Lambda tracing uses them
- No change to the inputs or expectations of the 39 existing cases
- No new cases other than the 9 cases from the integration tests
- No change to the agent code

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The change affects only the local test tooling and its docs, so the change sets `skip_specs: true`.

## Impact

- `backend/src/langchain/agents/create-transaction-agent.eval.test.ts`: rewritten for Phoenix, 1 new case
- `backend/src/langchain/agents/assistant-agent.eval.test.ts`: new, 8 cases
- `backend/src/langchain/agents/*.int.test.ts` and `*.phoenix-eval.test.ts`: deleted
- `backend/src/utils/test-utils/`: new shared eval helpers; `langsmith-flush.ts` and `integration-matchers.ts` deleted
- `backend/vitest.evals.config.ts`: Phoenix reporter, no LangSmith reporter and setup file
- `backend/vitest.phoenix-evals.config.ts`: deleted
- `backend/vitest.config.ts`: no `integration` project, no `*.int.test.ts` and `*.phoenix-eval.test.ts` excludes
- `backend/package.json`: `test:evals` runs the Phoenix evals; `test:phoenix-evals` and `test:integration` removed; new dev dependency `@ai-sdk/amazon-bedrock`
- `backend/.env.test.example`: `EVAL_JUDGE_MODEL_ID`, `PHOENIX_TEST_REPETITIONS`, no `LANGSMITH_*`
- `backend/README.md`: eval docs, no `test:integration`
- Production code, Lambda handlers, and infrastructure: no change

## Constitution Compliance

- **General Requirements**: Phoenix is a free local Docker service; the judge calls Bedrock with pay-per-use keys. Compliant
- **Vendor Independence**: the tests no longer need a LangSmith account; the judge model comes from an env var in `provider:model` format; the judge accepts only Bedrock, and a different provider needs one more entry in the AI SDK provider registry. Compliant
- **Configuration**: the evals read their settings only from env vars. Compliant
- **Test Strategy**: the eval files stay next to the agents that they test; fewer kinds of tests keep the test suite small. Compliant
- **Code Quality Validation**: typecheck, lint, and the unit and DB test suite run on the change. Compliant
- **Backend Hexagonal Architecture**, **Schema-Driven Development**, **Result Pattern**: no change to production code. Not applicable
