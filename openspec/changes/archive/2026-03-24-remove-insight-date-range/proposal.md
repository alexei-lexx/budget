## Why

The Insight page requires selecting a date range before asking a question — an extra step the AI agent can handle on its own by inferring the period from the question or defaulting to the current month.

## What Changes

- Remove the date range selector (preset chips and custom date fields) from the Insight page
- Remove `dateRange` from `InsightInput` and remove the `DateRangeInput` type from the GraphQL schema **BREAKING**
- Update the AI agent system prompt: infer date range from the question, default to the current month when unspecified, and always state the assumed range in the answer
- Simplify the user prompt: remove the "I have transactions between X and Y" prefix
- Remove date range validation from `InsightService` (start ≤ end, range ≤ 365 days at input level)
- Remove date range state and persistence from the frontend

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `insight`: removing the date range selection requirement; updating question submission (no date range input or validation); updating input persistence (date range no longer stored); updating AI agent behaviour (agent infers date range autonomously)

## Impact

- **Frontend**: `Insight.vue`, `useInsight.ts`, localStorage stored data shape
- **Backend**: `schema.graphql`, `insight-resolvers.ts`, `insight-service.ts`, `insight-service.test.ts`
- **Code generation**: `frontend/src/__generated__/vue-apollo.ts` and `backend/src/__generated__/resolvers-types.ts` must be regenerated after schema change

## Constitution Compliance

- **Schema-Driven Development**: Change starts with `schema.graphql`, followed by codegen on both sides — compliant
- **Backend Layer Structure**: Schema, resolver, and service changes stay within their respective layers — compliant
- **Input Validation**: Date range validation is removed because the field no longer exists; the 365-day cap at the `getTransactions` tool level is intentionally preserved — compliant
- **Test Strategy**: `insight-service.test.ts` updated to match the new service contract — compliant
