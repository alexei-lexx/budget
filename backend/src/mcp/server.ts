import { McpServer } from "@modelcontextprotocol/server";
import {
  resolveAccountService,
  resolveCategoryService,
  resolveTransactionRepository,
  resolveTransactionService,
  resolveUserRepository,
} from "../dependencies";
import { authenticateMcpToken } from "./auth";
import { registerCreateAccountTool } from "./tools/create-account";
import { registerCreateCategoryTool } from "./tools/create-category";
import { registerCreateTransactionTool } from "./tools/create-transaction";
import { registerGetAccountsTool } from "./tools/get-accounts";
import { registerGetCategoriesTool } from "./tools/get-categories";
import { registerGetTransactionsTool } from "./tools/get-transactions";
import { registerLoadGuidesTool } from "./tools/load-guides";
import { registerUpdateAccountTool } from "./tools/update-account";
import { registerUpdateCategoryTool } from "./tools/update-category";
import { registerUpdateTransactionTool } from "./tools/update-transaction";

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

  registerCreateAccountTool(server, { accountService, userId });
  registerCreateCategoryTool(server, { categoryService, userId });
  registerCreateTransactionTool(server, { transactionService, userId });
  registerGetAccountsTool(server, { accountService, userId });
  registerGetCategoriesTool(server, { categoryService, userId });
  registerGetTransactionsTool(server, { transactionRepository, userId });
  registerLoadGuidesTool(server);
  registerUpdateAccountTool(server, { accountService, userId });
  registerUpdateCategoryTool(server, { categoryService, userId });
  registerUpdateTransactionTool(server, { transactionService, userId });

  return server;
}
