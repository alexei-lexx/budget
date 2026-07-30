import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AccountService } from "../../services/account-service";
import {
  description,
  inputSchema,
  updateAccount,
} from "../../tools/update-account";
import { toToolResult } from "./to-tool-result";

export function registerUpdateAccountTool(
  server: McpServer,
  deps: { accountService: AccountService; userId: string },
): void {
  server.registerTool(
    "update_account",
    { description, inputSchema },
    async (input) => toToolResult(await updateAccount(input, deps)),
  );
}
