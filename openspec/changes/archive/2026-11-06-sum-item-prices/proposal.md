# Proposal

## Why

The user often types one purchase with a price for each item (for example, "meat 2 and milk 3").
The transaction agent stops with an error when the text has more than one amount.
The user must add the prices manually and type the text again.

This change is the first step toward compound transactions from in-app text.
The agent learns to read item prices before it learns to split them by category.

## What Changes

- The agent sums item prices from one purchase into one transaction amount
- The agent uses a sum tool for the addition, not its own arithmetic
- The sum tool returns an exact decimal sum, without floating-point error (for example, 0.1 + 0.2 = 0.3)
- The agent infers category, account, date, and description with the same rules as today
- The agent keeps the error for alternative amounts (for example, "paid 10 or 20 euros")
- The quick text input and the assistant chat get the new behavior, because both use the same agent
- New evals check the summed amount, the description, the error for alternatives, and the category the agent selects for items of different categories
- The MCP `create-transaction` guide gets the same amount rule: sum item prices of one category into one transaction, and keep the error for alternative amounts
- For items of different categories, MCP agents continue to use `create_compound_transaction`

### Non-Goals

- No compound transaction from in-app text: items of different categories still give one transaction

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `transactions`: the "Natural Language Transaction Creation" requirement accepts item prices and sums them into one transaction; the error for multiple amounts applies only to alternative amounts
- `mcp-server`: the `create-transaction` guide description includes the rule to sum item prices and to reject only alternative amounts

## Impact

- **Backend agent**: `create-transaction-agent` system prompt (Amount and Description rules) and its tool list (adds the existing sum tool)
- **Backend tools**: `sumTool` in `backend/src/langchain/tools/math.ts` sums with decimal precision; the assistant agent also gets exact sums
- **Backend evals**: new cases in `create-transaction-agent.eval.test.ts`
- **MCP guide**: Amount section of the `create-transaction` guide in `backend/src/mcp/tools/guides.ts`; the guide text change invalidates guide tokens issued before the deploy
- **GraphQL, services, repositories, frontend**: no change

## Constitution Compliance

- **Backend Hexagonal Architecture**: the sum tool is a pure calculation and does not access the core; the transaction is still created through `TransactionService`. Compliant
- **Schema-Driven Development**: no GraphQL schema change. Not applicable
- **Result Pattern**: the existing sum tool returns a Result. Compliant
- **Test Strategy**: no service or repository change, so no new service or repository tests; agent behavior is checked with evals. Compliant
