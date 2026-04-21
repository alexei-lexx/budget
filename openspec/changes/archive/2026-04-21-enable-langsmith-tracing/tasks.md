# Tasks: Enable LangSmith Tracing

## 1. Bootstrap — SecureString support and LangSmith bindings

- [x] 1.1 In [backend/src/lambdas/bootstrap.test.ts](backend/src/lambdas/bootstrap.test.ts), add failing tests covering: (a) `GetParametersCommand` is invoked with `WithDecryption: true`, (b) the new LangSmith bindings (`tracing`, `api-key`, `project`) populate the corresponding env vars, (c) absent/partial LangSmith params leave env vars unset and do not throw
- [x] 1.2 Extend [backend/src/lambdas/bootstrap.ts](backend/src/lambdas/bootstrap.ts) `defaultSsmEnvBindings` with the three LangSmith entries under `/manual/budget/${nodeEnv}/langsmith/*`
- [x] 1.3 Pass `WithDecryption: true` in the `GetParametersCommand` call so `SecureString` params are returned decrypted
- [x] 1.4 Verify test `1.1` now passes and existing bootstrap tests still pass

## 2. LangChainAgent — runName plumbing

- [x] 2.1 In [backend/src/langchain/langchain-agent.test.ts](backend/src/langchain/langchain-agent.test.ts), add a failing test asserting that when a `runName` is supplied to the wrapper, the value is forwarded in the `config` argument to `agent.invoke`
- [x] 2.2 Add a failing test asserting that when no `runName` is supplied, the `config` forwarded to `agent.invoke` does not contain a `runName` field
- [x] 2.3 Extend [backend/src/langchain/langchain-agent.ts](backend/src/langchain/langchain-agent.ts) `LangChainAgent` constructor to accept an optional `runName: string` and forward it in `agent.invoke(state, { ...config, runName })`
- [x] 2.4 Verify tests `2.1` and `2.2` pass

## 3. Dependencies wiring — agent names

- [x] 3.1 In [backend/src/dependencies.ts](backend/src/dependencies.ts), set `runName: "assistant-agent"` when constructing the wrapped assistant agent
- [x] 3.2 In the same file, set `runName: "create-transaction-agent"` when constructing the wrapped create-transaction agent

## 4. Subagent tool — inner run name

- [x] 4.1 In [backend/src/langchain/tools/create-transaction-subagent.test.ts](backend/src/langchain/tools/create-transaction-subagent.test.ts), add a failing test asserting the inner `agent.invoke` receives `runName: "create-transaction-agent"` in its config
- [x] 4.2 Update [backend/src/langchain/tools/create-transaction-subagent.ts](backend/src/langchain/tools/create-transaction-subagent.ts) to pass `runName: "create-transaction-agent"` into the inner `agent.invoke(..., config)`
- [x] 4.3 Verify test `4.1` passes

## 5. Infrastructure — IAM for SecureString decryption

- [x] 5.1 In [infra-cdk/lib/backend-cdk-stack.ts](infra-cdk/lib/backend-cdk-stack.ts), grant each of the three Lambda roles (web, background-job, migration) `kms:Decrypt` on the AWS-managed `alias/aws/ssm` key
- [x] 5.2 Confirm the existing `ssm:GetParameters` grant covers the `/manual/budget/${nodeEnv}/langsmith/*` path (wildcard path already in place); expand if necessary
- [x] 5.3 Run `npm run test` from `infra-cdk/` to validate CDK snapshot tests still pass (update snapshots if IAM changes are the only diff)

## 6. Documentation — env examples

- [x] 6.1 In [backend/.env.example](backend/.env.example), document the three LangSmith env vars as commented-out placeholders with a short inline note that tracing is opt-in
- [x] 6.2 In [backend/.env.test.example](backend/.env.test.example), include the same commented-out placeholders and note that tests MUST NOT enable tracing

## 7. Validation

- [x] 7.1 From `backend/`: run `npm test` (unit) and confirm green
- [x] 7.2 From `backend/`: run `npm run typecheck` and `npm run format`, fix any issues
- [x] 7.3 From `infra-cdk/`: run `npm run typecheck` and `npm test`
- [x] 7.4 Manual smoke test (dev): set the three env vars locally with a real LangSmith dev key, trigger an assistant chat and a create-transaction flow, confirm traces appear in LangSmith under `budget-dev` with run names `assistant-agent` and `create-transaction-agent` (including nested subagent)
- [x] 7.5 Manual smoke test (tracing off): unset all three env vars, repeat the flows, confirm no trace data is sent and no errors are raised

## Constitution Compliance

- **Vendor Independence** — Tests in `1.1`, `2.1`, `4.1` validate that behavior is indistinguishable (aside from the forwarded `runName`/env-var side effect) when tracing is disabled. Smoke test `7.5` confirms absence of tracing is a first-class state.
- **Backend Layer Structure** — All code changes live in the infrastructure wrapper (`LangChainAgent`), bootstrap, dependency wiring, and the subagent tool. No service or repository changes.
- **Result Pattern** — Not applicable; no new public service or external-integration methods introduced.
- **Input Validation** — Not applicable; only operational configuration, consistent with existing `requireEnv`/bootstrap patterns (missing config is tolerated).
- **Test Strategy** — TDD applied: each code-changing task group starts with failing tests before the implementation step. Tests co-located with source per constitution rule. No new test directories.
- **TypeScript Code Generation** — New `runName` parameter is a named optional field. No `any` casts, no non-null assertions introduced by these tasks.
- **Code Quality Validation** — Task group `7` runs the full validation pipeline (test, typecheck, lint) from each affected package root.
