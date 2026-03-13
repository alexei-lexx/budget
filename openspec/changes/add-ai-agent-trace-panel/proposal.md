## Why

When the AI responds on the insight or transaction creation page, users see only the final result — no visibility into what tools the agent called, what data it retrieved, or what reasoning it applied. This makes debugging AI behavior and understanding incorrect inferences difficult.

## What Changes

- Both AI-powered services (`InsightService`, `CreateTransactionFromTextService`) capture and return the full chronological agent trace alongside existing results
- GraphQL schema exposes `agentTrace: [AgentTraceMessage!]!` on both endpoints — **BREAKING** for `createTransactionFromText` (return type changes from `Transaction!` to a wrapper type)
- A trigger button is always shown near the send button on both the insight page and transaction creation page, becoming enabled once a response is received
- Clicking the trigger opens a modal panel displaying the agent trace: reasoning steps, tool calls with inputs, and tool results — each individually expandable/collapsible

## Capabilities

### New Capabilities

- `ai-agent-trace`: Agent trace message capture in the backend agent, GraphQL type definitions, and the frontend trace panel UI component

### Modified Capabilities

- `insight`: `InsightResponse` gains an `agentTrace` field returning the agent trace
- `transactions`: `createTransactionFromText` mutation return type changes from `Transaction!` to `CreateTransactionFromTextResponse` containing both the transaction and agent trace — **BREAKING**

## Impact

- `backend/src/agents/react-agent.ts` — build `AgentTraceMessage[]` from `response.messages` alongside existing `toolExecutions`
- `backend/src/services/ports/agent.ts` — add `AgentTraceMessage` type and include trace in agent `call()` return
- `backend/src/services/insight-service.ts` — pass trace through from agent
- `backend/src/services/create-transaction-from-text-service.ts` — pass trace through from agent
- `backend/src/graphql/schema.graphql` — add `AgentTraceMessage` type, update `InsightResponse`, wrap `createTransactionFromText` return
- `backend/src/graphql/resolvers/` — include trace in resolver responses
- `frontend/src/graphql/` — sync schema, update queries/mutations to request `agentTrace`
- `frontend/src/composables/` — expose trace from `useInsight` and `useCreateTransactionFromText`
- `frontend/src/views/` — add trigger button to Insight and Transactions pages
- New `frontend/src/components/AgentTracePanel.vue` — modal with expandable trace messages
