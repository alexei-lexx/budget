## Why

The MCP server exposes `get_categories`, but an agent connected via MCP has no way to create or update categories. The underlying `CategoryService.createCategory` / `updateCategory` methods already implement the full business logic (name validation, duplicate-name checks) and are already exposed to the in-app AI chat via `langchain/tools/create-category.ts` and `update-category.ts`. Adding the equivalent MCP tools closes this gap for external agents with no new business logic required.

## What Changes

- Add MCP tool `create_category`: creates a category for the authenticated user, accepting `name`, `type` (`INCOME`/`EXPENSE`), and `excludeFromReports` (defaults to `false`), matching the langchain `create_category` tool's input and business rules.
- Add MCP tool `update_category`: updates an existing category's `name`, `type`, and/or `excludeFromReports` for the authenticated user, matching the langchain `update_category` tool's input and business rules.
- No archive/delete category tool is added — archiving is not being exposed as an agent-facing capability in this change.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mcp-server`: adds `Create Category via MCP` and `Update Category via MCP` requirements, following the same authentication, data-isolation, and Result/failure-reporting patterns as the existing `create_account` and `update_account` requirements.

## Impact

- `backend/src/mcp/tools/create-category.ts` (new): registers `create_category`, mirrors `backend/src/mcp/tools/create-account.ts`'s structure (own zod schema, own description, try/catch around the service call mapped to `Result`).
- `backend/src/mcp/tools/update-category.ts` (new): registers `update_category`, same structure.
- `backend/src/mcp/server.ts`: registers both new tools with `categoryService` and `userId`.
- `openspec/specs/mcp-server/spec.md`: gains the two new requirements.
- No changes to `CategoryService`, `Category` model, or GraphQL schema — this change only adds an MCP-facing surface over existing service-layer behavior.

## Constitution Compliance

- **Backend Layer Structure**: MCP tools call `CategoryService` directly (no new service or repository logic); consistent with the existing `create_account`/`update_account` MCP tools, which also call the service layer directly without a GraphQL resolver in between.
- **Result Pattern**: Both new tools catch thrown `BusinessError`/`ModelError` and map to `Failure(error.message)`, then `toToolResult`, matching `create-account.ts`/`update-account.ts`.
- **Authentication & Authorization**: Both tools receive `userId` from the already-authenticated MCP session context (`createAuthenticatedMcpServer`); no user ID is ever accepted from tool input.
- **TypeScript Code Generation**: New code uses descriptive names, object destructuring for 3+ argument functions, and no non-null assertions or type-any casts.
- **Test Strategy**: Each new tool file gets a co-located `.test.ts`, consistent with `create-account.test.ts` and `update-account.test.ts`.
- **Schema-Driven Development**: Not applicable — this change adds no GraphQL fields; the MCP surface is a separate, non-GraphQL API layer.
