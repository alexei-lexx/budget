# Tasks

## 1. Backend JWKS URL Setting

- [x] 1.1 In `backend/src/auth/jwt-auth.test.ts`, add a constructor test that passes `jwksUri` and expects `jwksClient` to get that URL; verify that the test fails with `npm run test:unit -- src/auth/jwt-auth.test.ts`
- [x] 1.2 In `backend/src/auth/jwt-auth.ts`, add the optional `jwksUri` constructor argument with `<issuer>/.well-known/jwks.json` as the default, and update the class comment; verify that all tests in `jwt-auth.test.ts` pass, including the existing default URL test
- [x] 1.3 In `backend/src/dependencies.ts`, pass `process.env["AUTH_JWKS_URI"] || undefined` as `jwksUri`; verify that `npm run typecheck` passes

## 2. Mock OIDC Server

- [x] 2.1 Create `backend/docker/oidc-mock/config.json` with interactive login and a token callback for issuer `oidc` that adds `email` (`${subject}`) and `client_id` (`${clientId}`) to each token; verify that the file is valid JSON
- [x] 2.2 In `backend/docker-compose.yml`, add service `oidc-mock` with `profiles: [auth]`, a pinned `ghcr.io/navikt/mock-oauth2-server` tag, port `127.0.0.1:8080:8080`, the config file mounted read-only, and `JSON_CONFIG_PATH`; verify that `docker compose --dry-run --profile auth up -d` starts only `oidc-mock`
- [x] 2.3 In `backend/package.json`, add `auth:start` (`docker compose --profile auth up -d`) and `auth:stop` (`docker compose --profile auth down`) in alphabetical order, and add a `predev` script that runs `npm run db:start`, `npm run auth:start`, and `npm run codegen` before `dev`; verify that `npm run auth:start` starts the container, that `http://localhost:8080/oidc/.well-known/openid-configuration` returns metadata with issuer `http://localhost:8080/oidc`, and that `npm run auth:stop` removes only `oidc-mock`
- [x] 2.4 In `backend/.env.example`, make the local auth values the default (`AUTH_CLAIM_NAMESPACE`, `AUTH_CLIENT_ID=budget-local`, `AUTH_ISSUER=http://localhost:5173/oidc`, `AUTH_JWKS_URI=http://localhost:8080/oidc/jwks`) and keep the Cognito and Auth0 blocks as comments; verify that `npm run dev` starts with a `.env` copied from it
- [x] 2.5 In `backend/README.md`, remove the deployed auth stack from the prerequisites, describe the mock server and the `auth:*` scripts, and remove `AUTH_CLIENT_ID` and `AUTH_ISSUER` from the values to edit; verify that the setup steps match the scripts
- [x] 2.6 In `docs/constitution.md`, change the Development section to list the mock OIDC server as a local service with a deployed Cognito pool as an option, and change the Authentication & Authorization rule to name Cognito for deployed environments and the mock server for local development; verify that the text follows the writing style rules in `CLAUDE.md`

## 3. Frontend Dev Proxy

- [x] 3.1 In `frontend/vite.config.ts`, add `server.strictPort: true` and a `server.proxy` that sends `/graphql` to `http://localhost:4000` and `/oidc` to `http://localhost:8080` without path rewrite and without `changeOrigin`; verify that `npm run typecheck` passes and that `http://localhost:5173/oidc/.well-known/openid-configuration` returns metadata with issuer `http://localhost:5173/oidc`
- [x] 3.2 In `frontend/.env.example`, set `VITE_AUTH_ISSUER=/oidc`, `VITE_AUTH_CLIENT_ID=budget-local`, and `VITE_AUTH_SCOPE=openid profile email`, comment out `VITE_GRAPHQL_ENDPOINT` as an optional override, keep `VITE_MCP_ENDPOINT`, and keep the Cognito and Auth0 blocks as comments without an active `VITE_AUTH_UI_URL`; verify that `npm run dev` starts with a `.env` copied from it
- [x] 3.3 In `frontend/README.md`, remove the deployed auth stack from the prerequisites and the Cognito values from the setup steps, and describe how to switch to the deployed Cognito pool; verify that the setup steps match the `.env.example` file

## 4. Local Sign-In Check

- [x] 4.1 Save the current `backend/.env` and `frontend/.env` to `tmp/`, then apply the auth values from the new `.env.example` files; verify that the saved copies exist
- [x] 4.2 Open `http://localhost:5173`, sign in with any email on the mock login page, and load the app; verify that a decoded access token has `iss=http://localhost:5173/oidc`, `client_id=budget-local`, and the typed `email`, and that GraphQL requests succeed and create the user
- [x] 4.3 Wait until the access token refreshes, or force a refresh; verify that GraphQL requests still succeed; if claims are missing after refresh, set a longer `tokenExpiry` in `config.json` and record the reason in a comment
- [x] 4.4 Sign out; verify that the app goes back to the sign-in state, and record in `frontend/README.md` any manual step that the mock server needs after sign-out
- [x] 4.5 Verify that the passkey link does not show
- [x] 4.6 Restore the saved `.env` files from `tmp/` if the developer wants to keep Cognito; verify that the app signs in through Cognito as before

## 5. Quality Checks

- [x] 5.1 Run `npm run format`, `npm run typecheck`, and `npm test` in `backend/`; verify that all pass
- [x] 5.2 Run `npm run format`, `npm run typecheck`, and `npm test` in `frontend/`; verify that all pass
- [x] 5.3 Run `npx prettier --write openspec/`; verify that it finishes without errors

## 6. Dev User List

- [x] 6.1 In `backend/docker/oidc-mock/config.json`, add the `email` claim only for `dev1@example.com` and `dev2@example.com`, and add a fallback mapping that adds only `client_id`; verify that the file is valid JSON
- [x] 6.2 In `backend/README.md` and `frontend/README.md`, list the dev users and describe how to add one; verify that the text matches `config.json`
- [x] 6.3 Sign in as `dev1@example.com`; verify that the app loads; sign in as an unlisted email and as an invalid email; verify that the backend rejects both with "Email claim missing in JWT token"
- [x] 6.4 Run `npm run format` in `backend/` and `frontend/`, and `npx prettier --write openspec/`; verify that all finish without errors

## 7. Seed Dev Users

- [x] 7.1 In `backend/src/scripts/seed-data.ts`, create the dev users of the mock OIDC server with `UserService.ensureUser` before the seed gets all users, and remove the stop when no users exist; verify that `npm run typecheck` passes
- [x] 7.2 In `backend/README.md`, change the `db:seed` description and setup step 7; verify that the text matches the script
- [x] 7.3 Run `npm run db:seed` two times; verify that the dev users exist once, and that all users get sample data

## Constitution Compliance

- **Test Strategy**: task 1.1 writes the backend test before the code change in task 1.2; the Compose, Vite, and env changes have no code to unit test, so tasks 2.3, 3.1, and group 4 verify them with commands and a browser check. Compliant
- **Vendor Independence / Configuration**: task 1.3 reads the JWKS URL from an environment variable. Compliant
- **Authentication & Authorization**: task 2.6 updates the rule to allow the mock server in local development; group 4 verifies that token checks and email extraction work as before. Compliant after the update
- **Infrastructure and Environments / Development**: task 2.6 updates the Development section. Compliant after the update
- **Code Quality Validation**: group 5 runs format, typecheck, and tests in both packages. Compliant
- **Backend Hexagonal Architecture**, **Schema-Driven Development**, **Result Pattern**: no change to the core, the schema, or service results. Not applicable
