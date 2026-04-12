# AssistantService — Track 1: Insight Skill Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Introduce `AssistantAgent` backed by a dynamic skill loader. Rename `InsightService` → `AssistantService`. Wire up `isVoiceInput` through the full stack from GraphQL to agent context.

**Architecture:** `AssistantAgent` holds the same insight tools as `InsightAgent` plus a `loadSkill` tool. A brief orchestrator system prompt tells the agent to call `loadSkill("insight")` first; the insight skill prompt (extracted from `InsightAgent`) provides domain-specific instructions. `InsightService` is renamed to `AssistantService` in-place; the constructor is updated to accept `assistantAgent`, `isVoiceInput` is added to input/context, and the `"My question: "` prefix is dropped.

**Tech Stack:** TypeScript, LangChain (`createAgent`, `dynamicSystemPromptMiddleware`, `tool` from `"langchain"`), Zod v4, Jest

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `backend/src/langchain/skills/insight.ts` | Insight skill prompt (finance Q&A instructions) |
| Create | `backend/src/langchain/tools/load-skill.ts` | `createLoadSkillTool()` — returns skill prompt as string |
| Create | `backend/src/langchain/tools/load-skill.test.ts` | Unit tests for loadSkill tool |
| Create | `backend/src/langchain/agents/assistant-agent.ts` | `createAssistantAgent()` factory |
| Create | `backend/src/langchain/agents/assistant-agent.test.ts` | Unit tests for AssistantAgent factory |
| Rename | `backend/src/services/insight-service.ts` → `assistant-service.ts` | Rename service + add `isVoiceInput`, drop `"My question: "` prefix |
| Rename | `backend/src/services/insight-service.test.ts` → `assistant-service.test.ts` | Rename test + update assertions |
| Modify | `backend/src/services/assistant-chat-service.ts` | Swap `InsightService` → `AssistantService`; add `isVoiceInput` |
| Modify | `backend/src/services/assistant-chat-service.test.ts` | Update mocks; add `isVoiceInput` pass-through test |
| Modify | `backend/src/graphql/schema.graphql` | Add `isVoiceInput: Boolean` to `AssistantInput` |
| Modify | `backend/src/graphql/resolvers/assistant-resolvers.ts` | Pass `isVoiceInput` from args to service |
| Modify | `backend/src/dependencies.ts` | Add new resolvers; update `resolveAssistantChatService` |

---

### Task 1: Create insight skill file

**Files:**
- Create: `backend/src/langchain/skills/insight.ts`

Extract the `SYSTEM_PROMPT` constant from `insight-agent.ts` verbatim. No logic — just an exported string.

- [x] **Step 1: Create the skill file**

```typescript
// backend/src/langchain/skills/insight.ts

export const INSIGHT_SKILL = `
## Role

You are a personal finance assistant.

## Task

User asks questions about their finances.
You must identify what data is relevant to the question and retrieve it.
And then perform calculations based on that data to answer the question.

## Process

First, break down the question into sub-questions if necessary.
For each sub-question, identify what calculations are needed.
For each calculation, identify what data is needed: accounts, categories, transactions.
Keep in mind that transactions can be linked to archived accounts and categories,
so you may need to retrieve both active and archived data.
When a step requires a time period and the user did not specify one, assume the current month.
Retrieve the necessary data in small, focused chunks.
Do calculations based on the retrieved data.
Answer the user's question based on the calculations and data.
If you assumed a time period, state it in the answer.

## Transaction types

- INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT
- EXPENSE increases spending
- REFUND decreases matching spending
- INCOME and all TRANSFER types never affect spending

## Rules

- For each calculation, clearly identify which transactions are included and why
- For each calculation, always state the number of transactions included
- Apply filtering consistently

## Output

- Keep the answer concise and focused on the question
- Respond in plain text
- Do NOT respond in markdown
`.trim();
```

- [x] **Step 2: Commit**

```bash
git add backend/src/langchain/skills/insight.ts
git commit -m "feat: add insight skill prompt file"
```

---

### Task 2: Create loadSkill tool (insight-only)

**Files:**
- Create: `backend/src/langchain/tools/load-skill.ts`
- Create: `backend/src/langchain/tools/load-skill.test.ts`

The tool accepts a `skillName` enum and returns the corresponding prompt string. Track 1 supports only `"insight"`.

- [x] **Step 1: Write the failing test**

```typescript
// backend/src/langchain/tools/load-skill.test.ts

import { describe, expect, it } from "@jest/globals";
import { INSIGHT_SKILL } from "../skills/insight";
import { createLoadSkillTool } from "./load-skill";

describe("createLoadSkillTool", () => {
  describe("invoke", () => {
    it("returns insight skill content for skillName 'insight'", async () => {
      const loadSkillTool = createLoadSkillTool();

      const result = await loadSkillTool.invoke({ skillName: "insight" });

      expect(result).toBe(INSIGHT_SKILL);
    });

    it("has tool name 'loadSkill'", () => {
      const loadSkillTool = createLoadSkillTool();

      expect(loadSkillTool.name).toBe("loadSkill");
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- src/langchain/tools/load-skill.test.ts
```

Expected: FAIL — `Cannot find module './load-skill'`

- [x] **Step 3: Implement the tool**

```typescript
// backend/src/langchain/tools/load-skill.ts

import { tool } from "langchain";
import { z } from "zod";
import { INSIGHT_SKILL } from "../skills/insight";

const SKILLS = {
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
- "insight" — for questions about finances (spending, balances, categories, history)`,
      schema: z.object({
        skillName: z.enum(["insight"]).describe("The skill to load"),
      }),
    },
  );
}
```

- [x] **Step 4: Run test to verify it passes**

```bash
cd backend && npm test -- src/langchain/tools/load-skill.test.ts
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add backend/src/langchain/tools/load-skill.ts backend/src/langchain/tools/load-skill.test.ts
git commit -m "feat: add loadSkill tool (insight-only)"
```

---

### Task 3: Create AssistantAgent

**Files:**
- Create: `backend/src/langchain/agents/assistant-agent.ts`
- Create: `backend/src/langchain/agents/assistant-agent.test.ts`

Mirrors `createInsightAgent` but adds the `loadSkill` tool, uses a brief orchestrator system prompt, and includes `isVoiceInput` in the context schema (passed through; the insight skill ignores it — used in Track 2).

- [x] **Step 1: Write the failing test**

```typescript
// backend/src/langchain/agents/assistant-agent.test.ts

import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createAssistantAgent } from "./assistant-agent";

jest.mock("langchain", () => {
  const actual = jest.requireActual<typeof import("langchain")>("langchain");

  return {
    ...actual,
    createAgent: jest.fn(),
    dynamicSystemPromptMiddleware: jest.fn(),
  };
});

describe("createAssistantAgent", () => {
  let mockModel: BaseChatModel;

  beforeEach(() => {
    mockModel = {} as BaseChatModel;
    (createAgent as jest.Mock).mockReturnValue({ invoke: jest.fn() });
    jest.clearAllMocks();
  });

  it("should call createAgent with correct tools", () => {
    createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
    });

    const callArg = (createAgent as jest.Mock).mock.calls[0][0] as {
      model: BaseChatModel;
      tools: { name: string }[];
      middleware: unknown[];
    };
    const { model, tools, middleware } = callArg;

    expect(model).toBe(mockModel);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toHaveLength(8);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "loadSkill",
        "aggregateTransactions",
        "avg",
        "calculate",
        "getAccounts",
        "getCategories",
        "getTransactions",
        "sum",
      ]),
    );

    expect(middleware).toHaveLength(1);
  });

  it("should inject today date into system prompt", () => {
    createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
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
  });

  it("should return the agent created by createAgent", () => {
    const fakeAgent = { invoke: jest.fn() };
    (createAgent as jest.Mock).mockReturnValue(fakeAgent);

    const result = createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
    });

    expect(result).toBe(fakeAgent);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- src/langchain/agents/assistant-agent.test.ts
```

Expected: FAIL — `Cannot find module './assistant-agent'`

- [x] **Step 3: Implement the agent**

```typescript
// backend/src/langchain/agents/assistant-agent.ts

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { z } from "zod";
import { AccountRepository } from "../../ports/account-repository";
import { CategoryRepository } from "../../ports/category-repository";
import { TransactionRepository } from "../../ports/transaction-repository";
import { createAggregateTransactionsTool } from "../tools/aggregate-transactions";
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

Load the skill first, then use the available tools to fulfill the request.
`.trim();

export function createAssistantAgent({
  model,
  accountRepository,
  categoryRepository,
  transactionRepository,
}: {
  model: BaseChatModel;
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
}) {
  const dataTools = [
    createGetAccountsTool(accountRepository),
    createGetCategoriesTool({ categoryRepository, transactionRepository }),
    createGetTransactionsTool({ transactionRepository }),
    createAggregateTransactionsTool({ transactionRepository }),
  ];

  const mathTools = [avgTool, calculateTool, sumTool];
  const tools = [createLoadSkillTool(), ...dataTools, ...mathTools];

  return createAgent({
    model,
    tools,
    contextSchema: assistantAgentContextSchema,
    middleware: [
      dynamicSystemPromptMiddleware<AssistantAgentContext>((_state, runtime) => {
        return `${ORCHESTRATOR_PROMPT}\n\n## Current Date\n\nToday is ${runtime.context.today}.`;
      }),
    ],
  });
}
```

- [x] **Step 4: Run test to verify it passes**

```bash
cd backend && npm test -- src/langchain/agents/assistant-agent.test.ts
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add backend/src/langchain/agents/assistant-agent.ts backend/src/langchain/agents/assistant-agent.test.ts
git commit -m "feat: add AssistantAgent with loadSkill tool and insight tools"
```

---

### Task 4: Rename InsightService to AssistantService

**Files:**
- Rename: `backend/src/services/insight-service.ts` → `assistant-service.ts`
- Rename: `backend/src/services/insight-service.test.ts` → `assistant-service.test.ts`

Rename all exported symbols in both files. Three behavioral changes alongside the rename: the constructor changes to accept `assistantAgent` (backed by `AssistantAgent`, not `InsightAgent`); `isVoiceInput` is added to the input and forwarded to agent context; the `"My question: "` prefix is dropped.

- [x] **Step 1: Git-rename both files**

```bash
git mv backend/src/services/insight-service.ts backend/src/services/assistant-service.ts
git mv backend/src/services/insight-service.test.ts backend/src/services/assistant-service.test.ts
```

- [x] **Step 2: Update assistant-service.ts**

Rename symbols and apply the three behavioral changes:

```typescript
// backend/src/services/assistant-service.ts

import { ReactAgent } from "langchain";
import { extractAgentTrace, extractLastMessageText } from "../langchain/utils";
import { AgentMessage, AgentTraceMessage } from "../ports/agent-types";
import { Failure, Result, Success } from "../types/result";
import { formatDateAsYYYYMMDD } from "../utils/date";

export interface AssistantInput {
  question: string;
  history?: readonly AgentMessage[];
  isVoiceInput?: boolean;
}

type AssistantOutput = Result<
  { answer: string; agentTrace: AgentTraceMessage[] },
  { message: string; agentTrace: AgentTraceMessage[] }
>;

export interface AssistantService {
  call(userId: string, input: AssistantInput): Promise<AssistantOutput>;
}

export class AssistantServiceImpl implements AssistantService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private assistantAgent: ReactAgent<any>) {}

  async call(userId: string, input: AssistantInput): Promise<AssistantOutput> {
    if (!userId) {
      return Failure({ message: "User ID is required", agentTrace: [] });
    }

    const normalizedQuestion = input.question.trim();
    if (!normalizedQuestion) {
      return Failure({ message: "Question is required", agentTrace: [] });
    }

    const historyMessages: readonly AgentMessage[] = input.history ?? [];
    const currentMessage: AgentMessage = {
      role: "user",
      content: normalizedQuestion,
    };
    const messages = [...historyMessages, currentMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const response = await this.assistantAgent.invoke(
      { messages },
      {
        context: {
          userId,
          today: formatDateAsYYYYMMDD(new Date()),
          isVoiceInput: input.isVoiceInput ?? false,
        },
      },
    );

    const answer = extractLastMessageText(response.messages)?.trim();
    const agentTrace = extractAgentTrace(response.messages);

    if (!answer) {
      return Failure({ message: "Empty response", agentTrace });
    }

    return Success({ answer, agentTrace });
  }
}
```

- [x] **Step 3: Update assistant-service.test.ts**

Rename all symbols. Update the prefix test (was `"My question: ..."`, now trimmed content only). Add two new tests for `isVoiceInput`.

Full updated file:

```typescript
// backend/src/services/assistant-service.test.ts

import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AIMessage, ReactAgent, ToolMessage } from "langchain";
import { AgentTraceMessageType } from "../ports/agent-types";
import {
  AssistantInput,
  AssistantService,
  AssistantServiceImpl,
} from "./assistant-service";

const createMockAssistantAgent = () => ({
  invoke: jest.fn() as jest.MockedFunction<
    (input: unknown, config?: unknown) => Promise<{ messages: unknown[] }>
  >,
});

describe("AssistantService", () => {
  let service: AssistantService;
  let userId: string;
  let mockAssistantAgent: ReturnType<typeof createMockAssistantAgent>;

  beforeEach(() => {
    mockAssistantAgent = createMockAssistantAgent();
    service = new AssistantServiceImpl(
      mockAssistantAgent as unknown as ReactAgent,
    );
    userId = faker.string.uuid();

    jest.clearAllMocks();
  });

  describe("validation", () => {
    it("should return failure when userId is empty", async () => {
      const result = await service.call("", { question: "Valid question?" });

      expect(result).toMatchObject({
        success: false,
        error: { message: "User ID is required" },
      });
      expect(mockAssistantAgent.invoke).not.toHaveBeenCalled();
    });

    it("should return failure when question is empty", async () => {
      const input: AssistantInput = { question: "" };

      const result = await service.call(userId, input);

      expect(result).toMatchObject({
        success: false,
        error: { message: "Question is required" },
      });
      expect(mockAssistantAgent.invoke).not.toHaveBeenCalled();
    });

    it("should return failure when question is only whitespace", async () => {
      const input: AssistantInput = { question: "   " };

      const result = await service.call(userId, input);

      expect(result).toMatchObject({
        success: false,
        error: { message: "Question is required" },
      });
      expect(mockAssistantAgent.invoke).not.toHaveBeenCalled();
    });
  });

  describe("call", () => {
    const validInput: AssistantInput = {
      question: "Why did my food spending increase?",
    };

    it("should return AI response for valid input", async () => {
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Your food spending was $50." })],
      });

      const result = await service.call(userId, validInput);

      expect(result).toMatchObject({
        success: true,
        data: { answer: "Your food spending was $50." },
      });
    });

    it("should trim answer whitespace", async () => {
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({ content: "  Your food spending was $50.  " }),
        ],
      });

      const result = await service.call(userId, validInput);

      expect(result).toMatchObject({
        success: true,
        data: { answer: "Your food spending was $50." },
      });
    });

    it("should trim question whitespace before sending", async () => {
      const input: AssistantInput = { question: "  What is my spending?  " };
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      await service.call(userId, input);

      const [state] = mockAssistantAgent.invoke.mock.calls[0] as [
        { messages: { content: string }[] },
        unknown,
      ];
      const lastMessage = state.messages[state.messages.length - 1];
      expect(lastMessage.content).toBe("What is my spending?");
    });

    it("should pass userId in context", async () => {
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      await service.call(userId, validInput);

      const [, config] = mockAssistantAgent.invoke.mock.calls[0] as [
        unknown,
        { context: { userId: string } },
      ];
      expect(config.context.userId).toBe(userId);
    });

    it("should pass today's date in context", async () => {
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      await service.call(userId, validInput);

      const [, config] = mockAssistantAgent.invoke.mock.calls[0] as [
        unknown,
        { context: { today: string } },
      ];
      expect(config.context.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should pass isVoiceInput: true in context when provided", async () => {
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      await service.call(userId, { ...validInput, isVoiceInput: true });

      const [, config] = mockAssistantAgent.invoke.mock.calls[0] as [
        unknown,
        { context: { isVoiceInput: boolean } },
      ];
      expect(config.context.isVoiceInput).toBe(true);
    });

    it("should default isVoiceInput to false when not provided", async () => {
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      await service.call(userId, validInput);

      const [, config] = mockAssistantAgent.invoke.mock.calls[0] as [
        unknown,
        { context: { isVoiceInput: boolean } },
      ];
      expect(config.context.isVoiceInput).toBe(false);
    });

    it("should prepend history messages before the user question", async () => {
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });
      const history = [
        { role: "user" as const, content: "Previous question" },
        { role: "assistant" as const, content: "Previous answer" },
      ];

      await service.call(userId, { ...validInput, history });

      const [state] = mockAssistantAgent.invoke.mock.calls[0] as [
        { messages: { role: string; content: string }[] },
        unknown,
      ];
      expect(state.messages).toHaveLength(3);
      expect(state.messages[0]).toEqual(history[0]);
      expect(state.messages[1]).toEqual(history[1]);
      expect(state.messages[2].content).toContain(validInput.question);
    });

    it("should work without history (history defaults to empty)", async () => {
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      await service.call(userId, validInput);

      const [state] = mockAssistantAgent.invoke.mock.calls[0] as [
        { messages: unknown[] },
        unknown,
      ];
      expect(state.messages).toHaveLength(1);
    });

    it("should propagate error when assistantAgent fails", async () => {
      mockAssistantAgent.invoke.mockRejectedValue(
        new Error("AI service unavailable"),
      );

      await expect(service.call(userId, validInput)).rejects.toThrow(
        "AI service unavailable",
      );
    });

    it("should return agentTrace on success", async () => {
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({ content: "Thinking..." }),
          new AIMessage({ content: "Answer" }),
        ],
      });

      const result = await service.call(userId, validInput);

      expect(result).toMatchObject({
        success: true,
        data: {
          agentTrace: expect.arrayContaining([
            { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
          ]),
        },
      });
    });

    it("should return agentTrace on empty response failure", async () => {
      const thinkingMessage = new AIMessage({ content: "Thinking..." });
      const emptyFinalMessage = new AIMessage({ content: "" });
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [thinkingMessage, emptyFinalMessage],
      });

      const result = await service.call(userId, validInput);

      expect(result).toMatchObject({
        success: false,
        error: {
          message: "Empty response",
          agentTrace: [
            { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
          ],
        },
      });
    });

    it("should include tool call and result in agentTrace", async () => {
      const aiMessage = new AIMessage({
        content: "",
        tool_calls: [
          { id: "call_1", name: "loadSkill", args: {}, type: "tool_call" },
        ],
      });
      const toolMessage = new ToolMessage({
        content: "skill instructions...",
        tool_call_id: "call_1",
        name: "loadSkill",
      });
      const finalMessage = new AIMessage({ content: "You have no accounts." });
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [aiMessage, toolMessage, finalMessage],
      });

      const result = await service.call(userId, validInput);

      expect(result).toMatchObject({
        success: true,
        data: {
          agentTrace: expect.arrayContaining([
            expect.objectContaining({
              type: AgentTraceMessageType.TOOL_CALL,
              toolName: "loadSkill",
            }),
            expect.objectContaining({
              type: AgentTraceMessageType.TOOL_RESULT,
              toolName: "loadSkill",
            }),
          ]),
        },
      });
    });
  });
});
```

- [x] **Step 4: Run tests to verify they pass**

```bash
cd backend && npm test -- src/services/assistant-service.test.ts
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add backend/src/services/assistant-service.ts backend/src/services/assistant-service.test.ts
git commit -m "feat: rename InsightService to AssistantService; add isVoiceInput to context"
```

---

### Task 5: Update AssistantChatService

**Files:**
- Modify: `backend/src/services/assistant-chat-service.ts`
- Modify: `backend/src/services/assistant-chat-service.test.ts`

Swap `insightService` dependency for `assistantService`. Add `isVoiceInput?: boolean` to `AssistantChatInput` and thread it through to `assistantService.call()`.

- [x] **Step 1: Update the test file**

```typescript
// backend/src/services/assistant-chat-service.test.ts

import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ChatMessageRole } from "../models/chat-message";
import { ChatMessageRepository } from "../ports/chat-message-repository";
import { fakeChatMessage } from "../utils/test-utils/models/chat-message-fakes";
import { createMockChatMessageRepository } from "../utils/test-utils/repositories/chat-message-repository-mocks";
import {
  AssistantChatService,
  AssistantChatServiceImpl,
} from "./assistant-chat-service";
import { AssistantService } from "./assistant-service";

const createMockAssistantService = (): jest.Mocked<AssistantService> => ({
  call: jest.fn(),
});

describe("AssistantChatService", () => {
  const userId = faker.string.uuid();
  const maxMessages = 20;

  let service: AssistantChatService;
  let assistantService: jest.Mocked<AssistantService>;
  let chatMessageRepository: jest.Mocked<ChatMessageRepository>;

  beforeEach(() => {
    assistantService = createMockAssistantService();
    chatMessageRepository = createMockChatMessageRepository();

    service = new AssistantChatServiceImpl({
      chatMessageRepository,
      assistantService,
      maxMessages,
    });

    jest.clearAllMocks();
  });

  describe("call", () => {
    it("should return success with answer and sessionId", async () => {
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "You spent $100", agentTrace: [] },
      });

      const result = await service.call(userId, {
        question: "How much did I spend?",
      });

      expect(result).toEqual({
        success: true,
        data: {
          agentTrace: [],
          answer: "You spent $100",
          sessionId: expect.any(String),
        },
      });
    });

    it("should use provided sessionId if given", async () => {
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

      const result = await service.call(userId, { question: "Q?", sessionId });

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({ sessionId }),
      });
      expect(
        chatMessageRepository.findManyRecentBySessionId,
      ).toHaveBeenCalledWith({ userId, sessionId }, maxMessages);
    });

    it("should load history and pass it to AssistantService", async () => {
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([
        fakeChatMessage({
          userId,
          sessionId,
          role: ChatMessageRole.ASSISTANT,
          content: "Prior answer",
        }),
        fakeChatMessage({
          userId,
          sessionId,
          role: ChatMessageRole.USER,
          content: "Prior question",
        }),
      ]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

      await service.call(userId, { question: "Follow-up?", sessionId });

      expect(assistantService.call).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          question: "Follow-up?",
          history: [
            { role: "user", content: "Prior question" },
            { role: "assistant", content: "Prior answer" },
          ],
        }),
      );
    });

    it("should pass isVoiceInput through to AssistantService", async () => {
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

      await service.call(userId, {
        question: "Coffee 4.5 euro",
        isVoiceInput: true,
      });

      expect(assistantService.call).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ isVoiceInput: true }),
      );
    });

    it("should save user message and assistant answer after success", async () => {
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "You spent $100", agentTrace: [] },
      });

      await service.call(userId, { question: "How much?", sessionId });

      expect(chatMessageRepository.create).toHaveBeenCalledTimes(2);
      expect(chatMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          sessionId,
          role: ChatMessageRole.USER,
          content: "How much?",
        }),
      );
      expect(chatMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          sessionId,
          role: ChatMessageRole.ASSISTANT,
          content: "You spent $100",
        }),
      );
    });

    it("should return failure and not save messages when AssistantService fails", async () => {
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      assistantService.call.mockResolvedValue({
        success: false,
        error: { message: "AI failed", agentTrace: [] },
      });

      const result = await service.call(userId, { question: "Q?" });

      expect(result).toEqual({
        success: false,
        error: {
          message: "AI failed",
          agentTrace: [],
          sessionId: expect.any(String),
        },
      });
      expect(chatMessageRepository.create).not.toHaveBeenCalled();
    });

    it("should generate sessionId when not provided", async () => {
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

      const result = await service.call(userId, { question: "Q?" });

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({ sessionId: expect.any(String) }),
      });
    });

    it("should call repository with maxMessages limit", async () => {
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

      await service.call(userId, { question: "Q?", sessionId });

      expect(
        chatMessageRepository.findManyRecentBySessionId,
      ).toHaveBeenCalledWith({ userId, sessionId }, maxMessages);
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- src/services/assistant-chat-service.test.ts
```

Expected: FAIL — type errors or `insightService` not found

- [x] **Step 3: Update the service**

```typescript
// backend/src/services/assistant-chat-service.ts

import { randomUUID } from "crypto";
import { ChatMessageRole } from "../models/chat-message";
import { AgentMessage, AgentTraceMessage } from "../ports/agent-types";
import { ChatMessageRepository } from "../ports/chat-message-repository";
import { Failure, Result, Success } from "../types/result";
import { AssistantService } from "./assistant-service";

export interface AssistantChatInput {
  question: string;
  sessionId?: string;
  isVoiceInput?: boolean;
}

interface AssistantChatData {
  agentTrace: AgentTraceMessage[];
  answer: string;
  sessionId: string;
}

// sessionId is included on both success and failure
// so the caller can continue the same session on retry,
// without needing to independently persist it client-side.
interface AssistantChatError {
  agentTrace: AgentTraceMessage[];
  message: string;
  sessionId: string;
}

export type AssistantChatOutput = Result<AssistantChatData, AssistantChatError>;

export interface AssistantChatService {
  call(userId: string, input: AssistantChatInput): Promise<AssistantChatOutput>;
}

export class AssistantChatServiceImpl implements AssistantChatService {
  private readonly chatMessageRepository: ChatMessageRepository;
  private readonly assistantService: AssistantService;
  private readonly maxMessages: number;

  constructor(deps: {
    chatMessageRepository: ChatMessageRepository;
    assistantService: AssistantService;
    maxMessages: number;
  }) {
    this.chatMessageRepository = deps.chatMessageRepository;
    this.assistantService = deps.assistantService;
    this.maxMessages = deps.maxMessages;
  }

  async call(
    userId: string,
    input: AssistantChatInput,
  ): Promise<AssistantChatOutput> {
    const sessionId = input.sessionId || randomUUID();

    // Load history for this session
    const recentMessages =
      await this.chatMessageRepository.findManyRecentBySessionId(
        { userId, sessionId },
        this.maxMessages,
      );

    const roleMap: Record<ChatMessageRole, AgentMessage["role"]> = {
      [ChatMessageRole.ASSISTANT]: "assistant",
      [ChatMessageRole.USER]: "user",
    };

    const history: AgentMessage[] = recentMessages
      .toReversed()
      .map((message) => ({
        role: roleMap[message.role],
        content: message.content,
      }));

    // Call AssistantService with history
    const result = await this.assistantService.call(userId, {
      question: input.question,
      history,
      isVoiceInput: input.isVoiceInput,
    });

    if (!result.success) {
      return Failure({ ...result.error, sessionId });
    }

    // Persist user question and assistant answer after successful response
    await this.chatMessageRepository.create({
      userId,
      sessionId,
      role: ChatMessageRole.USER,
      content: input.question,
    });
    await this.chatMessageRepository.create({
      userId,
      sessionId,
      role: ChatMessageRole.ASSISTANT,
      content: result.data.answer,
    });

    return Success({
      answer: result.data.answer,
      agentTrace: result.data.agentTrace,
      sessionId,
    });
  }
}
```

- [x] **Step 4: Run test to verify it passes**

```bash
cd backend && npm test -- src/services/assistant-chat-service.test.ts
```

Expected: PASS

- [x] **Step 5: Run full test suite to check for regressions**

```bash
cd backend && npm test
```

Expected: all tests pass

- [x] **Step 6: Commit**

```bash
git add backend/src/services/assistant-chat-service.ts backend/src/services/assistant-chat-service.test.ts
git commit -m "feat: update AssistantChatService to use AssistantService; add isVoiceInput"
```

---

### Task 6: Update GraphQL schema and resolver _(moved to Track 2)_

**Files:**
- Modify: `backend/src/graphql/schema.graphql`
- Modify: `backend/src/graphql/resolvers/assistant-resolvers.ts`

Add `isVoiceInput: Boolean` to `AssistantInput`. Pass the new field from resolver args to service. Run codegen to regenerate types.

- [x] **Step 1: Update the schema**

In `backend/src/graphql/schema.graphql`, find `AssistantInput` and add the new field:

```graphql
input AssistantInput {
  question: String!
  sessionId: ID
  isVoiceInput: Boolean
}
```

- [x] **Step 2: Run codegen**

```bash
cd backend && npm run codegen
```

Expected: `src/__generated__/resolvers-types.ts` updated — `MutationAskAssistantArgs` now has `isVoiceInput?: boolean | null` on its `input` field.

- [x] **Step 3: Update the resolver**

```typescript
// backend/src/graphql/resolvers/assistant-resolvers.ts

import { MutationAskAssistantArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const assistantResolvers = {
  Mutation: {
    askAssistant: async (
      _parent: unknown,
      args: MutationAskAssistantArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const result = await context.assistantChatService.call(user.id, {
          question: args.input.question,
          sessionId: args.input.sessionId || undefined,
          isVoiceInput: args.input.isVoiceInput || undefined,
        });

        if (!result.success) {
          return {
            __typename: "AssistantFailure" as const,
            message: result.error.message,
            agentTrace: result.error.agentTrace,
            sessionId: result.error.sessionId,
          };
        }

        return {
          __typename: "AssistantSuccess" as const,
          answer: result.data.answer,
          agentTrace: result.data.agentTrace,
          sessionId: result.data.sessionId,
        };
      } catch (error) {
        handleResolverError(error, "Failed to fetch assistant response");
      }
    },
  },
};
```

- [x] **Step 4: Run typecheck**

```bash
cd backend && npm run typecheck
```

Expected: no errors

- [x] **Step 5: Commit**

```bash
git add backend/src/graphql/schema.graphql backend/src/graphql/resolvers/assistant-resolvers.ts backend/src/__generated__/
git commit -m "feat: add isVoiceInput to AssistantInput GraphQL type"
```

---

### Task 7: Update dependencies.ts

**Files:**
- Modify: `backend/src/dependencies.ts`

Add `resolveAssistantAgent`. Rename `resolveInsightService` → `resolveAssistantService` and update it to wrap `resolveAssistantAgent`. Update `resolveAssistantChatService` to pass `assistantService`. `resolveInsightAgent` and `resolveInsightAgent` resolver can stay — they are now unused but cleanup is out of scope.

- [x] **Step 1: Update imports**

```typescript
// Add:
import { createAssistantAgent } from "./langchain/agents/assistant-agent";
import { AssistantServiceImpl } from "./services/assistant-service";

// Remove:
import { InsightServiceImpl } from "./services/insight-service";
```

- [x] **Step 2: Add `resolveAssistantAgent` in the `// AI agents` section, after `resolveInsightAgent`**

```typescript
export const resolveAssistantAgent = createSingleton(() =>
  createAssistantAgent({
    model: resolveBedrockChatModel(),
    accountRepository: resolveAccountRepository(),
    categoryRepository: resolveCategoryRepository(),
    transactionRepository: resolveTransactionRepository(),
  }),
);
```

- [x] **Step 3: Rename `resolveInsightService` → `resolveAssistantService`, point it at `resolveAssistantAgent`**

```typescript
// Before:
export const resolveInsightService = createSingleton(
  () => new InsightServiceImpl(resolveInsightAgent()),
);

// After:
export const resolveAssistantService = createSingleton(
  () => new AssistantServiceImpl(resolveAssistantAgent()),
);
```

- [x] **Step 4: Update `resolveAssistantChatService`**

```typescript
export const resolveAssistantChatService = createSingleton(
  () =>
    new AssistantChatServiceImpl({
      chatMessageRepository: resolveChatMessageRepository(),
      assistantService: resolveAssistantService(),
      maxMessages: chatHistoryMaxMessages,
    }),
);
```

- [x] **Step 5: Run typecheck, lint, and full test suite**

```bash
cd backend && npm run typecheck && npm run format && npm test
```

Expected: no errors, all tests pass

- [x] **Step 6: Commit**

```bash
git add backend/src/dependencies.ts
git commit -m "feat: wire AssistantAgent and AssistantService in dependency injection"
```
