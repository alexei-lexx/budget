## Context

The proposal ([proposal.md](proposal.md)) adds a remote MCP server so external AI agents can read and create
transactions, authenticated by a single per-user token in the URL rather than the full OAuth 2.1 + Dynamic
Client Registration flow the MCP spec prescribes. This is an MVP to validate demand before investing in proper
OAuth.

Two pieces of existing code are relevant here:

- **Telegram webhook** (`backend/src/lambdas/telegram-webhook-handler.ts`): the web Lambda already branches on
  `rawPath` to handle a non-Cognito request alongside Apollo, authenticated via a secret in the
  `X-Telegram-Bot-Api-Secret-Token` header (mandated by Telegram's own Bot API). This design reuses the
  routing technique — a second `rawPath` branch in `web.ts` — for the new `/mcp` route.
- **LangChain tools** (`backend/src/langchain/tools/*.ts`): `get-accounts`, `get-categories`, `get-transactions`,
  and `create-transaction` already implement the exact business behavior the MCP tools need, calling
  repositories/services and shaping output with `toAccountDto` / `toCategoryDto`. The proposal treats these as a
  **behavioral reference only** — no LangChain code runs in the MCP path. This design reuses their DTO mapping
  helpers and validation logic (schema shape, `MAX_PERIOD_DAYS`) but wires calls through the native
  `@modelcontextprotocol/sdk` instead of `tool()` from `langchain`.

The web Lambda (`backend/src/lambdas/web.ts`) is invoked via API Gateway HTTP API with
`APIGatewayProxyEventV2` — a single request/response per invocation, no persistent socket and no HTTP
response streaming.

## Goals / Non-Goals

**Goals:**

- Ship a working remote MCP endpoint an external agent (Claude Desktop, ChatGPT, etc.) can connect to with a
  URL + token, no client-side OAuth flow.
- Reuse the existing service layer so MCP tools enforce the same business rules and user-scoping as the
  GraphQL API.
- Keep the token lifecycle (create, backfill, regenerate) simple: one required field, one GSI lookup, one
  regenerate action — the minimum needed for the URL-embedded-token approach the proposal chose.

**Non-Goals:**

- OAuth 2.1 authorization server / Dynamic Client Registration (deferred per proposal).
- Per-client connection tracking or per-client revoke (deferred per proposal).
- Header-based auth for MCP (deferred per proposal).
- Streaming (SSE) MCP responses — see [Decisions](#decisions).

## Decisions

### Transport: JSON responses over Streamable HTTP, not SSE

The MCP SDK's `StreamableHTTPServerTransport` supports both an SSE-streamed response and a single JSON
response (`enableJsonResponse: true`). API Gateway HTTP API + a standard Lambda handler returns one full
response per invocation — it cannot stream Server-Sent Events back to the client. This design uses
`enableJsonResponse: true`, which matches how synchronous request/response Lambdas already behave and requires
no change to the API Gateway integration (no Lambda response streaming / Function URLs).

**Alternative considered**: Lambda response streaming via Function URLs, to support real SSE. Rejected — adds
a second invocation path alongside API Gateway, contradicts "smallest thing that validates demand," and the
MCP spec's JSON-response mode is a supported, spec-compliant fallback for exactly this kind of deployment.

### Statelessness: one MCP server + transport instance per request

Lambda invocations are independent; there is no in-memory session store across them. Each request creates a
fresh `McpServer` and `StreamableHTTPServerTransport` with `sessionIdGenerator: undefined` (stateless mode). No
session table, no `Mcp-Session-Id` persistence.

**Alternative considered**: persisting MCP sessions in DynamoDB to support stateful multi-turn tool
interactions. Rejected — the four tools are single-shot request/response operations; the MCP spec does not
require session persistence for this class of server, and it would add a table and lifecycle management for
no behavioral benefit at MVP stage.

### Entry point: new branch in the existing web Lambda

`backend/src/lambdas/web.ts` gains a `rawPath === "/mcp"` branch that delegates to a new
`backend/src/lambdas/mcp-handler.ts`, mirroring the existing `rawPath === "/webhooks/telegram"` branch and
`telegramWebhookHandler`. No new Lambda function, no new CDK compute resource — only a new route on the
existing `HttpApi` (`infra-cdk/lib/backend-cdk-stack.ts`) forwarding `POST /mcp` to the same integration used
for GraphQL and the Telegram webhook.

### Auth: token embedded in the URL

The MCP endpoint authenticates via a single per-user token appended to the URL (`/mcp?token=<token>`), per the
proposal. A bare URL is the lowest-friction thing to paste into an agent client — no custom-header
configuration required. Header-based auth is explicitly deferred per the proposal.

`mcp-handler.ts` reads `token` from the query string (`event.queryStringParameters?.token`), calls
`userRepository.findOneByMcpToken(token)`, and:

- **missing or unmatched token** → return HTTP 401 immediately, generic body, before constructing any MCP
  server/transport. No user data, no distinction between "no token" and "wrong token" (per spec: "no user data
  is returned").
- **matched token** → resolved `userId` is captured in a closure and threaded into every tool handler, exactly
  like `agentContextSchema.shape.userId.parse(config?.context?.userId)` does today in the LangChain tools. No
  tool ever receives or trusts a `userId` from its own input — this is the same rule the constitution's
  Authentication & Authorization section already enforces for GraphQL resolvers.

This keeps auth a pure Lambda/HTTP-layer concern, not an MCP protocol concern — the MCP SDK never sees
unauthenticated requests.

### `mcpToken` lifecycle

- **Field**: `mcpToken: string` added to `UserData` / `User` (`backend/src/models/user.ts`), required and
  validated non-empty in `assertInvariants`. Token generation is owned by `User` alone: both `create()` and the
  new `regenerateMcpToken()` method below default to `randomUUID`, with `tokenGenerator` accepted only as a
  test seam for deterministic values in tests — same as the existing `idGenerator` parameter on `create()`, not
  a real pluggable strategy. Neither `UserService` nor any other caller generates or knows how a token is
  minted — they only ask the model for one.
- **Uniqueness/lookup**: new `McpTokenIndex` GSI on the Users table (`infra-cdk/lib/backend-cdk-stack.ts`),
  partition key `mcpToken`, `projectionType: ALL` — copy of the existing `EmailIndex` block. New
  `UserRepository.findOneByMcpToken(token): Promise<User | null>` on `DynUserRepository`, implemented like
  `findOneByEmail` (`QueryCommand` against the GSI, throws `RepositoryError` on a duplicate match as a data
  integrity guard).
- **Regeneration**: a new `User.regenerateMcpToken()` model method, alongside the existing `.update()`, returns
  a new `User` instance with a freshly generated `mcpToken` (invariants re-validated by the private
  constructor as always). `UserService.regenerateMcpToken(userId)` becomes pure orchestration — look up the
  user, call `user.regenerateMcpToken()`, persist the result via `userRepository.update()` — with no token
  logic of its own. Because `mcpToken` is a required invariant (never `undefined`), `DynUserRepository` always
  `SET`s it — no `REMOVE` branch needed (unlike `transactionPatternsLimit`/`voiceInputLanguage`).
- **Backfill**: one-time migration under `backend/src/migrations/`, timestamp-prefixed, following the
  `20260426204239-add-account-transaction-balance.ts` shape: scan the Users table, `UpdateCommand` with
  `ConditionExpression: "attribute_not_exists(mcpToken)"` per user, catch
  `ConditionalCheckFailedException` and continue (idempotent, safe to re-run).

### GraphQL surface: extend `UserSettings` with a backend-built `mcpUrl`

The backend builds the full MCP URL, not the frontend. `TelegramBotService` already builds a similar URL for
the Telegram webhook, via an injected `webhookBaseUrl` sourced from the `WEBHOOK_BASE_URL` env var
(`infra-cdk/lib/backend-cdk-stack.ts:366` sets it to `httpApi.apiEndpoint` — the same `HttpApi` that serves
GraphQL, the Telegram webhook, and will serve `/mcp`). That value is the backend's public base URL; it isn't
actually webhook-specific, it was just named for its first consumer.

This design renames that env var and property to reflect what it actually is, then reuses it for both
purposes:

- `WEBHOOK_BASE_URL` → `API_BASE_URL` in `infra-cdk/lib/backend-cdk-stack.ts` (the `addEnvironment` call) and
  `backend/.env.test.example`.
- `backend/src/dependencies.ts`: `requireEnv("WEBHOOK_BASE_URL")` → `requireEnv("API_BASE_URL")`.
- `TelegramBotService`: constructor property `webhookBaseUrl` → `apiBaseUrl` (4 references in
  `telegram-bot-service.ts`); its `webhookUrl` getter is unchanged apart from reading the renamed property.
- `UserService` takes the same `apiBaseUrl` dependency and builds
  `mcpUrl = ${apiBaseUrl}/mcp?token=${user.mcpToken}`.

This is a small, mechanical rename (one env var, four call sites) — not a webhook-specific concept being
awkwardly repurposed, but a generic one being named correctly now that it has a second consumer.

- `UserSettings.mcpUrl: String!` added to `schema.graphql` — the full, ready-to-copy URL, resolved by
  `UserService.getSettings` alongside the existing two fields.
- `Mutation.regenerateMcpToken: UserSettings!` added, resolved by calling `UserService.regenerateMcpToken`
  with the authenticated user id from context — same return shape as `updateUserSettings`; the returned
  `mcpUrl` reflects the newly generated token.
- The Settings page only ever displays `settings.mcpUrl` as-is. It has no MCP-specific logic and does not
  construct any part of the URL itself.

**Alternative considered**: keep `WEBHOOK_BASE_URL` as-is and inject it into `UserService` under that name, or
introduce a second, separately named env var pointing at the same URL. Rejected either way — the first bakes
a wrong, webhook-specific name into unrelated code; the second duplicates a single source of truth into two
configs that must always agree, with no mechanism enforcing that. Renaming once, at the four existing call
sites, avoids both problems.

**Alternative considered**: have the frontend concatenate its own API base URL with the token. Rejected — the
frontend's API base URL config is a separate concept from the backend's public base URL (per
[custom-domain/spec.md](../../specs/custom-domain/spec.md), a custom domain applies to the frontend only, not
the backend), so the two are not guaranteed to be the same value in every deployment. The backend already owns
the correct base URL for building externally-facing URLs like this one.

**Alternative considered**: add `mcpUrl` (or `mcpToken`) to `User` instead of `UserSettings`. Rejected —
`User` is fetched at app bootstrap by `ensureUser` (`frontend/src/composables/useUser.ts`, run from `App.vue`
on every load), which today selects only `email`. Putting a URL containing a secret token on that type would
mean every future query touching `User` has to remember not to select it; `UserSettings` is already fetched
only by the Settings page's own `GET_USER_SETTINGS` query, so `mcpUrl` stays out of the bootstrap path by
construction.

**Alternative considered**: a dedicated `mcpConnection` query/type (paralleling `telegramBot: TelegramBot`).
Rejected as unnecessary indirection — there's no additional state beyond the URL itself (no status enum, no
masking requirement, since the proposal explicitly wants the full copyable URL), and `UserSettings` already
exists as the home for exactly this kind of settings-page-only, non-bootstrap field.

### MCP tools: native SDK, reusing service layer + existing DTOs

Each tool (`get_accounts`, `get_categories`, `get_transactions`, `create_transaction`) is registered on the
`McpServer` with a Zod input schema and a handler that:

1. Looks up the closure-captured `userId` (never from tool input).
2. Calls the same service/repository methods the corresponding LangChain tool and GraphQL resolver already
   call (`AccountRepository.findManyWithArchivedByUserId`, `TransactionService`, etc.), keeping the
   Resolver → Service → Repository dependency direction from the constitution — the MCP handler is a new
   "resolver-equivalent" entry point, never touching the database directly.
3. Maps output with the existing `toAccountDto` / `toCategoryDto` (relocated to a shared, non-LangChain-specific
   location if needed, or imported as-is since they have no LangChain dependency) so the two entry points can't
   silently drift in shape.
4. Returns MCP tool results using the Result pattern already returned by the services
   (`Success`/`Failure` from `types/result`), translated to the MCP SDK's success/error content format.

`get_transactions` reapplies the `startDate <= endDate` and `MAX_PERIOD_DAYS` (365-day) checks already proven
in `get-transactions.ts`; `create_transaction` reuses `TransactionService.createTransaction`, so the same
business rules (account/category existence, positive amount) that guard GraphQL mutations guard this tool.

`get_categories` does not carry over the `keywords` field the LangChain tool adds per category (recent
transaction descriptions previously assigned to it). That enrichment exists to help a weaker internal model
reason about categorization by example; external agents are assumed capable enough not to need it, and the
`get_categories` spec's return shape (`id`, `name`, `type`, `excludeFromReports`, `isArchived`) has no
`keywords` field. The MCP tool maps output with the plain `toCategoryDto`, not the LangChain tool's
keyword-enriched variant.

### Data isolation

Every tool call scopes reads/writes by the resolved `userId`, exactly as GraphQL resolvers do today — a
reference to another user's `accountId`/`categoryId` is not found (repository queries are already scoped by
`userId`), satisfying the "MCP Data Isolation" requirement without new repository logic.

## Risks / Trade-offs

- **Token in URL query string** → tokens can end up in access logs, browser history, or proxy logs.
  Mitigation: high-entropy token (`randomUUID`), single regenerate action as the revoke path.
- **Single shared token per user (no per-client)** → compromising one agent's URL compromises all agents;
  regenerating to fix one leak breaks every other connected agent. Mitigation: explicitly deferred per
  proposal; acceptable for an MVP whose goal is measuring demand, not hardening.
- **No rate limiting beyond API Gateway defaults** → token-guessing is throttled only by API Gateway's default
  limits. Mitigation: token entropy (122-bit UUID) makes brute force infeasible within any reasonable request
  budget; revisit if usage data justifies the OAuth investment.
- **JSON-only MCP responses (no SSE)** → any future MCP client/tool relying on server-initiated streaming
  notifications won't get them. Mitigation: none of the four MVP tools need server push; documented as a
  known limitation, revisit if Lambda response streaming is adopted later.
- **`mcpToken` is a mandatory invariant on `User`** → every path that constructs a `User` (tests, fakes,
  migration) must supply or generate one. Mitigation: default the generator in `User.create()` the same way
  `id` already defaults, and update `test-utils/models/user-fakes.ts` (if present) alongside the model change.

## Migration Plan

1. Deploy CDK change adding `McpTokenIndex` GSI and renaming the `WEBHOOK_BASE_URL` Lambda env var to
   `API_BASE_URL` (additive/renaming, no downtime — both land in the same deploy as the code that reads the
   new name, per step 2).
2. Deploy backend: schema change (`UserSettings.mcpUrl` field, `regenerateMcpToken` mutation), `User` model
   change, `DynUserRepository` changes, `TelegramBotService`/`UserService` reading `API_BASE_URL`, MCP handler
   - tools, new `@modelcontextprotocol/sdk` dependency, and the backfill migration — the migration runs
     automatically during deployment per the Data Migrations principle, assigning `mcpToken` to every
     pre-existing user before any MCP traffic can reach them.
3. Deploy frontend: Settings page MCP connection section (display URL, copy, regenerate).

**Rollback**: every change is additive (new field, new GSI, new route, new mutation) — reverting the backend
deploy removes the `/mcp` route and mutation without affecting existing functionality; the backfilled
`mcpToken` values are inert until the feature is redeployed.

## Open Questions

- None — MVP scope, auth model, and tool set are fully specified by the proposal and specs.

## Constitution Compliance

- **Vendor Independence / Repository Pattern**: `findOneByMcpToken` goes through the `UserRepository` port,
  same as `findOneByEmail`; the `McpTokenIndex` GSI uses plain equality lookup, reproducible in any SQL/NoSQL
  store.
- **Schema-Driven Development**: The GraphQL-facing pieces (`UserSettings.mcpUrl`, `regenerateMcpToken`) start from a
  `schema.graphql` update with codegen, same as any other API change. The MCP JSON-RPC transport itself is a
  separate, non-GraphQL protocol, so it is out of scope for this rule.
- **Backend Layer Structure / Port Interfaces**: The MCP handler is a new entry point analogous to a resolver;
  it calls services/repositories through existing ports and never touches DynamoDB directly.
- **Backend Domain Entities**: `mcpToken` is validated in `User`'s private constructor like every other
  invariant; `User.regenerateMcpToken()` produces a new `User` instance rather than mutating one, and is the
  sole owner of the token-generation algorithm — `UserService` only orchestrates lookup and persistence.
- **Result Pattern**: MCP tool handlers surface the `Success`/`Failure` results already returned by the service
  layer rather than introducing a parallel error convention.
- **Data Migrations**: The backfill is a versioned, idempotent file under `backend/src/migrations/`, following
  the existing scan + conditional-update shape.
- **Authentication & Authorization**: A second, narrower auth channel (token → internal user id) for this MVP;
  every tool call is scoped by the resolved user id, never by tool input.
- **Finder Method Naming**: `findOneByMcpToken` returns the user or `null`, matching the `findOne*` convention.
- **TypeScript Code Generation**: New code (handler, tools, migration) follows existing naming/argument
  conventions (keyword args for 3+ parameters, no abbreviated names).
