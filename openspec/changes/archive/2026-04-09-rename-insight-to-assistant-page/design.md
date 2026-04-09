## Context

The "Insight" feature is an AI-powered financial Q&A assistant. It is surfaced as a dedicated page in the app, backed by a GraphQL mutation (`askInsight`), a resolver, and two service classes (`InsightService`, `InsightChatService`). The rename to "Assistant" is a user-facing branding change with no functional impact.

Current identifiers:

| Layer                   | Current                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| Route path              | `/insight`                                                          |
| Route name              | `Insight`                                                           |
| Vue view                | `Insight.vue`                                                       |
| Frontend composable     | `useInsight.ts`                                                     |
| GraphQL mutation        | `askInsight`                                                        |
| GraphQL types           | `InsightInput`, `InsightOutput`, `InsightSuccess`, `InsightFailure` |
| Backend resolver file   | `insight-resolvers.ts`                                              |
| Backend service classes | `InsightService`, `InsightChatService` (unchanged)                  |

## Goals / Non-Goals

**Goals:**

- Rename all user-facing and API-facing identifiers from "Insight" to "Assistant"
- Follow the schema-driven development process (schema first, then codegen, then implementation)
- Keep the change purely mechanical with no behavioral modifications

**Non-Goals:**

- Renaming `InsightService` or `InsightChatService` class names or their files
- Changing any business logic, UI layout, or feature behavior
- Adding redirects from `/insight` to `/assistant` (internal app, no external links to preserve)

## Decisions

### Decision: Rename resolver file; keep service files

The backend resolver file (`insight-resolvers.ts`) is renamed to `assistant-resolvers.ts` because it is directly tied to the GraphQL operation names and is part of the API surface. The service files (`insight-service.ts`, `insight-chat-service.ts`) and their class names are **not** renamed — they are internal implementation details explicitly excluded from scope.

_Alternative considered_: Rename all files for consistency. Rejected — the user explicitly excluded `InsightService`, and renaming service files risks unnecessary churn across tests and imports.

### Decision: Rename frontend view and composable

`Insight.vue` → `Assistant.vue` and `useInsight.ts` → `useAssistant.ts`. These are tightly coupled to the page identity and the GraphQL operation name, so renaming aligns them with the new name.

_Alternative considered_: Keep file names, rename only display strings. Rejected — mismatched file names cause confusion when the route and mutation are both called "assistant".

### Decision: No URL redirect

No redirect from `/insight` to `/assistant` is added. This is an internal SPA; no external bookmarks or deep links are expected to use this path.

### Decision: Schema first

Per the Schema-Driven Development principle, the GraphQL schema is updated first. Both `backend` and `frontend` run `codegen` to regenerate types before any other code is changed.

## Risks / Trade-offs

- **Stale bookmarks**: Users who bookmarked `/insight` will land on a 404. Accepted — no redirect added per scope decision above.
- **Generated type churn**: Codegen regenerates composable names; any other file importing the old generated types must be updated. Risk is low because there is only one consumer (`useInsight.ts` / the view).

## Migration Plan

1. Update `backend/src/graphql/schema.graphql` — rename mutation and types.
2. Run `npm run codegen` in `backend/` to regenerate TypeScript types.
3. Run `npm run codegen:sync-schema` then `npm run codegen` in `frontend/` to sync schema and regenerate composables.
4. Rename and update backend resolver file (`insight-resolvers.ts` → `assistant-resolvers.ts`).
5. Rename and update frontend view (`Insight.vue` → `Assistant.vue`) and composable (`useInsight.ts` → `useAssistant.ts`).
6. Update router and `App.vue` navigation references.
7. Run full typecheck and lint in both packages.

No rollback strategy required — change is purely additive/mechanical with no data or infrastructure impact.

## Open Questions

_None._

## Constitution Compliance

- **Schema-Driven Development**: Schema updated first; codegen run in both packages before touching implementation code.
- **Backend Layer Structure**: Only the GraphQL resolver layer is renamed; service layer is untouched.
- **Code Quality Validation**: Full typecheck (`npm run typecheck`) and format (`npm run format`) required in both packages before completion.
- **Vendor Independence**: No changes to deployment or infrastructure; both frontend and backend remain portable.
