# Design

## Context

See `proposal.md` - Why.

Current state:

- `backend/src/dev.ts` listens on the fixed port `4000`
- The Vite dev server uses its default port `5173`
  - When the port is busy, Vite selects the next free port without a warning
- `backend/docker-compose.yml` maps the fixed host ports `8000`, `8001`, and `6006`
- Docker Compose takes the project name from the folder name, which is `backend` in every worktree
- Each worktree has its own DynamoDB data folder, because `./docker/dynamodb` is a relative path
- The `.env` files are not in git, so a new worktree does not have them
- The frontend reads the backend URLs from `VITE_GRAPHQL_ENDPOINT` and `VITE_MCP_ENDPOINT`
- Cognito accepts a login redirect only to a registered callback URL
- CI starts DynamoDB Local as a service container on port `8000`
  - CI copies `backend/.env.test.example` to `backend/.env.test`

Constraints:

- Tests, the IDE, and coding agents run on the host
  - The apps must run on the host, not in containers
- Cognito callback URLs must be known before use
  - Each frontend port must be fixed and predictable

## Goals / Non-Goals

**Goals:**

- Run the full development stack in up to 9 worktrees and the main checkout at the same time
- Give each worktree its own DynamoDB data
- Create a ready-to-run worktree with one command
- Remove a worktree and its containers with one command

**Non-Goals:**

- Seed data in a new worktree
  - The user record appears on the first login
- Run the apps in containers or devcontainers
- Share one DynamoDB between worktrees
- Update the local `.env` files, the Cognito user pool, or MCP client settings of a developer
  - These are manual steps
- Support Windows without WSL or macOS-specific tools

## Decisions

### Port blocks per slot

Slot `n` owns ports `41n0` to `41n9`:

| Service        | Port             | Slot 0 (main) | Slot 1 |
| -------------- | ---------------- | ------------- | ------ |
| Backend        | `41n0`           | `4100`        | `4110` |
| Frontend       | `41n1`           | `4101`        | `4111` |
| DynamoDB       | `41n2`           | `4102`        | `4112` |
| DynamoDB admin | `41n3`           | `4103`        | `4113` |
| Phoenix        | `41n4`           | `4104`        | `4114` |
| Spare          | `41n5` to `41n9` |               |        |

- The main checkout is slot 0
  - One scheme applies everywhere
- The range `4100` to `4199` is outside the default ports of common development tools
  - It is below the Linux ephemeral port range (`32768` and higher)
- Each slot has spare ports for new services

Alternatives:

- **Offset per service** (`4000+n`, `5173+n`, `8000+10n`)
  - Rejected: ports of one worktree are not grouped
  - Rejected: `5174` and `5175` can collide with other Vite projects
- **Blocks for worktrees only, defaults for the main checkout**
  - Rejected: two schemes
- **Free port at runtime**
  - Rejected: Cognito needs known callback URLs
- **Port from a hash of the branch name**
  - Rejected: ports are not predictable, and collisions are possible

### Port variables

| Variable              | Read by                   | Default | File            |
| --------------------- | ------------------------- | ------- | --------------- |
| `BACKEND_PORT`        | `backend/src/dev.ts`      | `4100`  | `backend/.env`  |
| `FRONTEND_PORT`       | `frontend/vite.config.ts` | `4101`  | `frontend/.env` |
| `DYNAMODB_PORT`       | Docker Compose            | `4102`  | `backend/.env`  |
| `DYNAMODB_ADMIN_PORT` | Docker Compose            | `4103`  | `backend/.env`  |
| `PHOENIX_PORT`        | Docker Compose            | `4104`  | `backend/.env`  |

- Each default is the slot 0 port
  - The main checkout works without port variables in its `.env` files
- The names have a service prefix
  - A `PORT` variable in the shell cannot override them
- `FRONTEND_PORT` has no `VITE_` prefix
  - Vite does not put it into the browser bundle
- Docker Compose reads `backend/.env` for variable substitution
  - The port variables and `COMPOSE_PROJECT_NAME` go into `backend/.env`
  - dotenvx also loads them into the backend process, which does not use them

Alternatives:

- **`PORT`**: rejected, because a shell variable with the same name can override it
- **`VITE_PORT`**: rejected, because Vite puts it into the browser bundle

### Frontend port in `vite.config.ts`

- Use the function form of `defineConfig`
- Call `loadEnv(mode, process.cwd(), "FRONTEND_")`
  - Vite does not load `.env` values into the config by itself
  - The prefix loads only `FRONTEND_*` variables
- Set `server.port` from `FRONTEND_PORT`
- Set `server.strictPort` to `true`
  - Vite stops with an error if the port is busy
  - Without it, Vite selects a port that Cognito does not accept

Alternatives:

- **`--port` flag in a script**: rejected, because a plain `npm run dev` would use the wrong port

### Backend URLs in the frontend

- Keep `VITE_GRAPHQL_ENDPOINT` and `VITE_MCP_ENDPOINT`
- The setup script sets them to the backend port of the slot

Alternatives:

- **Vite dev proxy**: rejected
  - The proxy also needs the backend port, so it does not remove configuration
  - The proxy needs a code change

### One DynamoDB for each worktree

- Each worktree sets `COMPOSE_PROJECT_NAME=budget-<name>` in `backend/.env`
  - Docker Compose creates separate containers for each worktree
  - The main checkout has no `COMPOSE_PROJECT_NAME`, so it keeps the project name `backend` and its containers
- The port variables give each worktree its own host ports
- `npm run dev` keeps its `predev` script (`db:start`)
  - It starts the DynamoDB of the worktree and does not touch other worktrees
- The `_test_` table names stay the same, because each worktree has its own database

Alternatives:

- **One shared DynamoDB with a table prefix for each worktree**
  - Rejected: `predev` in a worktree would replace the shared container
- **Docker Compose for all services**
  - Rejected: tests, the IDE, and coding agents need the apps and their dependencies on the host
- **Devcontainers**
  - Rejected: forwarded host ports, Cognito URLs, and backend URLs still differ for each worktree
  - Rejected: git worktrees need extra mounts in a container

### URL variables

The URL variables contain the port, but the code does not build them from the port variables.
The setup script writes the port and the matching URLs together.

| File                | Variable                | Value                           |
| ------------------- | ----------------------- | ------------------------------- |
| `backend/.env`      | `DYNAMODB_ENDPOINT`     | `http://localhost:41n2`         |
| `backend/.env`      | `API_BASE_URL`          | `http://localhost:41n0`         |
| `backend/.env.test` | `DYNAMODB_ENDPOINT`     | `http://localhost:41n2`         |
| `backend/.env.test` | `API_BASE_URL`          | `http://localhost:41n0`         |
| `backend/.env.test` | `PHOENIX_ENDPOINT`      | `http://localhost:41n4`         |
| `frontend/.env`     | `VITE_GRAPHQL_ENDPOINT` | `http://localhost:41n0/graphql` |
| `frontend/.env`     | `VITE_MCP_ENDPOINT`     | `http://localhost:41n0/mcp`     |

- Only the Telegram bot service reads `API_BASE_URL`
  - The tests do not send requests to it
  - The script sets it in `.env.test` for consistency

### Worktree location

- Create worktrees in `.worktrees/<name>` inside the repository
- Add `.worktrees/` to `.gitignore`
- `<name>` is the branch name with `/` replaced by `-`
  - For example, `feat/x` becomes `.worktrees/feat-x`
- The Compose project name is `budget-<name>`, in lowercase, with characters other than `a-z`, `0-9`, `_`, and `-` replaced by `-`

Reasons:

- Coding agents can access files inside the project without permission prompts
- Tools that obey `.gitignore` (`rg`, VS Code search, git) skip the worktrees
- The package tools (ESLint, Vitest, tsc, Vite) run inside `backend/` or `frontend/`, so they do not see `.worktrees/`

Alternatives:

- **`../worktrees/<name>`** (current rule): rejected, because files outside the project need permission prompts

### Slot allocation

- `scripts/worktree-add.sh` selects the lowest free slot from 1 to 9
- The script writes the slot to `WORKTREE_SLOT` in the `backend/.env` of the worktree
- The used slots are the `WORKTREE_SLOT` values in `.worktrees/*/backend/.env`
  - Removing a worktree removes its folder, so its slot becomes free
  - No separate registry is necessary
- The script checks that ports `41n0` to `41n4` are free before it uses slot `n`
  - A busy port makes the script stop with an error
- The script stops with an error when all slots are used

Alternatives:

- **Slot as an argument**: rejected by the user, to keep one simple path

### `scripts/worktree-add.sh <branch>`

Steps:

1. Find the main checkout from `git rev-parse --git-common-dir`
   - The script works from the main checkout and from a worktree
2. Calculate `<name>` and stop if `.worktrees/<name>` exists
3. Select the slot and check its ports
4. Create the worktree
   - Existing local or remote branch: `git worktree add <path> <branch>`
   - New branch: `git worktree add -b <branch> <path> main`
5. Copy `backend/.env`, `backend/.env.test`, and `frontend/.env` from the main checkout
   - Stop if a file is missing
6. Set the slot values in the copied files
   - Replace the line of a variable if it exists
   - Add the line if it does not exist
7. Run `npm ci` in `backend/` and `frontend/`
8. Run `npm run db:start` in `backend/`, wait until DynamoDB answers on port `41n2`, and run `npm run db:create` and `npm run test:db:create`
   - A new DynamoDB container needs a few seconds to start
   - The script stops with an error after 30 seconds
9. Show the slot, the ports, and the URLs

- The script uses Bash with `set -euo pipefail`
- The script does not need a root `package.json`

### `scripts/worktree-remove.sh <branch>`

Steps:

1. Calculate `<name>` and stop if `.worktrees/<name>` does not exist
2. Run `docker compose --profile db --profile phoenix down` in `backend/` of the worktree
   - Docker Compose reads `COMPOSE_PROJECT_NAME` from the `.env` of the worktree
3. Run `git worktree remove <path>` without `--force`
   - Git stops if the worktree has changes or untracked files
   - Ignored files, such as `node_modules`, `.env`, and DynamoDB data, are removed
4. Keep the branch

### Remove `db:setup` and `test:db:setup`

- `db:setup` and `test:db:setup` run `db:start`, `sleep 1`, and the table creation
  - A new DynamoDB container needs more than 1 second, so the table creation fails
- Remove both scripts from `backend/package.json`
- The documentation lists `npm run db:start` and the table creation as two steps
- Only `scripts/worktree-add.sh` waits for DynamoDB

Alternatives:

- **Wait in the npm scripts**: rejected, to keep the scripts simple
- **Retry in `create-tables.ts`**: rejected, to keep the change small

### Cognito callback URLs

- `infra-cdk/.env.example` lists `http://localhost:4101` and the frontend ports of slots 1 to 9 (`4111` to `4191`)
- The CDK app splits `AUTH_CALLBACK_URLS` and `AUTH_LOGOUT_URLS` at commas
- The developer updates the real `infra-cdk/.env` and deploys the auth stack

### CI

- Map the DynamoDB service container to host port `4102`
- Wait for DynamoDB on port `4102`
- `.env.test.example` already has the new `DYNAMODB_ENDPOINT`, so the copy step stays the same

## Risks / Trade-offs

- [Docker Compose parses `backend/.env` differently from dotenvx, for example inline comments or quotes] → Run `docker compose config` with the real `backend/.env` during the check, and fix the example file if necessary
- [All developers must update their local setup after the port change] → List the manual steps in `docs/worktrees.md` and in the tasks
- [`git worktree remove` stops on files that it cannot delete, such as DynamoDB data owned by a different user] → The DynamoDB Local image runs as user ID 1000, which is the user ID of the host user here. A failure shows the path, and the user removes it manually
- [A worktree folder removed without the script leaves its containers] → `docs/worktrees.md` shows `docker compose -p budget-<name> down`
- [Two `worktree-add.sh` runs at the same time select the same slot] → Accepted. The port check catches most cases, and one user runs the script
- [Port numbers in the URL variables and the port variables can differ after manual edits] → The script writes both. `docs/worktrees.md` explains the relation
- [Each worktree has its own `node_modules`] → Accepted. The disk use is the cost of isolation

## Migration Plan

Code changes:

1. Change the defaults in code, Docker Compose, example files, CI, and documentation
2. Add the scripts, `.gitignore` entry, and `docs/worktrees.md`
3. Update the agent instruction files

Manual steps for each developer:

1. Update `backend/.env`, `backend/.env.test`, and `frontend/.env` to the new URLs
2. Update `AUTH_CALLBACK_URLS` and `AUTH_LOGOUT_URLS` in `infra-cdk/.env` and deploy the auth stack
3. Update the URLs of MCP clients to `http://localhost:4100/mcp`
4. Run `npm run db:stop` and `npm run db:start` in `backend/`
   - The DynamoDB container restarts on the new port
   - The data stays, because the project name and the data folder do not change

Rollback:

- Revert the commit and restore the old URLs in the local `.env` files

## Constitution Compliance

- **Vendor Independence (Configuration)**: complies. All new settings are environment variables
- **Development environment**: complies. The local services stay the same: Vite, Express, DynamoDB Local, and the `.env` file
- **Authentication & Authorization**: complies. The Cognito user pool keeps `localhost` callback URLs, with new ports
- **Code Quality Validation**: applies to `backend/src/dev.ts` and `frontend/vite.config.ts`
- **Test Strategy**: the change has no backend business logic. The scripts and the dev entry points have no tests, and a manual check verifies them
- No violations
