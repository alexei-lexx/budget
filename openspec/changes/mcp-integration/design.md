## Context

The backend is a single Apollo Lambda (`backend/src/lambdas/web.ts`) that already branches on `event.rawPath` to hand off non-GraphQL traffic: `/webhooks/telegram` goes to `telegramWebhookHandler` before the Apollo handler runs. That handler authenticates by looking up a per-user secret (`webhookSecret` on `TelegramBot`, resolved via a `WebhookSecretIndex` GSI) and calls straight into the service layer (`resolveTelegramBotService()`), never touching GraphQL. The MCP endpoint follows the same shape: a new `/mcp` branch, a per-user secret (`mcpToken` on `User`, resolved via a new `McpTokenIndex` GSI), and services called directly.

`User` (`backend/src/models/user.ts`) is a plain interface, not one of the rich, invariant-enforcing domain entities the constitution describes (private constructor + `create()`/`fromPersistence()`). `id`/`createdAt`/`updatedAt` are already generated inside `DynUserRepository.create()` rather than by a domain factory. Adding `mcpToken` generation to the same spot is consistent with how the repository already manages this entity — it is not introducing a new pattern.

The four MCP tools (`get_accounts`, `get_categories`, `get_transactions`, `create_transaction`) already exist as LangChain tool implementations under `backend/src/langchain/tools/`. Per the proposal, those are a behavioral reference only: the MCP tools are new, native `@modelcontextprotocol/sdk` registrations that call the same `AccountServiceImpl` / `CategoryServiceImpl` / `TransactionServiceImpl` methods directly, with no LangChain dependency in the MCP request path.

The Lambda is invoked through API Gateway v2 (`APIGatewayProxyEventV2` in, `APIGatewayProxyResultV2` out) via `@as-integrations/aws-lambda`, buffering the full response — there is no support for Lambda response streaming in the current setup. `@modelcontextprotocol/sdk`'s `StreamableHTTPServerTransport` is written against Node's `http.IncomingMessage` / `http.ServerResponse`, not API Gateway events, so wiring it into this Lambda needs a small adapter.

## Goals / Non-Goals

**Goals:**

- Let an external MCP client (Claude Desktop, etc.) connect to `POST /mcp?token=<mcpToken>`, authenticate as one user, and call the four read/write tools defined in `specs/mcp-server/spec.md`.
- Guarantee every user has an `mcpToken` (new users on creation, existing users via a one-time migration) with no manual setup step.
- Let the user see their MCP URL and regenerate (rotate) their token from Settings, per `specs/user-settings/spec.md`.
- Keep the MCP path fully outside GraphQL/Cognito except for the regenerate action, mirroring the Telegram webhook precedent.

**Non-Goals:**

- OAuth 2.1 / Dynamic Client Registration, header-based auth, or a list of connected clients — explicitly deferred in the proposal.
- Multi-turn MCP session continuity (session IDs, resumable streams). Each request is handled statelessly.
- Any change to the LangChain tools or the assistant/Telegram agents — they remain untouched and unrelated to this code path.

## Decisions

### Token carried as a URL query parameter, not a header

`/mcp?token=<mcpToken>` is the entire auth mechanism, matching the proposal's explicit MVP scope (header auth is deferred). Most current MCP clients (Claude Desktop's remote-server config, etc.) only let a user paste a single URL, not configure custom headers, so this maximizes what "paste and go" clients can use today.

**Alternative considered:** `Authorization: Bearer <token>` header. Rejected for the MVP because it isn't uniformly configurable in today's MCP client UIs, and the proposal already frames header auth as a deferred, separate piece of work.

### `mcpToken` generated and looked up exactly like the Telegram `webhookSecret`

- `randomUUID()` generated once, stored as a plain attribute on the `User` item (`repositories/schemas/user.ts`, `DynUserRepository.create()`), not a derived/hashed value — mirrors `DynTelegramBotRepository`'s `webhookSecret`.
- New `UserRepository.findOneByMcpToken(token): Promise<User | null>` queries a new `McpTokenIndex` GSI (partition key `mcpToken`), the same shape as `EmailIndex` and `TelegramBotsTable`'s `WebhookSecretIndex`.
- Regeneration needs no new repository method: `UserService.regenerateMcpToken` generates a fresh `randomUUID()` and calls the existing generic `UserRepository.update(id, { mcpToken })` — the same one-shot atomic `UpdateCommand` `updateSettings` already uses, so the previous token stops matching the index immediately (satisfies "Token Regeneration Invalidates Prior Access").

**Alternative considered:** hashing the token at rest (store a hash, compare hashes on lookup) so a DynamoDB read doesn't expose the live secret. Rejected for this MVP to stay consistent with the existing `webhookSecret` precedent, which stores its secret in plaintext under the same threat model (Telegram's inbound secret token); revisit both together if the security bar changes.

### One-time backfill migration, same shape as the existing balance-backfill migration

New file in `backend/src/migrations/`, timestamp-prefixed, exporting `up(client)`, paginating with `ScanCommand` + `ExclusiveStartKey`, and writing with `UpdateCommand` guarded by `ConditionExpression: attribute_not_exists(mcpToken)` — directly modeled on `20260426204239-add-account-transaction-balance.ts`. Idempotent and safe to re-run.

### New `/mcp` branch in `web.ts`, checked before the Apollo handler

```
if (event.rawPath === "/webhooks/telegram") { ... }
if (event.rawPath === "/mcp") { return mcpHandler(event); }
return apolloHandler(event, context);
```

Same pattern as the Telegram branch: a dedicated handler function, resolved services via `dependencies.ts`, no GraphQL/Apollo/Cognito involvement.

### Auth resolved once, at the HTTP boundary, before MCP protocol handling begins

`mcpHandler` reads `event.queryStringParameters?.token`, calls `userRepository.findOneByMcpToken(token)`, and returns a bare `401` (no body revealing whether a user exists) if there's no match — before any MCP/JSON-RPC parsing happens. The resolved `userId` is then closed over when registering the four tools for that single request, so no tool implementation re-checks auth or receives a `userId` as tool input (matches "MCP Data Isolation": user id is never trusted from request/tool input).

**Alternative considered:** let the MCP SDK's transport handle the request first and reject inside a tool call if the token is bad. Rejected — it would mean doing JSON-RPC/protocol work for requests that are going to be rejected anyway, and it's a weaker match for "Requests without a valid token SHALL be rejected and SHALL NOT reveal any user data," which reads as an HTTP-level concern, not a tool-level one.

### `McpServer` + `StreamableHTTPServerTransport` in **stateless** mode, one instance per request

Per request: construct a new `McpServer`, `registerTool()` the four tools (closing over the request's `userId`), construct a `StreamableHTTPServerTransport({ sessionIdGenerator: undefined })` (the SDK's documented stateless configuration), `connect()` the server to the transport, and hand off the request. Nothing is cached or reused across Lambda invocations for MCP state.

**Alternative considered:** stateful mode, issuing a session ID and keeping the `McpServer` instance alive in the Lambda execution environment for warm-start reuse. Rejected — Lambda instances are ephemeral and horizontally scaled, so a session id from one instance is meaningless on the next invocation without an external session store (e.g. DynamoDB-backed session table). That's real complexity with no MVP benefit: none of the four tools need server-initiated pushes or multi-step interactions that outlive a single request.

### A minimal Node `http` req/res shim, not a manual JSON-RPC reimplementation

`StreamableHTTPServerTransport.handleRequest()` expects a Node `http.IncomingMessage`-shaped request and an `http.ServerResponse`-shaped response it can call `writeHead()` / `write()` / `end()` on. Since the Lambda receives an `APIGatewayProxyEventV2` and must return an `APIGatewayProxyResultV2`, the handler wraps the event in a small adapter exposing just the surface the transport touches (method, headers, body as a readable, and a response object that buffers what's written into a single `APIGatewayProxyResultV2`).

**Alternative considered:** bypass the transport and hand-roll JSON-RPC request parsing/dispatch against the low-level `Server` object. Rejected — that would mean reimplementing protocol details (the `initialize` handshake, capability negotiation, MCP error shapes) the SDK already gets right, for the sake of avoiding ~30 lines of adapter code.

### Regenerate is a Cognito-protected GraphQL mutation on the existing `User` type

`UserService` (a domain entity service — it already owns the full `User` CRUD surface) gains `regenerateMcpToken(userId)`, which generates a fresh `randomUUID()` and calls the existing generic `UserRepository.update(userId, { mcpToken })` — mirroring how `updateSettings` computes a value and writes it in one call, with no prior read. A new `regenerateMcpToken` GraphQL mutation follows the existing `updateUserSettings` resolver's shape in `user-resolvers.ts`: Cognito-authenticated, resolves the internal user id from context, calls the service, returns the updated `User`.

### `mcpUrl` is computed, not stored

The GraphQL `User` type gains a computed `mcpUrl` field: `${MCP_BASE_URL}/mcp?token=${user.mcpToken}`, built in the resolver the same way `TelegramBotService` builds `webhookUrl` from `webhookBaseUrl` + a per-user secret. Nothing beyond the raw `mcpToken` is persisted.

## Risks / Trade-offs

- **Token in a URL** (query string) → can leak via server access logs, browser history, or a `Referer` header if the MCP client ever navigates through it. Mitigation: regenerate is the documented, only revocation path (already called out in the proposal as a deliberate MVP trade-off); no additional mitigation added here so as not to diverge from the precedent this feature is modeled on (`webhookSecret` has the same exposure).
- **Stateless MCP transport per request** → no session continuity; every tool call is a fresh `initialize` + call round trip from the client's perspective. Mitigation: none needed for four independent, single-shot tools; flagged here so it isn't mistaken for an oversight if a future capability needs a real session.
- **Custom API Gateway ↔ Node http shim** → bespoke code with no test coverage from the SDK itself. Mitigation: keep it to the minimal surface `StreamableHTTPServerTransport` actually calls, and cover it with a repository-style test that exercises a real `POST /mcp` request end to end.
- **New GSI (`McpTokenIndex`) is eventually consistent**, same as `EmailIndex`/`WebhookSecretIndex` today → a token regenerated an instant ago could theoretically still resolve to the old value for a brief window. Mitigation: none beyond what the existing indexes already accept; not a new risk introduced by this change.

## Migration Plan

Deployment must be ordered so the GSI and the `mcpToken` attribute exist before any code queries them:

1. Ship the CDK change (`McpTokenIndex` GSI) together with the `mcpToken` schema/model change and the backfill migration. `DynUserRepository.create()` starts generating `mcpToken` for new users at this point; the migration backfills existing ones.
2. Ship the `/mcp` handler, the four tools, the `regenerateMcpToken` mutation, and the Settings UI.

Rollback is low-risk in both steps: an unused `mcpToken` attribute and an unused GSI are inert if step 2 is reverted; there is no destructive change to existing data.

## Open Questions

- The exact shape of the API Gateway ↔ Node `http` shim needs to be prototyped against the real `@modelcontextprotocol/sdk` types once the dependency is added — the SDK isn't installed yet, so the precise `IncomingMessage`/`ServerResponse` surface it touches should be confirmed against its actual TypeScript definitions during implementation rather than assumed here.
- Whether `MCP_BASE_URL` is a new env var or simply reuses the existing `WEBHOOK_BASE_URL` host with a different path — likely the latter, but worth confirming against how `infra-cdk` currently wires `WEBHOOK_BASE_URL` before introducing a second, near-identical env var.

## Constitution Compliance

- **Backend Layer Structure / Port Interfaces** — The `/mcp` handler is a new entry point, analogous to a resolver: it authenticates, then calls service-layer methods (`AccountServiceImpl`, `CategoryServiceImpl`, `TransactionServiceImpl`, `UserService`) which depend only on repository ports. No direct database access from the handler or the tool registrations.
- **Authentication & Authorization** — The MCP channel authenticates via `mcpToken` instead of Cognito, mirroring the already-accepted Telegram `webhookSecret` precedent (documented as a deliberate deviation in the proposal). The regenerate action itself stays behind Cognito. Every tool resolves `userId` once at the HTTP boundary and every repository call is scoped by it — no tool trusts a user id from its own input.
- **Finder Method Naming** — `findOneByMcpToken` returns `User | null`, matching the `findOne`/`findMany`/`get` convention already used by `findOneByEmail`/`findOneById`.
- **Data Migrations** — The `mcpToken` backfill is a versioned, idempotent file under `backend/src/migrations/`, following the existing `attribute_not_exists` guard pattern.
- **Vendor Independence** — `McpTokenIndex` is a plain equality-lookup GSI, reproducible in any SQL/NoSQL store, same as `EmailIndex`.
- **Schema-Driven Development** — `regenerateMcpToken` and the new `mcpUrl` field are GraphQL changes and start from `schema.graphql` + codegen, same as any other mutation/field. The `/mcp` endpoint itself is a separate JSON-RPC transport, not a GraphQL change, consistent with the Telegram webhook precedent.
- **Backend Domain Entities** — `User` is already a plain interface managed by its repository rather than a rich, factory-constructed entity; adding `mcpToken` generation inside `DynUserRepository.create()` follows that existing (pre-existing, unchanged-by-this-design) pattern rather than introducing a new one. Not a violation this change introduces.
- **Test Strategy** — The new repository method (`findOneByMcpToken`) gets a repository test against a real local DynamoDB, per existing convention; `UserService.regenerateMcpToken` gets a service test with a mocked repository (asserting it generates a fresh token and calls `update` with it); the `/mcp` handler gets a test exercising a real request through the shim.
