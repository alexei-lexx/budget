# Agent Integration Test / Evals Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `backend/src/langchain/agents/create-transaction-agent.int.test.ts` into a structural/routing tier (unchanged file, unchanged mechanism) and a new correctness/evals tier (`create-transaction-agent.eval.test.ts`), using the `agentevals` package's deterministic trajectory-match evaluator and one LLM-as-judge evaluator, per the approved design.

**Architecture:** A new `agentevals` devDependency provides `createTrajectoryMatchEvaluator` (deterministic, `"superset"` match mode + per-tool `toolArgsMatchOverrides` field lists) and `createTrajectoryLLMAsJudge` (qualitative, reuses the project's existing `createChatModel()` as judge). A fourth vitest project, `"evals"`, runs `src/**/*.eval.test.ts` via a new `test:evals` script — same non-CI-gating posture as today's `test:integration`. Ten of the twenty-one existing test cases move from the `.int.test.ts` file to the new `.eval.test.ts` file (the ones testing nuanced prompt instruction-following: amount correction, HH:MM/pair parsing, recurring-amount detection); the other eleven (routing/tool-call presence-or-absence, low-ambiguity happy paths) stay put unchanged. One new test is added to the evals file covering description-quality rules that have no existing coverage.

**Tech Stack:** `agentevals` 0.0.7 (TS), existing `langchain`/`@langchain/core`/`@langchain/aws`, Vitest projects, DynamoDB Local.

**Spec:** `docs/superpowers/specs/2026-09-04-agent-integration-test-evals-split-design.md`

## Global Constraints

- No LangSmith account, API key, dataset, or `langsmith` package usage — evaluators run standalone inside plain `vitest` `it()` blocks.
- Neither `test:integration` nor the new `test:evals` is wired into `.github/workflows/ci.yml` — both stay manual/local-only, matching `test:integration`'s current status.
- `assistant-agent.int.test.ts` is left untouched.
- `backend/src/langchain/agents/create-transaction-agent.ts` (prompt or code) is left untouched — this plan only touches tests and test plumbing.
- `docs/constitution.md` is left untouched.
- New vitest project name: `"evals"`, `include: ["src/**/*.eval.test.ts"]`.
- New npm script name: `test:evals`.
- New dependency: `agentevals` (devDependency, `^0.0.7`).

---

## Pre-conditions

- Working directory: `/home/alex/workspace/budget2`
- Branch: `agent-test-evals-split-spec` (already created; spec commit `914f103f` already lives on this branch)
- All commands below use `npm --prefix backend ...` — never `cd` into `backend/` per CLAUDE.md
- DynamoDB Local must be running for `test:integration`/`test:evals` (`npm --prefix backend run test:db:setup` if not already set up per `CLAUDE.md`'s Cloud Agent Setup section)
- `backend/.env.test` must exist (`cp backend/.env.test.example backend/.env.test` if missing) and must have a working `LANGCHAIN_MODEL_ID` configured — these tests make real LLM calls, same as the existing `.int.test.ts` file already does

---

## Task 1: Add `agentevals`, `evals` vitest project, `test:evals` script

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/vitest.config.ts`

**Interfaces:**
- Produces: `npm --prefix backend run test:evals` (runs `vitest run --project evals` against `src/**/*.eval.test.ts`), and the `agentevals` package available to import from any `*.eval.test.ts` file. Later tasks depend on both.

- [ ] **Step 1: Verify current branch**

```bash
git -C /home/alex/workspace/budget2 branch --show-current
```

Expected output: `agent-test-evals-split-spec`

If anything else, stop and re-establish the branch before continuing.

- [ ] **Step 2: Edit `backend/package.json` — add the dependency**

In the `"devDependencies"` block, insert this line immediately after `"@vitest/coverage-v8": "^4.1.5",` and before `"body-parser": "^2.3.0",` (keeps alphabetic order):

```jsonc
"agentevals": "^0.0.7",
```

- [ ] **Step 3: Edit `backend/package.json` — add the script**

In the `"scripts"` block, insert this line immediately after `"test:db:setup": "npm run db:start && sleep 1 && npm run test:db:create",` and before `"test:integration": "dotenvx run -f .env.test -- vitest run --project integration",` (keeps the existing `test:*` alphabetic grouping — `test:evals` sorts between `test:db:setup` and `test:integration`):

```jsonc
"test:evals": "dotenvx run -f .env.test -- vitest run --project evals",
```

- [ ] **Step 4: Edit `backend/vitest.config.ts` — add the `evals` project**

Find the `"integration"` project object (the last entry in the `projects` array). Insert a new project object immediately after it, before the array's closing `],`:

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

No `setupFiles` — the evals tier asserts on `agentevals` evaluator results (`{ score, comment }`) directly, not via the `langchainMatchers` custom vitest matchers the integration project registers.

- [ ] **Step 5: Install**

```bash
npm --prefix backend install
```

Expected: succeeds; `backend/node_modules/agentevals/package.json` exists.

Verify:
```bash
test -f backend/node_modules/agentevals/package.json && echo "agentevals installed OK"
```

- [ ] **Step 6: Typecheck**

```bash
npm --prefix backend run typecheck
```

Expected: passes (no `.eval.test.ts` files exist yet, so this just confirms the dependency install and config edit didn't break anything).

- [ ] **Step 7: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/package.json backend/package-lock.json backend/vitest.config.ts
git -C /home/alex/workspace/budget2 commit -m "chore(backend): add agentevals and an evals vitest project"
```

---

## Task 2: Create `create-transaction-agent.eval.test.ts` with the recurring-match eval

**Files:**
- Create: `backend/src/langchain/agents/create-transaction-agent.eval.test.ts`

**Interfaces:**
- Consumes: `createCreateTransactionAgent` from `./create-transaction-agent`; `CREATE_TRANSACTION_TOOL_NAME` from `../tools/create-transaction`; same `resolve*`/fake helpers as `create-transaction-agent.int.test.ts` (see `backend/src/dependencies.ts` and `backend/src/utils/test-utils/**`).
- Produces: two local helpers other tasks in this file reuse —
  - `createTransactionTrajectoryMatch(fields: string[])` → `(params: { outputs: BaseMessage[]; referenceOutputs: BaseMessage[] }) => Promise<EvaluatorResult>`
  - `createTransactionReference(args: Record<string, unknown>)` → `BaseMessage[]` (a single-element array: one `AIMessage` whose `tool_calls` contains one `create_transaction` call with the given `args`)

  Both are defined once in this task and reused unmodified by Tasks 3–6.

- [ ] **Step 1: Write the file**

```ts
import { AIMessage, HumanMessage } from "langchain";
import { createTrajectoryLLMAsJudge, createTrajectoryMatchEvaluator } from "agentevals";
import { Temporal } from "temporal-polyfill";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createChatModel,
  resolveAccountRepository,
  resolveAccountService,
  resolveCategoryRepository,
  resolveCategoryService,
  resolveTransactionRepository,
  resolveTransactionService,
  resolveUserRepository,
} from "../../dependencies";
import { CategoryType } from "../../models/category";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date-string";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { fakeExpense } from "../../utils/test-utils/models/transaction-fakes";
import { fakeUser } from "../../utils/test-utils/models/user-fakes";
import { fakeCreateCategoryInput } from "../../utils/test-utils/repositories/category-repository-fakes";
import { CREATE_TRANSACTION_TOOL_NAME } from "../tools/create-transaction";
import { createCreateTransactionAgent } from "./create-transaction-agent";

const accountRepository = resolveAccountRepository();
const accountService = resolveAccountService();
const categoryRepository = resolveCategoryRepository();
const categoryService = resolveCategoryService();
const transactionRepository = resolveTransactionRepository();
const transactionService = resolveTransactionService();
const userRepository = resolveUserRepository();

// Every case here checks whether the agent followed a nuanced, purely
// prompt-driven inference rule (amount correction, HH:MM/pair parsing,
// recurring-amount detection, description quality) correctly — there is no
// deterministic code behind these rules, so only a real LLM call can verify
// them. Unlike create-transaction-agent.int.test.ts (routing/structural,
// low ambiguity), these are expected to occasionally need re-running when a
// model or prompt change causes a genuine regression to investigate.

// Reference trajectories only need to contain the expected create_transaction
// tool call — createTrajectoryMatchEvaluator's "superset" mode only compares
// tool calls, not message order/content, so preliminary lookups the agent
// makes (get_accounts, get_transactions, etc.) don't need to be replicated.
function createTransactionReference(args: Record<string, unknown>) {
  return [
    new AIMessage({
      content: "",
      tool_calls: [
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args,
          id: "reference-call",
          type: "tool_call",
        },
      ],
    }),
  ];
}

// `fields` lists which create_transaction argument keys must match exactly;
// every other key (e.g. accountId, categoryId when not under test) is
// ignored, matching what the equivalent hand-rolled assertions used to check.
function createTransactionTrajectoryMatch(fields: string[]) {
  return createTrajectoryMatchEvaluator({
    trajectoryMatchMode: "superset",
    toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: fields },
  });
}

describe("CreateTransactionAgent (evals)", () => {
  let context: { userId: string; today: string; isVoiceInput?: boolean };
  let today: string;
  let userId: string;
  let agent: ReturnType<typeof createCreateTransactionAgent>;

  beforeAll(async () => {
    const model = await createChatModel();
    agent = createCreateTransactionAgent({
      model,
      accountService,
      categoryService,
      transactionRepository,
      transactionService,
    });
  });

  beforeEach(async () => {
    await truncateAllTables(createDynamoDBDocumentClient());

    const user = fakeUser();
    await userRepository.create(user);
    userId = user.id;

    today = Temporal.Now.plainDateISO().toString();
    context = { userId, today };
  });

  describe("when amount is not given", () => {
    it("creates transaction from recurring matches that agree on amount", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);
      const category = await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
        }),
      );
      // Seed recurring history — same description and amount, recorded monthly
      const todayPlainDate = Temporal.Now.plainDateISO();
      const recurringAmount = 50;
      const recurringDescription = "gym abo";
      for (const days of [10, 25, 50, 80]) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account.id,
            categoryId: category.id,
            amount: recurringAmount,
            description: recurringDescription,
            date: toDateString(todayPlainDate.subtract({ days }).toString()),
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("gym")] },
        { context },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch([
        "accountId",
        "categoryId",
        "amount",
        "date",
        "type",
        "description",
      ])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({
          accountId: account.id,
          categoryId: category.id,
          amount: recurringAmount,
          date: today,
          type: TransactionType.EXPENSE,
          description: recurringDescription,
        }),
      });
      expect(result.score).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run the new test**

```bash
npm --prefix backend run test:evals -- -t "creates transaction from recurring matches that agree on amount"
```

Expected: PASS. If it fails, read `result.comment` (log it via `console.log(result)` temporarily if not visible in the failure output) — it's real-LLM-driven, so first confirm the failure isn't a one-off before treating it as a bug in the test/evaluator setup.

- [ ] **Step 3: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/src/langchain/agents/create-transaction-agent.eval.test.ts
git -C /home/alex/workspace/budget2 commit -m "test(backend): add recurring-match eval for create-transaction-agent"
```

---

## Task 3: Add the amount-correction (voice input) evals

**Files:**
- Modify: `backend/src/langchain/agents/create-transaction-agent.eval.test.ts`

**Interfaces:**
- Consumes: `createTransactionTrajectoryMatch`, `createTransactionReference` (Task 2, same file); `faker` from `@faker-js/faker` (new import, matching how `create-transaction-agent.int.test.ts` already uses it for this same scenario); `fakeTransaction` from `../../utils/test-utils/models/transaction-fakes` (new import — add alongside the existing `fakeExpense` import on that line).

- [ ] **Step 1: Add the `faker` import and extend the `fakeExpense` import**

At the top of the file, add:
```ts
import { faker } from "@faker-js/faker";
```
(insert as the first import, before `import { AIMessage, HumanMessage } from "langchain";`, matching the import ordering convention in `create-transaction-agent.int.test.ts`)

Change:
```ts
import { fakeExpense } from "../../utils/test-utils/models/transaction-fakes";
```
to:
```ts
import { fakeExpense, fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
```

- [ ] **Step 2: Add the three tests**

Insert this new `describe` block immediately after the closing `});` of the `describe("when amount is not given", ...)` block (i.e. as a sibling, still inside the outer `describe("CreateTransactionAgent (evals)", ...)`, before its final closing `});`):

```ts

  describe("when amount is suspiciously high", () => {
    it("does not correct amount under voice input when no similar history exists", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("sandwich 987")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 987 }),
      });
      expect(result.score).toBe(true);
    });

    it("corrects amount under voice input when history suggests smaller price", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      await accountRepository.create(account);
      const category = await categoryRepository.create(
        fakeCategory({
          userId,
          type: CategoryType.EXPENSE,
          name: "food",
        }),
      );
      // Seed similar history — prior "food" expenses around 5–15 EUR
      const existingTransactionCount = 3;
      for (let i = 0; i < existingTransactionCount; i++) {
        await transactionRepository.create(
          fakeTransaction({
            userId,
            accountId: account.id,
            categoryId: category.id,
            amount: faker.number.int({ min: 5, max: 15 }),
            type: TransactionType.EXPENSE,
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("sandwich 987")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 9.87 }),
      });
      expect(result.score).toBe(true);
    });

    it("does not correct amount under keyboard input when history suggests smaller price", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      await accountRepository.create(account);
      const category = await categoryRepository.create(
        fakeCategory({
          userId,
          type: CategoryType.EXPENSE,
          name: "food",
        }),
      );
      // Seed similar history — prior "food" expenses around 5–15 EUR
      const existingTransactionCount = 3;
      for (let i = 0; i < existingTransactionCount; i++) {
        await transactionRepository.create(
          fakeTransaction({
            userId,
            accountId: account.id,
            categoryId: category.id,
            amount: faker.number.int({ min: 5, max: 15 }),
            type: TransactionType.EXPENSE,
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("sandwich 987")] },
        { context: { ...context, isVoiceInput: false } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 987 }),
      });
      expect(result.score).toBe(true);
    });
  });
```

- [ ] **Step 3: Run the new tests**

```bash
npm --prefix backend run test:evals -- -t "when amount is suspiciously high"
```

Expected: all 3 PASS.

- [ ] **Step 4: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/src/langchain/agents/create-transaction-agent.eval.test.ts
git -C /home/alex/workspace/budget2 commit -m "test(backend): add amount-correction evals for create-transaction-agent"
```

---

## Task 4: Add the HH:MM-shaped string evals

**Files:**
- Modify: `backend/src/langchain/agents/create-transaction-agent.eval.test.ts`

**Interfaces:**
- Consumes: `createTransactionTrajectoryMatch`, `createTransactionReference` (Task 2, same file). No new imports.

- [ ] **Step 1: Add the four tests**

Insert this new `describe` block immediately after the closing `});` of the `describe("when amount is suspiciously high", ...)` block added in Task 3 (still inside the outer describe, before its final closing `});`):

```ts

  describe("when message contains HH:MM-shaped string", () => {
    it("treats bare HH:MM string as price under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("11:23")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 11.23 }),
      });
      expect(result.score).toBe(true);
    });

    it("treats HH:MM string in mixed text as price under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("groceries 7:50")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 7.5 }),
      });
      expect(result.score).toBe(true);
    });

    it("treats HH:MM string as price when preposition refers to place", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("lunch 11:23 at cafe")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 11.23 }),
      });
      expect(result.score).toBe(true);
    });

    it("prefers explicit numeric amount over HH:MM string when both are given", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("transferred 100 at 15:30")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 100 }),
      });
      expect(result.score).toBe(true);
    });
  });
```

- [ ] **Step 2: Run the new tests**

```bash
npm --prefix backend run test:evals -- -t "when message contains HH:MM-shaped string"
```

Expected: all 4 PASS.

- [ ] **Step 3: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/src/langchain/agents/create-transaction-agent.eval.test.ts
git -C /home/alex/workspace/budget2 commit -m "test(backend): add HH:MM parsing evals for create-transaction-agent"
```

---

## Task 5: Add the space-separated integer pair evals

**Files:**
- Modify: `backend/src/langchain/agents/create-transaction-agent.eval.test.ts`

**Interfaces:**
- Consumes: `createTransactionTrajectoryMatch`, `createTransactionReference` (Task 2, same file). No new imports.

- [ ] **Step 1: Add the two tests**

Insert this new `describe` block immediately after the closing `});` of the `describe("when message contains HH:MM-shaped string", ...)` block added in Task 4 (still inside the outer describe, before its final closing `});`):

```ts

  describe("when message contains space-separated integer pair", () => {
    it("treats two-digit fractional part as decimal amount under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("apples, bananas 12 54")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 12.54 }),
      });
      expect(result.score).toBe(true);
    });

    it("treats single-digit fractional part as decimal amount with leading zero under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("coffee 12 5")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 12.05 }),
      });
      expect(result.score).toBe(true);
    });
  });
```

- [ ] **Step 2: Run the new tests**

```bash
npm --prefix backend run test:evals -- -t "when message contains space-separated integer pair"
```

Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/src/langchain/agents/create-transaction-agent.eval.test.ts
git -C /home/alex/workspace/budget2 commit -m "test(backend): add integer-pair parsing evals for create-transaction-agent"
```

---

## Task 6: Add the description-quality LLM-as-judge eval

**Files:**
- Modify: `backend/src/langchain/agents/create-transaction-agent.eval.test.ts`

This is net-new coverage: no existing test (in either file) asserts on the `description` argument's content. The agent's own system prompt (`backend/src/langchain/agents/create-transaction-agent.ts`, "### Description" section) states the rules this test grades against.

**Interfaces:**
- Consumes: `createTrajectoryLLMAsJudge` (already imported in Task 2's import list); the `model` instance created in `beforeAll` — currently a local variable scoped to `beforeAll` in Task 2's code, promoted here to an outer-`describe`-scoped variable so tests in this file can pass it to `createDescriptionQualityJudge(model)`.

- [ ] **Step 1: Promote `model` to outer scope**

In the `describe("CreateTransactionAgent (evals)", ...)` block, change:

```ts
  let context: { userId: string; today: string; isVoiceInput?: boolean };
  let today: string;
  let userId: string;
  let agent: ReturnType<typeof createCreateTransactionAgent>;

  beforeAll(async () => {
    const model = await createChatModel();
    agent = createCreateTransactionAgent({
```

to:

```ts
  let context: { userId: string; today: string; isVoiceInput?: boolean };
  let today: string;
  let userId: string;
  let agent: ReturnType<typeof createCreateTransactionAgent>;
  let model: Awaited<ReturnType<typeof createChatModel>>;

  beforeAll(async () => {
    model = await createChatModel();
    agent = createCreateTransactionAgent({
```

- [ ] **Step 2: Add the judge prompt and evaluator factory**

Immediately after the `createTransactionTrajectoryMatch` function (still before the outer `describe`), add:

```ts

const DESCRIPTION_QUALITY_PROMPT = `
You are grading whether an AI agent's inferred transaction description follows these rules:

- MUST be grammatically correct, without typos
- MUST describe the item or service — not the reason or context for the purchase
- MUST NOT be built from the category name, its variations, or its translations
- MUST provide meaningful details that supplement the transaction

Look at the "description" argument of the create_transaction tool call in the trajectory below.

<trajectory>
{outputs}
</trajectory>

Score 1 if the description follows all the rules above. Score 0 if it violates any rule.
`.trim();

// Takes `model` as a parameter (rather than closing over it) because this
// function is defined at module scope, while `model` is only assigned
// inside the `describe` block's `beforeAll` — it's in scope at each call
// site (inside an `it(...)` in that same `describe`), not here.
function createDescriptionQualityJudge(
  model: Awaited<ReturnType<typeof createChatModel>>,
) {
  return createTrajectoryLLMAsJudge({
    prompt: DESCRIPTION_QUALITY_PROMPT,
    judge: model,
  });
}
```

- [ ] **Step 3: Add the test**

Insert this new `describe` block immediately after the closing `});` of the `describe("when message contains space-separated integer pair", ...)` block added in Task 5 (still inside the outer describe, before its final closing `});`):

```ts

  describe("description inference", () => {
    it("produces a description that follows the description-inference rules", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);
      await categoryRepository.create(
        fakeCategory({ userId, type: CategoryType.EXPENSE, name: "shopping" }),
      );

      // Act
      const response = await agent.invoke(
        {
          messages: [
            new HumanMessage("bought a used mountain bike for 200 euro"),
          ],
        },
        { context },
      );

      // Assert
      const result = await createDescriptionQualityJudge(model)({
        outputs: response.messages,
      });
      expect(result.score).toBe(true);
    });
  });
```

- [ ] **Step 4: Run the new test**

```bash
npm --prefix backend run test:evals -- -t "description inference"
```

Expected: PASS. `createDescriptionQualityJudge()` makes an extra LLM call per invocation (the judge call) on top of the agent's own calls — if it fails, log `result.comment` to see the judge's stated reasoning before concluding the agent (rather than the judge prompt) is at fault.

- [ ] **Step 5: Full evals run**

```bash
npm --prefix backend run test:evals
```

Expected: all 11 tests in `create-transaction-agent.eval.test.ts` PASS (1 recurring-match + 3 amount-correction + 4 HH:MM + 2 integer-pair + 1 description-quality).

- [ ] **Step 6: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/src/langchain/agents/create-transaction-agent.eval.test.ts
git -C /home/alex/workspace/budget2 commit -m "test(backend): add description-quality eval for create-transaction-agent"
```

---

## Task 7: Remove the moved tests from `create-transaction-agent.int.test.ts`

**Files:**
- Modify: `backend/src/langchain/agents/create-transaction-agent.int.test.ts`

No new tests are added here — every case being removed now has an equivalent in `create-transaction-agent.eval.test.ts` from Tasks 2–5. The eleven cases listed under "stays" below are untouched.

**Stays (do not touch):**
- `does not call create_transaction when user has no accounts`
- `calls create_transaction when expense is given`
- `calls create_transaction when income is given`
- `calls create_transaction when refund is given`
- `does not create transaction from varying-amount recurring matches`
- `does not create transaction from single prior match`
- `does not create transaction when no prior matches exist`
- `does not create transaction when no history exists`
- `does not call create_transaction when HH:MM string is clock time`
- `does not call create_transaction under keyboard input` (both occurrences)

- [ ] **Step 1: Remove `describe("when amount is not given", ...)`'s "Happy path" test**

Delete the `// Happy path` comment and the `it("creates transaction from recurring matches that agree on amount", ...)` block (open the file and find it — it's the first thing inside `describe("when amount is not given", ...)`, immediately before the `// Validation failures` comment). After deletion, `describe("when amount is not given", ...)` should start directly with `// Validation failures` followed by its four remaining tests.

- [ ] **Step 2: Remove the entire `describe("when amount is suspiciously high", ...)` block**

All three tests inside it (`does not correct amount under voice input when no similar history exists`, `corrects amount under voice input when history suggests smaller price`, `does not correct amount under keyboard input when history suggests smaller price`) moved to the evals file in Task 3 — nothing stays. Delete the whole `describe(...)` block, from its `describe("when amount is suspiciously high", () => {` line through its matching closing `});`.

- [ ] **Step 3: Remove `describe("when message contains HH:MM-shaped string", ...)`'s "Happy path" tests**

Delete the `// Happy path` comment and all four tests under it (`treats bare HH:MM string as price under voice input`, `treats HH:MM string in mixed text as price under voice input`, `treats HH:MM string as price when preposition refers to place`, `prefers explicit numeric amount over HH:MM string when both are given`). After deletion, this `describe` block should start directly with `// Validation failures` followed by its two remaining tests (`does not call create_transaction when HH:MM string is clock time`, `does not call create_transaction under keyboard input`).

- [ ] **Step 4: Remove `describe("when message contains space-separated integer pair", ...)`'s "Happy path" tests**

Delete the `// Happy path` comment and both tests under it (`treats two-digit fractional part as decimal amount under voice input`, `treats single-digit fractional part as decimal amount with leading zero under voice input`). After deletion, this `describe` block should start directly with `// Validation failures` followed by its one remaining test (`does not call create_transaction under keyboard input`).

- [ ] **Step 5: Remove now-unused imports**

After the deletions above, `faker` (from `@faker-js/faker`) and `fakeTransaction` (from `../../utils/test-utils/models/transaction-fakes`) are no longer used in this file — they were only used by the tests removed in Step 2. Remove the `import { faker } from "@faker-js/faker";` line, and change:
```ts
import {
  fakeExpense,
  fakeTransaction,
} from "../../utils/test-utils/models/transaction-fakes";
```
to:
```ts
import { fakeExpense } from "../../utils/test-utils/models/transaction-fakes";
```

Check the rest of the file's imports too (e.g. `fakeCreateCategoryInput`, `toDateString`) — they're still used by the "stays" tests in `describe("when amount is not given", ...)`'s validation-failure block, so leave them.

- [ ] **Step 6: Typecheck and lint**

```bash
npm --prefix backend run typecheck
npm --prefix backend run lint
```

Expected: both pass — this catches any leftover unused import Step 5 missed.

- [ ] **Step 7: Run the trimmed integration suite**

```bash
npm --prefix backend run test:integration
```

Expected: all 10 remaining tests in `create-transaction-agent.int.test.ts` PASS, plus whatever `assistant-agent.int.test.ts` already has (untouched, unaffected).

- [ ] **Step 8: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/src/langchain/agents/create-transaction-agent.int.test.ts
git -C /home/alex/workspace/budget2 commit -m "test(backend): move nuanced-instruction-following cases out of create-transaction-agent.int.test.ts"
```

---

## Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck, lint, format check**

```bash
npm --prefix backend run typecheck
npm --prefix backend run lint
npm --prefix backend run prettier
```

Expected: all three pass.

- [ ] **Step 2: Full unit + repository suite (unaffected, sanity check)**

```bash
npm --prefix backend run test
```

Expected: passes, same as before this plan (no production code was touched).

- [ ] **Step 3: Full integration suite**

```bash
npm --prefix backend run test:integration
```

Expected: passes (10 tests in `create-transaction-agent.int.test.ts` + all of `assistant-agent.int.test.ts`).

- [ ] **Step 4: Full evals suite**

```bash
npm --prefix backend run test:evals
```

Expected: passes (11 tests in `create-transaction-agent.eval.test.ts`).

- [ ] **Step 5: Reconcile test count against the spec**

Confirm: `create-transaction-agent.int.test.ts` has 11 `it(...)` blocks (the "stays" list), `create-transaction-agent.eval.test.ts` has 11 `it(...)` blocks (10 moved + 1 new description-quality test) — 22 total, matching the original file's 21 cases plus the 1 net-new one.

```bash
grep -c '  it(\|    it(' backend/src/langchain/agents/create-transaction-agent.int.test.ts
grep -c '  it(\|    it(' backend/src/langchain/agents/create-transaction-agent.eval.test.ts
```

Expected: `11` and `11`.

- [ ] **Step 6: No further commit needed**

This task is verification-only — nothing to stage or commit unless a prior step's expectation wasn't met, in which case fix it within that task's file scope and amend that task's commit rather than adding a new one here.
