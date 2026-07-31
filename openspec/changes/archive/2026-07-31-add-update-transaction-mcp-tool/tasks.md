## 1. `update_transaction` MCP tool

- [x] 1.1 (use `testing` skill) Write `backend/src/mcp/tools/update-transaction.test.ts` covering: updates a transaction and returns `id`, `accountId`, `categoryId`, `type`, `amount`, `currency`, `date`, `description` (mirroring `create-transaction.test.ts`'s structure, mocked via `createMockTransactionService`/`fakeTransaction`); passes only the supplied fields through to `transactionService.updateTransaction`; passes explicit `null` through for `categoryId` and `description` when supplied (distinct from omitting them, which must pass `undefined`); passes `id` and `userId` through correctly; returns a failure result (no throw) when the service rejects with a `BusinessError`/`ModelError` (e.g. transaction not found, invalid account/category, category type mismatch, non-positive amount)
- [x] 1.2 Implement `backend/src/mcp/tools/update-transaction.ts`: zod input schema (`id` required; `accountId`, `amount`, `date`, `type` optional; `categoryId` and `description` optional-and-nullable via `.nullable().optional()`), description text noting clear-vs-leave-unchanged semantics for `categoryId`/`description` and that `type` cannot be set to a transfer type, and `registerUpdateTransactionTool` following the structure of `create-transaction.ts`/`update-account.ts` (try/catch around the service call, `Failure(error.message)` on thrown `Error`, `toToolResult` at registration)
- [x] 1.3 Run `npm test -- backend/src/mcp/tools/update-transaction.test.ts` and fix any failures

## 2. Server wiring

- [x] 2.1 Register `registerUpdateTransactionTool` in `backend/src/mcp/server.ts` (`createAuthenticatedMcpServer`), passing `transactionService` and `userId`
- [x] 2.2 (use `testing` skill) Update `backend/src/mcp/server.test.ts` if it asserts the set of registered tools, to include `update_transaction`

## 3. Spec sync and validation

- [x] 3.1 Run `openspec validate add-update-transaction-mcp-tool` and resolve any issues
- [x] 3.2 Run `npm test` from `backend/` to confirm no regressions
- [x] 3.3 Run `npm run typecheck` and `npm run format` from `backend/` and resolve all issues

## Constitution Compliance

- **Backend Layer Structure**: The new MCP tool file calls `TransactionService` directly, matching `create-transaction.ts`'s existing precedent of bypassing the GraphQL resolver layer for this non-GraphQL API surface.
- **Result Pattern**: The tool returns `Result` from its handler function (`Success`/`Failure`), never throwing past its own boundary.
- **Authentication & Authorization**: `userId` is threaded from the already-authenticated MCP session (`createAuthenticatedMcpServer`) into the tool; no user ID is ever read from tool input.
- **TypeScript Code Generation**: New code follows existing naming and destructuring conventions from `create-transaction.ts` and `update-account.ts`.
- **Test Strategy**: The new tool file is co-located with a `.test.ts` file, tests written before implementation, service dependencies mocked (no real database).
- **Code Quality Validation**: Tasks 1.3, 3.2, and 3.3 run the file-level test, full suite, and typecheck/lint steps in the required order.
- **Schema-Driven Development**: Not applicable — no GraphQL schema change in this task list.
