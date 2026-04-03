# Chat History — Track 1: Move insight to Mutation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `insight` from `Query` to `Mutation` — rename the field to `askInsight`, keep all existing types and all existing behavior unchanged.

**Architecture:** Schema change only: remove the field from `Query`, add it to `Mutation`. Existing `InsightInput`, `InsightOutput`, `InsightSuccess`, `InsightFailure` types stay as-is. Resolver moves from `Query` to `Mutation`. Frontend switches from lazy query to mutation call, keeping the same localStorage persistence pattern and the same public composable API.

**Tech Stack:** GraphQL (Apollo Server), TypeScript, GraphQL Code Generator, Vue 3, Vue Apollo

---

## Files

| File | Action |
|---|---|
| `backend/src/graphql/schema.graphql` | Modify — move `insight` from `type Query` to `type Mutation`, rename to `askInsight` |
| `backend/src/__generated__/resolvers-types.ts` | Regenerate via `npm run codegen` |
| `backend/src/graphql/resolvers/insight-resolvers.ts` | Modify — move handler from `Query` to `Mutation`, rename key, update arg type |
| `backend/src/graphql/resolvers/index.ts` | Modify — move `insightResolvers` spread from `Query` to `Mutation` |
| `frontend/src/schema.graphql` | Regenerate via `npm run codegen:sync-schema` |
| `frontend/src/graphql/queries.ts` | Modify — remove `GET_INSIGHT` |
| `frontend/src/graphql/mutations.ts` | Modify — add `ASK_INSIGHT` |
| `frontend/src/__generated__/vue-apollo.ts` | Regenerate via `npm run codegen` |
| `frontend/src/composables/useInsight.ts` | Modify — switch from lazy query to mutation, same behavior |

---

### Task 1: Update GraphQL schema and regenerate backend types

**Files:**
- Modify: `backend/src/graphql/schema.graphql`
- Regenerate: `backend/src/__generated__/resolvers-types.ts`

- [ ] **Step 1: Move the field**

In `backend/src/graphql/schema.graphql`:

Remove from `type Query`:
```graphql
  insight(input: InsightInput!): InsightOutput!
```

Add to `type Mutation` (before the closing `}`):
```graphql
  askInsight(input: InsightInput!): InsightOutput!
```

No other changes — `InsightInput`, `InsightOutput`, `InsightSuccess`, `InsightFailure` stay exactly as they are.

- [ ] **Step 2: Run backend codegen**

```bash
cd backend && npm run codegen
```

Expected: exits 0, regenerates `backend/src/__generated__/resolvers-types.ts` with `MutationAskInsightArgs` (replacing `QueryInsightArgs`).

---

### Task 2: Update the resolver and wire it into Mutation

**Files:**
- Modify: `backend/src/graphql/resolvers/insight-resolvers.ts`
- Modify: `backend/src/graphql/resolvers/index.ts`

- [ ] **Step 1: Move the resolver from Query to Mutation**

Replace the entire contents of `backend/src/graphql/resolvers/insight-resolvers.ts`:

```typescript
import { MutationAskInsightArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const insightResolvers = {
  Mutation: {
    askInsight: async (
      _parent: unknown,
      args: MutationAskInsightArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const result = await context.insightService.call(user.id, {
          question: args.input.question,
        });

        if (!result.success) {
          return {
            __typename: "InsightFailure" as const,
            message: result.error.message,
            agentTrace: result.error.agentTrace,
          };
        }

        return {
          __typename: "InsightSuccess" as const,
          answer: result.data.answer,
          agentTrace: result.data.agentTrace,
        };
      } catch (error) {
        handleResolverError(error, "Failed to fetch insight");
      }
    },
  },
};
```

- [ ] **Step 2: Update `resolvers/index.ts`**

Remove `...insightResolvers.Query` from the `Query` spread and add `...insightResolvers.Mutation` to the `Mutation` spread. The full updated file:

```typescript
import { Resolvers } from "../../__generated__/resolvers-types";
import { AgentTraceMessageType } from "../../services/ports/agent";
import { accountResolvers } from "./account-resolvers";
import { categoryResolvers } from "./category-resolvers";
import { createTransactionFromTextResolvers } from "./create-transaction-from-text-resolvers";
import { insightResolvers } from "./insight-resolvers";
import { reportResolvers } from "./report-resolvers";
import { telegramBotResolvers } from "./telegram-bot-resolvers";
import { transactionResolvers } from "./transaction-resolvers";
import { transferResolvers } from "./transfer-resolvers";
import { userResolvers } from "./user-resolvers";

export const resolvers: Resolvers = {
  Query: {
    ...accountResolvers.Query,
    ...categoryResolvers.Query,
    ...reportResolvers.Query,
    ...telegramBotResolvers.Query,
    ...transactionResolvers.Query,
    ...transferResolvers.Query,
    ...userResolvers.Query,
  },
  Mutation: {
    ...accountResolvers.Mutation,
    ...insightResolvers.Mutation,
    ...userResolvers.Mutation,
    ...categoryResolvers.Mutation,
    ...createTransactionFromTextResolvers.Mutation,
    ...telegramBotResolvers.Mutation,
    ...transactionResolvers.Mutation,
    ...transferResolvers.Mutation,
  },
  Account: accountResolvers.Account,
  Transaction: transactionResolvers.Transaction,
  AgentTraceMessage: {
    // GraphQL requires a __resolveType function for union types so it knows
    // which concrete type to use when serialising each item in agentTrace[].
    // The service layer uses a discriminated union keyed on `type`, so we map
    // that enum value to the corresponding GraphQL type name here.
    __resolveType(obj) {
      // Guard against unexpected shapes coming from the service layer.
      if (typeof obj !== "object" || obj === null) return undefined;
      if (!("type" in obj) || typeof obj.type !== "string") return undefined;

      switch (obj.type) {
        case AgentTraceMessageType.TEXT:
          return "AgentTraceText";
        case AgentTraceMessageType.TOOL_CALL:
          return "AgentTraceToolCall";
        case AgentTraceMessageType.TOOL_RESULT:
          return "AgentTraceToolResult";
        // Unknown type — returning undefined causes a GraphQL error
        default:
          return undefined;
      }
    },
  },
};
```

- [ ] **Step 3: Run backend typecheck**

```bash
cd backend && npm run typecheck
```

Expected: exits 0 with no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/graphql/schema.graphql backend/src/graphql/resolvers/insight-resolvers.ts backend/src/graphql/resolvers/index.ts backend/src/__generated__/resolvers-types.ts
git commit -m "move insight from Query to Mutation"
```

---

### Task 3: Update frontend to use the mutation

**Files:**
- Modify: `frontend/src/graphql/queries.ts`
- Modify: `frontend/src/graphql/mutations.ts`
- Regenerate: `frontend/src/schema.graphql`, `frontend/src/__generated__/vue-apollo.ts`
- Modify: `frontend/src/composables/useInsight.ts`

- [ ] **Step 1: Remove GET_INSIGHT from queries.ts**

In `frontend/src/graphql/queries.ts`, delete the entire `GET_INSIGHT` export:

```typescript
export const GET_INSIGHT = gql`
  query GetInsight($input: InsightInput!) {
    insight(input: $input) {
      ... on InsightSuccess {
        answer
        agentTrace {
          ...AgentTraceFields
        }
      }
      ... on InsightFailure {
        message
        agentTrace {
          ...AgentTraceFields
        }
      }
    }
  }
  ${AGENT_TRACE_FRAGMENT}
`;
```

Also remove `AGENT_TRACE_FRAGMENT` from the import at the top of `queries.ts` — check if any remaining query in that file still references `AgentTraceFields`. If none do, remove it from the import.

- [ ] **Step 2: Add ASK_INSIGHT to mutations.ts**

`AGENT_TRACE_FRAGMENT` is already imported in `mutations.ts` (verify first). Add at the end of `frontend/src/graphql/mutations.ts`:

```typescript
export const ASK_INSIGHT = gql`
  mutation AskInsight($input: InsightInput!) {
    askInsight(input: $input) {
      ... on InsightSuccess {
        answer
        agentTrace {
          ...AgentTraceFields
        }
      }
      ... on InsightFailure {
        message
        agentTrace {
          ...AgentTraceFields
        }
      }
    }
  }
  ${AGENT_TRACE_FRAGMENT}
`;
```

- [ ] **Step 3: Run frontend codegen**

```bash
cd frontend && npm run codegen:sync-schema && npm run codegen
```

Expected: exits 0. Regenerates `frontend/src/schema.graphql` (synced from backend) and `frontend/src/__generated__/vue-apollo.ts` with `useAskInsightMutation` (replacing `useGetInsightLazyQuery`).

- [ ] **Step 4: Update useInsight.ts**

Replace the entire contents of `frontend/src/composables/useInsight.ts`:

```typescript
import { ref, computed, watch } from "vue";
import { useAskInsightMutation } from "@/__generated__/vue-apollo";
import type { AgentTraceMessage } from "@/__generated__/vue-apollo";

const STORAGE_KEY = "insight-last-result";

interface StoredInsightResult {
  answer?: string;
  agentTrace: AgentTraceMessage[];
}

const loadStoredResult = (): StoredInsightResult | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveStoredResult = (result: StoredInsightResult): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Fallback: agentTrace can be large; try storing without it
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...result, agentTrace: [] }));
    } catch (error) {
      console.error("Failed to persist insight result:", error);
    }
  }
};

export function useInsight() {
  const stored = loadStoredResult();
  const storedAnswer = ref<string | null>(stored?.answer ?? null);
  const storedAgentTrace = ref<AgentTraceMessage[]>(stored?.agentTrace ?? []);

  const {
    mutate: askInsightMutate,
    loading: insightLoading,
    error: insightMutationError,
    result: mutationResult,
  } = useAskInsightMutation();

  const fetchedAnswer = computed(() => {
    const insight = mutationResult.value?.askInsight;
    if (insight?.__typename === "InsightSuccess") return insight.answer;
    return null;
  });

  const fetchedAgentTrace = computed(() => mutationResult.value?.askInsight?.agentTrace ?? []);

  const insightError = computed(() => {
    const insight = mutationResult.value?.askInsight;
    if (insight?.__typename === "InsightFailure") return insight.message;
    return insightMutationError.value?.message ?? null;
  });

  const insightAnswer = computed(() => fetchedAnswer.value ?? storedAnswer.value);

  const insightAgentTrace = computed(() =>
    fetchedAnswer.value !== null ? fetchedAgentTrace.value : storedAgentTrace.value,
  );

  watch(
    () => mutationResult.value,
    (result) => {
      if (result?.askInsight) {
        const agentTrace = result.askInsight.agentTrace;
        const answer =
          result.askInsight.__typename === "InsightSuccess" ? result.askInsight.answer : undefined;
        saveStoredResult({ answer, agentTrace });
        // Keep in sync so the fallback reflects the latest result if mutationResult goes null
        storedAnswer.value = answer ?? null;
        storedAgentTrace.value = agentTrace;
      }
    },
  );

  const askQuestion = async (question: string): Promise<void> => {
    await askInsightMutate({ input: { question } });
  };

  return {
    askQuestion,
    insightAgentTrace,
    insightAnswer,
    insightError,
    insightLoading,
  };
}
```

- [ ] **Step 5: Run frontend typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: exits 0 with no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/graphql/queries.ts frontend/src/graphql/mutations.ts frontend/src/composables/useInsight.ts frontend/src/__generated__/vue-apollo.ts frontend/src/schema.graphql
git commit -m "update frontend to use askInsight mutation"
```

---

### Task 4: Final validation

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend && npm test
```

Expected: All tests PASS.

- [ ] **Step 2: Run backend typecheck and format**

```bash
cd backend && npm run typecheck && npm run format
```

Expected: No errors.

- [ ] **Step 3: Run frontend typecheck and format**

```bash
cd frontend && npm run typecheck && npm run format
```

Expected: No errors.
