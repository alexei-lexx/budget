---
name: backend-service-tests
description: Use when writing, rewriting, reviewing, adding, or modifying tests for backend services in backend/src/services/.
---

# backend-service-tests

Services implement business logic: validation, domain rules, and orchestration across repositories.

- Called by GraphQL resolvers, call repositories to read/write data
- Return `{ success: true, data }` or `{ success: false, error }` for all expected outcomes
- Throw exceptions for infrastructure errors (DB failures)
- Dependencies (repositories, external clients) are injected via the constructor

## Before writing

Create a todo list with one item per rule in this skill. Check each item off as you verify the generated code.

## Scope

- Apply only to code you write or modify
- Do not update surrounding code to conform unless the user asks

## Test file location

Co-locate: `service-name.test.ts` next to `service-name.ts`.

## What to test

Test all public methods unless the user says otherwise.
Order `describe` blocks to match the method order in the source file.

## Test structure per method

Each method gets three groups of tests, separated by inline comments:

1. **Happy path** — the expected success case(s)
2. **Validation failures** — business rule violations (invalid input, uniqueness conflicts, missing entities, etc.)
3. **Dependency failures** — errors returned or thrown by repositories, external APIs, or other services

Mark each group with its label as a comment before the first test in that group:

```typescript
// Happy path

it("should ...", ...);

// Validation failures

it("should ...", ...);

// Dependency failures

it("should ...", ...);
```

## Test anatomy

Each `it` block uses `// Arrange`, `// Act`, `// Assert` sections:

- Omit `// Arrange` if there is nothing to set up
- Use `// Act & Assert` when the action and assertion are a single command

Add a short comment above each mock setup in `// Arrange` explaining what it simulates.

Each test asserts the return value first, then verifies dependency calls.

## Mocks and fakes

**Mocks** replace real dependencies (repositories, clients) with Jest mock objects whose return values can be controlled per test.

**Fakes** are factory functions that create realistic test data (entities, input objects) with randomized defaults via `faker`.

- **Model fakes** (entity objects) — `backend/src/utils/test-utils/models/<model name>-fakes.ts`
- **Repository mocks** — `backend/src/utils/test-utils/repositories/<repository name>-mocks.ts`
- **Repository-level fakes** (complex input types) — `backend/src/utils/test-utils/repositories/<repository name>-fakes.ts`

- **Service mocks** — `backend/src/utils/test-utils/services/<service name>-mocks.ts`
- **Service-level fakes** (complex input types) — `backend/src/utils/test-utils/services/<service name>-fakes.ts`

- **Provider/client mocks** — `backend/src/utils/test-utils/providers/<provider name>-mocks.ts`
- **Provider-level fakes** (complex input types) — `backend/src/utils/test-utils/providers/<provider name>-fakes.ts`

Reuse existing fakes and mocks. Create new ones if needed following the established patterns.

Mock all dependencies — repositories, external API clients, other services.
Never call real implementations.

MUST type mocked dependencies with `jest.Mocked<InterfaceName>` when an interface is available.
MUST NOT use `ReturnType<typeof createMock...>` when an interface is available.

## After writing

Run these checks in order and fix all failures before considering the work done:

1. `npm test -- <test file path>` — all tests must pass
2. `npm run typecheck` — no type errors
3. `npm run format` — no lint errors

## Reference

See `references/service.test.ts.md` for a complete annotated example.
