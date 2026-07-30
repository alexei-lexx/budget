## Context

The MCP server (`backend/src/mcp/`) already exposes `get_accounts`, `get_categories`, `get_transactions`, and `create_transaction`, each a thin wrapper: an MCP-specific zod schema, a description, and a call into the existing service layer, mapped to `Result`/`CallToolResult` via `toToolResult`. `AccountService` already implements `createAccount` and `updateAccount` with full business rules (duplicate-name check, currency-change-with-transactions guard). An equivalent agent-facing surface already exists for the in-app AI chat, in `backend/src/langchain/tools/create-account.ts` and `update-account.ts`, built on the `langchain` `tool()` helper against the same `AccountService`.

This change adds no new business logic — it wires two more MCP tools over behavior that already exists and is already exposed through a parallel agent surface. None of the design.md trigger conditions (cross-cutting change, new dependency, data model change, security/performance/migration complexity) apply; the value of this document is recording the two behavioral decisions carried over from the langchain tools, so the MCP versions don't silently diverge.

## Goals / Non-Goals

**Goals:**

- Expose `create_account` and `update_account` as MCP tools, scoped to the authenticated user, following the exact structural pattern of `create-transaction.ts`.
- Keep MCP tool behavior consistent with the existing langchain tools for the same operations, since both sit on top of the same `AccountService`.

**Non-Goals:**

- No changes to `AccountService`, `Account` model, or any repository.
- No archive/delete account tool.
- No GraphQL schema changes.
- No change to the langchain tools themselves.

## Decisions

**`create_account` accepts and echoes `initialBalance`.**
`AccountDto` (used by `get_accounts`) has no balance fields, but the langchain `create_account` tool accepts `initialBalance` (optional, default 0) and manually appends it to the response: `{...toAccountDto(created), initialBalance: created.initialBalance}`. The MCP tool does the same, for the same reason — the value is meaningful at creation time and there's no other way for the caller to learn what they set.
_Alternative considered:_ omit `initialBalance` entirely from the response to keep strict symmetry with `get_accounts`. Rejected — the langchain tool already made this tradeoff and diverging between the two agent surfaces for the same operation would be a worse inconsistency.

**`update_account` does not accept `initialBalance`.**
`UpdateAccountInput` and `Account.update()` technically allow changing `initialBalance`, but the langchain `update_account` tool deliberately excludes it from its schema ("Changing an account's initial balance is not supported."). The MCP tool mirrors this by omitting `initialBalance` from its input schema — the field is a tool-level policy choice, not a service-layer constraint, and both agent-facing surfaces should apply it identically.
_Alternative considered:_ allow it via MCP since the service supports it. Rejected per explicit direction to keep the same behavior as the langchain tool.

**No archive/delete tool.**
Archiving an account is a deletion-equivalent action, not something to hand to an agent in this change. Only `create_account` and `update_account` are added.

**Error handling reuses the `create_transaction` pattern.**
`AccountService.createAccount`/`updateAccount` throw `BusinessError` (duplicate name, currency change with existing transactions) or `ModelError` (invariant violations, e.g. unsupported currency). Both extend `Error`, so the existing `try { ... } catch (error) { if (error instanceof Error) return Failure(error.message); throw error; }` pattern from `create-transaction.ts` is reused as-is — no new error type or handling logic needed.

**Tool naming matches the langchain tools: `create_account`, `update_account`.**
Consistent with existing MCP naming (`get_accounts`, `create_transaction`) and with the langchain tools performing the same operations. No collision risk — different MCP servers.

## Risks / Trade-offs

- **Two agent surfaces (langchain in-app chat, MCP) implement the same operations against `AccountService` with hand-maintained parity** (e.g., the `initialBalance` include/exclude behavior) → Mitigation: this change documents the parity explicitly; any future change to one tool's input/output shape should check the sibling tool in the other surface.

## Constitution Compliance

- **Backend Layer Structure**: Both tools call `AccountService` directly, consistent with the existing `create_transaction` MCP tool bypassing the GraphQL resolver layer entirely for this non-GraphQL API surface.
- **Result Pattern**: Both tools map `AccountService` outcomes to `Result`/`Failure` before handing off to `toToolResult`, matching `create-transaction.ts`.
- **Backend Domain Entities**: No changes to `Account`; its private constructor and invariants are unaffected.
- **Authentication & Authorization**: `userId` comes from the authenticated MCP session (`createAuthenticatedMcpServer`), never from tool input.
- **TypeScript Code Generation**: New code follows existing naming and argument conventions from `create-transaction.ts`.
- **Test Strategy**: New tool files are co-located with their `.test.ts` counterparts.
- **Schema-Driven Development**: Not applicable — no GraphQL schema change.
