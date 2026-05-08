# Migrate `frontend/` from Jest to Vitest

## Goal

Replace Jest with Vitest as the test runner in the `frontend/` package. Frontend already uses Vite as its build tool, so Vitest aligns the test runner with the build pipeline and removes the parallel `ts-jest` transform stack.

## Motivation

- Single transform pipeline. Vite/esbuild already handles TypeScript and Vue SFCs for dev and build. Vitest reuses the same pipeline, eliminating `ts-jest` and a duplicate TS configuration surface.
- Faster test startup via Vite's native ESM and on-demand transforms.
- Closer fidelity to runtime: tests resolve `@/*` aliases, Vue plugins, and ESM packages the same way the app does.
- Project skill `testing` (PR #449) was generalized to support Jest and Vitest, removing the last skill-level blocker.

## Out of scope

- Backend or `infra-cdk` migrations. They remain on Jest. Constitution updates apply only to the frontend section.
- Adding new test files or expanding coverage. Existing tests carry over as-is in behavior.
- Adding Vue component tests, `@vue/test-utils`, or browser-mode testing. The two existing tests are pure TS.
- Changing test conventions (file location, naming, describe nesting). The `testing` skill governs these.
- CI workflow changes beyond what `npm test` already runs (no separate test job exists today; `npm test` is the entry point).

## Current state

- `frontend/package.json`: Jest 30, ts-jest 29, jest-environment-jsdom 30, @types/jest. Test script: `"test": "jest"`.
- `frontend/jest.config.json`: ts-jest preset, jsdom env, `<rootDir>/src` roots, `**/?(*.)+(test).ts` match, `@/*` mapper, 10s timeout, coverage from `src/**/*.ts` excluding `*.d.ts` and `__generated__`.
- `frontend/tsconfig.test.json`: includes `src/**/*.test.ts`, `types: ["jest", "vite/client"]`.
- Test files (2): `src/utils/validation.test.ts`, `src/lib/appStorage.test.ts`. Both use globals (`describe`, `it`, `expect`, `beforeEach`). No `jest.fn`, no `jest.mock`, no module mocks, no fake timers.
- `frontend/vite.config.ts`: existing Vite config with `vue()`, `vueDevTools()`, `VitePWA(...)`, and `@/*` alias.

## Design decisions

| decision | choice | reason |
|---|---|---|
| imports vs globals | explicit imports from `vitest` | Vitest default; better IDE jump-to-def; only 2 files to edit |
| DOM env | `jsdom` | matches current setup; mature; already a transitive dep |
| config location | separate `vitest.config.ts` | isolates test config from build plugins (`VitePWA`, `vueDevTools`) that are irrelevant — and potentially noisy — for tests |
| coverage provider | `@vitest/coverage-v8` | Vitest-native default; no extra Babel/Istanbul stack |
| constitution update | same PR | doc and code stay in sync |

## Changes

### 1. `frontend/package.json`

Remove devDependencies:

- `jest`
- `jest-environment-jsdom`
- `ts-jest`
- `@types/jest`

Add devDependencies:

- `vitest`
- `@vitest/coverage-v8`
- `jsdom` (currently transitive via `jest-environment-jsdom`; promote to direct)

Update scripts:

- `"test": "vitest run"` (single-shot, CI-friendly default — matches current `jest` behavior of one-and-done)
- Add `"test:watch": "vitest"` (interactive watch mode; opt-in)
- Add `"test:coverage": "vitest run --coverage"` (replaces ad-hoc `jest --coverage`)

`npm test` MUST continue to exit non-zero on failure and run all tests once. The `vitest run` form (not `vitest`) is required because bare `vitest` enters watch mode.

### 2. New `frontend/vitest.config.ts`

```ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    globals: false,
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/__generated__/**"],
      reportsDirectory: "coverage",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

Notes:

- Standalone config — does not import or extend `vite.config.ts`. Tests don't need `vue()` (no SFC under test today), `VitePWA`, or `vueDevTools`. Keeping them out shaves startup and avoids PWA service-worker injection during test runs.
- The `@/*` alias is duplicated rather than shared. Acceptable: it's one line, and the cost of factoring it out (a third config file or a shared constant) outweighs the benefit at this size. Revisit if a third config needs the alias.
- `globals: false` is the default; stated explicitly to make the choice readable.
- `include` mirrors the current Jest `testMatch`. Tests live only under `src/`.
- `testTimeout` preserves the current 10s budget.
- Coverage `include`/`exclude` mirror current `collectCoverageFrom`. `reporter` matches current Jest reporters.

### 3. Delete `frontend/jest.config.json`

No longer used.

### 4. `frontend/tsconfig.test.json`

Replace `types: ["jest", "vite/client"]` with `types: ["vite/client"]`. With explicit imports, no global ambient types are needed for `describe`/`it`/`expect`. `vite/client` stays for `import.meta.env` typing if any test ever needs it.

### 5. Test file edits

Both files: add a top-of-file import.

`src/utils/validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
```

`src/lib/appStorage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
```

No assertion or structural changes. Vitest's `expect` matchers used here (`toBe`, `toBeNull`, `not.toThrow`) are 1:1 compatible.

### 6. `docs/constitution.md:42`

Change frontend testing line:

- From: `- **Testing**: Jest`
- To:   `- **Testing**: Vitest`

Backend (line 23) and infra-cdk (line 60) entries remain `Jest`.

### 7. ESLint

Verify `eslint.config.ts` does not declare a `jest` env or `jest/*` plugin. If it does, drop those entries. (Quick check at implementation time; expected to be a no-op given the current minimal ESLint setup.)

### 8. Files explicitly NOT changed

- `frontend/vite.config.ts` — build config stays untouched. No `/// <reference types="vitest" />`, no test block.
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md` — no current mention of Jest specific to the frontend.
- `.claude/skills/testing/` — already runner-neutral after PR #449.
- Backend and infra-cdk packages.

## Validation

After implementing, in `frontend/`:

1. `rm -rf node_modules package-lock.json && npm install` succeeds.
2. `npm test` runs Vitest, exits 0, and reports both test files passing with all `it` cases green.
3. `npm test -- src/utils/validation.test.ts` runs only that file and passes.
4. `npm run test:coverage` produces a `coverage/` directory containing `lcov.info` and `index.html`, with `src/__generated__/**` excluded.
5. `npm run typecheck` passes with no `Cannot find name 'jest'` or related errors.
6. `npm run lint` passes.
7. `grep -rn "jest" frontend/package.json frontend/tsconfig.test.json frontend/src` returns no results other than commit-message-like strings (none expected).
8. `frontend/jest.config.json` is removed from the working tree.
9. `docs/constitution.md` line 42 reads `Vitest`; lines 23 and 60 still read `Jest`.

## Risk and rollback

- Risk surface is small: 2 test files, no mocks, no fake timers, no module mocks. The most likely breakage is a config typo (path, alias, env) caught immediately by `npm test`.
- Rollback is trivial: revert the single PR.
