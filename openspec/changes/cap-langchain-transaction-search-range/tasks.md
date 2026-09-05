## 1. Parameterize `get_transactions`'s max period

- [x] 1.1 (use `testing` skill) Update `get-transactions.test.ts`: construct the tool with an explicit `maxPeriodDays`, and assert the rejection message and description text against that value instead of the removed `MAX_PERIOD_DAYS` export
- [x] 1.2 In `get-transactions.ts`, replaced the exported `MAX_PERIOD_DAYS` constant with an optional `maxPeriodDays` parameter on `createGetTransactionsTool`, defaulting to `DEFAULT_MAX_PERIOD_DAYS = 365` (also exported from the same file) — settled after two rounds of live back-and-forth: first tried a required-with-no-default parameter plus a separate `transaction-search-defaults.ts` module, then settled on an optional parameter with the default living in `get-transactions.ts` itself, since the tool now genuinely consumes its own default (deviates from this task's original wording, decided during implementation)
- [x] 1.3 Add the "call multiple times with sequential ranges" line to the tool's description template

## 2. Update the other consumers of the removed constant

- [x] 2.1 (use `testing` skill) Update `aggregate-transactions.test.ts`, MCP `get-transactions.test.ts`, and `aggregate-transactions-service` tests for the renamed import (only `aggregate-transactions.test.ts` imported the constant; the other two already hardcode the literal `365`)
- [x] 2.2 `assistant-agent.ts`: unchanged — relies on `createGetTransactionsTool`'s `DEFAULT_MAX_PERIOD_DAYS` default rather than passing it explicitly (superseded by 1.2's optional-parameter design)
- [x] 2.3 `langchain/tools/aggregate-transactions.ts`, `mcp/tools/get-transactions.ts`, `services/aggregate-transactions-service.ts`: import `DEFAULT_MAX_PERIOD_DAYS` in place of `MAX_PERIOD_DAYS`; no behavior change

## 3. Narrow `create-transaction-agent`'s search and bound its round-trips

- [x] 3.1 (use `testing` skill) Un-focus the `describe.only` in `create-transaction-agent.int.test.ts` left over from this change's own experimentation; keep the `[10, 40, 70, 100]`-day recurring-match seed — it's the case that requires chaining across the new 90-day window
- [x] 3.2 (use `testing` skill) Add an integration test for a true negative (no matching history anywhere in the year), confirming it resolves inside the tool-call budget and test timeout — satisfied by the existing `"does not create transaction when no prior matches exist"` test, which already seeds unrelated history and searches for a description with zero matches; no new test needed
- [x] 3.3 Skipped, deliberately: the combined worst case can't be forced deterministically — the amount-inference ladder only runs when amount is unstated, and if it's unstated the agent may give up before ever attempting account/category-history lookups (order is model-strategy-dependent, not code-controlled), so a test asserting this exact combined path would be flaky rather than a reliable regression guard, same as the crash-vs-success non-determinism found earlier in this change's own exploration. `runLimit: 10` still bounds the scenario structurally; design.md's risk entry is updated to say accepted-but-unverified-by-test instead of "add a test"
- [x] 3.4 In `create-transaction-agent.ts`, construct `get_transactions` with `maxPeriodDays: 90`
- [x] 3.5 Add `toolCallLimitMiddleware({ toolName: GET_TRANSACTIONS_TOOL_NAME, runLimit: 10 })` alongside the existing create-transaction limit middleware (added a `GET_TRANSACTIONS_TOOL_NAME` export to `get-transactions.ts`, matching the existing `CREATE_TRANSACTION_TOOL_NAME` pattern, instead of a bare string literal)
- [x] 3.6 Confirmed — the system prompt's amount-inference rule wording is unchanged from the working tree; no gap surfaced

## 4. Verification

- [ ] 4.1 Run `create-transaction-agent.int.test.ts` in full (un-focused) and confirm no timeouts or crashes
- [ ] 4.2 Inspect a LangSmith trace of the 90-day/`runLimit: 10` configuration and confirm round-trip counts match design.md's `ceil(365 / 90) = 5` estimate
- [ ] 4.3 Run typecheck and lint per the constitution's Code Quality Validation workflow

## Constitution Compliance

- **Test Strategy**: tests are written before implementation in each group (1.1 before 1.2, 3.1-3.3 before 3.4-3.6), and every test task stays co-located with its source file
- **Code Quality Validation**: task 4.3 runs the mandated typecheck/lint pass; 4.1 runs the affected test file before the full suite gate
- No other constitution principle applies; no violations identified
