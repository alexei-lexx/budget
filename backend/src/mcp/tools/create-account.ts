import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AccountService } from "../../services/account-service";
import {
  createAccount,
  description,
  inputSchema,
} from "../../tools/create-account";
import { toToolResult } from "./to-tool-result";

export function registerCreateAccountTool(
  server: McpServer,
  deps: { accountService: AccountService; userId: string },
): void {
  server.registerTool(
    "create_account",
    { description, inputSchema },
    async (input) => toToolResult(await createAccount(input, deps)),
  );
}
