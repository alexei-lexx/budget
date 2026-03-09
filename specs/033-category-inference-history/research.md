# Research: Improve Category Inference Using Recent Transaction History

## Problem

Semantic matching cannot resolve ambiguous inputs when two categories are close (e.g., **Groceries** vs. **Eating out**). The user's repeated corrections carry the right signal, but the agent has no access to it.

---

## Decisions

### Enrich `getCategories` — always, no opt-in flag

The agent calls `getCategories(ACTIVE)` before every transaction creation. Attaching recent usage examples to that response adds zero extra tool calls. No flag parameter — a flag requires the model to decide when to activate it, and on smaller models (`gpt-oss-120b`) the flag is reliably passed as `false`, so it never fires.

### Call the repository directly

`AgentDataService` already holds `transactionRepository`. Inside `getCategories`, paginate `transactionRepository.findActiveByUserId` with a date range filter, then filter the result in memory to keep only transactions that have both `categoryId` and `description`. No new repository methods, no new types, no new interface additions.

### 90-day lookback, 10 descriptions per category

Fixed server-side constants. 90 days captures genuine patterns without including stale habits. 10 descriptions per category is enough signal while keeping the payload small.

### Tool prose string carries the data contract; system prompt softened

The prose string on the `getCategories` tool (`ToolSignature.description`) is updated to tell the model what the response contains. In the system prompt, `MUST` is softened to `may` — one word change, everything else in the instruction stays the same. The `getTransactions` call is no longer mandatory since embedded examples cover the common case, but the model remains free to call it when it needs more context.

### No GraphQL schema change, no migration

The enrichment is fully internal to `AgentDataService`. The public `categories` GraphQL query is unchanged. No new data is written.
