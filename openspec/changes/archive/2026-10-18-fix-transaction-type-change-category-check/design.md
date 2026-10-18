## Context

See proposal.md - Why.

`Transaction.update(input)` receives the new category in `input.category`:

- `undefined` keeps the current category
- `null` removes the category
- a `Category` sets a new category

The private constructor gets the new category as the transient relation `newCategory`. `assertInvariants` runs the owner, archived, and type checks only when `newCategory` is present. When the category is kept, the model has only `categoryId`, so it cannot check the type.

`TransactionService.updateTransaction` loads a category only when the input has a `categoryId`. `CategoryRepository.findOneById` returns `null` for an archived category. The port has no lookup of one archived category by id.

Transfer legs also call `Transaction.update` in `TransferService`. Transfers have no category.

## Goals / Non-Goals

**Goals:**

- Make the model enforce the type rule, so no caller can skip it
- Keep the owner and archived checks for a newly set category only

**Non-Goals:**

- A change to `Transaction.create`, it already gets the category
- A change to `TransferService` other than the new `{ currentCategory: undefined }` argument
- A change to the frontend or the GraphQL schema

## Decisions

### `Transaction.update` gets the current category as a second parameter

New signature: `update(input: UpdateTransactionInput, { currentCategory }: { currentCategory: Category | undefined })`.

Before it builds the new data, `update` checks that `currentCategory` matches the `categoryId` of the transaction:

- If the transaction has no `categoryId`, `currentCategory` must be `undefined`
- If the transaction has a `categoryId`, `currentCategory.id` must be equal to it

Otherwise `update` throws `ModelError("Current category does not match transaction category")`.

The check runs on each update, also when the type does not change. A rule that depends on the input is easy to break with a later change. A rule that always applies is simpler to test.

The second parameter is a required object with a required key `currentCategory`. The key accepts `undefined`. Each caller must state the current category explicitly, so a new caller cannot forget it. The key name shows the intent at the call site. A transaction without a category, for example a transfer leg, passes `{ currentCategory: undefined }`. `TransferService` does this for both legs.

Alternatives:

- A field `currentCategory` in `UpdateTransactionInput`. Rejected: the input holds the requested changes, the current category is state
- Require the current category only when the type changes. Rejected: a conditional rule is easier to skip by mistake
- An optional parameter `currentCategory?: Category`. Rejected: a caller can leave it out without a compile error
- A positional parameter `currentCategory: Category | undefined`. Rejected: a bare `undefined` at the call site does not show what it means
- Load the category in the model. Rejected: the model has no access to repositories

### The type check applies to the effective category

The constructor gets a second transient relation, `currentCategory`. `assertInvariants` splits the category checks into two groups:

- **Assignment checks** (owner, not archived): only for `newCategory`
- **Type check**: for the effective category

The effective category is `newCategory` when it is present. Otherwise it is `currentCategory` when the new data still has its `categoryId`. When the update removes the category, there is no effective category and no type check.

The type check keeps the current error message: `Category type "<type>" does not match transaction type "<type>"`.

Alternatives:

- Pass the current category as `newCategory`. Rejected: the archived check then rejects every type change on a transaction in a deleted category, for example expense to refund

### The service always loads the current category

In `updateTransaction`, after the transfer check, the service calls `categoryRepository.findOneWithArchivedById` when the transaction has a `categoryId`. When the lookup returns `null`, the service returns `Failure("Current category not found")`. `updateTransaction` handles a missing account in the same way.

The service loads the current category also when the input sets a new category. The model requires it in all cases, and the cost is one read by key.

The service gives the category to `existingTransaction.update(input, { currentCategory })`. `Result.fromThrowable` already converts a `ModelError` into a `Failure`.

### New port method `findOneWithArchivedById`

Add `findOneWithArchivedById({ id, userId }): Promise<Category | null>` to the `CategoryRepository` port. The DynamoDB adapter copies `DynAccountRepository.findOneWithArchivedById`: a `GetCommand` by `userId` and `id`, hydration with the existing schema, and no archived filter.

Alternatives:

- Reuse `findManyWithArchivedByIds` with one id. Rejected: the intent is less clear and the caller must unwrap an array

## Risks / Trade-offs

- [A transaction that already breaks the rule fails on each edit that keeps its category, also on an amount-only edit] → The error names both types. The user can set a matching category or remove the category in the same edit. A data migration is out of scope
- [One more database read on each edit of a transaction with a category] → The read is by key and is cheap. Edits are rare compared to reads

## Migration Plan

No data migration. Deploy the backend as usual. Roll back by redeploying the previous version.

## Constitution Compliance

- **Backend Domain Entities**: Complies. The private constructor enforces the type rule for the effective category, `update` refuses to run without the current category
- **Backend Port Interfaces**: Complies. The service uses the new method through the `CategoryRepository` port, `dependencies.ts` does not change
- **Backend Layer Structure**: Complies. The repository reads the category, the service orchestrates, the model holds the rule
- **Result Pattern**: Complies. Model errors and a missing category become `Failure`, database errors propagate as exceptions
- **Database Record Hydration**: Complies. The new adapter method validates the record with the existing schema
- **Soft-Deletion**: Complies. The new lookup reads archived categories only for the type check, category lists do not change
- **Vendor Independence**: Complies. The new lookup is a read by key, portable to SQL and NoSQL databases
- **Input Validation**: Complies. The ownership lookup runs first, the model checks run after the database lookups, as in the current method
- **Test Strategy**: Complies. The repository method is tested against the real database, the service is tested with mocked repositories, the model is tested as a unit
