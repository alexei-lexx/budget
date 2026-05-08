# Infra-CDK Vitest Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Commits:** Per `CLAUDE.md`, never run `git commit` unless the user explicitly asks. This plan omits commit steps. The owner decides when to commit (typically once at the end after all validations pass, or wherever they prefer).

**Goal:** Replace Jest with Vitest as the test runner in `infra-cdk/`, keep `auth-cdk.test.ts` behavior unchanged, replace the two empty placeholder tests with one minimal synth-and-assert each, update the constitution.

**Architecture:** Standalone `infra-cdk/vitest.config.ts` configures a Node-environment runner that picks up tests under `test/`. Existing `@jest/globals` imports become explicit `vitest` imports — assertions are 1:1 compatible. The two placeholder test files (`backend-cdk.test.ts`, `frontend-cdk.test.ts`) get one real synth-and-assert apiece, instantiating the stack with the minimum props and asserting key resource counts via `Template.fromStack`.

**Tech Stack:** AWS CDK v2 (`aws-cdk-lib`), TypeScript strict (NodeNext), Vitest, Node 24.

**Spec:** `docs/superpowers/specs/2026-05-08-infra-cdk-vitest-migration-design.md`

**Branch:** `infra-cdk-vitest-migration` (already created off `main`; spec already committed as `27d7b4c9`).

---

## Pre-flight

These commands run from the repo root unless noted. Only the `infra-cdk/` package is touched until the constitution edit at the end.

Sanity-check before you start:

- [ ] **Step P.1: Confirm baseline tests pass under Jest**

Run: `npm --prefix infra-cdk test`
Expected: All three test files pass under Jest. `auth-cdk.test.ts` runs 4 `it` cases; `backend-cdk.test.ts` and `frontend-cdk.test.ts` each have one empty `it` that passes trivially. This is the regression target — the equivalent suite must pass after migration.

- [ ] **Step P.2: Confirm typecheck and lint are green**

Run: `npm --prefix infra-cdk run typecheck && npm --prefix infra-cdk run lint`
Expected: Exit 0 from both.

If either is red before you start, stop. Investigate and fix before proceeding — don't carry pre-existing breakage into the migration.

---

## Task 1: Update `infra-cdk/package.json` (deps + script)

**Files:**
- Modify: `infra-cdk/package.json`

- [ ] **Step 1.1: Remove Jest devDependencies**

Edit `infra-cdk/package.json`. Remove these three entries from `devDependencies`:

```json
"@types/jest": "^30.0.0",
"jest": "^30.2.0",
"ts-jest": "^29.4.6",
```

- [ ] **Step 1.2: Add Vitest devDependency**

Add this entry to `devDependencies` (preserve alphabetical order — `vitest` belongs near the bottom of the list):

```json
"vitest": "^3.2.0",
```

Pin to the same major as the `frontend/` package's Vitest version. Cross-check with `frontend/package.json` and match the `^3.x` major in use there. If `frontend/` has moved on (e.g. `^4.x`), match that — keeping infra-cdk on a different Vitest major is unnecessary fragmentation.

- [ ] **Step 1.3: Update the `test` script**

Replace the `test` script value:

- From: `"test": "jest",`
- To:   `"test": "vitest run",`

`vitest run` (single-shot) matches Jest's exit-on-completion semantics. Bare `vitest` enters watch mode and is wrong here.

- [ ] **Step 1.4: Reinstall dependencies**

Run: `npm --prefix infra-cdk install`
Expected: `npm install` exits 0; `package-lock.json` updates with `vitest` (and its transitive deps) added and `jest` / `ts-jest` / `@types/jest` removed.

If `npm install` warns about peer-dependency conflicts, read the warning carefully. Vitest's peers are minimal; conflicts here are unexpected and worth investigating before continuing.

- [ ] **Step 1.5: Sanity-check the diff on `package.json`**

Run: `git -C infra-cdk diff package.json`
Expected: Exactly the three Jest entries removed, one `vitest` entry added, and the `test` script swapped. Nothing else.

If the diff shows other changes (e.g., npm reordered keys), revert those — keep the diff surgical.

---

## Task 2: Create `infra-cdk/vitest.config.ts`

**Files:**
- Create: `infra-cdk/vitest.config.ts`

- [ ] **Step 2.1: Write the config file**

Create `infra-cdk/vitest.config.ts` with this exact content:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globals: false,
  },
});
```

Why each line:
- `environment: "node"` — CDK is Node-only; no DOM is needed.
- `include` mirrors the current Jest `roots: ["<rootDir>/test"]` + `testMatch: ["**/*.test.ts"]`.
- `globals: false` — explicit imports (Vitest default; stated explicitly for readability and to make the choice intentional).

No `testTimeout`, no `resolve.alias`, no `coverage` block — see spec for justification.

- [ ] **Step 2.2: Typecheck the new config file**

Run: `npm --prefix infra-cdk run typecheck`
Expected: Exit 0. The new file MUST typecheck against the existing `infra-cdk/tsconfig.json`.

If typecheck fails on `vitest.config.ts`, the most likely cause is the `vitest/config` import not resolving — verify Step 1.4 succeeded and `node_modules/vitest/config.js` exists.

---

## Task 3: Delete `infra-cdk/jest.config.json`

**Files:**
- Delete: `infra-cdk/jest.config.json`

- [ ] **Step 3.1: Remove the file**

Run: `git -C infra-cdk rm jest.config.json`
Expected: `rm 'jest.config.json'`. The file is staged for deletion.

If `git rm` reports the file is not tracked, the working tree differs from `HEAD`. Stop and investigate — the file SHOULD be tracked at this point.

---

## Task 4: Migrate `auth-cdk.test.ts` imports

**Files:**
- Modify: `infra-cdk/test/auth-cdk.test.ts:1`

- [ ] **Step 4.1: Replace the import line**

Edit `infra-cdk/test/auth-cdk.test.ts`. Change line 1:

- From: `import { beforeEach, describe, expect, it } from "@jest/globals";`
- To:   `import { beforeEach, describe, expect, it } from "vitest";`

No other changes to this file. The four `it` cases, all assertions (`toBe`, `toBeDefined`, `toContain`), and the `beforeEach` block are 1:1 compatible with Vitest.

- [ ] **Step 4.2: Run only this test file under Vitest**

Run: `npm --prefix infra-cdk test -- test/auth-cdk.test.ts`
Expected: Vitest runs the file, all 4 `it` cases pass, exit 0.

Sample expected output (counts may differ slightly across Vitest versions):

```
✓ test/auth-cdk.test.ts (4 tests)
  ✓ AuthCdkStack > default configuration > should create the stack
  ✓ AuthCdkStack > default configuration > should create Pre Token Generation Lambda for access token customization
  ✓ AuthCdkStack > self sign-up > should enable self sign-up when selfSignUpEnabled is true
  ✓ AuthCdkStack > self sign-up > should disable self sign-up when selfSignUpEnabled is false

Test Files  1 passed (1)
     Tests  4 passed (4)
```

If a test fails, it indicates a real assertion mismatch — Vitest does not silently change `toBe` / `toBeDefined` / `toContain` semantics. Read the failure message; do not blanket-skip the test.

If Vitest reports "no test files found", the `include` glob in `vitest.config.ts` is wrong or the file path argument is wrong. Re-check Step 2.1.

---

## Task 5: Replace `backend-cdk.test.ts` with a real synth test

**Files:**
- Rewrite: `infra-cdk/test/backend-cdk.test.ts` (full file replacement — the existing content is a no-op placeholder)

- [ ] **Step 5.1: Replace the file contents**

Overwrite `infra-cdk/test/backend-cdk.test.ts` with this exact content. Note the resource counts marked `0` — these are intentional sentinel values that will fail; Step 5.2 reads the actual numbers from the failure message.

```ts
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { describe, expect, it } from "vitest";
import { BackendCdkStack } from "../lib/backend-cdk-stack";

describe("BackendCdkStack", () => {
  it("synthesizes with the expected DynamoDB tables and Lambda functions", () => {
    const app = new cdk.App();
    const authStack = new cdk.Stack(app, "AuthStack");
    const userPool = new UserPool(authStack, "UserPool");
    const userPoolClient = userPool.addClient("Client");

    const stack = new BackendCdkStack(app, "TestBackendCdkStack", {
      authClaimNamespace: "https://test",
      nodeEnv: "test",
      userPool,
      userPoolClient,
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::DynamoDB::Table", 0);
    template.resourceCountIs("AWS::Lambda::Function", 0);
    expect(stack).toBeDefined();
  });
});
```

- [ ] **Step 5.2: Run the test, read actual counts from the failure**

Run: `npm --prefix infra-cdk test -- test/backend-cdk.test.ts`
Expected: FAIL. Vitest reports two `resourceCountIs` mismatches. Read the actual counts from the failure message. Example failure shape:

```
Error: Template has 7 resources with type AWS::DynamoDB::Table, but only 0 expected
```

Record both actual numbers (Tables and Functions). These come from the synthesized CloudFormation template, which can include CDK-managed resources you might not expect; trust the failure message, not a manual count of the source file.

If the test fails for a different reason — e.g. `BackendCdkStack` constructor throws because of a missing prop or a context lookup — fix the test setup before locking in counts. The most likely issue would be a prop the stack reads that wasn't supplied; cross-check `BackendCdkStackProps` in `lib/backend-cdk-stack.ts:12-19` against the props you passed.

- [ ] **Step 5.3: Update the test with real counts**

Edit `infra-cdk/test/backend-cdk.test.ts`. Replace both `0` sentinels with the actual numbers from Step 5.2:

```ts
template.resourceCountIs("AWS::DynamoDB::Table", <ACTUAL_TABLE_COUNT>);
template.resourceCountIs("AWS::Lambda::Function", <ACTUAL_FUNCTION_COUNT>);
```

- [ ] **Step 5.4: Run the test again — must pass**

Run: `npm --prefix infra-cdk test -- test/backend-cdk.test.ts`
Expected: PASS. One `it` case green, exit 0.

If it still fails, the count drifted between runs (unlikely — synth is deterministic for the same inputs). Re-read the failure message.

---

## Task 6: Replace `frontend-cdk.test.ts` with a real synth test

**Files:**
- Rewrite: `infra-cdk/test/frontend-cdk.test.ts` (full file replacement)

- [ ] **Step 6.1: Replace the file contents**

Overwrite `infra-cdk/test/frontend-cdk.test.ts` with this exact content. The `0` sentinels for `resourceCountIs` are again intentional — Step 6.2 reads actual counts from the failure.

```ts
import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { FrontendCdkStack } from "../lib/frontend-cdk-stack";

describe("FrontendCdkStack", () => {
  it("synthesizes with an S3 bucket and a CloudFront distribution", () => {
    const app = new cdk.App();
    const carrierStack = new cdk.Stack(app, "CarrierStack", {
      env: { account: "111111111111", region: "us-east-1" },
    });
    const httpApi = apigatewayv2.HttpApi.fromHttpApiAttributes(
      carrierStack,
      "ImportedHttpApi",
      { httpApiId: "test-http-api-id" },
    );

    const stack = new FrontendCdkStack(app, "TestFrontendCdkStack", {
      env: { account: "111111111111", region: "us-east-1" },
      httpApi,
      nodeEnv: "test",
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::S3::Bucket", 0);
    template.resourceCountIs("AWS::CloudFront::Distribution", 0);
    expect(stack).toBeDefined();
  });
});
```

Why the explicit `env`: `FrontendCdkStack` calls `ssm.StringParameter.valueFromLookup(...)`, which rejects environment-agnostic stacks. The account/region values are arbitrary placeholders for the test — no real AWS calls happen during synth.

- [ ] **Step 6.2: Run the test, read actual counts from the failure**

Run: `npm --prefix infra-cdk test -- test/frontend-cdk.test.ts`
Expected: FAIL with two `resourceCountIs` mismatches. Read both actual counts (Buckets, Distributions).

Possible alternate failure: the SSM lookup returns a dummy placeholder string on the first run (no `cdk.context.json` cache), and the stack's `hasCustomDomain` guard at `lib/frontend-cdk-stack.ts:39-42` correctly treats `dummy-value-for-...` as "no custom domain". So the test should not enter the custom-domain branch. If you see Route 53 / ACM resources in the synth output, the guard isn't firing — read the SSM value to confirm.

If the test fails because of the `valueFromLookup` requiring an explicit env, the error message says so directly (`Cannot retrieve value from context provider ssm since account/region are not specified`); confirm Step 6.1 included the `env` block on both `Stack` constructions.

- [ ] **Step 6.3: Update the test with real counts**

Edit `infra-cdk/test/frontend-cdk.test.ts`. Replace both `0` sentinels with the actual numbers from Step 6.2.

- [ ] **Step 6.4: Run the test again — must pass**

Run: `npm --prefix infra-cdk test -- test/frontend-cdk.test.ts`
Expected: PASS. One `it` case green, exit 0.

---

## Task 7: Run the full validation pipeline

**Files:** none modified — validation only.

- [ ] **Step 7.1: Run the full Vitest suite**

Run: `npm --prefix infra-cdk test`
Expected: 3 test files, 6 `it` cases total (4 in `auth-cdk.test.ts`, 1 each in `backend-cdk.test.ts` and `frontend-cdk.test.ts`), all green, exit 0.

If the suite finds fewer than 3 files, the `include` glob in `vitest.config.ts` is wrong. If it finds more, an unexpected `*.test.ts` file exists under `test/` — investigate.

- [ ] **Step 7.2: Typecheck the package**

Run: `npm --prefix infra-cdk run typecheck`
Expected: Exit 0. No `Cannot find name 'jest'`, no `Cannot find module '@jest/globals'`.

If typecheck reports errors, the most likely cause is a stale reference to `@jest/globals` in a file you forgot to migrate. `grep -rn "@jest/globals" infra-cdk/test` SHOULD return nothing.

- [ ] **Step 7.3: Lint the package**

Run: `npm --prefix infra-cdk run lint`
Expected: Exit 0.

The new test files use the same import style as `auth-cdk.test.ts`, so `import/order` and `sort-imports` rules should pass without adjustment.

- [ ] **Step 7.4: Grep for residual Jest references**

Run: `grep -rn "jest\|@jest" infra-cdk/package.json infra-cdk/test infra-cdk/vitest.config.ts`
Expected: No results. Exit 1 from `grep`.

If anything matches, fix the matching file. The migration is incomplete until this grep is empty.

- [ ] **Step 7.5: Confirm `jest.config.json` is gone**

Run: `test ! -e infra-cdk/jest.config.json && echo OK`
Expected: `OK`.

---

## Task 8: Update `docs/constitution.md` line 60

**Files:**
- Modify: `docs/constitution.md:60`

- [ ] **Step 8.1: Verify the line still says Jest**

Run: `sed -n '60p' docs/constitution.md`
Expected output: `- **Testing**: Jest`

If the output is anything else, the line numbering shifted (someone edited the file between when the spec was written and now). Re-locate the infra-cdk Testing line by reading the "Infra CDK" section heading at line 52 and the few lines after; the testing line is the third bullet under it.

- [ ] **Step 8.2: Edit line 60**

Edit `docs/constitution.md`. Change line 60:

- From: `- **Testing**: Jest`
- To:   `- **Testing**: Vitest`

Backend (line 23) MUST remain `Jest`. Frontend (line 42) MUST remain `Vitest`. Only the infra-cdk entry changes.

- [ ] **Step 8.3: Verify all three entries are correct**

Run: `grep -n "Testing" docs/constitution.md | head -3`
Expected output:

```
23:- **Testing**: Jest
42:- **Testing**: Vitest
60:- **Testing**: Vitest
```

If line 23 is anything other than `Jest` or line 42/60 is anything other than `Vitest`, stop and reconcile.

---

## Task 9: Final sanity sweep

**Files:** none modified — verification only.

- [ ] **Step 9.1: Re-run full test + typecheck + lint as a single chain**

Run: `npm --prefix infra-cdk test && npm --prefix infra-cdk run typecheck && npm --prefix infra-cdk run lint`
Expected: All three exit 0. The chained `&&` ensures any failure short-circuits and surfaces immediately.

- [ ] **Step 9.2: Review the working-tree diff**

Run: `git -C . status -s && echo --- && git -C . diff --stat`
Expected staged/unstaged set:

```
 M docs/constitution.md
 D infra-cdk/jest.config.json
 M infra-cdk/package-lock.json
 M infra-cdk/package.json
 M infra-cdk/test/auth-cdk.test.ts
 M infra-cdk/test/backend-cdk.test.ts
 M infra-cdk/test/frontend-cdk.test.ts
?? infra-cdk/vitest.config.ts
```

(Order may differ; the path set MUST match.)

If extra files appear (e.g. `cdk.context.json` updated by a synth), decide whether to include them. A new `cdk.context.json` from running the frontend synth test in CI-clean conditions is acceptable but worth noting in the PR description.

- [ ] **Step 9.3: Hand back to the user**

Stop here. Per `CLAUDE.md`, do not commit or open a PR without explicit instruction. Summarize what was done in chat and ask whether to commit, push, or open a PR.

---

## Self-Review Notes (writing-plans skill)

Spec coverage check (each spec section → task that implements it):

- Spec §1 `package.json` → Task 1
- Spec §2 `vitest.config.ts` → Task 2
- Spec §3 Delete `jest.config.json` → Task 3
- Spec §4 Test file edits (3 files) → Tasks 4, 5, 6
- Spec §5 Constitution line 60 → Task 8
- Spec §6 Files explicitly NOT changed → enforced via the surgical-diff check in Step 9.2
- Spec Validation §1–§8 → mapped to Steps 1.4, 7.1, 7.2 (proxy for "test single file" since auth-cdk runs in 4.2), 7.3, 7.4, 7.5, 8.3

No placeholders in code — `0` sentinels in Tasks 5 and 6 are intentional TDD-failure values that get replaced from the test runner's own output, not "TODO" markers.

Type/identifier consistency: `BackendCdkStack`, `FrontendCdkStack`, `AuthCdkStack` match `lib/*.ts`. Prop names (`authClaimNamespace`, `nodeEnv`, `userPool`, `userPoolClient`, `httpApi`) match `BackendCdkStackProps` and `FrontendCdkStackProps` interfaces in source.
