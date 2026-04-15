## Context

The backend already hosts two LangChain agents with overlapping tool sets:

- `assistantAgent` — read-only. Exposed to users through `askAssistant` GraphQL mutation (Assistant page) and the Telegram bot via `AssistantChatService`.
- `createTransactionAgent` — read + write. Exposed to users through `createTransactionFromText` GraphQL mutation (Transactions page) via `CreateTransactionFromTextService`.

A precedent for composing agents as tools already exists: the `joke` tool wraps `jokeAgent` and is registered as a `subagentTools` entry on `assistantAgent` ([backend/src/langchain/agents/assistant-agent.ts:84](backend/src/langchain/agents/assistant-agent.ts#L84), [backend/src/langchain/tools/joke.ts](backend/src/langchain/tools/joke.ts)).

The goal is to let users of the Assistant page and the Telegram bot log transactions by describing them in chat, without abandoning the conversational surface.

Constraints:

- The Transactions page must continue to receive a structured `Transaction` object after NL transaction creation so the UI can refresh.
- Chat history (`ChatMessageRepository`) must not store creation-specific artifacts; only user question + assistant final response.
- Voice-input disambiguation already implemented in `createTransactionAgent` must keep working when the creation path is reached via the assistant.

## Goals / Non-Goals

**Goals:**

- Let the assistant agent invoke the create-transaction agent as a subagent tool when the user describes a specific transaction event.
- Preserve the existing `CreateTransactionFromTextService` path used by the Transactions page; do not unify entry points.
- Propagate `isVoiceInput` end-to-end from the Assistant page through the assistant agent into the subagent so speech-collapsed amounts are still disambiguated.
- Keep the assistant's Q&A behavior unchanged for any input that is not a clear transaction event.
- When the user's intent is genuinely ambiguous between "log a transaction" and "answer a question," the assistant asks a clarifying question instead of guessing.

**Non-Goals:**

- No changes to `createTransactionAgent` itself (prompt, tools, tool-call cap).
- No changes to the Transactions page UX or its GraphQL mutation.
- No intent-classifier service in front of the assistant agent.
- No new GraphQL mutation for transaction creation via the assistant — the existing `askAssistant` mutation absorbs this capability.
- No special handling of creation events in chat history persistence.
- No support for voice input from the Telegram surface (Telegram currently rejects non-text messages).

## Decisions

### 1. Subagent-as-tool, not intent router

The `createTransactionAgent` is wrapped in a new tool (`create_transaction_subagent`) and registered on `assistantAgent` alongside the existing data, math, and joke tools. The outer LLM decides when to invoke it.

**Why:** Matches the joke pattern already in the repo, avoids introducing a new "router" concept, and keeps mixed-intent turns natural (e.g., "log coffee 5€ and show this week's total" = one LLM turn, two tool calls). An LLM-based router adds another model call with the same ambiguity surface; a rule-based router is brittle on natural language.

**Alternatives considered:**

- Upstream LLM classifier that dispatches to `assistantAgent` or `createTransactionAgent` — rejected, adds latency without reducing ambiguity risk.
- Rule-based classifier (regex on question marks, currency symbols, past-tense verbs) — rejected, too brittle for real inputs like "coffee 5" or "spent 50 on rent?".

### 2. Tool is a thin wrapper over the subagent

The wrapping tool invokes the subagent and returns the subagent's last text message as the tool output. No transformation, no JSON re-wrapping, no error re-packaging. The outer LLM rewrites for the user based on its own prompt.

**Why:** The subagent's final message already contains everything the outer LLM might need (structured success block or an error string). Any transformation in the tool is code that duplicates what the outer prompt already does. Matches how `createJokeTool` returns its subagent's answer.

**Alternatives considered:**

- Parse the subagent's tool calls and return JSON (mirroring `CreateTransactionFromTextService.toolExecutions` inspection) — rejected; duplicates logic already present in the service, and the chat surface does not need structured fields.

### 3. Two entry points into `createTransactionAgent` stay separate

The Transactions page continues to invoke `CreateTransactionFromTextService`, which calls `createTransactionAgent` directly and returns a structured `Transaction` via `TransactionService.getTransactionById`. The assistant path invokes `createTransactionAgent` through the new subagent tool and returns a string.

**Why:** The Transactions page needs a `Transaction` object to refresh the transactions list; the assistant chat needs a string to show the user. Forcing both through the same interface would either leak a structured object into chat or force the Transactions page to parse strings. Keeping the dedicated service preserves the Result-pattern contract for the page.

**Alternatives considered:**

- Route the Transactions page through the assistant as well — rejected, forces post-hoc parsing of the assistant's string and drops `AgentTraceMessage` structure.

### 4. Routing lives in the tool description; clarification lives in the prompt

Tool selection happens through LangChain's normal tool-calling path: the outer assistant sees each tool's `description` and picks accordingly. The new tool's description states when to use it (e.g., "Use when the user describes a specific transaction they performed, such as 'bought coffee 5€' or 'paid 50 for rent yesterday'. Do not use for questions the user is asking about their finances."). The assistant agent's system prompt does not repeat this logic.

The only addition to the outer system prompt is a short line: when it is unclear whether the user wants to log a transaction or ask a question, ask a clarifying question instead of guessing.

**Why:** Putting routing guidance in the tool description is the intended extension point in LangChain; repeating the same guidance in the system prompt is redundant and drifts over time. The clarification rule is a behavioral nudge that is not expressible in a tool description.

### 5. Propagate `isVoiceInput` through the assistant chain

Add optional `isVoiceInput: Boolean` to `AssistantInput` in `schema.graphql`. The resolver forwards it into `AssistantChatService`, which forwards it into `AssistantService`, which forwards it into the assistant agent context (`agentContextSchema` already has the field). When the subagent tool is invoked, the tool re-invokes `createTransactionAgent` with the same context — so the voice-input heuristic continues to apply.

**Why:** Keeps a single source of truth for the flag in the agent context. No per-tool flag plumbing.

**Telegram:** `ProcessTelegramMessageService` currently rejects non-text messages, so it always calls `AssistantChatService` with `isVoiceInput = false`. No additional work on the Telegram side.

### 6. Tool-call limits

`createTransactionAgent` retains its per-invocation cap of one `create_transaction` call. The outer assistant has no cap on the subagent tool — two transactions in one user turn = two subagent invocations.

**Why:** Supports natural batch logging ("coffee 5€ and lunch 12€"). The per-invocation cap still protects against duplicate writes inside a single subagent run.

### 7. Chat history persistence is unchanged

`AssistantChatServiceImpl` continues to store only `ChatMessageRole.USER` (the question) and `ChatMessageRole.ASSISTANT` (the final text answer). Creation confirmations are embedded in the assistant's final response text; they are not persisted as separate records and have no dedicated role.

**Why:** Matches the session spec today; avoids a schema migration on `chat_message`. If the assistant later needs structured recall of prior creations, that is a future change.

## Risks / Trade-offs

- **[Misrouted intent → unintended transaction write.]** Outer prompt misreads a declarative like "rent is 500" and calls the subagent → mitigation: clarification-on-uncertainty decision (§4) and a prompt section that explicitly enumerates event-vs-state examples. The create-transaction agent itself will also refuse if mandatory fields (e.g., amount, account) cannot be inferred.
- **[Misrouted intent → missed log.]** Outer prompt treats "coffee 5€" as a query and retrieves nothing → mitigation: prompt examples bias toward logging when input is short, has an amount, and lacks question words.
- **[Nested agent trace shape.]** Callbacks in `LangChainAgent` collect `toolExecutions` and `agentTrace` from LLM callbacks; nested subagent calls surface as tool executions with their own child events → mitigation: verify the existing `LangChainAgent` trace handler captures nested tool runs in tests; no prompt or schema change should be needed.
- **[Latency / cost on chat turns.]** Every creation through the assistant now runs two agents instead of one → mitigation: use the same model for both paths; skip subagent invocation for pure Q&A (outer LLM decides).
- **[Ambiguity-driven extra turns.]** Clarification question adds a round-trip for genuinely ambiguous inputs → accepted trade-off; better than silent writes.
- **[Routing drift between tool description and prompt.]** If the event-vs-state guidance is partially re-stated in the assistant's system prompt, the two copies can diverge → mitigation: keep routing guidance only in the tool description; the assistant prompt adds at most a single clarification-on-ambiguity line.
- **[GraphQL schema change touches Assistant page.]** Adding `isVoiceInput` to `AssistantInput` requires the frontend to regenerate types and pass the flag from the existing Assistant page voice-input handler → mitigation: small, additive, optional field. Old clients continue to work (flag absent = `false`).

## Migration Plan

No data migration required.

Rollout steps:

1. Update `schema.graphql` with optional `isVoiceInput` on `AssistantInput`; run backend `codegen`.
2. Implement the subagent tool and wire it into `assistantAgent`.
3. Extend `AssistantService` and `AssistantChatService` to accept and forward `isVoiceInput`.
4. Update the `askAssistant` resolver to forward the new field.
5. Frontend sync via `npm run codegen:sync-schema` + `npm run codegen`; Assistant page passes the flag it already tracks for voice input.
6. Spec deltas merged alongside code.

Rollback: revert the change. The subagent tool is additive; `createTransactionAgent` and `CreateTransactionFromTextService` are unaffected.

## Open Questions

- Should the assistant prompt explicitly state that creation turns will produce the subagent's structured confirmation in the final answer, or should the assistant rewrite it into a shorter natural-language confirmation? Default: rewrite — but this is a prompt-tuning decision worth validating with live inputs before locking in.

## Constitution Compliance

- **Backend Layer Structure**: the subagent tool lives in `backend/src/langchain/tools/`, invokes the existing `createTransactionAgent`, and does not touch repositories directly. Writes still go through `TransactionService`.
- **Backend GraphQL Layer**: the new `isVoiceInput` field is optional and additive. The resolver remains thin — it forwards the input to the service layer.
- **Input Validation**: the assistant tool does not validate transaction fields itself; validation is delegated to the create-transaction agent and `TransactionService.createTransaction`.
- **Authentication & Authorization**: `userId` is threaded through the agent context. The subagent tool reads `userId` from context, never from tool input.
- **Result Pattern**: `TransactionService.createTransaction` continues to use the Result pattern internally. The tool boundary emits a string by design; domain boundary contracts are unchanged.
- **Test Strategy**: unit tests co-located with the new tool (`tools/<new>.test.ts`) and updated services. Tests mock the subagent / dependent service consistently with existing langchain tests.
- **TypeScript Code Generation**: keep factory signatures using destructured object arguments; avoid abbreviated names; retain explicit context schemas.
- **Schema-Driven Development**: schema is updated first, then backend and frontend regenerate types before consuming the new field.
