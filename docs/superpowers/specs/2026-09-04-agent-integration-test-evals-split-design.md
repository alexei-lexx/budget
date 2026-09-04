# Split agent integration tests into structural tests and evals

## Goal

Reorganize `backend/src/langchain/agents/create-transaction-agent.int.test.ts` so that tests checking *whether the right tool gets called* (routing/structural, low ambiguity) stay as-is, while tests checking *whether the LLM followed a nuanced prompt rule correctly* (amount correction, HH:MM/pair parsing, recurring-amount detection) move to a new eval tier using `agentevals`. Establish this two-tier pattern as the project's approach for agent test files going forward.

## Motivation

`create-transaction-agent.ts`'s amount-correction, HH:MM/integer-pair parsing, and recurring-detection rules are pure prompt instructions — there is no deterministic code behind them. Their correctness can only be checked by invoking the real LLM and comparing output, which is inherently probabilistic. The current test file pins exact argument values (`amount: 9.87`, `description: recurringDescription`, etc.) for these cases using hand-rolled `toHaveToolCalls`/`expect.objectContaining` assertions, causing occasional flaky failures and mixing two different kinds of test (deterministic routing vs. probabilistic instruction-following) in one file with one posture (binary pass/fail, run only via manual `npm run test:integration`, never CI-gating).

Per LangChain's integration-testing guidance, CI-oriented tests should check structural properties (tool names, message counts, argument *shapes*) rather than pin exact LLM-derived values; per LangChain's evals guidance, scoring exact trajectory/argument correctness against a reference is the job of an evals tool (`agentevals`), which supports this out of the box with deterministic trajectory-match evaluators (no LangSmith account needed) and, separately, LLM-as-judge evaluators for open-ended quality checks.

The description-inference rules (grammatically correct, describes the item not the reason/context, must not reuse the category name) are currently untested entirely — no existing test asserts on the `description` argument's content. This is also addressed here via a new LLM-as-judge eval, since there's no single correct expected string for these rules.

## Out of scope

- `assistant-agent.int.test.ts` — same split is a natural follow-up, not part of this change. Left untouched.
- LangSmith account, API key, dataset, or `evaluate()`/`langsmith/vitest` wiring. The evaluators chosen here (`createTrajectoryMatchEvaluator`, `createTrajectoryLLMAsJudge`) run standalone inside plain `vitest` `it()` blocks with no external service. Migrating to LangSmith-tracked evals later is possible without rewriting these tests (same evaluator functions), but is not designed or built here.
- Wiring `test:evals` (or `test:integration`) into CI (`.github/workflows/ci.yml`). Both stay manual/local-only, matching current `test:integration` status.
- Editing `docs/constitution.md`'s Test Strategy section to document this pattern. Recommended as a follow-up, left to the user's judgment.
- Any change to `create-transaction-agent.ts` itself (prompt or code). This change touches tests only.

## Changes

### 1. Add `agentevals` dependency

`backend/package.json`: add `agentevals` as a devDependency (pairs with `@langchain/core`, already a direct dependency). No other new packages.

### 2. Add an `"evals"` vitest project

`backend/vitest.config.ts`: add a fourth project alongside `unit`/`repositories`/`integration`:

```ts
{
  extends: true,
  test: {
    name: "evals",
    environment: "node",
    include: ["src/**/*.eval.test.ts"],
    exclude: ["**/node_modules/**"],
    testTimeout: 100000,
    maxWorkers: 1,
  },
},
```

Mirrors the `"integration"` project's timeout/`maxWorkers` (real LLM calls). Does not include `setupFiles: ["src/utils/test-utils/integration-matchers.ts"]` — the eval tier asserts on `agentevals` evaluator results (`{ key, score, comment }`) directly via plain `expect(result.score).toBe(true)`, not via the `langchainMatchers` custom matchers.

### 3. Add `test:evals` npm script

`backend/package.json`, alongside the existing `test:integration` script:

```json
"test:evals": "dotenvx run -f .env.test -- vitest run --project evals",
```

Not added to `test`, `test:coverage`, or `test:watch`. Not run in CI — same non-gating status `test:integration` already has.

### 4. Split `create-transaction-agent.int.test.ts`

**Rule, with no exceptions:** `create-transaction-agent.int.test.ts` never asserts a tool-call *argument value* — only whether `create_transaction` was called or not (routing) and the resulting DB side-effect count. Any check of *which* values the agent chose (an amount, an account, a category, a date) depends on the LLM's interpretation and belongs in the eval tier, regardless of how unambiguous the input looks. (An earlier version of this spec carved out an exception for the three "calls create_transaction when X is given" tests on the theory that an explicitly-stated amount like "10 euro" was low-risk to pin — that carve-out is removed: it was still a content check by the definition above, just one judged less likely to fail.)

**Stays in `create-transaction-agent.int.test.ts`** (routing/structural — name/presence and DB count only):

- `does not call create_transaction when user has no accounts`
- `calls create_transaction when expense is given` — reasserted as tool-name-present + DB count, dropping the `objectContaining` value check
- `calls create_transaction when income is given` — same
- `calls create_transaction when refund is given` — same
- `does not create transaction from varying-amount recurring matches`
- `does not create transaction from single prior match`
- `does not create transaction when no prior matches exist`
- `does not create transaction when no history exists`
- `does not call create_transaction when HH:MM string is clock time`
- `does not call create_transaction under keyboard input` (both occurrences — HH:MM block and space-separated integer pair block)

**Moves to new `create-transaction-agent.eval.test.ts`** (nuanced instruction-following — reassert using `agentevals`):

- `creates transaction from recurring matches that agree on amount`
- `does not correct amount under voice input when no similar history exists`
- `corrects amount under voice input when history suggests smaller price`
- `does not correct amount under keyboard input when history suggests smaller price`
- `treats bare HH:MM string as price under voice input`
- `treats HH:MM string in mixed text as price under voice input`
- `treats HH:MM string as price when preposition refers to place`
- `prefers explicit numeric amount over HH:MM string when both are given`
- `treats two-digit fractional part as decimal amount under voice input`
- `treats single-digit fractional part as decimal amount with leading zero under voice input`

**New in `create-transaction-agent.eval.test.ts`, companion to the three happy-path tests that stay** (the value-correctness half of those scenarios, since the int-tier version no longer checks values):

- `extracts fields correctly when expense is given`
- `extracts fields correctly when income is given`
- `extracts fields correctly when refund is given`

Setup (`beforeAll` agent construction, `beforeEach` table truncation/user/account/category fixtures) is duplicated between the two files rather than extracted into a shared helper — this matches the existing repo convention (`assistant-agent.int.test.ts` and `create-transaction-agent.int.test.ts` do not share such a helper today) and keeps each file independently readable.

### 5. Evaluator usage for the moved tests

Replace `toHaveToolCalls([{ name, args: expect.objectContaining({...}) }])` with `createTrajectoryMatchEvaluator`, using `trajectoryMatchMode: "superset"` — the original tests (via `findLast`) never constrained *preliminary* tool calls (`get_accounts`, `get_transactions`, etc. the agent may make before deciding on `create_transaction`), only the final call's args, so the reference trajectory must be a subset of the actual one rather than an exact match. Use `toolArgsMatchOverrides` to keep fields that must be exact (e.g. `amount`) exact while ignoring fields not under test:

```ts
import { createTrajectoryMatchEvaluator } from "agentevals";

const trajectoryMatch = createTrajectoryMatchEvaluator({
  trajectoryMatchMode: "superset",
});

const result = await trajectoryMatch({
  outputs: toOpenAITrajectory(response.messages),
  referenceOutputs: [
    /* ...expected user + tool-call messages, OpenAI-format... */
  ],
});
expect(result.score).toBe(true);
```

Exact shape of `toOpenAITrajectory` (a small helper converting LangChain `BaseMessage[]` to `agentevals`'s `FlexibleChatCompletionMessage[]`) and per-test reference trajectories are implementation detail for the plan, not fixed here.

### 6. New description-quality eval

New `it()` block(s) in `create-transaction-agent.eval.test.ts` using `createTrajectoryLLMAsJudge` with a custom `prompt` derived from the agent's own "### Description" system-prompt rules (grammatically correct, describes the item/service not the reason/context, must not be built from the category name or its translations, meaningful details). `model` reuses the project's existing `createChatModel()` (same `LANGCHAIN_MODEL_ID`/`LANGCHAIN_MAX_TOKENS`/etc. env config), not a separate hardcoded provider. This is net-new coverage — no existing test asserts on `description` content today.

## Not changed

- `assistant-agent.int.test.ts` and its assertions.
- `create-transaction-agent.ts` (prompt/implementation).
- `.github/workflows/ci.yml`.
- `docs/constitution.md`.
- The `unit`, `repositories`, and `integration` vitest projects (only a new `evals` project is added).

## Impact

- `create-transaction-agent.int.test.ts` shrinks to routing/structural cases only (11 tests, none asserting argument values); remains fast(er)-to-reason-about and low-flake.
- New `create-transaction-agent.eval.test.ts` holds the probabilistic-instruction-following cases, the value-correctness companions to the three happy-path tests, and one new description-quality check (14 tests total); run manually via `npm run test:evals`, same non-CI-gating posture as `test:integration` today.
- `backend/package.json` gains one devDependency (`agentevals`) and one script (`test:evals`).
- `backend/vitest.config.ts` gains one project (`evals`).
- No production code changes; no CI changes; no new external accounts/secrets.
- Establishes a repeatable pattern (`*.int.test.ts` for routing, `*.eval.test.ts` for instruction-following correctness) that `assistant-agent.int.test.ts` and any future agent test file can adopt the same way.

## Validation

- `npm run typecheck`, `npm run lint`, `npm run prettier` pass in `backend/`.
- `npm run test:integration` passes (routing tests only, unchanged assertions).
- `npm run test:evals` passes (may be re-run if a genuine LLM miss occurs — that's the expected, accepted posture for this tier, unlike `test:integration`/CI-gating tests).
- Manual read-through confirms every one of the original file's 21 test cases is accounted for in exactly one of the two files (no case dropped, no case duplicated), plus 3 new happy-path value-correctness companions and 1 new description-quality eval (25 total).
