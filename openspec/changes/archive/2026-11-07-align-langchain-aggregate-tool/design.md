# Design

## Context

See proposal.md - Why.

Current state relevant to this design:

- `AggregateTransactionsService` (`backend/src/services/aggregate-transactions-service.ts`) has one method, `call`, and returns a Result
- The service validates the date range, drops excluded-from-reports categories on request, and buckets transactions by type, currency, and an optional `groupBy` value
- The MCP tool (`backend/src/mcp/tools/aggregate-transactions.ts`) checks guide tokens and then calls the service
- The LangChain tool (`backend/src/langchain/tools/aggregate-transactions.ts`) reads `TransactionRepository` directly and has its own date range check and sum logic
- Only the assistant agent uses the LangChain tool
- The create-transaction agent is created in 2 places: `dependencies.ts` (quick text input) and `create-transaction-subagent.ts` (assistant chat)
- `dependencies.ts` already has `resolveAggregateTransactionsService()`
- `createMockAggregateTransactionsService()` already exists in `backend/src/utils/test-utils/services/`

## Goals / Non-Goals

**Goals:**

- One aggregation logic for MCP and LangChain agents
- The LangChain tool contains only input mapping, the user ID from the agent context, and the description

**Non-Goals:**

- No shared input schema between the MCP and LangChain tools
- No change to the `get_transactions` tool

## Decisions

### The LangChain tool calls `AggregateTransactionsService`

The tool gets `aggregateTransactionsService` as a dependency instead of `transactionRepository`.
The tool reads `userId` from the agent context, the same as today.
The tool converts dates with `toDateString` and passes the input to `call`.
The tool returns the service Result to the agent without change.

The service type allows only `includeUncategorized: true`.
The tool passes `includeUncategorized` only when it is `true`, the same as the MCP tool.

Alternative considered: call the exported MCP `aggregateTransactions` function.
Rejected, because that function checks guide tokens, and LangChain agents do not have guides.

### Separate input schema with the same fields

The LangChain tool defines its own Zod schema with the MCP fields except `guideTokens`.
`includeTransactionsExcludedFromReports` is required, the same as in MCP.
The model must decide about excluded-from-reports categories for each call.

Alternative considered: derive the schema from the MCP schema with `omit({ guideTokens: true })`.
Rejected, because the LangChain field descriptions must carry more meaning than the MCP descriptions, which depend on the `basics` guide.
Other LangChain and MCP tool pairs also keep separate schemas.

Alternative considered: make `includeTransactionsExcludedFromReports` optional with a default.
Rejected, because a default hides the decision, and the assistant spec requires report totals without excluded categories.

### Description replaces the MCP guide

The MCP description is short because the `basics` guide explains the result.
The LangChain description must explain:

- Results are split by transaction type and currency and do not mix them
- `sum`, `min`, and `max` use unsigned amounts
- `groupBy` splits each result further by account, category, or month
- The date range must not exceed `MAX_PERIOD_DAYS` days

The description does not mention account selection or any agent task.
It describes what the tool computes, so that both agents can use it.

### Dependency is required in all agent factories

`aggregateTransactionsService` is a required parameter of:

- `createAggregateTransactionsTool` (LangChain)
- `createCreateTransactionAgent`
- `createCreateTransactionSubagentTool`
- `createAssistantAgent`

`dependencies.ts` passes `resolveAggregateTransactionsService()` to both agents.
Integration and eval tests use `resolveAggregateTransactionsService()`.
Unit tests use `createMockAggregateTransactionsService()`.

The assistant agent still passes `transactionRepository` to `get_transactions` and `get_categories`, so that parameter stays.

Alternative considered: an optional parameter that adds the tool only when present.
Rejected, because every caller has the service, and an optional parameter adds a code path that no caller needs.

### Tests

`aggregate-transactions.test.ts` is rewritten with a mocked service:

- The tool passes the input, the user ID from the context, and converted dates to `call`
- The tool omits optional fields that the model did not send
- The tool omits `includeUncategorized` when it is `false`
- The tool returns the service success result
- The tool returns the service failure result

Date range and excluded-category tests stay in the service tests only.

## Risks / Trade-offs

- [The create-transaction agent does not use the tool for account history, because the prompt does not change] → Run the eval with repetitions and compare with the baseline
- [The assistant must combine type results for net cash flow, for example income minus expense] → The assistant has `calculateTool`; `assistant-agent.int.test.ts` checks that the agent still calls `aggregate_transactions` for spending questions
- [The model sends `includeTransactionsExcludedFromReports: false` when it counts account usage, so some transactions are not counted] → Accepted; the field description explains the effect, and the eval shows if the count is affected
- [A longer tool description increases the prompt size of both agents] → Accepted; the description has 4 short statements

## Constitution Compliance

- **Backend Hexagonal Architecture**: the LangChain tool calls only `AggregateTransactionsService`. Compliant
- **Backend Services**: no service change; the single-purpose service keeps its `call` method. Compliant
- **Result Pattern**: the tool returns the service Result. Compliant
- **Input Validation**: the service validates the input; the tool only maps it. Compliant
- **Test Strategy**: the tool test is co-located and uses a mocked service; service tests stay unchanged. Compliant
- **Schema-Driven Development**: no GraphQL change. Not applicable
