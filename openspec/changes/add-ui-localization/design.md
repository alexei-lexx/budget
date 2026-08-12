## Context

See `proposal.md` for motivation. Frontend UI text is currently English-only and spread across components, composables, validation rules, and local fallbacks. Vuetify is initialized without locale support, while some date displays explicitly use `en-US`. The existing user-settings flow already persists optional preferences through the authenticated resolver → service → repository path. The schema also exposes `supportedCurrencies: [String!]!`, establishing the project pattern for the backend to supply supported values to the frontend.

## Goals / Non-Goals

**Goals:**

- Provide one application-wide source for complete English and German client-owned UI text, including Vuetify messages.
- Store standard BCP 47 interface-language tags directly, initially `en` and `de`.
- Expose the backend-supported interface-language tags so the frontend does not duplicate that list.
- Apply the saved language to authenticated content and keep browser date and currency formatting independent.

**Non-Goals:**

- Translating GraphQL errors, Cognito pages, Telegram messages, AI output, or user-provided content.
- Changing voice-recognition language when the interface language changes.
- Adding a custom GraphQL scalar or supporting locales without a translation catalog.

## Decisions

### Use Vue I18n as the shared application and Vuetify localization source

Add `vue-i18n` and create one application-level I18n instance with English and German catalogs in the frontend source tree. Components, composables, validation rules, snackbars, and client-owned fallback errors will resolve text through that instance. Translation keys describe the UI meaning rather than a component location. Configure Vuetify through its Vue I18n locale adapter, including its English and German messages, so its built-in messages change with application text.

Alternatives considered:

- Per-component translation objects would let each feature own its text, but would duplicate keys and make it difficult to verify that every language is complete.
- Vuetify localization alone would translate Vuetify controls, but not application templates, composables, or custom validation messages.
- Translating backend error strings in the client would require mapping server wording or error codes to UI messages; this change intentionally leaves server errors unchanged.

### Persist BCP 47 language tags as validated GraphQL strings

Add `interfaceLanguage: String!` to `UserSettings` and `interfaceLanguage: String` to `UpdateUserSettingsInput`. The backend stores tags unchanged and validates them in `UserService` against the supported list before updating the immutable `User`. The user model and persistence schema retain the field as optional; `UserService` returns `en` when the attribute is absent so existing records need no migration.

This uses the standard values directly in GraphQL and Vue I18n. A future regional preference can be stored and used unchanged, for example `en-GB` or `de-CH`.

Alternatives considered:

- A GraphQL enum would reject unsupported values before the resolver runs. However, GraphQL enum names cannot contain `-`, so the API would need a different value such as `EN_GB` and a mapping to the standard tag `en-GB`.
- A custom GraphQL scalar would accept and validate standard tags at the GraphQL boundary. It would also require scalar parsing, resolver registration, and code-generation configuration; the same two-value allowlist is simpler to validate in `UserService`.

### Query backend-supported interface languages

Add the authenticated `supportedInterfaceLanguages: [String!]!` query alongside `supportedCurrencies`. The user-settings resolver delegates to `UserService`, which returns the supported BCP 47 tags from the same definition it uses for validation. The Settings page queries this list and renders the Interface language selector from it; it does not maintain an independent frontend list.

Initially the list is `en` and `de`. Each later supported tag requires a matching I18n catalog and an update to the backend list, preventing a user from saving a language the frontend cannot render.

Alternatives considered:

- Hard-coding `en` and `de` in the frontend would work initially, but would duplicate the backend validation list and require every later addition to be changed in two places.
- Returning display names from the backend would make the API choose UI presentation text. The frontend instead derives localized names with I18n and `Intl.DisplayNames`.

### Load and update the active interface language at the authenticated application boundary

Create a small locale controller/composable that owns the I18n locale. After the app ensures the authenticated user, it reads `userSettings`, applies its `interfaceLanguage`, and makes authenticated page content wait for that initialization. The controller defaults to English while data is unavailable. On a successful Settings save, it updates the active I18n locale immediately and relies on the Apollo cache update for the persisted settings state.

The Interface language selector uses values returned by `supportedInterfaceLanguages`. The existing voice-input selector retains its independent saved value. Its human-readable option labels use `Intl.DisplayNames` with the active interface-language tag, so the labels themselves are localized without an additional package.

Alternatives considered:

- Fetching settings only in `Settings.vue` would load the preference after navigating there, leaving other authenticated pages in the default language.
- Browser storage would apply a locale before the account setting is read, but would duplicate account state and not follow the user across devices.

### Keep financial and date formatting bound to the browser locale

Formatting helpers use the browser's `Intl` default locale (or `navigator.language` when explicitly needed), never the active I18n locale. Existing display helpers that force `en-US` will be changed. User-provided names, descriptions, assistant responses, and server-generated messages remain values, not translation keys.

Alternatives considered:

- Passing the interface-language tag to `Intl` would make dates and amounts follow the UI language rather than the browser's regional conventions.
- Maintaining translated voice-language names manually would duplicate data that `Intl.DisplayNames` already supplies for the existing voice-input codes.

### Follow the schema-first code-generation flow

Update `backend/src/graphql/schema.graphql` first, regenerate backend types, synchronize the frontend schema, and regenerate frontend operations. Update the user model, repository schema/adapter, service, resolver, settings composable, and GraphQL operations only through those generated contracts.

## Risks / Trade-offs

- [A client-owned string remains hard-coded] → Audit user-visible frontend literals and verify both catalogs contain the required keys.
- [A supported tag has no matching catalog] → Keep the backend list and catalog additions in the same change, and fall back to `en` for an invalid persisted legacy value.
- [The saved locale is unavailable immediately after sign-in] → Default to English and defer authenticated content until user settings have initialized the locale.
- [Browser conventions differ from the selected interface language] → Keep formatters independent and verify the specified cross-locale scenarios.
- [Older DynamoDB records lack the setting] → Treat a missing field as `en`; the optional persistence attribute requires no data migration.

## Migration Plan

1. Deploy the backward-compatible backend schema, optional persistence field, validated supported-list query, and `en` default first.
2. Regenerate backend and frontend GraphQL types, then deploy the frontend catalogs, locale controller, formatters, and Settings selector.
3. Verify an existing user defaults to English, a user who saves `de` sees German after a new sign-in, the selector obtains `en` and `de` from the API, and browser-localized amounts/dates do not change with the interface language.
4. For rollback, deploy the previous frontend before the previous backend. Older code safely ignores the optional stored field; no data rollback is required.

## Constitution Compliance

- **Schema-driven development:** The settings fields and supported-language query originate in the canonical backend schema, followed by backend and frontend code generation.
- **Backend layering and Result pattern:** The authenticated resolver delegates supported-list retrieval and setting updates to `UserService`; the service validates input before repository access and returns its established Result-based settings response.
- **Domain entities and record hydration:** `User` remains immutable and validates the optional language property; the repository schema validates the persisted field while legacy absence is handled by the service default.
- **Authentication and authorization:** Both user settings and the supported-language query use the authenticated user flow; no user ID is supplied by the client.
- **UI and frontend discipline:** Vue I18n and Vuetify's adapter provide the localization infrastructure, Settings remains a responsive Vuetify control, and feedback remains snackbar-based.
- **Testing and validation:** Add co-located backend model, service, and repository coverage for accepted, rejected, and missing values; add focused frontend checks/manual verification for language switching, localized voice-language names, and browser-locale formatting.
