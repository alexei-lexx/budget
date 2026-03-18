## 1. Backend — GraphQL Schema

- [x] 1.1 Replace `InsightResponse` with `union InsightOutput = InsightSuccess | InsightFailure`; add `InsightSuccess { answer: String!, agentTrace: [AgentTraceMessage!]! }` and `InsightFailure { message: String!, agentTrace: [AgentTraceMessage!]! }` types to `schema.graphql`
- [x] 1.2 Replace `CreateTransactionFromTextResponse` with `union CreateTransactionFromTextOutput = CreateTransactionFromTextSuccess | CreateTransactionFromTextFailure`; add `CreateTransactionFromTextSuccess { transaction: Transaction!, agentTrace: [AgentTraceMessage!]! }` and `CreateTransactionFromTextFailure { message: String!, agentTrace: [AgentTraceMessage!]! }` types to `schema.graphql`
- [x] 1.3 Run `npm run codegen` in `backend/`

## 2. Backend — Insight Service

- [x] 2.1 Add `InsightServiceError` interface (`message: string; agentTrace: AgentTraceMessage[]`) and update `InsightOutput` to `Result<InsightSuccessData, InsightServiceError>`
- [x] 2.2 Update pre-agent `Failure` calls in `insight-service.ts` to pass `{ message: "...", agentTrace: [] }`
- [x] 2.3 Update the post-agent `Failure` call to pass `{ message: "Empty response", agentTrace: response.agentTrace }`
- [x] 2.4 Update `insight-service.test.ts` failure assertions from `error: "..."` to `error: { message: "..." }`

## 3. Backend — Create Transaction From Text Service

- [x] 3.1 Add `CreateTransactionFromTextServiceError` interface (`message: string; agentTrace: AgentTraceMessage[]`) and update `CreateTransactionFromTextOutput` to use it
- [x] 3.2 Update pre-agent `Failure` calls in `create-transaction-from-text-service.ts` to pass `{ message: "...", agentTrace: [] }`
- [x] 3.3 Update all post-agent `Failure` calls to pass `{ message: "...", agentTrace }`
- [x] 3.4 Update `create-transaction-from-text-service.test.ts` failure assertions from `error: "..."` to `error: { message: "..." }`

## 4. Backend — Resolvers

- [x] 4.1 Update `insight-resolvers.ts` to return `{ __typename: "InsightSuccess", answer, agentTrace }` on success and `{ __typename: "InsightFailure", message, agentTrace }` on failure instead of throwing `GraphQLError`
- [x] 4.2 Update `create-transaction-from-text-resolvers.ts` the same way
- [x] 4.3 Check `resolvers/index.ts` — add union type entries if the generated `Resolvers` type requires them
- [x] 4.4 Run `npm test -- insight-service.test.ts` and `npm test -- create-transaction-from-text-service.test.ts`; fix any failures
- [x] 4.5 Run full `npm test` in `backend/`
- [x] 4.6 Run `npm run typecheck` and `npm run format` in `backend/`

## 5. Frontend — Codegen

- [x] 5.1 Run `npm run codegen:sync-schema` in `frontend/` to pull the updated schema
- [x] 5.2 Run `npm run codegen` in `frontend/` to regenerate typed composables

## 6. Frontend — GraphQL Operations

- [x] 6.1 Update the `insight` query in `frontend/src/graphql/queries.ts` to select both `InsightSuccess` and `InsightFailure` variants using inline fragments (`... on InsightSuccess { answer agentTrace { ... } }`, `... on InsightFailure { message agentTrace { ... } }`)
- [x] 6.2 Update the `createTransactionFromText` mutation in `frontend/src/graphql/mutations.ts` the same way for `CreateTransactionFromTextSuccess` and `CreateTransactionFromTextFailure`
- [x] 6.3 Re-run `npm run codegen` in `frontend/` after updating the operation documents

## 7. Frontend — Composables

- [x] 7.1 Update `useInsight.ts`: derive `insightAgentTrace` from `insightResult.value?.insight?.agentTrace` (present on both variants); derive `insightError` by checking `__typename === "InsightFailure"`; remove any `catch`-based trace extraction
- [x] 7.2 Update `useCreateTransactionFromText.ts`: read `agentTrace` from the response data on both `CreateTransactionFromTextSuccess` and `CreateTransactionFromTextFailure`; remove any `catch`-based trace extraction

## 8. Frontend — Validation

- [x] 8.1 Run `npm run typecheck` and `npm run format` in `frontend/`

## Constitution Compliance

- **Schema-Driven Development**: Schema changes in task 1 precede all backend and frontend changes; codegen runs after each schema update ✓
- **Backend Layer Structure**: Resolvers handle response transformation only (tasks 4.1–4.2); no business logic added ✓
- **Backend Service Result Pattern**: `Result<T, E>` preserved with a typed error parameter (tasks 2.1, 3.1) ✓
- **Test Strategy**: Service tests updated alongside source files; test files remain co-located (tasks 2.4, 3.4) ✓
- **Code Quality Validation**: Full validation pipeline (test → typecheck → format) applied to both packages (tasks 4.4–4.6, 8.1) ✓
