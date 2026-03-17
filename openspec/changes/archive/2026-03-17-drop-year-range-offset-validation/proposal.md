## Why

Year inputs in this app come exclusively from date pickers, which cannot produce
out-of-range or malformed year values. The `YEAR_RANGE_OFFSET = 100` guard solves a
problem that cannot occur in practice and adds dead coordination weight between
frontend and backend.

## What Changes

- Remove `YEAR_RANGE_OFFSET` constant from `backend/src/types/validation.ts`
- Remove `YEAR_RANGE_OFFSET` constant from `frontend/src/utils/dateValidation.ts`
- Simplify `validateYear` in `by-category-report-service.ts` to check only
  `Number.isInteger(year)` (the meaningful guard)
- Simplify `isValidYearMonth` in `frontend/src/utils/dateValidation.ts` to check
  only integer year + month 1–12
- Remove `YEAR_RANGE_OFFSET` from `insight-service.ts` date validation; retain
  existing checks (start ≤ end, 365-day range cap)
- Remove corresponding test cases that exercise the ±100 bound

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `reports`: `validateYear` no longer rejects years outside current ± 100; integer
  check remains
- `insight`: individual date year bounds removed; start ≤ end and 365-day cap
  remain unchanged

## Impact

- `backend/src/types/validation.ts` — remove constant
- `backend/src/services/by-category-report-service.ts` — simplify `validateYear`
- `backend/src/services/by-category-report-service.test.ts` — remove ±100 test cases
- `backend/src/services/insight-service.ts` — remove ±100 year bounds check
- `backend/src/services/insight-service.test.ts` — remove ±100 test cases
- `frontend/src/utils/dateValidation.ts` — remove constant, simplify
  `isValidYearMonth`

## Constitution Compliance

- **Input Validation** — Service layer retains meaningful validation
  (`Number.isInteger`); removing a redundant range check does not violate the
  requirement that services self-validate business-relevant constraints.
- **Code Quality Validation** — All changed files must pass tests, typecheck, and
  lint before completion.
- **Backend Layer Structure** — No layer responsibility changes; validation stays in
  the service layer.
