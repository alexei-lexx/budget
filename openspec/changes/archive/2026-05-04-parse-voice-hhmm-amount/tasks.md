## 1. Tests

- [x] 1.1 (use `jest-tests` skill) Add an integration test in `backend/src/langchain/agents/create-transaction-agent.int.test.ts` for the bare colon-amount scenario: input `"11:23"` with `isVoiceInput: true` results in a `create_transaction` call with `amount: 11.23`.
- [x] 1.2 (use `jest-tests` skill) Add an integration test for the mixed-text scenario: input `"groceries 7:50"` with `isVoiceInput: true` results in `amount: 7.50` and a description derived from `"groceries"`.
- [x] 1.3 (use `jest-tests` skill) Add an integration test for the locative-`at` scenario: input `"lunch 11:23 at cafe"` with `isVoiceInput: true` results in `amount: 11.23`.
- [x] 1.4 (use `jest-tests` skill) Add an integration test for the time-context scenario: input `"I brought coffee at 12:34"` with `isVoiceInput: true` does NOT call `create_transaction`.
- [x] 1.5 (use `jest-tests` skill) Add an integration test for the amount-with-explicit-time scenario: input `"transferred 100 at 15:30"` with `isVoiceInput: true` results in `amount: 100`.
- [x] 1.6 (use `jest-tests` skill) Add an integration test for the keyboard-isolation scenario: input `"11:23"` with `isVoiceInput: false` does NOT coerce the colon string into 11.23.
- [x] 1.7 Run the new tests in isolation and confirm they fail against the current prompt.

## 2. Implementation

- [x] 2.1 Extend the voice-input sub-block of the Amount section in `SYSTEM_PROMPT` in `backend/src/langchain/agents/create-transaction-agent.ts` with the colon-amount rule.
- [x] 2.2 Include in the prompt: a concrete example of the bare case (`"11:23" → 11.23`), the locative-`at` case (`"lunch 11:23 at cafe"` → amount 11.23), and the time-context case (`"coffee at 12:34"` → time, no amount).

## 3. Verification

- [x] 3.1 Run the tests added in section 1 and confirm they pass.
- [x] 3.2 Run the full backend test suite and confirm no regressions.
- [x] 3.3 Run `npm run typecheck` from the backend package and confirm no errors.
- [x] 3.4 Run `npm run format` from the backend package and resolve any issues.

## Constitution Compliance

- **Test Strategy**: Section 1 follows TDD (tests written and confirmed failing before implementation). New tests are co-located in the existing `*.int.test.ts` next to the agent source. Compliant.
- **Code Quality Validation**: Section 3 follows the mandatory validation pipeline — targeted tests, full suite, typecheck, format. Compliant.
- **Backend Layer Structure**: Section 2 modifies only the agent's system prompt; no resolver, service, or repository boundaries shift. Compliant.
- **TypeScript Code Generation**: Prompt-string change only; no new TypeScript code paths. Compliant.
- **Input Validation**: `isVoiceInput` is already validated upstream; this change adds no new input boundary. Compliant.
- Schema-driven development, GraphQL layer, pagination, soft-deletion, migrations, auth, finder naming, method ordering, frontend code rules: not applicable to this change.
