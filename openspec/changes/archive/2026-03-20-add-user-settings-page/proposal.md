## Why

Users have no control over two app behaviors that are personal preferences: voice input always uses the browser's default language regardless of what the user actually speaks, and the transaction shortcuts limit is only configurable by an admin. A Settings page gives users direct control over both.

## What Changes

- New **Settings** page added to the nav below Insight
- **Voice input language**: user-selectable BCP 47 language dropdown (rendered via `Intl.DisplayNames`, no extra packages); defaults to browser language; persisted to backend and applied at voice input time
- **Transaction shortcuts limit**: numeric input replacing the admin-only setting; persisted to backend and applied to the patterns feature
- A hint text is displayed below the shortcuts limit input (e.g. "Card + Groceries", "Cash + Transport")
- New `voiceInputLanguage` field added to the user entity (backend)
- New `userSettings` GraphQL query returning the current user's settings on page mount
- New `updateUserSettings` GraphQL mutation exposing both `voiceInputLanguage` and `transactionPatternsLimit` as user-settable fields

## Capabilities

### New Capabilities

- `user-settings`: Settings page UI, `userSettings` query, and `updateUserSettings` mutation — covering load, display, edit, and persist of voice input language and transaction shortcuts limit

### Modified Capabilities

- `navigation`: Add Settings as a nav item below Insight
- `transactions`: Voice input now uses the user-selected language instead of the browser default; quick action button count becomes user-configurable instead of hardcoded to 3
- `insight`: Voice input now uses the user-selected language instead of the browser default

## Impact

- **Backend**: New `voiceInputLanguage` field on the user entity and repository; new `updateUserSettings` mutation with service method; no migration needed — absent field means "use browser default"
- **Frontend**: New `/settings` route and `SettingsPage` view; voice input composable reads `voiceInputLanguage` from user settings instead of `navigator.language`; transaction patterns feature reads limit from user settings
- **GraphQL schema**: New `UserSettings` type (or extended `User` type), `userSettings` query, `updateUserSettings` mutation

## Constitution Compliance

- **Schema-Driven Development**: API changes start with `schema.graphql`; both backend and frontend run `codegen` after schema update ✓
- **Backend Layer Structure**: Resolver → `UserSettingsService` (or extended `UserService`) → `UserRepository`; no direct DB access in resolvers ✓
- **Backend Service Result Pattern**: `updateUserSettings` service method returns a `Result` ✓
- **Database Record Hydration**: Updated user record validated via Zod at repository read boundary ✓
- **Data Migrations**: No migration needed — `voiceInputLanguage` is a new optional field; absent value falls back to browser default, no data backfill required ✓
- **Soft-Deletion**: No new entities introduced; user entity already soft-delete compliant ✓
- **Authentication & Authorization**: `userSettings` query and `updateUserSettings` mutation scoped to authenticated user via context; no user ID accepted from input ✓
- **Vendor Independence**: No new vendor dependencies; `Intl.DisplayNames` is a browser native API ✓
- **Frontend Code Discipline**: Vuetify components used for form controls; minimal custom CSS ✓
- **Test Strategy**: Repository and service layer tests required for new backend code ✓
