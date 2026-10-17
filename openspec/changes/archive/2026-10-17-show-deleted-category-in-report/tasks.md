# Tasks

## Code Style

Apply the rules in [docs/code-style.md](../../../docs/code-style.md) to all code written for this change.

## Testing

Use the `testing` skill for each new or modified test.

## 1. GraphQL Schema

- [x] 1.1 In `backend/src/graphql/schema.graphql`, add the type `ByCategoryReportEmbeddedCategory { id: ID!, name: String!, isArchived: Boolean! }` and replace `categoryId` and `categoryName` in `ByCategoryReportCategory` with `category: ByCategoryReportEmbeddedCategory`, as in design.md, and verify `npm run codegen` in `backend/` finishes and `src/__generated__/resolvers-types.ts` contains `ByCategoryReportEmbeddedCategory`

## 2. Backend Service Tests (write first, expect failure)

- [x] 2.1 In `backend/src/services/by-category-report-service.test.ts`, replace every `findOneById` mock with categories given to `findManyWithArchivedByUserId`, and replace `categoryName` and `categoryId` assertions with `category` assertions (`category: undefined` for transactions without a category)
- [x] 2.2 Replace the test "treats deleted categories as Uncategorized" with a test that an archived category with transactions gives a group whose `category` has the archived category's `id`, `name`, and `isArchived: true`
- [x] 2.3 Add a test that an active category and an archived category with the same name give two groups, and only the archived one has `isArchived: true`
- [x] 2.4 Add a test that a transaction whose category ID has no record joins the group of transactions without a category, so the report has one group with `category: undefined` and the combined transaction count
- [x] 2.5 Change the test "sorts categories alphabetically by name" so that groups with a category sort by name and the group without a category is last
- [x] 2.6 Run `npm test -- src/services/by-category-report-service.test.ts` in `backend/` and verify the new and changed tests fail because the service still returns `categoryName`

## 3. Backend Service

- [x] 3.1 In `backend/src/services/by-category-report-service.ts`, replace `categoryId` and `categoryName` in the `ByCategoryReportCategory` interface with `category?: Category`, build a category map from the `findManyWithArchivedByUserId` result, group transactions by the ID of the found category, and sort groups by name with the group without a category last, as in design.md
- [x] 3.2 Remove `UNCATEGORIZED_LABEL`, the per-group `findOneById` call, and the parameters and `async` that this change makes unused, and verify `grep` finds no `UNCATEGORIZED_LABEL` or `findOneById` in the service
- [x] 3.3 Run `npm test -- src/services/by-category-report-service.test.ts` in `backend/` and verify all tests pass
- [x] 3.4 Run `npm test`, `npm run typecheck`, and `npm run format` in `backend/` and verify all finish without errors

## 4. Frontend Report Table

- [x] 4.1 Run `npm run codegen:sync-schema` in `frontend/` and verify `src/schema.graphql` contains `ByCategoryReportEmbeddedCategory`
- [x] 4.2 In `frontend/src/graphql/queries.ts`, replace `categoryId` and `categoryName` in `GET_BY_CATEGORY_REPORT` with `category { id name isArchived }`, and verify `npm run codegen` in `frontend/` finishes without errors
- [x] 4.3 In `frontend/src/components/reports/CategoryBreakdownTable.vue`, show the row header in three states (italic `t("common.uncategorized")`, archived name with `text-decoration-line-through text-medium-emphasis` plus `title`, plain name), sort by the shown label, and key rows by `category?.id ?? "uncategorized"`, as in design.md
- [x] 4.4 Run `npm test`, `npm run typecheck`, and `npm run format` in `frontend/` and verify all finish without errors

## 5. Manual Verification

- [x] 5.1 In the running app, delete a category with expenses in the viewed month, and verify the monthly and yearly reports show its name with strikethrough, the hint "Deleted category" on hover, and a separate row for an active category with the same name
- [x] 5.2 Switch the language to German and verify the row of expenses without a category reads "Unkategorisiert" and sorts by that label when sorted by category

## Constitution Compliance

- **Schema-Driven Development**: Complies. Group 1 changes the schema first, codegen runs in both packages
- **Backend GraphQL Layer**: Complies. The new type exposes only business fields, the frontend owns the display label
- **Backend Layer Structure**: Complies. The logic stays in the service, the resolver does not change
- **Backend Port Interfaces**: Complies. The service uses the existing `findManyWithArchivedByUserId` port method
- **Soft-Deletion**: Complies. Reading archived categories is intentional, they name past transactions only
- **Result Pattern**: Complies. `call` keeps its `Result` return type
- **Frontend Code Discipline**: Complies. The table uses Vuetify utility classes, no custom CSS
- **Test Strategy**: Complies. Service tests with mocked repositories are written first and stay co-located, no frontend tests
- **Code Quality Validation**: Complies. Groups 3 and 4 run tests, typecheck, and format in the required order
