## 1. `create_account` tool

- [x] 1.1 Write `backend/src/langchain/tools/create-account.test.ts` covering: calls `AccountService.createAccount` with parsed `name`, `currency`, and `initialBalance` (defaulting to `0` when omitted); reads `userId` from agent runtime context (never from LLM input); returns the service result wrapped in `Success(...)`; propagates `BusinessError` from the service unchanged.
- [x] 1.2 Implement `backend/src/langchain/tools/create-account.ts` as a keyword-argument factory taking `{ accountService }`. Define a zod schema for `name`, `currency`, optional `initialBalance`. Parse `userId` via `agentContextSchema.shape.userId.parse(config?.context?.userId)`. Write a tool description that states the tool's purpose and instructs the agent to first call `get_accounts` and ask the user to confirm when the requested name is a semantic near-variant (pluralisation, typo, abbreviation, synonym) of an existing account.
- [x] 1.3 Confirm tests pass and no business-rule validation was duplicated at the tool layer.

## 2. `update_account` tool

- [x] 2.1 Write `backend/src/langchain/tools/update-account.test.ts` covering: calls `AccountService.updateAccount` with `id` plus any of optional `name`/`currency`; rejects input shapes containing `initialBalance` (schema-level); reads `userId` from agent runtime context; returns the service result wrapped in `Success(...)`; propagates `BusinessError` from the service unchanged (including the currency-change-with-transactions rule).
- [x] 2.2 Implement `backend/src/langchain/tools/update-account.ts` as a keyword-argument factory taking `{ accountService }`. Define a zod schema for `id`, optional `name`, optional `currency` (no `initialBalance` field). Write a tool description that states the tool's purpose, instructs the agent that it MUST obtain `id` by first calling `get_accounts`, and instructs it to ask the user to confirm when the requested new name is a semantic near-variant of another existing account.
- [x] 2.3 Confirm tests pass and no business-rule validation was duplicated at the tool layer.

## 3. Assistant agent wiring

- [x] 3.1 Extend `backend/src/langchain/agents/assistant-agent.test.ts` to assert that `create_account` and `update_account` are registered on the assistant agent and receive `AccountService` through the dependency-injection factory.
- [x] 3.2 Register the two new tools in `backend/src/langchain/agents/assistant-agent.ts`, injecting `AccountService` (and updating the factory signature if needed).
- [x] 3.3 Add a single general-capability sentence to `SYSTEM_PROMPT` stating (in general words) that the assistant can also manage the user's accounts, in addition to answering finance questions and logging transactions. Do NOT name tools, fields, defaults, or business rules.
- [x] 3.4 Verify `backend/src/dependencies.ts` wires `AccountService` into the assistant agent factory; update if not already injected.

## 4. End-to-end verification

- [x] 4.1 Run the backend test suite and confirm all new and existing tests pass.
- [x] 4.2 Manually exercise both new capabilities through the web Assistant page against the running backend: create an account in natural language, rename an account in natural language, and confirm the Telegram surface is unaffected (no code changes there).
- [x] 4.3 Run `npx prettier --write` on all changed files.

## Constitution Compliance

- **Backend Layer Structure**: New tools call `AccountService`; no direct repository or database access is introduced. Compliant.
- **Backend Service Layer**: `AccountService` gains no new public methods; existing methods are reused. Compliant.
- **Input Validation**: All business-rule validation stays in `AccountService`. Tool-layer zod schemas only restrict input shape (notably omitting `initialBalance` on `update_account`). Compliant.
- **Authentication & Authorization**: `userId` is read from the agent runtime context populated by authenticated callers (GraphQL resolver, Telegram service). Tools never accept `userId` from LLM input. Compliant.
- **Result Pattern**: Tools return service results wrapped in `Success(...)` and let `BusinessError` propagate, matching the existing `create-transaction.ts` precedent. Compliant.
- **Test Strategy**: Each new tool file has a co-located `.test.ts`. TDD order is enforced by task ordering (test task precedes implementation task within each tool group). `assistant-agent.test.ts` is extended for wiring. Compliant.
- **TypeScript Code Generation**: Tools use keyword-argument factories with object-destructured dependencies, descriptive names, no non-null assertions, no `as any`. Compliant.
- **Schema-Driven Development**: No GraphQL schema changes. Not applicable.
