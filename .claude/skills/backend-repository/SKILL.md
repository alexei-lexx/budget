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

**Finder naming**:
- `findOne` — returns one instance or `null`
- `findMany` — returns an array (empty when nothing matches)
- `get` — returns one instance, throws if absent (use when absence is a program error)

**Method ordering**:
1. Public before private
2. Reads before writes: find one → find many → other reads (aggregations, calculations) → create one → create many → update one → update many → archive one → delete one → archive many → delete many
3. Stepdown Rule: caller appears above the methods it calls

**One repository per entity** (recommended).

## Tests

- Use a **real database connection** — no mocks
- Co-locate: `repository.test.ts` next to `repository.ts`
- `describe` blocks mirror the method order of the source class
