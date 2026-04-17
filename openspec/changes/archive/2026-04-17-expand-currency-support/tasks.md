## 1. Backend — Currency primitive module

- [x] 1.1 Write tests for `backend/src/types/currency.ts` in `currency.test.ts` — cover `SUPPORTED_CURRENCIES` is non-empty, includes `EUR`/`USD`, is alphabetical, and `isSupportedCurrency` returns `true` for known codes and `false` for `"INVALID"`, `"usd"`, `" USD "`
- [x] 1.2 Implement `backend/src/types/currency.ts` exporting `SUPPORTED_CURRENCIES` (sourced from `Intl.supportedValuesOf("currency")`) and `isSupportedCurrency(code)` with strict membership check
- [x] 1.3 Remove the `SUPPORTED_CURRENCIES = ["EUR", "USD"]` export from `backend/src/types/validation.ts`
- [x] 1.4 Update any imports of `SUPPORTED_CURRENCIES` from `types/validation.ts` to import from `types/currency.ts` instead (temporary — later tasks remove most of these)

## 2. Backend — AccountService currency validation

- [x] 2.1 Update `backend/src/services/account-service.test.ts` — replace the `"GBP"` unsupported-currency example with `"INVALID"` at both call sites; remove any tests asserting lowercase/whitespace normalization behavior
- [x] 2.2 Update `backend/src/services/account-service.ts` — `validateCurrency` imports `isSupportedCurrency` from `types/currency.ts`; drop the `.trim().toUpperCase()` normalization so input is checked as-is

## 3. Backend — CurrencyService

- [x] 3.1 Write `backend/src/services/currency-service.test.ts` with mocked `AccountRepository` — cover: user with multiple account currencies returns deduplicated sorted head plus remaining codes alphabetically; user with no accounts returns the full list alphabetically; head currencies are excluded from the tail; head is alphabetical among itself
- [x] 3.2 Implement `backend/src/services/currency-service.ts` exposing `getSupportedCurrencies({ userId })` — calls `AccountRepository.findManyByUserId`, deduplicates and alphabetizes the user's account currencies, then appends the rest of `SUPPORTED_CURRENCIES`

## 4. Backend — Wiring and GraphQL resolver

- [x] 4.1 Register `CurrencyService` in the backend service DI container / bootstrap wiring (follow the pattern used by other services)
- [x] 4.2 Update `backend/src/graphql/resolvers/account-resolvers.ts` — `supportedCurrencies` resolver calls `getAuthenticatedUser(context)`, delegates to `CurrencyService.getSupportedCurrencies({ userId })`, and no longer imports `SUPPORTED_CURRENCIES` directly

## 5. Backend — Langchain tool descriptions

- [x] 5.1 Update `backend/src/langchain/tools/create-account.ts` — drop the `SUPPORTED_CURRENCIES.join(", ")` enumeration; describe `currency` as `"Account currency — any ISO 4217 code (e.g. USD, EUR, GBP)."`; remove the unused `SUPPORTED_CURRENCIES` import
- [x] 5.2 Update `backend/src/langchain/tools/update-account.ts` — same change as 5.1

## 6. Frontend — Currency utilities

- [x] 6.1 Update `frontend/src/utils/currency.ts` — remove the static `CURRENCY_SYMBOLS` and `CURRENCY_NAMES` maps; rewrite `getCurrencySymbol` to use `Intl.NumberFormat(...).formatToParts()` with `currencyDisplay: "symbol"` and fall back to the ISO code on failure; rewrite `getCurrencyName` (if still used) to use `Intl.DisplayNames` with a code fallback
- [x] 6.2 Update any call sites affected by the signature or return-type change, and remove dead static-fallback code paths in `formatCurrency`

## 7. Frontend — Account form selector

- [x] 7.1 Update `frontend/src/components/accounts/AccountForm.vue` — swap `v-select` for `v-autocomplete` on the currency field; keep the existing `:items`, `v-model`, `:rules`, and `:loading` bindings
- [x] 7.2 Manually verify in the dev browser — new-account dialog pre-selects first personalized currency, edit dialog pre-selects account's currency, typing `JP` narrows to JPY, empty search shows empty state

## 8. Validation

- [x] 8.1 Backend — run `npm test` for changed files, then full `npm test`, then `npm run typecheck` and `npm run format`; fix all issues
- [x] 8.2 Frontend — run `npm run typecheck` and `npm run format`; fix all issues

## Constitution Compliance

- **Schema-Driven Development** — no schema change; `supportedCurrencies: [String!]!` signature is unchanged. Compliant.
- **Backend Layer Structure** — new `CurrencyService` lives in the service layer as a single-purpose service; resolver stays thin; `AccountRepository` is reused for the currency lookup. Compliant.
- **Backend GraphQL Layer** — resolver authenticates and delegates to the service; no direct DB access. Compliant.
- **Backend Service Layer** — `CurrencyService` follows the Single-Purpose Service pattern (one public method, orchestrates a repository plus a static list). Compliant.
- **Authentication & Authorization** — `supportedCurrencies` becomes authenticated; user ID is resolved from JWT via `getAuthenticatedUser`, never from input. Compliant.
- **Input Validation** — `AccountService.validateCurrency` continues to self-validate currency membership at the service boundary; cheap checks (membership) run before DB-dependent checks. Compliant.
- **Result Pattern** — `AccountService` continues to return `Result` failures for invalid currency codes; `CurrencyService` returns plain data (no domain-failure states). Compliant.
- **Test Strategy** — new `currency.test.ts` and `currency-service.test.ts` are co-located; `CurrencyService` tests mock `AccountRepository`; `AccountService` tests updated for the new invalid example; frontend changes verified manually. Compliant.
- **Frontend Code Discipline** — `v-autocomplete` is a built-in Vuetify component; no custom UI primitives introduced; `Intl` APIs replace static tables. Compliant.
- **TypeScript Code Generation** — no `as any`, no non-null assertions; `CurrencyService.getSupportedCurrencies` uses a keyword-argument object per the arguments rule. Compliant.
- **Code Quality Validation** — task 8 runs test / typecheck / format across backend and frontend. Compliant.
- **Method Ordering** — `CurrencyService` exposes a single public method; `AccountService` changes preserve existing method ordering. Compliant.
