# Frontend Vitest Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Commits:** Per `CLAUDE.md`, never run `git commit` unless the user explicitly asks. This plan omits commit steps. The owner decides when to commit (typically once at the end after all validations pass, or wherever they prefer).

**Goal:** Replace Jest with Vitest as the test runner in `frontend/`, keep behavior of existing tests unchanged, update the constitution.

**Architecture:** Vitest reuses Vite's transform pipeline. Tests configured via a standalone `frontend/vitest.config.ts` (not merged into `vite.config.ts`) to avoid pulling `VitePWA`, `vueDevTools`, and `vue()` into the test runtime. Existing tests use Jest-compatible globals → migrated to explicit `vitest` imports. `jsdom` environment retained.

**Tech Stack:** Vue 3, Vite 7, TypeScript strict, Vitest, `@vitest/coverage-v8`, jsdom.

**Spec:** `docs/superpowers/specs/2026-05-07-frontend-vitest-migration-design.md`

---

## Pre-flight

These commands are run from the repo root unless noted. The `frontend/` package is the only one touched until the constitution edit.

Sanity-check before you start:

- [ ] **Step P.1: Confirm baseline tests pass under Jest**

Run: `npm --prefix frontend test`
Expected: Both test files pass under Jest. This proves the regression target — the same tests must pass after migration.

- [ ] **Step P.2: Confirm typecheck and lint are green**

Run: `npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: Exit 0 from both.

If either is red before you start, stop. Investigate and fix before proceeding — don't carry pre-existing breakage into the migration.

---

## Task 1: Update `frontend/package.json` (deps + scripts)

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1.1: Remove Jest devDependencies**

Edit `frontend/package.json`. Remove these four entries from `devDependencies`:

```json
"@types/jest": "^30.0.0",
"jest": "^30.2.0",
"jest-environment-jsdom": "^30.2.0",
"ts-jest": "^29.4.6",
```

- [ ] **Step 1.2: Add Vitest devDependencies**

Add these three entries to `devDependencies` (preserve alphabetical order):

```json
"@vitest/coverage-v8": "^3.2.0",
"jsdom": "^25.0.0",
"vitest": "^3.2.0",
```

If `npm install` resolves to newer majors, use those — pin to whatever npm picks. The exact patch versions don't matter; majors do (Vitest 3, jsdom 25, coverage-v8 3).

- [ ] **Step 1.3: Update test scripts**

Replace the `"test"` line. Add two new scripts. Final scripts block (only the test-related lines shown — leave the others as-is):

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
```

`vitest run` (not bare `vitest`) is required so `npm test` exits after one pass instead of entering watch mode — matches Jest behavior.

- [ ] **Step 1.4: Install dependencies**

Run: `npm --prefix frontend install`
Expected: `package-lock.json` updates. No errors. New `node_modules/vitest/` and `node_modules/@vitest/coverage-v8/` directories exist; `node_modules/jest/` is gone.

Quick check:

```bash
ls frontend/node_modules/.bin/vitest
ls frontend/node_modules/.bin/jest 2>/dev/null && echo "FAIL: jest binary still present" || echo "OK: jest gone"
```

Expected output of the second line: `OK: jest gone`.

---

## Task 2: Create `frontend/vitest.config.ts`

**Files:**
- Create: `frontend/vitest.config.ts`

- [ ] **Step 2.1: Write the config**

Create `frontend/vitest.config.ts` with exactly:

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

Keys mirror the previous Jest config one-for-one:

| Jest config | Vitest equivalent |
|---|---|
| `preset: "ts-jest"` | (none — Vite handles TS natively) |
| `testEnvironment: "jsdom"` | `test.environment: "jsdom"` |
| `roots: ["<rootDir>/src"]` + `testMatch` | `test.include: ["src/**/*.test.ts"]` |
| `moduleNameMapper: { "^@/(.*)$": ... }` | `resolve.alias["@"]` |
| `testTimeout: 10000` | `test.testTimeout: 10000` |
| `collectCoverageFrom` | `test.coverage.include` + `exclude` |
| `coverageDirectory: "coverage"` | `test.coverage.reportsDirectory: "coverage"` |
| `coverageReporters` | `test.coverage.reporter` |

---

## Task 3: Delete `frontend/jest.config.json`

**Files:**
- Delete: `frontend/jest.config.json`

- [ ] **Step 3.1: Remove the file**

Run: `rm frontend/jest.config.json`
Expected: file removed. `git status` shows it as deleted.

- [ ] **Step 3.2: Confirm nothing else references it**

Run: `git -C . grep -nE "jest\.config|jest-environment-jsdom|ts-jest" frontend/ || echo "OK: no references"`
Expected: `OK: no references`. (Hits in `package-lock.json` are fine — npm regenerates that.)

If you find references in `frontend/` source, stop and investigate. None are expected.

---

## Task 4: Update `frontend/tsconfig.test.json`

**Files:**
- Modify: `frontend/tsconfig.test.json`

- [ ] **Step 4.1: Drop the `jest` type from `types`**

Replace the `types` line.

Before:

```json
"types": ["jest", "vite/client"],
```

After:

```json
"types": ["vite/client"],
```

Leave the rest of the file unchanged. With explicit `vitest` imports in tests, no global ambient types are needed for `describe` / `it` / `expect` / `beforeEach`.

- [ ] **Step 4.2: Verify typecheck still passes (will fail until Task 5)**

Run: `npm --prefix frontend run typecheck`
Expected: FAIL with errors like `Cannot find name 'describe'` / `'it'` / `'expect'` in both test files. This is correct — the global `jest` types are gone but the `vitest` imports haven't been added yet. Fixed in Task 5.

If typecheck instead PASSES, the `jest` type was already redundant. Continue regardless.

---

## Task 5: Add explicit `vitest` imports to `validation.test.ts`

**Files:**
- Modify: `frontend/src/utils/validation.test.ts`

- [ ] **Step 5.1: Add the import as the very first line**

Open `frontend/src/utils/validation.test.ts`. Add this line above the existing first line (currently `import { checkRules, type CheckRule } from "./validation";`):

```ts
import { describe, it, expect } from "vitest";
```

Final top of file:

```ts
import { describe, it, expect } from "vitest";
import { checkRules, type CheckRule } from "./validation";
```

No other changes to this file. The body uses only `describe`, `it`, `expect`, `expect(...).toBe(...)` — all 1:1 compatible.

- [ ] **Step 5.2: Run only this test file under Vitest**

Run: `npm --prefix frontend test -- src/utils/validation.test.ts`
Expected: PASS. 4 tests green. Output ends with something like `Test Files  1 passed (1)` and `Tests  4 passed (4)`.

If a test fails, do not "fix" the test — the test code didn't change. The failure means a config issue from Tasks 1–4. Re-check those.

---

## Task 6: Add explicit `vitest` imports to `appStorage.test.ts`

**Files:**
- Modify: `frontend/src/lib/appStorage.test.ts`

- [ ] **Step 6.1: Add the import as the very first line**

Open `frontend/src/lib/appStorage.test.ts`. Add this line above the existing first line (currently `import { appStorage } from "./appStorage";`):

```ts
import { describe, it, expect, beforeEach } from "vitest";
```

Final top of file:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { appStorage } from "./appStorage";
```

This file additionally uses `beforeEach`, hence the extra import. No other changes.

- [ ] **Step 6.2: Run only this test file under Vitest**

Run: `npm --prefix frontend test -- src/lib/appStorage.test.ts`
Expected: PASS. 9 tests green (3 `getItem` + 2 `setItem` + 2 `removeItem` + 2 `clearAll`).

The `localStorage` calls work because `environment: "jsdom"` provides them — same as before.

---

## Task 7: Full validation in `frontend/`

**Files:** none modified — verification only.

- [ ] **Step 7.1: Run the full test suite**

Run: `npm --prefix frontend test`
Expected: PASS. Both files run. Output shows `Test Files  2 passed (2)` and `Tests  13 passed (13)`.

- [ ] **Step 7.2: Run typecheck**

Run: `npm --prefix frontend run typecheck`
Expected: Exit 0. No `Cannot find name 'jest'`, no `Cannot find name 'describe'`.

- [ ] **Step 7.3: Run lint**

Run: `npm --prefix frontend run lint`
Expected: Exit 0. ESLint config has no `jest` env or `jest/*` plugin (verified in spec) — no edits expected.

- [ ] **Step 7.4: Run coverage and verify reporter outputs**

Run: `npm --prefix frontend run test:coverage`
Expected: PASS. `frontend/coverage/lcov.info` and `frontend/coverage/index.html` exist after the run. Console shows a text coverage table.

Quick check:

```bash
test -f frontend/coverage/lcov.info && test -f frontend/coverage/index.html && echo "OK: coverage files present" || echo "FAIL: coverage files missing"
```

Expected: `OK: coverage files present`.

- [ ] **Step 7.5: Verify `__generated__` is excluded from coverage**

Run: `grep -c "__generated__" frontend/coverage/lcov.info || echo 0`
Expected: `0`. Generated GraphQL types must not appear in coverage.

- [ ] **Step 7.6: Final grep — no stray Jest references in source**

Run:

```bash
git -C . grep -nE "jest|@types/jest|ts-jest|jest-environment-jsdom" -- frontend/ ':!frontend/package-lock.json' ':!frontend/coverage/**' || echo "OK: no jest references"
```

Expected: `OK: no jest references`. If `package-lock.json` shows hits, that's fine and excluded above. If anything else appears, investigate before moving on.

---

## Task 8: Update constitution

**Files:**
- Modify: `docs/constitution.md`

- [ ] **Step 8.1: Update the frontend testing entry**

Open `docs/constitution.md`. Find line 42 (frontend section, under `**Technologies**:`):

Before:

```
- **Testing**: Jest
```

After:

```
- **Testing**: Vitest
```

The same string `- **Testing**: Jest` appears in two other sections (backend line 23, infra-cdk line 60) — leave both untouched. Only the frontend entry changes.

- [ ] **Step 8.2: Verify the edit**

Run: `grep -n "Testing" docs/constitution.md`
Expected output:

```
23:- **Testing**: Jest
42:- **Testing**: Vitest
60:- **Testing**: Jest
```

If line numbers drift slightly because earlier sections changed, that's fine — only the *content* must match: backend Jest, frontend Vitest, infra-cdk Jest.

---

## Wrap-up

- [ ] **Step W.1: Re-run full validation one more time**

After all edits:

```bash
npm --prefix frontend test && npm --prefix frontend run typecheck && npm --prefix frontend run lint
```

Expected: all three exit 0.

- [ ] **Step W.2: Show the diff for review**

Run: `git -C . status && git -C . diff --stat`
Expected files in the diff (summary):

- `docs/constitution.md` — 1 line changed
- `docs/superpowers/plans/2026-05-07-frontend-vitest-migration.md` — new (this plan)
- `docs/superpowers/specs/2026-05-07-frontend-vitest-migration-design.md` — new (the design doc)
- `frontend/jest.config.json` — deleted
- `frontend/package-lock.json` — modified
- `frontend/package.json` — modified
- `frontend/src/lib/appStorage.test.ts` — 1 line added
- `frontend/src/utils/validation.test.ts` — 1 line added
- `frontend/tsconfig.test.json` — 1 line modified
- `frontend/vitest.config.ts` — new

No Vue source files (`src/**/*.vue`, `src/**/*.ts` outside the two test files) should appear in the diff.

- [ ] **Step W.3: Hand off to owner**

Stop. Per `CLAUDE.md`, do not commit. Tell the owner the migration is ready for their review and commit.
