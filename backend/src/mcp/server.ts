import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  resolveAccountService,
  resolveCategoryService,
  resolveTransactionRepository,
  resolveTransactionService,
  resolveUserRepository,
} from "../dependencies";
import { authenticateMcpToken } from "./auth";
import { registerCreateTransactionTool } from "./tools/create-transaction";
import { registerGetAccountsTool } from "./tools/get-accounts";
import { registerGetCategoriesTool } from "./tools/get-categories";
import { registerGetTransactionsTool } from "./tools/get-transactions";

export async function createAuthenticatedMcpServer(
  token: string | null,
): Promise<McpServer | null> {
  const user = await authenticateMcpToken(token, resolveUserRepository());

  if (!user) return null;

  const server = new McpServer({ name: "budget-mcp-server", version: "1.0.0" });

  const accountService = resolveAccountService();
  const categoryService = resolveCategoryService();
  const transactionRepository = resolveTransactionRepository();
  const transactionService = resolveTransactionService();

  const userId = user.id;

  registerGetAccountsTool(server, { accountService, userId });
  registerGetCategoriesTool(server, { categoryService, userId });
  registerGetTransactionsTool(server, { transactionRepository, userId });
  registerCreateTransactionTool(server, { transactionService, userId });

  return server;
}
