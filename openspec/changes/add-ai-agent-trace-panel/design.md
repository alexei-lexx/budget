## Context

Both AI-powered services (`InsightService`, `CreateTransactionFromTextService`) delegate to a `ReActAgent` that already captures a `toolExecutions` array from the LangChain message stream, but silently discards it. The LangChain `response.messages` array already contains the full chronological sequence needed — `HumanMessage`, `AIMessage` (with reasoning content blocks and tool calls), and `ToolMessage` (tool results). Nothing new needs to be fetched or computed; the data just needs to be extracted, typed, and surfaced.

The backend uses a clean three-layer architecture (resolver → service → agent). The trace flows up through all three layers and out via GraphQL.

## Goals / Non-Goals

**Goals:**

- Expose a typed `AgentTraceMessage[]` from the agent alongside the existing result
- Surface it in GraphQL responses for both AI endpoints
- Show the trace in a dismissable modal on insight and transaction creation pages
- Display reasoning, tool calls, and tool results as distinct, expandable entries

**Non-Goals:**

- Persisting traces to the database (in-memory per-response only)
- Streaming trace messages in real time during generation
- Displaying token usage or latency metrics from `response_metadata`
- Replaying or re-running traces

## Decisions

### 1. `AgentTraceMessage` type lives in the agent port

**Decision**: Add `AgentTraceMessage` and `AgentTraceMessageType` to `backend/src/services/ports/agent.ts`, alongside the existing `ToolExecution` and `AgentMessage` types. The `Agent.call()` return type gains `agentTrace: AgentTraceMessage[]`.

**Rationale**: The port defines the contract between services and agent implementations. Both belong there. Any future agent implementation (not just `ReActAgent`) will know it must return a trace.

**Alternative rejected**: Defining the type only inside `react-agent.ts` — would make it an implementation detail invisible to callers.

### 2. Trace extraction: walk `response.messages` in order

**Decision**: In `ReActAgent.call()`, iterate `response.messages` sequentially alongside the existing `toolExecutions` loop and build a flat `AgentTraceMessage[]`:

```
HumanMessage              → skip
AIMessage.content (array) → extract reasoning_content blocks → text events
AIMessage.tool_calls      → one tool_call event per entry
ToolMessage               → tool_result event (toolName from message.name)
AIMessage.content (string, no tool_calls) → text event
```

`AgentTraceMessage`:

```typescript
enum AgentTraceMessageType {
  TEXT = "TEXT",
  TOOL_CALL = "TOOL_CALL",
  TOOL_RESULT = "TOOL_RESULT",
}

type AgentTraceMessage =
  | { type: AgentTraceMessageType.TEXT; content: string }
  | { type: AgentTraceMessageType.TOOL_CALL; toolName: string; input: string }
  | {
      type: AgentTraceMessageType.TOOL_RESULT;
      toolName: string;
      output: string;
    };
```

Tool call args (`toolCall.args`) and tool result content are JSON-stringified with 2-space indent for readability. Unknown `content` block types in `AIMessage` are skipped gracefully.

**Rationale**: The stream is already iterated for `toolExecutions`. Piggybacking on the same loop adds minimal overhead. `toolName` on `tool_result` comes from `ToolMessage.name` directly — no ID-matching needed (that complexity stays in the `toolExecutions` path, which is untouched).

**Alternative rejected**: A separate iteration pass — redundant and harder to keep in sync.

### 3. GraphQL schema: `AgentTraceMessage` type + `InsightResponse` extension + `createTransactionFromText` wrapper

**Decision**:

```graphql
union AgentTraceMessage =
  | AgentTraceText
  | AgentTraceToolCall
  | AgentTraceToolResult

type AgentTraceText {
  content: String!
}

type AgentTraceToolCall {
  toolName: String!
  input: String!
}

type AgentTraceToolResult {
  toolName: String!
  output: String!
}

type InsightResponse {
  answer: String!
  agentMessages: [AgentTraceMessage!]!
}

type CreateTransactionFromTextResponse {
  transaction: Transaction!
  agentMessages: [AgentTraceMessage!]!
}
```

`createTransactionFromText` return type changes from `Transaction!` to `CreateTransactionFromTextResponse!` — a **breaking change** requiring coordinated frontend + backend deployment.

**Rationale**: `InsightResponse` already exists as a wrapper, so adding `agentMessages` is non-breaking there. `createTransactionFromText` currently returns `Transaction!` directly, so a wrapper type is unavoidable. Extending `Transaction` with trace data would violate domain boundaries.

**Alternative rejected**: Returning trace as a separate query/subscription — adds roundtrips and complexity for what is debug-only data.

### 4. Frontend: trace state lives in composables

**Decision**: `useInsight` and `useCreateTransactionFromText` expose `agentMessages: Ref<AgentTraceMessage[]>` populated after each successful response. The trigger button's visibility is derived from `agentMessages.value.length > 0`.

**Rationale**: Consistent with existing patterns — composables already own `loading`, `error`, and result state. The views stay thin.

### 5. UI: Vuetify dialog + expansion panels

**Decision**: A new `AgentTracePanel.vue` component renders as a `v-dialog` (full-screen on mobile, large on desktop). Each `AgentTraceMessage` is a `v-expansion-panel` entry. Message type is distinguished by a `v-chip` label (TEXT / TOOL CALL / TOOL RESULT). Content is rendered in a `<pre>` block (monospace, scrollable). The trigger button uses a `v-btn` with an icon, placed adjacent to the existing send button on both pages.

**Rationale**: Vuetify components satisfy the constitution's requirement to prefer framework components over custom implementations. `v-expansion-panels` provides the expandable/collapsible behavior required by the issue without custom state management.

## Risks / Trade-offs

- **Reasoning content is Claude-specific**: The `reasoning_content` block type in `AIMessage.content` is an Anthropic model feature. Other model providers won't emit it. → Unknown content block types are skipped; the panel simply shows fewer `text` entries with non-Claude models.
- **Large tool results**: Tool results containing many records (e.g., full transaction lists) produce very long content strings. → Content is shown in a scrollable `<pre>` block; no truncation in v1. Can add truncation later if needed.
- **Breaking change to `createTransactionFromText`**: Frontend and backend must deploy together. → Standard coordinated deployment via existing `deploy.sh`; no multi-version compatibility needed given single-tenant setup.

## Migration Plan

1. Update backend schema and regenerate types (`npm run codegen` in backend)
2. Update frontend schema sync (`npm run codegen:sync-schema` in frontend) and regenerate typed composables (`npm run codegen` in frontend)
3. Deploy backend and frontend together
4. No data migration required (trace is ephemeral, never persisted)

**Rollback**: Revert both frontend and backend to prior versions and redeploy.
