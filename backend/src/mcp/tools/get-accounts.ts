import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AccountService } from "../../services/account-service";
import { description, handler, inputSchema } from "../../tools/get-accounts";
import { toToolResult } from "./to-tool-result";

export function registerGetAccountsTool(
  server: McpServer,
  deps: { accountService: AccountService; userId: string },
): void {
  server.registerTool(
    "get_accounts",
    { description, inputSchema },
    async ({ scope }) => toToolResult(await handler({ scope }, deps)),
  );
}
