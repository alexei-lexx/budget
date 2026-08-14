## 1. Backend Interface-Language Contract

- [x] 1.1 Add the interface-language fields and authenticated `supportedInterfaceLanguages` query to `backend/src/graphql/schema.graphql`, then regenerate backend types.
- [x] 1.2 (use `testing` skill) Add co-located `User` model tests for accepted, rejected, and missing interface-language values.
- [x] 1.3 Add the optional interface-language property to the immutable `User` model and its persistence rehydration path, defaulting absent legacy values to `en` at the service boundary.
- [x] 1.4 (use `testing` skill) Add co-located repository tests covering persistence and hydration of the optional interface-language value.
- [x] 1.5 Update the user persistence schema and DynamoDB adapter to store and validate the optional interface-language value.
- [x] 1.6 (use `testing` skill) Add co-located `UserService` tests for accepted, rejected, and missing interface-language settings.
- [x] 1.7 Define one backend-supported language list (`en`, `de`); use it to validate settings updates in `UserService` and expose the authenticated supported-language query directly from the resolver.

## 2. Frontend Localization Foundation

- [x] 2.1 Synchronize the frontend schema and regenerate typed GraphQL operations for the new user-settings fields and supported-language query.
- [x] 2.2 Add Vue I18n and configure a single application I18n instance with complete English and German catalogs plus Vuetify's Vue I18n locale adapter.
- [x] 2.3 Create the locale controller/composable that loads authenticated user settings, defaults to English while unavailable or invalid, applies the saved language before authenticated content renders, and updates immediately after saving.
- [x] 2.4 Update format helpers and inline date/currency formatting call sites to use browser locale conventions rather than a forced `en-US` or the active interface language.

## 3. Settings and UI Migration

- [x] 3.1 Extend the Settings query, save mutation, and composable to load and persist `interfaceLanguage` and backend-supported interface-language tags.
- [x] 3.2 Add the responsive Vuetify Interface language selector, deriving localized language names with `Intl.DisplayNames` from API-supplied values and preserving the independent voice-input setting.
- [x] 3.3 Update voice-input language labels to use `Intl.DisplayNames` in the active interface language without changing the speech-recognition language behavior.
- [x] 3.4 Audit frontend client-owned visible and accessible text, validation messages, snackbars, dialogs, and fallback errors; replace literals with complete English and German translation keys while leaving user-provided and server-generated content unchanged.

## 4. Verification

- [x] 4.1 (use `testing` skill) Run the focused co-located backend model, repository, and service tests added for interface-language support.
- [x] 4.2 Run backend and frontend code generation, type checks, linting, and full test suites for the changed packages.
- [x] 4.3 Manually verify English and German interface switching, immediate post-save updates, restored preference after sign-in, localized voice-language labels, and browser-locale-independent date and currency formatting.

## Constitution Compliance

- [x] Schema-driven development — update the canonical backend GraphQL schema first, then regenerate backend types, sync the frontend schema, and regenerate frontend operations.
- [x] Backend layering, immutable domain entities, ports, Result pattern, and record hydration — keep resolver, service, and repository responsibilities separate; the resolver returns the static supported-language list directly, while the persisted setting is validated in `UserService` and at the repository boundary.
- [x] Authentication and authorization — obtain and update the setting only through the authenticated user-settings flow, without accepting a client-supplied user ID.
- [x] Frontend discipline and UI guidelines — use Vue I18n, Vuetify's locale adapter, responsive Vuetify controls, and snackbar feedback while minimizing custom CSS.
- [x] Testing and validation — use test-driven, co-located backend coverage and complete the mandated focused tests, full suites, and package quality checks before completion.
