## Issue

[#716: category type can change while transactions use it](https://github.com/alexei-lexx/budget/issues/716)

A user can change the type of a category that has transactions. For example, an expense category "Food" with an expense transaction can become an income category. The existing expense transaction then belongs to an income category.

## Why

The type change breaks the category type rule. Income categories must hold only income transactions. Expense categories must hold only expenses and refunds. The rule is checked only when a transaction is created or gets a category. `CategoryService.updateCategory` does not check for existing transactions. Reports then show wrong data: the transaction counts toward expenses but is grouped under an income category.

## What Changes

- The system rejects a category type change while the category has active transactions
- The failure message tells the user that the category has transactions
- A type change on a category with no active transactions still succeeds
- Name and "Exclude from reports" changes still succeed on a category with transactions
- The behavior matches how account currency changes are handled

Out of scope:

- Data repair of categories that already hold transactions of the wrong type
- Disabling the type field in the edit dialog. The backend failure shows in a snackbar, the same as for account currency changes

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `categories`: The "Category Editing" requirement now states that the type can change only while the category has no active transactions

## Impact

- `backend/src/ports/transaction-repository.ts`: a new port method `hasTransactionsForCategory`
- `backend/src/repositories/dyn-transaction-repository.ts`: the DynamoDB implementation of the new method
- `backend/src/repositories/dyn-transaction-repository.test.ts`: tests for the new method
- `backend/src/services/category-service.ts`: inject `TransactionRepository` and check for transactions on a type change
- `backend/src/services/category-service.test.ts`: tests for the new rule
- `backend/src/dependencies.ts`: wire `TransactionRepository` into `CategoryServiceImpl`
- All callers of `updateCategory` get the new failure: GraphQL resolver, MCP tool, and AI assistant tool
- No GraphQL schema change. No frontend change. No data migration

## Constitution Compliance

- **Backend Layer Structure**: Complies. The rule lives in the service. Data access stays in the repository
- **Backend Port Interfaces**: Complies. The service depends on the `TransactionRepository` port. The adapter is wired in `dependencies.ts`
- **Vendor Independence**: Complies. The new query is a filtered lookup by user, category, and archive flag. Any SQL or NoSQL database can reproduce it
- **Result Pattern**: Complies. The service returns a `Failure` for the business rule violation
- **Input Validation**: Complies. The transaction check is database-dependent, so it runs after the ownership check and the model validation
- **Soft-Deletion**: Complies. Archived transactions do not block the type change
- **Test Strategy**: Complies. Repository tests use the real database. Service tests use mocked repositories. Tests are co-located
