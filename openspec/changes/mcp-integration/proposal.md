# MCP Server for External AI Agents (MVP)

**Issue:** [#510 — add MCP server for external AI agent integration](https://github.com/alexei-lexx/budget/issues/510)

## Why

Users want to connect external AI agents (Claude Desktop, ChatGPT, etc.) to log transactions and ask about expenses through natural conversation, without opening the app's own UI. Before investing in the full OAuth 2.1 + Dynamic Client Registration flow the MCP spec prescribes, we want to ship the smallest thing that lets us **validate whether remote MCP access is actually valuable** — using the simplest possible authentication.

## What Changes

- Expose a remote MCP (Model Context Protocol) server over Streamable HTTP at a new `POST /mcp` endpoint, served by the existing web Lambda alongside the Telegram webhook.
- Authenticate the MCP channel with a single per-user access token appended to the URL (`/mcp?token=<token>`) — no OAuth, no client registration.
- Add a `mcpToken` to every user, maintained as an invariant: generated on user creation and backfilled for existing users via a one-time migration.
- Expose four MCP tools implemented natively with the MCP SDK: `get_accounts`, `get_categories`, `get_transactions`, `create_transaction`. The existing LangChain tools serve as a behavioral reference only — no LangChain code runs in the MCP path.
- Add an MCP connection section to the Settings page that shows the MCP URL with a **Copy** button (copies the full URL including the token) and a **Regenerate** button (the only way to rotate/revoke a leaked token).

**Deferred (explicitly out of scope for this MVP):**

- OAuth 2.1 authorization server and Dynamic Client Registration
- A list of connected agent clients with per-client revoke
- Header-based authentication for MCP

## Capabilities

### New Capabilities

- `mcp-server`: The remote MCP endpoint, its four tools, token-based authentication that resolves the token to an internal user id, and the per-user MCP token lifecycle (creation-time generation, one-time backfill, and regeneration).

### Modified Capabilities

- `user-settings`: The Settings page gains an MCP connection section that displays the user's MCP URL, lets them copy the full URL, and lets them regenerate their token.

## Impact

- **Backend**
  - `backend/src/lambdas/web.ts` — new `rawPath === "/mcp"` branch (mirrors the Telegram webhook branch).
  - New MCP handler + native MCP SDK tools calling the existing service layer.
  - `models/user.ts`, `repositories/schemas/user.ts`, `DynUserRepository` — new `mcpToken` field, `findOneByMcpToken`, and token generation on create.
  - New one-time migration in `backend/src/migrations/` to backfill `mcpToken`.
  - GraphQL schema + resolver + service for the regenerate-token mutation.
  - New dependency: `@modelcontextprotocol/sdk`.
- **Infra**
  - `infra-cdk/lib/backend-cdk-stack.ts` — new `McpTokenIndex` GSI on the Users table (mirrors `EmailIndex`).
- **Frontend**
  - `Settings.vue` — new MCP connection section (display URL + copy + regenerate), following existing Vuetify/snackbar conventions.

## Constitution Compliance

- **Authentication & Authorization** — The rule states all user authentication flows through AWS Cognito. This MVP introduces a second, narrower channel: the MCP endpoint authenticates an external agent by a per-user token that maps to the internal user id. This mirrors the existing Telegram integration, where inbound requests authenticate via a per-user `webhookSecret` rather than Cognito. The token is minted only for a Cognito-authenticated user (the regenerate action is a Cognito-protected GraphQL mutation), and all data access remains strictly user-scoped at the repository layer, preserving zero cross-user leakage. Flagged as a deliberate, precedented deviation for the auth channel only.
- **Schema-Driven Development** — The MCP endpoint is a separate transport (JSON-RPC over HTTP), not a GraphQL API change, consistent with the Telegram webhook precedent. The user-facing regenerate-token operation IS a GraphQL change and will start from a `schema.graphql` update with codegen.
- **Backend Layer Structure / Port Interfaces** — The MCP handler is a new entry point (analogous to a resolver) that calls the service layer; it does not access the database directly. Token lookup goes through the `UserRepository` port.
- **Data Migrations** — The token backfill is a versioned, idempotent migration under `backend/src/migrations/` that only sets `mcpToken` where absent.
- **Authorization / Repository Scoping** — Every MCP tool resolves the internal user id from the token and passes it to user-scoped service/repository methods; no user id is trusted from tool input.
- **Finder Method Naming** — Token lookup uses `findOneByMcpToken` (returns the user or `null`).
- **Vendor Independence** — The `McpTokenIndex` GSI uses a plain equality lookup reproducible in any SQL/NoSQL store; no vendor-specific features.
