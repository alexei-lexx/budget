import { McpServer } from "@modelcontextprotocol/server";
import {
  resolveAccountService,
  resolveCategoryService,
  resolveTransactionRepository,
  resolveTransactionService,
  resolveUserRepository,
} from "../dependencies";
import { ModelError } from "../models/model-error";
import { BusinessError } from "../services/business-error";
import { Failure } from "../types/result";
import { authenticateMcpToken } from "./auth";
import { createCreateAccountTool } from "./tools/create-account";
import { createCreateCategoryTool } from "./tools/create-category";
import { createCreateTransactionTool } from "./tools/create-transaction";
import { createGetAccountsTool } from "./tools/get-accounts";
import { createGetCategoriesTool } from "./tools/get-categories";
import { createGetTransactionsTool } from "./tools/get-transactions";
import { createLoadGuidesTool } from "./tools/load-guides";
import { toToolResult } from "./tools/to-tool-result";
import { Tool } from "./tools/tool";
import { createUpdateAccountTool } from "./tools/update-account";
import { createUpdateCategoryTool } from "./tools/update-category";
import { createUpdateTransactionTool } from "./tools/update-transaction";

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

  const tools: Tool[] = [
    createCreateAccountTool({ accountService, userId }),
    createCreateCategoryTool({ categoryService, userId }),
    createCreateTransactionTool({ transactionService, userId }),
    createGetAccountsTool({ accountService, userId }),
    createGetCategoriesTool({ categoryService, userId }),
    createGetTransactionsTool({ transactionRepository, userId }),
    createLoadGuidesTool(),
    createUpdateAccountTool({ accountService, userId }),
    createUpdateCategoryTool({ categoryService, userId }),
    createUpdateTransactionTool({ transactionService, userId }),
  ];

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (input) => {
        try {
          return toToolResult(await tool.run(input));
        } catch (error) {
          // Expose BusinessError and ModelError messages to the user
          if (error instanceof BusinessError || error instanceof ModelError) {
            return toToolResult(Failure(error.message));
          }

          // Log unexpected errors and return
          // a generic failure message to the user
          console.error(`Error in ${tool.name} tool:`, error);
          return toToolResult(Failure(`Failed to run ${tool.name}`));
        }
      },
    );
  }

  return server;
}
