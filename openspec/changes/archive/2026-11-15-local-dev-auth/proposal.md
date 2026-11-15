# Proposal

## Why

Local development needs a deployed Cognito user pool.
A new developer must deploy the auth stack, copy its outputs into two `.env` files, and sign in with a real user before the app works.
Cognito accepts only callback and logout URLs that are registered one by one, without wildcards.
So each new frontend URL needs a change to the user pool, which blocks fast setup and parallel sandboxes.

## What Changes

- A mock OIDC server runs in Docker next to DynamoDB Local, under a new Compose profile `auth`
- The mock server accepts any callback URL
- The mock server signs in only the dev users in its configuration, as Cognito signs in only the users that an administrator creates
- The mock server issues access tokens with the email and client ID claims that the backend checks
- The Vite dev server proxies `/graphql` and `/oidc`, so the frontend calls the backend and the mock server from its own origin
- The frontend uses the relative issuer `/oidc`; the frontend code does not change
- The backend gets an optional `AUTH_JWKS_URI` setting; without it, the backend uses `<issuer>/.well-known/jwks.json` as before
- New npm scripts `auth:start` and `auth:stop` in `backend/`; `npm run dev` starts the mock server
- `npm run db:seed` creates the dev users and adds sample data for all users
- `.env.example` files in `backend/` and `frontend/` contain working local auth values, so a copy of each file is enough for sign-in
- The Cognito and Auth0 settings stay in `.env.example` as commented alternatives
- The constitution, `backend/README.md`, and `frontend/README.md` describe the mock server as the default local identity provider

### Non-Goals

- No support for Amp orbs or portals; a separate change adds them
- No parallel sandboxes on one machine (per-sandbox ports or table prefixes)
- No passkeys in local development; the passkey link stays hidden when `VITE_AUTH_UI_URL` is not set
- No change to production, the CDK stacks, or the deployed development user pool
- No change to the `pass-credentials` skill or to existing Playwright scripts

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The change affects only the local developer tooling and one optional backend setting, so the change sets `skip_specs: true`.

## Impact

- `backend/docker-compose.yml`: new service for the mock OIDC server with profile `auth`
- `backend/docker/oidc-mock/config.json`: new mock server configuration
- `backend/package.json`: new scripts `auth:start` and `auth:stop`; `dev` also starts the mock server
- `backend/src/auth/jwt-auth.ts` and `backend/src/dependencies.ts`: optional JWKS URL
- `backend/src/scripts/seed-data.ts`: creates the dev users
- `backend/.env.example`, `frontend/.env.example`: local auth values become the default
- `frontend/vite.config.ts`: dev server proxy for `/graphql` and `/oidc`
- `docs/constitution.md`: Development section and Authentication & Authorization section
- `backend/README.md`, `frontend/README.md`: local development setup
- Production code paths, Lambda handlers, and infrastructure: no change

## Constitution Compliance

- **General Requirements**: the mock server is a free local Docker service. Compliant
- **Infrastructure and Environments / Development**: the change replaces the deployed Cognito pool with a local mock server in the default setup; the constitution text changes to match. A real Cognito pool stays available through `.env`. Compliant after the update
- **Authentication & Authorization**: the rule says that all user authentication flows through AWS Cognito. In local development, the mock server replaces Cognito. This is a violation of the current text; the change updates the rule to name Cognito for deployed environments and the mock server for local development. Token checks, email extraction, and data isolation do not change
- **Vendor Independence / Authentication**: the frontend and the backend change identity provider through configuration only. The change proves this rule with a second provider. Compliant
- **Vendor Independence / Configuration**: the new JWKS URL comes from an environment variable. Compliant
- **Test Strategy**: the backend change gets co-located unit tests in `jwt-auth.test.ts`. Compliant
- **Code Quality Validation**: Prettier, typecheck, and tests run on the changed packages. Compliant
- **Backend Hexagonal Architecture**, **Schema-Driven Development**, **Result Pattern**: no change to the core, the schema, or service results. Not applicable
