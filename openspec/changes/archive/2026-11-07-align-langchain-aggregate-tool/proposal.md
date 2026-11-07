# Proposal

## Why

The create-transaction agent selects the account that the user uses most.
It has no tool that counts transactions per account, so it counts account IDs in a long transaction list.

The LangChain `aggregate_transactions` tool cannot help now.
It returns only a sum and a count per currency and has no grouping.
The MCP `aggregate_transactions` tool already groups by account, category, or month through `AggregateTransactionsService`.
The LangChain tool has its own logic and reads the transaction repository directly.

## What Changes

- The LangChain `aggregate_transactions` tool uses `AggregateTransactionsService`, the same as the MCP tool
- The LangChain tool gets the same input as the MCP tool, without guide tokens: `includeUncategorized`, `includeTransactionsExcludedFromReports`, and `groupBy` are new
- **BREAKING** (internal): the tool output changes from one signed sum and count per currency to a list of results per type and currency, with unsigned `sum`, `count`, `min`, and `max`
- The tool description tells the model about the split by type and currency, unsigned amounts, and grouping, because LangChain agents do not get the MCP guides
- The create-transaction agent gets the `aggregate_transactions` tool
- The assistant agent keeps the tool with the new input and output

### Non-Goals

- No change to the create-transaction agent prompt
- No change to the assistant agent prompt
- No change to `AggregateTransactionsService` or the MCP tool

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The assistant and the create-transaction agent keep the behavior that the existing specs require. The change affects only internal agent tools.

## Impact

- `backend/src/langchain/tools/aggregate-transactions.ts`: calls `AggregateTransactionsService`, new input schema and description
- `backend/src/langchain/tools/aggregate-transactions.test.ts`: tests with a mocked service
- `backend/src/langchain/agents/create-transaction-agent.ts`: adds the tool and the `aggregateTransactionsService` dependency
- `backend/src/langchain/agents/assistant-agent.ts`: passes the service to the tool and to the create-transaction subagent
- `backend/src/langchain/tools/create-transaction-subagent.ts`: passes the service to the create-transaction agent
- `backend/src/dependencies.ts`: passes `resolveAggregateTransactionsService()` to both agents
- Agent unit, integration, and eval tests: pass the service when they create an agent
- No GraphQL schema change, no frontend change, no data migration

## Constitution Compliance

- **Backend Hexagonal Architecture**: the LangChain tool calls only a service, not the transaction repository. Compliant; this change removes a current violation
- **Result Pattern**: the service returns a Result, and the tool passes it to the agent. Compliant
- **Input Validation**: the service validates the date range and the excluded-from-reports filter. The tool does not repeat these checks. Compliant
- **Test Strategy**: the service already has tests; the tool gets co-located unit tests with a mocked service. Compliant
- **Schema-Driven Development**: no GraphQL schema change. Not applicable
