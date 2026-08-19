Issue: [#556](https://github.com/alexei-lexx/budget/issues/556) — delete-account MCP tool with confirmation

## Why

The MCP server can create and update accounts, but not delete one. Delete is destructive: the account disappears from the app, with no restore path. A destructive action needs real confirmation, not text where the agent merely claims it asked. MCP elicitation (2026-07-28 revision, already supported by the installed `@modelcontextprotocol/server` SDK) provides that. The connecting client shows a real prompt and returns the user's explicit accept, decline, or cancel.

## What Changes

- Add MCP tool `delete_account`.
- It archives the account, matching the app's own "Delete Account" behavior. The account disappears from active records, but its transactions stay.
- Before deleting, it elicits confirmation from the user. The message names the account, states its transaction count, and notes that transactions are kept.
- Declining or cancelling leaves the account unchanged.
- If the connecting client does not support elicitation, the tool fails closed. No account is modified. The failure tells the caller to delete the account from the app instead.
- It calls the existing `AccountService.deleteAccount` (archive). No new business rule is added.
- This is the first MCP tool in this codebase to use elicitation and the multi-round-trip response shape. Every other tool is a single round trip.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mcp-server`: adds a `Delete Account via MCP` requirement. It is the only MCP write requirement that elicits user confirmation before executing. It is also the only one that fails closed on missing client capability, not just on invalid input.

## Impact

- `backend/src/mcp/tools/delete-account.ts` (new): registers `delete_account`. Returns an `InputRequiredResult` directly for the elicitation step; `to-tool-result.ts` is unchanged, since it only converts the final `Result<T>` outcome.
- `backend/src/mcp/server.ts`: registers the new tool with `accountService` and `userId`. Both are already resolved there.
- `AccountService` gains one new method, `getAccountForDeletion`, used to build the confirmation message. It reuses the `transactionRepository` dependency `AccountService` already has. `deleteAccount` itself is unchanged.
- `TransactionRepository` gains one new method, `countByAccountId`, alongside the existing `hasTransactionsForAccount`.
- `openspec/specs/mcp-server/spec.md`: gains the new requirement.
- No changes to the `Account` model or GraphQL schema. Archive semantics (transactions kept) are unchanged.
- Frontend unaffected.

## Constitution Compliance

- **Backend Layer Structure**: The tool calls `AccountService` directly, matching the existing `create_account`/`update_account` MCP tools. `AccountService.getAccountForDeletion` is the one place that orchestrates `AccountRepository` and `TransactionRepository`, keeping that cross-repository work in the service layer instead of the tool.
- **Result Pattern**: The service call still resolves to `Result<T>`. Elicitation is a protocol-level round trip above it, not a change to the service's return type.
- **Soft-Deletion**: No new mechanism. This reuses the existing `isArchived`-based archive behavior in `AccountService.deleteAccount`.
- **Authentication & Authorization**: `userId` comes from the already-authenticated MCP session context (`createAuthenticatedMcpServer`). No user ID is ever accepted from tool input.
- **TypeScript Code Generation**: New code uses descriptive names and object destructuring for functions with 3 or more arguments. It avoids non-null assertions and `any` casts.
- **Test Strategy**: The new tool file gets a co-located `.test.ts`. This matches `create-account.test.ts` and `update-account.test.ts`.
- **Schema-Driven Development**: Not applicable. This change adds no GraphQL fields. The MCP surface is separate from GraphQL.
