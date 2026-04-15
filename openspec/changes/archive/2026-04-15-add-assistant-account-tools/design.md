## Context

The assistant agent (`backend/src/langchain/agents/assistant-agent.ts`) exposes read tools for accounts, categories, and transactions, plus a `create_transaction_subagent` that wraps a dedicated agent for natural-language transaction logging. Users interact with the assistant through two surfaces: the web Assistant page and the Telegram bot. Both flow through `AssistantChatService`, so any tool added to the assistant agent is available on both surfaces.

Today, account setup (create, rename) is only reachable through the UI. Users coming in through Telegram cannot bootstrap their finances at all.

`AccountService.createAccount` and `AccountService.updateAccount` already own all business rules: name length, currency whitelist, duplicate-name detection, and the rule that forbids currency changes on accounts with existing transactions. The new tools reuse the service directly.

## Goals / Non-Goals

**Goals:**

- Let the user create a new account through the assistant by describing it in natural language.
- Let the user rename an existing account or change its currency (subject to the existing service-layer rule) through the assistant.
- Keep all business rules in `AccountService`; the tools are thin adapters.
- Make the capability available equally on the web Assistant page and the Telegram bot with zero Telegram-side code changes.

**Non-Goals:**

- Archiving or deleting accounts via chat. Remains UI-only.
- Editing `initialBalance` via chat. Remains UI-only. If the user sets the wrong initial balance, they archive and recreate the account through the UI.
- A dedicated account-management subagent or write-op wrapper.
- Bulk or multi-account mutations in a single tool call.
- Evaluation harness (eval file) for the new tools in this change.

## Decisions

### Decision: Two simple tools instead of a subagent

The assistant agent gains `create_account` and `update_account` tools alongside the existing data tools. No intermediate agent.

- **Alternative considered**: a `manage_account_subagent` wrapping `get_accounts`, `create_account`, and `update_account` internally, modelled on `create_transaction_subagent`.
- **Why rejected**: the transaction subagent earns its extra LLM hop with heavy inference (6 fields, voice disambiguation, history lookup, retry loop). Account operations need only shallow inference — currency normalisation is the only fuzzy field. Isolating rare, low-inference writes behind another agent trades a real cost (latency, tokens, duplicated tool wiring) for a benefit (write-safety) that the service layer already provides.
- **Consequence**: the assistant agent's tool list grows from 6 to 8. No prompt changes required — the agent discovers the new capabilities through tool descriptions.

### Decision: `create_account` defaults `initialBalance` to 0

The tool's zod schema accepts `name`, `currency`, and optional `initialBalance`. When the LLM omits `initialBalance`, the tool passes `0` to `AccountService.createAccount`.

- **Alternative considered**: require the LLM to always emit `initialBalance` and ask the user when it is not stated.
- **Why rejected**: most users opening a new account through chat are starting from zero (or want to log transactions from now on) and would find a clarifying question for "what is the starting balance?" friction-heavy. The UI itself defaults this field to 0. Mirroring that default keeps the chat surface consistent with the UI.
- **Consequence**: `initialBalance` is not in the "missing required details" check — only `name` and `currency` are. The user can still state an initial balance in their request and have it honoured.

### Decision: `update_account` schema excludes `initialBalance`

The tool's zod schema accepts `id`, optional `name`, and optional `currency`. `initialBalance` is not a field the LLM can emit.

- **Alternative considered**: add a service-layer guard that rejects `initialBalance` changes.
- **Why rejected**: the UI legitimately edits `initialBalance` at account creation. A service-level guard would break that. The restriction is specific to the chat surface, so the chat-surface schema is the correct place to enforce it.
- **Consequence**: to fix an incorrect balance, the user must use the UI (archive + recreate). The agent has no tool to do it, so the LLM will naturally tell the user it cannot.

### Decision: `update_account` takes `id`, not `name`

The LLM must first call `get_accounts` to list the user's accounts, then pass the resolved `id` to `update_account`.

- **Alternative considered**: accept a `name` and let the tool resolve it.
- **Why rejected**: name resolution inside the tool hides ambiguity (two accounts with similar names, archived accounts, typos). Forcing the LLM through `get_accounts` makes the resolution visible in the agent trace and puts the disambiguation burden on the reasoning layer, where it belongs.
- **Consequence**: slightly more tokens per update turn; clearer traces.

### Decision: Reuse `AccountService` end-to-end

Both tools call `AccountService` methods and return their results wrapped in `Success(...)` (mirroring `create-transaction.ts`). No validation or business rules are duplicated at the tool layer.

- **Alternative considered**: custom validation at the tool boundary.
- **Why rejected**: violates the constitution's Input Validation principle (services self-validate) and risks drift between chat and GraphQL paths.

### Decision: Userid flows via agent context

Both tools read `userId` from the agent runtime context via `agentContextSchema.shape.userId.parse(config?.context?.userId)`, matching `create-transaction.ts`. Authentication remains in the GraphQL resolver / Telegram service; the agent and its tools never accept `userId` from LLM input.

### Decision: Telegram surface inherits the capability with no code changes

`ProcessTelegramMessageService` already routes all text messages through `AssistantChatService` → assistant agent. Adding tools to the assistant agent automatically exposes them in Telegram. No Telegram-side code changes.

- **Alternative considered**: a narrower agent for Telegram that omits write tools.
- **Why rejected**: would split the prompt and tool wiring, with no clear user benefit. Feature parity across surfaces is explicitly desired.

### Decision: Declare Assistant delegation in the Telegram spec; stop duplicating per-capability requirements

The `telegram-bot-integration` spec is modified so its existing "Telegram text message answered by AI" requirement names the Assistant as the delegate and declares that all Assistant capabilities are available to the bot. At the same time, the existing per-capability requirement for transaction logging via Telegram is removed, as it is now covered by the delegation clause.

- **Alternative considered**: duplicate the new account create/update requirements on the Telegram side, matching the precedent set by the transaction-logging duplication.
- **Why rejected**: Telegram is an inbound channel that already routes to the same agent. Per-capability duplication creates two sources of truth for behaviour that is structurally identical, and invites drift every time the Assistant gains a capability. The delegation clause captures the contract once and future-proofs it.
- **Consequence**: future Assistant capabilities do not require a parallel telegram-bot-integration spec change. Channel-specific concerns (connect/test/disconnect, typing indicator, non-text rejection) remain in the Telegram spec.

### Decision: Clarify semantically-similar account names on create and update

`AccountService` already rejects exact duplicates case-insensitively and after trimming whitespace, on both create and update (the update guard excludes the target account itself), so `"Savings"` vs `"savings"` or `"  Savings  "` are covered at the service layer. What the service does NOT catch is semantic similarity introduced by the user's chat message: pluralisation (`"Savings"` vs `"saving"`), typos (`"Savings"` vs `"Savngs"`), abbreviations (`"Credit Card"` vs `"cc"`), or synonyms. When the user asks the Assistant to create an account — or to rename an existing one — and the requested name is a plausible near-variant of another existing account, the Assistant is expected to ask a clarifying question before applying the change, rather than silently producing a near-duplicate.

- **Alternative considered**: a fuzzy-similarity guard in `AccountService`.
- **Why rejected**: would block legitimately distinct accounts (e.g. `"Savings USD"` vs `"Savings EUR"`, `"Checking"` vs `"Checking Joint"`) and push a chat-surface disambiguation concern into domain logic. The service's job is to enforce hard invariants; soft "did you mean?" UX belongs with the caller that has access to user intent.
- **Consequence**: this is a reasoning-layer behaviour on both write paths. It is enforced through the `create_account` and `update_account` tool descriptions (instructing the agent to check existing accounts via `get_accounts` and ask when a semantic near-match exists) and surfaced as scenarios in the `assistant` spec under both account creation and account update. No service-layer change.

### Decision: Prompt change is a single general-capability sentence

The only edit to `SYSTEM_PROMPT` in `assistant-agent.ts` is a one-line addition to the role/task description stating, in general words, that the assistant can also manage the user's accounts (in addition to answering finance questions and logging transactions). The sentence does NOT name any tool, does NOT enumerate which operations are supported or unsupported, and does NOT describe any field, schema, default, or business rule.

- **Alternative 1 considered**: no prompt change at all — rely entirely on tool descriptions for discovery.
- **Why partially rejected**: the role/task framing in the existing prompt currently presents the assistant as a finance-question + transaction-logging agent. Without a one-line capability hint, the LLM may default to those framings even when an account-management intent is obvious from the user's message. A general sentence is enough to broaden the framing without leaking implementation detail.
- **Alternative 2 considered**: spell out constraints, tool names, supported fields, defaults, or "what to say when X is not supported" in the prompt.
- **Why rejected**: every constraint is already enforced in code. Required fields and the `0` default come from the tool's zod schema. Duplicate-name and currency-change-with-transactions come from `AccountService`. Archiving and initial-balance editing are unreachable because no tool exposes them. Tools are injected and discovered via their descriptions — naming them in the prompt or restating their schemas would create a second source of truth that drifts from the code.
- **Consequence**: when the user asks for something the agent cannot do (archive an account, edit an initial balance), the agent's response is shaped by the absence of a matching tool. When the service rejects a write, the LLM relays the service's error message. Tool descriptions on `create_account` and `update_account` carry all the per-tool guidance (purpose, when to use, that `update_account` needs an `id` callers should obtain via `get_accounts`).

## Risks / Trade-offs

- **Assistant mis-fires a write** → Mitigated by the service-layer duplicate-name guard surfacing a clear error the LLM can relay, and by the rule that `update_account` requires an `id` resolved via `get_accounts` first (forcing the LLM through an explicit lookup step). Residual risk accepted given the low blast radius (account creation is reversible via archive; rename is trivially reversible; currency change is rejected by the service whenever transactions exist).
- **Users hit the "can't edit initial balance" wall** → Not mitigated by prompt rules; the lack of a tool means the LLM cannot make the change, and the user is expected to use the UI. This is the deliberate product position.
- **Telegram users accidentally trigger account creation** → Same mitigation as the web surface (clear tool descriptions and the service-layer duplicate-name guard). Telegram has no additional UI affordances. Accepted risk.
- **Tool count on the assistant agent creeps** → Goes from 6 to 8. Below any practical tool-count threshold; flagged so future additions are considered cumulatively.
- **LLM picks `update_account` when creation was intended (or vice versa)** → Mitigated by distinct tool descriptions and by requiring `id` for updates (forcing a `get_accounts` call first, which is a natural disambiguation step).

## Migration Plan

- No data migration. No schema changes. No backfill.
- Deploy is a backend-only change; frontend and infrastructure untouched.
- Rollback: revert the commit. No persistent state introduced.

## Open Questions

None at this time.

## Constitution Compliance

- **Backend Layer Structure**: Tools live at the agent/adapter layer and call `AccountService`; no repository or database access is added outside the service. Compliant.
- **Backend Service Layer**: `AccountService` remains a domain entity service with no new public methods; existing methods are reused. Compliant.
- **Input Validation**: All validation stays in `AccountService`. Tool-layer schema restricts input shape (no `initialBalance` on update) but adds no business-rule checks. Compliant.
- **Authentication & Authorization**: `userId` is taken from the agent runtime context, which is populated from the authenticated caller (GraphQL resolver or Telegram service). Tools never accept `userId` from the LLM. Compliant.
- **Result Pattern**: Tools return service results; failures propagate as `BusinessError` via exceptions consistent with the existing `create-transaction` tool pattern. Compliant with the existing precedent in `backend/src/langchain/tools/`.
- **Test Strategy**: Each new tool file has a co-located `.test.ts` with mocked service dependencies. Existing `assistant-agent.test.ts` is extended for tool wiring. Compliant.
- **TypeScript Code Generation**: Keyword-argument factories for tools (object-destructured dependencies), descriptive names, no non-null assertions or `as any`. Compliant.
- **Schema-Driven Development**: No GraphQL schema changes in this change. Not applicable.
