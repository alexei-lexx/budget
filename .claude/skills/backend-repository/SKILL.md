---
name: backend-repository
description: Use when creating, redesigning, reviewing, or adding methods to a backend repository — a data-access class that abstracts database operations.
---

# backend-repository

The **Repository Pattern** abstracts data storage behind a collection-like interface, enabling storage backends to be swapped without touching business logic. Repositories return typed domain **entities**, not DTOs.

**Structure**: define the interface first, then implement it.

- Interface: `backend/src/services/ports/` — e.g., `AccountRepository` in `account-repository.ts`
- Implementation: `backend/src/repositories/` — e.g., `DynAccountRepository` in `dyn-account-repository.ts`

## Rules

**No business logic** — CRUD only.

**User scoping** — every query MUST filter by `userId`. Never return cross-user data.

**Soft-deletion** — never delete records; mark them as archived (`isArchived = true`) instead. All queries MUST scope to non-archived records by default. Exceptions must have a comment in the repository interface explaining the business reason.

**Hydration** — validate every record read from the database with a Zod schema that is typed to the entity's TypeScript interface (`z.ZodType<Entity>`), ensuring compile-time safety. Do this before returning the record.

**Error handling** — handle all database operation errors at the repository boundary. Throw repository-specific errors so callers get consistent, meaningful failures regardless of the underlying storage.

**Portable queries** — use only operations reproducible across popular SQL and NoSQL databases. Avoid vendor-specific features.

**Input validation** — check only what's needed to execute the DB call: required parameters are present, operands are valid (e.g. IDs are non-empty).

**Configuration injection** — inject configuration values (table name, TTL, etc.) via the constructor. Never read env vars inside the class. The composition root (`dependencies.ts`) is the only place that reads env vars and passes them in as primitives.

**Finder naming**:

- `findOne` — returns one instance or `null`
- `findMany` — returns an array (empty when nothing matches)
- `get` — returns one instance, throws if absent (use when absence is a program error)

**Selector pattern** — group identity/scoping fields in a `selector` object as the first argument. Query modifiers (`limit`, `offset`, `sortOrder`) are separate arguments after the selector.

```typescript
findManyByParentId(selector: { userId: string; parentId: string }): Promise<Entity[]>;
```

**Write method naming prefixes**: `create` for insert, `update` for update, `archive` for soft-delete, `delete` for hard-delete.

**Method ordering**:

1. Public before private
2. Reads before writes: find one → find many → other reads (aggregations, calculations) → create one → create many → update one → update many → archive one → delete one → archive many → delete many
3. Stepdown Rule: caller appears above the methods it calls

**One repository per entity** (recommended).

## When reviewing

Apply all rules to both the interface and the implementation.

## Tests

- Use a **real database connection** — no mocks
- Co-locate: `repository.test.ts` next to `repository.ts`
- `describe` blocks mirror the method order of the source class
- Test data factories are split by purpose:
  - **Model fakes** — full entity objects: `backend/src/utils/test-utils/models/<entity>-fakes.ts`
    ```typescript
    export const fakeWidget = (overrides: Partial<Widget> = {}): Widget => ({
      // ... all required fields with faker defaults
      ...overrides,
    });
    ```
  - **Input fakes** — write operation inputs: `backend/src/utils/test-utils/repositories/<entity>-repository-fakes.ts`
    ```typescript
    export const fakeCreateWidgetInput = (
      overrides: Partial<CreateWidgetInput> = {},
    ): CreateWidgetInput => ({
      // ... all required fields with faker defaults
      ...overrides,
    });
    ```
  - **Repository mocks** — Jest-mocked repository interfaces for service tests: `backend/src/utils/test-utils/repositories/<entity>-repository-mocks.ts`
    ```typescript
    export const createMockWidgetRepository =
      (): jest.Mocked<WidgetRepository> => ({
        findXyz: jest.fn(),
        // ... all interface methods
      });
    ```
  - Randomize defaults using `faker`; for enum fields use `faker.helpers.arrayElement([...values])`
