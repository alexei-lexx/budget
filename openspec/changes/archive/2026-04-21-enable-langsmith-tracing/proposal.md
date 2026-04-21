# Enable LangSmith Tracing

## Why

The existing `ai-agent-trace` capability surfaces per-request traces in-app (TEXT, TOOL_CALL, TOOL_RESULT messages for the current response). This is useful for inspecting a single interaction but is ephemeral, per-user, and lacks developer-focused context: latency breakdowns, token and cost accounting, cross-request search, historical retention, prompt/tool-argument diffs across runs, and side-by-side comparison.

LangSmith complements the existing trace UI by adding persistent, developer-side observability across all runs. It captures the same logical information plus model metadata, tracks performance over time, and enables regression analysis when prompts, models, or agent graphs change. The `langsmith` package is already a transitive dependency of the installed `langchain` — enabling it is primarily a matter of configuration (`docs.langchain.com/oss/javascript/langchain/observability`).

The feature must be **optional** (safe to ship with tracing off, and safe to run in environments that do not want vendor data egress) and **configurable per environment** (dev/staging/prod tuned independently, without a redeploy for secret or project-name changes).

## What Changes

- Introduce env-var-driven LangSmith tracing: `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`. Tracing is off unless `LANGSMITH_TRACING=true` is set.
- Extend the existing SSM runtime-config bootstrap (`backend/src/lambdas/bootstrap.ts`) with LangSmith bindings under `/manual/budget/${nodeEnv}/langsmith/*`. API key stored as SSM `SecureString`; other values as plaintext `String`.
- Grant the three Lambda roles (web, background-job, migration) permissions to read the new SSM params with decryption (`kms:Decrypt` on the default `aws/ssm` key, `ssm:GetParameters` with `WithDecryption`).
- Attach LangChain run names to the two agents: `assistant-agent` and `create-transaction-agent`. The `LangChainAgent` wrapper accepts an optional `runName` passed into `agent.invoke` config; the subagent tool sets `runName` on the inner `agent.invoke` so the nested create-transaction run is distinguishable in traces.
- Document the new env vars in `backend/.env.example`; leave them empty in `backend/.env.test.example` so tests remain untraced by default.
- No sampling, no CloudWatch alarm, no per-run metadata enrichment (YAGNI — add later if volume or debugging needs justify it).

## Capabilities

### New Capabilities

- `ai-agent-observability`: Backend observability for AI agent executions (analogous to logs and metrics, but in the traces pillar). Covers env-var-driven LangSmith tracing, per-environment configuration, and run-name conventions that distinguish agents and subagents. Distinct from `ai-agent-trace`, which is a user-facing UI for inspecting the current response.

### Modified Capabilities

None. `ai-agent-trace` covers the user-facing in-app trace panel and is unrelated to developer-side observability.

## Impact

- **Code**:
  - `backend/src/lambdas/bootstrap.ts` — extend SSM bindings; add decryption support for SecureString params.
  - `backend/src/langchain/langchain-agent.ts` — accept optional `runName` at construction; pass into `agent.invoke` config.
  - `backend/src/dependencies.ts` — name the two wrapped agents at construction.
  - `backend/src/langchain/tools/create-transaction-subagent.ts` — set `runName` on inner `agent.invoke`.
- **Infra**:
  - `infra-cdk/lib/backend-cdk-stack.ts` — IAM policy expansion for SSM decryption on the LangSmith parameter path; no new stacks, no new resources beyond IAM statements.
- **Config**:
  - `backend/.env.example`, `backend/.env.test.example` — document new vars (unset by default).
- **Operational**:
  - One extra (optional) `GetParameters` call on Lambda cold start; cached for the duration of the container. Negligible latency impact; zero impact when all params are absent.
- **Runtime behavior**:
  - With `LANGSMITH_TRACING` unset → identical behavior to today.
  - With `LANGSMITH_TRACING=true` + valid `LANGSMITH_API_KEY` → agent runs stream to LangSmith asynchronously; responses are not gated on trace delivery (fire-and-forget).
- **Security**: API key never logged; stored encrypted in SSM; decrypted only inside Lambda at cold start.

## Constitution Compliance

- **Vendor Independence**: LangSmith is a third-party SaaS. Compliance preserved because the feature is optional, env-gated, and introduces zero code coupling beyond env vars that LangSmith's SDK reads directly. Disabling it requires no code change. Backend deployability to any Node.js runtime is unaffected.
- **Backend Layer Structure**: Tracing hooks into the langchain infrastructure layer (the agent wrapper). Service and repository layers are untouched.
- **Result Pattern**: Trace delivery is fire-and-forget inside the LangChain/LangSmith SDK; no new service/external-integration return paths are introduced that would require the Result pattern.
- **Input Validation**: No new user inputs. Env vars are treated as operational configuration, consistent with existing `requireEnv` patterns.
- **Test Strategy**: Bootstrap changes are unit-tested alongside existing `bootstrap.test.ts` coverage. The `LangChainAgent` `runName` plumbing is covered by existing agent tests (no new test file needed). No integration-level tracing tests — tracing is off in `.env.test`.
