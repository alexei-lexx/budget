## Issue

[#729: deleted category shown as "Uncategorized" in reports](https://github.com/alexei-lexx/budget/issues/729)

A user creates the expense category "Food" and adds a transaction to it. Then the user deletes "Food". The expense report shows the "Food" spending in a row named "Uncategorized". This row is separate from the row of transactions that have no category. The report can show two "Uncategorized" rows.

[#730: expense report shows "Uncategorized" in English for all languages](https://github.com/alexei-lexx/budget/issues/730)

The row of transactions without a category shows "Uncategorized" in all languages. In German it must show "Unkategorisiert".

## Why

The report hides where the money went when a category is deleted. The report service gets each category name with a finder that skips deleted categories. It then uses the fixed English label "Uncategorized" as a fallback. The backend sends this label as text, so the frontend cannot translate it.

## What Changes

- A deleted category shows in the report under its own name
- The name of a deleted category has strikethrough styling, the same as on transaction cards
- An active category and a deleted category with the same name show as two rows, only the deleted one has strikethrough
- The row of transactions without a category shows the "Uncategorized" label in the language of the user
- **BREAKING**: In the GraphQL type `ByCategoryReportCategory`, a new field `category` replaces the fields `categoryId` and `categoryName`
  - `category` is a new embedded type with `id`, `name`, and `isArchived`
  - `category` is `null` for transactions without a category
- The backend does not send the "Uncategorized" label, the frontend shows its translated label

Out of scope:

- Changes to trends, the MCP server, and the AI assistant, they already get deleted categories
- A deprecation period for the removed fields

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reports`: the category breakdown shows deleted categories under their own name with strikethrough styling, and shows the "Uncategorized" label in the language of the user

## Impact

- `backend/src/graphql/schema.graphql`: new embedded category type, `ByCategoryReportCategory` fields change
- `backend/src/services/by-category-report-service.ts`: category names come from the list of all categories that the service already reads, the per-category lookup and the "Uncategorized" label go away
- `backend/src/services/by-category-report-service.test.ts`: tests for deleted categories and transactions without a category
- `frontend/src/schema.graphql` and generated types: sync after the schema change
- `frontend/src/graphql/queries.ts`: the report query asks for the new field
- `frontend/src/components/reports/CategoryBreakdownTable.vue`: the row header shows the translated "Uncategorized" label, the strikethrough name, or the plain name, and sorts by the shown name
- An old frontend that a browser keeps in its cache gets an error on the report page after the backend deploy, until the page reloads
- No data migration

## Constitution Compliance

- **Schema-Driven Development**: Complies. The change starts with the GraphQL schema, codegen follows in both packages
- **Backend GraphQL Layer**: Complies. The new type exposes only business fields, the frontend owns the display label
- **Backend Layer Structure**: Complies. The service keeps the business logic, the resolver does not change
- **Vendor Independence**: Complies. The service uses an existing repository method, no new query pattern
- **Soft-Deletion**: Complies. Deleted categories stay hidden in category lists, the report shows them only to name past transactions
- **UI Guidelines**: Complies. The strikethrough styling repeats the existing pattern on transaction cards
- **Frontend Code Discipline**: Complies. The table uses Vuetify utility classes, no custom CSS
- **Test Strategy**: Complies. Service tests use mocked repositories, no frontend tests are required
