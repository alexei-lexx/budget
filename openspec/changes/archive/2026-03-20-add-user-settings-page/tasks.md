## 1. GraphQL Schema

- [x] 1.1 Add `UserSettings` type, `userSettings` query, `UpdateUserSettingsInput` input, and `updateUserSettings` mutation to `backend/src/graphql/schema.graphql`
- [x] 1.2 Run `npm run codegen` in `backend/` to generate TypeScript types

## 2. Backend: User Model & Repository

- [x] 2.1 Add `voiceInputLanguage?: string` field to `backend/src/models/user.ts`
- [x] 2.2 Add `voiceInputLanguage: z.string().optional()` to the Zod schema in `backend/src/repositories/schemas/user.ts`
- [x] 2.3 Add `findById(id: string): Promise<User | null>` and `update(id: string, input: UpdateUserInput): Promise<User>` to the `UserRepository` port in `backend/src/services/ports/user-repository.ts`
- [x] 2.4 Implement `findById` and `update` in the DynamoDB `UserRepository`
- [x] 2.5 Add integration tests for `findById` and `update` in the DynamoDB `UserRepository` test file

## 3. Backend: Constants & UserService

- [x] 3.1 Export `MIN_TRANSACTION_PATTERNS_LIMIT`, `MAX_TRANSACTION_PATTERNS_LIMIT`, and `DEFAULT_TRANSACTION_PATTERNS_LIMIT` from `transaction-service.ts` (or move to a shared constants file) so `UserService` can import them without duplication
- [x] 3.2 Create `backend/src/services/user-service.ts` with `getSettings(userId)` and `updateSettings({ userId, voiceInputLanguage, transactionPatternsLimit })` — both returning `Promise<Result<UserSettings>>`
- [x] 3.3 Add unit tests for `UserService` in `backend/src/services/user-service.test.ts` with mocked repository

## 4. Backend: GraphQL Wiring

- [x] 4.1 Add `UserService` instance to the GraphQL context (`backend/src/graphql/context.ts`)
- [x] 4.2 Implement `userSettings` query resolver in `backend/src/graphql/resolvers/user-resolvers.ts`
- [x] 4.3 Implement `updateUserSettings` mutation resolver in `backend/src/graphql/resolvers/user-resolvers.ts`
- [x] 4.4 Run `npm test` in `backend/` and fix any failures
- [x] 4.5 Run `npm run typecheck` and `npm run format` in `backend/` and fix all issues

## 5. Frontend: Code Generation

- [x] 5.1 Run `npm run codegen:sync-schema` in `frontend/` to pull the updated GraphQL schema
- [x] 5.2 Add `USER_SETTINGS_QUERY` and `UPDATE_USER_SETTINGS_MUTATION` GraphQL operation documents in `frontend/src/`
- [x] 5.3 Run `npm run codegen` in `frontend/` to generate typed composables

## 6. Frontend: Shared Settings Composable

- [x] 6.1 Create `frontend/src/composables/useUserSettings.ts` wrapping `useQuery(USER_SETTINGS_QUERY)` and `useMutation(UPDATE_USER_SETTINGS_MUTATION)`

## 7. Frontend: Voice Input Language

- [x] 7.1 Add optional `language?: string` parameter to `useVoiceInput` in `frontend/src/composables/useVoiceInput.ts`; set `recognition.lang = language ?? ''` inside `startRecording`
- [x] 7.2 Update `AgenticInput.vue` (Transactions page) to call `useUserSettings()` and pass `voiceInputLanguage` to `useVoiceInput`
- [x] 7.3 Update the Insight page voice input to call `useUserSettings()` and pass `voiceInputLanguage` to `useVoiceInput`

## 8. Frontend: Settings Page

- [x] 8.1 Create `frontend/src/views/Settings.vue` with a language dropdown (BCP 47 options rendered via `Intl.DisplayNames`) and a shortcuts limit numeric input with hint text
- [x] 8.2 Wire the Settings page form to `useUserSettings` — load values on mount, call `updateUserSettings` on submit, show success/error snackbar
- [x] 8.3 Add `/settings` route to `frontend/src/router/index.ts` with `requireAuth` guard
- [x] 8.4 Add Settings nav item to `App.vue` navigation drawer, positioned immediately after the Insight item

## 9. Frontend: Validation

- [x] 9.1 Run `npm run typecheck` and `npm run format` in `frontend/` and fix all issues
- [x] 9.2 Manually verify: Settings page loads saved values, saving updates voice input language and shortcuts limit, voice input on Transactions and Insight uses the saved language

## Constitution Compliance

- **Schema-Driven Development**: Tasks 1.1–1.2 and 5.1–5.3 ensure schema is the source of truth and both packages regenerate types ✓
- **Backend Layer Structure**: Tasks 3.2–4.3 wire Resolver → UserService → UserRepository with no direct DB access in resolvers ✓
- **Backend Service Result Pattern**: Task 3.2 specifies both service methods return `Result` ✓
- **Database Record Hydration**: Task 2.4 validates records via Zod schema at repository read boundary ✓
- **Test Strategy**: Tasks 2.5 and 3.3 cover repository integration tests and service unit tests ✓
- **Data Migrations**: No migration required — `voiceInputLanguage` is optional; absent value falls back to browser default ✓
- **Input Validation Order**: `updateSettings` validates auth ownership first, then range checks, then DB write ✓
- **Frontend Code Discipline**: Task 8.1 uses Vuetify `v-select` and `v-text-field`; no custom CSS ✓
- **Code Quality Validation**: Tasks 4.4–4.5 and 9.1 run tests, typecheck, and format before completion ✓
