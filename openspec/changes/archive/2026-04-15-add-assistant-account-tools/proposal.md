## Why

The assistant can log transactions from natural language but has no way to create or rename accounts. Users must leave the chat surface (web or Telegram) and go to the UI to set up or tweak accounts, which breaks the conversational flow the assistant is designed for. Exposing account creation and renaming through the assistant closes that gap with two narrowly-scoped write tools.

## What Changes

- Add `create_account` tool to the assistant agent. Backed by `AccountService.createAccount`. Schema: `name`, `currency`, optional `initialBalance` (defaults to `0` when omitted).
- Add `update_account` tool to the assistant agent. Backed by `AccountService.updateAccount`. Schema: `id`, optional `name`, optional `currency`. `initialBalance` is intentionally omitted from the tool schema so the assistant cannot alter historical balances.
- Add one general sentence to the assistant system prompt stating that the assistant can now manage the user's accounts. The sentence does not name tools, fields, defaults, or business rules. All operational behaviour is carried by tool descriptions and zod schemas; all business rules stay in `AccountService`.
- Capability flows through both assistant surfaces: the web Assistant page and the Telegram bot (both route through `AssistantChatService` → assistant agent).
- Make the Assistant-delegation contract explicit in the `telegram-bot-integration` spec so that new Assistant capabilities do not require parallel spec additions on the Telegram side. While doing so, remove the existing per-capability duplication for transaction logging from the Telegram spec (covered by the delegation clause).
- Out of scope: archiving accounts via chat, editing initial balance via chat, bulk/merge operations. Those stay in the UI.

## Capabilities

### New Capabilities

- None. This change extends existing capabilities rather than introducing new ones.

### Modified Capabilities

- `assistant`: adds requirements for account creation and account update through the assistant, including a clarification step when the requested name (new on create, or target name on rename) is semantically similar to another existing account (pluralisation, typos, abbreviations) — cases the service-layer duplicate guard does not catch.
- `telegram-bot-integration`: makes Assistant delegation explicit (bot text messages are handled by the Assistant and inherit all Assistant capabilities); removes the now-redundant per-capability requirement for transaction logging via Telegram.

## Impact

- Code:
  - `backend/src/langchain/tools/create-account.ts` (new) and `update-account.ts` (new), each with co-located tests.
  - `backend/src/langchain/agents/assistant-agent.ts` — register the two tools and add a one-line capability sentence to `SYSTEM_PROMPT`.
  - `backend/src/dependencies.ts` — wire `AccountService` into the assistant agent factory if not already injected.
  - `backend/src/langchain/agents/assistant-agent.test.ts` — extend coverage for the new tool wiring.
- Services, repositories, GraphQL schema: unchanged. All validation lives in existing `AccountService`.
- Frontend: no changes. Account CRUD UI is unaffected.
- Telegram bot: no code changes beyond the assistant agent — it shares the same agent.
- Evals: none added in this change.
