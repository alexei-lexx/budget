## 1. `create_category` MCP tool

- [x] 1.1 (use `testing` skill) Write `backend/src/mcp/tools/create-category.test.ts` covering: creates category and returns `id`, `name`, `type`, `excludeFromReports`, `isArchived` (mirroring `create-account.test.ts`'s structure, mocked via `createMockCategoryService`/`fakeCategory`); defaults `excludeFromReports` to `false` when omitted; passes `userId` through to `categoryService.createCategory`; returns a failure result (no throw) when the service rejects with a `BusinessError` (e.g. duplicate name, invalid name length)
- [x] 1.2 Implement `backend/src/mcp/tools/create-category.ts`: zod input schema (`name`, `type`, optional `excludeFromReports` defaulting to `false`), description text (reusing the near-duplicate-name confirmation guidance from `langchain/tools/create-category.ts`), and `registerCreateCategoryTool` following the structure of `create-account.ts` (try/catch around the service call, `Failure(error.message)` on thrown `Error`, `toToolResult` at registration)
- [x] 1.3 Run `npm test -- backend/src/mcp/tools/create-category.test.ts` and fix any failures

## 2. `update_category` MCP tool

- [x] 2.1 (use `testing` skill) Write `backend/src/mcp/tools/update-category.test.ts` covering: updates category and returns `id`, `name`, `type`, `excludeFromReports`, `isArchived`; passes only the supplied fields (`name`/`type`/`excludeFromReports`) through to `categoryService.updateCategory`; passes `id` and `userId` through correctly; returns a failure result when the service rejects (e.g. category not found, duplicate name)
- [x] 2.2 Implement `backend/src/mcp/tools/update-category.ts`: zod input schema (`id` required, `name`/`type`/`excludeFromReports` optional), description text (reusing the near-duplicate-name confirmation guidance from `langchain/tools/update-category.ts`), and `registerUpdateCategoryTool` following the same try/catch/`Failure`/`toToolResult` structure
- [x] 2.3 Run `npm test -- backend/src/mcp/tools/update-category.test.ts` and fix any failures

## 3. Server wiring

- [x] 3.1 Register `registerCreateCategoryTool` and `registerUpdateCategoryTool` in `backend/src/mcp/server.ts` (`createAuthenticatedMcpServer`), passing `categoryService` and `userId`
- [x] 3.2 (use `testing` skill) Update `backend/src/mcp/server.test.ts` if it asserts the set of registered tools, to include `create_category` and `update_category`

## 4. Spec sync and validation

- [x] 4.1 Run `openspec validate add-category-mcp-tools` and resolve any issues
- [x] 4.2 Run `npm test` from `backend/` to confirm no regressions
- [x] 4.3 Run `npm run typecheck` and `npm run format` from `backend/` and resolve all issues

## Constitution Compliance

- **Backend Layer Structure**: New MCP tool files call `CategoryService` directly, matching `create-account.ts`/`update-account.ts`'s existing precedent of bypassing the GraphQL resolver layer for this non-GraphQL API surface.
- **Result Pattern**: Both tools return `Result` from their handler functions (`Success`/`Failure`), never throwing past their own boundary.
- **Authentication & Authorization**: `userId` is threaded from the already-authenticated MCP session (`createAuthenticatedMcpServer`) into both tools; no user ID is ever read from tool input.
- **TypeScript Code Generation**: New code follows existing naming and destructuring conventions from `create-account.ts` and `update-account.ts`.
- **Test Strategy**: New tool files are co-located with `.test.ts` files, tests written before implementation, service dependencies mocked (no real database).
- **Code Quality Validation**: Tasks 1.3, 2.3, 4.2, and 4.3 run the file-level test, full suite, typecheck, and lint/format steps in the required order.
- **Schema-Driven Development**: Not applicable — no GraphQL schema change in this task list.
