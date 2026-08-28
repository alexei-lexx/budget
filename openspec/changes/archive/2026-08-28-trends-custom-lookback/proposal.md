## Why

The Trends page only offers lookback values of 3, 6 or 12 periods. A user cannot compare the running period against just the previous one. Any lookback from 1 to 12 lets the user pick the comparison window they need, including a simple prev-period comparison.

## What Changes

- Extend the lookback from the fixed choices (3, 6, 12) to any integer from 1 to 12, on both period types (Week, Month).
- Keep the existing 3/6/12 button-toggle for quick picks, and add a dropdown select listing 1-12 alongside it for any other value. Both controls edit the same lookback; each reflects the current value, and picking one updates the other.
- Update backend validation to accept any integer lookback from 1 to 12 instead of the fixed set.
- Keep the default lookback at 3 completed periods; only the set of selectable values changes.
- The frontend continues to silently fall back to the default of 3 for a missing or out-of-range `lookback` found in the URL, before any request reaches the backend — unchanged behavior.
- The backend continues to reject an out-of-range or non-integer `lookback` with an error (unchanged failure behavior); only the accepted range moves from {3, 6, 12} to 1-12, and the error message updates to match.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trends`: the lookback requirement changes from a fixed set of {3, 6, 12} to any integer from 1 to 12.

## Impact

- `backend/src/services/expense-trend-service.ts`: replace the `ALLOWED_LOOKBACKS` fixed-set check with a 1-12 range check.
- `frontend/src/components/reports/TrendFilters.vue`: keep the lookback `v-btn-toggle` (3, 6, 12) and add a `v-select` listing 1-12, both bound to the same draft lookback value.
- `frontend/src/views/Trends.vue`: replace the `LOOKBACK_OPTIONS` fixed-set check used for URL restore with a 1-12 range check.
- No GraphQL schema change: `ExpenseTrendInput.lookback` is already a plain `Int`.

## Constitution Compliance

- **Backend Service Layer / Input Validation**: the service layer keeps owning the lookback range check (business rule), GraphQL schema stays a thin `Int`. Compliant.
- **Frontend Code Discipline**: the picker uses Vuetify's `v-btn-toggle` and `v-select` components, no custom CSS. Compliant.
- **Test Strategy**: backend service tests cover the new validation boundary; frontend change is manually verified. Compliant.
- No other constitution principles are affected by this change.
