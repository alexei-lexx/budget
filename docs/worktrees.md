# Git Worktrees

Run the full development stack in several git worktrees at the same time.
Each worktree has its own ports, its own Docker containers, and its own DynamoDB data.
The apps run on the host.
Docker runs only DynamoDB Local, the DynamoDB admin UI, and Phoenix.

## Slots and Ports

Each worktree uses one slot.
Slot `n` owns ports `41n0` to `41n9`.

| Service        | Port             | Slot 0 (main) | Slot 1 | Slot 9 |
| -------------- | ---------------- | ------------- | ------ | ------ |
| Backend        | `41n0`           | `4100`        | `4110` | `4190` |
| Frontend       | `41n1`           | `4101`        | `4111` | `4191` |
| DynamoDB       | `41n2`           | `4102`        | `4112` | `4192` |
| DynamoDB admin | `41n3`           | `4103`        | `4113` | `4193` |
| Phoenix        | `41n4`           | `4104`        | `4114` | `4194` |
| Spare          | `41n5` to `41n9` |               |        |        |

- The main checkout is slot 0
- Worktrees use slots 1 to 9
- `scripts/worktree-add.sh` selects the lowest free slot

## Variables

The main checkout needs no port variables.
The default of each port variable is the slot 0 port.

| File                | Variable                | Value in slot `n`               |
| ------------------- | ----------------------- | ------------------------------- |
| `backend/.env`      | `WORKTREE_SLOT`         | `n`                             |
| `backend/.env`      | `COMPOSE_PROJECT_NAME`  | `budget-<name>`                 |
| `backend/.env`      | `BACKEND_PORT`          | `41n0`                          |
| `backend/.env`      | `DYNAMODB_PORT`         | `41n2`                          |
| `backend/.env`      | `DYNAMODB_ADMIN_PORT`   | `41n3`                          |
| `backend/.env`      | `PHOENIX_PORT`          | `41n4`                          |
| `backend/.env`      | `DYNAMODB_ENDPOINT`     | `http://localhost:41n2`         |
| `backend/.env`      | `API_BASE_URL`          | `http://localhost:41n0`         |
| `backend/.env.test` | `DYNAMODB_ENDPOINT`     | `http://localhost:41n2`         |
| `backend/.env.test` | `API_BASE_URL`          | `http://localhost:41n0`         |
| `backend/.env.test` | `PHOENIX_ENDPOINT`      | `http://localhost:41n4`         |
| `frontend/.env`     | `FRONTEND_PORT`         | `41n1`                          |
| `frontend/.env`     | `VITE_GRAPHQL_ENDPOINT` | `http://localhost:41n0/graphql` |
| `frontend/.env`     | `VITE_MCP_ENDPOINT`     | `http://localhost:41n0/mcp`     |

- Docker Compose reads the port variables and `COMPOSE_PROJECT_NAME` from `backend/.env`
- `COMPOSE_PROJECT_NAME` gives each worktree its own containers
  - Without it, Docker Compose uses the folder name `backend`, which is the same in all worktrees
- The code does not build the URL variables from the port variables
  - After a manual change of a port, also change the URLs with the same port
- The frontend dev server stops with an error when its port is busy
  - Cognito accepts only the registered frontend ports

## Scripts

Run the scripts from the main checkout or from a worktree.
`<name>` is the branch name with `/` replaced by `-`.
For example, `feat/x` becomes `.worktrees/feat-x` with the Compose project `budget-feat-x`.

### Add a Worktree

```
scripts/worktree-add.sh <branch>
```

The script:

1. Selects the lowest free slot and stops if one of its ports is busy
2. Creates the worktree in `.worktrees/<name>`
   - For an existing local or remote branch, it uses that branch
   - For a new branch, it creates the branch from `main`
3. Copies `backend/.env`, `backend/.env.test`, and `frontend/.env` from the main checkout and sets the slot values
4. Runs `npm ci` in `backend/` and `frontend/`
5. Starts DynamoDB and creates the dev and test tables
6. Shows the slot, the ports, and the URLs

Then run `npm run dev` in `backend/` and `frontend/` of the worktree.
The new DynamoDB has no data.
The user record appears on the first login.

### Remove a Worktree

```
scripts/worktree-remove.sh <branch>
```

The script:

1. Stops the Docker containers of the worktree
2. Removes the worktree folder, including `node_modules`, the `.env` files, and the DynamoDB data
   - Git stops if the worktree has changes or untracked files
3. Keeps the branch

Delete the branch with `git branch -d <branch>` if necessary.

## Manual Steps

### Cognito Callback URLs

Cognito accepts a login redirect only to a registered URL.
`infra-cdk/.env.example` lists the frontend ports of all slots in `AUTH_CALLBACK_URLS` and `AUTH_LOGOUT_URLS`.

1. Copy the two values to `infra-cdk/.env`
2. Deploy the auth stack

### Containers of a Removed Worktree

A worktree folder that was removed without the script leaves its containers.
Stop them from any folder:

```
docker compose -p budget-<name> down
```

### Existing Setups

The default ports changed from `4000`, `5173`, `8000`, `8001`, and `6006` to `4100` to `4104`.
Update an existing main checkout:

1. In `backend/.env`, set `DYNAMODB_ENDPOINT` to `http://localhost:4102` and `API_BASE_URL` to `http://localhost:4100`
2. In `backend/.env.test`, set `DYNAMODB_ENDPOINT` to `http://localhost:4102`, `API_BASE_URL` to `http://localhost:4100`, and `PHOENIX_ENDPOINT` to `http://localhost:4104`
3. In `frontend/.env`, set `VITE_GRAPHQL_ENDPOINT` to `http://localhost:4100/graphql` and `VITE_MCP_ENDPOINT` to `http://localhost:4100/mcp`
4. Update the Cognito callback URLs (see above)
5. Change the URL of MCP clients to `http://localhost:4100/mcp?token=...`
6. Run `npm run db:stop` and `npm run db:start` in `backend/`
   - DynamoDB restarts on the new port and keeps its data
