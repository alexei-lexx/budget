# Tasks

## 1. Exact Decimal Sum in `sumTool`

- [x] 1.1 Add a unit test to `backend/src/langchain/tools/math.test.ts` that expects `sumTool` with `[0.1, 0.2]` to return `0.3`, and verify that it fails with `npm test -- src/langchain/tools/math.test.ts`
- [x] 1.2 Change `sumTool` in `backend/src/langchain/tools/math.ts` to add the numbers as mathjs BigNumbers and return a number, and verify that all `math.test.ts` tests pass

## 2. Item Prices in the Create-Transaction Agent

- [x] 2.1 Add the 8 eval cases from the design table (same category, different categories, decimals, float drift, written amounts, quantity is not price, description, alternatives) to `backend/src/langchain/agents/create-transaction-agent.eval.test.ts`, and verify with `npm run test:evals -- src/langchain/agents/create-transaction-agent.eval.test.ts` that the item price cases fail
  - The same category, decimals, float drift, and written amounts cases list a `sum` call with `args: {}` before the `create_transaction` call in the reference trajectory
  - The quantity is not price case does not list a `sum` call
- [x] 2.2 Add `sumTool` to the tool list in `backend/src/langchain/agents/create-transaction-agent.ts`, and verify that all `create-transaction-agent.test.ts` tests still pass
- [x] 2.3 Replace the "multiple amounts" rule in the Amount section of the agent prompt with 2 rules: sum the item prices of one purchase (an item price is a money amount, not a quantity), and stop with an error for alternative amounts; verify that the new and existing evals pass with `npm run test:evals -- src/langchain/agents/create-transaction-agent.eval.test.ts`

## 3. Item Prices in the MCP Create-Transaction Guide

- [x] 3.1 Replace the "multiple amounts" rule in the Amount section of the `create-transaction` guide in `backend/src/mcp/tools/guides.ts` with 3 rules in domain terms, without tool names (sum item prices of one category, record items of different categories as a compound transaction, report alternative amounts as an error), and verify that all `guides.test.ts` and `load-guides.test.ts` tests pass

## 4. Validation

- [x] 4.1 Run `npm test` in `backend` and verify that no test fails
- [x] 4.2 Run `npm run typecheck` and `npm run format` in `backend` and verify that no error is reported

## Constitution Compliance

- **Backend Hexagonal Architecture**: the agent gets a pure calculation tool; transaction creation still goes through `TransactionService`. Compliant
- **Schema-Driven Development**: no GraphQL schema change. Not applicable
- **Result Pattern**: `sumTool` keeps its Result return type. Compliant
- **Test Strategy**: the new unit test is co-located next to the changed file (`math.test.ts`); prompt and guide texts are not tested; agent behavior, including the `sum` call, is checked with evals; no service or repository change. Compliant
- **Code Quality Validation**: each group runs the tests of the changed file; group 4 runs the full suite, typecheck, and format. Compliant
- **Violations**: none

## Workflow follow-up

- Archive the change after review, and rename the scenario "Ambiguous multiple amounts result in an error" to "Alternative amounts result in an error" in the main `transactions` spec
