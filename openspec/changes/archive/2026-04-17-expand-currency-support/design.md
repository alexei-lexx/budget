## Context

The backend currently exposes a fixed list of two currencies via `Query.supportedCurrencies`. The resolver at `backend/src/graphql/resolvers/account-resolvers.ts` returns `Array.from(SUPPORTED_CURRENCIES)` (defined in `backend/src/types/validation.ts` as `["EUR", "USD"]`). The frontend consumes the list via `useCurrencies()` and renders a `v-select` in `AccountForm.vue`. The schema defines the query as unauthenticated (no `getAuthenticatedUser` call in the resolver).

The multi-currency model is already in place: accounts have a `currency: String!` field, balances are not converted across currencies, and the service layer validates currency membership on create/update via `AccountService.validateCurrency`.

Constraint from the issue: no GraphQL schema changes; the frontend must work with `supportedCurrencies: [String!]!` as-is.

## Goals / Non-Goals

**Goals:**

- Expose the full ISO 4217 currency set to users.
- Put currencies the user already uses at the top of the selector so picking in new/edit dialogs is fast.
- Make the selector searchable — scrolling ~180 items is unusable on mobile.
- Keep the GraphQL contract stable.
- Keep the backend as the single source of truth for the ordered list; the frontend stays dumb.

**Non-Goals:**

- Currency conversion / exchange rates.
- Per-user currency preferences beyond what can be inferred from existing accounts.
- Localization of currency display text beyond what `Intl` provides by default.
- Historical currencies (e.g. DEM, FRF) — only the active ISO 4217 set.

## Decisions

### Decision 1: Source the currency list from `Intl.supportedValuesOf("currency")`, owned by a new `types/currency.ts` module

**Choice:** Create `backend/src/types/currency.ts` as a small primitive module alongside the existing `types/date.ts`, `types/pagination.ts`, and `types/result.ts`:

```ts
// backend/src/types/currency.ts
export const SUPPORTED_CURRENCIES: readonly string[] =
  Intl.supportedValuesOf("currency");

export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.includes(code);
}
```

No normalization. ISO 4217 codes are canonical — uppercase, three letters, no whitespace. `AccountService.validateCurrency` imports `isSupportedCurrency` and performs a strict membership check against the input as provided. A client that sends `"usd"` or `" USD "` gets the same `UnsupportedCurrency` Result failure as `"XYZ"` — the burden is on the caller to send a valid ISO 4217 code.

Remove the `SUPPORTED_CURRENCIES = ["EUR", "USD"]` export from `backend/src/types/validation.ts`. `CurrencyService` imports `SUPPORTED_CURRENCIES` from the new `types/currency.ts` module.

**Why a `types/` module (not `models/`, not a service):**

- Currency is not an entity — no ID, no persistence, no repository, no CRUD. `models/` holds entities (`Account`, `Transaction`, `Category`, `User`) that map to DynamoDB records.
- `types/` already holds cross-cutting primitives (`date.ts`, `result.ts`, `pagination.ts`, `validation.ts`). Currency fits the pattern.
- Putting `isSupportedCurrency` in a service would force `AccountService` to depend on another service just for a static membership check. Overkill for pure data.

**Break with the old behavior (intentional):** The current `AccountService.validateCurrency` tolerates lowercase and surrounding whitespace via `currency.trim().toUpperCase()`. The new check is strict — callers must send canonical ISO 4217 codes. The frontend already submits canonical codes (they come from `supportedCurrencies`). The Langchain tool descriptions already document `currency` as "an ISO 4217 code". Invalid/non-canonical input will be surfaced as a Result failure the caller can correct.

**Why `Intl.supportedValuesOf("currency")` (not a hard-coded array):**

- Zero maintenance. No recurring obligation to track ISO 4217 amendments.
- Alphabetically sorted by the runtime — satisfies the "rest alphabetical" ordering with no extra work.
- Available in Node 18+ (our runtime) and all modern browsers if the frontend ever needs the same data.

**Trade-offs accepted:**

- The returned set (~300 codes) includes historical currencies (FRF, DEM, SUR, ADP). A user searching for "franc" will see FRF alongside CHF. Acceptable: typing narrows the list quickly, and a user's actual currencies are pinned to the top via personalization.
- The exact set depends on the Node/ICU version. Node is pinned at deploy time (infra-cdk); runtime drift is intentional and reviewable.

**Alternatives considered:**

- Hard-coded active-only list (~180 codes). Rejected — recurring maintenance for no functional benefit; historical codes are harmless in practice.
- npm `currency-codes`. Rejected — extra dependency for data the runtime already exposes.
- Keep `SUPPORTED_CURRENCIES` in `types/validation.ts`. Rejected — `validation.ts` is about form-field constants (description max length, name length, search min length), not currency semantics. Splitting into a dedicated module keeps each file coherent.
- Put the list inside `CurrencyService` and have `AccountService` call `currencyService.isSupported(code)`. Rejected — service-to-service dependency for a static set is overkill.

### Decision 2: Backend owns the personalized ordering

**Choice:** Introduce a single-purpose `CurrencyService` with a `getSupportedCurrencies({ userId })` method. The existing `supportedCurrencies` resolver becomes authenticated, extracts the user from context, and delegates to the service.

Ordering rule:

```
[ sortedUnique(userAccountCurrencies), ...rest alphabetical ]
```

where `userAccountCurrencies` is pulled from `AccountRepository.findManyByUserId` (active accounts only), deduplicated, and sorted alphabetically. `rest` is `SUPPORTED_CURRENCIES` (from `types/currency.ts`) minus the user's currencies, alphabetical by virtue of the source being alphabetical.

**Alternatives considered:**

- Compute ordering in the frontend by combining `supportedCurrencies` with `accounts`. Rejected — bakes business logic into the UI and duplicates the rule in every consumer (account form today, potentially others later).
- Extend `AccountService` with this method. Rejected — the concern is about the currency list, not accounts; `AccountService` would gain an unrelated public method. A single-purpose `CurrencyService` keeps the domain boundary clean (per the constitution's service-layer rules).

**Rationale:** Personalization is business logic; business logic belongs in the service layer. Single source of truth — the resolver returns a fully-ordered list, the frontend renders it as-is and uses `list[0]` as the default. Satisfies the issue's requirement "first of these account currencies is selected" without a frontend override.

### Decision 3: `supportedCurrencies` resolver becomes authenticated

**Choice:** Change the resolver to call `getAuthenticatedUser(context)` (matching the pattern in the sibling `accounts` resolver) and pass `user.id` to `CurrencyService`.

**Rationale:** The response is now user-scoped data. Per the constitution's Authentication & Authorization rule, user-scoped queries must authenticate at the resolver boundary. Unauthenticated callers receive a standard auth error — same behavior as `accounts`.

**Risk:** Any client that previously called this query without a token would break. Impact is zero in practice: the frontend already attaches the JWT to every GraphQL request (shared Apollo link), and there are no other clients.

### Decision 4: `v-autocomplete` replaces `v-select` in `AccountForm.vue`

**Choice:** Swap the component; keep the same `:items`, `v-model`, `:rules`, `:loading` bindings. Vuetify's `v-autocomplete` filters items by typed text out of the box.

**Alternatives considered:**

- `v-combobox` — allows free-text entry. Rejected; we want a closed set.
- Custom virtualized list — over-engineering for ~180 items.

**Rationale:** Matches the Frontend Code Discipline principle (prefer framework components).

### Decision 5: Drop the static symbol/name tables; use `Intl`

**Choice:** Remove `CURRENCY_SYMBOLS` and `CURRENCY_NAMES` from `frontend/src/utils/currency.ts`. Rewrite `getCurrencySymbol` to use `Intl.NumberFormat(...).formatToParts()` with `currencyDisplay: "symbol"`. Rewrite `getCurrencyName` (if still used) to use `Intl.DisplayNames`. Fall back to the ISO code if the API throws or returns nothing.

**Example:**

```ts
export function getCurrencySymbol(code: string, locale?: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol",
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}
```

`currencyDisplay: "symbol"` returns the disambiguating form (`CA$`, `US$`) where applicable. `formatCurrency` is already implemented with `Intl.NumberFormat` — no change needed there beyond removing the static fallback paths that relied on the deleted maps.

**Alternatives considered:**

- Extending the static maps to 180 entries. Rejected — maintenance burden, localization regression.
- `currencyDisplay: "narrowSymbol"`. Rejected — ambiguous for shared-symbol currencies (every dollar shows `$`).

**Rationale:** `Intl` is built into the runtime, locale-aware, and already authoritative for formatting. Removing the static tables eliminates a drift vector.

### Decision 6: Generic Langchain tool descriptions

**Choice:** Update `backend/src/langchain/tools/create-account.ts` and `update-account.ts` to describe the `currency` parameter as `"Account currency — any ISO 4217 code (e.g. USD, EUR, GBP)."`. Drop the inline `SUPPORTED_CURRENCIES.join(", ")` enumeration.

**Rationale:** Inlining ~180 codes costs ~1K tokens per invocation for zero marginal signal to the model. The agent does not have a dedicated "list currencies" tool and will rely on its own ISO 4217 knowledge, which is strong for common codes. `AccountService.validateCurrency` catches invalid codes and returns a Result failure the agent can surface to the user — the same failure path that already handles typos today.

### Decision 7: Replace `"GBP"` in service tests

**Choice:** `backend/src/services/account-service.test.ts` currently uses `"GBP"` as the unsupported example at two call sites. GBP becomes valid; switch to `"INVALID"`.

**Rationale:** Smallest change that preserves the test intent (exercising the membership-check failure path). The service only checks membership, not code length, so `"INVALID"` is accepted as a string input and correctly rejected by validation.

## Risks / Trade-offs

- **Resolver becomes authenticated** → any unauthenticated caller would break. Mitigation: verified no non-frontend consumer exists; the frontend already authenticates every GraphQL call.
- **`Intl.supportedValuesOf("currency")` includes historical codes (FRF, DEM, SUR, ADP…)** → users will see them in the selector tail. Mitigation: acceptable — currencies the user actually uses are pinned to the top via personalization, and typing narrows the list quickly. No deprecation tag is exposed by the API, so active-vs-historical filtering would require its own maintained allowlist (avoided).
- **`Intl.supportedValuesOf("currency")` contents vary by Node/ICU version** → production and local runtimes may differ. Mitigation: Node version is pinned at deploy time (infra-cdk) and bumped deliberately; any code drift is captured in the snapshot of the constant at import.
- **`Intl.DisplayNames` / `Intl.NumberFormat` behavior varies across Node/browser locales** → symbol output may differ slightly by user locale. Mitigation: acceptable — locale-aware display is the desired behavior; the fallback returns the ISO code if the API misbehaves. No tests assert specific symbol text.
- **Langchain description change may reduce agent accuracy on obscure codes** → low likelihood; agent has access to the live list via `supportedCurrencies`. Mitigation: service validation catches any bad code.
- **Personalized ordering pushes work onto every `supportedCurrencies` call** → one extra `AccountRepository.findMany` per request. The query is called only when the account form opens. Cost is negligible.

## Migration Plan

No data migration. The change is forward-only: existing accounts' currencies (EUR, USD) remain in the new expanded list. No rollback steps beyond reverting code.

Deployment order: backend then frontend (standard). No breaking intermediate state — the frontend continues to render whatever list the backend returns, so deploying backend first is safe.

## Open Questions

None outstanding — all decisions are committed.

## Constitution Compliance

- **Schema-Driven Development** — no schema change; existing query signature is preserved.
- **Backend Layer Structure** — new single-purpose `CurrencyService` sits in the service layer; resolver stays thin; repository access goes through the existing `AccountRepository`. Matches the "Single-Purpose Services" pattern (one public method, orchestrates multiple sources).
- **Backend GraphQL Layer** — resolver authenticates and delegates; no DB access at the GraphQL layer.
- **Authentication & Authorization** — `supportedCurrencies` becomes authenticated; user ID is resolved from the JWT via `getAuthenticatedUser` and never trusted from input.
- **Input Validation** — `AccountService.validateCurrency` continues to reject out-of-set codes. Validation ordering (auth → cheap checks → DB checks) is unchanged.
- **Test Strategy** — new `currency-service.test.ts` uses mocked `AccountRepository`; existing `account-service.test.ts` updated for the new invalid example. Backend test files are co-located per the constitution.
- **Frontend Code Discipline** — `v-autocomplete` is a built-in Vuetify component; no custom UI primitives introduced.
- **TypeScript Code Generation** — no non-null assertions, no `as any`. Service method takes a single keyword-argument object (one argument today; positional is also acceptable per the 0–2 rule).
