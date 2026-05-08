# Backend Vitest Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Jest with Vitest 4.1.5 in `backend/`, using a single `vitest.config.ts` with the `projects` feature for the unit/repositories/integration test groups, while preserving all current behavioral surface (test counts, sequential workers, opt-in integration runs, langchain custom matchers).

**Architecture:** A single root `vitest.config.ts` declares three sub-projects with their own `include`/`testTimeout`/`maxWorkers`/`setupFiles`. A one-shot codemod rewrites Jest API calls (`jest.fn`, `jest.Mocked`, `jest.MockedFunction`, `jest.useFakeTimers`, etc.) to their Vitest equivalents across all `*.test.ts`, `*.int.test.ts`, and mock-helper files. The `integration-matchers.ts` setup file is rewritten to augment Vitest's `Assertion` interface instead of Jest's `Matchers`. Constitution and the `backend-repository` skill are updated to match. Single PR off the existing `backend-vitest-migration` branch.

**Tech Stack:** Vitest 4.1.5, `@vitest/coverage-v8` 4.1.5, Node 22, TypeScript strict, ESM, dotenvx, DynamoDB Local (via Docker for repository tests).

**Spec:** `docs/superpowers/specs/2026-05-08-backend-vitest-migration-design.md`

---

## Pre-conditions

- Working directory: `/home/alex/workspace/budget2`
- Branch: `backend-vitest-migration` (already created from `main` at `5f9750ff`; spec commit `f151e387` already lives on this branch)
- All commands below assume cwd = `/home/alex/workspace/budget2/backend` (the engineer SHOULD use `npm --prefix backend ...` or a subshell — never `cd` into the package per CLAUDE.md)

---

## Task 1: Update `package.json` deps and scripts

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Verify current branch**

```bash
git -C /home/alex/workspace/budget2 branch --show-current
```

Expected output: `backend-vitest-migration`

If anything else, stop and re-establish the branch before continuing.

- [ ] **Step 2: Edit `backend/package.json` — replace test scripts**

Find the `"scripts"` block. Replace the existing test-related scripts with this exact set (keep all other scripts untouched):

```jsonc
"test:unit":         "dotenvx run -f .env.test -- vitest run --project unit",
"test:repositories": "dotenvx run -f .env.test -- vitest run --project repositories",
"test:integration":  "dotenvx run -f .env.test -- vitest run --project integration",
"test":              "npm run test:unit && npm run test:repositories",
"test:watch":        "dotenvx run -f .env.test -- vitest --project unit --project repositories",
"test:coverage":     "dotenvx run -f .env.test -- vitest run --project unit --project repositories --coverage",
```

Notes:
- `test:integration` keeps the same opt-in shape it has today.
- `test:watch` and `test:coverage` are new; they cover the same default subset as `npm test`.
- Bare `vitest` enters watch mode; `vitest run` is the single-shot equivalent of Jest's default behavior.

- [ ] **Step 3: Edit `backend/package.json` — devDependencies**

In the `"devDependencies"` block:

Remove these three entries:
```jsonc
"@jest/globals": "^30.0.0",
"jest": "^30.2.0",
"ts-jest": "^29.4.5",
```

Add these two entries (keep the alphabetic order of the block):
```jsonc
"@vitest/coverage-v8": "^4.1.5",
"vitest": "^4.1.5",
```

- [ ] **Step 4: Install**

```bash
npm --prefix backend install
```

Expected: install succeeds; `backend/node_modules/vitest/` exists; `backend/node_modules/jest/` does not.

Verify:
```bash
ls backend/node_modules/vitest/package.json backend/node_modules/@vitest/coverage-v8/package.json
test ! -d backend/node_modules/jest && echo "jest removed OK"
test ! -d backend/node_modules/ts-jest && echo "ts-jest removed OK"
```

Expected: both `ls` lines succeed; both `test ! -d` echo `OK`.

- [ ] **Step 5: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/package.json backend/package-lock.json
git -C /home/alex/workspace/budget2 commit -m "chore(backend): swap jest for vitest in deps and scripts"
```

---

## Task 2: Create `vitest.config.ts`

**Files:**
- Create: `backend/vitest.config.ts`

- [ ] **Step 1: Write the config file**

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

- [ ] **Step 2: Verify the config parses**

```bash
npm --prefix backend exec -- vitest --version
```

Expected: `vitest/4.1.5 ...`. (The version banner does not parse the config, but this confirms the binary is available; the next task exercises the config.)

- [ ] **Step 3: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/vitest.config.ts
git -C /home/alex/workspace/budget2 commit -m "chore(backend): add vitest.config.ts with unit/repositories/integration projects"
```

---

## Task 3: Migrate the langchain custom matcher setup file

**Files:**
- Modify: `backend/src/utils/test-utils/integration-matchers.ts`

- [ ] **Step 1: Replace file contents**

Overwrite `backend/src/utils/test-utils/integration-matchers.ts` with:

```ts
import { LangChainMatchers, langchainMatchers } from "@langchain/core/testing";
import { expect } from "vitest";

expect.extend(langchainMatchers);

declare module "vitest" {
  // LangChainMatchers is generic over the assertion return type; in Vitest the
  // chainable type is `Assertion<T>`, so we map it through.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends LangChainMatchers<Assertion<T>> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends LangChainMatchers<unknown> {}
}
```

- [ ] **Step 2: Typecheck this file in isolation if possible**

```bash
npm --prefix backend run typecheck
```

Expected: passes, OR fails only with errors elsewhere in the codebase that are still using `@jest/globals` (those are addressed in Task 5). The integration-matchers file itself MUST not produce errors.

If TypeScript complains about the `Assertion<T = any>` augmentation specifically (e.g., `Type 'LangChainMatchers<...>' has no signatures matching ...`), apply the documented fallback from the spec §5: replace the body with

```ts
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends LangChainMatchers<any> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends LangChainMatchers<unknown> {}
}
```

Re-run typecheck and proceed with whichever variant compiles.

- [ ] **Step 3: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/src/utils/test-utils/integration-matchers.ts
git -C /home/alex/workspace/budget2 commit -m "refactor(backend): port integration matchers setup to vitest"
```

---

## Task 4: Write the codemod script

**Files:**
- Create: `backend/tmp/jest-to-vitest-codemod.ts`

(Per CLAUDE.md: temp files go in `tmp/` of the relevant package.)

- [ ] **Step 1: Create the `tmp` directory if missing**

```bash
mkdir -p backend/tmp
```

- [ ] **Step 2: Write the script**

Write the following file at `backend/tmp/jest-to-vitest-codemod.ts`:

```ts
/* Run with: npx tsx tmp/jest-to-vitest-codemod.ts (from backend/)
 *
 * Mechanically rewrites Jest API usage to Vitest API usage across
 * test files and test-utils helpers in this package.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const find = (cmd: string): string[] =>
  execSync(cmd, { cwd: "src" })
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((p) => `src/${p}`);

const testFiles = find(`find . -name '*.test.ts'`);
const intFiles = find(`find . -name '*.int.test.ts'`);
const utilFiles = (() => {
  try {
    return execSync(
      `grep -rl '@jest/globals' src/utils/test-utils`,
    )
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
})();

const files = [...new Set([...testFiles, ...intFiles, ...utilFiles])];

let changed = 0;
for (const file of files) {
  const original = readFileSync(file, "utf8");
  if (!original.includes("@jest/globals") && !/\bjest\./.test(original)) {
    continue;
  }

  let content = original;

  // 1. Detect type-name usage BEFORE substitution.
  const usesMockedFunction = /\bjest\.MockedFunction\b/.test(content);
  const usesMocked = /\bjest\.Mocked\b/.test(content);
  const usesMock = /\bjest\.Mock\b/.test(content);

  // 2. Order matters: longest first so \b excludes substrings.
  content = content.replace(/\bjest\.MockedFunction\b/g, "MockedFunction");
  content = content.replace(/\bjest\.Mocked\b/g, "Mocked");
  content = content.replace(/\bjest\.Mock\b/g, "Mock");
  content = content.replace(/\bjest\./g, "vi.");

  // 3. Rewrite the @jest/globals import to vitest.
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']@jest\/globals["'];?/g,
    (_match, raw: string) => {
      const names = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((n) => (n === "jest" ? "vi" : n));
      const has = (n: string) =>
        names.some((entry) =>
          entry === n || entry === `type ${n}`,
        );
      if (usesMockedFunction && !has("MockedFunction")) {
        names.push("type MockedFunction");
      }
      if (usesMocked && !has("Mocked")) {
        names.push("type Mocked");
      }
      if (usesMock && !has("Mock")) {
        names.push("type Mock");
      }
      return `import { ${names.join(", ")} } from "vitest";`;
    },
  );

  if (content !== original) {
    writeFileSync(file, content);
    console.log(`migrated: ${file}`);
    changed += 1;
  }
}

console.log(`\n${changed} file(s) migrated of ${files.length} candidate(s).`);
```

(No commit yet — script will be committed together with the codemod result in Task 5. The script itself is short; if it has a syntax error, Task 5 Step 2 will surface it immediately.)

---

## Task 5: Run the codemod

**Files:**
- Modify: every `backend/src/**/*.test.ts` and `backend/src/**/*.int.test.ts` that imports `@jest/globals` or uses `jest.*` (~58 files)
- Modify: `backend/src/utils/test-utils/**/*-mocks.ts` files importing `@jest/globals` (~4 files)

- [ ] **Step 1: Take a baseline grep so we can compare after**

```bash
grep -rln "@jest/globals" backend/src | wc -l
grep -rEn "\bjest\." backend/src --include='*.ts' | wc -l
```

Record both counts. After the codemod runs, both MUST be 0.

- [ ] **Step 2: Execute the codemod**

```bash
npm --prefix backend exec -- tsx tmp/jest-to-vitest-codemod.ts
```

Expected: prints `migrated: <path>` lines and a final `N file(s) migrated` line. No errors.

- [ ] **Step 3: Verify all `jest` references are gone**

```bash
grep -rln "@jest/globals" backend/src | wc -l
grep -rEn "\bjest\." backend/src --include='*.ts' | wc -l
```

Both MUST output `0`. If not, inspect the offending files and either extend the codemod or fix manually before continuing.

- [ ] **Step 4: Spot-check three migrated files**

```bash
sed -n '1,10p' backend/src/models/account.test.ts
sed -n '1,15p' backend/src/migrations/runner.test.ts
sed -n '1,10p' backend/src/utils/test-utils/repositories/category-repository-mocks.ts
```

Expected:
- `account.test.ts` line 1 imports from `"vitest"` and includes `vi` (no `jest`).
- `runner.test.ts` imports include `vi` and `type MockedFunction`; the `vi.mock(...)` calls are present (no `jest.mock`).
- `category-repository-mocks.ts` imports `{ vi }` and `{ type Mocked }` from `"vitest"`; uses `Mocked<CategoryRepository>` and `vi.fn()`.

If any spot-check fails, fix the file (or fix the codemod and re-run on a clean checkout) before continuing.

- [ ] **Step 5: Run typecheck**

```bash
npm --prefix backend run typecheck
```

Expected: passes.

If errors remain, they are usually one of:
- A file that the codemod missed (rare). Fix manually and re-grep.
- `Mocked<T>` being structurally stricter in Vitest than Jest. If a complex generic class trips, follow the spec's recommended pattern: cast via `as unknown as Mocked<T>` (already used in `create-transaction.test.ts`).
- A test file that uses an exotic `jest.*` API not handled by the codemod. Replace inline with the documented Vitest equivalent.

Fix until typecheck is green.

- [ ] **Step 6: Commit**

```bash
git -C /home/alex/workspace/budget2 add backend/src backend/tmp/jest-to-vitest-codemod.ts
git -C /home/alex/workspace/budget2 commit -m "refactor(backend): migrate test files from jest to vitest API"
```

---

## Task 6: Run the unit project

**Files:** none modified (verification step)

- [ ] **Step 1: Run unit tests**

```bash
npm --prefix backend run test:unit
```

Expected: all unit tests pass; exit 0; no output mentioning Jest. The number of passing tests should match the pre-migration baseline.

If the baseline is unknown, capture the test count from this run as the new baseline.

- [ ] **Step 2: Investigate any failures**

If a test fails:
- For an assertion mismatch — likely a Vitest matcher behaving slightly differently from Jest's. Adjust the assertion.
- For a runtime error like `vi.useFakeTimers().setSystemTime is not a function` — Vitest 4 supports the chained form, but if the version differs from `4.1.5`, fall back to two statements: `vi.useFakeTimers(); vi.setSystemTime(d);`.
- For a `Mocked<T>` shape complaint at runtime (rare) — cast via `as unknown as Mocked<T>` at the assignment site.

Re-run after each fix until the project is green. Commit each material fix individually with a descriptive message (`fix(backend): ...`).

---

## Task 7: Run the repositories project

**Files:** none modified (verification step)

- [ ] **Step 1: Ensure the test database is running**

```bash
npm --prefix backend run test:db:setup
```

Expected: Docker brings up DynamoDB Local; tables are created. Subsequent calls are idempotent.

- [ ] **Step 2: Run repository tests**

```bash
npm --prefix backend run test:repositories
```

Expected: all repository tests pass; sequential execution observed (only one worker; no parallel test starts).

- [ ] **Step 3: Investigate any failures**

Same triage as Task 6, plus:
- If tests interleave or hit "table already exists" / lock contention, double-check `maxWorkers: 1` and `minWorkers: 1` are present on the `repositories` project in `vitest.config.ts`.

Commit fixes individually.

---

## Task 8: Run the integration project

**Files:** none modified (verification step)

- [ ] **Step 1: Run integration tests**

```bash
npm --prefix backend run test:integration
```

Expected: the two `*.int.test.ts` files run; langchain custom matchers (e.g., `toBeRelevantTo`) are available; all pass or skip the same way they did under Jest.

- [ ] **Step 2: Investigate any failures**

- A `expect(...).toBeRelevantTo is not a function` failure means the setup file did not load. Confirm `setupFiles: ["src/utils/test-utils/integration-matchers.ts"]` is on the `integration` project in `vitest.config.ts`.
- TypeScript-level matcher availability complaints (compile time, not runtime) mean the `declare module "vitest"` augmentation in `integration-matchers.ts` did not take effect. Apply the spec §5 fallback (`extends LangChainMatchers<any>`) and re-typecheck.

Commit fixes individually.

---

## Task 9: Verify coverage

**Files:** none modified (verification step)

- [ ] **Step 1: Run coverage**

```bash
npm --prefix backend run test:coverage
```

Expected: the same set of unit + repository tests pass; a `backend/coverage/` directory is created with `index.html` and `lcov.info`.

- [ ] **Step 2: Spot-check the report**

```bash
ls backend/coverage/index.html backend/coverage/lcov.info
```

Expected: both files exist.

If coverage runs but reports unexpected files (e.g., includes `__generated__/`), confirm the `coverage.exclude` block in `vitest.config.ts` matches the spec.

(No commit; this task is purely verification.)

---

## Task 10: Delete the old Jest config files

**Files:**
- Delete: `backend/jest.config.ts`
- Delete: `backend/jest.config.repositories.ts`
- Delete: `backend/jest.config.integration.ts`

- [ ] **Step 1: Delete the three files**

```bash
rm backend/jest.config.ts backend/jest.config.repositories.ts backend/jest.config.integration.ts
```

- [ ] **Step 2: Confirm full validation pipeline still passes**

```bash
npm --prefix backend run typecheck
npm --prefix backend run test
```

Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git -C /home/alex/workspace/budget2 add -u backend
git -C /home/alex/workspace/budget2 commit -m "chore(backend): drop legacy jest config files"
```

---

## Task 11: Update the constitution

**Files:**
- Modify: `docs/constitution.md` (line 24)

- [ ] **Step 1: Replace the testing line**

Find this line in the Backend section:

```
- **Testing**: Jest
```

Replace with:

```
- **Testing**: Vitest
```

Frontend (line 42) and infra-cdk (line 60) entries MUST be left alone — they are already `Vitest`.

- [ ] **Step 2: Commit**

```bash
git -C /home/alex/workspace/budget2 add docs/constitution.md
git -C /home/alex/workspace/budget2 commit -m "docs(constitution): backend testing is now vitest"
```

---

## Task 12: Update the `backend-repository` skill

**Files:**
- Modify: `.claude/skills/backend-repository/SKILL.md` (around line 81–88)

- [ ] **Step 1: Replace the mock example**

Find the block starting `- **Repository mocks** — Jest-mocked repository interfaces ...` and the code block beneath it. Apply this diff:

```diff
-  - **Repository mocks** — Jest-mocked repository interfaces for service tests: `backend/src/utils/test-utils/repositories/<entity>-repository-mocks.ts`
+  - **Repository mocks** — Vitest-mocked repository interfaces for service tests: `backend/src/utils/test-utils/repositories/<entity>-repository-mocks.ts`
     ```typescript
+    import { vi, type Mocked } from "vitest";
+
     export const createMockWidgetRepository =
-      (): jest.Mocked<WidgetRepository> => ({
-        findXyz: jest.fn(),
+      (): Mocked<WidgetRepository> => ({
+        findXyz: vi.fn(),
         // ... all interface methods
       });
     ```
```

- [ ] **Step 2: Verify no other `jest.` references remain in the skill**

```bash
grep -n "jest" .claude/skills/backend-repository/SKILL.md
```

Expected: no output (or output only from this skill's prose that is not API-related; check each match).

- [ ] **Step 3: Commit**

```bash
git -C /home/alex/workspace/budget2 add .claude/skills/backend-repository/SKILL.md
git -C /home/alex/workspace/budget2 commit -m "docs(skill): align backend-repository mock examples with vitest"
```

---

## Task 13: Final cleanup and full validation

**Files:**
- Delete: `backend/tmp/jest-to-vitest-codemod.ts` (one-shot script; no longer needed)

- [ ] **Step 1: Remove the codemod script**

```bash
rm backend/tmp/jest-to-vitest-codemod.ts
```

- [ ] **Step 2: Run lint and format**

```bash
npm --prefix backend run lint
npm --prefix backend run format
```

Expected: both pass with no errors. Format may rewrite some test files (whitespace only); accept those changes.

- [ ] **Step 3: Run the full validation pipeline**

```bash
npm --prefix backend run typecheck
npm --prefix backend run test
npm --prefix backend run test:integration
npm --prefix backend run test:coverage
```

Expected: all four green.

- [ ] **Step 4: Confirm post-conditions match the spec's validation list**

```bash
# 1. No jest references in backend src or package.json
grep -rEn "from \"@jest/globals\"|jest\.(fn|Mock|Mocked|MockedFunction|clearAllMocks|useFakeTimers|useRealTimers|mock)" backend/src
grep -nE "jest|ts-jest" backend/package.json

# 2. Old configs gone
ls backend/jest.config.ts backend/jest.config.repositories.ts backend/jest.config.integration.ts 2>&1 | grep -i "no such"

# 3. Constitution updated
sed -n '20,28p' docs/constitution.md
```

Expected:
- Both grep commands print no matches.
- All three `ls` paths report "No such file or directory".
- The constitution snippet shows `**Testing**: Vitest` under the Backend section.

- [ ] **Step 5: Commit any whitespace changes from format and the codemod removal**

```bash
git -C /home/alex/workspace/budget2 status
git -C /home/alex/workspace/budget2 add -u backend
git -C /home/alex/workspace/budget2 commit -m "chore(backend): post-migration formatting and remove codemod script" || echo "nothing to commit"
```

The `|| echo` allows the task to proceed if there is nothing to commit.

- [ ] **Step 6: Inspect the branch's commits**

```bash
git -C /home/alex/workspace/budget2 log --oneline main..HEAD
```

Expected: a clean, readable sequence of commits in roughly this shape:

```
<sha> chore(backend): post-migration formatting and remove codemod script   (optional)
<sha> docs(skill): align backend-repository mock examples with vitest
<sha> docs(constitution): backend testing is now vitest
<sha> chore(backend): drop legacy jest config files
<sha> refactor(backend): migrate test files from jest to vitest API
<sha> refactor(backend): port integration matchers setup to vitest
<sha> chore(backend): add vitest.config.ts with unit/repositories/integration projects
<sha> chore(backend): swap jest for vitest in deps and scripts
<sha> docs: add backend Vitest migration design spec
```

(Plus any individual `fix(backend): ...` commits made during Tasks 6–8.)

---

## Done

The branch is ready for PR. Open it via `gh pr create` only when the user explicitly asks (per CLAUDE.md "no commits without permission" — same principle applies to PR creation).
