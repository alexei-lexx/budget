## 1. Backend — GraphQL Schema

- [x] 1.1 In `backend/src/graphql/schema.graphql`, rename `askInsight` → `askAssistant`, `InsightInput` → `AssistantInput`, `InsightOutput` → `AssistantOutput`, `InsightSuccess` → `AssistantSuccess`, `InsightFailure` → `AssistantFailure`
- [x] 1.2 Run `npm run codegen` in `backend/` to regenerate TypeScript types from the updated schema

## 2. Backend — Resolver

- [x] 2.1 Rename `backend/src/graphql/resolvers/insight-resolvers.ts` → `assistant-resolvers.ts`
- [x] 2.2 Update the resolver file: rename the exported resolver map key from `askInsight` to `askAssistant` and update all references to the renamed GraphQL types (`AssistantInput`, `AssistantOutput`, `AssistantSuccess`, `AssistantFailure`)
- [x] 2.3 Update the resolver registration in the Apollo Server setup to import from `assistant-resolvers.ts`

## 3. Backend — Validation

- [x] 3.1 Run `npm test` in `backend/` and fix any failures
- [x] 3.2 Run `npm run typecheck` in `backend/` and fix any errors
- [x] 3.3 Run `npm run format` in `backend/` and fix any lint issues

## 4. Frontend — Codegen Sync

- [x] 4.1 Run `npm run codegen:sync-schema` in `frontend/` to pull the updated schema from backend
- [x] 4.2 Run `npm run codegen` in `frontend/` to regenerate typed composables (old `useInsightMutation` / equivalent will be regenerated as `useAskAssistantMutation` or equivalent)

## 5. Frontend — View and Composable

- [x] 5.1 Rename `frontend/src/views/Insight.vue` → `Assistant.vue`; update the page title string inside the file from "Insight" to "Assistant"
- [x] 5.2 Rename `frontend/src/composables/useInsight.ts` → `useAssistant.ts`; update all internal references to the renamed GraphQL composable/types from step 4
- [x] 5.3 Update `Assistant.vue` to import from `useAssistant.ts` instead of `useInsight.ts`

## 6. Frontend — Router and Navigation

- [x] 6.1 In `frontend/src/router/index.ts`, update the import to reference `Assistant.vue`, change the route path from `/insight` to `/assistant`, and rename the route from `Insight` to `Assistant`
- [x] 6.2 In `frontend/src/App.vue`, update the nav item: change `title="Insight"` to `title="Assistant"` and update the route name from `Insight` to `Assistant`

## 7. Frontend — Validation

- [x] 7.1 Run `npm test` in `frontend/` and fix any failures
- [x] 7.2 Run `npm run typecheck` in `frontend/` and fix any errors
- [x] 7.3 Run `npm run format` in `frontend/` and fix any lint issues

## Constitution Compliance

- **Schema-Driven Development**: Tasks 1–4 enforce schema-first workflow — schema updated and codegen run in both packages before any implementation code is touched.
- **Backend Layer Structure**: Only the GraphQL resolver layer is renamed; `InsightService` and `InsightChatService` are untouched.
- **Code Quality Validation**: Tasks 3 and 7 enforce the mandatory validation pipeline (tests → typecheck → lint) for both packages.
- **Finder Method Naming / Method Ordering**: No new methods introduced; not applicable.
