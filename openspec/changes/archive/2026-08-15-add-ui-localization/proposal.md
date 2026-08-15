**Issue:** #543

## Why

The interface is English-only, with user-visible strings scattered across Vue components, composables, validation rules, and formatters. Users need a consistent way to use the application in English or German and have that choice follow their account.

## What Changes

- Add frontend localization infrastructure with complete English and German UI message catalogs.
- Replace all client-owned UI text, accessibility labels, validation messages, snackbars, and fallback errors with localized messages.
- Format dates and currency amounts using the browser locale independently of the selected interface language, except spelled-out date components (such as month names), which follow the interface language.
- Add an Interface language selector to Settings, defaulting to English and persisting the selection to the user's account.
- Keep backend GraphQL error-message localization, Cognito hosted pages, Telegram messages, and AI output out of scope.

## Capabilities

### New Capabilities

- `ui-localization`: Localized application UI text and locale-aware client formatting.

### Modified Capabilities

- `user-settings`: Persist and apply a user's selected interface language from Settings.

## Impact

- Frontend: Vue application bootstrap, Vuetify locale configuration, UI components, composables, validation helpers, and date/currency formatting utilities.
- Backend: User settings model, persistence, service, GraphQL schema, and generated client types gain an optional interface-language field.
- Dependency: add `vue-i18n`.

## Constitution Compliance

- **Schema-driven development**: The interface-language API change starts with the canonical backend GraphQL schema and is synchronized to frontend generated types.
- **Backend layering and Result pattern**: Persisting the setting remains within the existing resolver → service → repository structure and uses its established error behavior.
- **UI guidelines**: Settings updates retain snackbar feedback and responsive Vuetify controls.
- **Frontend code discipline**: The change uses Vue and Vuetify integrations rather than custom localization or UI frameworks.
- **Testing and validation**: Backend settings persistence receives co-located tests; frontend localization behavior receives targeted tests and follows the required validation pipeline.
