# Research: Distinguish Refund and Income Transactions

**Branch**: `032-distinguish-transactions` | **Date**: 2026-03-07

## Unknowns Resolved

### 1. What visual indicator to use for REFUND?

**Decision**: Use Vuetify `info` color (blue).

**Rationale**:
- The existing `TransactionForm.vue` type toggle already uses `color="info"` for the Refund button icon — the form and card were inconsistent. Using `info` on the card aligns both surfaces.
- `info` is semantically appropriate: REFUND is a positive transaction (money comes back) but it's not "new" income — blue signals a distinct, informational category.
- Alternatives considered:
  - `warning` (orange) — rejected; better reserved for transfers (internal movements)
  - `secondary` / `primary` — rejected; these are UI theme colors, not semantic transaction colors
  - Custom color — rejected; constitution mandates using Vuetify framework colors over custom CSS

### 2. Should TRANSFER types also get a distinct color?

**Decision**: Yes — use `warning` (orange/amber) for both TRANSFER_IN and TRANSFER_OUT.

**Rationale**:
- Currently TRANSFER_IN displays as `success` (green) and TRANSFER_OUT displays as `error` (red), making them look like income and expenses respectively. This is misleading since transfers are internal movements, not gains or losses.
- `warning` (orange/amber) signals "neutral alert" — transfers are neither new money nor lost money; they're internal redistributions.
- Both TRANSFER_IN and TRANSFER_OUT get the same color token because they are two sides of the same operation. The +/- sign in the amount already communicates direction.
- The `TransactionForm.vue` does not have TRANSFER type buttons (transfers use a separate form), so no form changes are needed for this color.
- Alternatives considered:
  - Keeping current green/red — rejected; misleads users into thinking transfers are income/expenses
  - Separate colors for IN vs OUT — rejected; the sign (+/-) already conveys direction; using two different colors adds complexity without clarity

### 3. Where should the type-to-color mapping live?

**Decision**: Centralize in `frontend/src/utils/transaction.ts` as `getTransactionTypeColor()`.

**Rationale**:
- `transaction.ts` already contains `isPositiveTransactionType()` — a similar type-based utility. Coloring belongs in the same file.
- The same color logic is currently duplicated (inline in TransactionCard, hardcoded in TransactionForm). One canonical source prevents future drift.
- The function takes a `TransactionType` and returns a string (Vuetify color name) — fully typed, no reactive overhead.
- Alternatives considered:
  - Keep inline in each component — rejected; duplicates the logic and was already the source of the current bug (card and form diverged)
  - Create a separate `transactionColors.ts` — rejected; overkill for one function; `transaction.ts` is the natural home

### 4. Does this require backend or schema changes?

**Decision**: No.

**Rationale**:
- The `type` field is already returned by the GraphQL API and is present on every transaction. No new fields, no schema changes, no codegen run needed.
- This is a pure presentation-layer fix.

### 5. WCAG AA compliance with Vuetify semantic colors?

**Decision**: Vuetify's built-in semantic tokens (`success`, `error`, `info`, `warning`) satisfy WCAG AA.

**Rationale**:
- Material Design 3 color system — which Vuetify 3 implements — specifies on-color contrast ratios that meet WCAG AA (≥4.5:1 for normal text, ≥3:1 for large text).
- No custom colors are introduced; this feature relies entirely on theme-managed tokens.
- Both light and dark themes are covered by Vuetify's token system.

## Summary Table

| Unknown | Decision | Rationale |
|---------|----------|-----------|
| REFUND color | `info` (blue) | Matches existing form icon; semantically distinct from income |
| TRANSFER color | `warning` (orange) for both IN/OUT | Neutral; not income or expense; sign conveys direction |
| Where to put mapping | `utils/transaction.ts` — `getTransactionTypeColor()` | Co-located with existing type utilities; eliminates duplication |
| Backend changes needed | None | `type` field already in API; pure UI fix |
| WCAG AA | Vuetify semantic tokens are compliant | Material Design 3 contrast system |
