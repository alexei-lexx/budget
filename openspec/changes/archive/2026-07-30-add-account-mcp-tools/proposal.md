## Why

The MCP server exposes `get_accounts` and `create_transaction`, but an agent connected via MCP has no way to create or update accounts. The underlying `AccountService.createAccount` / `updateAccount` methods already implement the full business logic (duplicate-name checks, currency-change-with-transactions guard) and are already exposed to the in-app AI chat via `langchain/tools/create-account.ts` and `update-account.ts`. Adding the equivalent MCP tools closes this gap for external agents with no new business logic required.

## What Changes

- Add MCP tool `create_account`: creates an account for the authenticated user, accepting `name`, `currency`, and optional `initialBalance` (defaults to 0); response includes `initialBalance` alongside the standard account fields, matching the langchain `create_account` tool's behavior.
- Add MCP tool `update_account`: updates an existing account's `name` and/or `currency` for the authenticated user; `initialBalance` is not updatable through this tool, matching the langchain `update_account` tool's restriction.
- No archive/delete account tool is added — archiving is not being exposed as an agent-facing capability in this change.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mcp-server`: adds `Create Account via MCP` and `Update Account via MCP` requirements, following the same authentication, data-isolation, and Result/failure-reporting patterns as the existing `create_transaction` requirement.

## Impact

- `backend/src/mcp/tools/create-account.ts` (new): registers `create_account`, mirrors `backend/src/mcp/tools/create-transaction.ts`'s structure (own zod schema, own description, try/catch around the service call mapped to `Result`).
- `backend/src/mcp/tools/update-account.ts` (new): registers `update_account`, same structure.
- `backend/src/mcp/server.ts`: registers both new tools with `accountService` and `userId`.
- `openspec/specs/mcp-server/spec.md`: gains the two new requirements.
- No changes to `AccountService`, `Account` model, or GraphQL schema — this change only adds an MCP-facing surface over existing service-layer behavior.

## Constitution Compliance

- **Backend Layer Structure**: MCP tools call `AccountService` directly (no new service or repository logic); consistent with the existing `create_transaction` MCP tool, which also calls the service layer directly without a GraphQL resolver in between.
- **Result Pattern**: Both new tools catch thrown `BusinessError`/`ModelError` and map to `Failure(error.message)`, then `toToolResult`, matching `create-transaction.ts`.
- **Authentication & Authorization**: Both tools receive `userId` from the already-authenticated MCP session context (`createAuthenticatedMcpServer`); no user ID is ever accepted from tool input.
- **TypeScript Code Generation**: New code uses descriptive names, object destructuring for 3+ argument functions, and no non-null assertions or type-any casts.
- **Test Strategy**: Each new tool file gets a co-located `.test.ts`, consistent with `create-transaction.test.ts` and `get-accounts.test.ts`.
- **Schema-Driven Development**: Not applicable — this change adds no GraphQL fields; the MCP surface is a separate, non-GraphQL API layer.
