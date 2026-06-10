## Context

The AI agent that creates transactions from natural language uses a `VOICE_INPUT_SUBPROMPT` injected into its system prompt when `isVoiceInput: true`. This subprompt already handles two speech-to-text artefacts:

1. Concatenated numbers: "two thirty four" → "234" (may be 2.34, 23.4, or 234)
2. Colon-format: "eleven twenty three" → "11:23" (may be price or time)

Missing case: when a user says "twelve fifty-four", speech-to-text may emit two separate integers — "12 54" — rather than "1254" or "12:54". The agent currently fires its base rule ("if multiple amounts are present, stop and report an error") rather than recognising this as a decimal price.

## Goals / Non-Goals

**Goals:**

- Teach the agent to recognise two adjacent integers N M as a decimal price when they are the only numbers in a voice-originated input.
- Apply the rule: M is the fractional part, padded with a leading zero only when single-digit ("12 54" → 12.54, "12 5" → 12.05).
- Add integration tests for the new pattern.

**Non-Goals:**

- Change application code, GraphQL schema, or frontend.
- Handle three or more separate integers.
- Change keyboard input behaviour.

## Decisions

### Decision: Prompt-only fix, no preprocessing

**Chosen:** Add a new paragraph to `VOICE_INPUT_SUBPROMPT`.

**Alternatives considered:**

- _Pre-process the transcript in application code_ — normalise "12 54" to "12.54" before the agent sees it. Rejected: adds fragile regex in the wrong layer; all other voice artefact handling lives in the prompt.
- _Post-process on multi-amount error_ — catch the error and resubmit with a hint. Rejected: overly complex for a case the prompt should prevent.

### Decision: M is the fractional part, padded with a leading zero only when single-digit

"12 54" → 12.54; "12 5" → 12.05. Speech-to-text preserves the digit count of the spoken number, so the mapping is unambiguous regardless of currency decimal places.

### Decision: History lookup still required

Consistent with the existing concatenated-number rule: look up similar past transactions before committing to the interpretation.

## Risks / Trade-offs

- **False positive** — "12 54" could be two separate items priced at 12 and 54. Mitigation: the rule applies only when these are the only numbers in the input and context describes a single purchase.
- **History lookup cost** — one extra DB call on the agent path. Acceptable; the same cost already exists for other voice rules.

## Constitution Compliance

- **Backend-only change**: No schema or frontend changes; consistent with the independent package principle.
- **Prompt as the correct layer**: Agent behaviour is governed by its system prompt; this follows the established pattern.
- **Integration tests required**: Added alongside the prompt change, consistent with the constitution's test strategy for agent behaviour.
