## Why

Finding a useful Trends slice (categories, period, lookback, currency) takes several selector changes and an Apply click. Users who check the same slice repeatedly must rebuild it every visit. Starring lets a user save a filter configuration once and reapply it with one click.

## What Changes

- Add a star toggle to the Trend Filters panel that reflects whether the currently applied filter configuration is saved.
- Clicking the star when unstarred saves the applied configuration (period type, lookback, currency, categories, include-uncategorized) to the user's account.
- Clicking the star when starred removes that saved configuration.
- The star reflects a match: if the applied configuration equals any saved configuration, the star shows starred, regardless of which star action originally saved it.
- Add a starred-trends list at the top of the Trends page. Each entry is labelled with a summary of its configuration. Clicking an entry applies that configuration and updates the chart and URL, the same as clicking Apply.
- New GraphQL query and mutations to list, save, and remove starred trend configurations, scoped to the authenticated user.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trends`: adds starring a trend filter configuration, matching the star state to the applied configuration, and a starred-trends list that reapplies a saved configuration on click.

## Impact

- **Backend**: new `StarredTrend` domain entity, repository (port + DynamoDB adapter), service, and GraphQL resolvers. New DynamoDB table (added in `infra-cdk`). Schema additions: `StarredTrend` type, `starredTrends` query, `starTrend` / `unstarTrend` mutations.
- **Frontend**: `TrendFilters.vue` gains a star control; `Trends.vue` gains a starred-trends list section; new composable to load/save/remove starred trends and to compute the match against the applied selection.
- **infra-cdk**: new DynamoDB table for starred trends, following the existing per-entity table pattern.

## Constitution Compliance

- **Backend Layer Structure**: new `StarredTrendService` (domain entity service) sits between the resolver and a new `StarredTrendRepository` port, mirroring existing entities (e.g. Account, Category). Compliant.
- **Repository Pattern / Vendor Independence**: `StarredTrend` persistence goes through a `StarredTrendRepository` port with a DynamoDB adapter; only portable operations (get/put/delete/query by userId) are used. Compliant.
- **Backend Domain Entities**: `StarredTrend` is an immutable entity with a private constructor, `create()` and `fromPersistence()` factories, and invariant validation. Compliant.
- **Result Pattern**: `StarredTrendService` public methods return `Result`, consistent with `ExpenseTrendService`. Compliant.
- **Schema-Driven Development**: schema changes (`StarredTrend` type, query, mutations) are made first, then codegen is run on both backend and frontend. Compliant.
- **Authentication & Authorization**: all new resolvers require an authenticated user; the service and repository take the internal user ID and scope every operation to it. Compliant.
- **Soft-Deletion**: not applied. A starred trend is a lightweight save/remove toggle with no audit or recovery need, so `unstarTrend` hard-deletes the row. This is a documented exception, consistent with how the constitution allows exceptions when the business reason is stated.
- **GraphQL Pagination Strategy**: `starredTrends` returns a plain array. A user's starred list is inherently small (bounded by how many distinct filter configurations they use), well under the 100-item threshold. Compliant.
- **UI Guidelines**: star/unstar and list interactions use existing Vuetify components and snackbar feedback conventions; no custom CSS beyond what `TrendFilters.vue` already uses. Compliant.
- **Test Strategy**: new repository and service get co-located tests; frontend changes are verified manually. Compliant.
