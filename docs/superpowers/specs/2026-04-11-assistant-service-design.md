# AssistantService Design

## Goal

Introduce `AssistantService` — a service wrapping a unified agent that handles both finance
questions and transaction creation from a single interface. Replace the current
`AssistantChatService` dependency on `InsightService` with a dependency on
`AssistantService`.

## Chosen Pattern: Skills with Dynamic Loading

The existing `InsightAgent` and `CreateTransactionAgent` share most of their data tools
(`getAccounts`, `getCategories`, `getTransactions`). They operate in the same domain
(personal finance) and benefit from shared conversation history.

Rather than an orchestrating agent that routes to sub-agents (Subagents pattern), a single
unified `AssistantAgent` holds all tools and dynamically loads a specialized skill prompt
before proceeding. This avoids orchestration complexity, eliminates inner/outer agent trace
infrastructure entirely, and produces a naturally flat trace.

### How skills work

The agent includes a `loadSkill` tool that accepts a skill name and returns the skill's
instruction prompt as a string. The agent calls `loadSkill` first on every request, receives
the domain-specific instructions as a tool result, and then proceeds with the data tools
using that context.

Skill prompts live in `langchain/skills/` as independent files. They start as copies of the
existing agent prompts and evolve independently.

## What Changes

### New files

| File | Purpose |
|------|---------|
| `langchain/skills/insight.ts` | Insight skill prompt (finance Q&A instructions) |
| `langchain/skills/create-transaction.ts` | Create-transaction skill prompt |
| `langchain/tools/load-skill.ts` | `loadSkillTool` — returns skill prompt as string |
| `langchain/agents/assistant-agent.ts` | `createAssistantAgent()` factory |
| `services/agent-services/assistant-service.ts` | `AssistantServiceImpl` |

### Modified files

| File | Change |
|------|--------|
| `services/agent-services/assistant-chat-service.ts` | Replace `InsightService` dep with `AssistantService`; add `isVoiceInput` to input |
| `graphql/schema.graphql` | Add `isVoiceInput: Boolean` to `AssistantInput` |
| `graphql/resolvers/assistant-resolvers.ts` | Pass `isVoiceInput` from args to service |
| `dependencies.ts` | Wire up new agent and service; update `resolveAssistantChatService` |

### Unchanged

- `InsightAgent`, `InsightService`, `InsightChatService` — remain until post-migration cleanup
- `CreateTransactionAgent`, `CreateTransactionFromTextService` — remain (used by Transactions page footer)
- `ChatMessageRepository`, session logic — unchanged
- All existing GraphQL types and resolvers except `AssistantInput`
- Frontend — no changes required

---

## Design

### Skill files

```
langchain/skills/insight.ts
langchain/skills/create-transaction.ts
```

Each file exports a single string constant — the domain-specific system prompt for that
skill. These are independent of the existing agent prompts in `langchain/agents/` and can
evolve separately.

### `loadSkill` tool

```
langchain/tools/load-skill.ts
```

Factory function `createLoadSkillTool()` returns a `DynamicStructuredTool`. The tool
accepts `{ skillName: "insight" | "createTransaction" }` and returns the corresponding
skill prompt string.

The description lists available skills with enough context for the agent to choose
correctly without requiring a prior classification step.

### `AssistantAgent`

```
langchain/agents/assistant-agent.ts
```

```
createAssistantAgent({ model, accountRepository, categoryRepository,
                       transactionRepository, transactionService })
  → ReactAgent
```

Context schema:
```typescript
{ userId: z.uuid(), today: z.iso.date(), isVoiceInput: z.boolean().default(false) }
```

Tools (all tools from both existing agents, plus `loadSkill`):
- `loadSkill`
- `getAccounts`
- `getCategories`
- `getTransactions`
- `aggregateTransactions`
- `createTransaction`
- math tools (`avg`, `calculate`, `sum`)

Middleware:
- `dynamicSystemPromptMiddleware` — brief orchestrator prompt (see below)
- `toolCallLimitMiddleware` — limits `createTransaction` to 1 run per invocation (same
  constraint as `CreateTransactionAgent`)

System prompt (brief — detailed instructions live in skills):

```
You are a personal finance assistant.

Always load a skill before proceeding:
- Use "insight" when the user asks a question about their finances
  (spending, balances, categories, history)
- Use "createTransaction" when the user describes a payment, purchase,
  income, or expense they want to record

Load the skill first, then use the available tools to fulfill the request.
```

### `AssistantService`

```
services/agent-services/assistant-service.ts
```

Single-purpose service with one public method `call`. Mirrors the structure of
`InsightServiceImpl` — wraps a `ReactAgent` and handles validation, invocation, and
result extraction.

Interface:

```typescript
interface AssistantInput {
  question: string;
  history?: readonly AgentMessage[];
  isVoiceInput?: boolean;
}

type AssistantOutput = Result<
  { answer: string; agentTrace: AgentTraceMessage[] },
  { message: string; agentTrace: AgentTraceMessage[] }
>;

interface AssistantService {
  call(userId: string, input: AssistantInput): Promise<AssistantOutput>;
}
```

Constructor:

```typescript
class AssistantServiceImpl implements AssistantService {
  constructor(private assistantAgent: ReactAgent) {}
}
```

`call()` logic:
1. Validate `userId` and `question` (return `Failure` if missing/empty)
2. Build messages array: `[...history, { role: "user", content: question }]`
3. Invoke agent with `{ messages }` and `context: { userId, today, isVoiceInput }`
4. Extract `answer` via `extractLastMessageText`, `agentTrace` via `extractAgentTrace`
5. Return `Failure({ message: "Empty response", agentTrace })` if no answer
6. Return `Success({ answer, agentTrace })`

No history forwarding to skills — the agent receives full history but skill prompts are
stateless. Each skill invocation operates on the current question.

### `AssistantChatService` changes

`AssistantChatServiceImpl` constructor changes:

```typescript
// Before
{ chatMessageRepository, insightService, maxMessages }

// After
{ chatMessageRepository, assistantService, maxMessages }
```

`AssistantChatInput` gains `isVoiceInput`:

```typescript
interface AssistantChatInput {
  question: string;
  sessionId?: string;
  isVoiceInput?: boolean;   // new
}
```

`call()` passes `isVoiceInput` through to `AssistantService`:

```typescript
const result = await this.assistantService.call(userId, {
  question: input.question,
  history,
  isVoiceInput: input.isVoiceInput,
});
```

### GraphQL schema change

```graphql
input AssistantInput {
  question: String!
  sessionId: ID
  isVoiceInput: Boolean   # new — optional, defaults to false in service
}
```

`assistant-resolvers.ts` passes the new field:

```typescript
const result = await context.assistantChatService.call(user.id, {
  question: args.input.question,
  sessionId: args.input.sessionId || undefined,
  isVoiceInput: args.input.isVoiceInput || undefined,  // new
});
```

### `dependencies.ts` changes

Add:

```typescript
export const resolveAssistantAgent = createSingleton(() =>
  createAssistantAgent({
    model: resolveBedrockChatModel(),
    accountRepository: resolveAccountRepository(),
    categoryRepository: resolveCategoryRepository(),
    transactionRepository: resolveTransactionRepository(),
    transactionService: resolveTransactionService(),
  }),
);

export const resolveAssistantService = createSingleton(
  () => new AssistantServiceImpl(resolveAssistantAgent()),
);
```

Update:

```typescript
export const resolveAssistantChatService = createSingleton(
  () =>
    new AssistantChatServiceImpl({
      chatMessageRepository: resolveChatMessageRepository(),
      assistantService: resolveAssistantService(),  // was: insightService
      maxMessages: chatHistoryMaxMessages,
    }),
);
```

---

## Trace

The agent trace is naturally flat — everything happens in one agent's message loop.
A typical trace for a finance question:

```
TOOL_CALL: loadSkill("insight")
TOOL_RESULT: [insight instructions]
TOOL_CALL: getTransactions(...)
TOOL_RESULT: [...]
TOOL_CALL: aggregateTransactions(...)
TOOL_RESULT: €240
TEXT: "You spent €240 on food this month."
```

A typical trace for transaction creation:

```
TOOL_CALL: loadSkill("createTransaction")
TOOL_RESULT: [create-transaction instructions]
TOOL_CALL: getAccounts(...)
TOOL_RESULT: [...]
TOOL_CALL: createTransaction(...)
TOOL_RESULT: { success: true, data: { id: "..." } }
TEXT: "Recorded: €4.50 for morning coffee."
```

No trace splicing, no inner/outer agent coordination, no new trace types.

---

## Testing

`AssistantServiceImpl` — unit tests with a mocked `ReactAgent`:
- Returns `Success` with answer and agentTrace on successful invocation
- Returns `Failure` when `userId` is empty
- Returns `Failure` when `question` is empty
- Returns `Failure` when agent returns empty response
- Passes `isVoiceInput` through to agent context

`AssistantChatService` tests — update existing tests:
- Replace `InsightService` mock with `AssistantService` mock
- Add test: passes `isVoiceInput` through to `AssistantService`

`AssistantAgent` — eval tests (following the pattern of `insight-agent.eval.ts` and
`create-transaction-agent.eval.ts`):
- Routes finance questions to the insight skill
- Routes transaction descriptions to the createTransaction skill
- Handles ambiguous input gracefully (text response, no tool error)

---

## Post-migration cleanup (out of scope for this change)

Once `AssistantService` is live and verified:
- Delete `InsightAgent` and `InsightServiceImpl` — replaced by `AssistantAgent` for the
  chat path; `CreateTransactionFromTextService` retains its own separate agent
- Remove `resolveInsightService` / `resolveInsightAgent` from `dependencies.ts`
