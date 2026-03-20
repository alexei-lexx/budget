## 1. Backend — Schema

- [x] 1.1 Add `isVoiceInput: Boolean` to `CreateTransactionFromTextInput` in `backend/src/graphql/schema.graphql`
- [x] 1.2 Run `npm run codegen` in `backend/` to regenerate TypeScript types

## 2. Backend — Service

- [x] 2.1 Add `isVoiceInput: boolean` parameter to `CreateTransactionFromTextService.call()`
- [x] 2.2 Append the voice hint section to the system prompt when `isVoiceInput` is `true`
- [x] 2.3 Update `CreateTransactionFromTextService` tests to cover the `isVoiceInput: true` branch (voice hint appended) and the `isVoiceInput: false` branch (no hint)

## 3. Backend — Resolver

- [x] 3.1 Extract `isVoiceInput` from the GraphQL input in `create-transaction-from-text-resolvers.ts` and pass it to `service.call()`

## 4. Backend — Validation

- [x] 4.1 Run `npm test` in `backend/` and fix any failures
- [x] 4.2 Run `npm run typecheck` and `npm run format` in `backend/` and fix any issues

## 5. Frontend — Schema Sync and Codegen

- [x] 5.1 Run `npm run codegen:sync-schema` in `frontend/` to pull the updated schema
- [x] 5.2 Run `npm run codegen` in `frontend/` to regenerate typed composables and mutation types

## 6. Frontend — Composable

- [x] 6.1 Add `isVoiceInput` parameter to `submit()` in `useCreateTransactionFromText.ts`
- [x] 6.2 Pass `isVoiceInput` in the mutation variables: `mutate({ input: { text, isVoiceInput } })`

## 7. Frontend — AgenticInput

- [x] 7.1 In `AgenticInput.vue`, add an internal `isLastInputVoice` ref, set to `true` in the `onTranscript` callback and `false` when the user types (on `update:modelValue`)
- [x] 7.2 Emit `submit` with the boolean payload: `emit("submit", isLastInputVoice.value)`

## 8. Frontend — Transactions View

- [x] 8.1 Update `handleCreateTransactionFromText` in `Transactions.vue` to accept the boolean payload from the `submit` event
- [x] 8.2 Forward the flag to `createTransactionFromTextSubmit(isVoiceInput)`

## 9. Frontend — Validation

- [x] 9.1 Run `npm run typecheck` and `npm run format` in `frontend/` and fix any issues

## Constitution Compliance

- **Schema-Driven Development**: Schema updated first (task 1.1), codegen runs in both packages before implementation (tasks 1.2, 5.1, 5.2) — compliant
- **Backend Layer Structure**: Flag flows Resolver → Service; resolver does not implement business logic — compliant
- **Test Strategy**: Service test updated to cover both branches (task 2.3); co-located with source — compliant
- **Code Quality Validation**: Full test suite and typecheck/format run for both packages (tasks 4.1, 4.2, 9.1) — compliant
