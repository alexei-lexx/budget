# Proposal

## Why

`npm run db:start` runs `docker compose up -d` and starts all services in `backend/docker-compose.yml`.
Since the Phoenix proof of concept, this includes Phoenix, which only the evals need.
So `db:start`, `db:setup`, `test:db:setup`, and `dev` start Phoenix each time, and the script name `db:start` is not correct.

## What Changes

- Each service in `backend/docker-compose.yml` gets a Compose profile: `db` for `dynamodb-local` and `dynamodb-admin`, `phoenix` for `phoenix`
- Each container script names its profile, so the `db:*` scripts act only on the DynamoDB containers and the `phoenix:*` scripts act only on Phoenix
- `db:start` runs `docker compose --profile db up -d`, and `db:stop` runs `docker compose --profile db down`
- New npm script `phoenix:start` starts Phoenix
- New npm script `phoenix:stop` stops and removes the Phoenix container
- `db:setup`, `test:db:setup`, and `dev` do not change
- `test:phoenix-evals` does not start Phoenix; the developer runs `phoenix:start` before the evals

### Non-Goals

- No migration of the LangSmith evals to Phoenix; a separate change does this
- No rename of `test:phoenix-evals` or of the eval files; the separate change does this
- No rename of the `db:*` scripts
- No change to production, staging, or development tracing

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The change affects only the local developer tooling, so the change sets `skip_specs: true`.

## Impact

- `backend/docker-compose.yml`: `profiles: [db]` for `dynamodb-local` and `dynamodb-admin`, `profiles: [phoenix]` for `phoenix`
- `backend/package.json`: new commands for `db:start` and `db:stop`; new scripts `phoenix:start` and `phoenix:stop`
- Production code, tests, Lambda handlers, and infrastructure: no change

## Constitution Compliance

- **General Requirements**: Phoenix stays a local Docker service and costs nothing. Compliant
- **Infrastructure and Environments / Development**: the local services for development and tests stay DynamoDB Local and its admin UI; Phoenix starts only on request. Compliant
- **Vendor Independence**: no new vendor; Phoenix stays optional through `PHOENIX_TEST_TRACKING`. Compliant
- **Code Quality Validation**: Prettier checks the changed files. Compliant
- **Backend Hexagonal Architecture**, **Schema-Driven Development**, **Result Pattern**, **Test Strategy**: no change to code or tests. Not applicable
