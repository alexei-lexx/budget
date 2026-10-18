## Code Style

Apply the rules in [docs/code-style.md](../../../docs/code-style.md) to all code written for this change.

## Testing

Use the `testing` skill for each new or modified test.

## 1. Repository Port and Mock

- [x] 1.1 Add `findOneWithArchivedById({ id, userId }): Promise<Category | null>` to the `CategoryRepository` port in `backend/src/ports/category-repository.ts`
- [x] 1.2 Add `findOneWithArchivedById: vi.fn()` to `backend/src/utils/test-utils/repositories/category-repository-mocks.ts`
- [x] 1.3 Add a stub `findOneWithArchivedById` to `DynCategoryRepository` that throws "Not implemented", and verify that `npm run typecheck` passes

## 2. Repository Tests (write first, expect failure)

- [x] 2.1 In `backend/src/repositories/dyn-category-repository.test.ts`, add a `findOneWithArchivedById` test: returns an active category of the user
- [x] 2.2 Add a test: returns an archived category of the user
- [x] 2.3 Add a test: returns `null` when the category does not exist
- [x] 2.4 Add a test: returns `null` when the category belongs to another user
- [x] 2.5 Add tests: throws `RepositoryError` when `id` or `userId` is empty
- [x] 2.6 Run the repository test file and verify that the new tests fail

## 3. Repository Implementation

- [x] 3.1 Implement `findOneWithArchivedById` in `DynCategoryRepository` as in `DynAccountRepository.findOneWithArchivedById`: `GetCommand` by `userId` and `id`, hydration with the existing schema, no archived filter
- [x] 3.2 Run the repository test file and verify that all tests pass

## 4. Model Tests (write first, expect failure)

- [x] 4.1 In `backend/src/models/transaction.test.ts`, add tests for the current category check of `update`: throws `ModelError` when the transaction has no category and `currentCategory` is a category, when the transaction has a category and `currentCategory` is `undefined`, and when the ids differ
- [x] 4.2 Add a test: a type change from expense to income that keeps an expense category throws the category type mismatch error
- [x] 4.3 Add a test: a type change from expense to refund that keeps an expense category succeeds
- [x] 4.4 Add a test: a type change from expense to income that keeps an archived expense category throws the category type mismatch error
- [x] 4.5 Add a test: a type change from expense to refund that keeps an archived expense category succeeds
- [x] 4.6 Add a test: an amount change that keeps an archived category succeeds
- [x] 4.7 Add a test: a type change from expense to income with a new income category succeeds when the current category is an expense category
- [x] 4.8 Add a test: a type change from expense to income that removes the category succeeds
- [x] 4.9 Run the model test file and verify that the new tests fail

## 5. Model Implementation

- [x] 5.1 Change the signature of `Transaction.update` to `update(input, { currentCategory }: { currentCategory: Category | undefined })` and add the current category check from design.md
- [x] 5.2 Pass `currentCategory` to the constructor as a second transient relation, and in `assertInvariants` run the owner and archived checks for `newCategory` only and the type check for the effective category
- [x] 5.3 Update the existing `update` calls in `backend/src/models/transaction.test.ts` to pass the matching `currentCategory`
- [x] 5.4 Pass `{ currentCategory: undefined }` in both `update` calls in `backend/src/services/transfer-service.ts`
- [x] 5.5 Run the model test file and `backend/src/services/transfer-service.test.ts`, and verify that all tests pass

## 6. Service Tests (write first, expect failure)

Service tests cover the orchestration only. The model tests in section 4 cover the category rules.

- [x] 6.1 In `backend/src/services/transaction-service.test.ts`, add a test: `updateTransaction` on a transaction with a category calls `findOneWithArchivedById` with its `categoryId` and the user id
- [x] 6.2 Add a test: returns `Failure("Current category not found")` when `findOneWithArchivedById` returns `null`, and does not call `atomicWriter.commit`
- [x] 6.3 Add a test: `updateTransaction` on a transaction without a category does not call `findOneWithArchivedById`
- [x] 6.4 Run the service test file and verify that the new tests fail

## 7. Service Implementation

- [x] 7.1 In `updateTransaction`, after the transfer check, load the current category with `findOneWithArchivedById` when the transaction has a `categoryId`, and return `Failure("Current category not found")` when it returns `null`
- [x] 7.2 Pass `{ currentCategory }` to `existingTransaction.update`
- [x] 7.3 Update existing tests in `backend/src/services/transaction-service.test.ts` that update a transaction with a category, so that `findOneWithArchivedById` returns that category
- [x] 7.4 Run the service test file and verify that all tests pass

## 8. Validation

- [x] 8.1 Run `npm test` in `backend/` and verify that all tests pass
- [x] 8.2 Run `npm run typecheck` and `npm run format` in `backend/` and fix all issues

## Constitution Compliance

- **Backend Domain Entities**: Complies. The model enforces the current category check and the type check, tests cover each invariant
- **Backend Port Interfaces**: Complies. The service depends on the `CategoryRepository` port, the adapter implements the new method
- **Backend Layer Structure**: Complies. The repository reads, the service orchestrates, the model holds the rule
- **Result Pattern**: Complies. `updateTransaction` returns `Failure` for a missing category and for model errors
- **Database Record Hydration**: Complies. The new adapter method uses the existing schema
- **Soft-Deletion**: Complies. Only the new lookup reads archived categories, other lookups do not change
- **Vendor Independence**: Complies. The new lookup is a read by key
- **Test Strategy**: Complies. Tests come first, repository tests use the real database, service tests use mocks, all tests are co-located
- **Code Quality Validation**: Complies. Section 8 runs tests, typecheck, and format
