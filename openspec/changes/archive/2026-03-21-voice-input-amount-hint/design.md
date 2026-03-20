## Context

The `createTransactionFromText` mutation accepts a free-text description and passes it to a ReAct agent. The agent infers all transaction fields and persists the transaction. Voice input is captured via the Web Speech API in `useVoiceInput.ts`; when a transcript arrives, the frontend immediately submits the text — indistinguishable from a keyboard submit at every layer below `AgenticInput.vue`.

The STT engine collapses spoken prices ("two thirty four" → "234"). Without knowing the input was voice, the agent has no reason to question whether "234" is a realistic amount for a given item.

## Goals / Non-Goals

**Goals:**

- Give the agent an explicit signal that the input came from voice
- When that signal is present, instruct the agent to validate the inferred amount against similar past transactions and common sense before persisting
- Keep the agent fully autonomous — it corrects silently or fails; no user interaction

**Non-Goals:**

- Pre-processing or normalising the STT transcript before submission
- Changing agent behaviour for keyboard-entered text
- Adding a confirmation step or user-facing clarification dialog

## Decisions

### 1. Thread a boolean flag through the full stack

**Decision**: Add `isVoiceInput: Boolean` to `CreateTransactionFromTextInput` (optional, defaults to absent/false) and pass it from frontend → GraphQL → resolver → service → system prompt construction.

**Alternatives considered**:

- _Always include the voice hint in every system prompt_: simpler (no schema change, no frontend wiring), but adds noise to typed input and could cause the agent to second-guess amounts the user deliberately typed
- _Pre-process the transcript on the frontend_: fragile — requires knowing which token is a price, and would silently mangle valid amounts like "234 euros"

**Rationale**: The flag is the most precise signal. It adds only one optional field and a conditional prompt section, with no behaviour change for the non-voice path.

### 2. Inject the voice hint into the `### Amount` section via a template placeholder

**Decision**: The system prompt is built from a template with a `{{VOICE_AMOUNT_HINT}}` placeholder inside the `### Amount` section. When `isVoiceInput` is true the placeholder is replaced with the voice-specific bullet; otherwise it is replaced with an empty string.

```
### Amount

- Mandatory field
- Numeric or written value representing a money quantity (e.g., 25, 20.5, "twenty five euros")
- If multiple amounts are present, MUST stop and report an error — only one transaction at a time
{{VOICE_AMOUNT_HINT}}
```

When `isVoiceInput` is true, `{{VOICE_AMOUNT_HINT}}` expands to:

```
- This description was captured via voice recognition. Speech-to-text commonly
  collapses spoken prices — "two thirty four" becomes "234". The integer "234"
  may represent 2.34, 23.4, or 234. Look up similar past transactions (same or
  related category, similar description) to assess which interpretation is most
  realistic. If no similar history exists, use the amount as transcribed.
```

**Alternatives considered**:

- Appending a separate `## Voice Input` section at the end of the prompt: the hint reaches the agent but outside the amount inference context, weakening its effect on the amount decision
- Passing a hint as a separate user message turn: unnatural for the agent's ReAct loop; system prompt is the right place for persistent context

**Rationale**: Co-locating the hint inside `### Amount` puts it in the exact context where the agent makes the amount decision, making the guidance more effective. The template placeholder keeps the substitution explicit and easy to test.

### 3. Track voice origin in `AgenticInput.vue` and emit it with the submit event

**Decision**: `AgenticInput.vue` internally tracks whether the last input update came from the voice `onTranscript` callback. It emits `submit` with a boolean payload `isVoice`. Parent components (`Transactions.vue`) forward this to `useCreateTransactionFromText.submit(isVoiceInput)`.

**Alternatives considered**:

- Expose a reactive `isVoiceInput` ref from `useCreateTransactionFromText` that `AgenticInput` sets directly: couples the composable to voice state it shouldn't own
- Pass voice state through a separate emit event (`submit-voice` vs `submit`): requires two event handlers in the parent for the same action

**Rationale**: A single `submit` event with a boolean payload is the minimal change. The composable stays stateless about input origin; voice awareness lives only where it's known.

## Risks / Trade-offs

- **Agent over-correction** — If the agent is too eager to reinterpret amounts, it may misread a legitimately typed "234" submitted via voice-triggered form. Mitigation: the agent is instructed to use similar past transactions and common sense, not to assume all integers are collapsed prices. The hint is calibrated rather than directive.
- **No history for new users** — The agent may have no past transactions to compare against. Mitigation: the hint explicitly instructs the agent to accept the transcribed amount when no similar history exists, so the agent does not error or guess.
- **STT ambiguity cannot always be resolved** — "234" from "two thirty four" is genuinely ambiguous (2.34, 23.4, 234). If the agent cannot determine the correct interpretation confidently, it should return an error — same as any other ambiguous mandatory field.

## Migration Plan

No data migration required. `isVoiceInput` is an optional input field; existing callers omitting it are unaffected. The schema change requires re-running codegen in both backend and frontend before any code referencing the new field can be compiled.

## Constitution Compliance

- **Schema-Driven Development**: `schema.graphql` is modified first; codegen runs before implementation — compliant
- **Backend Layer Structure**: Flag flows Resolver → Service only; no business logic in resolver — compliant
- **Backend Service Result Pattern**: `call()` signature changes but return type remains `Result<..., ...>` — compliant
- **Test Strategy**: `CreateTransactionFromTextService` has a service-layer test; the new `isVoiceInput` branch must be covered there — compliant
