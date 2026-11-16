# Tasks

Tasks marked **(manual)** change local files that are not in git.
The user does these tasks.
The agent does all other tasks, including all checks.

## 1. Port Variables in Code

- [x] 1.1 In `backend/src/dev.ts`, read the port from `BACKEND_PORT` with the default `4100`, and verify `npm run typecheck` and `npm run lint` pass in `backend/`
- [x] 1.2 In `frontend/vite.config.ts`, use the function form of `defineConfig`, load `FRONTEND_*` variables with `loadEnv`, set `server.port` from `FRONTEND_PORT` with the default `4101`, and set `server.strictPort` to `true`; verify `npm run typecheck` and `npm run lint` pass in `frontend/`
- [x] 1.3 In `backend/docker-compose.yml`, map the host ports from `DYNAMODB_PORT` (default `4102`), `DYNAMODB_ADMIN_PORT` (default `4103`), and `PHOENIX_PORT` (default `4104`); verify `docker compose --profile db --profile phoenix config` shows the default ports
- [x] 1.4 Run `npm run format` in `backend/` and `frontend/` and verify no files other than the changed files change

## 2. Defaults in Examples, Tooling, CI, and READMEs

- [x] 2.1 In `backend/.env.example`, set `DYNAMODB_ENDPOINT` to `http://localhost:4102` and `API_BASE_URL` to `http://localhost:4100`, and add commented-out `BACKEND_PORT`, `DYNAMODB_PORT`, `DYNAMODB_ADMIN_PORT`, `PHOENIX_PORT`, and `COMPOSE_PROJECT_NAME` with a short comment; verify with `git diff`
- [x] 2.2 In `backend/.env.test.example`, set `DYNAMODB_ENDPOINT` to `http://localhost:4102`, `API_BASE_URL` to `http://localhost:4100`, and `PHOENIX_ENDPOINT` to `http://localhost:4104`; verify with `git diff`
- [x] 2.3 In `frontend/.env.example`, set `VITE_GRAPHQL_ENDPOINT` and `VITE_MCP_ENDPOINT` to port `4100`, and add a commented-out `FRONTEND_PORT` with a short comment; verify with `git diff`
- [x] 2.4 In `infra-cdk/.env.example`, set `AUTH_CALLBACK_URLS` and `AUTH_LOGOUT_URLS` to `http://localhost:4101` and `http://localhost:4111` to `http://localhost:4191`, separated by commas; verify with `git diff`
- [x] 2.5 In `frontend/apollo.config.js`, change the URL to `http://localhost:4100/graphql`; verify with `git diff`
- [x] 2.6 In `.github/workflows/ci.yml`, map the DynamoDB service to host port `4102` and wait for DynamoDB on port `4102`; verify with `git diff`
- [x] 2.7 In `backend/README.md` and `frontend/README.md`, change the old ports to the new ports; verify `git grep -nE "localhost:(4000|5173|8000|8001|6006)" -- ':!openspec/changes/archive'` shows no result
- [x] 2.8 Remove `db:setup` and `test:db:setup` from `backend/package.json`; in `backend/README.md` and the Cloud Agent Setup of `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and `.github/copilot-instructions.md`, replace them with `npm run db:start` and the table creation script; verify `git grep -n "db:setup" -- ':!openspec'` shows no result

## 3. Local Setup of the Main Checkout (manual)

- [x] 3.1 **(manual)** In `backend/.env`, set `DYNAMODB_ENDPOINT` to `http://localhost:4102` and `API_BASE_URL` to `http://localhost:4100`
- [x] 3.2 **(manual)** In `backend/.env.test`, set `DYNAMODB_ENDPOINT` to `http://localhost:4102`, `API_BASE_URL` to `http://localhost:4100`, and `PHOENIX_ENDPOINT` to `http://localhost:4104`
- [x] 3.3 **(manual)** In `frontend/.env`, set `VITE_GRAPHQL_ENDPOINT` to `http://localhost:4100/graphql` and `VITE_MCP_ENDPOINT` to `http://localhost:4100/mcp`
- [x] 3.4 **(manual)** In `infra-cdk/.env`, set `AUTH_CALLBACK_URLS` and `AUTH_LOGOUT_URLS` as in `infra-cdk/.env.example`, and deploy the auth stack
- [x] 3.5 **(manual)** Change the URL of MCP clients, such as `cash-dev` in `~/.claude.json`, to `http://localhost:4100/mcp?token=...`
- [x] 3.6 **(manual)** Stop the running backend and frontend dev servers

## 4. Check the Main Checkout

- [x] 4.1 Run `npm run db:stop` and `npm run db:start` in `backend/`, and verify DynamoDB answers on port `4102`, the admin UI on port `4103`, and the existing tables are still there
- [x] 4.2 Verify `docker compose config` in `backend/` parses the real `backend/.env` without errors
- [x] 4.3 Run `npm test` in `backend/` and verify all tests pass
- [x] 4.4 Run `npm run dev` in `backend/` and `frontend/`, and verify the backend answers on port `4100` and the frontend on port `4101`
- [x] 4.5 Verify that the frontend stops with an error when port `4101` is busy

## 5. Worktree Scripts

- [x] 5.1 Add `.worktrees/` to `.gitignore`, and verify `git check-ignore .worktrees/example` matches
- [x] 5.2 Add `scripts/worktree-add.sh <branch>` as in design.md (main checkout lookup, name, lowest free slot, port check, worktree creation for an existing or new branch, `.env` copy and update, `npm ci`, `db:start`, wait for DynamoDB, `db:create`, `test:db:create`, summary); make it executable, and verify `bash -n` passes and the script prints usage without arguments
- [x] 5.3 Add `scripts/worktree-remove.sh <branch>` as in design.md (stop the containers of all profiles, `git worktree remove` without `--force`, keep the branch); make it executable, and verify `bash -n` passes and the script prints usage without arguments

## 6. Documentation

- [x] 6.1 Add `docs/worktrees.md` with the port table, the variables, the scripts, the manual Cognito step, the manual cleanup with `docker compose -p budget-<name> down`, and the manual steps for existing setups; verify each documented command matches the scripts
- [x] 6.2 Replace the Git Worktrees section in `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and `.github/copilot-instructions.md` with the `.worktrees/<name>` location, the two scripts, and a link to `docs/worktrees.md`; verify the four sections are identical with `diff`
- [x] 6.3 Run `npx prettier --check` on the changed Markdown files and verify it passes

## 7. Integration Check

- [x] 7.1 Run `scripts/worktree-add.sh` with a new test branch, and verify the worktree is in `.worktrees/`, it gets slot 1, its `.env` files have ports `4110` to `4114`, and its DynamoDB runs on port `4112` with the dev and test tables
- [x] 7.2 In the slot 1 worktree, run `npm test` in `backend/`, and verify all tests pass while the main checkout's DynamoDB also runs
- [x] 7.3 In the slot 1 worktree, run `npm run dev` in `backend/` and `frontend/`, and verify the backend answers on port `4110`, the frontend on port `4111`, and the main checkout still answers on ports `4100` and `4101`
- [x] 7.4 Run `scripts/worktree-add.sh` with a second test branch, and verify it gets slot 2
- [x] 7.5 Run `scripts/worktree-remove.sh` for the slot 1 branch, and verify the folder and its containers are gone, the branch still exists, and the main checkout's DynamoDB still runs
- [x] 7.6 Run `scripts/worktree-add.sh` with a third test branch, and verify it reuses slot 1
- [x] 7.7 Remove the remaining test worktrees with `scripts/worktree-remove.sh`, delete the test branches, and verify `git worktree list` shows only the main checkout

## 8. Parallel Full App Check

- [x] 8.1 Run `scripts/worktree-add.sh` with a new test branch, and note its slot `n`
- [x] 8.2 Run `npm run dev` in `backend/` and `frontend/` of the main checkout (slot 0) and of the slot `n` worktree at the same time, and verify all four servers run
- [x] 8.3 With `playwright-cli`, open `http://localhost:4101` and `http://localhost:41n1` in two sessions at the same time, log in to both with the dev credentials from `pass`, and verify each app sends GraphQL requests only to its own backend (`4100` and `41n0`)
- [x] 8.4 In both apps, create a budget account (`worktree-check-0` in slot 0, `worktree-check-n` in slot `n`), and verify each app shows only its own account
- [x] 8.5 While all four dev servers run, run `npm test` in `backend/` of slot 0 and slot `n` at the same time, then `npm test` in `frontend/` of both, and verify all tests pass and both apps still show their own `worktree-check-*` account
- [x] 8.6 Clean up: delete the `worktree-check-0` account in the slot 0 app, stop the slot `n` dev servers, remove the worktree with `scripts/worktree-remove.sh`, and delete the test branch

## Constitution Compliance

- **Vendor Independence (Configuration)**: complies. All new settings are environment variables
- **Development environment**: complies. The local services stay the same
- **Test Strategy**: the change has no backend business logic, so the tasks add no automated tests. Groups 4, 7, and 8 check the behavior with real commands
- **Code Quality Validation**: tasks 1.1, 1.2, 1.4, and 4.3 run typecheck, lint, format, and the test suite
- No violations
