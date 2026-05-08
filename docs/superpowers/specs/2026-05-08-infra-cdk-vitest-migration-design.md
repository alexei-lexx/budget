# Migrate `infra-cdk/` from Jest to Vitest

## Goal

Replace Jest with Vitest as the test runner in the `infra-cdk/` package. Mirrors the frontend migration (PR #451) but adjusted for infra-cdk's smaller, Node-environment, alias-free setup.

## Motivation

- Single project-wide direction: frontend already moved to Vitest; backend stays on Jest for now. Aligning infra-cdk with frontend reduces the number of test runners we maintain configuration and skill knowledge for.
- Drop the `ts-jest` transform stack in favor of esbuild (via Vitest), which is the same toolchain the rest of the TypeScript ecosystem we depend on already uses.
- The project skill `testing` (PR #449) was generalized to support Jest and Vitest, removing the last skill-level blocker.

## Out of scope

- Backend migration. Backend remains on Jest. Constitution updates apply only to the infra-cdk section (line 60).
- Expanding test coverage. Each empty placeholder file gets exactly one minimal synth-and-assert (the user explicitly requested "one simple example, don't overengineer"). No additional tests, no expansion of `auth-cdk.test.ts` coverage.
- Adding `test:watch` or `test:coverage` scripts. Neither exists today; YAGNI.
- Changing the `test/` directory layout. CDK init places tests under `test/`; the constitution's co-location rule (line 386) applies to backend specifically. infra-cdk keeps the `test/` convention.
- Adding coverage tooling (`@vitest/coverage-v8`). Not used today.
- ESLint changes. `eslint.config.mjs` declares no `jest` env or `jest/*` plugin.
- Touching any of `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`. None mention infra-cdk testing specifically.

## Current state

- `infra-cdk/package.json`: Jest 30, ts-jest 29, @types/jest 30. Test script: `"test": "jest"`. No coverage, no watch script.
- `infra-cdk/jest.config.json`: `testEnvironment: "node"`, `roots: ["<rootDir>/test"]`, `testMatch: ["**/*.test.ts"]`, `transform: { "^.+\\.tsx?$": "ts-jest" }`. No timeout override, no module mapper.
- `infra-cdk/tsconfig.json`: no `types: ["jest"]` declared; no test-specific tsconfig.
- `infra-cdk/eslint.config.mjs`: no Jest env or plugin.
- Test files (3, in `infra-cdk/test/`):
  - `auth-cdk.test.ts` — real tests against `AuthCdkStack`; uses explicit imports from `@jest/globals` (`describe`, `it`, `expect`, `beforeEach`); assertions: `toBe`, `toBeDefined`, `toContain`. No mocks, no fake timers.
  - `backend-cdk.test.ts` — placeholder: one empty `it("SQS Queue Created", () => {})` plus commented-out `cdk init` boilerplate.
  - `frontend-cdk.test.ts` — same placeholder pattern as `backend-cdk.test.ts`.

## Design decisions

| decision | choice | reason |
|---|---|---|
| imports vs globals | explicit imports from `vitest` | matches frontend; matches existing `@jest/globals` style; mechanical replace |
| environment | `node` | CDK is Node-only; no DOM |
| config location | standalone `vitest.config.ts` | infra-cdk has no Vite build config to extend |
| test directory | keep `test/` | CDK init convention; constitution's co-location rule is backend-specific |
| coverage | none | not used today; YAGNI |
| watch script | none | not used today; YAGNI |
| placeholder tests | replace with one minimal synth+assert each | user request: "add one simple example; don't overengineer" |
| constitution update | same PR | doc and code stay in sync |

## Changes

### 1. `infra-cdk/package.json`

Remove devDependencies:

- `jest`
- `ts-jest`
- `@types/jest`

Add devDependencies:

- `vitest`

Scripts:

- Change `"test": "jest"` → `"test": "vitest run"`

`vitest run` (not bare `vitest`) is required because bare `vitest` enters watch mode. Single-shot exit-on-completion matches current `jest` behavior.

### 2. New `infra-cdk/vitest.config.ts`

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

Notes:

- `environment: "node"` — CDK code runs in Node; no DOM needed.
- `include` mirrors current Jest `roots: ["<rootDir>/test"]` + `testMatch: ["**/*.test.ts"]`.
- `globals: false` — explicit imports (default in Vitest; stated for readability).
- No `testTimeout` — current `jest.config.json` has no override; Vitest default (5s) is enough for these tests.
- No `resolve.alias` — none in use.
- No `coverage` block — coverage is not collected today.

### 3. Delete `infra-cdk/jest.config.json`

No longer used.

### 4. Test file edits

**`test/auth-cdk.test.ts`** — import line only:

- From: `import { beforeEach, describe, expect, it } from "@jest/globals";`
- To:   `import { beforeEach, describe, expect, it } from "vitest";`

No assertion or structural changes. Vitest's `expect` matchers used here (`toBe`, `toBeDefined`, `toContain`) are 1:1 compatible.

**`test/backend-cdk.test.ts`** — replace the empty `it` and commented boilerplate with a single synth-and-assert test:

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
    template.resourceCountIs("AWS::DynamoDB::Table", EXPECTED_TABLE_COUNT);
    template.resourceCountIs("AWS::Lambda::Function", EXPECTED_FUNCTION_COUNT);
    expect(stack).toBeDefined();
  });
});
```

Implementation note: `EXPECTED_TABLE_COUNT` and `EXPECTED_FUNCTION_COUNT` are placeholders that MUST be replaced with concrete integers determined by reading the synthesized CloudFormation template during implementation, not guessed. Reading `lib/backend-cdk-stack.ts` shows 8 `dynamodb.Table` constructs and 3 `lambda.Function` constructs; these are the expected starting values, but the implementer MUST verify by running the test and reading the actual count from the failure message before locking the assertion in.

**`test/frontend-cdk.test.ts`** — same pattern. `FrontendCdkStack` requires `httpApi: IHttpApi` and `nodeEnv: string`. The `IHttpApi` is supplied via `HttpApi.fromHttpApiAttributes` (no real backend stack needed). The SSM lookup `valueFromLookup(..., "")` defaults to the empty-string fallback, which the stack's `hasCustomDomain` guard treats as "no custom domain"; no `cdk.context.json` priming required.

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
    template.resourceCountIs("AWS::S3::Bucket", 1);
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);
    expect(stack).toBeDefined();
  });
});
```

The explicit `env` (account + region) is required because `valueFromLookup` rejects environment-agnostic stacks. `account` and `region` values are arbitrary placeholders for the test.

### 5. `docs/constitution.md` line 60

- From: `- **Testing**: Jest`
- To:   `- **Testing**: Vitest`

Backend (line 23) entry remains `Jest`. Frontend (line 42) is already `Vitest` from PR #451.

### 6. Files explicitly NOT changed

- `infra-cdk/tsconfig.json` — does not declare `types: ["jest"]`, so no edit needed.
- `infra-cdk/eslint.config.mjs` — no Jest env or `jest/*` plugin.
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md` — no infra-cdk-specific Jest mentions.
- Backend and frontend packages.

## Validation

After implementing, in `infra-cdk/`:

1. `rm -rf node_modules package-lock.json && npm install` succeeds.
2. `npm test` runs Vitest, exits 0, and reports all three test files passing with all `it` cases green.
3. `npm test -- test/auth-cdk.test.ts` runs only that file and passes.
4. `npm run typecheck` passes with no `Cannot find name 'jest'` or related errors.
5. `npm run lint` passes.
6. `grep -rn "jest\|@jest" infra-cdk/package.json infra-cdk/test infra-cdk/vitest.config.ts` returns no results.
7. `infra-cdk/jest.config.json` is removed from the working tree.
8. `docs/constitution.md` line 60 reads `Vitest`; line 23 still reads `Jest`.

## Risk and rollback

- Surface is small: 3 test files, no mocks, no fake timers, no aliases, no module mocks. Most likely breakage is a config typo or a wrong resource count in the new synth tests, both caught immediately by `npm test`.
- The two new synth tests are the only behavioral additions. If a stack instantiation pulls in a context dependency we haven't anticipated, the test fails with a clear error message at implementation time — fix or skip.
- Rollback is trivial: revert the single PR.
