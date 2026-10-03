## Issues

- #556 delete-account MCP tool: no confirmation, only recently created
- #557 delete-category MCP tool: no confirmation, only recently created
- #558 delete-transaction MCP tool: no confirmation, only recently created

## Why

External agents can create accounts, categories, and transactions through MCP. They cannot remove them. A wrong record made by an agent must be removed by the user in the app.

An earlier attempt (PR #562) asked the user to confirm each deletion through MCP elicitation. Claude web and desktop do not support elicitation. That blocked the integration.

This change drops the confirmation prompt. Two other safeguards replace it:

- The agent can delete only records created within the last hour. Older history stays out of reach.
- The tools are marked as destructive. Clients use their own tool permissions: always ask, always allow, or deny.

## What Changes

- Add MCP tool `delete_account`. It deletes an account created within the last hour.
- Add MCP tool `delete_category`. It deletes a category created within the last hour.
- Add MCP tool `delete_transaction`. It deletes a transaction created within the last hour.
- Each tool rejects a record older than one hour. The error tells the agent to delete it in the app.
- The one-hour window is fixed. It is the same for all users.
- The window applies to all records. It does not matter whether the record came from the app or an agent.
- Each tool is marked as destructive. This lets clients ask the user before each call.
- Each tool requires the `basics` guide token, like the other MCP tools.
- Deletion behaves as in the app. Records are archived. An archived account or category keeps its transactions. A deleted transaction updates its account balance.
- Transfers are out of scope. `delete_transaction` cannot delete a transfer leg. The existing transaction rules already reject it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mcp-server`: add requirements for deleting accounts, categories, and transactions via MCP, limited to records created within the last hour.

## Impact

- `backend/src/mcp/tools/`: new files `delete-account.ts`, `delete-category.ts`, `delete-transaction.ts`, with tests.
- `backend/src/mcp/server.ts`: register the three tools.
- Services, repositories, models: no change. The tools reuse existing service methods.
- GraphQL API and frontend: no change.

## Constitution Compliance

- **Backend Layer Structure**: The MCP layer is an entry point like the GraphQL layer. The tools call services only. They never call repositories. Compliant.
- **Authentication & Authorization**: The age limit restricts what an agent may do. It is a caller-specific authorization rule. It lives in the MCP layer, like guide token checks. The user ID comes from the authenticated MCP context, never from tool input. Compliant.
- **Soft-Deletion**: Deletion archives records through existing service methods. Compliant.
- **Result Pattern**: The tools consume service `Result` values and return failures as tool errors. Compliant.
- **Input Validation**: Ownership is checked first through user-scoped service lookups. The age check runs after the record is found. Compliant.
- **Test Strategy**: Each tool gets a co-located test file with mocked services, like the existing MCP tools. Compliant.
