# Move `paginateQuery` into `DynBaseRepository`

## Context

`backend/src/repositories/utils/query.ts` exports a standalone `paginateQuery<T>` function used by three repositories that all extend `DynBaseRepository`:

- `dyn-account-repository.ts`
- `dyn-category-repository.ts`
- `dyn-transaction-repository.ts`

Each call site passes `client: this.client` along with the query params. The repositories already share this client via the base class, so the parameter is redundant.

## Goal

Expose pagination as a `protected` method on `DynBaseRepository`, removing the `client` argument and consolidating the helper with its only consumers.

## Change

### `dyn-base-repository.ts`

Add a `protected` method:

```ts
protected async paginateQuery<T>({
  params,
  pageSize,
  schema,
  accumulatedItems = [],
}: {
  params: QueryCommandInput;
  pageSize?: number;
  schema: z.ZodType<T>;
  accumulatedItems?: T[];
}): Promise<QueryResult<T>>
```

Body is identical to the existing function except:

- No `client` parameter — uses `this.client`.
- Recursive call becomes `this.paginateQuery({ ... })`.

Co-locate and export the `QueryResult<T>` interface in the same file.

### Call sites (3 repositories)

- Remove `import { paginateQuery } from "./utils/query"`.
- If the file references `QueryResult<T>`, import it from `./dyn-base-repository` instead.
- Replace `paginateQuery({ client: this.client, ...rest })` with `this.paginateQuery({ ...rest })`.

### Deletion

Delete `backend/src/repositories/utils/query.ts`.

### Tests

Rewrite `backend/src/repositories/utils/query.test.ts` as `backend/src/repositories/dyn-base-repository.test.ts`:

- Define a minimal test-only subclass that exposes `paginateQuery` (e.g. a `run` method that forwards to `this.paginateQuery`).
- Inject the mocked `DynamoDBClient` through the `DynBaseRepository` constructor.
- Preserve all existing test cases (single page, multi-page, page-size limiting, `hasNextPage` detection, schema hydration).

Delete the original `utils/query.test.ts` after the new file lands.

## Non-goals

- No changes to repository public APIs.
- No changes to `paginateQuery` semantics (recursion, accumulator, `Limit` calculation, `hasNextPage` logic).
- No refactor of repositories beyond the call-site swap.

## Risks

- `QueryResult<T>` re-export — verified that no consumers outside `repositories/utils/query.ts` import this type, so relocating it is safe.
- Recursive `this.paginateQuery` call — `this` is bound through the method dispatch; no arrow-function or callback indirection involved.
