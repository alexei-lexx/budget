# Tasks

## 1. Dependencies and Shared Helpers

- [x] 1.1 In `backend/`, install `@ai-sdk/amazon-bedrock` as a dev dependency with the same `@ai-sdk/provider` major version as `ai` 7; verify that `npm ls @ai-sdk/provider` shows one major version and that `npm run typecheck` passes
- [x] 1.2 Create `backend/src/utils/test-utils/agent-evals.ts` with `testId`, `seedDatabase`, the `TestInputs` and `TestReferenceToolCalls` types, and the `tool_calls_match` evaluator, moved from `create-transaction-agent.phoenix-eval.test.ts`; make the proof of concept file import them; verify with `npm run phoenix:start` and `npm run test:phoenix-evals` that the 2 cases pass and show `tool_calls_match` in the Phoenix UI

## 2. Create Transaction Evals on Phoenix

- [x] 2.1 In `backend/vitest.evals.config.ts`, use the reporters of `vitest.phoenix-evals.config.ts` and remove the LangSmith reporter and setup file; verify that `npm run typecheck` passes
- [x] 2.2 Rewrite `create-transaction-agent.eval.test.ts` with `px.describe` and `px.test`, the proof of concept setup, and the shared helpers; port `testToolCalls` with `tool_calls_match` and `testNoTransactionCreated` with a new `no_transaction_created` CODE evaluator; keep the inputs and expectations of all 39 cases; verify that `npm run typecheck` passes
- [x] 2.3 In the same file, port `testWithJudge` to the `judge_rating` evaluator: `createClassificationEvaluator` with labels `1` to `5` and scores 0 to 1, a trajectory text function, and the judge model from `EVAL_JUDGE_MODEL_ID` through `createProviderRegistry({ bedrock })`; verify that `npm run test:evals -- -t "produces description that only lists purchased items"` passes and that Phoenix shows the score and the explanation of the judge; if Bedrock auth or structured output fails, apply the mitigation in design.md
- [x] 2.4 Add the case "does not create transaction when user has no accounts" with `accounts: []` and `testNoTransactionCreated`; verify that `npm run test:evals -- -t "no accounts"` passes and that Phoenix shows `no_transaction_created`
- [x] 2.5 In `backend/.env.test.example`, rename `JUDGE_LANGCHAIN_MODEL_ID` to `EVAL_JUDGE_MODEL_ID`, remove "LangSmith" from the `EVAL_EXPERIMENT_NAME` comment, and add a commented `PHOENIX_TEST_REPETITIONS` line; verify that `grep -rn JUDGE_LANGCHAIN_MODEL_ID backend/src backend/.env.test.example` finds nothing
- [x] 2.6 Delete `create-transaction-agent.phoenix-eval.test.ts`, `vitest.phoenix-evals.config.ts`, the `test:phoenix-evals` script, and the `*.phoenix-eval.test.ts` exclude in `vitest.config.ts`; verify that `grep -rn phoenix-eval backend --exclude-dir=node_modules` finds nothing
- [x] 2.7 Run `EVAL_EXPERIMENT_NAME=<name> npm run test:evals -- create-transaction-agent`; verify that all 40 cases run, that the Phoenix experiment has the given name, and that each case has one of the 3 scores
- [x] 2.8 In `backend/README.md`, add a `npm run test:evals` entry to "Quality Checks" with sub-bullets for `npm run phoenix:start` and `npm run phoenix:stop`, one eval file or one case, `EVAL_EXPERIMENT_NAME`, `PHOENIX_TEST_REPETITIONS`, `PHOENIX_TEST_TRACKING=false`, and the Phoenix UI at `http://localhost:6006`; verify that each documented command runs as written

## 3. Assistant Evals and Integration Test Removal

- [x] 3.1 Create `backend/src/langchain/agents/assistant-agent.eval.test.ts` with the 8 cases of `assistant-agent.int.test.ts`, the shared helpers, `testToolCalls` with the reference tool calls and args of design.md Decision 6, and the fixed date `2000-01-02`; verify that `npm run test:evals -- assistant-agent` runs 8 cases and that Phoenix shows the `AssistantAgent` dataset with `tool_calls_match`
- [x] 3.2 Delete `assistant-agent.int.test.ts`, `create-transaction-agent.int.test.ts`, `integration-matchers.ts`, and `langsmith-flush.ts`; remove the `integration` project and the `*.int.test.ts` exclude from `vitest.config.ts` and the `test:integration` script from `package.json`; verify that `grep -rn "int.test\|integration-matchers\|langsmith-flush\|test:integration" backend --exclude-dir=node_modules` finds nothing and that `npm test` passes
- [x] 3.3 Remove the `LANGSMITH_*` lines from `backend/.env.test.example` and the `test:integration` entry from `backend/README.md`; verify that `grep -n "LANGSMITH\|test:integration" backend/.env.test.example backend/README.md` finds nothing

## 4. Final Checks

- [x] 4.1 Run `npm run typecheck`, `npm run format`, and `npm test` in `backend/`; verify that all finish without errors

## Constitution Compliance

- **General Requirements**: Phoenix is a free local Docker service; the judge calls Bedrock with pay-per-use keys. Compliant
- **Vendor Independence**: tasks 2.3 and 3.3 remove the need for a LangSmith account in tests; the judge provider comes from `EVAL_JUDGE_MODEL_ID`. Compliant
- **Configuration**: task 2.5 documents the eval env vars in `.env.test.example`. Compliant
- **Test Strategy**: the change touches only tests, test helpers, and test config, so test-first does not apply; each task verifies its work with an eval run, a grep, or the test suite; the eval files stay next to their agents. Compliant
- **Code Quality Validation**: task 4.1 runs typecheck, lint, and the full test suite. Compliant
- **Backend Hexagonal Architecture**, **Schema-Driven Development**, **Result Pattern**: no change to production code. Not applicable
