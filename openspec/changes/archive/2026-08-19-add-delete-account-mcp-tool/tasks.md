## 1. Repository: count transactions for an account

- [x] 1.1 (use `testing` skill) Write repository tests in `dyn-transaction-repository.test.ts` for `countByAccountId({ accountId, userId })`: returns the count of non-archived transactions for the account, returns `0` when there are none, and throws `RepositoryError` when `accountId` or `userId` is missing — mirroring the existing `hasTransactionsForAccount` behavior
- [x] 1.2 Add `countByAccountId(selector: { accountId: string; userId: string }): Promise<number>` to the `TransactionRepository` port interface, placed next to `hasTransactionsForAccount`
- [x] 1.3 Implement `countByAccountId` in `DynTransactionRepository`, following `hasTransactionsForAccount`'s query shape (`Select: "COUNT"`) and returning `result.Count || 0`
- [x] 1.4 Add `countByAccountId: vi.fn()` to `createMockTransactionRepository`

## 2. Service: assemble the deletion confirmation data

- [x] 2.1 (use `testing` skill) Write service tests in `account-service.test.ts` for `getAccountForDeletion(id, userId)`: returns `{ account, transactionCount }` for an owned account, throws `BusinessError("Account not found")` when the account doesn't exist or belongs to another user, and calls `transactionRepository.countByAccountId` with `{ accountId: id, userId }`
- [x] 2.2 Add `getAccountForDeletion(id: string, userId: string): Promise<{ account: Account; transactionCount: number }>` to the `AccountService` interface and implement it in `AccountServiceImpl`, reusing the existing `transactionRepository` dependency. Place it after `getAccountsByUser` and before `createAccount` (reads before writes)
- [x] 2.3 Add `getAccountForDeletion: vi.fn()` to `createMockAccountService`

## 3. MCP tool: delete_account

- [x] 3.1 Confirm, against the installed `@modelcontextprotocol/server` types, the client-capability field the fail-closed branch depends on: `ctx.mcpReq.envelope?.[CLIENT_CAPABILITIES_META_KEY]?.elicitation`
- [x] 3.2 (use `testing` skill) Write tests in `delete-account.test.ts` covering: elicits confirmation naming the account, its transaction count, and that transactions are kept; deletes and returns the account's `id`/`name`/`currency`/`isArchived` when the retried call carries `confirm: true`; leaves the account unchanged and returns a "not confirmed" failure on decline, on cancel, and on `confirm: false`; fails closed with a message to delete from the app instead when the client hasn't declared the `elicitation` capability, without calling `getAccountForDeletion`; rejects without a valid `basics` guide token and does not call the service; returns a failure when `getAccountForDeletion` or `deleteAccount` throws
- [x] 3.3 Implement `backend/src/mcp/tools/delete-account.ts`: `deleteAccount` handler and `registerDeleteAccountTool`, following `update-account.ts`'s shape — guide token check first, then the capability check, then `accountService.getAccountForDeletion(...)` and `inputRequired.elicit({ confirm: boolean })` on the first call, then `acceptedContent<{ confirm: boolean }>(ctx.mcpReq.inputResponses, "confirm")` and `accountService.deleteAccount(...)` on the retried call
- [x] 3.4 Run `npm test -- delete-account.test.ts` and fix failures

## 4. Wire the tool into the server

- [x] 4.1 Register `delete_account` in `backend/src/mcp/server.ts`: import `registerDeleteAccountTool` and call it with `{ accountService, userId }`, keeping the alphabetical import/registration order (`delete-account` sorts between `create-transaction` and `get-accounts`)
- [x] 4.2 (use `testing` skill) Update `server.test.ts`: bump the expected tool count to `11` and add `"delete_account"` to the expected tool names

## 5. Validate

- [x] 5.1 From `backend/`, run `npm test`, `npm run typecheck`, and `npm run format`; fix any failures

## Constitution Compliance

- **Backend Layer Structure**: `delete-account.ts` calls only `AccountService`; `AccountService.getAccountForDeletion` is the sole place orchestrating `AccountRepository` and `TransactionRepository`.
- **Backend Service Layer**: `getAccountForDeletion` extends the existing domain entity service (`AccountService`) rather than introducing a new single-purpose service.
- **Result Pattern**: `deleteAccount` (the tool function) still resolves to `Result<AccountDto>`; elicitation is a protocol-level round trip returned directly from the registered handler, not a change to the service or `toToolResult` conventions.
- **Soft-Deletion**: No new mechanism — reuses `AccountService.deleteAccount`'s existing archive behavior.
- **Authentication & Authorization**: `userId` comes from `createAuthenticatedMcpServer`'s session context, never from tool input; both `getAccountForDeletion` and `deleteAccount` scope by `userId`.
- **Test Strategy**: Repository test uses a real database connection; service and tool tests use mocked dependencies; all test files are co-located with their source.
- **TypeScript Code Generation**: New code uses descriptive names, object destructuring for 3+ argument functions, and avoids non-null assertions and `any`.
- **Method Ordering**: `getAccountForDeletion` is placed after `getAccountsByUser` (reads) and before `createAccount` (writes) in `AccountServiceImpl`.
