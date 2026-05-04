## Context

The create-transaction agent is invoked from two surfaces — the Transactions page (directly) and the Assistant page (via [create-transaction-subagent.ts](../../../backend/src/langchain/tools/create-transaction-subagent.ts)). Both reuse the same `SYSTEM_PROMPT` defined in [create-transaction-agent.ts](../../../backend/src/langchain/agents/create-transaction-agent.ts).

The voice-input branch of the Amount inference rules currently teaches the agent to handle one specific transcription artefact: collapsed decimals such as `"two thirty four"` → `"234"`. Disambiguation relies on a history lookup (find similar past transactions, pick the most realistic magnitude).

Browser speech-to-text produces a second transcription artefact that the prompt does not address: spoken decimals collapsed into a colon-separated string, e.g. `"eleven twenty three"` → `"11:23"`. With no rule for this pattern, the agent reads `"11:23"` as a time, finds no amount, and aborts with a "no amount" error. Issue [#439](https://github.com/alexei-lexx/issues/439) tracks this failure.

The fix must teach the agent to interpret `HH:MM`-style strings as decimal amounts in voice context, while still respecting cases where the user explicitly framed the colon-string as a time.

## Goals / Non-Goals

**Goals:**

- Allow the agent to create transactions when voice STT produces an `HH:MM`-style amount.
- Preserve the user's intent when they explicitly mention a time ("at 12:34", "around 7:30") — colon-string stays a time, no amount inferred.
- Keep typed (keyboard) input behavior unchanged.
- Cover both surfaces (Transactions page and Assistant page) with a single prompt change.

**Non-Goals:**

- Not adding a deterministic text-normalization layer in the service tier; the fix lives entirely in the LLM prompt.
- Not changing the existing history-based disambiguation for collapsed integer amounts (`"234"` → 2.34).
- Not extending the Telegram-bot voice path; that channel uses a different transcription pipeline and is out of scope.
- Not tuning model selection or temperature; test reliability under the existing model is accepted as-is.

## Decisions

### Decision 1: Fix in the LLM system prompt, not as a pre-processing step

**Choice:** Add new wording to the voice-input sub-block of the Amount section in `SYSTEM_PROMPT`.

**Alternatives considered:**

- **Pre-normalize text in [create-transaction-from-text-service.ts](../../../backend/src/services/create-transaction-from-text-service.ts)** by replacing `:` with `.` for `HH:MM` patterns when `isVoiceInput` is true.
  - Pros: deterministic, easy to test, fast.
  - Cons: cannot tell whether `"at 12:34"` means time or amount — would mangle legitimate time mentions; cannot handle inline cases without broader regex; pushes ambiguity resolution out of the LLM where context is richer.
- **Hybrid**: pre-normalize the bare `^\d{1,2}:\d{1,2}$` pattern, leave inline cases to the LLM.
  - Pros: deterministic on the common case.
  - Cons: two code paths, extra surface area for tests, marginal gain since the LLM already handles the bare case once told.

**Rationale:** The disambiguating signal — "is this a time or an amount?" — is contextual ("at", "around", "by" vs locative or amount-only phrasings). The LLM already weighs context for the existing collapsed-integer rule; extending the same pattern keeps a single owner of voice-amount logic. Branch name `parse-voice-hhmm-amount` reflects the intent.

### Decision 2: Pattern `\d{1,2}:\d{1,2}` (H:M, H:MM, HH:M, HH:MM)

**Choice:** The prompt describes the pattern permissively as "1–2 digits, colon, 1–2 digits".

**Alternatives considered:**

- Strict `HH:MM` (two digits both sides): rejects `"7:5"` and similar STT outputs even though they likely represent decimal amounts.
- Strict 2-digit cents only (`\d{1,2}:\d{2}`): excludes 1-digit cents, which STT may produce when the user says "seven fifty cents" → "7:50" (covered) but also "seven five" → "7:5" (excluded).

**Rationale:** Permissive matching reduces false negatives. As a side effect, atypical patterns like `"1:5"` or `"11:5"` are not valid clock formats anyway, so accepting them as amounts has near-zero conflict with legitimate time phrasing.

### Decision 3: Time-context exception via prompt examples, not regex carve-outs

**Choice:** The prompt explicitly tells the agent to keep the colon-string as a time when surrounding wording marks it as one — supplied examples include `"at"`, `"around"`, `"by"` as time markers, and a contrast example showing locative `"at"` (`"lunch 11:23 at cafe"`) where the colon-string is still the amount.

**Alternatives considered:**

- Regex-based exclusion ("if preceded by 'at' within N tokens, treat as time"): fragile across languages and phrasings; cannot distinguish locative `at` from temporal `at`.
- No exception (always treat colon-string as amount): would mishandle the rare case where the user genuinely means a time and there is no amount in the input. Agent would coerce the time into an amount silently.

**Rationale:** Phrase-level disambiguation is exactly what the LLM is good at. Examples in the prompt are cheap and steerable.

### Decision 4: Apply rule only when `isVoiceInput=true`

**Choice:** New rule lives inside the existing "If voice input is indicated" sub-block, gated on the same flag.

**Rationale:** Typed input never produces accidental `HH:MM` for an amount. If a user types `"11:23"` they meant something specific; coercing it to a decimal would surprise them. Existing voice-input gating in [create-transaction-agent.ts](../../../backend/src/langchain/agents/create-transaction-agent.ts) (the `dynamicSystemPromptMiddleware` block) already isolates voice rules from keyboard input — placing the new rule there inherits this isolation for free.

## Risks / Trade-offs

- **Non-determinism of prompt-only fix → Mitigation:** add focused integration tests in [create-transaction-agent.int.test.ts](../../../backend/src/langchain/agents/create-transaction-agent.int.test.ts) covering bare colon-amount, mixed text, time-context exclusion, locative `at`, and keyboard isolation. Tests run against the configured model; flake budget is the same as for the existing `"234"` → 2.34 test.
- **Phrase ambiguity edge cases (`"lunch 11:23 at cafe"`, `"100 at 15:30"`) → Mitigation:** include explicit examples for locative `at` and amount-plus-time in the prompt. Examples are documented in the spec scenarios and asserted by tests.
- **Cross-channel scope creep:** Telegram-bot voice ingestion is unaffected, but a future maintainer might assume the prompt change covers it. **Mitigation:** non-goal stated above; design.md and proposal.md both name the scope explicitly.

## Migration Plan

- No data migration. No infrastructure changes.
- Deploy is a single backend release; behavior changes the moment the new prompt reaches production.
- Rollback is a code revert; no state to undo.

## Open Questions

None. All design questions resolved during the exploration phase.

## Constitution Compliance

- **Backend Layer Structure**: Change is confined to the agent system prompt; no resolver, service, or repository boundaries shift. Compliant.
- **Test Strategy**: New tests are integration tests co-located next to the agent source file. Compliant.
- **Code Quality Validation**: Implementation will run targeted tests, full backend suite, typecheck, and format before completion. Compliant.
- **TypeScript Code Generation**: Prompt-string change only; no new TS code paths or types. Compliant.
- **Input Validation**: `isVoiceInput` flag is already validated upstream in [create-transaction-from-text-service.ts](../../../backend/src/services/create-transaction-from-text-service.ts). No new input boundary introduced. Compliant.
- Schema-driven development, GraphQL layer, pagination, soft-deletion, migrations, auth, finder naming, method ordering, frontend code rules: not applicable to this change.
