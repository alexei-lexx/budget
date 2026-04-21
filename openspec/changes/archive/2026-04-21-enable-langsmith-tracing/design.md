# Design: Enable LangSmith Tracing

## Context

The backend runs two LangChain agents (`assistant-agent`, `create-transaction-agent`) plus a subagent tool (`create_transaction_subagent`) that reinvokes the create-transaction agent internally. All agent runs flow through a thin wrapper at [backend/src/langchain/langchain-agent.ts](backend/src/langchain/langchain-agent.ts) that calls `agent.invoke(state, config)` and collects results via LangChain callback manager.

Runtime configuration is already split across two mechanisms:

1. **Lambda environment variables** set at deploy time via CDK (in [infra-cdk/lib/backend-cdk-stack.ts](infra-cdk/lib/backend-cdk-stack.ts)) — used for values that are stable per deploy (table names, Cognito IDs, `NODE_ENV`).
2. **SSM Parameter Store** read at Lambda cold start by [backend/src/lambdas/bootstrap.ts](backend/src/lambdas/bootstrap.ts) — used for tunables that should be changeable without a redeploy (Bedrock model ID, timeouts, chat history limits). Each Lambda entry point calls `injectRuntimeEnv(process.env)` before any handler logic; results are cached via `createSingleton` so warm starts skip SSM.

The existing `bootstrap.ts` uses SSM `String` parameters only. LangSmith requires an API key — secret — so the pattern must be extended to support `SecureString` parameters.

LangSmith auto-instruments LangChain runs via environment variables that its SDK reads on first use. Setting `LANGSMITH_TRACING=true` + `LANGSMITH_API_KEY=<key>` + `LANGSMITH_PROJECT=<name>` is sufficient to stream traces to the LangSmith backend. No code change in the agent layer is strictly required for basic tracing — only for run naming, which improves trace readability but is not a prerequisite.

The `langsmith@0.5.20` package is already installed as a transitive dependency of `langchain`; no new direct dependencies are added.

## Goals / Non-Goals

**Goals:**

- Ship LangSmith tracing as an **opt-in** feature: fully off by default, on only when `LANGSMITH_TRACING=true` is set.
- Configure independently per environment (dev, staging, prod) with no redeploy needed for secret or project changes.
- Store the API key securely, reusing the existing SSM-driven bootstrap pattern.
- Make agent and subagent runs visually distinguishable in the LangSmith UI.
- Keep the implementation minimal — no metadata enrichment, no sampling, no CloudWatch alarms on volume.
- Preserve current behavior exactly when tracing is disabled (zero SSM/IAM impact when params are absent).

**Non-Goals:**

- User-facing trace UI — that remains the responsibility of `ai-agent-trace`.
- Automated tracing of tests. `.env.test` leaves the tracing env vars unset.
- Budget/usage alerts for LangSmith free-tier overage. Monitor via LangSmith dashboard.
- Sampling, tags, custom metadata (userId, sessionId). Defer until a concrete need emerges.
- Generic observability framework that could support other trace backends (Langfuse, OpenTelemetry). Out of scope for this change.

## Decisions

### Decision 1: Env-var-driven tracing (no code-level SDK integration)

**Choice**: Rely on LangSmith's env-var auto-wiring. Do not construct or pass tracer/callback objects from application code.

**Rationale**: LangSmith's SDK reads `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT` on first LangChain run and installs its own callback handlers automatically. Application code stays clean, and "off" is truly off (no imports, no initialization, no runtime cost when disabled).

**Alternatives considered**:

- Pass a `Client` or tracer explicitly into `createAgent` config → more explicit but requires new imports even when disabled and complicates the wrapper. Rejected.
- Conditionally install a callback handler via `BaseCallbackHandler` → same downsides, plus duplicates what the SDK does automatically.

### Decision 2: Config stored in SSM, under `/manual/budget/${nodeEnv}/langsmith/*`

**Choice**: All three LangSmith env vars come from SSM via the existing bootstrap:

| Param path                                    | Type           | Populates           |
| --------------------------------------------- | -------------- | ------------------- |
| `/manual/budget/${nodeEnv}/langsmith/tracing` | `String`       | `LANGSMITH_TRACING` |
| `/manual/budget/${nodeEnv}/langsmith/api-key` | `SecureString` | `LANGSMITH_API_KEY` |
| `/manual/budget/${nodeEnv}/langsmith/project` | `String`       | `LANGSMITH_PROJECT` |

**Rationale**: Matches the existing pattern. Consistent storage — all three values live in one prefix. Runtime-tunable — rotating the key or renaming the project does not require a redeploy. Missing params are silently skipped by `injectRuntimeEnv`, which implements the "optional" contract for free.

**Alternatives considered**:

- **Project name as CDK Lambda env (`LANGSMITH_PROJECT=budget-${nodeEnv}`)** — saves one SSM lookup but fragments config across two mechanisms and requires a redeploy to change. Rejected.
- **AWS Secrets Manager for the API key** — purpose-built, supports rotation, but introduces a new read path and ~$0.40/mo/secret cost. Not justified for a single-key, manually-rotated use case at this project's scale. Rejected.
- **Lambda env from CDK for the API key (plaintext)** — simplest, but the value appears in CloudFormation templates, Lambda env listings, and CloudTrail events. Weak security posture for a credential. Rejected.

### Decision 3: Bootstrap extended to support SecureString decryption

**Choice**: The single `GetParametersCommand` call in `bootstrap.ts` gains `WithDecryption: true`. The parameter list is a mix of `String` and `SecureString` paths; SSM returns decrypted values for `SecureString` items automatically when decryption is requested.

**Rationale**: One code path, one SDK call, one IAM grant — simplest and already chunked to respect the 10-name-per-call SSM limit. No need to separate bindings by type.

**Alternatives considered**:

- Two separate fetches (strings vs secrets) → doubles cold-start SSM calls for no benefit.

### Decision 4: IAM — `kms:Decrypt` on the AWS-managed `aws/ssm` key

**Choice**: Grant each Lambda role `ssm:GetParameters` on `arn:aws:ssm:*:*:parameter/manual/budget/${nodeEnv}/*` (already granted today) **plus** `kms:Decrypt` on the default `alias/aws/ssm` KMS key.

**Rationale**: SSM `SecureString` with the default AWS-managed key requires the caller to have `kms:Decrypt` permission on that key. Using the AWS-managed key avoids the need to provision and manage a customer-managed key. Scoped to the ssm alias to minimize blast radius.

**Alternatives considered**:

- Customer-managed KMS key (CMK) → more auditability but adds a resource and a rotation responsibility. Not warranted at this scale.

### Decision 5: Run names via the `LangChainAgent` wrapper + inner subagent invoke

**Choice**:

- `LangChainAgent` constructor accepts optional `runName`; passed into `agent.invoke(state, { ...config, runName })`.
- `dependencies.ts` sets `runName: "assistant-agent"` and `"create-transaction-agent"` at wrapper construction.
- `create-transaction-subagent.ts` sets `runName: "create-transaction-agent"` on the inner `agent.invoke(..., config)`.

**Rationale**: Two clear entry points. The LangSmith UI labels each root trace by the agent's logical name. The nested subagent run is also labeled, so a single trace tree reads as `assistant-agent → [tool: create_transaction_subagent] → create-transaction-agent → [tool: create_transaction]` instead of `LangGraph → [tool] → LangGraph`.

**Alternatives considered**:

- Pass `runName` per invocation from the caller → leaks infra concern into service code. Rejected.
- Skip run names entirely → traces still work but are harder to filter/scan in the UI. Declined; run-name plumbing is trivial.

### Decision 6: No sampling, no metadata, no alarms

**Choice**: Trace 100% of runs. No custom tags, metadata, or per-run attributes beyond the default LangChain capture. No CloudWatch alarm on trace volume.

**Rationale**: YAGNI. Current expected traffic is well under the LangSmith free tier (5k traces/mo). Adding sampling or metadata now creates surface area that is not required. If usage grows past the cap or debugging needs emerge, these are single-line additions later — in the SDK config (sampling rate env var) or in the wrapper (`config.metadata`/`config.tags`).

## Risks / Trade-offs

- **Vendor egress / data sensitivity** → Trace payloads include prompts and tool arguments, which may carry user financial details. Mitigation: feature is opt-in per environment; prod can remain off until the data-handling risk is reviewed. Constitution's "Vendor Independence" principle is preserved — tracing is env-gated and app code has zero vendor-specific imports in the hot path.
- **LangSmith outage or SDK bug blocks requests** → LangSmith calls are designed to be fire-and-forget by the SDK, but a misbehaving SDK version could introduce latency. Mitigation: keep tracing off in prod initially; observe dev/staging first. Disabling is instant (unset `LANGSMITH_TRACING` in SSM).
- **API key leak** → SecureString + `kms:Decrypt` grant limits exposure. Key never appears in CloudFormation or Lambda env inspection via console. Mitigation: rotate by updating the SSM parameter; next Lambda cold start picks up the new value.
- **Cold-start overhead** → One extra SSM `GetParameters` call already exists; adding three more param paths does not add a round trip (still one call, chunked at 10). Decryption adds single-digit ms. Acceptable.
- **Test pollution** → If a developer accidentally sets `LANGSMITH_TRACING=true` in their shell while running tests, integration tests would send traces to whichever project is configured. Mitigation: document in `.env.test.example` that tracing env vars must remain unset; CI does not set them.
- **Free-tier overage surprise** → 5k traces/mo can be exceeded by heavy bot usage. Mitigation out of scope (Q5 decision). If it becomes an issue, enable `LANGSMITH_TRACING_SAMPLING_RATE` via SSM or toggle off.

## Migration Plan

1. Land code + infra changes with SSM params absent in all environments → tracing stays off; zero behavior change.
2. In **dev** (developer's local `.env`): add all three env vars manually. Validate traces appear in LangSmith under `budget-dev`. Exercise assistant + create-transaction flows.
3. Provision SSM params in **staging**:
   - `/manual/budget/staging/langsmith/tracing` = `true`
   - `/manual/budget/staging/langsmith/project` = `budget-staging`
   - `/manual/budget/staging/langsmith/api-key` (SecureString) = `<key>`
4. Redeploy staging → cold start picks up params. Validate traces.
5. Decide whether to enable in **prod**. Same SSM provisioning pattern.
6. **Rollback**: delete (or set `LANGSMITH_TRACING` to `false`) on the SSM parameter; next cold start disables tracing. No redeploy required.

## Open Questions

None. Remaining open items (sampling, metadata, alarms) are explicitly deferred by Decision 6.

## Constitution Compliance

- **Vendor Independence** — Feature is optional and env-gated. Backend code has no hard dependency on LangSmith-specific APIs; the SDK wires itself via env vars. Backend remains deployable to any Node.js runtime; disabling the feature requires only unsetting env vars.
- **Backend Layer Structure** — Changes are confined to the infrastructure wrapper layer (`LangChainAgent`) and bootstrap. No impact on services, repositories, or GraphQL resolvers.
- **Result Pattern** — Trace delivery is internal to the LangSmith SDK (fire-and-forget). No new service or external-integration return surface introduced that would require the Result pattern.
- **Input Validation** — No new user inputs. New env vars are operational configuration, consistent with existing `requireEnv`/bootstrap conventions; absence is tolerated (tracing off).
- **TypeScript Code Generation** — New wrapper parameter is a named optional field; no `any` casts, no non-null assertions. Enum-free.
- **Code Quality Validation** — Bootstrap changes are covered by the existing `bootstrap.test.ts` suite (extended with cases for the new bindings). `LangChainAgent` `runName` plumbing is covered by existing agent tests.
- **Test Strategy** — No new test directories; any new tests co-located next to source. Tracing itself is not tested end-to-end (external SaaS side effects out of scope for the test suite).
