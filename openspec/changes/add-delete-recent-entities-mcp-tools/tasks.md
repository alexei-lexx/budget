## Code Style

Apply [docs/code-style.md](../../../docs/code-style.md) during implementation.

## Testing

Use the `testing` skill for each new or modified test.

## 1. Shared Age Check

- [x] 1.1 Create `backend/src/mcp/tools/recently-created.test.ts` with failing tests using fake timers: `createdAt` less than one hour ago is recent; exactly one hour ago is recent; more than one hour ago is not recent
- [x] 1.2 Create `backend/src/mcp/tools/recently-created.ts`: export a function that takes a `createdAt` and returns whether it is within one hour of `Date.now()`; keep the one-hour constant in this file
- [x] 1.3 Run `npm test -- src/mcp/tools/recently-created.test.ts` in `backend/` and confirm the tests pass

## 2. Tool Annotations

- [x] 2.1 In `backend/src/mcp/server.test.ts`, add a failing test: `tools/list` returns `destructiveHint: true` for `delete_account`, `delete_category`, and `delete_transaction`; update the expected tool count from 12 to 15 (this test fails until section 6)
- [x] 2.2 In `backend/src/mcp/tools/tool.ts`, add an optional `annotations?: ToolAnnotations` field to `Tool`
- [x] 2.3 In `backend/src/mcp/server.ts`, pass `annotations: tool.annotations` to `server.registerTool` in the registration loop

## 3. `delete_transaction` Tool

- [x] 3.1 Create `backend/src/mcp/tools/delete-transaction.test.ts` with failing tests and a mocked `TransactionService`:
  - invalid guide token: returns the guide failure; no service call
  - transaction not found: returns the `getTransactionById` failure; `deleteTransaction` not called
  - created more than one hour ago: returns the age failure; `deleteTransaction` not called
  - created within the last hour: calls `deleteTransaction(id, userId)` and returns the transaction DTO
  - `deleteTransaction` returns a failure (for example a transfer leg): the failure is passed through
- [x] 3.2 Create `backend/src/mcp/tools/delete-transaction.ts` following `update-transaction.ts`: verify guide tokens, look up with `getTransactionById`, check age, call `deleteTransaction`, map with `toTransactionDto`
- [x] 3.3 Export `createDeleteTransactionTool` with name `delete_transaction`, input `{ id, guideTokens }`, `annotations: { destructiveHint: true }`, and a description stating the one-hour limit and that transfers cannot be deleted through this tool
- [x] 3.4 Run `npm test -- src/mcp/tools/delete-transaction.test.ts` in `backend/` and confirm the tests pass

## 4. `delete_account` Tool

- [x] 4.1 Create `backend/src/mcp/tools/delete-account.test.ts` with failing tests and a mocked `AccountService`:
  - invalid guide token: returns the guide failure; no service call
  - `id` not in the user's active accounts: returns "Account not found"; `deleteAccount` not called
  - created more than one hour ago: returns the age failure; `deleteAccount` not called
  - created within the last hour: calls `deleteAccount(id, userId)` and returns the account DTO
  - `deleteAccount` returns a failure: the failure is passed through
- [x] 4.2 Create `backend/src/mcp/tools/delete-account.ts`: verify guide tokens, find the account by `id` in `getAccountsByUser(userId, "ACTIVE")`, check age, call `deleteAccount`, map with `toAccountDto`
- [x] 4.3 Export `createDeleteAccountTool` with name `delete_account`, input `{ id, guideTokens }`, `annotations: { destructiveHint: true }`, and a description stating the one-hour limit and that transactions are kept
- [x] 4.4 Run `npm test -- src/mcp/tools/delete-account.test.ts` in `backend/` and confirm the tests pass

## 5. `delete_category` Tool

- [x] 5.1 Create `backend/src/mcp/tools/delete-category.test.ts` with failing tests and a mocked `CategoryService`:
  - invalid guide token: returns the guide failure; no service call
  - `id` not in the user's active categories: returns "Category not found"; `deleteCategory` not called
  - created more than one hour ago: returns the age failure; `deleteCategory` not called
  - created within the last hour: calls `deleteCategory(id, userId)` and returns the category DTO
  - `deleteCategory` returns a failure: the failure is passed through
- [x] 5.2 Create `backend/src/mcp/tools/delete-category.ts`: verify guide tokens, find the category by `id` in `getCategoriesByUser(userId, { scope: "ACTIVE" })`, check age, call `deleteCategory`, map with `toCategoryDto`
- [x] 5.3 Export `createDeleteCategoryTool` with name `delete_category`, input `{ id, guideTokens }`, `annotations: { destructiveHint: true }`, and a description stating the one-hour limit and that transactions are kept
- [x] 5.4 Run `npm test -- src/mcp/tools/delete-category.test.ts` in `backend/` and confirm the tests pass

## 6. Registration

- [x] 6.1 In `backend/src/mcp/server.ts`, add the three delete tools to the `tools` list
- [x] 6.2 Run `npm test -- src/mcp/server.test.ts` in `backend/` and confirm the test from 2.1 passes

## 7. Verification

- [x] 7.1 Run `npm test` in `backend/` and confirm no regressions
- [x] 7.2 Run `npm run typecheck` and `npm run format` in `backend/` and fix all issues

## Constitution Compliance

- **Backend Layer Structure**: Tools call services only. No repository access. No service changes. Compliant.
- **Authentication & Authorization**: The age limit is enforced in the MCP layer as an agent-only rule. The user ID comes from the authenticated MCP context. Compliant.
- **Input Validation (ordering)**: Guide tokens first, then the user-scoped lookup, then the age check, then the delete. Compliant.
- **Result Pattern**: Tools return `Result<T>`. Service failures pass through. Compliant.
- **Soft-Deletion**: Existing service methods archive records. Compliant.
- **Test Strategy**: Co-located tests with mocked services, written before the code. Compliant.
