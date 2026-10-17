## Code Style

Apply the rules in [docs/code-style.md](../../../docs/code-style.md) to all code written for this change.

## Testing

Use the `testing` skill for each new or modified test.

## 1. Repository Port and Mock

- [x] 1.1 Add `hasTransactionsForCategory({ categoryId, userId }): Promise<boolean>` to the `TransactionRepository` port in `backend/src/ports/transaction-repository.ts`
- [x] 1.2 Add `hasTransactionsForCategory: vi.fn()` to `backend/src/utils/test-utils/repositories/transaction-repository-mocks.ts`
- [x] 1.3 Add a stub `hasTransactionsForCategory` to `DynTransactionRepository` that throws "Not implemented", so `npm run typecheck` passes

## 2. Repository Tests (write first, expect failure)

- [x] 2.1 In `backend/src/repositories/dyn-transaction-repository.test.ts`, add a `hasTransactionsForCategory` test: returns `true` when the user has an active transaction in the category
- [x] 2.2 Add a test: returns `false` when the category has no transactions
- [x] 2.3 Add a test: returns `false` when all transactions in the category are archived
- [x] 2.4 Add a test: returns `false` when only another user has transactions in the category
- [x] 2.5 Add tests: throws `RepositoryError` when `categoryId` or `userId` is empty
- [x] 2.6 Run the repository test file and confirm the new tests fail

## 3. Repository Implementation

- [x] 3.1 Implement `hasTransactionsForCategory` in `DynTransactionRepository`: query the user partition, filter by `categoryId` and `isArchived = false`, page with `ExclusiveStartKey`, stop at the first match
- [x] 3.2 Run the repository test file and confirm all tests pass

## 4. Service Tests (write first, expect failure)

- [x] 4.1 In `backend/src/services/category-service.test.ts`, create a mock transaction repository and pass it to `CategoryServiceImpl`
- [x] 4.2 Add a test: a type change on a category with active transactions returns a `Failure` with the message from design.md and does not call `categoryRepository.update`
- [x] 4.3 Add a test: a type change on a category without active transactions succeeds and saves the new type
- [x] 4.4 Add a test: a name or "exclude from reports" change with the same type succeeds and does not call `hasTransactionsForCategory`
- [x] 4.5 Run the service test file and confirm the new tests fail

## 5. Service Implementation

- [x] 5.1 Add a `TransactionRepository` constructor parameter to `CategoryServiceImpl`
- [x] 5.2 In `updateCategory`, after the duplicate name check, call `hasTransactionsForCategory` when the type changes, and return the `Failure` when it returns `true`
- [x] 5.3 Update the `updateCategory` doc comment to name the new business rule
- [x] 5.4 Pass `resolveTransactionRepository()` to `CategoryServiceImpl` in `backend/src/dependencies.ts`
- [x] 5.5 Run the service test file and confirm all tests pass

## 6. Validation

- [x] 6.1 Run `npm test` in `backend/` and confirm all tests pass
- [x] 6.2 Run `npm run typecheck` and `npm run format` in `backend/` and fix all issues

## Constitution Compliance

- **Backend Layer Structure**: Complies. The rule is in the service. The query is in the repository
- **Backend Port Interfaces**: Complies. The service depends on the `TransactionRepository` port. `dependencies.ts` wires the adapter
- **Vendor Independence**: Complies. The query uses only a filter on user, category, and archive flag
- **Result Pattern**: Complies. `updateCategory` returns `Failure` for the rule violation
- **Input Validation**: Complies. The transaction check runs last, after ownership and cheap checks
- **Soft-Deletion**: Complies. Archived transactions do not count
- **Test Strategy**: Complies. Tests come first. Repository tests use the real database. Service tests use mocks. All tests are co-located
- **Code Quality Validation**: Complies. Section 6 runs tests, typecheck, and format
