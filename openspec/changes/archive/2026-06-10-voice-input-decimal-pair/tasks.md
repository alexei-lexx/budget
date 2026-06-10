## 1. Tests

- [x] 1.1 (use `testing` skill) Add integration test: voice input "apples, bananas 12 54" creates transaction with amount 12.54
- [x] 1.2 (use `testing` skill) Add integration test: voice input "coffee 12 5" creates transaction with amount 12.05
- [x] 1.3 (use `testing` skill) Add integration test: keyboard input "apples, bananas 12 54" does NOT create transaction

## 2. Implementation

- [x] 2.1 Add new voice rule paragraph to `VOICE_INPUT_SUBPROMPT` in `backend/src/langchain/agents/create-transaction-agent.ts`: when two adjacent integers N M are the only numbers in the input, treat them as a decimal price where M is the fractional part, padded with a leading zero only when single-digit

## Constitution Compliance

- **TDD order**: Tests written before implementation (tasks 1.x before 2.x), as required by the constitution.
- **Backend-only change**: No schema or frontend changes; consistent with the independent package principle.
- **Minimal footprint**: One constant updated, one test group added — no new abstractions or dependencies.
