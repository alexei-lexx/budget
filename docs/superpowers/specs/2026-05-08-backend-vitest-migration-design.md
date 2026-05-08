# Migrate `backend/` from Jest to Vitest

## Goal

Replace Jest with Vitest 4.1.5 as the test runner in the `backend/` package. Single `vitest.config.ts` using the `projects` feature for the three current test groups (unit, repositories, integration). Preserve current behavioral surface: `npm test` still runs unit + repositories, `test:integration` stays opt-in, `maxWorkers: 1` preserved for DB-touching groups.

## Motivation

- Single project-wide direction. Frontend (PR #451) and infra-cdk (PR #453) are on Vitest. Backend was the last Jest holdout. Aligning eliminates the last test-runner stack the project carries.
- Drop the `ts-jest` transform stack in favor of Vitest's esbuild-based transform — same toolchain the rest of the TS ecosystem uses.
- Project skill `testing` (PR #449) was already generalized to support both runners. The skill `backend-repository` still references Jest APIs in its mock examples; migrating backend code without updating that skill would leave the skill inconsistent with reality.

## Out of scope

- Frontend, infra-cdk. Both already on Vitest.
- `eslint.config.mjs`, `tsconfig.json`. Backend declares no `jest` env, no `jest/*` plugin, no `types: ["jest"]`. No edits required.
- `backend/patches/`. Patches target `@langchain/core` and `langchain` only.
- Sister docs (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`). Grep returns no `jest`/`vitest` mentions for backend.
- New tests, coverage thresholds, restructuring test layout. Only mechanical migration.

## Current state

- 56 `*.test.ts` files, 2 `*.int.test.ts` files, 8 in `src/repositories/`.
- 69 files import from `@jest/globals`; 32 use `jest.*` APIs (`fn`, `Mocked`, `Mock`, `clearAllMocks`, `useFakeTimers().setSystemTime`).
- 3 configs in `backend/`:
  - `jest.config.ts` — unit, `testTimeout: 10000`, excludes `src/repositories/` and `*.int.test.ts`, default workers.
  - `jest.config.repositories.ts` — extends base, scope `src/repositories/`, `maxWorkers: 1`.
  - `jest.config.integration.ts` — extends base, scope `*.int.test.ts`, `maxWorkers: 1`, `testTimeout: 100000`, `setupFilesAfterEach: [src/utils/test-utils/integration-matchers.ts]`.
- One custom-matcher setup file (`integration-matchers.ts`) extends `expect` with `langchainMatchers` from `@langchain/core/testing` and augments the `expect` Matchers interface.
- Scripts wrap with `dotenvx run -f .env.test -- jest --config <file>`.
- Backend is ESM (`"type": "module"`). package.json: jest 30, ts-jest 29, @jest/globals 30.

## Design decisions

| decision | choice | reason |
|---|---|---|
| imports vs globals | explicit imports from `vitest` | matches frontend/infra-cdk; matches existing `@jest/globals` style; mechanical replace |
| config layout | single `vitest.config.ts` with `projects` array | user request: single config; per-project `include`/`testTimeout`/`maxWorkers`/`setupFiles` confirmed supported in Vitest 4 |
| sequential workers | `maxWorkers: 1` + `minWorkers: 1` per project | Vitest equivalent of Jest's `maxWorkers: 1` for DB-touching groups |
| coverage | `@vitest/coverage-v8`, `test:coverage` script | user request: match frontend |
| watch | `test:watch` script | user request: match frontend |
| custom matchers | keep as integration setupFile only, switch import to `vitest`, augment `vitest`'s `Assertion` | preserves current scope (integration-only); aligns with Vitest type system |
| test scripts | `npm test` runs unit + repositories sequentially | preserves current behavior (today: `npm run test:unit && npm run test:repositories`) |
| skill update | update `backend-repository/SKILL.md` mock examples in same PR | user choice; keeps skill consistent with code |
| constitution update | line 24 only | only place that names backend's runner |

## Changes

### 1. `backend/package.json`

Remove devDependencies:
- `jest`
- `ts-jest`
- `@jest/globals`

Add devDependencies:
- `vitest@^4.1.5`
- `@vitest/coverage-v8@^4.1.5`

Scripts:

```jsonc
"test:unit":         "dotenvx run -f .env.test -- vitest run --project unit",
"test:repositories": "dotenvx run -f .env.test -- vitest run --project repositories",
"test:integration":  "dotenvx run -f .env.test -- vitest run --project integration",
"test":              "npm run test:unit && npm run test:repositories",
"test:watch":        "dotenvx run -f .env.test -- vitest --project unit --project repositories",
"test:coverage":     "dotenvx run -f .env.test -- vitest run --project unit --project repositories --coverage",
```

`vitest run` (not bare `vitest`) is required because bare `vitest` enters watch mode. `npm test` keeps the current "unit, then repositories" sequencing.

### 2. New `backend/vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: [
            "**/node_modules/**",
            "src/repositories/**",
            "**/*.int.test.ts",
          ],
          testTimeout: 10000,
        },
      },
      {
        extends: true,
        test: {
          name: "repositories",
          environment: "node",
          include: ["src/repositories/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/*.int.test.ts"],
          testTimeout: 10000,
          maxWorkers: 1,
          minWorkers: 1,
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          exclude: ["**/node_modules/**"],
          testTimeout: 100000,
          maxWorkers: 1,
          minWorkers: 1,
          setupFiles: ["src/utils/test-utils/integration-matchers.ts"],
        },
      },
    ],
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/__generated__/**"],
      reportsDirectory: "coverage",
    },
  },
});
```

Notes:
- `globals: false` matches frontend/infra-cdk; explicit imports preserved.
- `maxWorkers: 1 + minWorkers: 1` mirrors Jest's `maxWorkers: 1` (single worker, no concurrency).
- `setupFiles` is integration-only — same scope as today's `setupFilesAfterEach`.
- Coverage block at root applies on `--coverage`.

### 3. Delete

- `backend/jest.config.ts`
- `backend/jest.config.repositories.ts`
- `backend/jest.config.integration.ts`

### 4. Test file edits — API translation

Mechanical, scriptable rewrites across 56 `*.test.ts` files, 2 `*.int.test.ts` files, and 4 mock helpers under `src/utils/test-utils/`.

**Imports** — replace:

```diff
- import { describe, it, expect, beforeEach, jest } from "@jest/globals";
+ import { describe, it, expect, beforeEach, vi } from "vitest";
```

When the file uses `jest.Mocked<T>` or `jest.Mock<T>`, also import the type:

```ts
import { describe, it, expect, beforeEach, vi, type Mocked, type Mock } from "vitest";
```

**Symbol substitutions**:

| Jest | Vitest |
|---|---|
| `jest.fn()` | `vi.fn()` |
| `jest.fn<T>()` | `vi.fn<T>()` |
| `jest.Mocked<T>` | `Mocked<T>` |
| `jest.Mock<T>` | `Mock<T>` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.useFakeTimers().setSystemTime(d)` | `vi.useFakeTimers(); vi.setSystemTime(d);` |
| `jest.useRealTimers()` | `vi.useRealTimers()` *(if found)* |

Counts: `jest.fn` ~30, `jest.Mocked` ~25, `jest.clearAllMocks` ~10, `jest.useFakeTimers().setSystemTime` 5 (all in `src/models/account.test.ts`).

**Special cases**:

- `src/langchain/langchain-agent.test.ts` line 17: `jest.Mock<AgentInvokeFn>` → `Mock<AgentInvokeFn>`.
- Mock helpers under `src/utils/test-utils/` (`transaction-service-mocks.ts`, `category-repository-mocks.ts`, `telegram-bot-repository-mocks.ts`, etc.): same substitutions; switch import from `@jest/globals` to `vitest`.

**Execution plan**:

A one-shot `tsx` script in `tmp/` walks `src/**/*.test.ts`, `src/**/*.int.test.ts`, and `src/utils/test-utils/**/*-mocks.ts`, applies the substitutions, and writes back. Then run `npm run typecheck` and resolve the long tail by hand. Plain `sed` is not used because `Mocked`/`Mock` import additions need per-file context.

### 5. `src/utils/test-utils/integration-matchers.ts`

Today:

```ts
import { expect } from "@jest/globals";
import { LangChainMatchers, langchainMatchers } from "@langchain/core/testing";

expect.extend(langchainMatchers);

declare module "expect" {
  interface Matchers<R extends void | Promise<void>, T = unknown>
    extends LangChainMatchers<R> {}
}
```

Target:

```ts
import { expect } from "vitest";
import { LangChainMatchers, langchainMatchers } from "@langchain/core/testing";

expect.extend(langchainMatchers);

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends LangChainMatchers<Assertion<T>> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends LangChainMatchers<unknown> {}
}
```

`expect.extend` runtime is API-compatible between Jest and Vitest, so registration is unchanged. The type augmentation moves from `expect`'s `Matchers` to `vitest`'s `Assertion`/`AsymmetricMatchersContaining`.

**Risk**: `LangChainMatchers` is published with Jest's `Matchers<R>` shape. Possible TypeScript friction at the augmentation boundary. Fallback paths if the above doesn't compile:

1. Loosen via `any`: `interface Assertion<T = any> extends LangChainMatchers<any> {}`. Removes chainability typing on langchain matchers but preserves the rest.
2. Inline matcher names: drop `extends LangChainMatchers<R>` and manually declare the matcher signatures used in integration tests. Verbose but bypasses upstream type shape entirely.

Implement target first; fall back to (1) if TS complains; record outcome in implementation plan and commit message.

### 6. `docs/constitution.md` line 24

```diff
- - **Testing**: Jest
+ - **Testing**: Vitest
```

Backend section only. Frontend (line 42) already Vitest; infra-cdk (line 60) already Vitest after PR #453.

### 7. `.claude/skills/backend-repository/SKILL.md`

Around line 84, the mock-example block:

```diff
-      (): jest.Mocked<WidgetRepository> => ({
-        findXyz: jest.fn(),
+      (): Mocked<WidgetRepository> => ({
+        findXyz: vi.fn(),
```

If the surrounding example shows the import line, switch it to `import { vi, type Mocked } from "vitest"`. Skill-internal language references to `jest.fn()` / `jest.Mocked<T>` change correspondingly.

### 8. Files explicitly NOT changed

- `backend/eslint.config.mjs` — no `jest` env, no `jest/*` plugin.
- `backend/tsconfig.json` — no `types: ["jest"]`.
- `backend/patches/` — langchain-only.
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md` — no jest/vitest mentions.
- `frontend/`, `infra-cdk/` — already Vitest.
- `.claude/skills/testing/` — already generalized in PR #449.

## Validation

After implementing, in `backend/`:

1. `rm -rf node_modules package-lock.json && npm install` succeeds.
2. `npm run typecheck` passes — no `Cannot find name 'jest'`, no missing-type errors on `Mocked`/`Mock` or custom matchers.
3. `npm run lint` passes.
4. `npm run test:unit` runs all unit tests, exits 0; count matches pre-migration baseline.
5. `npm run test:repositories` runs against local DynamoDB Local (after `npm run test:db:setup`), all green; sequential execution observable.
6. `npm test` runs unit + repositories sequentially, all green.
7. `npm run test:integration` runs the two `*.int.test.ts` files with langchain matchers loaded; passes or skips as today.
8. `npm run test:coverage` generates a report under `backend/coverage/`.
9. `grep -rn "from \"@jest/globals\"\|jest\.\(fn\|Mock\|clearAllMocks\|useFakeTimers\|useRealTimers\)" backend/src` returns no results.
10. `grep -n "jest\|ts-jest" backend/package.json` returns no results.
11. `ls backend/jest.config*.ts` errors — all three configs deleted.
12. `docs/constitution.md` line 24 reads `Vitest`.

## Risks and rollback

- **`Mocked<T>` shape drift**: Vitest's `Mocked<T>` differs slightly from Jest's (deeper recursion). For interface-typed ports (the project convention per constitution line 283), behavior should be identical. If a generic class trips the type checker, fall back to `Partial<Mocked<T>>` with `as Mocked<T>` cast — pattern already used in `create-transaction.test.ts`.
- **Custom-matcher type augmentation**: covered in §5. Runtime works regardless.
- **`vi.useFakeTimers` defaults**: Vitest fake timers mock `setTimeout/setInterval/Date` by default — same as current Jest usage in `account.test.ts`. If `Date` mocking misbehaves, use `vi.useFakeTimers({ toFake: ["Date"] })`.
- **`dotenvx run -f .env.test -- vitest`**: identical wrapping shape to current Jest invocations.
- **Surface size**: 56 + 2 test files plus 4 mock helpers; mostly mechanical. Any breakage is caught by `npm run typecheck` or by individual project runs and is local — fix in place.
- **Rollback**: single PR. Revert if scope breaks. Frontend and infra-cdk are unaffected.
