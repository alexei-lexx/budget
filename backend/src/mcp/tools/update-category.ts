import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CategoryService } from "../../services/category-service";
import { description, inputSchema, handler } from "../../tools/update-category";
import { toToolResult } from "./to-tool-result";

export function registerUpdateCategoryTool(
  server: McpServer,
  deps: { categoryService: CategoryService; userId: string },
): void {
  server.registerTool(
    "update_category",
    { description, inputSchema },
    async (input) => toToolResult(await handler(input, deps)),
  );
}
