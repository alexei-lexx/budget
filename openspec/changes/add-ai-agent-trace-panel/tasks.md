## 1. Backend: Agent Port Types

- [x] 1.1 Add `AgentTraceMessageType` enum and `AgentTraceMessage` discriminated union to `backend/src/services/ports/agent.ts`
- [x] 1.2 Update `Agent` interface `call()` return type to include `agentTrace: AgentTraceMessage[]`

## 2. Backend: ReActAgent Trace Extraction

- [x] 2.1 Extend the `response.messages` loop in `react-agent.ts` to build `agentTrace: AgentTraceMessage[]` alongside the existing `toolExecutions` map
- [x] 2.2 Return `agentTrace` from `ReActAgent.call()`
- [x] 2.3 Update `react-agent.test.ts` to assert trace structure and message types

## 3. Backend: Services

- [x] 3.1 Update `InsightService.call()` to return `{ answer: string; agentTrace: AgentTraceMessage[] }` instead of `string`
- [x] 3.2 Update `CreateTransactionFromTextService.call()` to return `{ transaction: Transaction; agentTrace: AgentTraceMessage[] }`
- [x] 3.3 Update service tests to reflect new return shapes

## 4. Backend: GraphQL Schema

- [x] 4.1 Add `AgentTraceText`, `AgentTraceToolCall`, `AgentTraceToolResult` types and `AgentTraceMessage` union to `schema.graphql`
- [x] 4.2 Add `agentTrace: [AgentTraceMessage!]!` field to `InsightResponse`
- [x] 4.3 Add `CreateTransactionFromTextResponse` type with `transaction` and `agentTrace` fields; update mutation return type from `Transaction!` to `CreateTransactionFromTextResponse!`
- [x] 4.4 Run `npm run codegen` in `backend/`

## 5. Backend: Resolvers

- [x] 5.1 Update insight resolver to map `agentTrace` from service to `agentTrace` in GraphQL response
- [x] 5.2 Update `createTransactionFromText` resolver to return `{ transaction, agentTrace }` using the new response type

## 6. Frontend: Schema & Generated Types

- [x] 6.1 Sync schema from backend: run `npm run codegen:sync-schema` in `frontend/`
- [x] 6.2 Update `GET_INSIGHT` query to request `agentTrace` using inline fragments for each union member
- [x] 6.3 Update `CREATE_TRANSACTION_FROM_TEXT` mutation to request `transaction` fields and `agentTrace` using inline fragments
- [x] 6.4 Run `npm run codegen` in `frontend/`

## 7. Frontend: Composables

- [x] 7.1 Update `useInsight` to extract and expose `agentTrace: Ref<AgentTraceMessage[]>` from the query result
- [x] 7.2 Update `useCreateTransactionFromText` to extract `transaction` and expose `agentTrace: Ref<AgentTraceMessage[]>` from the new mutation response wrapper

## 8. Frontend: AgentTracePanel Component

- [x] 8.1 Create `frontend/src/components/AgentTracePanel.vue` as a `v-dialog` (full-screen on mobile, large on desktop) accepting `agentTrace` as a prop
- [x] 8.2 Render each message as a `v-expansion-panel` entry with a type chip (`TEXT` / `TOOL CALL` / `TOOL RESULT`) and content in a scrollable `<pre>` block

## 9. Frontend: Insight Page

- [x] 9.1 Add trigger button in `Insight.vue` near the submit button, always visible, disabled when `agentTrace.length === 0` or during loading
- [x] 9.2 Wire `AgentTracePanel` to the trigger button, passing the current `agentTrace`

## 10. Frontend: Transactions Page

- [x] 10.1 Add trigger button in `Transactions.vue` near the natural language input submit button, always visible, disabled when `agentTrace.length === 0` or during loading
- [x] 10.2 Wire `AgentTracePanel` to the trigger button, passing the current `agentTrace`

## 11. Validation

- [x] 11.1 Run backend full test suite: `npm test` in `backend/`
- [x] 11.2 Run backend typecheck and lint: `npm run typecheck && npm run format` in `backend/`
- [x] 11.3 Run frontend typecheck and lint: `npm run typecheck && npm run format` in `frontend/`
