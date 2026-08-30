## Context

See proposal.md - Why.

Today, GraphQL and MCP are both served by the same backend Lambda behind one API
Gateway HTTP API (`BackendCdkStack`). `FrontendCdkStack` puts a CloudFront
distribution in front of the static frontend and adds a `/graphql*` behavior that
proxies to that API Gateway origin, so browser GraphQL traffic always rides
CloudFront (and the custom domain, when configured) via a relative `/graphql` URL
(`apollo.ts`). No such behavior exists for `/mcp*`. Separately, the backend builds
the absolute `mcpUrl` from `API_BASE_URL`, which is set to `httpApi.apiEndpoint`
(the raw `*.execute-api.<region>.amazonaws.com` domain) - the only base URL the
backend Lambda knows about at all.

`BackendCdkStack` is created before `FrontendCdkStack` in `infra-cdk/bin/app.ts`,
and `FrontendCdkStack` already depends on `BackendCdkStack.httpApi`. Making the
backend Lambda aware of the CloudFront/custom domain would require either
reversing that dependency (impossible - `FrontendCdkStack` needs the API Gateway
origin) or a post-deploy patch step, of the kind `AuthCallbackConfigStack` already
uses for Cognito callback URLs. This design avoids adding a second instance of
that pattern.

## Goals / Non-Goals

**Goals:**

- MCP connections work over CloudFront/custom domain, not the AWS execute-api domain.
- The backend never needs to know its own public-facing domain.
- The fix works unchanged in local dev (frontend and backend on different ports)
  and in decoupled deployments (frontend and backend on different hosts), per the
  Vendor Independence principle.

**Non-Goals:**

- No change to how `/graphql` is served or configured.
- No change to `API_BASE_URL` or `TelegramBotService`, which still needs the
  backend's own directly-reachable URL for Telegram's webhook callback.
- No new custom domain support beyond what `FrontendCdkStack` already provides.

## Decisions

### Decision 1: Route `/mcp*` through CloudFront, mirroring `/graphql*`

**Chosen**: Add an `additionalBehaviors["/mcp*"]` entry to `FrontendCdkStack`'s
`cloudfront.Distribution`, identical in configuration to the existing
`/graphql*` behavior (same origin, cache policy, origin request policy, allowed
methods, response headers policy).

**Alternatives considered**:

- Give the backend API its own custom domain (separate ACM cert, Route 53 record,
  SSM param) - duplicates the custom-domain machinery `FrontendCdkStack` already
  has, for no added benefit; CloudFront already fronts the same API Gateway origin.

**Rationale**: MCP and GraphQL are both requests to the same backend origin. Reusing
the existing origin and behavior shape is the smallest change that gets MCP behind
CloudFront (and the custom domain, when configured).

### Decision 2: Backend returns only `mcpToken`; frontend assembles the URL

**Chosen**: Replace `UserSettings.mcpUrl: String!` with `mcpToken: String!` in the
schema. `UserService` returns the raw token and drops its `apiBaseUrl` dependency
entirely (unused elsewhere in that service). The frontend builds the full URL.

**Alternatives considered**:

- Patch the backend Lambda's environment with the CloudFront/custom domain via a
  post-deploy custom resource (mirroring `AuthCallbackConfigStack`) - works, but is
  a second instance of a workaround the project already has one of; adds a new
  stack, a new Lambda handler, and IAM permissions for something a config value
  can express instead.
- Derive the origin client-side from `window.location.origin` - breaks in local
  dev (frontend on `:5173`, backend/MCP on `:4000`, no proxy configured) and in
  any deployment where frontend and backend are hosted on different domains
  (explicitly supported per Vendor Independence, and already handled for GraphQL
  via `VITE_GRAPHQL_ENDPOINT`).

**Rationale**: The backend has no legitimate need to know its own public domain -
only the frontend, which is loaded from that domain (or configured to know a
different one), does. This removes the coupling instead of routing around it.

### Decision 3: Add `VITE_MCP_ENDPOINT`, mirroring `VITE_GRAPHQL_ENDPOINT`

**Chosen**: New frontend env var `VITE_MCP_ENDPOINT`, defaulting to `/mcp` when
unset, read the same way `getGraphQLEndpoint()` reads `VITE_GRAPHQL_ENDPOINT`
(`.env.example` gets a matching `VITE_MCP_ENDPOINT=http://localhost:4000/mcp`
line for local dev). The Settings page builds the shown URL via
`new URL(getMcpEndpoint(), window.location.origin)` with `token` set through
`searchParams`, so the token is correctly URL-encoded and a relative
`getMcpEndpoint()` (the `/mcp` default) still resolves to an absolute URL.

**Alternatives considered**:

- Derive the MCP base from `VITE_GRAPHQL_ENDPOINT` (strip `/graphql`, append
  `/mcp`) - one fewer env var, but bakes in an assumption (MCP always shares
  GraphQL's origin) that today happens to be true but is nowhere stated, and
  needs URL-parsing code to implement.

**Rationale**: Matches the project's existing, explicit per-endpoint
configuration pattern. No implicit coupling, no URL-parsing logic - a plain
string default with an optional override, same shape as the existing GraphQL
endpoint helper.

## Risks / Trade-offs

- **Schema field rename is breaking** (`mcpUrl` → `mcpToken`) → Only consumer is
  this project's own frontend, deployed together with the backend; no external
  API consumers exist today.
- **Two env vars to keep in sync for decoupled deployments** (`VITE_GRAPHQL_ENDPOINT`
  and `VITE_MCP_ENDPOINT` must point at the same host in practice) → Both default
  to same-origin relative paths, so this only matters for the already-unusual case
  of a decoupled deployment, where the operator is already setting
  `VITE_GRAPHQL_ENDPOINT` explicitly.

## Migration Plan

1. Update `schema.graphql`, backend codegen, `UserService`, `dependencies.ts`.
2. Update frontend: schema sync, codegen, `.env.example`, endpoint helper,
   `useUserSettings.ts`, `Settings.vue`.
3. Update `FrontendCdkStack` to add the `/mcp*` behavior.
4. Deploy (`./deploy.sh`) - CloudFront distribution update and Lambda deploy can
   land in either order; the schema/frontend change and the CloudFront behavior
   are independent and both required for the fix to take full effect.
5. **Rollback**: revert the commit; no data migration involved.

## Constitution Compliance

- **Schema-Driven Development**: schema (`mcpUrl` → `mcpToken`) changes first,
  followed by backend codegen, then frontend schema sync and codegen.
- **Backend Layer Structure**: `UserService` (service layer) still owns building
  the settings payload; no new database or infra access.
- **Vendor Independence**: removes the backend's dependency on knowing its own
  AWS domain; frontend/backend can still be deployed to different hosts via
  existing per-endpoint env vars.
- **TypeScript Code Generation**: no non-null assertions, `as any`, or abbreviated
  names introduced by this change.
- No other constitution principles apply to this change.
