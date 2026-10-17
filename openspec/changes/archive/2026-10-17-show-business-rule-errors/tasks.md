# Tasks

## 1. BadRequestGraphQLError Class

- [x] 1.1 Write `backend/src/graphql/bad-request-graphql-error.test.ts` that checks the error is a `GraphQLError`, has `extensions.code` equal to `ApolloServerErrorCode.BAD_REQUEST`, keeps the message, and has the name `BadRequestGraphQLError`, and verify `npm test -- src/graphql/bad-request-graphql-error.test.ts` fails
- [x] 1.2 Create `backend/src/graphql/bad-request-graphql-error.ts` with the `BadRequestGraphQLError` class from design.md and verify `npm test -- src/graphql/bad-request-graphql-error.test.ts` passes

## 2. Resolver Call Sites

- [x] 2.1 Replace `unwrapOrThrowAs(GraphQLError)` with `unwrapOrThrowAs(BadRequestGraphQLError)` in `account-resolvers.ts` (5), `category-resolvers.ts` (4), and `transaction-resolvers.ts` (6), keep the `GraphQLError` import for the direct throws, and verify `grep` finds no `unwrapOrThrowAs(GraphQLError)` in these files
- [x] 2.2 Replace `unwrapOrThrowAs(GraphQLError)` with `unwrapOrThrowAs(BadRequestGraphQLError)` in `report-resolvers.ts` (1), `telegram-bot-resolvers.ts` (4), `transfer-resolvers.ts` (4), `trends-resolvers.ts` (4), and `user-resolvers.ts` (4), remove the unused `GraphQLError` import, and verify `grep` finds no `unwrapOrThrowAs(GraphQLError)` in `backend/src`

## 3. Validation

- [x] 3.1 Run `npm test` in `backend/` and verify all tests pass
- [x] 3.2 Run `npm run typecheck` and `npm run format` in `backend/` and verify both finish without errors

## Constitution Compliance

- **Backend Layer Structure**: Complies. All changes stay in the GraphQL layer
- **Backend GraphQL Layer**: Complies. Resolvers map service failures to API errors with a known code
- **Result Pattern**: Complies. Services keep returning `Failure`
- **Test Strategy**: Complies. The new class gets a co-located unit test, written first. Resolver tests are optional and not added
- **Code Quality Validation**: Complies. Group 3 runs the tests, typecheck, and format in the required order
