## 1. Service layer: `TransactionService.getRecentTransactions`

- [x] 1.1 (use `testing` skill) Write tests in `transaction-service.test.ts` for a new `getRecentTransactions` method: stops early once a segment's accumulated count reaches `expectedCount`; escalates through all four segments (1/3/6/12 months) when history is sparse; passes `accountIds`/`categoryIds`/`types` through to each segment query; returns fewer than `expectedCount` without error when total history is smaller; throws `BusinessError` for a non-positive or non-integer `expectedCount`.
- [x] 1.2 Add `getRecentTransactions` to the `TransactionService` interface and `TransactionServiceImpl`, placed after the existing `findMany`-style reads (`getTransactionsByUser`) and before write methods, per Method Ordering. Implement the four-segment, non-overlapping escalation over `transactionRepository.findManyByUserId` using `Temporal.PlainDate` month arithmetic, per design.md.
- [x] 1.3 Run `transaction-service.test.ts` and confirm all tests pass.

## 2. Langchain tool: `get_recent_transactions`

- [x] 2.1 (use `testing` skill) Write `backend/src/langchain/tools/get-recent-transactions.test.ts`, mirroring `get-transactions.test.ts`'s structure: valid call maps `TransactionService.getRecentTransactions`'s result to `TransactionDto[]` via `toTransactionDto`; `accountIds`/`categoryIds`/`types` are forwarded; a thrown `BusinessError` propagates unchanged (matching `create-account.test.ts`'s pattern — see design.md Decisions).
- [x] 2.2 Create `backend/src/langchain/tools/get-recent-transactions.ts`: zod schema (`expectedCount` required positive integer, `accountIds`/`categoryIds`/`types` optional, matching `get-transactions.ts`'s field descriptions), reads `userId` from `agentContextSchema` via `config.context`, calls `transactionService.getRecentTransactions(...)`, maps to `TransactionDto[]`. No try/catch — `BusinessError` is left to propagate, matching `create-transaction.ts`/`create-account.ts`.
- [x] 2.3 Run `get-recent-transactions.test.ts` and confirm it passes.

## 3. Wire into `create-transaction-agent.ts` and rewrite its prompt

- [x] 3.1 Add `createGetRecentTransactionsTool({ transactionService })` to `createCreateTransactionAgent`'s `tools` array in `backend/src/langchain/agents/create-transaction-agent.ts`.
- [x] 3.2 Rewrite the Amount section of `SYSTEM_PROMPT_TEMPLATE`: replace the three-step, 1/3/12-month widening sequence with "MUST look up at least 2 recent similar transactions," plus an explicit fallback — "If fewer than 2 similar transactions are found, the amount cannot be inferred — MUST stop and report an error" — keeping the rest of the Amount section (recurring-amount rule, field-copying rule) unchanged. (Fallback line added after 3.4 eval run surfaced a regression; see design.md Risks.)
- [x] 3.3 Rewrite the Account and Category sections' "MUST/May look up past transactions for history-based criteria" line to "look up at least 10 most recent transactions for history-based criteria," keeping each section's priority list unchanged.
- [x] 3.4 (use `testing` skill) Run `create-transaction-agent.int.test.ts` and `create-transaction-agent.eval.test.ts`; if the account/category-inference eval scenarios (e.g. "selects most used account overall," "selects most used account for category") fail because their seeded history relies on more than the 10 most recent transactions, adjust the fixtures' seed data so the relevant pattern is visible within that window (see design.md Risks). Account/category-inference scenarios passed with no fixture changes needed. Surfaced and fixed a separate Amount-section regression instead — see design.md Risks and task 3.2. Remaining eval failures across repeated runs (voice-input HH:MM/NN-NN parsing, description wording) are in prompt sections this change didn't touch and are non-reproducible on rerun — pre-existing eval flakiness, not caused by this change.

## 4. Verification

- [x] 4.1 Run the full backend test suite (`npm test` in `backend/`) and confirm no regressions.
- [x] 4.2 Run `npm run typecheck` and `npm run format` in `backend/`, fix any issues.

## Constitution Compliance

- **Test Strategy**: Followed — every new file gets a co-located test written first (tasks 1.1, 2.1), and the existing co-located suites (`create-transaction-agent.int.test.ts`/`.eval.test.ts`) are re-run rather than left unchecked.
- **Method Ordering**: Task 1.2 places `getRecentTransactions` after `TransactionService`'s existing reads and before its writes.
- **Code Quality Validation**: Task 4 runs the changed-file tests as they're written (tasks 1.3, 2.3), then the full suite, then typecheck/lint, per the mandatory validation pipeline order.

No violations identified.
