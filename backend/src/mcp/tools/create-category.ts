import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CategoryService } from "../../services/category-service";
import { handler, description, inputSchema } from "../../tools/create-category";
import { toToolResult } from "./to-tool-result";

export function registerCreateCategoryTool(
  server: McpServer,
  deps: { categoryService: CategoryService; userId: string },
): void {
  server.registerTool(
    "create_category",
    { description, inputSchema },
    async (input) => toToolResult(await handler(input, deps)),
  );
}
