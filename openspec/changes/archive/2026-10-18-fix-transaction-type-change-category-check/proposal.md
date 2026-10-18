## Issue

[#717: transaction type change skips category type check](https://github.com/alexei-lexx/budget/issues/717)

A user creates an expense transaction in the expense category "Food". Then a client changes the type of the transaction to income and does not send the category, for example through the MCP `update_transaction` tool. The update is saved. The income transaction stays in the expense category "Food".

## Why

Income categories must hold only income transactions, and expense categories must hold only expenses and refunds. The transaction model checks the category type only when a new category comes with the update. When the update keeps the current category, the model has no category to check, so a type change skips the check.

## What Changes

- A type change that keeps the current category is rejected when the new type does not match the category type
- The error is the same category type mismatch error as for an update that sends the category
- The check applies also when the current category is deleted
- A type change that keeps a deleted category is allowed when the new type matches the category type, for example expense to refund
- The transaction model requires the current category for each update of a transaction that has a category, so a caller cannot skip the check
- The category repository gets a lookup of one category by id that includes deleted categories

Out of scope:

- Transfer editing, transfers have no category
- A data migration for transactions that already break the rule

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transactions`: a new requirement for the category type of a transaction, with a scenario for a type change that keeps the current category

## Impact

- `backend/src/models/transaction.ts`: `update` gets the current category as a second parameter, the type check applies to the new or the current category
- `backend/src/models/transaction.test.ts`: tests for type changes that keep the category
- `backend/src/services/transaction-service.ts`: `updateTransaction` loads the current category, deleted categories included, and gives it to the model
- `backend/src/services/transaction-service.test.ts`: tests for the type change paths
- `backend/src/services/transfer-service.ts`: transfer legs pass `{ currentCategory: undefined }`
- `backend/src/ports/category-repository.ts`: new method `findOneWithArchivedById`
- `backend/src/repositories/` DynamoDB category repository and its tests: implementation of the new method
- All clients get the fix through the service: GraphQL API, MCP server, AI assistant
- No GraphQL schema change
- No data migration

## Constitution Compliance

- **Backend Domain Entities**: Complies. The model enforces the category type rule for each update, invalid state cannot be created
- **Backend Port Interfaces**: Complies. The service uses the new method through the `CategoryRepository` port
- **Backend Layer Structure**: Complies. The repository reads data, the service orchestrates, the model holds the rule
- **Result Pattern**: Complies. The service converts the `ModelError` into a failure result
- **Soft-Deletion**: Complies. The new lookup reads deleted categories only to check past transactions, category lists stay unchanged
- **Vendor Independence**: Complies. The new lookup is a read by key, a portable query pattern
- **Database Record Hydration**: Complies. The new repository method validates the record with the existing schema
- **Input Validation**: Complies. Ownership checks run first, the category lookup runs after the cheap checks
- **Test Strategy**: Complies. Repository tests use the real database, service tests use mocked repositories
