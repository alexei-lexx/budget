---
name: jest-tests
description: Use when writing, rewriting, reviewing, adding, or modifying Jest tests.
---

# jest-tests

## Scope

- Apply only to code you write or modify
- Do not update surrounding code to conform unless the user asks

## Test file location

Co-locate: `service-name.test.ts` next to `service-name.ts`.

## What to test

Test the public API of the unit under test (exported functions, class methods).
Order `describe` blocks to match the declaration order in the source file.

## What not to test

Don't test implementation details (private helpers, internal state).
Don't re-test library or framework behavior.
Don't assert on things the type system already guarantees.

## Test naming

Name tests in present tense describing the expected behavior, not the implementation.

Omit articles (`a`, `an`, `the`) from test names and comments.

- Good: `it("returns failure when name is empty")`
- Bad: `it("should return failure when name is empty")`
- Bad: `it("calls findByName then throws")`
- Bad: `it("returns a failure when the name is empty")`

## Test structure per method

Each method gets three groups of tests, separated by inline comments:

1. **Happy path** — the expected success case(s)
2. **Validation failures** — business rule violations (invalid input, uniqueness conflicts, missing entities, etc.)
3. **Dependency failures** — errors returned or thrown by repositories, external APIs, or other services

Mark each group with its label as a comment before the first test in that group:

```typescript
// Happy path

it("...", ...);

// Validation failures

it("...", ...);

// Dependency failures

it("...", ...);
```

## Test anatomy

Each `it` block uses `// Arrange`, `// Act`, `// Assert` sections:

- Omit `// Arrange` if there is nothing to set up
- Use `// Act & Assert` when the action and assertion are a single command

Add a short comment above each mock setup in `// Arrange` explaining what it simulates.
Omit articles (`a`, `an`, `the`) from comments:

- Good: `// Persists and returns new widget`
- Bad: `// Persists and returns the new widget`

Each test asserts the return value first, then verifies dependency calls.

## Async tests

Use `async/await`, not `.then()`.
Assert on resolved values with `await expect(fn()).resolves.toEqual(...)` or store and assert on the result.
For rejections, use `await expect(fn()).rejects.toThrow(...)`.

## Timers and dates

Use `jest.useFakeTimers()` when the code under test depends on `setTimeout`, `setInterval`, or `Date.now()`.
Advance time explicitly with `jest.advanceTimersByTime(ms)` or `jest.runAllTimers()`.
Restore real timers with `jest.useRealTimers()` in `afterEach`.

## Test isolation

Tests must not share mutable state.
Reset mocks in `beforeEach` (or rely on `resetMocks: true` in Jest config).
Avoid `beforeAll` for state that any test could mutate.

## Mocks and fakes

**Mocks** replace real dependencies (repositories, clients) with Jest mock objects whose return values can be controlled per test.

**Fakes** are factory functions that create realistic test data (entities, input objects) with randomized defaults via `faker`.

The paths below follow the backend layout.

- **Model fakes** (entity objects) — `backend/src/utils/test-utils/models/<model name>-fakes.ts`
- **Repository mocks** — `backend/src/utils/test-utils/repositories/<repository name>-mocks.ts`
- **Repository-level fakes** (complex input types) — `backend/src/utils/test-utils/repositories/<repository name>-fakes.ts`

- **Service mocks** — `backend/src/utils/test-utils/services/<service name>-mocks.ts`
- **Service-level fakes** (complex input types) — `backend/src/utils/test-utils/services/<service name>-fakes.ts`

- **Provider/client mocks** — `backend/src/utils/test-utils/providers/<provider name>-mocks.ts`
- **Provider-level fakes** (complex input types) — `backend/src/utils/test-utils/providers/<provider name>-fakes.ts`

Reuse existing fakes and mocks. Create new ones if needed following the established patterns.

When calling fakes, override only fields that drive the assertion or branching logic. Extra overrides imply the fields matter when they don't.

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
