# Fix MCP Favicon

**Issue**: [#579](https://github.com/alexei-lexx/budget/issues/579) - fix MCP favicon, now it is aws

## Why

The MCP connection URL shown on the Settings page points at the raw API Gateway
domain (`*.execute-api.amazonaws.com`), not the app's CloudFront or custom domain.
MCP clients that show a favicon for a connection display AWS's icon instead of the
app's own, because that AWS domain is the only thing they can look up. GraphQL
traffic already avoids this by riding through CloudFront; MCP does not.

## What Changes

- Add a CloudFront behavior for `/mcp*` that routes to the same API Gateway origin
  already used for `/graphql*`, so MCP traffic (like GraphQL traffic) goes through
  CloudFront and the custom domain when one is configured.
- **BREAKING**: Replace the `UserSettings.mcpUrl` GraphQL field with `mcpToken`.
  The backend no longer knows or needs its own public domain - it only returns the
  raw access token.
- Add a `VITE_MCP_ENDPOINT` frontend env var, mirroring the existing
  `VITE_GRAPHQL_ENDPOINT` pattern (default `/mcp`, overridable for local dev and
  decoupled deployments).
- The Settings page builds the full MCP URL client-side as
  `{VITE_MCP_ENDPOINT}?token={mcpToken}`, instead of receiving a complete URL from
  the backend.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `user-settings`: the MCP connection section now displays a URL built from a
  configurable frontend endpoint and a server-issued token, instead of a
  server-built absolute URL.

## Impact

- **Infra (`infra-cdk/`)**: `FrontendCdkStack` gains a `/mcp*` CloudFront behavior.
- **Backend (`backend/`)**: `schema.graphql` (`mcpUrl` → `mcpToken`), `UserService`
  (drops the now-unused `apiBaseUrl` constructor param and `buildMcpUrl` method),
  generated resolver types, `dependencies.ts` wiring for `UserService`.
- **Frontend (`frontend/`)**: `.env.example`, `apollo.ts`-style endpoint helper for
  MCP, `useUserSettings.ts`, `Settings.vue`, generated GraphQL types/schema sync.
- No change to `API_BASE_URL`, which `TelegramBotService` still needs.

## Constitution Compliance

- **Schema-Driven Development**: API change starts with `schema.graphql`, backend
  codegen, then frontend schema sync and codegen - followed in that order in tasks.
- **Backend Layer Structure**: `UserService` (service layer) keeps owning
  `mcpToken`; no direct database or infra access added.
- **Vendor Independence**: this change removes a dependency the backend had on
  knowing its own public AWS domain; the URL is now assembled from
  frontend-configurable endpoints, consistent with how GraphQL already supports
  frontend/backend hosted on different domains.
- **TypeScript Code Generation**: no new non-null assertions, `as any`, or
  abbreviated names introduced.
- No other constitution principles apply to this change.
