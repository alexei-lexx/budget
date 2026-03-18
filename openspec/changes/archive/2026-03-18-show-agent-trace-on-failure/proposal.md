## Why

When an AI-powered operation fails, the agent trace is discarded before it reaches the frontend — the agent trace button stays disabled and users have no way to inspect what the agent attempted. Making the trace available on failure requires threading it through the error path at every layer, which also motivates replacing the current ad-hoc GraphQL error approach with a typed Result union pattern at the API boundary.

## What Changes

- **BREAKING** Replace `InsightResponse` with `union InsightOutput = InsightSuccess | InsightFailure` in the GraphQL schema; `InsightSuccess` carries `answer` + `agentTrace`, `InsightFailure` carries `message` + `agentTrace`
- **BREAKING** Replace `CreateTransactionFromTextResponse` with `union CreateTransactionFromTextOutput = CreateTransactionFromTextSuccess | CreateTransactionFromTextFailure` using the same shape
- Service layer adopts a typed error interface (`message`, `agentTrace`) so post-agent failures carry the collected trace instead of discarding it
- Resolvers return typed data objects for domain failures instead of throwing `GraphQLError`
- Frontend GraphQL operations updated to query both union variants via inline fragments
- Frontend composables derive `agentTrace` from response data in both the success and failure branches

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `ai-agent-trace`: "Agent Trace Trigger Button" requirement — add scenario for trigger button becoming enabled after a failed AI response
- `insight`: "Agent Trace Access on Insight Page" requirement — add scenario for trace availability after a failed insight query
- `transactions`: "Agent Trace Access on Transactions Page" requirement — add scenario for trace availability after a failed natural language transaction creation

## Impact

- `backend/src/graphql/schema.graphql` — rename and restructure response types (breaking API change)
- `backend/src/services/insight-service.ts` — typed error, pass agentTrace in failure cases
- `backend/src/services/create-transaction-from-text-service.ts` — same
- `backend/src/graphql/resolvers/insight-resolvers.ts` — return union data, no throw
- `backend/src/graphql/resolvers/create-transaction-from-text-resolvers.ts` — same
- `frontend/src/graphql/queries.ts`, `mutations.ts` — inline fragments for both union variants
- `frontend/src/composables/useInsight.ts`, `useCreateTransactionFromText.ts` — read agentTrace from response data
- Backend and frontend codegen must be re-run after schema change

## Constitution Compliance

- **Schema-Driven Development**: Change begins with schema modification ✓
- **Backend Service Result Pattern**: Service errors remain in the Result pattern; typed error object extends it rather than replacing it ✓
- **Backend Layer Structure**: Resolvers continue to delegate to services; no business logic added to resolver layer ✓
- **TypeScript Code Generation**: Generated types consumed end-to-end; no `as any` or non-null assertions introduced ✓
