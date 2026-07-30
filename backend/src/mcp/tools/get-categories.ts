import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CategoryService } from "../../services/category-service";
import { description, handler, inputSchema } from "../../tools/get-categories";
import { toToolResult } from "./to-tool-result";

export function registerGetCategoriesTool(
  server: McpServer,
  deps: { categoryService: CategoryService; userId: string },
): void {
  server.registerTool(
    "get_categories",
    { description, inputSchema },
    async ({ scope }) => toToolResult(await handler({ scope }, deps)),
  );
}
