## Context

Two service files (`by-category-report-service.ts`, `insight-service.ts`) validate
year inputs against a ±100-year window anchored to the current date. The same constant
is duplicated in the frontend (`dateValidation.ts`). Year values enter the system
exclusively through date pickers, which cannot produce out-of-bounds values.
`Number.isInteger(year)` already guards against NaN, floats, and coerced strings.

## Goals / Non-Goals

**Goals:**

- Remove the `YEAR_RANGE_OFFSET` constant from backend and frontend
- Simplify year validation to `Number.isInteger(year)` only
- Delete test cases that exist solely to exercise the ±100 bound

**Non-Goals:**

- Changing or removing other date validation (month 1–12, start ≤ end, 365-day cap)
- Changing how year values are collected from users (date pickers remain unchanged)
- Any GraphQL schema changes

## Decisions

### Keep `Number.isInteger` as the sole year guard

Alternatives considered:

- **Keep ±100 with a smaller offset (e.g., ±10)**: Still arbitrary and still
  unsolvable in practice — a date picker can't produce years outside any reasonable
  range. Adds no value.
- **Add a fixed lower bound (e.g., year ≥ 1900)**: Unnecessary constraint for a
  personal finance app with no historical data pre-dating modern bookkeeping.
- **Remove all year validation**: `Number.isInteger` stays because GraphQL passes
  years as plain integers and TypeScript strict mode doesn't prevent runtime coercion
  at JSON parse boundaries. Keeping it is free and defensive.

### No migration required

This is a relaxation of a validation rule, not a breaking change. No existing valid
request is rejected by this change. No client code needs to be updated.

## Risks / Trade-offs

- **Malformed API calls with extreme years (e.g., year 9999)**: An authenticated user
  can now query year 9999. The database query will return zero results — no data
  corruption, no security issue. Acceptable.
- **Unix timestamp used as year (e.g., 1742000000)**: `Number.isInteger` still
  catches this only if it's passed as a non-integer; if someone deliberately sends a
  large integer year, they'll just get empty results.

Neither risk is meaningful for a personal finance app where all users access only
their own data.

## Constitution Compliance

- **Input Validation**: Services retain `Number.isInteger` — the meaningful guard.
  Removing a redundant range check is consistent with the principle that format/range
  validation is only mandatory when it _has business importance_.
- **Code Quality Validation**: All changed files pass tests, typecheck, and lint
  before completion.
- **Backend Layer Structure**: Validation stays in the service layer; no
  responsibility changes.
