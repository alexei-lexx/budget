## Context

See proposal.md - Why.

The error path today:

```
service Failure(msg)
  -> resolver: result.unwrapOrThrowAs(GraphQLError)  -> new GraphQLError(msg), no code
  -> Apollo enrichError: code ?? INTERNAL_SERVER_ERROR
  -> formatError: original is a GraphQLError -> pass through unchanged
  -> frontend resolveErrorMessage: INTERNAL_SERVER_ERROR -> fallback text
```

`unwrapOrThrowAs` from `ts-result` takes a class with a constructor `(error: TError)`. For a string failure, the class must accept one `message` argument.

`formatError` in `backend/src/server.ts` passes every `GraphQLError` through without change. Apollo Server keeps an `extensions.code` that the error already has.

`resolveErrorMessage` in `frontend/src/utils/graphqlError.ts` shows the fallback only for `INTERNAL_SERVER_ERROR`. For all other codes it shows the error message.

## Goals / Non-Goals

**Goals:**

- Every service `Failure` in a GraphQL resolver reaches the client with the code `BAD_REQUEST` and the original message
- Each resolver call site states its intent

**Non-Goals:**

- A change to `formatError`
- A change to the `Failure` messages in services
- A change to resolvers that do not call `unwrapOrThrowAs(GraphQLError)` (assistant, create transaction from text)

## Decisions

### New class `BadRequestGraphQLError extends GraphQLError`

File: `backend/src/graphql/bad-request-graphql-error.ts`

```ts
export class BadRequestGraphQLError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: ApolloServerErrorCode.BAD_REQUEST },
    });
    this.name = "BadRequestGraphQLError";
  }
}
```

The class is a `GraphQLError`, so `formatError` passes it through with its code. The class lives in the GraphQL layer, because only resolvers use it.

The code `BAD_REQUEST` matches the code that `formatError` already gives to a `ModelError`. The client sees one code for all business rule failures.

Alternatives:

- A plain `BusinessError extends Error` added to `isUserFacingError`. Rejected: it adds an error type outside the GraphQL layer for a GraphQL-only problem
- In `formatError`, map a `GraphQLError` without a code to `BAD_REQUEST`. Rejected: the intent is implicit. Authentication errors would also get `BAD_REQUEST`
- Use `ApolloServerErrorCode.BAD_USER_INPUT`. Rejected: that code is for malformed input. Business rule failures already use `BAD_REQUEST`

### Replace all `unwrapOrThrowAs(GraphQLError)` calls

All 32 calls in 8 resolver files change to `unwrapOrThrowAs(BadRequestGraphQLError)`:

- `account-resolvers.ts` (5)
- `category-resolvers.ts` (4)
- `report-resolvers.ts` (1)
- `telegram-bot-resolvers.ts` (4)
- `transaction-resolvers.ts` (6)
- `transfer-resolvers.ts` (4)
- `trends-resolvers.ts` (4)
- `user-resolvers.ts` (4)

Remove the `GraphQLError` import where no other use remains. `account-resolvers.ts`, `category-resolvers.ts`, and `transaction-resolvers.ts` keep it for their direct throws.

### Test the class, not the resolvers

A unit test checks that `BadRequestGraphQLError` is a `GraphQLError`, has the code `BAD_REQUEST`, and keeps the message. Resolver tests are optional by the constitution. The type checker confirms that each call site compiles with the new class.

## Risks / Trade-offs

- [A new resolver can still use `unwrapOrThrowAs(GraphQLError)` and bring the defect back] → No safeguard in this change. A later change can mask code-less `GraphQLError` after the direct throws get codes
- [A service `Failure` message with internal details now reaches the user] → Service failures are business rule and validation messages by the constitution. A review of the current messages found no internal details
- [Direct `throw new GraphQLError(...)` calls keep `INTERNAL_SERVER_ERROR`] → Out of scope. The issue covers only service failures

## Migration Plan

No data migration. Deploy the backend as usual. Roll back by redeploying the previous version.

## Constitution Compliance

- **Backend Layer Structure**: Complies. The new class and the call changes stay in the GraphQL layer
- **Backend GraphQL Layer**: Complies. The resolver maps service results to API errors with a known code
- **Result Pattern**: Complies. Services still return `Failure`. The resolver decides how to report it
- **Test Strategy**: Complies. The new class has a co-located unit test. No resolver tests, as they are optional
- **Code Quality Validation**: Complies. Tests, typecheck, and format run before completion
