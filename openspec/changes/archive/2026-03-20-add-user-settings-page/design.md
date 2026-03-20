## Context

The user entity already carries `transactionPatternsLimit` (optional, validated in
`TransactionService`). Voice input language is not stored anywhere — `useVoiceInput`
lets the browser pick via `SpeechRecognition` default. Both fields need to become
user-configurable and persisted to the backend.

There is currently no `UserService` — `user-resolvers.ts` calls the repository
directly. New resolver code must follow the constitution's three-layer rule, so a
`UserService` is introduced with this change.

## Goals / Non-Goals

**Goals:**

- Expose `voiceInputLanguage` and `transactionPatternsLimit` as user-settable via a new
  `userSettings` query and `updateUserSettings` mutation
- Create a `UserService` to own user-related business logic (settings read/write)
- Add a `/settings` route and `Settings.vue` view with the two controls
- Wire both voice-input consumers (Transactions, Insight) to use the saved language
- Wire the transaction patterns resolver to use the saved limit (already done — it reads
  from `user.transactionPatternsLimit`)

**Non-Goals:**

- Migrating existing `ensureUser` resolver to go through `UserService` (out of scope)
- Any other user-profile fields (display name, avatar, etc.)
- Admin-level overrides of the patterns limit

## Decisions

### 1 — Separate `UserSettings` GraphQL type (not extending `User`)

The existing `User` type serves the auth flow (`ensureUser` returns it). Settings are a
different concern. Mixing them would couple the auth response shape to preferences
changes.

**Decision**: New `UserSettings` type with `userSettings` query and
`updateUserSettings(input: UpdateUserSettingsInput!)` mutation.

**Alternative considered**: Extend `User` with settings fields — rejected because it
forces every `User` response to carry settings data even in auth-only contexts.

### 2 — `UserService` as a domain entity service

No service layer exists for users today. The constitution requires Resolver → Service →
Repository. Rather than a single-purpose service per operation, a domain entity
`UserService` fits because both `getSettings` and `updateSettings` are standard entity
operations on the same entity.

**Decision**: `UserService` with two public methods:

- `getSettings(userId: string): Promise<Result<UserSettings>>`
- `updateSettings({ userId, voiceInputLanguage, transactionPatternsLimit }): Promise<Result<UserSettings>>`

**Alternative considered**: Single-purpose `UpdateUserSettingsService` — rejected;
settings read and write belong together in one service.

### 3 — `UserRepository` gets `findById` and `update`

`getSettings` needs to fetch the user by internal ID (the resolver already has the
user ID from context). `updateSettings` needs to persist only the changed fields.

**Decision**: Add two methods to `UserRepository` port and its DynamoDB implementation:

- `findById(id: string): Promise<User | null>`
- `update(id: string, input: UpdateUserInput): Promise<User>`

where `UpdateUserInput` is `{ voiceInputLanguage?: string | null; transactionPatternsLimit?: number | null }`.

### 4 — No data migration for `voiceInputLanguage`

`voiceInputLanguage` is a new optional field. DynamoDB is schemaless; existing user
records without the field remain valid because the Zod schema marks it `optional()`.
An absent value means "use browser default" — which is the current behaviour for all
users. No backfill is needed.

**Alternative considered**: Migration that sets `voiceInputLanguage: null` explicitly
on all users — unnecessary since `undefined` and `null` are treated the same way
throughout.

### 5 — `useUserSettings` composable for frontend consumers

Three components need the user settings at runtime: `Settings.vue` (read + write),
the Transactions voice-input area (read language), and the Insight voice-input area
(read language). Apollo Client's cache makes the `userSettings` query free after the
first call — subsequent `useQuery` calls for the same query return cached data.

**Decision**: A `useUserSettings` composable wrapping `useQuery(USER_SETTINGS_QUERY)`.
Settings page also calls `useMutation(UPDATE_USER_SETTINGS_MUTATION)` and
`refetchQueries` to invalidate the cache on save.

**Alternative considered**: Pinia store — unnecessary overhead when Apollo cache
already provides reactive shared state for GraphQL results.

### 6 — Language passed into `useVoiceInput` as an optional parameter

`useVoiceInput` currently creates a `SpeechRecognition` instance without setting
`lang`. The Web Speech API defaults to the browser UI language when `lang` is empty or
unset.

**Decision**: Add an optional `language?: string` parameter. Inside `startRecording`,
set `recognition.lang = language ?? ''`. An empty string preserves the current
browser-default behaviour, so callers without a saved preference are unaffected.

The two caller components (`AgenticInput.vue` on Transactions and the Insight page
voice input) each call `useUserSettings()` and pass `settings.voiceInputLanguage` to
`useVoiceInput`.

## Risks / Trade-offs

- **`UserService` alongside the existing direct-repo pattern in `user-resolvers.ts`** —
  The `ensureUser` mutation still bypasses the service layer. This is intentional scope
  control; refactoring it is a separate task. The inconsistency is a known tech debt
  item. → Mitigation: document the inconsistency in a code comment on `user-resolvers.ts`.

- **Apollo cache staleness** — If another tab updates settings, the cached
  `userSettings` in this tab won't reflect the change until refresh. → Acceptable for a
  low-frequency settings page; no real-time requirement exists.

- **`transactionPatternsLimit` validation lives in `TransactionService`** — The range
  (1–10, default 3) is validated there, not in `UserService`. `UserService.updateSettings`
  should validate the range independently to not rely on `TransactionService`'s
  private constants. → `UserService` re-validates range with the same constants
  (exported from `transaction-service.ts` or moved to a shared constants file).

## Migration Plan

1. Update `backend/src/graphql/schema.graphql` — add `UserSettings`, `userSettings`
   query, `UpdateUserSettingsInput`, `updateUserSettings` mutation.
2. Run `npm run codegen` in `backend/`.
3. Update `User` model and Zod schema — add `voiceInputLanguage?: string`.
4. Extend `UserRepository` port — add `findById` and `update`.
5. Implement DynamoDB `UserRepository` methods.
6. Create `UserService` with `getSettings` and `updateSettings`.
7. Add `UserService` to GraphQL context and wire `user-resolvers.ts`.
8. Run backend tests; run `npm run typecheck`.
9. Sync schema to frontend: `npm run codegen:sync-schema` then `npm run codegen` in
   `frontend/`.
10. Create `useUserSettings` composable.
11. Update `useVoiceInput` to accept `language` parameter.
12. Update voice-input callers (Transactions, Insight) to pass the language.
13. Create `Settings.vue` and `/settings` route.
14. Add Settings nav item to `App.vue`.
15. Run frontend typecheck and manual verification.

**Rollback**: The new fields are additive and optional. Reverting the schema and
removing the new resolver/service leaves all existing data intact.

## Open Questions

- Should `transactionPatternsLimit` validation constants (`MIN`, `MAX`, `DEFAULT`) be
  moved to a shared location so both `TransactionService` and `UserService` import
  from one source? Recommended yes — avoids duplication.

## Constitution Compliance

- **Schema-Driven Development**: All API changes start with `schema.graphql`; both
  packages run `codegen` after changes ✓
- **Backend Layer Structure**: New `userSettings`/`updateUserSettings` resolvers call
  `UserService`, which calls `UserRepository` — no direct DB access in resolvers ✓
- **Backend Service Result Pattern**: Both `UserService` public methods return
  `Promise<Result<UserSettings>>` ✓
- **Database Record Hydration**: `UserRepository.findById` and `update` validate
  returned records via the existing Zod `userSchema` (extended with
  `voiceInputLanguage`) ✓
- **Input Validation Order**: `updateSettings` checks auth ownership (userId from
  context), then cheap range/format checks, then DB write ✓
- **Test Strategy**: `UserRepository` gets integration tests (real DB); `UserService`
  gets unit tests with mocked repository ✓
- **Frontend Code Discipline**: Settings form uses Vuetify `v-select` and
  `v-text-field`; no custom CSS needed ✓
- **Vendor Independence**: `Intl.DisplayNames` and Web Speech API `lang` property are
  browser standards; no new dependencies ✓
