# Data model and persistence

The backend persists all application state in DynamoDB tables provisioned by `infra-cdk/lib/backend-cdk-stack.ts`.

## Tables

The CDK stack defines these tables:

- `UsersTable` — partitioned by `id`, with a global secondary index on `email`
- `AccountsTable` — partitioned by `userId`, sorted by `id`
- `CategoriesTable` — partitioned by `userId`, sorted by `id`
- `TransactionsTable` — partitioned by `userId`, sorted by `id`
- `MigrationsTable` — stores migration bookkeeping
- `ChatMessagesTable` — partitioned by `userId`, sorted by `sessionSortKey`, with TTL on `expiresAt`
- `TelegramBotsTable` — partitioned by `userId`, sorted by `id`, with a GSI on `webhookSecret`

The tables are configured for on-demand billing, point-in-time recovery, retention, and deletion protection. That signals the data is meant to be durable and user-owned.

## Access pattern hints

The table indexes reveal the main query patterns:

- users are looked up by email during authentication or account resolution
- transactions are queried by created-at and by date
- telegram bots are looked up by webhook secret for webhook dispatch
- chat messages expire automatically after a configured TTL

## Repository pattern

The backend uses a repository abstraction under `backend/src/ports/` with DynamoDB implementations under `backend/src/repositories/`.

Relevant layers:

- `backend/src/ports/*-repository.ts` define the repository contracts
- `backend/src/repositories/dyn-*-repository.ts` implement those contracts for DynamoDB
- `backend/src/repositories/schemas/` define item-shape helpers
- `backend/src/repositories/dyn-atomic-writer.ts` and `backend/src/repositories/utils/transact-write.ts` support atomic updates and transactional writes

The repository tests are a strong source of truth for query and item-shape expectations.

## Migrations

Migrations are implemented in `backend/src/migrations/` and executed through backend scripts. The presence of a `MigrationsTable` and migration runner implies schema evolution is tracked in the app itself rather than being left to ad hoc table changes.

The migration list currently includes changes such as:

- removing nullable descriptions
- removing nullable category IDs
- populating created-at sortable fields
- removing the old auth0 user ID field
- adding report exclusion and version fields
- denormalizing account transaction balances

## Local setup and table lifecycle

`backend/package.json` exposes scripts for:

- `db:create`
- `db:drop`
- `db:recreate`
- `db:setup`
- `migrate`
- test-only variants such as `test:db:create`

That makes the local developer workflow explicitly table-oriented rather than relying on a hidden database service.

## Watch outs

- User-scoped partition keys are central to the design; changes to query shape should preserve authorization boundaries.
- Any change that affects transactions should consider report queries, assistant prompts, and cached/generated GraphQL types.
- Chat-message TTL is part of the product behavior, not just a storage optimization.
