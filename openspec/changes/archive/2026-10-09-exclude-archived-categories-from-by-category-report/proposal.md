## Why

The by-category report ignores the "Exclude from reports" flag on deleted (archived) categories. Their transactions still appear in the report totals. They show up in the breakdown as an "Uncategorized" row. The report builds its exclusion list from active categories only.

## What Changes

- The by-category report omits transactions of every category marked "Exclude from reports". This applies to active and deleted categories alike.

Out of scope:

- How deleted categories that are not excluded appear in the report. They keep their current behavior.
- The trends report, the aggregate transactions service, and the MCP tools. They already handle deleted excluded categories.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reports`: The "Excluded Category Filtering in Reports" requirement now states that it covers deleted categories.

## Impact

- `backend/src/services/by-category-report-service.ts`: build the exclusion list from all categories, including archived ones.
- `backend/src/services/by-category-report-service.test.ts`: a regression test for a deleted excluded category.
- No GraphQL schema change. No frontend change. No data migration.

## Constitution Compliance

- **Backend Layer Structure**: Complies. The fix stays in the service.
- **Backend Port Interfaces**: Complies. The service uses the existing `CategoryRepository` port method `findManyWithArchivedByUserId`.
- **Soft-Deletion**: Complies. Reading archived records here is intentional. The exclusion flag must hold for historical data.
- **Result Pattern**: Complies. The service keeps its `Result` return type.
- **Test Strategy**: Complies. A service test with mocked repositories covers the fix.
