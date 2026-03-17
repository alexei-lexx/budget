## 1. Backend

- [x] 1.1 Remove `YEAR_RANGE_OFFSET` constant from
      `backend/src/types/validation.ts`
- [x] 1.2 Simplify `validateYear` in `by-category-report-service.ts` to check only
      `Number.isInteger(year)` (remove the min/max bounds logic and the
      `YEAR_RANGE_OFFSET` import)
- [x] 1.3 Remove ±100 year bounds check from `insight-service.ts` date validation
      (remove `minimumYear`/`maximumYear` locals and the two `if` blocks that
      throw on out-of-range years; remove the `YEAR_RANGE_OFFSET` import)

## 2. Backend Tests

- [x] 2.1 Remove test cases in `by-category-report-service.test.ts` that assert
      rejection of years outside ±100 range; remove the `YEAR_RANGE_OFFSET` import
- [x] 2.2 Remove test cases in `insight-service.test.ts` that assert rejection of
      dates with years outside ±100 range; remove the `YEAR_RANGE_OFFSET` import

## 3. Frontend

- [x] 3.1 Remove `YEAR_RANGE_OFFSET` constant from
      `frontend/src/utils/dateValidation.ts`
- [x] 3.2 Simplify `isValidYearMonth` to check only `Number.isInteger(year)` and
      month 1–12 (remove the `currentYear` local and the two year-range conditions)

## 4. Validation

- [x] 4.1 Run `npm test` in `backend/` — all tests pass
- [x] 4.2 Run `npm run typecheck` and `npm run format` in `backend/`
- [x] 4.3 Run `npm run typecheck` and `npm run format` in `frontend/`

## Constitution Compliance

- **Input Validation**: Services retain `Number.isInteger` as the meaningful guard;
  removal of the ±100 range check is consistent with the principle that range
  validation is only mandatory when it has business importance.
- **Code Quality Validation**: Steps 4.1–4.3 fulfill the mandatory validation
  pipeline (tests → typecheck → lint/format).
- **Test Strategy**: Test files are updated, not deleted — only the test cases
  specific to the removed constraint are removed.
