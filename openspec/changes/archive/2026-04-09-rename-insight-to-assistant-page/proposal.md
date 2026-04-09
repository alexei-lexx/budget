## Why

The "Insight" label is ambiguous and does not clearly communicate that the feature is an AI-powered assistant for asking financial questions. Renaming it to "Assistant" aligns the product language with user expectations and makes the feature more discoverable.

## What Changes

- **Frontend page**: The "Insight" page is renamed to "Assistant" — including route path, page title, and navigation menu label.
- **GraphQL operation and types**: The `askInsight` mutation and its associated types (`InsightInput`, `InsightOutput`, `InsightSuccess`, `InsightFailure`) are renamed to `askAssistant`, `AssistantInput`, `AssistantOutput`, `AssistantSuccess`, `AssistantFailure`.
- **`InsightService`**: NOT renamed — the service class keeps its current name.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `insight`: Page renamed from "Insight" to "Assistant"; GraphQL mutation and types renamed accordingly. No functional requirement changes — only labels and identifiers change.
- `navigation`: Navigation menu item renamed from "Insight" to "Assistant" in the specified menu order.

## Impact

- **Frontend**: Route (`/insight` → `/assistant`), page component name/file, navigation menu label, and all references to the `askInsight` mutation and its generated composable types.
- **Backend**: GraphQL schema — mutation name and type names; generated TypeScript types via `npm run codegen`.
- **No database changes**: No migrations required.
- **No behavioral changes**: All existing functionality remains identical.

## Constitution Compliance

- **Schema-Driven Development**: Change starts with the GraphQL schema update; both backend and frontend run `codegen` to regenerate types.
- **Backend Layer Structure**: `InsightService` is preserved; only the GraphQL layer (mutation name and types) changes — consistent with resolvers being the interface boundary.
- **Code Quality Validation**: Full typecheck and lint pass required after renaming across both packages.
