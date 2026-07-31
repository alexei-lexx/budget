## Why

The MCP server exposes `create_transaction` and `get_transactions`, but an agent connected via MCP has no way to correct or amend a transaction it (or the user) already recorded — it must be deleted and re-created, losing the original `id`. `TransactionService.updateTransaction` already implements the full business logic (account/category ownership and existence checks, category-type matching, cross-account balance adjustment) and is already exposed to the frontend via the `updateTransaction` GraphQL mutation. Adding the equivalent MCP tool closes this gap for external agents with no new business logic required.

## What Changes

- Add MCP tool `update_transaction`: updates an existing transaction's `accountId`, `amount`, `categoryId`, `date`, `description`, and/or `type` for the authenticated user.
  - Only supplied fields are changed.
  - `categoryId` and `description` accept explicit `null` to clear the field, matching `UpdateTransactionServiceInput`'s and the `updateTransaction` GraphQL mutation's clear-vs-leave-unchanged semantics.
  - `type` is restricted to `INCOME`, `EXPENSE`, or `REFUND` — a transaction cannot be turned into a transfer through this tool, matching `create_transaction`'s restriction. Existing transfer transactions can still have their `amount`, `date`, `description`, and `categoryId` updated (type omitted), matching current GraphQL mutation behavior.
- No archive/delete transaction tool is added — deletion is not being exposed as an agent-facing capability in this change.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mcp-server`: adds an `Update Transaction via MCP` requirement, following the same authentication, data-isolation, and Result/failure-reporting patterns as the existing `create_transaction` requirement.

## Impact

- `backend/src/mcp/tools/update-transaction.ts` (new): registers `update_transaction`, mirrors `backend/src/mcp/tools/create-transaction.ts` and `update-account.ts`'s structure (own zod schema, own description, try/catch around the service call mapped to `Result`).
- `backend/src/mcp/server.ts`: registers the new tool with `transactionService` and `userId` (both already resolved there).
- `openspec/specs/mcp-server/spec.md`: gains the new requirement.
- No changes to `TransactionService`, `Transaction` model, or GraphQL schema — this change only adds an MCP-facing surface over existing service-layer behavior.

## Constitution Compliance

- **Backend Layer Structure**: The MCP tool calls `TransactionService` directly (no new service or repository logic); consistent with the existing `create_transaction` MCP tool, which also calls the service layer directly without a GraphQL resolver in between.
- **Result Pattern**: The tool catches thrown `BusinessError`/`ModelError` and maps to `Failure(error.message)`, then `toToolResult`, matching `create-transaction.ts`.
- **Authentication & Authorization**: The tool receives `userId` from the already-authenticated MCP session context (`createAuthenticatedMcpServer`); no user ID is ever accepted from tool input.
- **TypeScript Code Generation**: New code uses descriptive names, object destructuring for 3+ argument functions, and no non-null assertions or type-any casts.
- **Test Strategy**: The new tool file gets a co-located `.test.ts`, consistent with `create-transaction.test.ts` and `update-account.test.ts`.
- **Schema-Driven Development**: Not applicable — this change adds no GraphQL fields; the MCP surface is a separate, non-GraphQL API layer.
