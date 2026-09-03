## 1. Internal agent: recurring-transaction inference

- [x] 1.1 (use `testing` skill) Add integration test scenarios to `create-transaction-agent.int.test.ts`: recurring match used when history agrees on amount, single match is not treated as recurring, disagreeing-amount history falls back to unresolved, no match within 12 months falls back to unresolved
- [x] 1.2 In `create-transaction-agent.ts`'s `SYSTEM_PROMPT_TEMPLATE`, add the recurring-transaction inference rule under Amount: trigger only on a missing amount, widen the history search 1 → 3 → 12 months (stopping early once a window yields a decision), and the ≥2 exact-amount-agreement rule with field source from the most recent matching transaction, explicit text overriding matched fields
- [x] 1.3 Insert a "Recurring match (see Amount)" tier into the Account priority list, directly below the explicit Name-match tier
- [x] 1.4 Insert a "Recurring match (see Amount)" tier into the Category priority list, directly below the explicit Name-match tier
- [x] 1.5 Add the one-line Description rule: use the matched description when set by recurring-transaction inference, unless the new text states a different one
- [x] 1.6 Run `create-transaction-agent.int.test.ts` and confirm the new scenarios pass

## 2. MCP guide: same rule for external clients

- [x] 2.1 Update `CREATE_TRANSACTION_INSTRUCTION` in `guides.ts` with the equivalent recurring-transaction inference rule (trigger condition, widening search, ≥2-match decision rule, field source and override), in the guide's existing process-neutral phrasing

## 3. Verification

- [x] 3.1 Run the full `create-transaction-agent.int.test.ts` suite and confirm no regressions in existing scenarios (explicit amount, voice-input inference, account/category resolution)
- [x] 3.2 Manually exercise the Transactions page quick-entry box and Assistant chat against the four spec scenarios (recurring match, single-match fallback, disagreement fallback, no-match fallback)

## Constitution Compliance

- **Test Strategy**: Compliant — new coverage added to the existing co-located `create-transaction-agent.int.test.ts`; no new test directory; tests written before the prompt text they verify.
- **Backend Layer Structure**: N/A — no resolver, service, or repository changes.
- **Schema-Driven Development**: N/A — no GraphQL schema change.
- **Result Pattern**: N/A — no new service methods.
- **TypeScript Code Generation**: N/A — no new types or generated code.

No violations identified.
