## Issue

[#720: business rule errors show generic message in snackbar](https://github.com/alexei-lexx/budget/issues/720)

A user creates a category "Food" and then a second category "Food". The snackbar shows "Failed to create category". The real reason, `Category "Food" already exists`, is lost. The same happens for all business rule failures, for example a type change on a category with transactions or a currency change on an account with transactions.

## Why

Users cannot fix a problem when the app does not tell them what is wrong. The defect came in when the services moved to the Result pattern. Resolvers now turn each service `Failure` into a plain `GraphQLError` without an error code. Apollo Server gives such an error the code `INTERNAL_SERVER_ERROR`. The frontend shows its generic fallback for that code.

## What Changes

- All service failures in GraphQL resolvers reach the client as business rule errors with the real reason
- The snackbar shows the real reason from the backend
- Unexpected errors still show the generic fallback message
- No frontend change. The frontend already shows the real message for errors that are not internal errors

Out of scope:

- Error codes for the direct `throw new GraphQLError(...)` calls in resolvers (authentication, missing IDs, transaction type check)
- Logging of business rule failures. They are expected outcomes, not defects
- A safeguard that masks a `GraphQLError` without an error code
- MCP tools and AI assistant tools. They already return the failure message to the caller

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The change restores behavior that the existing specs already require, for example the error message in the `categories` "Category Editing" requirement.

## Impact

- `backend/src/graphql/bad-request-graphql-error.ts`: a new `GraphQLError` subclass with the code `BAD_REQUEST`
- `backend/src/graphql/bad-request-graphql-error.test.ts`: tests for the new class
- 8 resolver files in `backend/src/graphql/resolvers/`: 32 calls change from `unwrapOrThrowAs(GraphQLError)` to `unwrapOrThrowAs(BadRequestGraphQLError)`
- No GraphQL schema change. No frontend change. No data migration

## Constitution Compliance

- **Backend Layer Structure**: Complies. The change stays in the GraphQL layer. Services keep their `Failure` messages
- **Backend GraphQL Layer**: Complies. The GraphQL layer transforms service results into API errors
- **Result Pattern**: Complies. Services keep returning `Failure` for business rule violations. The resolver maps the failure to a client error with a known code
- **Input Validation**: Complies. No validation moves between layers
- **UI Guidelines**: Complies. The snackbar shows the error
- **Test Strategy**: Complies. The new class gets a co-located unit test. Resolver tests are optional and not added
