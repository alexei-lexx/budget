# Proposal

## Why

Only one copy of the app can run on a machine at a time.
The backend, the frontend, DynamoDB Local, the DynamoDB admin UI, and Phoenix use fixed ports.
All git worktrees use the same Docker Compose project name (`backend`).
Thus `npm run dev` in a second worktree replaces the DynamoDB container of the first worktree.
Parallel work on several branches, by a person or by coding agents, is not possible.

## What Changes

- Add a port scheme with one block of 10 ports for each slot
  - Slot `n` uses ports `41n0` to `41n9`
  - Backend `41n0`, frontend `41n1`, DynamoDB `41n2`, DynamoDB admin `41n3`, Phoenix `41n4`, and 5 spare ports
  - The main checkout is slot 0 (`4100` to `4104`)
  - Worktrees use slots 1 to 9
- **BREAKING** (local development only): change the default ports of the main checkout
  - Backend `4000` → `4100`
  - Frontend `5173` → `4101`
  - DynamoDB `8000` → `4102`
  - DynamoDB admin `8001` → `4103`
  - Phoenix `6006` → `4104`
- Read the backend port from `BACKEND_PORT`
- Read the frontend dev server port from `FRONTEND_PORT`, with a strict port
- Read the DynamoDB, DynamoDB admin, and Phoenix host ports from `DYNAMODB_PORT`, `DYNAMODB_ADMIN_PORT`, and `PHOENIX_PORT` in Docker Compose
- Let each worktree set its own Docker Compose project name with `COMPOSE_PROJECT_NAME`
- Add `scripts/worktree-add.sh <branch>`
  - Create the worktree in `.worktrees/<name>`
  - Select the lowest free slot
  - Write the slot to `.worktree-slot` in the worktree
  - Copy and adjust the `.env` files
  - Install the dependencies
  - Start DynamoDB and create the dev and test tables
- Add `scripts/worktree-remove.sh <branch>`
  - Stop the Docker containers of the worktree
  - Remove the worktree and keep the branch
- Move the worktree location from `../worktrees/<name>` to `.worktrees/<name>` and add it to `.gitignore`
- Add `docs/worktrees.md` and link it from the agent instruction files
- List the frontend ports of all slots in the Cognito callback and logout URLs of `infra-cdk/.env.example`
- Remove `db:setup` and `test:db:setup`, because their `sleep 1` is too short for a new DynamoDB container
- Update the example `.env` files, the CI workflow, and the README files to the new ports
- Delete `frontend/apollo.config.js`, because no tool uses it

## Capabilities

### New Capabilities

None. The change affects only local development tooling.

### Modified Capabilities

None. The change does not change the behavior of the app.
The change sets `skip_specs: true`.

## Impact

- **Backend**: `src/dev.ts`, `docker-compose.yml`, `package.json`, `.env.example`, `.env.test.example`, `README.md`
- **Frontend**: `vite.config.ts`, `apollo.config.js` (deleted), `.env.example`, `README.md`
- **Infra CDK**: `.env.example`
- **CI**: `.github/workflows/ci.yml` (DynamoDB service port)
- **Repository root**: `scripts/`, `.gitignore`, `docs/worktrees.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.github/copilot-instructions.md`
- **Local machine of each developer** (manual steps)
  - The local `.env` files must use the new ports
  - The Cognito user pool for development must allow the new frontend ports
  - MCP clients must use the new backend port
  - The DynamoDB container must restart on the new port
- **Production**: no impact

## Constitution Compliance

- **Vendor Independence (Configuration)**: complies. All new settings are environment variables
- **Development environment**: complies. The local services stay the same. Only their ports change
- **Authentication & Authorization**: complies. The Cognito user pool for development gets more `localhost` callback URLs
- **Code Quality Validation**: applies to the changed TypeScript files
- **Test Strategy**: no backend business logic changes. The change adds no tests
- No violations
