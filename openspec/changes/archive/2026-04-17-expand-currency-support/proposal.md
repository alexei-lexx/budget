## Issue

[#403 — add support of all currencies](https://github.com/alexei-lexx/budget/issues/403)

Currently only EUR and USD are available. Users holding accounts in other currencies cannot use the app. Expand to the full ISO 4217 set with a searchable selector that prioritizes currencies the user already uses.

## Why

Only two currencies are supported today (`SUPPORTED_CURRENCIES = ["EUR", "USD"]`). This blocks any user outside the Eurozone/US. Expanding to the full ISO 4217 list unblocks global usage without adding real complexity — amounts remain in their original currency (no conversion), matching the existing multi-currency model.

## What Changes

- Expand the supported currency list from `["EUR", "USD"]` to every ISO 4217 code exposed by the runtime via `Intl.supportedValuesOf("currency")` (~300 codes, including historical currencies such as FRF and DEM).
- Personalize the ordering of `supportedCurrencies` per user: currencies already used in the user's accounts appear first (deduplicated and sorted alphabetically), followed by the remaining codes (already alphabetical from `Intl.supportedValuesOf`).
- Introduce `backend/src/types/currency.ts` as the primitive module owning the supported-currency list (sourced from `Intl.supportedValuesOf("currency")`) and a strict membership check (`isSupportedCurrency`). `AccountService` validates incoming currency codes against this module without normalization — clients must send canonical ISO 4217 codes. A new `CurrencyService` (service layer) consumes the module plus `AccountRepository` to return the personalized ordering to the resolver. Schema and GraphQL contract unchanged.
- Swap the frontend `v-select` for `v-autocomplete` in the account form so users can type to filter a long list.
- Remove the hard-coded symbol/name maps in `frontend/src/utils/currency.ts`; derive symbol via `Intl.NumberFormat.formatToParts()` (mode `"symbol"`) and name via `Intl.DisplayNames`.
- Simplify Langchain tool descriptions for account create/update: stop enumerating every currency in the prompt — describe as "any ISO 4217 currency code (e.g. USD, EUR, GBP)". The agent relies on its own ISO 4217 knowledge; `AccountService` still validates membership and surfaces invalid codes as Result failures the agent can handle.
- Replace `"GBP"` with `"INVALID"` in the account-service unsupported-currency tests (GBP becomes valid).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `accounts`: expand the "Multi-Currency Support" requirement to the full ISO 4217 set and add a requirement for user-personalized ordering of the currency selector.

## Impact

- **Backend**
  - `backend/src/types/currency.ts` — new module exposing `SUPPORTED_CURRENCIES` (sourced from `Intl.supportedValuesOf("currency")` at module load) and `isSupportedCurrency(code)`. Test file co-located.
  - `backend/src/types/validation.ts` — remove the existing `SUPPORTED_CURRENCIES = ["EUR", "USD"]` export.
  - `backend/src/services/currency-service.ts` — new service returning the personalized ordered list per user. Test file co-located.
  - `backend/src/graphql/resolvers/account-resolvers.ts` — `supportedCurrencies` resolver now requires auth context and delegates to `CurrencyService`; no longer imports `SUPPORTED_CURRENCIES` directly.
  - `backend/src/services/account-service.ts` — `validateCurrency` calls `isSupportedCurrency` from `types/currency.ts` (no service-to-service dependency) and drops the existing `.trim().toUpperCase()` normalization. Clients must send canonical ISO 4217 codes.
  - `backend/src/services/account-service.test.ts` — rename invalid example from `GBP` to `INVALID`.
  - `backend/src/langchain/tools/{create,update}-account.ts` — generic descriptions; drop inline enumeration and the `SUPPORTED_CURRENCIES` import.
- **Frontend**
  - `frontend/src/components/accounts/AccountForm.vue` — `v-select` → `v-autocomplete`.
  - `frontend/src/utils/currency.ts` — drop static symbol/name tables; use `Intl.NumberFormat` / `Intl.DisplayNames`.
- **GraphQL**: no schema changes. Query signature unchanged (`supportedCurrencies: [String!]!`).
- **Data**: no migration required — the existing values (`EUR`, `USD`) remain valid under the expanded set.

## Constitution Compliance

- **Schema-Driven Development** — no schema change; existing query repurposed with richer semantics. Compliant.
- **Backend Layer Structure** — new `CurrencyService` sits in the service layer; resolver stays thin; `AccountRepository` is reused for account-currency lookup. Compliant.
- **Backend GraphQL Layer** — `supportedCurrencies` becomes authenticated (BFF pattern; user-scoped data). Compliant.
- **Authentication & Authorization** — personalization requires the authenticated user's internal ID; no cross-user data exposed. Compliant.
- **Input Validation** — `AccountService` continues to self-validate currency membership against `SUPPORTED_CURRENCIES`. Compliant.
- **Test Strategy** — unit tests added for `CurrencyService`; `AccountService` tests updated; frontend changes verified manually. Compliant.
- **Frontend Code Discipline** — `v-autocomplete` is a Vuetify primitive; no custom component. Compliant.
- **TypeScript Code Generation** — no `any`/non-null assertions introduced. Compliant.
