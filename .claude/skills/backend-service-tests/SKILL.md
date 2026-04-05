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

## Non-negotiable rules

- **When skill instructions conflict with existing test patterns, follow the skill**
- Existing tests may violate these rules — that is not a justification to do the same
- Apply only to code you write or modify
- Do not update surrounding code to conform unless the user asks

## Test file location

Co-locate: `service-name.test.ts` next to `service-name.ts`.

## What to test

Test all public methods unless the user says otherwise.
Order `describe` blocks to match the method order in the source file.

## Test structure per method

Each method gets three groups of tests:

1. **Happy path** — the expected success case(s)
2. **Validation failures** — business rule violations (invalid input, uniqueness conflicts, missing entities, etc.)
3. **Dependency failures** — errors returned or thrown by repositories, external APIs, or other services

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
Type mocked dependencies with `jest.Mocked<InterfaceName>` where an interface is available.

## Reference

See `references/service.test.ts.md` for a complete annotated example.
