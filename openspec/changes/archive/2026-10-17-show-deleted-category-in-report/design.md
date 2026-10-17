# Design

## Context

See proposal.md - Why.

Current data flow of the category breakdown:

```
ByCategoryReportService.call
  -> categoryRepository.findManyWithArchivedByUserId(userId)   // used only to find excluded categories
  -> group transactions by categoryId
  -> per group: categoryRepository.findOneById({ id, userId })  // returns null for archived categories
     -> null -> categoryName = UNCATEGORIZED_LABEL ("Uncategorized")
  -> sort groups by categoryName
report resolver -> returns the service result as it is
CategoryBreakdownTable.vue -> shows categoryName, italic when categoryId is empty
```

Facts that shape the approach:

- The service already loads all categories of the user, archived ones included
- The resolver does not map the report, GraphQL default resolvers read the service output
- The `Category` model has the getters `id`, `name`, and `isArchived`
- `TransactionCard.vue` already shows archived categories with a strikethrough, a `title`, and an `aria-label`
- The locale keys `common.uncategorized` and `transactions.deletedCategory` exist in all locales
- Only `CategoryBreakdownTable.vue` reads `categoryId` and `categoryName` in the frontend

## Goals / Non-Goals

**Goals:**

- One read of categories per report, no lookup per group
- The API sends data only, the frontend owns all display labels

**Non-Goals:**

- A change to the excluded category filter
- A change to the resolver
- A new repository method
- Frontend component tests

## Decisions

### New GraphQL type `ByCategoryReportEmbeddedCategory`

```graphql
type ByCategoryReportEmbeddedCategory {
  id: ID!
  name: String!
  isArchived: Boolean!
}

type ByCategoryReportCategory {
  category: ByCategoryReportEmbeddedCategory
  currencyBreakdowns: [ByCategoryReportCurrencyBreakdown!]!
  topTransactions: [Transaction!]!
  totalTransactionCount: Int!
}
```

`category` is `null` for transactions without a category. The fields `categoryId` and `categoryName` go away with no deprecation period.

Alternatives:

- Reuse `TransactionEmbeddedCategory`. Rejected: it belongs to `Transaction`, the two parent types can change apart
- Keep `categoryId` and `categoryName` and add `isCategoryArchived`. Rejected: the backend still sends a display label for uncategorized transactions, so issue #730 stays open
- Deprecate the old fields first. Rejected: the only client is the frontend of this project, it deploys with the backend

### Service reads names from the loaded category list

`ByCategoryReportService` builds a `Map<string, Category>` from the result of `findManyWithArchivedByUserId`. The same list still gives the set of excluded category IDs.

Grouping changes:

- The group key is the ID of the found category, or `undefined` when the transaction has no category or its category has no record
- A transaction with a category ID that has no record joins the group without a category, so the report has no second uncategorized row
- Each group gets `category: Category | undefined`, GraphQL sends `undefined` as `null`

The service interface `ByCategoryReportCategory` replaces `categoryId` and `categoryName` with `category?: Category`. GraphQL default resolvers read `id`, `name`, and `isArchived` from the model getters, as for `Transaction.category`.

Remove `UNCATEGORIZED_LABEL`, the per-group `findOneById` call, and the `userId` parameter of `groupByCategoryAndCurrency` if no other use remains. The method no longer needs to be `async`.

Sort order: groups with a category sort by `category.name` with `localeCompare`, the group without a category is last. The frontend sorts again, so this order only keeps the API output stable.

Alternatives:

- Keep `findOneById` and add a finder that includes archived records. Rejected: one database read per group, and the needed data is already in memory
- Return a separate plain object `{ id, name, isArchived }` from the service. Rejected: the model already has these fields, and `Transaction.category` returns the model the same way
- Keep a separate row for a category ID with no record. Rejected: it shows two "Uncategorized" rows with the same frontend key, which is the defect from issue #729

### Frontend row header has three states

In `CategoryBreakdownTable.vue`:

- `category == null`: `<em class="text-h6">`
- `category.isArchived`: `<span class="text-h6 text-decoration-line-through text-medium-emphasis">` with `title` set to `t("transactions.deletedCategory")`
- Otherwise: `<span class="text-h6">`

A helper `getCategoryLabel(row)` returns `row.category?.name ?? t("common.uncategorized")`. All three states show this label, and the alphabetical sort compares these labels with `localeCompare`. `getCategoryKey` returns `category.category?.id ?? "uncategorized"`.

The strikethrough uses Vuetify utility classes. `TransactionCard.vue` uses custom CSS for the same look, but the constitution asks to prefer framework styles.

Alternatives:

- Copy the `.category-archived` CSS from `TransactionCard.vue`. Rejected: Vuetify utility classes give the same result with no custom CSS
- Extract a shared component for the archived name. Rejected: two call sites with different markup, no need for an abstraction

### Codegen order

1. Edit `backend/src/graphql/schema.graphql`
2. Run `npm run codegen` in `backend/`
3. Run `npm run codegen:sync-schema` and then `npm run codegen` in `frontend/`

## Risks / Trade-offs

- [A browser keeps an old frontend in its cache, the report query asks for removed fields and fails] → The error goes away after a page reload. The project accepts this for a single-client API
- [A category ID with no record joins the uncategorized row, the user does not see that a category is missing] → Soft-deletion makes this case practically impossible. The transactions still count in the totals
- [The strikethrough style in the report differs a little from the style on transaction cards] → Both use strikethrough and lower emphasis. A later change can move `TransactionCard.vue` to the same utility classes

## Migration Plan

No data migration. Deploy the backend and the frontend together as usual. Roll back by redeploying the previous versions of both packages.

## Constitution Compliance

- **Schema-Driven Development**: Complies. The change starts with `schema.graphql`, codegen runs in both packages
- **Backend GraphQL Layer**: Complies. The new type exposes only business fields, the display label moves to the frontend
- **Backend Layer Structure**: Complies. The logic stays in the service, the resolver does not change
- **Backend Port Interfaces**: Complies. The service uses the existing `findManyWithArchivedByUserId` port method
- **Vendor Independence**: Complies. No new query pattern, one fewer database read per group
- **Soft-Deletion**: Complies. Reading archived categories is intentional, they name past transactions only
- **Result Pattern**: Complies. `call` keeps its `Result` return type
- **Frontend Code Discipline**: Complies. The table uses Vuetify utility classes, no custom CSS
- **Test Strategy**: Complies. Service tests use mocked repositories, no frontend tests
- **Code Quality Validation**: Complies. Tests, typecheck, and format run in both packages
