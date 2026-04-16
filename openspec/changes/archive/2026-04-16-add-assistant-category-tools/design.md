## Context

The assistant agent (`backend/src/langchain/agents/assistant-agent.ts`) exposes read tools for accounts, categories, and transactions, write tools for accounts (`create_account`, `update_account`), and a `create_transaction_subagent` for transaction logging. Users interact with the assistant through two surfaces: the web Assistant page and the Telegram bot. Both flow through `AssistantChatService`, so any tool added to the assistant agent is available on both surfaces.

Today, category setup (create, rename, change type) is only reachable through the UI. Users coming in through Telegram cannot bootstrap their categories at all.

`CategoryService.createCategory` and `CategoryService.updateCategory` already own all business rules: name length, duplicate-name detection. The new tools reuse the service directly.

The account tools change (PR #402) established the pattern: keyword-argument factory, zod schema, `userId` from agent context, `Success(...)` wrapper, `BusinessError` propagation, extracted service interface, co-located tests. This change follows that pattern exactly for categories.

## Goals / Non-Goals

**Goals:**

- Let the user create a new category through the assistant by describing it in natural language.
- Let the user rename an existing category or change its type through the assistant.
- Keep all business rules in `CategoryService`; the tools are thin adapters.
- Make the capability available equally on the web Assistant page and the Telegram bot with zero Telegram-side code changes.
- Extract a `CategoryService` interface (mirroring the `AccountService` interface pattern from PR #402) so tools depend on the interface.

**Non-Goals:**

- Archiving or deleting categories via chat. Remains UI-only.
- Editing `excludeFromReports` via chat. Remains UI-only.
- A dedicated category-management subagent or write-op wrapper.
- Bulk or multi-category mutations in a single tool call.
- Evaluation harness (eval file) for the new tools in this change.

## Decisions

### Decision: Two simple tools instead of a subagent

The assistant agent gains `create_category` and `update_category` tools alongside the existing tools. No intermediate agent.

- **Alternative considered**: a `manage_category_subagent` wrapping `get_categories`, `create_category`, and `update_category`.
- **Why rejected**: same reasoning as the account tools decision — category operations need only shallow inference (name and type). The service layer already provides validation. Adding another agent trades latency and tokens for safety that the service layer already handles.
- **Consequence**: the assistant agent's tool list grows from 11 to 13.

### Decision: `create_category` schema excludes `excludeFromReports`

The tool's zod schema accepts `name` and `type` (INCOME or EXPENSE). `excludeFromReports` is not a field the LLM can emit.

- **Alternative considered**: expose `excludeFromReports` as an optional boolean defaulting to `false`.
- **Why rejected**: the user stated this property is out of scope. It is a reporting concern that is better managed through the UI where users can see the full report context.
- **Consequence**: `excludeFromReports` defaults to the value used in the service/repository layer. The agent has no tool to set it, so the LLM will naturally tell the user it cannot.

### Decision: `update_category` schema excludes `excludeFromReports`

Same reasoning as `create_category`. The tool schema accepts `id`, optional `name`, optional `type`.

### Decision: `update_category` takes `id`, not `name`

The LLM must first call `get_categories` to list the user's categories, then pass the resolved `id` to `update_category`.

- **Alternative considered**: accept a `name` and let the tool resolve it.
- **Why rejected**: same reasoning as `update_account` — name resolution inside the tool hides ambiguity. Forcing the LLM through `get_categories` makes the resolution visible in the agent trace.
- **Consequence**: slightly more tokens per update turn; clearer traces.

### Decision: Reuse `CategoryService` end-to-end

Both tools call `CategoryService` methods and return their results wrapped in `Success(...)`. No validation or business rules are duplicated at the tool layer.

### Decision: Extract `CategoryService` interface

Following the pattern established in PR #402 where `AccountService` was split into an interface and `AccountServiceImpl`, `CategoryService` will be split the same way. The concrete class becomes `CategoryServiceImpl`. Tools and the assistant agent factory depend on the interface.

- **Alternative considered**: keep the concrete class and depend on it directly.
- **Why rejected**: breaks consistency with the account tools pattern. The interface enables clean mocking in tool tests.

### Decision: `userId` flows via agent context

Both tools read `userId` from the agent runtime context via `agentContextSchema.shape.userId.parse(config?.context?.userId)`, matching the account tools. Authentication remains in the GraphQL resolver / Telegram service.

### Decision: Telegram surface inherits the capability with no code changes

`ProcessTelegramMessageService` routes all text messages through `AssistantChatService` → assistant agent. Adding tools to the assistant agent automatically exposes them in Telegram. The delegation clause in the `telegram-bot-integration` spec already covers this.

### Decision: Clarify semantically-similar category names on create and update

`CategoryService` rejects exact duplicates case-insensitively and after trimming whitespace. What the service does NOT catch is semantic similarity: pluralisation (`"Groceries"` vs `"Grocery"`), typos, abbreviations, or synonyms. The tool descriptions instruct the agent to check existing categories via `get_categories` and ask a clarifying question when the requested name is a plausible near-variant of an existing one.

### Decision: No prompt change needed

The `SYSTEM_PROMPT` in `assistant-agent.ts` already mentions "Manage the user's accounts, categories, and transactions" in its goal section. No additional prompt change is needed — categories are already named.

- **Alternative considered**: add a sentence about category management.
- **Why rejected**: categories are already mentioned in the existing prompt. The LLM discovers the new capabilities through tool descriptions.

### Decision: Create a `CategoryDto` for tool responses

Following the `AccountDto` pattern from PR #402, a `CategoryDto` will be created to map category fields for tool responses: `id`, `name`, `type`, `isArchived`. This keeps the response shape explicit and decoupled from the internal model.

## Risks / Trade-offs

- **Assistant mis-fires a write** → Mitigated by the service-layer duplicate-name guard surfacing a clear error the LLM can relay, and by the rule that `update_category` requires an `id` resolved via `get_categories` first. Residual risk accepted given the low blast radius (category creation is reversible via archive; rename is trivially reversible).
- **Users hit the "can't edit excludeFromReports" wall** → The lack of a tool means the LLM cannot make the change, and the user is expected to use the UI. Deliberate product position.
- **Tool count on the assistant agent creeps** → Goes from 11 to 13. Still below any practical tool-count threshold; flagged so future additions are considered cumulatively.
- **LLM picks `update_category` when creation was intended (or vice versa)** → Mitigated by distinct tool descriptions and by requiring `id` for updates (forcing a `get_categories` call first).

## Migration Plan

- No data migration. No schema changes. No backfill.
- Deploy is a backend-only change; frontend and infrastructure untouched.
- Rollback: revert the commit. No persistent state introduced.

## Open Questions

None at this time.

## Constitution Compliance

- **Backend Layer Structure**: Tools live at the agent/adapter layer and call `CategoryService`; no repository or database access is added outside the service. Compliant.
- **Backend Service Layer**: `CategoryService` gains no new public methods; existing methods are reused. The class is refactored into interface + impl following the established pattern. Compliant.
- **Input Validation**: All validation stays in `CategoryService`. Tool-layer zod schemas only restrict input shape (notably omitting `excludeFromReports`). Compliant.
- **Authentication & Authorization**: `userId` is taken from the agent runtime context populated by authenticated callers. Tools never accept `userId` from the LLM. Compliant.
- **Result Pattern**: Tools return service results; failures propagate as `BusinessError` via exceptions consistent with the existing tool pattern. Compliant.
- **Test Strategy**: Each new tool file has a co-located `.test.ts` with mocked service dependencies. Existing `assistant-agent.test.ts` is extended for tool wiring. Compliant.
- **TypeScript Code Generation**: Keyword-argument factories for tools (object-destructured dependencies), descriptive names, no non-null assertions or `as any`. Compliant.
- **Schema-Driven Development**: No GraphQL schema changes in this change. Not applicable.
