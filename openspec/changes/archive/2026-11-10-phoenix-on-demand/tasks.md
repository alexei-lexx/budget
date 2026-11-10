# Tasks

## 1. Compose Profiles and Scripts

- [x] 1.1 In `backend/docker-compose.yml`, add `profiles: [db]` to `dynamodb-local` and `dynamodb-admin`, add `profiles: [phoenix]` to `phoenix`, and add a comment that each service needs a profile; verify that `docker compose --dry-run up -d` starts no service and that `docker compose --dry-run --profile db up -d` starts only `dynamodb-local` and `dynamodb-admin`
- [x] 1.2 In `backend/package.json`, change `db:start` to `docker compose --profile db up -d` and `db:stop` to `docker compose --profile db down`; verify that `npm run db:stop && npm run db:start` removes and starts only `dynamodb-local` and `dynamodb-admin`, and that `npm run test:db:setup` finishes without errors
- [x] 1.3 In `backend/package.json`, add `phoenix:start` (`docker compose --profile phoenix up -d`) and `phoenix:stop` (`docker compose --profile phoenix down`) in alphabetical order; verify that `npm run phoenix:start` with DynamoDB stopped starts only `phoenix` and that `http://localhost:6006` opens, and that `npm run phoenix:stop` with DynamoDB running removes only `phoenix`
- [x] 1.4 With DynamoDB and Phoenix running, run `npm run db:stop`; verify that `phoenix` keeps running, that Compose prints `Network backend_default Resource is still in use`, and that the exit code is 0
- [x] 1.5 Run `npm run phoenix:stop`, `npm run db:stop`, and `npm run phoenix:start`; verify that `phoenix` starts
- [x] 1.6 Run `npm run prettier` in `backend/`; verify that it finishes without errors

## Constitution Compliance

- **General Requirements**: Phoenix stays a local Docker service and costs nothing. Compliant
- **Infrastructure and Environments / Development**: `db:start` starts only DynamoDB Local and its admin UI; task 1.2 verifies this. Compliant
- **Test Strategy**: the change touches only Docker Compose and npm scripts, and has no code to test; the tasks verify each change with a command run instead of tests written first. Compliant
- **Code Quality Validation**: task 1.6 runs Prettier; the change has no TypeScript, so typecheck and the test suite are not affected. Compliant
- **Backend Hexagonal Architecture**, **Schema-Driven Development**, **Result Pattern**: no change to code. Not applicable
