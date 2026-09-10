## Why

Creating a transaction from text often needs past transactions to infer a missing amount, account, or category. Today the only lookup tool is `get_transactions`, which requires an explicit date range. To search history without a known range, the agent widens a fixed sequence of date windows (1 month, then 3 months, then 12 months), calling the tool again at each step. Each call returns every transaction in that window, so the widest step can return a full year of transactions. This costs extra round trips and extra tokens for a search that, most of the time, only needs the last few transactions.

This especially hurts `create-transaction-agent.ts`, which runs on a non-frontier model: correctly executing a multi-step, self-computed date-widening protocol is exactly the kind of multi-step reasoning weaker models get wrong (bad date math, skipped steps, miscounted matches). Moving the widening into the tool itself removes that reasoning burden entirely.

## What Changes

- Add a `get_recent_transactions` tool to the internal langchain tool set used by `create-transaction-agent.ts`. It takes the same filters as `get_transactions` (`accountIds`, `categoryIds`, `types`) plus `expectedCount`, and returns transactions newest-first, without a date range argument. Internally it looks back at most 365 days, same as `get_transactions`'s existing limit.
- Rewrite the history-lookup instructions in `create-transaction-agent.ts`'s system prompt:
  - Amount: replace the three-step, 1/3/12-month widening sequence with "MUST look up at least 2 recent similar transactions." Fewer than 2 similar matches means the amount cannot be inferred — MUST stop and report an error, rather than treating a lone match as recurring.
  - Account and Category: replace "MUST/May look up past transactions for history-based criteria" with "look up at least 10 most recent transactions for history-based criteria."
- `get_transactions` and `aggregate_transactions` are unchanged and remain available for explicit date-range queries.
- Not exposed on the MCP server: MCP clients (e.g. Claude web) run frontier models capable of executing the existing widening protocol correctly, so this doesn't fix a reliability problem there — only a token/latency one, which isn't worth a second tool surface and a duplicated `guides.ts` rewrite to maintain. The MCP `create-transaction` guide keeps its current three-step instructions.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none — no spec-observable behavior changes; see design.md)

## Impact

- `backend/src/services/transaction-service.ts` — new `getRecentTransactions` method
- `backend/src/langchain/tools/get-recent-transactions.ts` (new)
- `backend/src/langchain/agents/create-transaction-agent.ts` — system prompt rewrite (Amount, Account, Category sections)
- No changes to `get_transactions`, `aggregate_transactions`, the MCP server, GraphQL schema, or the `TransactionRepository` port

## Constitution Compliance

- **Backend Layer Structure**: Compliant. The new tool calls a new `TransactionService` method, unlike `get_transactions`, which calls the repository directly — see design.md for why this tool needs the service layer, and how that compares to `aggregate_transactions`'s own service.
- **Backend Port Interfaces**: Compliant. No new repository method; the new service method reuses the existing `findManyByUserId`.
- **Result Pattern**: Compliant. The langchain tool follows the existing `Success`/`Failure` pattern used by `get_transactions`.
- **Schema-Driven Development**: N/A. No GraphQL schema change; this tool is not part of the GraphQL API.
- **Test Strategy**: Compliant. New tests are co-located next to the new tool file (`get-recent-transactions.test.ts`), matching existing tool test placement.
- **TypeScript Code Generation**: Compliant. New code will follow strict typing and naming conventions; no violations anticipated.

No violations identified.
