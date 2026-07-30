## 1. `create_account` MCP tool

- [x] 1.1 (use `testing` skill) Write `backend/src/mcp/tools/create-account.test.ts` covering: creates account and returns `id`, `name`, `currency`, `isArchived`, `initialBalance` (mirroring `create-transaction.test.ts`'s structure, mocked via `createMockAccountService`/`fakeAccount`); defaults `initialBalance` to 0 when omitted; passes `userId` through to `accountService.createAccount`; returns a failure result (no throw) when the service rejects with a `BusinessError`/`ModelError` (e.g. duplicate name, unsupported currency)
- [x] 1.2 Implement `backend/src/mcp/tools/create-account.ts`: zod input schema (`name`, `currency`, optional `initialBalance`), description text, and `registerCreateAccountTool` following the structure of `create-transaction.ts` (try/catch around the service call, `Failure(error.message)` on thrown `Error`, `toToolResult` at registration)
- [x] 1.3 Run `npm test -- backend/src/mcp/tools/create-account.test.ts` and fix any failures

## 2. `update_account` MCP tool

- [x] 2.1 (use `testing` skill) Write `backend/src/mcp/tools/update-account.test.ts` covering: updates account and returns `id`, `name`, `currency`, `isArchived`; passes only the supplied fields (`name`/`currency`) through to `accountService.updateAccount`, never `initialBalance`; passes `id` and `userId` through correctly; returns a failure result when the service rejects (e.g. account not found, duplicate name, currency change with existing transactions, unsupported currency)
- [x] 2.2 Implement `backend/src/mcp/tools/update-account.ts`: zod input schema (`id` required, `name` and `currency` optional — no `initialBalance` field), description text noting initial balance cannot be changed, and `registerUpdateAccountTool` following the same try/catch/`Failure`/`toToolResult` structure
- [x] 2.3 Run `npm test -- backend/src/mcp/tools/update-account.test.ts` and fix any failures

## 3. Server wiring

- [x] 3.1 Register `registerCreateAccountTool` and `registerUpdateAccountTool` in `backend/src/mcp/server.ts` (`createAuthenticatedMcpServer`), passing `accountService` and `userId`
- [x] 3.2 (use `testing` skill) Update `backend/src/mcp/server.test.ts` if it asserts the set of registered tools, to include `create_account` and `update_account`

## 4. Spec sync and validation

- [x] 4.1 Run `openspec validate add-account-mcp-tools` and resolve any issues
- [x] 4.2 Run `npm test` from `backend/` to confirm no regressions
- [x] 4.3 Run `npm run typecheck` and `npm run format` from `backend/` and resolve all issues

## Constitution Compliance

- **Backend Layer Structure**: New MCP tool files call `AccountService` directly, matching `create-transaction.ts`'s existing precedent of bypassing the GraphQL resolver layer for this non-GraphQL API surface.
- **Result Pattern**: Both tools return `Result` from their handler functions (`Success`/`Failure`), never throwing past their own boundary.
- **Authentication & Authorization**: `userId` is threaded from the already-authenticated MCP session (`createAuthenticatedMcpServer`) into both tools; no user ID is ever read from tool input.
- **TypeScript Code Generation**: New code follows existing naming and destructuring conventions from `create-transaction.ts` and `get-accounts.ts`.
- **Test Strategy**: New tool files are co-located with `.test.ts` files, tests written before implementation, service dependencies mocked (no real database).
- **Code Quality Validation**: Tasks 1.3, 2.3, 4.2, and 4.3 run the file-level test, full suite, typecheck, and lint/format steps in the required order.
- **Schema-Driven Development**: Not applicable — no GraphQL schema change in this task list.
