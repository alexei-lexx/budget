# Design

## Context

`backend/docker-compose.yml` has 3 services: `dynamodb-local`, `dynamodb-admin`, and `phoenix`.
No service has a profile.
The scripts `db:start` (`docker compose up -d`) and `db:stop` (`docker compose down`) do not name services or profiles, so they act on all 3.
`db:setup`, `test:db:setup`, and `dev` call `db:start`.
The evals need DynamoDB Local and Phoenix. The other tests and the dev server need only DynamoDB Local.
The local Docker Compose version is v2.24.5.

## Goals / Non-Goals

**Goals:**

- Keep one Compose file
- Keep the `db:*` script names
- Make each container script name the group of services that it acts on

**Non-Goals:**

- Automatic start of Phoenix from the eval script
- A wait for Phoenix to become ready

## Decisions

### Compose profile for each service group

Each service gets a profile:

- `dynamodb-local` and `dynamodb-admin`: `profiles: [db]`
- `phoenix`: `profiles: [phoenix]`

Compose always includes the services without a profile.
When all services have a profile, `--profile <name>` selects only the services of that group.
The scripts do not name services, so a new service in a group, such as a database for Phoenix, needs no script change.
A command without a profile acts on no service.

Alternatives:

- Profile only for Phoenix, with the service name in the `phoenix:*` scripts: the `db:*` commands stay the same, but `db:stop` does not show which group it acts on, and each new Phoenix service needs a script change
- Profile only for Phoenix, with `--profile phoenix` and no service name: the command also acts on all services without a profile, so `phoenix:stop` also stops DynamoDB
- Separate Compose file for Phoenix: the scripts need `-f`, and a shared project name gives "orphan containers" warnings unless the scripts also set `-p`
- Service names in `db:start`: the list in `package.json` must follow each change of the Compose file

### Scripts for each profile

- `db:start`: `docker compose --profile db up -d`
- `db:stop`: `docker compose --profile db down`
- `phoenix:start`: `docker compose --profile phoenix up -d`
- `phoenix:stop`: `docker compose --profile phoenix down`

Both stop scripts use `down`, so each removes the containers of its profile.
The data stays in `backend/docker/` in all cases.

Alternative: `stop` for `phoenix:stop` keeps the container, so the next start is faster.
But the stopped container keeps the ID of the shared network.
`db:stop` then removes the network, and the next `phoenix:start` fails with `network ... not found`.

`test:phoenix-evals` does not call `phoenix:start`.
The developer starts Phoenix one time and then runs the evals many times.
The evals can also run without Phoenix with `PHOENIX_TEST_TRACKING=false`.

Alternative: `test:phoenix-evals` starts Phoenix first, like `dev` starts DynamoDB.
The user chose a pure test script.

## Risks / Trade-offs

- [Risk] `db:stop` or `phoenix:stop` while the other group runs cannot remove the shared project network; a check with Compose v2.24.5 shows that Compose prints `Resource is still in use` and exits with code 0 → The message is not an error
- [Risk] A new service without a profile is always on, so each profile command also acts on it → A comment in the Compose file tells that each service needs a profile
- [Risk] Phoenix needs about 30 seconds to start, so an eval run directly after `phoenix:start` can fail to send results → The developer waits until `http://localhost:6006` opens; the migration change documents this step
- [Trade-off] `docker compose up -d` without a profile starts no service → The npm scripts always name a profile
- [Trade-off] A developer can forget `phoenix:start` before the evals → The Phoenix reporter fails with a connection error that shows the cause

## Constitution Compliance

- **General Requirements**: Phoenix stays a local Docker service and costs nothing. Compliant
- **Infrastructure and Environments / Development**: `db:start` starts only DynamoDB Local and its admin UI. Compliant
- **Vendor Independence**: the `db` and `phoenix` profiles are plain Compose features; no new vendor. Compliant
- **Backend Hexagonal Architecture**, **Schema-Driven Development**, **Result Pattern**, **Test Strategy**: no change to code or tests. Not applicable
