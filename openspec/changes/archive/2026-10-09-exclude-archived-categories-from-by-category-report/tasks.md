## Code Style

Apply the rules in [docs/code-style.md](../../../docs/code-style.md) to all code written for this change.

## Testing

Use the `testing` skill for each new or modified test.

## 1. Backend Test (write first, expect failure)

- [x] 1.1 In `backend/src/services/by-category-report-service.test.ts`, switch the category mock used for the exclusion list from `findManyByUserId` to `findManyWithArchivedByUserId`
- [x] 1.2 Add a test: an archived category marked "exclude from reports" has transactions in the period. Its transactions are missing from `categories` and `currencyTotals`, and no "Uncategorized" row is created for them
- [x] 1.3 Run `npm test` in `backend/` and confirm the new test fails because the archived excluded transactions are still in the report

## 2. Backend Fix

- [x] 2.1 In `ByCategoryReportService.call`, load categories for the exclusion list with `findManyWithArchivedByUserId` instead of `findManyByUserId`
- [x] 2.2 Run `npm test`, `npm run typecheck` and `npm run lint` in `backend/` and confirm all pass

## 3. Manual Verification

- [x] 3.1 In the running app, mark a category "exclude from reports", then delete it. Open a report period where it has transactions. Confirm its transactions are missing from the totals and from the "Uncategorized" row

## Constitution Compliance

- **Backend Layer Structure**: Complies. The fix stays in the service.
- **Backend Port Interfaces**: Complies. The service uses the existing `findManyWithArchivedByUserId` port method.
- **Soft-Deletion**: Complies. Reading archived categories is intentional. The exclusion flag must hold for historical data.
- **Result Pattern**: Complies. `call` keeps its `Result` return type.
- **Test Strategy**: Complies. The service test with mocked repositories is written first and kept co-located.
