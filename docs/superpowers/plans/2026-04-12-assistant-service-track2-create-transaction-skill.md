# AssistantService — Track 2: createTransaction Skill Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `AssistantAgent` so it can also create transactions. Add the `createTransaction` skill prompt, expand the `loadSkill` tool to serve it, add `createCreateTransactionTool` to the agent, and update the orchestrator prompt to mention both skills.

**Architecture:** `CreateTransactionAgent` is left untouched — it is still used by `CreateTransactionFromTextService` on the Transactions page. Only `AssistantAgent` is extended. The `loadSkill` tool gains a second enum value. `toolCallLimitMiddleware` is added to cap transaction creation at one per invocation. Voice input indicator is injected into the system prompt dynamically.

**Prerequisite:** Track 1 merged. Branch from main.

**Tech Stack:** TypeScript, LangChain (`toolCallLimitMiddleware` from `"langchain"`), Zod v4, Jest

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `backend/src/langchain/skills/create-transaction.ts` | createTransaction skill prompt |
| Modify | `backend/src/langchain/tools/load-skill.ts` | Add `"createTransaction"` to skill enum and SKILLS map |
| Modify | `backend/src/langchain/tools/load-skill.test.ts` | Add test for createTransaction skill |
| Modify | `backend/src/langchain/agents/assistant-agent.ts` | Add `createTransaction` tool + `transactionService` arg; update prompt and middleware |
| Modify | `backend/src/langchain/agents/assistant-agent.test.ts` | Update tool count, args, middleware assertions |
| Modify | `backend/src/dependencies.ts` | Pass `transactionService` to `resolveAssistantAgent` |
| Modify | `backend/src/services/assistant-service.ts` | Add `isVoiceInput?: boolean` to `AssistantInput`; pass it in agent context |
| Modify | `backend/src/services/assistant-service.test.ts` | Add `isVoiceInput` pass-through tests |
| Modify | `backend/src/services/assistant-chat-service.ts` | Add `isVoiceInput?: boolean` to `AssistantChatInput`; thread through to `assistantService.call()` |
| Modify | `backend/src/services/assistant-chat-service.test.ts` | Add `isVoiceInput` pass-through test |
| Modify | `backend/src/graphql/schema.graphql` | Add `isVoiceInput: Boolean` to `AssistantInput` |
| Modify | `backend/src/graphql/resolvers/assistant-resolvers.ts` | Pass `isVoiceInput` from args to service |

---

### Task 1: Create createTransaction skill file

**Files:**
- Create: `backend/src/langchain/skills/create-transaction.ts`

Extract the `SYSTEM_PROMPT` constant from `create-transaction-agent.ts` verbatim.

- [ ] **Step 1: Create the skill file**

```typescript
// backend/src/langchain/skills/create-transaction.ts

export const CREATE_TRANSACTION_SKILL = `
## Role

You are an agent that creates payment transactions based on user input in natural language.

## Task

The user describes a transaction in plain text (e.g., "morning coffee 4.5 euro").
You MUST infer all mandatory and optional transaction fields and then MUST persist the transaction.

## Process

1. Infer all transaction fields — both mandatory and optional — following the rules below
2. If a mandatory field cannot be inferred, MUST stop and respond with an error
3. Create the transaction with all inferred fields
4. If creation fails, analyze the error and retry once with corrected fields
5. If the second attempt also fails, respond with an error and stop

## Inference rules

### Type

- Mandatory field
- Supported values:
  - income — money received (e.g., salary, earned, received)
  - expense — money spent (e.g., bought, paid, spent)
  - refund — money returned for a previous expense (e.g., refund, returned)
- Default to expense when intent is unclear

### Amount

- Mandatory field
- Numeric or written value representing a money quantity (e.g., 25, 20.5, "twenty five euros")
- If multiple amounts are present, MUST stop and report an error — only one transaction at a time
- If voice input is indicated:
  - Speech-to-text commonly collapses spoken prices — "two thirty four" becomes "234"
  - The integer "234" may represent 2.34, 23.4, or 234
  - Look up similar past transactions (same or related category, similar description) to assess which interpretation is most realistic
  - If no similar history exists, use the amount as transcribed

### Account

- Mandatory field
- Account MUST be active
- Select by priority:
  1. Currency match — account MUST match the mentioned currency
  2. Name match — prefer the account named or implied in user input
  3. Category history — prefer the account most used with the inferred category
  4. Overall history — prefer the account most used overall
- MUST look up past transactions for history-based criteria — do not guess

### Category

- Optional field
- Category MUST be active
- Infer by priority:
  1. Name match — category name mentioned in user input
  2. Signal match — synonyms, store names, product names imply a category
  3. History — most used category for similar transactions
- May look up past transactions for history-based criteria — do not guess

### Date

- Mandatory field
- Default to today's date unless an explicit date is provided

### Description

- Optional field
- Keep the original language of the user's text
- MUST be grammatically correct, without typos
- MUST describe the item or service — not the reason, parties, or context
- MUST provide meaningful details that supplement the transaction
- MUST NOT build description from the category name, its variations, or its translations
- Default to blank if no meaningful description can be formed

## Output

- If the transaction is successfully created, respond with OK
- If the transaction cannot be created, respond with an error message explaining why
`.trim();
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/langchain/skills/create-transaction.ts
git commit -m "feat: add createTransaction skill prompt file"
```

---

### Task 2: Extend loadSkill tool with createTransaction

**Files:**
- Modify: `backend/src/langchain/tools/load-skill.ts`
- Modify: `backend/src/langchain/tools/load-skill.test.ts`

Add `"createTransaction"` to the skill enum and SKILLS map. Update the tool description.

- [ ] **Step 1: Add the failing test**

Add the import and test case to `load-skill.test.ts`. The existing tests must remain unchanged.

```typescript
// Add to imports at top of backend/src/langchain/tools/load-skill.test.ts:
import { CREATE_TRANSACTION_SKILL } from "../skills/create-transaction";

// Add inside describe("invoke"):
it("returns createTransaction skill content for skillName 'createTransaction'", async () => {
  const loadSkillTool = createLoadSkillTool();

  const result = await loadSkillTool.invoke({
    skillName: "createTransaction",
  });

  expect(result).toBe(CREATE_TRANSACTION_SKILL);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- src/langchain/tools/load-skill.test.ts
```

Expected: FAIL — TypeScript error: `"createTransaction"` not assignable to `"insight"`

- [ ] **Step 3: Update the tool**

```typescript
// backend/src/langchain/tools/load-skill.ts

import { tool } from "langchain";
import { z } from "zod";
import { CREATE_TRANSACTION_SKILL } from "../skills/create-transaction";
import { INSIGHT_SKILL } from "../skills/insight";

const SKILLS = {
  createTransaction: CREATE_TRANSACTION_SKILL,
  insight: INSIGHT_SKILL,
} as const;

type SkillName = keyof typeof SKILLS;

export function createLoadSkillTool() {
  return tool(
    ({ skillName }: { skillName: SkillName }) => {
      return SKILLS[skillName];
    },
    {
      name: "loadSkill",
      description: `Load a skill prompt to get domain-specific instructions before proceeding.

Available skills:
- "insight" — for questions about finances (spending, balances, categories, history)
- "createTransaction" — when the user describes a payment, purchase, income, or expense to record`,
      schema: z.object({
        skillName: z
          .enum(["insight", "createTransaction"])
          .describe("The skill to load"),
      }),
    },
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npm test -- src/langchain/tools/load-skill.test.ts
```

Expected: PASS (both existing and new test)

- [ ] **Step 5: Commit**

```bash
git add backend/src/langchain/tools/load-skill.ts backend/src/langchain/tools/load-skill.test.ts backend/src/langchain/skills/create-transaction.ts
git commit -m "feat: extend loadSkill tool with createTransaction skill"
```

---

### Task 3: Update AssistantAgent with createTransaction tool

**Files:**
- Modify: `backend/src/langchain/agents/assistant-agent.ts`
- Modify: `backend/src/langchain/agents/assistant-agent.test.ts`
- Modify: `backend/src/dependencies.ts`

Add `transactionService` to the factory args. Add `createCreateTransactionTool` to the tool list. Update the orchestrator prompt to mention `"createTransaction"`. Add `toolCallLimitMiddleware` (same constraint as `CreateTransactionAgent`). Add voice input indicator to the system prompt when `isVoiceInput` is true.

> **Before starting:** Check whether `createMockTransactionService` exists at `backend/src/utils/test-utils/services/transaction-service-mocks.ts`. If not, create it:
>
> ```typescript
> // backend/src/utils/test-utils/services/transaction-service-mocks.ts
> import { jest } from "@jest/globals";
> import { TransactionService } from "../../../services/transaction-service";
>
> export const createMockTransactionService = (): jest.Mocked<TransactionService> =>
>   ({
>     createTransaction: jest.fn(),
>     // mirror all public methods from TransactionService with jest.fn()
>   }) as unknown as jest.Mocked<TransactionService>;
> ```

- [ ] **Step 1: Update the test**

Full replacement of `backend/src/langchain/agents/assistant-agent.test.ts`:

```typescript
// backend/src/langchain/agents/assistant-agent.test.ts

import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  createAgent,
  dynamicSystemPromptMiddleware,
  toolCallLimitMiddleware,
} from "langchain";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createMockTransactionService } from "../../utils/test-utils/services/transaction-service-mocks";
import { createAssistantAgent } from "./assistant-agent";

jest.mock("langchain", () => {
  const actual = jest.requireActual<typeof import("langchain")>("langchain");

  return {
    ...actual,
    createAgent: jest.fn(),
    dynamicSystemPromptMiddleware: jest.fn(),
    toolCallLimitMiddleware: jest.fn(),
  };
});

describe("createAssistantAgent", () => {
  let mockModel: BaseChatModel;

  beforeEach(() => {
    mockModel = {} as BaseChatModel;
    (createAgent as jest.Mock).mockReturnValue({ invoke: jest.fn() });
    (toolCallLimitMiddleware as jest.Mock).mockReturnValue(() => {});
    jest.clearAllMocks();
  });

  it("should call createAgent with correct tools", () => {
    createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      transactionService: createMockTransactionService(),
    });

    const callArg = (createAgent as jest.Mock).mock.calls[0][0] as {
      model: BaseChatModel;
      tools: { name: string }[];
      middleware: unknown[];
    };
    const { model, tools, middleware } = callArg;

    expect(model).toBe(mockModel);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toHaveLength(9);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "loadSkill",
        "aggregateTransactions",
        "avg",
        "calculate",
        "createTransaction",
        "getAccounts",
        "getCategories",
        "getTransactions",
        "sum",
      ]),
    );

    expect(middleware).toHaveLength(2);
  });

  it("should inject today date into system prompt", () => {
    createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      transactionService: createMockTransactionService(),
    });

    const buildSystemPrompt = (
      dynamicSystemPromptMiddleware as jest.Mock<
        typeof dynamicSystemPromptMiddleware
      >
    ).mock.calls[0][0];

    const systemPrompt = buildSystemPrompt(
      { messages: [] },
      {
        context: {
          today: "2000-01-02",
          userId: faker.string.uuid(),
          isVoiceInput: false,
        },
      },
    );

    expect(systemPrompt).toContain("You are a personal finance assistant");
    expect(systemPrompt).toContain("Today is 2000-01-02");
    expect(systemPrompt).not.toContain("voice recognition");
  });

  it("should include voice input indicator when isVoiceInput is true", () => {
    createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      transactionService: createMockTransactionService(),
    });

    const buildSystemPrompt = (
      dynamicSystemPromptMiddleware as jest.Mock<
        typeof dynamicSystemPromptMiddleware
      >
    ).mock.calls[0][0];

    const systemPrompt = buildSystemPrompt(
      { messages: [] },
      {
        context: {
          today: "2000-01-02",
          userId: faker.string.uuid(),
          isVoiceInput: true,
        },
      },
    );

    expect(systemPrompt).toContain("voice recognition");
  });

  it("should apply toolCallLimitMiddleware for createTransaction", () => {
    createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      transactionService: createMockTransactionService(),
    });

    expect(toolCallLimitMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "createTransaction", runLimit: 1 }),
    );
  });

  it("should return the agent created by createAgent", () => {
    const fakeAgent = { invoke: jest.fn() };
    (createAgent as jest.Mock).mockReturnValue(fakeAgent);

    const result = createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      transactionService: createMockTransactionService(),
    });

    expect(result).toBe(fakeAgent);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- src/langchain/agents/assistant-agent.test.ts
```

Expected: FAIL — tool count mismatch, missing `transactionService` arg, `toolCallLimitMiddleware` not mocked

- [ ] **Step 3: Update the agent**

```typescript
// backend/src/langchain/agents/assistant-agent.ts

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  createAgent,
  dynamicSystemPromptMiddleware,
  toolCallLimitMiddleware,
} from "langchain";
import { z } from "zod";
import { AccountRepository } from "../../ports/account-repository";
import { CategoryRepository } from "../../ports/category-repository";
import { TransactionRepository } from "../../ports/transaction-repository";
import { TransactionService } from "../../services/transaction-service";
import { createAggregateTransactionsTool } from "../tools/aggregate-transactions";
import {
  CREATE_TRANSACTION_TOOL_NAME,
  createCreateTransactionTool,
} from "../tools/create-transaction";
import { createGetAccountsTool } from "../tools/get-accounts";
import { createGetCategoriesTool } from "../tools/get-categories";
import { createGetTransactionsTool } from "../tools/get-transactions";
import { createLoadSkillTool } from "../tools/load-skill";
import { avgTool, calculateTool, sumTool } from "../tools/math";

export const assistantAgentContextSchema = z.object({
  isVoiceInput: z.boolean().default(false),
  today: z.iso.date(),
  userId: z.uuid(),
});

export type AssistantAgentContext = z.infer<typeof assistantAgentContextSchema>;

const ORCHESTRATOR_PROMPT = `
You are a personal finance assistant.

Always load a skill before proceeding:
- Use "insight" when the user asks a question about their finances
  (spending, balances, categories, history)
- Use "createTransaction" when the user describes a payment, purchase,
  income, or expense they want to record

Load the skill first, then use the available tools to fulfill the request.
`.trim();

export function createAssistantAgent({
  model,
  accountRepository,
  categoryRepository,
  transactionRepository,
  transactionService,
}: {
  model: BaseChatModel;
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
  transactionService: TransactionService;
}) {
  const dataTools = [
    createGetAccountsTool(accountRepository),
    createGetCategoriesTool({ categoryRepository, transactionRepository }),
    createGetTransactionsTool({ transactionRepository }),
    createAggregateTransactionsTool({ transactionRepository }),
  ];

  const mathTools = [avgTool, calculateTool, sumTool];
  const tools = [
    createLoadSkillTool(),
    ...dataTools,
    createCreateTransactionTool({ transactionService }),
    ...mathTools,
  ];

  return createAgent({
    model,
    tools,
    contextSchema: assistantAgentContextSchema,
    middleware: [
      dynamicSystemPromptMiddleware<AssistantAgentContext>((_state, runtime) => {
        const { today, isVoiceInput } = runtime.context;
        const parts = [
          ORCHESTRATOR_PROMPT,
          `## Current Date\n\nToday is ${today}.`,
          ...(isVoiceInput
            ? [
                "## Voice Input Indicator\n\nThe user's input was captured via voice recognition.",
              ]
            : []),
        ];
        return parts.join("\n\n");
      }),
      // Prevent creating more than one transaction per invocation
      toolCallLimitMiddleware({
        toolName: CREATE_TRANSACTION_TOOL_NAME,
        runLimit: 1,
      }),
    ],
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npm test -- src/langchain/agents/assistant-agent.test.ts
```

Expected: PASS

- [ ] **Step 5: Update dependencies.ts — add transactionService to resolveAssistantAgent**

```typescript
// In backend/src/dependencies.ts, update resolveAssistantAgent:
export const resolveAssistantAgent = createSingleton(() =>
  createAssistantAgent({
    model: resolveBedrockChatModel(),
    accountRepository: resolveAccountRepository(),
    categoryRepository: resolveCategoryRepository(),
    transactionRepository: resolveTransactionRepository(),
    transactionService: resolveTransactionService(),
  }),
);
```

- [ ] **Step 6: Run full test suite**

```bash
cd backend && npm test
```

Expected: all tests pass

- [ ] **Step 7: Run typecheck and lint**

```bash
cd backend && npm run typecheck && npm run format
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add backend/src/langchain/agents/assistant-agent.ts backend/src/langchain/agents/assistant-agent.test.ts backend/src/dependencies.ts
git commit -m "feat: add createTransaction tool and skill to AssistantAgent"
```

---

### Task 4: Wire isVoiceInput through the assistant stack

**Files:**
- Modify: `backend/src/services/assistant-service.ts`
- Modify: `backend/src/services/assistant-service.test.ts`
- Modify: `backend/src/services/assistant-chat-service.ts`
- Modify: `backend/src/services/assistant-chat-service.test.ts`
- Modify: `backend/src/graphql/schema.graphql`
- Modify: `backend/src/graphql/resolvers/assistant-resolvers.ts`

Thread `isVoiceInput` from GraphQL input → resolver → `AssistantChatService` → `AssistantService` → agent context. Task 3 already adds `isVoiceInput` to `assistantAgentContextSchema`; this task wires the plumbing so the value reaches it.

- [ ] **Step 1: Update AssistantService**

Add `isVoiceInput?: boolean` to `AssistantInput`. Pass it into the agent context alongside `userId` and `today`.

```typescript
// backend/src/services/assistant-service.ts

export interface AssistantInput {
  question: string;
  history?: readonly AgentMessage[];
  isVoiceInput?: boolean;
}
```

In the `invoke` call:
```typescript
context: {
  userId,
  today: formatDateAsYYYYMMDD(new Date()),
  isVoiceInput: input.isVoiceInput ?? false,
},
```

- [ ] **Step 2: Update AssistantService tests**

Add two tests to the `// Happy path` group in `describe("call")`:

```typescript
it("should pass isVoiceInput false in context by default", async () => {
  // Arrange
  // Agent returns a response (content irrelevant to this test)
  mockAssistantAgent.invoke.mockResolvedValue({
    messages: [new AIMessage({ content: "Answer" })],
  });

  // Act
  await service.call(userId, validInput);

  // Assert
  const [, config] = mockAssistantAgent.invoke.mock.calls[0] as [
    unknown,
    { context: { isVoiceInput: boolean } },
  ];
  expect(config.context.isVoiceInput).toBe(false);
});

it("should pass isVoiceInput true in context when set", async () => {
  // Arrange
  // Agent returns a response (content irrelevant to this test)
  mockAssistantAgent.invoke.mockResolvedValue({
    messages: [new AIMessage({ content: "Answer" })],
  });

  // Act
  await service.call(userId, { ...validInput, isVoiceInput: true });

  // Assert
  const [, config] = mockAssistantAgent.invoke.mock.calls[0] as [
    unknown,
    { context: { isVoiceInput: boolean } },
  ];
  expect(config.context.isVoiceInput).toBe(true);
});
```

- [ ] **Step 3: Update AssistantChatService**

Add `isVoiceInput?: boolean` to `AssistantChatInput`. Thread it through to `assistantService.call()`.

```typescript
export interface AssistantChatInput {
  question: string;
  sessionId?: string;
  isVoiceInput?: boolean;
}
```

In the `assistantService.call` invocation:
```typescript
const result = await this.assistantService.call(userId, {
  question: input.question,
  history,
  isVoiceInput: input.isVoiceInput,
});
```

- [ ] **Step 4: Update AssistantChatService tests**

Add one test to the `// Happy path` group:

```typescript
it("should pass isVoiceInput to AssistantService", async () => {
  // Arrange
  // No prior messages for this session
  chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
  // Message persistence succeeds
  chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
  // Assistant answers successfully
  assistantService.call.mockResolvedValue({
    success: true,
    data: { answer: "Answer", agentTrace: [] },
  });

  // Act
  await service.call(userId, { question: "Q?", isVoiceInput: true });

  // Assert
  expect(assistantService.call).toHaveBeenCalledWith(
    userId,
    expect.objectContaining({ isVoiceInput: true }),
  );
});
```

- [ ] **Step 5: Update GraphQL schema**

In `backend/src/graphql/schema.graphql`, update `AssistantInput`:

```graphql
input AssistantInput {
  question: String!
  sessionId: ID
  isVoiceInput: Boolean
}
```

- [ ] **Step 6: Run codegen**

```bash
cd backend && npm run codegen
```

Expected: `src/__generated__/resolvers-types.ts` updated — `MutationAskAssistantArgs` now has `isVoiceInput?: boolean | null` on its `input` field.

- [ ] **Step 7: Update the resolver**

```typescript
const result = await context.assistantChatService.call(user.id, {
  question: args.input.question,
  sessionId: args.input.sessionId || undefined,
  isVoiceInput: args.input.isVoiceInput ?? false,
});
```

- [ ] **Step 8: Run tests, typecheck, and lint**

```bash
cd backend && npm test && npm run typecheck && npm run format
```

Expected: all tests pass, no errors

- [ ] **Step 9: Commit**

```bash
git add backend/src/services/assistant-service.ts backend/src/services/assistant-service.test.ts \
  backend/src/services/assistant-chat-service.ts backend/src/services/assistant-chat-service.test.ts \
  backend/src/graphql/schema.graphql backend/src/graphql/resolvers/assistant-resolvers.ts \
  backend/src/__generated__/
git commit -m "feat: wire isVoiceInput through assistant stack"
```
