## 1. GraphQL Schema & Codegen

- [x] 1.1 Add `StarredTrend` type, `StarTrendInput`, `Query.starredTrends`, `Mutation.starTrend`, and `Mutation.unstarTrend` to `backend/src/graphql/schema.graphql`
- [x] 1.2 Run `npm run codegen` in `backend/` to regenerate resolver types
- [x] 1.3 Run `npm run codegen:sync-schema` then `npm run codegen` in `frontend/` to sync the schema and regenerate typed composables

## 2. Backend: `StarredTrend` Domain Entity

- [x] 2.1 (use `testing` skill) Write `backend/src/models/starred-trend.test.ts` covering `create()`, `fromPersistence()`, and invariant violations (lookback out of 1-12 range, empty currency, invalid period unit)
- [x] 2.2 Implement `backend/src/models/starred-trend.ts`: `StarredTrend` entity with private constructor, `create()`/`fromPersistence()` factories, `readonly` fields (`id`, `userId`, `periodUnit`, `lookback`, `currency`, `categoryIds`, `includeUncategorized`, `createdAt`), and a comment documenting the intentional soft-deletion exception
- [x] 2.3 Run the new test file and confirm it passes

## 3. Backend: Repository

- [x] 3.1 Define `backend/src/ports/starred-trend-repository.ts`: `StarredTrendRepository` port with `findManyByUserId(userId)`, `create(starredTrend)`, `deleteOneById({ id, userId })`
- [x] 3.2 Add `backend/src/repositories/schemas/starred-trend.ts` with a Zod schema for the persisted row shape
- [x] 3.3 (use `testing` skill) Write `backend/src/repositories/dyn-starred-trend-repository.test.ts` against a real local DynamoDB connection, covering create, findManyByUserId (scoped to the requesting user), and deleteOneById
- [x] 3.4 Implement `backend/src/repositories/dyn-starred-trend-repository.ts`: `DynStarredTrendRepository` implementing the port, validating rows with the schema from 3.2
- [x] 3.5 Run the repository test suite and confirm it passes

## 4. Backend: Service

- [x] 4.1 (use `testing` skill) Write `backend/src/services/starred-trend-service.test.ts` with a mocked repository, covering: listing a user's starred trends, starring a new configuration, starring a configuration that already matches an existing one (returns the existing entity, does not create a duplicate), and unstarring (including unstarring another user's entry being rejected)
- [x] 4.2 Implement `backend/src/services/starred-trend-service.ts`: `StarredTrendService` with `listStarredTrends(userId)`, `starTrend(userId, input)`, `unstarTrend(userId, id)`, all returning `Result`; `starTrend` checks for an existing equal configuration (same period type, lookback, currency, include-uncategorized, and category set) before creating
- [x] 4.3 Run the service test suite and confirm it passes

## 5. Backend: Resolvers & Wiring

- [x] 5.1 Add `starredTrendResolvers` (or extend `trends-resolvers.ts`) in `backend/src/graphql/resolvers/` for `Query.starredTrends`, `Mutation.starTrend`, `Mutation.unstarTrend`, following the auth and error-handling pattern in `trends-resolvers.ts`
- [x] 5.2 Register the new resolvers in `backend/src/graphql/resolvers/index.ts`
- [x] 5.3 Wire `DynStarredTrendRepository` and `StarredTrendService` singletons in `backend/src/dependencies.ts`
- [x] 5.4 Add the repository/service to `backend/src/graphql/context.ts` so resolvers can reach them

## 6. Infra

- [x] 6.1 Add `StarredTrendsTable` to `infra-cdk/lib/backend-cdk-stack.ts` (`partitionKey: userId`, `sortKey: id`, `commonTableOptions`), grant read/write to the web Lambda, and add its table name to the Lambda environment

## 7. Frontend: Composable

- [x] 7.1 Add GraphQL operations for `starredTrends`, `starTrend`, and `unstarTrend` to `frontend/src/graphql/queries.ts` (query in `queries.ts`, mutations in `mutations.ts`, matching the existing query/mutation file split)
- [x] 7.2 Implement `frontend/src/composables/useStarredTrends.ts`: reactive `starredTrends` list, `matchingStarredTrend(selection)`, `star(selection)`, `unstar(id)`, with set-based category comparison for matching
- [x] 7.3 Manually verify in the dev app: starring, unstarring, and that the list refetches/updates after each action

## 8. Frontend: Star Control in Trend Filters

- [x] 8.1 Move the star icon button in `frontend/src/components/reports/TrendFilters.vue` to the right of the row, immediately before Apply, styled with an outlined border (matching Clear's `outlined` variant); still reflects `matchingStarredTrend(props.selection)` and calls `star`/`unstar` from `useStarredTrends`
- [x] 8.2 Add `trends.filters.star` / `trends.filters.unstar` (tooltip/aria-label) keys to `frontend/src/locales/en.json` and `de.json`
- [x] 8.3 Manually verify: star control reflects the applied selection's match state, including after Apply, Clear, and editing the draft without applying

## 9. Frontend: Starred Trends List

- [x] 9.1 Update `frontend/src/components/reports/StarredTrendsList.vue`: label each entry as "{categories} in last {lookback} {week|weeks|month|months} in {currency}" per `design.md` (singular/plural period word), ordered most-recently-starred first; hidden when the list is empty
- [x] 9.2 Mount `StarredTrendsList` at the top of `frontend/src/views/Trends.vue`, wiring its click handler to the existing `handleApply` path
- [x] 9.3 Update `trends.starred.*` locale keys in `frontend/src/locales/en.json` and `de.json` for the new label format (list title, "all", "uncategorized", singular/plural "week"/"weeks"/"month"/"months", connector words), replacing the "no category filter" phrase
- [x] 9.4 Manually verify: clicking a starred entry updates the chart, the filter selectors, and the URL the same way Apply does, and each entry's label matches the new format

## 10. Verification

- [x] 10.1 Run `npm run typecheck` and `npm run format` in `backend/` and `frontend/`
- [x] 10.2 Run `npm test` in `backend/` and confirm no regressions
- [x] 10.3 Run `npx prettier --write openspec/` to format the change's artifacts

## Constitution Compliance

- **Test Strategy**: repository test uses a real DynamoDB connection; service test uses a mocked repository; both co-located with their source files (tasks 3.3, 4.1). Frontend changes verified manually (tasks 7.3, 8.3, 9.4), no required component tests.
- **Schema-Driven Development**: schema changes land first (task 1), backend and frontend codegen run before any resolver or composable code is written.
- **Backend Layer Structure**: tasks proceed model → repository → service → resolver, each layer built on the one below it.
- **Authentication & Authorization**: resolver task (5.1) follows the existing auth pattern; service test (4.1) explicitly covers rejecting cross-user unstar attempts.
- **Code Quality Validation**: task 10.1-10.2 run the required test/typecheck/lint pipeline before the change is considered done.
