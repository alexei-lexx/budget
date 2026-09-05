## Why

`create-transaction-agent`'s `get_transactions` tool shares a single `MAX_PERIOD_DAYS = 365` cap with the MCP server and with `assistant-agent`. For the internal create-transaction agent, this lets a single history lookup return a full year of transactions — many transactions, many tokens — even though the agent only needs a wide range for the rare case where a recurring match isn't found nearby. Narrowing the cap for this agent only reduces that cost without touching MCP or the general Q&A assistant, which legitimately need wide single-call ranges.

## What Changes

- `get_transactions`'s `MAX_PERIOD_DAYS` becomes a per-instance parameter instead of a single shared constant; `create-transaction-agent` constructs its instance with a 90-day cap, `assistant-agent` and MCP keep 365
- `create-transaction-agent`'s `get_transactions` tool gets `toolCallLimitMiddleware` with `runLimit: 10`, bounding worst-case round-trips per invocation regardless of how many searches the agent chains
- `get_transactions`'s tool description gains a line noting it can be called multiple times with sequential ranges to cover a longer period
- The amount-inference rule in `create-transaction-agent`'s system prompt (currently an explicit 1/3/12-month ladder) is reworded to a narrow-first, widen-as-needed search that still must reach the full twelve months required by the existing spec — exact wording and tier shape are a design decision, not fixed here
- No change to `mcp/tools/guides.ts`'s `CREATE_TRANSACTION_INSTRUCTION` (served to external MCP callers, whose tool keeps the 365-day cap and has no reason to chain)

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `transactions/spec.md` and `assistant/spec.md` both already commit to "search history up to the last twelve months" for recurring-amount inference; this change is a search-strategy optimization internal to `create-transaction-agent` and must preserve that exact guarantee, not change it. If design or implementation turns up a case where the twelve-month guarantee can't be preserved under the new cap and call limit, that becomes a requirement change and this section needs revisiting before implementation proceeds.

## Impact

- `backend/src/langchain/tools/get-transactions.ts` — `MAX_PERIOD_DAYS` constant replaced with an optional `maxPeriodDays` constructor parameter, defaulting to the exported `DEFAULT_MAX_PERIOD_DAYS = 365`; the tool now consumes its own default directly, so it stays in this file rather than a separate module
- `backend/src/langchain/agents/create-transaction-agent.ts` — tool construction (new cap, call-limit middleware) and system prompt wording
- `backend/src/langchain/agents/assistant-agent.ts` — unchanged behavior; no longer passes `maxPeriodDays` at all, relying on the tool's default
- `backend/src/mcp/tools/get-transactions.ts`, `backend/src/services/aggregate-transactions-service.ts`, `backend/src/langchain/tools/aggregate-transactions.ts` — import `DEFAULT_MAX_PERIOD_DAYS` from `get-transactions.ts` in place of the removed `MAX_PERIOD_DAYS`; behavior unchanged (365-day cap preserved)
- Test coverage: `create-transaction-agent.int.test.ts` needs a case where the matching history sits beyond the new 90-day per-call window (forcing the agent to chain), and a case confirming a true negative (no match anywhere in twelve months) still resolves within the tool-call budget and test timeout — both gaps were found empirically during this change's design discussion

## Constitution Compliance

- **Backend Layer Structure / Ports**: no service, repository, or port changes; this is confined to the langchain tool/agent layer, which sits outside the GraphQL-Resolver-Service-Repository stack
- **Test Strategy**: adds integration test coverage co-located with the existing `create-transaction-agent.int.test.ts`; no new source file needs a new co-located unit test beyond what's touched
- **TypeScript Code Generation**: no GraphQL schema change, no codegen impact
- No other constitution principle applies to this change; no violations identified
