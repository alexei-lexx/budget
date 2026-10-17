## Context

`AccountService.updateAccount` already blocks a currency change while the account has transactions. It calls `TransactionRepository.hasTransactionsForAccount`. `CategoryService` has no access to transactions today. Its only dependency is `CategoryRepository`.

All callers of `updateCategory` pass through the service: the GraphQL resolver, the MCP tool, and the AI assistant tool. The resolver turns a `Failure` into a `GraphQLError`. The frontend shows that message in a snackbar.

## Goals / Non-Goals

**Goals:**

- Enforce the rule in the service so every caller gets it
- Follow the account currency pattern

**Non-Goals:**

- A change to `hasTransactionsForAccount`
- A frontend change

## Decisions

### Check in `CategoryService.updateCategory`

Inject the `TransactionRepository` port into `CategoryServiceImpl`. In `updateCategory`, compare the old and new type. If the type changes, call `hasTransactionsForCategory`. If it returns `true`, return a `Failure`.

The check runs after the ownership lookup, the model update, and the duplicate name check. It is a database-dependent check, so it goes last.

Failure message: "Cannot change type of category with transactions"

Alternatives:

- Check in the `Category` model. Rejected: the model has no access to transactions
- A single-purpose service. Rejected: the rule is one extra check in an existing CRUD method

### New repository method `hasTransactionsForCategory`

Add `hasTransactionsForCategory({ categoryId, userId }): Promise<boolean>` to the `TransactionRepository` port. The DynamoDB adapter queries the user's partition. It filters by `categoryId` and `isArchived = false`.

The adapter pages through results with `ExclusiveStartKey`. It stops at the first page that has a match. DynamoDB applies the filter after it reads at most 1 MB per page. A single-page query can miss a match in a later page and return a wrong `false`.

Alternatives:

- Reuse `findManyByUserId` with a category filter. Rejected: it reads full records and needs a pagination input
- A new GSI on `categoryId`. Rejected: a schema change for a rare write path
- A single-page query, the same as `hasTransactionsForAccount`. Rejected: it can return a wrong `false` for users with many transactions

### No new error type

The failure is a plain `Failure` string. The account currency rule uses the same form.

## Risks / Trade-offs

- [The query reads the whole user partition in the worst case] → The check runs only when the type changes. Type changes are rare. It stops at the first match
- [`hasTransactionsForAccount` keeps the single-page limit] → Out of scope. A separate fix can apply the same paging

## Migration Plan

No data migration. Deploy the backend as usual. Roll back by redeploying the previous version.

## Constitution Compliance

- **Backend Layer Structure**: Complies. The rule is in the service. The query is in the repository
- **Backend Port Interfaces**: Complies. The service receives the `TransactionRepository` port. `dependencies.ts` wires the DynamoDB adapter
- **Vendor Independence**: Complies. The query is a filter on user, category, and archive flag. It is portable to SQL and NoSQL databases
- **Result Pattern**: Complies. The rule violation returns `Failure`. Database errors propagate as `RepositoryError`
- **Input Validation**: Complies. Ownership first, model validation second, database checks last
- **Soft-Deletion**: Complies. The query ignores archived transactions
- **Test Strategy**: Complies. The repository method is tested against the real database. The service rule is tested with mocked repositories
