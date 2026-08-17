## Why

The MCP `create_transaction` tool requires only the `basics` guide, which teaches the account/category/transaction domain model but gives no rules for filling in a transaction's fields when they aren't given explicitly. The app's own assistant solves this with a dedicated set of field-inference rules (account/category selection priority, date defaulting, description conventions). Without an equivalent for MCP clients, Claude falls back to asking the user for fields it should be able to infer — including reading "description" as "reason for this transaction" — producing a transaction-logging experience that diverges from the in-app assistant's.

## What Changes

- Add a new MCP guide named `create-transaction`, covering the rules for inferring a transaction's type, amount, account, category, date, and description whenever they aren't given explicitly. Content is ported from `create-transaction-agent.ts`'s `Inference rules`, near-verbatim.
- **BREAKING** — the `create_transaction` MCP tool requires a valid, current `create-transaction` guide token in addition to `basics`.
- `load_guides` lists and serves the new guide alongside `basics`.
- `update_transaction` is explicitly left out of this change. Update requests are typically explicit, targeted fixes ("change the amount to 12.50") rather than free-text descriptions needing full field inference, so extending guide coverage there is deferred.

## Capabilities

### New Capabilities

None. The new guide extends the existing MCP guide mechanism rather than introducing a separate capability.

### Modified Capabilities

- `mcp-server`: adds a "Load create-transaction Guide via MCP" requirement (parallel to the existing "Load Guides via MCP" requirement for `basics`), and modifies "Create Transaction via MCP" so the tool requires the `create-transaction` guide in addition to `basics`.

## Impact

**Affected code** — `backend/` only:

- `backend/src/mcp/tools/guides.ts` (+ co-located test): add the `create-transaction` guide constant; generalize the `GUIDES` type from `Record<"basics", Guide>` to cover both guide names
- `backend/src/mcp/tools/create-transaction.ts` (+ co-located test): `requiredGuides` becomes `["basics", "create-transaction"]`
- `backend/src/mcp/tools/load-guides.ts` / `load-guides.test.ts`: guide list and lookup cover the new guide
- `openspec/specs/mcp-server/spec.md`: new requirement, modified "Create Transaction via MCP" requirement

**Affected consumers:** every configured MCP client (Claude web, Claude desktop) using `create_transaction` breaks until it loads the new guide. Agents re-read tool schemas each session, so adaptation is automatic.

**Not affected:** `update_transaction` and every other MCP tool, GraphQL schema and resolvers, services, repositories, domain entities, frontend, infrastructure, the LangChain assistant/create-transaction agents (source of the ported rules, left unchanged).

## Constitution Compliance

**Applicable principles — compliant:**

- **Backend Layer Structure** — the new guide adds no data access; `create-transaction.ts` stays a thin MCP entry point delegating to `TransactionService`. No service or repository changes.
- **Input Validation** — guide token verification is an agent-protocol concern, not a business rule, and stays at the MCP boundary exactly as the existing `basics` check does. Business validation for transaction creation is unchanged.
- **Result Pattern** — a missing/invalid `create-transaction` token is an expected, caller-recoverable failure, returned via the existing `Failure` variant used for `basics` rejections.
- **Test Strategy** — tests stay co-located as `[source-file].test.ts`; guide token building/verification and the new rejection path are unit tested.
- **TypeScript Code Generation** — descriptive names, no abbreviations; existing keyword-argument conventions preserved.
- **Code Quality Validation** — changed-file tests, then the full backend suite, then `npm run typecheck` and `npm run format`.

**Not applicable:** Schema-Driven Development (no GraphQL change), Data Migrations, Soft-Deletion, Database Record Hydration, GraphQL Pagination Strategy, Backend Domain Entities, Backend Port Interfaces, Authentication & Authorization (guide tokens remain non-credential, per existing `mcp-server` spec), Frontend Code Discipline, UI Guidelines.
