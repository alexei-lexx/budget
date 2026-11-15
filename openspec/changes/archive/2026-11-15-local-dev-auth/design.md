# Design

## Context

See proposal.md - Why.

The frontend and the backend already use standard OIDC and JWT:

- The frontend signs in with `oidc-client-ts` (authorization code flow with PKCE); `VITE_AUTH_ISSUER` is the `authority`
- `oidc-client-ts` uses `authority` only as text: it adds `.well-known/openid-configuration` to get the metadata URL, and it uses the value as a key for state and storage; it does not compare the token `iss` with `authority`
- The frontend uses `/graphql` when `VITE_GRAPHQL_ENDPOINT` is not set (`frontend/src/apollo.ts`)
- The frontend hides the passkey link when `VITE_AUTH_UI_URL` is not set (`frontend/src/App.vue`)
- The backend (`backend/src/auth/jwt-auth.ts`) checks the `iss` claim against `AUTH_ISSUER`, and the `client_id` claim against `AUTH_CLIENT_ID` or the `aud` claim against `AUTH_AUDIENCE`
- The backend reads the email from `<AUTH_CLAIM_NAMESPACE>/email`, or from the standard `email` claim when the namespaced claim is missing
- The backend always gets keys from `<AUTH_ISSUER>/.well-known/jwks.json`; this path is correct for Cognito and Auth0, but not for most other OIDC servers
- `backend/docker-compose.yml` gives each service a profile; `npm run dev` starts the `db` profile

## Goals / Non-Goals

**Goals:**

- Sign in locally with no AWS account and no deployed stack
- Accept any frontend origin as a callback URL, so later changes can add sandboxes without identity provider setup
- Keep one configuration shape (relative issuer, same-origin proxy) that a later change can reuse for Amp portals

**Non-Goals:**

- Discovery of the JWKS URL from the OIDC metadata document
- A local copy of Cognito features, such as passkeys, the Hosted UI, or the pre-token Lambda

## Decisions

### D1. Use `navikt/mock-oauth2-server` as the local identity provider

The server is a small Docker image (`ghcr.io/navikt/mock-oauth2-server`, port 8080).
It has an interactive login page that accepts any user name, does not check `redirect_uri` against a list, supports the authorization code and refresh token grants, and sends CORS headers.
Token callbacks add custom claims to the tokens.

Alternatives:

- `cognito-local` and moto: they copy the Cognito API but have no `/oauth2/authorize` login page, so the redirect flow of the frontend fails
- LocalStack Cognito: only in the paid tier, which breaks the free-tier rule
- Keycloak: realistic but heavy; it needs a realm configuration and starts slowly
- Dex: needs a list of redirect URIs, which brings back the Cognito problem
- `oidc-provider` in a backend script: full control, but more project code to keep

### D2. Use issuer ID `oidc` behind a Vite proxy without path rewrite

The mock server uses the first path segment as the issuer ID and builds the `iss` claim from the `Host` header of the request.
The Vite dev server proxies `/oidc` to `http://localhost:8080` and keeps the path and the `Host` header (`changeOrigin: false`).
So the issuer is `http://localhost:5173/oidc` for the browser, and the token `iss` has the same value.
The proxy entry uses the object form (`{ target }`), because the Vite string form sets `changeOrigin: true`.

Values:

- Frontend: `VITE_AUTH_ISSUER=/oidc`
- Backend: `AUTH_ISSUER=http://localhost:5173/oidc`

A rewrite from `/oidc/<id>` to `/<id>` would give an `iss` without the `/oidc` prefix, so the change does not use a rewrite.

Alternative: use `http://localhost:8080/<id>` as the issuer directly.
This works locally because the mock server sends CORS headers.
But Amp portals give one public URL for each port and put each portal behind Amp sign-in.
One origin for the app, the API, and the identity provider avoids cross-origin calls between portals.
The proxy now keeps the local and the later portal setups the same.

### D3. Set `server.strictPort: true` in Vite

When port 5173 is busy, Vite moves to the next free port.
Then the token `iss` changes and the backend rejects all tokens with an unclear error.
With `strictPort`, Vite stops with a clear port error.

### D4. Add the claims with a token callback for a fixed list of dev users

In Cognito, only the users that an administrator creates can sign in.
The mock server configuration copies this with a fixed list of dev users for issuer `oidc`: `dev1@example.com` and `dev2@example.com`.

- For a listed user name, the token gets `email` (`${subject}`) and `client_id` (`${clientId}`)
- For any other user name, including an invalid email address, the token gets only `client_id`, so the backend rejects it with "Email claim missing in JWT token"

To add a dev user, add the email address to the `match` pattern in `config.json` and restart the mock server.
`npm run db:seed` creates the dev users in the database when they do not exist, and adds sample data for all users.
The seed script keeps its own copy of the dev user list.

The backend reads the standard `email` claim, because the namespaced claim is missing.
The backend checks `client_id` against `AUTH_CLIENT_ID=budget-local`, as with Cognito.

Alternative: check `aud` through `AUTH_AUDIENCE`.
The mock server sets `aud` from rules that do not relate to the client ID, so the `client_id` check is simpler.

Alternative: a custom login page with an email field (`loginPagePath`).
The browser then rejects invalid email addresses on the login page.
But the page accepts any valid email address, so it does not copy the Cognito behavior.

### D5. Add an optional `AUTH_JWKS_URI` to the backend

`JwtAuthService` gets an optional `jwksUri` argument.
When it is not set, the service uses `<issuer>/.well-known/jwks.json` as before, so Cognito and Auth0 do not change.
Local value: `AUTH_JWKS_URI=http://localhost:8080/oidc/jwks`.

The backend gets keys from the mock server directly, not through the Vite proxy.
So backend authentication does not depend on the Vite dev server.

Alternative: get the JWKS URL from the OIDC metadata document.
This needs more code and one more network call; a later change can add it when a provider needs it.

### D6. Proxy `/graphql` only, not `/mcp`

The frontend uses its `/graphql` fallback, so `VITE_GRAPHQL_ENDPOINT` stays in `.env.example` only as a commented optional override.
`VITE_MCP_ENDPOINT` stays `http://localhost:4000/mcp`.
The settings page shows this URL to the user for external MCP clients, which call the backend directly and do not use the browser origin.

### D7. Run the mock server as a Compose service with profile `auth`

- Service `oidc-mock` in `backend/docker-compose.yml` with `profiles: [auth]`
- Port bound to `127.0.0.1:8080`, so only this machine can sign in through the mock server
- Image tag pinned to a fixed version, as for the other services
- Configuration in `backend/docker/oidc-mock/config.json`, mounted read-only and loaded through `JSON_CONFIG_PATH`
- New scripts `auth:start` (`docker compose --profile auth up -d`) and `auth:stop` (`docker compose --profile auth down`)
- A `predev` script runs `db:start`, `auth:start`, and `codegen` before `npm run dev`

### D8. Make the local values the default in `.env.example`

- `backend/.env.example`: `AUTH_ISSUER`, `AUTH_CLIENT_ID`, `AUTH_JWKS_URI`, and `AUTH_CLAIM_NAMESPACE` with local values
- `frontend/.env.example`: `VITE_AUTH_ISSUER=/oidc`, `VITE_AUTH_CLIENT_ID=budget-local`, `VITE_AUTH_SCOPE=openid profile email`, no `VITE_AUTH_UI_URL`, `VITE_GRAPHQL_ENDPOINT` only as a comment
- The Cognito and Auth0 blocks stay as commented alternatives

## Risks / Trade-offs

- [The relative `authority` does not work in `oidc-client-ts`] → A task signs in and out in the browser; fall back to `VITE_AUTH_ISSUER=http://localhost:5173/oidc` if needed
- [The mock server does not redirect to `post_logout_redirect_uri` after sign-out] → A task checks sign-out; if the redirect fails, the README tells the developer to go back to the app
- [The refresh token grant does not add the `${subject}` claims again] → A task checks a token refresh; if claims are missing, set a long `tokenExpiry` for local tokens
- [The token callback syntax differs from the documentation] → A task decodes a token and checks the `email`, `client_id`, and `iss` claims
- [Port 8080 is busy on the developer machine] → The developer changes the host port in `docker-compose.yml` and in `AUTH_JWKS_URI`
- [Local sign-in does not exercise Cognito-specific behavior, such as passkeys and the pre-token Lambda] → Developers can still set the Cognito values in `.env` to test against the deployed development pool
- [The mock server issues a token for any user name; the backend rejects an unlisted user only after sign-in] → The app shows empty pages without an error message, and the backend log shows "Email claim missing in JWT token"; the READMEs list the dev users
- [A developer can add an `email` claim for an unlisted user in the optional claims field of the login page] → Acceptable for local development; the port is bound to `127.0.0.1`, and no deployed environment uses the mock server

## Migration Plan

- Existing `.env` files with Cognito values keep working; the proxy and the new setting do not affect them
- To switch, a developer copies the auth values from the new `.env.example` files and runs `npm run dev`
- Rollback: revert the change; Cognito values in `.env` work as before
