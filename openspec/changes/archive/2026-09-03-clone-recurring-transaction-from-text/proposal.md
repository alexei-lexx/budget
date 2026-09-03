## Why

Users often re-log the same recurring bill (gym membership, rent, subscriptions) with a short phrase like "repeat electricity bill" or just "gym". Today, `create-transaction-agent.ts` and the MCP `create_transaction` guide require an explicit amount in the text — with no amount, the agent stops and asks. Users must retype every field each time, even though the transaction is identical to one from last month.

## What Changes

- When the user's text has no explicit amount, the transaction-creation agent looks up recent history (widening 1 month → 3 months → 12 months) for transactions matching the described subject, instead of immediately failing.
- If at least two matching transactions agree on an exact amount, the agent treats it as recurring and fills in the new transaction's type, account, category, amount, and description from that match (dated today), letting any explicit detail in the new text override the matched value.
- If fewer than two transactions match, matches disagree on amount (e.g. groceries), or no match is found within 12 months, the agent falls back to today's behavior: stop and report the missing mandatory field.
- This rule is added identically to all three natural-language transaction-creation surfaces: the Transactions page quick-entry box, the Assistant chat, and the MCP `create_transaction` guide — all three already share behavior text for equivalent rules (e.g. voice-input amount inference is duplicated the same way today).
- Adds integration test coverage for the in-app (internal) creation agent's new recurring-lookup behavior, alongside its existing `create-transaction-agent.int.test.ts`.
- No new tools, GraphQL fields, or repository methods — reuses the existing `get_transactions` tool/query on both the internal agent and the MCP server.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `transactions`: "Natural Language Transaction Creation" gains a recurring-transaction inference rule for the quick-entry box.
- `assistant`: "Transaction Creation from Natural Language" gains the same rule for the chat Assistant.
- `mcp-server`: "Create Transaction via MCP" gains the same rule in the `create-transaction` guide instructions.

## Impact

- `backend/src/langchain/agents/create-transaction-agent.ts` — system prompt gains the recurring-lookup rule; used by both the quick-entry box (`CreateTransactionFromTextService`) and the Assistant chat (`create_transaction_subagent` tool).
- `backend/src/langchain/agents/create-transaction-agent.int.test.ts` — new integration test scenarios for recurring-transaction inference and the disagreeing-amount fallback.
- `backend/src/mcp/tools/guides.ts` — `CREATE_TRANSACTION_INSTRUCTION` gains the same rule for external MCP clients.
- No changes to `TransactionRepository`, `TransactionService`, GraphQL schema, or tool schemas.
