# Tasks

## 1. LangChain Tool on `AggregateTransactionsService`

- [x] 1.1 Rewrite `backend/src/langchain/tools/aggregate-transactions.test.ts` with `createMockAggregateTransactionsService()` and the test cases from the design (input and user ID passed to `call`, optional fields omitted, `includeUncategorized: false` omitted, success result returned, failure result returned), and verify that the tests fail with `npm test -- src/langchain/tools/aggregate-transactions.test.ts`
- [x] 1.2 Change `createAggregateTransactionsTool` in `backend/src/langchain/tools/aggregate-transactions.ts` to take `aggregateTransactionsService`, use the MCP input fields without `guideTokens`, and use the description from the design, and verify that all `aggregate-transactions.test.ts` tests pass

## 2. Assistant Agent Wiring

- [x] 2.1 Add the required `aggregateTransactionsService` parameter to `createAssistantAgent` in `backend/src/langchain/agents/assistant-agent.ts`, pass it to `createAggregateTransactionsTool`, and pass `createMockAggregateTransactionsService()` in `assistant-agent.test.ts`; verify that all `assistant-agent.test.ts` tests pass
- [x] 2.2 Pass `resolveAggregateTransactionsService()` to `createAssistantAgent` in `backend/src/dependencies.ts` and in `assistant-agent.int.test.ts`, and verify that `npm run test:integration -- src/langchain/agents/assistant-agent.int.test.ts` passes

## 3. Create-Transaction Agent Tool

- [x] 3.1 Pass `createMockAggregateTransactionsService()` in the test deps of `backend/src/langchain/agents/create-transaction-agent.test.ts`
- [x] 3.2 Add the required `aggregateTransactionsService` parameter to `createCreateTransactionAgent` in `backend/src/langchain/agents/create-transaction-agent.ts` and add `createAggregateTransactionsTool` to its tool list, and verify that all `create-transaction-agent.test.ts` tests pass
- [x] 3.3 Add the required `aggregateTransactionsService` parameter to `createCreateTransactionSubagentTool` in `backend/src/langchain/tools/create-transaction-subagent.ts`, pass it from `createAssistantAgent`, and pass `createMockAggregateTransactionsService()` in `create-transaction-subagent.test.ts`; verify that all `create-transaction-subagent.test.ts` and `assistant-agent.test.ts` tests pass
- [x] 3.4 Pass `resolveAggregateTransactionsService()` to `createCreateTransactionAgent` in `backend/src/dependencies.ts`, `create-transaction-agent.int.test.ts`, and `create-transaction-agent.eval.test.ts`, and verify that `npm run test:integration -- src/langchain/agents/create-transaction-agent.int.test.ts` passes

## 4. Validation

- [x] 4.1 Run `npm test` in `backend` and verify that no test fails
- [x] 4.2 Run `npm run typecheck` and `npm run format` in `backend` and verify that no error is reported

## Constitution Compliance

- **Backend Hexagonal Architecture**: the LangChain tool calls only `AggregateTransactionsService`; the direct repository access is removed. Compliant
- **Result Pattern**: the tool returns the service Result. Compliant
- **Input Validation**: the service validates the input; tool tests do not repeat the service validation tests. Compliant
- **Test Strategy**: the tool and agent tests are co-located and use mocked services; integration tests use the real service. Compliant
- **Code Quality Validation**: each group runs the tests of the changed files; group 4 runs the full suite, typecheck, and format. Compliant
- **Violations**: none

## Workflow follow-up

- Run the create-transaction eval with repetitions and compare the account selection results with the baseline `baseline-20261106-4-times`
