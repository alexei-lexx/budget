## Context

The Trends page (`frontend/src/views/Trends.vue`) holds an applied `TrendSelection` (period type, lookback, currency, category IDs, include-uncategorized) and only changes it on Apply, Clear, or a starred-entry click. `TrendFilters.vue` edits a draft copy of that selection and emits `apply`/`clear`.

Backend entities follow Repository → Service → GraphQL layering, with one DynamoDB table per entity (`userId` partition key, `id` sort key), a port in `src/ports/`, and a `Dyn*Repository` adapter. `ExpenseTrendService` is the closest sibling in the trends domain; it already uses the Result pattern.

## Goals / Non-Goals

**Goals:**

- Persist a user's starred trend configurations, scoped to that user.
- Let the applied filter's star state reflect a match against any saved configuration, not just the one last starred.
- Let a starred-list entry reapply its configuration exactly like Apply does today.

**Non-Goals:**

- Naming or editing a starred configuration. Entries are labelled from their own fields (categories, period, lookback, currency).
- Any cap on the number of starred configurations.
- Reacting to a category being deleted or excluded after it was starred. Existing category-selector and URL-restore behavior already tolerates an unknown category ID without erroring; starred configurations inherit that behavior unchanged.

## Decisions

### New `StarredTrend` entity, not a field on `User`

`UserSettings` holds single-valued preferences (language, shortcuts limit). Starred trends are a growing, independently-addressable collection (create one, remove one), which is exactly the shape the constitution's per-entity repository pattern targets. A new entity keeps `User` unchanged and matches how `Account`/`Category` are modeled.

**Alternative considered**: an array field on `User` (`starredTrends: StarredTrendData[]`). Rejected — every star/unstar would read-modify-write the whole array on the `User` row, and the `User` model/table currently holds no per-user collections.

### Backend schema

```graphql
type StarredTrend {
  id: ID!
  periodUnit: TrendPeriodUnit!
  lookback: Int!
  currency: String!
  categoryIds: [ID!]!
  includeUncategorized: Boolean!
}

input StarTrendInput {
  periodUnit: TrendPeriodUnit!
  lookback: Int!
  currency: String!
  categoryIds: [ID!]
  includeUncategorized: Boolean
}

extend type Query {
  starredTrends: [StarredTrend!]!
}

extend type Mutation {
  starTrend(input: StarTrendInput!): StarredTrend!
  unstarTrend(id: ID!): Boolean
}
```

`starredTrends` returns a plain array (constitution's short-list rule) ordered most-recently-starred first, matching the spec's list ordering requirement.

### Domain entity: `StarredTrend`

`backend/src/models/starred-trend.ts`, following the `Account`/`User` shape: private constructor, `create()`/`fromPersistence()` factories, `readonly` fields (`id`, `userId`, `periodUnit`, `lookback`, `currency`, `categoryIds`, `includeUncategorized`, `createdAt`). Invariants: `lookback` between 1 and 12 (matches `ExpenseTrendService`'s rule), non-empty `currency`, `periodUnit` one of `WEEK`/`MONTH`. No `update()` — a starred trend is created or deleted, never edited, so no partial-update method is added.

### Matching a configuration to a starred entry

Equality: same `periodUnit`, `lookback`, `currency`, `includeUncategorized`, and the same set of `categoryIds` (compared as a set, not a sequence — the spec calls this out explicitly since categories are chosen via a multi-select with no inherent order).

**Where it runs**: client-side, over the already-loaded `starredTrends` list, each time the applied selection changes. This avoids a round trip just to answer "is this starred," and the list is small (bounded by how many distinct configurations one user saves). The composable exposes a `matchingStarredTrend` computed value the star control and any future consumer can read.

**Server-side duplicate guard**: `StarredTrendService.starTrend` still checks for an existing equal configuration before creating a new row, and returns the existing one if found. This keeps `starTrend` idempotent even if a client races the star action, consistent with the constitution's rule that services validate duplicates.

### Frontend composable

New `frontend/src/composables/useStarredTrends.ts`, colocated with `useExpenseTrend.ts`, exposing:

- `starredTrends` — reactive list from the `starredTrends` query.
- `matchingStarredTrend(selection)` — the entry equal to a given `TrendSelection`, or `null`.
- `star(selection)` / `unstar(id)` — wrap the two mutations and refetch (or update the Apollo cache) so the list and match state stay current.

`TrendFilters.vue` adds the star control to the right of the Clear/Apply row, before the Apply button, styled as an outlined icon button (bordered, matching Clear's `outlined` variant) rather than a plain icon. It reads the **applied** selection (the `selection` prop it already receives), not the draft — consistent with the page's existing Apply-based-selection rule, where only the applied selection is real until Apply is clicked. Starring a draft the user hasn't applied would save something not yet reflected in the chart.

`Trends.vue` adds a starred-trends list above the filter card, rendered only when `starredTrends` is non-empty. Each entry's label is built client-side in the form `{categories} in last {lookback} {week|weeks|month|months} in {currency}`: `{categories}` is the entry's category names (resolved via the already-loaded category list) joined with `, `, with `, uncategorized` appended when include-uncategorized is set, or `all` when there are no categories and include-uncategorized is not set; the period word is singular when lookback is 1, plural otherwise. Clicking an entry calls the same `handleApply` path used today, so chart, filters, and URL update identically.

### Infra

New DynamoDB table in `infra-cdk/lib/backend-cdk-stack.ts`, `StarredTrendsTable`, `partitionKey: userId`, `sortKey: id`, same `commonTableOptions` as the other per-user tables. Wired into both the web and background Lambda functions the same way `accountsTable` is, since GraphQL requests run on the web function.

### No soft-deletion

`unstarTrend` hard-deletes the row. The constitution's soft-deletion default is for entities with audit or recovery value; a starred filter shortcut has neither — losing one is a one-click re-star, not data loss. This exception is documented on the entity itself, per the constitution's exception-handling rule.

## Risks / Trade-offs

- **Client-side matching cost**: recomputing set-equality against the starred list on every applied-selection change is O(entries × categories), trivial at the expected list sizes. → No mitigation needed; revisit only if usage patterns prove otherwise.
- **Duplicate stars from concurrent tabs**: two tabs could both see "unstarred" and both call `starTrend` for the same configuration. → The service-side duplicate check (return the existing row instead of creating a second one) makes this idempotent.
- **Stale labels**: a starred entry's label is resolved from the current category list at render time; if a category is renamed later, the label picks up the new name automatically (no stored denormalized name to go stale).

## Constitution Compliance

- **Backend Layer Structure**: `StarredTrend` resolvers → `StarredTrendService` → `StarredTrendRepository`, no layer skipped.
- **Repository Pattern / Vendor Independence**: `StarredTrendRepository` port with `DynStarredTrendRepository` adapter; only get/put/delete/query-by-partition-key operations, portable to any SQL/NoSQL store.
- **Backend Domain Entities**: `StarredTrend` is immutable, private constructor, `create()`/`fromPersistence()` factories, invariants enforced in the constructor.
- **Backend Port Interfaces**: `StarredTrendRepository` lives in `src/ports/`, service depends on the port, adapter wired in `dependencies.ts`.
- **Result Pattern**: `StarredTrendService` public methods return `Result`, matching `ExpenseTrendService`.
- **Database Record Hydration**: `DynStarredTrendRepository` validates rows with a Zod schema (`src/repositories/schemas/starred-trend.ts`) before returning entities, matching every other repository.
- **Data Migrations**: none needed — this is a new, empty table with no existing data to backfill.
- **Authentication & Authorization**: resolvers require an authenticated user; `unstarTrend` looks up the row scoped to `userId` before deleting, so one user cannot unstar another's entry.
- **Schema-Driven Development**: schema written first, then `npm run codegen` (backend) and `npm run codegen:sync-schema && npm run codegen` (frontend).
- **GraphQL Pagination Strategy**: `starredTrends` is a plain array (short-list case).
- **Test Strategy**: `StarredTrendService` tests use a mocked repository; `DynStarredTrendRepository` tests use a real local DynamoDB connection, co-located next to their source files.
- **Soft-Deletion**: intentionally not applied to `StarredTrend`; documented above and to be documented as a comment on the entity, matching how `User` documents its own exception.
