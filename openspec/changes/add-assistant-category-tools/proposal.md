## Why

The assistant can manage accounts and log transactions but has no way to create or rename categories. Users must leave the chat surface (web or Telegram) and go to the UI to set up or tweak categories, which breaks the conversational flow. Exposing category creation and update through the assistant closes that gap with two narrowly-scoped write tools, mirroring the pattern established by the account tools in PR #402.

## What Changes

- Add `create_category` tool to the assistant agent. Backed by `CategoryService.createCategory`. Schema: `name`, `type` (INCOME or EXPENSE). `excludeFromReports` is out of scope — the tool does not accept or set it; the service default applies.
- Add `update_category` tool to the assistant agent. Backed by `CategoryService.updateCategory`. Schema: `id`, optional `name`, optional `type`. `excludeFromReports` is intentionally omitted from the tool schema.
- Capability flows through both assistant surfaces: the web Assistant page and the Telegram bot (both route through `AssistantChatService` → assistant agent).
- Out of scope: archiving categories via chat, editing `excludeFromReports` via chat. Those stay in the UI.

## Capabilities

### New Capabilities

- None. This change extends existing capabilities rather than introducing new ones.

### Modified Capabilities

- `assistant`: adds requirements for category creation and category update through the assistant, including a clarification step when the requested name is semantically similar to an existing category.

## Impact

- Code:
  - `backend/src/langchain/tools/create-category.ts` (new) and `update-category.ts` (new), each with co-located tests.
  - `backend/src/langchain/agents/assistant-agent.ts` — register the two tools.
  - `backend/src/dependencies.ts` — wire `CategoryService` into the assistant agent factory.
  - `backend/src/langchain/agents/assistant-agent.test.ts` — extend coverage for the new tool wiring.
  - `backend/src/services/category-service.ts` — extract an interface (following the `AccountService` pattern from PR #402) so tools depend on the interface.
  - `backend/src/utils/test-utils/services/category-service-mocks.ts` (new) — mock factory for the interface.
- Services, repositories, GraphQL schema: unchanged. All validation lives in existing `CategoryService`.
- Frontend: no changes.
- Telegram bot: no code changes — it shares the same agent.
