## Context

The Insight page currently requires users to select a date range before submitting a question.
This range is passed explicitly through every layer: UI chips → `useInsight` composable → `InsightInput` GraphQL type → `InsightService` → LLM user prompt ("I have transactions between X and Y").

The agent already knows today's date (injected in the system prompt) and can call `getTransactions` with any date range it chooses.
Removing the picker simplifies the UX and lets the agent reason about time the same way a user would.

## Goals / Non-Goals

**Goals:**

- Remove the date range selector from the UI entirely
- Remove `dateRange` from the GraphQL `InsightInput` type (breaking change)
- Update the system prompt so the agent infers the period, defaults to the current month, and states the assumed range in its answer
- Remove date range validation from `InsightService`

**Non-Goals:**

- Changing the 365-day cap enforced inside `getTransactionsTool` — that constraint stays
- Modifying any other part of the Insight feature (voice input, agent trace, response display)
- Migrating or clearing existing localStorage data — stale keys are silently ignored by the new code

## Decisions

### Remove `dateRange` entirely rather than making it optional

**Decision**: Drop `dateRange: DateRangeInput!` from `InsightInput` and delete the `DateRangeInput` type.

**Alternatives considered**:

- Make `dateRange` optional (`dateRange: DateRangeInput`) and use it as a hint when provided.
  Rejected: leaves dead code in place, adds ambiguity about what happens when it's omitted, and undermines the goal of letting the agent decide.

### System prompt: default to current month, state the range

**Decision**: Add the following guidance to the system prompt:

> When querying transactions, infer the date range from the question. If no time period is specified, default to the current month. If you assumed a time period, state it in the answer.

**Rationale**: Today's date is already injected into the system prompt, so the agent has everything it needs to reason about relative periods. The disclosure is conditional — questions that don't involve a time period (e.g. "show me my accounts") should not force a date range into the answer. Stating the assumed range makes the agent's assumption transparent only when it is relevant.

### Remove the user prompt prefix

**Decision**: Remove "I have transactions between X and Y.\n\n" from `buildUserPrompt`. Pass the question directly.

**Rationale**: That prefix existed solely to communicate the user-selected range to the agent. With the agent determining the range itself via tool calls, the prefix is redundant and misleading.

## Risks / Trade-offs

- **Ambiguous questions** ("what did I spend the most on?") — the agent defaults to the current month and voices it.
  If the current month has little data the answer may feel narrow.
  Mitigation: the stated range makes this visible to the user, who can rephrase.

- **Breaking GraphQL change** — any client sending `dateRange` will receive a schema validation error.
  This is a BFF with a single client (the frontend), so both sides are updated atomically.

- **Agent date inference quality** — the agent may occasionally misinterpret phrases like "last quarter".
  Mitigation: the agent states its assumed range; users can correct by rephrasing.

## Migration Plan

1. Update `backend/src/graphql/schema.graphql` — remove `dateRange` from `InsightInput`, remove `DateRangeInput`
2. Run `npm run codegen` in `backend/` to regenerate `resolvers-types.ts`
3. Update `insight-resolvers.ts` — remove `dateRange` extraction
4. Update `insight-service.ts` — remove `startDate`/`endDate` from `InsightInput`, remove date range validation, update prompts
5. Update `insight-service.test.ts` — remove date range from test inputs
6. Run `npm run codegen:sync-schema` then `npm run codegen` in `frontend/` to regenerate `vue-apollo.ts`
7. Update `useInsight.ts` — remove `dateRange` ref and `dateRangeInput` parameter
8. Update `Insight.vue` — remove date range UI and related state/logic/persistence

No server-side data migration needed.
No client-side localStorage migration needed — old keys are ignored.

## Constitution Compliance

- **Schema-Driven Development**: Change begins with `schema.graphql`, codegen runs on both sides before any application code changes — compliant
- **Backend Layer Structure**: Each change is confined to its layer (schema → resolver → service) — compliant
- **Input Validation**: Removing date range validation is correct because the input no longer exists; the 365-day guard at the tool level is preserved — compliant
- **Test Strategy**: Service tests updated to match the new contract; no new test files needed — compliant
