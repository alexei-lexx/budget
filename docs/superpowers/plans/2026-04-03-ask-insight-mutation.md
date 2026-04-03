# Ask Insight Mutation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `Query.insight` with `Mutation.askInsight` — renaming types to `AskInsight*` and adding `sessionId` to the API contract (returned as a random UUID for now; history wiring comes in a later plan).

**Architecture:** Schema types are renamed and the entry point moves from Query to Mutation. The resolver keeps calling `InsightService` directly with no session logic. `sessionId` is plumbed through the API now so the frontend can start storing it; actual history lookup is added in the next plan. Frontend switches from a lazy query to a mutation call and stores the returned `sessionId` in `localStorage`.

**Tech Stack:** GraphQL (Apollo Server), TypeScript, GraphQL Code Generator, Vue 3, Vue Apollo

---

## Files

| File | Action |
|---|---|
| `backend/src/graphql/schema.graphql` | Modify — replace Insight types with AskInsight types |
| `backend/src/graphql/resolvers/insight-resolvers.ts` | Delete |
| `backend/src/graphql/resolvers/ask-insight-resolvers.ts` | Create |
| `backend/src/graphql/resolvers/index.ts` | Modify — swap insight import and move to Mutation |
| `frontend/src/graphql/queries.ts` | Modify — remove `GET_INSIGHT` |
| `frontend/src/graphql/mutations.ts` | Modify — add `ASK_INSIGHT` |
| `frontend/src/composables/useInsight.ts` | Modify — switch to mutation, add sessionId persistence |

---

### Task 1: Update GraphQL schema and regenerate backend types

**Files:**
- Modify: `backend/src/graphql/schema.graphql`

- [ ] **Step 1: Update the schema**

In `backend/src/graphql/schema.graphql`:

Remove from `type Query`:
```graphql
  insight(input: InsightInput!): InsightOutput!
```

Remove these type definitions (lines ~89–99 and ~269–271):
```graphql
union InsightOutput = InsightSuccess | InsightFailure

type InsightSuccess {
  answer: String!
  agentTrace: [AgentTraceMessage!]!
}

type InsightFailure {
  message: String!
  agentTrace: [AgentTraceMessage!]!
}
```
```graphql
input InsightInput {
  question: String!
}
```

Add to `type Mutation` (before the closing `}`):
```graphql
  askInsight(input: AskInsightInput!): AskInsightOutput!
```

Add these new type definitions (place near the other union types, after `CreateTransactionFromTextOutput`):
```graphql
input AskInsightInput {
  question: String!
  sessionId: ID
}

union AskInsightOutput = AskInsightSuccess | AskInsightFailure

type AskInsightSuccess {
  answer: String!
  sessionId: ID!
  agentTrace: [AgentTraceMessage!]!
}

type AskInsightFailure {
  message: String!
  agentTrace: [AgentTraceMessage!]!
}
```

- [ ] **Step 2: Run backend codegen**

```bash
cd backend && npm run codegen
```

Expected: exits 0, regenerates `backend/src/__generated__/resolvers-types.ts` with `MutationAskInsightArgs`, `AskInsightSuccess`, `AskInsightFailure`.

- [ ] **Step 3: Verify types compile**

```bash
cd backend && npm run typecheck
```

Expected: errors referencing `insightResolvers` and `QueryInsightArgs` (the old resolver still exists). That is fine — it will be fixed in Task 2.

---

### Task 2: Replace insight resolver with ask-insight resolver

**Files:**
- Delete: `backend/src/graphql/resolvers/insight-resolvers.ts`
- Create: `backend/src/graphql/resolvers/ask-insight-resolvers.ts`
- Modify: `backend/src/graphql/resolvers/index.ts`

- [ ] **Step 1: Create the new resolver**

Create `backend/src/graphql/resolvers/ask-insight-resolvers.ts`:

```typescript
import { randomUUID } from "crypto";
import { MutationAskInsightArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const askInsightResolvers = {
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
            __typename: "AskInsightFailure" as const,
            message: result.error.message,
            agentTrace: result.error.agentTrace,
          };
        }

        return {
          __typename: "AskInsightSuccess" as const,
          answer: result.data.answer,
          sessionId: args.input.sessionId ?? randomUUID(),
          agentTrace: result.data.agentTrace,
        };
      } catch (error) {
        handleResolverError(error, "Failed to fetch insight");
      }
    },
  },
};
```

- [ ] **Step 2: Delete the old resolver**

Delete `backend/src/graphql/resolvers/insight-resolvers.ts`.

- [ ] **Step 3: Update resolvers/index.ts**

Replace:
```typescript
import { insightResolvers } from "./insight-resolvers";
```
with:
```typescript
import { askInsightResolvers } from "./ask-insight-resolvers";
```

In the `resolvers` object, remove `...insightResolvers.Query` from `Query` and add `...askInsightResolvers.Mutation` to `Mutation`:

```typescript
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
    ...askInsightResolvers.Mutation,
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
    __resolveType(obj) {
      if (typeof obj !== "object" || obj === null) return undefined;
      if (!("type" in obj) || typeof obj.type !== "string") return undefined;

      switch (obj.type) {
        case AgentTraceMessageType.TEXT:
          return "AgentTraceText";
        case AgentTraceMessageType.TOOL_CALL:
          return "AgentTraceToolCall";
        case AgentTraceMessageType.TOOL_RESULT:
          return "AgentTraceToolResult";
        default:
          return undefined;
      }
    },
  },
};
```

- [ ] **Step 4: Run typecheck**

```bash
cd backend && npm run typecheck
```

Expected: exits 0 with no errors.

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/graphql/schema.graphql src/graphql/resolvers/ask-insight-resolvers.ts src/graphql/resolvers/index.ts src/__generated__/resolvers-types.ts
git rm backend/src/graphql/resolvers/insight-resolvers.ts
git commit -m "replace Query.insight with Mutation.askInsight"
```

---

### Task 3: Update frontend to use the mutation

**Files:**
- Modify: `frontend/src/graphql/queries.ts`
- Modify: `frontend/src/graphql/mutations.ts`
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

Also remove `AGENT_TRACE_FRAGMENT` from the import if it's no longer used in `queries.ts` after this deletion. Check the other queries — if none use it, remove it. If other queries still use it, leave it.

- [ ] **Step 2: Add ASK_INSIGHT to mutations.ts**

In `frontend/src/graphql/mutations.ts`, add at the end (after the last export, before EOF). The `AGENT_TRACE_FRAGMENT` is already imported at the top of the file:

```typescript
export const ASK_INSIGHT = gql`
  mutation AskInsight($input: AskInsightInput!) {
    askInsight(input: $input) {
      ... on AskInsightSuccess {
        answer
        sessionId
        agentTrace {
          ...AgentTraceFields
        }
      }
      ... on AskInsightFailure {
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
cd frontend && npm run codegen
```

Expected: exits 0, regenerates `frontend/src/__generated__/vue-apollo.ts` with `useAskInsightMutation`.

- [ ] **Step 4: Update useInsight.ts**

Replace the entire contents of `frontend/src/composables/useInsight.ts`:

```typescript
import { ref, computed } from "vue";
import { useAskInsightMutation } from "@/__generated__/vue-apollo";
import type { AgentTraceMessage } from "@/__generated__/vue-apollo";

const STORAGE_KEY = "insight-last-result";
const SESSION_ID_STORAGE_KEY = "insight-session-id";

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

const loadSessionId = (): string | null => {
  try {
    return localStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch {
    return null;
  }
};

const saveSessionId = (sessionId: string): void => {
  try {
    localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  } catch {
    console.error("Failed to persist insight session ID:", sessionId);
  }
};

export function useInsight() {
  const sessionId = ref<string | null>(loadSessionId());

  const stored = loadStoredResult();
  const insightAnswer = ref<string | null>(stored?.answer ?? null);
  const insightAgentTrace = ref<AgentTraceMessage[]>(stored?.agentTrace ?? []);
  const insightError = ref<string | null>(null);

  const { mutate, loading: insightLoading } = useAskInsightMutation();

  const askQuestion = async (questionInput: string): Promise<void> => {
    const question = questionInput.trim();
    if (!question) return;

    insightError.value = null;

    try {
      const result = await mutate({
        input: {
          question,
          sessionId: sessionId.value ?? undefined,
        },
      });

      const response = result?.data?.askInsight ?? null;
      const agentTrace = response?.agentTrace ?? [];

      if (response?.__typename === "AskInsightFailure") {
        insightError.value = response.message;
        insightAgentTrace.value = agentTrace;
        saveStoredResult({ agentTrace });
        return;
      }

      if (response?.__typename === "AskInsightSuccess") {
        insightAnswer.value = response.answer;
        insightAgentTrace.value = agentTrace;
        sessionId.value = response.sessionId;
        saveSessionId(response.sessionId);
        saveStoredResult({ answer: response.answer, agentTrace });
      }
    } catch (e) {
      insightError.value = e instanceof Error ? e.message : "Unknown error occurred";
    }
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

## Self-Review

**Spec coverage:**
- `Query.insight` removed ✓
- `Mutation.askInsight` added ✓
- `AskInsight*` types (input, output, success, failure) ✓
- `sessionId` in input (optional) and output (required on success) ✓
- Frontend uses mutation, stores sessionId in localStorage ✓
- No history/session logic introduced ✓

**Placeholder scan:** None found.

**Type consistency:**
- `MutationAskInsightArgs` generated from schema, used in resolver ✓
- `useAskInsightMutation` generated from `ASK_INSIGHT` mutation doc, used in composable ✓
- `AskInsightSuccess.__typename` matches schema type name ✓
