# Git Worktrees

- Run the full development stack in several git worktrees at the same time
- Each worktree has its own ports and its own Docker containers
- The apps run on the host
- Docker runs only DynamoDB Local, the DynamoDB admin UI, and Phoenix

## Slots and Ports

- Worktrees use slots 1 to 9
- Slot `n` owns ports `41n0` to `41n9`
- The main checkout is slot 0 and uses default ports `4100` to `4109`

| Service        | Port             | Slot 0 (main) | Slot 1 | Slot 9 |
| -------------- | ---------------- | ------------- | ------ | ------ |
| Backend        | `41n0`           | `4100`        | `4110` | `4190` |
| Frontend       | `41n1`           | `4101`        | `4111` | `4191` |
| DynamoDB       | `41n2`           | `4102`        | `4112` | `4192` |
| DynamoDB admin | `41n3`           | `4103`        | `4113` | `4193` |
| Phoenix        | `41n4`           | `4104`        | `4114` | `4194` |
| Spare          | `41n5` to `41n9` |               |        |        |

## Scripts

Run the scripts from the main checkout or from a worktree.

### Add a Worktree

```bash
scripts/worktree-add.sh <branch>
```

The script:

1. Selects the lowest free slot
2. Creates the worktree in `.worktrees/<name>`
   - `<name>` is the branch name with `/` replaced by `-`
3. Copies the `.env` files of `backend/` and `frontend/` from the main checkout and sets the slot ports
4. Installs dependencies
5. Starts DynamoDB and creates the tables
6. Shows the slot, the ports, and the URLs

Then run `npm run dev` in `backend/` and `frontend/` of the worktree.
The new DynamoDB has no data.
The user record appears on the first login.

If the script fails after it creates the worktree, run `scripts/worktree-remove.sh <branch>` and try again.

### Remove a Worktree

```bash
scripts/worktree-remove.sh <branch>
```

The script:

1. Stops the Docker containers of the worktree
2. Removes the worktree folder
   - Git stops if the worktree has changes or untracked files
3. Keeps the branch

To delete the branch, run `git branch -d <branch>`.

## Manual Steps

### Cognito Callback URLs

Cognito accepts a login redirect only to a registered URL.
`infra-cdk/.env.example` lists the frontend ports of all slots in `AUTH_CALLBACK_URLS` and `AUTH_LOGOUT_URLS`.

1. Copy the two values to `infra-cdk/.env`
2. Run `npm run deploy:auth:dev` in `infra-cdk/`
