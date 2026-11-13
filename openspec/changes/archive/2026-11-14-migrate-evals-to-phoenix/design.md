# Design

## Context

See proposal.md for the motivation.

- `create-transaction-agent.eval.test.ts` uses `langsmith/vitest` (`ls.describe`, `ls.test`) and 3 test helpers:
  - `testToolCalls` (29 cases): `createTrajectoryMatchEvaluator` from `agentevals` in superset mode
  - `testWithJudge` (3 cases): `createTrajectoryLLMAsJudge` from `agentevals` with a LangChain judge model, passes at a continuous score of 0.9 or more
  - `testNoTransactionCreated` (7 cases): plain `expect` on the tool names
- The proof of concept file `create-transaction-agent.phoenix-eval.test.ts` already has the Phoenix setup:
  - `px.describe`, `px.test`, `px.evaluate`, and `px.logOutput` from `@arizeai/phoenix-client/vitest`
  - a `tool_calls_match` CODE evaluator
  - LangChain instrumentation in `beforeEach` and `awaitAllCallbacks` in `afterEach`
  - `experimentName` from `EVAL_EXPERIMENT_NAME` through the local patch of `@arizeai/phoenix-client`
- The integration tests use `describe` and `it`, a real model, a real date, and `toContainToolCall` from `integration-matchers.ts`
- `langsmith-flush.ts` is a setup file of the LangSmith evals and of the `integration` project; nothing else uses it
- `createClassificationEvaluator` from `@arizeai/phoenix-evals` needs an AI SDK model, a Mustache prompt template, and a map from labels to scores; it asks the model for a label and an explanation through `generateObject`
- `ai` 7 is in `node_modules` through the Phoenix packages; `createProviderRegistry` splits a model ID at the first `:`

## Goals / Non-Goals

**Goals:**

- Keep the 39 existing cases with the same inputs and expectations
- One test style for all tests that call a real model
- Scores that Phoenix shows for each case and each run

**Non-Goals:**

- Same score values as the old LangSmith runs; the new runs start a new baseline
- Database checks in the evals; the repository and service tests cover the stored data
- Prompt cache isolation for the assistant agent; it needs a change to the agent code

## Decisions

### Decision 1: Phoenix Vitest integration for both suites

Both eval files use `px.describe` and `px.test` with the setup of the proof of concept.
Each suite has the metadata `{ agentModelId, judgeModelId }` and the experiment name from `EVAL_EXPERIMENT_NAME`, with a random slug when it is not set.
The suite names `CreateTransactionAgent` and `AssistantAgent` become the Phoenix dataset names.
The test inputs and expectations are type aliases, because Phoenix types need an index signature.

The tests do not set `id`.
Phoenix then finds the dataset example of each test by its input.
The inputs are fixed, so each test keeps its example between runs.

Alternative: `id: testId(name)` on each test, as in the proof of concept.
An input change then updates the example, but a rename creates a new example.
Neither is clearly better, and the `id` adds a line to each of the 48 tests.

### Decision 2: Shared eval helpers in `src/utils/test-utils/agent-evals.ts`

Both eval files need the same code:

- `agentModelId`, `judgeModelId`, and `experimentName` from the env vars
- `testId`: stable UUID from a readable name, with one fixed namespace UUID for all eval files
- `seedDatabase`: creates accounts, categories, and transactions for the user
- `TestInput` and `TestExpectedToolCalls` types
- the 3 evaluators of Decision 3
- the 3 test helpers `testAgentToolCalls`, `testAgentWithJudge`, and `testAgentNoTransactionCreated`

The test helpers take the agent, the context, and the user ID of the suite, so each eval file has only its setup and its cases.
The file has no test of its own; the eval runs use it.

Alternative: a copy of the helpers in each eval file.
The copies are about 250 lines, and the evaluator copies can drift apart.

### Decision 3: 3 named Phoenix scores

Each test helper calls `px.evaluate` with one evaluator and asserts `expect(score).toBe(1)`:

| Helper                          | Evaluator                | Kind | Score                    |
| ------------------------------- | ------------------------ | ---- | ------------------------ |
| `testAgentToolCalls`            | `tool_calls_match`       | CODE | 1 or 0                   |
| `testAgentNoTransactionCreated` | `no_transaction_created` | CODE | 1 or 0                   |
| `testAgentWithJudge`            | `judge_rating`           | LLM  | 0, 0.25, 0.5, 0.75, or 1 |

`tool_calls_match` comes from the `trajectory_superset_match` evaluator of the proof of concept.
`no_transaction_created` gives 1 when no AI message has a call to the create transaction tool.
It is in the shared file with the other evaluators, although only the create transaction eval file uses it.

Alternative for `no_transaction_created`: plain `expect` without a score, as now.
Phoenix then shows no result for 8 of the 40 cases.

### Decision 4: Likert judge with `createClassificationEvaluator`

The judge is `createClassificationEvaluator` with the name `judge_rating` and these labels and scores:

| Label | Meaning                               | Score |
| ----- | ------------------------------------- | ----- |
| `5`   | fully meets the criteria              | 1     |
| `4`   | meets the criteria with a minor issue | 0.75  |
| `3`   | partly meets the criteria             | 0.5   |
| `2`   | mostly fails the criteria             | 0.25  |
| `1`   | fails the criteria                    | 0     |

The prompt template gives the label meanings, the case criteria as `{{criteria}}`, and the trajectory as `{{trajectory}}`.
`getBufferString` from `@langchain/core` turns the agent messages into text: the role, the text, and the tool calls with their args.
`agentevals` has a similar function, but its package exports do not include it.
Phoenix stores the explanation of the judge next to the score.

Alternatives:

- `createTrajectoryLLMAsJudge` from `agentevals` in a Phoenix `createEvaluator`: no new dependency, but the judge is not a Phoenix evaluator
- 3 labels (pass, partial, fail): too coarse to see small changes between runs
- Raw score 1 to 5: other scores are 0 to 1, so the Phoenix UI shows mixed ranges

### Decision 5: Judge model from `EVAL_JUDGE_MODEL_ID` through the AI SDK registry

`EVAL_JUDGE_MODEL_ID` replaces `JUDGE_LANGCHAIN_MODEL_ID` with the same `provider:model` format and the same default `DEFAULT_LANGCHAIN_MODEL_ID`.
The ID must start with `bedrock:`; a Zod check stops the eval run with an error otherwise.
`createProviderRegistry({ bedrock })` from `ai` turns the ID into an AI SDK model.
The registry splits at the first `:`, so `bedrock:openai.gpt-oss-120b-1:0` gives the provider `bedrock` and the model `openai.gpt-oss-120b-1:0`.
The judge uses the AI SDK defaults and does not read `LANGCHAIN_MAX_TOKENS`, `LANGCHAIN_TEMPERATURE`, or `LANGCHAIN_TIMEOUT`.

The `EVAL_` prefix marks env vars that the eval code reads.
The `PHOENIX_` prefix stays for env vars that `@arizeai/phoenix-client` reads.

Alternatives:

- A custom function that maps the prefix to a provider: the registry already does this
- Only Bedrock with a bare model ID: the ID format then differs from `LANGCHAIN_MODEL_ID`
- `PHOENIX_JUDGE_MODEL_ID`: mixes our env vars with the env vars of the library

### Decision 6: Integration cases become eval cases

- "does not create transaction when user has no accounts" becomes a create transaction eval with `accounts: []` and `testAgentNoTransactionCreated`
- The 8 assistant cases become `assistant-agent.eval.test.ts` with `testAgentToolCalls`
- The 3 other create transaction cases (expense, income, refund) have evals with the same messages and stricter checks, so they go away
- The assistant suite uses the fixed date `2000-01-02`, like the create transaction suite

Each assistant case has a reference tool call with the args that the message gives:

| Message                                       | Tool                          | Reference args                               |
| --------------------------------------------- | ----------------------------- | -------------------------------------------- |
| "list my accounts"                            | `get_accounts`                | none; see below                              |
| "what categories do I have?"                  | `get_categories`              | none; see below                              |
| "how much did I spend today?"                 | `aggregate_transactions`      | `startDate` and `endDate`: today             |
| "create a new account named Savings in EUR"   | `create_account`              | `name: "Savings"`, `currency: "EUR"`         |
| "create an expense category called Transport" | `create_category`             | `name: "Transport"`, `type: "EXPENSE"`       |
| "rename my Visa account to Amex"              | `update_account`              | `id`: the Visa account, `name: "Amex"`       |
| "rename Groceries category to Food"           | `update_category`             | `id`: the Groceries category, `name: "Food"` |
| "bought apples for 10 euro"                   | `create_transaction_subagent` | none; `text` is free text                    |

The evaluator compares only the listed args, so optional args, such as `types` of `aggregate_transactions`, do not fail a case.

The `get_accounts` and `get_categories` cases do not compare `scope`.
The messages do not tell if the user means active items only or all items, so `ACTIVE` and `ALL` are both correct calls.

Alternative: only the tool name, like `toContainToolCall` in the integration tests.
The args add stronger checks at almost no cost.

### Decision 7: One Vitest config for evals

- `vitest.evals.config.ts` gets the content of `vitest.phoenix-evals.config.ts` and includes `src/**/*.eval.test.ts`
- `test:evals` keeps its command
- `vitest.config.ts` loses the `integration` project and the `*.int.test.ts` and `*.phoenix-eval.test.ts` excludes; the `*.eval.test.ts` exclude stays
- `langsmith-flush.ts` and `integration-matchers.ts` go away, because nothing else uses them

## Risks / Trade-offs

- [Risk] `generateObject` with `gpt-oss` on Bedrock can fail if the model does not give structured output → The first judge task runs one judge case; if it fails, the developer sets `EVAL_JUDGE_MODEL_ID` to a model with structured output, and the design changes the default
- [Risk] `@ai-sdk/amazon-bedrock` can ignore `AWS_BEARER_TOKEN_BEDROCK` → The first judge task checks the auth; if it fails, the eval passes the key to `createAmazonBedrock` with `apiKey`
- [Risk] The new provider package needs a version that works with `ai` 7 → The task installs the version with the same `@ai-sdk/provider` major version as `ai`
- [Trade-off] Old LangSmith experiments stay in LangSmith and do not move to Phoenix → The new runs start a new baseline
- [Trade-off] The evals do not check the stored data, which 6 integration tests checked → The repository and service tests cover the stored data
- [Trade-off] `npm run test:integration` goes away → `npm run test:evals` replaces it, and the README tells this

## Migration Plan

1. Each developer renames `JUDGE_LANGCHAIN_MODEL_ID` to `EVAL_JUDGE_MODEL_ID` in the local `.env.test`, if it is set
2. Each developer can remove the `LANGSMITH_*` lines from the local `.env.test`
3. Rollback: revert the commit; LangSmith history stays in LangSmith

## Constitution Compliance

- **General Requirements**: Phoenix is a free local Docker service; the judge calls Bedrock with pay-per-use keys. Compliant
- **Vendor Independence**: the tests do not need a LangSmith account; the AI SDK registry selects the judge provider from an env var; only Bedrock is in the registry, and a different provider needs one more registry entry. Compliant
- **Configuration**: the evals read `EVAL_JUDGE_MODEL_ID`, `EVAL_EXPERIMENT_NAME`, and the `PHOENIX_*` env vars only from the environment. Compliant
- **Test Strategy**: each eval file is next to the agent that it tests; the shared helpers are in `src/utils/test-utils/` with the other test helpers; one kind of real-model test keeps the test suite small. Compliant
- **Code Quality Validation**: typecheck, lint, and the unit and DB test suite run on the change. Compliant
- **Backend Hexagonal Architecture**: the evals call the agents and repositories through `dependencies.ts`; no production code changes. Compliant
- **Schema-Driven Development**, **Result Pattern**: no change to the API or to services. Not applicable
